"""The ``add-book`` intent (FR-1): save a new Book only when it is complete.

The request carries the New book form's raw strings. Every field is trimmed
and validated before the store is touched
(:func:`~bookvie.domain.book_fields.parse_book_fields`); any failure is one
422 ``invalid_fields`` listing every failing field in form order. A valid
intent that matches a Book already in the catalog is refused with 409
``duplicate_book`` (FR-3, AD-10) unless it carries
``confirmDuplicate: true``. Otherwise the Book is appended through
:func:`commit`, which commits once or changes nothing.

An optional cover (Story 1.13) arrives already decoded
(:func:`~bookvie.intents.cover.prepare_cover`). A refused one is a ``cover``
field failure listed with the others; an accepted one is written under a
minted ``covers/<book-id>-<uuid>.<ext>`` before the commit (AD-12), and its
color is stored as ``spineColorFromCover``.
"""

import uuid

from bookvie.domain import Book, Clock, Library
from bookvie.domain.duplicates import find_duplicates
from bookvie.domain.spine_color import curated_spine_color, resolve_spine_color
from bookvie.store import Store

from .book_form import (
    BookFormIntent,
    backfill_reading,
    cover_failures,
    refuse_duplicates,
    valid_fields,
)
from .commit import commit
from .cover import PreparedCover, UploadedCover, mint_cover_file
from .intent_model import parse_form_intent


class AddBookIntent(BookFormIntent):
    """The New book form as typed (see :class:`BookFormIntent`)."""


def parse_add_book_intent(raw: str | None) -> AddBookIntent:
    """The ``intent`` form part as an :class:`AddBookIntent`, or 422 on ``intent``."""
    return parse_form_intent(AddBookIntent, raw)


def add_book(
    store: Store, clock: Clock, intent: AddBookIntent, cover: UploadedCover | None = None
) -> str:
    """Validate ``intent`` (and ``cover``), then append the Book and commit; returns its id."""
    fields = valid_fields(intent, clock.today(), cover_failures(cover))
    book_id = str(uuid.uuid4())
    reading_id = str(uuid.uuid4())
    created_at = clock.now()
    new_files: dict[str, bytes] = {}
    cover_file: str | None = None
    from_cover: str | None = None
    if isinstance(cover, PreparedCover):
        cover_file = mint_cover_file(book_id, cover.ext)
        new_files[cover_file] = cover.data
        from_cover = cover.color

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
                cover_file=cover_file,
                spine_color_user=fields.spine_color,
                spine_color_from_cover=from_cover,
                spine_color_curated=curated,
                spine_color=resolve_spine_color(fields.spine_color, from_cover, curated),
                readings=readings,
                card_notes=[],
            )
        )

    commit(store, change, new_files)
    return book_id
