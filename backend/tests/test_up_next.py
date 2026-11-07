"""Story 4.1 Keep the interrupted book as Up next: ``start-reading`` moves Up next (ATDD).

The ATDD tests, for the criteria whose promise lives on the server (numbered
in the order of epics.md, Story 4.1):

- AC-1: with a Main book *Y* and no Up next, starting another Book *X* pauses
  *Y* and sets ``upNextBookId`` = *Y*, in the same commit as starting *X* (FR-7).
- AC-3: starting or resuming the Up next Book takes it out of Up next as it
  becomes Main.
- AC-7: the standard intent ACs (TR8) for the extended ``start-reading``.

The displacement lines (AC-2), the Up next pane (AC-4), the empty Main book
card's suggestion (AC-5) and two browser contexts (AC-6) are read in the
browser (``frontend/e2e/up-next.spec.ts``).

The tests pin these names (``start-reading``'s request and answer are Story
3.2's, unchanged):

- With a Main book *Y* (another Book), the commit that starts *X* also sets
  ``upNextBookId`` = *Y*. An earlier Up next *Z* (not *X*) is displaced: it
  is simply no longer ``upNextBookId``. Its Readings are not touched, so a
  paused *Z* is now in Waiting for you and a never-started *Z* is back in the
  catalog (FR-7).
- When *X* is the Up next Book, ``upNextBookId`` becomes *Y*, or ``null``
  with no Main book: *X* is never both Main and Up next (``main_not_up_next``).
- No new error code.
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
    START_READING,
    TODAY,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

RED = "Story 4.1 red phase: start-reading doesn't move Up next yet"
GONE_ID = "00000000-0000-4000-8000-000000000000"
NOW = FakeClock(TODAY).now()
"""What ``api_client``'s clock says "now" is: local noon on :data:`TODAY`."""
PAUSED_ON = "2026-10-20"


