"""Story 1.9: ``add-book`` warns before adding a Book that is already there.

One test per server-side acceptance criterion (AC-1 to AC-5 and AC-9,
numbered in the order of epics.md, Story 1.9). AC-6 to AC-8 are the Duplicate
dialog, in ``frontend/e2e/duplicate-dialog.spec.ts``.

The tests pin these names:

- ``bookvie.domain.duplicates``: ``normalize_isbn(raw) -> str`` (13 digits),
  ``isbns_match(a, b)``, ``titles_match(a, b)`` and
  ``authors_match(a, b)``, where the authors are lists of names as stored.
- 409 ``duplicate_book`` (kind ``refusal``) with ``error.duplicates``: one
  ``{title, authors, isbn}`` per matching Book, in catalog order, and no
  ``fields``.
- ``confirmDuplicate: true``, a JSON boolean in the ``intent`` part.
"""

import json
import threading
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library, check_invariants
from bookvie.domain.clock import FakeClock
from bookvie.http.app import create_app
from bookvie.intents import (
    COULDNT_SAVE_MESSAGE,
    IntentError,
    add_book,
    parse_add_book_intent,
)
from bookvie.store import OsFileSystem, Store
from tests.builder import LibraryBuilder
from tests.test_add_book import (
    ADD_BOOK,
    TODAY,
    VALID,
    _client,
    _library_bytes,
    _stored_books,
)
from tests.test_store import FaultyFs

# Ace's Dune, as ISBN-13 and as the ISBN-10 printed on older copies.
DUNE_ISBN13 = "9780441172719"
DUNE_ISBN10 = "0-441-17271-7"


def _seed(data_dir: Path, *books: dict[str, Any]) -> Path:
    builder = LibraryBuilder()
    for book in books:
        builder.book(**book)
    builder.write(data_dir)
    return data_dir


def _send(client: TestClient, **intent: Any):
    """``add-book`` with ``VALID`` overridden by ``intent`` (any JSON value)."""
    return client.post(
        ADD_BOOK,
        files={"intent": (None, json.dumps({**VALID, **intent}), "application/json")},
    )


# --- matching (domain) --------------------------------------------------------


def test_ac1_p0_isbn_title_and_author_matching_rules() -> None:
    from bookvie.domain.duplicates import (  # Story 1.9
        authors_match,
        isbns_match,
        normalize_isbn,
        titles_match,
    )

    assert isbns_match(DUNE_ISBN10, DUNE_ISBN13) is True

    assert normalize_isbn(DUNE_ISBN10) == DUNE_ISBN13
    assert normalize_isbn("978-0-441-17271-9") == DUNE_ISBN13
    assert normalize_isbn("0 8044 2957 X") == "9780804429573"  # X check digit
    assert normalize_isbn("080442957x") == "9780804429573"
    assert isbns_match("978 0 441 17271 9", "0441172717") is True
    assert isbns_match(DUNE_ISBN13, "9780804429573") is False

    assert titles_match("  The Left  Hand of   DARKNESS ", "the left hand of darkness") is True
    assert titles_match("Dune", "Dune Messiah") is False

    le_guin = ["Ursula K. Le Guin", "Brian Attebery"]
    assert authors_match(le_guin, ["  ursula k. le guin "]) is True
    assert authors_match(le_guin, ["Ursula Le Guin"]) is False  # no shared name
    assert authors_match(le_guin, ["Le Guin, Ursula K."]) is False  # names are not reordered
    assert authors_match([], le_guin) is False


# --- the add-book refusal -----------------------------------------------------


def test_ac2_p0_same_normalized_isbn_is_409_duplicate_book_and_saves_nothing(
    tmp_path: Path,
) -> None:
    data_dir = _seed(
        tmp_path,
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13},
        {"title": "Neuromancer", "authors": ["William Gibson"]},
    )
    before = _library_bytes(data_dir)

    # Only the ISBN matches: another title, and the author written differently.
    response = _send(
        _client(data_dir),
        title="Dune: 40th Anniversary Edition",
        authors="Herbert, Frank",
        isbn=DUNE_ISBN10,
    )

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "kind": "refusal",
            "code": "duplicate_book",
            "message": "Possible duplicate: Dune by Frank Herbert is already in your catalog.",
            "duplicates": [{"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13}],
        }
    }
    assert _library_bytes(data_dir) == before


