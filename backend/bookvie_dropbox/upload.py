"""``upload_backup``: upload a daily backup, verify Dropbox's copy, then prune (AD-22).

Only a daily backup directly in ``~/bookvie-backups/`` is uploaded, and every
path check runs before any Dropbox call. The file goes up through an upload
session finished straight to ``/.backups/<name>`` with ``WriteMode.overwrite``,
so a same-day copy is replaced only by a finished upload. Dropbox's answer is
then checked against the file: its ``size`` and its ``content_hash``, hashed
from the very bytes that were sent. Only after that are the oldest daily
backups beyond 3 deleted, by the date in their names, never the name just
written and never a file or folder without a daily name. A prune that doesn't
finish deleting doesn't undo the verified upload: the result is still the upload,
with ``pruneFailed`` saying what didn't finish (Epic 13 retro item 91).
"""

import os
import stat
import struct
import zipfile
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO

import requests
from dropbox import files as dbx_files
from dropbox.exceptions import ApiError, AuthError, RateLimitError

from .contracts import (
    BACKUPS_NAME,
    CAUSES,
    DEV_BACKUPS_NAME,
    ContentHasher,
    daily_date,
)
from .dropbox_api import SIGNIN_COMMAND, SigninError

DROPBOX_FOLDER = "/.backups"
"""The App folder's ``.backups``: ``/Apps/bookvie/.backups/`` in the user's Dropbox."""
CHUNK = 8 * 1024 * 1024
"""Bytes per upload request; Dropbox refuses a request body over 150 MiB."""
KEEP = 3
"""Daily backups kept in Dropbox."""
LIBRARY_NAME = "library.json"
"""The zip entry whose time is the backup time (bookvie's ``store.LIBRARY_NAME``)."""
_EXTENDED_TIMESTAMP_ID = 0x5455
_MTIME_FLAG = 0x01


class UploadRefused(Exception):
    """A failed ``upload_backup``, with its AD-22 ``cause`` and a message for the user."""

    def __init__(self, cause: str, message: str) -> None:
        assert cause in CAUSES, cause
        super().__init__(message)
        self.cause = cause
        self.message = message


@dataclass(frozen=True)
class Uploaded:
    name: str
    copies: int
    deleted: list[str]
    content_hash: str
    prune_failed: str | None = None
    """What didn't finish when the prune failed after the verified upload; else ``None``."""

    def answer(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "name": self.name,
            "copies": self.copies,
            "deleted": list(self.deleted),
            "contentHash": self.content_hash,
        }
        if self.prune_failed is not None:
            body["pruneFailed"] = self.prune_failed
        return body


def _refused(why: str) -> UploadRefused:
    return UploadRefused(
        "other",
        f"Not uploaded: {why} bookvie-dropbox uploads only a daily backup "
        f"(bookvie-backup-<YYYY-MM-DD>.zip) directly in ~/{BACKUPS_NAME}/.",
    )


def resolve_upload_path(raw: Any, home: Path) -> Path:
    """``raw`` as a daily backup directly in ``home/bookvie-backups``; else :class:`UploadRefused`.

    It must be an absolute path with no ``..`` part and no NUL, whose parent
    resolves to the backups folder (not the dev one, not ``from-dropbox/``),
    with a daily name on a real calendar day, naming a regular file (not a
    symlink, not a folder). The file isn't opened here.
    """
    if not isinstance(raw, str) or not raw or "\0" in raw:
        raise _refused("that isn't a path.")
    path = Path(raw)
    if not path.is_absolute() or ".." in path.parts:
        raise _refused("the path must be absolute, with no `..`.")
    if daily_date(path.name) is None:
        raise _refused(f"{path.name} isn't a daily backup's name.")
    try:
        folder = (home / BACKUPS_NAME).resolve()
        dev = (home / DEV_BACKUPS_NAME).resolve()
        parent = path.parent.resolve()
    except OSError, RuntimeError, ValueError:
        raise _refused("the path can't be resolved.") from None
    if parent != folder or folder == dev:
        raise _refused(f"{raw} isn't in ~/{BACKUPS_NAME}/.")
    resolved = parent / path.name
    try:
        mode = os.lstat(resolved).st_mode
    except OSError:
        raise _refused(f"there is no file {path.name} in ~/{BACKUPS_NAME}/.") from None
    if not stat.S_ISREG(mode):
        raise _refused(f"{path.name} isn't a regular file.")
    return resolved


