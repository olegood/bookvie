"""Story 1.14: ``set-spine-color`` changes a Book's color from the shelf (FR-24, AD-11).

One red-phase test for the one server-side acceptance criterion (AC-6, the
standard intent ACs, numbered in the order of epics.md, Story 1.14). AC-1 to
AC-5 are the Spine popover and the Change color block, in
``frontend/e2e/spine-popover.spec.ts``.

The tests pin these names:

- ``POST /api/intents/set-spine-color``, ``multipart/form-data`` with a JSON
  part named ``intent`` holding ``{"bookId": ..., "spineColor": ...}``, as
  ``delete-book`` does. ``spineColor`` is ``#RRGGBB`` (a swatch) or ``null``
  ("From cover": clears the user color). Success is exactly ``{ok: true}``.
- Only ``spineColorUser`` and the resolved ``spineColor`` change (user, else
  from cover, else curated: AD-11); ``spineColorFromCover`` and
  ``spineColorCurated`` are never touched.
- 409 ``book_not_found`` for a Book that is gone; no new error code.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library, check_invariants
from bookvie.http.app import create_app
from bookvie.intents import COULDNT_SAVE_MESSAGE
from tests.builder import LibraryBuilder
from tests.test_add_book import _client, _field_messages, _library_bytes, _stored_book
from tests.test_cover import DUNE_ID, _seed_dune_with_cover
from tests.test_store import FaultyFs

SET_SPINE_COLOR = "/api/intents/set-spine-color"
GONE_ID = "00000000-0000-4000-8000-000000000000"
SAGE = "#749076"
SLATE = "#5B7590"
TEAL = "#4B7C7B"
FROM_COVER = "#A85A4A"
"""The cover color ``_seed_dune_with_cover`` stores."""


def _set(client: TestClient, book_id: str, color: str | None):
    """``set-spine-color`` as a swatch (``#RRGGBB``) or "From cover" (``None``) sends it."""
    intent = {"bookId": book_id, "spineColor": color}
    return client.post(
        SET_SPINE_COLOR,
        files={"intent": (None, json.dumps(intent), "application/json")},
    )


def _colors(data_dir: Path, book_id: str) -> tuple[str | None, str | None, str, str]:
    """``(spineColorUser, spineColorFromCover, spineColorCurated, spineColor)`` as stored."""
    book = _stored_book(data_dir, book_id)
    return (
        book["spineColorUser"],
        book["spineColorFromCover"],
        book["spineColorCurated"],
        book["spineColor"],
    )


def _assert_invariants(data_dir: Path) -> None:
    check_invariants(Library.model_validate_json(_library_bytes(data_dir)))


# --- AC-6: the standard intent guarantees (TR8) ---------------------------------


def test_ac6_p0_set_spine_color_keeps_the_standard_intent_guarantees(
    tmp_path: Path,
) -> None:
    for step in ("write", "fsync", "replace"):
        data_dir = tmp_path / step
        builder = LibraryBuilder()
        dune = builder.book(title="Dune", pages=412)
        builder.write(data_dir)
        before = _library_bytes(data_dir)

        response = _set(_client(data_dir, fs=FaultyFs(step)), dune, TEAL)

        assert response.status_code == 503, step
        assert response.json() == {
            "error": {
                "kind": "couldnt_save",
                "code": "couldnt_save",
                "message": COULDNT_SAVE_MESSAGE,
            }
        }, step
        # The color didn't land: one commit or none.
        assert _library_bytes(data_dir) == before, step

    # Success keeps the invariants: a swatch sets the user color, which wins
    # over the cover; "From cover" clears it, so the cover's color is back.
    data_dir = tmp_path / "ok"
    _seed_dune_with_cover(data_dir)
    client = _client(data_dir)
    assert _colors(data_dir, DUNE_ID) == (None, FROM_COVER, SAGE, FROM_COVER)

    response = _set(client, DUNE_ID, TEAL)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _colors(data_dir, DUNE_ID) == (TEAL, FROM_COVER, SAGE, TEAL)
    _assert_invariants(data_dir)

    assert _set(client, DUNE_ID, None).status_code == 200
    assert _colors(data_dir, DUNE_ID) == (None, FROM_COVER, SAGE, FROM_COVER)
    _assert_invariants(data_dir)

    # Without a cover, clearing the user color falls back to the curated one.
    data_dir = tmp_path / "curated"
    builder = LibraryBuilder()
    builder.book(title="Dune", pages=412)
    neuromancer = builder.book(title="Neuromancer", pages=271, spine_color_user=TEAL)
    builder.write(data_dir)
    client = _client(data_dir)
    assert _set(client, neuromancer, None).status_code == 200
    assert _colors(data_dir, neuromancer) == (None, None, SLATE, SLATE)
    _assert_invariants(data_dir)

    # A Book that no longer exists is refused, and nothing changes.
    before = _library_bytes(data_dir)
    gone = _set(client, GONE_ID, TEAL)
    assert gone.status_code == 409
    assert gone.json()["error"]["code"] == "book_not_found"
    assert _library_bytes(data_dir) == before

    # set-spine-color adds no error code; the one it uses is in the contract (AD-8).
    schema = create_app().openapi()
    assert SET_SPINE_COLOR in schema["paths"]
    assert "book_not_found" in schema["components"]["schemas"]["ErrorCode"]["enum"]


# --- AC-4 (API): what a pick stores ---------------------------------------------


def test_a_lowercase_hex_is_accepted_and_stored_as_sent(tmp_path: Path) -> None:
    _seed_dune_with_cover(tmp_path)
    response = _set(_client(tmp_path), DUNE_ID, "#4b7c7b")
    assert response.status_code == 200
    assert _colors(tmp_path, DUNE_ID) == ("#4b7c7b", FROM_COVER, SAGE, "#4b7c7b")


def test_a_repeated_pick_still_commits_and_returns_ok(tmp_path: Path) -> None:
    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=412, spine_color_user=TEAL)
    builder.write(tmp_path)
    client = _client(tmp_path)
    response = _set(client, dune, TEAL)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert _colors(tmp_path, dune) == (TEAL, None, SAGE, TEAL)
    _assert_invariants(tmp_path)


