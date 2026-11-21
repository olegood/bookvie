"""The agent tools and the one helper that declares them (AD-21).

A tool is an :class:`AgentTool`: a name, the description the agent reads, the
Pydantic model its input schema comes from, the keys it requires though the
model leaves them optional, and ``run(state, arguments)``.
``run`` gets the app's ``app.state`` and the arguments exactly as sent: the
SDK neither validates nor coerces them, so the model's parser is the only
validator, as it is for the intent routes. ``run`` returns an ``OkResponse``
or a view, or raises.

The read tools (Story 12.2) other than ``find_book`` answer the views their
``GET /api/views/*`` routes answer and refuse as those routes refuse, through
the same functions in ``views``. ``find_book`` is tool-only: it has no route,
and answers ``views.find_book``'s candidates. Their arguments go through
:func:`parse_view_arguments`, which names the failing argument as a route
names a failing query parameter.

The write tools (Story 12.3) each take their intent's JSON body as arguments
and advertise its model. They parse the arguments with the route's own
``parse_*_intent``, call the route's handler on the app's ``store`` (and
``clock`` where the route passes it), and answer through the same
``intents.answers`` mapping as the route, so a tool stores, answers and
refuses exactly as ``POST /api/intents/<verb>`` does.

``add_book`` and ``edit_book`` (Story 12.4) are write tools too.
``edit_book`` is a whole edit: it requires every form key, which its
route's model leaves optional, and refuses a call missing any of them with
``invalid_fields`` before the route's parser runs, so it never clears a field
the agent left out. The destructive intents (``delete_book``,
``delete_card_note``, ``restore``, ``set_spine_color``) are never tools.

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

``export_backup`` (Story 12.6) takes no arguments. It writes a dated backup
of the library, the same zip as ``GET /api/export``, into the app's
``backups_dir`` through :func:`~bookvie.intents.write_backup`, records it as
"Last export", and answers the file's ``{path, size, createdAt}``.

The restore tools (Story 13.1, AD-22) read the app's ``backups_dir``.
``list_local_backups`` lists the backups a restore can use;
``preview_restore(path)`` says what restoring one would lose, changing
nothing; ``restore_backup(path)`` is the one interactive tool: it gets the
call's :class:`ToolCall` and asks the user itself, through form elicitation
(:mod:`bookvie.agent.restore_gate`), before it restores. Its checks run in
this order: the arguments; ``unsupported`` (a client below MCP 2026-07-28, or
without form elicitation), before anything is read; the allowed path; then
the question, or, on the retry, the token, the answer and the restore.
"""

import copy
import dataclasses
import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

import mcp_types
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from bookvie import views
from bookvie.intents import (
    AddBookIntent,
    AddCardNoteIntent,
    BackupFile,
    EditBookIntent,
    EditCardNoteIntent,
    EditPurposeIntent,
    FieldError,
    FinishReadingIntent,
    IntentError,
    MarkSideReadIntent,
    OkResponse,
    PauseIntent,
    RestoreNotConfirmedReason,
    Sealed,
    SetUpNextIntent,
    StartReadingIntent,
    UnmarkSideReadIntent,
    UpdatePageIntent,
    UploadedCover,
    add_book,
    add_card_note,
    apply_confirmed_restore,
    book_answer,
    book_not_found,
    card_note_answer,
    edit_book,
    edit_card_note,
    edit_purpose,
    finish_reading,
    invalid_fields,
    list_local_backups,
    malformed_intent,
    mark_side_read,
    ok,
    page_answer,
    parse_add_book_intent,
    parse_add_card_note_intent,
    parse_edit_book_intent,
    parse_edit_card_note_intent,
    parse_edit_purpose_intent,
    parse_finish_reading_intent,
    parse_mark_side_read_intent,
    parse_pause_intent,
    parse_set_up_next_intent,
    parse_start_reading_intent,
    parse_unmark_side_read_intent,
    parse_update_page_intent,
    pause,
    prepare_cover,
    prepare_restore,
    resolve_backup_path,
    restore_not_confirmed,
    set_up_next,
    start_reading,
    unmark_side_read,
    update_page,
    write_backup,
)
from bookvie.intents.cover_fetch import COVER_URL_FIELD, on_cover_url
from bookvie.intents.finish_reading import _ANSWERS as PURPOSE_FULFILLED_ANSWERS
from bookvie.intents.intent_model import IntentModel, parse_form_intent

