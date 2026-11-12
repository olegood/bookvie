"""Spine colors: the curated rotation, the ``#RRGGBB`` rule, and which color a new Book gets.

Pure. A Book's spine color is the user's, else the cover's, else its curated
color: the palette color after the last Book's curated color (AD-11).
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


def next_curated_spine_color(last: str | None) -> str:
    """The curated color after ``last`` (the last Book's curated color), wrapping.

    Sage when there is no last Book or its curated color isn't in the palette.
    The match ignores letter case. Following the last Book, not the Book count,
    means deleting a Book never makes the next one repeat a neighbour's color.
    """
    palette = [color.upper() for color in CURATED_SPINE_COLORS]
    if last is None or last.upper() not in palette:
        return CURATED_SPINE_COLORS[0]
    return CURATED_SPINE_COLORS[(palette.index(last.upper()) + 1) % len(CURATED_SPINE_COLORS)]


def resolve_spine_color(user: str | None, from_cover: str | None, curated: str) -> str:
    """User, else cover, else curated (AD-11)."""
    return user or from_cover or curated
