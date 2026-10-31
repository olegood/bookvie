"""The cover rule (DESIGN.md → Spine colors): ``spine_color_from_pixels``."""

import colorsys

from bookvie.domain import spine_color_from_pixels
from bookvie.domain.cover_color import HUE_BINS, SATURATION_CAP

RED_ORANGE = (200, 60, 40)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)


def _hls(hex_color: str) -> tuple[float, float, float]:
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)


def test_no_pixels_and_only_neutral_pixels_give_none() -> None:
    assert spine_color_from_pixels([]) is None
    grays = [(v, v, v) for v in range(0, 256, 5)]
    assert spine_color_from_pixels(grays) is None
    # Black and white: lightness < 0.10 or > 0.90, whatever the saturation.
    assert spine_color_from_pixels([BLACK, WHITE, (20, 0, 0), (255, 240, 240)]) is None


def test_near_neutral_pixels_are_ignored() -> None:
    # Saturation just under 0.15 is ignored; the one colored pixel decides.
    dull = (140, 120, 115)
    assert _hls("#%02X%02X%02X" % dull)[2] < 0.15
    color = spine_color_from_pixels([dull] * 50 + [WHITE] * 50 + [BLACK] * 50 + [RED_ORANGE])
    assert color == spine_color_from_pixels([RED_ORANGE])


def test_saturation_is_capped_at_045_and_lightness_and_hue_are_kept() -> None:
    color = spine_color_from_pixels([RED_ORANGE] * 10)
    assert color is not None and color == color.upper() and len(color) == 7
    hue, lightness, saturation = _hls(color)
    want_hue, want_lightness, _ = colorsys.rgb_to_hls(*(c / 255 for c in RED_ORANGE))
    assert abs(saturation - SATURATION_CAP) < 0.01
    assert abs(lightness - want_lightness) < 0.01
    assert abs(hue - want_hue) < 0.01


def test_a_soft_color_is_kept_as_is() -> None:
    soft = (150, 120, 100)  # saturation ~0.2, under the cap
    assert spine_color_from_pixels([soft]) == "#967864"


def test_the_fullest_hue_bin_wins_and_its_pixels_are_averaged() -> None:
    blue = (40, 60, 200)
    blue_lighter = (60, 80, 210)
    color = spine_color_from_pixels([RED_ORANGE] * 3 + [blue] * 2 + [blue_lighter] * 2)
    assert color is not None
    hue = _hls(color)[0]
    assert int(hue * HUE_BINS) == int(colorsys.rgb_to_hls(*(c / 255 for c in blue))[0] * HUE_BINS)
    average = tuple((a + b) / 2 / 255 for a, b in zip(blue, blue_lighter))
    want_hue, want_lightness, _ = colorsys.rgb_to_hls(*average)
    assert abs(hue - want_hue) < 0.01
    assert abs(_hls(color)[1] - want_lightness) < 0.01


def test_on_a_tie_the_first_bin_wins() -> None:
    green = (40, 180, 60)
    assert spine_color_from_pixels([green, RED_ORANGE]) == spine_color_from_pixels([RED_ORANGE])


def test_hues_near_360_share_the_red_bin() -> None:
    magenta_red = (200, 40, 50)  # hue just under 360°
    assert spine_color_from_pixels([magenta_red]) is not None
    hue = _hls(spine_color_from_pixels([magenta_red]) or "#000000")[0]
    assert int(hue * HUE_BINS) % HUE_BINS == HUE_BINS - 1