from .restore_gate import confirmation_text, elicitation_supported


@dataclass(frozen=True)
class ToolCall:
    """What an interactive tool sees of its ``tools/call`` besides the arguments.

    ``protocol_version`` and ``capabilities`` are the client's, from the
    request's envelope; ``input_responses`` (each answer as its JSON object,
    by key) and ``request_state`` are a 2026-07-28 retry's, ``None`` on a
    first call.
    """

    protocol_version: str | None = None
    capabilities: Mapping[str, Any] | None = None
    input_responses: Mapping[str, Mapping[str, Any]] | None = None
    request_state: str | None = None


@dataclass(frozen=True)
class AgentTool:
    """One tool: see the module docstring."""

    name: str
    description: str
    model: type[BaseModel]
    run: Callable[..., BaseModel | mcp_types.InputRequiredResult]
    """``run(state, arguments)``, or ``run(state, arguments, call)`` when ``interactive``."""
    required: tuple[str, ...] = ()
    """Keys (by alias) the tool requires though its model leaves them optional."""
    extra_properties: Mapping[str, Mapping[str, Any]] = dataclasses.field(default_factory=dict)
    """Tool-only optional properties (by key) the model doesn't have, such as ``coverUrl``."""
    interactive: bool = False
    """Whether ``run`` takes the call's :class:`ToolCall` and may answer an
    ``InputRequiredResult`` (``restore_backup``)."""


_INTEGER: Mapping[str, Any] = {"type": "integer"}
_STRING: Mapping[str, Any] = {"type": "string"}


def _or_null(prop: Mapping[str, Any]) -> dict[str, Any]:
    return {"anyOf": [dict(prop), {"type": "null"}]}


JSON_VALUE_TYPES: Mapping[type[BaseModel], Mapping[str, Mapping[str, Any]]] = {
    UpdatePageIntent: {"page": _INTEGER},
    StartReadingIntent: {"page": _or_null(_INTEGER)},
    FinishReadingIntent: {
        "finishedOn": _STRING,
        "purposeFulfilled": _or_null({"type": "string", "enum": list(PURPOSE_FULFILLED_ANSWERS)}),
        "rating": _or_null(_INTEGER),
    },
}
"""The JSON type each ``JsonValue`` property (by alias) is advertised with, by model.

The model takes any JSON value there, so a wrong type is a field error from
its parser, not a malformed intent; the bare ``JsonValue`` schema names no
type, though, and a client then guesses one (Epic 12 retro item 83: Claude
Code sent ``update_page``'s page as ``"120"``). ``null`` is listed only
where the parser accepts it: never for ``update_page``'s ``page`` (its
``nullable`` only makes ``null`` a field error) or ``finishedOn`` (a finish
always needs a date). Nothing is coerced: the parser still refuses
``"120"``.
"""

_JSON_VALUE_REF = "#/$defs/JsonValue"


