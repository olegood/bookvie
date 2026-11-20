"""Story 12.3: an agent records the user's reading through ten write tools (AD-21).

``start_reading``, ``update_page``, ``finish_reading``, ``pause``,
``set_up_next``, ``edit_purpose``, ``add_card_note``, ``edit_card_note``,
``mark_side_read`` and ``unmark_side_read`` each take their intent's JSON body
as arguments, advertise their intent model's schema by alias, and answer
exactly as ``POST /api/intents/<verb>`` answers: the same stored
``library.json`` and the same result or AD-9 error. Each description is the
text Story 12.3 quotes, character for character. The destructive intents stay
unregistered.

Story 12.4's ``add_book`` and ``edit_book`` are in ``test_agent_book_write.py``,
which reuses this file's seed, twins and case shape.

The contract leaves seed one library, copies it, and opens both copies through
``connect_mcp``: the input goes through the tool on one app and through the
route on the other. The ids an intent mints come from a counter that restarts
before each call, so both sides mint the same ones. Every test runs with
``HOME`` set to a temporary folder (``conftest.py``).
"""

import importlib
import itertools
import json
import shutil
import uuid
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from bookvie.intents import (
    AddCardNoteIntent,
    EditCardNoteIntent,
    EditPurposeIntent,
    FinishReadingIntent,
    MarkSideReadIntent,
    PauseIntent,
    SetUpNextIntent,
    StartReadingIntent,
    UnmarkSideReadIntent,
    UpdatePageIntent,
)
from tests.agent_client import McpClient, error_of, text_of
from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE_ISBN13,
    FaultyFs,
    assert_invariants,
    library_bytes,
    temp_files,
)

# 12.1's and 12.2's tools, in the order they are listed (the first seven of
# test_agent_mount.py's AGENT_TOOL_NAMES, which Story 12.3 extends).
EARLIER_TOOL_NAMES = [
    "get_app_info",
    "find_book",
    "get_book",
    "list_catalog",
    "get_card_notes",
    "get_home",
    "get_stats",
]

# Each write tool: its intent model, its properties by alias, and the required ones.
WRITE_TOOLS: dict[str, tuple[type, set[str], set[str]]] = {
    "start_reading": (StartReadingIntent, {"bookId", "purpose", "page"}, {"bookId", "purpose"}),
    "update_page": (UpdatePageIntent, {"bookId", "page"}, {"bookId", "page"}),
    "finish_reading": (
        FinishReadingIntent,
        {"bookId", "finishedOn", "purposeFulfilled", "rating"},
        {"bookId", "finishedOn", "purposeFulfilled", "rating"},
    ),
    "pause": (PauseIntent, {"bookId"}, {"bookId"}),
    "set_up_next": (SetUpNextIntent, {"bookId"}, {"bookId"}),
    "edit_purpose": (EditPurposeIntent, {"bookId", "purpose"}, {"bookId", "purpose"}),
    "add_card_note": (AddCardNoteIntent, {"bookId", "text", "page"}, {"bookId", "text", "page"}),
    "edit_card_note": (
        EditCardNoteIntent,
        {"bookId", "cardNoteId", "text", "page"},
        {"bookId", "cardNoteId", "text", "page"},
    ),
    "mark_side_read": (MarkSideReadIntent, {"bookId"}, {"bookId"}),
    "unmark_side_read": (UnmarkSideReadIntent, {"bookId"}, {"bookId"}),
}
WRITE_TOOL_NAMES = list(WRITE_TOOLS)
DESTRUCTIVE_TOOL_NAMES = ["delete_book", "delete_card_note", "restore", "set_spine_color"]
# Story 12.4's two tools (tests/test_agent_book_write.py), listed after the ten.
BOOK_TOOL_NAMES = ["add_book", "edit_book"]

