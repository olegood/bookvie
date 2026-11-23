"""Story 13.7: ``bookvie-dropbox``'s ``list_backups`` and ``download_backup`` (AD-22).

Both tools run against :class:`tests.dropbox_fakes.FakeDropbox`, through the
in-process server ``bookvie_dropbox.server.build_server(connect=...)``, as
Story 13.2's ``upload_backup`` does. The tool list is read through the real
``bookvie-dropbox serve`` over stdio. A downloaded file is then read by
bookvie's own ``list_local_backups`` and ``preview_restore`` (Story 13.1), on an
app whose backups folder is the test's ``~/bookvie-backups``.

Every test's ``HOME`` is temporary (``conftest._isolated_home``), so
``~/bookvie-backups`` and ``~/bookvie-backups-dev`` are the test's own folders,
and no test reaches the network or the real Keychain.
"""

import importlib
import os
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from tests.agent_client import (
    DESCRIPTIONS,
    DOWNLOAD_BACKUP,
    DROPBOX_TOOL_NAMES,
    LIST_BACKUPS,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    ImportFailed,
    McpClient,
    call_in_process,
    error_of,
    import_or_fail,
    list_stdio_tools,
    structured_of,
)
from tests.helpers import SetClock, backup_zip, dropbox_content_hash, files_under
from tests.restore_scene import BACKUP_AT, NOW, write_library
from tests.test_dropbox_upload import FAIL_KEYRING, Connect, daily

RED_13_7 = "red phase (Story 13.7): bookvie-dropbox has no list_backups or download_backup"

BACKUPS_NAME = "bookvie-backups"
DEV_BACKUPS_NAME = "bookvie-backups-dev"
FROM_DROPBOX = "from-dropbox"
DROPBOX_FOLDER = "/.backups"
TARGETS = ("bookvie", "bookvie-dev")

TODAY = daily("2026-11-20")
"""A same-day name: today's daily backup is already in ``~/bookvie-backups``."""
MADE_AT = {
    daily("2026-11-17"): datetime(2026, 11, 17, 9, 2, 41).astimezone(),
    daily("2026-11-18"): datetime(2026, 11, 18, 9, 3, 5).astimezone(),
    daily("2026-11-19"): datetime(2026, 11, 19, 9, 2, 12).astimezone(),
}
"""When each daily backup in Dropbox was made, in Madrid: its ``client_modified``."""


@pytest.fixture
def fakes() -> Any:
    """``tests.dropbox_fakes``, imported here, as Story 13.2's leaves import it."""
    return importlib.import_module("tests.dropbox_fakes")


def dropbox_call(
    tool: str, arguments: dict[str, Any], connect: Callable[[], Any] | None = None
) -> dict[str, Any]:
    """``tool(arguments)`` on an in-process ``bookvie-dropbox`` server, as wire JSON; with no
    ``connect``, the server's own (the Keychain and the real SDK). A tool the server doesn't
    register yet answers ``{"rpcError": ...}``, so a red leaf fails at its assertion."""
    module = import_or_fail("bookvie_dropbox.server")
    if isinstance(module, ImportFailed):
        server: Any = module
    elif connect is None:
        server = module.build_server()
    else:
        server = module.build_server(connect=connect)
    return call_in_process(server, tool, arguments, rpc_errors=True)


def content_of(answer: dict[str, Any]) -> dict[str, Any]:
    """A tool answer's structured content, read without asserting anything about it."""
    structured = answer.get("structuredContent")
    return structured if isinstance(structured, dict) else {}


def seed_three_dailies(fakes: Any, fake: Any) -> dict[str, bytes]:
    """17, 18 and 19 Nov in Dropbox, each a backup zip made at :data:`MADE_AT`; their bytes."""
    stored: dict[str, bytes] = {}
    for name, at in MADE_AT.items():
        stored[name] = fakes.daily_zip(at, payload=name.encode())
        fake.put(name, stored[name], client_modified=at)
    return stored


