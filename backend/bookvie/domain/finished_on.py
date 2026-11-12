"""Finished on: the field's parser, its messages, and the long date they show.

Pure: no store, no clock (``today`` is passed in). :func:`parse_finished_on`
reads the trimmed ``YYYY-MM-DD`` value, refusing a malformed or future date;
:data:`FinishedOnRule` is a caller's extra check on the parsed date (edit
mode). :func:`long_date` is the locale-free "12 March 2026" its messages
use.
"""

import re
from collections.abc import Callable
from datetime import date

_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")

FINISHED_ON_FORMAT_MESSAGE = "Finished on must be a date, like 2026-03-14."
FINISHED_ON_FUTURE_MESSAGE = "Finished on can't be in the future."
# Edit mode only (Story 1.11).
FINISH_DATE_REMOVED_MESSAGE = "A finish date can't be removed here."

_MONTHS = (
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
)

FinishedOnRule = Callable[[date | None], str | None]
"""An extra Finished on check: the parsed date (``None`` when empty) to a failure message."""


def long_date(day: date) -> str:
    """The date as "12 March 2026": day, full English month name, year (locale-free)."""
    return f"{day.day} {_MONTHS[day.month - 1]} {day.year}"


def finished_before_start_message(start: date) -> str:
    return f"Finished on can't be before {long_date(start)}, when this reading started."


def finished_after_current_start_message(start: date) -> str:
    return f"Finished on can't be after {long_date(start)}, when the current reading started."


def finished_before_earlier_finish_message(finish: date) -> str:
    return f"Finished on can't be before {long_date(finish)}, when an earlier reading finished."


def _date(value: str) -> date | None:
    if not _DATE.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def parse_finished_on(raw: str | None, today: date) -> tuple[date | None, str | None]:
    """Finished on as ``(date or None when empty, failure message or None)``."""
    text = (raw or "").strip()
    if not text:
        return None, None
    finished_on = _date(text)
    if finished_on is None:
        return None, FINISHED_ON_FORMAT_MESSAGE
    if finished_on > today:
        return None, FINISHED_ON_FUTURE_MESSAGE
    return finished_on, None
