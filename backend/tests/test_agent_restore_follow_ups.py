"""Story 13.1 follow-ups: the agent restore's secondary branches (``bmad-testarch-automate``).

The ATDD checklist's green-phase follow-ups that ``test_agent_restore.py`` and
``test_restore_backup_edges.py`` don't reach: a safety-copy name in
``from-dropbox/``, the content hash of a file over one 4 MiB block, the
safety copy's stamped time, previews of a safety copy and of a download,
the mixes UX-DR80 doesn't word, an accept carrying form content, the lock
held once around the whole accepted restore, a third safety copy in one
minute, the last two steps of the safety copy's write, a cover fault
through the tool, and the tools' argument refusals.

Every test runs on :class:`~tests.restore_scene.Scene`'s folders under ``tmp_path``.
"""

import hashlib
import random
import zipfile
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents.export import stamped_mtime
from bookvie.store import OsFileSystem
from tests.agent_client import (
    FORM_ELICITATION,
    LIST_LOCAL_BACKUPS,
    MODERN_PROTOCOL_VERSION,
    PREVIEW_RESTORE,
    RESTORE_BACKUP,
    McpClient,
)
from tests.builder import LibraryBuilder
from tests.helpers import (
    RecordingLock,
    api_client,
    backup_zip,
    covers_in,
    image_bytes,
    library_bytes,
    post_restore,
    staging_in,
)
from tests.restore_scene import (
    ACCEPT,
    ADDED_TITLES,
    BACKUP_AT,
    COVER_FILE,
    DAILY,
    DUNE_ID,
    EARLIER_EXPORT,
    FROM_DROPBOX,
    LOCAL_STATE,
    NOW,
    NOW_COUNTS,
    OUTSIDE_MESSAGE,
    SAFETY_COPY,
    SAFETY_COPY_FAILED_MESSAGE,
    SECOND_SAFETY_COPY,
    THEN,
    FaultIn,
    Scene,
    confirm,
    members,
    retry_with,
    structured,
    tool_error,
    within,
)

THIRD_SAFETY_COPY = "bookvie-pre-restore-2026-11-20T1004-3.zip"
BLOCK = 4 * 1024 * 1024
"""Dropbox's content-hash block (AD-22), spelled out here, not read from the code."""


@pytest.fixture
def scene(tmp_path: Path, connect_mcp: Callable[..., McpClient]) -> Scene:
    return Scene(tmp_path, connect_mcp)


def _listed(scene: Scene) -> dict[str, dict[str, Any]]:
    """``list_local_backups``' entries by path relative to the backups folder."""
    backups = structured(scene.client.answer(LIST_LOCAL_BACKUPS)).get("backups", [])
    root = scene.backups.resolve()
    return {Path(e["path"]).relative_to(root).as_posix(): e for e in backups}


# --- AC-1: what is listed ---------------------------------------------------------


def test_a_safety_copy_name_in_from_dropbox_is_neither_listed_nor_restorable(
    scene: Scene,
) -> None:
    # [P2] AC-1, AC-4: only daily backups come down from Dropbox (backup_file._kind_in_from_dropbox).
    relative = f"{FROM_DROPBOX}/{SAFETY_COPY}"
    (scene.backups / FROM_DROPBOX).mkdir()
    (scene.backups / relative).write_bytes(backup_zip(scene.then, BACKUP_AT))
    before = scene.kept()

    assert set(_listed(scene)) == {DAILY}

    for tool in (PREVIEW_RESTORE, RESTORE_BACKUP):
        refused = tool_error(scene.modern.answer(tool, {"path": scene.path(relative)}))
        assert refused == {
            "kind": "refusal",
            "code": "restore_outside_backups",
            "message": OUTSIDE_MESSAGE,
        }, tool
    assert scene.kept() == before


def test_the_content_hash_of_a_backup_over_one_block_hashes_each_block(scene: Scene) -> None:
    # [P2] AC-1: a 4 MiB block, then the rest (Dropbox's rule, written out by hand).
    big = scene.backups / "bookvie-backup-2026-11-18.zip"
    big.write_bytes(backup_zip(scene.then, BACKUP_AT))
    with zipfile.ZipFile(big, "a", compression=zipfile.ZIP_STORED) as archive:
        archive.writestr("padding.bin", random.Random(131).randbytes(BLOCK + 4096))
    data = big.read_bytes()
    assert BLOCK < len(data) < 2 * BLOCK, len(data)

    entry = _listed(scene)[big.name]

    first, rest = hashlib.sha256(data[:BLOCK]).digest(), hashlib.sha256(data[BLOCK:]).digest()
    assert entry["contentHash"] == hashlib.sha256(first + rest).hexdigest()
    assert entry["contentHash"] != hashlib.sha256(data).hexdigest()
    assert entry["size"] == len(data)


