"""The ``stats`` view: Books and pages finished in a range (FR-16, AD-6).

Each finished Reading counts once by its ``finishDate``, back-fills and re-reads
included, with its stored ``finishedPages`` (AD-11). Side read marks change
nothing. The client resolves the presets to dates; the server only counts, and
fills one bucket per calendar month (or year, past 24 months) the range touches.
"""

from datetime import date

from bookvie.domain import Library

from .models import StatsBucket, StatsView

MONTH_BUCKET_LIMIT = 24
"""Ranges spanning more calendar months than this are bucketed by year (AD-6)."""


def months_spanned(start: date, end: date) -> int:
    """The calendar months ``start..end`` touches, both ends included."""
    return (end.year - start.year) * 12 + (end.month - start.month) + 1


def _period(day: date, by_year: bool) -> str:
    """The bucket ``day`` falls in: ``YYYY`` by year, ``YYYY-MM`` by month."""
    return f"{day.year:04d}" if by_year else f"{day.year:04d}-{day.month:02d}"


def _periods(start: date, end: date, by_year: bool) -> list[str]:
    """Every period from ``start``'s to ``end``'s, oldest first, both ends included."""
    if by_year:
        return [f"{year:04d}" for year in range(start.year, end.year + 1)]
    first = start.year * 12 + start.month - 1
    last = end.year * 12 + end.month - 1
    return [f"{index // 12:04d}-{index % 12 + 1:02d}" for index in range(first, last + 1)]


def stats(library: Library, start: date | None, end: date | None) -> StatsView:
    """The totals for ``start..end`` (both inclusive); All time when both are ``None``."""
    finishes = [
        reading
        for book in library.books
        for reading in book.readings
        if reading.finish_date is not None
        and (start is None or end is None or start <= reading.finish_date <= end)
    ]
    dates = [r.finish_date for r in finishes if r.finish_date is not None]
    if start is None or end is None:
        first, last = (min(dates), max(dates)) if dates else (None, None)
    else:
        first, last = start, end
    span = months_spanned(first, last) if first and last else 1
    by_year = span > MONTH_BUCKET_LIMIT
    totals = {period: [0, 0] for period in _periods(first, last, by_year)} if first and last else {}
    for reading in finishes:
        if reading.finish_date is None:
            continue
        bucket = totals[_period(reading.finish_date, by_year)]
        bucket[0] += 1
        bucket[1] += reading.finished_pages or 0
    return StatsView(
        books=len(finishes),
        pages=sum(r.finished_pages or 0 for r in finishes),
        bucket="year" if by_year else "month",
        buckets=[StatsBucket(period=period, books=b, pages=p) for period, (b, p) in totals.items()],
    )
