"""What an ``edit-book`` back-fill does beyond adding the Reading (epic 4 retro items 34 and 35).

A back-fill on a Book with no Readings finishes it, so the Book leaves the Side
reads (FR-8) and keeps Up next; beside a paused Reading the Book stays. Every
back-fill counts from page 0. The Finished on rules themselves are proven in
``test_edit_book_finished_on.py``.
"""

import json
from pathlib import Path

import pytest

from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_FORM,
    NEUROMANCER,
    api_client,
    assert_invariants,
    library_bytes,
    post_edit_book,
    stored_readings,
)


def test_a_back_fill_counts_from_page_0(tmp_path: Path, library_builder: LibraryBuilder) -> None:
    """Epic 4 retro item 35: a back-fill has no starting page, whatever the Book's length."""
    dune = library_builder.book(**DUNE)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, finishedOn="2020-01-01").status_code == 200
    (reading,) = stored_readings(tmp_path, dune)
    assert (reading["startDate"], reading["startPage"]) == (None, 0)


def test_a_back_fill_on_a_never_started_side_read_takes_it_off_the_side_and_keeps_up_next(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """FR-8: a finished Side read leaves. Epic 4 retro F-R4."""
    dune = library_builder.book(**DUNE)
    other = library_builder.book(**NEUROMANCER)
    library_builder.side_read(dune).side_read(other).up_next(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, finishedOn="2020-01-01").status_code == 200
    stored = json.loads(library_bytes(tmp_path))
    assert stored["sideReadBookIds"] == [other]
    assert stored["upNextBookId"] == dune
    assert_invariants(tmp_path)


def test_a_back_fill_beside_a_paused_reading_stays_on_the_side(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """The back-fill adds a past Reading; the Book is still being read."""
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=50, paused_at="2026-10-01")
    library_builder.side_read(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, finishedOn="2020-01-01").status_code == 200
    assert json.loads(library_bytes(tmp_path))["sideReadBookIds"] == [dune]
    assert len(stored_readings(tmp_path, dune)) == 2


@pytest.mark.parametrize(
    "changes", [{"subtitle": "A Novel"}, {"finishedOn": "2020-02-02"}], ids=["plain", "new date"]
)
def test_an_edit_that_adds_no_back_fill_keeps_a_finished_side_read(
    tmp_path: Path, library_builder: LibraryBuilder, changes: dict[str, str]
) -> None:
    """A finished Book can be marked as a Side read; only the finishing back-fill removes one."""
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune, start_date=None, finish_date="2020-01-01", finished_pages=DUNE["pages"]
    )
    library_builder.side_read(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2020-01-01"}

    assert post_edit_book(client, dune, form, **changes).status_code == 200
    assert json.loads(library_bytes(tmp_path))["sideReadBookIds"] == [dune]


def test_an_edit_with_no_finished_on_keeps_a_never_started_side_read(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.side_read(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, subtitle="A Novel").status_code == 200
    assert json.loads(library_bytes(tmp_path))["sideReadBookIds"] == [dune]
