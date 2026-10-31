"""Story 1.11: ``edit-book`` corrects a Book's details (FR-1, FR-3, AD-9, AD-11).

One red-phase test per server-side acceptance criterion (AC-3 and AC-6 to
AC-12, numbered in the order of epics.md, Story 1.11). AC-1, AC-2, AC-4 and
AC-5 are Book detail and the Edit book panel, in
``frontend/e2e/book-detail.spec.ts``.

The tests pin these names:

- ``POST /api/intents/edit-book``, ``multipart/form-data`` with a JSON part
  named ``intent``: ``bookId`` plus the Edit book panel's raw strings, under
  the same camelCase keys as ``add-book`` (the panel sends every field,
  prefilled), plus ``confirmDuplicate``. Success is ``{ok: true}``.
- 409 ``pages_below_current_page`` and 409 ``pages_below_card_note``, each
  with ``fields`` naming ``pages``; 409 ``book_not_found``.
- 422 ``invalid_fields`` on ``finishedOn`` for a cleared date and for a date
  before the most recent finished Reading's ``startDate``.
"""

import json
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library, check_invariants
from bookvie.domain.book_fields import long_date
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from tests.builder import CURATED, LibraryBuilder
from tests.test_add_book import (
    _client,
    _field_messages,
    _library_bytes,
    _stored_book,
    _stored_books,
)
from tests.test_store import FaultyFs

EDIT_BOOK = "/api/intents/edit-book"
# Ace's Dune, as stored and as typed with the hyphens printed on the copy.
DUNE_ISBN13 = "9780441172719"
DUNE_ISBN13_HYPHENATED = "978-0-441-17271-9"

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
NEUROMANCER = {"title": "Neuromancer", "authors": ["William Gibson"], "pages": 271}
NEUROMANCER_FORM = {
    **DUNE_FORM,
    "title": "Neuromancer",
    "pages": "271",
    "authors": "William Gibson",
    "publisher": "Publisher",
    "isbn": "",
    "year": "",
}


