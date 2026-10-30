"""The ``home`` and ``catalog`` views: pure functions of the committed library."""

from bookvie.domain import Book, Library

from .models import CatalogView, HomeView, LibraryMeter, ShelfBook


def _finished(book: Book) -> bool:
    return any(reading.finished for reading in book.readings)


def _shelf_book(book: Book) -> ShelfBook:
    return ShelfBook(
        id=book.id,
        title=book.title,
        first_author=book.authors[0] if book.authors else "",
        author_count=len(book.authors),
        spine_color=book.spine_color,
        finished=_finished(book),
    )


def _meter(library: Library) -> LibraryMeter:
    return LibraryMeter(
        finished=sum(1 for book in library.books if _finished(book)),
        total=len(library.books),
    )


def catalog(library: Library) -> CatalogView:
    """Every Book, in library order (the client sorts), and the meter."""
    return CatalogView(meter=_meter(library), books=[_shelf_book(b) for b in library.books])


def home(library: Library) -> HomeView:
    """Placeholder slice: the Catalog's books and meter until Stories 3.1/3.5."""
    view = catalog(library)
    return HomeView(meter=view.meter, books=view.books)
