"""Story 13.1: an agent restores the library from a backup, after two confirmations (AD-22).

bookvie gets three tools. ``list_local_backups`` lists the backups a restore
can use: the daily backups and safety copies in this server's backups folder,
and the daily backups in its ``from-dropbox/``. ``preview_restore`` says what
a restore would lose, changing nothing. ``restore_backup`` asks the user
itself, through MCP 2026-07-28 form elicitation (an ``InputRequiredResult``
with a hand-sealed ``requestState``). Only an explicit accept on a valid token
goes on, and then, in one hold of the store lock, it checks the archive's
hash, stages and validates it, writes a safety copy
``bookvie-pre-restore-<YYYY-MM-DDTHHMM>.zip`` and applies the restore in the
AD-12 order. Anything else is ``restore_not_confirmed`` with a ``reason``, and
nothing changes.

Every test runs with ``HOME`` set to a temporary folder (``conftest.py``) and
passes its own ``backups_dir``, so no leaf reaches a real backups folder.
"""

import io
import json
import shutil
import zipfile
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

import bookvie.agent
from bookvie.agent import NoArguments, input_schema
from bookvie.agent.restore_gate import confirmation_text as question_for
from bookvie.domain.clock import FakeClock
from bookvie.intents import LibraryCounts, RestorePreview
from bookvie.intents.export import stamped_mtime
from tests.agent_client import (
    AGENT_TOOL_NAMES,
    DESCRIPTIONS,
    EXPORT_BACKUP,
    FORM_ELICITATION,
    LIST_LOCAL_BACKUPS,
    MODERN_PROTOCOL_VERSION,
    PREVIEW_RESTORE,
    PROTOCOL_VERSION,
    RESTORE_BACKUP,
    RESTORE_TOOL_NAMES,
    McpClient,
)
from tests.builder import LibraryBuilder
from tests.helpers import (
    TODAY,
    SetClock,
    api_client,
    backup_zip,
    confirmation_text,
    covers_in,
    dropbox_content_hash,
    files_under,
    image_bytes,
    library_bytes,
    post_restore,
    staging_in,
    zip_archive,
)
from tests.restore_scene import (
    ACCEPT,
    ADDED_CARD_NOTES,
    ADDED_TITLES,
    BACKUP_AT,
    CANCEL,
    COVER_FILE,
    DAILY,
    DECLINE,
    DUNE_ID,
    EARLIER_EXPORT,
    FROM_DROPBOX,
    LOCAL_STATE,
    NOT_CONFIRMED_MESSAGE,
    NOTE_IDS,
    NOW,
    NOW_COUNTS,
    OUTSIDE_MESSAGE,
    PIRANESI_ID,
    SAFETY_COPY,
    SAFETY_COPY_FAILED_MESSAGE,
    SECOND_SAFETY_COPY,
    THEN,
    TODAY_DAILY,
    TODAY_DAILY_AT,
    FaultIn,
    Scene,
    confirm,
    members,
    retry_with,
    structured,
    tool_error,
    within,
    write_library,
)


@pytest.fixture
def scene(tmp_path: Path, connect_mcp: Callable[..., McpClient]) -> Scene:
    return Scene(tmp_path, connect_mcp)


# --- AC-1: list_local_backups ---------------------------------------------------

LISTED = [  # (path in the backups folder, kind, backup time), newest first
    ("bookvie-backup-2026-11-20.zip", "daily", datetime(2026, 11, 20, 9, 1).astimezone()),
    (DAILY, "daily", BACKUP_AT),
    (
        f"{FROM_DROPBOX}/bookvie-backup-2026-11-18.zip",
        "from_dropbox",
        datetime(2026, 11, 18, 9, 0).astimezone(),
    ),
    (
        "bookvie-pre-restore-2026-11-17T1840-2.zip",
        "safety",
        datetime(2026, 11, 17, 18, 40, 40).astimezone(),
    ),
    (
        "bookvie-pre-restore-2026-11-17T1840.zip",
        "safety",
        datetime(2026, 11, 17, 18, 40).astimezone(),
    ),
]
NEVER_LISTED = [
    "notes.txt",
    "bookvie-backup-2026-02-30.zip",  # no such day
    "bookvie-backup-2026-11-19.zip.bak",
    "bookvie-pre-restore-2026-11-17.zip",  # no time
    ".bookvie-backup-2026-11-21.zip.tmpk3j2",  # export_backup's temp file
    f"{FROM_DROPBOX}/notes.txt",
]


