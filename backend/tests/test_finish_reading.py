"""Story 3.6 Finish my Main book: ``finish-reading`` (ATDD).

The ATDD tests, for the criteria whose promise lives on the server (numbered
in the order of epics.md, Story 3.6):

- AC-2: Done stores ``finishDate``, ``finishedPages`` = the Book's Pages,
  ``purposeFulfilled`` and ``rating`` (``null`` when skipped), and clears
  ``mainBookId``, in one commit; the meter goes up (FR-14, FIN-API-001).
- AC-3: a Finished on date in the future, or before the Reading's start, is
  refused on ``finishedOn`` and nothing is saved (FIN-API-003).
- AC-7: ``update-page`` and ``finish-reading`` together: only
  ``finish-reading`` ever sets ``finishDate`` (AD-19).
- AC-8: ``finish-reading`` for a Reading already finished (in another tab)
  is refused with 409 ``reading_already_finished`` and nothing changes (AD-9).
- AC-9: the standard intent ACs (TR8) for ``finish-reading``.

The Finish dialog, Cancel and Esc, Done in flight, the way home and the
Readings block are read in the browser (``frontend/e2e/finish-reading.spec.ts``).

The tests pin these names:

- ``POST /api/intents/finish-reading``, ``multipart/form-data`` with a JSON
  part named ``intent`` holding ``{"bookId": ..., "finishedOn":
  "YYYY-MM-DD", "purposeFulfilled": "yes" | "partly" | "notYet" | null,
  "rating": 1..5 | null}``. All four keys are required; the two answers are
  nullable. Success is exactly ``{ok: true}``.
- In one commit the Book's current (unfinished) Reading gets ``finishDate``
  = ``finishedOn``, ``finishedPages`` = the Book's ``pages`` at that moment,
  ``purposeFulfilled`` and ``rating`` as sent; every other Reading field
  (``currentPage``, ``lastProgressUpdate``, ``purpose`` …) is kept. When the
  Book is the Main book, ``mainBookId`` becomes ``null``. ``upNextBookId`` is
  not asserted (Story 4.1).
- Refusals, checked inside the commit in this order: 409 ``book_not_found``
  when the Book is gone, 409 ``reading_already_finished`` when it has no
  unfinished Reading, then 422 ``invalid_fields`` on ``finishedOn``: "Finished
  on can't be in the future." or "Finished on can't be before 12 March 2026,
  when this reading started." (the messages Edit book already uses).
"""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    FINISH_READING,
    TODAY,
    UPDATE_PAGE,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)


GONE_ID = "00000000-0000-4000-8000-000000000000"
TODAY_ISO = TODAY.isoformat()  # 2026-10-30
EARLIER = "2026-10-25T21:00:00+01:00"
PURPOSE = "To see how Le Guin builds a world"


