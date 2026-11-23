"""Which backup a restore may read, and the safety copy it writes first (AD-22, Story 13.1).

:func:`resolve_backup_path` is the path rule: a backup a restore may read is
a regular file directly in the backups folder or its ``from-dropbox/``, with a
backup's name. :func:`write_safety_copy` saves the current library as a new
safety copy before a restore replaces it.
"""

import os
import stat
from datetime import datetime
from pathlib import Path
from tempfile import SpooledTemporaryFile

from bookvie.store import Store

from .backup_daily import _write_atomic
from .backup_names import (
    FROM_DROPBOX,
    BackupKind,
    _kind_in_folder,
    _kind_in_from_dropbox,
    safety_copy_name,
)
from .commit import log
from .contract import restore_outside_backups, safety_copy_failed
from .export import _ZIP_ERRORS, SPOOL_MEMORY_LIMIT, write_export_zip


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
