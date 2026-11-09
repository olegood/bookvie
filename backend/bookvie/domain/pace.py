"""Measured pace and days left (AR16, AD-6): the server owns both numbers.

Pure functions of stored values; no clock. Every input is a stored local date
or page count, so the arithmetic is exact (``Fraction``) and the ceiling never
meets a float rounding error.
"""

from fractions import Fraction
from math import ceil

from .model import Library


def measured_pace(library: Library) -> Fraction | None:
    """Pages a day over every finished Reading with a start date.

    Σ (``finishedPages`` − ``startPage``) ÷ Σ (``finishDate`` − ``startDate`` + 1)
    calendar days, over every Book's Readings (re-reads and the Main book's
    earlier Readings included). Only tracked pages count: a Reading started at
    page N adds the pages after N, and never fewer than 0 (Pages can be edited
    below its start), while its days always count. Back-filled Readings (no
    start date) and unfinished ones are left out, and so is a Reading finished
    before it started, so the day sum is never 0. A missing ``finishedPages``
    (hand-edited data) counts as 0.

    ``None`` when no Reading qualifies; ``Fraction(0)`` when they total 0 pages.
    """
    pages = 0
    days = 0
    for book in library.books:
        for reading in book.readings:
            start, finish = reading.start_date, reading.finish_date
            if start is None or finish is None or finish < start:
                continue
            pages += max((reading.finished_pages or 0) - reading.start_page, 0)
            days += (finish - start).days + 1
    if days == 0:
        return None
    return Fraction(pages, days)


def days_left(pages_left: int, pace: Fraction | None) -> int | None:
    """``max(1, ceil(pages_left ÷ pace))``; ``None`` without pace, at pace 0, or with no pages left."""
    if pace is None or pace <= 0 or pages_left <= 0:
        return None
    return max(1, ceil(Fraction(pages_left) / pace))
