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
import threading
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
from bookvie.store import OsFileSystem
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

# --- The scene: yesterday's backup, and a library that grew since --------------

NOW = datetime(2026, 11, 20, 10, 4).astimezone()
"""The app's clock (Europe/Madrid, as every test runs): 20 Nov, 10:04."""
BACKUP_AT = datetime(2026, 11, 19, 9, 2).astimezone()
"""When yesterday's daily backup was made: "19 Nov, 09:02"."""
DAILY = "bookvie-backup-2026-11-19.zip"
TODAY_DAILY = "bookvie-backup-2026-11-20.zip"
TODAY_DAILY_AT = datetime(2026, 11, 20, 9, 1).astimezone()
SAFETY_COPY = "bookvie-pre-restore-2026-11-20T1004.zip"
SECOND_SAFETY_COPY = "bookvie-pre-restore-2026-11-20T1004-2.zip"
FROM_DROPBOX = "from-dropbox"

DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
COVER_FILE = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
NOTE_IDS = ("1d0c8e0a-1111-4a2b-8c3d-000000000001", "1d0c8e0a-1111-4a2b-8c3d-000000000002")
ADDED_TITLES = ["Designing Data-Intensive Applications", "Thinking in Systems", "Atomic Habits"]
ADDED_IDS = (
    "2a2a2a2a-0000-4000-8000-000000000001",
    "2a2a2a2a-0000-4000-8000-000000000002",
    "2a2a2a2a-0000-4000-8000-000000000003",
)
NOTES_PER_ADDED_BOOK = 5
LATER_NOTES_ON_PIRANESI = 3
ADDED_CARD_NOTES = len(ADDED_TITLES) * NOTES_PER_ADDED_BOOK + LATER_NOTES_ON_PIRANESI  # 18
THEN = {"books": 2, "cardNotes": 2, "covers": 1}
NOW_COUNTS = {"books": 5, "cardNotes": 2 + ADDED_CARD_NOTES, "covers": 1}

LOCAL_STATE = "local-state.json"
EARLIER_EXPORT = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'

ACCEPT = {"action": "accept", "content": {}}
DECLINE = {"action": "decline"}
CANCEL = {"action": "cancel"}

OUTSIDE_MESSAGE = "bookvie restores only from its backups folder. Nothing was changed."
NOT_CONFIRMED_MESSAGE = "Not restored. Nothing was changed."
SAFETY_COPY_FAILED_MESSAGE = "Couldn't save a safety copy, so nothing was restored."
"""UX-DR81's words for the three new codes: the skill reports the answer's message."""


def _write_library(folder: Path, *, grown: bool) -> None:
    """The library as it was at :data:`BACKUP_AT`, or (``grown``) as it is now:
    3 Books and 18 Card notes added since, and Dune's page moved on."""
    builder = LibraryBuilder()
    dune = builder.book(
        id=DUNE_ID, title="Dune", pages=412, cover_file=COVER_FILE, spine_color_from_cover="#A85A4A"
    )
    builder.reading(dune, current_page=120 if grown else 50)
    builder.main(dune)
    piranesi = builder.book(id=PIRANESI_ID, title="Piranesi", pages=272)
    builder.card_note(dune, id=NOTE_IDS[0], text="Fear is the mind-killer.", page_start=10)
    builder.card_note(dune, id=NOTE_IDS[1], text="The spice must flow.", page_start=20)
    if grown:
        for book_id, title in zip(ADDED_IDS, ADDED_TITLES, strict=True):
            builder.book(id=book_id, title=title)
            for n in range(NOTES_PER_ADDED_BOOK):
                builder.card_note(book_id, text=f"{title}, note {n + 1}", page_start=n + 1)
        for n in range(LATER_NOTES_ON_PIRANESI):
            builder.card_note(piranesi, text=f"A later note {n + 1}", page_start=n + 1)
    builder.write(folder)
    (folder / "covers").mkdir(exist_ok=True)
    (folder / COVER_FILE).write_bytes(image_bytes(fmt="JPEG"))


