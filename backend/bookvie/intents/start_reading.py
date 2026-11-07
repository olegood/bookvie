"""The ``start-reading`` intent (FR-5, FR-9, AD-19): start, resume or re-read a Book as the Main book.

The request carries ``{"bookId": ..., "purpose": ...}`` in a JSON part named
``intent``, parsed like ``set-spine-color``'s. ``purpose`` is required and
nullable; it is stored through :func:`normalize_purpose` (trimmed, ``null``
when empty). In one commit:

- the current Main book (another Book), if any, has its current Reading
  paused: ``pausedAt`` = today, the page kept;
- the Book's current (paused) Reading resumes, keeping its id, page,
  ``startDate`` and ``pausedAt``, with ``lastProgressUpdate`` = now and the
  sent Purpose; or, with no current Reading (never started, or every Reading
  finished), a new Reading is appended: ``startDate`` = today, page 0,
  ``lastProgressUpdate`` = now, every other field ``null``;
- ``mainBookId`` becomes the Book;
- ``upNextBookId`` follows FR-7: with a Main book *Y* (another Book), it
  becomes *Y*, the interrupted Book. An earlier Up next *Z* is displaced,
  which only means it is no longer ``upNextBookId``: its Readings are not
  touched, so a paused *Z* is in Waiting for you and any other *Z* is back in
  the catalog. With no Main book it stays as it is, except that it becomes
  ``null`` when it was the Book, which is never both Main and Up next.

409 ``book_not_found`` when the Book is gone and 409 ``already_main`` for
the Main book, both checked inside the commit.
"""

import uuid

from bookvie.domain import Clock, Library, Reading, current_reading, normalize_purpose
from bookvie.store import Store

from .commit import commit
from .contract import already_main, book_not_found
from .intent_model import IntentModel, parse_form_intent


class StartReadingIntent(IntentModel):
    """The Book to start and the Start dialog's Purpose, as typed (``None``: none)."""

    nullable = frozenset({"purpose"})

    book_id: str
    purpose: str | None


def parse_start_reading_intent(raw: str | None) -> StartReadingIntent:
    """The ``intent`` form part as a :class:`StartReadingIntent`, or 422 on ``intent``."""
    return parse_form_intent(StartReadingIntent, raw)


def _pause_main(library: Library, clock: Clock) -> None:
    """Pause the Main book's current Reading at its page, ``pausedAt`` = today."""
    if library.main_book_id is None:
        return
    main = library.book(library.main_book_id)
    reading = current_reading(main) if main is not None else None
    if main is None or reading is None:
        return
    paused = reading.model_copy(update={"paused_at": clock.today()})
    library.replace_book(
        main.model_copy(
            update={"readings": [paused if r.id == reading.id else r for r in main.readings]}
        )
    )


def start_reading(store: Store, clock: Clock, intent: StartReadingIntent) -> None:
    """Make the Book Main, resuming its current Reading or starting a new one, in one commit."""
    book_id = intent.book_id
    purpose = normalize_purpose(intent.purpose)

    def change(library: Library) -> None:
        book = library.book(book_id)
        if book is None:
            raise book_not_found()
        if library.main_book_id == book_id:
            raise already_main()
        # The pointer moves before ``mainBookId`` does: the interrupted Main
        # book (another Book) becomes Up next (FR-7).
        if library.main_book_id is not None:
            up_next = library.main_book_id
        elif library.up_next_book_id == book_id:
            up_next = None
        else:
            up_next = library.up_next_book_id
        # The Main book is another Book, so ``book`` stays current.
        _pause_main(library, clock)
        now = clock.now()
        reading = current_reading(book)
        if reading is not None:
            resumed = reading.model_copy(update={"last_progress_update": now, "purpose": purpose})
            readings = [resumed if r.id == reading.id else r for r in book.readings]
        else:
            started = Reading(
                id=str(uuid.uuid4()),
                start_date=clock.today(),
                current_page=0,
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

    commit(store, change)
