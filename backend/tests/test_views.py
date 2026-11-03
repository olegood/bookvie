"""The ``home`` and ``catalog`` views: side-effect-free reads of the library."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bookvie.domain import Library
from bookvie.http.app import create_app
from bookvie.store import Store
from bookvie.views import book_detail, catalog, cover_path, home
from tests.builder import LibraryBuilder
from tests.helpers import (
    BASE_URL,
    api_client,
)

HOME_EMPTY = {"meter": {"finished": 0, "total": 0}, "books": []}
CATALOG_EMPTY = {**HOME_EMPTY, "tags": []}
EMPTY = {"home": HOME_EMPTY, "catalog": CATALOG_EMPTY}


def _seed(builder: LibraryBuilder) -> dict[str, str]:
    dune = builder.book(
        title="Dune", authors=["Frank Herbert"], spine_color_user="#112233", pages=412
    )
    omens = builder.book(
        title="Good Omens", authors=["Terry Pratchett", "Neil Gaiman"], tags=["Fantasy", "humor"]
    )
    builder.reading(omens, start_date=None, finish_date="2026-02-01", current_page=300)
    reading = builder.book(title="Emma", authors=["Jane Austen"], tags=["fantasy", "Classics"])
    builder.reading(reading, current_page=10)
    return {"dune": dune, "omens": omens, "emma": reading}


def test_empty_library_functions() -> None:
    library = Library.empty()
    assert catalog(library).model_dump(by_alias=True) == CATALOG_EMPTY
    assert home(library).model_dump(by_alias=True) == HOME_EMPTY


@pytest.mark.parametrize("view", ["home", "catalog"])
def test_empty_library_over_http(tmp_path: Path, view: str) -> None:
    response = api_client(tmp_path, raise_server_exceptions=True).get(f"/api/views/{view}")
    assert response.status_code == 200
    assert response.json() == EMPTY[view]


@pytest.mark.parametrize("view", ["home", "catalog"])
def test_seeded_library(tmp_path: Path, library_builder: LibraryBuilder, view: str) -> None:
    ids = _seed(library_builder)
    library_builder.write(tmp_path)
    before = (tmp_path / "library.json").read_bytes()
    response = api_client(tmp_path, raise_server_exceptions=True).get(f"/api/views/{view}")
    assert response.status_code == 200
    body = response.json()
    assert body["meter"] == {"finished": 1, "total": 3}
    assert body["books"] == [
        {
            "id": ids["dune"],
            "title": "Dune",
            "subtitle": None,
            "firstAuthor": "Frank Herbert",
            "authorCount": 1,
            "authors": ["Frank Herbert"],
            "pages": 412,
            "year": None,
            "createdAt": "2026-01-01T09:01:00+01:00",
            "spineColor": "#112233",
            "spineColorUser": "#112233",
            "spineColorFromCover": None,
            "hasCover": False,
            "finished": False,
        },
        {
            "id": ids["omens"],
            "title": "Good Omens",
            "subtitle": None,
            "firstAuthor": "Terry Pratchett",
            "authorCount": 2,
            "authors": ["Terry Pratchett", "Neil Gaiman"],
            "pages": 300,
            "year": None,
            "createdAt": "2026-01-01T09:02:00+01:00",
            "spineColor": "#5B7590",
            "spineColorUser": None,
            "spineColorFromCover": None,
            "hasCover": False,
            "finished": True,
        },
        {
            "id": ids["emma"],
            "title": "Emma",
            "subtitle": None,
            "firstAuthor": "Jane Austen",
            "authorCount": 1,
            "authors": ["Jane Austen"],
            "pages": 300,
            "year": None,
            "createdAt": "2026-01-01T09:04:00+01:00",
            "spineColor": "#9B6753",
            "spineColorUser": None,
            "spineColorFromCover": None,
            "hasCover": False,
            "finished": False,
        },
    ]
    if view == "catalog":
        # Merged ignoring case; the first spelling in library order wins.
        assert body["tags"] == ["Fantasy", "humor", "Classics"]
    else:
        assert "tags" not in body
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


# --- The book view's role (the Confirm dialog's role line) ---------------------


def test_book_view_role_names_main_up_next_and_waiting(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.reading(dune, current_page=120)
    neuromancer = library_builder.book(title="Neuromancer", pages=271)
    library_builder.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    dispossessed = library_builder.book(title="The Dispossessed", pages=387)
    library_builder.reading(dispossessed, current_page=120, paused_at="2026-09-15")
    accelerate = library_builder.book(title="Accelerate", pages=288)
    library_builder.reading(accelerate, current_page=40)
    finished = library_builder.book(title="Emma", pages=300)
    library_builder.reading(
        finished, current_page=300, paused_at="2026-08-01", finish_date="2026-09-01",
        finished_pages=300,
    )
    # A Side read with a paused Reading is waiting for you like any other.
    paused_side = library_builder.book(title="Hyperion", pages=482)
    library_builder.reading(paused_side, current_page=210, paused_at="2026-10-10")
    plain = library_builder.book(title="Piranesi", pages=245)
    library_builder.main(dune).up_next(neuromancer).side_read(accelerate).side_read(paused_side)
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    def role(book_id: str) -> tuple[str | None, int | None]:
        body = client.get("/api/views/book", params={"id": book_id}).json()
        return body["role"], body["waitingPage"]

    assert role(dune) == ("main", None)
    # Up next wins over its paused Reading.
    assert role(neuromancer) == ("upNext", None)
    assert role(dispossessed) == ("waiting", 120)
    # Being a Side read alone gives no role line; neither does a finished paused Reading.
    assert role(accelerate) == (None, None)
    assert role(paused_side) == ("waiting", 210)
    assert role(finished) == (None, None)
    assert role(plain) == (None, None)


def test_book_detail_function_gives_the_role_and_none_for_an_unknown_id(
    library_builder: LibraryBuilder,
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.reading(dune, current_page=120, paused_at="2026-10-01")
    library = library_builder.build()
    view = book_detail(library, dune)
    assert view is not None
    assert (view.role, view.waiting_page) == ("waiting", 120)
    assert book_detail(library, "nope") is None


# --- Covers (Story 1.13) ------------------------------------------------------


def test_book_view_carries_the_cover_file_and_its_color(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    covered = library_builder.book(
        title="Dune", cover_file="covers/dune.jpg", spine_color_from_cover="#A85A4A"
    )
    bare = library_builder.book(title="Emma")
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    body = client.get("/api/views/book", params={"id": covered}).json()
    assert (body["coverFile"], body["spineColorFromCover"]) == ("covers/dune.jpg", "#A85A4A")
    body = client.get("/api/views/book", params={"id": bare}).json()
    assert (body["coverFile"], body["spineColorFromCover"]) == (None, None)
    # The shelf views don't carry covers (later stories), only whether one exists.
    assert "coverFile" not in client.get("/api/views/catalog").json()["books"][0]


# --- The Spine popover's fields (Story 1.14) -----------------------------------


@pytest.mark.parametrize("view", ["home", "catalog"])
def test_shelf_books_carry_what_the_spine_popover_shows(
    tmp_path: Path, library_builder: LibraryBuilder, view: str
) -> None:
    library_builder.book(
        title="Dune",
        subtitle="Book One",
        year=1965,
        cover_file="covers/dune.jpg",
        spine_color_from_cover="#A85A4A",
        spine_color_user="#4B7C7B",
    )
    library_builder.book(title="Emma")
    library_builder.write(tmp_path)
    books = api_client(tmp_path, raise_server_exceptions=True).get(f"/api/views/{view}").json()["books"]
    fields = ("subtitle", "year", "spineColor", "spineColorUser", "spineColorFromCover", "hasCover")
    assert [tuple(book[key] for key in fields) for book in books] == [
        ("Book One", 1965, "#4B7C7B", "#4B7C7B", "#A85A4A", True),
        (None, None, "#5B7590", None, None, False),
    ]


def test_book_view_carries_the_resolved_spine_color(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    covered = library_builder.book(title="Dune", spine_color_from_cover="#A85A4A")
    picked = library_builder.book(title="Emma", spine_color_user="#4B7C7B")
    curated = library_builder.book(title="Piranesi")
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    def color(book_id: str) -> str:
        return client.get("/api/views/book", params={"id": book_id}).json()["spineColor"]

    assert (color(covered), color(picked), color(curated)) == ("#A85A4A", "#4B7C7B", "#9B6753")


def test_book_view_carries_finished_and_has_cover_as_the_shelf_does(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Book detail's Change color reads the server's flags, not its own (F-A7)."""
    covered_read = library_builder.book(title="Dune", cover_file="covers/dune.jpg")
    library_builder.reading(covered_read, start_date=None, finish_date="2026-02-01", current_page=300)
    covered_reading = library_builder.book(title="Emma", cover_file="covers/emma.jpg")
    library_builder.reading(covered_reading, current_page=40)
    bare_read = library_builder.book(title="Piranesi")
    library_builder.reading(bare_read, start_date=None, finish_date="2026-03-01", current_page=300)
    bare = library_builder.book(title="Kindred")
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    def flags(book: dict[str, object]) -> tuple[object, object]:
        return book["finished"], book["hasCover"]

    ids = (covered_read, covered_reading, bare_read, bare)
    detail = {i: flags(client.get("/api/views/book", params={"id": i}).json()) for i in ids}
    assert [detail[i] for i in ids] == [(True, True), (False, True), (True, False), (False, False)]
    shelf = {book["id"]: flags(book) for book in client.get("/api/views/catalog").json()["books"]}
    assert detail == shelf


def test_cover_path_finds_only_referenced_existing_files(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    library_builder.book(title="Dune", cover_file="covers/dune.jpg")
    library_builder.book(title="Emma", cover_file="covers/missing.jpg")
    library_builder.book(title="Odd", cover_file="covers/../library.json")
    library_builder.write(tmp_path)
    (tmp_path / "covers").mkdir()
    (tmp_path / "covers" / "dune.jpg").write_bytes(b"jpeg")
    (tmp_path / "covers" / "missing.jpg").mkdir()  # not a file
    store = Store.open(tmp_path)

    assert cover_path(store, "dune.jpg") == tmp_path / "covers" / "dune.jpg"
    assert cover_path(store, "missing.jpg") is None
    assert cover_path(store, "stray.jpg") is None
    assert cover_path(store, "../library.json") is None
    assert cover_path(store, "..") is None
