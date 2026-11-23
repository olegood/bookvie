"""How a Dropbox backup run ended (AD-22, Story 13.3).

:func:`record_backup_upload` (Story 13.3, AD-22) stores how a Dropbox backup run
ended in ``local-state.json`` under ``autoBackup``, through the store's
:class:`~bookvie.store.local_state.LocalStateWriter`.
"""

import zipfile
import zlib
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import Field, ValidationError

from bookvie.domain import Clock
from bookvie.store import CouldntSave, Store
from bookvie.store.local_state import AUTO_BACKUP_KEY

from .answers import ok
from .backup_daily import LAST_OK, LAST_REPORT, LAST_UPLOAD
from .backup_listing import _content_hash_of, _library_hash
from .backup_restore import resolve_daily_backup
from .commit import log
from .contract import FieldError, IntentError, OkResponse, couldnt_save, invalid_fields
from .export import _ZIP_ERRORS, backup_time
from .intent_model import IntentModel

_NOT_A_DAILY_BACKUP = "This isn't a daily backup in this bookvie's backups folder."

CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's failure causes, in its order: why a Dropbox backup run failed.

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
    """Store how a Dropbox backup run ended under ``autoBackup`` in ``local-state.json``.

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
