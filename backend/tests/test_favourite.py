"""Story 16.1: a Book's ``favourite`` and the ``set-favourite`` intent (FR-31, Epic 16).

Red-phase tests for the six server-side acceptance criteria (AC-1 to AC-6,
numbered in the order of epics.md, Story 16.1). AC-7 to AC-14 are the star in
the browser, in ``frontend/e2e/favourite-star.spec.ts``. The checklist is
``_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md``.

The tests pin these names (spine AD-3, AD-13, AD-18, AD-21; AR67 to AR73):

- Each stored Book has ``favourite``, a bool with no default in the store
  model. ``schemaVersion`` 4 adds it; the step from 3 sets ``false``.
- ``POST /api/intents/set-favourite``, ``multipart/form-data`` with a JSON part
  named ``intent`` holding ``{"bookId": ..., "favourite": <bool>}``. It sets
  the value it is sent, never toggles; the current value is a 200 no-op that
  writes nothing, checked after 409 ``book_not_found``.
- ``ShelfBook`` and ``BookDetailView`` carry ``favourite`` as stored; the
  ``book`` view's ``editForm`` and ``edit_book``'s input never do.

Before the build no seed can hold ``favourite: true`` (the model forbids the
key), so each leaf stars a Book through ``set-favourite`` as an unasserted
setup call, then asserts.
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from bookvie.domain.model import SCHEMA_VERSION
from bookvie.http.app import create_app
from bookvie.store import StartupError, Store, migrations, serialize
from tests.agent_client import AGENT_TOOL_NAMES, DESCRIPTIONS, McpClient, structured_of
from tests.builder import LibraryBuilder, as_v3
from tests.helpers import (
    ADD_BOOK,
    COULDNT_SAVE_BODY,
    DUNE_FORM,
    DUNE_ID,
    SET_FAVOURITE,
    VALID,
    FaultyFs,
    api_client,
    assert_invariants,
    field_messages,
    library_bytes,
    post_edit_book,
    post_restore,
    post_set_favourite,
    schema_block,
    seed_dune_with_cover,
    stored_book,
    stored_books,
    zip_archive,
)
from tests.test_intent_routes import INTENT_ROUTES

RED_16_1 = "Story 16.1 red phase: favourite and set-favourite are not built yet"

GONE_ID = "00000000-0000-4000-8000-000000000000"
NEUROMANCER_ID = "1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
EXPORT = "/api/export"
EXPORT_HEADERS = {"X-Bookvie-Export": "1"}


def _seed(data_dir: Path) -> None:
    """Dune (the Main book, at p.120), Neuromancer (unread) and Piranesi (finished)."""
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(DUNE_ID, current_page=120)
    builder.main(DUNE_ID)
    builder.book(id=NEUROMANCER_ID, title="Neuromancer", authors=["William Gibson"], pages=271)
    builder.book(id=PIRANESI_ID, title="Piranesi", authors=["Susanna Clarke"], pages=272)
    builder.reading(
        PIRANESI_ID,
        start_date="2026-03-01",
        finish_date="2026-03-20",
        finished_pages=272,
        current_page=272,
    )
    builder.write(data_dir)


def _favourites(data_dir: Path) -> dict[str, Any]:
    """Each stored Book's ``favourite`` by id; ``None`` where the key is missing."""
    return {book["id"]: book.get("favourite") for book in stored_books(data_dir)}


def _view_favourites(client: Any, path: str) -> dict[str, Any]:
    """Each ``ShelfBook``'s ``favourite`` by id in ``GET /api/views/<path>``."""
    response = client.get(f"/api/views/{path}")
    assert response.status_code == 200, (path, response.text[:300])
    return {book["id"]: book.get("favourite") for book in response.json()["books"]}


