"""Helpers the test modules share; import from here, never from another test module.

- The app under test: :data:`BASE_URL` and :func:`api_client`.
- The intent paths, the fake :data:`TODAY`, and the intents the panels send:
  :data:`VALID` (New book), :data:`DUNE_FORM` and :data:`VALID_FORM`
  (Edit book), plus :data:`DUNE`, :data:`DUNE_ID` and :data:`DUNE_ISBN13`
  as the builder seeds Dune.
- Answers: :data:`COULDNT_SAVE_BODY` and :func:`field_messages`.
- The data folder as stored: :func:`library_bytes`, :func:`stored_books`,
  :func:`stored_book`, :func:`assert_invariants`.
- Faults and covers: :class:`FaultyFs`, :func:`image_bytes` (by default a
  :data:`RED_ORANGE` PNG), :func:`seed_dune_with_cover`.
- The lock's order of events: :class:`RecordingLock`.
- Restore: :data:`RESTORE`, :func:`post_restore`, :func:`zip_archive`,
  :func:`covers_in`, :func:`staging_in` and :class:`RecordingFs`.
"""

import io
import json
import os
import threading
import zipfile
from datetime import date
from pathlib import Path
from typing import Any

import httpx
from fastapi.testclient import TestClient
from PIL import Image

from bookvie.domain import Library, check_invariants
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from bookvie.store import OsFileSystem, Store
from tests.builder import LibraryBuilder

# The Host guard accepts only this server's own Host (see test_guard.py).
BASE_URL = "http://127.0.0.1:8765"

ADD_BOOK = "/api/intents/add-book"
EDIT_BOOK = "/api/intents/edit-book"
DELETE_BOOK = "/api/intents/delete-book"
SET_SPINE_COLOR = "/api/intents/set-spine-color"

# The fake today. Year may be at most next year (2027); Finished on at most today.
TODAY = date(2026, 10, 30)

COULDNT_SAVE_BODY = {
    "error": {"kind": "couldnt_save", "code": "couldnt_save", "message": COULDNT_SAVE_MESSAGE}
}
"""The whole body of a 500 or 503 ``couldnt_save``: nothing was committed."""

# Only the required fields, as the New book panel sends them (Edition omitted).
VALID = {
    "title": "The Dispossessed",
    "pages": "387",
    "authors": "Ursula K. Le Guin",
    "language": "English",
    "publisher": "Harper",
    "type": "paperback",
}

# Ace's Dune, as stored.
DUNE_ISBN13 = "9780441172719"
DUNE_ID = "6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f"

# Dune as the builder seeds it (snake_case) and as the Edit book panel
# prefills it (camelCase form strings). Edition 1, so the panel sends "1".
DUNE = {
    "title": "Dune",
    "authors": ["Frank Herbert"],
    "pages": 412,
    "language": "English",
    "publisher": "Chilton Books",
    "isbn": DUNE_ISBN13,
    "year": 1965,
}
DUNE_FORM = {
    "title": "Dune",
    "subtitle": "",
    "pages": "412",
    "authors": "Frank Herbert",
    "edition": "1",
    "language": "English",
    "publisher": "Chilton Books",
    "type": "paperback",
    "isbn": DUNE_ISBN13,
    "year": "1965",
    "finishedOn": "",
    "tags": "",
    "spineColor": "",
}
# VALID (The Dispossessed) as the Edit book panel prefills it.
VALID_FORM = {**DUNE_FORM, **VALID, "isbn": "", "year": ""}

# A saturated red-orange: hue ~8°, lightness 0.47, saturation 0.67 (capped to 0.45).
RED_ORANGE = (200, 60, 40)


