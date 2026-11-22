"""Story 13.2: ``upload_backup``'s edges beyond the ATDD leaves (AD-22).

An older zip's backup time, a backups folder that is a symlink to the dev
one, a prune that fails halfway, and a rate limit at the finish. Each runs
the in-process server against :class:`tests.dropbox_fakes.FakeDropbox`, in
the test's temporary ``HOME``.
"""

import importlib
import io
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from tests.agent_client import UPLOAD_BACKUP, call_in_process, error_of, structured_of

NOW = datetime(2026, 11, 20, 9, 1, 36).astimezone()
TODAY_NAME = "bookvie-backup-2026-11-20.zip"


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


def upload(path: Path | str, connect: Connect) -> dict[str, Any]:
    from bookvie_dropbox.server import build_server

    return call_in_process(build_server(connect=connect), UPLOAD_BACKUP, {"localPath": str(path)})


def test_an_older_zip_without_the_utc_field_is_stamped_with_its_wall_time_read_as_local(
    fakes: Any, backups: Path
) -> None:
    wall = (2026, 11, 20, 9, 1, 36)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(zipfile.ZipInfo("library.json", date_time=wall), b"{}")
    path = backups / TODAY_NAME
    path.write_bytes(buffer.getvalue())
    fake = fakes.FakeDropbox()

    result = upload(path, Connect(fake))

    assert structured_of(result)["name"] == TODAY_NAME
    (commit,) = fake.commits
    expected = datetime(*wall).astimezone().astimezone(UTC)
    assert commit.client_modified.replace(tzinfo=UTC) == expected


def test_a_backups_folder_that_is_a_symlink_to_the_dev_folder_is_refused(
    fakes: Any, _isolated_home: Path
) -> None:
    dev = _isolated_home / "bookvie-backups-dev"
    dev.mkdir()
    (dev / TODAY_NAME).write_bytes(fakes.daily_zip(NOW))
    (_isolated_home / "bookvie-backups").symlink_to(dev)
    fake = fakes.FakeDropbox()
    connect = Connect(fake)

    result = upload(_isolated_home / "bookvie-backups" / TODAY_NAME, connect)

    assert error_of(result)["cause"] == "other", result
    assert connect.count == 0
    assert fake.calls == []


def test_a_prune_that_fails_halfway_reports_the_verified_upload_and_what_it_deleted(
    fakes: Any, backups: Path
) -> None:
    class SecondDeleteFails(fakes.FakeDropbox):  # type: ignore[name-defined,misc]
        deleted = 0

        def files_delete_v2(self, path: str, parent_rev: Any = None) -> Any:
            self.deleted += 1
            if self.deleted == 2:
                self.calls.append(("files_delete_v2", path))
                raise RuntimeError("the connection dropped")
            return super().files_delete_v2(path, parent_rev)

    fake = SecondDeleteFails()
    for day in ("2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"):
        fake.put(daily(day), day.encode())
    path = backups / TODAY_NAME
    path.write_bytes(fakes.daily_zip(NOW))

    result = upload(path, Connect(fake))

    error = error_of(result)
    assert error["cause"] == "other", result
    assert "verified" in error["message"]
    assert daily("2026-11-16") in error["message"]
    assert TODAY_NAME in fake.names()
    assert daily("2026-11-16") not in fake.names()
    assert daily("2026-11-17") in fake.names()


def test_a_rate_limit_at_the_finish_is_upload_incomplete_and_deletes_nothing(
    fakes: Any, backups: Path
) -> None:
    from dropbox.exceptions import RateLimitError

    class RateLimited(fakes.FakeDropbox):  # type: ignore[name-defined,misc]
        def files_upload_session_finish(self, *args: Any, **kwargs: Any) -> Any:
            self.calls.append(("files_upload_session_finish", "?"))
            raise RateLimitError("req-429", None, 1)

    fake = RateLimited()
    for day in ("2026-11-17", "2026-11-18", "2026-11-19"):
        fake.put(daily(day), day.encode())
    path = backups / TODAY_NAME
    path.write_bytes(fakes.daily_zip(NOW))

    result = upload(path, Connect(fake))

    assert error_of(result)["cause"] == "upload_incomplete", result
    assert fake.deletes() == []
    assert TODAY_NAME not in fake.names()
