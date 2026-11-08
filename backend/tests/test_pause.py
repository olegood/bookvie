"""Story 4.3 Pause my Main book: the ``pause`` intent (API).

Every row of the spec's I/O matrix, through the real app:

- No Up next: the Main book's Reading gets ``pausedAt`` = today at its page,
  ``mainBookId`` = ``null`` and ``upNextBookId`` = the Book.
- A paused Up next *Z* moves to Waiting for you; an unstarted *Z* goes back to
  the catalog. Only the pointer moves; *Z*'s Readings are not touched.
- A re-pause overwrites ``pausedAt``.
- A stale target (not Main, or no Main book) is 409 ``not_main_book``; a
  deleted Book is 409 ``book_not_found``, checked first.
- A write, fsync or rename fault is 503 ``couldnt_save`` and the file is
  byte-identical.
- ``pausedAt`` survives a resume and a finish.
- An Epic 3 library (a Main and a paused Book, ``upNextBookId: null``) pauses
  cleanly.

The menu, the Confirm dialog, focus and the ``status`` line are read in the
browser (``frontend/e2e/pause.spec.ts``).
"""

import json
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    FINISH_READING,
    PAUSE,
    START_READING,
    TODAY,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"
EARLIER = "2026-10-01"


def _pause(client: TestClient, book_id: str):
    """``pause`` as the Main book card's menu or Book detail sends it."""
    return client.post(
        PAUSE, files={"intent": (None, json.dumps({"bookId": book_id}), "application/json")}
    )


