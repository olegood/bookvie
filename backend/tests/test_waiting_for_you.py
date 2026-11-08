"""Story 4.2 See every paused book in Waiting for you: the home view's list (ATDD).

The ATDD tests, for the criteria whose promise lives on the server (numbered
in the order of epics.md, Story 4.2):

- AC-1: the home view lists every paused Reading except the Up next Book's,
  oldest ``pausedAt`` first, with no cap (FR-7, AD-6); same-day pauses order
  by the server title key, then by Book id.
- AC-4: a library written under the Epic 3 behavior (Story 3.2: the
  interrupted Main book paused, Up next untouched) lists its paused Book in
  Waiting for you, and ``check_invariants()`` holds.

The pane (AC-2), its hiding (AC-3), many rows (AC-5), **Resume** from a row
(AC-6) and the Up next exclusion as Home shows it (AC-7) are read in the
browser (``frontend/e2e/waiting-for-you.spec.ts``).

The tests pin these names:

- ``HomeView.waiting`` (``waiting`` on the wire): a list, empty when nothing
  is waiting. Each entry carries ``id``, ``title``, ``pages``,
  ``currentPage`` and ``percent`` (``floor(currentPage × 100 ÷ pages)``,
  AD-6). It never carries ``pausedAt``: the date orders the list and is never
  shown (UX-DR38, NFR6).
- "Paused" is ``reading_status() == "paused"`` (AD-19): the current,
  unfinished Reading of a Book that isn't Main. A Side read and a finished
  Book's paused re-read count; the Up next Book never does.
"""

from pathlib import Path

import pytest

from bookvie.views import home
from tests.builder import LibraryBuilder
from tests.helpers import TODAY, api_client, assert_invariants, library_bytes

RED = "Story 4.2 red phase: the home view has no Waiting for you yet"
SAME_DAY = TODAY.isoformat()
"""The one fake day the same-day pauses share (``api_client``'s today)."""

# Fixed ids where the order depends on them: "Émile" and "Emile" share a title
# key, so the id decides, and the accented one sorts first only by id.
EMILE_ACCENTED_ID = "a1000000-0000-4000-8000-000000000001"
EMILE_PLAIN_ID = "b2000000-0000-4000-8000-000000000002"


def _waiting(view) -> list[dict] | None:
    """The home view's ``waiting`` as the wire carries it; ``None`` when absent."""
    return view.model_dump(by_alias=True, mode="json").get("waiting")


def _ids(entries: list[dict] | None) -> list[str] | None:
    return None if entries is None else [entry["id"] for entry in entries]


def _paused(builder: LibraryBuilder, title: str, paused_at: str, **book: object) -> str:
    """A Book whose current Reading is paused at p.40 since ``paused_at``."""
    book_id = builder.book(title=title, **book)
    builder.reading(book_id, current_page=40, paused_at=paused_at)
    return book_id


# --- AC-1: every paused Reading but Up next's, oldest first, ties fixed --------


