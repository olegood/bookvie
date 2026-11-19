"""Story 12.2: an agent reads the library through the read tools (AD-21).

``find_book`` finds candidates and never guesses; ``get_book``,
``list_catalog``, ``get_card_notes``, ``get_home`` and ``get_stats`` return the
views their routes return, by alias, and refuse the way the routes refuse.
Each tool's description is the text Story 12.2 quotes, character for character.

Every leaf seeds one library, opens it through the ``connect_mcp`` fixture and
compares each tool's answer with the matching ``GET /api/views/...`` on the
same app, so a leaf never restates a view by hand. Every test runs with
``HOME`` set to a temporary folder (``conftest.py``).
"""

import ast
import json
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from tests.agent_client import McpClient, error_of, text_of
from tests.builder import LibraryBuilder

RED = "red phase: Story 12.2's read tools aren't built yet"

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "bookvie"

DDIA = "Designing Data-Intensive Applications"
DDIA_SUBTITLE = "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems"
# Stored as typed: the first edition's ISBN compact, the second's with hyphens.
DDIA_1_ISBN = "9781449373320"
DDIA_2_ISBN = "978-1-098-11906-5"
CANDIDATE_KEYS = {"id", "title", "subtitle", "authors", "edition", "type", "role"}

DESCRIPTIONS = {
    "find_book": (
        "Find Books in the library by a free-text query: part of a title or subtitle, an "
        "author, an ISBN, or a title's initials such as DDIA. Returns every likely match with "
        "its id, edition and type, or an empty list. Never pick a Book for the user: when more "
        "than one matches, ask which one, unless only one of them fits the request (update_page "
        "and pause work only on the Main book, whose role is main). Every other tool takes the "
        "Book's id from here."
    ),
    "get_book": (
        "One Book in full: its fields, tags, its role (main for the Main book, upNext, waiting "
        "for a paused Book, or null), whether it is a Side read, its Readings, pages left, the "
        "user's measured pace, and its Card notes. Takes the Book's id from find_book."
    ),
    "list_catalog": (
        "Every Book in the catalog with its title, authors, type, tags, role, current page and "
        "percent read. Use it to answer questions across the library, such as which unread "
        "Books are about a topic."
    ),
    "get_card_notes": (
        "The user's Card notes (quotes and notes with their pages), for every Book or for one "
        "Book's id."
    ),
    "get_home": (
        "What the user is reading now: the Main book with its page and days left, Up next, the "
        "paused Books waiting, the Side reads, and when the library was last exported."
    ),
    "get_stats": (
        "Books and pages finished, overall or for a period given as from and to dates "
        "(YYYY-MM-DD, both or neither)."
    ),
}

UNKNOWN_ID = "00000000-0000-4000-8000-000000000000"


def _seed(folder: Path) -> dict[str, str]:
    """A library with DDIA in two editions and three other Books; returns their ids.

    - ``ddia1``: 1st edition paperback, the Main book, with two Card notes.
    - ``ddia2``: 2nd edition ebook, no role, no Card notes.
    - ``interfaces``: "Designing Interfaces", Up next (so "Designing" finds three).
    - ``dune``: finished in April 2026 (the stats), with one Card note.
    """
    builder = LibraryBuilder()
    ddia1 = builder.book(
        title=DDIA,
        subtitle=DDIA_SUBTITLE,
        authors=["Martin Kleppmann"],
        pages=616,
        edition=1,
        type="paperback",
        publisher="O'Reilly",
        isbn=DDIA_1_ISBN,
        year=2017,
        tags=["distributed systems"],
    )
    ddia2 = builder.book(
        title=DDIA,
        subtitle=DDIA_SUBTITLE,
        authors=["Martin Kleppmann", "Chris Riccomini"],
        pages=650,
        edition=2,
        type="ebook",
        publisher="O'Reilly",
        isbn=DDIA_2_ISBN,
        year=2026,
    )
    interfaces = builder.book(
        title="Designing Interfaces",
        subtitle="Patterns for Effective Interaction Design",
        authors=["Jenifer Tidwell", "Charles Brewer", "Aynne Valencia"],
        pages=599,
        edition=3,
        type="paperback",
        isbn="9781492051961",
    )
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412, isbn="9780441172719")
    builder.reading(ddia1, start_date="2026-10-01", current_page=120, purpose="Learn replication")
    builder.main(ddia1)
    builder.up_next(interfaces)
    builder.reading(
        dune,
        start_date="2026-03-01",
        finish_date="2026-04-10",
        finished_pages=412,
        current_page=412,
    )
    builder.card_note(ddia1, text="Replication lag is a property of the system.", page_start=162)
    builder.card_note(ddia1, text="Linearizability is a recency guarantee.", page_start=324)
    builder.card_note(dune, text="Fear is the mind-killer.", page_start=8)
    builder.write(folder)
    return {"ddia1": ddia1, "ddia2": ddia2, "interfaces": interfaces, "dune": dune}


