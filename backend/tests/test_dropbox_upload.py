"""Story 13.2: ``bookvie-dropbox``'s one tool, ``upload_backup`` (AD-22).

The tool runs against :class:`tests.dropbox_fakes.FakeDropbox`, through the
in-process server ``bookvie_dropbox.server.build_server(connect=...)``: its
``connect()`` hands the tool a Dropbox client, the real SDK's or the fake.
The tool list is read through the real ``bookvie-dropbox serve`` over stdio.
The token refresh runs the real SDK over :class:`tests.dropbox_fakes.FakeDropboxHttp`.

Every test's ``HOME`` is temporary (``conftest._isolated_home``), so
``~/bookvie-backups`` is the test's own folder, and no test reaches the
network or the real Keychain.
"""

import importlib
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import dropbox_content_hash as file_content_hash
from tests.agent_client import (
    DESCRIPTIONS,
    DROPBOX_TOOL_NAMES,
    UPLOAD_BACKUP,
    ImportFailed,
    call_in_process,
    error_of,
    import_or_fail,
    list_stdio_tools,
    structured_of,
)
from tests.helpers import dropbox_content_hash

NOW = datetime(2026, 11, 20, 9, 1, 36).astimezone()
"""Today's backup time, 09:01:36 in Madrid: 08:01:36 UTC."""
NOW_UTC = datetime(2026, 11, 20, 8, 1, 36, tzinfo=UTC)
TODAY_NAME = "bookvie-backup-2026-11-20.zip"
CAUSES = ("dropbox_signin", "upload_incomplete", "dropbox_full", "backup_write", "other")
"""AD-22's cause enum, in its order."""
SIGNIN_COMMAND = "bookvie-dropbox auth"
KEYCHAIN_TOKEN = "refresh-in-the-keychain-7f3a"
FAIL_KEYRING = "keyring.backends.fail.Keyring"


def daily(day: str) -> str:
    return f"bookvie-backup-{day}.zip"


@pytest.fixture
def fakes() -> Any:
    """``tests.dropbox_fakes``, imported here: it needs the packages Story 13.2 adds."""
    return importlib.import_module("tests.dropbox_fakes")


@pytest.fixture
def keychain(fakes: Any) -> Any:
    """An in-memory Keychain holding a refresh token, set for this test only."""
    import keyring

    previous = keyring.get_keyring()
    backend = fakes.MemoryKeyring({(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): KEYCHAIN_TOKEN})
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(previous)


@pytest.fixture
def backups(_isolated_home: Path) -> Path:
    folder = _isolated_home / "bookvie-backups"
    folder.mkdir()
    return folder


class Connect:
    """A ``connect`` seam that hands out ``fake`` and counts how often it was asked."""

    def __init__(self, fake: Any) -> None:
        self.fake = fake
        self.count = 0

    def __call__(self) -> Any:
        self.count += 1
        return self.fake


def upload(path: Path | str, connect: Callable[[], Any] | None = None) -> dict[str, Any]:
    """``upload_backup({localPath: path})`` on an in-process ``bookvie-dropbox`` server; with
    no ``connect``, the server's own (the Keychain and the real SDK)."""
    module = import_or_fail("bookvie_dropbox.server")
    if isinstance(module, ImportFailed):
        server: Any = module
    elif connect is None:
        server = module.build_server()
    else:
        server = module.build_server(connect=connect)
    return call_in_process(server, UPLOAD_BACKUP, {"localPath": str(path)})


def utc(value: datetime | None) -> datetime | None:
    """A ``client_modified`` as an aware UTC instant (the SDK's are naive UTC)."""
    if value is None:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def seed_three_older(fake: Any) -> None:
    """17, 18 and 19 Nov in Dropbox. 17 Nov was uploaded last, so the oldest by its name
    is the newest by upload time."""
    fake.put(daily("2026-11-17"), b"17", client_modified=datetime(2026, 11, 19, 23, 0, tzinfo=UTC))
    fake.put(daily("2026-11-18"), b"18", client_modified=datetime(2026, 11, 18, 8, 0, tzinfo=UTC))
    fake.put(daily("2026-11-19"), b"19", client_modified=datetime(2026, 11, 19, 8, 0, tzinfo=UTC))


