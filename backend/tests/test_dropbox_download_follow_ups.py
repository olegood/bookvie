"""Story 13.7: the ATDD checklist's green-phase follow-ups (spec-13-7).

The order ``list_backups`` gives when a backup's name and its upload time disagree,
a download larger than one 4 MiB content-hash block, a backups folder that is
itself a symlink, and a failed listing or download that writes nothing. Every
test's ``HOME`` is temporary (``conftest._isolated_home``).
"""

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

import tests.dropbox_fakes as fakes
from tests.agent_client import (
    DOWNLOAD_BACKUP,
    LIST_BACKUPS,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    McpClient,
    error_of,
    structured_of,
)
from tests.helpers import SetClock, backup_zip, files_under
from tests.restore_scene import BACKUP_AT, NOW, write_library
from tests.test_dropbox_download import dropbox_call, same_path
from tests.test_dropbox_upload import Connect, daily, seed_three_older

BLOCK = 4 * 1024 * 1024
"""Dropbox's content-hash block size."""


def _names(answer: dict[str, Any]) -> list[str]:
    return [entry["name"] for entry in structured_of(answer)["backups"]]


def test_list_backups_orders_by_upload_time_when_the_names_disagree() -> None:
    # [P1] I/O matrix "List": newest first by client_modified, not by the date in the name.
    # 17 Nov was uploaded last (19 Nov 23:00), so it comes first.
    fake = fakes.FakeDropbox()
    seed_three_older(fake)

    answer = dropbox_call(LIST_BACKUPS, {}, Connect(fake))

    assert _names(answer) == [daily("2026-11-17"), daily("2026-11-19"), daily("2026-11-18")]
    times = [
        datetime.fromisoformat(entry["backupTime"]) for entry in structured_of(answer)["backups"]
    ]
    assert times == sorted(times, reverse=True)
    assert times[0] == datetime(2026, 11, 19, 23, 0, tzinfo=UTC)


def test_list_backups_breaks_a_tie_in_upload_time_by_name_newest_first() -> None:
    # [P2] Design Notes: ties fall back to the name, descending.
    fake = fakes.FakeDropbox()
    same = datetime(2026, 11, 19, 9, 0, tzinfo=UTC)
    for day in ("2026-11-18", "2026-11-20", "2026-11-19"):
        fake.put(daily(day), day.encode(), client_modified=same)

    answer = dropbox_call(LIST_BACKUPS, {}, Connect(fake))

    assert _names(answer) == [daily("2026-11-20"), daily("2026-11-19"), daily("2026-11-18")]


def test_a_download_larger_than_one_hash_block_is_verified_and_lands_whole(
    _isolated_home: Path,
) -> None:
    # [P2] matrix "Download": the content hash is checked across several 4 MiB blocks,
    # streamed in 1 MiB pieces, and the last block is a partial one.
    name = daily("2026-11-19")
    data = bytes(range(251)) * ((2 * BLOCK + 12345) // 251 + 1)
    assert len(data) > 2 * BLOCK and len(data) % BLOCK
    fake = fakes.FakeDropbox()
    fake.put(name, data, client_modified=datetime(2026, 11, 19, 8, 0, tzinfo=UTC))
    (listed,) = structured_of(dropbox_call(LIST_BACKUPS, {}, Connect(fake)))["backups"]

    answer = dropbox_call(DOWNLOAD_BACKUP, {"name": name, "target": "bookvie"}, Connect(fake))

    landed = Path(structured_of(answer)["path"])
    assert landed.read_bytes() == data
    assert listed["size"] == len(data)
    assert listed["contentHash"] == fakes.content_hash(data)


def test_a_download_into_a_symlinked_backups_folder_is_the_path_bookvie_lists_and_previews(
    _isolated_home: Path,
    tmp_path: Path,
    connect_mcp: Callable[..., McpClient],
) -> None:
    # [P2] I/O matrix "Download" + AC-6: ~/bookvie-backups is a symlink (to a folder on
    # another disk, say). The answered path is the one bookvie's own tools list and
    # preview, since both sides resolve the folder.
    name = daily("2026-11-19")
    then = tmp_path / "then"
    write_library(then, grown=False)
    data = backup_zip(then, BACKUP_AT)
    fake = fakes.FakeDropbox()
    fake.put(name, data, client_modified=BACKUP_AT)
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    backups = _isolated_home / "bookvie-backups"
    backups.symlink_to(elsewhere, target_is_directory=True)
    data_dir = tmp_path / "library"
    write_library(data_dir, grown=True)

    answer = dropbox_call(DOWNLOAD_BACKUP, {"name": name, "target": "bookvie"}, Connect(fake))
    client = connect_mcp(data_dir=data_dir, backups_dir=backups, clock=SetClock(NOW))
    local = structured_of(client.answer(LIST_LOCAL_BACKUPS))["backups"]

    path = structured_of(answer)["path"]
    assert same_path(path, elsewhere / "from-dropbox" / name), answer
    assert [(entry["path"], entry["kind"]) for entry in local] == [(path, "from_dropbox")], local
    preview = structured_of(client.answer(PREVIEW_RESTORE, {"path": path}))
    assert preview["booksAddedSince"], preview


class _ListingRefused(fakes.FakeDropbox):
    def files_list_folder(self, path: str, *args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("something nobody expected")


@pytest.mark.parametrize(
    ("tool", "arguments", "fake", "cause"),
    [
        pytest.param(
            LIST_BACKUPS,
            {},
            lambda: fakes.FakeDropbox(fault="signin"),
            "dropbox_signin",
            id="list_signin",
        ),
        pytest.param(LIST_BACKUPS, {}, _ListingRefused, "other", id="list_other"),
        pytest.param(
            DOWNLOAD_BACKUP,
            {"name": daily("2026-11-19"), "target": "bookvie"},
            lambda: fakes.FakeDropbox(fault="signin"),
            "dropbox_signin",
            id="download_signin",
        ),
        pytest.param(
            DOWNLOAD_BACKUP,
            {"name": daily("2026-11-16"), "target": "bookvie-dev"},
            fakes.FakeDropbox,
            "other",
            id="download_not_in_dropbox",
        ),
    ],
)
def test_a_failed_listing_or_download_writes_no_file(
    tool: str, arguments: dict[str, Any], fake: Callable[[], Any], cause: str, _isolated_home: Path
) -> None:
    # [P1] I/O matrix "List fails", "Sign-in", "Other": no file is written anywhere under
    # HOME (a download may leave an empty from-dropbox/, as the spec's check order allows).
    dropbox = fake()
    dropbox.put(
        daily("2026-11-19"), b"19", client_modified=datetime(2026, 11, 19, 8, 0, tzinfo=UTC)
    )
    before = files_under(_isolated_home)

    answer = error_of(dropbox_call(tool, arguments, Connect(dropbox)))

    assert answer.get("cause") == cause, answer
    assert files_under(_isolated_home) == before
    assert all(response.closed for response in dropbox.responses)
    # A sign-in failure says how to sign in again, as upload_backup's does.
    assert ("bookvie-dropbox auth" in answer["message"]) == (cause == "dropbox_signin"), answer
