"""Story 13.7: the I/O matrix rows the ATDD leaves don't reach (spec-13-7).

``list_backups`` failing (a refused sign-in, an unreadable Keychain, anything
else), and ``download_backup`` into a ``from-dropbox`` that is a symlink or a
file. Every test's ``HOME`` is temporary (``conftest._isolated_home``).
"""

from pathlib import Path
from typing import Any

import pytest
import requests
from dropbox.exceptions import RateLimitError

import tests.dropbox_fakes as fakes
from tests.agent_client import DOWNLOAD_BACKUP, LIST_BACKUPS, error_of, structured_of
from tests.test_dropbox_download import dropbox_call, seed_three_dailies
from tests.test_dropbox_upload import Connect, daily


class BrokenListing(fakes.FakeDropbox):
    """A Dropbox whose folder listing fails with an error nobody expected."""

    def files_list_folder(self, path: str, *args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("something nobody expected")


def test_list_backups_says_dropbox_signin_when_the_sign_in_is_refused_or_unreadable() -> None:
    # [P1] matrix: List fails (sign-in)
    refused = fakes.FakeDropbox(fault="signin")
    seed_three_dailies(fakes, refused)

    answer = error_of(dropbox_call(LIST_BACKUPS, {}, Connect(refused)))

    assert answer.get("cause") == "dropbox_signin", answer
    assert "bookvie-dropbox auth" in answer["message"]
    # The real connect over the test's failing Keychain.
    assert error_of(dropbox_call(LIST_BACKUPS, {})).get("cause") == "dropbox_signin"


def test_list_backups_says_other_for_any_other_failure_and_for_an_argument() -> None:
    # [P1] matrix: List fails (anything else)
    broken = BrokenListing()

    assert error_of(dropbox_call(LIST_BACKUPS, {}, Connect(broken))).get("cause") == "other"

    fake = fakes.FakeDropbox()
    connect = Connect(fake)
    refused = error_of(dropbox_call(LIST_BACKUPS, {"folder": "/"}, connect))
    assert refused.get("cause") == "other", refused
    assert connect.count == 0


@pytest.mark.parametrize("kind", ["symlink", "file"])
def test_download_backup_refuses_a_from_dropbox_that_isnt_a_folder_before_any_call(
    kind: str, _isolated_home: Path, tmp_path: Path
) -> None:
    # [P1] matrix: Other (from-dropbox is a symlink or not a folder)
    backups = _isolated_home / "bookvie-backups"
    backups.mkdir()
    landing = backups / "from-dropbox"
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    if kind == "symlink":
        landing.symlink_to(elsewhere, target_is_directory=True)
    else:
        landing.write_bytes(b"not a folder")
    fake = fakes.FakeDropbox()
    seed_three_dailies(fakes, fake)
    connect = Connect(fake)

    answer = dropbox_call(
        DOWNLOAD_BACKUP, {"name": daily("2026-11-19"), "target": "bookvie"}, connect
    )

    assert error_of(answer).get("cause") == "other", answer
    assert connect.count == 0
    assert fake.calls == []
    assert list(elsewhere.iterdir()) == []
    if kind == "file":
        assert landing.read_bytes() == b"not a folder"


def test_download_backup_lands_the_same_bytes_list_backups_described() -> None:
    # [P2] matrix: Download (the listed size and hash describe the downloaded file)
    fake = fakes.FakeDropbox()
    stored = seed_three_dailies(fakes, fake)
    (listed, *_) = structured_of(dropbox_call(LIST_BACKUPS, {}, Connect(fake)))["backups"]

    answer = structured_of(
        dropbox_call(DOWNLOAD_BACKUP, {"name": listed["name"], "target": "bookvie"}, Connect(fake))
    )

    data = Path(answer["path"]).read_bytes()
    assert data == stored[listed["name"]]
    assert len(data) == listed["size"]
    assert fakes.content_hash(data) == listed["contentHash"]


class FailingDownload(fakes.FakeDropbox):
    """A Dropbox whose download raises ``error``, as a rate limit or a local write would."""

    def __init__(self, error: Exception) -> None:
        super().__init__()
        self.error = error

    def files_download(self, path: str, rev: Any = None, extra_headers: Any = None) -> Any:
        self.calls.append(("files_download", path))
        raise self.error


@pytest.mark.parametrize(
    "error",
    [RateLimitError("req-rate"), OSError("disk full"), requests.exceptions.ReadTimeout("slow")],
    ids=["rate_limit", "os_error", "timeout"],
)
def test_a_rate_limited_or_failing_transfer_is_download_incomplete(
    error: Exception, _isolated_home: Path
) -> None:
    # [P1] matrix: Mismatch / cut (RequestException, OSError, RateLimitError)
    fake = FailingDownload(error)
    seed_three_dailies(fakes, fake)

    answer = error_of(
        dropbox_call(
            DOWNLOAD_BACKUP, {"name": daily("2026-11-19"), "target": "bookvie"}, Connect(fake)
        )
    )

    assert answer.get("cause") == "download_incomplete", answer
    landing = _isolated_home / "bookvie-backups" / "from-dropbox"
    assert list(landing.iterdir()) == []
