"""Story 5.4: the export → restore round trip with full data (BKP-API-001 re-run).

Epic 5's gate re-runs Epic 2's byte-identical round trip on a library holding
every state Epics 3 to 5 added: Card notes on several Books (ranges, the same
page twice, multi-line and non-ASCII text, a note on a finished Book's last
page), a paused Reading that is not Up next, an Up next Book, three Side
reads, a reread finished Book and covers. AC-7 in
``_bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md``.

This leaf is green on arrival: Story 2.2's ``test_restore.py`` ac6 already
round-trips a smaller full library, and nothing in 5.4 changes export or
restore. It is skipped as the red phase requires, and is activated with the
rest of the story as a regression re-run, not new behaviour (decided with
Oleg, 2026-11-10).
"""

from pathlib import Path

import pytest

from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_ID,
    api_client,
    covers_in,
    image_bytes,
    library_bytes,
    post_restore,
)

RED = "ATDD red phase (story 5.4): activate with the story; green on arrival, a regression re-run"

EXPORT = "/api/export"
EXPORT_HEADERS = {"X-Bookvie-Export": "1"}

NEUROMANCER_ID = "1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c"
LEFT_HAND_ID = "3b8f2c1a-5d4e-4f6a-9b7c-1e2d3c4b5a69"
DISPOSSESSED_ID = "7c2d9e1f-4a6b-4c8d-a0e1-2f3a4b5c6d7e"
CIEN_ANOS_ID = "5d3c1b2a-6e7f-4a8b-9c0d-1e2f3a4b5c6d"
EMMA_ID = "9c4d2b1a-7e6f-4a5b-8c9d-0e1f2a3b4c5d"
PIRANESI_ID = "9e4f0a2b-5c7d-4e9f-b1a2-3c4d5e6f7a8b"
UNREAD_ID = "4e2a6c8b-1d3f-4a5b-9c7d-8e9f0a1b2c3d"

DUNE_COVER = f"{DUNE_ID}-0f0e0d0c-0b0a-4908-8706-050403020100.jpg"
PIRANESI_COVER = f"{PIRANESI_ID}-11111111-2222-4333-8444-555555555555.png"


