"""The ``home``, ``catalog`` and ``book`` views: pure functions of the committed library.

:func:`cover_path` is the lookup behind ``/media/covers/<name>``.
"""

from datetime import datetime
from pathlib import Path

from bookvie.domain import (
    Book,
    Library,
    Reading,
    current_reading,
    days_left,
    measured_pace,
    percent,
    reading_status,
)
from bookvie.domain.book_fields import merge_tags
from bookvie.store import COVERS_DIR, Store, read_last_export, referenced_covers

from .models import (
    BookDetailView,
    BookReading,
    CatalogView,
    CurrentReading,
    HomeMainBook,
    HomeView,
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
    )


def _meter(library: Library) -> LibraryMeter:
    return LibraryMeter(
        finished=sum(1 for book in library.books if _finished(book)),
        total=len(library.books),
    )


def catalog(library: Library) -> CatalogView:
    """Every Book, in library order (the client sorts), the meter and the tags.

    Tags merge ignoring case; the first spelling in library order wins.
    """
    return CatalogView(
        meter=_meter(library),
        books=[_shelf_book(library, b) for b in library.books],
        tags=merge_tags(tag for b in library.books for tag in b.tags),
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
        days_left=days_left(book.pages - page, measured_pace(library)),
        last_progress_update=reading.last_progress_update if reading else None,
    )


def home(library: Library, last_export_at: datetime | None = None) -> HomeView:
    """The Main book, "Last export", and (until Story 3.5's slice) the Catalog's books and meter."""
    view = catalog(library)
    return HomeView(
        meter=view.meter,
        books=view.books,
        main_book=_main_book(library),
        last_export_at=last_export_at,
    )


def home_for(store: Store) -> HomeView:
    """:func:`home` of the committed library, with "Last export" from ``local-state.json``."""
    return home(store.library, read_last_export(store.data_dir))


def _role_reading(library: Library, book: Book) -> tuple[Role, Reading | None]:
    """The Book's role and, for ``main`` and ``waiting``, the Reading it is about."""
    if library.main_book_id == book.id:
        return "main", current_reading(book)
    if library.up_next_book_id == book.id:
        return "upNext", None
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
    """Book detail's Current reading block; only ``main`` and ``waiting`` carry a Reading."""
    if reading is None:
        return None
    return CurrentReading(
        status="main" if role == "main" else "waiting",
        start_date=reading.start_date,
        current_page=reading.current_page,
        percent=percent(reading.current_page, book.pages),
        purpose=reading.purpose,
    )


def book_detail(library: Library, book_id: str) -> BookDetailView | None:
    """One Book for Book detail, or ``None`` when there is no such Book."""
    book = library.book(book_id)
    if book is None:
        return None
    latest = book.latest_finished()
    role, reading = _role_reading(library, book)
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
            BookReading(id=r.id, start_date=r.start_date, finish_date=r.finish_date)
            for r in book.readings
        ],
        role=role,
        waiting_page=_waiting_page(role, reading),
        current_reading=_current_reading(book, role, reading),
    )


def cover_path(store: Store, name: str) -> Path | None:
    """The file of cover ``name`` when a Book's ``coverFile`` names it and it exists."""
    if name not in referenced_covers(store.library):
        return None
    path = store.data_dir / COVERS_DIR / name
    return path if path.is_file() else None