# --- AC-5: the tool list ---------------------------------------------------------


def test_the_stdio_server_lists_exactly_upload_backup_with_its_story_description(
    _isolated_home: Path,
) -> None:
    # [P0] AC-5
    command = Path(sys.executable).parent / "bookvie-dropbox"
    listed = list_stdio_tools(
        str(command),
        ["serve"],
        # A Keychain that fails every read: listing tools must not need one.
        {"HOME": str(_isolated_home), "PYTHON_KEYRING_BACKEND": FAIL_KEYRING},
    )

    assert [tool["name"] for tool in listed.get("tools", [])] == DROPBOX_TOOL_NAMES, listed
    # Story 13.7 adds list_backups and download_backup after it; their leaf checks them.
    (tool,) = [tool for tool in listed["tools"] if tool["name"] == UPLOAD_BACKUP]
    assert tool["description"] == DESCRIPTIONS[UPLOAD_BACKUP]
    schema = tool["inputSchema"]
    assert schema["type"] == "object"
    assert schema["required"] == ["localPath"]
    assert set(schema["properties"]) == {"localPath"}
    assert schema["properties"]["localPath"]["type"] == "string"
    assert schema.get("additionalProperties") is False


# --- AC-6: a good upload, then the oldest goes -------------------------------------


def test_upload_backup_uploads_through_a_session_checks_the_copy_then_deletes_the_oldest(
    fakes: Any, backups: Path
) -> None:
    # [P0] AC-6
    fake = fakes.FakeDropbox()
    seed_three_older(fake)
    data = fakes.daily_zip(NOW, payload=b"today's covers")
    path = backups / TODAY_NAME
    path.write_bytes(data)

    result = upload(path, Connect(fake))

    assert fake.names() == [daily("2026-11-18"), daily("2026-11-19"), TODAY_NAME], result
    calls = fake.upload_calls()
    assert calls[0] == "files_upload_session_start", calls
    assert calls[-1] == "files_upload_session_finish", calls
    assert set(calls[1:-1]) <= {"files_upload_session_append_v2"}, calls
    (commit,) = fake.commits
    assert commit.path == f"{fakes.BACKUPS}/{TODAY_NAME}"
    assert commit.mode.is_overwrite(), commit.mode
    assert utc(commit.client_modified) == NOW_UTC
    stored = fake.file(TODAY_NAME)
    assert (stored.size, stored.content_hash) == (len(data), dropbox_content_hash(data))
    order = [call for call, _ in fake.calls]
    assert order.index("files_upload_session_finish") < order.index("files_delete_v2"), order
    assert [p.lower() for p in fake.deletes()] == [f"{fakes.BACKUPS}/{daily('2026-11-17')}"]
    assert structured_of(result) == {
        "name": TODAY_NAME,
        "copies": 3,
        "deleted": [daily("2026-11-17")],
        "contentHash": dropbox_content_hash(data),
    }


# --- AC-7: at most 3, and only daily names count -----------------------------------

_NOT_DAILY = [
    "notes.txt",
    "bookvie-backup-2026-02-30.zip",
    "bookvie-backup-2026-11-01.zip.bak",
    "BOOKVIE-BACKUP-2026-11-02.zip",
    "bookvie-pre-restore-2026-11-01T1004.zip",
    ".bookvie-backup-2026-11-03.zip.tmpab12",
]


def _one_older(fake: Any) -> None:
    fake.put(daily("2026-11-19"), b"19")


def _nothing_yet(fake: Any) -> None:
    pass


