"""The read tools (AD-21, Story 12.2), and ``get_app_info``.

The read tools (Story 12.2) other than ``find_book`` answer the views their
``GET /api/views/*`` routes answer and refuse as those routes refuse, through
the same functions in ``views``. ``find_book`` is tool-only: it has no route,
and answers ``views.find_book``'s candidates. Their arguments go through
:func:`parse_view_arguments`, which names the failing argument as a route
names a failing query parameter.
"""

from typing import Any

from pydantic import ConfigDict, Field

from bookvie import views
from bookvie.intents.intent_model import IntentModel

from .tool_base import AgentTool, NoArguments, parse_arguments, parse_view_arguments


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
        "(YYYY-MM-DD, both or neither), with every finish behind them, newest first: the "
        "Book's id, title and first author, the finish date, the pages that finish added, "
        "and its rating."
    ),
    model=StatsArguments,
    run=_get_stats,
)