def from_dropbox(home: Path, target: str = "bookvie") -> Path:
    folder = BACKUPS_NAME if target == "bookvie" else DEV_BACKUPS_NAME
    return home / folder / FROM_DROPBOX


def same_path(raw: Any, expected: Path) -> bool:
    return isinstance(raw, str) and Path(raw).resolve() == expected.resolve()


# --- AC-1: the tool list -------------------------------------------------------------


# Un-skip when bookvie-dropbox registers list_backups and download_backup.
@pytest.mark.skip(reason=RED_13_7)
def test_the_stdio_server_lists_upload_list_and_download_backup_with_their_descriptions(
    _isolated_home: Path,
) -> None:
    # [P0] AC-1
    command = Path(sys.executable).parent / "bookvie-dropbox"
    listed = list_stdio_tools(
        str(command),
        ["serve"],
        # A Keychain that fails every read: listing tools must not need one.
        {"HOME": str(_isolated_home), "PYTHON_KEYRING_BACKEND": FAIL_KEYRING},
    )

    assert [tool["name"] for tool in listed.get("tools", [])] == DROPBOX_TOOL_NAMES, listed

    tools = {tool["name"]: tool for tool in listed["tools"]}
    for name in (LIST_BACKUPS, DOWNLOAD_BACKUP):
        assert tools[name]["description"] == DESCRIPTIONS[name], name
    listing = tools[LIST_BACKUPS]["inputSchema"]
    assert listing["type"] == "object"
    assert listing.get("properties", {}) == {}
    assert listing.get("required", []) == []
    assert listing.get("additionalProperties") is False
    download = tools[DOWNLOAD_BACKUP]["inputSchema"]
    assert download["type"] == "object"
    assert set(download["properties"]) == {"name", "target"}
    assert sorted(download["required"]) == ["name", "target"]
    assert download["properties"]["name"]["type"] == "string"
    assert download["properties"]["target"]["type"] == "string"
    assert download.get("additionalProperties") is False
    # Still no tool that deletes, moves, or reaches outside /Apps/bookvie/.backups/.
    for word in ("delete", "move", "remove", "rename", "restore"):
        assert not any(word in name for name in tools), (word, list(tools))


# --- AC-2: list_backups ------------------------------------------------------------


# Un-skip when list_backups lists the daily backups in /.backups.
@pytest.mark.skip(reason=RED_13_7)
def test_list_backups_returns_only_the_daily_backups_newest_first_with_their_time_size_and_hash(
    fakes: Any,
) -> None:
    # [P0] AC-2
    fake = fakes.FakeDropbox(page_size=2)  # 2 entries a page: the listing must follow has_more
    stored = seed_three_dailies(fakes, fake)
    for name in (
        "notes.txt",
        "bookvie-backup-2026-02-30.zip",
        "BOOKVIE-BACKUP-2026-11-02.zip",
        "bookvie-backup-2026-11-01.zip.bak",
        "bookvie-pre-restore-2026-11-20T1004.zip",
        ".bookvie-backup-2026-11-03.zip.tmpab12",
    ):
        fake.put(name, b"not a daily backup")
    fake.put_folder("bookvie-backup-2026-11-04.zip")
    connect = Connect(fake)

    answer = dropbox_call(LIST_BACKUPS, {}, connect)
    backups = content_of(answer).get("backups", [])

    assert [entry.get("name") for entry in backups] == [
        daily("2026-11-19"),
        daily("2026-11-18"),
        daily("2026-11-17"),
    ], answer

    assert structured_of(answer)["backups"] == backups
    for entry in backups:
        name = entry["name"]
        assert set(entry) == {"name", "backupTime", "size", "contentHash"}, entry
        when = datetime.fromisoformat(entry["backupTime"])
        assert when.utcoffset() is not None, entry
        assert when == MADE_AT[name], entry
        assert entry["size"] == len(stored[name]), entry
        assert entry["contentHash"] == dropbox_content_hash(stored[name]), entry
    # A list reads; it never writes or deletes.
    assert {call for call, _ in fake.calls} <= {"files_list_folder", "files_list_folder_continue"}
    assert connect.count == 1
    # A folder nothing was ever uploaded to lists as no backups.
    assert structured_of(dropbox_call(LIST_BACKUPS, {}, Connect(fakes.FakeDropbox()))) == {
        "backups": []
    }


