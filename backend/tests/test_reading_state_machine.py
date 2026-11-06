"""RDG-UNIT-002 (R-01): random intent sequences keep the reading plan sound.

A Hypothesis state machine drives ``start-reading``, ``edit-purpose``,
``update-page``, ``finish-reading`` and ``delete-book`` (with days passing in between) over a small library that
starts with a Book in each state: never started, finished, paused, and Main.
After every step:

- a refusal is the one a simple model predicts (``book_not_found``,
  ``already_main``, ``reading_already_finished``, ``not_main_book``,
  ``invalid_fields`` for a page out of range, a Finished on date in the
  future or before the start, or Purpose fulfilled sent for a Reading with no
  Purpose) and leaves ``library.json``
  byte-for-byte unchanged;
- an accepted intent changed exactly what its contract says and nothing else
  (the paused Main book, the resumed or appended Reading, the one Purpose,
  the Main book's page and ``lastProgressUpdate``, the finished Reading and
  the cleared Main book);
- ``check_invariants()`` holds, each Book has at most one unfinished Reading,
  and the file on disk reads back as the committed library;
- the views agree: only ``mainBookId`` is ``main``, ``waiting`` is exactly the
  paused Books (Up next is Epic 4, so none here), and Home's Main book is the
  Main book's current Reading.

Later intents (pause, Up next, Side reads) join the
machine as they land.
"""

import json
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any

from hypothesis import HealthCheck, settings
from hypothesis import strategies as st
from hypothesis.stateful import RuleBasedStateMachine, initialize, invariant, rule

from bookvie.domain import FakeClock, Library, check_invariants, normalize_purpose
from bookvie.intents import IntentError
from bookvie.intents.delete_book import delete_book, parse_delete_book_intent
from bookvie.intents.edit_purpose import edit_purpose, parse_edit_purpose_intent
from bookvie.intents.finish_reading import finish_reading, parse_finish_reading_intent
from bookvie.intents.start_reading import parse_start_reading_intent, start_reading
from bookvie.intents.update_page import parse_update_page_intent, update_page
from bookvie.store import Store
from bookvie.views import catalog, home
from tests.builder import LibraryBuilder
from tests.helpers import TODAY

GONE_ID = "00000000-0000-4000-8000-000000000000"

_purposes = (
    st.none()
    | st.sampled_from(["", "   ", "  x  ", "Why Arrakis"])
    | st.text(max_size=8)
)
_pages = st.integers(min_value=-2, max_value=415)
"""A page sent by the page field: in range for some Books, out of range for others."""
_finish_offsets = st.integers(min_value=-200, max_value=2)
"""Finished on, in days from today: the past (maybe before the start), today, or the future."""
_answers = st.sampled_from([None, "yes", "partly", "notYet"])
_ratings = st.none() | st.integers(min_value=1, max_value=5)
_slots = st.integers(min_value=0, max_value=4)
"""Which Book an intent names: the four seeded Books, or 4 for one that never existed."""


def _seed(data_dir: Path) -> list[str]:
    """Dune never started, Emma finished, Neuromancer paused at p.50, Fahrenheit 451 Main at p.120."""
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=412)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(
        emma, current_page=400, finish_date="2026-04-10", finished_pages=400, rating=4
    )
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(
        neuromancer, current_page=50, purpose="Cyberspace", paused_at="2026-10-01"
    )
    fahrenheit = builder.book(title="Fahrenheit 451", pages=187)
    builder.reading(fahrenheit, current_page=120)
    builder.main(fahrenheit)
    builder.write(data_dir)
    return [dune, emma, neuromancer, fahrenheit]


def _books(library: Library) -> dict[str, dict[str, Any]]:
    """Every Book as stored JSON, by id: a snapshot no later commit can touch."""
    doc = library.model_dump(mode="json", by_alias=True)
    return {book["id"]: book for book in doc["books"]}


def _current(book: dict[str, Any]) -> dict[str, Any] | None:
    unfinished = [r for r in book["readings"] if r["finishDate"] is None]
    return unfinished[0] if unfinished else None


def _intent(
    book_id: str, purpose: str | None = None, *, with_purpose: bool = True
) -> str:
    return json.dumps(
        {"bookId": book_id, "purpose": purpose} if with_purpose else {"bookId": book_id}
    )


