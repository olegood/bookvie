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

import os
from datetime import date, datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain import Clock
from bookvie.store import Store

from .commit import log
from .contract import couldnt_save
from .export import EXPORT_CHUNK, build_export

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
    source = build_export(store)
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


def _write_atomic(store: Store, source: SpooledTemporaryFile, target: Path) -> int:
    """temp file beside ``target`` -> chunks -> fsync -> close -> rename -> fsync folder.

    Keeps ``Store._write_atomic``'s cleanup: on any failure before the rename
    the fd is closed and the temp file removed. Returns the bytes written.
    """
    fs = store.fs
    try:
        fd, temp = fs.create_temp(target.parent, f".{target.name}.tmp")
    except Exception as exc:  # noqa: BLE001 - every failure is couldnt_save
        log(f"couldn't save the backup: can't create a temp file: {exc}")
        raise couldnt_save(503) from exc
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
    except Exception as exc:  # noqa: BLE001 - every failure is couldnt_save
        if is_open:
            try:
                fs.close(fd)
            except Exception:  # noqa: BLE001 - cleanup must reach remove
                pass
        try:
            fs.remove(temp)
        except Exception:  # noqa: BLE001 - the original error is reported
            pass
        log(f"couldn't save the backup: can't write {target.name}: {exc}")
        raise couldnt_save(503) from exc
    # The rename is the commit: a failed folder flush only weakens durability.
    try:
        fs.fsync_dir(target.parent)
    except Exception as exc:  # noqa: BLE001 - the backup is already written
        log(f"couldn't flush {target.parent.name}/ after writing {target.name}: {exc}")
    return size
