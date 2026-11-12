"""What ``add-book`` and ``edit-book`` share: the form intent and its steps.

Both intents carry the New book form's raw strings in a JSON part named
``intent`` (parsed by :func:`~bookvie.intents.intent_model.parse_form_intent`).
This module validates the fields, builds the duplicate refusal and the
back-filled Reading.
"""

from collections.abc import Iterable
from datetime import date

from bookvie.domain import Book, Reading
from bookvie.domain.book_fields import BookFields, parse_book_fields
from bookvie.domain.finished_on import FinishedOnRule
from bookvie.domain.labels import FieldFailure, in_form_order

from .contract import COVER_FIELD, DuplicateMatch, duplicate_book
from .cover import RefusedCover, UploadedCover
from .intent_model import IntentModel, refuse_fields


class BookFormIntent(IntentModel):
    """The book form as typed: every value a string, every key optional.

    ``confirmDuplicate`` is the one non-form key: a strict JSON boolean.
    """

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

    def form(self) -> dict[str, str | None]:
        """The form's fields by intent key, as :func:`parse_book_fields` takes them."""
        return self.model_dump(by_alias=True, include=set(_FORM_FIELDS))


_FORM_FIELDS = [name for name in BookFormIntent.model_fields if name != "confirm_duplicate"]


def cover_failures(cover: UploadedCover | None) -> list[FieldFailure]:
    """The refused cover as a ``cover`` field failure; none when it was accepted or absent."""
    if isinstance(cover, RefusedCover):
        return [(COVER_FIELD, cover.message)]
    return []


def valid_fields(
    intent: BookFormIntent,
    today: date,
    extra: Iterable[FieldFailure] = (),
    finished_on_rule: FinishedOnRule | None = None,
) -> BookFields:
    """The parsed fields, or 422 listing every failing field (``extra`` too) in form order.

    ``finished_on_rule`` adds a caller's Finished on check (see
    :func:`~bookvie.domain.book_fields.parse_book_fields` and
    :data:`~bookvie.domain.finished_on.FinishedOnRule`); ``edit-book`` passes
    its latest-finished rule.
    """
    parsed = parse_book_fields(intent.form(), today, finished_on_rule)
    failures = in_form_order([*(parsed if isinstance(parsed, list) else []), *extra])
    if failures:
        raise refuse_fields(failures)
    assert not isinstance(parsed, list)
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
        start_page=0,
        earlier_segments=[],
        current_page=pages,
        purpose=None,
        last_progress_update=None,
        paused_at=None,
        finish_date=finished_on,
        finished_pages=pages,
        purpose_fulfilled=None,
        rating=None,
    )