class FaultyFs(OsFileSystem):
    """Fails at one step of a commit; ``write`` fails after writing half."""

    def __init__(self, fail_at: str) -> None:
        self.fail_at = fail_at

    def _maybe_fail(self, step: str) -> None:
        if step == self.fail_at:
            raise OSError(5, f"injected {step} fault")

    def create_temp(self, directory: Path, prefix: str) -> tuple[int, Path]:
        self._maybe_fail("create_temp")
        return super().create_temp(directory, prefix)

    def write(self, fd: int, data: bytes) -> None:
        if self.fail_at == "write":
            super().write(fd, data[: len(data) // 2])
        self._maybe_fail("write")
        super().write(fd, data)

    def fsync(self, fd: int) -> None:
        self._maybe_fail("fsync")
        super().fsync(fd)

    def close(self, fd: int) -> None:
        super().close(fd)
        self._maybe_fail("close")

    def replace(self, src: Path, dst: Path) -> None:
        self._maybe_fail("replace")
        super().replace(src, dst)

    def fsync_dir(self, directory: Path) -> None:
        self._maybe_fail("fsync_dir")
        super().fsync_dir(directory)

    def remove(self, path: Path) -> None:
        self._maybe_fail("remove")
        super().remove(path)


class RecordingLock:
    """A ``threading.Lock`` that logs each acquire and release into ``log``."""

    def __init__(self, log: list[str]) -> None:
        self._lock = threading.Lock()
        self._log = log

    def acquire(self, blocking: bool = True, timeout: float = -1) -> bool:
        got = self._lock.acquire(blocking, timeout)
        if got:
            self._log.append("lock acquired")
        return got

    def release(self) -> None:
        self._log.append("lock released")
        self._lock.release()

    def locked(self) -> bool:
        return self._lock.locked()

    __enter__ = acquire

    def __exit__(self, *exc: object) -> None:
        self.release()


def api_client(
    data_dir: Path, fs: FaultyFs | None = None, *, raise_server_exceptions: bool = False
) -> TestClient:
    """The app on the library in ``data_dir``, today pinned to :data:`TODAY`.

    ``fs`` injects faults into intents, not startup. By default an unexpected
    exception becomes the app's 500, as a browser would see it; view tests
    pass ``raise_server_exceptions=True`` to fail on the traceback instead.
    """
    store = Store.open(data_dir)
    if fs is not None:
        store.fs = fs
    app = create_app(
        data_dir / "no-static", data_dir=data_dir, store=store, clock=FakeClock(TODAY)
    )
    return TestClient(app, base_url=BASE_URL, raise_server_exceptions=raise_server_exceptions)


def library_bytes(data_dir: Path) -> bytes:
    return (data_dir / "library.json").read_bytes()


def stored_books(data_dir: Path) -> list[dict[str, Any]]:
    return json.loads(library_bytes(data_dir))["books"]


def stored_book(data_dir: Path, book_id: str) -> dict[str, Any]:
    (book,) = [b for b in stored_books(data_dir) if b["id"] == book_id]
    return book


def assert_invariants(data_dir: Path) -> None:
    check_invariants(Library.model_validate_json(library_bytes(data_dir)))


def field_messages(response: httpx.Response) -> dict[str, str]:
    return {f["field"]: f["message"] for f in response.json()["error"]["fields"]}


def image_bytes(
    size: tuple[int, int] = (40, 60),
    color: tuple[int, ...] = RED_ORANGE,
    *,
    mode: str = "RGB",
    fmt: str = "PNG",
    **save: Any,
) -> bytes:
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save)
    return buffer.getvalue()


def seed_dune_with_cover(data_dir: Path) -> str:
    """Dune with a stored cover (written as Story 1.13 would); returns ``coverFile``.

    ``spineColorFromCover`` is a fixed placeholder, not the color the stored
    image would give.
    """
    cover_file = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=cover_file,
        spine_color_from_cover="#A85A4A",
    )
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / cover_file).write_bytes(image_bytes(fmt="JPEG"))
    return cover_file


# --- Restore (Stories 2.2 and 2.3) --------------------------------------------

RESTORE = "/api/intents/restore"


def zip_archive(entries: dict[str, bytes | None]) -> bytes:
    """A hand-made archive, entries in order: ``None`` is a directory entry."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in entries.items():
            if data is None:
                archive.mkdir(name.rstrip("/"))
            else:
                archive.writestr(name, data)
    return buffer.getvalue()


def post_restore(client: TestClient, archive: bytes) -> httpx.Response:
    """One restore intent, as the Backup page sends it: ``intent`` ``{}`` plus ``archive``."""
    return client.post(
        RESTORE,
        files={
            "intent": (None, "{}", "application/json"),
            "archive": ("bookvie-export-2026-10-30.zip", archive, "application/zip"),
        },
    )


def covers_in(data_dir: Path) -> dict[str, bytes]:
    """Every file in ``covers/``, by name."""
    return {p.name: p.read_bytes() for p in sorted((data_dir / "covers").iterdir())}


def staging_in(data_dir: Path) -> list[str]:
    """The names directly inside ``.staging/``."""
    return sorted(p.name for p in (data_dir / ".staging").iterdir())


class RecordingFs(OsFileSystem):
    """Logs each rename and delete as ``"<op> <path relative to data_dir>"``."""

    def __init__(self, data_dir: Path, log: list[str]) -> None:
        self.data_dir = data_dir
        self.log = log

    def _note(self, op: str, path: Path) -> None:
        relative = Path(os.path.relpath(path, self.data_dir)).as_posix()
        self.log.append(f"{op} {relative}")

    def replace(self, src: Path, dst: Path) -> None:
        super().replace(src, dst)
        self._note("replace", dst)

    def remove(self, path: Path) -> None:
        super().remove(path)
        self._note("remove", path)