def test_ac3_p0_without_an_isbn_same_title_and_a_shared_author_is_a_duplicate(
    tmp_path: Path,
) -> None:
    dispossessed = {"title": "The Dispossessed", "authors": ["Ursula K. Le Guin"]}
    same_book = {"title": " the  DISPOSSESSED ", "authors": "Brian Attebery; ursula k. le guin "}

    # Neither Book has an ISBN.
    data_dir = _seed(tmp_path / "neither", dispossessed)
    response = _send(_client(data_dir), **same_book)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "duplicate_book"
    # Only one of them has an ISBN.
    data_dir = _seed(tmp_path / "existing-has", {**dispossessed, "isbn": "978-0-06-051275-3"})
    assert _send(_client(data_dir), **same_book).status_code == 409
    data_dir = _seed(tmp_path / "new-has", dispossessed)
    assert _send(_client(data_dir), **same_book, isbn="978-0-06-051275-3").status_code == 409
    # Two different ISBNs never match on title and author alone.
    data_dir = _seed(tmp_path / "both-differ", {**dispossessed, "isbn": "978-0-06-051275-3"})
    response = _send(_client(data_dir), **same_book, isbn="9780061054884")
    assert response.status_code == 200, response.json()
    assert len(_stored_books(data_dir)) == 2


def test_ac4_p0_resending_with_confirm_duplicate_saves_the_book(tmp_path: Path) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert"]})
    client = _client(data_dir)
    intent = {"title": "Dune", "authors": "Frank Herbert", "pages": "412"}
    _send(client, **intent)  # refused as a duplicate

    response = _send(client, **intent, confirmDuplicate=True)

    assert response.status_code == 200
    book_id = response.json()["ids"]["bookId"]
    books = _stored_books(data_dir)
    assert [b["title"] for b in books] == ["Dune", "Dune"]
    (saved,) = [b for b in books if b["id"] == book_id]
    assert saved["pages"] == 412
    assert "confirmDuplicate" not in saved
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))


def test_ac5_p1_field_validation_runs_before_the_duplicate_check(tmp_path: Path) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13})
    client = _client(data_dir)
    before = _library_bytes(data_dir)

    response = _send(client, title="Dune", authors="Frank Herbert", isbn=DUNE_ISBN10, pages="")

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_fields"
    assert error["fields"] == [{"field": "pages", "message": "Pages is required."}]
    assert "duplicates" not in error
    assert _library_bytes(data_dir) == before
    # The same payload made valid reaches the duplicate check.
    fixed = _send(client, title="Dune", authors="Frank Herbert", isbn=DUNE_ISBN10, pages="412")
    assert fixed.status_code == 409


# --- standard intent ACs (TR8) ------------------------------------------------


def test_ac9_p0_confirmed_duplicate_add_keeps_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    dune = {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13}
    intent = {"title": "Dune", "authors": "Frank Herbert", "isbn": DUNE_ISBN10}
    for step in ("write", "fsync", "replace"):
        data_dir = _seed(tmp_path / step, dune)
        before = _library_bytes(data_dir)

        response = _send(_client(data_dir, fs=FaultyFs(step)), **intent, confirmDuplicate=True)

        assert response.status_code == 503, step
        assert response.json()["error"]["message"] == COULDNT_SAVE_MESSAGE, step
        assert _library_bytes(data_dir) == before, step
    data_dir = _seed(tmp_path / "ok", dune)
    assert _send(_client(data_dir), **intent, confirmDuplicate=True).status_code == 200
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))
    # The new code is part of the contract (AD-8, AD-9).
    schemas = create_app().openapi()["components"]["schemas"]
    assert "duplicate_book" in schemas["ErrorCode"]["enum"]
    assert "duplicates" in schemas["ErrorBody"]["properties"]


# --- follow-ups: copy, wire shape, the flag ------------------------------------


@pytest.mark.parametrize(
    ("count", "message"),
    [
        (
            2,
            "Possible duplicate: Dune 1 by Frank Herbert and Dune 2 by Frank Herbert"
            " are already in your catalog.",
        ),
        (
            3,
            "Possible duplicate: Dune 1 by Frank Herbert, Dune 2 by Frank Herbert"
            " and Dune 3 by Frank Herbert are already in your catalog.",
        ),
        (
            4,
            "Possible duplicate: Dune 1 by Frank Herbert, Dune 2 by Frank Herbert"
            " and Dune 3 by Frank Herbert are already in your catalog, and 1 more.",
        ),
    ],
)
def test_multi_match_message_names_three_then_and_n_more(
    tmp_path: Path, count: int, message: str
) -> None:
    books = [
        {"title": f"Dune {n}", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13}
        for n in range(1, count + 1)
    ]
    data_dir = _seed(tmp_path, *books)

    response = _send(_client(data_dir), isbn=DUNE_ISBN10)

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["message"] == message
    assert [match["title"] for match in error["duplicates"]] == [b["title"] for b in books]