def input_schema(model: type[BaseModel]) -> dict[str, Any]:
    """The tool's advertised input schema: ``model``'s by alias, closed.

    ``null`` is left out of every property whose field isn't in the model's
    ``nullable``, because the parser refuses an explicit ``null`` there.
    Then each property in :data:`JSON_VALUE_TYPES` for ``model`` gets its
    declared type in place of the untyped ``JsonValue`` reference, keeping
    its other keys (such as ``default``).
    """
    schema = copy.deepcopy(model.model_json_schema(by_alias=True))
    schema["additionalProperties"] = False
    nullable: frozenset[str] = getattr(model, "nullable", frozenset())
    properties = schema.get("properties", {})
    for name, field in model.model_fields.items():
        key = field.alias or name
        if name in nullable or key not in properties:
            continue
        properties[key] = _without_null(properties[key])
    for key, declared in JSON_VALUE_TYPES.get(model, {}).items():
        rest = {k: v for k, v in properties[key].items() if k != "$ref"}
        properties[key] = {**copy.deepcopy(dict(declared)), **rest}
    _drop_unused_json_value(schema)
    return schema


def _drop_unused_json_value(schema: dict[str, Any]) -> None:
    """Remove ``$defs.JsonValue`` (and an emptied ``$defs``) once no property refers to it."""
    defs = schema.get("$defs")
    if not isinstance(defs, dict) or "JsonValue" not in defs:
        return
    if _JSON_VALUE_REF in json.dumps(schema):
        return
    del defs["JsonValue"]
    if not defs:
        del schema["$defs"]


def advertised_schema(tool: AgentTool) -> dict[str, Any]:
    """The schema ``tool`` is listed with.

    :func:`input_schema` plus its ``required`` keys, then its
    ``extra_properties`` after the model's, never required.
    """
    schema = _required_schema(tool.model, tool.required)
    if tool.extra_properties:
        properties = schema.setdefault("properties", {})
        for key, prop in tool.extra_properties.items():
            properties[key] = copy.deepcopy(dict(prop))
    return schema


def _required_schema(model: type[BaseModel], required: Sequence[str]) -> dict[str, Any]:
    schema = input_schema(model)
    if not required:
        return schema
    properties = schema.get("properties", {})
    unknown = [key for key in required if key not in properties]
    if unknown:
        raise ValueError(f"required keys {unknown} aren't properties of {model.__name__}")
    wanted = {*schema.get("required", []), *required}
    # In property order, so the schema reads as the form does.
    schema["required"] = [key for key in properties if key in wanted]
    return schema


def _without_null(prop: dict[str, Any]) -> dict[str, Any]:
    branches = prop.get("anyOf")
    if not isinstance(branches, list):
        return prop
    kept = [branch for branch in branches if branch != {"type": "null"}]
    if len(kept) == len(branches):
        return prop
    # A `null` default would contradict the type left once null is gone.
    rest = {
        key: value
        for key, value in prop.items()
        if key != "anyOf" and not (key == "default" and value is None)
    }
    if len(kept) == 1:
        return {**kept[0], **rest}
    return {**rest, "anyOf": kept}


def parse_arguments[T: IntentModel](model: type[T], arguments: Mapping[str, Any]) -> T:
    """``arguments`` as ``model``, refused as the intent routes refuse a malformed part."""
    return parse_form_intent(model, json.dumps(arguments))


def parse_view_arguments[T: BaseModel](model: type[T], arguments: Mapping[str, Any]) -> T:
    """``arguments`` as ``model``, or 422 ``invalid_fields`` naming each failing argument.

    One field error per validation error, by alias path, with Pydantic's
    message: what ``http/api.py`` answers for a view route's bad query.
    """
    try:
        return model.model_validate(arguments)
    except ValidationError as err:
        raise invalid_fields(
            [
                FieldError(field=".".join(map(str, error["loc"])), message=error["msg"])
                for error in err.errors()
            ]
        ) from None


class NoArguments(IntentModel):
    """The arguments of a tool that takes none: a closed, empty object."""


def _get_app_info(state: Any, arguments: dict[str, Any]) -> views.AppInfoView:
    parse_arguments(NoArguments, arguments)
    return state.app_info


