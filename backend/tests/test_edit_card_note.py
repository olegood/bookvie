"""Story 5.2 Edit or delete a card note: ``edit-card-note`` and ``delete-card-note`` (API).

The criteria the server decides (CRD-API-001, R-09):

- AC-4: once the Book's highest Card note (p.270) is deleted, ``edit-book``
  lets Pages go down to the highest remaining note page, where a range counts
  by its ``pageEnd`` (Story 1.11's ``pages_below_card_note``).
- AC-5: the standard intent ACs (TR8) for both intents, and the new 409
  ``card_note_not_found`` for a note that is gone while its Book is still
  there (decided with Oleg, 2026-11-10).

The Edit card note panel, the Confirm dialog stacked over it, focus after a
delete, and the couldn't-save line are read in the browser
(``frontend/e2e/edit-card-note.spec.ts``).

The follow-ups pin ``edit-card-note``'s parsing and refusals (the same as
``add-card-note``'s), an edit in place, and a delete that touches only its note.
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    DELETE_CARD_NOTE,
    DUNE,
    DUNE_FORM,
    EDIT_BOOK,
    EDIT_CARD_NOTE,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)
from tests.test_add_card_note import PAGE_FORMS, PAGE_REFUSALS

GONE_BOOK_ID = "00000000-0000-4000-8000-000000000000"
GONE_NOTE_ID = "00000000-0000-4000-8000-0000000000aa"


def _post(client: TestClient, path: str, intent: dict[str, str]):
    return client.post(path, files={"intent": (None, json.dumps(intent), "application/json")})


def _edit_card_note(client: TestClient, book_id: str, note_id: str, text: str, page: str):
    """``edit-card-note`` as the Edit card note panel sends it: Page as typed."""
    intent = {"bookId": book_id, "cardNoteId": note_id, "text": text, "page": page}
    return _post(client, EDIT_CARD_NOTE, intent)


def _delete_card_note(client: TestClient, book_id: str, note_id: str):
    """``delete-card-note`` as the Confirm dialog sends it."""
    return _post(client, DELETE_CARD_NOTE, {"bookId": book_id, "cardNoteId": note_id})


def _edit_pages(client: TestClient, book_id: str, pages: str):
    """``edit-book`` for Dune with only Pages changed."""
    return _post(client, EDIT_BOOK, {"bookId": book_id, **DUNE_FORM, "pages": pages})


def _fields(response) -> dict[str, str]:
    """The refused fields' messages by field; empty when the body has none."""
    fields = response.json().get("error", {}).get("fields") or []
    return {f["field"]: f["message"] for f in fields}


# --- AC-4: deleting the highest note lowers edit-book's Pages floor ------------------


def test_ac4_p1_deleting_the_highest_card_note_lets_pages_go_down_to_the_highest_remaining(
    tmp_path: Path,
) -> None:
    # Dune, 412 pages. The highest note is p.270; the highest remaining one is
    # pp.200–230, which counts by its pageEnd (230), not its pageStart (200).
    # Before the delete, edit-book refuses any Pages below 270.
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    builder.card_note(dune, text="Fear is the mind-killer.", page_start=19)
    builder.card_note(dune, text="The spice must flow.", page_start=200, page_end=230)
    highest = builder.card_note(dune, text="The sleeper must awaken.", page_start=270)
    builder.write(tmp_path)
    client = api_client(tmp_path)

    # The transition: the p.270 note is deleted (its answer stays opaque here).
    _delete_card_note(client, dune, highest)

    lowered = _edit_pages(client, dune, "230")

    # The criterion: Pages can go down to the highest remaining note page.
    assert lowered.status_code == 200
    assert stored_book(tmp_path, dune)["pages"] == 230
    assert [n["text"] for n in stored_book(tmp_path, dune)["cardNotes"]] == [
        "Fear is the mind-killer.",
        "The spice must flow.",
    ]
    assert_invariants(tmp_path)

    # One page below the range's end is still refused, naming 230.
    before = library_bytes(tmp_path)
    refused = _edit_pages(client, dune, "229")
    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "pages_below_card_note"
    assert _fields(refused) == {"pages": "Pages can't be less than 230, where a card note is."}
    assert library_bytes(tmp_path) == before


# --- AC-5: the standard intent ACs (TR8) for both intents ----------------------------


