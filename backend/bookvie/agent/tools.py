"""The agent tools and the one helper that declares them (AD-21).

A tool is an :class:`AgentTool`: a name, the description the agent reads, the
Pydantic model its input schema comes from, and ``run(state, arguments)``.
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
refuses exactly as ``POST /api/intents/<verb>`` does. ``add_book`` and
``edit_book`` come in Story 12.4. The destructive intents (``delete_book``,
``delete_card_note``, ``restore``, ``set_spine_color``) are never tools.
"""

import copy
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from bookvie import views
from bookvie.intents import (
    AddCardNoteIntent,
    EditCardNoteIntent,
    EditPurposeIntent,
    FieldError,
    FinishReadingIntent,
    MarkSideReadIntent,
    OkResponse,
    PauseIntent,
    SetUpNextIntent,
    StartReadingIntent,
    UnmarkSideReadIntent,
    UpdatePageIntent,
    add_card_note,
    card_note_answer,
    edit_card_note,
    edit_purpose,
    finish_reading,
    invalid_fields,
    mark_side_read,
    ok,
    page_answer,
    parse_add_card_note_intent,
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
    set_up_next,
    start_reading,
    unmark_side_read,
    update_page,
)
from bookvie.intents.intent_model import IntentModel, parse_form_intent


@dataclass(frozen=True)
class AgentTool:
    """One tool: see the module docstring."""

    name: str
    description: str
    model: type[BaseModel]
    run: Callable[[Any, dict[str, Any]], BaseModel]


def input_schema(model: type[BaseModel]) -> dict[str, Any]:
    """The tool's advertised input schema: ``model``'s by alias, closed.

    ``null`` is left out of every property whose field isn't in the model's
    ``nullable``, because the parser refuses an explicit ``null`` there.
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


def _write_tool[T: IntentModel](
    name: str,
    description: str,
    model: type[T],
    parse: Callable[[str | None], T],
    call: Callable[[Any, T], OkResponse],
) -> AgentTool:
    """A write tool: ``parse`` the arguments as the route parses its ``intent`` part, then ``call``."""

    def run(state: Any, arguments: dict[str, Any]) -> OkResponse:
        return call(state, parse(json.dumps(arguments)))

    return AgentTool(name=name, description=description, model=model, run=run)


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
)
"""The tools every ``create_app`` registers unless a test passes its own."""