def _stamped_mtime(extra: bytes) -> int | None:
    """The UTC mtime in a zip entry's 0x5455 extra field (bookvie's ``export.stamped_mtime``)."""
    offset = 0
    while offset + 4 <= len(extra):
        header_id, size = struct.unpack_from("<HH", extra, offset)
        body = extra[offset + 4 : offset + 4 + size]
        if header_id == _EXTENDED_TIMESTAMP_ID and len(body) >= 5 and body[0] & _MTIME_FLAG:
            return struct.unpack_from("<l", body, 1)[0]
        offset += 4 + size
    return None


def read_backup_time(source: str | Path | BinaryIO) -> datetime:
    """When the backup was made, aware and in UTC (bookvie's ``export.backup_time``).

    ``library.json``'s 0x5455 field when it has one, else its ``date_time`` read
    as local time (an older zip). Raises when it isn't a zip with ``library.json``.
    """
    with zipfile.ZipFile(source) as archive:
        info = archive.getinfo(LIBRARY_NAME)
    mtime = _stamped_mtime(info.extra)
    if mtime is not None:
        return datetime.fromtimestamp(mtime, UTC)
    return datetime(*info.date_time).astimezone().astimezone(UTC)


def _open_backup(path: Path) -> BinaryIO:
    """``path`` opened for reading, refusing a symlink swapped in after the check."""
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise OSError(f"{path.name} isn't a regular file")
        return os.fdopen(fd, "rb")
    except BaseException:
        os.close(fd)
        raise


def upload_backup(
    raw_path: Any, connect: Callable[[], Any], *, home: Path | None = None
) -> Uploaded:
    """Upload the daily backup at ``raw_path``, verify it, then prune Dropbox to 3 dailies.

    ``connect()`` is called once, after every path check, and returns the
    Dropbox client. Raises :class:`UploadRefused` with the AD-22 cause.
    """
    path = resolve_upload_path(raw_path, Path.home() if home is None else home)
    try:
        source = _open_backup(path)
    except OSError:
        raise _refused(f"{path.name} can't be read.") from None
    with source:
        try:
            backup_time = read_backup_time(source)
            source.seek(0)
        except OSError, KeyError, ValueError, zipfile.BadZipFile, OverflowError:
            raise _refused(f"{path.name} isn't a bookvie backup (no library.json).") from None
        size = os.fstat(source.fileno()).st_size
        dbx = _connect(connect)
        try:
            content_hash = _upload(dbx, source, path.name, backup_time, size)
            copies, deleted, prune_failed = _prune(dbx, path.name)
        finally:
            close = getattr(dbx, "close", None)
            if callable(close):
                close()
    return Uploaded(
        name=path.name,
        copies=copies,
        deleted=deleted,
        content_hash=content_hash,
        prune_failed=prune_failed,
    )


def _signin(why: str) -> UploadRefused:
    return UploadRefused(
        "dropbox_signin",
        f"{why} Run `{SIGNIN_COMMAND}` in a terminal to sign in to Dropbox again. "
        "Nothing was uploaded or deleted.",
    )


def _connect(connect: Callable[[], Any]) -> Any:
    try:
        return connect()
    except SigninError as exc:
        raise _signin(str(exc)) from None
    except Exception as exc:  # noqa: BLE001 - any other fault is reported as other
        raise UploadRefused(
            "other",
            f"Couldn't start a Dropbox client ({type(exc).__name__}). Nothing was uploaded.",
        ) from None


def _is_insufficient_space(error: Any) -> bool:
    """Whether an upload error union says the Dropbox is full."""
    is_path = getattr(error, "is_path", None)
    if callable(is_path) and is_path():
        write_error = error.get_path()
        check = getattr(write_error, "is_insufficient_space", None)
        if callable(check) and check():
            return True
    return False


