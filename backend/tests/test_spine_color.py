"""``next_curated_spine_color``: the palette color after the last Book's curated color."""

import pytest

from bookvie.domain.spine_color import CURATED_SPINE_COLORS, next_curated_spine_color

SAGE, SLATE, CLAY, OCHRE, PLUM, TEAL, MOSS, STONE = CURATED_SPINE_COLORS


def test_no_last_book_starts_at_sage() -> None:
    assert next_curated_spine_color(None) == SAGE


@pytest.mark.parametrize("index", range(len(CURATED_SPINE_COLORS) - 1))
def test_each_color_is_followed_by_the_next(index: int) -> None:
    assert next_curated_spine_color(CURATED_SPINE_COLORS[index]) == CURATED_SPINE_COLORS[index + 1]


def test_stone_wraps_to_sage() -> None:
    assert next_curated_spine_color(STONE) == SAGE


@pytest.mark.parametrize("last", ["#123456", "", "red"])
def test_a_color_outside_the_palette_starts_at_sage(last: str) -> None:
    assert next_curated_spine_color(last) == SAGE


def test_the_match_ignores_letter_case() -> None:
    assert next_curated_spine_color(SLATE.lower()) == CLAY
    assert next_curated_spine_color(CLAY.lower()) == OCHRE
