"""Story 1.7: ``add-book`` saves a new Book only when every field is valid.

One test per acceptance criterion (AC-1 to AC-8, numbered in the order of
epics.md, Story 1.7), then the spec's I/O matrix rows and decided messages.

The tests pin these names:

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
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from bookvie.store import Store
from tests.builder import CURATED, LibraryBuilder
from tests.test_store import FaultyFs

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


def test_ac5_p1_tags_are_trimmed_and_merged_ignoring_case(data_dir: Path) -> None:
    client = _client(data_dir)

    _add(client, tags="sci-fi, Classics, classics , ")

    assert [b["tags"] for b in _stored_books(data_dir)] == [["sci-fi", "Classics"]]
    _add(client, title="Untagged", tags=" , ")
    assert _stored_books(data_dir)[-1]["tags"] == []


# --- back-fill ----------------------------------------------------------------


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


# --- the I/O matrix and the decided messages ---------------------------------

PAGES_MESSAGE = "Pages must be a whole number, 1 or more."
EDITION_MESSAGE = "Edition must be a whole number, 1 or more."
YEAR_MESSAGE = "Year must be a year, like 1965."
ISBN_MESSAGE = "ISBN must have 10 or 13 digits."
COLOR_MESSAGE = "Spine color must be #RRGGBB or empty."
MALFORMED = "The intent must be a JSON object of the form's fields."


@pytest.mark.parametrize(
    ("fields", "expected"),
    [
        ({"pages": "abc"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "12.5"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "-3"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "0"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "+5"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "1e3"}, {"pages": PAGES_MESSAGE}),
        ({"pages": "٣"}, {"pages": PAGES_MESSAGE}),  # a non-ASCII digit
        ({"pages": "9" * 5000}, {"pages": PAGES_MESSAGE}),  # past int()'s digit limit
        ({"edition": "abc"}, {"edition": EDITION_MESSAGE}),
        ({"edition": "2.0"}, {"edition": EDITION_MESSAGE}),
        ({"edition": "-1"}, {"edition": EDITION_MESSAGE}),
        ({"edition": "9" * 5000}, {"edition": EDITION_MESSAGE}),  # past int()'s digit limit
        ({"edition": ""}, {"edition": "Edition is required."}),
        ({"edition": "  "}, {"edition": "Edition is required."}),
        ({"year": "65"}, {"year": YEAR_MESSAGE}),
        ({"year": "19650"}, {"year": YEAR_MESSAGE}),
        ({"year": "2028"}, {"year": YEAR_MESSAGE}),  # today + 2 years
        ({"year": "1965a"}, {"year": YEAR_MESSAGE}),
        ({"isbn": "123456789012"}, {"isbn": ISBN_MESSAGE}),  # 12 digits
        ({"isbn": "12345678901"}, {"isbn": ISBN_MESSAGE}),  # 11 digits
        ({"isbn": "X123456789"}, {"isbn": ISBN_MESSAGE}),  # X not last
        ({"isbn": "978006051275X"}, {"isbn": ISBN_MESSAGE}),  # ISBN-13 ending in X
        ({"isbn": "0-8044-2957.X"}, {"isbn": ISBN_MESSAGE}),
        ({"spineColor": "#12345"}, {"spineColor": COLOR_MESSAGE}),
        ({"spineColor": "#GGHHII"}, {"spineColor": COLOR_MESSAGE}),
        ({"spineColor": "123456"}, {"spineColor": COLOR_MESSAGE}),
        ({"spineColor": "#1234567"}, {"spineColor": COLOR_MESSAGE}),
        ({"type": "novel"}, {"type": "Type must be Paperback, Hardcover or Ebook."}),
        ({"type": "Paperback"}, {"type": "Type must be Paperback, Hardcover or Ebook."}),
        (
            {"finishedOn": "2026-02-30"},
            {"finishedOn": "Finished on must be a date, like 2026-03-14."},
        ),
        (
            {"finishedOn": "30/10/2026"},
            {"finishedOn": "Finished on must be a date, like 2026-03-14."},
        ),
        (
            {"finishedOn": "20261030"},
            {"finishedOn": "Finished on must be a date, like 2026-03-14."},
        ),
        ({"finishedOn": "2027-01-01"}, {"finishedOn": "Finished on can't be in the future."}),
    ],
    ids=lambda v: json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else v,
)
def test_each_rule_refuses_with_its_message(
    data_dir: Path, fields: dict[str, str], expected: dict[str, str]
) -> None:
    before = _library_bytes(data_dir)
    response = _add(_client(data_dir), **fields)
    assert response.status_code == 422
    assert _field_messages(response) == expected
    assert _library_bytes(data_dir) == before


@pytest.mark.parametrize(
    ("fields", "stored"),
    [
        ({"pages": "007"}, {"pages": 7}),
        ({"pages": " 12 "}, {"pages": 12}),
        ({"edition": "03"}, {"edition": 3}),
        ({"year": "1965"}, {"year": 1965}),
        ({"year": " 2027 "}, {"year": 2027}),
        ({"isbn": " 0 8044 2957 X "}, {"isbn": "0 8044 2957 X"}),
        ({"isbn": "080442957x"}, {"isbn": "080442957x"}),
        ({"isbn": "9780060512753"}, {"isbn": "9780060512753"}),
        ({"isbn": "   "}, {"isbn": None}),
        ({"subtitle": "  An Ambiguous Utopia "}, {"subtitle": "An Ambiguous Utopia"}),
        ({"subtitle": " "}, {"subtitle": None}),
        ({"spineColor": " #a1B2c3 "}, {"spineColorUser": "#a1B2c3", "spineColor": "#a1B2c3"}),
        ({"spineColor": "  "}, {"spineColorUser": None, "spineColor": CURATED[0]}),
        ({"title": "  The Dispossessed  "}, {"title": "The Dispossessed"}),
        ({"language": " English\t"}, {"language": "English"}),
        ({"type": " ebook "}, {"type": "ebook"}),
        ({"type": "hardcover"}, {"type": "hardcover"}),
    ],
    ids=lambda v: json.dumps(v) if isinstance(v, dict) else v,
)
def test_accepted_values_are_stored_normalized(
    data_dir: Path, fields: dict[str, str], stored: dict[str, Any]
) -> None:
    response = _add(_client(data_dir), **fields)
    assert response.status_code == 200, response.json()
    book = _stored_book(data_dir, response.json()["ids"]["bookId"])
    assert {key: book[key] for key in stored} == stored


@pytest.mark.parametrize(
    "key", ["title", "pages", "authors", "language", "publisher", "type"]
)
def test_a_missing_required_key_is_required(data_dir: Path, key: str) -> None:
    intent = {k: v for k, v in VALID.items() if k != key}
    response = _client(data_dir).post(
        ADD_BOOK, files={"intent": (None, json.dumps(intent), "application/json")}
    )
    assert response.status_code == 422
    labels = {"authors": "Author(s)"}
    label = labels.get(key, key.capitalize())
    assert _field_messages(response) == {key: f"{label} is required."}


def test_year_0000_is_four_digits_and_accepted(data_dir: Path) -> None:
    response = _add(_client(data_dir), year="0000")
    assert response.status_code == 200
    assert _stored_book(data_dir, response.json()["ids"]["bookId"])["year"] == 0


def test_fields_are_listed_in_form_order_and_the_message_names_labels(
    data_dir: Path,
) -> None:
    response = _client(data_dir).post(
        ADD_BOOK,
        files={
            "intent": (
                None,
                json.dumps(
                    {
                        "spineColor": "red",
                        "tags": "x",
                        "finishedOn": "nope",
                        "year": "1",
                        "isbn": "1",
                        "type": "x",
                        "edition": "x",
                        "subtitle": "ok",
                        "pages": "x",
                    }
                ),
                "application/json",
            )
        },
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert [f["field"] for f in error["fields"]] == [
        "title",
        "pages",
        "authors",
        "edition",
        "language",
        "publisher",
        "type",
        "isbn",
        "year",
        "finishedOn",
        "spineColor",
    ]
    assert error["message"] == (
        "Not saved. 11 fields need attention: Title, Pages, Author(s), Edition, Language, "
        "Publisher, Type, ISBN, Year, Finished on, Spine color."
    )


def test_top_message_matches_the_experience_example(data_dir: Path) -> None:
    response = _add(_client(data_dir), pages="", language=" ")
    assert response.json()["error"] == {
        "kind": "refusal",
        "code": "invalid_fields",
        "message": "Not saved. 2 fields need attention: Pages, Language.",
        "fields": [
            {"field": "pages", "message": "Pages is required."},
            {"field": "language", "message": "Language is required."},
        ],
    }


@pytest.mark.parametrize(
    "files",
    [
        {"other": (None, json.dumps(VALID), "application/json")},  # no intent part
        {"intent": (None, "{not json", "application/json")},
        {"intent": (None, json.dumps([VALID]), "application/json")},
        {"intent": (None, "[" * 200000, "application/json")},
        {"intent": (None, json.dumps("title"), "application/json")},
        {"intent": (None, json.dumps({**VALID, "ownership": "owned"}), "application/json")},
        {"intent": (None, json.dumps({**VALID, "finished_on": "2026-03-14"}), "application/json")},
        {"intent": (None, json.dumps({**VALID, "pages": 387}), "application/json")},
        {"intent": (None, json.dumps({**VALID, "authors": ["A", "B"]}), "application/json")},
        {"intent": (None, json.dumps({**VALID, "edition": None}), "application/json")},
    ],
    ids=[
        "missing",
        "not-json",
        "array",
        "deeply-nested",
        "string",
        "unknown-key",
        "snake-case-key",
        "number-value",
        "list-value",
        "null-value",
    ],
)
def test_malformed_intent_is_an_intent_field_error(data_dir: Path, files: dict) -> None:
    before = _library_bytes(data_dir)
    response = _client(data_dir).post(ADD_BOOK, files=files)
    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "invalid_fields",
            "message": "Not saved. 1 field needs attention: intent.",
            "fields": [{"field": "intent", "message": MALFORMED}],
        }
    }
    assert _library_bytes(data_dir) == before


def test_a_request_without_a_body_is_an_intent_field_error(data_dir: Path) -> None:
    response = _client(data_dir).post(ADD_BOOK)
    assert response.status_code == 422
    assert _field_messages(response) == {"intent": MALFORMED}


def test_two_adds_get_distinct_ids(data_dir: Path) -> None:
    client = _client(data_dir)
    first = _add(client, finishedOn="2026-03-14").json()["ids"]["bookId"]
    second = _add(client, finishedOn="2026-03-14").json()["ids"]["bookId"]
    assert first != second
    books = _stored_books(data_dir)
    assert [b["id"] for b in books] == [first, second]
    assert books[0]["readings"][0]["id"] != books[1]["readings"][0]["id"]


@pytest.mark.parametrize("day", [date(2026, 3, 29), date(2026, 10, 25)])
def test_dst_day_today_keeps_its_local_date(data_dir: Path, day: date) -> None:
    store = Store.open(data_dir)
    app = create_app(data_dir / "no-static", data_dir=data_dir, store=store, clock=FakeClock(day))
    client = TestClient(app, base_url=BASE_URL)
    response = _add(client, finishedOn=day.isoformat())
    assert response.status_code == 200
    book = _stored_book(data_dir, response.json()["ids"]["bookId"])
    assert datetime.fromisoformat(book["createdAt"]).date() == day
    assert book["readings"][0]["finishDate"] == day.isoformat()
    tomorrow = date.fromordinal(day.toordinal() + 1).isoformat()
    assert _add(client, finishedOn=tomorrow).status_code == 422


def test_curated_rotation_counts_existing_books(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    for _ in range(3):
        builder.book()
    builder.write(tmp_path)
    response = _add(_client(tmp_path))
    book = _stored_book(tmp_path, response.json()["ids"]["bookId"])
    assert book["spineColorCurated"] == CURATED[3]


def test_a_broken_library_rule_on_add_is_500_and_commits_nothing(
    data_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixed = uuid.UUID(int=4, version=4)
    monkeypatch.setattr(uuid, "uuid4", lambda: fixed)
    client = _client(data_dir)
    assert _add(client).status_code == 200
    before = _library_bytes(data_dir)
    response = _add(client)  # the same id again breaks unique_book_ids
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "couldnt_save"
    assert _library_bytes(data_dir) == before
