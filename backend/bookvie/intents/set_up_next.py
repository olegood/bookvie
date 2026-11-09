"""The ``set-up-next`` intent (FR-7, AD-9): choose the Book to read next.

The request carries ``{"bookId": ...}`` in a JSON part named ``intent``,
parsed like ``pause``'s. In one commit, ``upNextBookId`` becomes the Book and
nothing else changes: no Reading, ``mainBookId`` or ``sideReadBookIds``. An
earlier Up next *Z* is displaced, which only means it is no longer
``upNextBookId``: its Readings are not touched, so a paused *Z* is in Waiting
for you and any other *Z* is back in the catalog.

Checked inside the commit, in order: 409 ``book_not_found`` when the Book is
gone, then 409 ``main_cannot_be_up_next`` when it is the Main book. When the
Book is already Up next the change returns :data:`~bookvie.store.UNCHANGED`,
so the answer is 200 with no write at all (AD-9).
"""

from bookvie.domain import Library
from bookvie.store import UNCHANGED, Store, Unchanged

from .commit import commit
from .contract import book_not_found, main_cannot_be_up_next
from .intent_model import IntentModel, parse_form_intent


class SetUpNextIntent(IntentModel):
    """The Book to make Up next."""

    book_id: str


def parse_set_up_next_intent(raw: str | None) -> SetUpNextIntent:
    """The ``intent`` form part as a :class:`SetUpNextIntent`, or 422 on ``intent``."""
    return parse_form_intent(SetUpNextIntent, raw)


def set_up_next(store: Store, intent: SetUpNextIntent) -> None:
    """Make the Book Up next in one commit, or commit nothing when it already is."""
    book_id = intent.book_id

    def change(library: Library) -> Unchanged | None:
        if library.book(book_id) is None:
            raise book_not_found()
        if library.main_book_id == book_id:
            raise main_cannot_be_up_next()
        if library.up_next_book_id == book_id:
            return UNCHANGED
        library.up_next_book_id = book_id
        return None

    commit(store, change)
