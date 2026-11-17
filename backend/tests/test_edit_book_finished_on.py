"""Story 1.11: ``edit-book``'s Finished on field (FR-3, AD-9, AD-11, AD-19).

AC-8 to AC-10 of Story 1.11 (epics.md), the Epic 3 retro F-R1 rule that a
stored finish belongs to a past Reading, and their green-phase follow-ups: which
finish an edit changes, and the start and earlier-finish bounds it can't cross.
The rest of ``edit-book`` is in ``test_edit_book.py``; what a back-fill does
beyond adding the Reading is in ``test_edit_book_back_fill.py``.
"""

import json
from datetime import date
from pathlib import Path

import pytest

from bookvie.domain.finished_on import long_date
from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_FORM,
    NEUROMANCER,
    NEUROMANCER_FORM,
    api_client,
    assert_invariants,
    field_messages,
    library_bytes,
    post_edit_book,
    stored_book,
    stored_readings,
)

# --- AC-8: Finished on edits the most recent finish ---------------------------


def test_ac8_p0_finished_on_changes_the_most_recent_finish_and_cannot_be_cleared(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    backfill = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    latest = library_builder.reading(
        dune,
        start_date="2025-05-01",
        finish_date="2025-06-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    # The panel prefills the most recent finish date.
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}

    response = post_edit_book(client, dune, form, finishedOn="2025-06-03")

    by_id = {r["id"]: r for r in stored_readings(tmp_path, dune)}
    assert by_id[latest]["finishDate"] == "2025-06-03"
    assert response.status_code == 200
    assert by_id[backfill]["finishDate"] == "2019-08-14"
    assert len(by_id) == 2  # changed in place, nothing added

    form = {**DUNE_FORM, "finishedOn": "2025-06-03"}
    before = library_bytes(tmp_path)
    cleared = post_edit_book(client, dune, form, finishedOn="")
    assert cleared.status_code == 422
    assert field_messages(cleared) == {"finishedOn": "A finish date can't be removed here."}
    assert library_bytes(tmp_path) == before
    # TODAY in tests.test_add_book is 2026-10-30.
    future = post_edit_book(client, dune, form, finishedOn="2026-10-31")
    assert future.status_code == 422
    assert field_messages(future) == {"finishedOn": "Finished on can't be in the future."}
    assert library_bytes(tmp_path) == before


# --- AC-9: not before the Reading's start --------------------------------------


def test_ac9_p1_finished_on_before_the_readings_start_date_is_422_and_saves_nothing(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2026-03-12",
        finish_date="2026-04-02",
        current_page=412,
        finished_pages=412,
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2026-04-02"}

    response = post_edit_book(client, dune, form, finishedOn="2026-03-11")

    assert response.status_code == 422
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be before 12 March 2026, when this reading started."
    }
    assert response.json()["error"]["code"] == "invalid_fields"
    assert library_bytes(tmp_path) == before
    # The start day itself is allowed.
    assert post_edit_book(client, dune, form, finishedOn="2026-03-12").status_code == 200


# --- AC-10: Finished on on a Book with no finished Reading --------------------


def test_ac10_p0_finished_on_back_fills_a_reading_and_leaves_the_current_one_untouched(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, start_date="2026-09-01", current_page=120)
    library_builder.main(dune)
    neuromancer = library_builder.book(**NEUROMANCER)  # never started
    library_builder.write(tmp_path)
    current_before = stored_readings(tmp_path, dune)[0]
    client = api_client(tmp_path)

    response = post_edit_book(client, dune, DUNE_FORM, finishedOn="2024-05-01")

    finished = [r for r in stored_readings(tmp_path, dune) if r["finishDate"] is not None]
    assert [(r["startDate"], r["finishDate"], r["finishedPages"]) for r in finished] == [
        (None, "2024-05-01", 412)
    ]
    assert response.status_code == 200
    # The active Reading is untouched, and Dune is still the Main book.
    unfinished = [r for r in stored_readings(tmp_path, dune) if r["finishDate"] is None]
    assert unfinished == [current_before]
    assert json.loads(library_bytes(tmp_path))["mainBookId"] == dune

    # A Book never started gets one back-filled Reading.
    assert (
        post_edit_book(client, neuromancer, NEUROMANCER_FORM, finishedOn="2023-01-15").status_code
        == 200
    )
    (backfill,) = stored_readings(tmp_path, neuromancer)
    assert backfill["startDate"] is None
    assert backfill["finishDate"] == "2023-01-15"
    assert backfill["finishedPages"] == 271


# --- Epic 3 retro F-R1: a stored finish is a past Reading's ------------------


def test_a_back_fill_after_the_current_readings_start_is_422_and_saves_nothing(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, start_date="2026-10-01", current_page=120)
    library_builder.main(dune)
    neuromancer = library_builder.book(**NEUROMANCER)
    library_builder.reading(neuromancer, start_date="2026-09-01", paused_at="2026-10-01")
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    # Inside the active Reading (the retro probe), and inside a paused one.
    response = post_edit_book(client, dune, DUNE_FORM, finishedOn="2026-10-20")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be after 1 October 2026, when the current reading started."
    }
    response = post_edit_book(client, neuromancer, NEUROMANCER_FORM, finishedOn="2026-09-02")
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be after 1 September 2026, when the current reading started."
    }
    assert library_bytes(tmp_path) == before

    # The start day itself is a past Reading's finish, as a same-day re-read makes.
    assert post_edit_book(client, dune, DUNE_FORM, finishedOn="2026-10-01").status_code == 200
    finished = [r for r in stored_readings(tmp_path, dune) if r["finishDate"] is not None]
    assert [(r["startDate"], r["finishDate"]) for r in finished] == [(None, "2026-10-01")]
    assert json.loads(library_bytes(tmp_path))["mainBookId"] == dune
    assert_invariants(tmp_path)