class _Scene:
    """A data folder that grew since :data:`DAILY`, the backups folder holding it,
    a :class:`SetClock` at :data:`NOW`, and two clients on one app: ``client`` speaks
    the handshake revision, ``modern`` 2026-07-28 with form elicitation."""

    def __init__(self, tmp_path: Path, connect_mcp: Callable[..., McpClient]) -> None:
        self.tmp_path = tmp_path
        self.data_dir = tmp_path / "library"
        self.backups = tmp_path / "backups"
        self.then = tmp_path / "then"
        _write_library(self.then, grown=False)
        self.backup_library = library_bytes(self.then)
        self.backup_covers = covers_in(self.then)
        self.backups.mkdir()
        (self.backups / DAILY).write_bytes(backup_zip(self.then, BACKUP_AT))
        _write_library(self.data_dir, grown=True)
        (self.data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
        self.clock = SetClock(NOW)
        self._connect_mcp = connect_mcp
        self.client = self.connect()
        self.modern = self.client.speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)

    def connect(self) -> McpClient:
        """Another app on the same folders and clock: what a restarted server would be."""
        return self._connect_mcp(data_dir=self.data_dir, backups_dir=self.backups, clock=self.clock)

    def path(self, name: str) -> str:
        return str(self.backups / name)

    def kept(self) -> dict[str, dict[str, bytes]]:
        """``library.json``, ``covers/``, ``local-state.json`` and the backups folder, by bytes."""
        data = {
            k: v for k, v in files_under(self.data_dir).items() if not k.startswith(".staging/")
        }
        return {"data": data, "backups": files_under(self.backups)}


@pytest.fixture
def scene(tmp_path: Path, connect_mcp: Callable[..., McpClient]) -> _Scene:
    return _Scene(tmp_path, connect_mcp)


def _structured(answer: dict[str, Any]) -> dict[str, Any]:
    """A result's structured content, or ``{}`` (an error, or a tool that isn't there)."""
    return answer.get("structuredContent") or {}


def _error(answer: dict[str, Any]) -> dict[str, Any]:
    """The AD-9 error object of an ``isError`` result; for a JSON-RPC error, its message as
    ``code``, so a red leaf names what came back."""
    if "rpcError" in answer:
        return {"code": answer["rpcError"].get("message")}
    if answer.get("isError") is not True:
        return {"code": f"not an error: {json.dumps(answer)[:200]}"}
    return json.loads(answer["content"][0]["text"])


def _retry_with(asked: dict[str, Any]) -> tuple[str, str | None]:
    """The key of an ``InputRequiredResult``'s one input request and its ``requestState``.

    Opaque on purpose: no assertion, so a leaf reaches its criterion first.
    """
    return next(iter(asked.get("inputRequests") or {}), "confirm"), asked.get("requestState")


def _confirm(client: McpClient, path: str, response: dict[str, Any] = ACCEPT) -> dict[str, Any]:
    """``restore_backup`` asked, then answered with ``response`` on its own token."""
    asked = client.answer(RESTORE_BACKUP, {"path": path})
    key, state = _retry_with(asked)
    return client.answer(
        RESTORE_BACKUP, {"path": path}, input_responses={key: response}, request_state=state
    )


def _within(seconds: float, call: Callable[[], Any]) -> Any:
    """``call()``'s value, failing if it hasn't returned after ``seconds`` (a deadlock)."""
    box: dict[str, Any] = {}

    def run() -> None:
        try:
            box["value"] = call()
        except BaseException as exc:  # noqa: BLE001 - re-raised in the test's thread
            box["error"] = exc

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    worker.join(seconds)
    assert not worker.is_alive(), f"didn't finish in {seconds} s: is the store lock taken twice?"
    if "error" in box:
        raise box["error"]
    return box["value"]


def _members(path: Path) -> dict[str, bytes]:
    with zipfile.ZipFile(path) as archive:
        return {i.filename: archive.read(i) for i in archive.infolist() if not i.is_dir()}


