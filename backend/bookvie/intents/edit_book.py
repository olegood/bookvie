"""The ``edit-book`` intent (FR-1, FR-3): correct a Book's details.

The request carries the Edit book panel's raw strings (every field,
prefilled) plus ``bookId``. Every check runs inside the commit, in this
order, and the first that fails refuses the whole intent:

1. 409 ``book_not_found`` when the Book is gone.
2. 422 ``invalid_fields``: add-book's field rules plus the edit-mode Finished
   on rules, every failing field in form order.
3. 409 ``pages_below_current_page`` / ``pages_below_card_note`` when Pages
   drops below a floor; when below both, the higher floor wins (on a tie, the
   current page).
4. 409 ``duplicate_book``, only when the title, an author or the ISBN
   changed (trimmed values), against every other Book.

Then the Book is replaced in place, keeping its id, ``createdAt``,
``ownership``, cover, curated color and Card notes.

Finished on in edit: with ``latest`` the finished Reading with the greatest
``finishDate`` (the later in list order on a tie), an empty value is refused,
a date before ``latest``'s start is refused, and any other changed date sets
``latest.finishDate``. With no finished Reading, a date appends a back-fill.
"""

import uuid
from datetime import date

from bookvie.domain import Book, Clock, Library, Reading
from bookvie.domain.book_fields import (
    FINISH_DATE_REMOVED_MESSAGE,
    BookFields,
    FieldFailure,
    finished_before_start_message,
    in_form_order,
    pages_below_card_note_message,
    pages_below_current_page_message,
    parse_book_fields,
    parse_finished_on,
    resolve_spine_color,
)
from bookvie.domain.duplicates import find_duplicates
from bookvie.store import Store

from .book_form import (
    BookFormIntent,
    backfill_reading,
    parse_form_intent,
    refuse_duplicates,
    refuse_fields,
)
from .commit import commit
from .contract import ErrorCode, book_not_found, pages_refusal


class EditBookIntent(BookFormIntent):
    """The Edit book panel as typed, plus the Book it edits."""

    book_id: str


def parse_edit_book_intent(raw: str | None) -> EditBookIntent:
    """The ``intent`` form part as an :class:`EditBookIntent`, or 422 on ``intent``."""
    return parse_form_intent(EditBookIntent, raw)


def _finished_on_failure(book: Book, finished_on: date | None) -> str | None:
    latest = book.latest_finished()
    if latest is None:
        return None
    if finished_on is None:
        return FINISH_DATE_REMOVED_MESSAGE
    if latest.start_date is not None and finished_on < latest.start_date:
        return finished_before_start_message(latest.start_date)
    return None


def _valid_fields(book: Book, intent: EditBookIntent, today: date) -> BookFields:
    form = intent.form()
    parsed = parse_book_fields(form, today)
    failures: list[FieldFailure] = parsed if isinstance(parsed, list) else []
    if not any(key == "finishedOn" for key, _ in failures):
        finished_on, _ = parse_finished_on(form["finishedOn"], today)
        message = _finished_on_failure(book, finished_on)
        if message is not None:
            failures = in_form_order([*failures, ("finishedOn", message)])
    if failures:
        raise refuse_fields(failures)
    assert not isinstance(parsed, list)
    return parsed


def _check_pages_floors(book: Book, pages: int) -> None:
    current = max(
        (reading.current_page for reading in book.readings if not reading.finished), default=0
    )
    note = max(
        (
            note.page_end if note.page_end is not None else note.page_start
            for note in book.card_notes
        ),
        default=0,
    )
    if pages >= max(current, note):
        return
    if current >= note:
        raise pages_refusal(
            ErrorCode.PAGES_BELOW_CURRENT_PAGE, pages_below_current_page_message(current)
        )
    raise pages_refusal(ErrorCode.PAGES_BELOW_CARD_NOTE, pages_below_card_note_message(note))


def _identity_changed(book: Book, fields: BookFields) -> bool:
    return (
        fields.title != book.title or fields.authors != book.authors or fields.isbn != book.isbn
    )


def _readings(book: Book, fields: BookFields, reading_id: str) -> list[Reading]:
    readings = list(book.readings)
    latest = book.latest_finished()
    if latest is not None:
        if fields.finished_on is not None and fields.finished_on != latest.finish_date:
            index = next(i for i, reading in enumerate(readings) if reading is latest)
            readings[index] = latest.model_copy(update={"finish_date": fields.finished_on})
    elif fields.finished_on is not None:
        readings.append(backfill_reading(reading_id, fields.finished_on, fields.pages))
    return readings


def edit_book(store: Store, clock: Clock, intent: EditBookIntent) -> None:
    """Check ``intent`` against the stored Book, then replace it and commit."""
    today = clock.today()
    reading_id = str(uuid.uuid4())

    def change(library: Library) -> None:
        index = next(
            (i for i, book in enumerate(library.books) if book.id == intent.book_id), None
        )
        if index is None:
            raise book_not_found()
        book = library.books[index]
        fields = _valid_fields(book, intent, today)
        _check_pages_floors(book, fields.pages)
        if _identity_changed(book, fields):
            others = [other for other in library.books if other.id != book.id]
            refuse_duplicates(find_duplicates(others, fields), intent.confirm_duplicate)

        update: dict[str, object] = {
            "title": fields.title,
            "subtitle": fields.subtitle,
            "authors": fields.authors,
            "pages": fields.pages,
            "edition": fields.edition,
            "language": fields.language,
            "publisher": fields.publisher,
            "type": fields.type,
            "isbn": fields.isbn,
            "year": fields.year,
            "tags": fields.tags,
            "readings": _readings(book, fields, reading_id),
        }
        if fields.spine_color != book.spine_color_user:
            # AD-11: re-resolve only when a color input changes.
            update["spine_color_user"] = fields.spine_color
            update["spine_color"] = resolve_spine_color(
                fields.spine_color, book.spine_color_from_cover, book.spine_color_curated
            )
        library.books[index] = book.model_copy(update=update)

    commit(store, change)
