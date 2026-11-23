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

SHELF_EMPTY = {"meter": {"finished": 0, "total": 0}, "books": []}
HOME_EMPTY = {
    **SHELF_EMPTY,
    "mainBook": None,
    "upNext": None,
    "waiting": [],
    "sideReads": [],
    "lastExportAt": None,
    "slicePriority": [],
}
CATALOG_EMPTY = {**SHELF_EMPTY, "tags": [], "pagesLeft": 0, "measuredPace": None}
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
            "edition": 1,
            "year": None,
            "createdAt": "2026-01-01T09:01:00+01:00",
            "spineColor": "#112233",
            "spineColorUser": "#112233",
            "spineColorFromCover": None,
            "hasCover": False,
            "coverFile": None,
            "finished": False,
            "role": None,
            "currentPage": None,
            "percent": None,
            "waitingPage": None,
            "sideRead": False,
            "type": "paperback",
            "language": "English",
            "tags": [],
        },
        {
            "id": ids["omens"],
            "title": "Good Omens",
            "subtitle": None,
            "firstAuthor": "Terry Pratchett",
            "authorCount": 2,
            "authors": ["Terry Pratchett", "Neil Gaiman"],
            "pages": 300,
            "edition": 1,
            "year": None,
            "createdAt": "2026-01-01T09:02:00+01:00",
            "spineColor": "#5B7590",
            "spineColorUser": None,
            "spineColorFromCover": None,
            "hasCover": False,
            "coverFile": None,
            "finished": True,
            "role": None,
            "currentPage": None,
            "percent": None,
            "waitingPage": None,
            "sideRead": False,
            "type": "paperback",
            "language": "English",
            "tags": ["Fantasy", "humor"],
        },
        {
            "id": ids["emma"],
            "title": "Emma",
            "subtitle": None,
            "firstAuthor": "Jane Austen",
            "authorCount": 1,
            "authors": ["Jane Austen"],
            "pages": 300,
            "edition": 1,
            "year": None,
            "createdAt": "2026-01-01T09:04:00+01:00",
            "spineColor": "#9B6753",
            "spineColorUser": None,
            "spineColorFromCover": None,
            "hasCover": False,
            "coverFile": None,
            "finished": False,
            # An unfinished Reading of a Book that isn't Main is paused (AD-19).
            "role": "waiting",
            "currentPage": 10,
            "percent": 3,
            "waitingPage": 10,
            "sideRead": False,
            "type": "paperback",
            "language": "English",
            "tags": ["fantasy", "Classics"],
        },
    ]
    if view == "catalog":
        # Merged ignoring case; the first spelling in library order wins.
        assert body["tags"] == ["Fantasy", "humor", "Classics"]
    else:
        assert "tags" not in body
        assert (body["mainBook"], body["lastExportAt"]) == (None, None)
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
        finished,
        current_page=300,
        paused_at="2026-08-01",
        finish_date="2026-09-01",
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
    # Up next wins over its paused Reading; waitingPage stays waiting-only.
    assert role(neuromancer) == ("upNext", None)
    assert role(dispossessed) == ("waiting", 120)
    # Unfinished and not Main is paused (AD-19), whether or not pausedAt is set,
    # a Side read's included; a finished paused Reading gives no role line.
    assert role(accelerate) == ("waiting", 40)
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
    # The shelf views carry the stored cover file too, for Catalog's Tiles (Story 8.1).
    shelf = {b["id"]: b["coverFile"] for b in client.get("/api/views/catalog").json()["books"]}
    assert shelf == {covered: "covers/dune.jpg", bare: None}


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
    books = (
        api_client(tmp_path, raise_server_exceptions=True).get(f"/api/views/{view}").json()["books"]
    )
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
    library_builder.reading(
        covered_read, start_date=None, finish_date="2026-02-01", current_page=300
    )
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


# --- backup (Story 2.1) ------------------------------------------------------


