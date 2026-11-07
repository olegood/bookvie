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
``ownership``, curated color and Card notes, and its cover unless the intent
changes it.

Covers (Story 1.13): a refused cover is a ``cover`` failure in step 2. An
accepted one is written under a new minted name before the commit, and its
color replaces ``spineColorFromCover``; ``removeCover: true`` clears
``coverFile`` and ``spineColorFromCover`` (a no-op without a cover). Either
re-resolves ``spineColor`` (AD-11); the old file is deleted after the
commit (AD-12). A cover part together with ``removeCover: true`` is a
malformed intent (422 on ``intent``).

Finished on in edit: with ``latest`` the finished Reading with the greatest
``finishDate`` (the later in list order on a tie), an empty value is refused,
a date before ``latest``'s start is refused, and any other changed date sets
``latest.finishDate``. With no finished Reading, a date appends a back-fill.
Either way a stored date must be a *past* Reading's: when the Book has an
unfinished Reading with a start date, a new or changed date after that start
is refused (the start day itself is allowed, as a same-day re-read makes).
"""

import uuid
from datetime import date
from functools import partial

from bookvie.domain import Book, Clock, Library, Reading, current_reading
from bookvie.domain.book_fields import (
    BookFields,
    pages_below_card_note_message,
    pages_below_current_page_message,
)
from bookvie.domain.duplicates import find_duplicates
from bookvie.domain.finished_on import (
    FINISH_DATE_REMOVED_MESSAGE,
    finished_after_current_start_message,
    finished_before_start_message,
)
from bookvie.domain.spine_color import resolve_spine_color
from bookvie.store import Store

from .book_form import (
    BookFormIntent,
    backfill_reading,
    cover_failures,
    refuse_duplicates,
    valid_fields,
)
from .commit import commit
from .contract import (
    ErrorCode,
    FieldError,
    book_not_found,
    invalid_fields,
    pages_refusal,
)
from .cover import PreparedCover, UploadedCover, mint_cover_file
from .intent_model import INTENT_FIELD, parse_form_intent

COVER_AND_REMOVE_MESSAGE = "The intent can't both send a cover and remove it."


class EditBookIntent(BookFormIntent):
    """The Edit book panel as typed, plus the Book it edits."""

    book_id: str
    remove_cover: bool = False
    """Clear the Book's cover (Remove cover). Never sent with a cover part."""


def parse_edit_book_intent(raw: str | None, has_cover: bool = False) -> EditBookIntent:
    """The ``intent`` form part as an :class:`EditBookIntent`, or 422 on ``intent``.

    ``has_cover`` says a cover part came too; with ``removeCover: true`` that
    is refused.
    """
    intent = parse_form_intent(EditBookIntent, raw)
    if has_cover and intent.remove_cover:
        raise invalid_fields([FieldError(field=INTENT_FIELD, message=COVER_AND_REMOVE_MESSAGE)])
    return intent


def _finished_on_failure(book: Book, finished_on: date | None) -> str | None:
    latest = book.latest_finished()
    if latest is None:
        return None if finished_on is None else _after_current_start(book, finished_on)
    if finished_on is None:
        return FINISH_DATE_REMOVED_MESSAGE
    if latest.start_date is not None and finished_on < latest.start_date:
        return finished_before_start_message(latest.start_date)
    if finished_on != latest.finish_date:
        return _after_current_start(book, finished_on)
    return None


def _after_current_start(book: Book, finished_on: date) -> str | None:
    """Refuse a stored finish after the current Reading's start: it would overlap it."""
    current = current_reading(book)
    if current is None or current.start_date is None or finished_on <= current.start_date:
        return None
    return finished_after_current_start_message(current.start_date)


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
    return fields.title != book.title or fields.authors != book.authors or fields.isbn != book.isbn


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


def _cover_update(
    book: Book, intent: EditBookIntent, cover_file: str | None, from_cover: str | None
) -> dict[str, object]:
    """The cover keys a new cover or Remove cover changes; empty when neither does."""
    if cover_file is not None:
        return {"cover_file": cover_file, "spine_color_from_cover": from_cover}
    if intent.remove_cover and book.cover_file is not None:
        return {"cover_file": None, "spine_color_from_cover": None}
    return {}


def edit_book(
    store: Store, clock: Clock, intent: EditBookIntent, cover: UploadedCover | None = None
) -> None:
    """Check ``intent`` (and ``cover``) against the stored Book, then replace it and commit."""
    today = clock.today()
    reading_id = str(uuid.uuid4())
    extra = cover_failures(cover)
    new_files: dict[str, bytes] = {}
    cover_file: str | None = None
    from_cover: str | None = None
    if isinstance(cover, PreparedCover):
        # Don't write a file for a Book that is already gone (checked again in the commit).
        if store.library.book(intent.book_id) is None:
            raise book_not_found()
        cover_file = mint_cover_file(intent.book_id, cover.ext)
        new_files[cover_file] = cover.data
        from_cover = cover.color

    def change(library: Library) -> None:
        book = library.book(intent.book_id)
        if book is None:
            raise book_not_found()
        fields = valid_fields(intent, today, extra, partial(_finished_on_failure, book))
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
        covers = _cover_update(book, intent, cover_file, from_cover)
        update.update(covers)
        if covers or fields.spine_color != book.spine_color_user:
            # AD-11: re-resolve only when a color input changes.
            update["spine_color_user"] = fields.spine_color
            update["spine_color"] = resolve_spine_color(
                fields.spine_color,
                covers.get("spine_color_from_cover", book.spine_color_from_cover),  # type: ignore[arg-type]
                book.spine_color_curated,
            )
        library.replace_book(book.model_copy(update=update))

    commit(store, change, new_files)
