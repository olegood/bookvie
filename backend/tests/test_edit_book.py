"""Story 1.11: ``edit-book`` corrects a Book's details (FR-1, FR-3, AD-9, AD-11).

One red-phase test per server-side acceptance criterion (AC-3 and AC-6 to
AC-12, numbered in the order of epics.md, Story 1.11). AC-1, AC-2, AC-4 and
AC-5 are Book detail and the Edit book panel, in
``frontend/e2e/book-detail.spec.ts``. The Finished on criteria (AC-8 to
AC-10) and their follow-ups are in ``test_edit_book_finished_on.py``, and the
``book`` view is in ``test_book_view.py``.

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
from pathlib import Path

import pytest

from bookvie.http.app import create_app
from tests.builder import CURATED, LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    DUNE,
    DUNE_FORM,
    DUNE_ISBN13,
    EDIT_BOOK,
    NEUROMANCER,
    NEUROMANCER_FORM,
    FaultyFs,
    api_client,
    assert_invariants,
    field_messages,
    library_bytes,
    post_edit_book,
    stored_book,
    stored_books,
    stored_readings,
)

# Dune's ISBN-13 as typed with the hyphens printed on the copy.
DUNE_ISBN13_HYPHENATED = "978-0-441-17271-9"
# The same number as the ISBN-10 printed on older copies.
DUNE_ISBN10 = "0-441-17271-7"


# --- AC-3: the same validation and duplicate flow as add-book -----------------


def test_ac3_p0_edit_book_validates_like_add_book_and_skips_the_edited_book_in_the_duplicate_check(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    # Only the ISBN's hyphenation changed: the check runs, and Dune never
    # matches itself.
    response = post_edit_book(client, dune, DUNE_FORM, isbn=DUNE_ISBN13_HYPHENATED)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert stored_book(tmp_path, dune)["isbn"] == DUNE_ISBN13_HYPHENATED  # as typed
    dune_form = {**DUNE_FORM, "isbn": DUNE_ISBN13_HYPHENATED}

    # The same field validation as add-book: every failing field, nothing saved.
    before = library_bytes(tmp_path)
    invalid = post_edit_book(client, dune, dune_form, pages="abc", language="  ")
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_fields"
    assert field_messages(invalid) == {
        "pages": "Pages must be a whole number, 1 or more.",
        "language": "Language is required.",
    }
    assert library_bytes(tmp_path) == before

    # A changed title that matches another Book is the same 409 as add-book.
    as_dune = {"title": "Dune", "authors": "Frank Herbert"}
    duplicate = post_edit_book(client, neuromancer, NEUROMANCER_FORM, **as_dune)
    assert duplicate.status_code == 409
    error = duplicate.json()["error"]
    assert error["code"] == "duplicate_book"
    assert error["duplicates"] == [
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13_HYPHENATED}
    ]
    assert library_bytes(tmp_path) == before

    # Save anyway resends with confirmDuplicate.
    confirmed = post_edit_book(
        client, neuromancer, NEUROMANCER_FORM, **as_dune, confirmDuplicate=True
    )
    assert confirmed.status_code == 200
    assert [b["title"] for b in stored_books(tmp_path)] == ["Dune", "Dune"]

    # Now two Books match. An edit that leaves title, authors and ISBN alone
    # doesn't run the check.
    second_dune_form = {**NEUROMANCER_FORM, **as_dune}
    assert post_edit_book(client, neuromancer, second_dune_form, pages="300").status_code == 200
    assert stored_book(tmp_path, neuromancer)["pages"] == 300


# --- AC-6: Pages below the current page ------------------------------------------


def test_ac6_p0_pages_below_the_current_page_is_409_and_finished_readings_keep_their_pages(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    first = library_builder.reading(
        dune,
        start_date="2025-01-05",
        finish_date="2025-02-20",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(dune, start_date="2026-09-01", current_page=300)  # re-reading
    library_builder.main(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-02-20"}

    response = post_edit_book(client, dune, form, pages="250")

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "pages_below_current_page"
    assert error["kind"] == "refusal"
    assert field_messages(response) == {
        "pages": "Pages can't be less than 300, the page you're on."
    }
    assert library_bytes(tmp_path) == before

    # At or above the current page it saves, and the finished Reading keeps
    # the page count it finished with (AD-11).
    assert post_edit_book(client, dune, form, pages="300").status_code == 200
    assert stored_book(tmp_path, dune)["pages"] == 300
    (finished,) = [r for r in stored_readings(tmp_path, dune) if r["id"] == first]
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
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    response = post_edit_book(client, dune, DUNE_FORM, pages="260")

    assert response.status_code == 409
    assert field_messages(response) == {
        "pages": "Pages can't be less than 270, where a card note is."
    }
    assert response.json()["error"]["code"] == "pages_below_card_note"
    assert library_bytes(tmp_path) == before

    hyperion_form = {
        **DUNE_FORM,
        "title": "Hyperion",
        "authors": "Dan Simmons",
        "pages": "482",
        "isbn": "",
        "year": "",
        "publisher": "Publisher",
    }
    ranged = post_edit_book(client, hyperion, hyperion_form, pages="270")
    assert ranged.status_code == 409
    assert field_messages(ranged) == {
        "pages": "Pages can't be less than 272, where a card note is."
    }
    assert post_edit_book(client, hyperion, hyperion_form, pages="272").status_code == 200
    assert stored_book(tmp_path, hyperion)["pages"] == 272


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
    client = api_client(tmp_path)

    response = post_edit_book(client, dune, DUNE_FORM, spineColor="#1A2B3C")

    book = stored_book(tmp_path, dune)
    assert book["spineColor"] == "#1A2B3C"
    assert response.status_code == 200
    assert book["spineColorUser"] == "#1A2B3C"
    assert book["spineColorFromCover"] == "#336699"
    assert book["spineColorCurated"] == CURATED[0]

    # Emptying Spine color means automatic again: from the cover.
    assert post_edit_book(client, dune, DUNE_FORM, spineColor="").status_code == 200
    book = stored_book(tmp_path, dune)
    assert (book["spineColorUser"], book["spineColor"]) == (None, "#336699")

    # An edit that doesn't touch a color input leaves the stored color alone.
    assert (
        post_edit_book(client, neuromancer, NEUROMANCER_FORM, subtitle="A novel").status_code == 200
    )
    book = stored_book(tmp_path, neuromancer)
    assert (book["subtitle"], book["spineColor"]) == ("A novel", "#123456")


# --- AC-12: standard intent ACs (TR8) -----------------------------------------


def test_ac12_p0_edit_book_keeps_the_standard_intent_guarantees(tmp_path: Path) -> None:
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        builder = LibraryBuilder()
        dune = builder.book(**DUNE)
        builder.write(data_dir)
        before = library_bytes(data_dir)

        response = post_edit_book(
            api_client(data_dir, fs=FaultyFs(step)), dune, DUNE_FORM, subtitle="X"
        )

        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(data_dir) == before, step

    # Success keeps the invariants.
    data_dir = tmp_path / "ok"
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    builder.reading(dune, current_page=120)
    builder.main(dune)
    builder.write(data_dir)
    client = api_client(data_dir)
    assert (
        post_edit_book(
            client, dune, DUNE_FORM, subtitle="Book One", finishedOn="2024-05-01"
        ).status_code
        == 200
    )
    assert_invariants(data_dir)

    # A Book that no longer exists is refused, and nothing changes.
    before = library_bytes(data_dir)
    gone = post_edit_book(client, "00000000-0000-4000-8000-000000000000", DUNE_FORM)
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before

    # Every new code is in the contract (AD-8, AD-9).
    codes = create_app().openapi()["components"]["schemas"]["ErrorCode"]["enum"]
    assert {"book_not_found", "pages_below_current_page", "pages_below_card_note"} <= set(codes)


# --- Follow-ups (green phase) ---------------------------------------------------


def test_a_case_only_title_edit_saves_without_matching_itself(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, title="DUNE").status_code == 200
    assert stored_book(tmp_path, dune)["title"] == "DUNE"

    # Trimmed values are compared: padding alone is no change.
    response = post_edit_book(client, dune, {**DUNE_FORM, "title": "DUNE"}, title="  DUNE  ")
    assert response.status_code == 200


def test_a_case_only_title_edit_onto_another_book_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**{**DUNE, "isbn": None})
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(
        client, neuromancer, NEUROMANCER_FORM, title="dune", authors="Frank Herbert"
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"


def test_an_author_only_edit_onto_another_book_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    other = library_builder.book(title="Dune", authors=["Someone Else"], pages=412)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    form = {**NEUROMANCER_FORM, "title": "Dune", "authors": "Someone Else", "pages": "412"}
    before = library_bytes(tmp_path)

    response = post_edit_book(client, other, form, authors="Frank Herbert")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"
    assert library_bytes(tmp_path) == before


def test_an_isbn_only_edit_onto_another_books_isbn_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**DUNE)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    response = post_edit_book(client, neuromancer, NEUROMANCER_FORM, isbn=DUNE_ISBN13)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"
    assert library_bytes(tmp_path) == before


def test_rewriting_the_isbn_as_its_isbn10_saves_as_typed_without_matching_itself(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(client, dune, DUNE_FORM, isbn=DUNE_ISBN10)

    assert response.status_code == 200
    assert stored_book(tmp_path, dune)["isbn"] == DUNE_ISBN10

    # And back to the ISBN-13: the same number again, still no warning.
    response = post_edit_book(client, dune, {**DUNE_FORM, "isbn": DUNE_ISBN10}, isbn=DUNE_ISBN13)
    assert response.status_code == 200
    assert stored_book(tmp_path, dune)["isbn"] == DUNE_ISBN13


def test_an_isbn10_edit_onto_another_books_isbn13_is_a_duplicate(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**DUNE)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    response = post_edit_book(client, neuromancer, NEUROMANCER_FORM, isbn=DUNE_ISBN10)

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "duplicate_book"
    assert [book["title"] for book in error["duplicates"]] == ["Dune"]
    assert library_bytes(tmp_path) == before


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
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    by_note = post_edit_book(client, dune, DUNE_FORM, pages="100")
    assert by_note.status_code == 409
    assert by_note.json()["error"] == {
        "kind": "refusal",
        "code": "pages_below_card_note",
        "message": "Not saved. 1 field needs attention: Pages.",
        "fields": [
            {"field": "pages", "message": "Pages can't be less than 320, where a card note is."}
        ],
    }

    other = {**DUNE_FORM, "isbn": "", "year": "", "publisher": "Publisher"}
    by_page = post_edit_book(
        client, hyperion, {**other, "title": "Hyperion", "authors": "Dan Simmons"}, pages="100"
    )
    assert by_page.json()["error"]["code"] == "pages_below_current_page"
    assert field_messages(by_page) == {"pages": "Pages can't be less than 330, the page you're on."}

    tie = post_edit_book(
        client, emma, {**other, "title": "Emma", "authors": "Jane Austen"}, pages="100"
    )
    assert tie.json()["error"]["code"] == "pages_below_current_page"
    assert library_bytes(tmp_path) == before


def test_pages_floors_come_before_the_duplicate_check(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(**{**DUNE, "isbn": None})
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.reading(neuromancer, current_page=200)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    # Both rules apply: Pages drops below the current page, and the new
    # identity matches Dune. The floor answers first.
    response = post_edit_book(
        client, neuromancer, NEUROMANCER_FORM, title="Dune", authors="Frank Herbert", pages="100"
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "pages_below_current_page"
    assert library_bytes(tmp_path) == before


def test_a_paused_reading_is_a_pages_floor(tmp_path: Path, library_builder: LibraryBuilder) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=300, paused_at="2026-10-01")
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(client, dune, DUNE_FORM, pages="250")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "pages_below_current_page"


def test_field_failures_come_before_the_pages_floors_in_form_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2026-03-12",
        finish_date="2026-04-02",
        current_page=412,
        finished_pages=412,
    )
    library_builder.card_note(dune, page_start=270)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(
        client, dune, DUNE_FORM, pages="100", finishedOn="", spineColor="red", title=""
    )

    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == [
        "title",
        "finishedOn",
        "spineColor",
    ]
    assert response.json()["error"]["message"] == (
        "Not saved. 3 fields need attention: Title, Finished on, Spine color."
    )


def test_edit_keeps_identity_cover_curated_color_and_card_notes(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE, cover_file="covers/x.jpg", spine_color_from_cover="#336699")
    library_builder.card_note(dune, page_start=12)
    library_builder.write(tmp_path)
    before = stored_book(tmp_path, dune)
    client = api_client(tmp_path)

    assert (
        post_edit_book(
            client, dune, DUNE_FORM, title="Dune (Ace)", tags="sci-fi, SCI-FI, classics"
        ).status_code
        == 200
    )
    after = stored_book(tmp_path, dune)
    for key in (
        "id",
        "createdAt",
        "ownership",
        "coverFile",
        "spineColorCurated",
        "spineColor",
        "cardNotes",
    ):
        assert after[key] == before[key], key
    assert after["tags"] == ["sci-fi", "classics"]
    assert after["title"] == "Dune (Ace)"


@pytest.mark.parametrize(
    "intent",
    [None, "[]", "{", json.dumps({**DUNE_FORM}), json.dumps({"bookId": None, **DUNE_FORM})],
)
def test_a_malformed_edit_intent_is_an_intent_field_error(
    tmp_path: Path, intent: str | None
) -> None:
    client = api_client(tmp_path)
    files = {"intent": (None, intent, "application/json")} if intent is not None else None
    response = client.post(EDIT_BOOK, files=files) if files else client.post(EDIT_BOOK)
    assert response.status_code == 422
    assert field_messages(response) == {
        "intent": "The intent must be a JSON object of the form's fields."
    }