def _edit(client: TestClient, book_id: str, form: dict[str, Any], **changes: Any):
    """``edit-book`` for ``book_id``: the prefilled ``form`` with ``changes``."""
    intent = {"bookId": book_id, **form, **changes}
    return client.post(
        EDIT_BOOK, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _readings(data_dir: Path, book_id: str) -> list[dict[str, Any]]:
    return _stored_book(data_dir, book_id)["readings"]


# --- AC-3: the same validation and duplicate flow as add-book -----------------


def test_ac3_p0_edit_book_validates_like_add_book_and_skips_the_edited_book_in_the_duplicate_check(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    # Only the ISBN's hyphenation changed: the check runs, and Dune never
    # matches itself.
    response = _edit(client, dune, DUNE_FORM, isbn=DUNE_ISBN13_HYPHENATED)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _stored_book(tmp_path, dune)["isbn"] == DUNE_ISBN13_HYPHENATED  # as typed
    dune_form = {**DUNE_FORM, "isbn": DUNE_ISBN13_HYPHENATED}

    # The same field validation as add-book: every failing field, nothing saved.
    before = _library_bytes(tmp_path)
    invalid = _edit(client, dune, dune_form, pages="abc", language="  ")
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_fields"
    assert _field_messages(invalid) == {
        "pages": "Pages must be a whole number, 1 or more.",
        "language": "Language is required.",
    }
    assert _library_bytes(tmp_path) == before

    # A changed title that matches another Book is the same 409 as add-book.
    as_dune = {"title": "Dune", "authors": "Frank Herbert"}
    duplicate = _edit(client, neuromancer, NEUROMANCER_FORM, **as_dune)
    assert duplicate.status_code == 409
    error = duplicate.json()["error"]
    assert error["code"] == "duplicate_book"
    assert error["duplicates"] == [
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13_HYPHENATED}
    ]
    assert _library_bytes(tmp_path) == before

    # Save anyway resends with confirmDuplicate.
    confirmed = _edit(client, neuromancer, NEUROMANCER_FORM, **as_dune, confirmDuplicate=True)
    assert confirmed.status_code == 200
    assert [b["title"] for b in _stored_books(tmp_path)] == ["Dune", "Dune"]

    # Now two Books match. An edit that leaves title, authors and ISBN alone
    # doesn't run the check.
    second_dune_form = {**NEUROMANCER_FORM, **as_dune}
    assert _edit(client, neuromancer, second_dune_form, pages="300").status_code == 200
    assert _stored_book(tmp_path, neuromancer)["pages"] == 300


# --- AC-6: Pages below the current page ------------------------------------------


def test_ac6_p0_pages_below_the_current_page_is_409_and_finished_readings_keep_their_pages(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    first = library_builder.reading(
        dune, start_date="2025-01-05", finish_date="2025-02-20", current_page=412, finished_pages=412
    )
    library_builder.reading(dune, start_date="2026-09-01", current_page=300)  # re-reading
    library_builder.main(dune)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-02-20"}

    response = _edit(client, dune, form, pages="250")

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "pages_below_current_page"
    assert error["kind"] == "refusal"
    assert _field_messages(response) == {
        "pages": "Pages can't be less than 300, the page you're on."
    }
    assert _library_bytes(tmp_path) == before

    # At or above the current page it saves, and the finished Reading keeps
    # the page count it finished with (AD-11).
    assert _edit(client, dune, form, pages="300").status_code == 200
    assert _stored_book(tmp_path, dune)["pages"] == 300
    (finished,) = [r for r in _readings(tmp_path, dune) if r["id"] == first]
    assert finished["finishedPages"] == 412


# --- AC-7: Pages below the highest Card note page ----------------------------


def test_ac7_p0_pages_below_the_highest_card_note_page_is_refused(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.card_note(dune, page_start=270)
    library_builder.card_note(dune, page_start=12)
    # A range counts by its pageEnd.
    hyperion = library_builder.book(title="Hyperion", authors=["Dan Simmons"], pages=482)
    library_builder.card_note(hyperion, page_start=268, page_end=272)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)

    response = _edit(client, dune, DUNE_FORM, pages="260")

    assert response.status_code == 409
    assert _field_messages(response) == {
        "pages": "Pages can't be less than 270, where a card note is."
    }
    assert response.json()["error"]["code"] == "pages_below_card_note"
    assert _library_bytes(tmp_path) == before

    hyperion_form = {
        **DUNE_FORM,
        "title": "Hyperion",
        "authors": "Dan Simmons",
        "pages": "482",
        "isbn": "",
        "year": "",
        "publisher": "Publisher",
    }
    ranged = _edit(client, hyperion, hyperion_form, pages="270")
    assert ranged.status_code == 409
    assert _field_messages(ranged) == {
        "pages": "Pages can't be less than 272, where a card note is."
    }
    assert _edit(client, hyperion, hyperion_form, pages="272").status_code == 200
    assert _stored_book(tmp_path, hyperion)["pages"] == 272


# --- AC-8: Finished on edits the most recent finish ---------------------------


def test_ac8_p0_finished_on_changes_the_most_recent_finish_and_cannot_be_cleared(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    backfill = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    latest = library_builder.reading(
        dune, start_date="2025-05-01", finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    # The panel prefills the most recent finish date.
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}

    response = _edit(client, dune, form, finishedOn="2025-06-03")

    by_id = {r["id"]: r for r in _readings(tmp_path, dune)}
    assert by_id[latest]["finishDate"] == "2025-06-03"
    assert response.status_code == 200
    assert by_id[backfill]["finishDate"] == "2019-08-14"
    assert len(by_id) == 2  # changed in place, nothing added

    form = {**DUNE_FORM, "finishedOn": "2025-06-03"}
    before = _library_bytes(tmp_path)
    cleared = _edit(client, dune, form, finishedOn="")
    assert cleared.status_code == 422
    assert _field_messages(cleared) == {"finishedOn": "A finish date can't be removed here."}
    assert _library_bytes(tmp_path) == before
    # TODAY in tests.test_add_book is 2026-10-30.
    future = _edit(client, dune, form, finishedOn="2026-10-31")
    assert future.status_code == 422
    assert _field_messages(future) == {"finishedOn": "Finished on can't be in the future."}
    assert _library_bytes(tmp_path) == before


# --- AC-9: not before the Reading's start --------------------------------------


def test_ac9_p1_finished_on_before_the_readings_start_date_is_422_and_saves_nothing(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune, start_date="2026-03-12", finish_date="2026-04-02", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2026-04-02"}

    response = _edit(client, dune, form, finishedOn="2026-03-11")

    assert response.status_code == 422
    assert _field_messages(response) == {
        "finishedOn": "Finished on can't be before 12 March 2026, when this reading started."
    }
    assert response.json()["error"]["code"] == "invalid_fields"
    assert _library_bytes(tmp_path) == before
    # The start day itself is allowed.
    assert _edit(client, dune, form, finishedOn="2026-03-12").status_code == 200


# --- AC-10: Finished on on a Book with no finished Reading --------------------


def test_ac10_p0_finished_on_back_fills_a_reading_and_leaves_the_current_one_untouched(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, start_date="2026-09-01", current_page=120)
    library_builder.main(dune)
    neuromancer = library_builder.book(**NEUROMANCER)  # never started
    library_builder.write(tmp_path)
    current_before = _readings(tmp_path, dune)[0]
    client = _client(tmp_path)

    response = _edit(client, dune, DUNE_FORM, finishedOn="2024-05-01")

    finished = [r for r in _readings(tmp_path, dune) if r["finishDate"] is not None]
    assert [(r["startDate"], r["finishDate"], r["finishedPages"]) for r in finished] == [
        (None, "2024-05-01", 412)
    ]
    assert response.status_code == 200
    # The active Reading is untouched, and Dune is still the Main book.
    unfinished = [r for r in _readings(tmp_path, dune) if r["finishDate"] is None]
    assert unfinished == [current_before]
    assert json.loads(_library_bytes(tmp_path))["mainBookId"] == dune

    # A Book never started gets one back-filled Reading.
    assert _edit(client, neuromancer, NEUROMANCER_FORM, finishedOn="2023-01-15").status_code == 200
    (backfill,) = _readings(tmp_path, neuromancer)
    assert backfill["startDate"] is None
    assert backfill["finishDate"] == "2023-01-15"
    assert backfill["finishedPages"] == 271


# --- AC-11: spine color is re-resolved only when an input changes -------------


def test_ac11_p1_changing_spine_color_re_resolves_it_and_other_edits_leave_it_alone(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE, spine_color_from_cover="#336699")
    # Stored as an older palette left it: AD-11 says never recompute on read
    # or on an edit that doesn't touch a color input.
    neuromancer = library_builder.book(
        **NEUROMANCER, spine_color_curated=CURATED[1], spine_color="#123456"
    )
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    response = _edit(client, dune, DUNE_FORM, spineColor="#1A2B3C")

    book = _stored_book(tmp_path, dune)
    assert book["spineColor"] == "#1A2B3C"
    assert response.status_code == 200
    assert book["spineColorUser"] == "#1A2B3C"
    assert book["spineColorFromCover"] == "#336699"
    assert book["spineColorCurated"] == CURATED[0]

    # Emptying Spine color means automatic again: from the cover.
    assert _edit(client, dune, DUNE_FORM, spineColor="").status_code == 200
    book = _stored_book(tmp_path, dune)
    assert (book["spineColorUser"], book["spineColor"]) == (None, "#336699")

    # An edit that doesn't touch a color input leaves the stored color alone.
    assert _edit(client, neuromancer, NEUROMANCER_FORM, subtitle="A novel").status_code == 200
    book = _stored_book(tmp_path, neuromancer)
    assert (book["subtitle"], book["spineColor"]) == ("A novel", "#123456")


# --- AC-12: standard intent ACs (TR8) -----------------------------------------


def test_ac12_p0_edit_book_keeps_the_standard_intent_guarantees(tmp_path: Path) -> None:
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        builder = LibraryBuilder()
        dune = builder.book(**DUNE)
        builder.write(data_dir)
        before = _library_bytes(data_dir)

        response = _edit(_client(data_dir, fs=FaultyFs(step)), dune, DUNE_FORM, subtitle="X")

        assert response.status_code == 503, step
        assert response.json() == {
            "error": {
                "kind": "couldnt_save",
                "code": "couldnt_save",
                "message": COULDNT_SAVE_MESSAGE,
            }
        }, step
        assert _library_bytes(data_dir) == before, step

    # Success keeps the invariants.
    data_dir = tmp_path / "ok"
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    builder.reading(dune, current_page=120)
    builder.main(dune)
    builder.write(data_dir)
    client = _client(data_dir)
    assert _edit(client, dune, DUNE_FORM, subtitle="Book One", finishedOn="2024-05-01").status_code == 200
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))

    # A Book that no longer exists is refused, and nothing changes.
    before = _library_bytes(data_dir)
    gone = _edit(client, "00000000-0000-4000-8000-000000000000", DUNE_FORM)
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert _library_bytes(data_dir) == before

    # Every new code is in the contract (AD-8, AD-9).
    codes = create_app().openapi()["components"]["schemas"]["ErrorCode"]["enum"]
    assert {"book_not_found", "pages_below_current_page", "pages_below_card_note"} <= set(codes)


# --- Follow-ups (green phase) ---------------------------------------------------


@pytest.mark.parametrize(
    ("day", "text"),
    [
        (date(2026, 3, 12), "12 March 2026"),
        (date(2019, 1, 1), "1 January 2019"),
        (date(2024, 12, 31), "31 December 2024"),
        (date(2025, 9, 5), "5 September 2025"),
    ],
)
def test_long_date_is_day_full_month_year(day: date, text: str) -> None:
    assert long_date(day) == text


def test_a_case_only_title_edit_saves_without_matching_itself(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    assert _edit(client, dune, DUNE_FORM, title="DUNE").status_code == 200
    assert _stored_book(tmp_path, dune)["title"] == "DUNE"

    # Trimmed values are compared: padding alone is no change.
    response = _edit(client, dune, {**DUNE_FORM, "title": "DUNE"}, title="  DUNE  ")
    assert response.status_code == 200


def test_a_case_only_title_edit_onto_another_book_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**{**DUNE, "isbn": None})
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    response = _edit(client, neuromancer, NEUROMANCER_FORM, title="dune", authors="Frank Herbert")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"


def test_an_author_only_edit_onto_another_book_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    other = library_builder.book(title="Dune", authors=["Someone Else"], pages=412)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    form = {**NEUROMANCER_FORM, "title": "Dune", "authors": "Someone Else", "pages": "412"}
    before = _library_bytes(tmp_path)

    response = _edit(client, other, form, authors="Frank Herbert")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"
    assert _library_bytes(tmp_path) == before


def test_an_isbn_only_edit_onto_another_books_isbn_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**DUNE)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)

    response = _edit(client, neuromancer, NEUROMANCER_FORM, isbn=DUNE_ISBN13)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"
    assert _library_bytes(tmp_path) == before


