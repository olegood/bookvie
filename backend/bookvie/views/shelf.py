"""The ``home``, ``catalog`` and ``book`` views: pure functions of the committed library."""

from bookvie.domain import Book, Library
from bookvie.domain.book_fields import merge_tags

from .models import (
    BookDetailView,
    BookReading,
    CatalogView,
    HomeView,
    LibraryMeter,
    ShelfBook,
)


def _finished(book: Book) -> bool:
    return any(reading.finished for reading in book.readings)


def _shelf_book(book: Book) -> ShelfBook:
    return ShelfBook(
        id=book.id,
        title=book.title,
        first_author=book.authors[0] if book.authors else "",
        author_count=len(book.authors),
        authors=list(book.authors),
        pages=book.pages,
        created_at=book.created_at,
        spine_color=book.spine_color,
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


def book_detail(library: Library, book_id: str) -> BookDetailView | None:
    """One Book for Book detail, or ``None`` when there is no such Book."""
    book = library.book(book_id)
    if book is None:
        return None
    latest = book.latest_finished()
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
        spine_color_user=book.spine_color_user,
        latest_finish_date=latest.finish_date if latest else None,
        readings=[
            BookReading(id=r.id, start_date=r.start_date, finish_date=r.finish_date)
            for r in book.readings
        ],
    )
