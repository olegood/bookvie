"""The ``home``, ``catalog`` and ``book`` views: pure functions of the committed library.

:func:`cover_path` is the lookup behind ``/media/covers/<name>``.
"""

from pathlib import Path

from bookvie.domain import Book, Library
from bookvie.domain.book_fields import merge_tags
from bookvie.store import COVERS_DIR, Store, referenced_covers

from .models import (
    BookDetailView,
    BookReading,
    CatalogView,
    HomeView,
    LibraryMeter,
    Role,
    ShelfBook,
)


def _finished(book: Book) -> bool:
    return any(reading.finished for reading in book.readings)


def _shelf_book(book: Book) -> ShelfBook:
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
        has_cover=book.cover_file is not None,
        finished=_finished(book),
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
        books=[_shelf_book(b) for b in library.books],
        tags=merge_tags(tag for b in library.books for tag in b.tags),
    )


def home(library: Library) -> HomeView:
    """Placeholder slice: the Catalog's books and meter until Stories 3.1/3.5."""
    view = catalog(library)
    return HomeView(meter=view.meter, books=view.books)


def _role(library: Library, book: Book) -> tuple[Role, int | None]:
    """The Book's role and, for ``waiting``, the paused Reading's page."""
    if library.main_book_id == book.id:
        return "main", None
    if library.up_next_book_id == book.id:
        return "upNext", None
    paused = next(
        (r for r in book.readings if not r.finished and r.paused_at is not None), None
    )
    if paused is not None:
        return "waiting", paused.current_page
    return None, None


def book_detail(library: Library, book_id: str) -> BookDetailView | None:
    """One Book for Book detail, or ``None`` when there is no such Book."""
    book = library.book(book_id)
    if book is None:
        return None
    latest = book.latest_finished()
    role, waiting_page = _role(library, book)
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
        latest_finish_date=latest.finish_date if latest else None,
        readings=[
            BookReading(id=r.id, start_date=r.start_date, finish_date=r.finish_date)
            for r in book.readings
        ],
        role=role,
        waiting_page=waiting_page,
    )


def cover_path(store: Store, name: str) -> Path | None:
    """The file of cover ``name`` when a Book's ``coverFile`` names it and it exists."""
    if name not in referenced_covers(store.library):
        return None
    path = store.data_dir / COVERS_DIR / name
    return path if path.is_file() else None
