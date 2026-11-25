"""Story 14.1 Carry each Book's spine color in the card-notes view (FR-19, AR62).

Acceptance tests, one leaf per criterion of ``epics.md`` Story 14.1
(AC-1 to AC-7 in source order). The view gains ``spineColor`` on every
``CardNotesGroup`` and on ``CardNotesScope``: the Book's stored resolved
``spineColor`` (AD-11) exactly as stored, never re-resolved. Nothing else on
the server changes: no stored field, no backup format, no tool description.

The page that renders the view is unchanged by this story, so there is no e2e
leaf: the existing Card notes, Book detail and Home specs stay as they are.
"""

from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from tests.agent_client import DESCRIPTIONS, McpClient, structured_of
from tests.builder import CURATED, LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_FORM,
    STORED_BOOK_KEYS,
    api_client,
    library_bytes,
    post_edit_book,
    post_set_spine_color,
    schema_block,
    stored_book,
    stored_books,
)

CARD_NOTES_VIEW = "/api/views/card-notes"
UNKNOWN_ID = "00000000-0000-4000-8000-000000000000"

USER = "#4B7C7B"
"""A swatch the user picked (one of the curated colors, as the popover offers)."""
FROM_COVER = "#A85A4A"
"""A cover's color, as ``seed_dune_with_cover`` stores it."""
AS_STORED = "#123456"
"""A stored ``spineColor`` that re-resolving would not give: the view must not re-resolve."""


def _seed(folder: Path) -> dict[str, str]:
    """Books with Card notes in each kind of color, read and unread, and one without notes.

    - ``user``: "Walden", a user-chosen color, finished (read).
    - ``cover``: "Dune", its color from its cover, being read.
    - ``palette``: "Emma", the curated (palette) color, unread.
    - ``stored``: "Neuromancer", a stored ``spineColor`` no resolution would give.
    - ``bare``: "Good Omens", no notes.
    """
    builder = LibraryBuilder()
    user = builder.book(title="Walden", pages=352, spine_color_user=USER)
    builder.reading(
        user,
        start_date="2026-09-01",
        finish_date="2026-10-01",
        finished_pages=352,
        current_page=352,
    )
    builder.card_note(user, text="Simplify, simplify.", page_start=91)
    cover = builder.book(title="Dune", pages=412, spine_color_from_cover=FROM_COVER)
    builder.reading(cover, current_page=120)
    builder.main(cover)
    builder.card_note(cover, text="Fear is the mind-killer.", page_start=12)
    builder.card_note(cover, text="The spice must flow.", page_start=96)
    palette = builder.book(title="Emma", pages=474)
    builder.card_note(palette, text="Badly done, Emma!", page_start=368)
    stored = builder.book(
        title="Neuromancer", pages=271, spine_color_curated=CURATED[1], spine_color=AS_STORED
    )
    builder.card_note(stored, text="The sky above the port.", page_start=3)
    bare = builder.book(title="Good Omens", pages=288)
    builder.write(folder)
    return {"user": user, "cover": cover, "palette": palette, "stored": stored, "bare": bare}


def _get(client: TestClient, book: str | None = None) -> Any:
    """``GET /api/views/card-notes`` (scoped to ``book`` when given), which must answer 200."""
    params = {"book": book} if book is not None else None
    response = client.get(CARD_NOTES_VIEW, params=params)
    assert response.status_code == 200, (book, response.status_code, response.text[:300])
    return response.json()


# --- AC-1: every group carries its Book's stored resolved color ------------------


