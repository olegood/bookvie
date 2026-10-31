"""Response models of the read-only views (camelCase on the wire)."""

from datetime import date
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _View(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LibraryMeter(_View):
    """The "X of Y finished" meter: Books with a finished Reading, of all Books."""

    finished: int
    total: int


class ShelfBook(_View):
    id: str
    title: str
    first_author: str
    author_count: int
    authors: list[str]
    pages: int
    created_at: AwareDatetime
    spine_color: str
    finished: bool


class HomeView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]


class CatalogView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
    tags: list[str]
    """Every tag in the library once, ignoring case (the Tags suggestions)."""


class BookReading(_View):
    id: str
    start_date: date | None
    finish_date: date | None


class BookDetailView(_View):
    """One Book as Book detail and the Edit book panel show it."""

    id: str
    title: str
    subtitle: str | None
    authors: list[str]
    pages: int
    edition: int
    language: str
    publisher: str
    type: Literal["paperback", "hardcover", "ebook"]
    isbn: str | None
    year: int | None
    tags: list[str]
    spine_color_user: str | None
    latest_finish_date: date | None
    """The most recent finish date: what the Edit book panel prefills in Finished on."""
    readings: list[BookReading]
    """In stored order; the client lists them newest first."""
