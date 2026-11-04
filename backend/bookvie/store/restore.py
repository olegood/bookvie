"""Unpack a restore archive into ``.staging/`` (AD-1, AD-12, AD-14).

:func:`stage_archive` empties ``.staging/`` and unpacks the export zip into
it, in this order:

1. A central directory over :data:`MAX_ENTRIES` times
   :data:`DIRECTORY_BYTES_PER_ENTRY` raises :class:`ArchiveUnsafe`, read
   from the end record before ``zipfile`` parses it (it builds one
   ``ZipInfo`` per record, so the entry count alone would be checked too
   late). A file with no end record is left to step 2.
2. A file that isn't a zip raises :class:`ArchiveRefused`.
3. Every archive-safety rule is checked on ``infolist()`` before any entry
   is unpacked, and a break raises :class:`ArchiveUnsafe`: an upload over
   :data:`MAX_UPLOAD_BYTES`, more than :data:`MAX_ENTRIES` entries, an
   absolute name or a ``..`` part, a symlink, two names equal under NFC
   plus ``casefold()`` (:func:`_name_key`), a cover whose name differs only
   that way from one already in ``covers/``, a cover name over
   :data:`MAX_COVER_NAME_BYTES`, or any entry other than ``library.json``,
   the ``covers/`` directory and ``covers/<name>`` (a plain name, as
   :func:`~bookvie.store.store.cover_name` rules).
4. A missing ``library.json`` raises :class:`ArchiveRefused`.
5. Entries are unpacked. The bytes actually written are counted, never the
   header sizes: the chunk that would take the total past
   :data:`MAX_EXTRACTED_BYTES` is not written, and an entry that inflates
   past its declared size is :class:`ArchiveUnsafe`; a damaged entry is
   :class:`ArchiveRefused`. A staged file that can't be created because of
   its name (:data:`_NAME_ERRNOS`) is :class:`ArchiveUnsafe` too.

The limits are read through this module at call time. Any other failure
writing into ``.staging/`` is :class:`~bookvie.store.store.CouldntSave`. The caller holds
the store lock.
"""

import copy
import errno
import os
import stat
import unicodedata
import zipfile
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

from .store import COVERS_DIR, LIBRARY_NAME, STAGING_DIR, CouldntSave, Store, cover_name

UNPACK_CHUNK = 64 * 1024

MAX_UPLOAD_BYTES = 1024**3
"""The largest upload restore takes, in bytes (1 GiB, AD-14)."""
MAX_ENTRIES = 5_000
"""The most entries an archive may hold, directory entries included (AD-14)."""
MAX_EXTRACTED_BYTES = 1024**3
"""The most bytes unpacking may write into ``.staging/`` (1 GiB, AD-14)."""
DIRECTORY_BYTES_PER_ENTRY = 1024
"""The central-directory bytes allowed per entry; an export's records are under 100."""
MAX_COVER_NAME_BYTES = 200
"""The longest cover name restore takes, in UTF-8 bytes of the name inside ``covers/`` (AD-14).

Under the common 255-byte file-name limit with room for the temp name
``<name>.tmp`` plus 8 characters that restore writes it through; a minted
name is 77 bytes.
"""

# What open() raises when the file name itself is the problem, not the disk.
_NAME_ERRNOS = frozenset({errno.ENAMETOOLONG, errno.EILSEQ, errno.EINVAL})

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


class ArchiveUnsafe(ArchiveRefused):
    """The upload breaks an archive-safety rule or limit (AD-14); nothing was changed."""


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


class _Budget:
    """The bytes unpacking may still write into ``.staging/``."""

    def __init__(self, limit: int) -> None:
        self.left = limit