def test_backup_view_before_any_export(tmp_path: Path) -> None:
    response = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/backup")
    assert response.status_code == 200
    assert response.json() == {"lastExportAt": None}


def test_backup_view_reads_local_state(tmp_path: Path) -> None:
    client = api_client(tmp_path, raise_server_exceptions=True)
    (tmp_path / "local-state.json").write_text('{"lastExportAt": "2026-10-01T09:30:00+02:00"}')
    response = client.get("/api/views/backup")
    assert response.json() == {"lastExportAt": "2026-10-01T09:30:00+02:00"}


@pytest.mark.parametrize("raw", ["{oops", '{"lastExportAt": ["2026-10-01"]}'])
def test_backup_view_reads_malformed_local_state_as_no_export(
    tmp_path: Path, raw: str, capsys: pytest.CaptureFixture[str]
) -> None:
    client = api_client(tmp_path, raise_server_exceptions=True)
    (tmp_path / "local-state.json").write_text(raw)
    response = client.get("/api/views/backup")
    assert response.status_code == 200
    assert response.json() == {"lastExportAt": None}
    assert "bookvie: local-state.json" in capsys.readouterr().err


# --- Story 3.1: the Main book, Last export, roles and the current Reading -----


def test_home_view_carries_last_export_from_local_state(tmp_path: Path) -> None:
    (tmp_path / "local-state.json").write_text('{"lastExportAt": "2026-10-16T09:30:00+02:00"}')
    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()
    assert body["lastExportAt"] == "2026-10-16T09:30:00+02:00"
    assert body["mainBook"] is None


def test_home_view_main_book_card_fields(tmp_path: Path, library_builder: LibraryBuilder) -> None:
    other = library_builder.book(title="Dune")
    left_hand = library_builder.book(
        title="The Left Hand of Darkness",
        authors=["Ursula K. Le Guin"],
        pages=330,
        edition=2,
        cover_file="covers/left-hand.png",
    )
    library_builder.reading(left_hand, start_date=None, finish_date="2025-01-01", current_page=330)
    library_builder.reading(
        left_hand, current_page=212, last_progress_update="2026-10-25T21:00:00+01:00"
    )
    library_builder.main(left_hand)
    library_builder.write(tmp_path)
    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/home").json()
    assert body["mainBook"] == {
        "id": left_hand,
        "title": "The Left Hand of Darkness",
        "authors": ["Ursula K. Le Guin"],
        "edition": 2,
        "coverFile": "covers/left-hand.png",
        "hasCover": True,
        "pages": 330,
        "currentPage": 212,
        "percent": 64,
        "daysLeft": None,  # the only finished Reading is back-filled: no Measured pace
        "lastProgressUpdate": "2026-10-25T21:00:00+01:00",
        "cardNoteCount": 0,
    }
    assert [book["id"] for book in body["books"]] == [other, left_hand]


def test_home_main_book_without_an_unfinished_reading_reads_page_zero(
    library_builder: LibraryBuilder,
) -> None:
    # Invariants forbid it; the view still answers rather than failing.
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.main(dune)
    main_book = home(library_builder.build()).main_book
    assert main_book is not None
    assert (main_book.current_page, main_book.percent) == (0, 0)
    # A Main book id naming no Book gives no card.
    assert home(library_builder.main("gone").build()).main_book is None


