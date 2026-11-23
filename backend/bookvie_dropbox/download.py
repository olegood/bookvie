"""``list_backups`` and ``download_backup``: see and fetch the daily backups in Dropbox (AD-22).

``list_backups`` reads only ``/.backups`` and answers its daily backups,
newest first by the time each was made. ``download_backup`` reads only
``/.backups/<name>`` and writes it into ``from-dropbox/`` in the backups
folder of its ``target``: through a temporary file in that same folder,
fsynced, whose size and content hash must equal Dropbox's before it is
renamed onto ``<name>``. Any failure removes the temporary file and leaves an
earlier ``from-dropbox/<name>`` as it was. Every argument check runs before
any Dropbox call and before any folder is created.
"""

import contextlib
import os
import stat
import tempfile
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from dropbox import files as dbx_files
from dropbox.exceptions import ApiError, AuthError, RateLimitError

from .contracts import BACKUPS_NAME, DEV_BACKUPS_NAME, FROM_DROPBOX, ContentHasher, daily_date
from .dropbox_api import SIGNIN_COMMAND, SigninError
from .upload import DROPBOX_FOLDER, _list_backups

DOWNLOAD_CAUSES = ("dropbox_signin", "download_incomplete", "other")
"""The causes ``list_backups`` and ``download_backup`` answer. ``download_incomplete`` is
theirs alone: it isn't one of ``record_backup_upload``'s causes (``contracts.CAUSES``)."""
TARGETS = {"bookvie": BACKUPS_NAME, "bookvie-dev": DEV_BACKUPS_NAME}
"""Each ``target`` and the backups folder, in the home folder, that its downloads go into."""
PIECE = 1024 * 1024
"""Bytes read from the download's body at a time."""


class DownloadRefused(Exception):
    """A failed ``list_backups`` or ``download_backup``, with its cause and a message for the
    user."""

    def __init__(self, cause: str, message: str) -> None:
        assert cause in DOWNLOAD_CAUSES, cause
        super().__init__(message)
        self.cause = cause
        self.message = message


def _signin(why: str, nothing: str) -> DownloadRefused:
    return DownloadRefused(
        "dropbox_signin",
        f"{why} Run `{SIGNIN_COMMAND}` in a terminal to sign in to Dropbox again. {nothing}",
    )


def _connect(connect: Callable[[], Any], nothing: str) -> Any:
    try:
        return connect()
    except SigninError as exc:
        raise _signin(str(exc), nothing) from None
    except Exception as exc:  # noqa: BLE001 - any other fault is reported as other
        raise DownloadRefused(
            "other", f"Couldn't start a Dropbox client ({type(exc).__name__}). {nothing}"
        ) from None


def _close(dbx: Any) -> None:
    close = getattr(dbx, "close", None)
    if callable(close):
        close()


def _aware(moment: datetime) -> datetime:
    """The SDK's naive UTC ``client_modified`` as an aware UTC time."""
    return moment.replace(tzinfo=UTC) if moment.tzinfo is None else moment.astimezone(UTC)


def list_backups(connect: Callable[[], Any]) -> dict[str, Any]:
    """``{"backups": [...]}``: the daily backups in ``/.backups``, newest first, each as
    ``{name, backupTime, size, contentHash}``. Raises :class:`DownloadRefused`."""
    nothing = "No backups were listed."
    dbx = _connect(connect, nothing)
    try:
        entries = _list_backups(dbx)
    except AuthError:
        raise _signin("Dropbox refused bookvie-dropbox's sign-in.", nothing) from None
    except Exception as exc:  # noqa: BLE001 - any other fault is reported as other
        raise DownloadRefused(
            "other", f"Listing the backups in Dropbox failed ({type(exc).__name__}). {nothing}"
        ) from None
    finally:
        _close(dbx)
    dailies = [
        entry
        for entry in entries
        if isinstance(entry, dbx_files.FileMetadata) and daily_date(entry.name) is not None
    ]
    dailies.sort(key=lambda entry: (_aware(entry.client_modified), entry.name), reverse=True)
    return {
        "backups": [
            {
                "name": entry.name,
                "backupTime": _aware(entry.client_modified).isoformat(),
                "size": entry.size,
                "contentHash": entry.content_hash,
            }
            for entry in dailies
        ]
    }


