"""Story 3.2 Start reading a book: ``start-reading`` and ``edit-purpose`` (ATDD).

Three red-phase tests, for the criteria whose promise lives on the server
(numbered in the order of epics.md, Story 3.2):

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
- These tests never assert ``upNextBookId``: Story 4.1 decides it (FR-7).
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

RED = "ATDD red phase: Story 3.2 not implemented yet"
GONE_ID = "00000000-0000-4000-8000-000000000000"
NOW = FakeClock(TODAY).now()
"""What ``api_client``'s clock says "now" is: local noon on :data:`TODAY`."""


def _send(client: TestClient, path: str, book_id: str, purpose: str | None):
    """An intent as the Start dialog or the Edit Purpose field sends it."""
    intent = {"bookId": book_id, "purpose": purpose}
    return client.post(
        path, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _fahrenheit_main_and_dune(data_dir: Path) -> tuple[str, str]:
    """Fahrenheit 451 as the Main book at p.120 of 187, and Dune never started."""
    builder = LibraryBuilder()
    fahrenheit = builder.book(
        title="Fahrenheit 451", authors=["Ray Bradbury"], pages=187
    )
    builder.reading(
        fahrenheit, current_page=120, purpose="Read it before the film club"
    )
    builder.main(fahrenheit)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(data_dir)
    return fahrenheit, dune


# --- AC-3: a re-read -------------------------------------------------------------


@pytest.mark.skip(reason=RED)
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

    response = _send(
        api_client(tmp_path), START_READING, dune, "  For the ecology of Arrakis  "
    )

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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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
