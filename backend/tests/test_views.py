"""The ``home`` and ``catalog`` views: side-effect-free reads of the library."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library
from bookvie.http.app import create_app
from bookvie.store import Store
from bookvie.views import catalog, home
from tests.builder import LibraryBuilder

BASE_URL = "http://127.0.0.1:8765"
EMPTY = {"meter": {"finished": 0, "total": 0}, "books": []}


def _client(data_dir: Path) -> TestClient:
    store = Store.open(data_dir)
    return TestClient(create_app(data_dir / "no-static", store=store), base_url=BASE_URL)


def _seed(builder: LibraryBuilder) -> dict[str, str]:
    dune = builder.book(title="Dune", authors=["Frank Herbert"], spine_color_user="#112233")
    omens = builder.book(title="Good Omens", authors=["Terry Pratchett", "Neil Gaiman"])
    builder.reading(omens, start_date=None, finish_date="2026-02-01", current_page=300)
    reading = builder.book(title="Emma", authors=["Jane Austen"])
    builder.reading(reading, current_page=10)
    return {"dune": dune, "omens": omens, "emma": reading}


def test_empty_library_functions() -> None:
    library = Library.empty()
    assert catalog(library).model_dump(by_alias=True) == EMPTY
    assert home(library).model_dump(by_alias=True) == EMPTY


@pytest.mark.parametrize("view", ["home", "catalog"])
def test_empty_library_over_http(tmp_path: Path, view: str) -> None:
    response = _client(tmp_path).get(f"/api/views/{view}")
    assert response.status_code == 200
    assert response.json() == EMPTY


@pytest.mark.parametrize("view", ["home", "catalog"])
def test_seeded_library(tmp_path: Path, library_builder: LibraryBuilder, view: str) -> None:
    ids = _seed(library_builder)
    library_builder.write(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    response = _client(tmp_path).get(f"/api/views/{view}")
    assert response.status_code == 200
    body = response.json()
    assert body["meter"] == {"finished": 1, "total": 3}
    assert body["books"] == [
        {
            "id": ids["dune"],
            "title": "Dune",
            "firstAuthor": "Frank Herbert",
            "authorCount": 1,
            "spineColor": "#112233",
            "finished": False,
        },
        {
            "id": ids["omens"],
            "title": "Good Omens",
            "firstAuthor": "Terry Pratchett",
            "authorCount": 2,
            "spineColor": "#5B7590",
            "finished": True,
        },
        {
            "id": ids["emma"],
            "title": "Emma",
            "firstAuthor": "Jane Austen",
            "authorCount": 1,
            "spineColor": "#9B6753",
            "finished": False,
        },
    ]
    # Side-effect-free: the file is untouched.
    assert (tmp_path / "library.json").read_bytes() == before


def test_book_without_authors_has_empty_first_author(library_builder: LibraryBuilder) -> None:
    library_builder.book(authors=[])
    book = catalog(library_builder.build()).books[0]
    assert (book.first_author, book.author_count) == ("", 0)


def test_views_read_only_committed_state(tmp_path: Path, library_builder: LibraryBuilder) -> None:
    library_builder.book(title="Dune")
    library_builder.write(tmp_path)
    store = Store.open(tmp_path)
    client = TestClient(create_app(tmp_path / "no-static", store=store), base_url=BASE_URL)
    with pytest.raises(RuntimeError):
        store.apply(lambda library: (library.books.clear(), _raise())[1])
    assert client.get("/api/views/catalog").json()["meter"]["total"] == 1


def _raise() -> None:
    raise RuntimeError("abandoned change")
