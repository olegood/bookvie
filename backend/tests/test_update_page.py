"""Story 3.3 Catch up with one page update: ``update-page`` (ATDD).

The ATDD tests, for the criteria whose promise lives on the server
(numbered in the order of epics.md, Story 3.3):

- AC-4: ``update-page`` at the Book's last page saves the page, leaves the
  Reading unfinished, and answers ``reachedLastPage: true`` (PRG-API-002).
- AC-5: ``update-page`` for a Book that isn't Main (a stale tab) is refused
  with 409 ``not_main_book``, and nothing changes (AD-9).
- AC-8: the standard intent ACs (TR8) for ``update-page``.

The page field, its validation, the status line, the catch-up speed and the
couldn't-save are read in the browser (``frontend/e2e/update-page.spec.ts``).

The tests pin these names:

- ``POST /api/intents/update-page``, ``multipart/form-data`` with a JSON part
  named ``intent`` holding ``{"bookId": ..., "page": <integer>}``, as
  ``start-reading`` does. Success is exactly ``{ok: true}``, plus
  ``reachedLastPage: true`` when the page is the Book's page count.
- It sets the Main book's current Reading's ``currentPage`` to the page and
  ``lastProgressUpdate`` to now, and nothing else. A lower page than before
  is allowed. Only ``finish-reading`` (Story 3.6) ever sets ``finishDate``.
- A page outside 0 to the page count, or anything but a JSON integer, is 422
  ``invalid_fields`` with one ``page`` field: "Page must be between 0 and N."
"""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    TODAY,
    UPDATE_PAGE,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

RED = "ATDD red phase: Story 3.3 not implemented yet"
GONE_ID = "00000000-0000-4000-8000-000000000000"
NOW = FakeClock(TODAY).now()
"""What ``api_client``'s clock says "now" is: local noon on :data:`TODAY`."""
EARLIER = "2026-10-25T21:00:00+01:00"
"""The seeded ``lastProgressUpdate``, before :data:`NOW`."""


def _send(client: TestClient, book_id: str, page: Any):
    """An ``update-page`` as the page field sends it."""
    intent = {"bookId": book_id, "page": page}
    return client.post(
        UPDATE_PAGE, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _left_hand_main_and_dune_paused(data_dir: Path, page: int = 150) -> tuple[str, str]:
    """The Left Hand of Darkness as the Main book at ``page`` of 330; Dune paused at p.120."""
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    builder.reading(
        left_hand,
        start_date="2026-10-01",
        current_page=page,
        purpose="To see how Le Guin builds a world",
        last_progress_update=EARLIER,
    )
    builder.main(left_hand)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(
        dune,
        start_date="2026-09-01",
        current_page=120,
        last_progress_update="2026-10-19T21:00:00+02:00",
        paused_at="2026-10-20",
    )
    builder.write(data_dir)
    return left_hand, dune


# --- AC-4: the last page saves, never finishes -----------------------------------


@pytest.mark.skip(reason=RED)
def test_ac4_p0_update_page_at_the_last_page_saves_it_keeps_the_reading_unfinished_and_says_so(
    tmp_path: Path,
) -> None:
    left_hand, dune = _left_hand_main_and_dune_paused(tmp_path, page=300)
    (before,) = stored_book(tmp_path, left_hand)["readings"]
    dune_before = stored_book(tmp_path, dune)

    response = _send(api_client(tmp_path), left_hand, 330)

    # The criterion: the client is told the last page was reached.
    assert response.json().get("reachedLastPage") is True

    assert response.status_code == 200
    assert response.json() == {"ok": True, "reachedLastPage": True}
    # Saved, and still unfinished: only finish-reading sets finishDate (PRG-API-002).
    (reading,) = stored_book(tmp_path, left_hand)["readings"]
    assert reading == {
        **before,
        "currentPage": 330,
        "lastProgressUpdate": NOW.isoformat(),
    }
    assert reading["finishDate"] is None
    assert reading["finishedPages"] is None
    assert _stored(tmp_path)["mainBookId"] == left_hand
    assert stored_book(tmp_path, dune) == dune_before
    assert_invariants(tmp_path)


# --- AC-5: a stale tab -----------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac5_p1_update_page_for_a_book_that_isnt_main_is_refused_with_not_main_book(
    tmp_path: Path,
) -> None:
    # A stale tab still shows Dune as Main; another tab has since started
    # The Left Hand of Darkness, which paused Dune.
    _left_hand, dune = _left_hand_main_and_dune_paused(tmp_path)
    before = library_bytes(tmp_path)

    response = _send(api_client(tmp_path), dune, 150)

    assert response.status_code == 409

    body = response.json()["error"]
    assert body["kind"] == "refusal"
    assert body["code"] == "not_main_book"
    assert body["message"]
    assert library_bytes(tmp_path) == before

    # A new code is in the AD-9 enum (AD-8).
    schema = create_app().openapi()
    assert "not_main_book" in schema["components"]["schemas"]["ErrorCode"]["enum"]


# --- AC-8: the standard intent guarantees (TR8) ----------------------------------


@pytest.mark.skip(reason=RED)
def test_ac8_p0_update_page_keeps_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    # A fault at write, fsync or rename commits nothing.
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        left_hand, _dune = _left_hand_main_and_dune_paused(data_dir)
        before = library_bytes(data_dir)

        response = _send(api_client(data_dir, fs=FaultyFs(step)), left_hand, 212)

        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(data_dir) == before, step

    # Success keeps the invariants. A lower page than before is allowed, and
    # so is 0; each sets lastProgressUpdate = now and changes nothing else.
    data_dir = tmp_path / "ok"
    left_hand, dune = _left_hand_main_and_dune_paused(data_dir)
    client = api_client(data_dir)
    (before,) = stored_book(data_dir, left_hand)["readings"]
    dune_before = stored_book(data_dir, dune)
    for page in (212, 100, 0):
        response = _send(client, left_hand, page)
        assert response.status_code == 200, page
        assert response.json() == {"ok": True}, page
        (reading,) = stored_book(data_dir, left_hand)["readings"]
        assert reading == {
            **before,
            "currentPage": page,
            "lastProgressUpdate": NOW.isoformat(),
        }, page
        assert _stored(data_dir)["mainBookId"] == left_hand, page
        assert stored_book(data_dir, dune) == dune_before, page
        assert_invariants(data_dir)

    # A Book that no longer exists is refused, and nothing changes.
    before_bytes = library_bytes(data_dir)
    gone = _send(client, GONE_ID, 10)
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before_bytes

    # The intent is in the contract (AD-8).
    assert UPDATE_PAGE in create_app().openapi()["paths"]
