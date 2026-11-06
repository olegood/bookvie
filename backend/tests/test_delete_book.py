"""Story 1.12: ``delete-book`` removes a Book after confirmation (FR-1, NFR5).

One red-phase test per server-side acceptance criterion (AC-3 and AC-5,
numbered in the order of epics.md, Story 1.12). AC-1, AC-2 and AC-4 are the
Confirm dialog on Book detail, in ``frontend/e2e/delete-book.spec.ts``.

The tests pin these names:

- ``POST /api/intents/delete-book``, ``multipart/form-data`` with a JSON part
  named ``intent`` holding ``{"bookId": ...}``, as ``edit-book`` does.
  Success is exactly ``{ok: true}``.
- The Book goes with its Readings and Card notes, and ``mainBookId``,
  ``upNextBookId`` and ``sideReadBookIds`` entries naming it are cleared in
  the same commit. Nothing is promoted into a vacated pointer (CAT-API-007).
- 409 ``book_not_found`` for a Book that is gone; no new error code.
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
    DELETE_BOOK,
    FaultyFs,
    api_client,
    assert_invariants,
    field_messages,
    library_bytes,
    stored_books,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"


def _delete(client: TestClient, book_id: str):
    """``delete-book`` for ``book_id``, as the Confirm dialog sends it."""
    intent = {"bookId": book_id}
    return client.post(
        DELETE_BOOK, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _library(data_dir: Path) -> dict[str, Any]:
    return json.loads(library_bytes(data_dir))


def _book_ids(data_dir: Path) -> list[str]:
    return [book["id"] for book in stored_books(data_dir)]


def _pointers(data_dir: Path) -> tuple[str | None, str | None, list[str]]:
    doc = _library(data_dir)
    return doc["mainBookId"], doc["upNextBookId"], doc["sideReadBookIds"]


# --- AC-3: the Book, its Readings and Card notes, and every pointer, in one commit ---


def test_ac3_p0_delete_book_removes_the_book_with_its_readings_and_notes_and_clears_pointers(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Dune is the Main book, read to p.120, with two Card notes. Neuromancer is
    # Up next, paused at p.80. The Dispossessed waits for you at p.120.
    # Accelerate and Piranesi are Side reads.
    dune = library_builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    dune_reading = library_builder.reading(dune, current_page=120)
    dune_finished = library_builder.reading(
        dune, current_page=412, finish_date="2019-08-14", finished_pages=412
    )
    dune_notes = [
        library_builder.card_note(dune, text="Fear is the mind-killer.", page_start=19),
        library_builder.card_note(dune, text="The spice must flow.", page_start=96, page_end=98),
    ]
    neuromancer = library_builder.book(title="Neuromancer", authors=["William Gibson"], pages=271)
    library_builder.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    dispossessed = library_builder.book(
        title="The Dispossessed", authors=["Ursula K. Le Guin"], pages=387
    )
    library_builder.reading(dispossessed, current_page=120, paused_at="2026-09-15")
    accelerate = library_builder.book(title="Accelerate", pages=288)
    library_builder.reading(accelerate, current_page=40)
    piranesi = library_builder.book(title="Piranesi", pages=245)
    library_builder.reading(piranesi, current_page=12)
    library_builder.main(dune).up_next(neuromancer).side_read(accelerate).side_read(piranesi)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = _delete(client, dune)

    # The Book is gone.
    assert dune not in _book_ids(tmp_path)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    # Its Readings and Card notes went with it: no trace of their ids remains.
    text = library_bytes(tmp_path).decode()
    for gone in [dune, dune_reading, dune_finished, *dune_notes]:
        assert gone not in text, gone
    # The vacated Main book stays empty; Up next is not promoted, Side reads stay.
    assert _pointers(tmp_path) == (None, neuromancer, [accelerate, piranesi])
    assert _book_ids(tmp_path) == [neuromancer, dispossessed, accelerate, piranesi]
    assert_invariants(tmp_path)

    # Deleting Up next empties it; the paused Book waiting for you stays waiting.
    assert _delete(client, neuromancer).status_code == 200
    assert _pointers(tmp_path) == (None, None, [accelerate, piranesi])
    assert dispossessed in _book_ids(tmp_path)
    assert_invariants(tmp_path)

    # Deleting a Side read drops only its entry; the others keep their order.
    assert _delete(client, accelerate).status_code == 200
    assert _pointers(tmp_path) == (None, None, [piranesi])
    assert _book_ids(tmp_path) == [dispossessed, piranesi]
    assert_invariants(tmp_path)

    # The last Books can go too: an empty library is valid.
    assert _delete(client, dispossessed).status_code == 200
    assert _delete(client, piranesi).status_code == 200
    assert _library(tmp_path)["books"] == []
    assert _pointers(tmp_path) == (None, None, [])


# --- AC-5: the standard intent guarantees (TR8) ---------------------------------


def test_ac5_p0_delete_book_keeps_the_standard_intent_guarantees(tmp_path: Path) -> None:
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        builder = LibraryBuilder()
        dune = builder.book(title="Dune", pages=412)
        builder.reading(dune, current_page=120)
        builder.card_note(dune, page_start=19)
        builder.main(dune)
        builder.write(data_dir)
        before = library_bytes(data_dir)

        response = _delete(api_client(data_dir, fs=FaultyFs(step)), dune)

        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        # Neither the removal nor the cleared pointer landed: one commit or none.
        assert library_bytes(data_dir) == before, step

    # Success keeps the invariants.
    data_dir = tmp_path / "ok"
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=412)
    builder.reading(dune, current_page=120)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    builder.main(dune).up_next(neuromancer)
    builder.write(data_dir)
    client = api_client(data_dir)
    assert _delete(client, dune).status_code == 200
    assert_invariants(data_dir)

    # The Book just deleted no longer exists: a second delete is refused, and
    # nothing changes. So is an id that never existed.
    before = library_bytes(data_dir)
    for book_id in (dune, GONE_ID):
        gone = _delete(client, book_id)
        assert gone.status_code == 409, book_id
        assert gone.json()["error"]["code"] == "book_not_found", book_id
        assert library_bytes(data_dir) == before, book_id

    # delete-book adds no error code; the one it uses is in the contract (AD-8).
    codes = create_app().openapi()["components"]["schemas"]["ErrorCode"]["enum"]
    assert "book_not_found" in codes


# --- follow-ups -------------------------------------------------------------------


def test_deleting_a_book_that_is_up_next_and_a_side_read_clears_both(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.reading(dune, current_page=120, paused_at="2026-10-01")
    accelerate = library_builder.book(title="Accelerate", pages=288)
    library_builder.reading(accelerate, current_page=40)
    piranesi = library_builder.book(title="Piranesi", pages=245)
    library_builder.reading(piranesi, current_page=12)
    library_builder.up_next(dune).side_read(accelerate).side_read(dune).side_read(piranesi)
    library_builder.write(tmp_path)

    response = _delete(api_client(tmp_path), dune)

    assert response.status_code == 200
    assert _pointers(tmp_path) == (None, None, [accelerate, piranesi])
    assert _book_ids(tmp_path) == [accelerate, piranesi]
    assert_invariants(tmp_path)


@pytest.mark.parametrize(
    "intent",
    [
        None,
        "{",
        "null",
        "[]",
        json.dumps({}),
        json.dumps({"bookId": None}),
        json.dumps({"bookId": 7}),
        json.dumps({"bookId": GONE_ID, "confirm": True}),
    ],
    ids=["no-part", "not-json", "null", "array", "missing", "null-id", "number-id", "extra-key"],
)
def test_a_malformed_delete_intent_is_an_intent_field_error(
    tmp_path: Path, library_builder: LibraryBuilder, intent: str | None
) -> None:
    library_builder.book(title="Dune")
    library_builder.write(tmp_path)
    before = library_bytes(tmp_path)
    client = api_client(tmp_path)
    if intent is None:
        response = client.post(DELETE_BOOK)
    else:
        response = client.post(DELETE_BOOK, files={"intent": (None, intent, "application/json")})
    assert response.status_code == 422
    assert field_messages(response) == {
        "intent": "The intent must be a JSON object of the form's fields."
    }
    assert library_bytes(tmp_path) == before
