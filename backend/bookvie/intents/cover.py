"""Re-decode and normalize an uploaded cover (AD-12, R-14).

:func:`prepare_cover` runs before the store lock is taken. Pillow re-decodes
the upload, whatever its name or content type says. Anything that doesn't
decode (not an image, truncated, empty, or larger than
``Image.MAX_IMAGE_PIXELS``, including where Pillow only warns) is refused
with "Cover must be an image file."; HEIC, HEIF and AVIF, recognized by
their ISO-BMFF ``ftyp`` box, with "Cover must be a JPEG, PNG or WebP image."

A decoded image has its EXIF orientation applied, keeps only its first
frame, and is downscaled to a long edge of at most 1200px (never upscaled).
It is re-encoded as PNG when some pixel is transparent, else as RGB JPEG; no
metadata is carried over. Its spine color is computed once, here, from a
64px sample (:func:`bookvie.domain.spine_color_from_pixels`).
"""

import io
import re
import uuid
from dataclasses import dataclass

from PIL import Image, ImageOps

from bookvie.domain import spine_color_from_pixels
from bookvie.domain.labels import COVER_FORMAT_MESSAGE, COVER_IMAGE_MESSAGE
from bookvie.store import COVERS_DIR

# The decoders Pillow may use (JPEG also opens the MPO files many phones write).
DECODERS = ("JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF")
LONG_EDGE = 1200
SAMPLE_EDGE = 64
JPEG_QUALITY = 88
# ISO-BMFF brands of HEIC, HEIF and AVIF images.
_HEIF_BRANDS = {
    b"heic",
    b"heix",
    b"hevc",
    b"hevx",
    b"heim",
    b"heis",
    b"hevm",
    b"hevs",
    b"mif1",
    b"msf1",
    b"avif",
    b"avis",
}


@dataclass(frozen=True)
class PreparedCover:
    """A normalized cover, ready to be stored."""

    data: bytes
    ext: str
    """``jpg`` or ``png``: from the output format, never the upload's name."""
    color: str | None
    """``spineColorFromCover``: ``None`` for a black-and-white cover."""


@dataclass(frozen=True)
class RefusedCover:
    """An upload that isn't a usable image; ``message`` goes on the ``cover`` field."""

    message: str


UploadedCover = PreparedCover | RefusedCover


# Book ids are server-minted UUIDs; anything else never reaches a file name.
_SAFE_BOOK_ID = re.compile(r"[0-9A-Za-z-]{1,64}")


def mint_cover_file(book_id: str, ext: str) -> str:
    """A new, never reused ``coverFile``: ``covers/<book-id>-<uuid>.<ext>``."""
    minted = str(uuid.uuid4())
    stem = f"{book_id}-{minted}" if _SAFE_BOOK_ID.fullmatch(book_id) else minted
    return f"{COVERS_DIR}/{stem}.{ext}"


def _is_heif(data: bytes) -> bool:
    return data[4:8] == b"ftyp" and data[8:12] in _HEIF_BRANDS


def _normalize(image: Image.Image) -> tuple[Image.Image, str]:
    """The image in RGBA (some pixel transparent) or RGB, with its extension."""
    transparent = image.mode in ("RGBA", "LA", "PA", "RGBa", "La") or "transparency" in image.info
    if transparent:
        rgba = image.convert("RGBA")
        low, _ = rgba.getchannel("A").getextrema()
        if low < 255:
            return rgba, "png"
        return rgba.convert("RGB"), "jpg"
    return image.convert("RGB"), "jpg"


def _sample_pixels(image: Image.Image) -> list[tuple[int, int, int]]:
    sample = image.copy()
    sample.thumbnail((SAMPLE_EDGE, SAMPLE_EDGE))
    if sample.mode == "RGBA":
        # Mostly transparent pixels don't show, so they don't count.
        return [(r, g, b) for r, g, b, a in sample.get_flattened_data() if a >= 128]
    return list(sample.get_flattened_data())


class _TooManyPixels(Exception):
    """The image is larger than ``Image.MAX_IMAGE_PIXELS``: a possible decompression bomb."""


def _load(data: bytes) -> Image.Image:
    """The first frame of ``data``, upright; raises when it isn't a usable image."""
    Image.init()  # registers every decoder in DECODERS (only the first call does work)
    # Pillow raises above 2x MAX_IMAGE_PIXELS but only warns between 1x and 2x;
    # those are refused here, before decoding. (No process-global warnings
    # filter: uploads are decoded in the threadpool.)
    with Image.open(io.BytesIO(data), formats=DECODERS) as opened:
        width, height = opened.size
        limit = Image.MAX_IMAGE_PIXELS
        if limit is not None and width * height > limit:
            raise _TooManyPixels(f"{width}x{height}")
        opened.load()  # the first frame only
        return ImageOps.exif_transpose(opened)


def _decode(data: bytes) -> tuple[Image.Image, str]:
    image, ext = _normalize(_load(data))
    image.thumbnail((LONG_EDGE, LONG_EDGE), Image.Resampling.LANCZOS)
    return image, ext


def check_decodable(data: bytes) -> bool:
    """Whether ``data`` decodes as a cover upload would (restore, AD-14).

    The same decoders and pixel limit as :func:`prepare_cover`, and HEIC,
    HEIF and AVIF refused; nothing is re-encoded.
    """
    if _is_heif(data):
        return False
    try:
        _load(data)
    except Exception:  # noqa: BLE001 - any decoding failure means "not an image"
        return False
    return True


def prepare_cover(data: bytes) -> UploadedCover:
    """The upload re-decoded and normalized, or the refusal on ``cover``."""
    if _is_heif(data):
        return RefusedCover(COVER_FORMAT_MESSAGE)
    try:
        image, ext = _decode(data)
    except Exception:  # noqa: BLE001 - any decoding failure means "not an image"
        return RefusedCover(COVER_IMAGE_MESSAGE)
    buffer = io.BytesIO()
    if ext == "png":
        image.save(buffer, "PNG")
    else:
        image.save(buffer, "JPEG", quality=JPEG_QUALITY)
    return PreparedCover(
        data=buffer.getvalue(), ext=ext, color=spine_color_from_pixels(_sample_pixels(image))
    )
