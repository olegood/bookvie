"""Story 2.1: export all data with one click (FR-22, AD-4, AD-14, AD-15).

Tests for the three server-side acceptance criteria (numbered in the
order of epics.md, Story 2.1): AC-3 what the zip holds and when the lock is
held, AC-5 when "Last export" is recorded, AC-6 a failed export. AC-1, AC-2 and
AC-4 are the Backup page, in ``frontend/e2e/backup.spec.ts``.

The tests pin these names:

- ``GET /api/export`` answers ``application/zip``: exactly ``library.json``
  and ``covers/`` (a directory entry, even when empty) and the covers in it.
- ``local-state.json`` in the data folder is ``{"lastExportAt": <ISO-8601>}``,
  the injected clock's ``now()``, written only after the last byte went out
  with no client disconnect (decided with Oleg, 2026-11-03).
- A read failure is 503 ``{kind, code: "couldnt_export", message: "Couldn't
  export. Your data wasn't changed."}`` before any 200 header is sent.

:func:`_run` drives the app the way uvicorn 0.54 does (ASGI spec 2.3): once
the client is gone, ``send`` returns without sending, and only ``receive``
says ``http.disconnect``. ``TestClient`` buffers the whole response, so it
can't abort a download halfway.
"""

import asyncio
import io
import json
import os
import random
import threading
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.types import ASGIApp, Message

from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_ID,
    FaultyFs,
    api_client,
    image_bytes,
    library_bytes,
)

EXPORT = "/api/export"
COULDNT_EXPORT_MESSAGE = "Couldn't export. Your data wasn't changed."

LOCAL_STATE = "local-state.json"
LAST_EXPORT_NOW = "2026-10-30T12:00:00+01:00"
"""``FakeClock(TODAY).now()`` in Europe/Madrid, as ``lastExportAt`` stores it."""
EARLIER_EXPORT = b'{"lastExportAt": "2026-10-01T09:30:00+02:00"}'
"""A previous export's record, which a failed, aborted or HEAD export must keep."""

COVER_NAME = f"{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
BIG_COVER_BYTES = 1024 * 1024
"""Large and incompressible, so the zip can't go out as one body message."""


EXPORT_HEADERS = {"X-Bookvie-Export": "1"}
"""What the app's own export ``fetch`` sends; the guard refuses an export without it (AD-16)."""


def _client(data_dir: Path, fs: FaultyFs | None = None) -> TestClient:
    """:func:`api_client` sending :data:`EXPORT_HEADERS` on every request."""
    client = api_client(data_dir, fs)
    client.headers.update(EXPORT_HEADERS)
    return client


def _seed_rich_library(data_dir: Path, *, cover: bytes | None = None) -> bytes:
    """Dune with a stored cover and a back-filled Reading, plus an unread Book.

    Returns the cover's bytes as stored.
    """
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=f"covers/{COVER_NAME}",
        spine_color_from_cover="#A85A4A",
        readings=[
            {
                "startDate": None,
                "currentPage": 412,
                "lastProgressUpdate": None,
                "finishDate": "2025-03-14",
                "finishedPages": 412,
            }
        ],
    )
    builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.write(data_dir)
    stored = cover if cover is not None else image_bytes(fmt="JPEG")
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / "covers" / COVER_NAME).write_bytes(stored)
    return stored


def _incompressible(size: int) -> bytes:
    return random.Random(2026).randbytes(size)


def _local_state(data_dir: Path) -> bytes | None:
    path = data_dir / LOCAL_STATE
    return path.read_bytes() if path.exists() else None


def _last_export_at(data_dir: Path) -> str | None:
    raw = _local_state(data_dir)
    return None if raw is None else json.loads(raw).get("lastExportAt")


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


@dataclass
class Run:
    messages: list[Message] = field(default_factory=list)
    aborted: bool = False

    @property
    def statuses(self) -> list[int]:
        return [
            m["status"] for m in self.messages if m["type"] == "http.response.start"
        ]

    @property
    def body(self) -> bytes:
        return b"".join(
            m.get("body", b"")
            for m in self.messages
            if m["type"] == "http.response.body"
        )