def test_ac1_p0_every_group_carries_its_books_stored_spine_color(tmp_path: Path) -> None:
    # [P0] AC-1 every group carries spineColor, the Book's stored resolved spine_color exactly
    # as stored, the same value the book and catalog views give; nothing else changes.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    body = _get(client)

    # The criterion: each group's spineColor is the stored value, in group order.
    order = [ids["cover"], ids["palette"], ids["stored"], ids["user"]]
    assert [group.get("spineColor") for group in body["groups"]] == [
        stored_book(tmp_path, book_id)["spineColor"] for book_id in order
    ], body["groups"]
    # One of each kind: cover, palette, stored as is (not re-resolved), user.
    assert [group["spineColor"] for group in body["groups"]] == [
        FROM_COVER,
        stored_book(tmp_path, ids["palette"])["spineColorCurated"],
        AS_STORED,
        USER,
    ]
    # The same value the book and catalog views give that Book.
    catalog = {
        book["id"]: book["spineColor"] for book in client.get("/api/views/catalog").json()["books"]
    }
    for group in body["groups"]:
        book = client.get("/api/views/book", params={"id": group["bookId"]}).json()
        assert group["spineColor"] == book["spineColor"] == catalog[group["bookId"]], group
    # Otherwise unchanged: order (title key, then Book id), the notes, scope null.
    assert [group["bookId"] for group in body["groups"]] == order
    assert [group["title"] for group in body["groups"]] == ["Dune", "Emma", "Neuromancer", "Walden"]
    assert all(set(group) == {"bookId", "title", "spineColor", "notes"} for group in body["groups"])
    assert [len(group["notes"]) for group in body["groups"]] == [2, 1, 1, 1]
    assert body["groups"][0]["notes"][0]["text"] == "Fear is the mind-killer."
    assert body["scope"] is None
    # The Book without notes still has no group.
    assert ids["bare"] not in {group["bookId"] for group in body["groups"]}


# --- AC-2: the scoped view's scope and group carry it ----------------------------


def test_ac2_p0_the_scoped_views_scope_and_group_carry_the_spine_color(tmp_path: Path) -> None:
    # [P0] AC-2 card-notes?book=<id> for a Book with notes: scope carries bookId, title and
    # spineColor, and the one group carries the same spineColor.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    body = _get(client, ids["cover"])

    # The criterion: the scope carries the Book's stored spineColor.
    assert body["scope"].get("spineColor") == FROM_COVER, body["scope"]
    assert body["scope"] == {"bookId": ids["cover"], "title": "Dune", "spineColor": FROM_COVER}
    assert [group["bookId"] for group in body["groups"]] == [ids["cover"]]
    assert body["groups"][0]["spineColor"] == FROM_COVER


# --- AC-3: a scoped Book without notes still carries it; unknown is 404 ----------


def test_ac3_p0_a_scoped_book_without_notes_carries_its_color_and_no_groups(
    tmp_path: Path,
) -> None:
    # [P0] AC-3 card-notes?book=<id> for a Book without notes: scope.spineColor is its resolved
    # color and groups is empty; an unknown Book is still 404 book_not_found.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    body = _get(client, ids["bare"])

    # The criterion: the scope carries the color even with no group to carry it.
    assert body["scope"].get("spineColor") == stored_book(tmp_path, ids["bare"])["spineColor"], body
    assert body["groups"] == []
    assert body["scope"]["spineColor"] == stored_book(tmp_path, ids["bare"])["spineColorCurated"]

    before = library_bytes(tmp_path)
    response = api_client(tmp_path).get(CARD_NOTES_VIEW, params={"book": UNKNOWN_ID})
    assert response.status_code == 404
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
    assert library_bytes(tmp_path) == before


# --- AC-4: a changed color shows on the next read --------------------------------


def test_ac4_p1_a_changed_spine_color_shows_on_the_next_read(tmp_path: Path) -> None:
    # [P1] AC-4 after the spine color changes (from the spine popover, or by editing the Book),
    # the group and the scope carry the new color on the next read.
    builder = LibraryBuilder()
    dune = builder.book(**DUNE, spine_color_from_cover=FROM_COVER)
    builder.card_note(dune, text="Fear is the mind-killer.", page_start=12)
    builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    _get(client)  # read once before the change, as the page would have

    # The spine popover: a swatch.
    assert post_set_spine_color(client, dune, CURATED[0]).json() == {"ok": True}
    # The criterion: the next read carries the new color.
    assert _get(client)["groups"][0].get("spineColor") == CURATED[0]
    assert _get(client, dune)["scope"]["spineColor"] == CURATED[0]
    assert _get(client, dune)["groups"][0]["spineColor"] == CURATED[0]

    # Editing the Book: its Spine color field.
    assert post_edit_book(client, dune, DUNE_FORM, spineColor=USER).status_code == 200
    assert _get(client)["groups"][0]["spineColor"] == USER
    assert _get(client, dune)["scope"]["spineColor"] == USER

    # "From cover" clears the user color: back to the cover's.
    assert post_set_spine_color(client, dune, None).json() == {"ok": True}
    assert _get(client)["groups"][0]["spineColor"] == FROM_COVER
    assert _get(client, dune)["scope"]["spineColor"] == FROM_COVER


