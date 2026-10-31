"""The ``delete-book`` intent (FR-1, NFR5): remove a Book after confirmation.

The request carries ``{"bookId": ...}`` in a JSON part named ``intent``,
parsed like ``edit-book``'s. In one commit the Book goes (its Readings and
Card notes are nested in it), ``mainBookId`` / ``upNextBookId`` become
``null`` when they name it, and its ``sideReadBookIds`` entry is dropped.
Nothing is promoted into a vacated pointer (CAT-API-007).

409 ``book_not_found`` when the Book is gone, checked inside the commit.
Its cover file, no longer referenced, is deleted after the commit by
:meth:`Store.apply` (AD-12); a failed deletion is logged and swept at the
next startup.
"""

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

from bookvie.domain import Library
from bookvie.store import Store

from .book_form import parse_form_intent
from .commit import commit
from .contract import book_not_found


class DeleteBookIntent(BaseModel):
    """The Book the Confirm dialog deletes."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        strict=True,
    )

    book_id: str

    @field_validator("*", mode="before")
    @classmethod
    def _no_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("null is not a string")
        return value


def parse_delete_book_intent(raw: str | None) -> DeleteBookIntent:
    """The ``intent`` form part as a :class:`DeleteBookIntent`, or 422 on ``intent``."""
    return parse_form_intent(DeleteBookIntent, raw)


def delete_book(store: Store, intent: DeleteBookIntent) -> None:
    """Remove the Book and every pointer naming it, in one commit."""
    book_id = intent.book_id

    def change(library: Library) -> None:
        if library.book(book_id) is None:
            raise book_not_found()
        library.books = [book for book in library.books if book.id != book_id]
        if library.main_book_id == book_id:
            library.main_book_id = None
        if library.up_next_book_id == book_id:
            library.up_next_book_id = None
        library.side_read_book_ids = [
            other for other in library.side_read_book_ids if other != book_id
        ]

    commit(store, change)
