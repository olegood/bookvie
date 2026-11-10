"""Story 3.1 See my Main book on Home: the ``home`` view's Main book (ATDD).

What Home shows (the card, the gauge, the empty states, the date header) is
read in the browser (``frontend/e2e/home.spec.ts``). This module holds the one
promise that lives on the server: the percentage (AC-6, AD-6, PRG-UNIT-001).

AC-6: the home view supplies the Main book's percentage, computed only on the
server as ``floor(page * 100 / pages)``, so it reads 100 only at the last page.
"""

import json
from pathlib import Path

from bookvie.views import home
from tests.builder import LibraryBuilder
from tests.helpers import ADD_CARD_NOTE, DELETE_CARD_NOTE, api_client


def _main_at(page: int, pages: int) -> LibraryBuilder:
    builder = LibraryBuilder()
    book = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=pages
    )
    builder.reading(book, current_page=page)
    builder.main(book)
    return builder


def test_ac6_p0_the_home_view_supplies_the_main_book_percentage_floored_on_the_server(
    tmp_path: Path,
) -> None:
    _main_at(212, 330).write(tmp_path)

    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()

    # The criterion: 212 of 330 is 64.24…%, and the server says 64.
    assert (body.get("mainBook") or {}).get("percent") == 64
    assert body["mainBook"]["currentPage"] == 212
    assert body["mainBook"]["pages"] == 330

    # floor, never round: 100 only at the last page, 0 only at page 0.
    cases = [
        (0, 330, 0),
        (1, 330, 0),  # 0.30…
        (165, 330, 50),
        (329, 330, 99),  # 99.69…: rounding would say 100 a page early
        (330, 330, 100),
        (2, 3, 66),  # 66.66…
        (1, 1, 100),
    ]
    for page, pages, expected in cases:
        main_book = home(_main_at(page, pages).build()).main_book
        assert main_book is not None, (page, pages)
        assert main_book.percent == expected, (page, pages)


def test_the_home_view_counts_the_main_books_card_notes(tmp_path: Path) -> None:
    """``cardNoteCount`` is 0 without notes and N with them ("See card notes · N", Story 5.3)."""
    builder = _main_at(212, 330)
    builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    assert client.get("/api/views/home").json()["mainBook"]["cardNoteCount"] == 0

    builder = LibraryBuilder()
    book = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(book, current_page=212)
    builder.main(book)
    for page in (12, 42, 151):
        builder.card_note(book, page_start=page)
    other = builder.book(title="Dune")
    builder.card_note(other, page_start=5)  # another Book's note doesn't count
    builder.write(tmp_path / "with-notes")
    client = api_client(tmp_path / "with-notes", raise_server_exceptions=True)
    assert client.get("/api/views/home").json()["mainBook"]["cardNoteCount"] == 3


def test_the_home_view_card_note_count_follows_add_and_delete(tmp_path: Path) -> None:
    """[P2] ``cardNoteCount`` rises on ``add-card-note`` and drops on ``delete-card-note`` (Story 5.3 AC-4)."""
    builder = LibraryBuilder()
    book = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(book, current_page=212)
    builder.main(book)
    builder.card_note(book, page_start=12)
    doomed = builder.card_note(book, page_start=42)
    builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    assert client.get("/api/views/home").json()["mainBook"]["cardNoteCount"] == 2

    intent = json.dumps({"bookId": book, "text": "Ice.", "page": "151"})
    added = client.post(ADD_CARD_NOTE, files={"intent": (None, intent, "application/json")})
    assert added.status_code == 200
    assert client.get("/api/views/home").json()["mainBook"]["cardNoteCount"] == 3

    intent = json.dumps({"bookId": book, "cardNoteId": doomed})
    deleted = client.post(DELETE_CARD_NOTE, files={"intent": (None, intent, "application/json")})
    assert deleted.status_code == 200
    assert client.get("/api/views/home").json()["mainBook"]["cardNoteCount"] == 2
