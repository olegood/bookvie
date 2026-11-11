"""Story 6.1 See when this book will be finished: the book view's pace numbers (API, ATDD).

One leaf for the criterion the server decides (PAC-API-001, R-10):

- AC-1: ``GET /api/views/book`` supplies the Book-scope pages left (the pages
  left in its current, active or paused, Reading, or all its pages when it
  has never been started; 0 when every Reading is finished) and the
  library's Measured pace, ``null`` when there is none (FR-15, AD-6).

And one shared table (PAC-UNIT-002): ``frontend/src/lib/pace.cases.json``,
which ``days_left`` here and the calculator's line in
``frontend/src/lib/pace.test.ts`` must both agree with.

The calculator itself (the field, its prefill, the result on every
keystroke, invalid input and "Nothing left to read.") is read in the browser
(``frontend/e2e/pace-calculator.spec.ts``), and the duration formatter's
edges are unit cases (``frontend/src/lib/pace.test.ts``).

The test pins these names: ``BookDetailView.pagesLeft: int`` and
``BookDetailView.measuredPace: number | null``, the same Measured pace as
``bookvie.domain.pace.measured_pace`` (exact, sent as a JSON number, not
rounded: the client rounds the prefill to one decimal).
"""

import json
from fractions import Fraction
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import days_left
from tests.builder import LibraryBuilder
from tests.helpers import api_client


def _book_view(client: TestClient, book_id: str) -> dict[str, object]:
    return client.get("/api/views/book", params={"id": book_id}).json()


def _finished(
    builder: LibraryBuilder, book: str, start: str | None, finish: str, pages: int
) -> None:
    """A finished Reading of ``pages`` pages from ``start`` (``None``: back-filled) to ``finish``."""
    builder.reading(
        book, start_date=start, finish_date=finish, finished_pages=pages, current_page=pages
    )


# --- AC-1: Book-scope pages left and Measured pace ----------------------------------


def test_ac1_p1_the_book_view_supplies_book_scope_pages_left_and_measured_pace(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Measured pace is 20 pages a day: Emma, 400 pages from 1 to 20 September
    (20 days inclusive), is the only finished Reading with a start date."""
    b = library_builder
    neuromancer = b.book(title="Neuromancer", pages=271)
    b.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    left_hand = b.book(title="The Left Hand of Darkness", pages=330)
    b.reading(left_hand, current_page=120)
    dune = b.book(title="Dune", pages=412)
    emma = b.book(title="Emma", pages=400)
    _finished(b, emma, "2026-09-01", "2026-09-20", 400)
    # Back-filled, then re-read and paused at p.30: only the re-read counts.
    kindred = b.book(title="Kindred", pages=100)
    _finished(b, kindred, None, "2025-06-01", 100)
    b.reading(kindred, current_page=30, paused_at="2026-10-15")
    omens = b.book(title="Good Omens", pages=300)
    _finished(b, omens, None, "2026-02-01", 300)
    hyperion = b.book(title="Hyperion", pages=482)
    b.reading(hyperion, current_page=210)
    b.main(left_hand).side_read(hyperion)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    # A paused Reading: 271 − 80.
    assert _book_view(client, neuromancer)["pagesLeft"] == 191

    pages_left = {
        "Main book, active at p.120 of 330": (left_hand, 210),
        "never started: all its pages": (dune, 412),
        "finished, no unfinished Reading": (emma, 0),
        "a paused re-read after a back-fill": (kindred, 70),
        "back-filled only": (omens, 0),
        "a Side read waiting at p.210": (hyperion, 272),
    }
    for case, (book_id, expected) in pages_left.items():
        assert _book_view(client, book_id)["pagesLeft"] == expected, case

    # The library's Measured pace, the same on every Book's view.
    for book_id in (neuromancer, left_hand, dune, emma, kindred, omens, hyperion):
        assert _book_view(client, book_id)["measuredPace"] == 20

    # Exact, not rounded on the server: 100 pages over 3 days.
    fractional = LibraryBuilder()
    piranesi = fractional.book(title="Piranesi", pages=245)
    _finished(fractional, piranesi, "2026-10-01", "2026-10-03", 100)
    fresh = fractional.book(title="Dune", pages=412)
    fractional.write(tmp_path / "fractional")
    body = _book_view(api_client(tmp_path / "fractional", raise_server_exceptions=True), fresh)
    assert body["measuredPace"] == pytest.approx(100 / 3)
    assert body["pagesLeft"] == 412

    # No finished Reading with a start date: no Measured pace, sent as null.
    no_pace = LibraryBuilder()
    alone = no_pace.book(title="Dune", pages=412)
    no_pace.write(tmp_path / "no-pace")
    body = _book_view(api_client(tmp_path / "no-pace", raise_server_exceptions=True), alone)
    assert body["measuredPace"] is None
    assert body["pagesLeft"] == 412


# --- PAC-UNIT-002: the client's days agree with the server's days left ----------------

PACE_CASES = Path(__file__).resolve().parents[2] / "frontend/src/lib/pace.cases.json"


@pytest.mark.skipif(not PACE_CASES.is_file(), reason="needs the frontend checkout")
def test_pac_unit_002_p2_days_left_agrees_with_the_pace_calculators_shared_cases() -> None:
    # The calculator rounds its own days in floats (AD-6); this table, which
    # src/lib/pace.test.ts also reads, keeps them from drifting off the
    # server's exact days left.
    cases = json.loads(PACE_CASES.read_text(encoding="utf-8"))["cases"]
    assert cases, "the shared table has no cases"
    for case in cases:
        typed = f"{case['pagesLeft']} @ {case['pace']}"
        assert days_left(case["pagesLeft"], Fraction(case["pace"])) == case["days"], typed


@pytest.mark.skipif(not PACE_CASES.is_file(), reason="needs the frontend checkout")
def test_e6_r1_p1_days_left_agrees_with_the_untouched_prefills_shared_cases() -> None:
    # Epic 6 retro item 55: while the calculator's field holds the prefill, its
    # line uses the Measured pace the view sends, so its days must be the
    # server's days left for that exact pace. src/lib/pace.test.ts reads the
    # same rows and gets the pace as the float the view serializes.
    cases = json.loads(PACE_CASES.read_text(encoding="utf-8"))["prefillCases"]
    assert cases, "the shared table has no prefill cases"
    for case in cases:
        pace = Fraction(case["measuredPace"])
        label = f"{case['pagesLeft']} @ {case['measuredPace']}"
        assert days_left(case["pagesLeft"], pace) == case["days"], label