DESCRIPTIONS = {
    "start_reading": (
        "Make a Book the Main book and start or resume its Reading, with an optional "
        "one-sentence Purpose. This pauses the current Main book, and it may change Up next. "
        "Tell the user what will change and get a yes before you call it. When the Book is a "
        "Side read, also send page: the page the user is on."
    ),
    "update_page": (
        "Save the page the user has reached in the Main book: the page number they are on, "
        "from 0 to its page count, not the number of pages read. If the user says how many "
        "pages they read, add them to the current page from get_home. Use the Book's id from "
        "find_book; never guess a Book from its title. reachedLastPage means the user is at "
        "the last page: ask whether to finish the Book."
    ),
    "finish_reading": (
        "Finish a Book's current Reading, or record a past finish for a Book never read, on "
        "finishedOn (YYYY-MM-DD, not in the future). purposeFulfilled is yes, partly or "
        "notYet, and rating is 1 to 5; send null for either when the user doesn't say."
    ),
    "pause": (
        "Pause the Main book at its current page. It becomes Up next, in place of any Book that "
        "was Up next."
    ),
    "set_up_next": (
        "Choose the Book to read next: any Book except the Main book, including a finished one "
        "to re-read. It replaces the current Up next, which keeps its state."
    ),
    "edit_purpose": (
        "Change the Purpose of a Book's current Reading (active or paused): one sentence on "
        "what the user needs to be able to do with this Book. null clears it."
    ),
    "add_card_note": (
        "Add a Card note to a Book: text (a quote or a note, in the user's words; don't "
        "rewrite it) and the page or page range where the user found it, such as 212 or "
        "212-214."
    ),
    "edit_card_note": (
        "Change a Card note's text and page. Takes the Book's id and the Card note's id from "
        "get_book or get_card_notes."
    ),
    "mark_side_read": (
        "Mark a Book as read on the side, next to the Main book. At most 3 Side reads; it "
        "doesn't start a Reading."
    ),
    "unmark_side_read": "Stop reading a Book on the side. Its Readings and page don't change.",
}

# The seeded Books, by role. Fixed ids, so a case names its Book.
MAIN = "a0000000-0000-4000-8000-000000000001"  # the Main book, at page 120 of 616, a Purpose
UPNEXT = "a0000000-0000-4000-8000-000000000002"  # Up next, never started
PAUSED = "a0000000-0000-4000-8000-000000000003"  # waiting, paused at page 200 of 448, no Purpose
FINISHED = "a0000000-0000-4000-8000-000000000004"  # Dune: finished, every optional field set
UNREAD = "a0000000-0000-4000-8000-000000000005"  # no Readings, no role
SIDE1 = "a0000000-0000-4000-8000-000000000006"  # a Side read
SIDE2 = "a0000000-0000-4000-8000-000000000007"  # a Side read
SIDE3 = "a0000000-0000-4000-8000-000000000008"  # a Side read only when the case seeds 3
NOTE = "c0000000-0000-4000-8000-000000000001"  # the Main book's one Card note
GONE = "00000000-0000-4000-8000-000000000000"  # no Book or Card note has this id

MAIN_PAGES = 616
PAUSED_PAGES = 448
# A page the paused Book (at 200) resumes at that isn't its current one.
RESUME_PAGE = 230
UNREAD_COVER = "covers/neuromancer.png"
DUNE_SUBTITLE = "Dune Chronicles 1"
DUNE_SPINE_COLOR = "#749076"


def _seed(folder: Path, *, side_reads: int, cover: bool = False) -> None:
    """The library every contract case starts from (see the ids above).

    ``cover`` gives the unread Book a cover file in ``covers/``.
    """
    builder = LibraryBuilder()
    builder.book(id=MAIN, title="Designing Data-Intensive Applications", pages=MAIN_PAGES)
    builder.book(id=UPNEXT, title="Designing Interfaces", pages=599)
    builder.book(id=PAUSED, title="Refactoring", pages=PAUSED_PAGES)
    # Every optional field set, for Story 12.4's edits; no 12.3 case reads them.
    builder.book(
        id=FINISHED,
        title="Dune",
        subtitle=DUNE_SUBTITLE,
        authors=["Frank Herbert"],
        pages=412,
        isbn=DUNE_ISBN13,
        year=1965,
        tags=["sci-fi", "classic"],
        spine_color_user=DUNE_SPINE_COLOR,
    )
    builder.book(
        id=UNREAD, title="Neuromancer", pages=271, cover_file=UNREAD_COVER if cover else None
    )
    builder.book(id=SIDE1, title="The Pragmatic Programmer", pages=352)
    builder.book(id=SIDE2, title="Sapiens", pages=443)
    builder.book(id=SIDE3, title="Thinking, Fast and Slow", pages=499)
    builder.reading(MAIN, start_date="2026-10-01", current_page=120, purpose="Learn replication")
    builder.card_note(MAIN, id=NOTE, text="Replication lag is a property.", page_start=162)
    builder.reading(PAUSED, start_date="2026-09-01", current_page=200, paused_at="2026-09-20")
    builder.reading(
        FINISHED,
        start_date="2026-03-01",
        finish_date="2026-04-10",
        finished_pages=412,
        current_page=412,
    )
    builder.main(MAIN)
    builder.up_next(UPNEXT)
    for side in (SIDE1, SIDE2, SIDE3)[:side_reads]:
        builder.side_read(side)
    builder.write(folder)
    if cover:
        (folder / UNREAD_COVER).parent.mkdir(exist_ok=True)
        (folder / UNREAD_COVER).write_bytes(b"\x89PNG\r\n\x1a\n a cover")