def test_ac5_p0_edit_and_delete_card_note_meet_the_standard_intent_acs(tmp_path: Path) -> None:
    # Dune with two notes, so a success can be checked to touch only its note.
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    kept = builder.card_note(dune, text="Fear is the mind-killer.", page_start=19)
    target = builder.card_note(dune, text="The spice must flow.", page_start=96)
    # Another Book's note: its id is gone as far as Dune is concerned.
    neuromancer = builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    foreign = builder.card_note(neuromancer, text="The sky above the port.", page_start=1)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # A write, fsync or rename fault: 503 couldnt_save and the file is byte-identical.
    # The first iteration's edit is the criterion's first assertion.
    for step in ("write", "fsync", "replace"):
        faulty = api_client(tmp_path, fs=FaultyFs(step))
        for response in (
            _edit_card_note(faulty, dune, target, "The spice must flow!", "97"),
            _delete_card_note(faulty, dune, target),
        ):
            assert response.status_code == 503, step
            assert response.json() == COULDNT_SAVE_BODY, step
            assert library_bytes(tmp_path) == before, step

    # A Book that no longer exists: 409 book_not_found, before the note is looked up.
    client = api_client(tmp_path)
    for response in (
        _edit_card_note(client, GONE_BOOK_ID, target, "Ice.", "42"),
        _delete_card_note(client, GONE_BOOK_ID, target),
    ):
        assert response.status_code == 409
        error = response.json()["error"]
        assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
        assert library_bytes(tmp_path) == before

    # The new code: the Book is there but the note is gone (deleted in another
    # tab). 409 card_note_not_found, checked before the fields, nothing changes.
    for response in (
        _edit_card_note(client, dune, GONE_NOTE_ID, "", "400"),
        _delete_card_note(client, dune, GONE_NOTE_ID),
    ):
        assert response.status_code == 409
        error = response.json()["error"]
        assert (error["kind"], error["code"]) == ("refusal", "card_note_not_found")
        assert error["message"]
        assert _fields(response) == {}
        assert library_bytes(tmp_path) == before
    # A note id from another Book is gone for this Book, too: never applied there.
    for response in (
        _edit_card_note(client, dune, foreign, "Ice.", "1"),
        _delete_card_note(client, dune, foreign),
    ):
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "card_note_not_found"
        assert library_bytes(tmp_path) == before

    # A malformed intent: 422 invalid_fields on `intent`, for both routes.
    for path in (EDIT_CARD_NOTE, DELETE_CARD_NOTE):
        response = client.post(path, files={"intent": (None, "{", "application/json")})
        assert response.status_code == 422, path
        assert response.json()["error"]["code"] == "invalid_fields", path
        assert library_bytes(tmp_path) == before, path

    # Successes: 200 {"ok": true}, the invariants hold, and only the named note changes.
    response = _edit_card_note(client, dune, target, "The spice must flow!", "97")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert_invariants(tmp_path)
    response = _delete_card_note(client, dune, target)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert_invariants(tmp_path)
    assert [n["id"] for n in stored_book(tmp_path, dune)["cardNotes"]] == [kept]

    # The contract: both routes are documented with the error envelope, no 413.
    openapi = create_app().openapi()
    for path in (EDIT_CARD_NOTE, DELETE_CARD_NOTE):
        responses = openapi["paths"][path]["post"]["responses"]
        for status in ("409", "422", "500", "503"):
            ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
            assert ref == "#/components/schemas/ErrorResponse", (path, status)
        assert "413" not in responses, path
    codes = openapi["components"]["schemas"]["ErrorCode"]["enum"]
    assert "card_note_not_found" in codes


# --- Follow-ups: edit-card-note parses and refuses as add-card-note does ------------


def _left_hand_with_note(builder: LibraryBuilder) -> tuple[str, str]:
    """The Left Hand of Darkness (330 pages, as PAGE_REFUSALS expects) and its one note."""
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    note = builder.card_note(left_hand, text="Light is the left hand of darkness.", page_start=233)
    return left_hand, note