def _upload(dbx: Any, source: BinaryIO, name: str, backup_time: datetime, size: int) -> str:
    """Upload ``source`` to ``/.backups/<name>`` and verify Dropbox's answer; its content hash."""
    hasher = ContentHasher()
    sent = 0
    commit = dbx_files.CommitInfo(
        path=f"{DROPBOX_FOLDER}/{name}",
        mode=dbx_files.WriteMode.overwrite,
        client_modified=backup_time.astimezone(UTC).replace(tzinfo=None, microsecond=0),
    )
    try:
        chunk = source.read(CHUNK)
        hasher.update(chunk)
        started = dbx.files_upload_session_start(chunk)
        sent = len(chunk)
        chunk = source.read(CHUNK)
        while True:
            following = source.read(CHUNK) if chunk else b""
            hasher.update(chunk)
            cursor = dbx_files.UploadSessionCursor(session_id=started.session_id, offset=sent)
            if not following:
                metadata = dbx.files_upload_session_finish(chunk, cursor, commit)
                sent += len(chunk)
                break
            dbx.files_upload_session_append_v2(chunk, cursor)
            sent += len(chunk)
            chunk = following
    except AuthError:
        raise _signin("Dropbox refused bookvie-dropbox's sign-in.") from None
    except ApiError as exc:
        if _is_insufficient_space(exc.error):
            raise UploadRefused(
                "dropbox_full",
                "Dropbox is full, so the backup wasn't uploaded. Nothing was deleted. "
                "Free some space in Dropbox, then try again.",
            ) from None
        raise UploadRefused(
            "upload_incomplete",
            f"Dropbox refused the upload ({_summary(exc)}). Nothing was deleted; try again.",
        ) from None
    except (requests.exceptions.RequestException, OSError, RateLimitError) as exc:
        raise UploadRefused(
            "upload_incomplete",
            f"The upload didn't finish ({type(exc).__name__}). No older backup was deleted, "
            f"but that day's copy in Dropbox may be damaged; try again.",
        ) from None
    except Exception as exc:  # noqa: BLE001 - any other fault is reported as other
        raise UploadRefused(
            "other",
            f"The upload failed ({type(exc).__name__}). No older backup was deleted, but that "
            "day's copy in Dropbox may be damaged.",
        ) from None

    expected = hasher.hexdigest()
    answered_size = getattr(metadata, "size", None)
    answered_hash = getattr(metadata, "content_hash", None)
    if sent != size or answered_size != size or answered_hash != expected:
        raise UploadRefused(
            "upload_incomplete",
            f"Dropbox's copy of {name} doesn't match the file (size or content hash). "
            f"It has already replaced any earlier copy of {name} in Dropbox, but no other "
            "backup was deleted. Try again.",
        )
    return expected


def _summary(exc: ApiError) -> str:
    error = exc.error
    tag = getattr(error, "_tag", None)
    return str(tag) if tag else type(error).__name__


def _list_backups(dbx: Any) -> list[Any]:
    """Every entry directly in ``/.backups``, following ``has_more``; none if it doesn't exist."""
    try:
        page = dbx.files_list_folder(DROPBOX_FOLDER)
    except ApiError as exc:
        error = exc.error
        if (
            getattr(error, "is_path", lambda: False)()
            and getattr(error.get_path(), "is_not_found", lambda: False)()
        ):
            return []
        raise
    entries = list(page.entries)
    while page.has_more:
        page = dbx.files_list_folder_continue(page.cursor)
        entries.extend(page.entries)
    return entries


def _prune(dbx: Any, written: str) -> tuple[int, list[str], str | None]:
    """Delete the oldest daily backups beyond :data:`KEEP`, never ``written``; the copies left,
    the names deleted, and what didn't finish when a delete failed (else ``None``).

    A delete that fails doesn't fail the run: the upload stands, verified, and the copies are
    ``written`` plus every daily backup listed and not deleted (Epic 13 retro item 91). A
    listing that fails is ``other``: the upload stands too, but how many copies Dropbox holds
    isn't known, so there is no true count to record."""
    try:
        entries = _list_backups(dbx)
    except Exception as exc:  # noqa: BLE001 - the upload is verified; the listing is reported
        raise UploadRefused(
            "other",
            f"{written} was uploaded and verified, but listing the older daily backups "
            f"failed ({type(exc).__name__}), so none was deleted. Dropbox may hold more than "
            f"{KEEP} daily backups until a later upload deletes them.",
        ) from None
    others: dict[str, tuple[Any, str]] = {}
    for entry in entries:
        if not isinstance(entry, dbx_files.FileMetadata):
            continue
        day = daily_date(entry.name)
        if day is None or entry.name.lower() == written.lower():
            continue
        others[entry.name.lower()] = (day, entry.name)
    newest_first = sorted(others.values(), reverse=True)
    due = [name for _, name in sorted(newest_first[KEEP - 1 :])]
    deleted: list[str] = []
    try:
        for name in due:
            dbx.files_delete_v2(f"{DROPBOX_FOLDER}/{name}")
            deleted.append(name)
    except Exception as exc:  # noqa: BLE001 - the upload is verified; the prune is reported
        done = f" It deleted {', '.join(deleted)}." if deleted else ""
        left = due[len(deleted) :]
        return (
            1 + len(others) - len(deleted),
            deleted,
            f"{written} was uploaded and verified, but deleting the older daily backups "
            f"didn't finish ({type(exc).__name__}).{done} It didn't delete {', '.join(left)}. "
            f"Dropbox may hold more than {KEEP} daily backups until a later upload deletes them.",
        )
    return 1 + len(others) - len(deleted), deleted, None


__all__ = [
    "CHUNK",
    "DROPBOX_FOLDER",
    "KEEP",
    "UploadRefused",
    "Uploaded",
    "read_backup_time",
    "resolve_upload_path",
    "upload_backup",
]
