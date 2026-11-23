"""The backups a restore can use, and the hashes that identify them (AD-22, Story 13.1).

:func:`list_local_backups` lists the daily backups, the safety copies and the
downloads from Dropbox in the backups folder, newest first, each with its
Dropbox content hash (:func:`dropbox_content_hash`).
"""

import hashlib
import os
import zipfile
from datetime import datetime
from pathlib import Path
from typing import BinaryIO

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.store import LIBRARY_NAME

from .backup_names import FROM_DROPBOX, BackupKind, _kind_in_folder, _kind_in_from_dropbox
from .commit import log
from .export import _ZIP_ERRORS, backup_time

CONTENT_HASH_BLOCK = 4 * 1024 * 1024
"""Dropbox hashes a file in 4 MiB blocks."""


def dropbox_content_hash(path: Path) -> str:
    """Dropbox's content hash of the file at ``path``, in lowercase hex: SHA-256 over the
    SHA-256 of each 4 MiB block (stdlib only)."""
    with open(path, "rb") as source:
        return _content_hash_of(source)


def _content_hash_of(source: BinaryIO) -> str:
    blocks = hashlib.sha256()
    while block := source.read(CONTENT_HASH_BLOCK):
        blocks.update(hashlib.sha256(block).digest())
    return blocks.hexdigest()


def _library_hash(archive: zipfile.ZipFile) -> str:
    return hashlib.sha256(archive.read(LIBRARY_NAME)).hexdigest()


class LocalBackup(BaseModel):
    """One backup a restore can use."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    path: str
    kind: BackupKind
    backup_time: datetime
    size: int
    content_hash: str


class LocalBackups(BaseModel):
    """``list_local_backups``' answer, newest first."""

    backups: list[LocalBackup]


def _candidates(backups_dir: Path) -> list[tuple[Path, BackupKind]]:
    found: list[tuple[Path, BackupKind]] = []
    # Resolved, as resolve_backup_path resolves it: a symlinked backups folder is listed,
    # and each listed path is the one a restore reports.
    try:
        folder = Path(backups_dir).resolve()
    except OSError, RuntimeError, ValueError:
        return found
    for directory, kind_of in (
        (folder, _kind_in_folder),
        (folder / FROM_DROPBOX, _kind_in_from_dropbox),
    ):
        try:
            # A symlinked from-dropbox/ points outside the folder, so it is never listed.
            if (directory != folder and directory.is_symlink()) or not directory.is_dir():
                continue
            entries = sorted(os.scandir(directory), key=lambda entry: entry.name)
        except OSError as exc:
            log(f"couldn't list {directory}: {exc}")
            continue
        for entry in entries:
            kind = kind_of(entry.name)
            try:
                regular = entry.is_file(follow_symlinks=False)
            except OSError:
                regular = False
            if kind is not None and regular:
                found.append((Path(entry.path), kind))
    return found


def list_local_backups(backups_dir: Path | None) -> LocalBackups:
    """The daily backups and safety copies in ``backups_dir`` and the daily backups in its
    ``from-dropbox/``, newest first by backup time.

    Any other name, a ``.tmp*`` file, a folder or a symlink is left out. A
    file with a backup's name that can't be read as a zip holding
    ``library.json`` is left out and logged: it can't be restored, and
    ``preview_restore`` on its path names why. No folder is an empty list.
    """
    if backups_dir is None:
        return LocalBackups(backups=[])
    listed: list[LocalBackup] = []
    for path, kind in _candidates(backups_dir):
        try:
            size = os.lstat(path).st_size
            with zipfile.ZipFile(path) as archive:
                at = backup_time(archive)
            content_hash = dropbox_content_hash(path)
        except (*_ZIP_ERRORS, KeyError, ValueError, OverflowError) as exc:
            log(f"left {path.name} out of the backups: it can't be read as a backup: {exc}")
            continue
        listed.append(
            LocalBackup(
                path=str(path), kind=kind, backup_time=at, size=size, content_hash=content_hash
            )
        )
    listed.sort(key=lambda backup: (backup.backup_time, backup.path), reverse=True)
    return LocalBackups(backups=listed)