@dataclass(frozen=True)
class Case:
    """One input for one tool, and what the route answers it (checked after the comparison).

    ``expect`` is ``"ok"``, ``"noop"`` (ok and nothing written), ``"lastPage"`` (ok with
    ``reachedLastPage``), ``"unchanged"`` (Story 12.4: ok, committed, the same bytes) or the
    error ``code``; ``fields`` names an ``invalid_fields``
    refusal's fields in order. ``fault`` is the filesystem step that fails at write.
    ``cover`` seeds the unread Book with a cover file.
    """

    tool: str
    label: str
    arguments: dict[str, Any]
    expect: str
    fields: tuple[str, ...] = ()
    side_reads: int = 2
    fault: str | None = None
    cover: bool = False

    @property
    def id(self) -> str:
        return f"{self.tool}-{self.label}"


def _malformed(tool: str, valid: dict[str, Any], missing: str) -> list[Case]:
    """A wrong JSON type, an unknown key and a missing key: refused as the route refuses them."""
    rest = {key: value for key, value in valid.items() if key != missing}
    return [
        Case(tool, "wrong-type", {**valid, "bookId": 42}, "invalid_fields", ("intent",)),
        Case(
            tool,
            "unknown-key",
            {**valid, "bookIds": [valid["bookId"]]},
            "invalid_fields",
            ("intent",),
        ),
        Case(tool, "missing-key", rest, "invalid_fields", ("intent",)),
    ]


START = {"bookId": UPNEXT, "purpose": "Learn the patterns"}
UPDATE = {"bookId": MAIN, "page": 212}
FINISH = {"bookId": MAIN, "finishedOn": "2026-10-29", "purposeFulfilled": "partly", "rating": 4}
PAUSE = {"bookId": MAIN}
SET_UP_NEXT = {"bookId": PAUSED}
EDIT_PURPOSE = {"bookId": MAIN, "purpose": "  Learn consensus  "}
ADD_NOTE = {"bookId": MAIN, "text": "  Logs are the truth.  ", "page": "212-214"}
EDIT_NOTE = {"bookId": MAIN, "cardNoteId": NOTE, "text": "Lag is a property.", "page": "163"}
MARK = {"bookId": UNREAD}
UNMARK = {"bookId": SIDE1}

SUCCESSES = {
    "start_reading": START,
    "update_page": UPDATE,
    "finish_reading": FINISH,
    "pause": PAUSE,
    "set_up_next": SET_UP_NEXT,
    "edit_purpose": EDIT_PURPOSE,
    "add_card_note": ADD_NOTE,
    "edit_card_note": EDIT_NOTE,
    "mark_side_read": MARK,
    "unmark_side_read": UNMARK,
}

