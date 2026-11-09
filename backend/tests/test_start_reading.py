"""Story 3.2 Start reading a book: ``start-reading`` and ``edit-purpose`` (ATDD).

The ATDD tests, for the criteria whose promise lives on the server
(numbered in the order of epics.md, Story 3.2), then the green-phase tests:
RDG-API-001's state matrix, resume under a Main book, malformed intents and
``edit-purpose``'s own rules.

ATDD:

- AC-3: starting a finished Book creates a new Reading (a re-read) and leaves
  the earlier Readings as they were.
- AC-4: ``start-reading`` for the Main book is refused with 409
  ``already_main``, and nothing changes (AD-9).
- AC-11: the standard intent ACs (TR8) for ``start-reading`` and
  ``edit-purpose``.

The Start dialog, Resume, the pause line, Cancel, the spine popover and Edit
Purpose are read in the browser (``frontend/e2e/start-reading.spec.ts``).

The tests pin these names:

- ``POST /api/intents/start-reading``, ``multipart/form-data`` with a JSON
  part named ``intent`` holding ``{"bookId": ..., "purpose": ...}``, as
  ``set-spine-color`` does. ``purpose`` is required and nullable; the server
  trims it and stores ``null`` when nothing is left. Success is exactly
  ``{ok: true}``.
- ``POST /api/intents/edit-purpose``, the same shape, for the Book's current
  (active or paused) Reading.
- A new Reading: ``startDate`` = today, ``currentPage`` 0, the Purpose,
  ``lastProgressUpdate`` = now, every other field ``null``. With a Main book,
  the same commit pauses its Reading at its page with ``pausedAt`` = today.
- ``upNextBookId`` follows FR-7 (Story 4.1): the interrupted Main book becomes
  Up next; with no Main book it stays, except that the started Book leaves it.
  The state matrix covers it; ``test_up_next.py`` holds the Story 4.1 criteria.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    EDIT_PURPOSE,
    START_READING,
    TODAY,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"
NOW = FakeClock(TODAY).now()
"""What ``api_client``'s clock says "now" is: local noon on :data:`TODAY`."""


def _send(client: TestClient, path: str, book_id: str, purpose: str | None):
    """An intent as the Start dialog or the Edit Purpose field sends it."""
    intent = {"bookId": book_id, "purpose": purpose}
    return client.post(path, files={"intent": (None, json.dumps(intent), "application/json")})


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _fahrenheit_main_and_dune(data_dir: Path) -> tuple[str, str]:
    """Fahrenheit 451 as the Main book at p.120 of 187, and Dune never started."""
    builder = LibraryBuilder()
    fahrenheit = builder.book(title="Fahrenheit 451", authors=["Ray Bradbury"], pages=187)
    builder.reading(fahrenheit, current_page=120, purpose="Read it before the film club")
    builder.main(fahrenheit)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(data_dir)
    return fahrenheit, dune


# --- AC-3: a re-read -------------------------------------------------------------


