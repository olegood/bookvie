"""Story 3.4 See where I left off and how long is left: Measured pace and days left (ATDD).

The ATDD tests, for the criteria whose promise lives on the server
(numbered in the order of epics.md, Story 3.4):

- AC-1: ``domain`` Measured pace = total ``finishedPages`` of finished
  Readings with a start date ÷ Σ(finishDate − startDate + 1). Back-filled
  Readings are excluded, a same-day start and finish counts 1 day, and with no
  qualifying Reading there is no Measured pace (AR16, PAC-UNIT-001).
- AC-2: the home view supplies the Main book's days left =
  ceil(pages left ÷ Measured pace), at least 1, and ``null`` when there is no
  Measured pace, when it is 0, or when no pages are left (FR-11, R-10,
  PRG-UNIT-001).

The re-entry line itself, its placement, the last page and the tab left open
past midnight are read in the browser (``frontend/e2e/reentry.spec.ts``).

The tests pin these names:

- ``bookvie.domain.pace.measured_pace(library) -> Fraction | None`` and
  ``bookvie.domain.pace.days_left(pages_left, pace) -> int | None``, both
  re-exported from ``bookvie.domain``. Pace is exact (a ``Fraction``), so the
  ceiling never meets a float rounding error. It reads no clock: every input
  is a stored date (``tests/test_clock.py`` already keeps ``domain/`` off the
  system clock).
- ``HomeMainBook.daysLeft: int | null`` and
  ``HomeMainBook.lastProgressUpdate: <ISO timestamp> | null`` in
  ``GET /api/views/home``. The client formats "~N days left" and
  "Last updated …"; it computes neither number.

The imports from ``bookvie.domain.pace`` sit inside the tests, so this module
collects before the module exists.
"""

from fractions import Fraction
from pathlib import Path

from bookvie.views import home
from tests.builder import LibraryBuilder
from tests.helpers import api_client

EARLIER = "2026-10-25T21:00:00+01:00"
"""The Main book's seeded ``lastProgressUpdate``."""


def _finished(
    builder: LibraryBuilder, book: str, start: str | None, finish: str, pages: int
) -> None:
    """A finished Reading of ``pages`` pages from ``start`` (``None``: back-filled) to ``finish``."""
    builder.reading(
        book,
        start_date=start,
        finish_date=finish,
        finished_pages=pages,
        current_page=pages,
    )


def _paced_library(main_page: int = 151) -> LibraryBuilder:
    """The Left Hand of Darkness as the Main book at ``main_page`` of 330, plus finished Readings.

    Measured pace is 900 pages over 31 days:

    - Emma, 400 pages from 2026-09-01 to 2026-09-20: 20 days, inclusive.
    - Kindred, 100 pages started and finished on 2026-09-25: 1 day.
    - Emma again (a re-read), 400 pages from 2026-10-01 to 2026-10-10: 10 days.
    - Dune, back-filled (no start date), 412 pages: excluded.

    Emma's Book now says 420 pages: pace uses the stored ``finishedPages``.
    """
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    builder.reading(
        left_hand,
        start_date="2026-10-11",
        current_page=main_page,
        last_progress_update=EARLIER,
    )
    builder.main(left_hand)
    emma = builder.book(title="Emma", authors=["Jane Austen"], pages=420)
    _finished(builder, emma, "2026-09-01", "2026-09-20", 400)
    _finished(builder, emma, "2026-10-01", "2026-10-10", 400)
    kindred = builder.book(title="Kindred", authors=["Octavia E. Butler"], pages=100)
    _finished(builder, kindred, "2026-09-25", "2026-09-25", 100)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    _finished(builder, dune, None, "2025-06-01", 412)
    return builder


# --- AC-1: Measured pace -----------------------------------------------------------


