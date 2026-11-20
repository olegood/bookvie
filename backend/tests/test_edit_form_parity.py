"""The server's ``editForm`` and the client's ``toPanelFields`` build the same form.

Both turn a Book into the Edit book panel's prefill: the client to fill the
panel, the server so an agent can send it back to ``edit_book`` (AD-21's
whole edits). One case table, ``frontend/src/lib/editForm.cases.json``, is read
here and by ``frontend/src/lib/bookDetail.test.ts``, so a change to either
side that the other doesn't make fails one of them (Epic 12 retro item 87,
E12-B4). Each case seeds the Book, then checks the book view's fields against
the case's ``book`` (what the client gets) and its ``editForm`` against
``fields``.
"""

import json
from pathlib import Path
from typing import Any

import pytest

from bookvie.views import book_detail
from tests.builder import LibraryBuilder

CASES_FILE = (
    Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "editForm.cases.json"
)
CASES: list[dict[str, Any]] = json.loads(CASES_FILE.read_text(encoding="utf-8"))["cases"]
STORED_KEYS = (
    "title",
    "subtitle",
    "authors",
    "pages",
    "edition",
    "language",
    "publisher",
    "type",
    "isbn",
    "year",
    "tags",
    "spineColorUser",
)


def test_the_shared_table_has_cases() -> None:
    assert CASES, CASES_FILE


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_the_book_views_edit_form_is_the_shared_cases_form(
    case: dict[str, Any], tmp_path: Path
) -> None:
    book = case["book"]
    # Exactly the client's EditableBook keys, so a case can't leave one out unnoticed.
    assert set(book) == {*STORED_KEYS, "latestFinishDate"}, sorted(book)
    builder = LibraryBuilder()
    book_id = builder.book(**{key: book[key] for key in STORED_KEYS})
    for day in case["finishDates"]:
        builder.reading(
            book_id,
            current_page=book["pages"],
            finish_date=day,
            finished_pages=book["pages"],
            purpose_fulfilled="yes",
            rating=4,
        )
    builder.write(tmp_path)  # the seeded library keeps the invariants

    view = book_detail(builder.build(), book_id)
    assert view is not None
    dumped = view.model_dump(mode="json", by_alias=True)
    assert {key: dumped[key] for key in book} == book
    assert list(dumped["editForm"].items()) == list(case["fields"].items())
