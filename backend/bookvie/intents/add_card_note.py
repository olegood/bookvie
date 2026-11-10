"""The ``add-card-note`` intent (FR-17, AD-18): keep a note with the page it came from.

The request carries ``{"bookId": ..., "text": ..., "page": ...}`` in a JSON
part named ``intent``, with ``page`` the Page field's text as typed: only the
server parses it (:func:`~bookvie.domain.parse_note_pages`). In one commit,
``{id, text, pageStart, pageEnd, createdAt}`` is appended to the Book's
``cardNotes``, with a fresh UUID, the text with its outer whitespace trimmed
(inner newlines kept) and ``createdAt`` = now; nothing else changes. Any Book
takes a note, whatever its Readings.

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, then 422 ``invalid_fields`` with ``text`` (Note)
before ``page`` (Page): "Note is required." for an empty or whitespace-only
Note, and the Page parser's message for a Page it refuses.
"""

import uuid

from bookvie.domain import CardNote, Clock, Library, parse_note_pages
from bookvie.store import Store

from .commit import commit
from .contract import FieldError, book_not_found, invalid_fields
from .intent_model import IntentModel, parse_form_intent

TEXT_FIELD = "text"
PAGE_FIELD = "page"
CARD_NOTE_LABELS = {TEXT_FIELD: "Note", PAGE_FIELD: "Page"}
NOTE_REQUIRED_MESSAGE = "Note is required."


def check_card_note_fields(text: str, page: str, pages: int) -> tuple[int, int | None]:
    """The parsed ``(pageStart, pageEnd)``, or 422 ``invalid_fields``: Note, then Page.

    ``text`` is already trimmed; ``page`` is the Page field as typed, parsed
    against the Book's ``pages``. Shared by ``add-card-note`` and ``edit-card-note``.
    """
    errors: list[FieldError] = []
    if not text:
        errors.append(FieldError(field=TEXT_FIELD, message=NOTE_REQUIRED_MESSAGE))
    parsed = parse_note_pages(page, pages)
    if isinstance(parsed, str):
        errors.append(FieldError(field=PAGE_FIELD, message=parsed))
    if errors or isinstance(parsed, str):
        raise invalid_fields(errors, CARD_NOTE_LABELS)
    return parsed


class AddCardNoteIntent(IntentModel):
    """The Book, the Note text and the Page as typed (checked in the commit)."""

    book_id: str
    text: str
    page: str


def parse_add_card_note_intent(raw: str | None) -> AddCardNoteIntent:
    """The ``intent`` form part as an :class:`AddCardNoteIntent`, or 422 on ``intent``."""
    return parse_form_intent(AddCardNoteIntent, raw)


def add_card_note(store: Store, clock: Clock, intent: AddCardNoteIntent) -> str:
    """Append the note to the Book's ``cardNotes`` in one commit; return its id."""
    book_id = intent.book_id
    note_id = str(uuid.uuid4())
    text = intent.text.strip()

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        page_start, page_end = check_card_note_fields(text, intent.page, book.pages)
        note = CardNote(
            id=note_id,
            text=text,
            page_start=page_start,
            page_end=page_end,
            created_at=clock.now(),
        )
        library.replace_book(book.model_copy(update={"card_notes": [*book.card_notes, note]}))

    commit(store, change)
    return note_id
