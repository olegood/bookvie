"""Story 3.5 See my reading on Home's shelf: the slice priority (ATDD).

The ATDD test for the criterion whose promise lives on the server (numbered
in the order of epics.md, Story 3.5):

- AC-1: the home view supplies the slice priority: the Main book, then the
  Up next Book (when one exists), then Books by most recent finish, newest
  first (AD-6, UX-DR31, PRG-API-003).

Packing the bookcase into rows, choosing up to 3 of them, their display
order, the Main spine's fill and the slice header are read in the browser
(``frontend/e2e/home-slice.spec.ts``).

The test pins this name:

- ``HomeView.slicePriority: list[str]`` in ``GET /api/views/home``: Book ids,
  each at most once, in priority order. The Main book first, then Up next,
  then every other Book with a finished Reading by its latest ``finishDate``,
  newest first; ties by the server's title ordering key, then Book id
  (ARCHITECTURE-SPINE "Title ordering"). A Book that is Main or Up next and
  also finished appears once, at its role's place. A Book with no finished
  Reading and no role is not listed. Back-filled finishes count: they have a
  ``finishDate``. The client turns the ids into rows; it never sorts finishes.
"""

from pathlib import Path

import pytest

from bookvie.views import home
from tests.builder import LibraryBuilder
from tests.helpers import api_client

RED = "ATDD red phase: Story 3.5 slice priority is not implemented yet"


def _finish(
    builder: LibraryBuilder, book: str, on: str, start: str | None = "2026-01-02"
) -> None:
    """A finished Reading of ``book`` on ``on`` (``start`` ``None``: back-filled)."""
    builder.reading(
        book, start_date=start, finish_date=on, finished_pages=300, current_page=300
    )


@pytest.mark.skip(reason=RED)
def test_ac1_p1_the_home_view_supplies_main_then_up_next_then_most_recent_finishes(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    # The Main book is a re-read: finished once, then started again.
    left_hand = builder.book(
        title="The Left Hand of Darkness", authors=["Ursula K. Le Guin"], pages=300
    )
    _finish(builder, left_hand, "2026-05-01", start="2026-04-01")
    builder.reading(left_hand, start_date="2026-10-11", current_page=36)
    builder.main(left_hand)
    # Up next, finished more recently than anything else: listed once, as Up next.
    kindred = builder.book(title="Kindred", authors=["Octavia E. Butler"], pages=300)
    _finish(builder, kindred, "2026-10-25")
    builder.up_next(kindred)
    # The finishes, out of order on purpose.
    middlemarch = builder.book(title="Middlemarch", authors=["George Eliot"], pages=300)
    _finish(builder, middlemarch, "2026-09-01")
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=300)
    _finish(builder, dune, "2026-10-20", start=None)  # back-filled: still a finish
    emma = builder.book(title="Emma", authors=["Jane Austen"], pages=300)
    _finish(builder, emma, "2026-09-20", start="2026-09-01")
    _finish(builder, emma, "2026-10-10", start="2026-10-01")  # its latest finish counts
    beloved = builder.book(title="Beloved", authors=["Toni Morrison"], pages=300)
    _finish(builder, beloved, "2026-09-15")
    austerlitz = builder.book(title="Austerlitz", authors=["W. G. Sebald"], pages=300)
    _finish(builder, austerlitz, "2026-09-15")  # same day as Beloved: by title
    # Neither finished nor in a role: not listed.
    builder.book(title="Never Read", authors=["Nobody"], pages=300)
    paused = builder.book(title="Paused Book", authors=["Someone"], pages=300)
    builder.reading(
        paused, start_date="2026-09-01", current_page=40, paused_at="2026-10-11"
    )
    builder.write(tmp_path)

    body = (
        api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()
    )

    # The criterion: Main, Up next, then finishes newest first.
    assert body.get("slicePriority") == [
        left_hand,
        kindred,
        dune,  # 2026-10-20
        emma,  # 2026-10-10
        austerlitz,  # 2026-09-15, "Austerlitz" before "Beloved"
        beloved,  # 2026-09-15
        middlemarch,  # 2026-09-01
    ]

    # Without a Main book, Up next leads; without either, finishes alone.
    builder.main(None)
    no_main = home(builder.build()).slice_priority
    assert no_main == [kindred, dune, emma, austerlitz, beloved, middlemarch, left_hand]
    builder.up_next(None)
    assert home(builder.build()).slice_priority == [
        kindred,
        dune,
        emma,
        austerlitz,
        beloved,
        middlemarch,
        left_hand,
    ]

    # A library with only a Main book (and none at all) still answers.
    only_main = LibraryBuilder()
    solo = only_main.book(title="Solo", pages=200)
    only_main.reading(solo, start_date="2026-10-01", current_page=10)
    only_main.main(solo)
    assert home(only_main.build()).slice_priority == [solo]
    assert home(LibraryBuilder().build()).slice_priority == []
