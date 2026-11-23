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

from bookvie.intents import CAUSES
from bookvie.views.backup import CAUSES as VIEW_CAUSES
from tests.helpers import api_client, failing_reasons
from tests.test_dropbox_backup_guide import GUIDE, headed

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_D_TS = ROOT / "frontend" / "src" / "api" / "generated" / "schema.d.ts"
LINE_TS = ROOT / "frontend" / "src" / "lib" / "dropboxBackupLine.ts"

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


def test_the_guide_has_one_troubleshooting_entry_per_cause_quoting_the_lines_words() -> None:
    # [P1] AC-5
    text = GUIDE.read_text(encoding="utf-8")
    reasons = failing_reasons()
    assert len(reasons) == len(CAUSES), reasons

    for cause, reason in zip(CAUSES, reasons, strict=True):
        entries = [" ".join(entry.split()) for entry in headed(text, rf"^`{cause}`")]
        # The criterion: the cause's one entry quotes the line's reason word for word.
        assert len(entries) == 1 and reason in entries[0], (cause, reason, entries)


def test_a_report_with_a_bad_field_reads_as_none_and_a_bad_upload_on_a_failure_is_dropped(
    tmp_path: Path,
) -> None:
    # [P1] AC-1, I/O matrix "Unreadable" and "Bad lastUpload on a failure"
    upload = UPLOAD_GROUP["lastUpload"]
    unreadable: list[Any] = [
        {"lastReport": "uploaded"},
        {**UPLOAD_GROUP, "lastReport": {"outcome": "uploaded"}},
        {**UPLOAD_GROUP, "lastReport": {"outcome": "uploaded", "at": "2026-11-19T09:02:41"}},
        {**UPLOAD_GROUP, "lastReport": {"outcome": "uploaded", "at": "yesterday"}},
        {**UPLOAD_GROUP, "lastReport": {"outcome": "uploaded", "at": 1763539361}},
        {**FAIL_GROUP, "lastReport": {"outcome": "failed", "at": FAIL_AT}},
        {**FAIL_GROUP, "lastReport": {"outcome": "failed", "at": FAIL_AT, "cause": "gone"}},
        {"lastReport": {"outcome": "uploaded", "at": UPLOAD_AT}},
        {"lastReport": {"outcome": "skipped", "at": SKIP_AT}},
        {**UPLOAD_GROUP, "lastUpload": {**upload, "copies": 0}},
        {**UPLOAD_GROUP, "lastUpload": {**upload, "copies": True}},
        {**SKIP_GROUP, "lastUpload": {**upload, "backupAt": "2026-11-19T09:02:05"}},
        {**SKIP_GROUP, "lastUpload": "bookvie-backup-2026-11-19.zip"},
    ]
    for group in unreadable:
        _store(tmp_path, {"autoBackup": group})
        assert _dropbox_backup(tmp_path) == {
            "state": "none",
            "reportAt": None,
            "lastUploadAt": None,
            "copies": None,
            "cause": None,
        }, group

    # A failure keeps its report and cause; only the bad last upload is dropped.
    for bad in (
        {**upload, "copies": True},
        {**upload, "copies": 2.0},
        {**upload, "copies": -1},
        {**upload, "backupAt": "not a time"},
        {**upload, "backupAt": "2026-11-19T09:02:05"},
    ):
        _store(tmp_path, {"autoBackup": {**FAIL_GROUP, "lastUpload": bad}})
        assert _dropbox_backup(tmp_path) == {
            "state": "failed",
            "reportAt": FAIL_AT,
            "lastUploadAt": None,
            "copies": None,
            "cause": "dropbox_signin",
        }, bad


def test_the_views_copy_of_the_causes_matches_intents() -> None:
    # [P1] AC-1: views may not import intents, so it keeps its own copy (test_layers.py).
    assert VIEW_CAUSES == CAUSES


def test_the_pages_reasons_match_experience_md_in_cause_order() -> None:
    # [P1] AC-2: the frontend's REASONS copy EXPERIENCE.md's Failed reasons word for word.
    source = LINE_TS.read_text(encoding="utf-8")
    block = re.search(r"export const REASONS[^{]*\{(.*?)\n\}", source, re.S)
    assert block, "REASONS not found in dropboxBackupLine.ts"
    pairs = re.findall(r"^\s*(\w+):\s*(?:'([^']*)'|\"([^\"]*)\"),?\s*$", block.group(1), re.M)
    reasons = {cause: single or double for cause, single, double in pairs}
    expected = dict(zip(CAUSES, failing_reasons(), strict=True))
    assert list(reasons.items()) == list(expected.items())
