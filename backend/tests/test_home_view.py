"""Story 3.1 See my Main book on Home: the ``home`` view's Main book (ATDD).

What Home shows (the card, the gauge, the empty states, the date header) is
read in the browser (``frontend/e2e/home.spec.ts``). This module holds the one
promise that lives on the server: the percentage (AC-6, AD-6, PRG-UNIT-001).

AC-6: the home view supplies the Main book's percentage, computed only on the
server as ``floor(page * 100 / pages)``, so it reads 100 only at the last page.
"""

from pathlib import Path

from bookvie.views import home
from tests.builder import LibraryBuilder
from tests.helpers import api_client


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
