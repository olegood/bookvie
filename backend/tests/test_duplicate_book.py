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
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library, check_invariants
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from tests.builder import LibraryBuilder
from tests.test_add_book import ADD_BOOK, VALID, _client, _library_bytes, _stored_books
from tests.test_store import FaultyFs

RED = "ATDD red phase: un-skip when Story 1.9 implements the duplicate check"

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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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


@pytest.mark.skip(reason=RED)
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