def test_list_local_backups_returns_the_daily_backups_safety_copies_and_downloads_newest_first(
    scene: Scene, connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-1
    (scene.backups / FROM_DROPBOX).mkdir()
    for relative, _kind, at in LISTED:
        (scene.backups / relative).write_bytes(backup_zip(scene.then, at))
    for relative in NEVER_LISTED:
        (scene.backups / relative).write_bytes(backup_zip(scene.then, BACKUP_AT))
    (scene.backups / "bookvie-backup-2026-11-16.zip").mkdir()  # a folder
    outside = tmp_path / "elsewhere" / "bookvie-backup-2026-11-15.zip"
    outside.parent.mkdir()
    outside.write_bytes(backup_zip(scene.then, BACKUP_AT))
    (scene.backups / "bookvie-backup-2026-11-15.zip").symlink_to(outside)
    (scene.backups / "bookvie-backup-2026-11-14.zip").symlink_to(scene.backups / DAILY)

    answer = scene.client.answer(LIST_LOCAL_BACKUPS)
    listed = structured(answer).get("backups", [])

    assert [
        (Path(entry.get("path", "")).relative_to(scene.backups).as_posix(), entry.get("kind"))
        for entry in listed
    ] == [(relative, kind) for relative, kind, _at in LISTED], answer

    for entry, (relative, _kind, at) in zip(listed, LISTED, strict=True):
        data = (scene.backups / relative).read_bytes()
        assert set(entry) == {"path", "kind", "backupTime", "size", "contentHash"}, entry
        assert Path(entry["path"]).is_absolute(), entry
        when = datetime.fromisoformat(entry["backupTime"])
        assert when.utcoffset() is not None and when == at, (relative, entry["backupTime"])
        assert entry["size"] == len(data), relative
        assert entry["contentHash"] == dropbox_content_hash(data), relative

    # No backups folder, or an empty one: an empty list.
    for folder in (tmp_path / "none", tmp_path / "empty"):
        if folder.name == "empty":
            folder.mkdir()
        other = connect_mcp(
            data_dir=tmp_path / f"lib-{folder.name}", backups_dir=folder, clock=scene.clock
        )
        assert structured(other.call_tool(LIST_LOCAL_BACKUPS)) == {"backups": []}, folder.name


# --- AC-2: the backup's time is stamped in the zip --------------------------------


def test_a_backup_zip_carries_its_time_and_list_local_backups_reads_it_from_there(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-2
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    write_library(data_dir, grown=False)
    clock = SetClock(BACKUP_AT)
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=clock)
    written = structured(client.call_tool(EXPORT_BACKUP))

    with zipfile.ZipFile(backups / DAILY) as archive:
        stamped = archive.getinfo("library.json").date_time
    assert stamped == (2026, 11, 19, 9, 2, 0), stamped

    assert datetime.fromisoformat(written["createdAt"]) == clock.now()
    (entry,) = structured(client.answer(LIST_LOCAL_BACKUPS)).get("backups", [None])
    assert datetime.fromisoformat(entry["backupTime"]) == clock.now(), entry

    # An older zip's entry has no time zone: its time is read as local time.
    older_at = datetime(2026, 11, 17, 18, 40).astimezone()
    (backups / "bookvie-backup-2026-11-17.zip").write_bytes(backup_zip(data_dir, older_at))
    times = {
        Path(e["path"]).name: e["backupTime"]
        for e in structured(client.answer(LIST_LOCAL_BACKUPS))["backups"]
    }
    assert datetime.fromisoformat(times["bookvie-backup-2026-11-17.zip"]) == older_at, times


# --- AC-3: preview_restore says what a restore would lose -------------------------

REFUSED_ARCHIVES = {  # a daily name in the backups folder, and its bytes
    "bookvie-backup-2026-11-10.zip": b"not a zip at all",
    "bookvie-backup-2026-11-11.zip": zip_archive({"library.json": b"{}", "../evil.txt": b"x"}),
    "bookvie-backup-2026-11-12.zip": zip_archive(
        {"library.json": json.dumps({"schemaVersion": 99, "books": []}).encode(), "covers/": None}
    ),
}
REFUSED_CODES = {
    "bookvie-backup-2026-11-10.zip": "restore_invalid",
    "bookvie-backup-2026-11-11.zip": "restore_unsafe",
    "bookvie-backup-2026-11-12.zip": "restore_newer_version",
}


def test_preview_restore_names_what_would_be_lost_and_changes_nothing(
    scene: Scene, tmp_path: Path
) -> None:
    # [P0] AC-3
    before = scene.kept()
    answer = scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(DAILY)})
    preview = structured(answer)

    assert sorted(preview.get("booksAddedSince", [])) == sorted(ADDED_TITLES), answer

    assert preview["cardNotesAddedSince"] == ADDED_CARD_NOTES
    assert datetime.fromisoformat(preview["backupTime"]) == BACKUP_AT
    assert preview["backup"] == THEN
    assert preview["current"] == NOW_COUNTS
    assert scene.kept() == before
    assert staging_in(scene.data_dir) == []

    # A file bookvie can't restore is refused as the restore route refuses it.
    for name, data in REFUSED_ARCHIVES.items():
        (scene.backups / name).write_bytes(data)
    route_dir = tmp_path / "route"
    shutil.copytree(scene.data_dir, route_dir)
    route = api_client(route_dir)
    for name, data in REFUSED_ARCHIVES.items():
        refused = tool_error(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(name)}))
        assert refused["code"] == REFUSED_CODES[name], name
        assert refused == post_restore(route, data).json()["error"], name
    assert scene.kept() == {
        "data": before["data"],
        "backups": {**before["backups"], **REFUSED_ARCHIVES},
    }


