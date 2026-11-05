"""The ``edit-purpose`` intent (FR-9, UX-DR44): change the Purpose of a Book's current Reading.

The request carries ``{"bookId": ..., "purpose": ...}`` in a JSON part named
``intent``, parsed like ``start-reading``'s. The Purpose is stored through
:func:`normalize_purpose` (trimmed, ``null`` when empty) on the Book's
current Reading, active or paused. Nothing else changes: a Purpose isn't
progress, so ``lastProgressUpdate`` stays.

409 ``book_not_found`` when the Book is gone; 409 ``reading_already_finished``
when it has no unfinished Reading (the UI never offers that), both checked
inside the commit.
"""

from bookvie.domain import Library, current_reading, normalize_purpose
from bookvie.store import Store

from .commit import commit
from .contract import book_not_found, reading_already_finished
from .intent_model import IntentModel, parse_form_intent


class EditPurposeIntent(IntentModel):
    """The Book and its current Reading's new Purpose, as typed (``None``: none)."""

    nullable = frozenset({"purpose"})

    book_id: str
    purpose: str | None


def parse_edit_purpose_intent(raw: str | None) -> EditPurposeIntent:
    """The ``intent`` form part as an :class:`EditPurposeIntent`, or 422 on ``intent``."""
    return parse_form_intent(EditPurposeIntent, raw)


def edit_purpose(store: Store, intent: EditPurposeIntent) -> None:
    """Store the trimmed Purpose on the Book's current Reading, in one commit."""
    book_id = intent.book_id
    purpose = normalize_purpose(intent.purpose)

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        reading = current_reading(book)
        if reading is None:
            raise reading_already_finished()
        edited = reading.model_copy(update={"purpose": purpose})
        library.replace_book(
            book.model_copy(
                update={"readings": [edited if r.id == reading.id else r for r in book.readings]}
            )
        )

    commit(store, change)
