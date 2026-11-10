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

RED PHASE: neither intent exists yet, so every leaf is skipped. Activate one
at a time by deleting its ``@pytest.mark.skip`` line.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    DUNE,
    DUNE_FORM,
    EDIT_BOOK,
    FaultyFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

RED = "RED phase: edit-card-note and delete-card-note are not implemented yet (Story 5.2)"

# Move both to tests/helpers.py with the implementation, beside ADD_CARD_NOTE.
EDIT_CARD_NOTE = "/api/intents/edit-card-note"
DELETE_CARD_NOTE = "/api/intents/delete-card-note"

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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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
