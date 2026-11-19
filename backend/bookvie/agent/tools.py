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
and answers ``views.find_book``'s candidates. Their arguments go through :func:`parse_view_arguments`, which
names the failing argument as a route names a failing query parameter.
"""

import copy
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from bookvie import views
from bookvie.intents import FieldError, invalid_fields
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
    """``from`` and ``to`` as the stats route takes them: lax, so a date string parses."""

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

TOOLS: tuple[AgentTool, ...] = (
    GET_APP_INFO,
    FIND_BOOK,
    GET_BOOK,
    LIST_CATALOG,
    GET_CARD_NOTES,
    GET_HOME,
    GET_STATS,
)
"""The tools every ``create_app`` registers unless a test passes its own."""