def _finish(
    client: TestClient,
    book_id: str,
    finished_on: str = TODAY_ISO,
    purpose_fulfilled: str | None = None,
    rating: int | None = None,
):
    """A ``finish-reading`` as the Finish dialog's Done sends it."""
    intent: dict[str, Any] = {
        "bookId": book_id,
        "finishedOn": finished_on,
        "purposeFulfilled": purpose_fulfilled,
        "rating": rating,
    }
    return client.post(
        FINISH_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _update_page(client: TestClient, book_id: str, page: int):
    intent = {"bookId": book_id, "page": page}
    return client.post(
        UPDATE_PAGE, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _left_hand_main_and_dune(
    data_dir: Path,
    *,
    page: int = 212,
    start_date: str = "2026-10-01",
    purpose: str | None = PURPOSE,
) -> tuple[str, str]:
    """The Left Hand of Darkness (330 pages) as the Main book at ``page``; Dune never read."""
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    builder.reading(
        left_hand,
        start_date=start_date,
        current_page=page,
        purpose=purpose,
        last_progress_update=EARLIER,
    )
    builder.main(left_hand)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(data_dir)
    return left_hand, dune


# --- AC-2: Done records the finish ---------------------------------------------


def test_ac2_p0_finish_reading_stores_the_finish_and_the_answers_and_clears_the_main_book(
    tmp_path: Path,
) -> None:
    # Mark finished from Book detail at p.212: finishedPages is still the
    # Book's 330 pages, not the page reached.
    data_dir = tmp_path / "answered"
    left_hand, dune = _left_hand_main_and_dune(data_dir, page=212)
    (before,) = stored_book(data_dir, left_hand)["readings"]
    dune_before = stored_book(data_dir, dune)
    client = api_client(data_dir)

    response = _finish(
        client, left_hand, TODAY_ISO, purpose_fulfilled="partly", rating=4
    )

    # The criterion: the Reading is finished on the Finished on date.
    assert stored_book(data_dir, left_hand)["readings"][0]["finishDate"] == TODAY_ISO

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    (reading,) = stored_book(data_dir, left_hand)["readings"]
    assert reading == {
        **before,
        "finishDate": TODAY_ISO,
        "finishedPages": 330,
        "purposeFulfilled": "partly",
        "rating": 4,
    }
    # The Main book is cleared in the same commit; nothing else moves.
    assert _stored(data_dir)["mainBookId"] is None
    assert stored_book(data_dir, dune) == dune_before
    assert_invariants(data_dir)
    # The Book counts as read: the meter goes up, and there is no Main book.
    home = client.get("/api/views/home").json()
    assert home["meter"] == {"finished": 1, "total": 2}
    assert home["mainBook"] is None

    # Both questions skipped (and no Purpose to ask about): stored as null.
    # A date in the past, on or after the start, is the date stored.
    data_dir = tmp_path / "skipped"
    left_hand, _dune = _left_hand_main_and_dune(data_dir, page=330, purpose=None)
    (before,) = stored_book(data_dir, left_hand)["readings"]

    response = _finish(api_client(data_dir), left_hand, "2026-10-29")

    assert response.status_code == 200
    (reading,) = stored_book(data_dir, left_hand)["readings"]
    assert reading == {
        **before,
        "finishDate": "2026-10-29",
        "finishedPages": 330,
        "purposeFulfilled": None,
        "rating": None,
    }
    assert _stored(data_dir)["mainBookId"] is None
    assert_invariants(data_dir)


# --- AC-3: Finished on is not in the future, nor before the start --------------


def test_ac3_p1_finished_on_in_the_future_or_before_the_start_is_refused_and_nothing_is_saved(
    tmp_path: Path,
) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path, start_date="2026-03-12")
    before = library_bytes(tmp_path)
    client = api_client(tmp_path)

    future = _finish(client, left_hand, "2026-10-31", purpose_fulfilled="yes", rating=5)

    # The criterion: the field carries the exact message.
    assert future.json().get("error", {}).get("fields") == [
        {"field": "finishedOn", "message": "Finished on can't be in the future."}
    ]

    assert future.status_code == 422
    assert future.json()["error"]["code"] == "invalid_fields"
    assert (
        future.json()["error"]["message"]
        == "Not saved. 1 field needs attention: Finished on."
    )
    assert library_bytes(tmp_path) == before

    early = _finish(client, left_hand, "2026-03-11", purpose_fulfilled="yes", rating=5)

    assert early.status_code == 422
    assert early.json()["error"]["fields"] == [
        {
            "field": "finishedOn",
            "message": "Finished on can't be before 12 March 2026, when this reading started.",
        }
    ]
    assert library_bytes(tmp_path) == before


# --- AC-7: only finish-reading ever sets finishDate (AD-19) --------------------


def test_ac7_p0_only_finish_reading_ever_sets_finish_date(tmp_path: Path) -> None:
    # A re-read: finished once in April, now the Main book again at p.300.
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    first = builder.reading(
        left_hand,
        start_date="2026-04-01",
        current_page=330,
        finish_date="2026-04-20",
        finished_pages=330,
        rating=5,
    )
    builder.reading(left_hand, start_date="2026-10-01", current_page=300)
    builder.main(left_hand)
    builder.write(tmp_path)
    first_before = stored_book(tmp_path, left_hand)["readings"][0]
    client = api_client(tmp_path)

    # The last page saves the page and finishes nothing (setup, unasserted here).
    _update_page(client, left_hand, 330)
    after_last_page = stored_book(tmp_path, left_hand)["readings"]
    _finish(client, left_hand, TODAY_ISO, rating=3)

    # The criterion: finish-reading, and only it, sets finishDate.
    assert stored_book(tmp_path, left_hand)["readings"][1]["finishDate"] == TODAY_ISO

    assert [r["finishDate"] for r in after_last_page] == ["2026-04-20", None]
    assert after_last_page[1]["currentPage"] == 330
    first_after, current = stored_book(tmp_path, left_hand)["readings"]
    # The earlier finish is history: untouched.
    assert first_after == first_before
    assert first_after["id"] == first
    assert current["finishedPages"] == 330
    assert current["rating"] == 3
    # Once finished, the Book isn't Main: a stale page field can't touch it.
    stale = _update_page(client, left_hand, 100)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "not_main_book"
    assert stored_book(tmp_path, left_hand)["readings"][1] == current
    assert_invariants(tmp_path)


# --- AC-8: a Reading already finished in another tab ---------------------------


def test_ac8_p1_finish_reading_for_a_reading_already_finished_is_refused(
    tmp_path: Path,
) -> None:
    # Another tab finished The Left Hand of Darkness: it is no longer Main and
    # has no unfinished Reading. This tab still shows the Finish dialog.
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    builder.reading(
        left_hand,
        start_date="2026-10-01",
        current_page=330,
        finish_date="2026-10-29",
        finished_pages=330,
    )
    builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), left_hand, TODAY_ISO, rating=4)

    # The criterion: the 409 status.
    assert response.status_code == 409

    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "reading_already_finished",
            "message": "This reading is already finished.",
        }
    }
    assert library_bytes(tmp_path) == before


