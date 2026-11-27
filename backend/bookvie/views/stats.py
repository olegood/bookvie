"""The ``stats`` view: Books and pages finished in a range (FR-16, AD-6).

Each finished Reading counts once by its ``finishDate``, back-fills and re-reads
included, with its stored ``finishedPages`` (AD-11). Side read marks change
nothing. The client resolves the presets to dates; the server only counts, and
fills one bucket per calendar month (or year, past 24 months) the range touches.

The range rules live here too, so the stats route and the ``get_stats`` agent
tool refuse a bad range alike (AD-21): :data:`IsoDate` parses each end, and
:func:`check_stats_range` checks the pair.
"""

import re
from datetime import date
from typing import Annotated

from pydantic import BeforeValidator

from bookvie.domain import Book, Library, Reading, title_key
from bookvie.intents.contract import FieldError, invalid_fields

from .models import StatsBucket, StatsFinish, StatsView

MONTH_BUCKET_LIMIT = 24
"""Ranges spanning more calendar months than this are bucketed by year (AD-6)."""

_ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


def _iso_date(value: object) -> object:
    """Refuse anything but a ``YYYY-MM-DD`` string: a lax ``date`` also takes datetimes,
    timestamps and numbers."""
    if not isinstance(value, str) or not _ISO_DATE.fullmatch(value):
        raise ValueError("Use YYYY-MM-DD.")
    return value


IsoDate = Annotated[date, BeforeValidator(_iso_date)]
"""One end of a stats range: a ``YYYY-MM-DD`` string, parsed laxly into a ``date``."""


def check_stats_range(start: date | None, end: date | None) -> None:
    """Refuse a half range, or an ``end`` before ``start``, with 422 ``invalid_fields``."""
    if start is None and end is not None:
        raise invalid_fields([FieldError(field="from", message="Give both from and to.")])
    if end is None and start is not None:
        raise invalid_fields([FieldError(field="to", message="Give both from and to.")])
    if start is not None and end is not None and end < start:
        raise invalid_fields([FieldError(field="to", message="To is before From.")])


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


def _finish(book: Book, reading: Reading, finish_date: date) -> StatsFinish:
    """One row of the finished list, read as stored; a null ``finishedPages`` is 0."""
    return StatsFinish(
        reading_id=reading.id,
        book_id=book.id,
        title=book.title,
        first_author=book.authors[0] if book.authors else "",
        author_count=len(book.authors),
        cover_file=book.cover_file,
        spine_color=book.spine_color,
        finish_date=finish_date,
        finished_pages=reading.finished_pages or 0,
        rating=reading.rating,
    )


def stats(library: Library, start: date | None, end: date | None) -> StatsView:
    """The totals for ``start..end`` (both inclusive); All time when both are ``None``.

    ``finishes`` lists the same Readings the totals count, newest ``finishDate``
    first, then :func:`title_key`, then Book id, then the Readings' stored order.
    """
    found = [
        (book, index, reading)
        for book in library.books
        for index, reading in enumerate(book.readings)
        if reading.finish_date is not None
        and (start is None or end is None or start <= reading.finish_date <= end)
    ]
    finishes = [reading for _, _, reading in found]
    # Newest first: sort ascending by the tie-breaks, then stably by date descending.
    found.sort(key=lambda item: (title_key(item[0].title), item[0].id, item[1]))
    found.sort(key=lambda item: item[2].finish_date or date.min, reverse=True)
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
        finishes=[
            _finish(book, reading, reading.finish_date)
            for book, _, reading in found
            if reading.finish_date is not None
        ],
    )
