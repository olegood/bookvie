"""Story 4.6 See each book's state on the shelf and its page: the Book states table (RDG-API-001..003).

One test per row of EXPERIENCE.md's Book states table (without the Side-read
rows, which are Story 4.7's), each seeded with ``LibraryBuilder`` and read
through the view routes:

- the catalog view: the Book's ``role``, ``finished``, ``currentPage``,
  ``percent`` and ``waitingPage``, from which the client names the spine and
  draws its marker;
- the home view: whether the Book is the Main book card's, the Up next pane's
  (and whether that Up next is ``paused``), or listed in Waiting for you;
- the book view: its ``role`` and its Current reading's ``status``.

The spine names, markers, popover actions and Book detail stacks the client
derives from these fields are read in the browser
(``frontend/e2e/book-states.spec.ts``).

The Book under test is The Left Hand of Darkness, 330 pages: p.212 is 64%,
p.120 is 36%, p.40 is 12%. Every row but the Main ones has Dune as the Main
book, so Home shows its Up next pane.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import pytest

from tests.builder import LibraryBuilder
from tests.helpers import api_client, assert_invariants

PAGES = 330

Pointer = Literal["main", "upNext"] | None
Pane = Literal["main", "upNext", "waiting"] | None


@dataclass(frozen=True)
class Row:
    """One row of the Book states table: the seed and what the views say."""

    finished: bool
    """A finished Reading before any current one."""
    page: int | None
    """The unfinished Reading's page; ``None`` for no Reading in progress."""
    pointer: Pointer
    """``mainBookId`` or ``upNextBookId`` names the Book."""
    role: Literal["main", "upNext", "waiting"] | None
    percent: int | None
    pane: Pane
    up_next_paused: bool | None = None
    """For ``pane == "upNext"``: Home's ``upNext.paused``."""


ROWS = {
    "never read, no Reading": Row(False, None, None, role=None, percent=None, pane=None),
    "never read, Up next": Row(
        False, None, "upNext", role="upNext", percent=None, pane="upNext", up_next_paused=False
    ),
    "never read, Main": Row(False, 212, "main", role="main", percent=64, pane="main"),
    "never read, paused": Row(False, 120, None, role="waiting", percent=36, pane="waiting"),
    "never read, paused, Up next": Row(
        False, 120, "upNext", role="upNext", percent=36, pane="upNext", up_next_paused=True
    ),
    "finished, no Reading": Row(True, None, None, role=None, percent=None, pane=None),
    "finished, Up next": Row(
        True, None, "upNext", role="upNext", percent=None, pane="upNext", up_next_paused=False
    ),
    "finished, re-reading Main": Row(True, 40, "main", role="main", percent=12, pane="main"),
    "finished, re-read paused": Row(True, 40, None, role="waiting", percent=12, pane="waiting"),
    "finished, re-read paused, Up next": Row(
        True, 40, "upNext", role="upNext", percent=12, pane="upNext", up_next_paused=True
    ),
}


def _seed(data_dir: Path, row: Row) -> str:
    """The library of ``row``: the Book under test, plus Dune as Main unless the Book is."""
    builder = LibraryBuilder()
    book = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=PAGES
    )
    if row.finished:
        builder.reading(
            book,
            start_date=None,
            current_page=PAGES,
            finish_date="2026-03-20",
            finished_pages=PAGES,
        )
    if row.page is not None:
        paused_at = None if row.pointer == "main" else "2026-10-05"
        builder.reading(book, start_date="2026-09-20", current_page=row.page, paused_at=paused_at)
    if row.pointer == "main":
        builder.main(book)
    else:
        dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
        builder.reading(dune, start_date="2026-10-01", current_page=100)
        builder.main(dune)
    if row.pointer == "upNext":
        builder.up_next(book)
    builder.write(data_dir)
    return book


def _views(data_dir: Path, book_id: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    client = api_client(data_dir, raise_server_exceptions=True)
    catalog = client.get("/api/views/catalog").json()
    (shelf_book,) = [book for book in catalog["books"] if book["id"] == book_id]
    home = client.get("/api/views/home").json()
    detail = client.get("/api/views/book", params={"id": book_id}).json()
    return shelf_book, home, detail


@pytest.mark.parametrize("row", ROWS.values(), ids=ROWS.keys())
def test_p0_every_book_state_reads_the_same_on_the_shelf_home_and_book_detail(
    tmp_path: Path, row: Row
) -> None:
    book_id = _seed(tmp_path, row)
    shelf_book, home, detail = _views(tmp_path, book_id)

    # Catalog: what the spine's name and marker are built from.
    assert {
        key: shelf_book[key]
        for key in ("role", "finished", "currentPage", "percent", "waitingPage")
    } == {
        "role": row.role,
        "finished": row.finished,
        "currentPage": row.page,
        "percent": row.percent,
        "waitingPage": row.page if row.role == "waiting" else None,
    }

    # Home: the one pane the Book shows in, if any ("Up next only": never also waiting).
    panes = set()
    if home["mainBook"] is not None and home["mainBook"]["id"] == book_id:
        panes.add("main")
    if home["upNext"] is not None and home["upNext"]["id"] == book_id:
        panes.add("upNext")
        assert home["upNext"]["paused"] is row.up_next_paused
    if any(entry["id"] == book_id for entry in home["waiting"]):
        panes.add("waiting")
    assert panes == ({row.pane} if row.pane is not None else set())

    # Book detail: the role and the Current reading block the action stack reads.
    assert detail["role"] == row.role
    assert detail["finished"] is row.finished
    assert detail["waitingPage"] == (row.page if row.role == "waiting" else None)
    if row.page is None:
        assert detail["currentReading"] is None
    else:
        assert detail["currentReading"]["status"] == row.role
        assert detail["currentReading"]["currentPage"] == row.page
        assert detail["currentReading"]["percent"] == row.percent

    # The seed is a valid library.
    assert_invariants(tmp_path)
