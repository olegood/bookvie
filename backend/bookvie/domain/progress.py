"""Reading progress: the one percentage rule (AD-6), a Book's current Reading and its status (AD-19).

Pure functions of the stored values; no clock.
"""

from typing import Literal

from .model import Book, Library, Reading

ReadingStatus = Literal["finished", "active", "paused"]


def percent(page: int, pages: int) -> int:
    """``floor(page × 100 ÷ pages)``: 100 only at the last page, 0 at page 0.

    ``pages`` is at least 1 (the model's bound).
    """
    return page * 100 // pages


def current_reading(book: Book) -> Reading | None:
    """The Book's single unfinished Reading, or ``None`` when every Reading is finished."""
    return next((reading for reading in book.readings if not reading.finished), None)


def pages_left(book: Book) -> int:
    """Book-scope pages left (FR-15): what the Book's pace calculator counts down.

    With an unfinished Reading (active or paused), ``pages − currentPage``, never
    below 0 (Pages can be edited below the current page). With no Reading at all,
    all its pages. With only finished Readings, 0: nothing is left to read.
    """
    reading = current_reading(book)
    if reading is not None:
        return max(book.pages - reading.current_page, 0)
    return 0 if book.readings else book.pages


def reading_status(library: Library, book: Book, reading: Reading) -> ReadingStatus:
    """The only status function (AD-19): *finished* with a ``finishDate``, *active*
    when ``book`` is the Main book, else *paused*. ``pausedAt`` plays no part.
    """
    if reading.finished:
        return "finished"
    if library.main_book_id == book.id:
        return "active"
    return "paused"
