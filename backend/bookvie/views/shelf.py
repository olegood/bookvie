"""The ``home``, ``catalog`` and ``book`` views: pure functions of the committed library.

:func:`cover_path` is the lookup behind ``/media/covers/<name>``.
"""

from datetime import date, datetime
from pathlib import Path

from bookvie.domain import (
    MAX_SIDE_READS,
    Book,
    Library,
    Reading,
    current_reading,
    days_left,
    measured_pace,
    pages_left,
    percent,
    reading_status,
    title_key,
)
from bookvie.domain.book_fields import merge_tags
from bookvie.store import COVERS_DIR, Store, read_last_export, referenced_covers

from .models import (
    BookCardNote,
    BookDetailView,
    BookReading,
    CatalogView,
    CurrentReading,
    HomeMainBook,
    HomeSideRead,
    HomeUpNext,
    HomeView,
    HomeWaiting,
    LibraryMeter,
    Role,
    ShelfBook,
)


def _finished(book: Book) -> bool:
    return any(reading.finished for reading in book.readings)


def _has_cover(book: Book) -> bool:
    return book.cover_file is not None


def _shelf_book(library: Library, book: Book) -> ShelfBook:
    role, waiting_page = _role(library, book)
    reading = current_reading(book)
    return ShelfBook(
        id=book.id,
        title=book.title,
        subtitle=book.subtitle,
        first_author=book.authors[0] if book.authors else "",
        author_count=len(book.authors),
        authors=list(book.authors),
        pages=book.pages,
        edition=book.edition,
        year=book.year,
        created_at=book.created_at,
        spine_color=book.spine_color,
        spine_color_user=book.spine_color_user,
        spine_color_from_cover=book.spine_color_from_cover,
        has_cover=_has_cover(book),
        finished=_finished(book),
        role=role,
        current_page=reading.current_page if reading else None,
        percent=percent(reading.current_page, book.pages) if reading else None,
        waiting_page=waiting_page,
        side_read=book.id in library.side_read_book_ids,
        type=book.type,
        language=book.language,
        tags=list(book.tags),
    )


def _meter(library: Library) -> LibraryMeter:
    return LibraryMeter(
        finished=sum(1 for book in library.books if _finished(book)),
        total=len(library.books),
    )


def catalog(library: Library) -> CatalogView:
    """Every Book, in library order (the client sorts), the meter and the tags.

    Tags merge ignoring case; the first spelling in library order wins.
    Library-scope pages left is the sum of every Book's Book-scope pages left
    (FR-15), so the two scopes can't disagree.
    """
    pace = measured_pace(library)
    return CatalogView(
        meter=_meter(library),
        books=[_shelf_book(library, b) for b in library.books],
        tags=merge_tags(tag for b in library.books for tag in b.tags),
        pages_left=sum(pages_left(b) for b in library.books),
        measured_pace=None if pace is None else float(pace),
    )


def _main_book(library: Library) -> HomeMainBook | None:
    """The Main book for Home's card; ``None`` when there is none.

    The Main book always has an unfinished Reading (an invariant); without
    one it reads as page 0. Days left uses the library's Measured pace.
    """
    if library.main_book_id is None:
        return None
    book = library.book(library.main_book_id)
    if book is None:
        return None
    reading = current_reading(book)
    page = reading.current_page if reading else 0
    return HomeMainBook(
        id=book.id,
        title=book.title,
        authors=list(book.authors),
        edition=book.edition,
        cover_file=book.cover_file,
        has_cover=_has_cover(book),
        pages=book.pages,
        current_page=page,
        percent=percent(page, book.pages),
        days_left=days_left(pages_left(book), measured_pace(library)),
        last_progress_update=reading.last_progress_update if reading else None,
        card_note_count=len(book.card_notes),
    )


def _up_next(library: Library) -> HomeUpNext | None:
    """The Up next Book for Home; ``None`` without one, when missing, or when it is Main."""
    up_next_id = library.up_next_book_id
    if up_next_id is None or up_next_id == library.main_book_id:
        return None
    book = library.book(up_next_id)
    if book is None:
        return None
    return HomeUpNext(
        id=book.id,
        title=book.title,
        authors=list(book.authors),
        cover_file=book.cover_file,
        has_cover=_has_cover(book),
        paused=current_reading(book) is not None,
        side_read=book.id in library.side_read_book_ids,
    )


def _slice_priority(library: Library) -> list[str]:
    """Book ids in slice priority order: Main, Up next, then finishes newest first (AD-6).

    Finishes tie by :func:`title_key`, then Book id. Each id appears once, at
    its first place; a role naming a missing Book is skipped.
    """
    priority: list[str] = []
    for role_id in (library.main_book_id, library.up_next_book_id):
        if role_id is not None and role_id not in priority and library.book(role_id):
            priority.append(role_id)
    finishes: list[tuple[date, Book]] = []
    for book in library.books:
        latest = book.latest_finished()
        if book.id not in priority and latest is not None and latest.finish_date is not None:
            finishes.append((latest.finish_date, book))
    # Newest first, then title key and id ascending: sort ascending by the
    # tie-breakers, then stably by date descending.
    finishes.sort(key=lambda item: (title_key(item[1].title), item[1].id))
    finishes.sort(key=lambda item: item[0], reverse=True)
    return priority + [book.id for _, book in finishes]


