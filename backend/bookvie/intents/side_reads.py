"""The ``mark-side-read`` and ``unmark-side-read`` intents (FR-8, AD-9): keep a few side reads.

Each request carries ``{"bookId": ...}`` in a JSON part named ``intent``,
parsed like ``set-up-next``'s. A Side read is only an entry in
``sideReadBookIds``: marking appends the Book, unmarking removes it and keeps
the others in order, and nothing else changes (no Reading, status,
``mainBookId`` or ``upNextBookId``).

``mark-side-read`` checks inside the commit, in order: 409
``book_not_found`` when the Book is gone, 409 ``main_cannot_be_side_read``
for the Main book, a 200 no-op (:data:`~bookvie.store.UNCHANGED`, no write)
when the Book is already a Side read, then 409 ``side_reads_full`` at
:data:`~bookvie.domain.MAX_SIDE_READS`. The no-op comes before the cap, so a
stale "Mark" on one of 3 Side reads doesn't claim the list is full.

``unmark-side-read`` refuses only with 409 ``book_not_found``; for a Book
that isn't a Side read it is a 200 no-op with no write.
"""

from bookvie.domain import MAX_SIDE_READS, Library
from bookvie.store import UNCHANGED, Store, Unchanged

from .commit import commit
from .contract import book_not_found, main_cannot_be_side_read, side_reads_full
from .intent_model import IntentModel, parse_form_intent


class MarkSideReadIntent(IntentModel):
    """The Book to make a Side read."""

    book_id: str


class UnmarkSideReadIntent(IntentModel):
    """The Book to take out of the Side reads."""

    book_id: str


def parse_mark_side_read_intent(raw: str | None) -> MarkSideReadIntent:
    """The ``intent`` form part as a :class:`MarkSideReadIntent`, or 422 on ``intent``."""
    return parse_form_intent(MarkSideReadIntent, raw)


def parse_unmark_side_read_intent(raw: str | None) -> UnmarkSideReadIntent:
    """The ``intent`` form part as an :class:`UnmarkSideReadIntent`, or 422 on ``intent``."""
    return parse_form_intent(UnmarkSideReadIntent, raw)


def mark_side_read(store: Store, intent: MarkSideReadIntent) -> None:
    """Append the Book to the Side reads in one commit, or commit nothing when it is one."""
    book_id = intent.book_id

    def change(library: Library) -> Unchanged | None:
        if library.book(book_id) is None:
            raise book_not_found()
        if library.main_book_id == book_id:
            raise main_cannot_be_side_read()
        if book_id in library.side_read_book_ids:
            return UNCHANGED
        if len(library.side_read_book_ids) >= MAX_SIDE_READS:
            raise side_reads_full()
        library.side_read_book_ids = [*library.side_read_book_ids, book_id]
        return None

    commit(store, change)


def unmark_side_read(store: Store, intent: UnmarkSideReadIntent) -> None:
    """Remove the Book from the Side reads in one commit, or commit nothing when it isn't one."""
    book_id = intent.book_id

    def change(library: Library) -> Unchanged | None:
        if library.book(book_id) is None:
            raise book_not_found()
        if book_id not in library.side_read_book_ids:
            return UNCHANGED
        library.side_read_book_ids = [i for i in library.side_read_book_ids if i != book_id]
        return None

    commit(store, change)
