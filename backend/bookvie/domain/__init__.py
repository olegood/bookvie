"""domain layer."""

from .clock import Clock, FakeClock, SystemClock
from .cover_color import spine_color_from_pixels
from .invariants import InvariantViolation, check_invariants
from .model import Book, CardNote, Library, Reading
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
    "normalize_purpose",
    "percent",
    "reading_status",
    "spine_color_from_pixels",
]