# --- AC-1: version 4 and its migration -------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac1_p0_a_version_3_library_loads_at_version_4_with_no_book_starred(
    tmp_path: Path,
) -> None:
    # [P0] AC-1. Startup: a v3 file is kept as library.v3.bak.json and upgraded.
    _seed(tmp_path)
    path = tmp_path / "library.json"
    original = as_v3(path.read_bytes())
    path.write_bytes(original)

    store = Store.open(tmp_path)

    on_disk = json.loads(path.read_bytes())
    assert on_disk["schemaVersion"] == 4
    assert (tmp_path / "library.v3.bak.json").read_bytes() == original
    assert _favourites(tmp_path) == {DUNE_ID: False, NEUROMANCER_ID: False, PIRANESI_ID: False}
    assert path.read_bytes() == serialize(store.library)
    assert migrations.CURRENT_VERSION == 4
    assert SCHEMA_VERSION == 4
    assert set(migrations.STEPS) == set(range(1, migrations.CURRENT_VERSION))
    # The step adds favourite and nothing else.
    before = json.loads(original)
    for book in on_disk["books"]:
        book.pop("favourite")
    assert {**on_disk, "schemaVersion": 3} == before

    # Restore: a v3 archive restores at version 4, no Book starred, and no .bak is kept.
    target = tmp_path / "target"
    LibraryBuilder().write(target)
    restored = post_restore(
        api_client(target), zip_archive({"library.json": original, "covers/": None})
    )
    assert restored.status_code == 200, restored.text[:300]
    assert json.loads(library_bytes(target))["schemaVersion"] == 4
    assert set(_favourites(target).values()) == {False}
    assert not (target / "library.v3.bak.json").exists()

    # A version 4 file or archive with a Book missing favourite is refused, nothing changed.
    doc = json.loads(library_bytes(target))
    del doc["books"][1]["favourite"]
    broken = (json.dumps(doc, indent=2) + "\n").encode()
    refused_dir = tmp_path / "refused"
    refused_dir.mkdir()
    (refused_dir / "library.json").write_bytes(broken)
    with pytest.raises(StartupError, match="not a valid library"):
        Store.open(refused_dir)
    assert (refused_dir / "library.json").read_bytes() == broken

    before_restore = library_bytes(target)
    refused = post_restore(
        api_client(target), zip_archive({"library.json": broken, "covers/": None})
    )
    assert refused.status_code == 422
    assert refused.json()["error"]["code"] == "restore_invalid"
    assert library_bytes(target) == before_restore


