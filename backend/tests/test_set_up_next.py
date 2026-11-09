"""Story 4.4 Choose what to read next: the ``set-up-next`` intent (API).

One leaf per criterion the server decides (RDG-API-003, R-01):

- AC-2: ``set-up-next`` for the current Up next is a 200 no-op that commits
  nothing (AD-9).
- AC-4: the earlier Up next *Z* is displaced: to Waiting for you when it has a
  paused Reading, else back to the catalog. Only the pointer moves (FR-7).
- AC-6: the Main book is refused with 409 ``main_cannot_be_up_next``.
- AC-8: a finished Book with no unfinished Reading, and a Side read, become
  Up next like any other Book.
- AC-9: the standard intent ACs (TR8).

The Book detail and spine popover buttons, the ``status`` line, focus and
the routed 503 are read in the browser (``frontend/e2e/set-up-next.spec.ts``).
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.builder import LibraryBuilder
from tests.helpers import (
    COULDNT_SAVE_BODY,
    SET_UP_NEXT,
    START_READING,
    FaultyFs,
    RecordingFs,
    api_client,
    assert_invariants,
    library_bytes,
    stored_book,
)

GONE_ID = "00000000-0000-4000-8000-000000000000"
EARLIER = "2026-10-01"


def _set_up_next(client: TestClient, book_id: str):
    """``set-up-next`` as Book detail and the spine popover send it."""
    return client.post(
        SET_UP_NEXT, files={"intent": (None, json.dumps({"bookId": book_id}), "application/json")}
    )


def _stored(data_dir: Path) -> dict:
    return json.loads(library_bytes(data_dir))


def _home(data_dir: Path) -> dict:
    return api_client(data_dir, raise_server_exceptions=True).get("/api/views/home").json()


def _roles(data_dir: Path) -> dict[str, str | None]:
    """Each Book's shelf role, by id."""
    shelf = api_client(data_dir, raise_server_exceptions=True).get("/api/views/catalog").json()
    return {book["id"]: book["role"] for book in shelf["books"]}


def _main_dune(builder: LibraryBuilder) -> str:
    """Dune as the Main book at p.150 of 412."""
    dune = builder.book(title="Dune", authors=["Frank Herbert"], pages=412)
    builder.reading(dune, current_page=150, purpose="Arrakis")
    builder.main(dune)
    return dune


# --- AC-2: the current Up next again is a no-op ------------------------------------


