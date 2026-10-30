"""The ``add-book`` intent (FR-1): save a new Book only when it is complete.

The request carries the New book form's raw strings. Every field is trimmed
and validated before the store is touched (:mod:`bookvie.domain.book_fields`);
any failure is one 422 ``invalid_fields`` listing every failing field in form
order. A valid intent appends the Book through :func:`commit`, which commits
once or changes nothing.
"""

import json
import uuid

from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
from pydantic.alias_generators import to_camel

from bookvie.domain import Book, Clock, Library, Reading
from bookvie.domain.book_fields import (
    LABELS,
    curated_spine_color,
    parse_book_fields,
    resolve_spine_color,
)
from bookvie.store import Store

from .commit import commit
from .contract import FieldError, IntentError, invalid_fields

INTENT_FIELD = "intent"
MALFORMED_INTENT_MESSAGE = "The intent must be a JSON object of the form's fields."


class AddBookIntent(BaseModel):
    """The New book form as typed: every value a string, every key optional."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        strict=True,
    )

    title: str | None = None
    subtitle: str | None = None
    pages: str | None = None
    authors: str | None = None
    edition: str | None = None
    language: str | None = None
    publisher: str | None = None
    type: str | None = None
    isbn: str | None = None
    year: str | None = None
    finished_on: str | None = None
    tags: str | None = None
    spine_color: str | None = None

    @field_validator("*", mode="before")
    @classmethod
    def _no_null(cls, value: object) -> object:
        # An omitted key stays None (defaults skip validation); an explicit null is malformed.
        if value is None:
            raise ValueError("null is not a string")
        return value


def _malformed() -> IntentError:
    return invalid_fields([FieldError(field=INTENT_FIELD, message=MALFORMED_INTENT_MESSAGE)])


def parse_add_book_intent(raw: str | None) -> AddBookIntent:
    """The ``intent`` form part as an :class:`AddBookIntent`, or 422 on ``intent``."""
    if raw is None:
        raise _malformed()
    try:
        doc = json.loads(raw)
    except (ValueError, RecursionError):
        raise _malformed() from None
    if not isinstance(doc, dict):
        raise _malformed()
    try:
        return AddBookIntent.model_validate(doc)
    except ValidationError:
        raise _malformed() from None


def add_book(store: Store, clock: Clock, intent: AddBookIntent) -> str:
    """Validate ``intent``, then append the Book and commit; returns its id."""
    raw = intent.model_dump(by_alias=True)
    parsed = parse_book_fields(raw, clock.today())
    if isinstance(parsed, list):
        raise invalid_fields(
            [FieldError(field=key, message=message) for key, message in parsed], LABELS
        )
    fields = parsed
    book_id = str(uuid.uuid4())
    reading_id = str(uuid.uuid4())
    created_at = clock.now()

    def change(library: Library) -> None:
        curated = curated_spine_color(len(library.books))
        readings = []
        if fields.finished_on is not None:
            readings.append(
                Reading(
                    id=reading_id,
                    start_date=None,
                    current_page=fields.pages,
                    purpose=None,
                    last_progress_update=None,
                    paused_at=None,
                    finish_date=fields.finished_on,
                    finished_pages=fields.pages,
                    purpose_fulfilled=None,
                    rating=None,
                )
            )
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
