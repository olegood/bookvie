"""The backups folder and the names of the files in it (AD-21's Backup, AD-22).

:func:`backups_folder` is the folder rule: it follows the data folder, not
the mode. The home folder is passed in, so this layer never reads
``Path.home()``.

A daily backup is named ``bookvie-backup-<YYYY-MM-DD>.zip`` (:func:`backup_name`),
a safety copy ``bookvie-pre-restore-<YYYY-MM-DDTHHMM>[-N].zip``
(:func:`safety_copy_name`); the downloads from Dropbox go into the backups
folder's ``from-dropbox/``.
"""

import os
import re
from datetime import date, datetime
from pathlib import Path
from typing import Literal

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


DAILY_NAME = re.compile(r"bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip", re.ASCII)
"""A daily backup's name, matched whole (``fullmatch``); the date must be a real calendar day."""
SAFETY_NAME = re.compile(
    r"bookvie-pre-restore-(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(?:-([2-9]|[1-9]\d+))?\.zip",
    re.ASCII,
)
"""A safety copy's name, ``bookvie-pre-restore-<YYYY-MM-DDTHHMM>[-N].zip`` with N from 2."""
FROM_DROPBOX = "from-dropbox"
"""The folder inside the backups folder that downloads from Dropbox go into (Story 13.7)."""

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


def safety_copy_name(now: datetime, suffix: int = 1) -> str:
    """``bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`` in local time, ``-N`` from 2."""
    stamp = now.astimezone().strftime("%Y-%m-%dT%H%M")
    return f"bookvie-pre-restore-{stamp}{'' if suffix == 1 else f'-{suffix}'}.zip"
