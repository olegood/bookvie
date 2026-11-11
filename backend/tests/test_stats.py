"""Story 6.3 See what I finished in any period: the stats view's totals (API, ATDD).

Two skipped leaves for the criteria the server decides (STA-API-001, R-10):

- AC-4: ``GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`` (both inclusive
  local dates) counts the finished Readings in the range and sums their
  ``finishedPages``: each finish by its local ``finishDate``, back-filled
  Readings in their Finished on period, and re-reads again (FR-16, AD-11).
  Without a query it is All time, which starts at the earliest finish,
  back-fills included. Unfinished and Side read Readings add nothing.
- AC-6: once a finished Book's Pages is edited, the totals don't move, because
  they sum the stored ``finishedPages``, not the Book's Pages.

The range picker, its presets, the two big numbers and the empty states are
read in the browser (``frontend/e2e/stats.spec.ts``). The buckets' contents
are Story 6.4's; these leaves don't pin them.

The leaves pin these names: the route ``GET /api/views/stats`` with the query
parameters ``from`` and ``to``, and the response's ``books: int`` and
``pages: int`` (AD-6's ``{ books, pages, bucket, buckets }``).

Activate a leaf by deleting its ``@pytest.mark.skip(reason=RED)`` line.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.builder import LibraryBuilder
from tests.helpers import EDIT_BOOK, api_client

RED = "ATDD red phase (Story 6.3): there is no stats view at /api/views/stats yet"

# Emma as the builder seeds it, and as the Edit book panel prefills it (Finished on
# is the latest finish, unchanged).
EMMA = {
    "title": "Emma",
    "authors": ["Jane Austen"],
    "pages": 400,
    "language": "English",
    "publisher": "Penguin Classics",
}
EMMA_FORM = {
    "title": "Emma",
    "subtitle": "",
    "pages": "400",
    "authors": "Jane Austen",
    "edition": "1",
    "language": "English",
    "publisher": "Penguin Classics",
    "type": "paperback",
    "isbn": "",
    "year": "",
    "finishedOn": "2026-09-20",
    "tags": "",
    "spineColor": "",
}


def _stats(
    client: TestClient, start: str | None = None, end: str | None = None
) -> dict[str, object]:
    """The stats view from ``start`` to ``end``, both inclusive; All time without them."""
    params = {} if start is None else {"from": start, "to": end}
    return client.get("/api/views/stats", params=params).json()


def _finished(
    builder: LibraryBuilder, book: str, start: str | None, finish: str, pages: int
) -> None:
    """A finished Reading of ``pages`` pages from ``start`` (``None``: back-filled) to ``finish``."""
    builder.reading(
        book, start_date=start, finish_date=finish, finished_pages=pages, current_page=pages
    )


# --- AC-4: finishes counted by their local finishDate ---------------------------------


@pytest.mark.skip(reason=RED)
def test_ac4_p0_stats_count_finished_readings_and_their_finished_pages_in_the_range(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Five finishes over four Books, plus a Side read and a paused Reading that add nothing."""
    b = library_builder
    emma = b.book(title="Emma", pages=400)
    _finished(b, emma, "2026-09-01", "2026-09-20", 400)
    dune = b.book(title="Dune", pages=412)
    _finished(b, dune, None, "2026-03-15", 412)  # back-filled, in 2026
    kindred = b.book(title="Kindred", pages=100)
    _finished(b, kindred, None, "2025-06-01", 100)  # back-filled, in 2025
    _finished(b, kindred, "2026-10-01", "2026-10-10", 100)  # re-read, in 2026
    omens = b.book(title="Good Omens", pages=300)
    _finished(b, omens, None, "2019-08-14", 300)  # back-filled, the earliest finish
    hyperion = b.book(title="Hyperion", pages=482)
    b.reading(hyperion, current_page=210)
    neuromancer = b.book(title="Neuromancer", pages=271)
    b.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    b.side_read(hyperion)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    this_year = _stats(client, "2026-01-01", "2026-10-28")
    # Emma, Dune's back-fill and Kindred's re-read; not Kindred's 2025 back-fill.
    assert this_year["books"] == 3
    # 400 + 412 + 100.
    assert this_year["pages"] == 912

    # All time: every finish, back-fills and both of Kindred's included.
    all_time = _stats(client)
    assert all_time["books"] == 5
    # 400 + 412 + 100 + 100 + 300.
    assert all_time["pages"] == 1312


# --- AC-6: the stored finishedPages, not the Book's Pages ----------------------------


@pytest.mark.skip(reason=RED)
def test_ac6_p1_editing_pages_after_a_finish_leaves_the_stats_unchanged(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Emma, 400 pages, finished 1 to 20 September 2026; then Pages goes to 450."""
    b = library_builder
    emma = b.book(**EMMA)
    _finished(b, emma, "2026-09-01", "2026-09-20", 400)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    # Setup, unasserted: edit-book as the Edit book panel sends it, with only Pages changed.
    intent = {"bookId": emma, **EMMA_FORM, "pages": "450"}
    client.post(EDIT_BOOK, files={"intent": (None, json.dumps(intent), "application/json")})

    september = _stats(client, "2026-09-01", "2026-09-30")
    # The stored finishedPages (400), not the edited Pages (450).
    assert september["pages"] == 400
    assert september["books"] == 1