# --- AC-2, AC-7: the safety copy -------------------------------------------------


def test_the_safety_copy_is_stamped_with_the_time_its_name_gives(scene: Scene) -> None:
    # [P1] AC-2: the same clock.now() names the copy and stamps its library.json entry.
    done = structured(within(30, lambda: confirm(scene.modern, scene.path(DAILY))))
    assert Path(done["safetyCopy"]).name == SAFETY_COPY, done

    with zipfile.ZipFile(scene.backups / SAFETY_COPY) as archive:
        info = archive.getinfo("library.json")
    assert info.date_time == NOW.timetuple()[:6]
    assert stamped_mtime(info.extra) == int(NOW.timestamp())
    listed = _listed(scene)[SAFETY_COPY]
    assert (listed["kind"], datetime.fromisoformat(listed["backupTime"])) == ("safety", NOW)


def test_a_third_safety_copy_in_one_minute_is_dash_3_and_replaces_neither_earlier_one(
    scene: Scene,
) -> None:
    # [P2] AC-7: the first free -N; a safety copy never replaces a file.
    for name in (SAFETY_COPY, SECOND_SAFETY_COPY):
        (scene.backups / name).write_bytes(backup_zip(scene.then, NOW))
    earlier = scene.kept()["backups"]

    done = structured(within(30, lambda: confirm(scene.modern, scene.path(DAILY))))

    assert Path(done["safetyCopy"]).name == THIRD_SAFETY_COPY, done
    after = scene.kept()["backups"]
    assert set(after) - set(earlier) == {THIRD_SAFETY_COPY}
    assert {name: after[name] for name in earlier} == earlier


class _Steps(OsFileSystem):
    """The real filesystem, logging each rename as ``"replace <file name>"``."""

    def __init__(self, log: list[str]) -> None:
        self._log = log

    def replace(self, src: Path, dst: Path) -> None:
        super().replace(src, dst)
        self._log.append(f"replace {Path(dst).name}")


def test_an_accepted_restore_holds_the_lock_once_around_the_safety_copy_and_the_commit(
    scene: Scene,
) -> None:
    # [P1] AC-7: one acquire, the safety copy, the commit, one release (AD-22, AD-4).
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    log: list[str] = []
    state = scene.client.http.app.state
    lock = RecordingLock(log)
    state.store.lock = lock
    state.write_lock = lock
    state.store.fs = _Steps(log)

    done = within(
        30,
        lambda: scene.modern.answer(
            RESTORE_BACKUP,
            {"path": scene.path(DAILY)},
            input_responses={key: ACCEPT},
            request_state=sealed,
        ),
    )

    assert library_bytes(scene.data_dir) == scene.backup_library, done
    assert (log[0], log[-1]) == ("lock acquired", "lock released"), log
    assert log.count("lock acquired") == log.count("lock released") == 1, log
    assert log.index(f"replace {SAFETY_COPY}") < log.index("replace library.json"), log


def test_a_safety_copy_whose_close_fails_is_safety_copy_failed(scene: Scene) -> None:
    # [P1] AC-8: close is before the rename, so nothing is left and nothing restored.
    scene.client.http.app.state.store.fs = FaultIn(scene.backups, "close")
    before = scene.kept()

    refused = tool_error(confirm(scene.modern, scene.path(DAILY)))

    assert refused == {
        "kind": "couldnt_save",
        "code": "safety_copy_failed",
        "message": SAFETY_COPY_FAILED_MESSAGE,
    }
    assert scene.kept() == before
    assert staging_in(scene.data_dir) == []


def test_a_failed_folder_flush_after_the_safety_copy_is_only_logged(
    scene: Scene, capsys: pytest.CaptureFixture[str]
) -> None:
    # [P1] AC-8: the rename is the copy's commit, as for export_backup; the restore goes on.
    scene.client.http.app.state.store.fs = FaultIn(scene.backups, "fsync_dir")
    pre_library = library_bytes(scene.data_dir)

    done = structured(within(30, lambda: confirm(scene.modern, scene.path(DAILY))))

    assert Path(done["safetyCopy"]).name == SAFETY_COPY, done
    assert library_bytes(scene.data_dir) == scene.backup_library
    assert members(scene.backups / SAFETY_COPY)["library.json"] == pre_library
    assert "couldn't flush" in capsys.readouterr().err


# --- AC-3, AC-7: a download and a safety copy restore like a daily backup -----------


