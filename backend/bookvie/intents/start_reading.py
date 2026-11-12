"""The ``start-reading`` intent (FR-5, FR-9, AD-19): start, resume or re-read a Book as the Main book.

The request carries ``{"bookId": ..., "purpose": ..., "page": ...}`` in a
JSON part named ``intent``, parsed like ``set-spine-color``'s. ``purpose`` is
required and nullable; it is stored through :func:`normalize_purpose`
(trimmed, ``null`` when empty). ``page`` is the Start dialog's "Which page?"
(FR-8): optional and nullable, taken as any JSON value like ``update-page``'s.
It is required for a Side read and honored for any Book when sent. In one
commit:

- the current Main book (another Book), if any, has its current Reading
  paused: ``pausedAt`` = today, the page kept;
- the Book's current (paused) Reading resumes, keeping its id, page,
  ``startDate`` and ``pausedAt``, with ``lastProgressUpdate`` = now and the
  sent Purpose; or, with no current Reading (never started, or every Reading
  finished), a new Reading is appended: ``startDate`` = today, page 0,
  ``lastProgressUpdate`` = now, every other field ``null``. A sent ``page``
  becomes that Reading's ``currentPage``, even below the paused page, and a
  new Reading's ``startPage`` too. A resume at a sent page other than
  ``currentPage`` closes the Reading's segment: ``{startPage, endPage:
  currentPage}`` is appended to ``earlierSegments`` and ``startPage`` becomes
  the sent page, so Measured pace counts only the pages read; a resume at the
  same page, or with no page, keeps the segment. A new Reading has no earlier
  segments;
- ``mainBookId`` becomes the Book;
- ``upNextBookId`` follows FR-7: with a Main book *Y* (another Book), it
  becomes *Y*, the interrupted Book. An earlier Up next *Z* is displaced,
  which only means it is no longer ``upNextBookId``: its Readings are not
  touched, so a paused *Z* is in Waiting for you and any other *Z* is back in
  the catalog. With no Main book it stays as it is, except that it becomes
  ``null`` when it was the Book, which is never both Main and Up next;
- the Book leaves ``sideReadBookIds``: the Main book is never a Side read.

Refusals, checked inside the commit in this order: 409 ``book_not_found``
when the Book is gone, 409 ``already_main`` for the Main book, then 422
``invalid_fields`` on ``page`` ("Which page?") when the Book is a Side read
and ``page`` is missing or null, or when a sent ``page`` isn't a whole number
from 0 to the Book's page count. The function returns ``True`` when the page
is the Book's last (``reachedLastPage``); only ``finish-reading`` finishes.
"""

import uuid

from pydantic import JsonValue

from bookvie.domain import (
    Clock,
    Library,
    Reading,
    ReadingSegment,
    current_reading,
    normalize_purpose,
)
from bookvie.store import Store

from .commit import commit
from .contract import FieldError, IntentError, already_main, book_not_found, invalid_fields
from .intent_model import IntentModel, parse_form_intent
from .pause import pause_main
from .update_page import PAGE_FIELD, page_message, valid_page

PAGE_LABELS = {PAGE_FIELD: "Which page?"}
PAGE_REQUIRED_MESSAGE = "Which page? is required."


class StartReadingIntent(IntentModel):
    """The Book to start, the Start dialog's Purpose, as typed (``None``: none), and its
    "Which page?" as sent (``None``: not asked; checked in the commit)."""

    nullable = frozenset({"purpose", "page"})

    book_id: str
    purpose: str | None
    page: JsonValue = None


def parse_start_reading_intent(raw: str | None) -> StartReadingIntent:
    """The ``intent`` form part as a :class:`StartReadingIntent`, or 422 on ``intent``."""
    return parse_form_intent(StartReadingIntent, raw)


def _page_refusal(message: str) -> IntentError:
    return invalid_fields([FieldError(field=PAGE_FIELD, message=message)], PAGE_LABELS)


def start_reading(store: Store, clock: Clock, intent: StartReadingIntent) -> bool:
    """Make the Book Main, resuming its current Reading or starting a new one, in one commit.

    ``True`` when the sent page is the Book's last page.
    """
    book_id = intent.book_id
    purpose = normalize_purpose(intent.purpose)
    reached_last_page = False

    def change(library: Library) -> None:
        nonlocal reached_last_page
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        if library.main_book_id == book_id:
            raise already_main()
        page: int | None = None
        if intent.page is None:
            if book_id in library.side_read_book_ids:
                raise _page_refusal(PAGE_REQUIRED_MESSAGE)
        else:
            page = valid_page(intent.page, book.pages)
            if page is None:
                raise _page_refusal(page_message(book.pages))
        # The pointer moves before ``mainBookId`` does: the interrupted Main
        # book (another Book) becomes Up next (FR-7).
        if library.main_book_id is not None:
            up_next = library.main_book_id
        elif library.up_next_book_id == book_id:
            up_next = None
        else:
            up_next = library.up_next_book_id
        # The Main book is another Book, so ``book`` stays current.
        pause_main(library, clock)
        now = clock.now()
        reading = current_reading(book)
        if reading is not None:
            update = {"last_progress_update": now, "purpose": purpose}
            if page is not None and page != reading.current_page:
                closed = ReadingSegment(
                    start_page=reading.start_page, end_page=reading.current_page
                )
                update["earlier_segments"] = [*reading.earlier_segments, closed]
                update["start_page"] = page
                update["current_page"] = page
            resumed = reading.model_copy(update=update)
            readings = [resumed if r.id == reading.id else r for r in book.readings]
        else:
            start_page = page if page is not None else 0
            started = Reading(
                id=str(uuid.uuid4()),
                start_date=clock.today(),
                start_page=start_page,
                earlier_segments=[],
                current_page=start_page,
                purpose=purpose,
                last_progress_update=now,
                paused_at=None,
                finish_date=None,
                finished_pages=None,
                purpose_fulfilled=None,
                rating=None,
            )
            readings = [*book.readings, started]
        library.replace_book(book.model_copy(update={"readings": readings}))
        library.main_book_id = book_id
        library.up_next_book_id = up_next
        library.side_read_book_ids = [i for i in library.side_read_book_ids if i != book_id]
        reached_last_page = page is not None and page == book.pages

    commit(store, change)
    return reached_last_page
