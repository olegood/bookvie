"""The New book form's fields in form order, their labels, and the failures every form shares.

Pure. :data:`LABELS` maps the camelCase intent keys to the form's visible
labels, in form order (Title … Spine color); a failure is ``(key, message)``,
and :func:`in_form_order` sorts failures by that order. The Cover messages
live here because Cover is a file part, not a text field: the intent
contract and the cover reader refuse it, not the field parser.
"""

from collections.abc import Iterable

# Form order (Title … Spine color), key -> visible label. Cover is a file
# part, not a text field, but it has its place in the order.
LABELS: dict[str, str] = {
    "title": "Title",
    "subtitle": "Subtitle",
    "pages": "Pages",
    "authors": "Author(s)",
    "edition": "Edition",
    "language": "Language",
    "publisher": "Publisher",
    "type": "Type",
    "isbn": "ISBN",
    "year": "Year",
    "finishedOn": "Finished on",
    "tags": "Tags",
    "cover": "Cover",
    "spineColor": "Spine color",
}

COVER_IMAGE_MESSAGE = "Cover must be an image file."
COVER_FORMAT_MESSAGE = "Cover must be a JPEG, PNG or WebP image."
COVER_TOO_LARGE_MESSAGE = "Cover must be 20 MB or smaller."

FieldFailure = tuple[str, str]


def required_message(key: str) -> str:
    return f"{LABELS[key]} is required."


def in_form_order(failures: Iterable[FieldFailure]) -> list[FieldFailure]:
    """``failures`` sorted by the form order of their keys (stable)."""
    order = {key: index for index, key in enumerate(LABELS)}
    return sorted(failures, key=lambda failure: order.get(failure[0], len(order)))