# --- AC-3: download_backup ---------------------------------------------------------


# Un-skip when download_backup writes a verified download into from-dropbox/.
@pytest.mark.skip(reason=RED_13_7)
def test_download_backup_writes_a_verified_copy_into_from_dropbox_and_returns_its_path(
    fakes: Any, _isolated_home: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # [P0] AC-3
    backups = _isolated_home / BACKUPS_NAME
    landing = from_dropbox(_isolated_home)
    landing.mkdir(parents=True)
    (backups / TODAY).write_bytes(b"today's backup, made on this computer")
    (landing / TODAY).write_bytes(b"an older download of today's name")
    fake = fakes.FakeDropbox()
    in_dropbox = fakes.daily_zip(datetime(2026, 11, 20, 9, 1, 36).astimezone(), payload=b"dbx")
    fake.put(TODAY, in_dropbox, client_modified=datetime(2026, 11, 20, 8, 1, 36, tzinfo=UTC))
    events: list[tuple[str, str]] = []
    real_fsync, real_replace, real_rename = os.fsync, os.replace, os.rename

    def fsync(fd: int) -> None:
        events.append(("fsync", ""))
        real_fsync(fd)

    def replace(src: Any, dst: Any, *args: Any, **kwargs: Any) -> None:
        events.append(("rename", f"{os.fspath(src)} -> {os.fspath(dst)}"))
        real_replace(src, dst, *args, **kwargs)

    def rename(src: Any, dst: Any, *args: Any, **kwargs: Any) -> None:
        events.append(("rename", f"{os.fspath(src)} -> {os.fspath(dst)}"))
        real_rename(src, dst, *args, **kwargs)

    monkeypatch.setattr(os, "fsync", fsync)
    monkeypatch.setattr(os, "replace", replace)
    monkeypatch.setattr(os, "rename", rename)

    answer = dropbox_call(DOWNLOAD_BACKUP, {"name": TODAY, "target": "bookvie"}, Connect(fake))

    assert same_path(content_of(answer).get("path"), landing / TODAY), answer

    structured_of(answer)
    assert (landing / TODAY).read_bytes() == in_dropbox
    # A same-day name never lands in the backups folder itself.
    assert (backups / TODAY).read_bytes() == b"today's backup, made on this computer"
    assert sorted(p.name for p in landing.iterdir()) == [TODAY]
    assert [path.lower() for path in fake.downloads()] == [f"{DROPBOX_FOLDER}/{TODAY}".lower()]
    # Through a temporary file in from-dropbox/, fsynced, then renamed onto the name.
    renames = [detail for kind, detail in events if kind == "rename"]
    assert len(renames) == 1, events
    source, _, target = renames[0].partition(" -> ")
    assert Path(target).resolve() == (landing / TODAY).resolve(), renames
    assert Path(source).resolve().parent == landing.resolve() and Path(source).name != TODAY
    assert ("fsync", "") in events[: events.index(("rename", renames[0]))], events

    # The other target: a development server's backups folder, created when missing.
    assert not (_isolated_home / DEV_BACKUPS_NAME).exists()
    dev = dropbox_call(DOWNLOAD_BACKUP, {"name": TODAY, "target": "bookvie-dev"}, Connect(fake))
    dev_landing = from_dropbox(_isolated_home, "bookvie-dev")
    assert same_path(structured_of(dev).get("path"), dev_landing / TODAY), dev
    assert (dev_landing / TODAY).read_bytes() == in_dropbox

    # An existing from-dropbox/ file is replaced only by a verified download.
    other = fakes.FakeDropbox(fault="other_bytes")
    other.put(TODAY, b"a later copy in Dropbox", client_modified=datetime(2026, 11, 20, tzinfo=UTC))
    error_of(dropbox_call(DOWNLOAD_BACKUP, {"name": TODAY, "target": "bookvie"}, Connect(other)))
    assert (landing / TODAY).read_bytes() == in_dropbox
    assert sorted(p.name for p in landing.iterdir()) == [TODAY]


# --- AC-4: refused before any network call -------------------------------------------

REFUSED_ARGUMENTS: list[dict[str, Any]] = [
    {"name": "bookvie-pre-restore-2026-11-20T1004.zip", "target": "bookvie"},
    {"name": "..", "target": "bookvie"},
    {"name": f"../{daily('2026-11-19')}", "target": "bookvie"},
    {"name": f"{FROM_DROPBOX}/{daily('2026-11-19')}", "target": "bookvie"},
    {"name": f"/tmp/{daily('2026-11-19')}", "target": "bookvie"},
    {"name": f"{DROPBOX_FOLDER}/{daily('2026-11-19')}", "target": "bookvie"},
    {"name": "bookvie-backup-2026-02-30.zip", "target": "bookvie"},
    {"name": "BOOKVIE-BACKUP-2026-11-19.zip", "target": "bookvie"},
    {"name": f"{daily('2026-11-19')}\0", "target": "bookvie"},
    {"name": "", "target": "bookvie"},
    {"name": 19, "target": "bookvie"},
    {"name": daily("2026-11-19"), "target": "prod"},
    {"name": daily("2026-11-19"), "target": "Bookvie"},
    {"name": daily("2026-11-19"), "target": "bookvie-backups"},
    {"name": daily("2026-11-19"), "target": "../bookvie"},
    {"name": daily("2026-11-19"), "target": ""},
    {"name": daily("2026-11-19"), "target": None},
    {"name": daily("2026-11-19")},
    {"target": "bookvie"},
]


# Un-skip when download_backup checks its name and target before connecting.
@pytest.mark.skip(reason=RED_13_7)
def test_download_backup_refuses_a_name_that_isnt_daily_or_another_target_before_any_call(
    fakes: Any, _isolated_home: Path
) -> None:
    # [P0] AC-4
    fake = fakes.FakeDropbox()
    seed_three_dailies(fakes, fake)
    (_isolated_home / BACKUPS_NAME).mkdir()
    before = files_under(_isolated_home)

    for arguments in REFUSED_ARGUMENTS:
        connect = Connect(fake)
        answer = dropbox_call(DOWNLOAD_BACKUP, arguments, connect)

        assert error_of(answer).get("cause") == "other", (arguments, answer)

        assert connect.count == 0, arguments
        assert fake.calls == [], arguments
        assert files_under(_isolated_home) == before, arguments
        for target in TARGETS:
            assert not from_dropbox(_isolated_home, target).exists(), (arguments, target)


# --- AC-5: a bad transfer leaves nothing ---------------------------------------------


# Un-skip when download_backup checks the content hash and maps its failures to causes.
@pytest.mark.skip(reason=RED_13_7)
def test_a_download_that_doesnt_match_or_breaks_off_leaves_no_file_and_says_why(
    fakes: Any, _isolated_home: Path
) -> None:
    # [P0] AC-5
    name = daily("2026-11-19")
    landing = from_dropbox(_isolated_home)
    fake = fakes.FakeDropbox(fault="other_bytes")
    seed_three_dailies(fakes, fake)
    arguments = {"name": name, "target": "bookvie"}

    answer = dropbox_call(DOWNLOAD_BACKUP, arguments, Connect(fake))

    assert error_of(answer).get("cause") == "download_incomplete", answer

    def left_behind() -> list[str]:
        return sorted(p.name for p in landing.iterdir()) if landing.exists() else []

    assert left_behind() == [], "no file and no temporary file"
    assert fake.downloads(), "the mismatch was found by downloading, not before"

    broken = fakes.FakeDropbox(fault="broken_transfer")
    seed_three_dailies(fakes, broken)
    cut = error_of(dropbox_call(DOWNLOAD_BACKUP, arguments, Connect(broken)))
    assert cut.get("cause") == "download_incomplete", cut
    assert left_behind() == []

    # A sign-in Dropbox refuses, and a Keychain that can't be read (the real connect).
    refused = fakes.FakeDropbox(fault="signin")
    seed_three_dailies(fakes, refused)
    signin = error_of(dropbox_call(DOWNLOAD_BACKUP, arguments, Connect(refused)))
    assert signin.get("cause") == "dropbox_signin", signin
    keychain = error_of(dropbox_call(DOWNLOAD_BACKUP, arguments))
    assert keychain.get("cause") == "dropbox_signin", keychain
    assert left_behind() == []

    # Anything else is other: an unexpected fault, and a daily name Dropbox doesn't hold.
    unexpected = fakes.FakeDropbox(fault="unexpected")
    seed_three_dailies(fakes, unexpected)
    odd = error_of(dropbox_call(DOWNLOAD_BACKUP, arguments, Connect(unexpected)))
    assert odd.get("cause") == "other", odd
    missing = {"name": daily("2026-11-01"), "target": "bookvie"}
    absent = error_of(dropbox_call(DOWNLOAD_BACKUP, missing, Connect(fakes.FakeDropbox())))
    assert absent.get("cause") == "other", absent
    assert left_behind() == []


# --- AC-6: bookvie reads a download like any daily backup ----------------------------


# Un-skip when download_backup and list_backups work (AC-2, AC-3); bookvie needs no change.
@pytest.mark.skip(reason=RED_13_7)
def test_a_downloaded_backup_lists_as_from_dropbox_with_its_hash_and_previews_like_a_daily(
    fakes: Any,
    _isolated_home: Path,
    tmp_path: Path,
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P1] AC-6
    name = daily("2026-11-19")
    then = tmp_path / "then"
    write_library(then, grown=False)
    data = backup_zip(then, BACKUP_AT)
    fake = fakes.FakeDropbox()
    fake.put(name, data, client_modified=BACKUP_AT)
    data_dir = tmp_path / "library"
    write_library(data_dir, grown=True)
    backups = _isolated_home / BACKUPS_NAME
    backups.mkdir()
    downloaded = from_dropbox(_isolated_home) / name

    # The agent's steps, left unread until bookvie has listed the backups.
    in_dropbox = dropbox_call(LIST_BACKUPS, {}, Connect(fake))
    dropbox_call(DOWNLOAD_BACKUP, {"name": name, "target": "bookvie"}, Connect(fake))
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    local = content_of(client.answer(LIST_LOCAL_BACKUPS)).get("backups", [])

    assert [entry.get("kind") for entry in local if same_path(entry.get("path"), downloaded)] == [
        "from_dropbox"
    ], local

    (entry,) = local
    (listed,) = structured_of(in_dropbox)["backups"]
    assert entry["contentHash"] == listed["contentHash"] == dropbox_content_hash(data)
    assert datetime.fromisoformat(entry["backupTime"]) == datetime.fromisoformat(
        listed["backupTime"]
    )
    # It previews exactly as the same backup does from the backups folder itself.
    (backups / name).write_bytes(data)
    preview = structured_of(client.answer(PREVIEW_RESTORE, {"path": entry["path"]}))
    same = structured_of(client.answer(PREVIEW_RESTORE, {"path": str(backups / name)}))
    assert preview == same
    assert preview["booksAddedSince"], preview