def _two_older_among_other_files(fake: Any) -> None:
    fake.put(daily("2026-11-18"), b"18")
    fake.put(daily("2026-11-19"), b"19")
    for name in _NOT_DAILY:
        fake.put(name, name.encode())
    fake.put_folder(daily("2026-11-04"))


def _three_older_among_other_files(fake: Any) -> None:
    seed_three_older(fake)
    for name in _NOT_DAILY:
        fake.put(name, name.encode())
    fake.put_folder(daily("2026-11-04"))


@pytest.mark.parametrize(
    ("seed", "after", "deleted", "copies"),
    [
        pytest.param(_one_older, [daily("2026-11-19"), TODAY_NAME], [], 2, id="one_older"),
        pytest.param(_nothing_yet, [TODAY_NAME], [], 1, id="nothing_yet"),
        pytest.param(
            _two_older_among_other_files,
            sorted(
                [
                    daily("2026-11-18"),
                    daily("2026-11-19"),
                    TODAY_NAME,
                    *_NOT_DAILY,
                    daily("2026-11-04"),
                ]
            ),
            [],
            3,
            id="two_older_among_other_files",
        ),
        pytest.param(
            _three_older_among_other_files,
            sorted(
                [
                    daily("2026-11-18"),
                    daily("2026-11-19"),
                    TODAY_NAME,
                    *_NOT_DAILY,
                    daily("2026-11-04"),
                ]
            ),
            [daily("2026-11-17")],
            3,
            id="three_older_among_other_files",
        ),
    ],
)
def test_nothing_is_deleted_while_there_are_at_most_3_and_other_files_never_count(
    fakes: Any,
    backups: Path,
    seed: Callable[[Any], None],
    after: list[str],
    deleted: list[str],
    copies: int,
) -> None:
    # [P0] AC-7
    fake = fakes.FakeDropbox()
    seed(fake)
    data = fakes.daily_zip(NOW)
    path = backups / TODAY_NAME
    path.write_bytes(data)

    result = upload(path, Connect(fake))

    assert fake.names() == after, result
    assert [p.lower().rpartition("/")[2] for p in fake.deletes()] == deleted
    answer = structured_of(result)
    assert (answer["deleted"], answer["copies"]) == (deleted, copies)


# --- AC-8: a failure deletes nothing and names its cause ---------------------------


def _locked(fakes: Any) -> Any:
    import keyring.errors

    return fakes.FailingKeyring(keyring.errors.KeyringLocked("the Keychain is locked"))


def _denied(fakes: Any) -> Any:
    import keyring.errors

    return fakes.FailingKeyring(keyring.errors.KeyringError("the user denied access"))


def _empty(fakes: Any) -> Any:
    return fakes.MemoryKeyring()


@pytest.mark.parametrize(
    ("fault", "keychain_of", "cause"),
    [
        pytest.param("refuse_hash", None, "upload_incomplete", id="dropbox_refuses_the_hash"),
        pytest.param("fail_chunk", None, "upload_incomplete", id="a_chunk_fails"),
        pytest.param("timeout", None, "upload_incomplete", id="a_timeout"),
        pytest.param("wrong_size", None, "upload_incomplete", id="the_size_doesnt_match"),
        pytest.param("wrong_hash", None, "upload_incomplete", id="the_hash_doesnt_match"),
        pytest.param("full", None, "dropbox_full", id="insufficient_space"),
        pytest.param("signin", None, "dropbox_signin", id="the_refresh_is_refused"),
        pytest.param(None, _locked, "dropbox_signin", id="the_keychain_is_locked"),
        pytest.param(None, _denied, "dropbox_signin", id="the_keychain_read_is_denied"),
        pytest.param(None, _empty, "dropbox_signin", id="no_token_in_the_keychain"),
        pytest.param("server_error", None, "other", id="a_server_error"),
        pytest.param("unexpected", None, "other", id="anything_else"),
    ],
)
def test_a_failed_upload_deletes_nothing_and_returns_its_cause(
    fakes: Any,
    backups: Path,
    keychain: Any,
    fault: str | None,
    keychain_of: Callable[[Any], Any] | None,
    cause: str,
) -> None:
    # [P0] AC-8
    import keyring

    fake = fakes.FakeDropbox(fault=fault)
    seed_three_older(fake)
    path = backups / TODAY_NAME
    path.write_bytes(fakes.daily_zip(NOW))
    if keychain_of is None:
        connect: Callable[[], Any] | None = Connect(fake)
    else:
        # The server's own connect: it reads the Keychain, which fails here before any request.
        keyring.set_keyring(keychain_of(fakes))
        connect = None

    result = upload(path, connect)

    assert error_of(result).get("cause") == cause, result
    error = error_of(result)
    assert isinstance(error.get("message"), str) and error["message"], error
    assert fake.deletes() == []
    assert {daily("2026-11-17"), daily("2026-11-18"), daily("2026-11-19")} <= set(fake.names())
    if cause == "dropbox_signin":
        assert SIGNIN_COMMAND in error["message"], error
    assert KEYCHAIN_TOKEN not in str(result)
    assert "access-" not in str(result)
    assert tuple(import_or_fail("bookvie_dropbox.contracts").CAUSES) == CAUSES