class _FaultIn(OsFileSystem):
    """Fails one step of an atomic write whose file lies directly in ``folder``; ``write``
    writes half first. Every other write passes, so one folder's write can fail alone."""

    def __init__(self, folder: Path, fail_at: str) -> None:
        self.folder = Path(folder).resolve()
        self.fail_at = fail_at
        self._fds: set[int] = set()

    def _here(self, path: Path) -> bool:
        return Path(path).resolve() == self.folder

    def _fail(self, step: str) -> None:
        if step == self.fail_at:
            raise OSError(5, f"injected {step} fault in {self.folder.name}/")

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        if self._here(directory):
            self._fail("create_temp")
        fd, temp = super().create_temp(directory, prefix)
        if self._here(directory):
            self._fds.add(fd)
        return fd, temp

    def write(self, fd: int, data: bytes) -> None:
        if fd in self._fds and self.fail_at == "write":
            super().write(fd, data[: len(data) // 2])
            self._fail("write")
        super().write(fd, data)

    def fsync(self, fd: int) -> None:
        if fd in self._fds:
            self._fail("fsync")
        super().fsync(fd)

    def replace(self, src: Path, dst: Path) -> None:
        if self._here(Path(dst).parent):
            self._fail("replace")
        super().replace(src, dst)


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
    scene: _Scene, connect_mcp: Callable[..., McpClient], tmp_path: Path
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
    listed = _structured(answer).get("backups", [])

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
        assert _structured(other.call_tool(LIST_LOCAL_BACKUPS)) == {"backups": []}, folder.name


# --- AC-2: the backup's time is stamped in the zip --------------------------------


def test_a_backup_zip_carries_its_time_and_list_local_backups_reads_it_from_there(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-2
    data_dir, backups = tmp_path / "library", tmp_path / "backups"
    _write_library(data_dir, grown=False)
    clock = SetClock(BACKUP_AT)
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=clock)
    written = _structured(client.call_tool(EXPORT_BACKUP))

    with zipfile.ZipFile(backups / DAILY) as archive:
        stamped = archive.getinfo("library.json").date_time
    assert stamped == (2026, 11, 19, 9, 2, 0), stamped

    assert datetime.fromisoformat(written["createdAt"]) == clock.now()
    (entry,) = _structured(client.answer(LIST_LOCAL_BACKUPS)).get("backups", [None])
    assert datetime.fromisoformat(entry["backupTime"]) == clock.now(), entry

    # An older zip's entry has no time zone: its time is read as local time.
    older_at = datetime(2026, 11, 17, 18, 40).astimezone()
    (backups / "bookvie-backup-2026-11-17.zip").write_bytes(backup_zip(data_dir, older_at))
    times = {
        Path(e["path"]).name: e["backupTime"]
        for e in _structured(client.answer(LIST_LOCAL_BACKUPS))["backups"]
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
    scene: _Scene, tmp_path: Path
) -> None:
    # [P0] AC-3
    before = scene.kept()
    answer = scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(DAILY)})
    preview = _structured(answer)

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
        refused = _error(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(name)}))
        assert refused["code"] == REFUSED_CODES[name], name
        assert refused == post_restore(route, data).json()["error"], name
    assert scene.kept() == {
        "data": before["data"],
        "backups": {**before["backups"], **REFUSED_ARCHIVES},
    }


# --- AC-4: only files in the backups folder ---------------------------------------

OUTSIDE_CASES = ["outside", "dotdot", "symlink_out", "folder", "not_a_backup_name", "nested"]


def _outside_path(scene: _Scene, case: str) -> str:
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
    scene: _Scene, tool: str, case: str
) -> None:
    # [P0] AC-4
    path = _outside_path(scene, case)
    before = scene.kept()
    refused = _error(scene.modern.answer(tool, {"path": path}))

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
    scene: _Scene, tool: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    # [P1] AC-4: a relative path depends on the server's working folder.
    monkeypatch.chdir(scene.backups)
    before = scene.kept()
    refused = _error(scene.modern.answer(tool, {"path": DAILY}))
    assert refused.get("code") == "restore_outside_backups", refused
    assert scene.kept() == before


def test_a_backup_name_that_isnt_a_readable_backup_is_left_out_of_the_list(scene: _Scene) -> None:
    # [P1] AC-1: a daily-named non-zip, or a zip without library.json, can't be restored.
    (scene.backups / "bookvie-backup-2026-11-10.zip").write_bytes(b"not a zip at all")
    (scene.backups / "bookvie-backup-2026-11-11.zip").write_bytes(zip_archive({"a.txt": b"x"}))
    listed = _structured(scene.client.answer(LIST_LOCAL_BACKUPS)).get("backups", [])
    assert [Path(entry["path"]).name for entry in listed] == [DAILY], listed