def test_the_latest_finish_cannot_move_past_a_re_reads_start(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    earlier = library_builder.reading(
        dune,
        start_date="2026-01-01",
        finish_date="2026-02-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(dune, start_date="2026-10-01", current_page=40)
    library_builder.main(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2026-02-01"}
    before = library_bytes(tmp_path)

    response = post_edit_book(client, dune, form, finishedOn="2026-10-25")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be after 1 October 2026, when the current reading started."
    }
    assert library_bytes(tmp_path) == before
    # Up to the re-read's start day is fine.
    assert post_edit_book(client, dune, form, finishedOn="2026-10-01").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id[earlier] == "2026-10-01"
    # Moving it earlier again still saves.
    assert post_edit_book(client, dune, form, finishedOn="2026-03-01").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id[earlier] == "2026-03-01"


def test_an_unchanged_finish_already_past_the_current_start_still_saves_other_fields(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Data from before this rule (or a restore) may already overlap: resending
    # the prefilled date must not block an unrelated edit.
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2026-01-01",
        finish_date="2026-10-25",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(dune, start_date="2026-10-01", current_page=40)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(
        client, dune, {**DUNE_FORM, "finishedOn": "2026-10-25"}, subtitle="A Novel"
    )

    assert response.status_code == 200
    assert stored_book(tmp_path, dune)["subtitle"] == "A Novel"
    assert [r["finishDate"] for r in stored_readings(tmp_path, dune)] == ["2026-10-25", None]


@pytest.mark.parametrize(
    ("day", "text"),
    [
        (date(2026, 3, 12), "12 March 2026"),
        (date(2019, 1, 1), "1 January 2019"),
        (date(2024, 12, 31), "31 December 2024"),
        (date(2025, 9, 5), "5 September 2025"),
    ],
)
def test_long_date_is_day_full_month_year(day: date, text: str) -> None:
    assert long_date(day) == text


def test_the_latest_finish_is_by_date_not_by_stored_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    newer = library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    older = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    view = client.get("/api/views/book", params={"id": dune}).json()
    assert view["latestFinishDate"] == "2025-06-01"

    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}
    assert post_edit_book(client, dune, form, finishedOn="2025-06-03").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id == {newer: "2025-06-03", older: "2019-08-14"}


def _back_fill_after_an_earlier_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> tuple[str, str, str]:
    """Dune: A read 1-14 Aug 2019, then B, a back-fill finished 1 June 2025."""
    dune = library_builder.book(**DUNE)
    earlier = library_builder.reading(
        dune,
        start_date="2019-08-01",
        finish_date="2019-08-14",
        current_page=412,
        finished_pages=412,
    )
    back_fill = library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    return dune, earlier, back_fill


def test_the_latest_finish_cannot_move_before_an_earlier_readings_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune, _, _ = _back_fill_after_an_earlier_reading(tmp_path, library_builder)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}
    before = library_bytes(tmp_path)

    response = post_edit_book(client, dune, form, finishedOn="2019-08-10")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be before 14 August 2019, when an earlier reading finished."
    }
    assert library_bytes(tmp_path) == before


def test_the_latest_finish_may_move_to_an_earlier_readings_finish_day(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune, earlier, back_fill = _back_fill_after_an_earlier_reading(tmp_path, library_builder)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}

    assert post_edit_book(client, dune, form, finishedOn="2019-08-14").status_code == 200

    by_id = {r["id"]: (r["startDate"], r["finishDate"]) for r in stored_readings(tmp_path, dune)}
    assert by_id == {earlier: ("2019-08-01", "2019-08-14"), back_fill: (None, "2019-08-14")}
    view = client.get("/api/views/book", params={"id": dune}).json()
    assert view["latestFinishDate"] == "2019-08-14"
    assert_invariants(tmp_path)


def test_the_latest_finish_may_move_later_beside_an_earlier_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune, earlier, back_fill = _back_fill_after_an_earlier_reading(tmp_path, library_builder)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}

    assert post_edit_book(client, dune, form, finishedOn="2025-07-01").status_code == 200

    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id == {earlier: "2019-08-14", back_fill: "2025-07-01"}
    assert_invariants(tmp_path)


