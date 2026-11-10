"""The ``edit-card-note`` intent (FR-17, AD-18): fix a Card note's text or page.

The request carries ``{"bookId": ..., "cardNoteId": ..., "text": ..., "page": ...}``
in a JSON part named ``intent``, with ``page`` the Page field's text as typed,
parsed on the server exactly as ``add-card-note`` parses it. In one commit the
note's ``text``, ``pageStart`` and ``pageEnd`` are replaced in place: its
``id``, ``createdAt`` and position in ``cardNotes`` are kept, and nothing else
changes. An unchanged edit commits as normal (no AD-9 no-op).

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, 409 ``card_note_not_found`` when the Book has no note
with that id (another Book's note id included), then 422 ``invalid_fields``
as ``add-card-note`` refuses them: ``text`` (Note) before ``page`` (Page).
"""

from bookvie.domain import Library
from bookvie.store import Store

from .add_card_note import check_card_note_fields
from .commit import commit
from .contract import book_not_found, card_note_not_found
from .intent_model import IntentModel, parse_form_intent


class EditCardNoteIntent(IntentModel):
    """The Book, its note, the new Note text and the Page as typed."""

    book_id: str
    card_note_id: str
    text: str
    page: str


def parse_edit_card_note_intent(raw: str | None) -> EditCardNoteIntent:
    """The ``intent`` form part as an :class:`EditCardNoteIntent`, or 422 on ``intent``."""
    return parse_form_intent(EditCardNoteIntent, raw)


def edit_card_note(store: Store, intent: EditCardNoteIntent) -> None:
    """Replace the note's text and pages in place, in one commit."""
    book_id = intent.book_id
    note_id = intent.card_note_id
    text = intent.text.strip()

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        index = next((i for i, note in enumerate(book.card_notes) if note.id == note_id), None)
        if index is None:
            raise card_note_not_found()
        page_start, page_end = check_card_note_fields(text, intent.page, book.pages)
        notes = list(book.card_notes)
        notes[index] = notes[index].model_copy(
            update={"text": text, "page_start": page_start, "page_end": page_end}
        )
        library.replace_book(book.model_copy(update={"card_notes": notes}))

    commit(store, change)