def _seed_full(data_dir: Path) -> dict[str, bytes]:
    """Every state Epics 3 to 5 added, seeded with ``LibraryBuilder`` (TC-1).

    - Dune is the Main book at p.150, with a JPEG cover and five notes stored
      out of page order: a range, two notes on p.96 a day apart, a multi-line
      note and one with non-ASCII punctuation.
    - Neuromancer is Up next, paused at p.80, with one note.
    - The Left Hand of Darkness is paused at p.60 and not Up next (Waiting
      for you), with a range note.
    - The Dispossessed, Cien años de soledad and Emma are the three Side
      reads; Cien años has a Spanish note.
    - Piranesi was read twice (one back-filled), has a user spine color, a
      transparent PNG cover and a note on its last page (the Pages floor).
    - One unread Book has nothing.

    Returns each cover's bytes by file name.
    """
    builder = LibraryBuilder()
    builder.book(
        id=DUNE_ID,
        **DUNE,
        cover_file=f"covers/{DUNE_COVER}",
        spine_color_from_cover="#A85A4A",
        tags=["sf", "classics"],
        readings=[{"currentPage": 150, "purpose": "Reread before the film"}],
        card_notes=[
            {"text": "The mystery of life isn’t a problem to solve.", "pageStart": 300},
            {
                "text": "The spice must flow.",
                "pageStart": 96,
                "createdAt": "2026-10-21T20:15:00+02:00",
            },
            {
                "text": "A beginning is the time\nfor taking the most delicate care.",
                "pageStart": 42,
                "pageEnd": 45,
            },
            {
                "text": "Arrakis — Dune — Desert Planet.",
                "pageStart": 96,
                "createdAt": "2026-10-20T08:05:00+02:00",
            },
            {"text": "Fear is the mind-killer.", "pageStart": 12},
        ],
    )
    builder.book(
        id=NEUROMANCER_ID,
        title="Neuromancer",
        authors=["William Gibson"],
        pages=271,
        readings=[{"currentPage": 80, "pausedAt": "2026-10-20"}],
        card_notes=[
            {"text": "The sky above the port was the color of television.", "pageStart": 3}
        ],
    )
    builder.book(
        id=LEFT_HAND_ID,
        title="The Left Hand of Darkness",
        authors=["Ursula K. Le Guin"],
        pages=304,
        readings=[{"currentPage": 60, "pausedAt": "2026-10-12", "purpose": "Book club"}],
        card_notes=[
            {"text": "Light is the left hand of darkness.", "pageStart": 42, "pageEnd": 44}
        ],
    )
    builder.book(
        id=DISPOSSESSED_ID,
        title="The Dispossessed",
        authors=["Ursula K. Le Guin"],
        pages=387,
        readings=[{"currentPage": 120}],
    )
    builder.book(
        id=CIEN_ANOS_ID,
        title="Cien años de soledad",
        authors=["Gabriel García Márquez"],
        pages=471,
        language="Spanish",
        tags=["clásicos"],
        readings=[{"currentPage": 33}],
        card_notes=[
            {"text": "Muchos años después, frente al pelotón de fusilamiento…", "pageStart": 1}
        ],
    )
    builder.book(
        id=EMMA_ID,
        title="Emma",
        authors=["Jane Austen"],
        pages=474,
        readings=[{"currentPage": 10}],
    )
    builder.book(
        id=PIRANESI_ID,
        title="Piranesi",
        authors=["Susanna Clarke"],
        pages=272,
        cover_file=f"covers/{PIRANESI_COVER}",
        spine_color_from_cover="#5B7590",
        spine_color_user="#7A6283",
        readings=[
            {
                "startDate": None,
                "currentPage": 272,
                "lastProgressUpdate": None,
                "finishDate": "2025-03-14",
                "finishedPages": 272,
                "rating": 5,
            },
            {
                "startDate": "2026-09-01",
                "currentPage": 272,
                "finishDate": "2026-09-30",
                "finishedPages": 272,
                "purposeFulfilled": "yes",
                "rating": 4,
            },
        ],
        card_notes=[{"text": "The Beauty of the House is immeasurable.", "pageStart": 272}],
    )
    builder.book(id=UNREAD_ID, title="Middlemarch", authors=["George Eliot"], pages=880)
    builder.main(DUNE_ID).up_next(NEUROMANCER_ID)
    builder.side_read(DISPOSSESSED_ID).side_read(CIEN_ANOS_ID).side_read(EMMA_ID)
    builder.write(data_dir)
    covers = {
        DUNE_COVER: image_bytes(fmt="JPEG"),
        PIRANESI_COVER: image_bytes(mode="RGBA", color=(91, 117, 144, 128)),
    }
    (data_dir / "covers").mkdir(exist_ok=True)
    for name, data in covers.items():
        (data_dir / "covers" / name).write_bytes(data)
    return covers


def _export(data_dir: Path) -> bytes:
    """The real export of ``data_dir`` (Story 2.1), as the browser downloads it."""
    return api_client(data_dir).get(EXPORT, headers=EXPORT_HEADERS).content


@pytest.mark.skip(reason=RED)
def test_ac7_p0_export_then_restore_with_full_data_is_byte_identical(tmp_path: Path) -> None:
    source = tmp_path / "source"
    covers = _seed_full(source)
    archive = _export(source)
    fresh = tmp_path / "fresh"
    fresh.mkdir()
    client = api_client(fresh)  # a new laptop: an empty library

    post_restore(client, archive)

    # The criterion: library.json is byte-identical to the original.
    assert library_bytes(fresh) == library_bytes(source)
    # And every cover.
    assert covers_in(fresh) == covers
    assert covers_in(fresh) == covers_in(source)

    # The restored library reads back with its states: the views see them.
    home = client.get("/api/views/home").json()
    assert home["mainBook"]["id"] == DUNE_ID
    assert home["mainBook"]["cardNoteCount"] == 5
    card_notes = client.get("/api/views/card-notes").json()
    assert sum(len(group["notes"]) for group in card_notes["groups"]) == 9

    # Restoring the same export again onto the restored library changes nothing.
    post_restore(client, archive)

    assert library_bytes(fresh) == library_bytes(source)
    assert covers_in(fresh) == covers