# --- AC-9: the standard intent guarantees (TR8) --------------------------------


def test_ac9_p0_finish_reading_keeps_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    # A fault at write, fsync or rename commits nothing: neither the finish
    # nor the cleared Main book.
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        left_hand, _dune = _left_hand_main_and_dune(data_dir)
        before = library_bytes(data_dir)

        response = _finish(
            api_client(data_dir, fs=FaultyFs(step)),
            left_hand,
            purpose_fulfilled="yes",
            rating=5,
        )

        # The criterion (first on "write"): 503 couldnt_save.
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(data_dir) == before, step

    # Success keeps the invariants.
    data_dir = tmp_path / "ok"
    left_hand, _dune = _left_hand_main_and_dune(data_dir)
    client = api_client(data_dir)
    assert _finish(client, left_hand, purpose_fulfilled="notYet").status_code == 200
    assert_invariants(data_dir)

    # A Book that no longer exists is refused before anything else, and
    # nothing changes.
    before = library_bytes(data_dir)
    gone = _finish(client, GONE_ID, "2099-01-01")
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before

    # The intent and its refusal code are in the contract (AD-8).
    schema = create_app().openapi()
    assert FINISH_READING in schema["paths"]
    assert (
        "reading_already_finished"
        in schema["components"]["schemas"]["ErrorCode"]["enum"]
    )


# --- Green-phase follow-ups: the Matrix boundaries and FIN-API-004 -------------


@pytest.mark.parametrize("finished_on", [TODAY_ISO, "2026-10-01"])
def test_finished_on_today_or_on_the_start_date_is_accepted(
    tmp_path: Path, finished_on: str
) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path, start_date="2026-10-01")

    response = _finish(api_client(tmp_path), left_hand, finished_on)

    assert response.status_code == 200
    assert stored_book(tmp_path, left_hand)["readings"][0]["finishDate"] == finished_on
    assert_invariants(tmp_path)


def test_only_the_current_reading_of_a_re_read_is_finished(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    left_hand = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(
        left_hand,
        start_date="2026-04-01",
        current_page=330,
        finish_date="2026-04-20",
        finished_pages=330,
        purpose_fulfilled=None,
        rating=5,
    )
    builder.reading(left_hand, start_date="2026-10-01", current_page=120, purpose=PURPOSE)
    builder.main(left_hand)
    builder.write(tmp_path)
    first_before, current_before = stored_book(tmp_path, left_hand)["readings"]

    response = _finish(api_client(tmp_path), left_hand, purpose_fulfilled="yes", rating=2)

    assert response.status_code == 200
    first, current = stored_book(tmp_path, left_hand)["readings"]
    assert first == first_before
    assert current == {
        **current_before,
        "finishDate": TODAY_ISO,
        "finishedPages": 330,
        "purposeFulfilled": "yes",
        "rating": 2,
    }
    assert_invariants(tmp_path)


def test_a_paused_book_is_finished_and_the_main_book_stays(tmp_path: Path) -> None:
    # The API allows it (the UI offers Mark finished only for the Main book):
    # the Main pointer is cleared only when it names the finished Book.
    builder = LibraryBuilder()
    paused = builder.book(title="Neuromancer", pages=271)
    builder.reading(paused, current_page=50, paused_at="2026-10-01")
    main = builder.book(title="Dune", pages=412)
    builder.reading(main, current_page=10)
    builder.main(main)
    builder.write(tmp_path)

    response = _finish(api_client(tmp_path), paused)

    assert response.status_code == 200
    assert stored_book(tmp_path, paused)["readings"][0]["finishedPages"] == 271
    assert _stored(tmp_path)["mainBookId"] == main
    assert_invariants(tmp_path)


def test_purpose_fulfilled_without_a_purpose_is_refused(tmp_path: Path) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path, purpose=None)
    before = library_bytes(tmp_path)

    response = _finish(api_client(tmp_path), left_hand, purpose_fulfilled="yes", rating=4)

    assert response.status_code == 422
    assert response.json()["error"] == {
        "kind": "refusal",
        "code": "invalid_fields",
        "message": "Not saved. 1 field needs attention: Purpose fulfilled.",
        "fields": [
            {
                "field": "purposeFulfilled",
                "message": "Purpose fulfilled needs a Purpose on this reading.",
            }
        ],
    }
    assert library_bytes(tmp_path) == before