# --- AC-9: a second upload the same day replaces that day's copy -----------------


def test_a_second_upload_the_same_day_replaces_that_days_copy_only_once_it_verifies(
    fakes: Any, backups: Path
) -> None:
    # [P0] AC-9
    fake = fakes.FakeDropbox()
    fake.put(daily("2026-11-18"), b"18")
    fake.put(daily("2026-11-19"), b"19")
    fake.put(TODAY_NAME, b"this morning's first upload")
    path = backups / TODAY_NAME
    second = fakes.daily_zip(NOW, payload=b"second")
    path.write_bytes(second)

    result = upload(path, Connect(fake))

    assert fake.file(TODAY_NAME).content_hash == dropbox_content_hash(second), result
    assert structured_of(result)["deleted"] == []
    assert structured_of(result)["copies"] == 3

    # A third upload that fails leaves the second in place.
    path.write_bytes(fakes.daily_zip(NOW.replace(minute=30), payload=b"third"))
    failing = fakes.FakeDropbox(fault="fail_chunk")
    failing.files = dict(fake.files)
    failed = upload(path, Connect(failing))

    assert error_of(failed).get("cause") == "upload_incomplete", failed
    assert failing.file(TODAY_NAME).content_hash == dropbox_content_hash(second)
    assert failing.deletes() == []
    assert failing.names() == fake.names()


# --- AC-10: only a daily backup in ~/bookvie-backups/ is uploaded ------------------


def _dev(home: Path, backups: Path) -> Path:
    return home / "bookvie-backups-dev" / TODAY_NAME


def _from_dropbox(home: Path, backups: Path) -> Path:
    return backups / "from-dropbox" / TODAY_NAME


def _safety_copy(home: Path, backups: Path) -> Path:
    return backups / "bookvie-pre-restore-2026-11-20T0901.zip"


def _outside(home: Path, backups: Path) -> Path:
    return home / "elsewhere" / TODAY_NAME


def _dotdot(home: Path, backups: Path) -> str:
    # It names a real daily backup in the folder, through `..`.
    (backups / "from-dropbox").mkdir(exist_ok=True)
    return f"{backups}/from-dropbox/../{TODAY_NAME}"


def _symlink_out(home: Path, backups: Path) -> Path:
    target = home / "elsewhere" / TODAY_NAME
    _write_backup(target)
    link = backups / TODAY_NAME
    link.symlink_to(target)
    return link


def _missing(home: Path, backups: Path) -> Path:
    return backups / daily("2026-11-21")


def _folder(home: Path, backups: Path) -> Path:
    folder = backups / daily("2026-11-21")
    folder.mkdir()
    return folder


def _not_a_calendar_day(home: Path, backups: Path) -> Path:
    return backups / daily("2026-02-30")


