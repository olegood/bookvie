"""Story 15.1 Carry the publisher in the catalog view (FR-20, AR66).

Acceptance tests, one leaf per criterion of ``epics.md`` Story 15.1 (AC-1 to
AC-4 in source order). Every ``ShelfBook`` gains ``publisher``: the Book's
stored publisher, which is always present and trimmed (``book_publisher_required``,
``book_publisher_trimmed``), exactly as stored. It is not merged across case:
that is Story 15.2's filter list, built on the client. Nothing else on the
server changes: no stored field, no backup format, no tool description or
arguments.

No page renders the field in this story, so there is no e2e leaf: the existing
catalog, home-slice and catalog-filter specs stay as they are (AC-4).
"""

from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.agent import NoArguments, input_schema
from tests.agent_client import DESCRIPTIONS, McpClient, structured_of
from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_FORM,
    STORED_BOOK_KEYS,
    api_client,
    library_bytes,
    post_edit_book,
    schema_block,
    stored_book,
    stored_books,
)

RED_15_1 = "Story 15.1 red phase: ShelfBook has no publisher yet"
CATALOG_VIEW = "/api/views/catalog"
HOME_VIEW = "/api/views/home"

SHELF_BOOK_FIELDS_BEFORE = {
    "id",
    "title",
    "subtitle",
    "firstAuthor",
    "authorCount",
    "authors",
    "pages",
    "edition",
    "year",
    "createdAt",
    "spineColor",
    "spineColorUser",
    "spineColorFromCover",
    "hasCover",
    "coverFile",
    "finished",
    "role",
    "currentPage",
    "percent",
    "waitingPage",
    "sideRead",
    "type",
    "language",
    "tags",
}
"""``ShelfBook``'s OpenAPI properties before this story (all required); it adds only ``publisher``."""


def _seed(folder: Path) -> dict[str, str]:
    """Books from several publishers, in library order.

    - ``manning``: "Grokking Algorithms", Manning, unread.
    - ``oreilly``: "Designing Data-Intensive Applications", O'Reilly Media, finished.
    - ``lower``: "Kafka in Action", "manning" as stored: the view doesn't merge case.
    - ``dune``: Dune from ``DUNE`` (Chilton Books), the Main book; AC-1 edits it.
    """
    builder = LibraryBuilder()
    manning = builder.book(title="Grokking Algorithms", pages=256, publisher="Manning")
    oreilly = builder.book(
        title="Designing Data-Intensive Applications", pages=616, publisher="O'Reilly Media"
    )
    builder.reading(
        oreilly,
        start_date="2026-08-01",
        finish_date="2026-09-01",
        finished_pages=616,
        current_page=616,
    )
    lower = builder.book(title="Kafka in Action", pages=272, publisher="manning")
    dune = builder.book(**DUNE)
    builder.reading(dune, current_page=120)
    builder.main(dune)
    builder.write(folder)
    return {"manning": manning, "oreilly": oreilly, "lower": lower, "dune": dune}


PUBLISHERS = ["Manning", "O'Reilly Media", "manning", "Chilton Books"]
"""The seed's publishers in library order, as stored."""


def _get(client: TestClient, path: str = CATALOG_VIEW) -> Any:
    """``GET`` a view, which must answer 200."""
    response = client.get(path)
    assert response.status_code == 200, (path, response.status_code, response.text[:300])
    return response.json()


# --- AC-1: every ShelfBook carries its stored, trimmed publisher -------------------


