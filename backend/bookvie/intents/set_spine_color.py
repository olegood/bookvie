"""The ``set-spine-color`` intent (FR-24, AD-11): change a Book's color from the shelf.

The request carries ``{"bookId": ..., "spineColor": ...}`` in a JSON part
named ``intent``, parsed like ``delete-book``'s. ``spineColor`` is required
and nullable: ``#RRGGBB`` (either case, stored as sent, as ``edit-book``
stores it) sets the user color; ``null`` ("From cover") clears it. In one
commit only ``spineColorUser`` and the resolved ``spineColor`` (user, else
from cover, else curated) change. A pick equal to the stored color still
commits.

422 ``invalid_fields`` on ``spineColor`` for any other value; 409
``book_not_found`` when the Book is gone, checked inside the commit.
"""

from bookvie.domain import Library
from bookvie.domain.book_fields import (
    SPINE_COLOR_MESSAGE,
    is_hex_color,
    resolve_spine_color,
)
from bookvie.store import Store

from .commit import commit
from .contract import book_not_found
from .intent_model import IntentModel, parse_form_intent, refuse_fields

SPINE_COLOR_FIELD = "spineColor"


class SetSpineColorIntent(IntentModel):
    """The Book and the color a Change color block picked (``None``: From cover)."""

    nullable = frozenset({"spine_color"})

    book_id: str
    spine_color: str | None


def parse_set_spine_color_intent(raw: str | None) -> SetSpineColorIntent:
    """The ``intent`` form part as a :class:`SetSpineColorIntent`.

    422 on ``intent`` for a malformed part; 422 on ``spineColor`` when the
    color is neither ``#RRGGBB`` nor ``null``.
    """
    intent = parse_form_intent(SetSpineColorIntent, raw)
    if intent.spine_color is not None and not is_hex_color(intent.spine_color):
        raise refuse_fields([(SPINE_COLOR_FIELD, SPINE_COLOR_MESSAGE)])
    return intent


def set_spine_color(store: Store, intent: SetSpineColorIntent) -> None:
    """Set or clear the user color and re-resolve the spine color, in one commit."""
    book_id = intent.book_id
    user = intent.spine_color

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        library.replace_book(
            book.model_copy(
                update={
                    "spine_color_user": user,
                    "spine_color": resolve_spine_color(
                        user, book.spine_color_from_cover, book.spine_color_curated
                    ),
                }
            )
        )

    commit(store, change)
