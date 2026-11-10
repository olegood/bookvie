"""RDG-UNIT-002 (R-01): random intent sequences keep the reading plan sound.

A Hypothesis state machine drives ``start-reading``, ``pause``, ``set-up-next``,
``edit-purpose``, ``update-page``, ``finish-reading``, ``delete-book``,
``mark-side-read``, ``unmark-side-read``, ``add-book`` and ``edit-book``
(Pages and Finished on; epic 4 retro item 36) with days passing in between,
over a small library that starts with a Book in each state: never started,
finished, paused (and a Side read), and Main, and gains up to two Books.
After every step:

- a refusal is the one a simple model predicts (``book_not_found``,
  ``already_main``, ``reading_already_finished``, ``not_main_book`` (for
  ``update-page`` and ``pause``), ``main_cannot_be_up_next``,
  ``main_cannot_be_side_read``, ``side_reads_full``, ``invalid_fields`` for
  a page out of range (update-page, or a start's "Which page?"), a start of
  a Side read without a page, a Finished on date in the
  future or before the start (or, in edit-book, a new one after the current
  Reading's start), Purpose fulfilled sent for a Reading with no
  Purpose, and ``pages_below_current_page``) and leaves ``library.json``
  byte-for-byte unchanged;
- an accepted intent changed exactly what its contract says and nothing else
  (the paused Main book, the resumed or appended Reading, the one Purpose,
  the Main book's page and ``lastProgressUpdate``, the finished Reading and
  the cleared Main book, the paused Main book's ``pausedAt``), and Up next
  moved as a model of FR-7 predicts: after a start it is the interrupted Main
  book, ``None`` when the started Book was Up next with no Main book, and
  unchanged otherwise; after a pause or a set-up-next it is that Book, and
  set-up-next changes no Book; a set-up-next for the current Up next writes
  nothing (AD-9); a finish clears it when it names the finished Book (and
  takes that Book out of the Side reads), a finish of a Book with no Readings
  back-fills one Reading with no start date and no Purpose, and a delete of
  the Up next Book clears it (Stories 4.1, 4.3, 4.4, 4.5); a mark appends
  the Book to the Side reads and an unmark removes it, changing no Book or
  other pointer, and either writes nothing when it is already so; a start,
  a finish and a delete take the Book out of the Side reads (Story 4.7);
  an add appends one Book (with a back-fill when it has a Finished on) and
  moves no pointer; an edit changes only Pages and the latest finished
  Reading's date, or back-fills one, and a back-fill on a Book with no
  Readings takes it out of the Side reads;
- ``check_invariants()`` holds, each Book has at most one unfinished Reading,
  and the file on disk reads back as the committed library;
- no page is lost (R-01): a ledger of every Reading's page, set when the
  machine seeds the library, when a start appends a Reading (p.0, or the
  sent "Which page?") or resumes one at a sent page, when an accepted
  update-page moves it, and when a finish (or its back-fill, or an add's or
  an edit's) settles it, and pruned when a Book is deleted, matches every surviving Reading's
  ``currentPage``; and at most one catalog Book has ``role == "main"``;
- the views agree: only ``mainBookId`` is ``main``, only ``upNextBookId`` is
  ``upNext``, ``waiting`` is exactly the paused Books minus Up next (on each
  spine and as Home's Waiting for you list, ordered by ``pausedAt``, then
  title key, then id), Home's Main book is the Main book's current Reading,
  and Home's Up next is the Up next Book, ``paused`` when it has a current
  Reading; ``sideReadBookIds`` is the model's Side reads, each shelf Book's
  ``sideRead`` says whether it is one, and Home's On the side lists them in
  order.
"""

import json
import tempfile
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from hypothesis import HealthCheck, settings
from hypothesis import strategies as st
from hypothesis.stateful import RuleBasedStateMachine, initialize, invariant, rule

