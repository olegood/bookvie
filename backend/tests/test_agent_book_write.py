"""Story 12.4: an agent adds and edits a Book through ``add_book`` and ``edit_book`` (AD-21).

Both take their intent's JSON body as arguments (plus Story 12.5's optional
``coverUrl``, tested in ``test_agent_cover_url.py``), and answer
exactly as ``POST /api/intents/add-book`` and ``/edit-book`` answer: the same
stored ``library.json`` and the same result or AD-9 error. ``edit_book`` is a
whole edit: its schema requires every form key, and a call that leaves one out
is refused naming the missing keys, where the route would clear those fields.
Each description is the text Story 12.4 quotes, character for character.

The seed, the twin apps and the case shape are Story 12.3's, in
``test_agent_write.py``. Every test runs with ``HOME`` set to a temporary
folder (``conftest.py``).
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from bookvie.intents import AddBookIntent, EditBookIntent
from tests import test_agent_write
from tests.agent_client import McpClient, error_of, text_of
from tests.helpers import (
    DUNE_ISBN13,
    assert_invariants,
    library_bytes,
    stored_book,
    temp_files,
)
from tests.test_agent_write import (
    BOOK_TOOL_NAMES,
    DUNE_SPINE_COLOR,
    DUNE_SUBTITLE,
    EARLIER_TOOL_NAMES,
    FINISHED,
    GONE,
    MAIN,
    MAIN_PAGES,
    PAUSED,
    PAUSED_PAGES,
    SIDE1,
    SIDE2,
    UNREAD,
    WRITE_TOOL_NAMES,
    Case,
    _assert_a_broken_handler_breaks_tool_and_route_alike,
    _route_answer,
    _seed,
    _tool_answer,
    _twins,
    running_bookvie,
)

# Story 12.3's fixture: intents mint ids from a counter, so the twins mint the same ones.
same_ids = test_agent_write.same_ids

# The book form's keys, in form order: every one optional on add_book, required on edit_book.
FORM_KEYS = [
    "title",
    "subtitle",
    "pages",
    "authors",
    "edition",
    "language",
    "publisher",
    "type",
    "isbn",
    "year",
    "finishedOn",
    "tags",
    "spineColor",
]

BOOK_DESCRIPTIONS = {
    "add_book": (
        "Add a Book to the catalog. Every field is a string. Required: title, pages, authors "
        "(separated by semicolons), language, publisher, type (paperback, hardcover or ebook); "
        "edition defaults to 1. Optional: subtitle, isbn, year, tags (separated by commas), and "
        "finishedOn (YYYY-MM-DD) for a Book the user has already read. A likely duplicate is "
        "refused with duplicate_book and the matching Books: show them to the user, and send "
        "confirmDuplicate true only if the user says to add it anyway. Returns the new Book's "
        "id. coverUrl is the https address of the front cover image; bookvie downloads it. If "
        "the download fails, nothing is saved: tell the user why."
    ),
    "edit_book": (
        "Replace a Book's fields. This is a whole edit: a field you leave empty is cleared. Call "
        "get_book first and send its editForm with bookId, changing only what the user asked "
        "for. A finished Book's finishedOn can be changed but not emptied. removeCover true "
        "deletes the Book's cover: send it only when the user asks. A changed title, author or "
        "ISBN that makes it a likely duplicate is refused like add_book. coverUrl is the https "
        "address of the front cover image; bookvie downloads it. If the download fails, nothing "
        "is saved: tell the user why."
    ),
}

# A new Book, as an agent sends it: the required fields, Tags and an ISBN.
ADD = {
    "title": "The Dispossessed",
    "pages": "387",
    "authors": "Ursula K. Le Guin",
    "language": "English",
    "publisher": "Harper",
    "type": "paperback",
    "isbn": "9780061054884",
    "tags": "sci-fi, anarchism",
}
# Every form field that can fail, failing (add-book and edit-book refuse each one).
BAD_FIELDS = {
    "title": "  ",
    "pages": "0",
    "authors": " ; ",
    "edition": "0",
    "language": "",
    "publisher": "",
    "type": "kindle",
    "isbn": "123",
    "year": "20",
    "finishedOn": "2099-01-01",
    "spineColor": "red",
}
BAD_FIELD_ORDER = tuple(key for key in FORM_KEYS if key in BAD_FIELDS)
# Dune as a duplicate: its ISBN, title and author.
DUNE_AGAIN = {"title": "Dune", "authors": "Frank Herbert", "isbn": DUNE_ISBN13}

# The seeded Books' Edit book forms, every key prefilled as the panel and get_book give them.
FINISHED_FORM = {
    "bookId": FINISHED,
    "title": "Dune",
    "subtitle": DUNE_SUBTITLE,
    "pages": "412",
    "authors": "Frank Herbert",
    "edition": "1",
    "language": "English",
    "publisher": "Publisher",
    "type": "paperback",
    "isbn": DUNE_ISBN13,
    "year": "1965",
    "finishedOn": "2026-04-10",
    "tags": "sci-fi, classic",
    "spineColor": DUNE_SPINE_COLOR,
}
PAUSED_FORM = {
    "bookId": PAUSED,
    "title": "Refactoring",
    "subtitle": "",
    "pages": str(PAUSED_PAGES),
    "authors": "Author 3",
    "edition": "1",
    "language": "English",
    "publisher": "Publisher",
    "type": "paperback",
    "isbn": "",
    "year": "",
    "finishedOn": "",
    "tags": "",
    "spineColor": "",
}
UNREAD_FORM = {
    **PAUSED_FORM,
    "bookId": UNREAD,
    "title": "Neuromancer",
    "pages": "271",
    "authors": "Author 5",
}
# The Main book (at page 120, a Card note at 162) and a Side read with no Readings.
MAIN_FORM = {
    **PAUSED_FORM,
    "bookId": MAIN,
    "title": "Designing Data-Intensive Applications",
    "pages": str(MAIN_PAGES),
    "authors": "Author 1",
}
SIDE1_FORM = {
    **PAUSED_FORM,
    "bookId": SIDE1,
    "title": "The Pragmatic Programmer",
    "pages": "352",
    "authors": "Author 6",
}
EDIT = {**PAUSED_FORM, "publisher": "Addison-Wesley", "tags": "craft"}
# A success input for each tool (the unexpected-failure leaf breaks its handler).
BOOK_SUCCESSES = {"add_book": ADD, "edit_book": EDIT}
SIDE1_FINISHED_ON = "2026-02-14"
COVER_URL = "https://covers.example/dispossessed.jpg"

BOOK_CASES: list[Case] = [
    # add_book
    Case("add_book", "success", ADD, "ok"),
    Case("add_book", "success-back-filled", {**ADD, "finishedOn": "2026-10-01"}, "ok"),
    Case("add_book", "every-field-invalid", BAD_FIELDS, "invalid_fields", BAD_FIELD_ORDER),
    Case("add_book", "duplicate-book", {**ADD, **DUNE_AGAIN}, "duplicate_book"),
    Case("add_book", "success-confirm-duplicate", {**ADD, **DUNE_AGAIN, "confirmDuplicate": True}, "ok"),
    Case("add_book", "wrong-type", {**ADD, "pages": 387}, "invalid_fields", ("intent",)),
    Case("add_book", "fault-at-write", ADD, "couldnt_save", fault="write"),
    # edit_book: every key sent, as the tool requires.
    Case("edit_book", "success", EDIT, "ok"),
    Case("edit_book", "success-back-filled", {**UNREAD_FORM, "finishedOn": "2026-01-15"}, "ok"),
    Case("edit_book", "unchanged-still-commits", FINISHED_FORM, "unchanged"),
    # The same unchanged edit reaches the commit: a fault at write refuses it.
    Case("edit_book", "unchanged-fault-at-write", FINISHED_FORM, "couldnt_save", fault="write"),
    Case("edit_book", "every-field-invalid", {**PAUSED_FORM, **BAD_FIELDS}, "invalid_fields", BAD_FIELD_ORDER),
    Case("edit_book", "pages-below-current-page", {**PAUSED_FORM, "pages": "150"}, "pages_below_current_page", ("pages",)),
    Case("edit_book", "duplicate-book", {**PAUSED_FORM, "title": "Dune", "authors": "Frank Herbert"}, "duplicate_book"),
    Case("edit_book", "success-confirm-duplicate", {**PAUSED_FORM, "title": "Dune", "authors": "Frank Herbert", "confirmDuplicate": True}, "ok"),
    Case("edit_book", "book-not-found", {**FINISHED_FORM, "bookId": GONE}, "book_not_found"),
    Case("edit_book", "wrong-type", {**PAUSED_FORM, "pages": PAUSED_PAGES}, "invalid_fields", ("intent",)),
    Case("edit_book", "fault-at-write", EDIT, "couldnt_save", fault="write"),
    # A whole edit without removeCover keeps the cover; removeCover clears it, file and all.
    Case("edit_book", "keeps-cover", UNREAD_FORM, "unchanged", cover=True),
    Case("edit_book", "remove-cover", {**UNREAD_FORM, "removeCover": True}, "ok", cover=True),
    # Green-phase follow-ups (Story 12.4 automation).
    # Pages above the Main book's current page (120) but below its Card note (162).
    Case("edit_book", "pages-below-card-note", {**MAIN_FORM, "pages": "150"}, "pages_below_card_note", ("pages",)),
    # A null for a form key: refused on intent by tool and route alike (the form sends strings).
    Case("add_book", "null-title", {**ADD, "title": None}, "invalid_fields", ("intent",)),
    Case("edit_book", "null-title", {**EDIT, "title": None}, "invalid_fields", ("intent",)),
    # A finish date on a Side read with no Readings back-fills it and takes it off the Side reads.
    Case("edit_book", "success-back-fills-a-side-read", {**SIDE1_FORM, "finishedOn": SIDE1_FINISHED_ON}, "ok"),
    # TR8's other commit steps: the temp file's fsync and the rename.
    *(Case(tool, f"fault-at-{fault}", arguments, "couldnt_save", fault=fault) for fault in ("fsync", "replace") for tool, arguments in BOOK_SUCCESSES.items()),
]  # fmt: skip


def _without_cover_url(schema: dict[str, Any]) -> dict[str, Any]:
    """``schema`` without Story 12.5's tool-only ``coverUrl`` property."""
    properties = {key: value for key, value in schema["properties"].items() if key != "coverUrl"}
    return {**schema, "properties": properties}