# --- AC-2: the set-favourite intent ---------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac2_p0_set_favourite_stores_the_value_it_is_sent(tmp_path: Path) -> None:
    # [P0] AC-2. A Book is starred with favourite: true; the usual 200.
    data_dir = tmp_path / "ok"
    _seed(data_dir)
    client = api_client(data_dir)

    response = post_set_favourite(client, NEUROMANCER_ID, True)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _favourites(data_dir) == {DUNE_ID: False, NEUROMANCER_ID: True, PIRANESI_ID: False}
    assert_invariants(data_dir)
    # Every view shows it on the next fetch.
    assert _view_favourites(client, "catalog")[NEUROMANCER_ID] is True
    assert _view_favourites(client, "home")[NEUROMANCER_ID] is True
    book = client.get("/api/views/book", params={"id": NEUROMANCER_ID}).json()
    assert book["favourite"] is True
    # Only favourite changed on the Book.
    starred = stored_book(data_dir, NEUROMANCER_ID)

    # The current value is a 200 no-op that writes nothing, even when a write would fail.
    before = library_bytes(data_dir)
    again = post_set_favourite(api_client(data_dir, fs=FaultyFs("write")), NEUROMANCER_ID, True)
    assert again.status_code == 200
    assert again.json() == {"ok": True}
    assert library_bytes(data_dir) == before

    # favourite: false stores false.
    assert post_set_favourite(client, NEUROMANCER_ID, False).status_code == 200
    unstarred = stored_book(data_dir, NEUROMANCER_ID)
    assert unstarred["favourite"] is False
    assert {k for k in starred if starred[k] != unstarred[k]} == {"favourite"}
    assert_invariants(data_dir)

    # A Book that is gone is 409 book_not_found, before the no-op check.
    before = library_bytes(data_dir)
    for value in (True, False):
        gone = post_set_favourite(client, GONE_ID, value)
        assert gone.status_code == 409, value
        assert gone.json()["error"]["code"] == "book_not_found"
    assert library_bytes(data_dir) == before

    # A missing or non-boolean favourite is 422 invalid_fields on favourite.
    bodies = [
        {"bookId": NEUROMANCER_ID},
        {"bookId": NEUROMANCER_ID, "favourite": "true"},
        {"bookId": NEUROMANCER_ID, "favourite": 1},
        {"bookId": NEUROMANCER_ID, "favourite": None},
    ]
    for body in bodies:
        refused = client.post(
            SET_FAVOURITE, files={"intent": (None, json.dumps(body), "application/json")}
        )
        assert refused.status_code == 422, body
        assert refused.json()["error"]["code"] == "invalid_fields", body
        assert set(field_messages(refused)) == {"favourite"}, body
    assert library_bytes(data_dir) == before

    # The standard intent ACs (TR8): a failed commit leaves library.json byte-identical.
    for step in ("write", "fsync", "replace"):
        folder = tmp_path / step
        _seed(folder)
        unchanged = library_bytes(folder)
        failed = post_set_favourite(api_client(folder, fs=FaultyFs(step)), DUNE_ID, True)
        assert failed.status_code == 503, step
        assert failed.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(folder) == unchanged, step

    # The route is in the contract and adds no error code (AD-8).
    schema = create_app().openapi()
    assert SET_FAVOURITE in schema["paths"]
    assert "book_not_found" in schema["components"]["schemas"]["ErrorCode"]["enum"]


# --- AC-3: nothing else writes favourite -------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac3_p0_an_edit_and_every_other_intent_keep_the_star(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-3. A starred Book edited with Save changes is still starred.
    folder = tmp_path / "library"
    seed_dune_with_cover(folder)
    client = connect_mcp(data_dir=folder)
    post_set_favourite(client.http, DUNE_ID, True)

    edited = post_edit_book(client.http, DUNE_ID, DUNE_FORM, title="Dune Messiah")

    assert stored_book(folder, DUNE_ID).get("favourite") is True
    assert edited.status_code == 200, edited.text[:300]

    # The book view's editForm has no favourite, and edit_book's input has none either.
    view = structured_of(client.call_tool("get_book", {"bookId": DUNE_ID}))
    assert "favourite" not in view["editForm"]
    assert "favourite" not in client.tool("edit_book")["inputSchema"]["properties"]

    # edit_book with get_book's editForm unchanged, then with a new title.
    for changes in ({}, {"title": "Dune"}):
        answer = client.call_tool("edit_book", {**view["editForm"], **changes, "bookId": DUNE_ID})
        assert answer.get("isError") is not True, answer
        assert stored_book(folder, DUNE_ID)["favourite"] is True, changes

    # add-book and add_book store false.
    added = client.http.post(
        ADD_BOOK, files={"intent": (None, json.dumps(VALID), "application/json")}
    )
    assert added.status_code == 200, added.text[:300]
    kindred = {**VALID, "title": "Kindred", "authors": "Octavia E. Butler", "pages": "264"}
    answer = client.call_tool("add_book", kindred)
    assert answer.get("isError") is not True, answer
    others = [book for book in stored_books(folder) if book["id"] != DUNE_ID]
    assert [book["favourite"] for book in others] == [False, False]

    # Every other intent leaves the star as it was.
    for route in (
        "start-reading",
        "update-page",
        "edit-purpose",
        "add-card-note",
        "set-spine-color",
        "pause",
        "set-up-next",
        "mark-side-read",
        "unmark-side-read",
        "start-reading",
        "finish-reading",
    ):
        response = client.http.post(
            f"/api/intents/{route}",
            files={"intent": (None, json.dumps(INTENT_ROUTES[route]), "application/json")},
        )
        assert response.status_code == 200, (route, response.text[:300])
        assert stored_book(folder, DUNE_ID)["favourite"] is True, route
    assert_invariants(folder)