@pytest.mark.skip(reason=RED)
def test_ac1_p0_the_home_view_lists_every_paused_reading_except_up_next_oldest_first_with_fixed_ties() -> (
    None
):
    builder = LibraryBuilder()
    # Added out of order, so library order can't pass for the server's order.
    zazie = _paused(builder, "Zazie dans le métro", SAME_DAY)
    emile_plain = _paused(builder, "Emile", SAME_DAY, id=EMILE_PLAIN_ID)
    emile_accented = _paused(builder, "Émile", SAME_DAY, id=EMILE_ACCENTED_ID)
    anna = _paused(builder, "anna karenina", SAME_DAY)
    left_hand = _paused(builder, "The Left Hand of Darkness", "2026-10-05", pages=330)
    # A Side read that is paused is waiting too.
    kindred = _paused(builder, "Kindred", "2026-10-20")
    builder.side_read(kindred)
    # A finished Book whose re-read is paused (Book states: "Finished, re-read paused").
    solaris = builder.book(title="Solaris")
    builder.reading(solaris, current_page=204, finish_date="2026-03-01", finished_pages=204)
    builder.reading(solaris, current_page=60, paused_at="2026-10-12")
    # The Up next Book, paused before all of them: listed only in Up next.
    dune = _paused(builder, "Dune", "2026-10-01", pages=412)
    builder.up_next(dune)
    # The Main book keeps an old `pausedAt` from an earlier pause (never cleared): not waiting.
    fahrenheit = builder.book(title="Fahrenheit 451", pages=187)
    builder.reading(fahrenheit, current_page=120, paused_at="2026-09-01")
    builder.main(fahrenheit)
    # Never started, and finished with no Reading in progress: not waiting.
    builder.book(title="Emma")
    neuromancer = builder.book(title="Neuromancer")
    builder.reading(neuromancer, current_page=271, finish_date="2026-05-01", finished_pages=271)
    library = builder.build()

    waiting = _waiting(home(library))

    # The criterion: oldest `pausedAt` first; on one day by title key
    # ("anna" < "emile" = "émile" < "zazie"), then by Book id; Up next left out.
    assert _ids(waiting) == [
        left_hand,
        solaris,
        kindred,
        anna,
        emile_accented,
        emile_plain,
        zazie,
    ]

    # Each entry is the row's data, without the date (UX-DR38, NFR6).
    assert waiting is not None
    first = waiting[0]
    assert {key: first[key] for key in ("title", "pages", "currentPage", "percent")} == {
        "title": "The Left Hand of Darkness",
        "pages": 330,
        "currentPage": 40,
        "percent": 12,
    }
    assert all("pausedAt" not in entry for entry in waiting)
    assert dune not in _ids(waiting)

    # The same on every render, and independent of library order.
    assert _waiting(home(library)) == waiting
    reordered = library.model_copy(update={"books": list(reversed(library.books))})
    assert _waiting(home(reordered)) == waiting

    # No cap: 30 paused Books, 30 entries.
    many = LibraryBuilder()
    ids = [_paused(many, f"Paused {n:02d}", f"2026-09-{n:02d}") for n in range(1, 31)]
    assert _ids(_waiting(home(many.build()))) == ids


# --- AC-4: a library written under the Epic 3 behavior -------------------------


@pytest.mark.skip(reason=RED)
def test_ac4_p0_a_book_paused_under_epic_3_is_listed_in_waiting_for_you_and_invariants_hold(
    tmp_path: Path,
) -> None:
    # As Story 3.2 left it: Dune was interrupted by a start, so its Reading is
    # paused with `pausedAt`, and Up next was never set.
    builder = LibraryBuilder()
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=330
    )
    builder.reading(left_hand, start_date="2026-10-21", current_page=212)
    builder.main(left_hand)
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(
        dune,
        start_date="2026-10-01",
        current_page=120,
        purpose="Reread for the ecology of Arrakis",
        last_progress_update="2026-10-19T21:00:00+02:00",
        paused_at="2026-10-20",
    )
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()

    # The criterion: Dune is in Waiting for you.
    assert _ids(body.get("waiting")) == [dune]

    (entry,) = body["waiting"]
    assert {key: entry[key] for key in ("title", "pages", "currentPage", "percent")} == {
        "title": "Dune",
        "pages": 412,
        "currentPage": 120,
        "percent": 29,
    }
    assert "pausedAt" not in entry
    assert body["upNext"] is None
    # Its spine and Book detail agree that it is waiting, so it offers Resume.
    (shelf,) = [book for book in body["books"] if book["id"] == dune]
    assert (shelf["role"], shelf["waitingPage"]) == ("waiting", 120)
    detail = api_client(tmp_path).get("/api/views/book", params={"id": dune}).json()
    assert detail["currentReading"]["status"] == "waiting"
    # Reading the view changed nothing, and the library still holds every invariant.
    assert library_bytes(tmp_path) == before
    assert_invariants(tmp_path)
