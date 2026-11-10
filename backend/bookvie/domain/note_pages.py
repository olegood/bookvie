"""The Page field of a Card note, parsed (FR-17, AD-18).

A Page is one page or one range: an optional ``p.`` / ``pp.`` prefix (the
dot and the spaces after it optional), then a whole number, or two whole
numbers joined by ``-`` or ``–`` with optional spaces around the dash. One
page, or a range whose ends are equal, has no end (``pageEnd`` is null).

The checks, in order: empty, not one page or one range, a page outside 1 to
the Book's page count, then a reversed range. Only the server parses Page,
so one grammar holds everywhere.
"""

import re

PAGE_REQUIRED_MESSAGE = "Page is required."
ONE_RANGE_MESSAGE = "Use one page or one range."
REVERSED_RANGE_MESSAGE = "The first page must come before the last."

_PAGE_PATTERN = re.compile(r"(?:pp?\.?\s*)?([0-9]+)(?:\s*[-–]\s*([0-9]+))?")


def page_range_message(pages: int) -> str:
    """The out-of-range refusal for a ``pages``-page Book: "Page must be between 1 and 330."."""
    return f"Page must be between 1 and {pages}."


def parse_note_pages(raw: str, pages: int) -> tuple[int, int | None] | str:
    """``raw`` as ``(pageStart, pageEnd)`` in a ``pages``-page Book, or the refusal message."""
    text = raw.strip()
    if not text:
        return PAGE_REQUIRED_MESSAGE
    match = _PAGE_PATTERN.fullmatch(text)
    if match is None:
        return ONE_RANGE_MESSAGE
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) is not None else start
    if not (1 <= start <= pages and 1 <= end <= pages):
        return page_range_message(pages)
    if start > end:
        return REVERSED_RANGE_MESSAGE
    return start, (end if end != start else None)