# --- AC-5: OpenAPI and the regenerated client types ------------------------------


def test_ac5_p0_the_client_types_carry_spine_color_on_group_and_scope(tmp_path: Path) -> None:
    # [P0] AC-5 after api:gen, schema.d.ts has spineColor: string on CardNotesGroup and
    # CardNotesScope; OpenAPI marks it required on both.
    # The criterion: the regenerated file carries the field on both types.
    assert "spineColor: string;" in schema_block("CardNotesGroup")
    assert "spineColor: string;" in schema_block("CardNotesScope")

    schemas = api_client(tmp_path).get("/openapi.json").json()["components"]["schemas"]
    for name in ("CardNotesGroup", "CardNotesScope"):
        assert schemas[name]["properties"]["spineColor"]["type"] == "string", name
        assert "spineColor" in schemas[name]["required"], name
    assert set(schemas["CardNotesScope"]["properties"]) == {"bookId", "title", "spineColor"}
    assert set(schemas["CardNotesGroup"]["properties"]) == {
        "bookId",
        "title",
        "spineColor",
        "notes",
    }


# --- AC-6: get_card_notes returns the view as is ---------------------------------


def test_ac6_p1_get_card_notes_carries_spine_color_on_each_group_and_the_scope(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P1] AC-6 get_card_notes, for every Book and for one Book, returns the view as is, with
    # spineColor on each group and on the scope (AR36, AR38); its description is unchanged.
    folder = tmp_path / "library"
    ids = _seed(folder)
    client = connect_mcp(data_dir=folder)

    every = structured_of(client.call_tool("get_card_notes"))

    # The criterion: the tool's groups carry spineColor.
    assert [group.get("spineColor") for group in every["groups"]] == [
        FROM_COVER,
        stored_book(folder, ids["palette"])["spineColorCurated"],
        AS_STORED,
        USER,
    ], every
    assert every == client.http.get(CARD_NOTES_VIEW).json()
    one = structured_of(client.call_tool("get_card_notes", {"bookId": ids["user"]}))
    assert one["scope"]["spineColor"] == USER and one["groups"][0]["spineColor"] == USER, one
    assert one == client.http.get(CARD_NOTES_VIEW, params={"book": ids["user"]}).json()
    bare = structured_of(client.call_tool("get_card_notes", {"bookId": ids["bare"]}))
    assert bare["scope"]["spineColor"] == stored_book(folder, ids["bare"])["spineColor"], bare
    assert bare["groups"] == []
    assert client.tool("get_card_notes")["description"] == DESCRIPTIONS["get_card_notes"]


# --- AC-7: nothing stored or exported changes ------------------------------------


def test_ac7_p1_the_color_is_read_only_and_no_stored_data_changes(tmp_path: Path) -> None:
    # [P1] AC-7 nothing visible changes and no stored data or backup format changes: reading
    # the views writes nothing and a stored Book gains no key.
    ids = _seed(tmp_path)
    before = library_bytes(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    # Witness first: the view carries the color, so the guards below run against it.
    assert _get(client)["groups"][0].get("spineColor") == FROM_COVER
    _get(client, ids["bare"])
    client.get("/api/views/home")
    client.get("/api/views/catalog")
    client.get("/api/views/book", params={"id": ids["cover"]})

    # A read writes nothing, and a stored Book (which backups carry as is) gains no key.
    assert library_bytes(tmp_path) == before
    assert all(set(book) == STORED_BOOK_KEYS for book in stored_books(tmp_path))