def _refused(why: str) -> DownloadRefused:
    return DownloadRefused(
        "other",
        f"Not downloaded: {why} download_backup takes a daily backup's name from list_backups "
        "(bookvie-backup-<YYYY-MM-DD>.zip) and a target, bookvie or bookvie-dev.",
    )


def _check_landing(landing: Path) -> None:
    """Refuse a ``from-dropbox`` that is a symlink or not a folder; a missing one is fine."""
    try:
        mode = os.lstat(landing).st_mode
    except FileNotFoundError:
        return
    except OSError:
        raise DownloadRefused(
            "other", f"Not downloaded: ~/{landing.parent.name}/{FROM_DROPBOX} can't be read."
        ) from None
    if stat.S_ISLNK(mode) or not stat.S_ISDIR(mode):
        raise DownloadRefused(
            "other", f"Not downloaded: ~/{landing.parent.name}/{FROM_DROPBOX} isn't a folder."
        )


def _fsync_folder(folder: Path) -> None:
    fd = os.open(folder, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def download_backup(
    name: Any, target: Any, connect: Callable[[], Any], *, home: Path | None = None
) -> dict[str, Any]:
    """Download ``/.backups/<name>`` into ``target``'s ``from-dropbox/``; ``{"path": ...}``.

    ``connect()`` is called once, after every argument check. Raises
    :class:`DownloadRefused` with its cause.
    """
    if not isinstance(name, str) or daily_date(name) is None:
        raise _refused("that isn't a daily backup's name.")
    if not isinstance(target, str) or target not in TARGETS:
        raise _refused("the target must be bookvie or bookvie-dev.")
    landing = (Path.home() if home is None else home) / TARGETS[target] / FROM_DROPBOX
    _check_landing(landing)

    nothing = "Nothing was downloaded."
    dbx = _connect(connect, nothing)
    try:
        try:
            landing.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise DownloadRefused(
                "other",
                f"Couldn't create ~/{TARGETS[target]}/{FROM_DROPBOX} ({type(exc).__name__}).",
            ) from None
        _check_landing(landing)
        folder = landing.resolve()
        _download(dbx, name, folder)
    finally:
        _close(dbx)
    return {"path": str(folder / name)}


def _download(dbx: Any, name: str, folder: Path) -> None:
    """Stream ``/.backups/<name>`` into a temporary file in ``folder``, verify it, then rename
    it onto ``folder/name``."""
    temp: str | None = None
    try:
        metadata, response = dbx.files_download(f"{DROPBOX_FOLDER}/{name}")
        try:
            hasher = ContentHasher()
            written = 0
            fd, temp = tempfile.mkstemp(dir=folder, prefix=".", suffix=".tmp")
            with os.fdopen(fd, "wb") as out:
                for piece in response.iter_content(PIECE):
                    hasher.update(piece)
                    out.write(piece)
                    written += len(piece)
                out.flush()
                os.fsync(out.fileno())
        finally:
            response.close()
        if written != getattr(metadata, "size", None) or hasher.hexdigest() != getattr(
            metadata, "content_hash", None
        ):
            raise DownloadRefused(
                "download_incomplete",
                f"The download of {name} doesn't match Dropbox's copy (size or content hash), "
                "so it was discarded. Nothing was written; try again.",
            )
        os.replace(temp, folder / name)
        temp = None
        # The verified file is in place: a failed folder fsync doesn't undo the download.
        with contextlib.suppress(OSError):
            _fsync_folder(folder)
    except DownloadRefused:
        raise
    except AuthError:
        raise _signin(
            "Dropbox refused bookvie-dropbox's sign-in.", "Nothing was downloaded."
        ) from None
    except ApiError:
        raise DownloadRefused(
            "other",
            f"Dropbox couldn't give {name} from bookvie's folder: it may not hold that backup. "
            "Nothing was downloaded.",
        ) from None
    except (requests.exceptions.RequestException, OSError, RateLimitError) as exc:
        raise DownloadRefused(
            "download_incomplete",
            f"The download of {name} didn't finish ({type(exc).__name__}). Nothing was written; "
            "try again.",
        ) from None
    except Exception as exc:  # noqa: BLE001 - any other fault is reported as other
        raise DownloadRefused(
            "other", f"The download failed ({type(exc).__name__}). Nothing was written."
        ) from None
    finally:
        if temp is not None:
            with contextlib.suppress(OSError):
                os.unlink(temp)


__all__ = ["DOWNLOAD_CAUSES", "TARGETS", "DownloadRefused", "download_backup", "list_backups"]
