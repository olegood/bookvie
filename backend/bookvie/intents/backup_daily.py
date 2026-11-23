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

With ``for_upload`` (a Dropbox backup run, Story 13.3) the file is written the
same way but "Last export" isn't recorded. Every backup answers its
``libraryHash`` (the SHA-256 of the zip's ``library.json``) and
``unchangedSinceUpload``: whether that hash equals the last recorded upload's.

The ``autoBackup`` group's part names (:data:`LAST_UPLOAD` and the others) live
here because :func:`_last_upload_hash` needs them: defined in ``backup_upload``,
they would make this module import ``backup_upload``, closing the cycle
daily -> upload -> restore -> daily.
"""

import zipfile
import zlib
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from bookvie.domain import Clock
from bookvie.store import Store
from bookvie.store.local_state import AUTO_BACKUP_KEY, read_group

from .backup_listing import _library_hash
from .backup_names import backup_name
from .commit import log
from .contract import IntentError, couldnt_save
from .export import _ZIP_ERRORS, EXPORT_CHUNK, build_export

LAST_REPORT = "lastReport"
LAST_OK = "lastOk"
LAST_UPLOAD = "lastUpload"
"""The three parts of ``local-state.json``'s ``autoBackup`` group (AD-22)."""


class BackupFile(BaseModel):
    """``export_backup``'s answer: the file's absolute path, its size in bytes, its time, the
    SHA-256 of its ``library.json`` and whether that equals the last recorded upload's."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    path: str
    size: int
    created_at: datetime
    library_hash: str
    unchanged_since_upload: bool


def _last_upload_hash(data_dir: Path) -> str | None:
    """``autoBackup.lastUpload.libraryHash`` from ``local-state.json``, or ``None``."""
    group = read_group(data_dir, AUTO_BACKUP_KEY)
    upload = group.get(LAST_UPLOAD) if isinstance(group, dict) else None
    value = upload.get("libraryHash") if isinstance(upload, dict) else None
    return value if isinstance(value, str) else None


def write_backup(
    store: Store, clock: Clock, backups_dir: Path | None, for_upload: bool = False
) -> BackupFile:
    """Write today's backup file into ``backups_dir`` and, unless ``for_upload``, record it
    as "Last export"."""
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
        try:
            with zipfile.ZipFile(source) as archive:
                library_hash = _library_hash(archive)
            source.seek(0)
        except (*_ZIP_ERRORS, KeyError, zlib.error, EOFError) as exc:
            log(f"couldn't save the backup: can't read the built zip: {exc}")
            raise couldnt_save(503) from exc
        size = _write_atomic(store, source, target)
    finally:
        source.close()
    if not for_upload:
        try:
            store.record_export(now)
        except Exception as exc:  # noqa: BLE001 - the backup is already written
            log(f"couldn't record the backup in local-state.json: {exc}")
    return BackupFile(
        path=str(target),
        size=size,
        created_at=now,
        library_hash=library_hash,
        unchanged_since_upload=library_hash == _last_upload_hash(store.data_dir),
    )


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