def _waiting(library: Library) -> list[HomeWaiting]:
    """Waiting for you: every Book whose role is ``waiting`` (Up next wins), in order (AD-6).

    By ``pausedAt``, oldest first, a Reading without one (only from a
    hand-edited or restored file) first of all; then :func:`title_key`, then
    Book id. No cap.
    """
    paused: list[tuple[Book, Reading]] = []
    for book in library.books:
        role, reading = _role_reading(library, book)
        if role == "waiting" and reading is not None:
            paused.append((book, reading))
    paused.sort(
        key=lambda item: (
            item[1].paused_at is not None,
            item[1].paused_at or date.min,
            title_key(item[0].title),
            item[0].id,
        )
    )
    return [
        HomeWaiting(
            id=book.id,
            title=book.title,
            pages=book.pages,
            current_page=reading.current_page,
            percent=percent(reading.current_page, book.pages),
        )
        for book, reading in paused
    ]


def _side_reads(library: Library) -> list[HomeSideRead]:
    """On the side: every Side read, in ``sideReadBookIds`` order; a missing Book is skipped."""
    rows: list[HomeSideRead] = []
    for book_id in library.side_read_book_ids:
        book = library.book(book_id)
        if book is not None:
            rows.append(HomeSideRead(id=book.id, title=book.title, authors=list(book.authors)))
    return rows


def home(library: Library, last_export_at: datetime | None = None) -> HomeView:
    """Home's view of the committed library.

    The Main book, Up next, Waiting for you, On the side, "Last export", the Catalog's
    books and meter, and the slice priority. The client packs ``books`` into
    the bookcase slice's rows; ``slice_priority`` chooses them.
    """
    view = catalog(library)
    return HomeView(
        meter=view.meter,
        books=view.books,
        main_book=_main_book(library),
        up_next=_up_next(library),
        waiting=_waiting(library),
        side_reads=_side_reads(library),
        last_export_at=last_export_at,
        slice_priority=_slice_priority(library),
    )


def home_for(store: Store) -> HomeView:
    """:func:`home` of the committed library, with "Last export" from ``local-state.json``."""
    return home(store.library, read_last_export(store.data_dir))


def _role_reading(library: Library, book: Book) -> tuple[Role, Reading | None]:
    """The Book's role and the Reading it is about: for ``main`` and ``waiting``, and for
    ``upNext`` its paused (current) Reading, ``None`` when it has none."""
    if library.main_book_id == book.id:
        return "main", current_reading(book)
    if library.up_next_book_id == book.id:
        return "upNext", current_reading(book)
    reading = current_reading(book)
    if reading is not None and reading_status(library, book, reading) == "paused":
        return "waiting", reading
    return None, None


def _waiting_page(role: Role, reading: Reading | None) -> int | None:
    """For ``waiting``, the paused Reading's page."""
    return reading.current_page if role == "waiting" and reading is not None else None


def _role(library: Library, book: Book) -> tuple[Role, int | None]:
    """The Book's role and, for ``waiting``, the paused Reading's page."""
    role, reading = _role_reading(library, book)
    return role, _waiting_page(role, reading)


def _current_reading(book: Book, role: Role, reading: Reading | None) -> CurrentReading | None:
    """Book detail's Current reading block; ``None`` for a Book with no Reading in progress."""
    if reading is None or role is None:
        return None
    return CurrentReading(
        status=role,
        start_date=reading.start_date,
        current_page=reading.current_page,
        percent=percent(reading.current_page, book.pages),
        purpose=reading.purpose,
    )


def card_note_views(book: Book) -> list[BookCardNote]:
    """The Book's Card notes in page order: ``pageStart``, then ``createdAt``."""
    return [
        BookCardNote(
            id=n.id,
            text=n.text,
            page_start=n.page_start,
            page_end=n.page_end,
            created_at=n.created_at,
        )
        for n in sorted(book.card_notes, key=lambda n: (n.page_start, n.created_at))
    ]


def book_detail(library: Library, book_id: str) -> BookDetailView | None:
    """One Book for Book detail, or ``None`` when there is no such Book."""
    book = library.book(book_id)
    if book is None:
        return None
    latest = book.latest_finished()
    role, reading = _role_reading(library, book)
    side_read = book.id in library.side_read_book_ids
    pace = measured_pace(library)
    return BookDetailView(
        id=book.id,
        title=book.title,
        subtitle=book.subtitle,
        authors=list(book.authors),
        pages=book.pages,
        edition=book.edition,
        language=book.language,
        publisher=book.publisher,
        type=book.type,
        isbn=book.isbn,
        year=book.year,
        tags=list(book.tags),
        spine_color=book.spine_color,
        spine_color_user=book.spine_color_user,
        cover_file=book.cover_file,
        spine_color_from_cover=book.spine_color_from_cover,
        has_cover=_has_cover(book),
        finished=_finished(book),
        latest_finish_date=latest.finish_date if latest else None,
        readings=[
            BookReading(
                id=r.id,
                start_date=r.start_date,
                finish_date=r.finish_date,
                rating=r.rating,
                purpose_fulfilled=r.purpose_fulfilled,
            )
            for r in book.readings
        ],
        role=role,
        waiting_page=_waiting_page(role, reading),
        current_reading=_current_reading(book, role, reading),
        side_read=side_read,
        side_reads_full=not side_read and len(library.side_read_book_ids) >= MAX_SIDE_READS,
        card_notes=card_note_views(book),
        pages_left=pages_left(book),
        measured_pace=None if pace is None else float(pace),
    )


def cover_path(store: Store, name: str) -> Path | None:
    """The file of cover ``name`` when a Book's ``coverFile`` names it and it exists."""
    if name not in referenced_covers(store.library):
        return None
    path = store.data_dir / COVERS_DIR / name
    return path if path.is_file() else None
