"""Story 15.1 follow-ups: the catalog publisher's secondary branches (``bmad-testarch-automate``).

The ATDD checklist's green-phase follow-ups that ``test_catalog_publisher.py``
doesn't reach: a Book added through ``add-book`` with a padded publisher (AC-1
covers ``edit-book``), a restored library, whose Books' publishers the view
carries on the next read, and the agent ``edit_book`` tool, whose change the
next ``list_catalog`` call shows (AC-3 covers ``list_catalog`` on a seed).
"""

from collections.abc import Callable
from pathlib import Path

from tests.agent_client import McpClient, structured_of, text_of
from tests.builder import LibraryBuilder
from tests.helpers import api_client, library_bytes, post_restore, stored_book
from tests.test_add_book import _add
from tests.test_card_notes_spine_color_follow_ups import EXPORT, EXPORT_HEADERS
from tests.test_catalog_publisher import CATALOG_VIEW, PUBLISHERS, _get, _seed

# --- A Book added through add-book -----------------------------------------------


def test_a_book_added_with_a_padded_publisher_shows_it_trimmed_on_the_next_read(
    tmp_path: Path,
) -> None:
    # [P2] AC-1 follow-up: add-book trims the publisher, and the next catalog read carries
    # the new Book with the trimmed value, after the seeded Books, as stored.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    assert [book["publisher"] for book in _get(client)["books"]] == PUBLISHERS  # before

    added = _add(client, publisher="  No Starch Press  ")
    assert added.status_code == 200, added.text[:300]
    new_id = added.json()["ids"]["bookId"]
    assert stored_book(tmp_path, new_id)["publisher"] == "No Starch Press"

    books = _get(client)["books"]
    assert {book["id"]: book["publisher"] for book in books} == {
        ids["manning"]: "Manning",
        ids["oreilly"]: "O'Reilly Media",
        ids["lower"]: "manning",
        ids["dune"]: "Chilton Books",
        new_id: "No Starch Press",
    }


# --- A restored library -----------------------------------------------------------


def test_after_a_restore_the_catalog_carries_the_restored_books_publishers(
    tmp_path: Path,
) -> None:
    # [P2] AC-1 follow-up: a restore replaces library.json, and the next catalog read carries
    # the restored Books' publishers, in library order, not the ones read before it.
    source = tmp_path / "source"
    ids = _seed(source)
    archive = api_client(source).get(EXPORT, headers=EXPORT_HEADERS).content

    target = tmp_path / "target"
    builder = LibraryBuilder()
    builder.book(title="Walden", pages=352, publisher="Ticknor and Fields")
    builder.write(target)
    client = api_client(target, raise_server_exceptions=True)
    assert [book["publisher"] for book in _get(client)["books"]] == ["Ticknor and Fields"]

    assert post_restore(client, archive).status_code == 200
    assert library_bytes(target) == library_bytes(source)

    books = _get(client)["books"]
    assert [book["id"] for book in books] == [
        ids[k] for k in ("manning", "oreilly", "lower", "dune")
    ]
    assert [book["publisher"] for book in books] == PUBLISHERS


# --- The agent edit_book tool -----------------------------------------------------


def test_an_agent_publisher_edit_shows_in_the_next_list_catalog(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P2] AC-3 follow-up: edit_book, sent the Book's edit form with a padded publisher,
    # stores it trimmed, and the next list_catalog call carries the new value for that Book
    # only; the tool and the HTTP view still agree.
    folder = tmp_path / "library"
    ids = _seed(folder)
    client = connect_mcp(data_dir=folder)
    before = structured_of(client.call_tool("list_catalog"))
    assert [book["publisher"] for book in before["books"]] == PUBLISHERS

    form = structured_of(client.call_tool("get_book", {"bookId": ids["dune"]}))["editForm"]
    answer = client.call_tool(
        "edit_book", {**form, "bookId": ids["dune"], "publisher": "  Ace Books  "}
    )
    assert structured_of(answer) == {"ok": True}, text_of(answer)
    assert stored_book(folder, ids["dune"])["publisher"] == "Ace Books"

    after = structured_of(client.call_tool("list_catalog"))
    assert [book["publisher"] for book in after["books"]] == [*PUBLISHERS[:3], "Ace Books"]
    assert after == client.http.get(CATALOG_VIEW).json()