def test_ac1_p1_measured_pace_is_pages_over_inclusive_days_without_back_fills() -> None:
    from bookvie.domain.pace import measured_pace

    # The criterion: (400 + 100 + 400) pages over (20 + 1 + 10) days. The
    # back-filled Dune and the unfinished Main Reading play no part.
    assert measured_pace(_paced_library().build()) == Fraction(900, 31)

    # A same-day start and finish counts 1 day, never 0.
    same_day = LibraryBuilder()
    kindred = same_day.book(title="Kindred", pages=100)
    _finished(same_day, kindred, "2026-09-25", "2026-09-25", 100)
    assert measured_pace(same_day.build()) == Fraction(100, 1)

    # Days are local calendar dates: across the DST change (last Sunday of
    # October) 2026-10-24 to 2026-10-26 is 3 days.
    across_dst = LibraryBuilder()
    emma = across_dst.book(title="Emma", pages=90)
    _finished(across_dst, emma, "2026-10-24", "2026-10-26", 90)
    assert measured_pace(across_dst.build()) == Fraction(30, 1)

    # No qualifying Reading, no Measured pace: an empty library, only
    # back-filled Readings, only unfinished ones.
    assert measured_pace(LibraryBuilder().build()) is None
    back_filled = LibraryBuilder()
    dune = back_filled.book(title="Dune", pages=412)
    _finished(back_filled, dune, None, "2025-06-01", 412)
    assert measured_pace(back_filled.build()) is None
    unfinished = LibraryBuilder()
    left_hand = unfinished.book(title="The Left Hand of Darkness", pages=330)
    unfinished.reading(left_hand, start_date="2026-10-01", current_page=150)
    unfinished.main(left_hand)
    assert measured_pace(unfinished.build()) is None

    # A qualifying Reading of 0 pages is a Measured pace of 0, not "none".
    zero = LibraryBuilder()
    pamphlet = zero.book(title="A pamphlet", pages=12)
    _finished(zero, pamphlet, "2026-09-01", "2026-09-02", 0)
    assert measured_pace(zero.build()) == Fraction(0)


# --- AC-2: days left in the home view ----------------------------------------------


def test_ac2_p1_the_home_view_supplies_days_left_rounded_up_and_null_when_it_cant_be_said(
    tmp_path: Path,
) -> None:
    _paced_library(main_page=151).write(tmp_path)

    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()

    # The criterion: 179 pages left at 900/31 pages a day is 6.16… days, so 7.
    assert (body.get("mainBook") or {}).get("daysLeft") == 7

    # The client needs the moment, not a count, for "Last updated" (local days).
    assert body["mainBook"]["lastProgressUpdate"] == EARLIER

    from bookvie.domain.pace import days_left

    # ceil, never round or floor; at least 1; nothing to say without pace or pages.
    pace = Fraction(900, 31)
    assert days_left(179, pace) == 7
    assert days_left(29, pace) == 1  # 0.99…
    assert days_left(30, pace) == 2  # 1.03…
    assert days_left(1, Fraction(1000)) == 1  # the minimum
    assert days_left(0, pace) is None
    assert days_left(179, None) is None
    assert days_left(179, Fraction(0)) is None

    # The view, case by case.
    def view_days_left(builder: LibraryBuilder) -> int | None:
        main_book = home(builder.build()).main_book
        assert main_book is not None
        return main_book.days_left

    assert view_days_left(_paced_library(main_page=329)) == 1  # 1 page left
    assert view_days_left(_paced_library(main_page=330)) is None  # no pages left
    assert view_days_left(_paced_library(main_page=0)) == 12  # 330 × 31 ÷ 900 = 11.36…

    no_pace = LibraryBuilder()
    left_hand = no_pace.book(title="The Left Hand of Darkness", pages=330)
    no_pace.reading(left_hand, start_date="2026-10-11", current_page=151)
    no_pace.main(left_hand)
    assert view_days_left(no_pace) is None

    zero = LibraryBuilder()
    left_hand = zero.book(title="The Left Hand of Darkness", pages=330)
    zero.reading(left_hand, start_date="2026-10-11", current_page=151)
    zero.main(left_hand)
    pamphlet = zero.book(title="A pamphlet", pages=12)
    _finished(zero, pamphlet, "2026-09-01", "2026-09-02", 0)
    assert view_days_left(zero) is None


# --- Follow-ups: the defaults the spec settles -------------------------------------


