"""Story 12.6: ``export_backup`` writes a dated backup of the library to disk (AD-21).

The tool builds the same zip as ``GET /api/export`` under the AD-4 lock,
then writes ``bookvie-backup-YYYY-MM-DD.zip`` (the date from the app's
``Clock``) into the backups folder atomically: a unique temp file, fsync,
rename over that day's file. Only then does it record ``lastExportAt``, and
it answers ``{path, size, createdAt}`` with the absolute path. A read failure
is ``couldnt_export`` and a write failure ``couldnt_save``; either leaves no
partial file and doesn't move ``lastExportAt``.

The backups folder follows the data folder, not the mode:
``~/bookvie-backups`` for ``~/bookvie-data``, ``~/bookvie-backups-dev`` for
``~/bookvie-data-dev``, ``<data folder>-backups`` for any other. ``cli.py``
resolves it and passes it to ``create_app`` as ``backups_dir``.

Every test runs with ``HOME`` set to a temporary folder (``conftest.py``),
so no leaf can reach a real ``~/bookvie-backups*`` folder.
"""

import io
import json
import os
import random
import zipfile
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from bookvie.agent import NoArguments, input_schema
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents import EXPORT_CHUNK, backups_folder
from bookvie.intents.contract import COULDNT_EXPORT_MESSAGE, COULDNT_SAVE_MESSAGE
from bookvie.intents.intent_model import malformed
from bookvie.store import Store
from bookvie.store.fs import OsFileSystem
from tests.agent_client import McpClient, text_of
from tests.helpers import (
    BASE_URL,
    TODAY,
    FaultyFs,
    RecordingLock,
    api_client,
    covers_in,
    image_bytes,
    library_bytes,
    post_restore,
    temp_files,
)
from tests.test_agent_write import (
    BOOK_TOOL_NAMES,
    EARLIER_TOOL_NAMES,
    MAIN,
    UNREAD_COVER,
    UPDATE,
    WRITE_TOOL_NAMES,
    _seed,
    running_bookvie,
)

EXPORT_BACKUP = "export_backup"
EXPORT_BACKUP_DESCRIPTION = (
    "Write a dated backup of the whole library (library.json and covers, the same file as the "
    "Backup page's Export) to the backups folder, and return its path, size and time. A second "
    "backup on the same day replaces that day's file. It counts as the library's last export."
)
"""Story 12.6's description, character for character (epics.md)."""

AC1_DAY = date(2026, 11, 19)
"""The fake day of AC-1's servers (``--fake-today``)."""


def backup_name(day: date) -> str:
    """``bookvie-backup-<YYYY-MM-DD>.zip``."""
    return f"bookvie-backup-{day.isoformat()}.zip"


TODAY_BACKUP = backup_name(TODAY)
"""What a ``connect_mcp`` app (today :data:`tests.helpers.TODAY`) writes."""
OLDER_BACKUP = backup_name(TODAY - timedelta(days=1))
OLDER_BYTES = b"yesterday's backup, as the tool left it"
NOT_A_BACKUP = "notes.txt"
NOT_A_BACKUP_BYTES = b"a file of the user's own"

LOCAL_STATE = "local-state.json"
EARLIER_EXPORT = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'
EARLIER_EXPORT_AT = datetime.fromisoformat("2026-10-01T09:30:00+02:00")
EXPORT_HEADERS = {"X-Bookvie-Export": "1"}

WRITE_FAULTS = ("create_temp", "write", "fsync", "close", "replace")
"""The steps before the rename; a fault in any of them is ``couldnt_save``."""


def _names(folder: Path) -> list[str]:
    """Every name directly inside ``folder``, sorted; ``[]`` when it doesn't exist."""
    return sorted(p.name for p in folder.iterdir()) if folder.is_dir() else []


def _member(archive: Path, name: str) -> bytes | None:
    """``name``'s bytes inside the zip at ``archive``; ``None`` when either is missing."""
    if not archive.is_file():
        return None
    with zipfile.ZipFile(archive) as opened:
        return opened.read(name) if name in opened.namelist() else None