def _copy_entry(
    archive: zipfile.ZipFile, info: zipfile.ZipInfo, target: Path, budget: _Budget
) -> None:
    """Unpack ``info`` into ``target``, spending ``budget`` on the bytes written.

    The entry is opened through a copy of ``info`` whose ``file_size`` is the
    budget left plus one, so ``zipfile`` inflates to the stream's real end
    (still bounded) instead of stopping at a size the header may understate.
    The copy carries no CRC, since ``zipfile`` would check it against a cut
    stream; it is checked here once the stream has ended within the budget.
    """
    try:
        out = open(target, "wb")  # noqa: SIM115 - closed below, errors are told apart
    except OSError as exc:
        if exc.errno in _NAME_ERRNOS:
            raise ArchiveUnsafe(f"holds {info.filename!r}, which can't be a file name") from exc
        raise CouldntSave(f"can't write {STAGING_DIR}/{info.filename}: {exc}") from exc
    unbounded = copy.copy(info)
    unbounded.file_size = budget.left + 1
    del unbounded.CRC
    written = 0
    crc = 0
    with out:
        try:
            source = archive.open(unbounded)
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
                if len(chunk) > budget.left:
                    raise ArchiveUnsafe(
                        f"unpacks to more than {MAX_EXTRACTED_BYTES} bytes "
                        f"(at {info.filename})"
                    )
                try:
                    out.write(chunk)
                except OSError as exc:
                    raise CouldntSave(f"can't write {STAGING_DIR}/{info.filename}: {exc}") from exc
                budget.left -= len(chunk)
                written += len(chunk)
                crc = zlib.crc32(chunk, crc)
    if written > info.file_size:
        raise ArchiveUnsafe(
            f"holds {info.filename!r}, which unpacks to more than its declared "
            f"{info.file_size} bytes"
        )
    if crc != info.CRC:
        raise ArchiveRefused(f"{info.filename} is damaged: Bad CRC-32 for file {info.filename!r}")


def _upload_size(upload: BinaryIO) -> int:
    try:
        upload.seek(0, os.SEEK_END)
        size = upload.tell()
        upload.seek(0)
    except OSError as exc:
        raise CouldntSave(f"can't read the upload: {exc}") from exc
    return size


def _check_directory_size(upload: BinaryIO) -> None:
    """Refuse a central directory too big for :data:`MAX_ENTRIES` entries, before it is parsed.

    Its size comes from the end record (ZIP64 included) through ``zipfile``'s
    own reader. The record's entry count isn't used: ``zipfile`` reads
    records until it has consumed the size, whatever the count says.
    """
    try:
        end = zipfile._EndRecData(upload)  # the reader ZipFile itself uses
        upload.seek(0)
    except OSError as exc:
        raise CouldntSave(f"can't read the upload: {exc}") from exc
    if end is None:
        return
    size = end[zipfile._ECD_SIZE]
    limit = MAX_ENTRIES * DIRECTORY_BYTES_PER_ENTRY
    if size > limit:
        raise ArchiveUnsafe(f"has a {size}-byte central directory, more than {limit}")


def _unsafe_name(name: str) -> str | None:
    """Why ``name`` can't be unpacked, or ``None`` when its path is plain."""
    if name.startswith(("/", "\\")) or (len(name) > 1 and name[1] == ":"):
        return "is an absolute path"
    if ".." in name.replace("\\", "/").split("/"):
        return "has a .. part"
    return None


def _name_key(name: str) -> str:
    """``name`` as restore compares names: NFC-normalized, then casefolded (AD-14).

    Two names with the same key may share one file: case-insensitive
    filesystems ignore case, and APFS ignores Unicode normalization too.
    Full casefolding also matches pairs such as ``ß`` and ``ss`` that APFS
    keeps apart; restore refuses those too, on the safe side.
    """
    return unicodedata.normalize("NFC", unicodedata.normalize("NFC", name).casefold())


def _cover_name_too_long(cover: str) -> bool:
    # zipfile decodes every name (UTF-8 or cp437) to a str without lone surrogates,
    # so encoding it as UTF-8 can't fail.
    return len(cover.encode("utf-8")) > MAX_COVER_NAME_BYTES


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    return stat.S_ISLNK(info.external_attr >> 16)