def _send_raw(client: TestClient, intent: Any):
    return client.post(
        FINISH_READING, files={"intent": (None, json.dumps(intent), "application/json")}
    )


@pytest.mark.parametrize("rating", [0, 6, "4", 4.5, True, [4]])
def test_a_rating_that_is_not_1_to_5_is_a_rating_field_error(
    tmp_path: Path, rating: Any
) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path)
    before = library_bytes(tmp_path)
    intent = {
        "bookId": left_hand,
        "finishedOn": TODAY_ISO,
        "purposeFulfilled": None,
        "rating": rating,
    }

    response = _send_raw(api_client(tmp_path), intent)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "rating", "message": "Rating must be 1 to 5 stars, or no rating."}
    ]
    assert library_bytes(tmp_path) == before


@pytest.mark.parametrize("answer", ["not yet", "Yes", "", 1, {"a": 1}])
def test_an_answer_that_is_not_yes_partly_or_not_yet_is_a_field_error(
    tmp_path: Path, answer: Any
) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path)
    before = library_bytes(tmp_path)
    intent = {
        "bookId": left_hand,
        "finishedOn": TODAY_ISO,
        "purposeFulfilled": answer,
        "rating": None,
    }

    response = _send_raw(api_client(tmp_path), intent)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {
            "field": "purposeFulfilled",
            "message": "Purpose fulfilled must be yes, partly or not yet.",
        }
    ]
    assert library_bytes(tmp_path) == before


@pytest.mark.parametrize("finished_on", ["28/10/2026", "", "  ", "2026-02-30", None, 20261028])
def test_a_finished_on_that_is_not_a_date_is_a_finished_on_field_error(
    tmp_path: Path, finished_on: Any
) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path)
    before = library_bytes(tmp_path)
    intent = {
        "bookId": left_hand,
        "finishedOn": finished_on,
        "purposeFulfilled": None,
        "rating": None,
    }

    response = _send_raw(api_client(tmp_path), intent)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "finishedOn", "message": "Finished on must be a date, like 2026-03-14."}
    ]
    assert library_bytes(tmp_path) == before


def test_every_failing_field_is_named_in_form_order(tmp_path: Path) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path, purpose=None)

    response = _finish(api_client(tmp_path), left_hand, "2026-10-31", "partly", 9)  # type: ignore[arg-type]

    assert response.status_code == 422
    assert response.json()["error"]["message"] == (
        "Not saved. 3 fields need attention: Finished on, Purpose fulfilled, Rating."
    )
    assert [f["field"] for f in response.json()["error"]["fields"]] == [
        "finishedOn",
        "purposeFulfilled",
        "rating",
    ]


@pytest.mark.parametrize(
    "intent",
    [
        {"bookId": "x", "finishedOn": TODAY_ISO, "purposeFulfilled": None},
        {"bookId": "x", "finishedOn": TODAY_ISO, "rating": None},
        {"bookId": "x", "purposeFulfilled": None, "rating": None},
        {"finishedOn": TODAY_ISO, "purposeFulfilled": None, "rating": None},
        {"bookId": None, "finishedOn": TODAY_ISO, "purposeFulfilled": None, "rating": None},
        {
            "bookId": "x",
            "finishedOn": TODAY_ISO,
            "purposeFulfilled": None,
            "rating": None,
            "extra": 1,
        },
        [],
    ],
)
def test_a_malformed_intent_is_an_intent_field_error(tmp_path: Path, intent: Any) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path)
    if isinstance(intent, dict) and intent.get("bookId") == "x":
        intent = {**intent, "bookId": left_hand}
    before = library_bytes(tmp_path)

    response = _send_raw(api_client(tmp_path), intent)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {
            "field": "intent",
            "message": "The intent must be a JSON object of the form's fields.",
        }
    ]
    assert library_bytes(tmp_path) == before


def test_a_missing_intent_part_is_an_intent_field_error(tmp_path: Path) -> None:
    response = api_client(tmp_path).post(FINISH_READING)

    assert response.status_code == 422
    assert response.json()["error"]["fields"][0]["field"] == "intent"


def test_the_book_view_lists_each_readings_rating_and_answer(tmp_path: Path) -> None:
    left_hand, _dune = _left_hand_main_and_dune(tmp_path)
    client = api_client(tmp_path)
    assert _finish(client, left_hand, purpose_fulfilled="notYet", rating=1).status_code == 200

    (reading,) = client.get("/api/views/book", params={"id": left_hand}).json()["readings"]

    assert reading["finishDate"] == TODAY_ISO
    assert reading["rating"] == 1
    assert reading["purposeFulfilled"] == "notYet"
