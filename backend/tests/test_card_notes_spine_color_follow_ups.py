"""Story 14.1 follow-ups: the card-notes color's secondary branches (``bmad-testarch-automate``).

The ATDD checklist's green-phase follow-ups that ``test_card_notes_spine_color.py``
doesn't reach: a cover replaced or removed through ``edit-book`` (AC-4 covers the
popover and the Spine color field), the scope's color equal to its group's for
every Book with notes (AC-2 checks one), and a restored library, whose Books'
colors the view carries on the next read.
"""

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from tests.builder import CURATED, LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_FORM,
    DUNE_ID,
    EDIT_BOOK,
    api_client,
    image_bytes,
    library_bytes,
    post_restore,
    stored_book,
)
from tests.test_card_notes_spine_color import AS_STORED, CARD_NOTES_VIEW, FROM_COVER, USER, _seed

EXPORT = "/api/export"
EXPORT_HEADERS = {"X-Bookvie-Export": "1"}


def _get(client: TestClient, book: str | None = None) -> Any:
    """``GET /api/views/card-notes`` (scoped to ``book`` when given), which must answer 200."""
    params = {"book": book} if book is not None else None
    response = client.get(CARD_NOTES_VIEW, params=params)
    assert response.status_code == 200, (book, response.status_code, response.text[:300])
    return response.json()


def _colors(client: TestClient, book_id: str) -> tuple[str, str, str]:
    """The Book's color in the unscoped group, the scope and the scoped group, in that order."""
    unscoped = {group["bookId"]: group["spineColor"] for group in _get(client)["groups"]}
    scoped = _get(client, book_id)
    return unscoped[book_id], scoped["scope"]["spineColor"], scoped["groups"][0]["spineColor"]


def _seed_dune_with_cover_and_a_note(data_dir: Path) -> None:
    """Dune with a stored cover (color ``FROM_COVER``) and one Card note."""
    cover_file = f"covers/{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
    builder = LibraryBuilder()
    builder.book(id=DUNE_ID, **DUNE, cover_file=cover_file, spine_color_from_cover=FROM_COVER)
    builder.card_note(DUNE_ID, text="Fear is the mind-killer.", page_start=12)
    builder.write(data_dir)
    (data_dir / "covers").mkdir(exist_ok=True)
    (data_dir / cover_file).write_bytes(image_bytes(fmt="JPEG"))


def _edit_cover(client: TestClient, cover: bytes | None, **changes: Any) -> int:
    """``edit-book`` for Dune, prefilled, with a new ``cover`` part when given; its status."""
    intent = {"bookId": DUNE_ID, **DUNE_FORM, **changes}
    files: dict[str, tuple] = {"intent": (None, json.dumps(intent), "application/json")}
    if cover is not None:
        files["cover"] = ("cover.png", cover, "image/png")
    return client.post(EDIT_BOOK, files=files).status_code


# --- A cover replaced or removed through edit-book ------------------------------


def test_a_cover_replaced_through_edit_book_shows_its_new_color_on_the_next_read(
    tmp_path: Path,
) -> None:
    # [P2] AC-4 follow-up: a new cover re-resolves spineColorFromCover, and the next read of
    # the view carries the new stored spineColor in the group and the scope.
    _seed_dune_with_cover_and_a_note(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    assert _colors(client, DUNE_ID) == (FROM_COVER,) * 3  # read once, as the page would have

    # A cover of another hue: the stored color moves off FROM_COVER.
    assert _edit_cover(client, image_bytes(color=(40, 90, 200))) == 200
    replaced = stored_book(tmp_path, DUNE_ID)["spineColor"]
    assert replaced not in (FROM_COVER, None), replaced
    assert replaced == stored_book(tmp_path, DUNE_ID)["spineColorFromCover"]
    assert _colors(client, DUNE_ID) == (replaced,) * 3

    # Removing the cover falls back to the curated color, in the view too.
    assert _edit_cover(client, None, removeCover=True) == 200
    curated = stored_book(tmp_path, DUNE_ID)["spineColorCurated"]
    assert stored_book(tmp_path, DUNE_ID)["spineColor"] == curated
    assert _colors(client, DUNE_ID) == (curated,) * 3


def test_a_user_color_survives_a_cover_replaced_through_edit_book_in_the_view(
    tmp_path: Path,
) -> None:
    # [P2] AC-4 follow-up: with a user color, a new cover changes spineColorFromCover but not
    # spineColor, and the view keeps showing the user color.
    _seed_dune_with_cover_and_a_note(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    assert _edit_cover(client, None, spineColor=USER) == 200
    assert _colors(client, DUNE_ID) == (USER,) * 3

    assert _edit_cover(client, image_bytes(color=(40, 90, 200)), spineColor=USER) == 200

    assert stored_book(tmp_path, DUNE_ID)["spineColorFromCover"] != FROM_COVER
    assert _colors(client, DUNE_ID) == (USER,) * 3


# --- The scope's color equals its group's, for every Book with notes ------------


def test_the_scopes_color_equals_its_groups_for_every_book_with_notes(tmp_path: Path) -> None:
    # [P2] AC-2 follow-up: for each seeded Book with notes (user, cover, palette, as stored),
    # the scoped view's scope and its one group carry the same color, and that color is the
    # one the unscoped view's group for that Book carries.
    ids = _seed(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)
    with_notes = [ids[kind] for kind in ("user", "cover", "palette", "stored")]

    seen = {book_id: _colors(client, book_id) for book_id in with_notes}

    for book_id, (unscoped, scope, group) in seen.items():
        assert unscoped == scope == group == stored_book(tmp_path, book_id)["spineColor"], book_id
    assert {colors[0] for colors in seen.values()} >= {USER, FROM_COVER, AS_STORED}


# --- A restored library ---------------------------------------------------------


def test_after_a_restore_the_view_carries_the_restored_books_colors(tmp_path: Path) -> None:
    # [P2] AC-1/AC-3 follow-up: a restore replaces library.json, and the next read of the
    # view carries the restored Books' stored colors, not the ones read before it.
    source = tmp_path / "source"
    ids = _seed(source)
    archive = api_client(source).get(EXPORT, headers=EXPORT_HEADERS).content

    target = tmp_path / "target"
    builder = LibraryBuilder()
    other = builder.book(title="Walden", pages=352, spine_color_user=CURATED[0])
    builder.card_note(other, text="Not the restored note.", page_start=1)
    builder.write(target)
    client = api_client(target, raise_server_exceptions=True)
    assert [g["spineColor"] for g in _get(client)["groups"]] == [CURATED[0]]  # before

    assert post_restore(client, archive).status_code == 200
    assert library_bytes(target) == library_bytes(source)

    body = _get(client)
    assert [group["bookId"] for group in body["groups"]] == [
        ids["cover"],
        ids["palette"],
        ids["stored"],
        ids["user"],
    ]
    assert [group["spineColor"] for group in body["groups"]] == [
        FROM_COVER,
        stored_book(source, ids["palette"])["spineColorCurated"],
        AS_STORED,
        USER,
    ]
    bare = _get(client, ids["bare"])
    assert bare["scope"]["spineColor"] == stored_book(source, ids["bare"])["spineColor"]
    assert bare["groups"] == []