def test_multi_author_match_joins_names_with_semicolons() -> None:
    from bookvie.intents.contract import DuplicateMatch, duplicate_message

    match = DuplicateMatch(
        title="The Dispossessed", authors=["Ursula K. Le Guin", "Brian Attebery"], isbn=None
    )
    assert duplicate_message([match]) == (
        "Possible duplicate: The Dispossessed by Ursula K. Le Guin; Brian Attebery"
        " is already in your catalog."
    )


def test_a_match_without_an_isbn_keeps_isbn_null_on_the_wire(tmp_path: Path) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert"]})

    response = _send(_client(data_dir), title="Dune", authors="Frank Herbert")

    assert response.status_code == 409
    assert response.json()["error"]["duplicates"] == [
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": None}
    ]


@pytest.mark.parametrize("flag", ["true", None, 1])
def test_a_non_boolean_confirm_duplicate_is_a_malformed_intent(
    tmp_path: Path, flag: object
) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert"]})
    before = _library_bytes(data_dir)

    response = _send(_client(data_dir), title="Dune", authors="Frank Herbert", confirmDuplicate=flag)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_fields"
    assert [f["field"] for f in error["fields"]] == ["intent"]
    assert _library_bytes(data_dir) == before


def test_confirm_duplicate_false_still_checks_and_true_without_a_match_saves(
    tmp_path: Path,
) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert"]})
    client = _client(data_dir)

    refused = _send(client, title="Dune", authors="Frank Herbert", confirmDuplicate=False)
    assert refused.status_code == 409
    saved = _send(client, title="Neuromancer", authors="William Gibson", confirmDuplicate=True)
    assert saved.status_code == 200
    assert [b["title"] for b in _stored_books(data_dir)] == ["Dune", "Neuromancer"]


def test_title_alone_or_author_alone_is_not_a_duplicate(tmp_path: Path) -> None:
    from bookvie.domain.book_fields import BookFields
    from bookvie.domain.duplicates import find_duplicates

    builder = LibraryBuilder()
    builder.book(title="Dune", authors=["Frank Herbert"], isbn=DUNE_ISBN13)
    builder.book(title="Dune", authors=["Someone Else"])
    builder.book(title="Dune Messiah", authors=["Frank Herbert"])
    builder.write(tmp_path)
    books = Library.model_validate_json(_library_bytes(tmp_path)).books
    fields = BookFields(
        title="dune",
        subtitle=None,
        pages=1,
        authors=["frank herbert"],
        edition=1,
        language="English",
        publisher="Ace",
        type="paperback",
        isbn=None,
        year=None,
        finished_on=None,
        tags=[],
        spine_color=None,
    )

    assert [b.title for b in find_duplicates(books, fields)] == ["Dune"]


def test_a_979_isbn_never_matches_the_978_isbn_with_the_same_stem() -> None:
    from bookvie.domain.duplicates import isbns_match

    # Same nine-digit stem (044117271), different prefix; each check digit valid.
    assert isbns_match("9790441172718", DUNE_ISBN13) is False
    # An ISBN-10 converts into the 978 range only, so it never equals a 979.
    assert isbns_match("9790441172718", DUNE_ISBN10) is False
    assert isbns_match(DUNE_ISBN10, DUNE_ISBN13) is True


def test_titles_and_authors_compare_by_normalized_whitespace_and_case() -> None:
    from bookvie.domain.duplicates import authors_match, titles_match

    assert titles_match("The\tLeft\nHand", "the left hand") is True
    assert titles_match("\u00c9MILE", "\u00e9mile") is True
    # NFD "E" + combining acute against NFC "É".
    assert titles_match("E\u0301mile", "\u00c9mile") is True
    assert authors_match(["E\u0301mile Zola"], ["\u00c9MILE ZOLA"]) is True
    assert authors_match(["Frank  Herbert"], ["frank\therbert"]) is True


def test_titles_and_authors_fold_typographic_punctuation_and_compatibility_forms() -> None:
    from bookvie.domain.duplicates import authors_match, titles_match

    assert titles_match("Ender\u2019s Game", "Ender's Game") is True
    assert titles_match("\u2018Salem\u2019s Lot", "'Salem's Lot") is True
    assert titles_match("\u201cQuoted\u201d", '"Quoted"') is True
    assert titles_match("Twenty Thousand Leagues \u2013 Part One", "Twenty Thousand Leagues - Part One") is True
    assert titles_match("Spin\u2014Off", "Spin-Off") is True
    # NFKC: a ligature and full-width letters.
    assert titles_match("\ufb01re", "fire") is True
    assert titles_match("\uff24\uff55\uff4e\uff45", "Dune") is True
    assert authors_match(["Madeleine L\u2019Engle"], ["madeleine l'engle"]) is True
    # Folding never merges different words.
    assert titles_match("Ender's Game", "Enders Game") is False