def _run(
    app: ASGIApp,
    method: str = "GET",
    *,
    abort_after_first_chunk: bool = False,
    log: list[str] | None = None,
) -> Run:
    """One request to ``EXPORT``, served the way uvicorn 0.54 serves it.

    With ``abort_after_first_chunk`` the client goes away after the first body
    message that says more is coming. Each ``send`` yields to the event loop,
    as uvicorn's flow control does, so a task waiting on ``receive`` can run.
    """
    run = Run()
    gone = asyncio.Event()
    request_read = False

    async def receive() -> Message:
        nonlocal request_read
        if not request_read:
            request_read = True
            return {"type": "http.request", "body": b"", "more_body": False}
        await gone.wait()
        return {"type": "http.disconnect"}

    async def send(message: Message) -> None:
        await asyncio.sleep(0)
        if gone.is_set():
            return
        run.messages.append(message)
        if log is not None:
            log.append(message["type"])
        if message["type"] != "http.response.body":
            return
        if not message.get("more_body", False):
            gone.set()  # complete: uvicorn answers receive() with a disconnect
        elif abort_after_first_chunk:
            run.aborted = True
            gone.set()

    scope: dict[str, Any] = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": EXPORT,
        "raw_path": EXPORT.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [
            (b"host", b"127.0.0.1:8765"),
            (b"accept", b"*/*"),
            *((k.lower().encode(), v.encode()) for k, v in EXPORT_HEADERS.items()),
        ],
        "client": ("127.0.0.1", 50000),
        "server": ("127.0.0.1", 8765),
        "state": {},
    }
    asyncio.run(app(scope, receive, send))
    return run


# --- AC-3: one zip with exactly library.json and covers/, built under the lock --