def test_a_backup_from_dropbox_previews_and_restores_and_its_safety_copy_previews_back(
    scene: Scene,
) -> None:
    # [P1] AC-3, AC-7: the from-dropbox/ kind, and a preview of the safety copy it leaves.
    (scene.backups / FROM_DROPBOX).mkdir()
    (scene.backups / DAILY).rename(scene.backups / FROM_DROPBOX / DAILY)
    relative = f"{FROM_DROPBOX}/{DAILY}"
    assert _listed(scene)[relative]["kind"] == "from_dropbox"
    preview = structured(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(relative)}))
    assert sorted(preview["booksAddedSince"]) == sorted(ADDED_TITLES), preview

    done = structured(within(30, lambda: confirm(scene.modern, scene.path(relative))))

    assert library_bytes(scene.data_dir) == scene.backup_library, done
    assert done["restoredFrom"] == str((scene.backups / relative).resolve())
    assert Path(done["safetyCopy"]).parent == scene.backups.resolve()
    assert (scene.data_dir / LOCAL_STATE).read_bytes() == EARLIER_EXPORT

    back = structured(scene.client.answer(PREVIEW_RESTORE, {"path": done["safetyCopy"]}))
    assert back == {
        "backupTime": back["backupTime"],
        "backup": NOW_COUNTS,
        "current": THEN,
        "booksAddedSince": [],
        "cardNotesAddedSince": 0,
    }, back
    assert datetime.fromisoformat(back["backupTime"]) == NOW


def _grown_by(
    scene: Scene, call: Callable[[McpClient], dict[str, Any]]
) -> tuple[dict[str, Any], str]:
    """The data folder put back to the backup's library and grown with ``call``, on a new
    app over it: ``preview_restore``'s answer and ``restore_backup``'s question."""
    (scene.data_dir / "library.json").write_bytes(scene.backup_library)
    client = scene.connect()
    answer = call(client)
    assert answer.get("isError") is not True, answer
    path = {"path": scene.path(DAILY)}
    preview = structured(client.answer(PREVIEW_RESTORE, path))
    asked = client.speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION).answer(RESTORE_BACKUP, path)
    (request,) = asked["inputRequests"].values()
    return preview, request["params"]["message"]


TAIL = "A safety copy of your current library is saved first."


def test_card_notes_added_on_old_books_only_are_named_without_titles(scene: Scene) -> None:
    # [P2] AC-3, AC-5: the notes-only mix (spec Design Notes; its wording is Oleg's to confirm).
    def two_notes(client: McpClient) -> dict[str, Any]:
        client.call_tool("add_card_note", {"bookId": DUNE_ID, "text": "Later, 1", "page": "60"})
        return client.call_tool(
            "add_card_note", {"bookId": DUNE_ID, "text": "Later, 2", "page": "61"}
        )

    preview, message = _grown_by(scene, two_notes)

    assert (preview["booksAddedSince"], preview["cardNotesAddedSince"]) == ([], 2), preview
    assert message == (
        "Replace all data with the backup from 19 Nov, 09:02? You'd lose 2 card notes added "
        f"since, and every other change since then. {TAIL}"
    )


def test_books_added_without_card_notes_are_named_without_a_card_note_count(
    scene: Scene,
) -> None:
    # [P2] AC-3, AC-5: the books-only mix (spec Design Notes; its wording is Oleg's to confirm).
    preview, message = _grown_by(
        scene,
        lambda client: client.call_tool(
            "add_book",
            {
                "title": "The Dispossessed",
                "pages": "387",
                "authors": "Ursula K. Le Guin",
                "language": "English",
                "publisher": "Harper",
                "type": "paperback",
            },
        ),
    )

    assert (preview["booksAddedSince"], preview["cardNotesAddedSince"]) == (
        ["The Dispossessed"],
        0,
    ), preview
    assert message == (
        "Replace all data with the backup from 19 Nov, 09:02? You'd lose 1 book added since "
        f"(The Dispossessed), and every other change since then. {TAIL}"
    )


# --- AC-6: the answer ------------------------------------------------------------


def test_an_accept_carrying_form_content_still_restores(scene: Scene) -> None:
    # [P2] AC-6: the form asks for nothing, so only the action counts.
    junk = {"action": "accept", "content": {"sure": True, "note": "yes please", "n": 3}}

    done = structured(within(30, lambda: confirm(scene.modern, scene.path(DAILY), junk)))

    assert library_bytes(scene.data_dir) == scene.backup_library, done
    assert Path(done["safetyCopy"]).name == SAFETY_COPY


def test_a_retry_naming_the_same_file_through_dotdot_is_outside_the_backups(
    scene: Scene,
) -> None:
    # [P2] AC-4, AC-6: the path is checked before the token, and ".." is never allowed.
    (scene.backups / FROM_DROPBOX).mkdir()
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = retry_with(asked)
    before = scene.kept()

    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": str(scene.backups / FROM_DROPBOX / ".." / DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )

    assert tool_error(answer)["code"] == "restore_outside_backups", answer
    assert scene.kept() == before


# --- AC-9: a fault while covers are copied in --------------------------------------