def test_only_the_user_color_and_the_resolved_color_change(tmp_path: Path) -> None:
    _seed_dune_with_cover(tmp_path)
    before = _stored_book(tmp_path, DUNE_ID)
    client = _client(tmp_path)
    for color in (TEAL, SLATE, None, TEAL):
        assert _set(client, DUNE_ID, color).status_code == 200
        after = _stored_book(tmp_path, DUNE_ID)
        changed = {key for key in before if before[key] != after[key]}
        assert changed <= {"spineColorUser", "spineColor"}, color
        assert after["spineColorFromCover"] == FROM_COVER
        assert after["spineColorCurated"] == SAGE


@pytest.mark.parametrize(
    "color", ["Teal", "#12345", "", "#4B7C7BFF", " #4B7C7B", "#GGGGGG"]
)
def test_a_color_that_is_not_hex_is_refused_on_spine_color(
    tmp_path: Path, color: str
) -> None:
    _seed_dune_with_cover(tmp_path)
    before = _library_bytes(tmp_path)
    response = _set(_client(tmp_path), DUNE_ID, color)
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "invalid_fields"
    assert body["message"] == "Not saved. 1 field needs attention: Spine color."
    assert _field_messages(response) == {
        "spineColor": "Spine color must be #RRGGBB or empty."
    }
    assert _library_bytes(tmp_path) == before


@pytest.mark.parametrize(
    "intent",
    [
        None,
        "not json",
        "null",
        "[]",
        json.dumps({"bookId": DUNE_ID}),
        json.dumps({"spineColor": TEAL}),
        json.dumps({"bookId": None, "spineColor": TEAL}),
        json.dumps({"bookId": 7, "spineColor": TEAL}),
        json.dumps({"bookId": DUNE_ID, "spineColor": 7}),
        json.dumps({"bookId": DUNE_ID, "spineColor": TEAL, "extra": True}),
    ],
    ids=[
        "no-part",
        "not-json",
        "null",
        "array",
        "missing-color",
        "missing-id",
        "null-id",
        "number-id",
        "number-color",
        "extra-key",
    ],
)
def test_a_malformed_set_spine_color_intent_is_an_intent_field_error(
    tmp_path: Path, intent: str | None
) -> None:
    _seed_dune_with_cover(tmp_path)
    before = _library_bytes(tmp_path)
    client = _client(tmp_path)
    if intent is None:
        response = client.post(SET_SPINE_COLOR)
    else:
        response = client.post(
            SET_SPINE_COLOR, files={"intent": (None, intent, "application/json")}
        )
    assert response.status_code == 422
    assert _field_messages(response) == {
        "intent": "The intent must be a JSON object of the form's fields."
    }
    assert _library_bytes(tmp_path) == before
