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
    side_read: bool
    """Whether the Book is a Side read (``sideReadBookIds``): ", on the side" in its spine name."""
    type: Literal["paperback", "hardcover", "ebook"]
    """The Book's type as stored; read by Catalog's Type filter chips."""
    language: str
    """The Book's language as stored; read by Catalog's Language filter."""
    tags: list[str]
    """The Book's tags as stored; read by Catalog's Tag filter."""


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
    days_left: int | None
    """``ceil(pages left ÷ Measured pace)``, at least 1; ``None`` without Measured pace,
    at pace 0, or with no pages left (AD-6)."""
    last_progress_update: AwareDatetime | None
    """The current Reading's ``lastProgressUpdate``, as stored ("Last updated …")."""
    card_note_count: int
    """How many Card notes the Main book has ("See card notes · N")."""


class HomeUpNext(_View):
    """The Up next Book as Home's Up next pane, the empty Main book card and the Start dialog show it."""

    id: str
    title: str
    authors: list[str]
    cover_file: str | None
    """``covers/<name>``, served at ``/media/<coverFile>``; ``None`` without a cover."""
    has_cover: bool
    paused: bool
    """Whether the Book has a current (unfinished) Reading: **Resume** and "moves to
    Waiting for you." when true, **Start reading** and a line from ``side_read`` when
    false (a finished Book with no Reading in progress counts as never started)."""
    side_read: bool
    """Whether the Book is a Side read: "stays on the side." instead of "returns to the
    catalog." when a not-paused Up next is displaced."""


class HomeWaiting(_View):
    """One row of Home's Waiting for you pane: a paused Reading's Book.

    Never carries ``pausedAt``: the date orders the list and is never shown
    (UX-DR38, NFR6).
    """

    id: str
    title: str
    pages: int
    current_page: int
    """The paused Reading's page."""
    percent: int
    """``floor(currentPage × 100 ÷ pages)``, computed only on the server (AD-6)."""


class HomeSideRead(_View):
    """One row of Home's On the side pane: a Side read."""

    id: str
    title: str
    authors: list[str]


class HomeView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
    main_book: HomeMainBook | None
    """The Main book and its current Reading; ``None`` when there is no Main book."""
    up_next: HomeUpNext | None
    """The Up next Book; ``None`` when there is none (or it names the Main book)."""
    waiting: list[HomeWaiting]
    """Waiting for you: every paused Reading except the Up next Book's, with no cap (FR-7, AD-6).

    A Book is listed when its shelf role is ``waiting`` (a Side read and a
    finished Book's paused re-read included). Ordered by ``pausedAt``, oldest
    first (a Reading without one first of all), then by the title key, then
    by Book id; the client renders it in this order. Empty when nothing is
    waiting. ``pausedAt`` itself is never sent.
    """
    side_reads: list[HomeSideRead]
    """On the side: every Side read, in ``sideReadBookIds`` order (FR-8, UX-DR38).

    A Side read that is also Up next or Waiting for you is listed here too.
    Empty when there are none.
    """
    last_export_at: AwareDatetime | None
    """When the last complete export finished (``local-state.json``); ``None`` before the first."""
    slice_priority: list[str]
    """Book ids for Home's bookcase slice, each at most once, in priority order (AD-6).

    The Main book, then Up next (when it isn't the Main book), then every other
    Book with a finished Reading by its latest ``finishDate``, newest first;
    ties by the title key, then Book id. Back-filled finishes count. A Book with
    no role and no finish is not listed. The client packs ``books`` into rows
    and chooses rows in this order; it never sorts finishes.
    """


class CatalogView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
    tags: list[str]
    """Every tag in the library once, ignoring case (the Tags suggestions)."""
    pages_left: int
    """Library-scope pages left (FR-15): the sum of every Book's Book-scope pages left.
    Never-started Books count all their pages, every active or paused Reading (re-reads
    and the Up next Book's included) counts ``pages − currentPage`` (never below 0), and
    Books with only finished Readings count 0. Side read marks change nothing. Catalog's
    "How long until…?" calculator counts it down."""
    measured_pace: float | None
    """The library's Measured pace in pages a day (AD-6), not rounded, the same value as
    the book view's. ``None`` when there is none."""