def test_ac2_p1_set_up_next_for_the_current_up_next_is_a_200_no_op_that_commits_nothing(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # A write fault: any commit would answer 503, so a 200 means nothing was written.
    response = _set_up_next(api_client(tmp_path, fs=FaultyFs("write")), emma)

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert library_bytes(tmp_path) == before

    # Not even a rename: the store never reached its commit.
    log: list[str] = []
    response = _set_up_next(api_client(tmp_path, fs=RecordingFs(tmp_path, log)), emma)
    assert response.status_code == 200
    assert log == []
    assert library_bytes(tmp_path) == before


# --- AC-4: the displaced Up next goes where its Readings say -----------------------


def test_ac4_p0_a_new_up_next_displaces_a_paused_z_to_waiting_and_an_unstarted_z_to_the_catalog(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    neuromancer = builder.book(title="Neuromancer", pages=271)
    builder.reading(neuromancer, current_page=40, purpose="Cyberspace", paused_at=EARLIER)
    builder.up_next(neuromancer)
    emma = builder.book(title="Emma", pages=400)
    kindred = builder.book(title="Kindred", pages=264)
    builder.write(tmp_path)
    z_before = stored_book(tmp_path, neuromancer)

    # 1. A paused Up next Z moves to Waiting for you.
    response = _set_up_next(api_client(tmp_path), emma)

    assert [w["id"] for w in _home(tmp_path)["waiting"]] == [neuromancer]
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (dune, emma)
    assert stored_book(tmp_path, neuromancer) == z_before
    assert stored_book(tmp_path, emma)["readings"] == []
    assert_invariants(tmp_path)
    roles = _roles(tmp_path)
    assert (roles[neuromancer], roles[emma]) == ("waiting", "upNext")
    home = _home(tmp_path)
    assert home["upNext"]["id"] == emma
    assert home["upNext"]["paused"] is False

    # 2. An unstarted Up next Z returns to the catalog.
    emma_before = stored_book(tmp_path, emma)
    response = _set_up_next(api_client(tmp_path), kindred)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (dune, kindred)
    assert stored_book(tmp_path, emma) == emma_before
    assert _roles(tmp_path)[emma] is None
    assert [w["id"] for w in _home(tmp_path)["waiting"]] == [neuromancer]
    assert_invariants(tmp_path)


def test_ac4_p1_a_displaced_never_started_side_read_stays_on_the_side(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.side_read(emma)
    kindred = builder.book(title="Kindred", pages=264)
    builder.write(tmp_path)
    emma_before = stored_book(tmp_path, emma)

    response = _set_up_next(api_client(tmp_path), kindred)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert (stored["mainBookId"], stored["upNextBookId"]) == (dune, kindred)
    assert stored["sideReadBookIds"] == [emma]
    assert stored_book(tmp_path, emma) == emma_before
    assert_invariants(tmp_path)


# --- AC-6: the Main book can't be Up next -------------------------------------------


def test_ac6_p0_set_up_next_for_the_main_book_is_refused_with_main_cannot_be_up_next(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.up_next(emma)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = _set_up_next(api_client(tmp_path), dune)

    assert response.json().get("error", {}).get("code") == "main_cannot_be_up_next"
    assert response.status_code == 409
    body = response.json()["error"]
    assert body["kind"] == "refusal"
    assert body["message"]
    assert library_bytes(tmp_path) == before


# --- AC-8: a finished Book and a Side read are Books like any other ----------------


def test_ac8_p1_a_finished_book_and_a_side_read_become_up_next_like_any_other_book(
    tmp_path: Path,
) -> None:
    builder = LibraryBuilder()
    dune = _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    builder.reading(
        emma,
        start_date="2026-03-01",
        current_page=400,
        finish_date="2026-04-10",
        finished_pages=400,
        rating=4,
    )
    kindred = builder.book(title="Kindred", pages=264)
    builder.reading(kindred, current_page=60, paused_at=EARLIER)
    builder.side_read(kindred)
    builder.write(tmp_path)
    kindred_before = stored_book(tmp_path, kindred)

    # 1. A Side read becomes Up next and stays a Side read.
    response = _set_up_next(api_client(tmp_path), kindred)

    assert _stored(tmp_path)["upNextBookId"] == kindred
    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert stored["sideReadBookIds"] == [kindred]
    assert stored["mainBookId"] == dune
    assert stored_book(tmp_path, kindred) == kindred_before
    assert_invariants(tmp_path)
    # A paused Up next shows Resume, and only in Up next (Book states rule 2).
    home = _home(tmp_path)
    assert (home["upNext"]["id"], home["upNext"]["paused"]) == (kindred, True)
    assert [w["id"] for w in home["waiting"]] == []

    # 2. A finished Book with no unfinished Reading becomes Up next: Start reading.
    emma_before = stored_book(tmp_path, emma)
    response = _set_up_next(api_client(tmp_path), emma)

    assert response.status_code == 200
    stored = _stored(tmp_path)
    assert stored["upNextBookId"] == emma
    assert stored["sideReadBookIds"] == [kindred]
    assert stored_book(tmp_path, emma) == emma_before
    assert_invariants(tmp_path)
    home = _home(tmp_path)
    assert (home["upNext"]["id"], home["upNext"]["paused"]) == (emma, False)
    # The displaced Side read is paused, so it is in Waiting for you.
    assert [w["id"] for w in home["waiting"]] == [kindred]

    # Its Start reading starts a re-read: a new Reading, the finished one kept.
    intent = json.dumps({"bookId": emma, "purpose": None})
    response = api_client(tmp_path).post(
        START_READING, files={"intent": (None, intent, "application/json")}
    )
    assert response.status_code == 200
    readings = stored_book(tmp_path, emma)["readings"]
    assert len(readings) == 2
    assert [r for r in readings if r["finishDate"] is not None] == emma_before["readings"]
    assert _stored(tmp_path)["mainBookId"] == emma
    assert_invariants(tmp_path)


# --- AC-9: the standard intent ACs (TR8) ----------------------------------------


def test_ac9_p0_set_up_next_meets_the_standard_intent_acs(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    _main_dune(builder)
    emma = builder.book(title="Emma", pages=400)
    kindred = builder.book(title="Kindred", pages=264)
    builder.up_next(kindred)
    builder.write(tmp_path)
    before = library_bytes(tmp_path)

    # A write, fsync or rename fault: 503 couldnt_save and the file is byte-identical.
    for step in ("write", "fsync", "replace"):
        response = _set_up_next(api_client(tmp_path, fs=FaultyFs(step)), emma)
        assert response.status_code == 503, step
        assert response.json() == COULDNT_SAVE_BODY, step
        assert library_bytes(tmp_path) == before, step

    # A Book that no longer exists: 409 book_not_found, nothing changes.
    response = _set_up_next(api_client(tmp_path), GONE_ID)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_not_found"
    assert library_bytes(tmp_path) == before

    # A malformed intent: 422 invalid_fields on `intent`.
    response = api_client(tmp_path).post(
        SET_UP_NEXT, files={"intent": (None, "{", "application/json")}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert library_bytes(tmp_path) == before

    # After a success, the invariants hold.
    assert _set_up_next(api_client(tmp_path), emma).status_code == 200
    assert_invariants(tmp_path)

    # The contract: the route is documented with the error envelope.
    openapi = create_app().openapi()
    responses = openapi["paths"][SET_UP_NEXT]["post"]["responses"]
    for status in ("409", "422", "500", "503"):
        ref = responses[status]["content"]["application/json"]["schema"]["$ref"]
        assert ref == "#/components/schemas/ErrorResponse"
    assert "413" not in responses
    codes = openapi["components"]["schemas"]["ErrorCode"]["enum"]
    assert "main_cannot_be_up_next" in codes
