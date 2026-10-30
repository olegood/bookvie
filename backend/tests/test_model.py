"""The AD-18/AD-19 document model: shape, aliases, strict types."""

from datetime import date

import pytest
from pydantic import ValidationError

from bookvie.domain.model import Book, Library, Reading
from tests.builder import CURATED, LibraryBuilder


def test_empty_library_is_the_v1_document() -> None:
    assert Library.empty().model_dump(by_alias=True) == {
        "schemaVersion": 1,
        "mainBookId": None,
        "upNextBookId": None,
        "sideReadBookIds": [],
        "books": [],
    }


def test_field_order_follows_ad18_and_ad19() -> None:
    assert [f.alias for f in Book.model_fields.values()] == [
        "id", "createdAt", "ownership", "title", "subtitle", "authors", "pages",
        "edition", "language", "publisher", "type", "isbn", "year", "tags",
        "coverFile", "spineColorUser", "spineColorFromCover", "spineColorCurated",
        "spineColor", "readings", "cardNotes",
    ]  # fmt: skip
    assert [f.alias for f in Reading.model_fields.values()] == [
        "id", "startDate", "currentPage", "purpose", "lastProgressUpdate", "pausedAt",
        "finishDate", "finishedPages", "purposeFulfilled", "rating",
    ]  # fmt: skip


def test_builder_defaults_are_valid(library_builder: LibraryBuilder) -> None:
    first = library_builder.book()
    second = library_builder.book(spine_color_user="#112233")
    library_builder.reading(first, current_page=10)
    library_builder.card_note(first, page_start=2, page_end=3)
    library = library_builder.build()
    a, b = library.books
    assert a.id == first and b.id == second
    assert a.spine_color == a.spine_color_curated == CURATED[0]
    assert b.spine_color_curated == CURATED[1]
    assert b.spine_color == "#112233"
    assert a.readings[0].start_date == date(2026, 1, 1)
    assert a.created_at.utcoffset() is not None


def test_populate_by_name_and_alias() -> None:
    by_alias = Library.model_validate_json(
        '{"schemaVersion": 1, "mainBookId": null, "upNextBookId": null,'
        ' "sideReadBookIds": [], "books": []}'
    )
    assert by_alias == Library.empty()


def _doc(library_builder: LibraryBuilder, **book: object) -> dict:
    library_builder.book(**book)
    return library_builder.build().model_dump(mode="json", by_alias=True)


def _reject(doc: dict) -> None:
    import json

    with pytest.raises(ValidationError):
        Library.model_validate_json(json.dumps(doc))


def test_unknown_key_is_refused(library_builder: LibraryBuilder) -> None:
    doc = _doc(library_builder)
    doc["books"][0]["shelf"] = "top"
    _reject(doc)
    doc = _doc(LibraryBuilder())
    doc["extra"] = 1
    _reject(doc)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("pages", "300"),
        ("pages", 0),
        ("pages", True),
        ("pages", 12.5),
        ("edition", 0),
        ("type", "audiobook"),
        ("ownership", "borrowed"),
        ("authors", "Frank Herbert"),
        ("createdAt", "2026-01-01T09:00:00"),  # no offset
        ("title", None),
    ],
)
def test_wrong_types_are_refused(library_builder: LibraryBuilder, field: str, value: object) -> None:
    doc = _doc(library_builder)
    doc["books"][0][field] = value
    _reject(doc)


@pytest.mark.parametrize(
    ("field", "value"),
    [("rating", 0), ("rating", 6), ("purposeFulfilled", "no"), ("startDate", "2026-13-01")],
)
def test_reading_field_bounds(library_builder: LibraryBuilder, field: str, value: object) -> None:
    book = library_builder.book()
    library_builder.reading(book)
    doc = library_builder.build().model_dump(mode="json", by_alias=True)
    doc["books"][0]["readings"][0][field] = value
    _reject(doc)


def test_missing_key_is_refused(library_builder: LibraryBuilder) -> None:
    doc = _doc(library_builder)
    del doc["books"][0]["subtitle"]
    _reject(doc)


def test_nullable_reading_fields_accept_null_and_values(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(
        book,
        start_date=None,
        last_progress_update=None,
        finish_date="2026-02-01",
        finished_pages=300,
        purpose="Learn",
        purpose_fulfilled="notYet",
        rating=5,
        paused_at="2026-01-15",
    )
    reading = library_builder.build().books[0].readings[0]
    assert reading.finished
    assert reading.purpose_fulfilled == "notYet"
    assert reading.paused_at == date(2026, 1, 15)


def test_library_book_lookup(library_builder: LibraryBuilder) -> None:
    book = library_builder.book(title="Dune")
    library = library_builder.build()
    assert library.book(book).title == "Dune"
    assert library.book("missing") is None
