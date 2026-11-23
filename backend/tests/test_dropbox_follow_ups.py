"""Story 13.2 follow-ups: ``upload_backup``'s secondary branches (AD-22).

The ATDD checklist's green-phase follow-ups and the review's deferrals that
the build didn't cover: every refused path answers ``other`` (AC-10's leaf
only checks the enum), a backups folder that is itself a symlink, chunk
offsets on a file several chunks long, an extra field before the 0x5455 one,
a refused refresh through the real SDK, a client that can't be built, and a
listing that fails after a verified upload. Each runs the in-process server
in the test's temporary ``HOME``, against ``FakeDropbox`` or the real SDK over
``FakeDropboxHttp``; nothing reaches the network or the real Keychain.
"""

import importlib
import io
import os
import struct
import zipfile
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import dropbox_content_hash as file_content_hash
from tests.agent_client import UPLOAD_BACKUP, call_in_process, error_of, structured_of

NOW = datetime(2026, 11, 20, 9, 1, 36).astimezone()
NOW_UTC = datetime(2026, 11, 20, 8, 1, 36, tzinfo=UTC)
TODAY_NAME = "bookvie-backup-2026-11-20.zip"
KEYCHAIN_TOKEN = "refresh-in-the-keychain-7f3a"


def daily(day: str) -> str:
    return f"bookvie-backup-{day}.zip"


@pytest.fixture
def fakes() -> Any:
    return importlib.import_module("tests.dropbox_fakes")


@pytest.fixture
def backups(_isolated_home: Path) -> Path:
    folder = _isolated_home / "bookvie-backups"
    folder.mkdir()
    return folder


class Connect:
    def __init__(self, fake: Any) -> None:
        self.fake = fake
        self.count = 0

    def __call__(self) -> Any:
        self.count += 1
        return self.fake


def call(arguments: dict[str, Any], connect: Callable[[], Any]) -> dict[str, Any]:
    from bookvie_dropbox.server import build_server

    return call_in_process(build_server(connect=connect), UPLOAD_BACKUP, arguments)


def upload(path: Path | str, connect: Callable[[], Any]) -> dict[str, Any]:
    return call({"localPath": str(path)}, connect)


def seed_three_older(fake: Any) -> None:
    for day in ("2026-11-17", "2026-11-18", "2026-11-19"):
        fake.put(daily(day), day.encode())


