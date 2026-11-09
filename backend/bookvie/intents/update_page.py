"""The ``update-page`` intent (FR-10, AD-19): save the page reached in the Main book.

The request carries ``{"bookId": ..., "page": <integer>}`` in a JSON part
named ``intent``, parsed like ``start-reading``'s. ``page`` is taken as any
JSON value, so a value of the wrong type (212.5, ``"212"``, ``true``,
``null``) is a field error on ``page``, not a malformed ``intent``. In one
commit, the Main book's current Reading gets ``currentPage`` = the page and
``lastProgressUpdate`` = now; nothing else changes. A lower page than before
and 0 are allowed. The last page never finishes the Reading: only
``finish-reading`` sets ``finishDate``.

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, 409 ``not_main_book`` when it isn't the Main book (a
stale tab), then 422 ``invalid_fields`` on ``page`` when the page isn't a
whole number from 0 to the Book's page count.
"""

from pydantic import JsonValue

from bookvie.domain import Clock, Library, current_reading
from bookvie.store import Store

from .commit import commit
from .contract import FieldError, book_not_found, invalid_fields, not_main_book
from .intent_model import IntentModel, parse_form_intent

PAGE_FIELD = "page"
PAGE_LABELS = {PAGE_FIELD: "Page"}


def page_message(pages: int) -> str:
    """The page refusal for a ``pages``-page Book: "Page must be between 0 and 330."."""
    return f"Page must be between 0 and {pages}."


class UpdatePageIntent(IntentModel):
    """The Main book and the absolute page reached, as sent (checked in the commit)."""

    nullable = frozenset({"page"})

    book_id: str
    page: JsonValue


def parse_update_page_intent(raw: str | None) -> UpdatePageIntent:
    """The ``intent`` form part as an :class:`UpdatePageIntent`, or 422 on ``intent``."""
    return parse_form_intent(UpdatePageIntent, raw)


def valid_page(value: JsonValue, pages: int) -> int | None:
    """``value`` as a page of a ``pages``-page Book, or ``None``: a JSON integer in 0..pages."""
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if 0 <= value <= pages else None


def update_page(store: Store, clock: Clock, intent: UpdatePageIntent) -> bool:
    """Save the Main book's page in one commit; ``True`` when it is the Book's last page."""
    book_id = intent.book_id
    reached_last_page = False

    def change(library: Library) -> None:
        nonlocal reached_last_page
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        if library.main_book_id != book_id:
            raise not_main_book()
        page = valid_page(intent.page, book.pages)
        if page is None:
            raise invalid_fields(
                [FieldError(field=PAGE_FIELD, message=page_message(book.pages))], PAGE_LABELS
            )
        # The Main book always has a current Reading (invariant); a broken one
        # is an internal error (500 couldnt_save), not a refusal.
        reading = current_reading(book)
        assert reading is not None, "the Main book has no current Reading"
        updated = reading.model_copy(
            update={"current_page": page, "last_progress_update": clock.now()}
        )
        library.replace_book(
            book.model_copy(
                update={"readings": [updated if r.id == reading.id else r for r in book.readings]}
            )
        )
        reached_last_page = page == book.pages

    commit(store, change)
    return reached_last_page
