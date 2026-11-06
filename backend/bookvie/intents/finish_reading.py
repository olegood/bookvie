"""The ``finish-reading`` intent (FR-14, AD-19): finish a Book's current Reading.

The request carries ``{"bookId": ..., "finishedOn": "YYYY-MM-DD",
"purposeFulfilled": "yes" | "partly" | "notYet" | null, "rating": 1..5 |
null}`` in a JSON part named ``intent``, parsed like ``update-page``'s. All
four keys are required. ``finishedOn``, ``purposeFulfilled`` and ``rating``
are taken as any JSON value, so a value of the wrong type is a field error on
that field, not a malformed ``intent``. In one commit the Book's current
(unfinished) Reading gets ``finishDate`` = ``finishedOn``, ``finishedPages``
= the Book's ``pages`` now, and the two answers as sent; every other field is
kept. When the Book is the Main book, ``mainBookId`` becomes ``null``. This
is the only intent that sets ``finishDate`` on a current Reading.

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, 409 ``reading_already_finished`` when it has no
unfinished Reading, then 422 ``invalid_fields`` naming, in form order,
``finishedOn`` (not a date, in the future, or before the Reading's start:
Edit book's messages), ``purposeFulfilled`` (not an answer, or sent for a
Reading with no Purpose) and ``rating`` (not a whole number from 1 to 5).
Today is the Clock's local date.
"""

from datetime import date
from typing import get_args

from pydantic import JsonValue

from bookvie.domain import Clock, Library, current_reading
from bookvie.domain.book_fields import (
    FINISHED_ON_FORMAT_MESSAGE,
    LABELS,
    finished_before_start_message,
    parse_finished_on,
)
from bookvie.domain.model import PurposeFulfilled, Reading
from bookvie.store import Store

from .commit import commit
from .contract import (
    FieldError,
    book_not_found,
    invalid_fields,
    reading_already_finished,
)
from .intent_model import IntentModel, parse_form_intent

FINISHED_ON_FIELD = "finishedOn"
PURPOSE_FULFILLED_FIELD = "purposeFulfilled"
RATING_FIELD = "rating"
FINISH_LABELS = {
    FINISHED_ON_FIELD: LABELS[FINISHED_ON_FIELD],
    PURPOSE_FULFILLED_FIELD: "Purpose fulfilled",
    RATING_FIELD: "Rating",
}

PURPOSE_FULFILLED_MESSAGE = "Purpose fulfilled must be yes, partly or not yet."
PURPOSE_FULFILLED_WITHOUT_PURPOSE_MESSAGE = "Purpose fulfilled needs a Purpose on this reading."
RATING_MESSAGE = "Rating must be 1 to 5 stars, or no rating."

_ANSWERS: tuple[str, ...] = get_args(PurposeFulfilled)


class FinishReadingIntent(IntentModel):
    """The Book, its Finished on date and the Finish dialog's two answers, as sent."""

    nullable = frozenset({"finished_on", "purpose_fulfilled", "rating"})

    book_id: str
    finished_on: JsonValue
    purpose_fulfilled: JsonValue
    rating: JsonValue


def parse_finish_reading_intent(raw: str | None) -> FinishReadingIntent:
    """The ``intent`` form part as a :class:`FinishReadingIntent`, or 422 on ``intent``."""
    return parse_form_intent(FinishReadingIntent, raw)


def _finished_on(value: JsonValue, reading: Reading, today: date) -> tuple[date | None, str | None]:
    """``finishedOn`` as a date, or its failure message (format, future, before start)."""
    if not isinstance(value, str):
        return None, FINISHED_ON_FORMAT_MESSAGE
    finished_on, failure = parse_finished_on(value, today)
    if failure is not None:
        return None, failure
    if finished_on is None:  # empty
        return None, FINISHED_ON_FORMAT_MESSAGE
    if reading.start_date is not None and finished_on < reading.start_date:
        return None, finished_before_start_message(reading.start_date)
    return finished_on, None


def _purpose_fulfilled_failure(value: JsonValue, reading: Reading) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value not in _ANSWERS:
        return PURPOSE_FULFILLED_MESSAGE
    if reading.purpose is None:
        return PURPOSE_FULFILLED_WITHOUT_PURPOSE_MESSAGE
    return None


def _rating_failure(value: JsonValue) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
        return RATING_MESSAGE
    return None


def finish_reading(store: Store, clock: Clock, intent: FinishReadingIntent) -> None:
    """Finish the Book's current Reading and clear it as Main, in one commit."""
    book_id = intent.book_id

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        reading = current_reading(book)
        if reading is None:
            raise reading_already_finished()
        finished_on, finished_on_failure = _finished_on(intent.finished_on, reading, clock.today())
        failures = [
            (FINISHED_ON_FIELD, finished_on_failure),
            (
                PURPOSE_FULFILLED_FIELD,
                _purpose_fulfilled_failure(intent.purpose_fulfilled, reading),
            ),
            (RATING_FIELD, _rating_failure(intent.rating)),
        ]
        errors = [
            FieldError(field=field, message=message)
            for field, message in failures
            if message is not None
        ]
        if errors:
            raise invalid_fields(errors, FINISH_LABELS)
        finished = reading.model_copy(
            update={
                "finish_date": finished_on,
                "finished_pages": book.pages,
                "purpose_fulfilled": intent.purpose_fulfilled,
                "rating": intent.rating,
            }
        )
        library.replace_book(
            book.model_copy(
                update={"readings": [finished if r.id == reading.id else r for r in book.readings]}
            )
        )
        if library.main_book_id == book_id:
            library.main_book_id = None

    commit(store, change)
