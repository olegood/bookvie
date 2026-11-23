"""Story 13.6: the Dropbox backup line's data, and the guide's entry per failure cause.

``views/backup`` carries ``dropboxBackup: {state, reportAt, lastUploadAt, copies,
cause}`` (AR54, spine AD-22 → Dropbox backup line). The server computes ``state``,
first match wins: ``dev`` on a ``--dev`` server whatever is stored; ``none`` when
there is no report, or the stored ``autoBackup`` group is missing or unreadable;
otherwise the latest report's outcome. ``reportAt`` is ``lastReport.at``,
``lastUploadAt`` the upload's ``backupAt``, ``copies`` the last upload's count (a
skip keeps it), ``cause`` the failure's cause. The group is written here by hand,
in the shape ``record_backup_upload`` writes (Story 13.3).

The line's words, style and behavior are e2e (``frontend/e2e/dropbox-backup-line.spec.ts``).
"""

import json
import re
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import CAUSES
from tests.helpers import api_client, failing_reasons
from tests.test_dropbox_backup_guide import GUIDE, headed

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_D_TS = ROOT / "frontend" / "src" / "api" / "generated" / "schema.d.ts"

RED_13_6 = "red phase (Story 13.6): views/backup has no dropboxBackup and the guide quotes no line"

LAST_EXPORT = "2026-11-02T18:40:00+01:00"
UPLOAD_AT = "2026-11-19T09:02:41+01:00"
# The file's own backup time, a little before the report: lastUploadAt is this one.
BACKUP_AT = "2026-11-19T09:02:05+01:00"
SKIP_AT = "2026-11-20T09:01:12+01:00"
FAIL_AT = "2026-11-21T09:03:30+01:00"

UPLOAD_GROUP: dict[str, Any] = {
    "lastReport": {"outcome": "uploaded", "at": UPLOAD_AT},
    "lastOk": {"at": UPLOAD_AT, "outcome": "uploaded"},
    "lastUpload": {
        "at": UPLOAD_AT,
        "backupAt": BACKUP_AT,
        "name": "bookvie-backup-2026-11-19.zip",
        "copies": 3,
        "libraryHash": "a" * 64,
    },
}
SKIP_GROUP: dict[str, Any] = {
    **UPLOAD_GROUP,
    "lastReport": {"outcome": "skipped", "at": SKIP_AT},
    "lastOk": {"at": SKIP_AT, "outcome": "skipped"},
}
FAIL_GROUP: dict[str, Any] = {
    **SKIP_GROUP,
    "lastReport": {"outcome": "failed", "at": FAIL_AT, "cause": "dropbox_signin"},
}
FAIL_WITHOUT_UPLOAD: dict[str, Any] = {
    "lastReport": {"outcome": "failed", "at": FAIL_AT, "cause": "dropbox_full"},
}
FIELDS = {"state", "reportAt", "lastUploadAt", "copies", "cause"}


def _store(data_dir: Path, doc: Any) -> None:
    raw = doc if isinstance(doc, str) else json.dumps(doc)
    (data_dir / "local-state.json").write_text(raw, encoding="utf-8")


def _dropbox_backup(data_dir: Path, *, dev: bool = False) -> Any:
    response = api_client(data_dir, raise_server_exceptions=True, dev=dev).get("/api/views/backup")
    assert response.status_code == 200
    return response.json().get("dropboxBackup")


# Un-skip when views/backup carries dropboxBackup (BackupView in views/models.py, then api:gen).
@pytest.mark.skip(reason=RED_13_6)
def test_views_backup_carries_the_dropbox_backup_state_computed_on_the_server(
    tmp_path: Path,
) -> None:
    # [P0] AC-1
    _store(tmp_path, {"lastExportAt": LAST_EXPORT, "autoBackup": UPLOAD_GROUP})
    client = api_client(tmp_path, raise_server_exceptions=True)
    body = client.get("/api/views/backup").json()

    # The criterion: the latest report, an upload, is the state.
    assert (body.get("dropboxBackup") or {}).get("state") == "uploaded"

    assert body == {
        "lastExportAt": LAST_EXPORT,
        "dropboxBackup": {
            "state": "uploaded",
            "reportAt": UPLOAD_AT,
            "lastUploadAt": BACKUP_AT,
            "copies": 3,
            "cause": None,
        },
    }

    # A skip keeps the last upload's time and count.
    _store(tmp_path, {"lastExportAt": LAST_EXPORT, "autoBackup": SKIP_GROUP})
    assert _dropbox_backup(tmp_path) == {
        "state": "skipped",
        "reportAt": SKIP_AT,
        "lastUploadAt": BACKUP_AT,
        "copies": 3,
        "cause": None,
    }

    # A failure carries its cause, and the upload before it.
    _store(tmp_path, {"autoBackup": FAIL_GROUP})
    assert _dropbox_backup(tmp_path) == {
        "state": "failed",
        "reportAt": FAIL_AT,
        "lastUploadAt": BACKUP_AT,
        "copies": 3,
        "cause": "dropbox_signin",
    }

    # A failure with no upload ever: no last upload, no count.
    _store(tmp_path, {"autoBackup": FAIL_WITHOUT_UPLOAD})
    assert _dropbox_backup(tmp_path) == {
        "state": "failed",
        "reportAt": FAIL_AT,
        "lastUploadAt": None,
        "copies": None,
        "cause": "dropbox_full",
    }

    # None: no file, no group, or a group or file that can't be read.
    (tmp_path / "local-state.json").unlink()
    for stored in (
        None,
        {"lastExportAt": LAST_EXPORT},
        "{not json",
        {"autoBackup": "uploaded"},
        {"autoBackup": {"lastReport": {"outcome": "sent", "at": UPLOAD_AT}}},
    ):
        if stored is not None:
            _store(tmp_path, stored)
        seen = _dropbox_backup(tmp_path)
        assert isinstance(seen, dict) and set(seen) == FIELDS, (stored, seen)
        assert seen["state"] == "none", (stored, seen)

    # Dev: a --dev server says dev, whatever is stored.
    for stored in (UPLOAD_GROUP, FAIL_GROUP):
        _store(tmp_path, {"autoBackup": stored})
        assert _dropbox_backup(tmp_path, dev=True)["state"] == "dev"

    # Pydantic, then api:gen: the client's types carry it.
    assert re.search(r"\bdropboxBackup\b", SCHEMA_D_TS.read_text(encoding="utf-8"))


# Un-skip when docs/dropbox-backup.md quotes the line's words in each cause's entry.
@pytest.mark.skip(reason=RED_13_6)
def test_the_guide_has_one_troubleshooting_entry_per_cause_quoting_the_lines_words() -> None:
    # [P1] AC-5
    text = GUIDE.read_text(encoding="utf-8")
    reasons = failing_reasons()
    assert len(reasons) == len(CAUSES), reasons

    for cause, reason in zip(CAUSES, reasons, strict=True):
        entries = [" ".join(entry.split()) for entry in headed(text, rf"^`{cause}`")]
        # The criterion: the cause's one entry quotes the line's reason word for word.
        assert len(entries) == 1 and reason in entries[0], (cause, reason, entries)