def test_ac1_p1_measured_pace_skips_a_reading_finished_before_it_started() -> None:
    from bookvie.domain.pace import measured_pace

    # Impossible through the app (finish validation); hand-edited data must not
    # make the day sum 0 or negative.
    builder = LibraryBuilder()
    emma = builder.book(title="Emma", pages=400)
    _finished(builder, emma, "2026-09-20", "2026-09-01", 400)
    assert measured_pace(builder.build()) is None

    kindred = builder.book(title="Kindred", pages=100)
    _finished(builder, kindred, "2026-09-25", "2026-09-26", 100)
    assert measured_pace(builder.build()) == Fraction(50)


def test_ac1_p1_measured_pace_counts_a_missing_finished_pages_as_zero() -> None:
    from bookvie.domain.pace import measured_pace

    builder = LibraryBuilder()
    emma = builder.book(title="Emma", pages=400)
    builder.reading(
        emma,
        start_date="2026-09-01",
        finish_date="2026-09-04",
        finished_pages=None,
        current_page=400,
    )
    kindred = builder.book(title="Kindred", pages=100)
    _finished(builder, kindred, "2026-09-25", "2026-09-25", 100)
    # 100 pages over 4 + 1 days.
    assert measured_pace(builder.build()) == Fraction(20)


def test_ac2_p1_the_home_view_says_no_last_progress_update_as_null(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    left_hand = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(left_hand, start_date="2026-10-11", current_page=151, last_progress_update=None)
    builder.main(left_hand)
    # Emma, 400 pages over 20 days: Measured pace 20 a day, so days left still shows.
    emma = builder.book(title="Emma", pages=400)
    _finished(builder, emma, "2026-09-01", "2026-09-20", 400)
    builder.write(tmp_path)

    main_book = api_client(tmp_path).get("/api/views/home").json()["mainBook"]

    assert main_book["lastProgressUpdate"] is None
    # 179 pages left at 20 a day: 8.95, so 9. A null update hides only "Last updated".
    assert main_book["daysLeft"] == 9


def test_ac1_p1_the_main_book_s_earlier_finished_reading_counts_toward_pace() -> None:
    from bookvie.domain.pace import measured_pace

    # The Main book read once before (330 pages over 10 days), now read again from p.0.
    builder = LibraryBuilder()
    left_hand = builder.book(title="The Left Hand of Darkness", pages=330)
    _finished(builder, left_hand, "2026-09-01", "2026-09-10", 330)
    builder.reading(left_hand, start_date="2026-10-11", current_page=0)
    builder.main(left_hand)
    emma = builder.book(title="Emma", pages=400)
    _finished(builder, emma, "2026-10-01", "2026-10-10", 400)
    library = builder.build()

    # (330 + 400) pages over (10 + 10) days; without the Main book it would be 40.
    assert measured_pace(library) == Fraction(730, 20)
    main_book = home(library).main_book
    assert main_book is not None
    # 330 pages left: 9.04… at the combined pace, so 10 (8.25, so 9, without it).
    assert main_book.days_left == 10


def test_ac2_p1_days_left_is_exact_when_pages_left_divide_evenly_by_pace() -> None:
    from bookvie.domain.pace import days_left, measured_pace

    # A whole quotient is that many days, not one more: ceil, not floor + 1.
    assert days_left(180, Fraction(20)) == 9
    assert days_left(900, Fraction(900, 31)) == 31

    # 260 pages at 52 pages over 3 days is exactly 15 days, but float division
    # gives 15.000000000000002 and so 16; the arithmetic must stay exact.
    pace = Fraction(52, 3)
    assert 260 / float(pace) > 15  # the trap is real
    assert days_left(260, pace) == 15

    # The same through the home view: 52 pages over 3 days, 260 of 330 left.
    builder = LibraryBuilder()
    left_hand = builder.book(title="The Left Hand of Darkness", pages=330)
    builder.reading(left_hand, start_date="2026-10-11", current_page=70)
    builder.main(left_hand)
    kindred = builder.book(title="Kindred", pages=52)
    _finished(builder, kindred, "2026-09-01", "2026-09-03", 52)
    library = builder.build()
    assert measured_pace(library) == pace
    main_book = home(library).main_book
    assert main_book is not None
    assert main_book.days_left == 15
