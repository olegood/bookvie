"""Story 4.7 Keep a few side reads: ``mark-side-read``, ``unmark-side-read`` and
``start-reading``'s "Which page?" (API).

One leaf per row of the story's I/O matrix (FR-8, AD-9):

- mark: appended, nothing else changes; again: a 200 no-op with no write; the
  Main book: 409 ``main_cannot_be_side_read``; a 4th: 409 ``side_reads_full``.
- unmark: removed in order; not a Side read: a 200 no-op with no write.
- start-reading for a Side read: ``page`` required, range-checked, applied
  even below the paused page, ``reachedLastPage`` at the last page, and the
  Book leaves the Side reads.
- the views: ``sideRead`` on the shelf and Book detail, ``sideReadsFull``,
  and Home's ``sideReads`` in stored order.
- the standard intent ACs (TR8) for both new intents.

The buttons, focus, the ``status`` line, the On the side pane and the Start
dialog's field are read in the browser (``frontend/e2e/side-reads.spec.ts``).
"""

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    MARK_SIDE_READ,
    START_READING,
    UNMARK_SIDE_READ,
    FaultyFs,
    RecordingFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"
EARLIER = "2026-10-01"


def _post(client: TestClient, path: str, body: dict[str, Any]):
    return client.post(path, files={"intent": (None, json.dumps(body), "application/json")})


def _mark(client: TestClient, book_id: str):
    return _post(client, MARK_SIDE_READ, {"bookId": book_id})


def _unmark(client: TestClient, book_id: str):
    return _post(client, UNMARK_SIDE_READ, {"bookId": book_id})


def _start(client: TestClient, book_id: str, **page: Any):
    return _post(client, START_READING, {"bookId": book_id, "purpose": None, **page})


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _view(data_dir: Path, path: str) -> dict:
    return api_client(data_dir, raise_server_exceptions=True).get(path).json()


def _main_dune(builder: LibraryBuilder) -> str:
    """Dune as the Main book at p.150 of 412."""
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(dune, current_page=150, purpose="Arrakis")
    builder.main(dune)
    return dune


def _field_error(response) -> tuple[int, str, list[dict]]:
    error = response.json()["error"]
    return response.status_code, error["code"], error.get("fields", [])


# --- mark-side-read ---------------------------------------------------------------


def test_p0_mark_appends_the_book_and_changes_nothing_else(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=40, paused_at=EARLIER)
    builder.up_next(emma)
    kindred = builder.book(title="Kindred", pages=264)
    builder.side_read(kindred)
    builder.write(tmp_path)
    before = _stored(tmp_path)

    response = _mark(api_client(tmp_path), emma)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    after = _stored(tmp_path)
    assert after["sideReadBookIds"] == [kindred, emma]
    assert {**after, "sideReadBookIds": before["sideReadBookIds"]} == before
    assert_invariants(tmp_path)
    assert (after["mainBookId"], after["upNextBookId"]) == (dune, emma)