def test_the_latest_finish_is_by_date_not_by_stored_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    newer = library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    older = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    view = client.get("/api/views/book", params={"id": dune}).json()
    assert view["latestFinishDate"] == "2025-06-01"

    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}
    assert _edit(client, dune, form, finishedOn="2025-06-03").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in _readings(tmp_path, dune)}
    assert by_id == {newer: "2025-06-03", older: "2019-08-14"}


def test_below_both_floors_the_higher_floor_wins(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=300)
    library_builder.card_note(dune, page_start=320)
    hyperion = library_builder.book(title="Hyperion", authors=["Dan Simmons"], pages=482)
    library_builder.reading(hyperion, current_page=330)
    library_builder.card_note(hyperion, page_start=320)
    # A tie names the current page.
    emma = library_builder.book(title="Emma", authors=["Jane Austen"], pages=400)
    library_builder.reading(emma, current_page=200)
    library_builder.card_note(emma, page_start=150, page_end=200)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)

    by_note = _edit(client, dune, DUNE_FORM, pages="100")
    assert by_note.status_code == 409
    assert by_note.json()["error"] == {
        "kind": "refusal",
        "code": "pages_below_card_note",
        "message": "Not saved. 1 field needs attention: Pages.",
        "fields": [{"field": "pages", "message": "Pages can't be less than 320, where a card note is."}],
    }

    other = {**DUNE_FORM, "isbn": "", "year": "", "publisher": "Publisher"}
    by_page = _edit(client, hyperion, {**other, "title": "Hyperion", "authors": "Dan Simmons"}, pages="100")
    assert by_page.json()["error"]["code"] == "pages_below_current_page"
    assert _field_messages(by_page) == {"pages": "Pages can't be less than 330, the page you're on."}

    tie = _edit(client, emma, {**other, "title": "Emma", "authors": "Jane Austen"}, pages="100")
    assert tie.json()["error"]["code"] == "pages_below_current_page"
    assert _library_bytes(tmp_path) == before