def test_edit_card_note_parses_every_page_form(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    left_hand, note = _left_hand_with_note(builder)
    builder.write(tmp_path)
    client = api_client(tmp_path)

    for form, start, end in PAGE_FORMS:
        response = _edit_card_note(client, left_hand, note, "Ice.", form)
        assert response.status_code == 200, form
        stored = stored_book(tmp_path, left_hand)["cardNotes"][0]
        assert (stored["pageStart"], stored["pageEnd"]) == (start, end), form
        assert_invariants(tmp_path)


def test_edit_card_note_refuses_what_add_card_note_refuses_and_saves_nothing(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    left_hand, note = _left_hand_with_note(builder)
    builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    for page, message in PAGE_REFUSALS:
        response = _edit_card_note(client, left_hand, note, "Ice.", page)
        assert response.status_code == 422, page
        assert response.json()["error"]["code"] == "invalid_fields", page
        assert _fields(response) == {"page": message}, page
        assert library_bytes(tmp_path) == before, page

    for text in ("", "  \n\t "):
        response = _edit_card_note(client, left_hand, note, text, "42")
        assert response.status_code == 422, repr(text)
        assert _fields(response) == {"text": "Note is required."}, repr(text)
        assert library_bytes(tmp_path) == before, repr(text)

    # Both at once: Note first, then Page, each named by its label.
    response = _edit_card_note(client, left_hand, note, " ", "400")
    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == ["text", "page"]
    assert response.json()["error"]["message"] == "Not saved. 2 fields need attention: Note, Page."
    assert library_bytes(tmp_path) == before


def test_edit_card_note_changes_the_note_in_place_and_nothing_else(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    first = builder.card_note(dune, text="Fear is the mind-killer.", page_start=19)
    target = builder.card_note(
        dune, text="The spice must flow.", page_start=96, created_at="2026-05-01T10:00:00+02:00"
    )
    last = builder.card_note(dune, text="The sleeper must awaken.", page_start=270)
    neuromancer = builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.card_note(neuromancer, text="The sky above the port.", page_start=1)
    builder.write(tmp_path)
    dune_before = stored_book(tmp_path, dune)
    neuromancer_before = stored_book(tmp_path, neuromancer)
    client = api_client(tmp_path)

    # Moved past the last note's page: the stored position is kept all the same.
    response = _edit_card_note(client, dune, target, "  \n New.\nLine two.  \t", "pp. 300–301")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    dune_after = stored_book(tmp_path, dune)
    notes = dune_after["cardNotes"]
    assert [n["id"] for n in notes] == [first, target, last]
    assert notes[1] == {
        **dune_before["cardNotes"][1],
        "text": "New.\nLine two.",
        "pageStart": 300,
        "pageEnd": 301,
    }
    assert notes[1]["createdAt"] == dune_before["cardNotes"][1]["createdAt"]
    assert [notes[0], notes[2]] == [dune_before["cardNotes"][0], dune_before["cardNotes"][2]]
    assert {**dune_after, "cardNotes": []} == {**dune_before, "cardNotes": []}
    assert stored_book(tmp_path, neuromancer) == neuromancer_before
    assert_invariants(tmp_path)

    # An unchanged edit commits as normal: 200, and the note reads the same.
    response = _edit_card_note(client, dune, target, "New.\nLine two.", "300–301")
    assert response.status_code == 200
    assert stored_book(tmp_path, dune) == dune_after


def test_delete_card_note_removes_only_that_note(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = builder.book(**DUNE)
    first = builder.card_note(dune, text="Fear is the mind-killer.", page_start=19)
    target = builder.card_note(dune, text="The spice must flow.", page_start=96)
    last = builder.card_note(dune, text="The sleeper must awaken.", page_start=270)
    neuromancer = builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.card_note(neuromancer, text="The sky above the port.", page_start=1)
    builder.write(tmp_path)
    dune_before = stored_book(tmp_path, dune)
    neuromancer_before = stored_book(tmp_path, neuromancer)

    response = _delete_card_note(api_client(tmp_path), dune, target)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    dune_after = stored_book(tmp_path, dune)
    assert [n["id"] for n in dune_after["cardNotes"]] == [first, last]
    assert dune_after["cardNotes"] == [dune_before["cardNotes"][0], dune_before["cardNotes"][2]]
    assert {**dune_after, "cardNotes": []} == {**dune_before, "cardNotes": []}
    assert stored_book(tmp_path, neuromancer) == neuromancer_before
    assert_invariants(tmp_path)
