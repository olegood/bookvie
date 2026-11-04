"""Unpack a restore archive into ``.staging/`` (AD-1, AD-12, AD-14).

:func:`stage_archive` empties ``.staging/`` and unpacks the export zip into
it. Only ``library.json`` and ``covers/<name>`` (with a plain name, as
:func:`~bookvie.store.store.cover_name` rules) are accepted; a ``covers/``
directory entry is allowed, and a missing one means no covers. Anything else,
a file that isn't a zip, a damaged entry or a missing ``library.json`` raises
:class:`ArchiveRefused`; a failure writing into ``.staging/`` is
:class:`~bookvie.store.store.CouldntSave`. The caller holds the store lock.

The archive-safety limits (paths, symlinks, duplicates, entry count and
size) are Story 2.3's.
"""

import zipfile
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

from .store import COVERS_DIR, LIBRARY_NAME, STAGING_DIR, CouldntSave, Store, cover_name

UNPACK_CHUNK = 64 * 1024

# What reading a damaged or unsupported entry raises (not the staging writes).
_READ_ERRORS = (
    zipfile.BadZipFile,
    zipfile.LargeZipFile,
    zlib.error,
    EOFError,
    NotImplementedError,
    RuntimeError,
    ValueError,
)


class ArchiveRefused(Exception):
    """The upload isn't a usable bookvie export; ``reason`` says why. Nothing was changed."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass
class StagedArchive:
    """What :func:`stage_archive` unpacked into ``.staging/``."""

    library: bytes
    """``library.json``'s bytes as archived."""
    covers: dict[str, Path] = field(default_factory=dict)
    """Each archived cover's name in ``covers/``, by its staged file."""

    def cover_bytes(self, name: str) -> bytes:
        """The staged cover's bytes; :class:`CouldntSave` when it can't be read back."""
        try:
            return self.covers[name].read_bytes()
        except OSError as exc:
            raise CouldntSave(f"can't read {STAGING_DIR}/{COVERS_DIR}/{name}: {exc}") from exc


def _copy_entry(archive: zipfile.ZipFile, info: zipfile.ZipInfo, target: Path) -> None:
    try:
        out = open(target, "wb")  # noqa: SIM115 - closed below, errors are told apart
    except OSError as exc:
        raise CouldntSave(f"can't write {STAGING_DIR}/{info.filename}: {exc}") from exc
    with out:
        try:
            source = archive.open(info)
        except _READ_ERRORS as exc:
            raise ArchiveRefused(f"{info.filename} can't be read: {exc}") from exc
        with source:
            while True:
                try:
                    chunk = source.read(UNPACK_CHUNK)
                except _READ_ERRORS as exc:
                    raise ArchiveRefused(f"{info.filename} is damaged: {exc}") from exc
                if not chunk:
                    break
                try:
                    out.write(chunk)
                except OSError as exc:
                    raise CouldntSave(f"can't write {STAGING_DIR}/{info.filename}: {exc}") from exc


def stage_archive(store: Store, upload: BinaryIO) -> StagedArchive:
    """Empty ``.staging/``, then unpack ``upload`` into it (see the module docstring)."""
    try:
        store.empty_staging()
    except OSError as exc:
        raise CouldntSave(f"can't empty {STAGING_DIR}/: {exc}") from exc
    staging = store.data_dir / STAGING_DIR
    try:
        archive = zipfile.ZipFile(upload)
    except (*_READ_ERRORS, OSError) as exc:
        raise ArchiveRefused(f"is not a zip file: {exc}") from exc
    with archive:
        library_info: zipfile.ZipInfo | None = None
        cover_infos: dict[str, zipfile.ZipInfo] = {}
        for info in archive.infolist():
            name = info.filename
            if name == LIBRARY_NAME and not info.is_dir():
                library_info = info
            elif info.is_dir() and name.rstrip("/") == COVERS_DIR:
                continue
            elif not info.is_dir() and (cover := cover_name(name)) is not None:
                cover_infos[cover] = info
            else:
                raise ArchiveRefused(f"holds {name!r}, which isn't library.json or a cover")
        if library_info is None:
            raise ArchiveRefused(f"has no {LIBRARY_NAME}")
        try:
            staging.mkdir(exist_ok=True)
            if cover_infos:
                (staging / COVERS_DIR).mkdir(exist_ok=True)
        except OSError as exc:
            raise CouldntSave(f"can't create {STAGING_DIR}/: {exc}") from exc
        library_path = staging / LIBRARY_NAME
        _copy_entry(archive, library_info, library_path)
        staged = StagedArchive(library=b"")
        for cover, info in sorted(cover_infos.items()):
            target = staging / COVERS_DIR / cover
            _copy_entry(archive, info, target)
            staged.covers[cover] = target
    try:
        staged.library = library_path.read_bytes()
    except OSError as exc:
        raise CouldntSave(f"can't read {STAGING_DIR}/{LIBRARY_NAME}: {exc}") from exc
    return staged
