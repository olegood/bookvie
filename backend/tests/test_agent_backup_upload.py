"""Story 13.3: bookvie records each upload, and an unchanged library isn't uploaded again (AD-22).

``export_backup({forUpload: true})`` writes the day's backup like any other
call but doesn't move "Last export", and every call answers ``libraryHash``
(the SHA-256 of the zip's ``library.json``) and ``unchangedSinceUpload``.
``record_backup_upload`` stores how a daily run ended in ``local-state.json``
under ``autoBackup``: ``lastReport``, ``lastOk`` and ``lastUpload``, each time
from the app's ``Clock``. One writer in ``store/local_state``, under its own
lock, changes only its own group, so "Last export" and the upload state
survive each other's writes (AD-15).

A data folder whose sibling rule would land on ``~/bookvie-backups`` (such
as ``~/bookvie``) gets no backups folder at all: only ``~/bookvie-data``
writes there.

Every test's ``HOME`` is a temporary folder (``conftest.py``), so no leaf can
reach the real ``~/bookvie-data`` or a real backups folder.
"""

import hashlib
import io
import json
import os
import threading
import zipfile
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest

from bookvie.intents import backup_daily, record_backup_upload
from bookvie.store import local_state
from bookvie.store.fs import OsFileSystem
from tests.agent_client import (
    AGENT_TOOL_NAMES,
    DESCRIPTIONS,
    EXPORT_BACKUP,
    LIST_LOCAL_BACKUPS,
    RECORD_BACKUP_UPLOAD,
    McpClient,
    error_of,
    structured_of,
)
from tests.helpers import (
    FaultyFs,
    SetClock,
    backup_zip,
    dropbox_content_hash,
    post_restore,
)
from tests.restore_scene import members, within
from tests.test_agent_backup import (
    EARLIER_EXPORT,
    EARLIER_EXPORT_AT,
    EXPORT_HEADERS,
    LOCAL_STATE,
    _names,
    _seed_with_cover,
    _when,
    backup_name,
)
from tests.test_agent_write import UPDATE, running_bookvie

MADRID = ZoneInfo("Europe/Madrid")
NOW = datetime(2026, 11, 20, 9, 1, 36, tzinfo=MADRID)
"""When the daily run's export happens: the backup time its zip carries."""
TODAY_BACKUP = backup_name(NOW.date())
STEP = timedelta(minutes=2)
"""How far the clock moves between two calls, so every recorded time is told apart."""

CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's cause enum, in its order."""
OTHER_HASH = "0" * 64
"""A well-formed Dropbox content hash that no backup has."""

# An upload a previous run recorded (19 Nov), as the hand-written prior state of AC-4.
PRIOR_UPLOAD = {
    "lastReport": {"outcome": "uploaded", "at": "2026-11-19T09:02:10+01:00"},
    "lastOk": {"at": "2026-11-19T09:02:10+01:00", "outcome": "uploaded"},
    "lastUpload": {
        "at": "2026-11-19T09:02:10+01:00",
        "backupAt": "2026-11-19T09:01:02+01:00",
        "name": "bookvie-backup-2026-11-19.zip",
        "copies": 3,
        "libraryHash": "a" * 64,
    },
}
PRIOR_STATE = {"lastExportAt": "2026-10-01T09:30:00+02:00", "autoBackup": PRIOR_UPLOAD}

TIME_KEYS = ("at", "backupAt")


def _state(folder: Path) -> dict[str, Any]:
    """``local-state.json`` in ``folder`` as JSON; ``{}`` when it is missing."""
    path = folder / LOCAL_STATE
    return json.loads(path.read_bytes()) if path.exists() else {}


def _instants(group: Any) -> Any:
    """An ``autoBackup`` group (or one of its parts) with each ISO-8601 time read as an
    instant, so two spellings of one time (``+01:00``, ``Z``) compare equal."""
    if not isinstance(group, dict):
        return group
    return {
        key: (_when(value) if key in TIME_KEYS else _instants(value))
        for key, value in group.items()
    }


def _library_hash(zip_path: Path) -> str:
    """The SHA-256 of the ``library.json`` inside the zip at ``zip_path``, in hex."""
    return hashlib.sha256(members(zip_path)["library.json"]).hexdigest()


