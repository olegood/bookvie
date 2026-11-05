"""domain layer."""

from .clock import Clock, FakeClock, SystemClock
from .cover_color import spine_color_from_pixels
from .invariants import InvariantViolation, check_invariants
from .model import Book, CardNote, Library, Reading
from .ordering import title_key
from .pace import days_left, measured_pace
from .progress import ReadingStatus, current_reading, percent, reading_status
from .purpose import normalize_purpose

__all__ = [
    "Book",
    "CardNote",
    "Clock",
    "FakeClock",
    "InvariantViolation",
    "Library",
    "Reading",
    "ReadingStatus",
    "SystemClock",
    "check_invariants",
    "current_reading",
    "days_left",
    "measured_pace",
    "normalize_purpose",
    "percent",
    "reading_status",
    "spine_color_from_pixels",
    "title_key",
]
