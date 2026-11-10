"""The ``card-notes`` view: every Card note grouped by Book, or one Book's (FR-19).

The group order and the scope are server selections (AD-6); search and
highlighting run in the client.
"""

from bookvie.domain import Book, Library, title_key

from .models import CardNotesGroup, CardNotesScope, CardNotesView
from .shelf import card_note_views


def _group(book: Book) -> CardNotesGroup:
    return CardNotesGroup(book_id=book.id, title=book.title, notes=card_note_views(book))


def card_notes(library: Library, book_id: str | None) -> CardNotesView | None:
    """The Card notes page's view; ``None`` when ``book_id`` names no Book.

    Unscoped: one group per Book with notes, by :func:`title_key`, then Book
    id. Scoped: ``scope`` is set and ``groups`` holds that Book's group, or
    none when it has no notes.
    """
    if book_id is not None:
        book = library.book(book_id)
        if book is None:
            return None
        return CardNotesView(
            scope=CardNotesScope(book_id=book.id, title=book.title),
            groups=[_group(book)] if book.card_notes else [],
        )
    books = sorted(
        (b for b in library.books if b.card_notes), key=lambda b: (title_key(b.title), b.id)
    )
    return CardNotesView(scope=None, groups=[_group(b) for b in books])