# --- AC-4: export and restore ------------------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac4_p0_every_star_survives_an_export_and_restore(tmp_path: Path) -> None:
    # [P0] AC-4. Two of three Books starred; export, restore into another folder.
    source = tmp_path / "source"
    _seed(source)
    client = api_client(source)
    post_set_favourite(client, DUNE_ID, True)
    post_set_favourite(client, PIRANESI_ID, True)
    archive = client.get(EXPORT, headers=EXPORT_HEADERS).content
    target = tmp_path / "target"
    LibraryBuilder().write(target)

    restored = post_restore(api_client(target), archive)

    assert _favourites(target) == {DUNE_ID: True, NEUROMANCER_ID: False, PIRANESI_ID: True}
    assert restored.status_code == 200
    assert library_bytes(target) == library_bytes(source)


# --- AC-5: the generated client types -----------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac5_p1_the_client_types_give_both_views_a_required_favourite(tmp_path: Path) -> None:
    # [P1] AC-5. api:gen gives ShelfBook and BookDetailView a required favourite: boolean.
    assert "            favourite: boolean;\n" in schema_block("ShelfBook")
    assert "            favourite: boolean;\n" in schema_block("BookDetailView")

    schemas = create_app().openapi()["components"]["schemas"]
    for name in ("ShelfBook", "BookDetailView"):
        assert schemas[name]["properties"]["favourite"]["type"] == "boolean", name
        assert "favourite" in schemas[name]["required"], name
    # The builder every backend test and e2e seed uses defaults it to false.
    builder = LibraryBuilder()
    builder.book(title="Dune")
    builder.write(tmp_path)
    (book,) = stored_books(tmp_path)
    assert book["favourite"] is False


# --- AC-6: agents read it and can't set it -------------------------------------------


@pytest.mark.skip(reason=RED_16_1)
def test_ac6_p1_agents_read_the_star_and_have_no_tool_to_set_it(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-6. get_book carries favourite as stored.
    folder = tmp_path / "library"
    _seed(folder)
    client = connect_mcp(data_dir=folder)
    post_set_favourite(client.http, DUNE_ID, True)

    book = structured_of(client.call_tool("get_book", {"bookId": DUNE_ID}))

    assert book.get("favourite") is True
    other = structured_of(client.call_tool("get_book", {"bookId": NEUROMANCER_ID}))
    assert other["favourite"] is False

    stars = {DUNE_ID: True, NEUROMANCER_ID: False, PIRANESI_ID: False}
    catalog = structured_of(client.call_tool("list_catalog"))
    assert {b["id"]: b["favourite"] for b in catalog["books"]} == stars
    home = structured_of(client.call_tool("get_home"))
    assert {b["id"]: b["favourite"] for b in home["books"]} == stars

    # No description or argument changes, and the tool list is the same.
    tools = {tool["name"]: tool for tool in client.list_tools()}
    assert sorted(tools) == sorted(AGENT_TOOL_NAMES)
    for name in ("get_book", "list_catalog", "get_home"):
        assert tools[name]["description"] == DESCRIPTIONS[name], name
    assert set(tools["get_book"]["inputSchema"]["properties"]) == {"bookId"}

    # set_favourite is refused like set_spine_color.
    for name in ("set_favourite", "set_spine_color"):
        refused = client.answer(name, {"bookId": DUNE_ID, "favourite": False})
        assert refused["rpcError"]["code"] == -32602, (name, refused)
    assert stored_book(folder, DUNE_ID)["favourite"] is True

    # find_book's results don't carry favourite.
    found = structured_of(client.call_tool("find_book", {"query": "Dune"}))["books"]
    assert [b["id"] for b in found] == [DUNE_ID]
    assert all("favourite" not in b for b in found)