def test_pages_floors_come_before_the_duplicate_check(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**{**DUNE, "isbn": None})
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.reading(neuromancer, current_page=200)
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    before = _library_bytes(tmp_path)

    # Both rules apply: Pages drops below the current page, and the new
    # identity matches Dune. The floor answers first.
    response = _edit(
        client, neuromancer, NEUROMANCER_FORM, title="Dune", authors="Frank Herbert", pages="100"
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "pages_below_current_page"
    assert _library_bytes(tmp_path) == before


def test_a_paused_reading_is_a_pages_floor(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=300, paused_at="2026-10-01")
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    response = _edit(client, dune, DUNE_FORM, pages="250")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "pages_below_current_page"


def test_field_failures_come_before_the_pages_floors_in_form_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune, start_date="2026-03-12", finish_date="2026-04-02", current_page=412, finished_pages=412
    )
    library_builder.card_note(dune, page_start=270)
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    response = _edit(client, dune, DUNE_FORM, pages="100", finishedOn="", spineColor="red", title="")

    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == [
        "title",
        "finishedOn",
        "spineColor",
    ]
    assert response.json()["error"]["message"] == (
        "Not saved. 3 fields need attention: Title, Finished on, Spine color."
    )


def test_the_same_finish_date_resent_is_a_no_op_and_a_tie_edits_the_later_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    first = library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    second = library_builder.reading(
        dune, start_date="2025-05-01", finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = _client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}
    before = _library_bytes(tmp_path)

    assert _edit(client, dune, form).status_code == 200
    assert _library_bytes(tmp_path) == before

    assert _edit(client, dune, form, finishedOn="2025-06-02").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in _readings(tmp_path, dune)}
    assert by_id == {first: "2025-06-01", second: "2025-06-02"}