# --- AC-4: only files in the backups folder ---------------------------------------

OUTSIDE_CASES = ["outside", "dotdot", "symlink_out", "folder", "not_a_backup_name", "nested"]


def _outside_path(scene: Scene, case: str) -> str:
    """A path to a restorable zip (or a folder) that isn't an allowed backup file."""
    elsewhere = scene.tmp_path / "elsewhere"
    elsewhere.mkdir(exist_ok=True)
    real = elsewhere / DAILY
    real.write_bytes(backup_zip(scene.then, BACKUP_AT))
    paths = {
        "outside": real,
        "dotdot": scene.backups / FROM_DROPBOX / ".." / ".." / "elsewhere" / DAILY,
        "symlink_out": scene.backups / "bookvie-backup-2026-11-13.zip",
        "folder": scene.backups / "bookvie-backup-2026-11-16.zip",
        "not_a_backup_name": scene.backups / "my-library.zip",
        "nested": scene.backups / FROM_DROPBOX / "deeper" / DAILY,
    }
    (scene.backups / FROM_DROPBOX / "deeper").mkdir(parents=True)
    (scene.backups / "bookvie-backup-2026-11-13.zip").symlink_to(real)
    (scene.backups / "bookvie-backup-2026-11-16.zip").mkdir()
    (scene.backups / "my-library.zip").write_bytes(real.read_bytes())
    (scene.backups / FROM_DROPBOX / "deeper" / DAILY).write_bytes(real.read_bytes())
    return str(paths[case])