def test_before_this_readings_start_wins_over_an_earlier_readings_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2026-01-01",
        finish_date="2026-03-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(
        dune,
        start_date="2026-03-12",
        finish_date="2026-04-02",
        current_page=412,
        finished_pages=412,
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    response = post_edit_book(
        client, dune, {**DUNE_FORM, "finishedOn": "2026-04-02"}, finishedOn="2026-02-20"
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_fields"
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be before 12 March 2026, when this reading started."
    }
    assert library_bytes(tmp_path) == before


def test_a_tied_latest_finish_cannot_move_before_the_other_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Two finishes on one day: the later-listed one is the latest, and the
    # other still bounds it.
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    library_builder.reading(
        dune,
        start_date="2025-05-01",
        finish_date="2025-06-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    before = library_bytes(tmp_path)

    response = post_edit_book(
        client, dune, {**DUNE_FORM, "finishedOn": "2025-06-01"}, finishedOn="2025-05-20"
    )

    assert response.status_code == 422
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be before 1 June 2025, when an earlier reading finished."
    }
    assert library_bytes(tmp_path) == before


def test_past_the_earlier_finish_the_current_start_still_bounds_the_latest_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2026-01-01",
        finish_date="2026-02-01",
        current_page=412,
        finished_pages=412,
    )
    latest = library_builder.reading(
        dune,
        start_date="2026-03-01",
        finish_date="2026-04-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(dune, start_date="2026-05-01", current_page=40)
    library_builder.main(dune)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2026-04-01"}
    before = library_bytes(tmp_path)

    response = post_edit_book(client, dune, form, finishedOn="2026-05-10")

    assert response.status_code == 422
    assert field_messages(response) == {
        "finishedOn": "Finished on can't be after 1 May 2026, when the current reading started."
    }
    assert library_bytes(tmp_path) == before
    # Between the earlier finish and the current start saves.
    assert post_edit_book(client, dune, form, finishedOn="2026-04-20").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id[latest] == "2026-04-20"
    assert_invariants(tmp_path)


def test_an_unchanged_finish_already_before_an_earlier_finish_still_saves_other_fields(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Data from before this rule: a back-fill already moved inside the earlier
    # Reading, so that Reading is now the latest. Resending its prefilled date
    # unchanged must not block an unrelated edit.
    dune = library_builder.book(**DUNE)
    library_builder.reading(
        dune,
        start_date="2019-08-01",
        finish_date="2019-08-14",
        current_page=412,
        finished_pages=412,
    )
    library_builder.reading(
        dune, start_date=None, finish_date="2019-08-10", current_page=412, finished_pages=412
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    response = post_edit_book(
        client, dune, {**DUNE_FORM, "finishedOn": "2019-08-14"}, subtitle="A Novel"
    )

    assert response.status_code == 200
    assert stored_book(tmp_path, dune)["subtitle"] == "A Novel"
    assert [r["finishDate"] for r in stored_readings(tmp_path, dune)] == [
        "2019-08-14",
        "2019-08-10",
    ]


def test_the_same_finish_date_resent_is_a_no_op_and_a_tie_edits_the_later_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    first = library_builder.reading(
        dune, start_date=None, finish_date="2025-06-01", current_page=412, finished_pages=412
    )
    second = library_builder.reading(
        dune,
        start_date="2025-05-01",
        finish_date="2025-06-01",
        current_page=412,
        finished_pages=412,
    )
    library_builder.write(tmp_path)
    client = api_client(tmp_path)
    form = {**DUNE_FORM, "finishedOn": "2025-06-01"}
    before = library_bytes(tmp_path)

    assert post_edit_book(client, dune, form).status_code == 200
    assert library_bytes(tmp_path) == before

    assert post_edit_book(client, dune, form, finishedOn="2025-06-02").status_code == 200
    by_id = {r["id"]: r["finishDate"] for r in stored_readings(tmp_path, dune)}
    assert by_id == {first: "2025-06-01", second: "2025-06-02"}


def test_an_empty_finished_on_is_fine_without_a_finished_reading(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=10)
    library_builder.write(tmp_path)
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, subtitle="A Novel").status_code == 200
    (reading,) = stored_readings(tmp_path, dune)
    assert reading["finishDate"] is None


def test_a_paused_book_back_fill_leaves_paused_at_and_up_next_alone(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    paused = library_builder.reading(dune, current_page=50, paused_at="2026-10-01")
    library_builder.write(tmp_path)
    doc = json.loads(library_bytes(tmp_path))
    doc["upNextBookId"] = dune
    (tmp_path / "library.json").write_text(json.dumps(doc))
    client = api_client(tmp_path)

    assert post_edit_book(client, dune, DUNE_FORM, finishedOn="2020-01-01").status_code == 200
    stored = json.loads(library_bytes(tmp_path))
    assert stored["upNextBookId"] == dune
    by_id = {r["id"]: r for r in stored_readings(tmp_path, dune)}
    assert by_id[paused]["pausedAt"] == "2026-10-01"
    assert len(by_id) == 2
