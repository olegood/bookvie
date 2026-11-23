"""The ``backup`` view: "Last export" and the Dropbox backup line, from ``local-state.json`` (AD-15, AD-22)."""

from datetime import datetime
from typing import Any, get_args

from bookvie.store import Store, read_last_export
from bookvie.store.local_state import AUTO_BACKUP_KEY, read_group

from .models import BackupView, DropboxBackupView, DropboxCause

CAUSES: tuple[str, ...] = get_args(DropboxCause)
"""The failure causes, in AD-22's order: the views copy of ``intents.CAUSES``."""

_NONE = DropboxBackupView(
    state="none", report_at=None, last_upload_at=None, copies=None, cause=None
)
_DEV = DropboxBackupView(state="dev", report_at=None, last_upload_at=None, copies=None, cause=None)


def backup(store: Store, *, dev: bool = False) -> BackupView:
    """When the last export finished, and how the last Dropbox backup went.

    ``last_export_at`` is ``None`` when no export finished or the record is
    unreadable. Never raises.
    """
    return BackupView(
        last_export_at=read_last_export(store.data_dir),
        dropbox_backup=_DEV if dev else dropbox_backup(read_group(store.data_dir, AUTO_BACKUP_KEY)),
    )


def dropbox_backup(group: Any) -> DropboxBackupView:
    """The Dropbox backup line's data from the stored ``autoBackup`` group.

    Anything that can't be read is ``none`` (no report yet): a group that isn't
    an object, an unknown outcome, an ``at`` that isn't ISO-8601 with an offset,
    a failure without a known cause, or an upload or skip without a valid
    ``lastUpload``. A failure with a bad ``lastUpload`` just has no last upload.
    """
    if not isinstance(group, dict):
        return _NONE
    report = group.get("lastReport")
    if not isinstance(report, dict):
        return _NONE
    outcome = report.get("outcome")
    at = _aware(report.get("at"))
    if outcome not in ("uploaded", "skipped", "failed") or at is None:
        return _NONE
    upload = _last_upload(group.get("lastUpload"))
    if outcome == "failed":
        cause = report.get("cause")
        if cause not in CAUSES:
            return _NONE
        last_upload_at, copies = upload or (None, None)
        return DropboxBackupView(
            state="failed", report_at=at, last_upload_at=last_upload_at, copies=copies, cause=cause
        )
    if upload is None:
        return _NONE
    last_upload_at, copies = upload
    return DropboxBackupView(
        state=outcome, report_at=at, last_upload_at=last_upload_at, copies=copies, cause=None
    )


def _last_upload(upload: Any) -> tuple[datetime, int] | None:
    """``(backupAt, copies)`` of a valid ``lastUpload``, else ``None``."""
    if not isinstance(upload, dict):
        return None
    backup_at = _aware(upload.get("backupAt"))
    copies = upload.get("copies")
    if backup_at is None or isinstance(copies, bool) or not isinstance(copies, int) or copies < 1:
        return None
    return backup_at, copies


def _aware(value: Any) -> datetime | None:
    """An ISO-8601 time with an offset, else ``None``."""
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value)
    except ValueError:
        return None
    if when.tzinfo is None or when.utcoffset() is None:
        return None
    return when
