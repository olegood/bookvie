"""Story 13.6 follow-ups: the Dropbox backup line's data from what the real writer stores.

``test_dropbox_backup_line.py`` seeds the ``autoBackup`` group by hand, in the shape
``record_backup_upload`` writes. These leaves write it with the shipped tool instead,
so a change to the writer's shape that the view doesn't follow fails here rather than
showing "none yet" on the page (AD-22 → Upload state, Dropbox backup line).
"""

from collections.abc import Callable
from pathlib import Path
from typing import Any

from bookvie.intents import CAUSES
from tests.agent_client import EXPORT_BACKUP, RECORD_BACKUP_UPLOAD, McpClient
from tests.test_agent_backup import _when
from tests.test_agent_backup_upload import NOW, STEP, TODAY_BACKUP, _connect, _uploaded
from tests.test_dropbox_backup_line import UPLOAD_GROUP, _dropbox_backup, _store


def _line(client: McpClient) -> dict[str, Any]:
    """``views/backup``'s ``dropboxBackup``, with its times read as instants."""
    response = client.http.get("/api/views/backup")
    assert response.status_code == 200, response.text
    line = response.json()["dropboxBackup"]
    return {
        **line,
        "reportAt": _when(line["reportAt"]),
        "lastUploadAt": _when(line["lastUploadAt"]),
    }


def _record(client: McpClient, arguments: dict[str, Any]) -> None:
    answer = client.answer(RECORD_BACKUP_UPLOAD, arguments)
    assert answer.get("isError") is not True, answer


def test_what_record_backup_upload_stores_is_what_the_line_shows(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-1: an upload, a skip, then a failure for each cause, each written by the tool.
    client, _, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    clock.advance(STEP)
    uploaded_at = clock.now()

    _record(client, _uploaded(backups / TODAY_BACKUP, copies=2))

    # lastUploadAt is the zip's own time (NOW), not the report's.
    assert _line(client) == {
        "state": "uploaded",
        "reportAt": uploaded_at,
        "lastUploadAt": NOW,
        "copies": 2,
        "cause": None,
    }

    clock.advance(STEP)
    skipped_at = clock.now()
    _record(client, {"outcome": "skipped"})
    assert _line(client) == {
        "state": "skipped",
        "reportAt": skipped_at,
        "lastUploadAt": NOW,
        "copies": 2,
        "cause": None,
    }

    for cause in CAUSES:
        clock.advance(STEP)
        failed_at = clock.now()
        _record(client, {"outcome": "failed", "cause": cause})
        assert _line(client) == {
            "state": "failed",
            "reportAt": failed_at,
            "lastUploadAt": NOW,
            "copies": 2,
            "cause": cause,
        }, cause


def test_a_failure_recorded_before_any_upload_shows_no_last_upload(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-1, I/O matrix "Failure, never uploaded", written by the tool.
    client, _, _, clock = _connect(connect_mcp, tmp_path)
    failed_at = clock.now()

    _record(client, {"outcome": "failed", "cause": "backup_write"})

    assert _line(client) == {
        "state": "failed",
        "reportAt": failed_at,
        "lastUploadAt": None,
        "copies": None,
        "cause": "backup_write",
    }


def test_only_a_failure_carries_a_cause_and_a_utc_time_reads_as_the_same_instant(
    tmp_path: Path,
) -> None:
    # [P2] AC-1: "cause is set only when failed"; a stray stored cause on an upload or a
    # skip is dropped, and a time written with Z is as readable as one with +01:00.
    for outcome in ("uploaded", "skipped"):
        report = {"outcome": outcome, "at": "2026-11-19T08:02:41Z", "cause": "other"}
        _store(tmp_path, {"autoBackup": {**UPLOAD_GROUP, "lastReport": report}})

        line = _dropbox_backup(tmp_path)

        assert line["cause"] is None, (outcome, line)
        assert line["state"] == outcome
        assert _when(line["reportAt"]) == _when("2026-11-19T09:02:41+01:00")