@pytest.mark.parametrize("tool", [PREVIEW_RESTORE, RESTORE_BACKUP])
@pytest.mark.parametrize("case", OUTSIDE_CASES)
def test_a_path_outside_the_backups_folder_is_refused_before_it_is_read(
    scene: Scene, tool: str, case: str
) -> None:
    # [P0] AC-4
    path = _outside_path(scene, case)
    before = scene.kept()
    refused = tool_error(scene.modern.answer(tool, {"path": path}))

    assert refused["code"] == "restore_outside_backups", (case, refused)

    assert refused == {
        "kind": "refusal",
        "code": "restore_outside_backups",
        "message": OUTSIDE_MESSAGE,
    }, case
    assert scene.kept() == before, case
    assert library_bytes(scene.data_dir) == before["data"]["library.json"]


@pytest.mark.parametrize("tool", [PREVIEW_RESTORE, RESTORE_BACKUP])
def test_a_relative_path_is_refused_even_where_it_would_land_on_a_backup(
    scene: Scene, tool: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    # [P1] AC-4: a relative path depends on the server's working folder.
    monkeypatch.chdir(scene.backups)
    before = scene.kept()
    refused = tool_error(scene.modern.answer(tool, {"path": DAILY}))
    assert refused.get("code") == "restore_outside_backups", refused
    assert scene.kept() == before


def test_a_backup_name_that_isnt_a_readable_backup_is_left_out_of_the_list(scene: Scene) -> None:
    # [P1] AC-1: a daily-named non-zip, or a zip without library.json, can't be restored.
    (scene.backups / "bookvie-backup-2026-11-10.zip").write_bytes(b"not a zip at all")
    (scene.backups / "bookvie-backup-2026-11-11.zip").write_bytes(zip_archive({"a.txt": b"x"}))
    listed = structured(scene.client.answer(LIST_LOCAL_BACKUPS)).get("backups", [])
    assert [Path(entry["path"]).name for entry in listed] == [DAILY], listed


# --- AC-5: restore_backup asks the user -----------------------------------------


def test_restore_backup_asks_with_one_form_elicitation_and_changes_nothing_yet(
    scene: Scene,
) -> None:
    # [P0] AC-5
    before = scene.kept()
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})

    assert asked.get("resultType") == "input_required", asked

    preview = structured(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(DAILY)}))
    assert sorted(preview["booksAddedSince"]) == sorted(ADDED_TITLES)
    expected = confirmation_text(
        BACKUP_AT, preview["booksAddedSince"], preview["cardNotesAddedSince"], NOW.date()
    )
    requests = asked["inputRequests"]
    assert len(requests) == 1, requests
    (request,) = requests.values()
    assert request["method"] == "elicitation/create"
    assert request["params"].get("mode", "form") == "form"
    assert request["params"]["message"] == expected
    assert not any(mark in expected for mark in ("\n", "*", "`", "#", "_", "[")), expected
    schema = request["params"]["requestedSchema"]
    assert schema["type"] == "object" and not schema.get("required"), schema
    assert isinstance(asked["requestState"], str) and asked["requestState"], asked
    assert scene.kept() == before

    # Sealed by hand: the SDK's boundary would turn the reasons into -32602 errors.
    agent_source = "".join(
        path.read_text(encoding="utf-8")
        for path in Path(bookvie.agent.__file__).parent.glob("*.py")
    )
    assert "RequestStateBoundary" not in agent_source


# --- AC-6: anything but an explicit accept on a valid token changes nothing -------


def _tamper(state: str | None) -> str:
    text = state or "x"
    middle = len(text) // 2
    return text[:middle] + ("A" if text[middle] != "A" else "B") + text[middle + 1 :]


def _answered(
    scene: Scene,
    response: dict[str, Any],
    *,
    state: Callable[[str | None], str | None] = lambda s: s,
) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: response},
        request_state=state(sealed),
    )
    return before, answer


def _declined(scene: Scene) -> tuple[dict, dict]:
    return _answered(scene, DECLINE)


