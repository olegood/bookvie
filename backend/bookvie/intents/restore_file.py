"""Restore from a backup file in the backups folder (AD-22, Story 13.1).

The agent's restore reads a file bookvie already has, instead of an upload.
The path is checked first (:func:`~bookvie.intents.backup_restore.resolve_backup_path`),
before the file is opened.

:func:`preview_restore` stages and validates the file under the AD-4 lock and
says what restoring it would lose; nothing outside ``.staging/`` changes, and
``.staging/`` is emptied after. A file bookvie can't restore is refused with
the restore intent's code (:func:`~bookvie.intents.restore.stage_and_validate`).

:func:`apply_confirmed_restore` runs a restore the user has confirmed, in one
hold of the lock and in this order: the current ``library.json``'s SHA-256
against the sealed one; the file read once into a spool, and its SHA-256
against the sealed one (either moved is ``restore_not_confirmed`` with
``changed``); stage and validate; the safety copy
(:func:`~bookvie.intents.backup_restore.write_safety_copy`); then
:func:`~bookvie.intents.restore.apply_staged`. ``.staging/`` is emptied
whatever happened. ``local-state.json`` is never written.
"""

import hashlib
import os
import stat
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain import Clock, Library
from bookvie.store import Store, referenced_covers

from .backup_restore import write_safety_copy
from .commit import log
from .contract import (
    RestoreNotConfirmedReason,
    couldnt_save,
    restore_invalid,
    restore_not_confirmed,
)
from .export import EXPORT_CHUNK, SPOOL_MEMORY_LIMIT, backup_time
from .restore import StagedRestore, apply_staged, stage_and_validate


class _Wire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LibraryCounts(_Wire):
    books: int
    card_notes: int
    covers: int
    """The covers the library references."""


class RestorePreview(_Wire):
    """``preview_restore``'s answer: what restoring the backup would lose."""

    backup_time: datetime
    backup: LibraryCounts
    current: LibraryCounts
    books_added_since: list[str]
    """The titles of the Books in the current library and not in the backup, in catalog order."""
    card_notes_added_since: int
    """The Card notes (on any Book) in the current library and not in the backup."""


class RestoredBackup(_Wire):
    """``restore_backup``'s answer once the restore is applied."""

    restored_from: str
    backup_time: datetime
    safety_copy: str


@dataclass(frozen=True)
class Sealed:
    """What the user confirmed: the resolved file and the two hashes it was previewed with."""

    path: str
    archive_sha256: str
    library_sha256: str


@dataclass(frozen=True)
class PreparedRestore:
    """A preview, with the hashes a confirmation seals."""

    preview: RestorePreview
    archive_sha256: str
    library_sha256: str


def library_sha256(store: Store) -> str:
    """The SHA-256 of ``library.json`` as committed, in hex. The caller holds the lock."""
    try:
        return hashlib.sha256(store.path.read_bytes()).hexdigest()
    except OSError as exc:
        log(f"couldn't read {store.path.name}: {exc}")
        raise couldnt_save(503) from exc


def _read_once(path: Path) -> tuple[SpooledTemporaryFile, str]:
    """The file at ``path`` copied into a spool (rewound), and its SHA-256 in hex.

    Opened without following a symlink and without blocking, and refused unless it is a
    regular file.
    """
    spool = SpooledTemporaryFile(max_size=SPOOL_MEMORY_LIMIT)  # noqa: SIM115 - returned
    digest = hashlib.sha256()
    try:
        # O_NONBLOCK: a FIFO swapped in after the path check can't block under the lock.
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
        with os.fdopen(fd, "rb") as source:
            if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
                raise OSError(f"{path.name} isn't a regular file")
            while chunk := source.read(EXPORT_CHUNK):
                digest.update(chunk)
                spool.write(chunk)
        spool.seek(0)
    except OSError as exc:
        spool.close()
        log(f"couldn't read {path.name}: {exc}")
        raise couldnt_save(503) from exc
    except BaseException:
        spool.close()
        raise
    return spool, digest.hexdigest()


def _counts(library: Library) -> LibraryCounts:
    return LibraryCounts(
        books=len(library.books),
        card_notes=sum(len(book.card_notes) for book in library.books),
        covers=len(referenced_covers(library)),
    )


def _preview(store: Store, staged: StagedRestore, at: datetime) -> RestorePreview:
    backup, current = staged.library, store.library
    backup_books = {book.id for book in backup.books}
    backup_notes = {note.id for book in backup.books for note in book.card_notes}
    return RestorePreview(
        backup_time=at,
        backup=_counts(backup),
        current=_counts(current),
        books_added_since=[book.title for book in current.books if book.id not in backup_books],
        card_notes_added_since=sum(
            1 for book in current.books for note in book.card_notes if note.id not in backup_notes
        ),
    )


def _stage(store: Store, spool: SpooledTemporaryFile) -> tuple[StagedRestore, datetime]:
    """Stage and validate the spooled archive, and read its backup time."""
    staged = stage_and_validate(store, spool)
    spool.seek(0)
    # A staged archive is a zip holding library.json, but its entry's time can still be
    # impossible (a DOS date with month 0), which list_local_backups leaves out too.
    with zipfile.ZipFile(spool) as archive:
        try:
            at = backup_time(archive)
        except (ValueError, OverflowError) as exc:
            log(f"couldn't restore: the file's backup time can't be read: {exc}")
            raise restore_invalid() from exc
    return staged, at


def prepare_restore(store: Store, path: Path) -> PreparedRestore:
    """The preview of restoring ``path`` (already resolved), with the archive's and the
    library's SHA-256, read under one hold of the lock. Nothing outside ``.staging/``
    changes."""
    with store.lock:
        try:
            current = library_sha256(store)
            spool, archive_sha256 = _read_once(path)
            with spool:
                staged, at = _stage(store, spool)
            return PreparedRestore(_preview(store, staged, at), archive_sha256, current)
        finally:
            store.empty_staging(quiet=True)


def preview_restore(store: Store, path: Path) -> RestorePreview:
    """What restoring ``path`` (already resolved) would lose; changes nothing."""
    return prepare_restore(store, path).preview


def apply_confirmed_restore(
    store: Store, clock: Clock, backups_dir: Path | None, path: Path, sealed: Sealed
) -> RestoredBackup:
    """Restore ``path`` as the user confirmed it (see the module docstring)."""
    with store.lock:
        try:
            if library_sha256(store) != sealed.library_sha256:
                log("didn't restore: the library changed since the confirmation was asked")
                raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
            spool, archive_sha256 = _read_once(path)
            with spool:
                if archive_sha256 != sealed.archive_sha256:
                    log(f"didn't restore: {path.name} changed since the confirmation was asked")
                    raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
                staged, at = _stage(store, spool)
            safety_copy = write_safety_copy(store, clock.now(), backups_dir)
            apply_staged(store, staged)
        finally:
            store.empty_staging(quiet=True)
    return RestoredBackup(restored_from=str(path), backup_time=at, safety_copy=str(safety_copy))
