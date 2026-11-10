"""Story 5.1 Add a card note while reading: the ``add-card-note`` intent (API).

The criteria the server decides (CRD-API-001, R-09):

- AC-2: every accepted Page form is parsed on the server into ``pageStart``
  and ``pageEnd`` ("42–42" is stored as 42 with ``pageEnd: null``), and the
  note is stored as ``{id, text, pageStart, pageEnd, createdAt}`` on that
  Book (AD-18, FR-17).
- AC-3: a page outside 1 to the Book's page count, a reversed range, more
  than one range, or text that isn't a page is refused with the copy on the
  ``page`` field; an empty Page with "Page is required."; an empty or
  whitespace-only Note with "Note is required.".
- AC-5: Book detail's ``cardNotes``, in page order (``pageStart``, then
  ``createdAt``), and empty for a Book with none.
- AC-6: the standard intent ACs (TR8).

The panel, its focus, the ``status`` line and the Card notes block are read
in the browser (``frontend/e2e/add-card-note.spec.ts``).
"""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents.intent_model import MALFORMED_INTENT_MESSAGE
from tests.builder import LibraryBuilder
from tests.helpers import (
    ADD_CARD_NOTE,
    COULDNT_SAVE_BODY,
    DUNE,
    DUNE_FORM,
    EDIT_BOOK,
    TODAY,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"
NOW = FakeClock(TODAY).now()


def _add_card_note(client: TestClient, book_id: str, text: str, page: str):
    """``add-card-note`` as the Card note panel sends it: Page as typed."""
    intent = json.dumps({"bookId": book_id, "text": text, "page": page})
    return client.post(ADD_CARD_NOTE, files={"intent": (None, intent, "application/json")})


def _fields(response) -> dict[str, str]:
    """The refused fields' messages by field; empty when the body has none."""
    fields = response.json().get("error", {}).get("fields") or []
    return {f["field"]: f["message"] for f in fields}


def _edit(client: TestClient, book_id: str, form: dict[str, Any], **changes: Any):
    """``edit-book`` for ``book_id``: the prefilled ``form`` with ``changes``."""
    intent = {"bookId": book_id, **form, **changes}
    return client.post(EDIT_BOOK, files={"intent": (None, json.dumps(intent), "application/json")})


def _left_hand(builder: LibraryBuilder) -> str:
    """The Left Hand of Darkness, 330 pages, never started (a note needs no Reading)."""
    return builder.book(title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330)


# --- AC-2: every Page form is parsed on the server ---------------------------------

PAGE_FORMS = [
    ("42", 42, None),
    ("42–45", 42, 45),
    ("42-45", 42, 45),
    ("42 – 45", 42, 45),
    ("p.42", 42, None),
    ("pp. 42–45", 42, 45),
    ("42–42", 42, None),
]


def test_ac2_p0_add_card_note_parses_every_page_form_and_stores_the_note_on_that_book(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    left_hand = _left_hand(builder)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(dune, current_page=150)
    builder.main(dune)
    builder.write(tmp_path)
    dune_before = stored_book(tmp_path, dune)
    left_hand_before = stored_book(tmp_path, left_hand)

    responses = [
        _add_card_note(api_client(tmp_path), left_hand, f"Note {index}", form)
        for index, (form, _, _) in enumerate(PAGE_FORMS)
    ]

    notes = stored_book(tmp_path, left_hand)["cardNotes"]
    assert [(n["pageStart"], n["pageEnd"]) for n in notes] == [(s, e) for _, s, e in PAGE_FORMS]

    for response in responses:
        assert response.status_code == 200
        assert set(response.json()) == {"ok", "ids"}
        assert response.json()["ok"] is True
    # Each answer names the note it minted; the ids are distinct.
    ids = [response.json()["ids"]["cardNoteId"] for response in responses]
    assert [n["id"] for n in notes] == ids
    assert len(set(ids)) == len(ids)
    # Exactly the AD-18 shape, with the text as sent and createdAt = now.
    for index, note in enumerate(notes):
        assert set(note) == {"id", "text", "pageStart", "pageEnd", "createdAt"}
        assert note["text"] == f"Note {index}"
        assert note["createdAt"] == NOW.isoformat()
    # Nothing else on that Book, and nothing on any other Book, changed.
    left_hand_after = stored_book(tmp_path, left_hand)
    assert {**left_hand_after, "cardNotes": []} == left_hand_before
    assert stored_book(tmp_path, dune) == dune_before
    assert_invariants(tmp_path)

    # The Note is stored with its outer whitespace trimmed; inner newlines are kept.
    response = _add_card_note(api_client(tmp_path), left_hand, "  \n Ice.\nAnd snow.  \t", "42")
    assert response.status_code == 200
    assert stored_book(tmp_path, left_hand)["cardNotes"][-1]["text"] == "Ice.\nAnd snow."
    assert_invariants(tmp_path)


def test_ac5_book_detail_lists_card_notes_by_page_then_created_at(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    left_hand = _left_hand(builder)
    # Seeded out of order, with a tie on pageStart broken by createdAt.
    for text, start, end, created in (
        ("Later", 96, None, "2026-05-01T10:00:00+02:00"),
        ("Second at 42", 42, None, "2026-05-03T10:00:00+02:00"),
        ("Low", 12, None, "2026-05-04T10:00:00+02:00"),
        ("First at 42", 42, 45, "2026-05-02T10:00:00+02:00"),
    ):
        builder.card_note(left_hand, text=text, page_start=start, page_end=end, created_at=created)
    builder.write(tmp_path)

    detail = api_client(tmp_path).get("/api/views/book", params={"id": left_hand}).json()

    notes = detail["cardNotes"]
    assert [(n["text"], n["pageStart"], n["pageEnd"]) for n in notes] == [
        ("Low", 12, None),
        ("First at 42", 42, 45),
        ("Second at 42", 42, None),
        ("Later", 96, None),
    ]
    assert set(notes[0]) == {"id", "text", "pageStart", "pageEnd", "createdAt"}
    # A Book with no notes has an empty list.
    builder = LibraryBuilder()
    bare = _left_hand(builder)
    builder.write(tmp_path)
    detail = api_client(tmp_path).get("/api/views/book", params={"id": bare}).json()
    assert detail["cardNotes"] == []


# --- AC-3: the refusals, field by field ---------------------------------------------

OUT_OF_RANGE = "Page must be between 1 and 330."
REVERSED = "The first page must come before the last."
ONE_RANGE = "Use one page or one range."
PAGE_REQUIRED = "Page is required."
NOTE_REQUIRED = "Note is required."

PAGE_REFUSALS = [
    ("0", OUT_OF_RANGE),
    ("331", OUT_OF_RANGE),
    ("42–400", OUT_OF_RANGE),
    ("45–42", REVERSED),
    ("42–45, 50–52", ONE_RANGE),
    ("42, 50", ONE_RANGE),
    ("abc", ONE_RANGE),
    ("p.", ONE_RANGE),
    ("42 to", ONE_RANGE),
    ("", PAGE_REQUIRED),
    ("   ", PAGE_REQUIRED),
]


def test_ac3_p0_add_card_note_refuses_a_bad_page_or_an_empty_note_and_saves_nothing(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    left_hand = _left_hand(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # The criterion's own case: p.400 in a 330-page Book (Flow 6's failure path).
    response = _add_card_note(api_client(tmp_path), left_hand, "Ice.", "400")

    assert _fields(response) == {"page": OUT_OF_RANGE}
    assert response.status_code == 422
    body = response.json()["error"]
    assert (body["kind"], body["code"]) == ("refusal", "invalid_fields")
    assert body["message"] == "Not saved. 1 field needs attention: Page."
    assert library_bytes(tmp_path) == before

    # Every other Page refusal, with its own copy on `page`.
    for page, message in PAGE_REFUSALS:
        response = _add_card_note(api_client(tmp_path), left_hand, "Ice.", page)
        assert response.status_code == 422, page
        assert _fields(response) == {"page": message}, page
        assert library_bytes(tmp_path) == before, page

    # An empty or whitespace-only Note.
    for text in ("", "  \n\t "):
        response = _add_card_note(api_client(tmp_path), left_hand, text, "42")
        assert response.status_code == 422, repr(text)
        assert _fields(response) == {"text": NOTE_REQUIRED}, repr(text)
        assert library_bytes(tmp_path) == before, repr(text)

    # Both at once: Note first, then Page, each named by its label.
    response = _add_card_note(api_client(tmp_path), left_hand, " ", "400")
    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == ["text", "page"]
    assert response.json()["error"]["message"] == "Not saved. 2 fields need attention: Note, Page."
    assert library_bytes(tmp_path) == before


# --- AC-6: the standard intent ACs (TR8) ---------------------------------------------


def test_ac6_p0_add_card_note_meets_the_standard_intent_acs(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    left_hand = _left_hand(builder)
    builder.card_note(left_hand, text="Light is the left hand of darkness.", page_start=233)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # A write, fsync or rename fault: 503 couldnt_save and the file is byte-identical.
    for step in ("write", "fsync", "replace"):
        response = _add_card_note(api_client(tmp_path, fs=FaultyFs(step)), left_hand, "Ice.", "42")
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(tmp_path) == before, step

    # A Book that no longer exists: 409 book_not_found, nothing changes.
    response = _add_card_note(api_client(tmp_path), GONE_ID, "Ice.", "42")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_not_found"
    assert library_bytes(tmp_path) == before

    # A malformed intent: 422 invalid_fields on `intent`.
    response = api_client(tmp_path).post(
        ADD_CARD_NOTE, files={"intent": (None, "{", "application/json")}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert library_bytes(tmp_path) == before

    # After a success, the invariants hold, and the earlier note is kept.
    assert _add_card_note(api_client(tmp_path), left_hand, "Ice.", "42").status_code == 200
    assert_invariants(tmp_path)
    assert len(stored_book(tmp_path, left_hand)["cardNotes"]) == 2

    # The contract: the route is documented with the error envelope.
    openapi = create_app().openapi()
    responses = openapi["paths"][ADD_CARD_NOTE]["post"]["responses"]
    for status in ("409", "422", "500", "503"):
        ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
        assert ref == "#/components/schemas/ErrorResponse"
    assert "413" not in responses


# --- R-09: a note the app wrote becomes edit-book's Pages floor ---------------------


def test_r09_p1_a_note_added_through_the_intent_sets_the_pages_floor_for_edit_book(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    builder.write(tmp_path)
    client = api_client(tmp_path)

    # The note is written by add-card-note itself, not seeded.
    assert _add_card_note(client, dune, "The spice must flow.", "p.270").status_code == 200
    before = library_bytes(tmp_path)

    lowered = _edit(client, dune, DUNE_FORM, pages="260")

    assert lowered.status_code == 409
    assert lowered.json()["error"]["code"] == "pages_below_card_note"
    assert _fields(lowered) == {"pages": "Pages can't be less than 270, where a card note is."}
    assert library_bytes(tmp_path) == before

    # Pages equal to the note's page is the floor itself, and saves.
    assert _edit(client, dune, DUNE_FORM, pages="270").status_code == 200
    saved = stored_book(tmp_path, dune)
    assert saved["pages"] == 270
    assert [(n["text"], n["pageStart"]) for n in saved["cardNotes"]] == [
        ("The spice must flow.", 270)
    ]
    assert_invariants(tmp_path)


# --- Refusal order and strict parsing -----------------------------------------------


def test_refusal_order_p2_a_gone_book_is_409_book_not_found_before_its_fields_are_checked(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    _left_hand(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # An empty Note and a Page past any Book: the Book is checked first.
    response = _add_card_note(api_client(tmp_path), GONE_ID, "", "400")

    assert response.status_code == 409
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
    assert _fields(response) == {}
    assert library_bytes(tmp_path) == before


WRONG_TYPES = [
    ("page as an integer", {"page": 42}),
    ("text as null", {"text": None}),
    ("an unknown key", {"pageEnd": "45"}),
]


@pytest.mark.parametrize(("case", "change"), WRONG_TYPES, ids=[c for c, _ in WRONG_TYPES])
def test_strict_parsing_p2_wrong_json_types_are_422_on_intent_and_save_nothing(
    tmp_path: Path, case: str, change: dict[str, Any]
) -> None:
    builder = LibraryBuilder()
    left_hand = _left_hand(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)
    intent = json.dumps({"bookId": left_hand, "text": "Ice.", "page": "42", **change})

    response = api_client(tmp_path).post(
        ADD_CARD_NOTE, files={"intent": (None, intent, "application/json")}
    )

    assert response.status_code == 422, case
    assert response.json()["error"]["code"] == "invalid_fields", case
    assert _fields(response) == {"intent": MALFORMED_INTENT_MESSAGE}, case
    assert library_bytes(tmp_path) == before, case