GET_APP_INFO = AgentTool(
    name="get_app_info",
    description=(
        "Which bookvie this is: its version, whether it is the real app (production) or a "
        "development server (dev), and the library folder it uses. Call it first to check you "
        "are talking to the bookvie you mean."
    ),
    model=NoArguments,
    run=_get_app_info,
)


class FindBookArguments(IntentModel):
    query: str


class BookArguments(IntentModel):
    book_id: str


class CardNotesArguments(IntentModel):
    book_id: str | None = None


class StatsArguments(IntentModel):
    # `from` and `to` as the stats route takes them: lax, so a date string parses. A comment,
    # not a docstring, because a model's docstring becomes its input schema's description.
    model_config = ConfigDict(strict=False)

    start: views.IsoDate | None = Field(default=None, alias="from")
    end: views.IsoDate | None = Field(default=None, alias="to")


def _find_book(state: Any, arguments: dict[str, Any]) -> views.FindBookView:
    args = parse_view_arguments(FindBookArguments, arguments)
    return views.find_book(state.store.library, args.query)


def _get_book(state: Any, arguments: dict[str, Any]) -> views.BookDetailView:
    args = parse_view_arguments(BookArguments, arguments)
    return views.require_book_detail(state.store.library, args.book_id)


def _list_catalog(state: Any, arguments: dict[str, Any]) -> views.CatalogView:
    parse_view_arguments(NoArguments, arguments)
    return views.catalog(state.store.library)


def _get_card_notes(state: Any, arguments: dict[str, Any]) -> views.CardNotesView:
    args = parse_view_arguments(CardNotesArguments, arguments)
    return views.require_card_notes(state.store.library, args.book_id)


def _get_home(state: Any, arguments: dict[str, Any]) -> views.HomeView:
    parse_view_arguments(NoArguments, arguments)
    return views.home_for(state.store)


def _get_stats(state: Any, arguments: dict[str, Any]) -> views.StatsView:
    args = parse_view_arguments(StatsArguments, arguments)
    views.check_stats_range(args.start, args.end)
    return views.stats(state.store.library, args.start, args.end)


FIND_BOOK = AgentTool(
    name="find_book",
    description=(
        "Find Books in the library by a free-text query: part of a title or subtitle, an "
        "author, an ISBN, or a title's initials such as DDIA. Returns every likely match with "
        "its id, edition and type, or an empty list. Never pick a Book for the user: when more "
        "than one matches, ask which one, unless only one of them fits the request (update_page "
        "and pause work only on the Main book, whose role is main). Every other tool takes the "
        "Book's id from here."
    ),
    model=FindBookArguments,
    run=_find_book,
)

GET_BOOK = AgentTool(
    name="get_book",
    description=(
        "One Book in full: its fields, tags, its role (main for the Main book, upNext, waiting "
        "for a paused Book, or null), whether it is a Side read, its Readings, pages left, the "
        "user's measured pace, and its Card notes. Takes the Book's id from find_book."
    ),
    model=BookArguments,
    run=_get_book,
)

LIST_CATALOG = AgentTool(
    name="list_catalog",
    description=(
        "Every Book in the catalog with its title, authors, type, tags, role, current page and "
        "percent read. Use it to answer questions across the library, such as which unread "
        "Books are about a topic."
    ),
    model=NoArguments,
    run=_list_catalog,
)

GET_CARD_NOTES = AgentTool(
    name="get_card_notes",
    description=(
        "The user's Card notes (quotes and notes with their pages), for every Book or for one "
        "Book's id."
    ),
    model=CardNotesArguments,
    run=_get_card_notes,
)

GET_HOME = AgentTool(
    name="get_home",
    description=(
        "What the user is reading now: the Main book with its page and days left, Up next, the "
        "paused Books waiting, the Side reads, and when the library was last exported."
    ),
    model=NoArguments,
    run=_get_home,
)

GET_STATS = AgentTool(
    name="get_stats",
    description=(
        "Books and pages finished, overall or for a period given as from and to dates "
        "(YYYY-MM-DD, both or neither)."
    ),
    model=StatsArguments,
    run=_get_stats,
)


