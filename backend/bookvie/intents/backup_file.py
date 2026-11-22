"""Write a dated backup of the library to disk (AD-21's Backup, Story 12.6).

:func:`write_backup` builds the same zip as ``GET /api/export``
(:func:`~bookvie.intents.export.build_export`, under the AD-4 lock), then,
outside the lock, writes it atomically into the backups folder as
``bookvie-backup-<YYYY-MM-DD>.zip`` through the store's filesystem seam: a
unique temp file, the zip in :data:`~bookvie.intents.export.EXPORT_CHUNK`
pieces, fsync, close, rename over that day's file. A failed folder flush after
the rename is only logged. Only then is "Last export" recorded, with the same
time the answer carries as ``createdAt``; a failure there is logged too.

A read failure is ``build_export``'s ``couldnt_export``; a failure in any
step before the rename, creating the folder included, is ``couldnt_save``,
with the temp file removed and "Last export" unmoved.

:func:`backups_folder` is the folder rule: it follows the data folder, not
the mode. The home folder is passed in, so this layer never reads
``Path.home()``.
"""

import hashlib
import os
import re
import stat
import zipfile
from collections.abc import Callable
from datetime import date, datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain import Clock
from bookvie.store import Store

from .commit import log
from .contract import IntentError, couldnt_save, restore_outside_backups, safety_copy_failed
from .export import (
    _ZIP_ERRORS,
    EXPORT_CHUNK,
    SPOOL_MEMORY_LIMIT,
    backup_time,
    build_export,
    write_export_zip,
)

DEFAULT_DATA_NAME = "bookvie-data"
DEV_DATA_NAME = "bookvie-data-dev"
DEFAULT_BACKUPS_NAME = "bookvie-backups"
DEV_BACKUPS_NAME = "bookvie-backups-dev"
BACKUPS_SUFFIX = "-backups"


def _same_folder(a: Path, b: Path) -> bool:
    """As ``instance.same_folder`` compares: samefile, then the resolved paths."""
    try:
        return os.path.samefile(a, b)
    except OSError, ValueError:
        pass
    try:
        return Path(a).resolve() == Path(b).resolve()
    except OSError, ValueError:
        return False


def backups_folder(data_dir: Path, home: Path) -> Path:
    """The backups folder for ``data_dir``: ``~/bookvie-backups`` for ``~/bookvie-data``,
    ``~/bookvie-backups-dev`` for ``~/bookvie-data-dev``, ``<data folder>-backups`` otherwise."""
    if _same_folder(data_dir, home / DEFAULT_DATA_NAME):
        return home / DEFAULT_BACKUPS_NAME
    if _same_folder(data_dir, home / DEV_DATA_NAME):
        return home / DEV_BACKUPS_NAME
    resolved = Path(data_dir).resolve()
    return resolved.parent / f"{resolved.name}{BACKUPS_SUFFIX}"


def backup_name(day: date) -> str:
    """``bookvie-backup-<YYYY-MM-DD>.zip``."""
    return f"bookvie-backup-{day.isoformat()}.zip"


class BackupFile(BaseModel):
    """``export_backup``'s answer: the file's absolute path, its size in bytes and its time."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    path: str
    size: int
    created_at: datetime


def write_backup(store: Store, clock: Clock, backups_dir: Path | None) -> BackupFile:
    """Write today's backup file into ``backups_dir`` and record it as "Last export"."""
    if backups_dir is None:
        log("couldn't save the backup: this app has no backups folder")
        raise couldnt_save(503)
    now = clock.now()
    name = backup_name(now.date())
    source = build_export(store, now)
    try:
        folder = Path(backups_dir).absolute()
        target = folder / name
        try:
            folder.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            log(f"couldn't save the backup: can't create {folder}: {exc}")
            raise couldnt_save(503) from exc
        size = _write_atomic(store, source, target)
    finally:
        source.close()
    try:
        store.record_export(now)
    except Exception as exc:  # noqa: BLE001 - the backup is already written
        log(f"couldn't record the backup in local-state.json: {exc}")
    return BackupFile(path=str(target), size=size, created_at=now)


def _couldnt_save() -> IntentError:
    return couldnt_save(503)


def _write_atomic(
    store: Store,
    source: SpooledTemporaryFile,
    target: Path,
    refusal: Callable[[], IntentError] = _couldnt_save,
    what: str = "the backup",
) -> int:
    """temp file beside ``target`` -> chunks -> fsync -> close -> rename -> fsync folder.

    Keeps ``Store._write_atomic``'s cleanup: on any failure before the rename
    the fd is closed and the temp file removed, and ``refusal()`` is raised
    (``couldnt_save`` for the daily backup, ``safety_copy_failed`` for the
    safety copy). Returns the bytes written.
    """
    fs = store.fs
    try:
        fd, temp = fs.create_temp(target.parent, f".{target.name}.tmp")
    except Exception as exc:  # noqa: BLE001 - every failure is the refusal
        log(f"couldn't save {what}: can't create a temp file: {exc}")
        raise refusal() from exc
    is_open = True
    size = 0
    try:
        while chunk := source.read(EXPORT_CHUNK):
            fs.write(fd, chunk)
            size += len(chunk)
        fs.fsync(fd)
        is_open = False
        fs.close(fd)
        fs.replace(temp, target)
    except Exception as exc:  # noqa: BLE001 - every failure is the refusal
        if is_open:
            try:
                fs.close(fd)
            except Exception:  # noqa: BLE001 - cleanup must reach remove
                pass
        try:
            fs.remove(temp)
        except Exception:  # noqa: BLE001 - the original error is reported
            pass
        log(f"couldn't save {what}: can't write {target.name}: {exc}")
        raise refusal() from exc
    # The rename is the commit: a failed folder flush only weakens durability.
    try:
        fs.fsync_dir(target.parent)
    except Exception as exc:  # noqa: BLE001 - the file is already written
        log(f"couldn't flush {target.parent.name}/ after writing {target.name}: {exc}")
    return size