NEW_COVERS = (
    ("3b3b3b3b-0000-4000-8000-000000000001", "1e1e1e1e-0000-4000-8000-000000000001"),
    ("3b3b3b3b-0000-4000-8000-000000000002", "1e1e1e1e-0000-4000-8000-000000000002"),
)


def _library_with_two_more_covers(folder: Path) -> None:
    """Dune and its cover, as in the scene, plus two Books whose covers aren't in it."""
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID, title="Dune", pages=412, cover_file=COVER_FILE, spine_color_from_cover="#A85A4A"
    )
    (folder / "covers").mkdir(parents=True)
    (folder / COVER_FILE).write_bytes(image_bytes(fmt="JPEG"))
    for n, (book_id, cover_id) in enumerate(NEW_COVERS, start=1):
        cover = f"covers/{book_id}-{cover_id}.jpg"
        builder.book(
            id=book_id, title=f"Covered {n}", cover_file=cover, spine_color_from_cover="#4A6AA8"
        )
        (folder / cover).write_bytes(image_bytes(fmt="JPEG"))
    builder.write(folder)


class _SecondCoverFault(OsFileSystem):
    """Fails the temp file of the second cover written into ``<data folder>/covers/``,
    so the first is already in and must be taken out again."""

    def __init__(self, data_dir: Path) -> None:
        self.covers = (Path(data_dir) / "covers").resolve()
        self.seen = 0

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        if Path(directory).resolve() == self.covers:
            self.seen += 1
            if self.seen == 2:
                raise OSError(5, "injected create_temp fault at the second cover")
        return super().create_temp(directory, prefix)


def test_a_cover_fault_is_couldnt_save_through_the_tool_as_through_the_route(
    scene: Scene, tmp_path: Path
) -> None:
    # [P1] AC-9: the same refusal, and covers/ and library.json as they were in both.
    source = tmp_path / "covered"
    _library_with_two_more_covers(source)
    archive = backup_zip(source, BACKUP_AT)
    name = "bookvie-backup-2026-11-18.zip"
    (scene.backups / name).write_bytes(archive)
    route_dir = tmp_path / "route"
    route_dir.mkdir()
    for entry in scene.data_dir.iterdir():
        if entry.is_file():
            (route_dir / entry.name).write_bytes(entry.read_bytes())
    (route_dir / "covers").mkdir()
    for cover in (scene.data_dir / "covers").iterdir():
        (route_dir / "covers" / cover.name).write_bytes(cover.read_bytes())
    pre_library, pre_covers = library_bytes(scene.data_dir), covers_in(scene.data_dir)

    routed = post_restore(api_client(route_dir, _SecondCoverFault(route_dir)), archive)
    scene.client.http.app.state.store.fs = _SecondCoverFault(scene.data_dir)
    tool = tool_error(confirm(scene.modern, scene.path(name)))

    assert (tool.get("code"), routed.json()["error"]["code"]) == ("couldnt_save",) * 2, tool
    assert tool == routed.json()["error"]
    for folder in (scene.data_dir, route_dir):
        assert library_bytes(folder) == pre_library, folder.name
        assert covers_in(folder) == pre_covers, folder.name
        assert staging_in(folder) == [], folder.name
    # The safety copy came first and stays: it is the library as it still is.
    assert members(scene.backups / SAFETY_COPY)["library.json"] == pre_library


# --- AC-10: the arguments ----------------------------------------------------------

ARGUMENT_CASES = [
    (LIST_LOCAL_BACKUPS, {"folder": "/tmp"}, ["folder"]),
    (PREVIEW_RESTORE, {}, ["path"]),
    (PREVIEW_RESTORE, {"path": "x", "force": True}, ["force"]),
    (PREVIEW_RESTORE, {"path": 7}, ["path"]),
    (RESTORE_BACKUP, {}, ["path"]),
    (RESTORE_BACKUP, {"path": "x", "confirmed": True}, ["confirmed"]),
]


@pytest.mark.parametrize(
    ("tool", "arguments", "fields"),
    ARGUMENT_CASES,
    ids=[
        "list-extra",
        "preview-missing",
        "preview-extra",
        "preview-number",
        "restore-missing",
        "restore-extra",
    ],
)
def test_a_missing_or_extra_argument_is_invalid_fields_and_changes_nothing(
    scene: Scene, tool: str, arguments: dict[str, Any], fields: list[str]
) -> None:
    # [P1] AC-10: each tool's arguments are refused field by field, before anything is read.
    before = scene.kept()

    body = scene.modern.rpc("tools/call", {"name": tool, "arguments": arguments}, error_status=True)

    result = body.get("result", {})
    refused = tool_error(result)
    assert refused.get("code") == "invalid_fields", body
    assert [f["field"] for f in refused["fields"]] == fields, refused
    assert scene.kept() == before
