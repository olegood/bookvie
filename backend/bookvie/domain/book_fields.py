"""Parse and validate the New book form's raw strings (Agent Label Contract).

Pure: no store, no clock (``today`` is passed in). :func:`parse_book_fields`
trims every value first, then returns either the normalized
:class:`BookFields` or every failure as ``(key, message)`` in form order, one
per field. Keys are the camelCase intent keys; :data:`LABELS` maps them to the
form's labels. ``edit-book`` (Story 1.11) and duplicate detection (Story 1.9)
reuse this module.
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date

from .model import BookType

# Form order (Title … Spine color), key -> visible label.
LABELS: dict[str, str] = {
    "title": "Title",
    "subtitle": "Subtitle",
    "pages": "Pages",
    "authors": "Author(s)",
    "edition": "Edition",
    "language": "Language",
    "publisher": "Publisher",
    "type": "Type",
    "isbn": "ISBN",
    "year": "Year",
    "finishedOn": "Finished on",
    "tags": "Tags",
    "spineColor": "Spine color",
}

# Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone (DESIGN.md, Spine colors).
CURATED_SPINE_COLORS: tuple[str, ...] = (
    "#749076",
    "#5B7590",
    "#9B6753",
    "#B48A45",
    "#7A6283",
    "#4B7C7B",
    "#6C7650",
    "#6F7375",
)

BOOK_TYPES: tuple[BookType, ...] = ("paperback", "hardcover", "ebook")

DEFAULT_EDITION = 1

_WHOLE = re.compile(r"[0-9]+")
_YEAR = re.compile(r"[0-9]{4}")
_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
_ISBN10 = re.compile(r"[0-9]{9}[0-9Xx]")
_ISBN13 = re.compile(r"[0-9]{13}")
_HEX_COLOR = re.compile(r"#[0-9A-Fa-f]{6}")

PAGES_MESSAGE = "Pages must be a whole number, 1 or more."
EDITION_MESSAGE = "Edition must be a whole number, 1 or more."
TYPE_MESSAGE = "Type must be Paperback, Hardcover or Ebook."
ISBN_MESSAGE = "ISBN must have 10 or 13 digits."
YEAR_MESSAGE = "Year must be a year, like 1965."
FINISHED_ON_FORMAT_MESSAGE = "Finished on must be a date, like 2026-03-14."
FINISHED_ON_FUTURE_MESSAGE = "Finished on can't be in the future."
SPINE_COLOR_MESSAGE = "Spine color must be #RRGGBB or empty."


def required_message(key: str) -> str:
    return f"{LABELS[key]} is required."


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


FieldFailure = tuple[str, str]


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
    return year if 1 <= year <= today.year + 1 else None


def _date(value: str) -> date | None:
    if not _DATE.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def parse_book_fields(
    raw: Mapping[str, str | None], today: date
) -> BookFields | list[FieldFailure]:
    """Normalized fields, or every failure in form order (one per field).

    ``raw`` maps intent keys to the form's strings; a missing key or ``None``
    means the field was omitted. An omitted Edition is 1; an empty one is
    refused as required.
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

    finished_on = None
    if text["finishedOn"]:
        finished_on = _date(text["finishedOn"])
        if finished_on is None:
            failures.append(("finishedOn", FINISHED_ON_FORMAT_MESSAGE))
        elif finished_on > today:
            failures.append(("finishedOn", FINISHED_ON_FUTURE_MESSAGE))

    tags = split_tags(text["tags"])

    spine_color = text["spineColor"] or None
    if spine_color is not None and not _HEX_COLOR.fullmatch(spine_color):
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


def curated_spine_color(book_count: int) -> str:
    """The curated color of the next Book, in rotation by the Book count."""
    return CURATED_SPINE_COLORS[book_count % len(CURATED_SPINE_COLORS)]


def resolve_spine_color(user: str | None, from_cover: str | None, curated: str) -> str:
    """User, else cover, else curated (AD-11)."""
    return user or from_cover or curated
