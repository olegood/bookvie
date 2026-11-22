"""Story 13.3's secondary branches (bmad-testarch-automate): the ATDD checklist's
green-phase follow-ups that the build and the review left open.

- The daily run's next day: an unchanged library answers the same ``libraryHash``
  and ``unchangedSinceUpload: true``, though its zip's bytes and name differ.
- ``unchangedSinceUpload`` over a malformed ``autoBackup`` group or a
  ``local-state.json`` that can't be read or parsed.
- Both writers over a file that isn't a JSON object, a malformed ``autoBackup``
  group, and a failed folder flush after the rename.
- The folder rule's other spellings of ``~/bookvie``.

Every test's ``HOME`` is a temporary folder (``conftest.py``).
"""

import json
from collections.abc import Callable
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import backups_folder
from tests.agent_client import EXPORT_BACKUP, RECORD_BACKUP_UPLOAD, McpClient, structured_of
from tests.helpers import FaultyFs, image_bytes
from tests.test_agent_backup import LOCAL_STATE, _names, backup_name
from tests.test_agent_backup_upload import (
    NOW,
    PRIOR_UPLOAD,
    STEP,
    TODAY_BACKUP,
    _connect,
    _instants,
    _library_hash,
    _record_skip,
    _state,
    _uploaded,
)
from tests.test_agent_write import UNREAD_COVER

DAY = timedelta(days=1)


def _for_upload(client: McpClient) -> dict[str, Any]:
    """``export_backup({forUpload: true})``'s answer, as the daily run calls it."""
    return structured_of(client.call_tool(EXPORT_BACKUP, {"forUpload": True}))


# --- AC-1: the daily run's next day -----------------------------------------------------


