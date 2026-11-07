"""Parse and validate the New book form's raw strings (Agent Label Contract).

Pure: no store, no clock (``today`` is passed in). :func:`parse_book_fields`
trims every value first, then returns either the normalized
:class:`BookFields` or every failure as ``(key, message)`` in form order, one
per field. Keys are the camelCase intent keys; :data:`~.labels.LABELS` maps
them to the form's labels. This module holds the parser and its own rules
(Pages, Edition, Type, ISBN, Year, Authors and Tags); the labels and shared
failures are in :mod:`.labels`, Finished on in :mod:`.finished_on`, and the
Spine color rules in :mod:`.spine_color`. ``edit-book`` (Story 1.11) and
duplicate detection (Story 1.9) reuse this module.
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date

from .finished_on import FinishedOnRule, parse_finished_on
from .labels import LABELS, FieldFailure, required_message
from .model import BookType
from .spine_color import SPINE_COLOR_MESSAGE, is_hex_color

BOOK_TYPES: tuple[BookType, ...] = ("paperback", "hardcover", "ebook")

DEFAULT_EDITION = 1

_WHOLE = re.compile(r"[0-9]+")
_YEAR = re.compile(r"[0-9]{4}")
_ISBN10 = re.compile(r"[0-9]{9}[0-9Xx]")
_ISBN13 = re.compile(r"[0-9]{13}")

PAGES_MESSAGE = "Pages must be a whole number, 1 or more."
EDITION_MESSAGE = "Edition must be a whole number, 1 or more."
TYPE_MESSAGE = "Type must be Paperback, Hardcover or Ebook."
ISBN_MESSAGE = "ISBN must have 10 or 13 digits."
YEAR_MESSAGE = "Year must be a year, like 1965."


def pages_below_current_page_message(page: int) -> str:
    return f"Pages can't be less than {page}, the page you're on."


def pages_below_card_note_message(page: int) -> str:
    return f"Pages can't be less than {page}, where a card note is."


@dataclass(frozen=True)
class BookFields:
    title: str
    subtitle: str | None
    pages: int
    authors: list[str]
    edition: int
    language: str
    publisher: str
    type: BookType
    isbn: str | None
    year: int | None
    finished_on: date | None
    tags: list[str]
    spine_color: str | None


def split_authors(raw: str) -> list[str]:
    """Semicolon-separated names, trimmed, empty entries dropped."""
    return [name for name in (part.strip() for part in raw.split(";")) if name]


def merge_tags(tags: Iterable[str]) -> list[str]:
    """Each non-empty tag once, ignoring case; the first spelling wins."""
    seen: set[str] = set()
    merged: list[str] = []
    for tag in tags:
        key = tag.casefold()
        if tag and key not in seen:
            seen.add(key)
            merged.append(tag)
    return merged


def split_tags(raw: str) -> list[str]:
    """Comma-separated tags, trimmed, empties dropped, merged ignoring case."""
    return merge_tags(part.strip() for part in raw.split(","))


def _whole_number(value: str) -> int | None:
    if not _WHOLE.fullmatch(value):
        return None
    try:
        number = int(value)
    except ValueError:  # more digits than int() accepts
        return None
    return number if number >= 1 else None


def _isbn_ok(value: str) -> bool:
    digits = value.replace("-", "").replace(" ", "")
    return bool(_ISBN10.fullmatch(digits) or _ISBN13.fullmatch(digits))


def _year(value: str, today: date) -> int | None:
    if not _YEAR.fullmatch(value):
        return None
    year = int(value)
    return year if year <= today.year + 1 else None


def parse_book_fields(
    raw: Mapping[str, str | None],
    today: date,
    finished_on_rule: FinishedOnRule | None = None,
) -> BookFields | list[FieldFailure]:
    """Normalized fields, or every failure in form order (one per field).

    ``raw`` maps intent keys to the form's strings; a missing key or ``None``
    means the field was omitted. An omitted Edition is 1; an empty one is
    refused as required.

    ``finished_on_rule`` is a caller's extra Finished on check (edit mode),
    called once with the parsed date (``None`` when empty) only when the
    value itself is well-formed; its message, if any, is the ``finishedOn``
    failure.
    """
    failures: list[FieldFailure] = []
    text = {key: (raw.get(key) or "").strip() for key in LABELS}

    def required(key: str) -> str:
        if not text[key]:
            failures.append((key, required_message(key)))
        return text[key]

    title = required("title")
    subtitle = text["subtitle"] or None

    pages = 0
    if required("pages"):
        pages = _whole_number(text["pages"]) or 0
        if not pages:
            failures.append(("pages", PAGES_MESSAGE))

    authors = split_authors(text["authors"])
    if not authors:
        failures.append(("authors", required_message("authors")))

    edition = DEFAULT_EDITION
    if raw.get("edition") is not None and required("edition"):
        edition = _whole_number(text["edition"]) or 0
        if not edition:
            failures.append(("edition", EDITION_MESSAGE))

    language = required("language")
    publisher = required("publisher")

    book_type: BookType = "paperback"
    if required("type"):
        if text["type"] in BOOK_TYPES:
            book_type = text["type"]  # type: ignore[assignment]
        else:
            failures.append(("type", TYPE_MESSAGE))

    isbn = text["isbn"] or None
    if isbn is not None and not _isbn_ok(isbn):
        failures.append(("isbn", ISBN_MESSAGE))

    year = None
    if text["year"]:
        year = _year(text["year"], today)
        if year is None:
            failures.append(("year", YEAR_MESSAGE))

    finished_on, finished_on_failure = parse_finished_on(text["finishedOn"], today)
    if finished_on_failure is None and finished_on_rule is not None:
        finished_on_failure = finished_on_rule(finished_on)
    if finished_on_failure is not None:
        failures.append(("finishedOn", finished_on_failure))

    tags = split_tags(text["tags"])

    spine_color = text["spineColor"] or None
    if spine_color is not None and not is_hex_color(spine_color):
        failures.append(("spineColor", SPINE_COLOR_MESSAGE))

    if failures:
        return failures
    return BookFields(
        title=title,
        subtitle=subtitle,
        pages=pages,
        authors=authors,
        edition=edition,
        language=language,
        publisher=publisher,
        type=book_type,
        isbn=isbn,
        year=year,
        finished_on=finished_on,
        tags=tags,
        spine_color=spine_color,
    )