def _cancelled(scene: Scene) -> tuple[dict, dict]:
    return _answered(scene, CANCEL)


def _tampered(scene: Scene) -> tuple[dict, dict]:
    return _answered(scene, ACCEPT, state=_tamper)


def _reused(scene: Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    retry = {"input_responses": {key: DECLINE}, "request_state": sealed}
    scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)}, **retry)
    before = scene.kept()
    retry["input_responses"] = {key: ACCEPT}
    return before, scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)}, **retry)


def _after_five_minutes(scene: Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    scene.clock.advance(timedelta(minutes=5, seconds=1))
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _after_a_restart(scene: Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    restarted = scene.connect().speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)
    before = scene.kept()
    answer = restarted.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _another_path(scene: Scene) -> tuple[dict, dict]:
    other = "bookvie-backup-2026-11-18.zip"
    (scene.backups / other).write_bytes(backup_zip(scene.then, BACKUP_AT - timedelta(days=1)))
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(other)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _library_changed(scene: Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    scene.client.call_tool("update_page", {"bookId": DUNE_ID, "page": 130})
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _archive_changed(scene: Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    (scene.backups / DAILY).write_bytes(backup_zip(scene.then, BACKUP_AT + timedelta(minutes=1)))
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


UNSUPPORTED_FILE = "bookvie-backup-2026-11-10.zip"
"""A damaged file: a preview built before the version check would answer restore_invalid."""


def _unsupported(protocol_version: str, capabilities: dict[str, Any]) -> Callable:
    def run(scene: Scene) -> tuple[dict, dict]:
        (scene.backups / UNSUPPORTED_FILE).write_bytes(b"not a zip at all")
        client = scene.client.speaking(protocol_version, capabilities)
        before = scene.kept()
        return before, client.answer(RESTORE_BACKUP, {"path": scene.path(UNSUPPORTED_FILE)})

    return run


NOT_CONFIRMED = [
    ("declined", _declined, "declined"),
    ("cancelled", _cancelled, "cancelled"),
    ("tampered", _tampered, "changed"),
    ("reused", _reused, "changed"),
    ("after_five_minutes", _after_five_minutes, "expired"),
    ("after_a_restart", _after_a_restart, "expired"),
    ("another_path", _another_path, "changed"),
    ("library_changed", _library_changed, "changed"),
    ("archive_changed", _archive_changed, "changed"),
    ("handshake_revision", _unsupported(PROTOCOL_VERSION, FORM_ELICITATION), "unsupported"),
    ("no_elicitation", _unsupported(MODERN_PROTOCOL_VERSION, {}), "unsupported"),
    (
        "url_elicitation_only",
        _unsupported(MODERN_PROTOCOL_VERSION, {"elicitation": {"url": {}}}),
        "unsupported",
    ),
]


@pytest.mark.parametrize(
    ("run", "reason"),
    [(run, reason) for _id, run, reason in NOT_CONFIRMED],
    ids=[c[0] for c in NOT_CONFIRMED],
)
def test_anything_but_an_accept_on_a_valid_token_is_restore_not_confirmed_and_changes_nothing(
    scene: Scene, run: Callable[[Scene], tuple[dict, dict]], reason: str
) -> None:
    # [P0] AC-6
    before, answer = run(scene)
    refused = tool_error(answer)

    assert (refused.get("code"), refused.get("reason")) == ("restore_not_confirmed", reason), answer

    assert refused == {
        "kind": "refusal",
        "code": "restore_not_confirmed",
        "message": NOT_CONFIRMED_MESSAGE,
        "reason": reason,
    }
    assert scene.kept() == before
    assert staging_in(scene.data_dir) == []


# --- AC-7: an accepted restore writes a safety copy, then applies ------------------


def test_an_accepted_restore_saves_a_safety_copy_then_restores_and_the_copy_undoes_it(
    scene: Scene,
) -> None:
    # [P0] AC-7
    (scene.backups / TODAY_DAILY).write_bytes(backup_zip(scene.then, TODAY_DAILY_AT))
    before = scene.kept()
    pre_library = library_bytes(scene.data_dir)
    pre_covers = covers_in(scene.data_dir)

    done = within(30, lambda: confirm(scene.modern, scene.path(DAILY)))

    assert library_bytes(scene.data_dir) == scene.backup_library, done

    answer = structured(done)
    assert set(answer) == {"restoredFrom", "backupTime", "safetyCopy"}, done
    assert Path(answer["restoredFrom"]).resolve() == (scene.backups / DAILY).resolve()
    assert datetime.fromisoformat(answer["backupTime"]) == BACKUP_AT
    assert Path(answer["safetyCopy"]).resolve() == (scene.backups / SAFETY_COPY).resolve()
    assert covers_in(scene.data_dir) == scene.backup_covers
    assert staging_in(scene.data_dir) == []

    # The safety copy is exactly the library it replaced, and nothing else moved.
    copy = members(scene.backups / SAFETY_COPY)
    assert copy["library.json"] == pre_library
    assert {
        k.removeprefix("covers/"): v for k, v in copy.items() if k.startswith("covers/")
    } == pre_covers
    after = files_under(scene.backups)
    assert set(after) - set(before["backups"]) == {SAFETY_COPY}
    assert {name: after[name] for name in before["backups"]} == before["backups"]
    assert (scene.data_dir / LOCAL_STATE).read_bytes() == EARLIER_EXPORT

    # Restoring the safety copy the same way gives back the library as it was.
    undone = within(30, lambda: confirm(scene.modern, scene.path(SAFETY_COPY)))
    assert library_bytes(scene.data_dir) == pre_library, undone
    assert covers_in(scene.data_dir) == pre_covers
    assert Path(structured(undone)["safetyCopy"]).name == SECOND_SAFETY_COPY
    assert (scene.data_dir / LOCAL_STATE).read_bytes() == EARLIER_EXPORT


# --- AC-8: no safety copy, no restore --------------------------------------------


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "replace"])
def test_a_safety_copy_that_cant_be_written_is_safety_copy_failed_and_nothing_is_restored(
    scene: Scene, step: str
) -> None:
    # [P0] AC-8
    scene.client.http.app.state.store.fs = FaultIn(scene.backups, step)
    before = scene.kept()

    refused = tool_error(confirm(scene.modern, scene.path(DAILY)))

    assert refused.get("code") == "safety_copy_failed", (step, refused)

    assert refused == {
        "kind": "couldnt_save",
        "code": "safety_copy_failed",
        "message": SAFETY_COPY_FAILED_MESSAGE,
    }
    assert scene.kept() == before, step
    assert staging_in(scene.data_dir) == []


# --- AC-9: the same restore as the route ------------------------------------------


def test_the_tool_and_the_restore_route_restore_alike_and_refuse_alike(
    scene: Scene, tmp_path: Path
) -> None:
    # [P0] AC-9
    route_dir = tmp_path / "route"
    shutil.copytree(scene.data_dir, route_dir)
    archive = (scene.backups / DAILY).read_bytes()

    confirm(scene.modern, scene.path(DAILY))
    routed = post_restore(api_client(route_dir), archive)

    assert library_bytes(scene.data_dir) == library_bytes(route_dir), routed.text

    assert routed.status_code == 200
    assert covers_in(scene.data_dir) == covers_in(route_dir)
    # The route is unchanged: no safety copy, no new gate.
    assert not (tmp_path / "route-backups").exists()

    # Every refusal the route gives, the tool gives too.
    for name, data in REFUSED_ARCHIVES.items():
        (scene.backups / name).write_bytes(data)
        tool = tool_error(scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(name)}))
        assert tool == post_restore(api_client(route_dir), data).json()["error"], name

    # A filesystem fault at the commit is couldnt_save through both, with library.json kept.
    # Both folders now hold the backup's library, so restore the grown one into them.
    grown = tmp_path / "grown"
    write_library(grown, grown=True)
    grown_archive = backup_zip(grown, TODAY_DAILY_AT)
    (scene.backups / TODAY_DAILY).write_bytes(grown_archive)
    kept = library_bytes(route_dir)
    faulted = post_restore(api_client(route_dir, FaultIn(route_dir, "replace")), grown_archive)
    scene.client.http.app.state.store.fs = FaultIn(scene.data_dir, "replace")
    tool_fault = tool_error(confirm(scene.modern, scene.path(TODAY_DAILY)))
    assert (tool_fault.get("code"), faulted.json()["error"]["code"]) == ("couldnt_save",) * 2
    assert tool_fault == faulted.json()["error"]
    assert library_bytes(scene.data_dir) == kept
    assert library_bytes(route_dir) == kept


