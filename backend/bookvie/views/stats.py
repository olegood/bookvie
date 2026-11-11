"""The ``stats`` view: Books and pages finished in a range (FR-16, AD-6).

Each finished Reading counts once by its ``finishDate``, back-fills and re-reads
included, with its stored ``finishedPages`` (AD-11). Side read marks change
nothing. The client resolves the presets to dates; the server only counts.
"""

from datetime import date

from bookvie.domain import Library

from .models import StatsView

MONTH_BUCKET_LIMIT = 24
"""Ranges spanning more calendar months than this are bucketed by year (AD-6)."""


def months_spanned(start: date, end: date) -> int:
    """The calendar months ``start..end`` touches, both ends included."""
    return (end.year - start.year) * 12 + (end.month - start.month) + 1


def stats(library: Library, start: date | None, end: date | None) -> StatsView:
    """The totals for ``start..end`` (both inclusive); All time when both are ``None``."""
    finishes = [
        reading
        for book in library.books
        for reading in book.readings
        if reading.finish_date is not None
        and (start is None or end is None or start <= reading.finish_date <= end)
    ]
    if start is None or end is None:
        dates = [r.finish_date for r in finishes if r.finish_date is not None]
        span = months_spanned(min(dates), max(dates)) if dates else 1
    else:
        span = months_spanned(start, end)
    return StatsView(
        books=len(finishes),
        pages=sum(r.finished_pages or 0 for r in finishes),
        bucket="year" if span > MONTH_BUCKET_LIMIT else "month",
        buckets=[],
    )