# --- AC-5: restore_backup asks the user -----------------------------------------


def test_restore_backup_asks_with_one_form_elicitation_and_changes_nothing_yet(
    scene: _Scene,
) -> None:
    # [P0] AC-5
    before = scene.kept()
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})

    assert asked.get("resultType") == "input_required", asked

    preview = _structured(scene.client.answer(PREVIEW_RESTORE, {"path": scene.path(DAILY)}))
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
    scene: _Scene,
    response: dict[str, Any],
    *,
    state: Callable[[str | None], str | None] = lambda s: s,
) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: response},
        request_state=state(sealed),
    )
    return before, answer


def _declined(scene: _Scene) -> tuple[dict, dict]:
    return _answered(scene, DECLINE)


def _cancelled(scene: _Scene) -> tuple[dict, dict]:
    return _answered(scene, CANCEL)


def _tampered(scene: _Scene) -> tuple[dict, dict]:
    return _answered(scene, ACCEPT, state=_tamper)


def _reused(scene: _Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    retry = {"input_responses": {key: DECLINE}, "request_state": sealed}
    scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)}, **retry)
    before = scene.kept()
    retry["input_responses"] = {key: ACCEPT}
    return before, scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)}, **retry)


def _after_five_minutes(scene: _Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    scene.clock.advance(timedelta(minutes=5, seconds=1))
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _after_a_restart(scene: _Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    restarted = scene.connect().speaking(MODERN_PROTOCOL_VERSION, FORM_ELICITATION)
    before = scene.kept()
    answer = restarted.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _another_path(scene: _Scene) -> tuple[dict, dict]:
    other = "bookvie-backup-2026-11-18.zip"
    (scene.backups / other).write_bytes(backup_zip(scene.then, BACKUP_AT - timedelta(days=1)))
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(other)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _library_changed(scene: _Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
    scene.client.call_tool("update_page", {"bookId": DUNE_ID, "page": 130})
    before = scene.kept()
    answer = scene.modern.answer(
        RESTORE_BACKUP,
        {"path": scene.path(DAILY)},
        input_responses={key: ACCEPT},
        request_state=sealed,
    )
    return before, answer


def _archive_changed(scene: _Scene) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
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
    def run(scene: _Scene) -> tuple[dict, dict]:
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
    scene: _Scene, run: Callable[[_Scene], tuple[dict, dict]], reason: str
) -> None:
    # [P0] AC-6
    before, answer = run(scene)
    refused = _error(answer)

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
    scene: _Scene,
) -> None:
    # [P0] AC-7
    (scene.backups / TODAY_DAILY).write_bytes(backup_zip(scene.then, TODAY_DAILY_AT))
    before = scene.kept()
    pre_library = library_bytes(scene.data_dir)
    pre_covers = covers_in(scene.data_dir)

    done = _within(30, lambda: _confirm(scene.modern, scene.path(DAILY)))

    assert library_bytes(scene.data_dir) == scene.backup_library, done

    answer = _structured(done)
    assert set(answer) == {"restoredFrom", "backupTime", "safetyCopy"}, done
    assert Path(answer["restoredFrom"]).resolve() == (scene.backups / DAILY).resolve()
    assert datetime.fromisoformat(answer["backupTime"]) == BACKUP_AT
    assert Path(answer["safetyCopy"]).resolve() == (scene.backups / SAFETY_COPY).resolve()
    assert covers_in(scene.data_dir) == scene.backup_covers
    assert staging_in(scene.data_dir) == []

    # The safety copy is exactly the library it replaced, and nothing else moved.
    copy = _members(scene.backups / SAFETY_COPY)
    assert copy["library.json"] == pre_library
    assert {
        k.removeprefix("covers/"): v for k, v in copy.items() if k.startswith("covers/")
    } == pre_covers
    after = files_under(scene.backups)
    assert set(after) - set(before["backups"]) == {SAFETY_COPY}
    assert {name: after[name] for name in before["backups"]} == before["backups"]
    assert (scene.data_dir / LOCAL_STATE).read_bytes() == EARLIER_EXPORT

    # Restoring the safety copy the same way gives back the library as it was.
    undone = _within(30, lambda: _confirm(scene.modern, scene.path(SAFETY_COPY)))
    assert library_bytes(scene.data_dir) == pre_library, undone
    assert covers_in(scene.data_dir) == pre_covers
    assert Path(_structured(undone)["safetyCopy"]).name == SECOND_SAFETY_COPY
    assert (scene.data_dir / LOCAL_STATE).read_bytes() == EARLIER_EXPORT


# --- AC-8: no safety copy, no restore --------------------------------------------


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "replace"])
def test_a_safety_copy_that_cant_be_written_is_safety_copy_failed_and_nothing_is_restored(
    scene: _Scene, step: str
) -> None:
    # [P0] AC-8
    scene.client.http.app.state.store.fs = _FaultIn(scene.backups, step)
    before = scene.kept()

    refused = _error(_confirm(scene.modern, scene.path(DAILY)))

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
    scene: _Scene, tmp_path: Path
) -> None:
    # [P0] AC-9
    route_dir = tmp_path / "route"
    shutil.copytree(scene.data_dir, route_dir)
    archive = (scene.backups / DAILY).read_bytes()

    _confirm(scene.modern, scene.path(DAILY))
    routed = post_restore(api_client(route_dir), archive)

    assert library_bytes(scene.data_dir) == library_bytes(route_dir), routed.text

    assert routed.status_code == 200
    assert covers_in(scene.data_dir) == covers_in(route_dir)
    # The route is unchanged: no safety copy, no new gate.
    assert not (tmp_path / "route-backups").exists()

    # Every refusal the route gives, the tool gives too.
    for name, data in REFUSED_ARCHIVES.items():
        (scene.backups / name).write_bytes(data)
        tool = _error(scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(name)}))
        assert tool == post_restore(api_client(route_dir), data).json()["error"], name

    # A filesystem fault at the commit is couldnt_save through both, with library.json kept.
    # Both folders now hold the backup's library, so restore the grown one into them.
    grown = tmp_path / "grown"
    _write_library(grown, grown=True)
    grown_archive = backup_zip(grown, TODAY_DAILY_AT)
    (scene.backups / TODAY_DAILY).write_bytes(grown_archive)
    kept = library_bytes(route_dir)
    faulted = post_restore(api_client(route_dir, _FaultIn(route_dir, "replace")), grown_archive)
    scene.client.http.app.state.store.fs = _FaultIn(scene.data_dir, "replace")
    tool_fault = _error(_confirm(scene.modern, scene.path(TODAY_DAILY)))
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


