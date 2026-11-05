"""``domain.progress``: the percentage rule (AD-6), the current Reading and its status (AD-19)."""

from bookvie.domain import current_reading, percent, reading_status
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