MISSING_MESSAGE = "Field required"
"""A missing required key's message: Pydantic's, as :func:`parse_view_arguments` names one."""


def _write_tool[T: IntentModel](
    name: str,
    description: str,
    model: type[T],
    parse: Callable[[str | None], T],
    call: Callable[[Any, T], OkResponse],
    required: tuple[str, ...] = (),
) -> AgentTool:
    """A write tool: ``parse`` the arguments as the route parses its ``intent`` part, then ``call``.

    With ``required``, a call missing any key the advertised schema requires
    (those keys and the model's own) is refused first, with ``invalid_fields``
    naming each missing key in schema order. Without it, and for everything
    else, the route's parser refuses as the route does.
    """
    expected = _expected_keys(model, required)

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        _refuse_missing(expected, arguments)
        return call(state, parse(json.dumps(arguments)))

    return AgentTool(name=name, description=description, model=model, run=run, required=required)


def _expected_keys(model: type[BaseModel], required: Sequence[str]) -> list[str]:
    return _required_schema(model, required).get("required", []) if required else []


def _refuse_missing(expected: Sequence[str], arguments: Mapping[str, Any]) -> None:
    missing = [key for key in expected if key not in arguments]
    if missing:
        raise invalid_fields([FieldError(field=key, message=MISSING_MESSAGE) for key in missing])


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


START_READING = _write_tool(
    "start_reading",
    (
        "Make a Book the Main book and start or resume its Reading, with an optional "
        "one-sentence Purpose. This pauses the current Main book, and it may change Up next. "
        "Tell the user what will change and get a yes before you call it. When the Book is a "
        "Side read, also send page: the page the user is on."
    ),
    StartReadingIntent,
    parse_start_reading_intent,
    lambda state, intent: page_answer(start_reading(state.store, state.clock, intent)),
)

UPDATE_PAGE = _write_tool(
    "update_page",
    (
        "Save the page the user has reached in the Main book: the page number they are on, "
        "from 0 to its page count, not the number of pages read. If the user says how many "
        "pages they read, add them to the current page from get_home. Use the Book's id from "
        "find_book; never guess a Book from its title. reachedLastPage means the user is at "
        "the last page: ask whether to finish the Book."
    ),
    UpdatePageIntent,
    parse_update_page_intent,
    lambda state, intent: page_answer(update_page(state.store, state.clock, intent)),
)


def _finish_reading(state: Any, intent: FinishReadingIntent) -> OkResponse:
    finish_reading(state.store, state.clock, intent)
    return ok()


FINISH_READING = _write_tool(
    "finish_reading",
    (
        "Finish a Book's current Reading, or record a past finish for a Book never read, on "
        "finishedOn (YYYY-MM-DD, not in the future). purposeFulfilled is yes, partly or "
        "notYet, and rating is 1 to 5; send null for either when the user doesn't say."
    ),
    FinishReadingIntent,
    parse_finish_reading_intent,
    _finish_reading,
)


def _pause(state: Any, intent: PauseIntent) -> OkResponse:
    pause(state.store, state.clock, intent)
    return ok()


PAUSE = _write_tool(
    "pause",
    (
        "Pause the Main book at its current page. It becomes Up next, in place of any Book that "
        "was Up next."
    ),
    PauseIntent,
    parse_pause_intent,
    _pause,
)


def _set_up_next(state: Any, intent: SetUpNextIntent) -> OkResponse:
    set_up_next(state.store, intent)
    return ok()


SET_UP_NEXT = _write_tool(
    "set_up_next",
    (
        "Choose the Book to read next: any Book except the Main book, including a finished one "
        "to re-read. It replaces the current Up next, which keeps its state."
    ),
    SetUpNextIntent,
    parse_set_up_next_intent,
    _set_up_next,
)