def test_ac3_p0_export_is_one_zip_of_library_json_and_covers_built_under_the_lock(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "rich"
    cover = _seed_rich_library(data_dir)
    client = _client(data_dir)
    # Neither the export record nor restore scratch belongs in an export (AD-15, AD-14).
    (data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    (data_dir / ".staging" / "leftover.json").write_bytes(b"{}")

    response = client.get(EXPORT)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    assert sorted(archive.namelist()) == [
        "covers/",
        f"covers/{COVER_NAME}",
        "library.json",
    ]
    assert archive.getinfo("covers/").is_dir()
    assert archive.read("library.json") == library_bytes(data_dir)
    assert archive.read(f"covers/{COVER_NAME}") == cover

    # No covers: covers/ is still there, as an empty directory entry.
    bare_dir = tmp_path / "bare"
    builder = LibraryBuilder()
    builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.write(bare_dir)

    bare = _client(bare_dir).get(EXPORT)

    assert bare.status_code == 200
    bare_archive = zipfile.ZipFile(io.BytesIO(bare.content))
    assert sorted(bare_archive.namelist()) == ["covers/", "library.json"]
    assert bare_archive.getinfo("covers/").is_dir()

    # AD-4 then AD-14: the zip is built under the store lock, which is released
    # before the first header goes out.
    log: list[str] = []
    app = api_client(data_dir).app
    lock = RecordingLock(log)
    app.state.store.lock = lock
    app.state.write_lock = lock

    run = _run(app, log=log)

    assert run.statuses == [200]
    assert log[:3] == ["lock acquired", "lock released", "http.response.start"]
    assert log.count("lock acquired") == 1


# --- AC-5: "Last export" is a complete download, recorded outside the export ----


def test_ac5_p1_only_a_complete_download_records_last_export_in_local_state(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "complete"
    _seed_rich_library(data_dir)
    app = api_client(data_dir).app
    library_before = library_bytes(data_dir)

    _run(app)

    assert _last_export_at(data_dir) == LAST_EXPORT_NOW
    assert json.loads(_local_state(data_dir) or b"null") == {
        "lastExportAt": LAST_EXPORT_NOW
    }
    assert library_bytes(data_dir) == library_before

    # A client that goes away halfway records nothing.
    aborted_dir = tmp_path / "aborted"
    _seed_rich_library(aborted_dir, cover=_incompressible(BIG_COVER_BYTES))
    aborted_app = api_client(aborted_dir).app
    (aborted_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    run = _run(aborted_app, abort_after_first_chunk=True)

    assert run.statuses == [200]
    assert run.aborted, "the export must go out in more than one body message"
    assert _local_state(aborted_dir) == EARLIER_EXPORT

    # Neither does a HEAD request, with or without an earlier record.
    head_dir = tmp_path / "head"
    _seed_rich_library(head_dir)
    head_client = _client(head_dir)

    head = head_client.head(EXPORT)

    # The route is GET-only: HEAD falls through to the SPA catch-all's 404.
    assert head.status_code == 404
    assert _local_state(head_dir) is None
    (head_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    head_client.head(EXPORT)

    assert _local_state(head_dir) == EARLIER_EXPORT


# --- AC-6: a failed export is a 503 before any header, and changes nothing ------


@pytest.mark.skipif(os.geteuid() == 0, reason="root can read a chmod 000 cover")
def test_ac6_p1_an_unreadable_cover_fails_the_export_with_503_couldnt_export(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "unreadable"
    _seed_rich_library(data_dir)
    client = _client(data_dir)
    (data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    library_before = library_bytes(data_dir)
    cover = data_dir / "covers" / COVER_NAME
    cover.chmod(0o000)
    try:
        run = _run(client.app)
    finally:
        cover.chmod(0o644)

    # The failure happens while the zip is built: no 200 header went out first.
    assert run.statuses == [503]
    assert json.loads(run.body) == {
        "error": {
            "kind": "couldnt_export",
            "code": "couldnt_export",
            "message": COULDNT_EXPORT_MESSAGE,
        }
    }
    assert _local_state(data_dir) == EARLIER_EXPORT
    assert library_bytes(data_dir) == library_before

    # couldnt_export is in the AD-9 enums, and the route documents its 503.
    schema = client.app.openapi()
    assert "couldnt_export" in schema["components"]["schemas"]["ErrorKind"]["enum"]
    assert "couldnt_export" in schema["components"]["schemas"]["ErrorCode"]["enum"]
    assert "503" in schema["paths"][EXPORT]["get"]["responses"]


# --- Follow-ups: the download name, a missing cover, a failed record ------------


def test_export_is_named_for_today_and_streams_in_64k_chunks(tmp_path: Path) -> None:
    data_dir = tmp_path / "named"
    _seed_rich_library(data_dir, cover=_incompressible(BIG_COVER_BYTES))
    app = api_client(data_dir).app

    run = _run(app)

    (start,) = [m for m in run.messages if m["type"] == "http.response.start"]
    headers = {name.decode(): value.decode() for name, value in start["headers"]}
    assert headers["content-type"] == "application/zip"
    assert headers["content-disposition"] == 'attachment; filename="bookvie-export-2026-10-30.zip"'
    assert int(headers["content-length"]) == len(run.body)
    bodies = [m for m in run.messages if m["type"] == "http.response.body"]
    assert all(len(m["body"]) <= 64 * 1024 for m in bodies)
    assert len(bodies) > BIG_COVER_BYTES // (64 * 1024)
    assert bodies[-1] == {"type": "http.response.body", "body": b"", "more_body": False}
    archive = zipfile.ZipFile(io.BytesIO(run.body))
    assert archive.getinfo(f"covers/{COVER_NAME}").compress_type == zipfile.ZIP_STORED


def test_a_cover_older_than_1980_still_exports(tmp_path: Path) -> None:
    data_dir = tmp_path / "old"
    cover = _seed_rich_library(data_dir)
    client = _client(data_dir)
    os.utime(data_dir / "covers" / COVER_NAME, (0, 0))

    response = client.get(EXPORT)

    assert response.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    assert archive.read(f"covers/{COVER_NAME}") == cover
    assert archive.getinfo(f"covers/{COVER_NAME}").date_time == (1980, 1, 1, 0, 0, 0)


def test_unreferenced_and_temp_files_are_not_exported(tmp_path: Path) -> None:
    data_dir = tmp_path / "strays"
    _seed_rich_library(data_dir)
    client = _client(data_dir)
    # Written after startup, so the sweep hasn't removed them.
    (data_dir / "covers" / "stray.jpg").write_bytes(b"x")
    (data_dir / "covers" / f"{COVER_NAME}.tmpabc").write_bytes(b"x")
    (data_dir / "library.json.tmpabc").write_bytes(b"x")

    archive = zipfile.ZipFile(io.BytesIO(client.get(EXPORT).content))

    assert sorted(archive.namelist()) == ["covers/", f"covers/{COVER_NAME}", "library.json"]


def test_a_missing_cover_fails_the_export_with_503(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir = tmp_path / "missing"
    _seed_rich_library(data_dir)
    client = _client(data_dir)
    (data_dir / "covers" / COVER_NAME).unlink()

    response = client.get(EXPORT)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "couldnt_export"
    assert _local_state(data_dir) is None
    assert "bookvie: couldn't export" in capsys.readouterr().err


@pytest.mark.parametrize("step", ["create_temp", "write", "fsync", "replace"])
def test_a_failed_record_is_logged_and_the_download_still_succeeds(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], step: str
) -> None:
    data_dir = tmp_path / "faulty"
    _seed_rich_library(data_dir)
    (data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    app = api_client(data_dir, FaultyFs(step)).app

    run = _run(app)

    assert run.statuses == [200]
    assert zipfile.ZipFile(io.BytesIO(run.body)).namelist()
    assert _local_state(data_dir) == EARLIER_EXPORT
    assert sorted(p.name for p in data_dir.iterdir()) == [
        ".staging",
        "covers",
        "library.json",
        LOCAL_STATE,
    ]
    assert "bookvie: couldn't record the export" in capsys.readouterr().err


def test_export_changes_nothing_in_the_data_folder_but_local_state(tmp_path: Path) -> None:
    data_dir = tmp_path / "unchanged"
    _seed_rich_library(data_dir)
    app = api_client(data_dir).app

    def snapshot() -> dict[str, bytes]:
        return {
            str(p.relative_to(data_dir)): p.read_bytes()
            for p in sorted(data_dir.rglob("*"))
            if p.is_file() and p.name != LOCAL_STATE
        }

    before = snapshot()
    _run(app)

    assert snapshot() == before
    assert _last_export_at(data_dir) == LAST_EXPORT_NOW


# --- The export header guard, a crash mid-build, an unreadable record ----------


@pytest.mark.parametrize(
    "headers",
    [
        [],
        [("X-Bookvie-Export", "0")],
        [("X-Bookvie-Export", "")],
        [("X-Bookvie-Export", "1"), ("X-Bookvie-Export", "1")],
        [("X-Bookvie-Export", "1"), ("Sec-Fetch-Site", "cross-site")],
        [("Sec-Fetch-Site", "same-origin")],
    ],
    ids=["missing", "zero", "empty", "twice", "cross-site", "fetch-site-only"],
)
def test_an_export_without_the_apps_export_header_is_refused_and_records_nothing(
    tmp_path: Path, headers: list[tuple[str, str]]
) -> None:
    # /api/export is the only GET route with a side effect, so AD-16 requires
    # X-Bookvie-Export there: a cross-site <img> or no-cors GET can't set it,
    # even from a browser too old to send Sec-Fetch-Site.
    data_dir = tmp_path / "guarded"
    _seed_rich_library(data_dir)
    client = api_client(data_dir)
    (data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)

    refused = client.get(EXPORT, headers=headers)

    assert refused.status_code == 403
    assert refused.headers["content-type"].startswith("text/plain")
    assert _local_state(data_dir) == EARLIER_EXPORT


@pytest.mark.parametrize("site", [None, "same-origin", "none"])
def test_an_export_with_the_header_is_served_and_recorded_in_any_browser(
    tmp_path: Path, site: str | None
) -> None:
    # None is a browser too old to send Sec-Fetch-Site (Safari < 16.4); "none"
    # a typed URL or a script.
    data_dir = tmp_path / "own"
    _seed_rich_library(data_dir)
    client = api_client(data_dir)
    headers = dict(EXPORT_HEADERS) | ({"Sec-Fetch-Site": site} if site else {})

    own = client.get(EXPORT, headers=headers)

    assert own.status_code == 200
    assert _last_export_at(data_dir) == LAST_EXPORT_NOW


def test_an_unexpected_build_error_releases_the_lock_and_closes_the_spool(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A held lock would freeze every later intent; a leaked spool holds memory or a temp file.
    import bookvie.intents.export as export_module

    data_dir = tmp_path / "crash"
    _seed_rich_library(data_dir)
    client = _client(data_dir)
    store = client.app.state.store
    (data_dir / LOCAL_STATE).write_bytes(EARLIER_EXPORT)
    spools: list[Any] = []
    real_spool = export_module.SpooledTemporaryFile

    def tracked_spool(*args: Any, **kwargs: Any) -> Any:
        spool = real_spool(*args, **kwargs)
        spools.append(spool)
        return spool

    def boom(_library: object) -> set[str]:
        raise RuntimeError("not an OSError")

    monkeypatch.setattr(export_module, "SpooledTemporaryFile", tracked_spool)
    monkeypatch.setattr(export_module, "referenced_covers", boom)

    crashed = client.get(EXPORT)

    assert crashed.status_code == 500
    assert len(spools) == 1 and spools[0].closed
    assert store.lock.acquire(blocking=False), "the store lock was left held"
    store.lock.release()
    assert _local_state(data_dir) == EARLIER_EXPORT

    monkeypatch.undo()
    assert client.get(EXPORT).status_code == 200
    assert _last_export_at(data_dir) == LAST_EXPORT_NOW


@pytest.mark.skipif(os.geteuid() == 0, reason="root can read a chmod 000 file")
def test_an_unreadable_local_state_reads_as_no_export_and_the_next_export_replaces_it(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    data_dir = tmp_path / "locked-state"
    _seed_rich_library(data_dir)
    client = _client(data_dir)
    state = data_dir / LOCAL_STATE
    state.write_bytes(EARLIER_EXPORT)
    state.chmod(0o000)
    try:
        view = client.get("/api/views/backup")

        assert view.status_code == 200
        assert view.json() == {"lastExportAt": None}
        assert "bookvie: couldn't read local-state.json" in capsys.readouterr().err

        # The atomic rename replaces the file whatever its mode.
        assert _run(client.app).statuses == [200]
    finally:
        state.chmod(0o644)

    assert _last_export_at(data_dir) == LAST_EXPORT_NOW
    assert client.get("/api/views/backup").json() == {"lastExportAt": LAST_EXPORT_NOW}