from bookvie.domain import (
    MAX_SIDE_READS,
    FakeClock,
    Library,
    check_invariants,
    normalize_purpose,
    title_key,
)
from bookvie.intents import IntentError
from bookvie.intents.add_book import add_book, parse_add_book_intent
from bookvie.intents.delete_book import delete_book, parse_delete_book_intent
from bookvie.intents.edit_book import edit_book, parse_edit_book_intent
from bookvie.intents.edit_purpose import edit_purpose, parse_edit_purpose_intent
from bookvie.intents.finish_reading import finish_reading, parse_finish_reading_intent
from bookvie.intents.pause import parse_pause_intent, pause
from bookvie.intents.set_up_next import parse_set_up_next_intent, set_up_next
from bookvie.intents.side_reads import (
    mark_side_read,
    parse_mark_side_read_intent,
    parse_unmark_side_read_intent,
    unmark_side_read,
)
from bookvie.intents.start_reading import parse_start_reading_intent, start_reading
from bookvie.intents.update_page import parse_update_page_intent, update_page
from bookvie.store import Store
from bookvie.views import book_detail, catalog, home
from tests.builder import LibraryBuilder
from tests.helpers import TODAY

GONE_ID = "00000000-0000-4000-8000-000000000000"

_purposes = st.none() | st.sampled_from(["", "   ", "  x  ", "Why Arrakis"]) | st.text(max_size=8)
_pages = st.integers(min_value=-2, max_value=415)
"""A page sent by the page field: in range for some Books, out of range for others."""
_start_pages = st.none() | _pages
"""A start's "Which page?": not sent (``None``), or a page as the field sends it."""
_finish_offsets = st.integers(min_value=-200, max_value=2)
"""Finished on, in days from today: the past (maybe before the start), today, or the future."""
_answers = st.sampled_from([None, "yes", "partly", "notYet"])
_ratings = st.none() | st.integers(min_value=1, max_value=5)
_slots = st.integers(min_value=0, max_value=6)
"""Which Book an intent names: the four seeded Books, 4 for one that never existed, and
5 and 6 for the first two Books ``add-book`` adds (one that never existed until then)."""
_edit_pages = st.integers(min_value=1, max_value=450)
"""Pages sent by the Edit book panel: below some Books' current page, above others'."""
_edit_finished = st.none() | _finish_offsets
"""Finished on sent by the Edit book panel: as prefilled (``None``), or a day from today."""
MAX_ADDED = 2
_GONE_FORM = {
    "title": "Gone",
    "authors": "Nobody",
    "language": "English",
    "publisher": "Publisher",
    "type": "paperback",
}
"""A valid Edit book form for a Book that doesn't exist."""


def _seed(data_dir: Path) -> list[str]:
    """Dune never started, Emma finished, Neuromancer paused at p.50 and a Side read,
    Fahrenheit 451 Main at p.120."""
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=412)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=400, finish_date="2026-04-10", finished_pages=400, rating=4)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(neuromancer, current_page=50, purpose="Cyberspace", paused_at="2026-10-01")
    builder.side_read(neuromancer)
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


def _intent(book_id: str, purpose: str | None = None, *, with_purpose: bool = True) -> str:
    return json.dumps(
        {"bookId": book_id, "purpose": purpose} if with_purpose else {"bookId": book_id}
    )


def _latest_finished(book: dict[str, Any]) -> dict[str, Any] | None:
    """The finished Reading with the greatest ``finishDate``; the later in list order on a tie."""
    latest = None
    for reading in book["readings"]:
        if reading["finishDate"] is not None and (
            latest is None or reading["finishDate"] >= latest["finishDate"]
        ):
            latest = reading
    return latest


def _form(book: dict[str, Any]) -> dict[str, str]:
    """The Edit book panel's fields, prefilled from the stored Book."""
    latest = _latest_finished(book)
    return {
        "title": book["title"],
        "subtitle": book["subtitle"] or "",
        "pages": str(book["pages"]),
        "authors": ", ".join(book["authors"]),
        "edition": str(book["edition"]),
        "language": book["language"],
        "publisher": book["publisher"],
        "type": book["type"],
        "isbn": book["isbn"] or "",
        "year": "" if book["year"] is None else str(book["year"]),
        "finishedOn": "" if latest is None else latest["finishDate"],
        "tags": ", ".join(book["tags"]),
        "spineColor": book["spineColorUser"] or "",
    }