CASES: list[Case] = [
    # start_reading
    Case("start_reading", "success-new-reading", START, "ok"),
    Case("start_reading", "success-resume-at-last-page", {"bookId": PAUSED, "purpose": None, "page": PAUSED_PAGES}, "lastPage"),
    Case("start_reading", "success-side-read-with-page", {"bookId": SIDE1, "purpose": None, "page": 40}, "ok"),
    Case("start_reading", "side-read-without-page", {"bookId": SIDE1, "purpose": None}, "invalid_fields", ("page",)),
    Case("start_reading", "page-past-the-end", {"bookId": UNREAD, "purpose": None, "page": 272}, "invalid_fields", ("page",)),
    Case("start_reading", "already-main", {"bookId": MAIN, "purpose": None}, "already_main"),
    Case("start_reading", "book-not-found", {"bookId": GONE, "purpose": None}, "book_not_found"),
    *_malformed("start_reading", START, "purpose"),
    # update_page
    Case("update_page", "success", UPDATE, "ok"),
    Case("update_page", "success-last-page", {"bookId": MAIN, "page": MAIN_PAGES}, "lastPage"),
    Case("update_page", "page-past-the-end", {"bookId": MAIN, "page": MAIN_PAGES + 1}, "invalid_fields", ("page",)),
    Case("update_page", "page-as-a-string", {"bookId": MAIN, "page": "212"}, "invalid_fields", ("page",)),
    Case("update_page", "not-main-book", {"bookId": PAUSED, "page": 210}, "not_main_book"),
    Case("update_page", "book-not-found", {"bookId": GONE, "page": 1}, "book_not_found"),
    *_malformed("update_page", UPDATE, "page"),
    # finish_reading
    Case("finish_reading", "success", FINISH, "ok"),
    Case("finish_reading", "success-back-fill", {"bookId": UNREAD, "finishedOn": "2026-05-01", "purposeFulfilled": None, "rating": None}, "ok"),
    Case("finish_reading", "every-field-wrong", {"bookId": MAIN, "finishedOn": "2027-01-01", "purposeFulfilled": "maybe", "rating": 6}, "invalid_fields", ("finishedOn", "purposeFulfilled", "rating")),
    Case("finish_reading", "fulfilled-without-purpose", {"bookId": PAUSED, "finishedOn": "2026-10-29", "purposeFulfilled": "yes", "rating": None}, "invalid_fields", ("purposeFulfilled",)),
    Case("finish_reading", "already-finished", {"bookId": FINISHED, "finishedOn": "2026-10-29", "purposeFulfilled": None, "rating": None}, "reading_already_finished"),
    Case("finish_reading", "book-not-found", {**FINISH, "bookId": GONE}, "book_not_found"),
    *_malformed("finish_reading", FINISH, "rating"),
    # pause
    Case("pause", "success", PAUSE, "ok"),
    Case("pause", "not-main-book", {"bookId": PAUSED}, "not_main_book"),
    Case("pause", "book-not-found", {"bookId": GONE}, "book_not_found"),
    *_malformed("pause", PAUSE, "bookId"),
    # set_up_next
    Case("set_up_next", "success", SET_UP_NEXT, "ok"),
    Case("set_up_next", "noop-already-up-next", {"bookId": UPNEXT}, "noop"),
    Case("set_up_next", "main-cannot-be-up-next", {"bookId": MAIN}, "main_cannot_be_up_next"),
    Case("set_up_next", "book-not-found", {"bookId": GONE}, "book_not_found"),
    *_malformed("set_up_next", SET_UP_NEXT, "bookId"),
    # edit_purpose
    Case("edit_purpose", "success", EDIT_PURPOSE, "ok"),
    Case("edit_purpose", "success-a-paused-books", {"bookId": PAUSED, "purpose": "Keep code clean"}, "ok"),
    Case("edit_purpose", "success-null-clears-it", {"bookId": MAIN, "purpose": None}, "ok"),
    Case("edit_purpose", "already-finished", {"bookId": FINISHED, "purpose": "Again"}, "reading_already_finished"),
    Case("edit_purpose", "book-not-found", {"bookId": GONE, "purpose": None}, "book_not_found"),
    *_malformed("edit_purpose", EDIT_PURPOSE, "purpose"),
    # add_card_note
    Case("add_card_note", "success", ADD_NOTE, "ok"),
    Case("add_card_note", "note-and-page-wrong", {"bookId": MAIN, "text": "   ", "page": "abc"}, "invalid_fields", ("text", "page")),
    Case("add_card_note", "book-not-found", {**ADD_NOTE, "bookId": GONE}, "book_not_found"),
    Case("add_card_note", "page-as-a-number", {**ADD_NOTE, "page": 212}, "invalid_fields", ("intent",)),
    *_malformed("add_card_note", ADD_NOTE, "text"),
    # edit_card_note
    Case("edit_card_note", "success", EDIT_NOTE, "ok"),
    Case("edit_card_note", "page-past-the-end", {**EDIT_NOTE, "page": "700"}, "invalid_fields", ("page",)),
    Case("edit_card_note", "card-note-not-found", {**EDIT_NOTE, "cardNoteId": GONE}, "card_note_not_found"),
    Case("edit_card_note", "book-not-found", {**EDIT_NOTE, "bookId": GONE}, "book_not_found"),
    *_malformed("edit_card_note", EDIT_NOTE, "cardNoteId"),
    # mark_side_read
    Case("mark_side_read", "success", MARK, "ok"),
    Case("mark_side_read", "noop-already-a-side-read", {"bookId": SIDE1}, "noop"),
    Case("mark_side_read", "main-cannot-be-side-read", {"bookId": MAIN}, "main_cannot_be_side_read"),
    Case("mark_side_read", "side-reads-full", MARK, "side_reads_full", side_reads=3),
    Case("mark_side_read", "book-not-found", {"bookId": GONE}, "book_not_found"),
    *_malformed("mark_side_read", MARK, "bookId"),
    # unmark_side_read
    Case("unmark_side_read", "success", UNMARK, "ok"),
    Case("unmark_side_read", "noop-not-a-side-read", {"bookId": UNREAD}, "noop"),
    Case("unmark_side_read", "book-not-found", {"bookId": GONE}, "book_not_found"),
    *_malformed("unmark_side_read", UNMARK, "bookId"),
    # TR8: a filesystem fault at write, through every tool's success input.
    *(Case(tool, "fault-at-write", arguments, "couldnt_save", fault="write") for tool, arguments in SUCCESSES.items()),
    # Green-phase follow-ups (Story 12.3 automation).
    # A null where the model takes only a string is refused on intent by tool and route alike.
    *(Case(tool, "null-book-id", {**arguments, "bookId": None}, "invalid_fields", ("intent",)) for tool, arguments in SUCCESSES.items()),
    Case("add_card_note", "null-text", {**ADD_NOTE, "text": None}, "invalid_fields", ("intent",)),
    # Resuming the paused Book at another page closes a segment (earlierSegments).
    Case("start_reading", "success-resume-at-another-page", {"bookId": PAUSED, "purpose": None, "page": RESUME_PAGE}, "ok"),
    # TR8's other commit steps: the temp file's fsync and the rename.
    *(Case(tool, f"fault-at-{fault}", arguments, "couldnt_save", fault=fault) for fault in ("fsync", "replace") for tool, arguments in SUCCESSES.items()),
]  # fmt: skip

