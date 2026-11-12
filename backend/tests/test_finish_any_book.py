"""Story 4.5 Mark any book finished from its page: ``finish-reading``'s non-Main paths.

FIN-API-002 and the I/O matrix of the Story 4.5 spec:

- a paused Up next, a paused Book Waiting for you and a paused Side read are
  finished: ``mainBookId`` stays, ``upNextBookId`` is cleared when it names
  the Book, and the Book leaves ``sideReadBookIds``;
- a Book with no Readings gets one back-filled Reading (``startDate`` and
  ``purpose`` null, ``currentPage`` = ``finishedPages`` = ``pages``) and is
  drawn as read on the shelf;
- a Book with Readings but none unfinished is refused with 409
  ``reading_already_finished``, Up next or not;
- the 422 field checks run against the paused Reading's start date, or the
  back-fill's missing Purpose;
- the standard intent ACs (TR8) hold on both non-Main paths.

The Book detail offer, the dialog that stays on Book detail, focus and the
announcement are read in the browser (``frontend/e2e/finish-any-book.spec.ts``).
"""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    FINISH_READING,
    TODAY,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

TODAY_ISO = TODAY.isoformat()  # 2026-10-30


def _finish(
    client: TestClient,
    book_id: str,
    finished_on: str = TODAY_ISO,
    purpose_fulfilled: str | None = None,
    rating: int | None = None,
):
    intent: dict[str, Any] = {
        "bookId": book_id,
        "finishedOn": finished_on,
        "purposeFulfilled": purpose_fulfilled,
        "rating": rating,
    }
    return client.post(
        FINISH_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict[str, Any]:
    return json.loads(library_bytes(data_dir))


def _home(client: TestClient) -> dict[str, Any]:
    return client.get("/api/views/home").json()


def _spine(client: TestClient, book_id: str) -> dict[str, Any]:
    (spine,) = [b for b in client.get("/api/views/catalog").json()["books"] if b["id"] == book_id]
    return spine


def _dune_main(builder: LibraryBuilder) -> str:
    dune = builder.book(title="Dune", pages=412)
    builder.reading(dune, current_page=120)
    builder.main(dune)
    return dune


def _paused_up_next(data_dir: Path) -> tuple[str, str]:
    """Main Dune; Up next Neuromancer paused at p.50 with a Purpose, started 2026-10-01."""
    builder = LibraryBuilder()
    dune = _dune_main(builder)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(
        neuromancer,
        start_date="2026-10-01",
        current_page=50,
        purpose="Cyberspace",
        paused_at="2026-10-20",
    )
    builder.up_next(neuromancer)
    builder.write(data_dir)
    return dune, neuromancer


def _emma_up_next_never_read(data_dir: Path) -> tuple[str, str]:
    """Main Dune; Up next Emma with no Readings."""
    builder = LibraryBuilder()
    dune = _dune_main(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.write(data_dir)
    return dune, emma


# --- FIN-API-002: a paused Up next ---------------------------------------------


def test_fin_api_002_a_paused_up_next_is_finished_and_the_main_book_stays(
    tmp_path: Path,
) -> None:
    dune, neuromancer = _paused_up_next(tmp_path)
    (before,) = stored_book(tmp_path, neuromancer)["readings"]
    client = api_client(tmp_path)

    response = _finish(client, neuromancer, "2026-10-29", purpose_fulfilled="yes", rating=4)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    (after,) = stored_book(tmp_path, neuromancer)["readings"]
    assert after == {
        **before,
        "finishDate": "2026-10-29",
        "finishedPages": 271,
        "purposeFulfilled": "yes",
        "rating": 4,
    }
    library = _stored(tmp_path)
    assert (library["mainBookId"], library["upNextBookId"]) == (dune, None)
    home = _home(client)
    assert home["mainBook"]["id"] == dune
    assert home["upNext"] is None
    assert [w["id"] for w in home["waiting"]] == []
    assert_invariants(tmp_path)


def test_a_waiting_book_is_finished_and_leaves_waiting_for_you(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _dune_main(builder)
    solaris = builder.book(title="Solaris", pages=204)
    builder.reading(solaris, current_page=80, paused_at="2026-09-01")
    left_hand = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(left_hand, current_page=10, paused_at="2026-10-01")
    builder.up_next(left_hand)
    builder.write(tmp_path)
    client = api_client(tmp_path)
    assert [w["id"] for w in _home(client)["waiting"]] == [solaris]
    left_hand_before = stored_book(tmp_path, left_hand)

    response = _finish(client, solaris)

    assert response.status_code == 200
    assert stored_book(tmp_path, solaris)["readings"][0]["finishDate"] == TODAY_ISO
    library = _stored(tmp_path)
    # The pointers don't name Solaris, so they stay.
    assert (library["mainBookId"], library["upNextBookId"]) == (dune, left_hand)
    assert stored_book(tmp_path, left_hand) == left_hand_before
    assert _home(client)["waiting"] == []
    assert_invariants(tmp_path)


def test_a_paused_side_read_is_finished_and_leaves_the_side_reads(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _dune_main(builder)
    solaris = builder.book(title="Solaris", pages=204)
    builder.reading(solaris, current_page=80, paused_at="2026-09-01")
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=30, paused_at="2026-09-02")
    builder.side_read(solaris)
    builder.side_read(emma)
    builder.write(tmp_path)

    response = _finish(api_client(tmp_path), solaris)

    assert response.status_code == 200
    library = _stored(tmp_path)
    assert library["sideReadBookIds"] == [emma]
    assert library["mainBookId"] == dune
    assert stored_book(tmp_path, solaris)["readings"][0]["finishedPages"] == 204
    assert_invariants(tmp_path)


# --- A Book with no Reading is back-filled ---------------------------------------


def test_a_never_read_up_next_gets_one_backfilled_reading(tmp_path: Path) -> None:
    dune, emma = _emma_up_next_never_read(tmp_path)
    client = api_client(tmp_path)
    assert _spine(client, emma)["finished"] is False

    response = _finish(client, emma, "2019-08-14", rating=5)

    assert response.status_code == 200
    (reading,) = stored_book(tmp_path, emma)["readings"]
    assert isinstance(reading.pop("id"), str)
    assert reading == {
        "startDate": None,
        "startPage": 0,
        "earlierSegments": [],
        "currentPage": 400,
        "purpose": None,
        "lastProgressUpdate": None,
        "pausedAt": None,
        "finishDate": "2019-08-14",
        "finishedPages": 400,
        "purposeFulfilled": None,
        "rating": 5,
    }
    library = _stored(tmp_path)
    assert (library["mainBookId"], library["upNextBookId"]) == (dune, None)
    assert _spine(client, emma)["finished"] is True
    assert _home(client)["upNext"] is None
    assert_invariants(tmp_path)


def test_a_never_read_side_read_is_backfilled_and_leaves_the_side_reads(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    emma = builder.book(title="Emma", pages=400)
    builder.side_read(emma)
    builder.write(tmp_path)

    response = _finish(api_client(tmp_path), emma)

    assert response.status_code == 200
    library = _stored(tmp_path)
    assert library["sideReadBookIds"] == []
    assert library["mainBookId"] is None
    assert len(stored_book(tmp_path, emma)["readings"]) == 1
    assert_invariants(tmp_path)


def test_a_backfill_with_a_purpose_answer_is_refused_on_purpose_fulfilled(
    tmp_path: Path,
) -> None:
    _dune, emma = _emma_up_next_never_read(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), emma, "2019-08-14", purpose_fulfilled="yes")

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {
            "field": "purposeFulfilled",
            "message": "Purpose fulfilled needs a Purpose on this reading.",
        }
    ]
    assert library_bytes(tmp_path) == before


def test_a_backfill_in_the_future_is_refused_on_finished_on(tmp_path: Path) -> None:
    _dune, emma = _emma_up_next_never_read(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), emma, "2026-10-31")

    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == ["finishedOn"]
    assert library_bytes(tmp_path) == before


# --- Refusals ---------------------------------------------------------------------


@pytest.mark.parametrize("up_next", [True, False])
def test_a_finished_book_with_no_reading_in_progress_is_refused(
    tmp_path: Path, up_next: bool
) -> None:
    builder = LibraryBuilder()
    _dune_main(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=400, finish_date="2026-04-10", finished_pages=400)
    if up_next:
        builder.up_next(emma)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), emma)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "reading_already_finished"
    assert library_bytes(tmp_path) == before


def test_a_paused_book_finished_before_its_start_is_refused(tmp_path: Path) -> None:
    _dune, neuromancer = _paused_up_next(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), neuromancer, "2026-09-30")

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {
            "field": "finishedOn",
            "message": "Finished on can't be before 1 October 2026, when this reading started.",
        }
    ]
    assert library_bytes(tmp_path) == before


# --- The standard intent guarantees (TR8) on both non-Main paths ---------------


@pytest.mark.parametrize("path", ["paused", "backfill"])
@pytest.mark.parametrize("step", ["write", "fsync", "replace"])
def test_a_fault_on_a_non_main_finish_changes_nothing(tmp_path: Path, path: str, step: str) -> None:
    if path == "paused":
        _dune, book_id = _paused_up_next(tmp_path)
    else:
        _dune, book_id = _emma_up_next_never_read(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path, fs=FaultyFs(step)), book_id)

    assert response.status_code == 503
    assert response.json() == COULDNT_SAVE_BODY
    assert library_bytes(tmp_path) == before