def test_p1_mark_again_is_a_200_no_op_that_commits_nothing(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    ids = [builder.book(title=title, pages=200) for title in ("Emma", "Kindred", "Beloved")]
    for book_id in ids:
        builder.side_read(book_id)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # Already one of 3: the no-op wins over the cap, and nothing is written.
    response = _mark(api_client(tmp_path, fs=FaultyFs("write")), ids[1])
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert library_bytes(tmp_path) == before

    log: list[str] = []
    assert _mark(api_client(tmp_path, fs=RecordingFs(tmp_path, log)), ids[1]).status_code == 200
    assert log == []


def test_p0_mark_the_main_book_is_409_main_cannot_be_side_read(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _mark(api_client(tmp_path), dune)

    assert response.status_code == 409
    assert response.json()["error"] == {
        "kind": "refusal",
        "code": "main_cannot_be_side_read",
        "message": "Your Main book can't be a Side read.",
    }
    assert library_bytes(tmp_path) == before


def test_p0_mark_a_fourth_is_409_side_reads_full(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    for title in ("Emma", "Kindred", "Beloved"):
        builder.side_read(builder.book(title=title, pages=200))
    fourth = builder.book(title="Neuromancer", pages=271)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _mark(api_client(tmp_path), fourth)

    assert response.status_code == 409
    assert response.json()["error"] == {
        "kind": "refusal",
        "code": "side_reads_full",
        "message": "You already have 3 side reads. Remove one first.",
    }
    assert library_bytes(tmp_path) == before


# --- unmark-side-read -------------------------------------------------------------


def test_p0_unmark_removes_the_book_and_keeps_the_others_in_order(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    ids = [builder.book(title=title, pages=200) for title in ("Emma", "Kindred", "Beloved")]
    for book_id in ids:
        builder.side_read(book_id)
    builder.write(tmp_path)
    before = _stored(tmp_path)

    response = _unmark(api_client(tmp_path), ids[1])

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    after = _stored(tmp_path)
    assert after["sideReadBookIds"] == [ids[0], ids[2]]
    assert {**after, "sideReadBookIds": before["sideReadBookIds"]} == before
    assert_invariants(tmp_path)


def test_p1_unmark_a_book_that_isnt_a_side_read_is_a_200_no_op(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _unmark(api_client(tmp_path, fs=FaultyFs("write")), emma)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert library_bytes(tmp_path) == before


# --- start-reading's "Which page?" ------------------------------------------------


def _paused_side_read(builder: LibraryBuilder) -> str:
    """Kindred: a Side read paused at p.120 of 330."""
    kindred = builder.book(title="Kindred", pages=330)
    builder.reading(kindred, current_page=120, purpose="Time", paused_at=EARLIER)
    builder.side_read(kindred)
    return kindred


@pytest.mark.parametrize("page", [{}, {"page": None}], ids=["missing", "null"])
def test_p0_start_a_side_read_without_a_page_is_422_which_page_is_required(
    tmp_path: Path, page: dict
) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    kindred = _paused_side_read(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _start(api_client(tmp_path), kindred, **page)

    assert _field_error(response) == (
        422,
        "invalid_fields",
        [{"field": "page", "message": "Which page? is required."}],
    )
    assert response.json()["error"]["message"] == "Not saved. 1 field needs attention: Which page?."
    assert library_bytes(tmp_path) == before


@pytest.mark.parametrize("value", [400, -1, 12.5, "50", True])
def test_p0_start_with_a_page_out_of_range_is_422_page_must_be_between(
    tmp_path: Path, value: Any
) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    kindred = _paused_side_read(builder)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _start(api_client(tmp_path), kindred, page=value)

    assert _field_error(response) == (
        422,
        "invalid_fields",
        [{"field": "page", "message": "Page must be between 0 and 330."}],
    )
    assert library_bytes(tmp_path) == before


def test_p1_book_not_found_and_already_main_come_before_the_page_checks(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    builder.write(tmp_path)

    assert _field_error(_start(api_client(tmp_path), GONE_ID))[1] == "book_not_found"
    assert _field_error(_start(api_client(tmp_path), dune, page=9999))[1] == "already_main"


def test_p0_start_a_paused_side_read_below_its_page_resumes_there_and_leaves_the_side(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    kindred = _paused_side_read(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.side_read(emma)
    builder.write(tmp_path)
    reading_id = stored_book(tmp_path, kindred)["readings"][0]["id"]

    response = _start(api_client(tmp_path), kindred, page=50)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    stored = _stored(tmp_path)
    assert stored["mainBookId"] == kindred
    assert stored["upNextBookId"] == dune
    assert stored["sideReadBookIds"] == [emma]
    [reading] = stored_book(tmp_path, kindred)["readings"]
    assert (reading["id"], reading["currentPage"]) == (reading_id, 50)
    assert reading["finishDate"] is None
    assert_invariants(tmp_path)
    assert [s["id"] for s in _view(tmp_path, "/api/views/home")["sideReads"]] == [emma]


def test_p0_start_an_unstarted_side_read_at_its_last_page_reaches_the_last_page(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.side_read(emma)
    builder.write(tmp_path)

    response = _start(api_client(tmp_path), emma, page=400)

    assert response.status_code == 200
    assert response.json() == {"ok": True, "reachedLastPage": True}
    [reading] = stored_book(tmp_path, emma)["readings"]
    # Only finish-reading finishes: the Reading is the Main book's, at p.400.
    assert (reading["currentPage"], reading["finishDate"]) == (400, None)
    assert _stored(tmp_path)["sideReadBookIds"] == []
    assert_invariants(tmp_path)


def test_p1_a_page_sent_for_a_book_that_isnt_a_side_read_is_honored(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    emma = builder.book(title="Emma", pages=400)
    builder.reading(emma, current_page=40, paused_at=EARLIER)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.write(tmp_path)

    # Not a Side read and no page: unchanged behavior (page kept, no reachedLastPage).
    assert _start(api_client(tmp_path), emma).json() == {"ok": True}
    assert stored_book(tmp_path, emma)["readings"][0]["currentPage"] == 40

    response = _start(api_client(tmp_path), neuromancer, page=12)
    assert response.json() == {"ok": True}
    assert stored_book(tmp_path, neuromancer)["readings"][0]["currentPage"] == 12

    response = _start(api_client(tmp_path), neuromancer, page=999)
    assert response.status_code == 409  # already Main comes first
    assert response.json()["error"]["code"] == "already_main"
    response = _start(api_client(tmp_path), emma, page=999)
    assert _field_error(response) == (
        422,
        "invalid_fields",
        [{"field": "page", "message": "Page must be between 0 and 400."}],
    )


# --- the views --------------------------------------------------------------------


def test_p0_the_views_carry_the_side_read_fields(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    ids = {
        title: builder.book(title=title, authors=[f"{title} Author"], pages=200)
        for title in ("Emma", "Kindred", "Beloved", "Neuromancer")
    }
    # Stored order, not library order.
    for title in ("Beloved", "Emma", "Kindred"):
        builder.side_read(ids[title])
    builder.write(tmp_path)

    home = _view(tmp_path, "/api/views/home")
    assert home["sideReads"] == [
        {"id": ids[title], "title": title, "authors": [f"{title} Author"]}
        for title in ("Beloved", "Emma", "Kindred")
    ]
    shelf = {book["id"]: book["sideRead"] for book in home["books"]}
    assert shelf == {
        dune: False,
        ids["Emma"]: True,
        ids["Kindred"]: True,
        ids["Beloved"]: True,
        ids["Neuromancer"]: False,
    }

    def detail(book_id: str) -> tuple[bool, bool]:
        body = _view(tmp_path, f"/api/views/book?id={book_id}")
        return body["sideRead"], body["sideReadsFull"]

    assert detail(ids["Emma"]) == (True, False)
    assert detail(ids["Neuromancer"]) == (False, True)
    assert detail(dune) == (False, True)

    assert _unmark(api_client(tmp_path), ids["Emma"]).status_code == 200
    assert detail(ids["Neuromancer"]) == (False, False)
    assert detail(ids["Emma"]) == (False, False)
    assert [s["id"] for s in _view(tmp_path, "/api/views/home")["sideReads"]] == [
        ids["Beloved"],
        ids["Kindred"],
    ]


# --- the standard intent ACs (TR8) ------------------------------------------------


@pytest.mark.parametrize("path", [MARK_SIDE_READ, UNMARK_SIDE_READ], ids=["mark", "unmark"])
def test_p0_mark_and_unmark_meet_the_standard_intent_acs(tmp_path: Path, path: str) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    if path == UNMARK_SIDE_READ:
        builder.side_read(emma)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # A write, fsync or rename fault: 503 couldnt_save and the file is byte-identical.
    for step in ("write", "fsync", "replace"):
        response = _post(api_client(tmp_path, fs=FaultyFs(step)), path, {"bookId": emma})
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(tmp_path) == before, step

    # A Book that no longer exists: 409 book_not_found, nothing changes.
    response = _post(api_client(tmp_path), path, {"bookId": GONE_ID})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_not_found"
    assert library_bytes(tmp_path) == before

    # A malformed intent: 422 invalid_fields on `intent`.
    for raw in ("{", json.dumps({"bookId": None}), json.dumps({"bookId": emma, "x": 1})):
        response = api_client(tmp_path).post(
            path, files={"intent": (None, raw, "application/json")}
        )
        assert response.status_code == 422, raw
        assert response.json()["error"]["code"] == "invalid_fields", raw
        assert response.json()["error"]["fields"][0]["field"] == "intent", raw
    assert library_bytes(tmp_path) == before

    # After a success, the invariants hold.
    assert _post(api_client(tmp_path), path, {"bookId": emma}).status_code == 200
    assert library_bytes(tmp_path) != before
    assert_invariants(tmp_path)

    # The contract: the route is documented with the error envelope.
    openapi = create_app().openapi()
    responses = openapi["paths"][path]["post"]["responses"]
    for status in ("409", "422", "500", "503"):
        ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
        assert ref == "#/components/schemas/ErrorResponse"
    assert "413" not in responses
    codes = openapi["components"]["schemas"]["ErrorCode"]["enum"]
    assert {"main_cannot_be_side_read", "side_reads_full"} <= set(codes)