# The intent modules that mint ids with uuid.uuid4() (add_book and edit_book: Story 12.4's file).
# `cover` mints a new cover's file name (Story 12.5 compares covers stored by tool and route).
MINTING_MODULES = (
    "start_reading",
    "finish_reading",
    "add_card_note",
    "add_book",
    "edit_book",
    "cover",
)


@pytest.fixture
def same_ids(monkeypatch: pytest.MonkeyPatch) -> Callable[[], None]:
    """Make the intents mint ids from a counter; calling the result restarts it."""
    counter = itertools.count(1)

    def uuid4() -> uuid.UUID:
        return uuid.UUID(int=0xB0000000_0000_4000_8000_000000000000 + next(counter))

    for name in MINTING_MODULES:
        module = importlib.import_module(f"bookvie.intents.{name}")
        monkeypatch.setattr(module, "uuid", SimpleNamespace(uuid4=uuid4))

    def restart() -> None:
        nonlocal counter
        counter = itertools.count(1)

    return restart


def _twins(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    case: Case,
    *,
    cover_fetcher: Any = None,
) -> tuple[McpClient, McpClient]:
    """Two apps on two identical copies of the seed: one for the tool, one for the route.

    ``cover_fetcher`` goes to the tool's app only (Story 12.5): the route takes a cover part.
    """
    tool_dir, route_dir = tmp_path / "tool", tmp_path / "route"
    _seed(tool_dir, side_reads=case.side_reads, cover=case.cover)
    shutil.copytree(tool_dir, route_dir)
    tool_side = connect_mcp(data_dir=tool_dir, cover_fetcher=cover_fetcher)
    route_side = connect_mcp(data_dir=route_dir)
    if case.fault is not None:
        for client in (tool_side, route_side):
            client.http.app.state.store.fs = FaultyFs(case.fault)
    return tool_side, route_side


def _route_answer(
    client: McpClient, tool: str, arguments: dict[str, Any], cover: bytes | None = None
) -> tuple[str, Any]:
    """``POST /api/intents/<verb>`` as the UI sends it: ``("ok", body)`` or ``("error", error)``.

    ``cover`` is sent as the ``cover`` file part, as the Add and Edit book forms send a file.
    """
    verb = tool.replace("_", "-")
    files: dict[str, Any] = {"intent": (None, json.dumps(arguments), "application/json")}
    if cover is not None:
        files["cover"] = ("cover", cover, "application/octet-stream")
    response = client.http.post(f"/api/intents/{verb}", files=files)
    body = response.json()
    if response.status_code == 200:
        return "ok", body
    return "error", body["error"]