def _open(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> tuple[McpClient, dict[str, str]]:
    folder = tmp_path / "library"
    ids = _seed(folder)
    return connect_mcp(data_dir=folder), ids


def _structured(result: dict[str, Any]) -> Any:
    """A successful tool result's structured content, after checking its text is the same JSON."""
    assert result.get("isError") is not True, result
    structured = result["structuredContent"]
    assert json.loads(text_of(result)) == structured, (text_of(result)[:300], structured)
    return structured


def _books(result: dict[str, Any]) -> list[dict[str, Any]]:
    """``find_book``'s candidates: the list under ``books`` in its structured content."""
    structured = _structured(result)
    assert isinstance(structured, dict) and set(structured) == {"books"}, structured
    books = structured["books"]
    assert isinstance(books, list), books
    return books


def _candidate_ids(client: McpClient, query: str) -> set[str]:
    books = _books(client.call_tool("find_book", {"query": query}))
    ids = [book["id"] for book in books]
    assert len(ids) == len(set(ids)), f"{query!r}: a Book listed twice: {ids}"
    return set(ids)


def _view(client: McpClient, path: str, params: dict[str, str] | None = None) -> Any:
    """``GET /api/views/<path>`` on the client's own app, which must answer 200."""
    response = client.http.get(f"/api/views/{path}", params=params)
    assert response.status_code == 200, (path, params, response.status_code, response.text[:300])
    return response.json()


def _view_error(client: McpClient, path: str, params: dict[str, str]) -> dict[str, Any]:
    """The AD-9 ``error`` object the view route refuses ``params`` with."""
    response = client.http.get(f"/api/views/{path}", params=params)
    assert response.status_code in (404, 422), (path, params, response.status_code)
    return response.json()["error"]


def _schema(client: McpClient, name: str) -> dict[str, Any]:
    return client.tool(name)["inputSchema"]


def _assert_no_arguments(client: McpClient, name: str) -> None:
    schema = _schema(client, name)
    assert schema.get("type") == "object" and schema.get("additionalProperties") is False, schema
    assert not schema.get("properties") and not schema.get("required"), schema


# --- AC-1: find_book --------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_find_book_returns_every_candidate_with_its_edition_and_type_and_never_guesses(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-1 find_book returns every matching Book, both editions included; an empty
    # query is invalid_fields on query, and no match is an empty list.
    client, ids = _open(connect_mcp, tmp_path)
    ddia = {ids["ddia1"], ids["ddia2"]}

    assert _candidate_ids(client, "Designing") == ddia | {ids["interfaces"]}

    # Each candidate is exactly the seven keys, as stored, with its role.
    books = {book["id"]: book for book in _books(client.call_tool("find_book", {"query": DDIA}))}
    assert set(books) == ddia
    for book in books.values():
        assert set(book) == CANDIDATE_KEYS, book
    assert books[ids["ddia1"]] == {
        "id": ids["ddia1"],
        "title": DDIA,
        "subtitle": DDIA_SUBTITLE,
        "authors": ["Martin Kleppmann"],
        "edition": 1,
        "type": "paperback",
        "role": "main",
    }
    assert books[ids["ddia2"]] == {
        "id": ids["ddia2"],
        "title": DDIA,
        "subtitle": DDIA_SUBTITLE,
        "authors": ["Martin Kleppmann", "Chris Riccomini"],
        "edition": 2,
        "type": "ebook",
        "role": None,
    }
    interfaces = _books(client.call_tool("find_book", {"query": "Designing Interfaces"}))
    assert [(book["id"], book["role"]) for book in interfaces] == [(ids["interfaces"], "upNext")]

    # Initials, an author, and an ISBN with or without hyphens, whichever way it is stored.
    assert _candidate_ids(client, "DDIA") == ddia
    assert _candidate_ids(client, "Kleppmann") == ddia
    assert _candidate_ids(client, "978-1-449-37332-0") == {ids["ddia1"]}
    assert _candidate_ids(client, "9781098119065") == {ids["ddia2"]}

    # Nothing matches: an empty list, not an error.
    assert _books(client.call_tool("find_book", {"query": "Neuromancer"})) == []

    # An empty query: invalid_fields on query.
    error = error_of(client.call_tool("find_book", {"query": ""}))
    assert (error["kind"], error["code"]) == ("refusal", "invalid_fields"), error
    assert [field["field"] for field in error["fields"]] == ["query"], error

    tool = client.tool("find_book")
    assert tool["description"] == DESCRIPTIONS["find_book"]
    schema = tool["inputSchema"]
    assert set(schema["properties"]) == {"query"}, schema
    assert schema["required"] == ["query"] and schema["additionalProperties"] is False, schema


# --- AC-2: get_book ---------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_get_book_returns_the_book_view_and_refuses_an_unknown_id_as_the_route_does(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-2 get_book returns GET /api/views/book's view by alias; an unknown id is
    # book_not_found, as the route refuses it.
    client, ids = _open(connect_mcp, tmp_path)

    book = _structured(client.call_tool("get_book", {"bookId": ids["ddia1"]}))
    assert book == _view(client, "book", {"id": ids["ddia1"]})

    assert book["id"] == ids["ddia1"] and book["role"] == "main", book
    assert len(book["cardNotes"]) == 2, book
    other = _structured(client.call_tool("get_book", {"bookId": ids["ddia2"]}))
    assert other == _view(client, "book", {"id": ids["ddia2"]})

    error = error_of(client.call_tool("get_book", {"bookId": UNKNOWN_ID}))
    assert error == _view_error(client, "book", {"id": UNKNOWN_ID})
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found"), error

    tool = client.tool("get_book")
    assert tool["description"] == DESCRIPTIONS["get_book"]
    schema = tool["inputSchema"]
    assert set(schema["properties"]) == {"bookId"}, schema
    assert schema["required"] == ["bookId"] and schema["additionalProperties"] is False, schema


# --- AC-3: list_catalog -----------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_list_catalog_returns_the_catalog_view(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-3 list_catalog returns GET /api/views/catalog's view by alias.
    client, ids = _open(connect_mcp, tmp_path)

    catalog = _structured(client.call_tool("list_catalog"))
    assert catalog == _view(client, "catalog")

    assert {book["id"] for book in catalog["books"]} == set(ids.values()), catalog
    assert client.tool("list_catalog")["description"] == DESCRIPTIONS["list_catalog"]
    _assert_no_arguments(client, "list_catalog")


# --- AC-4: get_card_notes ---------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_get_card_notes_returns_every_books_notes_or_one_books_and_refuses_an_unknown_id(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-4 get_card_notes returns the card-notes view for all Books, or for bookId's
    # Book, by alias; an unknown bookId is book_not_found.
    client, ids = _open(connect_mcp, tmp_path)

    every = _structured(client.call_tool("get_card_notes"))
    assert every == _view(client, "card-notes")

    assert [group["bookId"] for group in every["groups"]] == [ids["ddia1"], ids["dune"]], every
    one = _structured(client.call_tool("get_card_notes", {"bookId": ids["ddia1"]}))
    assert one == _view(client, "card-notes", {"book": ids["ddia1"]})
    assert one["scope"]["bookId"] == ids["ddia1"] and len(one["groups"]) == 1, one
    # A Book with no Card notes: its scope, and no group.
    none = _structured(client.call_tool("get_card_notes", {"bookId": ids["ddia2"]}))
    assert none == _view(client, "card-notes", {"book": ids["ddia2"]})
    assert none["groups"] == [], none

    error = error_of(client.call_tool("get_card_notes", {"bookId": UNKNOWN_ID}))
    assert error == _view_error(client, "card-notes", {"book": UNKNOWN_ID})
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found"), error

    tool = client.tool("get_card_notes")
    assert tool["description"] == DESCRIPTIONS["get_card_notes"]
    schema = tool["inputSchema"]
    assert set(schema["properties"]) == {"bookId"}, schema
    assert "bookId" not in schema.get("required", []) and schema["additionalProperties"] is False


# --- AC-5: get_home ---------------------------------------------------------


@pytest.mark.skip(reason=RED)
def test_get_home_returns_the_home_view(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-5 get_home returns GET /api/views/home's view by alias.
    client, ids = _open(connect_mcp, tmp_path)

    home = _structured(client.call_tool("get_home"))
    assert home == _view(client, "home")

    assert home["mainBook"]["id"] == ids["ddia1"], home
    assert home["upNext"]["id"] == ids["interfaces"], home
    assert client.tool("get_home")["description"] == DESCRIPTIONS["get_home"]
    _assert_no_arguments(client, "get_home")


# --- AC-6: get_stats --------------------------------------------------------

# Each bad range and the AD-9 error the stats route answers it with today,
# copy included (read from the route on 2026-11-19). The tool answers the
# same, and the route keeps answering it once the parsing lives in views/.
_STATS_REFUSALS: list[tuple[dict[str, str], list[dict[str, str]]]] = [
    ({"from": "2026-01-01"}, [{"field": "to", "message": "Give both from and to."}]),
    ({"to": "2026-01-01"}, [{"field": "from", "message": "Give both from and to."}]),
    (
        {"from": "2026-10-28", "to": "2026-10-27"},
        [{"field": "to", "message": "To is before From."}],
    ),
    (
        {"from": "2026-01-01", "to": "someday"},
        [{"field": "to", "message": "Value error, Use YYYY-MM-DD."}],
    ),
    (
        {"from": "2026-01-01T00:00:00", "to": "2026-12-31"},
        [{"field": "from", "message": "Value error, Use YYYY-MM-DD."}],
    ),
    (
        {"from": "2026-01-01", "to": "86400"},
        [{"field": "to", "message": "Value error, Use YYYY-MM-DD."}],
    ),
    (
        {"from": "2026-13-01", "to": "2026-12-31"},
        [
            {
                "field": "from",
                "message": (
                    "Input should be a valid date or datetime, month value is outside expected "
                    "range of 1-12"
                ),
            }
        ],
    ),
    (
        {"from": "2026-02-30", "to": "2026-03-01"},
        [
            {
                "field": "from",
                "message": "Input should be a valid date or datetime, day value is outside expected range",
            }
        ],
    ),
]


def _invalid_fields(fields: list[dict[str, str]]) -> dict[str, Any]:
    names = ", ".join(field["field"] for field in fields)
    noun = "field needs" if len(fields) == 1 else "fields need"
    return {
        "kind": "refusal",
        "code": "invalid_fields",
        "message": f"Not saved. {len(fields)} {noun} attention: {names}.",
        "fields": fields,
    }


@pytest.mark.skip(reason=RED)
def test_get_stats_returns_the_stats_view_and_refuses_a_bad_range_with_the_routes_copy(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-6 get_stats returns GET /api/views/stats's view for no range or a from..to
    # range; a half range, a non-date or a to before from is the route's invalid_fields.
    client, _ids = _open(connect_mcp, tmp_path)

    year = {"from": "2026-01-01", "to": "2026-12-31"}
    ranged = _structured(client.call_tool("get_stats", year))
    assert ranged == _view(client, "stats", year)

    assert (ranged["books"], ranged["pages"]) == (1, 412), ranged
    every = _structured(client.call_tool("get_stats"))
    assert every == _view(client, "stats")
    empty = {"from": "2025-01-01", "to": "2025-12-31"}
    assert _structured(client.call_tool("get_stats", empty)) == _view(client, "stats", empty)

    for arguments, fields in _STATS_REFUSALS:
        expected = _invalid_fields(fields)
        assert error_of(client.call_tool("get_stats", arguments)) == expected, arguments
        assert _view_error(client, "stats", arguments) == expected, arguments

    tool = client.tool("get_stats")
    assert tool["description"] == DESCRIPTIONS["get_stats"]
    schema = tool["inputSchema"]
    assert set(schema["properties"]) == {"from", "to"}, schema
    assert not schema.get("required") and schema["additionalProperties"] is False, schema


# --- AC-7: the import graph -------------------------------------------------

_VIEW_ROUTES = ("book_view", "card_notes_view", "stats_view")
_STATS_COPY = ("Give both from and to.", "To is before From.", "Use YYYY-MM-DD.")


def _source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _raises_in(tree: ast.Module, names: tuple[str, ...]) -> dict[str, int]:
    """How many ``raise`` statements each named top-level function holds."""
    found = {
        node.name: sum(isinstance(inner, ast.Raise) for inner in ast.walk(node))
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name in names
    }
    assert set(found) == set(names), f"view routes not found in http/api.py: {found}"
    return found


@pytest.mark.skip(reason=RED)
def test_agent_never_imports_http_api_and_the_view_refusals_live_in_views() -> None:
    # [P1] AC-7 agent/ imports nothing from http/api; the views' not-found refusal and
    # the stats range parsing live in views/, used by both the route and the tool.
    api = _source(PACKAGE_ROOT / "http" / "api.py")

    assert [copy for copy in _STATS_COPY if copy in api] == []

    views_source = "\n".join(
        _source(path) for path in sorted((PACKAGE_ROOT / "views").rglob("*.py"))
    )
    assert [copy for copy in _STATS_COPY if copy not in views_source] == []
    # The routes refuse nothing themselves: book_not_found and invalid_fields come from views/.
    assert _raises_in(ast.parse(api), _VIEW_ROUTES) == dict.fromkeys(_VIEW_ROUTES, 0)
    # Importing the agent tools loads no part of http/.
    loaded = subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys, bookvie.agent; "
            "print(sorted(m for m in sys.modules if m.startswith('bookvie.http')))",
        ],
        capture_output=True,
        text=True,
        check=True,
        cwd=PACKAGE_ROOT.parent,
    )
    assert loaded.stdout.strip() == "[]", loaded.stdout
