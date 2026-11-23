"""The book tools, ``add_book`` and ``edit_book`` (AD-21, Story 12.4).

They work like the write tools (``write_tools``): the route's parser and
handler, answered as the route answers.
``edit_book`` is a whole edit: it requires every form key, which its
route's model leaves optional, and refuses a call missing any of them with
``invalid_fields`` before the route's parser runs, so it never clears a field
the agent left out.

Both also take an optional ``coverUrl`` (Story 12.5), a tool-only key the
route's model doesn't have. bookvie downloads it with the app's
``cover_fetcher`` (:class:`~bookvie.intents.cover_fetch.CoverFetcher`), in
AD-21's order: ``coverUrl`` is taken out of the arguments, and one that isn't
a string is refused as the malformed intent (on ``intent``); the missing-key
check and the route's parser run on the rest, as if a ``cover`` part came;
``edit_book`` refuses ``book_not_found`` for a Book that is gone; then the
download, outside the AD-4 lock; then ``prepare_cover`` and the handler with
that cover, exactly as the route calls them. Every cover failure is reported
on ``coverUrl``, and nothing is saved.
"""

import json
from collections.abc import Callable
from typing import Any

from bookvie import views
from bookvie.intents import (
    AddBookIntent,
    EditBookIntent,
    IntentError,
    OkResponse,
    UploadedCover,
    add_book,
    book_answer,
    book_not_found,
    edit_book,
    malformed_intent,
    ok,
    parse_add_book_intent,
    parse_edit_book_intent,
    prepare_cover,
)
from bookvie.intents.cover_fetch import COVER_URL_FIELD, on_cover_url
from bookvie.intents.intent_model import IntentModel

from .tool_base import AgentTool, _expected_keys, _refuse_missing

COVER_URL_PROPERTY: dict[str, Any] = {"title": "Coverurl", "type": "string"}
"""``coverUrl`` in the book tools' schemas: a plain string, never ``null``, as a form key."""

COVER_URL_SENTENCE = (
    "coverUrl is the https address of the front cover image; bookvie downloads it. If the "
    "download fails, nothing is saved: tell the user why."
)
"""Story 12.5's sentence, appended to both book tools' descriptions (epics.md)."""


def _book_tool[T: IntentModel](
    name: str,
    description: str,
    model: type[T],
    parse: Callable[[str | None, bool], T],
    call: Callable[[Any, T, UploadedCover | None], OkResponse],
    required: tuple[str, ...] = (),
    book_id: Callable[[T], str] | None = None,
) -> AgentTool:
    """A write tool that also takes an optional ``coverUrl`` (see the module docstring).

    The order: take ``coverUrl`` out, refusing a non-string one as the
    malformed intent; refuse missing keys; parse the rest with ``has_cover``;
    for an edit, refuse ``book_not_found``; download; ``prepare_cover``; the
    handler, its ``cover`` failures reported on ``coverUrl``.

    ``parse(raw, has_cover)`` is the route's parser; ``call(state, intent,
    cover)`` the route's handler. ``book_id``, for an edit, names the Book
    that must still exist before anything is downloaded.
    """
    expected = _expected_keys(model, required)

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        rest = dict(arguments)
        has_url = COVER_URL_FIELD in rest
        cover_url = rest.pop(COVER_URL_FIELD, None)
        if has_url and not isinstance(cover_url, str):
            raise malformed_intent()
        _refuse_missing(expected, rest)
        intent = parse(json.dumps(rest), has_url)
        if not isinstance(cover_url, str):
            return call(state, intent, None)
        if book_id is not None and state.store.library.book(book_id(intent)) is None:
            raise book_not_found()
        # Outside the AD-4 lock: only the handler takes it.
        uploaded = prepare_cover(state.cover_fetcher.fetch(cover_url))
        try:
            return call(state, intent, uploaded)
        except IntentError as err:
            raise on_cover_url(err) from None

    return AgentTool(
        name=name,
        description=description,
        model=model,
        run=run,
        required=required,
        extra_properties={COVER_URL_FIELD: COVER_URL_PROPERTY},
    )


ADD_BOOK = _book_tool(
    "add_book",
    (
        "Add a Book to the catalog. Every field is a string. Required: title, pages, authors "
        "(separated by semicolons), language, publisher, type (paperback, hardcover or ebook); "
        "edition defaults to 1. Optional: subtitle, isbn, year, tags (separated by commas), and "
        "finishedOn (YYYY-MM-DD) for a Book the user has already read. A likely duplicate is "
        "refused with duplicate_book and the matching Books: show them to the user, and send "
        "confirmDuplicate true only if the user says to add it anyway. Returns the new Book's "
        f"id. {COVER_URL_SENTENCE}"
    ),
    AddBookIntent,
    lambda raw, _has_cover: parse_add_book_intent(raw),
    lambda state, intent, cover: book_answer(add_book(state.store, state.clock, intent, cover)),
)


def _edit_book(state: Any, intent: EditBookIntent, cover: UploadedCover | None) -> OkResponse:
    edit_book(state.store, state.clock, intent, cover)
    return ok()


BOOK_FORM_KEYS: tuple[str, ...] = tuple(
    field.alias or name for name, field in views.BookEditForm.model_fields.items()
)
"""The book form's keys by alias, in form order: ``get_book``'s ``editForm``, what a whole
edit sends. Not the intent model's, which a tool-only key such as ``coverUrl`` may join."""

EDIT_BOOK = _book_tool(
    "edit_book",
    (
        "Replace a Book's fields. This is a whole edit: a field you leave empty is cleared. Call "
        "get_book first and send its editForm with bookId, changing only what the user asked "
        "for. A finished Book's finishedOn can be changed but not emptied. removeCover true "
        "deletes the Book's cover: send it only when the user asks. A changed title, author or "
        f"ISBN that makes it a likely duplicate is refused like add_book. {COVER_URL_SENTENCE}"
    ),
    EditBookIntent,
    parse_edit_book_intent,
    _edit_book,
    required=BOOK_FORM_KEYS,
    book_id=lambda intent: intent.book_id,
)