# --- AC-10: the tool list ---------------------------------------------------------


def test_the_tool_list_adds_the_three_restore_tools_and_still_bans_the_destructive_ones(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-10
    tools = mcp_client.list_tools()

    assert [tool["name"] for tool in tools] == AGENT_TOOL_NAMES

    listed = {tool["name"]: tool for tool in tools}
    for name in RESTORE_TOOL_NAMES:
        assert listed[name]["description"] == DESCRIPTIONS[name], name
    assert listed[LIST_LOCAL_BACKUPS]["inputSchema"] == input_schema(NoArguments)
    for name in (PREVIEW_RESTORE, RESTORE_BACKUP):
        schema = listed[name]["inputSchema"]
        assert schema["properties"].keys() == {"path"}, (name, schema)
        assert schema["properties"]["path"]["type"] == "string", (name, schema)
        assert schema["required"] == ["path"], (name, schema)
        assert schema.get("additionalProperties") is False, (name, schema)
    for name in ("delete_book", "delete_card_note", "set_spine_color", "restore"):
        body = mcp_client.rpc("tools/call", {"name": name, "arguments": {}})
        assert "result" not in body and body["error"]["code"] == -32602, (name, body)
        assert name in body["error"]["message"], body


# --- Green phase: the secondary branches the build pinned ---------------------------


def _asked_message(client: McpClient, path: str) -> str:
    asked = client.answer(RESTORE_BACKUP, {"path": path})
    assert asked.get("resultType") == "input_required", asked
    (request,) = asked["inputRequests"].values()
    return request["params"]["message"]


def test_the_question_says_every_change_goes_back_when_nothing_was_added(scene: Scene) -> None:
    # [P1] AC-5: a backup of the library as it is now.
    same = "bookvie-backup-2026-11-18.zip"
    (scene.backups / same).write_bytes(backup_zip(scene.data_dir, BACKUP_AT))
    before = scene.kept()

    message = _asked_message(scene.modern, scene.path(same))

    assert message == confirmation_text(BACKUP_AT, [], 0, NOW.date())
    assert message == (
        "Replace all data with the backup from 19 Nov, 09:02? Every change since then goes back, "
        "such as pages reached. A safety copy of your current library is saved first."
    )
    assert scene.kept() == before


def test_the_question_names_five_titles_then_how_many_more(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-5: 7 Books added since a backup from another year.
    then, data_dir, backups = tmp_path / "then", tmp_path / "library", tmp_path / "backups"
    write_library(then, grown=False)
    titles = [f"Book {n}" for n in range(1, 8)]
    builder = LibraryBuilder()
    dune = builder.book(
        id=DUNE_ID, title="Dune", pages=412, cover_file=COVER_FILE, spine_color_from_cover="#A85A4A"
    )
    builder.reading(dune, current_page=50)
    builder.main(dune)
    builder.book(id=PIRANESI_ID, title="Piranesi", pages=272)
    builder.card_note(dune, id=NOTE_IDS[0], text="Fear is the mind-killer.", page_start=10)
    builder.card_note(dune, id=NOTE_IDS[1], text="The spice must flow.", page_start=20)
    for title in titles:
        builder.card_note(builder.book(title=title), text=f"{title}, a note", page_start=1)
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / COVER_FILE).write_bytes(image_bytes(fmt="JPEG"))
    last_year = datetime(2025, 11, 19, 9, 2).astimezone()
    backups.mkdir()
    (backups / "bookvie-backup-2025-11-19.zip").write_bytes(backup_zip(then, last_year))
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    modern = client.speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)

    message = _asked_message(modern, str(backups / "bookvie-backup-2025-11-19.zip"))

    assert message == confirmation_text(last_year, titles, 7, NOW.date())
    assert message.startswith("Replace all data with the backup from 19 Nov 2025, 09:02? ")
    assert "(Book 1, Book 2, Book 3, Book 4, Book 5, and 2 more), 7 card notes," in message


