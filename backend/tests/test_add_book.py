"""Story 1.7: ``add-book`` saves a new Book only when every field is valid.

ATDD red phase: one skipped scaffold per acceptance criterion (AC-1 to AC-8,
numbered in the order of epics.md, Story 1.7). Un-skip one at a time while
implementing; see the story's ATDD checklist for the green-phase follow-ups.

The scaffolds pin these names for the implementation:

- ``POST /api/intents/add-book``, ``multipart/form-data`` with a JSON part
  named ``intent`` holding the form's raw strings (camelCase keys: ``title``,
  ``subtitle``, ``pages``, ``authors``, ``edition``, ``language``,
  ``publisher``, ``type``, ``isbn``, ``year``, ``finishedOn``, ``tags``,
  ``spineColor``). The server owns parsing and every message.
- ``bookvie.domain.clock.FakeClock(today)`` (AD-20, the deferred Clock work)
  and ``create_app(..., clock=...)``.
- ``OkResponse.ids`` as an object, ``{"bookId": "<uuid>"}`` (AD-9).
- ``CatalogView.tags`` and ``ShelfBook.authors``, ``pages``, ``createdAt``.
"""

import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library, check_invariants
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from bookvie.store import Store
from tests.builder import CURATED, LibraryBuilder
from tests.test_store import FaultyFs

RED = "ATDD red phase: un-skip when Story 1.7 implements POST /api/intents/add-book"

BASE_URL = "http://127.0.0.1:8765"
ADD_BOOK = "/api/intents/add-book"
# The fake today. Year may be at most next year (2027); Finished on at most today.
TODAY = date(2026, 10, 30)

# Only the required fields, as the New book panel sends them (Edition omitted).
VALID = {
    "title": "The Dispossessed",
    "pages": "387",
    "authors": "Ursula K. Le Guin",
    "language": "English",
    "publisher": "Harper",
    "type": "paperback",
}


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    LibraryBuilder().write(tmp_path / "data")
    return tmp_path / "data"


def _client(data_dir: Path, fs: FaultyFs | None = None) -> TestClient:
    from bookvie.domain.clock import FakeClock  # Story 1.7 prerequisite (AD-20)

    store = Store.open(data_dir, fs=fs)
    app = create_app(
        data_dir / "no-static", data_dir=data_dir, store=store, clock=FakeClock(TODAY)
    )
    return TestClient(app, base_url=BASE_URL, raise_server_exceptions=False)


def _add(client: TestClient, **fields: str):
    intent = {**VALID, **fields}
    return client.post(
        ADD_BOOK, files={"intent": (None, json.dumps(intent), "application/json")}
    )


def _library_bytes(data_dir: Path) -> bytes:
    return (data_dir / "library.json").read_bytes()


def _stored_books(data_dir: Path) -> list[dict[str, Any]]:
    return json.loads(_library_bytes(data_dir))["books"]


def _stored_book(data_dir: Path, book_id: str) -> dict[str, Any]:
    (book,) = [b for b in _stored_books(data_dir) if b["id"] == book_id]
    return book


def _field_messages(response) -> dict[str, str]:
    return {f["field"]: f["message"] for f in response.json()["error"]["fields"]}


# --- saving -------------------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac1_p0_valid_add_book_saves_the_book_and_returns_its_id(data_dir: Path) -> None:
    client = _client(data_dir)

    response = _add(client, subtitle="An Ambiguous Utopia", isbn="978-0-06-051275-3")

    assert response.status_code == 200
    body = response.json()
    book_id = body["ids"]["bookId"]
    assert body == {"ok": True, "ids": {"bookId": book_id}}
    assert uuid.UUID(book_id).version == 4
    book = _stored_book(data_dir, book_id)
    created_at = datetime.fromisoformat(book["createdAt"])
    assert created_at.tzinfo is not None
    assert created_at.date() == TODAY
    assert {k: v for k, v in book.items() if k not in ("id", "createdAt")} == {
        "ownership": "owned",
        "title": "The Dispossessed",
        "subtitle": "An Ambiguous Utopia",
        "authors": ["Ursula K. Le Guin"],
        "pages": 387,
        "edition": 1,
        "language": "English",
        "publisher": "Harper",
        "type": "paperback",
        "isbn": "978-0-06-051275-3",
        "year": None,
        "tags": [],
        "coverFile": None,
        "spineColorUser": None,
        "spineColorFromCover": None,
        "spineColorCurated": CURATED[0],
        "spineColor": CURATED[0],
        "readings": [],
        "cardNotes": [],
    }


@pytest.mark.skip(reason=RED)
def test_ac2_p0_curated_color_rotates_and_resolved_color_is_stored(data_dir: Path) -> None:
    client = _client(data_dir)

    for n in range(9):
        _add(client, title=f"Book {n}")

    curated = [b["spineColorCurated"] for b in _stored_books(data_dir)]
    assert curated == [*CURATED, CURATED[0]]  # Sage … Stone, then Sage again
    assert [b["spineColor"] for b in _stored_books(data_dir)] == curated
    _add(client, title="Coloured", spineColor="#1A2B3C")
    book = _stored_books(data_dir)[-1]
    assert book["spineColorUser"] == "#1A2B3C"
    assert book["spineColorCurated"] == CURATED[1]  # the 10th Book
    assert book["spineColor"] == "#1A2B3C"