class ReadingPlan(RuleBasedStateMachine):
    """The library as a sequence of reading intents sees it."""

    @initialize()
    def seed(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.data_dir = Path(self._tmp.name)
        self.ids = _seed(self.data_dir)
        self.store = Store.open(self.data_dir)
        self.today = TODAY

    def teardown(self) -> None:
        tmp = getattr(self, "_tmp", None)
        if tmp is not None:
            tmp.cleanup()

    # --- helpers ---------------------------------------------------------------

    def _book_id(self, slot: int) -> str:
        return self.ids[slot] if slot < len(self.ids) else GONE_ID

    def _bytes(self) -> bytes:
        return (self.data_dir / "library.json").read_bytes()

    def _send(self, run, expected_code: str | None) -> bool:
        """Run the intent; check a refusal is ``expected_code`` and changed nothing."""
        before = self._bytes()
        try:
            run()
        except IntentError as exc:
            assert exc.body.code == expected_code, (exc.body.code, expected_code)
            assert self._bytes() == before
            return False
        assert expected_code is None, (
            f"expected {expected_code}, the intent was accepted"
        )
        return True

    # --- rules -----------------------------------------------------------------

    @rule(slot=_slots, purpose=_purposes)
    def start(self, slot: int, purpose: str | None) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        old_main = library.main_book_id
        if book_id not in before:
            expected = "book_not_found"
        elif book_id == old_main:
            expected = "already_main"
        else:
            expected = None
        clock = FakeClock(self.today)
        intent = parse_start_reading_intent(_intent(book_id, purpose))
        if not self._send(lambda: start_reading(self.store, clock, intent), expected):
            return

        after = _books(self.store.library)
        assert self.store.library.main_book_id == book_id
        assert after.keys() == before.keys()
        # The previous Main book's Reading pauses today at its page; nothing else of it moves.
        if old_main is not None:
            paused = _current(before[old_main])
            assert paused is not None
            expected_main = {
                **before[old_main],
                "readings": [
                    {**r, "pausedAt": self.today.isoformat()}
                    if r["id"] == paused["id"]
                    else r
                    for r in before[old_main]["readings"]
                ],
            }
            assert after[old_main] == expected_main
        # The Book resumes its paused Reading, or appends a new one; history stays.
        was, now = before[book_id]["readings"], after[book_id]["readings"]
        resumed = _current(before[book_id])
        stamp = clock.now().isoformat()
        stored_purpose = normalize_purpose(purpose)
        if resumed is not None:
            assert now == [
                {**r, "lastProgressUpdate": stamp, "purpose": stored_purpose}
                if r["id"] == resumed["id"]
                else r
                for r in was
            ]
        else:
            assert now[:-1] == was
            new = now[-1]
            assert new["id"] not in {r["id"] for r in was}
            assert {k: v for k, v in new.items() if k != "id"} == {
                "startDate": self.today.isoformat(),
                "currentPage": 0,
                "purpose": stored_purpose,
                "lastProgressUpdate": stamp,
                "pausedAt": None,
                "finishDate": None,
                "finishedPages": None,
                "purposeFulfilled": None,
                "rating": None,
            }
        for other in before.keys() - {book_id, old_main}:
            assert after[other] == before[other], other

    @rule(slot=_slots, purpose=_purposes)
    def edit(self, slot: int, purpose: str | None) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        if book_id not in before:
            expected = "book_not_found"
        elif _current(before[book_id]) is None:
            expected = "reading_already_finished"
        else:
            expected = None
        intent = parse_edit_purpose_intent(_intent(book_id, purpose))
        if not self._send(lambda: edit_purpose(self.store, intent), expected):
            return

        after = _books(self.store.library)
        current = _current(before[book_id])
        assert current is not None
        expected_book = {
            **before[book_id],
            "readings": [
                {**r, "purpose": normalize_purpose(purpose)}
                if r["id"] == current["id"]
                else r
                for r in before[book_id]["readings"]
            ],
        }
        assert after == {**before, book_id: expected_book}
        assert self.store.library.main_book_id == library.main_book_id

    @rule(slot=_slots, page=_pages)
    def update(self, slot: int, page: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        if book_id not in before:
            expected = "book_not_found"
        elif book_id != library.main_book_id:
            expected = "not_main_book"
        elif not 0 <= page <= before[book_id]["pages"]:
            expected = "invalid_fields"
        else:
            expected = None
        clock = FakeClock(self.today)
        intent = parse_update_page_intent(json.dumps({"bookId": book_id, "page": page}))
        reached: list[bool] = []
        if not self._send(lambda: reached.append(update_page(self.store, clock, intent)), expected):
            return

        after = _books(self.store.library)
        current = _current(before[book_id])
        assert current is not None
        expected_book = {
            **before[book_id],
            "readings": [
                {**r, "currentPage": page, "lastProgressUpdate": clock.now().isoformat()}
                if r["id"] == current["id"]
                else r
                for r in before[book_id]["readings"]
            ],
        }
        # The last page never finishes the Reading; only the page and the stamp move.
        assert after == {**before, book_id: expected_book}
        assert self.store.library.main_book_id == book_id
        assert reached == [page == before[book_id]["pages"]]

    @rule(slot=_slots, offset=_finish_offsets, answer=_answers, rating=_ratings)
    def finish(self, slot: int, offset: int, answer: str | None, rating: int | None) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        old_main = library.main_book_id
        finished_on = self.today + timedelta(days=offset)
        current = _current(before[book_id]) if book_id in before else None
        if book_id not in before:
            expected = "book_not_found"
        elif current is None:
            expected = "reading_already_finished"
        elif finished_on > self.today or (
            current["startDate"] is not None
            and finished_on.isoformat() < current["startDate"]
        ):
            expected = "invalid_fields"
        elif answer is not None and current["purpose"] is None:
            expected = "invalid_fields"
        else:
            expected = None
        clock = FakeClock(self.today)
        intent = parse_finish_reading_intent(
            json.dumps(
                {
                    "bookId": book_id,
                    "finishedOn": finished_on.isoformat(),
                    "purposeFulfilled": answer,
                    "rating": rating,
                }
            )
        )
        if not self._send(lambda: finish_reading(self.store, clock, intent), expected):
            return

        after = _books(self.store.library)
        assert current is not None
        expected_book = {
            **before[book_id],
            "readings": [
                {
                    **r,
                    "finishDate": finished_on.isoformat(),
                    "finishedPages": before[book_id]["pages"],
                    "purposeFulfilled": answer,
                    "rating": rating,
                }
                if r["id"] == current["id"]
                else r
                for r in before[book_id]["readings"]
            ],
        }
        # Only the current Reading is finished; history and other Books stay.
        assert after == {**before, book_id: expected_book}
        assert self.store.library.main_book_id == (None if old_main == book_id else old_main)

    @rule(slot=_slots)
    def delete(self, slot: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        old_main = library.main_book_id
        expected = None if book_id in before else "book_not_found"
        intent = parse_delete_book_intent(_intent(book_id, with_purpose=False))
        if not self._send(lambda: delete_book(self.store, intent), expected):
            return

        after = _books(self.store.library)
        assert after == {k: v for k, v in before.items() if k != book_id}
        # Nothing is promoted into a vacated Main book (CAT-API-007).
        assert self.store.library.main_book_id == (
            None if old_main == book_id else old_main
        )

    @rule(days=st.integers(min_value=1, max_value=3))
    def days_pass(self, days: int) -> None:
        self.today = self.today + timedelta(days=days)

    # --- invariants ------------------------------------------------------------

    @invariant()
    def library_rules_hold(self) -> None:
        library = self.store.library
        check_invariants(library)
        for book in library.books:
            assert sum(1 for r in book.readings if not r.finished) <= 1, book.title
        # What is on disk is what was committed.
        assert Library.model_validate_json(self._bytes()) == library

    @invariant()
    def views_agree_with_the_pointers(self) -> None:
        library = self.store.library
        assert library.up_next_book_id is None and library.side_read_book_ids == []
        stored = _books(library)
        main = library.main_book_id
        for shelf in catalog(library).books:
            current = _current(stored[shelf.id])
            if shelf.id == main:
                assert shelf.role == "main"
            elif current is not None:
                # Waiting = paused minus Up next (AD-19); Up next is Epic 4's.
                assert shelf.role == "waiting", shelf.title
                assert shelf.waiting_page == current["currentPage"]
            else:
                assert shelf.role is None, shelf.title
        card = home(library).main_book
        if main is None:
            assert card is None
        else:
            current = _current(stored[main])
            assert card is not None and current is not None
            assert (card.id, card.current_page) == (main, current["currentPage"])


ReadingPlan.TestCase.settings = settings(
    max_examples=60,
    stateful_step_count=25,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow],
)
test_reading_plan_holds_under_random_intent_sequences = ReadingPlan.TestCase


def test_the_seed_covers_every_starting_state(tmp_path: Path) -> None:
    """The machine starts from never started, finished, paused and Main (RDG-API-001's rows)."""
    dune, emma, neuromancer, fahrenheit = _seed(tmp_path)
    roles = {
        b.id: (b.role, b.finished) for b in catalog(Store.open(tmp_path).library).books
    }
    assert roles == {
        dune: (None, False),
        emma: (None, True),
        neuromancer: ("waiting", False),
        fahrenheit: ("main", False),
    }
