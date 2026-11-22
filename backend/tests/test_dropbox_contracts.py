"""Story 13.2: the contracts ``bookvie`` and ``bookvie_dropbox`` each keep a copy of (AD-22).

The two packages never import each other, so the daily-name rule, the folder
names and Dropbox's content hash exist once on each side, and this test keeps
the copies equal. Story 13.3 adds the cause enum, which bookvie's
``record_backup_upload`` accepts and ``upload_backup``'s errors carry. The content hash is also checked against Dropbox's own
published example (its content-hash page, docs.dropboxapi.com,
"Content hash"): the three 4 MiB-block digests of its 9,711,423-byte
``milky-way-nasa.jpg`` and the hash they give.
"""

import hashlib
import random
from pathlib import Path

import pytest

from bookvie.intents import FROM_DROPBOX, backup_file
from bookvie.intents import dropbox_content_hash as bookvie_content_hash
from bookvie.intents.backup_file import (
    DAILY_NAME,
    DEFAULT_BACKUPS_NAME,
    DEV_BACKUPS_NAME,
    _is_daily_name,
)
from tests.agent_client import import_or_fail
from tests.helpers import DROPBOX_BLOCK, dropbox_content_hash

NAMES = {
    "bookvie-backup-2026-11-20.zip": True,
    "bookvie-backup-2024-02-29.zip": True,  # a leap day
    "bookvie-backup-2026-02-29.zip": False,  # not a leap year
    "bookvie-backup-2026-02-30.zip": False,
    "bookvie-backup-2026-13-01.zip": False,
    "bookvie-backup-2026-11-2.zip": False,
    "bookvie-backup-2026-11-20.zip.bak": False,
    "bookvie-backup-2026-11-20.zip\n": False,  # `$` alone would let this through
    "xbookvie-backup-2026-11-20.zip": False,
    "bookvie-backup-2026-11-20.ZIP": False,
    "BOOKVIE-BACKUP-2026-11-20.zip": False,
    "bookvie-backup-２０２６-11-20.zip": False,  # fullwidth digits
    "bookvie-pre-restore-2026-11-20T0901.zip": False,
    ".bookvie-backup-2026-11-20.zip.tmpab12": False,
}

SIZES = [
    0,
    1,
    DROPBOX_BLOCK - 1,
    DROPBOX_BLOCK,
    DROPBOX_BLOCK + 1,
    2 * DROPBOX_BLOCK,
    3 * DROPBOX_BLOCK + 5,
]

# Dropbox's published example (content-hash page): milky-way-nasa.jpg, 9,711,423 bytes.
PUBLISHED_SIZE = 9_711_423
PUBLISHED_BLOCKS = [
    (4_194_304, "2a846fa617c3361fc117e1c5c1e1838c336b6a5cef982c1a2d9bdf68f2f1992a"),
    (4_194_304, "c68469027410ea393eba6551b9fa1e26db775f00eae70a0c3c129a0011a39cf9"),
    (1_322_815, "7376192de020925ce6c5ef5a8a0405e931b0a9a8c75517aacd9ca24a8a56818b"),
]
PUBLISHED_HASH = "485291fa0ee50c016982abbfa943957bcd231aae0492ccbaa22c58e3997b35e0"

CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's cause enum, in its order."""

RED_13_3 = "red phase: Story 13.3 isn't built yet (bmad-build-auto removes this skip per task)"


def test_bookvie_dropbox_copies_the_daily_name_the_folders_and_the_content_hash_exactly(
    tmp_path: Path,
) -> None:
    # [P0] AC-3
    contracts = import_or_fail("bookvie_dropbox.contracts")

    assert {name: contracts.is_daily_name(name) for name in NAMES} == NAMES
    assert {name: _is_daily_name(name) for name in NAMES} == NAMES
    assert contracts.DAILY_NAME.pattern.removeprefix("^").removesuffix("$") == DAILY_NAME.pattern

    assert (contracts.BACKUPS_NAME, contracts.DEV_BACKUPS_NAME, contracts.FROM_DROPBOX) == (
        DEFAULT_BACKUPS_NAME,
        DEV_BACKUPS_NAME,
        FROM_DROPBOX,
    )
    assert (DEFAULT_BACKUPS_NAME, DEV_BACKUPS_NAME, FROM_DROPBOX) == (
        "bookvie-backups",
        "bookvie-backups-dev",
        "from-dropbox",
    )

    for size in SIZES:
        data = random.Random(size).randbytes(size)
        path = tmp_path / f"file-{size}.bin"
        path.write_bytes(data)
        expected = dropbox_content_hash(data)
        assert (contracts.dropbox_content_hash(path), bookvie_content_hash(path)) == (
            expected,
            expected,
        ), size

    # The rule both copies follow, and the test helper they are compared with, is Dropbox's:
    # its published block digests give its published hash, in blocks of DROPBOX_BLOCK.
    assert DROPBOX_BLOCK == PUBLISHED_BLOCKS[0][0]
    assert sum(size for size, _ in PUBLISHED_BLOCKS) == PUBLISHED_SIZE
    digests = b"".join(bytes.fromhex(digest) for _, digest in PUBLISHED_BLOCKS)
    assert hashlib.sha256(digests).hexdigest() == PUBLISHED_HASH


# Un-skip when bookvie has its copy of the cause enum (Story 13.3).
@pytest.mark.skip(reason=RED_13_3)
def test_bookvie_keeps_the_same_cause_enum_as_bookvie_dropbox() -> None:
    # [P0] AC-5 (Story 13.3)
    contracts = import_or_fail("bookvie_dropbox.contracts")

    assert tuple(getattr(backup_file, "CAUSES", ())) == tuple(contracts.CAUSES)

    assert tuple(contracts.CAUSES) == CAUSES