def _members(data: bytes) -> dict[str, bytes]:
    """Every entry of a zip by name (a directory entry reads as ``b""``)."""
    with zipfile.ZipFile(io.BytesIO(data)) as opened:
        return {info.filename: opened.read(info) for info in opened.infolist()}


def _when(value: Any) -> datetime | None:
    """An ISO-8601 time from a view or a tool answer, or ``None``."""
    return datetime.fromisoformat(value) if isinstance(value, str) else None


def _backup(client: McpClient) -> dict[str, Any]:
    """The ``tools/call`` result of ``export_backup``, never raising on the tool's answer.

    A JSON-RPC error (an unknown tool, before the story is built) comes back
    as an ``isError`` result holding that error as its text, so a leaf's
    first assertion is the one that fails, not this setup call.
    """
    client.ensure_initialized()
    body = client.rpc("tools/call", {"name": EXPORT_BACKUP, "arguments": {}})
    if "result" in body:
        return body["result"]
    return {"isError": True, "content": [{"type": "text", "text": json.dumps(body.get("error"))}]}


def _error_code(answer: dict[str, Any]) -> str | None:
    """The AD-9 ``error.code`` an error result carries, or ``None`` for any other answer.

    Never raises, so a missing tool fails the criterion assertion, not a parse.
    """
    if answer.get("isError") is not True:
        return None
    try:
        error = json.loads(text_of(answer))
    except AssertionError, ValueError:
        return None
    return error.get("code") if isinstance(error, dict) else None


def _seed_with_cover(folder: Path) -> None:
    """:func:`tests.test_agent_write._seed` with a real PNG as the unread Book's cover."""
    _seed(folder, side_reads=2, cover=True)
    (folder / UNREAD_COVER).write_bytes(image_bytes(fmt="PNG"))


def _connect(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, *, seed: bool = True
) -> tuple[McpClient, Path, Path]:
    """An MCP client on a seeded library, its backups folder ``<tmp_path>/library-backups``."""
    folder = tmp_path / "library"
    if seed:
        _seed_with_cover(folder)
    backups = tmp_path / "library-backups"
    return connect_mcp(data_dir=folder, backups_dir=backups), folder, backups


# --- AC-1: the dated file in the folder that follows the data folder ---------

AC1_FOLDERS = {
    # mode: (flags, the data folder under HOME or tmp_path, the backups folder it gets)
    "default": ((), "~/bookvie-data", "~/bookvie-backups"),
    "dev": (("--dev",), "~/bookvie-data-dev", "~/bookvie-backups-dev"),
    "other": ((), "scratch", "scratch-backups"),
}


@pytest.mark.parametrize("mode", list(AC1_FOLDERS))
def test_export_backup_writes_the_dated_file_into_the_backups_folder_that_follows_the_data_folder(
    mode: str, tmp_path: Path
) -> None:
    # [P0] AC-1. A real `bookvie` process, so cli.py's folder rule is what runs; HOME is the
    # test's temporary folder (conftest.py), so `~` never reaches the real home.
    home = Path.home()
    flags, data, backups_at = AC1_FOLDERS[mode]
    default = data.startswith("~")
    folder = (home / data[2:]) if default else (tmp_path / data)
    backups = (home / backups_at[2:]) if default else (tmp_path / backups_at)
    elsewhere = [
        place
        for place in (
            home / "bookvie-backups",
            home / "bookvie-backups-dev",
            folder.parent / f"{folder.name}-backups",
        )
        if place != backups
    ]
    name = backup_name(AC1_DAY)

    with running_bookvie(
        folder,
        flags=(*flags, "--fake-today", AC1_DAY.isoformat()),
        default_folder=default,
    ) as client:
        answer = _backup(client)

        assert _names(backups) == [name], answer

        listed = {tool["name"]: tool for tool in client.list_tools()}

    written = backups / name
    structured = answer.get("structuredContent")
    assert structured is not None and answer.get("isError") is not True, answer
    assert set(structured) == {"path", "size", "createdAt"}, structured
    assert structured["path"] == str(written)
    assert Path(structured["path"]).is_absolute()
    assert structured["size"] == written.stat().st_size
    assert _when(structured["createdAt"]) == FakeClock(AC1_DAY).now()
    assert json.loads(text_of(answer)) == structured
    # The rule picks one folder: none of the others was created.
    for place in elsewhere:
        assert not place.exists(), place
    # The tool is listed after 12.4's two, takes no arguments, and says what it does.
    assert list(listed) == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES + [EXPORT_BACKUP]
    assert listed[EXPORT_BACKUP]["inputSchema"] == input_schema(NoArguments)
    assert listed[EXPORT_BACKUP]["description"] == EXPORT_BACKUP_DESCRIPTION