def _write_backup(fakes: Any, target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(fakes.daily_zip(NOW))
    return target


# --- AC-10: every refused path is `other` -----------------------------------------
#
# Each case builds its path with a real backup zip behind it where one can be, so only
# the check refuses it. The first ten are AC-10's leaf's cases; the rest are the
# checklist's follow-ups (a NUL, a symlink loop, an unreadable file) and the arguments
# the tool's schema refuses.


def _case_dev(fakes: Any, home: Path, backups: Path) -> Any:
    return _write_backup(fakes, home / "bookvie-backups-dev" / TODAY_NAME)


def _case_from_dropbox(fakes: Any, home: Path, backups: Path) -> Any:
    return _write_backup(fakes, backups / "from-dropbox" / TODAY_NAME)


def _case_safety_copy(fakes: Any, home: Path, backups: Path) -> Any:
    return _write_backup(fakes, backups / "bookvie-pre-restore-2026-11-20T0901.zip")


def _case_outside(fakes: Any, home: Path, backups: Path) -> Any:
    return _write_backup(fakes, home / "elsewhere" / TODAY_NAME)


def _case_dotdot(fakes: Any, home: Path, backups: Path) -> Any:
    _write_backup(fakes, backups / TODAY_NAME)
    (backups / "from-dropbox").mkdir()
    return f"{backups}/from-dropbox/../{TODAY_NAME}"


def _case_symlink_out(fakes: Any, home: Path, backups: Path) -> Any:
    target = _write_backup(fakes, home / "elsewhere" / TODAY_NAME)
    (backups / TODAY_NAME).symlink_to(target)
    return backups / TODAY_NAME


def _case_missing(fakes: Any, home: Path, backups: Path) -> Any:
    return backups / daily("2026-11-21")


def _case_folder(fakes: Any, home: Path, backups: Path) -> Any:
    (backups / daily("2026-11-21")).mkdir()
    return backups / daily("2026-11-21")


def _case_not_a_calendar_day(fakes: Any, home: Path, backups: Path) -> Any:
    return _write_backup(fakes, backups / daily("2026-02-30"))


def _case_relative(fakes: Any, home: Path, backups: Path) -> Any:
    _write_backup(fakes, backups / TODAY_NAME)
    return f"bookvie-backups/{TODAY_NAME}"


def _case_nul(fakes: Any, home: Path, backups: Path) -> Any:
    _write_backup(fakes, backups / TODAY_NAME)
    return f"{backups}/{TODAY_NAME}\0.txt"


def _case_symlink_loop(fakes: Any, home: Path, backups: Path) -> Any:
    loop = backups / "loop"
    loop.symlink_to(loop)
    return loop / TODAY_NAME


def _case_unreadable(fakes: Any, home: Path, backups: Path) -> Any:
    path = _write_backup(fakes, backups / TODAY_NAME)
    path.chmod(0)
    return path


REFUSED_PATHS = {
    "dev": _case_dev,
    "from_dropbox": _case_from_dropbox,
    "safety_copy": _case_safety_copy,
    "outside": _case_outside,
    "dotdot": _case_dotdot,
    "symlink_out": _case_symlink_out,
    "missing": _case_missing,
    "folder": _case_folder,
    "not_a_calendar_day": _case_not_a_calendar_day,
    "relative": _case_relative,
    "nul": _case_nul,
    "symlink_loop": _case_symlink_loop,
    "unreadable": _case_unreadable,
}


@pytest.mark.parametrize("case", list(REFUSED_PATHS))
def test_every_refused_path_is_other_before_any_dropbox_call(
    fakes: Any,
    backups: Path,
    _isolated_home: Path,
    monkeypatch: pytest.MonkeyPatch,
    case: str,
) -> None:
    # [P1] AC-10 (the review's deferral: the leaf asserts only `cause in CAUSES`)
    if case == "unreadable" and os.geteuid() == 0:
        pytest.skip("root reads a file with mode 000")
    monkeypatch.chdir(_isolated_home)
    path = REFUSED_PATHS[case](fakes, _isolated_home, backups)
    fake = fakes.FakeDropbox()
    seed_three_older(fake)
    before = fake.names()
    connect = Connect(fake)

    result = upload(path, connect)

    error = error_of(result)
    assert error["cause"] == "other", result
    assert error["message"].startswith("Not uploaded:"), error
    assert connect.count == 0
    assert fake.calls == []
    assert fake.names() == before


@pytest.mark.parametrize(
    "arguments",
    [
        pytest.param({"localPath": 20261120}, id="a_number"),
        pytest.param({"localPath": ""}, id="empty"),
        pytest.param({}, id="no_localPath"),
        # A real daily backup's path: only the extra argument refuses it.
        pytest.param({"localPath": "TODAY", "keep": 5}, id="an_extra_argument"),
    ],
)
def test_arguments_outside_the_schema_are_other_before_any_dropbox_call(
    fakes: Any, backups: Path, arguments: dict[str, Any]
) -> None:
    # [P2] AC-10 / AC-5's schema
    today = _write_backup(fakes, backups / TODAY_NAME)
    if arguments.get("localPath") == "TODAY":
        arguments = {**arguments, "localPath": str(today)}
    fake = fakes.FakeDropbox()
    connect = Connect(fake)

    error = error_of(call(arguments, connect))

    assert error["cause"] == "other", error
    assert connect.count == 0
    assert fake.calls == []


def test_an_unknown_tool_name_is_a_protocol_error_and_connects_to_nothing(
    fakes: Any, backups: Path
) -> None:
    # [P3] AC-5: the server has exactly one tool
    from mcp.shared.exceptions import MCPError

    from bookvie_dropbox.server import build_server

    connect = Connect(fakes.FakeDropbox())

    # The in-process client re-raises the server's error inside anyio's task group.
    with pytest.raises(BaseExceptionGroup) as raised:
        call_in_process(build_server(connect=connect), "delete_backup", {"localPath": "x"})
    assert raised.group_contains(MCPError, match="Unknown tool: delete_backup", depth=None)
    assert connect.count == 0


def test_a_backups_folder_that_is_itself_a_symlink_uploads_from_where_it_points(
    fakes: Any, _isolated_home: Path
) -> None:
    # [P2] AC-10: "the resolved ~/bookvie-backups/"
    real = _isolated_home / "Dropbox-less" / "backups"
    _write_backup(fakes, real / TODAY_NAME)
    (_isolated_home / "bookvie-backups").symlink_to(real)
    fake = fakes.FakeDropbox()

    answer = structured_of(upload(_isolated_home / "bookvie-backups" / TODAY_NAME, Connect(fake)))

    assert answer["name"] == TODAY_NAME
    assert fake.names() == [TODAY_NAME]
    assert fake.file(TODAY_NAME).content_hash == file_content_hash(real / TODAY_NAME)


# --- AC-6: a file several chunks long ----------------------------------------------


@pytest.mark.parametrize("remainder", [0, 1, 517], ids=["exact_multiple", "one_byte", "a_tail"])
def test_a_file_several_chunks_long_goes_up_in_order_with_offsets_that_add_up(
    fakes: Any, backups: Path, monkeypatch: pytest.MonkeyPatch, remainder: int
) -> None:
    # [P1] AC-6 / AC-11: FakeDropbox refuses a cursor whose offset isn't the bytes so far
    from bookvie_dropbox import upload as upload_module

    chunk = 1024
    monkeypatch.setattr(upload_module, "CHUNK", chunk)
    tail = fakes.daily_zip(NOW, payload=os.urandom(3000))
    # zipfile reads a zip with data before it, so padding sets the size exactly.
    full_chunks = len(tail) // chunk + 2
    size = full_chunks * chunk + remainder
    path = backups / TODAY_NAME
    path.write_bytes(b"\0" * (size - len(tail)) + tail)
    fake = fakes.FakeDropbox()

    result = upload(path, Connect(fake))

    expected_sizes = [chunk] * full_chunks + ([remainder] if remainder else [])
    assert fake.request_sizes == expected_sizes, result
    requests_sent = len(expected_sizes)
    assert fake.upload_calls() == (
        ["files_upload_session_start"]
        + ["files_upload_session_append_v2"] * (requests_sent - 2)
        + ["files_upload_session_finish"]
    )
    stored = fake.file(TODAY_NAME)
    assert (stored.size, stored.content_hash) == (size, file_content_hash(path))
    assert structured_of(result)["contentHash"] == stored.content_hash


def test_a_small_file_starts_with_all_of_it_and_finishes_empty(fakes: Any, backups: Path) -> None:
    # [P2] AC-6: one chunk, then the finish carries no data
    path = _write_backup(fakes, backups / TODAY_NAME)
    fake = fakes.FakeDropbox()

    structured_of(upload(path, Connect(fake)))

    assert fake.request_sizes == [path.stat().st_size, 0]
    assert fake.upload_calls() == ["files_upload_session_start", "files_upload_session_finish"]


# --- AC-6: the backup time ------------------------------------------------------------


def test_an_extra_field_before_the_utc_one_is_skipped_for_the_backup_time(
    fakes: Any, backups: Path
) -> None:
    # [P2] AC-6: a zip tool may put other extra fields (0x7875, Unix uid/gid) first
    uid_gid = struct.pack("<HHBBIBI", 0x7875, 11, 1, 4, 501, 4, 20)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        info = zipfile.ZipInfo("library.json", date_time=(1999, 1, 1, 0, 0, 0))
        info.extra = uid_gid + fakes.extended_timestamp(NOW)
        archive.writestr(info, b"{}")
    path = backups / TODAY_NAME
    path.write_bytes(buffer.getvalue())
    fake = fakes.FakeDropbox()

    structured_of(upload(path, Connect(fake)))

    (commit,) = fake.commits
    assert commit.client_modified.replace(tzinfo=UTC) == NOW_UTC


# --- AC-8 / AC-12: faults before and after the upload ---------------------------------


def test_a_refused_refresh_through_the_real_sdk_is_dropbox_signin_and_sends_no_data(
    fakes: Any, backups: Path
) -> None:
    # [P1] AC-12 / AC-8: the SDK's own refresh, refused (`invalid_grant`), through the tool
    import keyring

    from bookvie_dropbox import dropbox_api

    previous = keyring.get_keyring()
    keyring.set_keyring(
        fakes.MemoryKeyring({(fakes.KEYRING_SERVICE, fakes.KEYRING_ACCOUNT): KEYCHAIN_TOKEN})
    )
    # The fake accepts no refresh token: Dropbox has revoked the Keychain's.
    http = fakes.FakeDropboxHttp(app_key=dropbox_api.APP_KEY, refresh_tokens=set())
    path = _write_backup(fakes, backups / TODAY_NAME)
    try:
        result = upload(path, lambda: dropbox_api.connect(session=fakes.http_session(http)))
    finally:
        keyring.set_keyring(previous)

    error = error_of(result)
    assert error["cause"] == "dropbox_signin", result
    assert dropbox_api.SIGNIN_COMMAND in error["message"]
    assert KEYCHAIN_TOKEN not in str(result)
    assert [form["refresh_token"] for form in http.refreshes()] == [KEYCHAIN_TOKEN]
    assert {url for _, url, _, _ in http.requests} == {fakes.TOKEN_URL}


def test_a_client_that_cant_be_built_is_other_and_touches_nothing(
    fakes: Any, backups: Path
) -> None:
    # [P2] AC-8: a connect fault that isn't the sign-in
    path = _write_backup(fakes, backups / TODAY_NAME)

    def broken() -> Any:
        raise ValueError("a bad SDK argument")

    error = error_of(upload(path, broken))

    assert error["cause"] == "other", error
    assert "Couldn't start a Dropbox client (ValueError)" in error["message"]
    assert "bad SDK argument" not in error["message"]


def test_a_listing_that_fails_after_a_verified_upload_deletes_nothing_and_says_so(
    fakes: Any, backups: Path
) -> None:
    # [P1] AC-8: the prune's listing fails; the verified upload stands. It stays `other`
    # (Epic 13 retro item 91): with no listing there is no true copy count to record.
    from dropbox import files as dbx_files
    from dropbox.exceptions import ApiError

    class ListingFails(fakes.FakeDropbox):  # type: ignore[name-defined,misc]
        def files_list_folder(self, path: str, *args: Any, **kwargs: Any) -> Any:
            self.calls.append(("files_list_folder", path))
            raise ApiError("req-list", dbx_files.ListFolderError.other, None, None)

    fake = ListingFails()
    for day in ("2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"):
        fake.put(daily(day), day.encode())
    path = _write_backup(fakes, backups / TODAY_NAME)

    error = error_of(upload(path, Connect(fake)))

    assert error["cause"] == "other", error
    assert f"{TODAY_NAME} was uploaded and verified" in error["message"]
    assert (
        "listing the older daily backups failed (ApiError), so none was deleted"
        in (error["message"])
    )
    assert "may hold more than 3" in error["message"]
    assert fake.deletes() == []
    assert fake.file(TODAY_NAME).content_hash == file_content_hash(path)


def test_a_listing_that_says_not_found_after_the_upload_counts_as_empty(
    fakes: Any, backups: Path
) -> None:
    # [P3] AC-7: `not_found` is an empty folder, even right after the finish
    from dropbox import files as dbx_files
    from dropbox.exceptions import ApiError

    class NotListedYet(fakes.FakeDropbox):  # type: ignore[name-defined,misc]
        def files_list_folder(self, path: str, *args: Any, **kwargs: Any) -> Any:
            self.calls.append(("files_list_folder", path))
            raise ApiError(
                "req-not-found",
                dbx_files.ListFolderError.path(dbx_files.LookupError.not_found),
                None,
                None,
            )

    fake = NotListedYet()
    seed_three_older(fake)
    path = _write_backup(fakes, backups / TODAY_NAME)

    answer = structured_of(upload(path, Connect(fake)))

    assert (answer["copies"], answer["deleted"]) == (1, [])
    assert fake.deletes() == []
