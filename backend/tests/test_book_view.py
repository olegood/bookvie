"""The ``book`` view behind Book detail (Story 1.11): the Book and its latest finish.

Split from ``test_edit_book.py``, whose edits this view shows.
"""

from pathlib import Path

from tests.builder import LibraryBuilder
from tests.helpers import (
    DUNE,
    DUNE_ISBN13,
    api_client,
    library_bytes,
)


def test_book_view_returns_the_book_and_its_latest_finish(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(
        **DUNE, subtitle="A Novel", tags=["sci-fi"], type="hardcover", spine_color_user="#112233"
    )
    old = library_builder.reading(
        dune, start_date=None, finish_date="2019-08-14", current_page=412, finished_pages=412
    )
    new = library_builder.reading(
        dune,
        start_date="2024-01-02",
        finish_date="2024-02-10",
        current_page=412,
        finished_pages=412,
        purpose="Why Arrakis",
        purpose_fulfilled="partly",
        rating=4,
    )
    library_builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = api_client(tmp_path).get("/api/views/book", params={"id": dune})

    assert response.status_code == 200
    body = response.json()
    readings = body.pop("readings")
    assert body == {
        "id": dune,
        "title": "Dune",
        "subtitle": "A Novel",
        "authors": ["Frank Herbert"],
        "pages": 412,
        "edition": 1,
        "language": "English",
        "publisher": "Chilton Books",
        "type": "hardcover",
        "isbn": DUNE_ISBN13,
        "year": 1965,
        "tags": ["sci-fi"],
        "spineColor": "#112233",
        "spineColorUser": "#112233",
        "coverFile": None,
        "spineColorFromCover": None,
        "hasCover": False,
        "finished": True,
        "latestFinishDate": "2024-02-10",
        # Story 12.4: the Edit book panel's prefill, as strings (the latest finish date).
        "editForm": {
            "title": "Dune",
            "subtitle": "A Novel",
            "pages": "412",
            "authors": "Frank Herbert",
            "edition": "1",
            "language": "English",
            "publisher": "Chilton Books",
            "type": "hardcover",
            "isbn": DUNE_ISBN13,
            "year": "1965",
            "finishedOn": "2024-02-10",
            "tags": "sci-fi",
            "spineColor": "#112233",
        },
        "role": None,
        "waitingPage": None,
        "currentReading": None,
        "sideRead": False,
        "sideReadsFull": False,
        "cardNotes": [],
        # Finished, no unfinished Reading; 412 pages over 2 January to 10 February (40 days).
        "pagesLeft": 0,
        "measuredPace": 10.3,
    }
    assert sorted(readings, key=lambda r: r["id"]) == sorted(
        [
            {
                "id": old,
                "startDate": None,
                "finishDate": "2019-08-14",
                "rating": None,
                "purposeFulfilled": None,
            },
            {
                "id": new,
                "startDate": "2024-01-02",
                "finishDate": "2024-02-10",
                "rating": 4,
                "purposeFulfilled": "partly",
            },
        ],
        key=lambda r: r["id"],
    )
    assert library_bytes(tmp_path) == before


def test_book_view_without_a_finish_has_no_latest_finish_date(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(**DUNE)
    library_builder.reading(dune, current_page=10)
    library_builder.write(tmp_path)

    body = api_client(tmp_path).get("/api/views/book", params={"id": dune}).json()

    assert body["latestFinishDate"] is None
    assert [r["finishDate"] for r in body["readings"]] == [None]


def test_book_view_for_an_unknown_id_is_404_book_not_found(tmp_path: Path) -> None:
    response = api_client(tmp_path).get("/api/views/book", params={"id": "nope"})

    assert response.status_code == 404
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