def test_the_question_says_every_change_goes_back_when_nothing_was_added(scene: _Scene) -> None:
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
    _write_library(then, grown=False)
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
    scene: _Scene, capabilities: dict[str, Any]
) -> None:
    # [P1] AC-6: `form` counts, as an empty `elicitation` object does.
    client = scene.client.speaking(MODERN_PROTOCOL_VERSION, capabilities)

    asked = client.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})

    assert asked.get("resultType") == "input_required", asked


def _answered_under(scene: _Scene, responses: Callable[[str], dict | None]) -> tuple[dict, dict]:
    asked = scene.modern.answer(RESTORE_BACKUP, {"path": scene.path(DAILY)})
    key, sealed = _retry_with(asked)
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
    scene: _Scene, responses: Callable[[str], dict | None]
) -> None:
    # [P1] AC-6: only an explicit accept under the asked key goes on.
    before, answer = _answered_under(scene, responses)

    assert _error(answer) == {
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
    _write_library(data_dir, grown=False)
    # The header the app's own export fetch sends; the guard refuses an export without it.
    response = api_client(data_dir).get("/api/export", headers={"X-Bookvie-Export": "1"})
    assert response.status_code == 200, response.text

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        info = archive.getinfo("library.json")
    now = FakeClock(TODAY).now()
    assert stamped_mtime(info.extra) == int(now.timestamp())
    assert info.date_time == now.timetuple()[:6]
