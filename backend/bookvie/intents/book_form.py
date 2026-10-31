"""What ``add-book`` and ``edit-book`` share: the form intent and its steps.

Both intents carry the New book form's raw strings in a JSON part named
``intent``. This module parses that part (generic over the intent model),
validates the fields, builds the duplicate refusal and the back-filled
Reading.
"""

import json
from collections.abc import Iterable
from datetime import date

from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
from pydantic.alias_generators import to_camel

from bookvie.domain import Book, Reading
from bookvie.domain.book_fields import (
    LABELS,
    BookFields,
    FieldFailure,
    parse_book_fields,
)

from .contract import (
    DuplicateMatch,
    FieldError,
    IntentError,
    duplicate_book,
    invalid_fields,
)

INTENT_FIELD = "intent"
MALFORMED_INTENT_MESSAGE = "The intent must be a JSON object of the form's fields."


class BookFormIntent(BaseModel):
    """The book form as typed: every value a string, every key optional.

    ``confirmDuplicate`` is the one non-form key: a strict JSON boolean.
    """

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
    confirm_duplicate: bool = False
    """Save even when the Book matches another in the catalog. Never stored."""

    @field_validator("*", mode="before")
    @classmethod
    def _no_null(cls, value: object) -> object:
        # An omitted key stays None (defaults skip validation); an explicit null is malformed.
        if value is None:
            raise ValueError("null is not a string")
        return value

    def form(self) -> dict[str, str | None]:
        """The form's fields by intent key, as :func:`parse_book_fields` takes them."""
        return self.model_dump(by_alias=True, include=set(_FORM_FIELDS))


_FORM_FIELDS = [name for name in BookFormIntent.model_fields if name != "confirm_duplicate"]


def malformed() -> IntentError:
    return invalid_fields([FieldError(field=INTENT_FIELD, message=MALFORMED_INTENT_MESSAGE)])


def parse_form_intent[T: BookFormIntent](model: type[T], raw: str | None) -> T:
    """The ``intent`` form part as ``model``, or 422 on ``intent``."""
    if raw is None:
        raise malformed()
    try:
        doc = json.loads(raw)
    except (ValueError, RecursionError):
        raise malformed() from None
    if not isinstance(doc, dict):
        raise malformed()
    try:
        return model.model_validate(doc)
    except ValidationError:
        raise malformed() from None


def refuse_fields(failures: Iterable[FieldFailure]) -> IntentError:
    """422 ``invalid_fields`` for ``(key, message)`` failures, named by label."""
    return invalid_fields(
        [FieldError(field=key, message=message) for key, message in failures], LABELS
    )


def valid_fields(intent: BookFormIntent, today: date) -> BookFields:
    """The parsed fields, or 422 listing every failing field."""
    parsed = parse_book_fields(intent.form(), today)
    if isinstance(parsed, list):
        raise refuse_fields(parsed)
    return parsed


def refuse_duplicates(matches: list[Book], confirmed: bool) -> None:
    """409 ``duplicate_book`` when ``matches`` is not empty and not confirmed."""
    if matches and not confirmed:
        raise duplicate_book(
            DuplicateMatch(title=book.title, authors=list(book.authors), isbn=book.isbn)
            for book in matches
        )


def backfill_reading(reading_id: str, finished_on: date, pages: int) -> Reading:
    """A finished Reading with no start date (Finished on)."""
    return Reading(
        id=reading_id,
        start_date=None,
        current_page=pages,
        purpose=None,
        last_progress_update=None,
        paused_at=None,
        finish_date=finished_on,
        finished_pages=pages,
        purpose_fulfilled=None,
        rating=None,
    )
