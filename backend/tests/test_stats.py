"""Story 6.3 See what I finished in any period: the stats view's totals (API, ATDD).

The criteria the server decides (STA-API-001, R-10):

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

Then the edges: month and year boundaries, the DST Sundays, a Book finished
twice in one range, a missing ``finishedPages``, the bucket choice, and each
422 ``invalid_fields`` a bad query gets.
"""

import json
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.views import stats
from tests.builder import LibraryBuilder
from tests.helpers import EDIT_BOOK, api_client

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


# --- AC-7: month and year edges, and the DST Sundays ----------------------------------


@pytest.mark.parametrize(
    ("finish", "inside", "outside"),
    [
        # The last day of March and the first of April.
        ("2026-03-31", ("2026-03-01", "2026-03-31"), ("2026-04-01", "2026-04-30")),
        ("2026-04-01", ("2026-04-01", "2026-04-30"), ("2026-03-01", "2026-03-31")),
        # 31 December and 1 January.
        ("2025-12-31", ("2025-01-01", "2025-12-31"), ("2026-01-01", "2026-12-31")),
        ("2026-01-01", ("2026-01-01", "2026-12-31"), ("2025-01-01", "2025-12-31")),
        # The DST Sundays in Madrid: the last Sundays of March and October.
        ("2026-03-29", ("2026-03-01", "2026-03-31"), ("2026-04-01", "2026-04-30")),
        ("2026-10-25", ("2026-10-01", "2026-10-31"), ("2026-11-01", "2026-11-30")),
    ],
)
def test_ac7_p0_a_finish_on_an_edge_counts_in_its_own_month_and_year(
    tmp_path: Path,
    library_builder: LibraryBuilder,
    finish: str,
    inside: tuple[str, str],
    outside: tuple[str, str],
) -> None:
    b = library_builder
    book = b.book(title="Edge", pages=250)
    _finished(b, book, None, finish, 250)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    shown_inside = _stats(client, *inside)
    shown_outside = _stats(client, *outside)
    assert (shown_inside["books"], shown_inside["pages"]) == (1, 250)
    assert (shown_outside["books"], shown_outside["pages"]) == (0, 0)