def test_only_books_or_only_card_notes_added_names_just_those() -> None:
    # [P2] AC-5: the mixes UX-DR80 doesn't word (spec Design Notes; deferred for Oleg).
    counts = LibraryCounts(books=1, card_notes=1, covers=0)

    def preview(titles: list[str], notes: int) -> RestorePreview:
        return RestorePreview(
            backup_time=BACKUP_AT,
            backup=counts,
            current=counts,
            books_added_since=titles,
            card_notes_added_since=notes,
        )

    tail = "A safety copy of your current library is saved first."
    assert question_for(preview(["Dune"], 0), NOW.date()) == (
        "Replace all data with the backup from 19 Nov, 09:02? You'd lose 1 book added since "
        f"(Dune), and every other change since then. {tail}"
    )
    assert question_for(preview([], 1_200), NOW.date()) == (
        "Replace all data with the backup from 19 Nov, 09:02? You'd lose 1,200 card notes added "
        f"since, and every other change since then. {tail}"
    )


@pytest.mark.parametrize(
    "capabilities",
    [{"elicitation": {"form": {}}}, {"elicitation": {"form": {}, "url": {}}}],
    ids=["form", "form_and_url"],
)
def test_a_client_declaring_form_elicitation_is_asked(
    scene: Scene, capabilities: dict[str, Any]
) -> None:
    # [P1] AC-6: `form` counts, as an empty `elicitation` object does.
    client = scene.client.speaking(MODERN_PROTOCOL_VERSION, capabilities)

    asked = client.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})

    assert asked.get("resultType") == "input_required", asked