def test_the_next_days_backup_of_an_unchanged_library_is_unchanged_since_the_upload(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-1.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    first = _for_upload(client)
    day_one = backups / TODAY_BACKUP
    clock.advance(STEP)
    assert client.answer(RECORD_BACKUP_UPLOAD, _uploaded(day_one)).get("isError") is not True

    # The next morning's run: a new dated file with other bytes (its time), the same library.
    clock.advance(DAY)
    second = _for_upload(client)
    day_two = backups / backup_name((NOW + DAY).date())
    assert _names(backups) == [TODAY_BACKUP, day_two.name]
    assert day_two.read_bytes() != day_one.read_bytes()
    assert second["libraryHash"] == first["libraryHash"] == _library_hash(day_two)
    assert second["unchangedSinceUpload"] is True

    # AD-22: covers have immutable names, so only library.json counts. A cover's bytes
    # changing in place doesn't make the library changed...
    (folder / UNREAD_COVER).write_bytes(image_bytes((80, 120), fmt="PNG"))
    clock.advance(STEP)
    third = _for_upload(client)
    assert third["libraryHash"] == first["libraryHash"]
    assert third["unchangedSinceUpload"] is True
    # ...and "Last export" never moved on any of them.
    assert "lastExportAt" not in _state(folder)


# --- AC-1: unchangedSinceUpload over a malformed or unreadable state ---------------------


def test_a_malformed_upload_group_reads_as_changed_and_the_backup_is_still_written(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-1.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    real = _for_upload(client)["libraryHash"]
    shapes = {
        "a_number": 5,
        "a_list": [real],
        "upload_a_string": {"lastUpload": real},
        "hash_a_list": {"lastUpload": {"libraryHash": [real]}},
        "upload_without_hash": {"lastUpload": {"name": TODAY_BACKUP}},
        "hash_on_the_group": {"libraryHash": real},
    }
    for case, shape in shapes.items():
        (folder / LOCAL_STATE).write_text(json.dumps({"autoBackup": shape}))
        (backups / TODAY_BACKUP).unlink()
        clock.advance(STEP)
        answer = _for_upload(client)
        assert answer["unchangedSinceUpload"] is False, case
        assert answer["libraryHash"] == real, case
        assert _names(backups) == [TODAY_BACKUP], case
    # The control: the same hash where AD-22 puts it is unchanged.
    (folder / LOCAL_STATE).write_text(
        json.dumps({"autoBackup": {"lastUpload": {"libraryHash": real}}})
    )
    assert _for_upload(client)["unchangedSinceUpload"] is True


@pytest.mark.parametrize("make", ["invalid_json", "a_folder"])
def test_a_state_file_that_cant_be_read_answers_changed_logs_it_and_is_left_alone(
    make: str,
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P1] AC-1, AC-6.
    client, folder, backups, _ = _connect(connect_mcp, tmp_path)
    state = folder / LOCAL_STATE
    if make == "a_folder":
        state.mkdir()  # reading it raises an OSError other than not-found
    else:
        state.write_bytes(b'{"autoBackup": ')
    capsys.readouterr()

    answer = _for_upload(client)

    assert answer["unchangedSinceUpload"] is False
    assert _names(backups) == [TODAY_BACKUP]
    assert f"couldn't read autoBackup from {LOCAL_STATE}" in capsys.readouterr().err
    if make == "a_folder":
        assert state.is_dir()
    else:
        assert state.read_bytes() == b'{"autoBackup": '


# --- AC-4, AC-6: the writers over a malformed file or group ------------------------------


@pytest.mark.parametrize(
    ("raw", "reason"),
    [
        (b"[]", "is not a JSON object"),
        (b'"text"', "is not a JSON object"),
        (b"null", "is not a JSON object"),
        (b"5", "is not a JSON object"),
        (b"{not json", "is not valid JSON"),
    ],
    ids=["array", "string", "null", "number", "bad-json"],
)
@pytest.mark.parametrize("writer", ["skip", "export"])
def test_each_writer_replaces_a_file_that_isnt_a_json_object_with_its_group_alone(
    writer: str,
    raw: bytes,
    reason: str,
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P1] AC-6.
    client, folder, _, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(raw)
    capsys.readouterr()

    if writer == "skip":
        assert _record_skip(client).get("isError") is not True
        expected = ["autoBackup"]
    else:
        assert client.call_tool(EXPORT_BACKUP).get("isError") is not True
        expected = ["lastExportAt"]

    assert sorted(_state(folder)) == expected
    logged = [line for line in capsys.readouterr().err.splitlines() if "replacing it" in line]
    assert len(logged) == 1, logged
    assert f"{LOCAL_STATE} {reason}" in logged[0], logged


def test_a_skip_replaces_a_malformed_group_and_an_upload_keeps_a_groups_other_keys(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-4, AC-6.
    client, folder, backups, clock = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_text(json.dumps({"autoBackup": 5}))

    assert _record_skip(client).get("isError") is not True
    assert _instants(_state(folder)["autoBackup"]) == {
        "lastReport": {"outcome": "skipped", "at": NOW},
        "lastOk": {"at": NOW, "outcome": "skipped"},
    }

    # A key of autoBackup that no outcome replaces (a later story's) is kept as read.
    (folder / LOCAL_STATE).write_text(
        json.dumps({"autoBackup": {**PRIOR_UPLOAD, "later": {"x": 1}}})
    )
    client.call_tool(EXPORT_BACKUP, {"forUpload": True})
    clock.advance(STEP)
    assert (
        client.answer(RECORD_BACKUP_UPLOAD, _uploaded(backups / TODAY_BACKUP)).get("isError")
        is not True
    )
    group = _state(folder)["autoBackup"]
    assert sorted(group) == ["lastOk", "lastReport", "lastUpload", "later"]
    assert group["later"] == {"x": 1}
    assert group["lastUpload"]["name"] == TODAY_BACKUP


# --- AC-6: a failed folder flush after the rename ----------------------------------------


def test_a_failed_folder_flush_after_the_state_rename_is_logged_and_the_report_is_stored(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # [P2] AC-6.
    client, folder, _, _ = _connect(connect_mcp, tmp_path)
    client.http.app.state.store.fs = FaultyFs("fsync_dir")
    capsys.readouterr()

    answer = _record_skip(client)

    assert answer.get("isError") is not True, answer
    assert _instants(_state(folder)["autoBackup"]["lastOk"]) == {"at": NOW, "outcome": "skipped"}
    assert f"couldn't flush {folder.name}/ after writing {LOCAL_STATE}" in capsys.readouterr().err
    assert sorted(path.name for path in folder.iterdir() if path.name.startswith(LOCAL_STATE)) == [
        LOCAL_STATE
    ]


# --- AC-7: other spellings of ~/bookvie -------------------------------------------------


def test_other_spellings_of_the_bookvie_folder_get_no_backups_folder(tmp_path: Path) -> None:
    # [P2] AC-7.
    home = tmp_path / "home"
    (home / "bookvie").mkdir(parents=True)
    (home / "elsewhere").mkdir()
    (home / "lib").symlink_to(home / "bookvie")
    assert backups_folder(home / "lib", home) is None
    assert backups_folder(home / "elsewhere" / ".." / "bookvie", home) is None

    # A HOME that is itself a symlink (as /var is to /private/var on macOS), either way round.
    linked = tmp_path / "linked-home"
    linked.symlink_to(home)
    assert backups_folder(home / "bookvie", linked) is None
    assert backups_folder(linked / "bookvie", home) is None
    # The default data folder still gets the default backups folder through it.
    assert backups_folder(home / "bookvie-data", linked) == linked / "bookvie-backups"
    assert backups_folder(linked / "bookvie-data", home) == home / "bookvie-backups"
