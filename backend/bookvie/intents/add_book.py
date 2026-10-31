"""The ``add-book`` intent (FR-1): save a new Book only when it is complete.

The request carries the New book form's raw strings. Every field is trimmed
and validated before the store is touched (:mod:`bookvie.domain.book_fields`);
any failure is one 422 ``invalid_fields`` listing every failing field in form
order. A valid intent that matches a Book already in the catalog is refused
with 409 ``duplicate_book`` (FR-3, AD-10) unless it carries
``confirmDuplicate: true``. Otherwise the Book is appended through
:func:`commit`, which commits once or changes nothing.
"""

import uuid

from bookvie.domain import Book, Clock, Library
from bookvie.domain.book_fields import curated_spine_color, resolve_spine_color
from bookvie.domain.duplicates import find_duplicates
from bookvie.store import Store

from .book_form import (
    BookFormIntent,
    backfill_reading,
    parse_form_intent,
    refuse_duplicates,
    valid_fields,
)
from .commit import commit


class AddBookIntent(BookFormIntent):
    """The New book form as typed (see :class:`BookFormIntent`)."""


def parse_add_book_intent(raw: str | None) -> AddBookIntent:
    """The ``intent`` form part as an :class:`AddBookIntent`, or 422 on ``intent``."""
    return parse_form_intent(AddBookIntent, raw)


def add_book(store: Store, clock: Clock, intent: AddBookIntent) -> str:
    """Validate ``intent``, then append the Book and commit; returns its id."""
    fields = valid_fields(intent, clock.today())
    book_id = str(uuid.uuid4())
    reading_id = str(uuid.uuid4())
    created_at = clock.now()

    def change(library: Library) -> None:
        # Inside the commit, so the check sees committed state under the store lock.
        refuse_duplicates(find_duplicates(library.books, fields), intent.confirm_duplicate)
        curated = curated_spine_color(len(library.books))
        readings = []
        if fields.finished_on is not None:
            readings.append(backfill_reading(reading_id, fields.finished_on, fields.pages))
        library.books.append(
            Book(
                id=book_id,
                created_at=created_at,
                ownership="owned",
                title=fields.title,
                subtitle=fields.subtitle,
                authors=fields.authors,
                pages=fields.pages,
                edition=fields.edition,
                language=fields.language,
                publisher=fields.publisher,
                type=fields.type,
                isbn=fields.isbn,
                year=fields.year,
                tags=fields.tags,
                cover_file=None,
                spine_color_user=fields.spine_color,
                spine_color_from_cover=None,
                spine_color_curated=curated,
                spine_color=resolve_spine_color(fields.spine_color, None, curated),
                readings=readings,
                card_notes=[],
            )
        )

    commit(store, change)
    return book_id
