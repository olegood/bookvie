"""The agent tools advertise the type of every value they take.

Spec: ``_bmad-output/implementation-artifacts/spec-agent-tools-advertise-value-types.md``.
Epic 12 retro item 83's real session found ``update_page`` unusable from Claude
Code: ``page`` was listed as a bare ``JsonValue`` with no ``type``, so the
client sent ``"120"`` and the server refused it. The fix types the listed
schema only; the intents' wrong-type refusals stay (``test_agent_write.py``'s
``page-as-a-string`` and ``every-field-wrong`` cases pin them).

AC-2 (a real Claude Code session saves a page on the first call) is manual and
has no leaf.
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from bookvie.domain.finished_on import FINISHED_ON_FORMAT_MESSAGE
from bookvie.intents.update_page import page_message
from tests.agent_client import McpClient, error_of, structured_of
from tests.builder import LibraryBuilder

# The Main book of the item 83 session: 670 pages, at page 100, with a Purpose.
MAIN_PAGES = 670

# The JSON type of an enum or const value, as JSON Schema names it.
_TYPE_OF_VALUE = (
    (bool, "boolean"),
    (int, "integer"),
    (float, "number"),
    (str, "string"),
    (type(None), "null"),
)


def _value_type(value: Any) -> str:
    for kind, name in _TYPE_OF_VALUE:
        if isinstance(value, kind):
            return name
    raise AssertionError(f"not a JSON scalar: {value!r}")


def _resolve(schema: dict[str, Any], prop: dict[str, Any]) -> dict[str, Any]:
    """``prop`` with a local ``$ref`` replaced by its definition, merged under ``prop``'s own keys."""
    ref = prop.get("$ref")
    if not isinstance(ref, str) or not ref.startswith("#/$defs/"):
        return prop
    target = schema.get("$defs", {}).get(ref.removeprefix("#/$defs/"), {})
    return {**_resolve(schema, target), **{k: v for k, v in prop.items() if k != "$ref"}}


def json_types(schema: dict[str, Any], prop: dict[str, Any]) -> set[str]:
    """The JSON types ``prop`` admits, or the empty set when any part of it names none.

    Reads ``type`` (a name or a list), ``enum`` and ``const`` (by their values'
    types), and ``anyOf``/``oneOf`` (the union, empty if any member is untyped),
    after resolving a local ``$ref`` against ``schema``'s ``$defs``.
    """
    prop = _resolve(schema, prop)
    if "type" in prop:
        kind = prop["type"]
        return set(kind) if isinstance(kind, list) else {kind}
    if "enum" in prop:
        return {_value_type(value) for value in prop["enum"]}
    if "const" in prop:
        return {_value_type(prop["const"])}
    members = prop.get("anyOf") or prop.get("oneOf")
    if members:
        found = [json_types(schema, member) for member in members]
        return set().union(*found) if all(found) else set()
    return set()


def enum_values(schema: dict[str, Any], prop: dict[str, Any]) -> set[Any] | None:
    """The non-null values ``prop`` is limited to, or ``None`` when it isn't an enum."""
    prop = _resolve(schema, prop)
    if "enum" in prop:
        return {value for value in prop["enum"] if value is not None}
    if "const" in prop:
        return {prop["const"]} - {None}
    members = prop.get("anyOf") or prop.get("oneOf") or []
    found = [enum_values(schema, member) for member in members]
    limited = [values for values in found if values is not None]
    return set().union(*limited) if limited else None


def test_every_tool_property_advertises_its_json_type(mcp_client: McpClient) -> None:
    # [P0] AC-1. The listed schemas Claude Code reads, over /mcp.
    from bookvie.intents.finish_reading import _ANSWERS

    listed = {tool["name"]: tool["inputSchema"] for tool in mcp_client.list_tools()}

    def types(tool: str, key: str) -> set[str]:
        return json_types(listed[tool], listed[tool]["properties"][key])

    # The criterion: update_page's page is a JSON integer, and never null.
    assert types("update_page", "page") == {"integer"}

    assert types("start_reading", "page") == {"integer", "null"}
    # The declared type replaces only the JsonValue reference: the property's other keys stay.
    assert listed["start_reading"]["properties"]["page"].get("default", "missing") is None
    assert types("finish_reading", "rating") == {"integer", "null"}
    # A finish always needs a date: _finished_on refuses null, so it isn't listed.
    assert types("finish_reading", "finishedOn") == {"string"}
    assert types("finish_reading", "purposeFulfilled") == {"string", "null"}
    fulfilled = listed["finish_reading"]["properties"]["purposeFulfilled"]
    assert enum_values(listed["finish_reading"], fulfilled) == set(_ANSWERS)

    # No tool lists a property without a type, so a future JsonValue field can't ship untyped.
    untyped = [
        (tool, key)
        for tool, schema in listed.items()
        for key, prop in schema.get("properties", {}).items()
        if not json_types(schema, prop)
    ]
    assert untyped == []


