"""The ``delete-card-note`` intent (FR-17): remove a Card note after confirmation.

The request carries ``{"bookId": ..., "cardNoteId": ...}`` in a JSON part
named ``intent``. In one commit that note leaves its Book's ``cardNotes``, and
nothing else changes; ``edit-book``'s Pages floor follows the notes that remain.

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, then 409 ``card_note_not_found`` when the Book has no
note with that id (another Book's note id included).
"""

from bookvie.domain import Library
from bookvie.store import Store

from .commit import commit
from .contract import book_not_found, card_note_not_found
from .intent_model import IntentModel, parse_form_intent


class DeleteCardNoteIntent(IntentModel):
    """The Book and the note the Confirm dialog deletes."""

    book_id: str
    card_note_id: str


def parse_delete_card_note_intent(raw: str | None) -> DeleteCardNoteIntent:
    """The ``intent`` form part as a :class:`DeleteCardNoteIntent`, or 422 on ``intent``."""
    return parse_form_intent(DeleteCardNoteIntent, raw)


def delete_card_note(store: Store, intent: DeleteCardNoteIntent) -> None:
    """Remove the note from its Book, in one commit."""
    book_id = intent.book_id
    note_id = intent.card_note_id

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        notes = [note for note in book.card_notes if note.id != note_id]
        if len(notes) == len(book.card_notes):
            raise card_note_not_found()
        library.replace_book(book.model_copy(update={"card_notes": notes}))

    commit(store, change)