# --- automate: ten matches, listed once, repeated authors, concurrency ----------


def test_ten_matches_are_all_listed_and_the_message_names_three(tmp_path: Path) -> None:
    books = [
        {"title": f"Dune {n}", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13}
        for n in range(1, 11)
    ]
    data_dir = _seed(tmp_path, *books)

    response = _send(_client(data_dir), isbn=DUNE_ISBN10)

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["message"] == (
        "Possible duplicate: Dune 1 by Frank Herbert, Dune 2 by Frank Herbert"
        " and Dune 3 by Frank Herbert are already in your catalog, and 7 more."
    )
    assert [match["title"] for match in error["duplicates"]] == [b["title"] for b in books]


def test_a_book_matching_on_isbn_and_on_title_and_author_is_listed_once(tmp_path: Path) -> None:
    data_dir = _seed(
        tmp_path,
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13},
        {"title": "Neuromancer", "authors": ["William Gibson"]},
    )

    response = _send(_client(data_dir), title="Dune", authors="Frank Herbert", isbn=DUNE_ISBN10)

    assert response.status_code == 409
    assert response.json()["error"]["duplicates"] == [
        {"title": "Dune", "authors": ["Frank Herbert"], "isbn": DUNE_ISBN13}
    ]


def test_authors_that_repeat_a_name_match_as_that_name_and_are_listed_as_stored(
    tmp_path: Path,
) -> None:
    data_dir = _seed(tmp_path, {"title": "Dune", "authors": ["Frank Herbert", "FRANK HERBERT"]})
    client = _client(data_dir)

    refused = _send(client, title="Dune", authors="frank herbert; Frank Herbert")

    assert refused.status_code == 409
    assert refused.json()["error"]["duplicates"] == [
        {"title": "Dune", "authors": ["Frank Herbert", "FRANK HERBERT"], "isbn": None}
    ]
    # Repeating a name that isn't shared doesn't make it shared.
    saved = _send(client, title="Dune", authors="Brian Herbert; Brian Herbert")
    assert saved.status_code == 200, saved.json()


class _ContendedLock:
    """The store lock, setting ``contended`` when a second caller has to wait."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.contended = threading.Event()

    def __enter__(self) -> None:
        if not self._lock.acquire(blocking=False):
            self.contended.set()
            self._lock.acquire()

    def __exit__(self, *exc: object) -> None:
        self._lock.release()

    def locked(self) -> bool:
        return self._lock.locked()


def test_two_simultaneous_identical_adds_save_one_book_and_refuse_the_other(
    tmp_path: Path,
) -> None:
    """The check runs inside the commit, under the store lock (AD-4).

    The first add is held in its rename, lock taken and the new Book not yet
    committed. The second is released only once it waits on that lock, so a
    check made before taking the lock would see no Dune and save a second copy.
    """
    in_rename = threading.Event()
    release = threading.Event()

    class Slow(OsFileSystem):
        def replace(self, src: Path, dst: Path) -> None:
            in_rename.set()
            release.wait(5)
            super().replace(src, dst)

    _seed(tmp_path, {"title": "Neuromancer", "authors": ["William Gibson"]})
    store = Store.open(tmp_path, fs=Slow())
    lock = _ContendedLock()
    store.lock = lock
    clock = FakeClock(TODAY)
    outcomes: dict[str, object] = {}

    def add(name: str) -> None:
        intent = parse_add_book_intent(json.dumps({**VALID, "title": "Dune", "authors": "Frank Herbert"}))
        try:
            outcomes[name] = add_book(store, clock, intent)
        except IntentError as exc:
            outcomes[name] = exc.status

    first = threading.Thread(target=add, args=("first",))
    first.start()
    assert in_rename.wait(5)
    second = threading.Thread(target=add, args=("second",))
    second.start()
    assert lock.contended.wait(5)
    release.set()
    first.join(5)
    second.join(5)

    assert isinstance(outcomes["first"], str)
    assert outcomes["second"] == 409
    assert [b["title"] for b in _stored_books(tmp_path)] == ["Neuromancer", "Dune"]