def _seed_main(connect_mcp: Callable[..., McpClient], tmp_path: Path) -> tuple[McpClient, str, str]:
    """A client on a library whose Main book has 670 pages, and that Book's id and an unread one's."""
    folder = tmp_path / "library"
    builder = LibraryBuilder()
    main = builder.book(title="Designing Data-Intensive Applications", pages=MAIN_PAGES)
    unread = builder.book(title="Neuromancer", pages=271)
    builder.reading(main, start_date="2026-10-01", current_page=100, purpose="Learn replication")
    builder.main(main)
    builder.write(folder)
    return connect_mcp(data_dir=folder), main, unread


def _current_page(client: McpClient, book_id: str) -> int:
    assert client.data_dir is not None
    stored = json.loads((Path(client.data_dir) / "library.json").read_text(encoding="utf-8"))
    (book,) = [book for book in stored["books"] if book["id"] == book_id]
    return book["readings"][-1]["currentPage"]


def test_update_page_refuses_a_string_page_unchanged_and_saves_an_integer_one(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] I/O matrix "String page", then "Integer page": the item 83 call, both ways.
    client, main, _ = _seed_main(connect_mcp, tmp_path)

    refused = error_of(client.call_tool("update_page", {"bookId": main, "page": "120"}))
    assert refused["code"] == "invalid_fields", refused
    assert refused["fields"] == [
        {"field": "page", "message": f"Page must be between 0 and {MAIN_PAGES}."}
    ]
    assert _current_page(client, main) == 100

    saved = client.call_tool("update_page", {"bookId": main, "page": 120})
    assert structured_of(saved) == {"ok": True}
    assert _current_page(client, main) == 120


def test_finish_reading_refuses_a_rating_sent_as_a_string(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] I/O matrix "Rating as string": refused on rating as today, never coerced.
    client, main, _ = _seed_main(connect_mcp, tmp_path)

    answer = client.call_tool(
        "finish_reading",
        {"bookId": main, "finishedOn": "2026-10-29", "purposeFulfilled": "yes", "rating": "4"},
    )
    refused = error_of(answer)
    assert refused["code"] == "invalid_fields", refused
    assert [field["field"] for field in refused["fields"]] == ["rating"]
    assert refused["fields"][0]["message"] == "Rating must be 1 to 5 stars, or no rating."


def test_value_typed_properties_list_null_only_where_it_is_taken(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] No listed schema invites a null the server refuses (the attempt-1 finishedOn gap).
    client, main, unread = _seed_main(connect_mcp, tmp_path)
    listed = {tool["name"]: tool["inputSchema"] for tool in client.list_tools()}
    nullable = {
        (tool, key)
        for tool, schema in listed.items()
        for key, prop in schema.get("properties", {}).items()
        if "null" in json_types(schema, prop)
    }
    # Of the five value-typed properties, the three that take null are listed nullable;
    # the other two (update_page's page and finishedOn) are not.
    assert {
        ("start_reading", "page"),
        ("finish_reading", "rating"),
        ("finish_reading", "purposeFulfilled"),
    } <= nullable
    assert ("update_page", "page") not in nullable
    assert ("finish_reading", "finishedOn") not in nullable

    # The two listed without null still refuse it, on that field, with the existing message.
    page_null = error_of(client.call_tool("update_page", {"bookId": main, "page": None}))
    assert page_null["code"] == "invalid_fields", page_null
    assert page_null["fields"] == [{"field": "page", "message": page_message(MAIN_PAGES)}]
    finished_on_null = error_of(
        client.call_tool(
            "finish_reading",
            {"bookId": main, "finishedOn": None, "purposeFulfilled": "yes", "rating": 4},
        )
    )
    assert finished_on_null["code"] == "invalid_fields", finished_on_null
    assert finished_on_null["fields"] == [
        {"field": "finishedOn", "message": FINISHED_ON_FORMAT_MESSAGE}
    ]

    # Each of the three listed nullable, sent as null, isn't refused on its field.
    finished = client.call_tool(
        "finish_reading",
        {"bookId": main, "finishedOn": "2026-10-29", "purposeFulfilled": None, "rating": None},
    )
    assert structured_of(finished) == {"ok": True}
    started = client.call_tool("start_reading", {"bookId": unread, "purpose": None, "page": None})
    assert structured_of(started) == {"ok": True}


