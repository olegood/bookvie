"""Spine colors: the curated rotation, the ``#RRGGBB`` rule, and which color a new Book gets.

Pure. A Book's spine color is the user's, else the cover's, else the next
curated color in rotation by the Book count (AD-11).
"""

import re

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

_HEX_COLOR = re.compile(r"#[0-9A-Fa-f]{6}")

SPINE_COLOR_MESSAGE = "Spine color must be #RRGGBB or empty."


def is_hex_color(value: str) -> bool:
    """``#RRGGBB`` in either case, nothing around it (the Spine color rule)."""
    return _HEX_COLOR.fullmatch(value) is not None


def curated_spine_color(book_count: int) -> str:
    """The curated color of the next Book, in rotation by the Book count."""
    return CURATED_SPINE_COLORS[book_count % len(CURATED_SPINE_COLORS)]


def resolve_spine_color(user: str | None, from_cover: str | None, curated: str) -> str:
    """User, else cover, else curated (AD-11)."""
    return user or from_cover or curated