class ReadingPlan(RuleBasedStateMachine):
    """The library as a sequence of reading intents sees it."""

    @initialize()
    def seed(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.data_dir = Path(self._tmp.name)
        self.ids = _seed(self.data_dir)
        self.added: list[str] = []
        """The Books ``add-book`` added, in order: slots 5 and 6."""
        self.store = Store.open(self.data_dir)
        self.today = TODAY
        self.up_next: str | None = None
        """The model's Up next: what ``upNextBookId`` must be after every step."""
        self.side_reads: list[str] = list(self.store.library.side_read_book_ids)
        """The model's Side reads: what ``sideReadBookIds`` must be after every step."""
        self.pages: dict[str, int] = {
            reading.id: reading.current_page
            for book in self.store.library.books
            for reading in book.readings
        }
        """The page ledger, by Reading id: what each Reading's ``currentPage`` must be."""

    def teardown(self) -> None:
        tmp = getattr(self, "_tmp", None)
        if tmp is not None:
            tmp.cleanup()

    # --- helpers ---------------------------------------------------------------

    def _book_id(self, slot: int) -> str:
        if slot < len(self.ids):
            return self.ids[slot]
        added = slot - len(self.ids) - 1
        return self.added[added] if 0 <= added < len(self.added) else GONE_ID

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
        assert expected_code is None, f"expected {expected_code}, the intent was accepted"
        return True

    # --- rules -----------------------------------------------------------------

    @rule(slot=_slots, purpose=_purposes, page=_start_pages)
    def start(self, slot: int, purpose: str | None, page: int | None) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        old_main = library.main_book_id
        if book_id not in before:
            expected = "book_not_found"
        elif book_id == old_main:
            expected = "already_main"
        elif page is None and book_id in self.side_reads:
            expected = "invalid_fields"
        elif page is not None and not 0 <= page <= before[book_id]["pages"]:
            expected = "invalid_fields"
        else:
            expected = None
        clock = FakeClock(self.today)
        body = {"bookId": book_id, "purpose": purpose}
        if page is not None:
            body["page"] = page
        intent = parse_start_reading_intent(json.dumps(body))
        reached: list[bool] = []
        if not self._send(
            lambda: reached.append(start_reading(self.store, clock, intent)), expected
        ):
            return

        assert reached == [page is not None and page == before[book_id]["pages"]]
        # FR-8: the started Book leaves the Side reads.
        self.side_reads = [other for other in self.side_reads if other != book_id]

        # FR-7: the interrupted Main book becomes Up next; with none, Up next
        # stays, except that the started Book leaves it.
        if old_main is not None:
            self.up_next = old_main
        elif self.up_next == book_id:
            self.up_next = None
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
                    {**r, "pausedAt": self.today.isoformat()} if r["id"] == paused["id"] else r
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
            moved = {} if page is None else {"currentPage": page}
            assert now == [
                {**r, "lastProgressUpdate": stamp, "purpose": stored_purpose, **moved}
                if r["id"] == resumed["id"]
                else r
                for r in was
            ]
            # The one page the user enters is the only page a start moves.
            if page is not None:
                self.pages[resumed["id"]] = page
        else:
            assert now[:-1] == was
            new = now[-1]
            assert new["id"] not in {r["id"] for r in was}
            self.pages[new["id"]] = page or 0
            assert {k: v for k, v in new.items() if k != "id"} == {
                "startDate": self.today.isoformat(),
                "startPage": page or 0,
                "currentPage": page or 0,
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

    @rule(slot=_slots)
    def pause_main(self, slot: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        if book_id not in before:
            expected = "book_not_found"
        elif book_id != library.main_book_id:
            expected = "not_main_book"
        else:
            expected = None
        clock = FakeClock(self.today)
        intent = parse_pause_intent(_intent(book_id, with_purpose=False))
        if not self._send(lambda: pause(self.store, clock, intent), expected):
            return

        # FR-7: the paused Book becomes Up next; a displaced Up next keeps its Readings.
        self.up_next = book_id
        assert self.store.library.main_book_id is None
        after = _books(self.store.library)
        current = _current(before[book_id])
        assert current is not None
        expected_book = {
            **before[book_id],
            "readings": [
                {**r, "pausedAt": self.today.isoformat()} if r["id"] == current["id"] else r
                for r in before[book_id]["readings"]
            ],
        }
        # Only the current Reading's pausedAt moves; every other Book stays.
        assert after == {**before, book_id: expected_book}

    @rule(slot=_slots)
    def choose_up_next(self, slot: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        old_main = library.main_book_id
        if book_id not in before:
            expected = "book_not_found"
        elif book_id == old_main:
            expected = "main_cannot_be_up_next"
        else:
            expected = None
        no_op = book_id == library.up_next_book_id
        bytes_before = self._bytes()
        intent = parse_set_up_next_intent(_intent(book_id, with_purpose=False))
        if not self._send(lambda: set_up_next(self.store, intent), expected):
            return

        if no_op:
            # AD-9: the current Up next again is accepted and writes nothing.
            assert self._bytes() == bytes_before
        # FR-7: only the pointer moves; a displaced Up next keeps its Readings.
        self.up_next = book_id
        assert _books(self.store.library) == before
        assert self.store.library.main_book_id == old_main

    @rule(slot=_slots)
    def mark_side(self, slot: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        pointers = (library.main_book_id, library.up_next_book_id)
        if book_id not in before:
            expected = "book_not_found"
        elif book_id == library.main_book_id:
            expected = "main_cannot_be_side_read"
        elif book_id in self.side_reads:
            expected = None
        elif len(self.side_reads) >= MAX_SIDE_READS:
            expected = "side_reads_full"
        else:
            expected = None
        no_op = book_id in self.side_reads
        bytes_before = self._bytes()
        intent = parse_mark_side_read_intent(_intent(book_id, with_purpose=False))
        if not self._send(lambda: mark_side_read(self.store, intent), expected):
            return

        if no_op:
            assert self._bytes() == bytes_before
        else:
            self.side_reads = [*self.side_reads, book_id]
        # Marking changes nothing else: no Book, no other pointer.
        assert _books(self.store.library) == before
        assert (self.store.library.main_book_id, self.store.library.up_next_book_id) == pointers

    @rule(slot=_slots)
    def unmark_side(self, slot: int) -> None:
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        pointers = (library.main_book_id, library.up_next_book_id)
        expected = None if book_id in before else "book_not_found"
        no_op = book_id not in self.side_reads
        bytes_before = self._bytes()
        intent = parse_unmark_side_read_intent(_intent(book_id, with_purpose=False))
        if not self._send(lambda: unmark_side_read(self.store, intent), expected):
            return

        if no_op:
            assert self._bytes() == bytes_before
        self.side_reads = [other for other in self.side_reads if other != book_id]
        assert _books(self.store.library) == before
        assert (self.store.library.main_book_id, self.store.library.up_next_book_id) == pointers

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
                {**r, "purpose": normalize_purpose(purpose)} if r["id"] == current["id"] else r
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
        self.pages[current["id"]] = page
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
        backfill = book_id in before and not before[book_id]["readings"]
        if backfill:
            # The Reading a finish back-fills: no start date, no Purpose (FR-14).
            pages = before[book_id]["pages"]
            current = {
                "startDate": None,
                "startPage": 0,
                "currentPage": pages,
                "purpose": None,
                "lastProgressUpdate": None,
                "pausedAt": None,
            }
        old_side_reads = list(library.side_read_book_ids)
        if book_id not in before:
            expected = "book_not_found"
        elif current is None:
            expected = "reading_already_finished"
        elif finished_on > self.today or (
            current["startDate"] is not None and finished_on.isoformat() < current["startDate"]
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
        answers = {
            "finishDate": finished_on.isoformat(),
            "finishedPages": before[book_id]["pages"],
            "purposeFulfilled": answer,
            "rating": rating,
        }
        if backfill:
            readings = after[book_id]["readings"]
            assert len(readings) == 1
            # Compared ignoring the minted id.
            assert {k: v for k, v in readings[0].items() if k != "id"} == {**current, **answers}
            expected_book = {**before[book_id], "readings": readings}
            self.pages[readings[0]["id"]] = readings[0]["currentPage"]
        else:
            expected_book = {
                **before[book_id],
                "readings": [
                    {**r, **answers} if r["id"] == current["id"] else r
                    for r in before[book_id]["readings"]
                ],
            }
            # The finished Reading keeps the page it was at.
            self.pages[current["id"]] = current["currentPage"]
        # Only the current Reading is finished; history and other Books stay.
        assert after == {**before, book_id: expected_book}
        assert self.store.library.main_book_id == (None if old_main == book_id else old_main)
        if self.up_next == book_id:
            self.up_next = None
        assert self.store.library.side_read_book_ids == [
            other for other in old_side_reads if other != book_id
        ]
        self.side_reads = [other for other in self.side_reads if other != book_id]

    @rule(pages=_edit_pages, offset=_edit_finished)
    def add(self, pages: int, offset: int | None) -> None:
        if len(self.added) >= MAX_ADDED:
            return
        library = self.store.library
        before = _books(library)
        pointers = (library.main_book_id, library.up_next_book_id, library.side_read_book_ids)
        finished_on = None if offset is None else self.today + timedelta(days=offset)
        future = finished_on is not None and finished_on > self.today
        n = len(self.added) + 1
        form = {
            "title": f"Added {n}",
            "pages": str(pages),
            "authors": f"Added Author {n}",
            "language": "English",
            "publisher": "Publisher",
            "type": "paperback",
            "finishedOn": "" if finished_on is None else finished_on.isoformat(),
        }
        clock = FakeClock(self.today)
        intent = parse_add_book_intent(json.dumps(form))
        added: list[str] = []
        expected = "invalid_fields" if future else None
        if not self._send(lambda: added.append(add_book(self.store, clock, intent)), expected):
            return

        (book_id,) = added
        self.added.append(book_id)
        after = _books(self.store.library)
        # Only the new Book; no pointer or Side read moves (FR-1).
        assert {k: v for k, v in after.items() if k != book_id} == before
        library = self.store.library
        assert (library.main_book_id, library.up_next_book_id, library.side_read_book_ids) == (
            pointers
        )
        readings = after[book_id]["readings"]
        if finished_on is None:
            assert readings == []
            return
        # Finished on back-fills one finished Reading with no start (FR-14).
        (reading,) = readings
        assert {k: v for k, v in reading.items() if k != "id"} == {
            "startDate": None,
            "startPage": 0,
            "currentPage": pages,
            "purpose": None,
            "lastProgressUpdate": None,
            "pausedAt": None,
            "finishDate": finished_on.isoformat(),
            "finishedPages": pages,
            "purposeFulfilled": None,
            "rating": None,
        }
        self.pages[reading["id"]] = pages

    @rule(slot=_slots, pages=_edit_pages, offset=_edit_finished)
    def edit_details(self, slot: int, pages: int, offset: int | None) -> None:
        """``edit-book`` with the panel prefilled: a new Pages and maybe a new Finished on."""
        book_id = self._book_id(slot)
        library = self.store.library
        before = _books(library)
        pointers = (library.main_book_id, library.up_next_book_id)
        old_side_reads = list(library.side_read_book_ids)
        if book_id not in before:
            form = {**_GONE_FORM, "pages": str(pages)}
            intent = parse_edit_book_intent(json.dumps({"bookId": book_id, **form}))
            self._send(
                lambda: edit_book(self.store, FakeClock(self.today), intent), "book_not_found"
            )
            return
        book = before[book_id]
        latest = _latest_finished(book)
        current = _current(book)
        form = {**_form(book), "pages": str(pages)}
        finished_on = None if offset is None else self.today + timedelta(days=offset)
        if finished_on is not None:
            form["finishedOn"] = finished_on.isoformat()
        sent = (
            finished_on
            if finished_on is not None
            else (None if latest is None else date.fromisoformat(latest["finishDate"]))
        )
        changed = sent is not None and (latest is None or sent.isoformat() != latest["finishDate"])
        start = None if current is None else current["startDate"]
        floor = 0 if current is None else current["currentPage"]
        if sent is not None and sent > self.today:
            expected = "invalid_fields"
        elif (
            latest is not None
            and latest["startDate"] is not None
            and sent is not None
            and (sent.isoformat() < latest["startDate"])
        ):
            expected = "invalid_fields"
        elif changed and start is not None and sent.isoformat() > start:
            # A stored finish must be a past Reading's: not after the current one's start.
            expected = "invalid_fields"
        elif pages < floor:
            expected = "pages_below_current_page"
        else:
            expected = None
        intent = parse_edit_book_intent(json.dumps({"bookId": book_id, **form}))
        if not self._send(lambda: edit_book(self.store, FakeClock(self.today), intent), expected):
            return

        after = _books(self.store.library)
        readings = list(book["readings"])
        if changed and latest is not None:
            readings = [
                {**r, "finishDate": sent.isoformat()} if r is latest else r for r in readings
            ]
        backfilled = changed and latest is None
        if backfilled:
            new = after[book_id]["readings"][-1]
            assert {k: v for k, v in new.items() if k != "id"} == {
                "startDate": None,
                "startPage": 0,
                "currentPage": pages,
                "purpose": None,
                "lastProgressUpdate": None,
                "pausedAt": None,
                "finishDate": sent.isoformat(),
                "finishedPages": pages,
                "purposeFulfilled": None,
                "rating": None,
            }
            readings.append(new)
            self.pages[new["id"]] = pages
        # Only Pages and the Finished on Reading change; no other Book does.
        assert after == {**before, book_id: {**book, "pages": pages, "readings": readings}}
        assert (self.store.library.main_book_id, self.store.library.up_next_book_id) == pointers
        # A back-fill that finishes a Book with no Readings takes it off the side (FR-8).
        if backfilled and not book["readings"]:
            self.side_reads = [other for other in self.side_reads if other != book_id]
        assert self.store.library.side_read_book_ids == [
            other for other in old_side_reads if other in self.side_reads
        ]

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
        for reading in before[book_id]["readings"]:
            del self.pages[reading["id"]]
        if self.up_next == book_id:
            self.up_next = None
        self.side_reads = [other for other in self.side_reads if other != book_id]
        # Nothing is promoted into a vacated Main book (CAT-API-007).
        assert self.store.library.main_book_id == (None if old_main == book_id else old_main)

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
    def no_page_is_lost(self) -> None:
        """R-01: every surviving Reading is at its ledger page, and there is at most one Main book."""
        library = self.store.library
        stored = {
            reading.id: reading.current_page for book in library.books for reading in book.readings
        }
        # Unfinished and finished alike: only the intents above move a page.
        assert stored == self.pages
        assert sum(1 for shelf in catalog(library).books if shelf.role == "main") <= 1

    @invariant()
    def views_agree_with_the_pointers(self) -> None:
        library = self.store.library
        assert library.up_next_book_id == self.up_next
        assert library.side_read_book_ids == self.side_reads
        stored = _books(library)
        main = library.main_book_id
        up_next = library.up_next_book_id
        for shelf in catalog(library).books:
            assert shelf.side_read == (shelf.id in self.side_reads), shelf.title
            current = _current(stored[shelf.id])
            if shelf.id == main:
                assert shelf.role == "main"
            elif shelf.id == up_next:
                assert shelf.role == "upNext", shelf.title
                assert shelf.waiting_page is None
            elif current is not None:
                # Waiting = paused minus Up next (AD-19).
                assert shelf.role == "waiting", shelf.title
                assert shelf.waiting_page == current["currentPage"]
            else:
                assert shelf.role is None, shelf.title
        view = home(library)
        assert [s.id for s in view.side_reads] == self.side_reads
        full = len(self.side_reads) >= MAX_SIDE_READS
        for book_id in stored:
            detail = book_detail(library, book_id)
            assert detail is not None
            assert detail.side_read == (book_id in self.side_reads)
            assert detail.side_reads_full == (book_id not in self.side_reads and full)
        # Home's Waiting for you: the paused Books minus Up next, oldest pause
        # first, then title key, then id (AD-6).
        paused = [
            (current.get("pausedAt") or "", title_key(book["title"]), book["id"])
            for book in stored.values()
            if book["id"] not in (main, up_next) and (current := _current(book)) is not None
        ]
        assert [w.id for w in view.waiting] == [book_id for *_, book_id in sorted(paused)]
        if up_next is None:
            assert view.up_next is None
        else:
            assert view.up_next is not None
            assert view.up_next.id == up_next
            assert view.up_next.paused == (_current(stored[up_next]) is not None)
        card = view.main_book
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
    roles = {b.id: (b.role, b.finished) for b in catalog(Store.open(tmp_path).library).books}
    assert roles == {
        dune: (None, False),
        emma: (None, True),
        neuromancer: ("waiting", False),
        fahrenheit: ("main", False),
    }
