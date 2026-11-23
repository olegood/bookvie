"""The contracts bookvie and bookvie-dropbox each keep a copy of (AD-22).

The two packages never import each other, so each rule here exists once on
bookvie's side too, and ``tests/test_dropbox_contracts.py`` keeps the copies
equal. Stdlib only.
"""

import hashlib
import re
from datetime import date
from pathlib import Path

DAILY_NAME = re.compile(r"^bookvie-backup-(\d{4}-\d{2}-\d{2})\.zip$", re.ASCII)
"""A daily backup's name, matched with ``fullmatch``; the date must be a real calendar day.

bookvie's copy: ``bookvie.intents.backup_names.DAILY_NAME`` (without the anchors)."""

BACKUPS_NAME = "bookvie-backups"
"""The backups folder in the home folder, ``~/bookvie-backups``.

bookvie's copy: ``bookvie.intents.backup_names.DEFAULT_BACKUPS_NAME``."""

DEV_BACKUPS_NAME = "bookvie-backups-dev"
"""A ``--dev`` server's backups folder, ``~/bookvie-backups-dev``: never uploaded.

bookvie's copy: ``bookvie.intents.backup_names.DEV_BACKUPS_NAME``."""

FROM_DROPBOX = "from-dropbox"
"""The folder in a backups folder that downloads from Dropbox go into.

bookvie's copy: ``bookvie.intents.backup_names.FROM_DROPBOX``."""

DROPBOX_BLOCK = 4 * 1024 * 1024
"""Dropbox hashes a file in 4 MiB blocks.

bookvie's copy: ``bookvie.intents.backup_listing.CONTENT_HASH_BLOCK``."""

CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's failure causes, in its order. ``backup_write`` is bookvie's export failing
(recorded by Story 13.4); bookvie-dropbox itself never answers it.

bookvie's copy: Story 13.3's ``record_backup_upload`` cause."""


def daily_date(name: str) -> date | None:
    """The calendar day a daily backup's ``name`` carries, or ``None`` for any other name."""
    match = DAILY_NAME.fullmatch(name)
    if match is None:
        return None
    try:
        return date.fromisoformat(match.group(1))
    except ValueError:
        return None


def is_daily_name(name: str) -> bool:
    """Whether ``name`` is a daily backup's name, on a real calendar day.

    bookvie's copy: ``bookvie.intents.backup_names._is_daily_name``."""
    return daily_date(name) is not None


class ContentHasher:
    """Dropbox's content hash of bytes fed in any pieces: SHA-256 over each block's SHA-256."""

    def __init__(self) -> None:
        self._outer = hashlib.sha256()
        self._block = hashlib.sha256()
        self._filled = 0

    def update(self, data: bytes) -> None:
        view = memoryview(data)
        while view:
            take = min(DROPBOX_BLOCK - self._filled, len(view))
            self._block.update(view[:take])
            self._filled += take
            view = view[take:]
            if self._filled == DROPBOX_BLOCK:
                self._outer.update(self._block.digest())
                self._block = hashlib.sha256()
                self._filled = 0

    def hexdigest(self) -> str:
        outer = self._outer.copy()
        if self._filled:
            outer.update(self._block.digest())
        return outer.hexdigest()


def dropbox_content_hash(path: Path) -> str:
    """Dropbox's content hash of the file at ``path``, in lowercase hex.

    bookvie's copy: ``bookvie.intents.backup_listing.dropbox_content_hash``."""
    hasher = ContentHasher()
    with open(path, "rb") as source:
        while block := source.read(DROPBOX_BLOCK):
            hasher.update(block)
    return hasher.hexdigest()