def _check_entries(
    store: Store, infos: list[zipfile.ZipInfo]
) -> tuple[zipfile.ZipInfo | None, dict[str, zipfile.ZipInfo]]:
    """The archive-safety pass (AD-14): ``library.json``'s entry and each cover's, by name.

    Raises :class:`ArchiveUnsafe` before anything is unpacked. Names are
    compared by :func:`_name_key`. Against ``covers/`` a cover is refused
    when a different name there has its key and its own name isn't there; the same name is kept by
    :meth:`~bookvie.store.store.Store.replace_all` (AD-12), whose exact-name
    check is then enough, because no other cover can share its file.
    """
    if len(infos) > MAX_ENTRIES:
        raise ArchiveUnsafe(f"holds {len(infos)} entries, more than {MAX_ENTRIES}")
    library_info: zipfile.ZipInfo | None = None
    cover_infos: dict[str, zipfile.ZipInfo] = {}
    seen: dict[str, str] = {}
    for info in infos:
        name = info.filename
        if (why := _unsafe_name(name)) is not None:
            raise ArchiveUnsafe(f"holds {name!r}, which {why}")
        if _is_symlink(info):
            raise ArchiveUnsafe(f"holds {name!r}, which is a symlink")
        key = _name_key(name)
        if key in seen:
            raise ArchiveUnsafe(f"holds {ascii(name)} twice (as {ascii(seen[key])})")
        seen[key] = name
        if name == LIBRARY_NAME and not info.is_dir():
            library_info = info
        elif info.is_dir() and name.rstrip("/") == COVERS_DIR:
            continue
        elif not info.is_dir() and (cover := cover_name(name)) is not None:
            if _cover_name_too_long(cover):
                raise ArchiveUnsafe(
                    f"holds {name!r}, whose name is over {MAX_COVER_NAME_BYTES} bytes"
                )
            cover_infos[cover] = info
        else:
            raise ArchiveUnsafe(f"holds {name!r}, which isn't library.json or a cover")
    if cover_infos:
        try:
            existing = store.cover_names()
        except OSError as exc:
            raise CouldntSave(f"can't list {COVERS_DIR}/: {exc}") from exc
        exact = set(existing)
        keyed_existing = {_name_key(name): name for name in existing}
        for cover in cover_infos:
            other = keyed_existing.get(_name_key(cover))
            if other is not None and cover not in exact:
                raise ArchiveUnsafe(
                    f"holds {COVERS_DIR}/{ascii(cover)}, which could share one file "
                    f"with {COVERS_DIR}/{ascii(other)} (case or Unicode form)"
                )
    return library_info, cover_infos


def stage_archive(store: Store, upload: BinaryIO) -> StagedArchive:
    """Empty ``.staging/``, then check and unpack ``upload`` into it (see the module docstring)."""
    try:
        store.empty_staging()
    except OSError as exc:
        raise CouldntSave(f"can't empty {STAGING_DIR}/: {exc}") from exc
    staging = store.data_dir / STAGING_DIR
    size = _upload_size(upload)
    _check_directory_size(upload)
    try:
        archive = zipfile.ZipFile(upload)
    except (*_READ_ERRORS, OSError) as exc:
        raise ArchiveRefused(f"is not a zip file: {exc}") from exc
    with archive:
        if size > MAX_UPLOAD_BYTES:
            raise ArchiveUnsafe(f"is {size} bytes, more than {MAX_UPLOAD_BYTES}")
        library_info, cover_infos = _check_entries(store, archive.infolist())
        if library_info is None:
            raise ArchiveRefused(f"has no {LIBRARY_NAME}")
        try:
            staging.mkdir(exist_ok=True)
            if cover_infos:
                (staging / COVERS_DIR).mkdir(exist_ok=True)
        except OSError as exc:
            raise CouldntSave(f"can't create {STAGING_DIR}/: {exc}") from exc
        budget = _Budget(MAX_EXTRACTED_BYTES)
        library_path = staging / LIBRARY_NAME
        _copy_entry(archive, library_info, library_path, budget)
        staged = StagedArchive(library=b"")
        for cover, info in sorted(cover_infos.items()):
            target = staging / COVERS_DIR / cover
            _copy_entry(archive, info, target, budget)
            staged.covers[cover] = target
    try:
        staged.library = library_path.read_bytes()
    except OSError as exc:
        raise CouldntSave(f"can't read {STAGING_DIR}/{LIBRARY_NAME}: {exc}") from exc
    return staged
