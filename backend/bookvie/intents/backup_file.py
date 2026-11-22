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

With ``for_upload`` (the daily backup run, Story 13.3) the file is written the
same way but "Last export" isn't recorded. Every backup answers its
``libraryHash`` (the SHA-256 of the zip's ``library.json``) and
``unchangedSinceUpload``: whether that hash equals the last recorded upload's.

:func:`record_backup_upload` (Story 13.3, AD-22) stores how a daily run
ended in ``local-state.json`` under ``autoBackup``, through the store's
:class:`~bookvie.store.local_state.LocalStateWriter`.

:func:`backups_folder` is the folder rule: it follows the data folder, not
the mode. The home folder is passed in, so this layer never reads
``Path.home()``.
"""

import hashlib
import os
import re
import stat
import zipfile
import zlib
from collections.abc import Callable
from datetime import date, datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile
from typing import Any, BinaryIO, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pydantic.alias_generators import to_camel

from bookvie.domain import Clock
from bookvie.store import LIBRARY_NAME, CouldntSave, Store
from bookvie.store.local_state import AUTO_BACKUP_KEY, read_group

from .answers import ok
from .commit import log
from .contract import (
    FieldError,
    IntentError,
    OkResponse,
    couldnt_save,
    invalid_fields,
    restore_outside_backups,
    safety_copy_failed,
)
from .export import (
    _ZIP_ERRORS,
    EXPORT_CHUNK,
    SPOOL_MEMORY_LIMIT,
    backup_time,
    build_export,
    write_export_zip,
)
from .intent_model import IntentModel

DEFAULT_DATA_NAME = "bookvie-data"
DEV_DATA_NAME = "bookvie-data-dev"
DEFAULT_BACKUPS_NAME = "bookvie-backups"
DEV_BACKUPS_NAME = "bookvie-backups-dev"
BACKUPS_SUFFIX = "-backups"

LAST_REPORT = "lastReport"
LAST_OK = "lastOk"
LAST_UPLOAD = "lastUpload"
"""The three parts of ``local-state.json``'s ``autoBackup`` group (AD-22)."""
_NOT_A_DAILY_BACKUP = "This isn't a daily backup in this bookvie's backups folder."


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


def _same_folder_folded(a: Path, b: Path) -> bool:
    """:func:`_same_folder`, or the resolved paths equal ignoring case (a case-insensitive
    disk spells one folder many ways, and neither may exist yet)."""
    if _same_folder(a, b):
        return True
    try:
        return str(Path(a).resolve()).casefold() == str(Path(b).resolve()).casefold()
    except OSError, ValueError:
        return False


def backups_folder(data_dir: Path, home: Path) -> Path | None:
    """The backups folder for ``data_dir``: ``~/bookvie-backups`` for ``~/bookvie-data``,
    ``~/bookvie-backups-dev`` for ``~/bookvie-data-dev``, ``<data folder>-backups`` otherwise.

    ``None`` (no backups folder) when that sibling would be one of the two default
    backups folders, as for ``~/bookvie``: only ``~/bookvie-data`` writes into
    ``~/bookvie-backups`` (AD-22, Story 13.3).
    """
    if _same_folder(data_dir, home / DEFAULT_DATA_NAME):
        return home / DEFAULT_BACKUPS_NAME
    if _same_folder(data_dir, home / DEV_DATA_NAME):
        return home / DEV_BACKUPS_NAME
    resolved = Path(data_dir).resolve()
    sibling = resolved.parent / f"{resolved.name}{BACKUPS_SUFFIX}"
    for default in (home / DEFAULT_BACKUPS_NAME, home / DEV_BACKUPS_NAME):
        if _same_folder_folded(sibling, default):
            return None
    return sibling


def backup_name(day: date) -> str:
    """``bookvie-backup-<YYYY-MM-DD>.zip``."""
    return f"bookvie-backup-{day.isoformat()}.zip"


class BackupFile(BaseModel):
    """``export_backup``'s answer: the file's absolute path, its size in bytes, its time, the
    SHA-256 of its ``library.json`` and whether that equals the last recorded upload's."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    path: str
    size: int
    created_at: datetime
    library_hash: str
    unchanged_since_upload: bool


def _library_hash(archive: zipfile.ZipFile) -> str:
    return hashlib.sha256(archive.read(LIBRARY_NAME)).hexdigest()


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


def _locate_backup(backups_dir: Path | None, raw: str) -> tuple[Path, BackupKind] | None:
    """``raw`` as a backup file in ``backups_dir`` with its kind, or ``None``.

    It must be an absolute path with no ``..`` part, naming a regular file
    (not a symlink, not a folder) directly in ``backups_dir`` or its
    ``from-dropbox/``, with a daily or safety-copy name (a daily name only in
    ``from-dropbox/``). The file is never opened here.
    """
    if backups_dir is None:
        return None
    path = Path(raw)
    if not raw or not path.is_absolute() or ".." in path.parts or "\0" in raw:
        return None
    try:
        folder = Path(backups_dir).resolve()
        parent = path.parent.resolve()
    except OSError, RuntimeError, ValueError:
        return None
    if parent == folder:
        kind = _kind_in_folder(path.name)
    elif parent == folder / FROM_DROPBOX:
        kind = _kind_in_from_dropbox(path.name)
    else:
        kind = None
    resolved = parent / path.name
    if kind is None or not _is_regular_file(resolved):
        return None
    return resolved, kind


def resolve_backup_path(backups_dir: Path | None, raw: str) -> tuple[Path, BackupKind]:
    """``raw`` as a backup file a restore may read, with its kind; else 422
    ``restore_outside_backups`` (see :func:`_locate_backup` for the rules)."""
    located = _locate_backup(backups_dir, raw)
    if located is None:
        raise restore_outside_backups()
    return located


def resolve_daily_backup(backups_dir: Path | None, raw: str) -> Path | None:
    """``raw`` as a daily backup directly in ``backups_dir`` (never in ``from-dropbox/``,
    never a safety copy), resolved as :func:`resolve_backup_path` resolves it; else ``None``."""
    located = _locate_backup(backups_dir, raw)
    if located is None or located[1] != "daily":
        return None
    return located[0]


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


# --- How a daily backup run ended (AD-22, Story 13.3) ---------------------------------------

CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's failure causes, in its order: why a daily run failed.

bookvie-dropbox's copy: ``bookvie_dropbox.contracts.CAUSES``; the packages never import
each other, and ``tests/test_dropbox_contracts.py`` keeps the copies equal."""

Outcome = Literal["uploaded", "skipped", "failed"]
Cause = Literal["dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other"]

_UPLOAD_KEYS = ("path", "copies", "contentHash")
_ARGUMENT_KEYS = ("outcome", *_UPLOAD_KEYS, "cause")
_WANTED: dict[str, tuple[str, ...]] = {
    "uploaded": _UPLOAD_KEYS,
    "skipped": (),
    "failed": ("cause",),
}
"""The arguments each outcome needs besides ``outcome``; any other is refused."""


class RecordBackupUploadArguments(IntentModel):
    # A comment, not a docstring: a model's docstring becomes its input schema's description.

    outcome: Outcome
    path: str | None = None
    copies: int | None = Field(default=None, ge=1)
    content_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    cause: Cause | None = None


def _argument_errors(arguments: dict[str, Any]) -> dict[str, FieldError]:
    """Each failing argument's first error, by key: the model's checks (an explicit
    ``null`` included), then what the outcome needs and allows."""
    errors: dict[str, FieldError] = {}
    try:
        RecordBackupUploadArguments.model_validate(arguments)
    except ValidationError as err:
        for error in err.errors():
            key = ".".join(map(str, error["loc"]))
            errors.setdefault(key, FieldError(field=key, message=error["msg"]))
    outcome = arguments.get("outcome")
    wanted = _WANTED.get(outcome) if isinstance(outcome, str) else None
    if wanted is not None:
        for key in _ARGUMENT_KEYS[1:]:
            present = arguments.get(key) is not None
            if key in wanted and not present:
                errors.setdefault(key, FieldError(field=key, message=f"{outcome} needs {key}"))
            elif key not in wanted and present:
                errors.setdefault(key, FieldError(field=key, message=f"{outcome} takes no {key}"))
    return errors


def _refuse(errors: dict[str, FieldError]) -> IntentError:
    """``invalid_fields`` with the arguments in property order, then any unknown key."""
    ordered = [errors[key] for key in _ARGUMENT_KEYS if key in errors]
    ordered += [error for key, error in errors.items() if key not in _ARGUMENT_KEYS]
    return invalid_fields(ordered)


def _read_upload(path: Path) -> tuple[str, str, datetime]:
    """The file's Dropbox content hash, its ``library.json`` SHA-256 and its backup time,
    read through one handle. Raises what reading raises."""
    with open(path, "rb") as source:
        content_hash = _content_hash_of(source)
        source.seek(0)
        with zipfile.ZipFile(source) as archive:
            return content_hash, _library_hash(archive), backup_time(archive)


def record_backup_upload(
    store: Store, clock: Clock, backups_dir: Path | None, arguments: dict[str, Any]
) -> OkResponse:
    """Store how a daily backup run ended under ``autoBackup`` in ``local-state.json``.

    An upload replaces ``lastReport``, ``lastOk`` and ``lastUpload``; a skip
    ``lastReport`` and ``lastOk``; a failure only ``lastReport``. Each ``at``
    is ``clock.now()``. For an upload, ``path`` must be a daily backup directly
    in ``backups_dir`` whose Dropbox content hash is ``contentHash``; bookvie
    hashes its ``library.json`` itself. A refused call is 422 ``invalid_fields``
    naming each failing argument, and stores nothing; a write failure is 503
    ``couldnt_save`` with the file as it was.
    """
    errors = _argument_errors(arguments)
    if errors:
        raise _refuse(errors)
    args = RecordBackupUploadArguments.model_validate(arguments)
    upload: dict[str, Any] | None = None
    if args.outcome == "uploaded":
        located = resolve_daily_backup(backups_dir, args.path or "")
        if located is None:
            raise _refuse({"path": FieldError(field="path", message=_NOT_A_DAILY_BACKUP)})
        try:
            content_hash, library_hash, backup_at = _read_upload(located)
        except (*_ZIP_ERRORS, KeyError, ValueError, OverflowError, zlib.error, EOFError) as exc:
            log(f"refused the upload record: {located.name} can't be read as a backup: {exc}")
            raise _refuse(
                {"path": FieldError(field="path", message="This file can't be read as a backup.")}
            ) from None
        if content_hash != args.content_hash:
            raise _refuse(
                {
                    "contentHash": FieldError(
                        field="contentHash",
                        message="This isn't the Dropbox content hash of the file at path.",
                    )
                }
            )
        upload = {
            "backupAt": backup_at.isoformat(),
            "name": located.name,
            "copies": args.copies,
            "libraryHash": library_hash,
        }
    at = clock.now().isoformat()
    report: dict[str, Any] = {"outcome": args.outcome, "at": at}
    if args.cause is not None:
        report["cause"] = args.cause

    def change(old: Any) -> dict[str, Any]:
        group = dict(old) if isinstance(old, dict) else {}
        group[LAST_REPORT] = report
        if args.outcome != "failed":
            group[LAST_OK] = {"at": at, "outcome": args.outcome}
        if upload is not None:
            group[LAST_UPLOAD] = {"at": at, **upload}
        return group

    try:
        store.local_state.update(AUTO_BACKUP_KEY, change)
    except CouldntSave as exc:
        log(f"couldn't record the backup run in local-state.json: {exc}")
        raise couldnt_save(503) from exc
    return ok()