def _start(client: TestClient, book_id: str, purpose: str | None):
    """``start-reading`` as the Start dialog sends it."""
    intent = {"bookId": book_id, "purpose": purpose}
    return client.post(
        START_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _fahrenheit(builder: LibraryBuilder) -> str:
    """Fahrenheit 451 at p.120 of 187 with a Purpose (not yet Main)."""
    fahrenheit = builder.book(title="Fahrenheit 451", authors=["Ray Bradbury"], pages=187)
    builder.reading(fahrenheit, current_page=120, purpose="Read it before the film club")
    return fahrenheit


def _paused_dune(builder: LibraryBuilder) -> str:
    """Dune paused at p.120 of 412 since 20 October, with a Purpose."""
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(
        dune,
        start_date="2026-10-01",
        current_page=120,
        purpose="Reread for the ecology of Arrakis",
        last_progress_update="2026-10-19T21:00:00+02:00",
        paused_at=PAUSED_ON,
    )
    return dune


# --- AC-1: the interrupted Main book becomes Up next -----------------------------


@pytest.mark.skip(reason=RED)
def test_ac1_p0_starting_another_book_makes_the_interrupted_main_book_up_next_in_the_same_commit(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    fahrenheit = _fahrenheit(builder)
    builder.main(fahrenheit)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(tmp_path)
    (before,) = stored_book(tmp_path, fahrenheit)["readings"]

    response = _start(api_client(tmp_path), dune, None)

    # The criterion: Fahrenheit 451, interrupted, is Up next.
    assert _stored(tmp_path)["upNextBookId"] == fahrenheit

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    library = _stored(tmp_path)
    assert library["mainBookId"] == dune
    # Paused at its page in the same commit, and nothing else about it changed.
    (paused,) = stored_book(tmp_path, fahrenheit)["readings"]
    assert paused == {**before, "pausedAt": TODAY.isoformat()}
    (started,) = stored_book(tmp_path, dune)["readings"]
    assert started["startDate"] == TODAY.isoformat()
    assert started["currentPage"] == 0
    assert_invariants(tmp_path)


# --- AC-3: the Up next Book leaves Up next as it becomes Main ---------------------


@pytest.mark.skip(reason=RED)
def test_ac3_p0_starting_or_resuming_the_up_next_book_takes_it_out_of_up_next(
    tmp_path: Path,
) -> None:
    # No Main book; Dune, paused, is Up next. Resuming it leaves Up next empty.
    resume_dir = tmp_path / "resume"
    builder = LibraryBuilder()
    dune = _paused_dune(builder)
    builder.up_next(dune)
    builder.write(resume_dir)
    (before,) = stored_book(resume_dir, dune)["readings"]

    response = _start(api_client(resume_dir), dune, "Reread for the ecology of Arrakis")

    # The criterion: Dune is no longer Up next.
    assert _stored(resume_dir)["upNextBookId"] is None

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _stored(resume_dir)["mainBookId"] == dune
    # The same Reading resumes at its page (Story 3.2).
    (resumed,) = stored_book(resume_dir, dune)["readings"]
    assert resumed == {**before, "lastProgressUpdate": NOW.isoformat()}
    assert_invariants(resume_dir)

    # With a Main book: a never-started Up next Dune starts, and the
    # interrupted Main book takes its place as Up next.
    start_dir = tmp_path / "start"
    builder = LibraryBuilder()
    fahrenheit = _fahrenheit(builder)
    builder.main(fahrenheit)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.up_next(dune)
    builder.write(start_dir)

    response = _start(api_client(start_dir), dune, None)

    assert response.status_code == 200
    library = _stored(start_dir)
    assert library["mainBookId"] == dune
    assert library["upNextBookId"] == fahrenheit
    (started,) = stored_book(start_dir, dune)["readings"]
    assert started["currentPage"] == 0
    assert_invariants(start_dir)


# --- AC-7: the standard intent ACs (TR8) for the extended start-reading -------------


def _main_and_up_next(data_dir: Path, up_next: str) -> tuple[str, str, str]:
    """Fahrenheit 451 Main at p.120; Dune Up next (``paused`` or ``never``); Emma never started.

    Returns ``(fahrenheit, dune, emma)``.
    """
    builder = LibraryBuilder()
    fahrenheit = _fahrenheit(builder)
    builder.main(fahrenheit)
    if up_next == "paused":
        dune = _paused_dune(builder)
    else:
        dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.up_next(dune)
    emma = builder.book(title="Emma", authors=["Jane Austen"], pages=400)
    builder.write(data_dir)
    return fahrenheit, dune, emma


@pytest.mark.skip(reason=RED)
def test_ac7_p0_the_extended_start_reading_keeps_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    # Success keeps the invariants on every new branch. First: the Up next Book
    # starts while another Book is Main.
    data_dir = tmp_path / "up-next-starts"
    fahrenheit, dune, _emma = _main_and_up_next(data_dir, "paused")

    response = _start(api_client(data_dir), dune, None)

    # The criterion: accepted (today the commit breaks main_not_up_next: 500).
    assert response.status_code == 200

    assert response.json() == {"ok": True}
    library = _stored(data_dir)
    assert (library["mainBookId"], library["upNextBookId"]) == (dune, fahrenheit)
    assert_invariants(data_dir)

    # Another Book displaces the Up next, paused or never started: its
    # Readings stay as they were, and the interrupted Main book is Up next.
    for up_next in ("paused", "never"):
        data_dir = tmp_path / f"displaces-{up_next}"
        fahrenheit, dune, emma = _main_and_up_next(data_dir, up_next)
        dune_before = stored_book(data_dir, dune)

        response = _start(api_client(data_dir), emma, "For the ball at Box Hill")

        assert response.status_code == 200, up_next
        library = _stored(data_dir)
        assert (library["mainBookId"], library["upNextBookId"]) == (emma, fahrenheit), up_next
        assert stored_book(data_dir, dune) == dune_before, up_next
        assert_invariants(data_dir)

    # A fault at write, fsync or rename commits nothing: not the start, not the
    # pause, and not the move of Up next (one commit).
    for step in ("write", "fsync", "replace"):
        for target in ("dune", "emma"):
            data_dir = tmp_path / f"fault-{step}-{target}"
            fahrenheit, dune, emma = _main_and_up_next(data_dir, "paused")
            before = library_bytes(data_dir)

            response = _start(
                api_client(data_dir, fs=FaultyFs(step)), dune if target == "dune" else emma, None
            )

            assert response.status_code == 503, (step, target)
            assert response.json() == COULDNT_SAVE_BODY, (step, target)
            assert library_bytes(data_dir) == before, (step, target)

    # A Book that no longer exists is refused, and Up next stays as it was.
    data_dir = tmp_path / "gone"
    _main_and_up_next(data_dir, "paused")
    before = library_bytes(data_dir)
    gone = _start(api_client(data_dir), GONE_ID, "Anything")
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before

    # No new error code; the intent is still in the contract (AD-8).
    assert START_READING in create_app().openapi()["paths"]