def test_shelf_books_carry_role_percent_and_waiting_page(
    library_builder: LibraryBuilder,
) -> None:
    left_hand = library_builder.book(title="The Left Hand of Darkness", pages=330)
    library_builder.reading(left_hand, current_page=212)
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.reading(dune, current_page=120, paused_at="2026-10-20")
    neuromancer = library_builder.book(title="Neuromancer", pages=271)
    library_builder.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    # A finished Book re-read as a paused Reading.
    emma = library_builder.book(title="Emma", pages=400)
    library_builder.reading(emma, finish_date="2025-06-01", finished_pages=400, current_page=400)
    library_builder.reading(emma, current_page=40, paused_at="2026-10-02")
    plain = library_builder.book(title="Piranesi", pages=245)
    library = library_builder.main(left_hand).up_next(neuromancer).build()

    def fields(book_id: str) -> tuple[object, ...]:
        book = next(b for b in catalog(library).books if b.id == book_id)
        return (book.role, book.current_page, book.percent, book.waiting_page, book.finished)

    assert fields(left_hand) == ("main", 212, 64, None, False)
    assert fields(dune) == ("waiting", 120, 29, 120, False)
    # Up next keeps its precedence over the paused Reading (no new strings this story).
    assert fields(neuromancer) == ("upNext", 80, 29, None, False)
    assert fields(emma) == ("waiting", 40, 10, 40, True)
    assert fields(plain) == (None, None, None, None, False)


def test_a_finished_book_re_read_as_main_reads_the_re_read_in_every_view(
    library_builder: LibraryBuilder,
) -> None:
    # The spine's "finished, re-reading, 12%" (I/O matrix): finished from the old
    # Reading, the percentage from the current one, the same number on the shelf,
    # Home's card and Book detail (AD-6: one rule for the three views).
    emma = library_builder.book(title="Emma", pages=400)
    library_builder.reading(emma, finish_date="2025-06-01", finished_pages=400, current_page=400)
    library_builder.reading(emma, current_page=48, start_date="2026-10-03")
    library = library_builder.main(emma).build()

    (shelf,) = catalog(library).books
    assert (shelf.role, shelf.finished, shelf.current_page, shelf.percent, shelf.waiting_page) == (
        "main",
        True,
        48,
        12,
        None,
    )
    card = home(library).main_book
    assert card is not None and (card.current_page, card.percent) == (48, 12)
    detail = book_detail(library, emma)
    assert detail is not None and detail.current_reading is not None
    assert (detail.role, detail.current_reading.status, detail.current_reading.percent) == (
        "main",
        "main",
        12,
    )
    assert detail.latest_finish_date is not None


def test_book_view_current_reading_main_paused_and_none(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    left_hand = library_builder.book(title="The Left Hand of Darkness", pages=330)
    library_builder.reading(
        left_hand, current_page=212, start_date="2026-10-01", purpose="To see a world built"
    )
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.reading(dune, current_page=120, start_date=None, paused_at="2026-10-20")
    neuromancer = library_builder.book(title="Neuromancer", pages=271)
    library_builder.reading(neuromancer, current_page=80, paused_at="2026-10-01")
    finished = library_builder.book(title="Emma", pages=300)
    library_builder.reading(
        finished, finish_date="2026-09-01", finished_pages=300, current_page=300
    )
    library_builder.main(left_hand).up_next(neuromancer)
    library_builder.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    def current(book_id: str) -> object:
        return client.get("/api/views/book", params={"id": book_id}).json()["currentReading"]

    assert current(left_hand) == {
        "status": "main",
        "startDate": "2026-10-01",
        "currentPage": 212,
        "percent": 64,
        "purpose": "To see a world built",
    }
    assert current(dune) == {
        "status": "waiting",
        "startDate": None,
        "currentPage": 120,
        "percent": 29,
        "purpose": None,
    }
    # A paused Up next carries its Reading, so the Start dialog resumes it (Story 4.1).
    assert current(neuromancer) == {
        "status": "upNext",
        "startDate": "2026-01-01",
        "currentPage": 80,
        "percent": 29,
        "purpose": None,
    }
    assert current(finished) is None
    # A never-started Up next has none, and neither has a finished one with no
    # Reading in progress.
    plain = library_builder.book(title="Piranesi", pages=245)
    for up_next in (plain, finished):
        library_builder.up_next(up_next)
        library_builder.write(tmp_path)
        body = api_client(tmp_path).get("/api/views/book", params={"id": up_next}).json()
        assert (body["role"], body["currentReading"]) == ("upNext", None)
