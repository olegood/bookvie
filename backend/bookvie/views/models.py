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
    role: Role
    """The Book's place in the reading plan, as ``BookDetailView.role`` defines it."""
    current_page: int | None
    """The current (unfinished) Reading's page; ``None`` without one."""
    percent: int | None
    """``floor(currentPage × 100 ÷ pages)`` of the current Reading; ``None`` without one (AD-6)."""
    waiting_page: int | None
    """The paused Reading's current page; set only when ``role`` is ``waiting``."""


class HomeMainBook(_View):
    """The Main book as Home's Main book card shows it."""

    id: str
    title: str
    authors: list[str]
    edition: int
    cover_file: str | None
    """``covers/<name>``, served at ``/media/<coverFile>``; ``None`` without a cover."""
    has_cover: bool
    pages: int
    current_page: int
    percent: int
    """``floor(currentPage × 100 ÷ pages)``, computed only here (AD-6)."""


class HomeView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
    main_book: HomeMainBook | None
    """The Main book and its current Reading; ``None`` when there is no Main book."""
    last_export_at: AwareDatetime | None
    """When the last complete export finished (``local-state.json``); ``None`` before the first."""


class CatalogView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
    tags: list[str]
    """Every tag in the library once, ignoring case (the Tags suggestions)."""


class BookReading(_View):
    id: str
    start_date: date | None
    finish_date: date | None


class CurrentReading(_View):
    """The Main book's or a paused Book's unfinished Reading (Book detail's Current reading)."""

    status: Literal["main", "waiting"]
    start_date: date | None
    current_page: int
    percent: int
    """``floor(currentPage × 100 ÷ pages)`` (AD-6)."""
    purpose: str | None


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
    else ``waiting`` (the current, unfinished Reading of a Book that isn't
    Main is paused, AD-19; a Side read's included), else ``None`` (no
    unfinished Reading).
    """
    waiting_page: int | None
    """The paused Reading's current page; set only when ``role`` is ``waiting``."""
    current_reading: CurrentReading | None
    """Set when ``role`` is ``main`` or ``waiting``: the Reading the role is about."""


class BackupView(_View):
    """What the Backup page shows."""

    last_export_at: AwareDatetime | None
    """When the last complete export download finished; ``None`` before the first."""