# --- AC-2: the backup restores through the existing restore check ------------


def test_the_backup_file_restores_through_the_restore_check_and_reproduces_the_library(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-2. AD-14's round trip: the backup is restored onto an empty library.
    client, folder, backups = _connect(connect_mcp, tmp_path)
    _backup(client)
    written = backups / TODAY_BACKUP
    backup = written.read_bytes() if written.is_file() else b""
    restored = tmp_path / "restored"
    restored.mkdir()

    response = post_restore(api_client(restored), backup)

    assert response.status_code == 200, response.text
    assert library_bytes(restored) == library_bytes(folder)
    assert covers_in(restored) == covers_in(folder)
    assert UNREAD_COVER.removeprefix("covers/") in covers_in(restored)
    # The same file as the Backup page's Export: the same entries with the same bytes.
    exported = client.http.get("/api/export", headers=EXPORT_HEADERS)
    assert exported.status_code == 200, exported.text
    assert _members(backup) == _members(exported.content)


# --- AC-3: a second backup the same day replaces that day's file -------------


def test_a_second_backup_on_the_same_day_replaces_that_days_file_and_nothing_else(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-3. The second backup carries a change made after the first.
    backups = tmp_path / "library-backups"
    backups.mkdir()
    (backups / OLDER_BACKUP).write_bytes(OLDER_BYTES)
    (backups / NOT_A_BACKUP).write_bytes(NOT_A_BACKUP_BYTES)
    client, folder, _ = _connect(connect_mcp, tmp_path)
    _backup(client)
    client.call_tool("update_page", UPDATE)

    second = _backup(client)

    assert _member(backups / TODAY_BACKUP, "library.json") == library_bytes(folder), second
    stored = json.loads(library_bytes(folder))
    (main,) = [book for book in stored["books"] if book["id"] == MAIN]
    assert main["readings"][-1]["currentPage"] == UPDATE["page"]
    # No other file changed, and no temp file is left: the listing is exact.
    assert _names(backups) == sorted([OLDER_BACKUP, NOT_A_BACKUP, TODAY_BACKUP])
    assert (backups / OLDER_BACKUP).read_bytes() == OLDER_BYTES
    assert (backups / NOT_A_BACKUP).read_bytes() == NOT_A_BACKUP_BYTES
    structured = second["structuredContent"]
    assert structured["path"] == str(backups / TODAY_BACKUP)
    assert structured["size"] == (backups / TODAY_BACKUP).stat().st_size


# --- AC-4: a backup is the library's last export -----------------------------


def test_a_backup_is_the_last_export_in_the_backup_and_home_views_and_a_failed_one_is_not(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-4. "Last export" starts at an earlier download's time.
    client, folder, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    now = FakeClock(TODAY).now()

    answer = _backup(client)

    backup_view = client.http.get("/api/views/backup").json()
    assert _when(backup_view.get("lastExportAt")) == now, (backup_view, answer)
    home_view = client.http.get("/api/views/home").json()
    assert _when(home_view["lastExportAt"]) == now
    assert _when(client.call_tool("get_home")["structuredContent"]["lastExportAt"]) == now
    assert _when(answer["structuredContent"]["createdAt"]) == now

    # A failed backup the next day leaves "Last export" where it was.
    state = client.http.app.state
    state.clock = FakeClock(TODAY + timedelta(days=1))
    state.store.fs = FaultyFs("replace")
    failed = _backup(client)
    assert _error_code(failed) == "couldnt_save", failed
    assert _when(client.http.get("/api/views/backup").json()["lastExportAt"]) == now
    assert _when(client.http.get("/api/views/home").json()["lastExportAt"]) == now


# --- AC-5: a read or write failure leaves nothing behind ---------------------

AC5_CASES = [
    pytest.param(
        "read",
        "couldnt_export",
        COULDNT_EXPORT_MESSAGE,
        id="read-unreadable-cover",
        marks=pytest.mark.skipif(os.geteuid() == 0, reason="root can read a chmod 000 cover"),
    ),
    *(
        pytest.param(step, "couldnt_save", COULDNT_SAVE_MESSAGE, id=f"write-{step}")
        for step in WRITE_FAULTS
    ),
]


@pytest.mark.parametrize(("fault", "code", "message"), AC5_CASES)
def test_a_read_or_write_failure_is_refused_and_leaves_no_partial_file_and_no_new_last_export(
    fault: str, code: str, message: str, connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-5. A read failure: a cover the zip can't read. A write failure: the filesystem
    # seam (the store's `fs`) fails at one step of the backup file's write.
    backups = tmp_path / "library-backups"
    backups.mkdir()
    (backups / OLDER_BACKUP).write_bytes(OLDER_BYTES)
    client, folder, _ = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    library_before = library_bytes(folder)
    covers_before = covers_in(folder)
    cover = folder / UNREAD_COVER
    if fault == "read":
        cover.chmod(0o000)
    else:
        client.http.app.state.store.fs = FaultyFs(fault)
    try:
        answer = _backup(client)
    finally:
        cover.chmod(0o644)

    assert _error_code(answer) == code, answer
    error = json.loads(text_of(answer))
    assert error["kind"] == code
    assert error["message"] == message
    # No partial file and no temp file in the backups folder: only what was there before.
    assert _names(backups) == [OLDER_BACKUP]
    assert (backups / OLDER_BACKUP).read_bytes() == OLDER_BYTES
    # "Last export" didn't move, and the library is untouched.
    assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT
    assert _when(client.http.get("/api/views/backup").json()["lastExportAt"]) == EARLIER_EXPORT_AT
    assert library_bytes(folder) == library_before
    assert covers_in(folder) == covers_before
    assert temp_files(folder) == []


# --- Green-phase follow-ups --------------------------------------------------


class _LoggingFs(OsFileSystem):
    """The real filesystem, logging each step a backup write takes into ``log``."""

    def __init__(self, log: list[str]) -> None:
        self._log = log

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        self._log.append("create_temp")
        return super().create_temp(directory, prefix)

    def replace(self, src: Path, dst: Path) -> None:
        self._log.append("replace")
        super().replace(src, dst)


def _last_export(client: McpClient) -> datetime | None:
    return _when(client.http.get("/api/views/backup").json()["lastExportAt"])


SPELLINGS = ("explicit", "symlink", "dotdot")


@pytest.mark.parametrize("spelling", SPELLINGS)
def test_any_spelling_of_the_default_data_folder_gets_the_default_backups_folder(
    spelling: str,
) -> None:
    # AC-1 follow-up: the rule compares folders, not strings, and not the mode.
    home = Path.home()
    real = home / "bookvie-data"
    _seed_with_cover(real)
    if spelling == "explicit":
        named = real
    elif spelling == "symlink":
        named = home / "library-link"
        named.symlink_to(real, target_is_directory=True)
    else:
        (home / "elsewhere").mkdir()
        named = home / "elsewhere" / ".." / "bookvie-data"

    with running_bookvie(named, flags=("--fake-today", AC1_DAY.isoformat())) as client:
        answer = _backup(client)

    assert _names(home / "bookvie-backups") == [backup_name(AC1_DAY)], answer
    assert answer["structuredContent"]["path"] == str(
        home / "bookvie-backups" / backup_name(AC1_DAY)
    )
    assert not (home / "bookvie-data-backups").exists()
    assert not (home / "library-link-backups").exists()


@pytest.mark.parametrize("dev", [True, False], ids=["dev", "production"])
def test_a_scratch_folder_gets_its_sibling_backups_folder_in_either_mode(
    dev: bool, tmp_path: Path
) -> None:
    # AC-1 follow-up: the folder follows the data folder, not the mode; a folder merely
    # named `bookvie-data` outside HOME is just another folder.
    folder = tmp_path / "elsewhere" / ("scratch" if dev else "bookvie-data")
    _seed_with_cover(folder)
    flags = ("--dev",) if dev else ()

    with running_bookvie(folder, flags=(*flags, "--fake-today", AC1_DAY.isoformat())) as client:
        answer = _backup(client)

    backups = folder.parent / f"{folder.name}-backups"
    assert _names(backups) == [backup_name(AC1_DAY)], answer
    assert not (Path.home() / "bookvie-backups").exists()
    assert not (Path.home() / "bookvie-backups-dev").exists()


def test_the_backups_folder_is_created_with_its_parents(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    folder = tmp_path / "library"
    _seed_with_cover(folder)
    backups = tmp_path / "a" / "b" / "backups"
    client = connect_mcp(data_dir=folder, backups_dir=backups)

    answer = _backup(client)

    assert _names(backups) == [TODAY_BACKUP], answer
    assert answer["structuredContent"]["size"] == (backups / TODAY_BACKUP).stat().st_size


def test_without_a_backups_dir_the_app_derives_it_from_the_data_folder(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    folder = tmp_path / "library"
    _seed_with_cover(folder)
    client = connect_mcp(data_dir=folder)

    answer = _backup(client)

    assert _names(tmp_path / "library-backups") == [TODAY_BACKUP], answer


def test_the_folder_rule_names_the_default_and_dev_folders_under_the_home_given(
    tmp_path: Path,
) -> None:
    home = tmp_path / "home"
    assert backups_folder(home / "bookvie-data", home) == home / "bookvie-backups"
    assert backups_folder(home / "bookvie-data-dev", home) == home / "bookvie-backups-dev"
    assert backups_folder(tmp_path / "x" / "lib", home) == tmp_path / "x" / "lib-backups"
    # Another home's `bookvie-data` is just another folder.
    assert backups_folder(tmp_path / "bookvie-data", home) == tmp_path / "bookvie-data-backups"


def test_a_failed_folder_flush_after_the_rename_is_logged_and_the_backup_succeeds(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    client, folder, backups = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    client.http.app.state.store.fs = FaultyFs("fsync_dir")

    answer = _backup(client)

    assert answer.get("isError") is not True, answer
    assert _names(backups) == [TODAY_BACKUP]
    assert _last_export(client) == FakeClock(TODAY).now()
    assert f"couldn't flush {backups.name}/ after writing {TODAY_BACKUP}" in capsys.readouterr().err


def test_a_failure_recording_the_last_export_is_logged_and_the_backup_succeeds(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    client, folder, backups = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    def refuse(_now: datetime) -> None:
        raise OSError(5, "injected record_export fault")

    monkeypatch.setattr(client.http.app.state.store, "record_export", refuse)

    answer = _backup(client)

    assert answer.get("isError") is not True, answer
    assert _names(backups) == [TODAY_BACKUP]
    assert _last_export(client) == EARLIER_EXPORT_AT
    assert "couldn't record the backup in local-state.json" in capsys.readouterr().err


@pytest.mark.parametrize("blocker", ["folder", "parent"])
def test_a_backups_folder_that_cant_be_created_is_couldnt_save(
    blocker: str, connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    folder = tmp_path / "library"
    _seed_with_cover(folder)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    in_the_way = tmp_path / "in-the-way"
    in_the_way.write_bytes(NOT_A_BACKUP_BYTES)
    backups = in_the_way if blocker == "folder" else in_the_way / "backups"
    client = connect_mcp(data_dir=folder, backups_dir=backups)

    answer = _backup(client)

    assert _error_code(answer) == "couldnt_save", answer
    assert in_the_way.read_bytes() == NOT_A_BACKUP_BYTES
    assert _last_export(client) == EARLIER_EXPORT_AT


def test_the_zip_is_built_under_the_lock_and_written_after_it_is_released(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # AD-4: the lock is held while building only.
    client, _, backups = _connect(connect_mcp, tmp_path)
    log: list[str] = []
    state = client.http.app.state
    lock = RecordingLock(log)
    state.store.lock = lock
    state.write_lock = lock
    state.store.fs = _LoggingFs(log)

    answer = _backup(client)

    assert answer.get("isError") is not True, answer
    # The backup file's write, then local-state.json's.
    assert log == [
        "lock acquired",
        "lock released",
        "create_temp",
        "replace",
        "create_temp",
        "replace",
    ]
    assert _names(backups) == [TODAY_BACKUP]


def test_an_argument_is_refused_and_no_file_is_written(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    client, folder, backups = _connect(connect_mcp, tmp_path)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    client.ensure_initialized()

    body = client.rpc("tools/call", {"name": EXPORT_BACKUP, "arguments": {"folder": "/tmp"}})

    result = body["result"]
    assert result.get("isError") is True, body
    assert json.loads(text_of(result)) == malformed().response_body()["error"]
    assert _names(backups) == []
    assert _last_export(client) == EARLIER_EXPORT_AT


def test_a_library_with_no_covers_round_trips(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # AC-2 follow-up: `covers/` is in the zip, empty.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    backups = tmp_path / "library-backups"
    client = connect_mcp(data_dir=folder, backups_dir=backups)
    _backup(client)
    backup = (backups / TODAY_BACKUP).read_bytes()
    restored = tmp_path / "restored"
    restored.mkdir()

    response = post_restore(api_client(restored), backup)

    assert response.status_code == 200, response.text
    assert set(_members(backup)) == {"library.json", "covers/"}
    assert library_bytes(restored) == library_bytes(folder)
    assert covers_in(restored) == covers_in(folder)


def test_a_backup_larger_than_one_chunk_is_written_whole_and_restores(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # The zip reaches the file in EXPORT_CHUNK pieces: every piece, not only the first.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2, cover=True)
    noise = Image.frombytes("RGB", (256, 256), random.Random(12).randbytes(256 * 256 * 3))
    buffer = io.BytesIO()
    noise.save(buffer, "PNG")
    (folder / UNREAD_COVER).write_bytes(buffer.getvalue())
    backups = tmp_path / "library-backups"
    client = connect_mcp(data_dir=folder, backups_dir=backups)

    answer = _backup(client)

    written = backups / TODAY_BACKUP
    backup = written.read_bytes() if written.is_file() else b""
    assert len(backup) > 2 * EXPORT_CHUNK, answer
    assert answer["structuredContent"]["size"] == written.stat().st_size
    exported = client.http.get("/api/export", headers=EXPORT_HEADERS)
    assert exported.status_code == 200, exported.text
    assert _members(backup) == _members(exported.content)
    restored = tmp_path / "restored"
    restored.mkdir()
    response = post_restore(api_client(restored), backup)
    assert response.status_code == 200, response.text
    assert library_bytes(restored) == library_bytes(folder)
    assert covers_in(restored) == covers_in(folder)


def test_an_app_with_no_backups_folder_refuses_the_backup_and_records_nothing(
    tmp_path: Path,
) -> None:
    # `create_app` with neither `backups_dir` nor `data_dir` has nowhere to write.
    folder = tmp_path / "library"
    _seed_with_cover(folder)
    (folder / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    app = create_app(tmp_path / "no-static", store=Store.open(folder), clock=FakeClock(TODAY))
    assert app.state.backups_dir is None
    with TestClient(app, base_url=BASE_URL) as http:
        client = McpClient(http, data_dir=folder)

        answer = _backup(client)

        assert _error_code(answer) == "couldnt_save", answer
        assert _last_export(client) == EARLIER_EXPORT_AT
    assert (folder / LOCAL_STATE).read_bytes() == EARLIER_EXPORT
    assert sorted(p.name for p in tmp_path.iterdir()) == ["library"]
