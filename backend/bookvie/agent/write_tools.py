"""The write tools (AD-21, Story 12.3).

The write tools (Story 12.3) each take their intent's JSON body as arguments
and advertise its model. They parse the arguments with the route's own
``parse_*_intent``, call the route's handler on the app's ``store`` (and
``clock`` where the route passes it), and answer through the same
``intents.answers`` mapping as the route, so a tool stores, answers and
refuses exactly as ``POST /api/intents/<verb>`` does.
"""

import json
from collections.abc import Callable
from typing import Any

from bookvie.intents import (
    AddCardNoteIntent,
    EditCardNoteIntent,
    EditPurposeIntent,
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
from bookvie.intents.intent_model import IntentModel

from .tool_base import AgentTool, _expected_keys, _refuse_missing


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