def test_ac3_p0_starting_a_finished_book_creates_a_new_reading_and_keeps_the_earlier_ones(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(
        dune,
        start_date="2026-03-01",
        current_page=412,
        purpose="Before the film",
        finish_date="2026-04-10",
        finished_pages=412,
        purpose_fulfilled="yes",
        rating=4,
    )
    builder.write(tmp_path)
    (earlier,) = stored_book(tmp_path, dune)["readings"]

    response = _send(api_client(tmp_path), START_READING, dune, "  For the ecology of Arrakis  ")

    # The criterion: a second Reading, the re-read.
    readings = stored_book(tmp_path, dune)["readings"]
    assert len(readings) == 2

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert readings[0] == earlier
    reread = readings[1]
    assert reread["id"] != earlier["id"]
    assert reread["startDate"] == TODAY.isoformat()
    assert reread["currentPage"] == 0
    assert reread["purpose"] == "For the ecology of Arrakis"
    assert reread["lastProgressUpdate"] == NOW.isoformat()
    for key in (
        "pausedAt",
        "finishDate",
        "finishedPages",
        "purposeFulfilled",
        "rating",
    ):
        assert reread[key] is None, key
    assert _stored(tmp_path)["mainBookId"] == dune
    assert_invariants(tmp_path)


# --- AC-4: already Main ----------------------------------------------------------


def test_ac4_p1_start_reading_for_the_main_book_is_refused_with_already_main(
    tmp_path: Path,
) -> None:
    fahrenheit, _dune = _fahrenheit_main_and_dune(tmp_path)
    before = library_bytes(tmp_path)

    response = _send(api_client(tmp_path), START_READING, fahrenheit, "A second go")

    assert response.status_code == 409

    body = response.json()["error"]
    assert body["kind"] == "refusal"
    assert body["code"] == "already_main"
    assert body["message"]
    assert library_bytes(tmp_path) == before

    # A new code is in the AD-9 enum (AD-8).
    schema = create_app().openapi()
    assert "already_main" in schema["components"]["schemas"]["ErrorCode"]["enum"]


# --- AC-11: the standard intent guarantees (TR8) ---------------------------------


def test_ac11_p0_start_reading_and_edit_purpose_keep_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    # A fault at write, fsync or rename commits nothing: not the start, and not
    # the pause of the Main book that goes with it (one commit).
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        fahrenheit, dune = _fahrenheit_main_and_dune(data_dir)
        before = library_bytes(data_dir)
        client = api_client(data_dir, fs=FaultyFs(step))

        response = _send(client, START_READING, dune, "Why Arrakis")

        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(data_dir) == before, step

        response = _send(client, EDIT_PURPOSE, fahrenheit, "For the film club, again")
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(data_dir) == before, step

    # Success keeps the invariants. Starting Dune pauses Fahrenheit 451 at its
    # page, with pausedAt = today, in the same commit.
    data_dir = tmp_path / "ok"
    fahrenheit, dune = _fahrenheit_main_and_dune(data_dir)
    client = api_client(data_dir)

    response = _send(client, START_READING, dune, None)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _stored(data_dir)["mainBookId"] == dune
    (paused,) = stored_book(data_dir, fahrenheit)["readings"]
    assert paused["currentPage"] == 120
    assert paused["pausedAt"] == TODAY.isoformat()
    assert paused["finishDate"] is None
    (started,) = stored_book(data_dir, dune)["readings"]
    assert started["purpose"] is None
    assert_invariants(data_dir)

    # edit-purpose stores the trimmed Purpose on the active Reading, and on a
    # paused one; an empty Purpose is stored as null.
    for book_id, purpose, stored in (
        (dune, "  Why Arrakis  ", "Why Arrakis"),
        (dune, "   ", None),
        (fahrenheit, "For the film club", "For the film club"),
    ):
        response = _send(client, EDIT_PURPOSE, book_id, purpose)
        assert response.status_code == 200, purpose
        assert response.json() == {"ok": True}, purpose
        (reading,) = stored_book(data_dir, book_id)["readings"]
        assert reading["purpose"] == stored, purpose
        assert_invariants(data_dir)

    # A Book that no longer exists is refused by both, and nothing changes.
    before = library_bytes(data_dir)
    for path in (START_READING, EDIT_PURPOSE):
        gone = _send(client, path, GONE_ID, "Anything")
        assert gone.status_code == 409, path
        assert gone.json()["error"]["code"] == "book_not_found", path
        assert library_bytes(data_dir) == before, path

    # Both intents are in the contract (AD-8).
    paths = create_app().openapi()["paths"]
    assert START_READING in paths
    assert EDIT_PURPOSE in paths


# --- Green phase: RDG-API-001's state matrix, resume under a Main book ----------

FINISHED = {
    "start_date": "2026-03-01",
    "current_page": 412,
    "finish_date": "2026-04-10",
    "finished_pages": 412,
}


def _seed(
    data_dir: Path, state: str, with_main: bool, up_next: str = "none"
) -> tuple[str, str | None]:
    """Dune in ``state`` (never, finished, paused, main), plus Fahrenheit 451 as Main.

    ``up_next`` is ``none``, ``dune`` (Dune is Up next) or ``other`` (Emma, never
    started, is Up next).
    """
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    if state in ("finished", "paused", "main"):
        builder.reading(dune, **FINISHED)
    if state in ("paused", "main"):
        builder.reading(
            dune,
            start_date="2026-10-01",
            current_page=120,
            purpose="Old purpose",
            last_progress_update="2026-10-20T09:00:00+02:00",
            paused_at="2026-10-20",
        )
    fahrenheit = None
    if with_main and state != "main":
        fahrenheit = builder.book(title="Fahrenheit 451", authors=["Ray Bradbury"], pages=187)
        builder.reading(fahrenheit, current_page=120)
        builder.main(fahrenheit)
    if state == "main":
        builder.main(dune)
    if up_next == "dune":
        builder.up_next(dune)
    elif up_next == "other":
        builder.up_next(builder.book(title="Emma", authors=["Jane Austen"], pages=400))
    builder.write(data_dir)
    return dune, fahrenheit


@pytest.mark.parametrize("up_next", ["none", "dune", "other"], ids=lambda u: f"up-next-{u}")
@pytest.mark.parametrize("with_main", [False, True], ids=["no-main", "with-main"])
@pytest.mark.parametrize("state", ["never", "finished", "paused"])
def test_start_reading_across_the_state_matrix(
    tmp_path: Path, state: str, with_main: bool, up_next: str
) -> None:
    dune, fahrenheit = _seed(tmp_path, state, with_main, up_next)
    up_next_before = _stored(tmp_path)["upNextBookId"]
    before = stored_book(tmp_path, dune)["readings"]
    fahrenheit_before = stored_book(tmp_path, fahrenheit)["readings"] if fahrenheit else None
    other_before = stored_book(tmp_path, up_next_before) if up_next == "other" else None

    response = _send(api_client(tmp_path), START_READING, dune, "  New purpose ")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    library = _stored(tmp_path)
    assert library["mainBookId"] == dune
    readings = stored_book(tmp_path, dune)["readings"]
    if state == "paused":
        # The same Reading resumes: id, page, startDate and pausedAt kept.
        assert len(readings) == len(before)
        assert readings[0] == before[0]
        resumed, old = readings[-1], before[-1]
        assert resumed == {
            **old,
            "lastProgressUpdate": NOW.isoformat(),
            "purpose": "New purpose",
        }
    else:
        # A new Reading is appended; earlier ones are byte-for-byte the same.
        assert len(readings) == len(before) + 1
        assert readings[:-1] == before
        assert readings[-1]["startDate"] == TODAY.isoformat()
        assert readings[-1]["currentPage"] == 0
        assert readings[-1]["purpose"] == "New purpose"
        assert readings[-1]["lastProgressUpdate"] == NOW.isoformat()
    unfinished = [r for r in readings if r["finishDate"] is None]
    assert len(unfinished) == 1
    if fahrenheit is not None:
        (paused,) = stored_book(tmp_path, fahrenheit)["readings"]
        assert paused == {**fahrenheit_before[0], "pausedAt": TODAY.isoformat()}
    # FR-7: the interrupted Main book is Up next; with none, Dune leaves Up
    # next and any other Up next stays.
    if fahrenheit is not None:
        assert library["upNextBookId"] == fahrenheit
    elif up_next == "dune":
        assert library["upNextBookId"] is None
    else:
        assert library["upNextBookId"] == up_next_before
    # A displaced (or kept) other Up next is byte-for-byte the same Book.
    if other_before is not None:
        assert stored_book(tmp_path, up_next_before) == other_before
    assert_invariants(tmp_path)


def test_start_reading_for_the_main_book_with_history_is_already_main(tmp_path: Path) -> None:
    dune, _ = _seed(tmp_path, "main", with_main=False)
    before = library_bytes(tmp_path)
    response = _send(api_client(tmp_path), START_READING, dune, None)
    assert response.status_code == 409
    assert response.json()["error"] == {
        "kind": "refusal",
        "code": "already_main",
        "message": "This book is already your Main book.",
    }
    assert library_bytes(tmp_path) == before


def test_start_reading_and_edit_purpose_with_a_malformed_intent_are_422(tmp_path: Path) -> None:
    dune, _ = _seed(tmp_path, "never", with_main=False)
    before = library_bytes(tmp_path)
    client = api_client(tmp_path)
    for path in (START_READING, EDIT_PURPOSE):
        for intent in ({"bookId": dune}, {"bookId": dune, "purpose": 3}, {"purpose": None}):
            response = client.post(
                path, files={"intent": (None, json.dumps(intent), "application/json")}
            )
            assert response.status_code == 422, (path, intent)
            assert response.json()["error"]["fields"][0]["field"] == "intent"
    assert library_bytes(tmp_path) == before


def test_edit_purpose_keeps_last_progress_update_and_everything_else(tmp_path: Path) -> None:
    dune, _ = _seed(tmp_path, "paused", with_main=True)
    before = stored_book(tmp_path, dune)
    library_before = _stored(tmp_path)

    response = _send(api_client(tmp_path), EDIT_PURPOSE, dune, " Why Arrakis ")

    assert response.status_code == 200
    after = stored_book(tmp_path, dune)
    assert after["readings"][0] == before["readings"][0]
    assert after["readings"][1] == {**before["readings"][1], "purpose": "Why Arrakis"}
    library = _stored(tmp_path)
    assert library["mainBookId"] == library_before["mainBookId"]
    assert_invariants(tmp_path)


def test_edit_purpose_without_a_current_reading_is_reading_already_finished(
    tmp_path: Path,
) -> None:
    for state in ("never", "finished"):
        data_dir = tmp_path / state
        dune, _ = _seed(data_dir, state, with_main=False)
        before = library_bytes(data_dir)
        response = _send(api_client(data_dir), EDIT_PURPOSE, dune, "Anything")
        assert response.status_code == 409, state
        assert response.json()["error"] == {
            "kind": "refusal",
            "code": "reading_already_finished",
            "message": "This reading is already finished.",
        }, state
        assert library_bytes(data_dir) == before, state
    schema = create_app().openapi()
    assert "reading_already_finished" in schema["components"]["schemas"]["ErrorCode"]["enum"]


# --- Epic 4 retro item 35: the page a Reading starts at ----------------------------


def _with_page(client: TestClient, book_id: str, page: int):
    intent = {"bookId": book_id, "purpose": None, "page": page}
    return client.post(
        START_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def test_item35_p0_a_new_reading_stores_the_page_it_starts_at(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    kindred = builder.book(title="Kindred", pages=330)
    builder.write(tmp_path)

    assert _with_page(api_client(tmp_path), kindred, 300).status_code == 200

    (reading,) = stored_book(tmp_path, kindred)["readings"]
    assert (reading["startPage"], reading["currentPage"]) == (300, 300)


def test_item35_p0_a_new_reading_without_a_page_starts_at_0(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    kindred = builder.book(title="Kindred", pages=330)
    builder.write(tmp_path)

    assert _send(api_client(tmp_path), START_READING, kindred, None).status_code == 200

    (reading,) = stored_book(tmp_path, kindred)["readings"]
    assert (reading["startPage"], reading["currentPage"]) == (0, 0)


def test_item35_p0_resuming_with_a_page_keeps_the_start_page(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    kindred = builder.book(title="Kindred", pages=330)
    builder.reading(kindred, start_page=40, current_page=120, paused_at="2026-10-01")
    builder.write(tmp_path)

    assert _with_page(api_client(tmp_path), kindred, 200).status_code == 200

    (reading,) = stored_book(tmp_path, kindred)["readings"]
    assert (reading["startPage"], reading["currentPage"]) == (40, 200)


def test_item35_p1_no_view_exposes_the_start_page(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    kindred = builder.book(title="Kindred", pages=330)
    builder.reading(kindred, start_page=40, current_page=120)
    builder.main(kindred)
    builder.write(tmp_path)
    client = api_client(tmp_path)

    for path in ("/api/views/home", "/api/views/catalog", f"/api/views/book?id={kindred}"):
        response = client.get(path)
        assert response.status_code == 200, path
        assert "startPage" not in response.text, path
    assert "startPage" not in json.dumps(create_app().openapi())
