"""Response models of the read-only views (camelCase on the wire)."""

from datetime import date
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


Role = Literal["main", "upNext", "waiting"] | None
"""A Book's place in the reading plan, as the Confirm dialog names it (``BookDetailView.role``)."""


class _View(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LibraryMeter(_View):
    """The "X of Y finished" meter: Books with a finished Reading, of all Books."""

    finished: int
    total: int


class ShelfBook(_View):
    id: str
    title: str
    subtitle: str | None
    first_author: str
    author_count: int
    authors: list[str]
    pages: int
    year: int | None
    created_at: AwareDatetime
    spine_color: str
    """The resolved color: user, else from cover, else curated (AD-11)."""
    spine_color_user: str | None
    spine_color_from_cover: str | None
    has_cover: bool
    """Whether the Book has a cover (the Spine popover's "From cover" swatch)."""
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
    spine_color: str
    """The resolved color: user, else from cover, else curated (AD-11)."""
    spine_color_user: str | None
    cover_file: str | None
    """``covers/<name>``, served at ``/media/<coverFile>``; ``None`` without a cover."""
    spine_color_from_cover: str | None
    """The color the cover gave (the "From cover" swatch); ``None`` without one."""
    has_cover: bool
    """Whether a cover is recorded, as ``ShelfBook`` says: the domain flag Change color
    reads. ``cover_file`` is only the path the page renders the image from."""
    finished: bool
    """Whether any Reading is finished, as ``ShelfBook`` says (the "shown once read" note)."""
    latest_finish_date: date | None
    """The most recent finish date: what the Edit book panel prefills in Finished on."""
    readings: list[BookReading]
    """In stored order; the client lists them newest first."""
    role: Role
    """The Book's place in the reading plan, as the Confirm dialog names it.

    ``main`` (Main book), else ``upNext`` (Up next wins over a paused Reading),
    else ``waiting`` (an unfinished paused Reading, a Side read's included),
    else ``None``. Being a Side read alone gives no role.
    """
    waiting_page: int | None
    """The paused Reading's current page; set only when ``role`` is ``waiting``."""
