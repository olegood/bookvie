"""The ``OkResponse`` of the twelve intents an agent write tool shares with its route (AD-9).

Each is built from the handler's result. Those twelve routes (``http/api.py``)
and their write tools (``agent/``) both answer through these, so a route and
its tool can't drift apart. The other intent routes build their
``OkResponse`` themselves.
"""

from .contract import OkResponse


def ok() -> OkResponse:
    """``{ok: true}``: the answer of an intent with nothing to report, a no-op included."""
    return OkResponse(ok=True)


def page_answer(reached: bool) -> OkResponse:
    """``start-reading`` and ``update-page``: ``reachedLastPage`` only when the page is the last."""
    return OkResponse(ok=True, reached_last_page=True if reached else None)


def card_note_answer(note_id: str) -> OkResponse:
    """``add-card-note``: the minted Card note's id as ``ids.cardNoteId``."""
    return OkResponse(ok=True, ids={"cardNoteId": note_id})


def book_answer(book_id: str) -> OkResponse:
    """``add-book``: the minted Book's id as ``ids.bookId``."""
    return OkResponse(ok=True, ids={"bookId": book_id})
