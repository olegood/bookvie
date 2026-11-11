"""Story 6.2 See when my whole unread library will be finished: the catalog view's pace numbers (API, ATDD).

Two leaves for the criteria the server decides (PAC-API-001, R-10):

- AC-1: ``GET /api/views/catalog`` supplies the library-scope pages left: all
  pages of owned Books never started, plus the pages left in every active or
  paused Reading, re-reads included. Finished Books without an unfinished
  Reading aren't counted, and Side read marks change nothing (FR-15). The view
  also carries the library's Measured pace, for the calculator's prefill.
- AC-4: with Readings in every state, the total matches the rule exactly, and
  a Book with both a finished and an unfinished Reading counts once.

One automate leaf guards the sum's terms:

- P2: a Book read past its Pages adds 0, so its overshoot can't cancel another
  Book's pages left. The store refuses that state, so this leaf calls the views
  directly.

The calculator on Catalog (the collapsed "How long until…?" link, the
field, the result) is read in the browser
(``frontend/e2e/catalog-pace-calculator.spec.ts``). Its arithmetic and
formatting are Story 6.1's (``frontend/src/lib/pace.test.ts``).

The leaves pin these names: ``CatalogView.pagesLeft: int`` and
``CatalogView.measuredPace: number | null``, the same Measured pace as the book
view's (``bookvie.domain.pace.measured_pace``, sent unrounded). Library-scope
pages left is the sum of every Book's Book-scope pages left
(``bookvie.domain.progress.pages_left``), so the two scopes can't disagree.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.views.shelf import book_detail, catalog
from tests.builder import LibraryBuilder
from tests.helpers import api_client


def _catalog(client: TestClient) -> dict[str, object]:
    return client.get("/api/views/catalog").json()


def _finished(
    builder: LibraryBuilder, book: str, start: str | None, finish: str, pages: int
) -> None:
    """A finished Reading of ``pages`` pages from ``start`` (``None``: back-filled) to ``finish``."""
    builder.reading(
        book, start_date=start, finish_date=finish, finished_pages=pages, current_page=pages
    )


# --- AC-1: library-scope pages left and Measured pace --------------------------------


def test_ac1_p1_the_catalog_view_supplies_library_scope_pages_left_and_measured_pace(
    tmp_path: Path,
) -> None:
    """Dune never started (412), Emma finished (0, and Measured pace 20: 400
    pages from 1 to 20 September), Hyperion a Side read waiting at p.210 (272)."""

    def library(*, side_read: bool) -> LibraryBuilder:
        b = LibraryBuilder()
        b.book(title="Dune", pages=412)
        emma = b.book(title="Emma", pages=400)
        _finished(b, emma, "2026-09-01", "2026-09-20", 400)
        hyperion = b.book(title="Hyperion", pages=482)
        b.reading(hyperion, current_page=210)
        if side_read:
            b.side_read(hyperion)
        return b

    library(side_read=True).write(tmp_path / "marked")
    client = api_client(tmp_path / "marked", raise_server_exceptions=True)

    # 412 + 272; the finished Emma adds nothing.
    assert _catalog(client)["pagesLeft"] == 684

    # The Measured pace for the prefill, as on the book view.
    assert _catalog(client)["measuredPace"] == 20

    # The Side read mark changes nothing: the same library without it.
    library(side_read=False).write(tmp_path / "unmarked")
    unmarked = _catalog(api_client(tmp_path / "unmarked", raise_server_exceptions=True))
    assert unmarked["pagesLeft"] == 684

    # No finished Reading with a start date: no Measured pace, sent as null.
    no_pace = LibraryBuilder()
    no_pace.book(title="Dune", pages=412)
    no_pace.write(tmp_path / "no-pace")
    body = _catalog(api_client(tmp_path / "no-pace", raise_server_exceptions=True))
    assert body["measuredPace"] is None
    assert body["pagesLeft"] == 412

    # Nothing left to read: every Book finished, so 0.
    done = LibraryBuilder()
    emma = done.book(title="Emma", pages=400)
    _finished(done, emma, "2026-09-01", "2026-09-20", 400)
    done.write(tmp_path / "done")
    assert _catalog(api_client(tmp_path / "done", raise_server_exceptions=True))["pagesLeft"] == 0

    # A fractional pace is sent unrounded, the same value as the book view's:
    # 100 pages from 1 to 3 October (3 days inclusive) is 100/3.
    fractional = LibraryBuilder()
    dune = fractional.book(title="Dune", pages=412)
    fahrenheit = fractional.book(title="Fahrenheit 451", pages=100)
    _finished(fractional, fahrenheit, "2026-10-01", "2026-10-03", 100)
    fractional.write(tmp_path / "fractional")
    client = api_client(tmp_path / "fractional", raise_server_exceptions=True)
    pace = _catalog(client)["measuredPace"]
    assert pace == client.get("/api/views/book", params={"id": dune}).json()["measuredPace"]
    assert pace == pytest.approx(100 / 3)


# --- AC-4: every Reading state, no double counting -----------------------------------


def test_ac4_p1_library_pages_left_matches_the_rule_for_every_reading_state(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Measured pace is 20 (Emma). Each Book's expected pages left is in ``expected``."""
    b = library_builder
    expected: dict[str, int] = {}

    dune = b.book(title="Dune", pages=412)
    expected[dune] = 412  # never started: all its pages
    left_hand = b.book(title="The Left Hand of Darkness", pages=330)
    b.reading(left_hand, current_page=120)
    expected[left_hand] = 210  # the Main book, active at p.120
    neuromancer = b.book(title="Neuromancer", pages=271)
    b.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    expected[neuromancer] = 191  # paused at p.80
    emma = b.book(title="Emma", pages=400)
    _finished(b, emma, "2026-09-01", "2026-09-20", 400)
    expected[emma] = 0  # finished, no unfinished Reading
    omens = b.book(title="Good Omens", pages=300)
    _finished(b, omens, None, "2026-02-01", 300)
    expected[omens] = 0  # back-filled only
    # Back-filled, then re-read and paused at p.30: 70, not 100 + 70.
    kindred = b.book(title="Kindred", pages=100)
    _finished(b, kindred, None, "2025-06-01", 100)
    b.reading(kindred, current_page=30, paused_at="2026-10-15")
    expected[kindred] = 70
    # Back-filled, then a re-read paused at its first page: 310, not 620.
    hobbit = b.book(title="The Hobbit", pages=310)
    _finished(b, hobbit, None, "2024-12-01", 310)
    b.reading(hobbit, current_page=0, paused_at="2026-10-20")
    expected[hobbit] = 310
    hyperion = b.book(title="Hyperion", pages=482)
    b.reading(hyperion, current_page=210)
    expected[hyperion] = 272  # a Side read waiting at p.210
    # Up next, paused at p.45: a paused Up next Book counts its pages left like
    # every paused Reading (FR-15; Up next plays no part).
    piranesi = b.book(title="Piranesi", pages=245)
    b.reading(piranesi, current_page=45, paused_at="2026-10-25")
    expected[piranesi] = 200
    b.main(left_hand).up_next(piranesi).side_read(hyperion)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    # 412 + 210 + 191 + 0 + 0 + 70 + 310 + 272 + 200.
    assert _catalog(client)["pagesLeft"] == 1665

    # The library scope is the sum of the Book scopes: each Book's view agrees.
    for book_id, pages_left in expected.items():
        assert (
            client.get("/api/views/book", params={"id": book_id}).json()["pagesLeft"] == pages_left
        )
    assert sum(expected.values()) == 1665

    # A never-started Up next Book counts all its pages.
    never_started = LibraryBuilder()
    dune_next = never_started.book(title="Dune", pages=412)
    never_started.up_next(dune_next)
    never_started.write(tmp_path / "up-next")
    up_next = _catalog(api_client(tmp_path / "up-next", raise_server_exceptions=True))
    assert up_next["pagesLeft"] == 412


# --- automate: a Book read past its Pages adds 0 -------------------------------------


def test_p2_a_book_with_pages_edited_below_its_page_adds_0_to_library_pages_left(
    library_builder: LibraryBuilder,
) -> None:
    """Dune at p.450 of 412 Pages; Neuromancer paused at p.80 of 271 (191).

    Summing pages and current pages separately would give 683 - 530 = 153:
    Dune's 38-page overshoot would cancel real pages left. Each Book is clamped
    first, so the total is 191.

    The state can't be stored: editing Pages below the current page is refused
    (409 ``pages_below_current_page``) and loading checks
    ``reading_page_in_range``. So the views are called on the built library,
    as ``test_progress.py`` pins the Book-scope clamp.
    """
    b = library_builder
    dune = b.book(title="Dune", pages=412)
    b.reading(dune, current_page=450)
    neuromancer = b.book(title="Neuromancer", pages=271)
    b.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    library = b.build()

    assert catalog(library).pages_left == 191

    # The over-read Book's own view says 0, not -38.
    detail = book_detail(library, dune)
    assert detail is not None
    assert detail.pages_left == 0