def _connect(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> tuple[McpClient, Path, Path, SetClock]:
    """An MCP client on a seeded library, its backups folder ``<tmp_path>/library-backups``,
    its clock at :data:`NOW`."""
    folder = tmp_path / "library"
    _seed_with_cover(folder)
    backups = tmp_path / "library-backups"
    clock = SetClock(NOW)
    return connect_mcp(data_dir=folder, backups_dir=backups, clock=clock), folder, backups, clock


def _uploaded(path: Path, copies: int = 3) -> dict[str, Any]:
    """``record_backup_upload``'s arguments for an upload of the file at ``path``."""
    return {
        "outcome": "uploaded",
        "path": str(path),
        "copies": copies,
        "contentHash": dropbox_content_hash(path.read_bytes()),
    }


def _field_names(answer: dict[str, Any]) -> list[str]:
    """The ``field`` of each entry of an ``invalid_fields`` error's ``fields``."""
    return [entry.get("field") for entry in error_of(answer).get("fields") or []]


# --- AC-1: forUpload leaves "Last export" alone; both answer libraryHash and the flag -----


def test_export_backup_for_upload_writes_the_day_but_leaves_last_export_and_says_if_unchanged(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-1. "Last export" starts at an earlier download's time.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    answer = client.answer(EXPORT_BACKUP, {"forUpload": True})

    assert _names(backups) == [TODAY_BACKUP], answer

    written = backups / TODAY_BACKUP
    # "Last export" doesn't move, on Backup or Home, nor in the file.
    assert _when(client.http.get("/api/views/backup").json()["lastExportAt"]) == EARLIER_EXPORT_AT
    assert _when(client.http.get("/api/views/home").json()["lastExportAt"]) == EARLIER_EXPORT_AT
    assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT
    first = structured_of(answer)
    assert set(first) == {"path", "size", "createdAt", "libraryHash", "unchangedSinceUpload"}
    assert first["path"] == str(written)
    assert _when(first["createdAt"]) == NOW
    # The fingerprint is the zip's library.json, which is the library.json on disk.
    assert first["libraryHash"] == _library_hash(written)
    assert (
        first["libraryHash"] == hashlib.sha256((folder / "library.json").read_bytes()).hexdigest()
    )
    assert first["unchangedSinceUpload"] is False  # nothing uploaded yet

    # Once that zip is recorded as uploaded, the same library is unchanged since the upload...
    clock.advance(STEP)
    recorded = client.answer(RECORD_BACKUP_UPLOAD, _uploaded(written))
    assert recorded.get("isError") is not True, recorded
    clock.advance(STEP)
    again = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert again["libraryHash"] == first["libraryHash"]
    assert again["unchangedSinceUpload"] is True
    # ...and a changed one isn't.
    client.call_tool("update_page", UPDATE)
    changed = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert changed["libraryHash"] != first["libraryHash"]
    assert changed["unchangedSinceUpload"] is False
    assert _when(_state(folder)["lastExportAt"]) == EARLIER_EXPORT_AT

    # Without forUpload, or with false, the backup is "Last export" as before, and answers both.
    for arguments in ({}, {"forUpload": False}):
        clock.advance(STEP)
        plain = structured_of(client.call_tool(EXPORT_BACKUP, arguments))
        assert _when(client.http.get("/api/views/backup").json()["lastExportAt"]) == clock.now(), (
            arguments
        )
        assert _when(client.http.get("/api/views/home").json()["lastExportAt"]) == clock.now()
        assert plain["libraryHash"] == changed["libraryHash"], arguments
        assert plain["unchangedSinceUpload"] is False, arguments

    # The tool says so, and takes only an optional boolean forUpload.
    listed = client.tool(EXPORT_BACKUP)
    assert listed["description"] == DESCRIPTIONS[EXPORT_BACKUP]
    schema = listed["inputSchema"]
    assert list(schema["properties"]) == ["forUpload"]
    assert schema["properties"]["forUpload"].get("type") == "boolean"
    assert schema.get("required", []) == []
    assert schema.get("additionalProperties") is False


# --- AC-2: the tool list ----------------------------------------------------------------


def test_the_tool_list_adds_record_backup_upload_after_the_restore_tools(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-2
    tools = mcp_client.list_tools()

    assert [tool["name"] for tool in tools] == AGENT_TOOL_NAMES

    listed = {tool["name"]: tool for tool in tools}
    record = listed[RECORD_BACKUP_UPLOAD]
    assert record["description"] == DESCRIPTIONS[RECORD_BACKUP_UPLOAD]
    schema = record["inputSchema"]
    assert schema.get("type") == "object"
    assert set(schema["properties"]) == {"outcome", "path", "copies", "contentHash", "cause"}
    assert schema.get("required") == ["outcome"]
    assert schema.get("additionalProperties") is False
    assert schema["properties"]["copies"].get("type") == "integer"
    for key in ("outcome", "path", "contentHash", "cause"):
        assert schema["properties"][key].get("type") == "string", (key, schema["properties"][key])


# --- AC-3: an upload is stored with bookvie's own hash; a bad argument stores nothing -----


def test_an_upload_is_recorded_with_the_clocks_time_the_zips_time_and_bookvies_own_hash(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-3. The day's backup is written at NOW (setup, through Story 12.6's tool); the
    # run reports the upload two minutes later.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    written = backups / TODAY_BACKUP
    clock.advance(STEP)
    reported_at = clock.now()
    exported = _state(folder).get("lastExportAt")

    answer = client.answer(RECORD_BACKUP_UPLOAD, _uploaded(written, copies=3))

    assert _instants(_state(folder).get("autoBackup")) == {
        "lastReport": {"outcome": "uploaded", "at": reported_at},
        "lastOk": {"at": reported_at, "outcome": "uploaded"},
        "lastUpload": {
            "at": reported_at,
            "backupAt": NOW,
            "name": TODAY_BACKUP,
            "copies": 3,
            "libraryHash": _library_hash(written),
        },
    }, answer

    assert answer.get("isError") is not True, answer
    assert _state(folder).get("lastExportAt") == exported  # an upload isn't an export

    # Each broken argument is invalid_fields on that argument, and nothing is stored.
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / TODAY_BACKUP).write_bytes(written.read_bytes())
    safety = backups / "bookvie-pre-restore-2026-11-20T0901.zip"
    safety.write_bytes(written.read_bytes())
    (backups / "from-dropbox").mkdir()
    (backups / "from-dropbox" / TODAY_BACKUP).write_bytes(written.read_bytes())
    good = _uploaded(written)
    without_copies = {key: value for key, value in good.items() if key != "copies"}
    refusals = {
        "hash_mismatch": ({**good, "contentHash": OTHER_HASH}, "contentHash"),
        "outside_the_folder": ({**good, "path": str(elsewhere / TODAY_BACKUP)}, "path"),
        "from_dropbox": ({**good, "path": str(backups / "from-dropbox" / TODAY_BACKUP)}, "path"),
        "not_a_daily_name": ({**good, "path": str(safety)}, "path"),
        "missing_file": ({**good, "path": str(backups / backup_name(date(2026, 11, 18)))}, "path"),
        "no_copies": (without_copies, "copies"),
    }
    stored = (folder / LOCAL_STATE).read_bytes()
    for case, (arguments, field) in refusals.items():
        clock.advance(STEP)
        refused = client.answer(RECORD_BACKUP_UPLOAD, arguments)
        assert error_of(refused).get("code") == "invalid_fields", (case, refused)
        assert _field_names(refused) == [field], (case, refused)
        assert (folder / LOCAL_STATE).read_bytes() == stored, case


# --- AC-4: a skip and a failure; a bad outcome or cause stores nothing --------------------


def test_a_skip_replaces_the_report_and_the_last_ok_and_a_failure_only_the_report(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-4. Yesterday's run uploaded (hand-written state); today's run skips, then fails.
    client, folder, _, clock = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_text(json.dumps(PRIOR_STATE))
    skipped_at = clock.now()

    skipped = client.answer(RECORD_BACKUP_UPLOAD, {"outcome": "skipped"})

    assert _instants(_state(folder).get("autoBackup", {}).get("lastOk")) == {
        "at": skipped_at,
        "outcome": "skipped",
    }, skipped

    assert skipped.get("isError") is not True, skipped
    after_skip = _state(folder)
    assert _instants(after_skip["autoBackup"]["lastReport"]) == {
        "outcome": "skipped",
        "at": skipped_at,
    }
    assert after_skip["autoBackup"]["lastUpload"] == PRIOR_UPLOAD["lastUpload"]
    assert after_skip["lastExportAt"] == PRIOR_STATE["lastExportAt"]

    clock.advance(STEP)
    failed_at = clock.now()
    failed = client.answer(RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": "dropbox_full"})
    assert failed.get("isError") is not True, failed
    after_failure = _state(folder)
    assert _instants(after_failure["autoBackup"]["lastReport"]) == {
        "outcome": "failed",
        "at": failed_at,
        "cause": "dropbox_full",
    }
    assert after_failure["autoBackup"]["lastOk"] == after_skip["autoBackup"]["lastOk"]
    assert after_failure["autoBackup"]["lastUpload"] == PRIOR_UPLOAD["lastUpload"]
    assert after_failure["lastExportAt"] == PRIOR_STATE["lastExportAt"]

    # Every cause in the enum is accepted for a failure.
    for cause in CAUSES:
        clock.advance(STEP)
        each = client.answer(RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": cause})
        assert each.get("isError") is not True, (cause, each)
        assert _state(folder)["autoBackup"]["lastReport"]["cause"] == cause

    # A cause outside the enum, a failure without one, or an unknown outcome stores nothing.
    refusals = {
        "unknown_cause": ({"outcome": "failed", "cause": "dropbox_down"}, "cause"),
        "failure_without_cause": ({"outcome": "failed"}, "cause"),
        "unknown_outcome": ({"outcome": "succeeded"}, "outcome"),
        "no_outcome": ({}, "outcome"),
    }
    stored = (folder / LOCAL_STATE).read_bytes()
    for case, (arguments, field) in refusals.items():
        clock.advance(STEP)
        refused = client.answer(RECORD_BACKUP_UPLOAD, arguments)
        assert error_of(refused).get("code") == "invalid_fields", (case, refused)
        assert _field_names(refused) == [field], (case, refused)
        assert (folder / LOCAL_STATE).read_bytes() == stored, case


# --- AC-6: one writer for local-state.json; each group survives the other's writes --------


def _record_skip(client: McpClient) -> dict[str, Any]:
    return client.answer(RECORD_BACKUP_UPLOAD, {"outcome": "skipped"})


def test_last_export_and_the_upload_state_survive_each_others_writes(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P0] AC-6. An export (setup), then an upload, an export, an upload, and a download of
    # the Backup page's Export, the clock moving between each.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    written = backups / TODAY_BACKUP
    keys_after: list[list[str]] = []

    clock.advance(STEP)
    client.answer(RECORD_BACKUP_UPLOAD, _uploaded(written))
    keys_after.append(sorted(_state(folder)))
    clock.advance(STEP)
    client.call_tool(EXPORT_BACKUP)
    exported_at = clock.now()
    keys_after.append(sorted(_state(folder)))
    clock.advance(STEP)
    uploaded_at = clock.now()
    client.answer(RECORD_BACKUP_UPLOAD, _uploaded(written))
    keys_after.append(sorted(_state(folder)))
    clock.advance(STEP)
    downloaded_at = clock.now()
    download = client.http.get("/api/export", headers=EXPORT_HEADERS)
    keys_after.append(sorted(_state(folder)))

    assert keys_after == [["autoBackup", "lastExportAt"]] * 4, keys_after

    assert download.status_code == 200
    doc = _state(folder)
    assert _when(doc["lastExportAt"]) == downloaded_at
    assert _when(doc["autoBackup"]["lastUpload"]["at"]) == uploaded_at
    assert _when(doc["autoBackup"]["lastReport"]["at"]) == uploaded_at
    assert downloaded_at != exported_at
    # The whole-file writer is gone: Store.record_export goes through the group writer.
    assert not hasattr(local_state, "local_state_bytes")

    # The writer's lock isn't the AD-4 store lock: a report goes through while it's held.
    store = client.http.app.state.store
    clock.advance(STEP)
    with store.lock:
        held = within(5, lambda: _record_skip(client))
    assert held.get("isError") is not True, held
    assert _when(_state(folder)["autoBackup"]["lastOk"]["at"]) == clock.now()

    # A restore (the route) touches neither group.
    kept = (folder / LOCAL_STATE).read_bytes()
    restored = post_restore(client.http, backup_zip(folder, NOW))
    assert restored.status_code == 200, restored.text
    assert (folder / LOCAL_STATE).read_bytes() == kept

    # A write failure is couldnt_save and leaves the file as it was, with no temp file.
    for step in ("create_temp", "write", "fsync", "replace"):
        store.fs = FaultyFs(step)
        clock.advance(STEP)
        failed = _record_skip(client)
        assert error_of(failed).get("code") == "couldnt_save", (step, failed)
        assert (folder / LOCAL_STATE).read_bytes() == kept, step
        assert sorted(folder.glob("local-state.json.tmp*")) == [], step
    store.fs = OsFileSystem()

    # A malformed file is replaced with the written group alone, and the loss is logged.
    (folder / LOCAL_STATE).write_bytes(b"{not json")
    capsys.readouterr()
    clock.advance(STEP)
    replaced = _record_skip(client)
    assert replaced.get("isError") is not True, replaced
    assert _instants(_state(folder)) == {
        "autoBackup": {
            "lastReport": {"outcome": "skipped", "at": clock.now()},
            "lastOk": {"at": clock.now(), "outcome": "skipped"},
        }
    }
    assert "local-state.json" in capsys.readouterr().err


# --- AC-7: a folder whose sibling would be a default backups folder gets none -------------


def test_a_data_folder_whose_sibling_is_the_default_backups_folder_gets_no_backups_folder(
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P0] AC-7. `~/bookvie` would give `~/bookvie-backups` by the sibling rule. That folder
    # already holds a daily backup of the real library, so a server that used it would list it.
    home = Path.home()
    folder = home / "bookvie"
    _seed_with_cover(folder)
    backups = home / "bookvie-backups"
    backups.mkdir()
    real_backup = backup_name(date(2026, 11, 19))
    (backups / real_backup).write_bytes(backup_zip(folder, NOW - timedelta(days=1)))

    client = connect_mcp(data_dir=folder)

    assert client.http.app.state.backups_dir is None

    answer = client.call_tool(EXPORT_BACKUP)
    assert error_of(answer).get("code") == "couldnt_save", answer
    assert structured_of(client.call_tool(LIST_LOCAL_BACKUPS)) == {"backups": []}
    assert _names(backups) == [real_backup]
    assert not (folder / LOCAL_STATE).exists()

    # The same from a real `bookvie` start, whose cli.py resolves the folder itself.
    with running_bookvie(folder, flags=("--fake-today", NOW.date().isoformat())) as real:
        started = real.call_tool(EXPORT_BACKUP)
        listed = real.call_tool(LIST_LOCAL_BACKUPS)
    assert error_of(started).get("code") == "couldnt_save", started
    assert structured_of(listed) == {"backups": []}
    assert _names(backups) == [real_backup]
    assert not (home / "bookvie-backups-dev").exists()


# --- Secondary branches (Story 13.3's matrix) --------------------------------------------


def test_extra_bad_and_null_arguments_are_each_refused_by_key_and_store_nothing(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    written = backups / TODAY_BACKUP
    good = _uploaded(written)
    without = {key: value for key, value in good.items() if key not in ("path", "contentHash")}
    refusals = {
        "skip_with_path": ({"outcome": "skipped", "path": str(written)}, ["path"]),
        "skip_with_cause": ({"outcome": "skipped", "cause": "other"}, ["cause"]),
        "skip_with_all": (
            {**good, "outcome": "skipped", "cause": "other"},
            ["path", "copies", "contentHash", "cause"],
        ),
        "failure_with_upload_args": (
            {**good, "outcome": "failed", "cause": "other"},
            ["path", "copies", "contentHash"],
        ),
        "upload_with_cause": ({**good, "cause": "other"}, ["cause"]),
        "upload_missing_two": (without, ["path", "contentHash"]),
        "copies_zero": ({**good, "copies": 0}, ["copies"]),
        "copies_negative": ({**good, "copies": -1}, ["copies"]),
        "copies_a_string": ({**good, "copies": "3"}, ["copies"]),
        "copies_a_float": ({**good, "copies": 3.0}, ["copies"]),
        "copies_a_bool": ({**good, "copies": True}, ["copies"]),
        "hash_upper_case": ({**good, "contentHash": good["contentHash"].upper()}, ["contentHash"]),
        "hash_too_short": ({**good, "contentHash": "ab" * 31}, ["contentHash"]),
        "hash_not_hex": ({**good, "contentHash": "g" * 64}, ["contentHash"]),
        "two_failing_in_order": (
            {**good, "copies": 0, "contentHash": "x"},
            ["copies", "contentHash"],
        ),
        "null_path": ({**good, "path": None}, ["path"]),
        "null_outcome": ({"outcome": None}, ["outcome"]),
        "relative_path": ({**good, "path": TODAY_BACKUP}, ["path"]),
        "dotdot_path": (
            {**good, "path": str(backups / ".." / backups.name / TODAY_BACKUP)},
            ["path"],
        ),
        "unknown_key": ({"outcome": "skipped", "note": "hi"}, ["note"]),
    }
    stored = (folder / LOCAL_STATE).read_bytes()
    for case, (arguments, fields) in refusals.items():
        clock.advance(STEP)
        refused = client.answer(RECORD_BACKUP_UPLOAD, arguments)
        assert error_of(refused).get("code") == "invalid_fields", (case, refused)
        assert _field_names(refused) == fields, (case, refused)
        assert (folder / LOCAL_STATE).read_bytes() == stored, case


def test_a_symlink_or_an_unreadable_daily_file_is_refused_on_path(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    written = backups / TODAY_BACKUP
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    target = elsewhere / TODAY_BACKUP
    target.write_bytes(written.read_bytes())
    linked = backups / backup_name(date(2026, 11, 17))
    linked.symlink_to(target)
    not_a_zip = backups / backup_name(date(2026, 11, 16))
    not_a_zip.write_bytes(b"not a zip")
    no_library = backups / backup_name(date(2026, 11, 15))
    with zipfile.ZipFile(no_library, "w") as archive:
        archive.writestr("other.json", b"{}")
    # A daily-named zip whose deflated library.json data is corrupt (zlib.error on read).
    corrupt = backups / backup_name(date(2026, 11, 14))
    with zipfile.ZipFile(corrupt, "w") as archive:
        archive.writestr("library.json", b"{}" * 1000, compress_type=zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(corrupt) as archive:
        info = archive.getinfo("library.json")
    data = bytearray(corrupt.read_bytes())
    start = info.header_offset + 30 + len(info.filename)
    data[start : start + 8] = b"\xff" * 8
    corrupt.write_bytes(bytes(data))
    stored = (folder / LOCAL_STATE).read_bytes()
    for path in (linked, not_a_zip, no_library, corrupt):
        clock.advance(STEP)
        refused = client.answer(RECORD_BACKUP_UPLOAD, _uploaded(path))
        assert error_of(refused).get("code") == "invalid_fields", (path.name, refused)
        assert _field_names(refused) == ["path"], (path.name, refused)
        assert (folder / LOCAL_STATE).read_bytes() == stored, path.name


@pytest.mark.skipif(os.geteuid() == 0, reason="root can read a chmod 000 file")
def test_a_daily_file_that_cant_be_opened_is_refused_on_path(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # Review follow-up: an OSError from opening the file is a refusal, not a 500.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    client.call_tool(EXPORT_BACKUP)
    written = backups / TODAY_BACKUP
    arguments = _uploaded(written)
    stored = (folder / LOCAL_STATE).read_bytes()
    clock.advance(STEP)
    written.chmod(0o000)
    try:
        refused = client.answer(RECORD_BACKUP_UPLOAD, arguments)
    finally:
        written.chmod(0o644)

    assert error_of(refused).get("code") == "invalid_fields", refused
    assert _field_names(refused) == ["path"], refused
    assert (folder / LOCAL_STATE).read_bytes() == stored


def test_with_no_backups_folder_an_upload_is_refused_on_path_and_a_skip_is_stored(
    connect_mcp: Callable[..., McpClient],
) -> None:
    home = Path.home()
    folder = home / "bookvie"
    _seed_with_cover(folder)
    client = connect_mcp(data_dir=folder, clock=SetClock(NOW))
    assert client.http.app.state.backups_dir is None
    some = home / "elsewhere" / TODAY_BACKUP
    some.parent.mkdir()
    some.write_bytes(backup_zip(folder, NOW))

    refused = client.answer(RECORD_BACKUP_UPLOAD, _uploaded(some))

    assert _field_names(refused) == ["path"], refused
    assert not (folder / LOCAL_STATE).exists()
    assert _record_skip(client).get("isError") is not True
    assert set(_state(folder)) == {"autoBackup"}


def test_a_failure_with_no_earlier_state_writes_the_report_alone_and_keeps_unknown_keys(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, _, clock = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_text(json.dumps({"someday": {"x": 1}}))

    failed = client.answer(RECORD_BACKUP_UPLOAD, {"outcome": "failed", "cause": "other"})

    assert failed.get("isError") is not True, failed
    doc = _state(folder)
    assert doc["someday"] == {"x": 1}
    assert _instants(doc["autoBackup"]) == {
        "lastReport": {"outcome": "failed", "at": NOW, "cause": "other"}
    }
    # An export keeps both other keys too.
    clock.advance(STEP)
    client.call_tool(EXPORT_BACKUP)
    assert sorted(_state(folder)) == ["autoBackup", "lastExportAt", "someday"]
    assert _state(folder)["someday"] == {"x": 1}


def test_an_unreadable_state_file_is_couldnt_save_and_a_malformed_one_reads_as_unchanged_false(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups, _ = _connect(connect_mcp, tmp_path)
    # A folder where the file should be: reading it raises an OSError other than not-found.
    (folder / LOCAL_STATE).mkdir()
    failed = _record_skip(client)
    assert error_of(failed).get("code") == "couldnt_save", failed
    assert (folder / LOCAL_STATE).is_dir()
    (folder / LOCAL_STATE).rmdir()

    (folder / LOCAL_STATE).write_bytes(b"[1, 2]")
    answer = structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))
    assert answer["unchangedSinceUpload"] is False
    assert (folder / LOCAL_STATE).read_bytes() == b"[1, 2]"


@pytest.mark.parametrize("value", ["true", 1, None])
def test_for_upload_that_isnt_a_boolean_is_refused_and_writes_no_file(
    value: Any, connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    refused = client.answer(EXPORT_BACKUP, {"forUpload": value})

    assert error_of(refused).get("code") == "invalid_fields", refused
    assert _field_names(refused) == ["forUpload"], refused
    assert _names(backups) == []
    assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT


def test_a_built_zip_that_cant_be_read_is_couldnt_save_and_moves_nothing(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # Review follow-up: write_backup hashes the built zip's library.json before it writes.
    client, folder, backups, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    monkeypatch.setattr(backup_daily, "build_export", lambda store, now: io.BytesIO(b"not a zip"))

    for arguments in ({}, {"forUpload": True}):
        capsys.readouterr()
        refused = client.answer(EXPORT_BACKUP, arguments)
        assert error_of(refused).get("code") == "couldnt_save", (arguments, refused)
        # The guard's own refusal, not the tool wrapper's catch-all.
        assert "can't read the built zip" in capsys.readouterr().err, arguments
        assert list(backups.iterdir()) == [], arguments
        assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT


def test_a_failed_for_upload_write_is_couldnt_save_and_moves_nothing(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    client.http.app.state.store.fs = FaultyFs("replace")

    refused = client.answer(EXPORT_BACKUP, {"forUpload": True})

    assert error_of(refused).get("code") == "couldnt_save", refused
    assert _names(backups) == []
    assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT


def test_exports_and_skips_racing_on_fifty_threads_keep_both_groups(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # The intent itself, not the MCP client: one test client isn't shared across threads.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    store = client.http.app.state.store
    errors: list[BaseException] = []

    def work(index: int) -> None:
        try:
            if index % 2:
                store.record_export(NOW + timedelta(seconds=index))
            else:
                record_backup_upload(store, clock, backups, {"outcome": "skipped"})
        except BaseException as exc:  # noqa: BLE001 - reported in the test's thread
            errors.append(exc)

    threads = [threading.Thread(target=work, args=(index,)) for index in range(50)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(30)

    assert [thread for thread in threads if thread.is_alive()] == []
    assert errors == []
    doc = _state(folder)
    assert sorted(doc) == ["autoBackup", "lastExportAt"]
    assert sorted(doc["autoBackup"]) == ["lastOk", "lastReport"]
    assert sorted(path.name for path in folder.iterdir() if path.name.startswith(LOCAL_STATE)) == [
        LOCAL_STATE
    ]


def test_a_state_file_with_only_the_upload_group_reads_as_no_export_without_a_log(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    client, folder, _, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_text(json.dumps({"autoBackup": PRIOR_UPLOAD}))
    capsys.readouterr()

    assert client.http.get("/api/views/backup").json()["lastExportAt"] is None
    assert client.http.get("/api/views/home").json()["lastExportAt"] is None
    assert local_state.read_last_export(folder) is None
    assert capsys.readouterr().err == ""
    # An empty object is no export yet too, not a malformed file.
    (folder / LOCAL_STATE).write_text("{}")
    assert local_state.read_last_export(folder) is None
    assert capsys.readouterr().err == ""
