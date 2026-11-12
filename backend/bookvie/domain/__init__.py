"""domain layer."""

from .clock import Clock, FakeClock, SystemClock
from .cover_color import spine_color_from_pixels
from .invariants import MAX_SIDE_READS, InvariantViolation, check_invariants
from .model import Book, CardNote, Library, Reading, ReadingSegment
from .note_pages import (
    ONE_RANGE_MESSAGE,
    PAGE_REQUIRED_MESSAGE,
    REVERSED_RANGE_MESSAGE,
    page_range_message,
    parse_note_pages,
)
from .ordering import title_key
from .pace import days_left, measured_pace
from .progress import ReadingStatus, current_reading, pages_left, percent, reading_status
from .purpose import normalize_purpose

__all__ = [
    "MAX_SIDE_READS",
    "ONE_RANGE_MESSAGE",
    "PAGE_REQUIRED_MESSAGE",
    "REVERSED_RANGE_MESSAGE",
    "Book",
    "CardNote",
    "Clock",
    "FakeClock",
    "InvariantViolation",
    "Library",
    "Reading",
    "ReadingSegment",
    "ReadingStatus",
    "SystemClock",
    "check_invariants",
    "current_reading",
    "days_left",
    "measured_pace",
    "normalize_purpose",
    "page_range_message",
    "pages_left",
    "parse_note_pages",
    "percent",
    "reading_status",
    "spine_color_from_pixels",
    "title_key",
]