def test_an_empty_finished_on_is_fine_without_a_finished_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=10)
    library_builder.write(tmp_path)
    client = _client(tmp_path)

    assert _edit(client, dune, DUNE_FORM, subtitle="A Novel").status_code == 200
    (reading,) = _readings(tmp_path, dune)
    assert reading["finishDate"] is None


def test_a_paused_book_back_fill_leaves_paused_at_and_up_next_alone(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    paused = library_builder.reading(dune, current_page=50, paused_at="2026-10-01")
    library_builder.write(tmp_path)
    doc = json.loads(_library_bytes(tmp_path))
    doc["upNextBookId"] = dune
    (tmp_path / "library.json").write_text(json.dumps(doc))
    client = _client(tmp_path)

    assert _edit(client, dune, DUNE_FORM, finishedOn="2020-01-01").status_code == 200
    stored = json.loads(_library_bytes(tmp_path))
    assert stored["upNextBookId"] == dune
    by_id = {r["id"]: r for r in _readings(tmp_path, dune)}
    assert by_id[paused]["pausedAt"] == "2026-10-01"
    assert len(by_id) == 2


def test_edit_keeps_identity_cover_curated_color_and_card_notes(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE, cover_file="covers/x.jpg", spine_color_from_cover="#336699")
    library_builder.card_note(dune, page_start=12)
    library_builder.write(tmp_path)
    before = _stored_book(tmp_path, dune)
    client = _client(tmp_path)

    assert _edit(client, dune, DUNE_FORM, title="Dune (Ace)", tags="sci-fi, SCI-FI, classics").status_code == 200
    after = _stored_book(tmp_path, dune)
    for key in ("id", "createdAt", "ownership", "coverFile", "spineColorCurated", "spineColor", "cardNotes"):
        assert after[key] == before[key], key
    assert after["tags"] == ["sci-fi", "classics"]
    assert after["title"] == "Dune (Ace)"


@pytest.mark.parametrize(
    "intent",
    [None, "[]", "{", json.dumps({**DUNE_FORM}), json.dumps({"bookId": None, **DUNE_FORM})],
)
def test_a_malformed_edit_intent_is_an_intent_field_error(tmp_path: Path, intent: str | None) -> None:
    client = _client(tmp_path)
    files = {"intent": (None, intent, "application/json")} if intent is not None else None
    response = client.post(EDIT_BOOK, files=files) if files else client.post(EDIT_BOOK)
    assert response.status_code == 422
    assert _field_messages(response) == {
        "intent": "The intent must be a JSON object of the form's fields."
    }


# --- The book view (Book detail) ----------------------------------------------


def test_book_view_returns_the_book_and_its_latest_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(
        **DUNE, subtitle="A Novel", tags=["sci-fi"], type="hardcover", spine_color_user="#112233"
    )
    old = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    new = library_builder.reading(
        dune, start_date="2024-01-02", finish_date="2024-02-10", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    before = _library_bytes(tmp_path)

    response = _client(tmp_path).get("/api/views/book", params={"id": dune})

    assert response.status_code == 200
    body = response.json()
    readings = body.pop("readings")
    assert body == {
        "id": dune,
        "title": "Dune",
        "subtitle": "A Novel",
        "authors": ["Frank Herbert"],
        "pages": 412,
        "edition": 1,
        "language": "English",
        "publisher": "Chilton Books",
        "type": "hardcover",
        "isbn": DUNE_ISBN13,
        "year": 1965,
        "tags": ["sci-fi"],
        "spineColorUser": "#112233",
        "latestFinishDate": "2024-02-10",
    }
    assert sorted(readings, key=lambda r: r["id"]) == sorted(
        [
            {"id": old, "startDate": None, "finishDate": "2019-08-14"},
            {"id": new, "startDate": "2024-01-02", "finishDate": "2024-02-10"},
        ],
        key=lambda r: r["id"],
    )
    assert _library_bytes(tmp_path) == before


def test_book_view_without_a_finish_has_no_latest_finish_date(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=10)
    library_builder.write(tmp_path)

    body = _client(tmp_path).get("/api/views/book", params={"id": dune}).json()

    assert body["latestFinishDate"] is None
    assert [r["finishDate"] for r in body["readings"]] == [None]


def test_book_view_for_an_unknown_id_is_404_book_not_found(tmp_path: Path) -> None:
    response = _client(tmp_path).get("/api/views/book", params={"id": "nope"})

    assert response.status_code == 404
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
