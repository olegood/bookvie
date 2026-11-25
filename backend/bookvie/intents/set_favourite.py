"""The ``set-favourite`` intent (FR-31, AD-3): star or unstar a Book.

The request carries ``{"bookId": ..., "favourite": true | false}`` in a JSON
part named ``intent``. It sets the value it is sent and never toggles. In one
commit only the Book's ``favourite`` changes.

Checked in order: 422 on ``intent`` for a malformed part or a missing or bad
``bookId``; 422 ``invalid_fields`` on ``favourite`` when it is missing or not
a JSON boolean (``null``, ``"true"`` and ``1`` included). Inside the commit:
409 ``book_not_found`` when the Book is gone, then
:data:`~bookvie.store.UNCHANGED` when the Book already has the value, so the
answer is 200 with no write at all.
"""

from typing import Any

from bookvie.domain import Library
from bookvie.store import UNCHANGED, Store, Unchanged

from .commit import commit
from .contract import FieldError, book_not_found, invalid_fields
from .intent_model import IntentModel, parse_form_intent

FAVOURITE_FIELD = "favourite"
FAVOURITE_MESSAGE = "Favourite must be true or false."


class SetFavouriteIntent(IntentModel):
    """The Book and the value to store."""

    book_id: str
    favourite: bool


class _SetFavouritePart(IntentModel):
    """The part as sent: ``favourite`` is checked after the part itself parses."""

    nullable = frozenset({"favourite"})

    book_id: str
    favourite: Any = None


def parse_set_favourite_intent(raw: str | None) -> SetFavouriteIntent:
    """The ``intent`` form part as a :class:`SetFavouriteIntent`.

    422 on ``intent`` for a malformed part; 422 on ``favourite`` when it is
    missing or not a boolean.
    """
    part = parse_form_intent(_SetFavouritePart, raw)
    if not isinstance(part.favourite, bool):
        raise invalid_fields([FieldError(field=FAVOURITE_FIELD, message=FAVOURITE_MESSAGE)])
    return SetFavouriteIntent.model_validate({"bookId": part.book_id, "favourite": part.favourite})


def set_favourite(store: Store, intent: SetFavouriteIntent) -> None:
    """Store the Book's ``favourite`` in one commit, or commit nothing when it already has it."""
    book_id = intent.book_id
    favourite = intent.favourite

    def change(library: Library) -> Unchanged | None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        if book.favourite == favourite:
            return UNCHANGED
        library.replace_book(book.model_copy(update={"favourite": favourite}))
        return None

    commit(store, change)
