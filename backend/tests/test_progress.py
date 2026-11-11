"""``domain.progress``: the percentage rule (AD-6), the current Reading, its status (AD-19)
and Book-scope pages left (FR-15)."""

from bookvie.domain import current_reading, pages_left, percent, reading_status
from tests.builder import LibraryBuilder


def test_percent_floors() -> None:
    cases = [(0, 330, 0), (1, 330, 0), (212, 330, 64), (329, 330, 99), (330, 330, 100), (2, 3, 66)]
    assert [percent(page, pages) for page, pages, _ in cases] == [want for *_, want in cases]


def test_current_reading_is_the_unfinished_one(library_builder: LibraryBuilder) -> None:
    dune = library_builder.book(title="Dune")
    library_builder.reading(dune, finish_date="2025-01-01", finished_pages=300, current_page=300)
    unfinished = library_builder.reading(dune, current_page=12)
    emma = library_builder.book(title="Emma")
    library_builder.reading(emma, finish_date="2025-01-01", finished_pages=300, current_page=300)
    library = library_builder.build()
    reading = current_reading(library.books[0])
    assert reading is not None and reading.id == unfinished
    assert current_reading(library.books[1]) is None


def test_reading_status_is_finished_active_or_paused(library_builder: LibraryBuilder) -> None:
    dune = library_builder.book(title="Dune")
    library_builder.reading(dune, finish_date="2025-01-01", finished_pages=300, current_page=300)
    library_builder.reading(dune, current_page=12, paused_at="2026-10-01")
    emma = library_builder.book(title="Emma")
    library_builder.reading(emma, current_page=40)
    library_builder.main(dune)
    library = library_builder.build()
    done, rereading = library.books[0].readings
    (unpaused,) = library.books[1].readings
    assert reading_status(library, library.books[0], done) == "finished"
    # Active while Main, whatever pausedAt says.
    assert reading_status(library, library.books[0], rereading) == "active"
    # Paused when unfinished and not Main, with or without pausedAt.
    assert reading_status(library, library.books[1], unpaused) == "paused"


def test_pages_left_is_book_scope(library_builder: LibraryBuilder) -> None:
    b = library_builder
    paused = b.book(title="Neuromancer", pages=271)
    b.reading(paused, current_page=80, paused_at="2026-10-01")
    active = b.book(title="The Left Hand of Darkness", pages=330)
    b.reading(active, current_page=120)
    b.book(title="Dune", pages=412)
    finished = b.book(title="Emma", pages=400)
    b.reading(finished, finish_date="2026-09-20", finished_pages=400, current_page=400)
    reread = b.book(title="Kindred", pages=100)
    b.reading(
        reread, start_date=None, finish_date="2025-06-01", finished_pages=100, current_page=100
    )
    b.reading(reread, current_page=30, paused_at="2026-10-15")
    # Pages edited below the current page: never negative.
    shrunk = b.book(title="Hyperion", pages=200)
    b.reading(shrunk, current_page=210)
    at_end = b.book(title="Piranesi", pages=245)
    b.reading(at_end, current_page=245)
    b.main(active)
    books = {book.title: book for book in b.build().books}
    assert {title: pages_left(book) for title, book in books.items()} == {
        "Neuromancer": 191,
        "The Left Hand of Darkness": 210,
        "Dune": 412,
        "Emma": 0,
        "Kindred": 70,
        "Hyperion": 0,
        "Piranesi": 0,
    }
