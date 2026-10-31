"""The cover rule for ``spineColorFromCover`` (DESIGN.md → Spine colors).

Pure: it takes the pixels of an already downscaled cover (about 64px) and
returns the dominant non-neutral color, softened. Near-neutral pixels (HSL
saturation < 0.15, or lightness < 0.10 or > 0.90) are ignored; the rest are
grouped into 24 hue bins, and the average color of the fullest bin (the first
on a tie) has its saturation capped at 0.45. Lightness is kept. A cover with
no non-neutral pixel (black-and-white) gives ``None``, so the curated color
applies.
"""

import colorsys
from collections.abc import Iterable

HUE_BINS = 24
MIN_SATURATION = 0.15
MIN_LIGHTNESS = 0.10
MAX_LIGHTNESS = 0.90
SATURATION_CAP = 0.45

Pixel = tuple[int, int, int]


def _hex(r: float, g: float, b: float) -> str:
    return "#" + "".join(f"{round(max(0.0, min(1.0, c)) * 255):02X}" for c in (r, g, b))


def spine_color_from_pixels(pixels: Iterable[Pixel]) -> str | None:
    """The cover's spine color as ``#RRGGBB``, or ``None`` when every pixel is near-neutral."""
    bins: list[list[float]] = [[0.0, 0.0, 0.0, 0.0] for _ in range(HUE_BINS)]
    for r8, g8, b8 in pixels:
        r, g, b = r8 / 255, g8 / 255, b8 / 255
        hue, lightness, saturation = colorsys.rgb_to_hls(r, g, b)
        if saturation < MIN_SATURATION or lightness < MIN_LIGHTNESS or lightness > MAX_LIGHTNESS:
            continue
        sums = bins[int(hue * HUE_BINS) % HUE_BINS]
        sums[0] += 1
        sums[1] += r
        sums[2] += g
        sums[3] += b
    count, r_sum, g_sum, b_sum = max(bins, key=lambda sums: sums[0])
    if count == 0:
        return None
    hue, lightness, saturation = colorsys.rgb_to_hls(r_sum / count, g_sum / count, b_sum / count)
    return _hex(*colorsys.hls_to_rgb(hue, lightness, min(saturation, SATURATION_CAP)))
