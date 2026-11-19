"""Story 12.4: ``get_book``'s ``editForm`` is what ``edit_book`` takes back.

``editForm`` is the Edit book panel's prefill (the client's ``toPanelFields``):
the 13 form fields as strings, with the user's own spine color only. Sending
it back to ``edit_book`` with the ``bookId`` commits the Book unchanged, so an
agent that follows ``edit_book``'s description changes only what it means to.
The seed and the forms are ``test_agent_write.py``'s. Every test runs with
``HOME`` set to a temporary folder (``conftest.py``).
"""

from collections.abc import Callable
from pathlib import Path

import pytest

from tests.agent_client import McpClient, text_of
from tests.builder import LibraryBuilder
from tests.helpers import library_bytes, stored_book, temp_files
from tests.test_agent_write import (
    FINISHED,
    FINISHED_FORM,
    FORM_KEYS,
    MAIN,
    MAIN_PAGES,
    PAUSED,
    SIDE1,
    SIDE2,
    SIDE3,
    UNREAD,
    UNREAD_COVER,
    UPNEXT,
    _seed,
)

DDIA_COVER = "covers/ddia.png"

# Every seeded Book: Main, Up next, paused, finished (a user color), unread, the Side reads.
SEEDED_BOOKS = [MAIN, UPNEXT, PAUSED, FINISHED, UNREAD, SIDE1, SIDE2, SIDE3]


@pytest.mark.parametrize("cover", [False, True], ids=["no-cover", "unread-has-cover"])
@pytest.mark.parametrize("book_id", SEEDED_BOOKS)
def test_get_books_edit_form_sent_back_to_edit_book_commits_the_book_unchanged(
    connect_mcp: Callable[..., McpClient], tmp_path: Path, book_id: str, cover: bool
) -> None:
    # [P0] AC-5. The description's flow: get_book, then edit_book with its editForm and bookId.
    folder = tmp_path / "library"
    _seed(folder, side_reads=3, cover=cover)
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)

    view = client.call_tool("get_book", {"bookId": book_id})["structuredContent"]
    form = view["editForm"]
    assert list(form) == FORM_KEYS, form
    assert all(isinstance(value, str) for value in form.values()), form
    # The HTTP view carries the same form.
    route_view = client.http.get("/api/views/book", params={"id": book_id}).json()
    assert route_view["editForm"] == form

    answer = client.call_tool("edit_book", {**form, "bookId": book_id})
    assert answer.get("isError") is not True, text_of(answer)
    assert answer["structuredContent"] == {"ok": True}
    assert library_bytes(folder) == before, book_id
    assert temp_files(folder) == []
    if cover and book_id == UNREAD:
        assert stored_book(folder, UNREAD)["coverFile"] == UNREAD_COVER


def test_edit_form_is_the_panels_prefill_as_strings(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-5. Lists joined, numbers as decimal strings, the latest finish date, and the
    # user's own spine color: never the resolved one a curated or cover color gives.
    folder = tmp_path / "library"
    _seed(folder, side_reads=2)
    client = connect_mcp(data_dir=folder)

    dune = client.call_tool("get_book", {"bookId": FINISHED})["structuredContent"]
    assert dune["editForm"] == {key: FINISHED_FORM[key] for key in FORM_KEYS}

    curated = client.call_tool("get_book", {"bookId": MAIN})["structuredContent"]
    assert curated["spineColorUser"] is None and curated["spineColor"] != "", curated
    assert curated["editForm"] == {
        "title": "Designing Data-Intensive Applications",
        "subtitle": "",
        "pages": str(MAIN_PAGES),
        "authors": "Author 1",
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


def test_edit_form_joins_several_authors_and_tags_and_round_trips_a_cover_colored_book(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    # [P0] AC-5. The separators edit_book splits on, the latest of two finishes, a later
    # edition, and a cover color that never becomes the user's own.
    folder = tmp_path / "library"
    builder = LibraryBuilder()
    book_id = builder.book(
        title="Designing Data-Intensive Applications",
        authors=["Martin Kleppmann", "Chris Riccomini"],
        edition=2,
        year=2025,
        tags=["databases", "distributed systems"],
        cover_file=DDIA_COVER,
        spine_color_from_cover="#335577",
    )
    builder.reading(book_id, start_date="2025-01-02", finish_date="2025-02-01", current_page=300)
    builder.reading(book_id, start_date="2025-06-01", finish_date="2025-07-15", current_page=300)
    builder.write(folder)
    (folder / DDIA_COVER).parent.mkdir(exist_ok=True)
    (folder / DDIA_COVER).write_bytes(b"\x89PNG\r\n\x1a\n a cover")
    client = connect_mcp(data_dir=folder)
    before = library_bytes(folder)

    view = client.call_tool("get_book", {"bookId": book_id})["structuredContent"]
    assert view["spineColor"] == "#335577" and view["spineColorUser"] is None, view
    form = view["editForm"]
    assert form["authors"] == "Martin Kleppmann; Chris Riccomini", form
    assert form["tags"] == "databases, distributed systems", form
    assert (form["edition"], form["year"]) == ("2", "2025"), form
    assert form["finishedOn"] == "2025-07-15", form
    assert form["spineColor"] == "", form

    answer = client.call_tool("edit_book", {**form, "bookId": book_id})
    assert answer["structuredContent"] == {"ok": True}, text_of(answer)
    assert library_bytes(folder) == before