def test_ac7_p1_a_single_day_range_counts_that_day(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    b = library_builder
    book = b.book(title="Neuromancer", pages=271)
    _finished(b, book, "2026-12-15", "2027-01-01", 271)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    assert _stats(client, "2027-01-01", "2027-01-01")["books"] == 1
    assert _stats(client, "2026-12-31", "2026-12-31")["books"] == 0


# --- AC-4: re-reads, missing finishedPages, an empty library --------------------------


def test_ac4_p1_a_book_finished_twice_in_one_range_counts_twice(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    b = library_builder
    kindred = b.book(title="Kindred", pages=100)
    _finished(b, kindred, "2026-02-01", "2026-02-10", 100)
    _finished(b, kindred, "2026-05-01", "2026-05-10", 100)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    this_year = _stats(client, "2026-01-01", "2026-12-31")
    assert this_year["books"] == 2
    assert this_year["pages"] == 200


def test_ac4_p1_a_finish_without_finished_pages_counts_as_zero_pages(
    library_builder: LibraryBuilder,
) -> None:
    """``finishedPages`` ``None`` is a book and 0 pages (the view, not the store)."""
    b = library_builder
    emma = b.book(title="Emma", pages=400)
    b.reading(emma, finish_date="2026-09-20", finished_pages=None, current_page=400)
    dune = b.book(title="Dune", pages=412)
    _finished(b, dune, None, "2026-09-25", 412)

    view = stats(b.build(), date(2026, 9, 1), date(2026, 9, 30))
    assert (view.books, view.pages) == (2, 412)


def test_ac4_p2_a_side_read_books_earlier_finish_still_counts(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Side read marks change nothing: a re-read Side read keeps its earlier finish."""
    b = library_builder
    kindred = b.book(title="Kindred", pages=300)
    _finished(b, kindred, "2026-05-01", "2026-05-10", 300)
    b.reading(kindred, start_date="2026-10-01", current_page=120)  # the current re-read
    b.side_read(kindred)
    emma = b.book(title="Emma", pages=400)
    _finished(b, emma, "2026-09-01", "2026-09-20", 400)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    this_year = _stats(client, "2026-01-01", "2026-12-31")
    # Kindred's May finish and Emma's: 300 + 400.
    assert (this_year["books"], this_year["pages"]) == (2, 700)
    all_time = _stats(client)
    assert (all_time["books"], all_time["pages"]) == (2, 700)


def test_ac5_p1_all_time_with_nothing_finished_is_zero_month_and_no_buckets(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    b = library_builder
    hyperion = b.book(title="Hyperion", pages=482)
    b.reading(hyperion, current_page=210)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    assert _stats(client) == {"books": 0, "pages": 0, "bucket": "month", "buckets": []}


# --- The bucket choice (AD-6): more than 24 calendar months is "year" -----------------


@pytest.mark.parametrize(
    ("start", "end", "bucket"),
    [
        ("2024-01-01", "2025-12-31", "month"),  # 24 months
        ("2024-01-01", "2026-01-01", "year"),  # 25 months
        ("2026-10-28", "2026-10-28", "month"),  # one day
        ("2024-01-31", "2025-12-01", "month"),  # 24 months touched, partly
    ],
)
def test_p1_the_bucket_is_year_past_24_calendar_months(
    tmp_path: Path, library_builder: LibraryBuilder, start: str, end: str, bucket: str
) -> None:
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    body = _stats(client, start, end)
    assert body["bucket"] == bucket
    assert body["buckets"] == []


@pytest.mark.parametrize(
    ("first", "last", "bucket"),
    [
        ("2024-01-15", "2025-12-02", "month"),  # 24 months
        ("2024-01-15", "2026-01-02", "year"),  # 25 months
    ],
)
def test_p1_all_time_spans_the_earliest_finish_to_the_latest(
    tmp_path: Path, library_builder: LibraryBuilder, first: str, last: str, bucket: str
) -> None:
    b = library_builder
    _finished(b, b.book(title="Dune", pages=412), None, first, 412)
    _finished(b, b.book(title="Emma", pages=400), None, last, 400)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    assert _stats(client)["bucket"] == bucket


# --- A bad query: 422 invalid_fields naming the field ---------------------------------


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"from": "2026-01-01"}, "to"),
        ({"to": "2026-01-01"}, "from"),
        ({"from": "2026-13-01", "to": "2026-12-31"}, "from"),
        ({"from": "2026-01-01", "to": "someday"}, "to"),
        # Lax dates: a datetime and a Unix timestamp aren't YYYY-MM-DD.
        ({"from": "2026-01-01T00:00:00", "to": "2026-12-31"}, "from"),
        ({"from": "2026-01-01", "to": "86400"}, "to"),
        ({"from": "2026-10-28", "to": "2026-10-27"}, "to"),
    ],
)
def test_p1_a_bad_query_is_422_invalid_fields_naming_the_field(
    tmp_path: Path, library_builder: LibraryBuilder, params: dict[str, str], field: str
) -> None:
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = client.get("/api/views/stats", params=params)
    assert response.status_code == 422
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "invalid_fields")
    assert [f["field"] for f in error["fields"]] == [field]


# --- Story 6.4 See my reading month by month: the buckets (ATDD, red phase) -----------
#
# The bucket contents the server owns (AD-6, FR-16). ``period`` is ``YYYY-MM`` for a
# month bucket and ``YYYY`` for a year bucket, oldest first, one per calendar month
# (or year) the range touches, empty ones included. Each bucket counts only the
# finishes inside the range, and all of a Reading's ``finishedPages`` land in its
# finish month. The chart, its table and the instant update are read in the browser
# (``frontend/e2e/stats.spec.ts``).

RED = "Story 6.4 red phase: the stats view doesn't fill buckets yet"


@pytest.mark.skip(reason=RED)
def test_ac1_p0_a_range_gets_one_bucket_per_month_counting_only_finishes_inside_it(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """15 March to 31 May 2026: three month buckets, and March counts from the 15th."""
    b = library_builder
    _finished(b, b.book(title="Dune", pages=412), None, "2026-03-10", 412)  # before the range
    _finished(b, b.book(title="Emma", pages=400), "2026-03-01", "2026-03-20", 400)
    _finished(b, b.book(title="Kindred", pages=286), "2026-04-20", "2026-05-02", 286)
    _finished(b, b.book(title="Beloved", pages=324), None, "2026-06-01", 324)  # after it
    old = b.book(title="Good Omens", pages=300)
    _finished(b, old, None, "2024-02-14", 300)
    _finished(b, old, None, "2026-01-05", 300)  # a re-read, back-filled
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    spring = _stats(client, "2026-03-15", "2026-05-31")
    # The criterion: one bucket per calendar month the range touches, oldest first.
    assert [bucket["period"] for bucket in spring["buckets"]] == ["2026-03", "2026-04", "2026-05"]
    assert spring["bucket"] == "month"
    # March from the 15th: Emma, not Dune's back-fill on the 10th. April is empty.
    assert spring["buckets"] == [
        {"period": "2026-03", "books": 1, "pages": 400},
        {"period": "2026-04", "books": 0, "pages": 0},
        {"period": "2026-05", "books": 1, "pages": 286},
    ]

    # Over 24 months: one bucket per year, still counting only finishes inside the range.
    years = _stats(client, "2024-03-01", "2026-03-15")
    assert years["bucket"] == "year"
    assert years["buckets"] == [
        {"period": "2024", "books": 0, "pages": 0},  # Good Omens' February 2024 is outside
        {"period": "2025", "books": 0, "pages": 0},
        {"period": "2026", "books": 2, "pages": 712},  # the January re-read and Dune
    ]


@pytest.mark.skip(reason=RED)
def test_ac3_p1_a_900_page_book_finished_on_2_december_is_900_pages_in_december(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Read from 20 October to 2 December 2025: no pages spread over October or November."""
    b = library_builder
    tome = b.book(title="The Tome", pages=900)
    _finished(b, tome, "2025-10-20", "2025-12-02", 900)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    year = _stats(client, "2025-01-01", "2025-12-31")
    by_period = {bucket["period"]: bucket for bucket in year["buckets"]}
    # The criterion: every page in the finish month.
    assert by_period["2025-12"]["pages"] == 900
    assert by_period["2025-12"]["books"] == 1
    assert [bucket["pages"] for bucket in year["buckets"]] == [0] * 11 + [900]
    assert [bucket["period"] for bucket in year["buckets"]] == [
        f"2025-{m:02d}" for m in range(1, 13)
    ]