def _relative(home: Path, backups: Path) -> str:
    return f"bookvie-backups/{TODAY_NAME}"


_WRITTEN_AT_PATH = {"dev", "from_dropbox", "safety_copy", "outside", "not_a_calendar_day"}


def _write_backup(target: Path) -> None:
    fakes = importlib.import_module("tests.dropbox_fakes")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(fakes.daily_zip(NOW))


@pytest.mark.parametrize(
    ("case", "where"),
    [
        ("dev", _dev),
        ("from_dropbox", _from_dropbox),
        ("safety_copy", _safety_copy),
        ("outside", _outside),
        ("dotdot", _dotdot),
        ("symlink_out", _symlink_out),
        ("missing", _missing),
        ("folder", _folder),
        ("not_a_calendar_day", _not_a_calendar_day),
        ("relative", _relative),
    ],
)
def test_any_other_path_is_refused_before_any_dropbox_call(
    fakes: Any,
    backups: Path,
    _isolated_home: Path,
    monkeypatch: pytest.MonkeyPatch,
    case: str,
    where: Callable[[Path, Path], Path | str],
) -> None:
    # [P0] AC-10
    monkeypatch.chdir(_isolated_home)
    if case in {"dotdot", "relative"}:
        # A restorable daily backup really is there, so only the path's shape refuses it.
        _write_backup(backups / TODAY_NAME)
    path = where(_isolated_home, backups)
    if case in _WRITTEN_AT_PATH:
        _write_backup(Path(path))
    fake = fakes.FakeDropbox()
    seed_three_older(fake)
    before = fake.names()

    result = upload(path, Connect(fake))

    assert error_of(result).get("cause") in CAUSES, result
    assert fake.calls == []
    assert fake.names() == before


# --- AC-11: a file over 150 MB --------------------------------------------------------


def test_a_backup_over_150_mb_goes_up_in_more_than_one_chunk_and_verifies(
    fakes: Any, backups: Path
) -> None:
    # [P1] AC-11
    path = backups / TODAY_NAME
    size = fakes.write_large_zip(path, NOW, hole=fakes.MAX_REQUEST + 1)
    fake = fakes.FakeDropbox()

    result = upload(path, Connect(fake))

    assert len([s for s in fake.request_sizes if s]) > 1, (fake.request_sizes, result)
    assert max(fake.request_sizes) <= fakes.MAX_REQUEST
    stored = fake.file(TODAY_NAME)
    expected = file_content_hash(path)
    assert (stored.size, stored.content_hash) == (size, expected)
    assert structured_of(result)["contentHash"] == expected


# --- AC-12: the SDK refreshes an expired access token -------------------------------


def test_an_expired_access_token_is_refreshed_from_the_keychains_refresh_token(
    fakes: Any, keychain: Any
) -> None:
    # [P0] AC-12
    api = import_or_fail("bookvie_dropbox.dropbox_api")
    app_key = "unbuilt" if isinstance(api, ImportFailed) else api.APP_KEY
    # The first access token the refresh gives has timed out by the time it is used.
    http = fakes.FakeDropboxHttp(
        app_key=app_key, refresh_tokens={KEYCHAIN_TOKEN}, expired={"access-1"}
    )
    listing: Any = None
    if not isinstance(api, ImportFailed):
        listing = api.connect(session=fakes.http_session(http)).files_list_folder(fakes.BACKUPS)

    assert getattr(listing, "entries", None) == [], (listing, http.requests)
    refreshes = http.refreshes()
    assert len(refreshes) == 2, http.requests
    for form in refreshes:
        assert form["refresh_token"] == KEYCHAIN_TOKEN
        assert form["client_id"] == app_key
        assert "client_secret" not in form
    lists = [headers for _, url, headers, _ in http.requests if url == fakes.LIST_FOLDER_URL]
    assert [h["Authorization"] for h in lists] == ["Bearer access-1", "Bearer access-2"]
