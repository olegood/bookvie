"""The ``pause`` intent (FR-6, FR-7, AD-19): step away from the Main book, keeping its page.

The request carries ``{"bookId": ...}`` in a JSON part named ``intent``,
parsed like ``delete-book``'s. In one commit:

- the Book's current Reading gets ``pausedAt`` = today (overwritten when it
  was already set), and nothing else of it changes;
- ``mainBookId`` becomes ``null``: there is no Main book until the user picks
  one, and nothing starts by itself;
- ``upNextBookId`` becomes the Book (FR-7). An earlier Up next *Z* is
  displaced, which only means it is no longer ``upNextBookId``: its Readings
  are not touched, so a paused *Z* is in Waiting for you and any other *Z* is
  back in the catalog.

409 ``book_not_found`` when the Book is gone, then 409 ``not_main_book`` when
it isn't the Main book (or there is none), both checked inside the commit.
"""

from bookvie.domain import Clock, Library, current_reading
from bookvie.store import Store

from .commit import commit
from .contract import book_not_found, not_main_book
from .intent_model import IntentModel, parse_form_intent


class PauseIntent(IntentModel):
    """The Main book to pause."""

    book_id: str


def parse_pause_intent(raw: str | None) -> PauseIntent:
    """The ``intent`` form part as a :class:`PauseIntent`, or 422 on ``intent``."""
    return parse_form_intent(PauseIntent, raw)


def pause_main(library: Library, clock: Clock) -> None:
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


def pause(store: Store, clock: Clock, intent: PauseIntent) -> None:
    """Pause the Main book and make it Up next, in one commit."""
    book_id = intent.book_id

    def change(library: Library) -> None:
        if library.book(book_id) is None:
            raise book_not_found()
        if library.main_book_id != book_id:
            raise not_main_book()
        pause_main(library, clock)
        library.main_book_id = None
        library.up_next_book_id = book_id

    commit(store, change)