@pytest.mark.skip(reason=RED_15_1)
def test_ac1_p0_every_shelf_book_carries_its_stored_publisher(tmp_path: Path) -> None:
    # [P0] AC-1 every ShelfBook in the catalog view carries publisher, the Book's stored,
    # trimmed publisher; a Book edited to another publisher shows the new value next fetch.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    books = _get(client)["books"]

    # The criterion: each Book, in library order, carries its publisher as stored.
    assert [book.get("publisher") for book in books] == PUBLISHERS, books
    assert [book["id"] for book in books] == [
        ids[k] for k in ("manning", "oreilly", "lower", "dune")
    ]
    for book in books:
        assert book["publisher"] == stored_book(tmp_path, book["id"])["publisher"], book["title"]

    # The edit-book intent trims the field; the next fetch carries the new, trimmed value.
    edited = post_edit_book(client, ids["dune"], DUNE_FORM, publisher="  Ace Books  ")
    assert edited.status_code == 200, edited.text[:300]
    assert stored_book(tmp_path, ids["dune"])["publisher"] == "Ace Books"
    after = {book["id"]: book["publisher"] for book in _get(client)["books"]}
    assert after == {
        ids["manning"]: "Manning",
        ids["oreilly"]: "O'Reilly Media",
        ids["lower"]: "manning",
        ids["dune"]: "Ace Books",
    }


# --- AC-2: the client types carry a required publisher -----------------------------


@pytest.mark.skip(reason=RED_15_1)
def test_ac2_p0_the_client_types_give_shelf_book_a_required_publisher(tmp_path: Path) -> None:
    # [P0] AC-2 after api:gen, schema.d.ts gives ShelfBook a required publisher: string, and
    # OpenAPI marks it a required string; ShelfBook gains no other field.
    # The criterion: the regenerated file carries the field, required (no "?").
    assert "publisher: string;" in schema_block("ShelfBook")

    LibraryBuilder().write(tmp_path)
    schemas = api_client(tmp_path).get("/openapi.json").json()["components"]["schemas"]
    shelf_book = schemas["ShelfBook"]
    assert shelf_book["properties"]["publisher"]["type"] == "string", shelf_book
    assert "publisher" in shelf_book["required"], shelf_book
    assert set(shelf_book["properties"]) == SHELF_BOOK_FIELDS_BEFORE | {"publisher"}
    assert set(shelf_book["required"]) == SHELF_BOOK_FIELDS_BEFORE | {"publisher"}


# --- AC-3: list_catalog carries it too, with its description and arguments --------


@pytest.mark.skip(reason=RED_15_1)
def test_ac3_p1_list_catalog_carries_the_publisher_with_its_description_and_arguments(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-3 list_catalog returns the same catalog view, so each Book carries publisher;
    # the tool's description and arguments don't change.
    folder = tmp_path / "library"
    _seed(folder)
    client = connect_mcp(data_dir=folder)

    catalog = structured_of(client.call_tool("list_catalog"))

    # The criterion: each Book in the tool's result carries its publisher.
    assert [book.get("publisher") for book in catalog["books"]] == PUBLISHERS, catalog
    assert catalog == client.http.get(CATALOG_VIEW).json()
    tool = client.tool("list_catalog")
    assert tool["description"] == DESCRIPTIONS["list_catalog"]
    assert tool["inputSchema"] == input_schema(NoArguments), tool["inputSchema"]


# --- AC-4: nothing visible or stored changes ---------------------------------------


@pytest.mark.skip(reason=RED_15_1)
def test_ac4_p1_the_publisher_is_read_only_and_no_stored_data_changes(tmp_path: Path) -> None:
    # [P1] AC-4 nothing visible changes: the field is read-only. Reading the catalog, home,
    # card-notes and book views writes nothing, and a stored Book gains no key.
    ids = _seed(tmp_path)
    before = library_bytes(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    # Witness first: the catalog view carries the publisher, so the guards below run
    # against it. Home's books are ShelfBooks too, so they carry the same values.
    assert _get(client)["books"][0].get("publisher") == "Manning"
    assert [book["publisher"] for book in _get(client, HOME_VIEW)["books"]] == PUBLISHERS
    _get(client, "/api/views/card-notes")
    client.get("/api/views/book", params={"id": ids["dune"]})

    # A read writes nothing, and a stored Book (which backups carry as is) gains no key.
    assert library_bytes(tmp_path) == before
    assert all(set(book) == STORED_BOOK_KEYS for book in stored_books(tmp_path))