def _start(client: TestClient, book_id: str, purpose: str | None = None):
    intent = {"bookId": book_id, "purpose": purpose}
    return client.post(
        START_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _finish(client: TestClient, book_id: str, finished_on: str):
    intent = {
        "bookId": book_id,
        "finishedOn": finished_on,
        "purposeFulfilled": None,
        "rating": None,
    }
    return client.post(
        FINISH_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _refusal(response) -> str:
    assert response.status_code == 409
    body = response.json()["error"]
    assert body["kind"] == "refusal"
    assert body["message"]
    return body["code"]


def _main_at_150(builder: LibraryBuilder, *, paused_at: str | None = None) -> str:
    """Dune as the Main book at p.150 of 260."""
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=260)
    builder.reading(dune, current_page=150, purpose="Arrakis", paused_at=paused_at)
    builder.main(dune)
    return dune


def _assert_paused_today(data_dir: Path, book_id: str, before: dict) -> None:
    """Only the current Reading's ``pausedAt`` moved, to today."""
    after = stored_book(data_dir, book_id)
    (was,) = [r for r in before["readings"] if r["finishDate"] is None]
    expected = {
        **before,
        "readings": [
            {**r, "pausedAt": TODAY.isoformat()} if r["id"] == was["id"] else r
            for r in before["readings"]
        ],
    }
    assert after == expected


# --- The matrix ------------------------------------------------------------------


def test_p0_pause_with_no_up_next_keeps_the_page_and_makes_the_book_up_next(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    other = builder.book(title="Emma", pages=400)
    builder.write(tmp_path)
    before = stored_book(tmp_path, dune)
    other_before = stored_book(tmp_path, other)

    response = _pause(api_client(tmp_path), dune)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    stored = _stored(tmp_path)
    assert stored["mainBookId"] is None
    assert stored["upNextBookId"] == dune
    _assert_paused_today(tmp_path, dune, before)
    assert stored_book(tmp_path, dune)["readings"][0]["currentPage"] == 150
    assert stored_book(tmp_path, other) == other_before
    assert_invariants(tmp_path)

    body = api_client(tmp_path).get("/api/views/home").json()
    assert body["mainBook"] is None
    assert body["upNext"]["id"] == dune
    assert body["upNext"]["paused"] is True
    assert [w["id"] for w in body["waiting"]] == []


def test_p0_pause_displaces_a_paused_up_next_into_waiting_for_you(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(neuromancer, current_page=40, paused_at=EARLIER)
    builder.up_next(neuromancer)
    builder.write(tmp_path)
    z_before = stored_book(tmp_path, neuromancer)

    response = _pause(api_client(tmp_path), dune)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (None, dune)
    assert stored_book(tmp_path, neuromancer) == z_before
    assert_invariants(tmp_path)
    body = api_client(tmp_path).get("/api/views/home").json()
    assert [w["id"] for w in body["waiting"]] == [neuromancer]
    assert body["upNext"]["id"] == dune


def test_p0_pause_returns_an_unstarted_up_next_to_the_catalog(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.write(tmp_path)
    z_before = stored_book(tmp_path, emma)

    response = _pause(api_client(tmp_path), dune)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (None, dune)
    assert stored_book(tmp_path, emma) == z_before
    assert_invariants(tmp_path)
    shelf = api_client(tmp_path).get("/api/views/catalog").json()["books"]
    (entry,) = [b for b in shelf if b["id"] == emma]
    assert entry["role"] is None


def test_p1_a_re_pause_overwrites_paused_at_with_today(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder, paused_at=EARLIER)
    builder.write(tmp_path)
    before = stored_book(tmp_path, dune)

    response = _pause(api_client(tmp_path), dune)

    assert response.status_code == 200
    _assert_paused_today(tmp_path, dune, before)
    assert stored_book(tmp_path, dune)["readings"][0]["pausedAt"] == TODAY.isoformat()
    assert_invariants(tmp_path)


def test_p0_pause_for_a_book_that_is_not_main_is_refused_with_not_main_book(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    _main_at_150(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=10, paused_at=EARLIER)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    assert _refusal(_pause(api_client(tmp_path), emma)) == "not_main_book"
    assert library_bytes(tmp_path) == before


def test_p0_pause_with_no_main_book_is_refused_with_not_main_book(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=260)
    builder.reading(dune, current_page=150, paused_at=EARLIER)
    builder.up_next(dune)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    assert _refusal(_pause(api_client(tmp_path), dune)) == "not_main_book"
    assert library_bytes(tmp_path) == before


def test_p0_pause_for_a_deleted_book_is_refused_with_book_not_found(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_at_150(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    assert _refusal(_pause(api_client(tmp_path), GONE_ID)) == "book_not_found"
    assert library_bytes(tmp_path) == before


@pytest.mark.parametrize("step", ["write", "fsync", "replace"])
def test_p0_a_save_fault_leaves_the_file_byte_identical(tmp_path: Path, step: str) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _pause(api_client(tmp_path, fs=FaultyFs(step)), dune)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(tmp_path) == before


def test_p1_paused_at_survives_a_resume_and_a_finish(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    builder.write(tmp_path)

    assert _pause(api_client(tmp_path), dune).status_code == 200
    assert stored_book(tmp_path, dune)["readings"][0]["pausedAt"] == TODAY.isoformat()

    # Resumed and finished on later days, so an overwrite with today would show.
    resumed_on = TODAY + timedelta(days=3)
    assert _start(api_client(tmp_path, today=resumed_on), dune, "Arrakis").status_code == 200
    assert _stored(tmp_path)["mainBookId"] == dune
    assert stored_book(tmp_path, dune)["readings"][0]["pausedAt"] == TODAY.isoformat()
    assert_invariants(tmp_path)

    finished_on = TODAY + timedelta(days=7)
    later = api_client(tmp_path, today=finished_on)
    assert _finish(later, dune, finished_on.isoformat()).status_code == 200
    (reading,) = stored_book(tmp_path, dune)["readings"]
    assert reading["finishDate"] == finished_on.isoformat()
    assert reading["pausedAt"] == TODAY.isoformat()
    assert_invariants(tmp_path)


def test_p1_an_epic_3_library_pauses_its_main_book(tmp_path: Path) -> None:
    """A Main and a paused Book with ``upNextBookId: null``, as Epic 3 left them."""
    builder = LibraryBuilder()
    dune = _main_at_150(builder)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(neuromancer, current_page=40, paused_at=EARLIER)
    builder.write(tmp_path)
    assert _stored(tmp_path)["upNextBookId"] is None
    z_before = stored_book(tmp_path, neuromancer)

    response = _pause(api_client(tmp_path), dune)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (None, dune)
    assert stored_book(tmp_path, neuromancer) == z_before
    assert_invariants(tmp_path)
    body = api_client(tmp_path).get("/api/views/home").json()
    assert [w["id"] for w in body["waiting"]] == [neuromancer]