# A Book id the listed schemas take (they check the type, not that the Book exists).
_BOOK = "a0000000-0000-4000-8000-000000000001"
_FINISH = {"bookId": _BOOK, "finishedOn": "2026-10-29", "purposeFulfilled": "partly", "rating": 4}

# What a client that follows the listed schema may send, per value-typed property.
_FOLLOWS_THE_SCHEMA = [
    ("update_page", {"bookId": _BOOK, "page": 120}),
    ("update_page", {"bookId": _BOOK, "page": 0}),
    ("start_reading", {"bookId": _BOOK, "purpose": None}),
    ("start_reading", {"bookId": _BOOK, "purpose": None, "page": 40}),
    ("start_reading", {"bookId": _BOOK, "purpose": None, "page": None}),
    ("finish_reading", _FINISH),
    ("finish_reading", {**_FINISH, "purposeFulfilled": None, "rating": None}),
    *(
        ("finish_reading", {**_FINISH, "purposeFulfilled": answer})
        for answer in ("yes", "partly", "notYet")
    ),
]

# Each value the listed schema now tells a client not to send, and the property it is on.
_BREAKS_THE_SCHEMA = [
    ("update_page", {"bookId": _BOOK, "page": "120"}, "page"),
    ("update_page", {"bookId": _BOOK, "page": None}, "page"),
    ("start_reading", {"bookId": _BOOK, "purpose": None, "page": "40"}, "page"),
    ("finish_reading", {**_FINISH, "rating": "4"}, "rating"),
    ("finish_reading", {**_FINISH, "finishedOn": None}, "finishedOn"),
    ("finish_reading", {**_FINISH, "purposeFulfilled": "maybe"}, "purposeFulfilled"),
    ("finish_reading", {**_FINISH, "purposeFulfilled": "null"}, "purposeFulfilled"),
]


def _validators(client: McpClient) -> dict[str, Draft202012Validator]:
    """A JSON Schema validator per tool, built from the schema ``tools/list`` gives a client."""
    return {tool["name"]: Draft202012Validator(tool["inputSchema"]) for tool in client.list_tools()}


def test_every_listed_schema_is_valid_json_schema(mcp_client: McpClient) -> None:
    # [P1] A client builds its validator from tools/list; a malformed schema (a broken
    # merge in input_schema, a dangling $ref after the JsonValue def is dropped) fails here.
    for tool in mcp_client.list_tools():
        Draft202012Validator.check_schema(tool["inputSchema"])


def test_the_listed_schema_takes_each_value_the_server_takes(mcp_client: McpClient) -> None:
    # [P1] Validated the way a schema-following client would: what the server saves, the schema allows.
    validators = _validators(mcp_client)
    rejected = {
        (tool, json.dumps(arguments)): [
            error.message for error in validators[tool].iter_errors(arguments)
        ]
        for tool, arguments in _FOLLOWS_THE_SCHEMA
    }
    assert {call: errors for call, errors in rejected.items() if errors} == {}


def test_the_listed_schema_rules_out_each_value_the_server_refuses(mcp_client: McpClient) -> None:
    # [P1] The item 83 call ("120") and its kin fail the listed schema on their own property,
    # so a schema-following client corrects them before it calls.
    validators = _validators(mcp_client)
    for tool, arguments, key in _BREAKS_THE_SCHEMA:
        paths = [list(error.absolute_path) for error in validators[tool].iter_errors(arguments)]
        assert paths and all(path[:1] == [key] for path in paths), (tool, arguments, paths)
