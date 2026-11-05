"""Reading progress: the one percentage rule (AD-6) and a Book's current Reading.

Pure functions of the stored values; no clock.
"""

from .model import Book, Reading


def percent(page: int, pages: int) -> int:
    """``floor(page × 100 ÷ pages)``: 100 only at the last page, 0 at page 0.

    ``pages`` is at least 1 (the model's bound).
    """
    return page * 100 // pages


def current_reading(book: Book) -> Reading | None:
    """The Book's single unfinished Reading, or ``None`` when every Reading is finished."""
    return next((reading for reading in book.readings if not reading.finished), None)