class BookReading(_View):
    id: str
    start_date: date | None
    finish_date: date | None
    rating: int | None
    """1 to 5 stars; ``null`` when unrated or not finished."""
    purpose_fulfilled: Literal["yes", "partly", "notYet"] | None
    """The Finish dialog's answer; ``null`` when skipped or not finished."""


class CurrentReading(_View):
    """The Main book's, the Up next Book's or a paused Book's unfinished Reading
    (Book detail's Current reading)."""

    status: Literal["main", "upNext", "waiting"]
    start_date: date | None
    current_page: int
    percent: int
    """``floor(currentPage × 100 ÷ pages)`` (AD-6)."""
    purpose: str | None


class BookCardNote(_View):
    """One Card note as Book detail's "Card notes (N)" block shows it (AD-18)."""

    id: str
    text: str
    page_start: int
    page_end: int | None
    """``None`` for one page."""
    created_at: AwareDatetime


class CardNotesScope(_View):
    """The Book a scoped Card notes view is limited to (the "In *X*" chip)."""

    book_id: str
    title: str


class CardNotesGroup(_View):
    """One Book's Card notes on the Card notes page, under its title."""

    book_id: str
    title: str
    notes: list[BookCardNote]
    """In page order: ``pageStart``, then ``createdAt``."""


class CardNotesView(_View):
    """The Card notes page: every note grouped by Book, or one Book's (FR-19)."""

    scope: CardNotesScope | None
    """The Book the view is scoped to (``?book=<id>``); ``None`` unscoped."""
    groups: list[CardNotesGroup]
    """One group per Book with notes, by title key, then Book id (AD-6). Scoped:
    only that Book's group, or none when it has no notes."""


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
    """Set when ``role`` is ``main`` or ``waiting``, or ``upNext`` with a paused Reading:
    the Reading the role is about."""
    side_read: bool
    """Whether the Book is a Side read: **Remove from side** instead of **Mark as Side read**."""
    side_reads_full: bool
    """Whether there are 3 Side reads and this Book isn't one of them: **Mark as Side read**
    is disabled with "Up to 3 side reads."."""
    card_notes: list[BookCardNote]
    """The Book's Card notes in page order: ``pageStart``, then ``createdAt``."""
    pages_left: int
    """Book-scope pages left (FR-15): ``pages − currentPage`` of the current (active or
    paused) Reading, never below 0; all its pages when it has never been started; 0
    when every Reading is finished. The "How long until…?" calculator counts it down."""
    measured_pace: float | None
    """The library's Measured pace in pages a day (AD-6), not rounded: the client rounds
    the calculator's prefill to one decimal. ``None`` when there is none."""


class BackupView(_View):
    """What the Backup page shows."""

    last_export_at: AwareDatetime | None
    """When the last complete export download finished; ``None`` before the first."""


class StatsBucket(_View):
    """One month or year of the Stats bars: the finishes inside the range in that period."""

    period: str
    """``YYYY-MM`` for a month bucket, ``YYYY`` for a year bucket."""
    books: int
    pages: int


class StatsView(_View):
    """What the Stats page shows for a range (FR-16, AD-6)."""

    books: int
    """How many finished Readings have their ``finishDate`` in the range (re-reads count again)."""
    pages: int
    """The sum of those Readings' stored ``finishedPages`` (``None`` counts as 0, AD-11)."""
    bucket: Literal["month", "year"]
    """``year`` when the range spans more than 24 calendar months, else ``month``. All
    time spans the earliest finish to the latest; with no finishes it is ``month``."""
    buckets: list[StatsBucket]
    """The bars' buckets, oldest first: one for every calendar month (or year) from the
    range's start to its end, empty ones included as 0 books and 0 pages. All time runs
    from the earliest finish's period to the latest's, and is ``[]`` with no finishes."""