def _answered_under(scene: Scene, responses: Callable[[str], dict | None]) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses=responses(key),
        request_state=sealed,
    )
    return before, answer


@pytest.mark.parametrize(
    "responses",
    [lambda key: {f"not-{key}": ACCEPT}, lambda key: None, lambda key: {}],
    ids=["wrong_key", "no_responses", "empty_responses"],
)
def test_a_token_without_an_accept_under_its_key_is_cancelled(
    scene: Scene, responses: Callable[[str], dict | None]
) -> None:
    # [P1] AC-6: only an explicit accept under the asked key goes on.
    before, answer = _answered_under(scene, responses)

    assert tool_error(answer) == {
        "kind": "refusal",
        "code": "restore_not_confirmed",
        "message": NOT_CONFIRMED_MESSAGE,
        "reason": "cancelled",
    }
    assert scene.kept() == before
    assert staging_in(scene.data_dir) == []


def test_the_export_route_stamps_library_json_with_the_exact_time(tmp_path: Path) -> None:
    # [P1] AC-2: GET /api/export's zip carries the clock's instant in a 0x5455 extra field.
    data_dir = tmp_path / "library"
    write_library(data_dir, grown=False)
    # The header the app's own export fetch sends; the guard refuses an export without it.
    response = api_client(data_dir).get("/api/export", headers={"X-Bookvie-Export": "1"})
    assert response.status_code == 200, response.text

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        info = archive.getinfo("library.json")
    now = FakeClock(TODAY).now()
    assert stamped_mtime(info.extra) == int(now.timestamp())
    assert info.date_time == now.timetuple()[:6]