def test_add_book_advertises_the_add_book_intent_models_schema_and_the_storys_description(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-1. The add-book intent model's schema by alias, every key optional, plus Story
    # 12.5's optional coverUrl (tool-only, so not the model's).
    from bookvie.agent import input_schema

    tools = mcp_client.list_tools()
    listed = {tool["name"]: tool for tool in tools}
    schema = listed.get("add_book", {}).get("inputSchema", {})
    assert _without_cover_url(schema) == input_schema(AddBookIntent)

    assert schema["type"] == "object" and schema["additionalProperties"] is False, schema
    assert list(schema["properties"]) == [*FORM_KEYS, "confirmDuplicate", "coverUrl"], schema
    assert schema["properties"]["coverUrl"]["type"] == "string"
    assert schema.get("required", []) == [], schema
    for key in FORM_KEYS:
        assert schema["properties"][key]["type"] == "string", (key, schema["properties"][key])
    assert schema["properties"]["confirmDuplicate"]["type"] == "boolean"
    assert listed["add_book"]["description"] == BOOK_DESCRIPTIONS["add_book"]
    # The cumulative list: 12.1's to 12.3's tools, add_book and edit_book, then 12.6's export_backup.
    names = [tool["name"] for tool in tools]
    assert names == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES + ["export_backup"]


def test_edit_book_requires_every_form_key_and_advertises_the_storys_description(
    mcp_client: McpClient,
) -> None:
    # [P0] AC-2. A whole edit: every form key and bookId required; removeCover and
    # confirmDuplicate optional.
    from bookvie.agent import input_schema

    listed = {tool["name"]: tool for tool in mcp_client.list_tools()}
    schema = listed.get("edit_book", {}).get("inputSchema", {})
    assert sorted(schema.get("required", [])) == sorted([*FORM_KEYS, "bookId"])

    # Otherwise the edit-book intent model's schema by alias (its name and docstring aside).
    def rest(advertised: dict[str, Any]) -> dict[str, Any]:
        return {
            key: value
            for key, value in advertised.items()
            if key not in ("required", "title", "description")
        }

    assert rest(_without_cover_url(schema)) == rest(input_schema(EditBookIntent))
    assert schema["type"] == "object" and schema["additionalProperties"] is False, schema
    assert set(schema["properties"]) == {
        *FORM_KEYS,
        "bookId",
        "removeCover",
        "confirmDuplicate",
        "coverUrl",
    }
    assert schema["properties"]["coverUrl"]["type"] == "string"
    for key in [*FORM_KEYS, "bookId"]:
        assert schema["properties"][key]["type"] == "string", (key, schema["properties"][key])
    assert listed["edit_book"]["description"] == BOOK_DESCRIPTIONS["edit_book"]


@pytest.mark.parametrize("case", BOOK_CASES, ids=lambda case: case.id)
def test_add_book_and_edit_book_store_and_answer_exactly_as_their_intent_routes(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    same_ids: Callable[[], None],
    case: Case,
) -> None:
    # [P0] AC-3. One input, two identical libraries: through the tool on one, the route on the other.
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
    if case.expect in ("ok", "unchanged"):
        assert kind == "ok" and answer["ok"] is True, (case.id, answer)
        assert_invariants(tool_side.data_dir)
        changed = library_bytes(tool_side.data_dir) != before
        assert changed is (case.expect == "ok"), case.id
    else:
        assert kind == "error" and answer["code"] == case.expect, (case.id, answer)
        assert [f["field"] for f in answer.get("fields", [])] == list(case.fields), answer
        if case.expect == "duplicate_book":
            assert [match["title"] for match in answer["duplicates"]] == ["Dune"], answer
        # A refusal or a fault changes nothing and leaves no temporary file (TR8).
        assert library_bytes(tool_side.data_dir) == before, case.id
        assert temp_files(tool_side.data_dir) == [], case.id
    if case.tool == "add_book" and kind == "ok":
        # The new Book's id, which get_book and every other tool take next.
        assert set(answer["ids"]) == {"bookId"}, answer
        assert (
            stored_book(tool_side.data_dir, answer["ids"]["bookId"])["title"]
            == case.arguments["title"]
        )
    elif kind == "ok":
        assert "ids" not in answer, answer


def test_a_partial_edit_book_is_refused_naming_the_missing_keys_and_changes_nothing(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-4. The route would clear every field left out; the tool refuses the call.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)

    answer = client.call_tool("edit_book", {"bookId": FINISHED, "title": "Dune Messiah"})
    refused = json.loads(text_of(answer))
    missing = sorted(key for key in FORM_KEYS if key != "title")
    named = sorted(field["field"] for field in refused.get("fields", []))
    assert (answer.get("isError"), named) == (True, missing), refused

    assert refused["code"] == "invalid_fields" and refused["kind"] == "refusal", refused
    assert library_bytes(folder) == before
    book = stored_book(folder, FINISHED)
    assert book["title"] == "Dune"
    assert book["subtitle"] == DUNE_SUBTITLE
    assert book["isbn"] == DUNE_ISBN13
    assert book["tags"] == ["sci-fi", "classic"]
    assert book["spineColorUser"] == DUNE_SPINE_COLOR


def test_a_partial_edit_book_names_each_missing_key_in_schema_order_with_pydantics_message(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-4. The refusal's fields, in the advertised schema's order: bookId too when it's missing.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)

    refused = error_of(client.call_tool("edit_book", {"title": "Dune Messiah"}))
    assert refused["code"] == "invalid_fields", refused
    assert refused["fields"] == [
        {"field": key, "message": "Field required"} for key in FORM_KEYS if key != "title"
    ] + [{"field": "bookId", "message": "Field required"}]
    assert library_bytes(folder) == before


# --- Green-phase follow-ups (Story 12.4 automation) -----------------------------

# The keys edit_book requires, in the advertised schema's order (the form, then bookId).
EDIT_REQUIRED = [*FORM_KEYS, "bookId"]
ALL_BUT_SPINE_COLOR = {key: value for key, value in FINISHED_FORM.items() if key != "spineColor"}


@pytest.mark.parametrize(
    ("arguments", "missing"),
    [
        pytest.param({"bookId": FINISHED}, FORM_KEYS, id="book-id-alone"),
        pytest.param({}, EDIT_REQUIRED, id="empty"),
        pytest.param(ALL_BUT_SPINE_COLOR, ["spineColor"], id="all-but-spine-color"),
        # A coverUrl next to the missing keys: the missing-key refusal comes first, so nothing
        # is downloaded.
        pytest.param(
            {"bookId": FINISHED, "title": "Dune", "coverUrl": COVER_URL},
            [key for key in FORM_KEYS if key != "title"],
            id="missing-keys-and-cover-url",
        ),
    ],
)
def test_each_partial_edit_book_is_refused_naming_exactly_its_missing_keys(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    arguments: dict[str, Any],
    missing: list[str],
) -> None:
    # [P1] AC-4. One key short of a whole edit is as refused as one key sent.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)

    refused = error_of(client.call_tool("edit_book", arguments))
    assert refused["code"] == "invalid_fields", refused
    assert refused["fields"] == [{"field": key, "message": "Field required"} for key in missing]
    assert library_bytes(folder) == before
    assert temp_files(folder) == []
    assert stored_book(folder, FINISHED)["spineColorUser"] == DUNE_SPINE_COLOR


def test_book_tools_called_without_arguments_are_refused_as_an_empty_intent(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-3, AC-4. MCP lets a client leave `arguments` out; the tool gets `{}`.
    tool_side, route_side = _twins(
        connect_mcp, tmp_path, Case("add_book", "no-arguments", {}, "invalid_fields")
    )
    before = library_bytes(tool_side.data_dir)
    tool_side.ensure_initialized()

    # add_book: every form key is optional, so `{}` reaches the handler, as an empty form does.
    body = tool_side.rpc("tools/call", {"name": "add_book"})
    assert "error" not in body, body
    assert ("error", error_of(body["result"])) == _route_answer(route_side, "add_book", {})
    named = [field["field"] for field in error_of(body["result"])["fields"]]
    assert {"title", "pages", "authors", "language", "publisher", "type"} <= set(named), named

    # edit_book: every required key is missing, bookId too.
    body = tool_side.rpc("tools/call", {"name": "edit_book"})
    assert "error" not in body, body
    assert [field["field"] for field in error_of(body["result"])["fields"]] == EDIT_REQUIRED
    assert library_bytes(tool_side.data_dir) == before


@pytest.mark.parametrize("tool", BOOK_TOOL_NAMES)
def test_an_unexpected_failure_in_a_book_tools_handler_is_couldnt_save_as_the_routes_500(
    connect_mcp: Callable[..., McpClient],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
    tool: str,
) -> None:
    # [P2] AC-3. add_book and edit_book call the routes' handlers; one that breaks breaks both alike.
    _assert_a_broken_handler_breaks_tool_and_route_alike(
        connect_mcp, tmp_path, monkeypatch, caplog, tool, BOOK_SUCCESSES[tool]
    )


def test_a_finish_date_on_a_side_read_with_no_readings_takes_it_off_the_side_reads(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-3. The case table proves tool and route store the same bytes; this pins what.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)

    answer = client.call_tool("edit_book", {**SIDE1_FORM, "finishedOn": SIDE1_FINISHED_ON})
    assert answer["structuredContent"] == {"ok": True}, text_of(answer)
    stored = json.loads(library_bytes(folder))
    assert stored["sideReadBookIds"] == [SIDE2]
    (reading,) = stored_book(folder, SIDE1)["readings"]
    assert reading["finishDate"] == SIDE1_FINISHED_ON, reading


def test_find_book_then_get_book_then_edit_book_changes_only_what_was_asked(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-2, AC-3. The description's flow, from a title: find_book, get_book, edit_book.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)
    before = stored_book(folder, FINISHED)

    found = client.call_tool("find_book", {"query": "Dune"})["structuredContent"]["books"]
    (book_id,) = [book["id"] for book in found if book["title"] == "Dune"]
    form = client.call_tool("get_book", {"bookId": book_id})["structuredContent"]["editForm"]
    answer = client.call_tool("edit_book", {**form, "bookId": book_id, "publisher": "Ace"})
    assert answer["structuredContent"] == {"ok": True}, text_of(answer)

    after = stored_book(folder, FINISHED)
    changed = sorted(
        key for key in before.keys() | after.keys() if before.get(key) != after.get(key)
    )
    assert changed == ["publisher"], (before, after)
    assert after["publisher"] == "Ace"
    assert_invariants(folder)


def test_a_real_bookvie_process_advertises_both_book_tools_and_commits_an_add(
    tmp_path: Path,
) -> None:
    # [P1] AC-1, AC-2. The leaves above use TestClient; this one is the process Claude Code reaches.
    from bookvie.agent import TOOLS, advertised_schema

    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    with running_bookvie(folder) as client:
        listed = {tool["name"]: tool for tool in client.list_tools()}
        assert list(listed) == EARLIER_TOOL_NAMES + WRITE_TOOL_NAMES + BOOK_TOOL_NAMES + [
            "export_backup"
        ]
        for tool in TOOLS:
            if tool.name in BOOK_TOOL_NAMES:
                assert listed[tool.name]["inputSchema"] == advertised_schema(tool), tool.name
        assert listed["add_book"]["inputSchema"].get("required", []) == []
        assert listed["edit_book"]["inputSchema"]["required"] == EDIT_REQUIRED
        answer = client.call_tool("add_book", ADD)
    book_id = answer["structuredContent"]["ids"]["bookId"]
    book = stored_book(folder, book_id)
    assert (book["title"], book["isbn"], book["tags"]) == (
        ADD["title"],
        ADD["isbn"],
        ["sci-fi", "anarchism"],
    )