# --- validation ---------------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac3_p0_every_failing_field_is_listed_and_nothing_is_saved(data_dir: Path) -> None:
    client = _client(data_dir)
    before = _library_bytes(data_dir)

    response = _add(
        client,
        title="   ",
        pages="",
        authors="  ",
        edition="0",
        language="",
        publisher=" ",
        type="",
        isbn="12345",
        year="65",
        finishedOn="2026-10-31",
        spineColor="red",
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert _field_messages(response) == {
        "title": "Title is required.",
        "pages": "Pages is required.",
        "authors": "Author(s) is required.",
        "edition": "Edition must be a whole number, 1 or more.",
        "language": "Language is required.",
        "publisher": "Publisher is required.",
        "type": "Type is required.",
        "isbn": "ISBN must have 10 or 13 digits.",
        "year": "Year must be a year, like 1965.",
        "finishedOn": "Finished on can't be in the future.",
        "spineColor": "Spine color must be #RRGGBB or empty.",
    }
    assert _library_bytes(data_dir) == before
    # The edge of every rule is accepted, not refused.
    edge = _add(
        client,
        pages="1",
        edition="1",
        isbn="0 8044 2957 X",
        year="2027",
        finishedOn=TODAY.isoformat(),
        spineColor="#a1B2c3",
    )
    assert edge.status_code == 200


# --- normalizing --------------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac4_p1_authors_are_split_on_semicolons_and_trimmed(data_dir: Path) -> None:
    client = _client(data_dir)

    _add(client, authors="Ursula K. Le Guin; Brian Attebery")

    assert [b["authors"] for b in _stored_books(data_dir)] == [
        ["Ursula K. Le Guin", "Brian Attebery"]
    ]
    _add(client, authors=" ; Ursula K. Le Guin ;; ")
    assert _stored_books(data_dir)[-1]["authors"] == ["Ursula K. Le Guin"]
    refused = _add(client, authors=" ; ;")
    assert refused.status_code == 422
    assert _field_messages(refused) == {"authors": "Author(s) is required."}


@pytest.mark.skip(reason=RED)
def test_ac5_p1_tags_are_trimmed_and_merged_ignoring_case(data_dir: Path) -> None:
    client = _client(data_dir)

    _add(client, tags="sci-fi, Classics, classics , ")

    assert [b["tags"] for b in _stored_books(data_dir)] == [["sci-fi", "Classics"]]
    _add(client, title="Untagged", tags=" , ")
    assert _stored_books(data_dir)[-1]["tags"] == []


# --- back-fill ----------------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac6_p0_finished_on_back_fills_one_finished_reading(data_dir: Path) -> None:
    client = _client(data_dir)

    _add(client, finishedOn="2026-03-14")

    readings = [r for b in _stored_books(data_dir) for r in b["readings"]]
    assert len(readings) == 1
    (reading,) = readings
    assert reading["startDate"] is None
    assert reading["finishDate"] == "2026-03-14"
    assert reading["finishedPages"] == 387
    assert uuid.UUID(reading["id"]).version == 4
    library = json.loads(_library_bytes(data_dir))
    assert library["mainBookId"] is None  # a back-fill is not a Reading in progress
    _add(client, title="Unread", finishedOn="")
    assert _stored_books(data_dir)[-1]["readings"] == []


# --- the catalog view ---------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac7_p1_catalog_view_shows_saved_books_and_existing_tags(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    builder.book(title="SPQR", authors=["Mary Beard"], tags=["history"])
    builder.write(tmp_path)
    client = _client(tmp_path)
    _add(
        client,
        authors="Ursula K. Le Guin; Brian Attebery",
        tags="sci-fi, Classics",
        finishedOn="2026-03-14",
    )

    view = client.get("/api/views/catalog").json()

    shown = [b for b in view["books"] if b["title"] == "The Dispossessed"]
    assert [b.get("pages") for b in shown] == [387]
    (book,) = shown
    stored = _stored_books(tmp_path)[-1]
    assert book["id"] == stored["id"]
    assert book["authors"] == ["Ursula K. Le Guin", "Brian Attebery"]
    assert book["finished"] is True
    assert book["createdAt"] == stored["createdAt"]
    assert book["spineColor"] == stored["spineColor"]
    assert sorted(view["tags"]) == ["Classics", "history", "sci-fi"]


# --- standard intent ACs (TR8) ------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_ac8_p0_failed_commit_changes_nothing_and_success_keeps_invariants(
    tmp_path: Path,
) -> None:
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        LibraryBuilder().write(data_dir)
        before = _library_bytes(data_dir)

        response = _add(_client(data_dir, fs=FaultyFs(step)))

        assert response.status_code == 503, step
        assert response.json() == {
            "error": {
                "kind": "couldnt_save",
                "code": "couldnt_save",
                "message": COULDNT_SAVE_MESSAGE,
            }
        }
        assert _library_bytes(data_dir) == before, step
    data_dir = tmp_path / "ok"
    LibraryBuilder().write(data_dir)
    client = _client(data_dir)
    _add(client, finishedOn="2026-03-14")
    _add(client, title="The Left Hand of Darkness", tags="sci-fi")
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))
    assert len(_stored_books(data_dir)) == 2