# --- The backups a restore can use (AD-22, Story 13.1) ---------------------------

DAILY_NAME = re.compile(r"bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip", re.ASCII)
"""A daily backup's name, matched whole (``fullmatch``); the date must be a real calendar day."""
SAFETY_NAME = re.compile(
    r"bookvie-pre-restore-(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(?:-([2-9]|[1-9]\d+))?\.zip",
    re.ASCII,
)
"""A safety copy's name, ``bookvie-pre-restore-<YYYY-MM-DDTHHMM>[-N].zip`` with N from 2."""
FROM_DROPBOX = "from-dropbox"
"""The folder inside the backups folder that downloads from Dropbox go into (Story 13.7)."""
CONTENT_HASH_BLOCK = 4 * 1024 * 1024
"""Dropbox hashes a file in 4 MiB blocks."""

BackupKind = Literal["daily", "safety", "from_dropbox"]


def _is_daily_name(name: str) -> bool:
    match = DAILY_NAME.fullmatch(name)
    if match is None:
        return False
    try:
        date.fromisoformat(match.group(1))
    except ValueError:
        return False
    return True


def _is_safety_name(name: str) -> bool:
    match = SAFETY_NAME.fullmatch(name)
    if match is None:
        return False
    try:
        date.fromisoformat(match.group(1))
    except ValueError:
        return False
    return int(match.group(2)) < 24 and int(match.group(3)) < 60


def _kind_in_folder(name: str) -> BackupKind | None:
    """The kind of a file named ``name`` directly in the backups folder, or ``None``."""
    if _is_daily_name(name):
        return "daily"
    if _is_safety_name(name):
        return "safety"
    return None


def _kind_in_from_dropbox(name: str) -> BackupKind | None:
    """Only daily backups are downloaded from Dropbox."""
    return "from_dropbox" if _is_daily_name(name) else None


def _is_regular_file(path: Path) -> bool:
    try:
        return stat.S_ISREG(os.lstat(path).st_mode)
    except OSError:
        return False


def resolve_backup_path(backups_dir: Path | None, raw: str) -> tuple[Path, BackupKind]:
    """``raw`` as a backup file a restore may read, with its kind; else 422
    ``restore_outside_backups``.

    It must be an absolute path with no ``..`` part, naming a regular file
    (not a symlink, not a folder) directly in ``backups_dir`` or its
    ``from-dropbox/``, with a daily or safety-copy name (a daily name only in
    ``from-dropbox/``). The file is never opened here.
    """
    if backups_dir is None:
        raise restore_outside_backups()
    path = Path(raw)
    if not raw or not path.is_absolute() or ".." in path.parts or "\0" in raw:
        raise restore_outside_backups()
    try:
        folder = Path(backups_dir).resolve()
        parent = path.parent.resolve()
    except OSError, RuntimeError, ValueError:
        raise restore_outside_backups() from None
    if parent == folder:
        kind = _kind_in_folder(path.name)
    elif parent == folder / FROM_DROPBOX:
        kind = _kind_in_from_dropbox(path.name)
    else:
        kind = None
    resolved = parent / path.name
    if kind is None or not _is_regular_file(resolved):
        raise restore_outside_backups()
    return resolved, kind


def dropbox_content_hash(path: Path) -> str:
    """Dropbox's content hash of the file at ``path``, in lowercase hex: SHA-256 over the
    SHA-256 of each 4 MiB block (stdlib only)."""
    blocks = hashlib.sha256()
    with open(path, "rb") as source:
        while block := source.read(CONTENT_HASH_BLOCK):
            blocks.update(hashlib.sha256(block).digest())
    return blocks.hexdigest()


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


def safety_copy_name(now: datetime, suffix: int = 1) -> str:
    """``bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`` in local time, ``-N`` from 2."""
    stamp = now.astimezone().strftime("%Y-%m-%dT%H%M")
    return f"bookvie-pre-restore-{stamp}{'' if suffix == 1 else f'-{suffix}'}.zip"


def write_safety_copy(store: Store, now: datetime, backups_dir: Path | None) -> Path:
    """Write the current library, stamped ``now``, into ``backups_dir`` as a new safety copy.

    Lock-free: the caller holds ``store.lock`` (AD-22). The name is the first
    of ``bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip``, ``-2``, ``-3``… not
    taken, so it never replaces a file, a daily backup included. It never
    records an export. Any failure is 503 ``safety_copy_failed``, with no
    partial file left.
    """
    if backups_dir is None:
        log("couldn't save the safety copy: this app has no backups folder")
        raise safety_copy_failed()
    # Resolved, so the path it answers is the one list_local_backups lists.
    folder = Path(backups_dir).resolve()
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        log(f"couldn't save the safety copy: can't create {folder}: {exc}")
        raise safety_copy_failed() from exc
    suffix = 1
    while os.path.lexists(folder / safety_copy_name(now, suffix)):
        suffix += 1
    target = folder / safety_copy_name(now, suffix)
    with SpooledTemporaryFile(max_size=SPOOL_MEMORY_LIMIT) as source:
        try:
            write_export_zip(store, source, now)
            source.seek(0)
        except _ZIP_ERRORS as exc:
            log(f"couldn't save the safety copy: can't read the library: {exc}")
            raise safety_copy_failed() from exc
        _write_atomic(store, source, target, safety_copy_failed, "the safety copy")
    return target