def _edit_purpose(state: Any, intent: EditPurposeIntent) -> OkResponse:
    edit_purpose(state.store, intent)
    return ok()


EDIT_PURPOSE = _write_tool(
    "edit_purpose",
    (
        "Change the Purpose of a Book's current Reading (active or paused): one sentence on "
        "what the user needs to be able to do with this Book. null clears it."
    ),
    EditPurposeIntent,
    parse_edit_purpose_intent,
    _edit_purpose,
)

ADD_CARD_NOTE = _write_tool(
    "add_card_note",
    (
        "Add a Card note to a Book: text (a quote or a note, in the user's words; don't "
        "rewrite it) and the page or page range where the user found it, such as 212 or "
        "212-214."
    ),
    AddCardNoteIntent,
    parse_add_card_note_intent,
    lambda state, intent: card_note_answer(add_card_note(state.store, state.clock, intent)),
)


def _edit_card_note(state: Any, intent: EditCardNoteIntent) -> OkResponse:
    edit_card_note(state.store, intent)
    return ok()


EDIT_CARD_NOTE = _write_tool(
    "edit_card_note",
    (
        "Change a Card note's text and page. Takes the Book's id and the Card note's id from "
        "get_book or get_card_notes."
    ),
    EditCardNoteIntent,
    parse_edit_card_note_intent,
    _edit_card_note,
)


def _mark_side_read(state: Any, intent: MarkSideReadIntent) -> OkResponse:
    mark_side_read(state.store, intent)
    return ok()


MARK_SIDE_READ = _write_tool(
    "mark_side_read",
    (
        "Mark a Book as read on the side, next to the Main book. At most 3 Side reads; it "
        "doesn't start a Reading."
    ),
    MarkSideReadIntent,
    parse_mark_side_read_intent,
    _mark_side_read,
)


def _unmark_side_read(state: Any, intent: UnmarkSideReadIntent) -> OkResponse:
    unmark_side_read(state.store, intent)
    return ok()