def _tool_answer(client: McpClient, tool: str, arguments: dict[str, Any]) -> tuple[str, Any]:
    """The tool's answer in the same shape: its structured content, or its AD-9 error."""
    result = client.call_tool(tool, arguments)
    if result.get("isError") is True:
        return "error", error_of(result)
    structured = result["structuredContent"]
    assert json.loads(text_of(result)) == structured, (text_of(result)[:300], structured)
    return "ok", structured


# --- AC-1: the input schemas and the tool list --------------------------------


def test_the_ten_write_tools_advertise_their_intent_models_schemas_and_join_the_tool_list(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-1. The list is 12.1's and 12.2's tools, then the ten write tools, in the AC's order.
    from bookvie.agent import input_schema

    tools = mcp_client.list_tools()
    assert [
        tool["name"] for tool in tools
    ] == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES

    listed = {tool["name"]: tool for tool in tools}
    for name, (model, keys, required) in WRITE_TOOLS.items():
        schema = listed[name]["inputSchema"]
        # The intent model's schema by alias, closed, with null only where the parser takes it.
        assert schema == input_schema(model), name
        assert schema["type"] == "object" and schema["additionalProperties"] is False, name
        assert set(schema["properties"]) == keys, name
        assert set(schema.get("required", [])) == required, name
    # The Purpose is nullable ("null clears it"); a bookId never is.
    for name in ("start_reading", "edit_purpose"):
        purpose = listed[name]["inputSchema"]["properties"]["purpose"]
        assert {"type": "null"} in purpose.get("anyOf", []), (name, purpose)
    for name in WRITE_TOOL_NAMES:
        book_id = listed[name]["inputSchema"]["properties"]["bookId"]
        assert book_id.get("type") == "string" and "anyOf" not in book_id, (name, book_id)


# --- AC-2: the same answers as the intent routes --------------------------------


@pytest.mark.parametrize("case", CASES, ids=lambda case: case.id)
def test_each_write_tool_stores_and_answers_exactly_as_its_intent_route(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    same_ids: Callable[[], None],
    case: Case,
) -> None:
    # [P0] AC-2. One input, two identical libraries: through the tool on one, the route on the other.
    tool_side, route_side = _twins(connect_mcp, tmp_path, case)
    before = library_bytes(tool_side.data_dir)

    same_ids()
    route = _route_answer(route_side, case.tool, case.arguments)
    same_ids()
    tool = _tool_answer(tool_side, case.tool, case.arguments)
    assert tool == route, case.id
    assert library_bytes(tool_side.data_dir) == library_bytes(route_side.data_dir), case.id

    # The case reaches the branch it names (on the route, which is the reference).
    kind, answer = route
    if case.expect in ("ok", "noop", "lastPage"):
        assert kind == "ok" and answer["ok"] is True, (case.id, answer)
        assert answer.get("reachedLastPage") is (True if case.expect == "lastPage" else None)
        assert_invariants(tool_side.data_dir)
        changed = library_bytes(tool_side.data_dir) != before
        assert changed is (case.expect != "noop"), case.id
    else:
        assert kind == "error" and answer["code"] == case.expect, (case.id, answer)
        assert [f["field"] for f in answer.get("fields", [])] == list(case.fields), answer
        # A refusal or a fault changes nothing and leaves no temporary file (TR8).
        assert library_bytes(tool_side.data_dir) == before, case.id
        assert temp_files(tool_side.data_dir) == [], case.id
    if case.tool == "add_card_note" and case.expect == "ok":
        assert set(answer["ids"]) == {"cardNoteId"}, answer


# --- AC-3: the descriptions -----------------------------------------------------


def test_each_write_tools_description_is_the_storys_text(mcp_client: McpClient) -> None:
    # [P1] AC-3. Character for character: the descriptions are the interface (D13).
    described = {
        tool["name"]: tool.get("description")
        for tool in mcp_client.list_tools()
        if tool["name"] in DESCRIPTIONS
    }
    assert described == DESCRIPTIONS


# --- AC-4: no destructive tools -----------------------------------------------------


def test_the_destructive_intents_stay_unlisted_and_calling_one_changes_nothing(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-4. Next to the ten write tools, none of their destructive siblings is listed.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2, cover=True)
    client = connect_mcp(data_dir=folder)
    names = {tool["name"] for tool in client.list_tools()}
    assert sorted(names & {*WRITE_TOOL_NAMES, *DESTRUCTIVE_TOOL_NAMES}) == sorted(WRITE_TOOL_NAMES)
    # An export writes local-state.json, so the folder holds all three kinds of file.
    exported = client.http.get("/api/export", headers={"X-Bookvie-Export": "1"})
    assert exported.status_code == 200, exported.text[:300]

    before = library_bytes(folder)
    files = sorted(path.name for path in folder.iterdir())
    # Every file under the folder, local-state.json and covers/ included.
    tree = {
        str(path.relative_to(folder)): path.read_bytes()
        for path in folder.rglob("*")
        if path.is_file()
    }
    # Arguments each route would act on: a Book to delete, the Main book's note, a color.
    for name, arguments in (
        ("delete_book", {"bookId": UNREAD}),
        ("delete_card_note", {"bookId": MAIN, "cardNoteId": NOTE}),
        ("restore", {}),
        ("set_spine_color", {"bookId": MAIN, "spineColor": "#749076"}),
    ):
        body = client.rpc("tools/call", {"name": name, "arguments": arguments})
        assert "result" not in body, (name, body)
        assert body["error"]["code"] == -32602, (name, body)
        assert name in body["error"]["message"], (name, body)
    assert library_bytes(folder) == before
    assert sorted(path.name for path in folder.iterdir()) == files
    after = {
        str(path.relative_to(folder)): path.read_bytes()
        for path in folder.rglob("*")
        if path.is_file()
    }
    assert after == tree
    assert {"local-state.json", UNREAD_COVER} <= set(tree), sorted(tree)


# --- Green-phase follow-ups (Story 12.3 automation) -----------------------------

# The Books each tool's success input names, by title, so a leaf can find them.
TITLES = {
    MAIN: "Designing Data-Intensive Applications",
    UPNEXT: "Designing Interfaces",
    PAUSED: "Refactoring",
    UNREAD: "Neuromancer",
    SIDE1: "The Pragmatic Programmer",
}


def test_resuming_the_paused_book_at_another_page_closes_a_segment_through_the_tool(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-2. The case table proves tool and route store the same bytes; this pins what.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    answer = client.call_tool(
        "start_reading", {"bookId": PAUSED, "purpose": None, "page": RESUME_PAGE}
    )
    assert answer.get("isError") is not True, answer
    stored = json.loads((folder / "library.json").read_text(encoding="utf-8"))
    (book,) = [book for book in stored["books"] if book["id"] == PAUSED]
    (reading,) = book["readings"]
    assert reading["currentPage"] == RESUME_PAGE, reading
    assert [segment["endPage"] for segment in reading["earlierSegments"]] == [200], reading
    assert stored["mainBookId"] == PAUSED


@pytest.mark.parametrize("tool", WRITE_TOOL_NAMES)
def test_a_write_tool_called_without_arguments_is_refused_like_a_route_without_its_intent_part(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, tool: str
) -> None:
    # [P2] AC-2. MCP lets a client leave `arguments` out; the tool gets `{}`, which is malformed.
    tool_side, route_side = _twins(
        connect_mcp, tmp_path, Case(tool, "no-arguments", {}, "invalid_fields")
    )
    before = library_bytes(tool_side.data_dir)

    response = route_side.http.post(f"/api/intents/{tool.replace('_', '-')}", files={})
    assert response.status_code == 422, response.text
    tool_side.ensure_initialized()
    body = tool_side.rpc("tools/call", {"name": tool})
    assert "error" not in body, body
    assert error_of(body["result"]) == response.json()["error"]
    assert error_of(body["result"])["code"] == "invalid_fields"
    assert library_bytes(tool_side.data_dir) == before


@pytest.mark.parametrize("tool", WRITE_TOOL_NAMES)
def test_an_unexpected_failure_in_a_write_tools_handler_is_couldnt_save_as_the_routes_500(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    tool: str,
) -> None:
    # [P2] AC-2. The tool and the route call the same handler; one that breaks breaks both alike.
    _assert_a_broken_handler_breaks_tool_and_route_alike(
        connect_mcp, tmp_path, monkeypatch, caplog, tool, SUCCESSES[tool]
    )


def _assert_a_broken_handler_breaks_tool_and_route_alike(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    tool: str,
    arguments: dict[str, Any],
) -> None:
    """The route's 500 body and the tool's ``couldnt_save``, logged with the tool's name."""
    from fastapi.testclient import TestClient

    tool_side, route_side = _twins(
        connect_mcp, tmp_path, Case(tool, "handler-breaks", {}, "couldnt_save")
    )
    before = library_bytes(tool_side.data_dir)

    def broken(*_: Any) -> None:
        raise RuntimeError(f"{tool} broke")

    # The handler is named after its tool in both modules that call it.
    monkeypatch.setattr(f"bookvie.agent.tools.{tool}", broken)
    monkeypatch.setattr(f"bookvie.http.api.{tool}", broken)

    route_client = TestClient(
        route_side.http.app, base_url=str(route_side.http.base_url), raise_server_exceptions=False
    )
    response = route_client.post(
        f"/api/intents/{tool.replace('_', '-')}",
        files={"intent": (None, json.dumps(arguments), "application/json")},
    )
    assert response.status_code == 500, response.text
    with caplog.at_level("ERROR", logger="bookvie.agent.server"):
        answer = tool_side.call_tool(tool, arguments)
    assert error_of(answer) == response.json()["error"]
    assert error_of(answer)["code"] == "couldnt_save"
    (record,) = [r for r in caplog.records if r.name == "bookvie.agent.server"]
    assert record.getMessage() == f"agent tool {tool} failed"
    assert library_bytes(tool_side.data_dir) == before


@pytest.mark.parametrize("tool", WRITE_TOOL_NAMES)
def test_a_book_found_and_then_deleted_in_the_app_is_book_not_found_for_each_write_tool(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, tool: str
) -> None:
    # [P1] AC-2. The agent takes the id from find_book; the user deletes the Book in the app.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    title = TITLES[SUCCESSES[tool]["bookId"]]
    found = client.call_tool("find_book", {"query": title})["structuredContent"]["books"]
    (book_id,) = [book["id"] for book in found if book["title"] == title]
    assert book_id == SUCCESSES[tool]["bookId"]

    deleted = client.http.post(
        "/api/intents/delete-book",
        files={"intent": (None, json.dumps({"bookId": book_id}), "application/json")},
    )
    assert deleted.status_code == 200, deleted.text
    before = library_bytes(folder)

    answer = client.call_tool(tool, {**SUCCESSES[tool], "bookId": book_id})
    assert error_of(answer)["code"] == "book_not_found", answer
    assert library_bytes(folder) == before


def test_a_real_bookvie_process_advertises_and_commits_a_write_tool(tmp_path: Path) -> None:
    # [P1] AC-1, AC-2. The leaves above use TestClient; this one is the process Claude Code reaches.
    from bookvie.agent import input_schema

    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    with running_bookvie(folder) as client:
        listed = {tool["name"]: tool for tool in client.list_tools()}
        assert list(listed) == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES
        for name, (model, _, _) in WRITE_TOOLS.items():
            assert listed[name]["inputSchema"] == input_schema(model), name
        answer = client.call_tool("update_page", UPDATE)
        assert answer["structuredContent"] == {"ok": True}, answer
    stored = json.loads((folder / "library.json").read_text(encoding="utf-8"))
    (book,) = [book for book in stored["books"] if book["id"] == MAIN]
    assert book["readings"][-1]["currentPage"] == UPDATE["page"]


@contextmanager
def running_bookvie(folder: Path) -> Iterator[McpClient]:
    """A ``bookvie`` process on ``folder`` and a free port, and an MCP client to it; stopped after."""
    import subprocess
    import sys

    import httpx

    from bookvie import instance
    from tests.servers import wait_for_health

    sock = instance.bind_socket(0)
    port = sock.getsockname()[1]
    sock.close()
    cmd = [
        sys.executable,
        "-m",
        "bookvie.cli",
        "--no-browser",
        "--port",
        str(port),
        "--data-dir",
        str(folder),
    ]
    server = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        wait_for_health(server, port, folder)
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as http:
            yield McpClient(http, data_dir=folder)
    finally:
        server.terminate()
        server.wait(timeout=20)