UNMARK_SIDE_READ = _write_tool(
    "unmark_side_read",
    "Stop reading a Book on the side. Its Readings and page don't change.",
    UnmarkSideReadIntent,
    parse_unmark_side_read_intent,
    _unmark_side_read,
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


def _export_backup(state: Any, arguments: dict[str, Any]) -> BackupFile:
    parse_arguments(NoArguments, arguments)
    return write_backup(state.store, state.clock, state.backups_dir)


EXPORT_BACKUP = AgentTool(
    name="export_backup",
    description=(
        "Write a dated backup of the whole library (library.json and covers, the same file as the "
        "Backup page's Export) to the backups folder, and return its path, size and time. A second "
        "backup on the same day replaces that day's file. It counts as the library's last export."
    ),
    model=NoArguments,
    run=_export_backup,
)


class PathArguments(IntentModel):
    # A comment, not a docstring: a model's docstring becomes its input schema's description.
    path: str


def _list_local_backups(state: Any, arguments: dict[str, Any]) -> BaseModel:
    parse_view_arguments(NoArguments, arguments)
    return list_local_backups(state.backups_dir)


LIST_LOCAL_BACKUPS = AgentTool(
    name="list_local_backups",
    description=(
        "The backups on this computer that a restore can use, newest first: the daily backups, "
        "the safety copies saved before a restore, and the backups downloaded from Dropbox. Each "
        "has its path, its kind (daily, safety or from_dropbox), the time the backup was made, its "
        "size and its Dropbox content hash. Show them to the user and let the user pick; never "
        "pick one yourself."
    ),
    model=NoArguments,
    run=_list_local_backups,
)


def _preview_restore(state: Any, arguments: dict[str, Any]) -> BaseModel:
    args = parse_view_arguments(PathArguments, arguments)
    path, _kind = resolve_backup_path(state.backups_dir, args.path)
    return prepare_restore(state.store, path).preview


PREVIEW_RESTORE = AgentTool(
    name="preview_restore",
    description=(
        "Check a backup from list_local_backups without changing anything, and say what "
        "restoring it would lose: the backup's time and counts, the current library's counts, "
        "the titles of the Books added since and the number of Card notes added since. Show this "
        "to the user before you ask about restoring. A file bookvie can't restore is refused "
        "with the same reason as the Backup page."
    ),
    model=PathArguments,
    run=_preview_restore,
)

CONFIRM_KEY = "confirm"
"""The key of ``restore_backup``'s one input request."""
CONFIRM_SCHEMA: dict[str, Any] = {"type": "object", "properties": {}}
"""The question's form: nothing to fill in, so an accept is the whole answer."""


def _restore_backup(
    state: Any, arguments: dict[str, Any], call: ToolCall
) -> BaseModel | mcp_types.InputRequiredResult:
    args = parse_view_arguments(PathArguments, arguments)
    if not elicitation_supported(call.protocol_version, call.capabilities):
        raise restore_not_confirmed(RestoreNotConfirmedReason.UNSUPPORTED)
    path, _kind = resolve_backup_path(state.backups_dir, args.path)
    gate = state.restore_gate
    if call.input_responses is None and call.request_state is None:
        prepared = prepare_restore(state.store, path)
        token = gate.seal(
            Sealed(str(path), prepared.archive_sha256, prepared.library_sha256),
            state.clock.now(),
        )
        question = mcp_types.ElicitRequest(
            params=mcp_types.ElicitRequestFormParams(
                message=confirmation_text(prepared.preview, state.clock.today()),
                requested_schema=copy.deepcopy(CONFIRM_SCHEMA),
            )
        )
        return mcp_types.InputRequiredResult(
            input_requests={CONFIRM_KEY: question}, request_state=token
        )
    sealed = gate.open(call.request_state, state.clock.now())
    answer = (call.input_responses or {}).get(CONFIRM_KEY)
    action = answer.get("action") if isinstance(answer, Mapping) else None
    if action == "decline":
        raise restore_not_confirmed(RestoreNotConfirmedReason.DECLINED)
    if action != "accept":
        raise restore_not_confirmed(RestoreNotConfirmedReason.CANCELLED)
    if sealed.path != str(path):
        raise restore_not_confirmed(RestoreNotConfirmedReason.CHANGED)
    return apply_confirmed_restore(state.store, state.clock, state.backups_dir, path, sealed)


RESTORE_BACKUP = AgentTool(
    name="restore_backup",
    description=(
        "Replace the whole library with a backup from list_local_backups. Call it only when the "
        "user has asked for this restore and said yes to its preview_restore summary; never on "
        "your own initiative, and never again after a refusal unless the user asks. bookvie then "
        "asks the user directly to confirm; anything but an explicit yes is restore_not_confirmed "
        "and nothing changes. Before replacing anything it saves a safety copy of the current "
        "library and returns its path."
    ),
    model=PathArguments,
    run=_restore_backup,
    interactive=True,
)

TOOLS: tuple[AgentTool, ...] = (
    GET_APP_INFO,
    FIND_BOOK,
    GET_BOOK,
    LIST_CATALOG,
    GET_CARD_NOTES,
    GET_HOME,
    GET_STATS,
    START_READING,
    UPDATE_PAGE,
    FINISH_READING,
    PAUSE,
    SET_UP_NEXT,
    EDIT_PURPOSE,
    ADD_CARD_NOTE,
    EDIT_CARD_NOTE,
    MARK_SIDE_READ,
    UNMARK_SIDE_READ,
    ADD_BOOK,
    EDIT_BOOK,
    EXPORT_BACKUP,
    LIST_LOCAL_BACKUPS,
    PREVIEW_RESTORE,
    RESTORE_BACKUP,
)
"""The tools every ``create_app`` registers unless a test passes its own."""
