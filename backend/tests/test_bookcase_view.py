"""Story 1.10: the ``catalog`` view supplies everything a spine needs (AD-6).

One test for the server-side acceptance criterion (AC-2, numbered in the
order of epics.md, Story 1.10). The other criteria are the Bookcase view, in
``frontend/e2e/bookcase.spec.ts``.

The client draws spines and the library meter only from these view fields;
it never derives read status or counts from Readings itself.
"""

from pathlib import Path

from tests.builder import LibraryBuilder
from tests.helpers import api_client


def test_ac2_p0_catalog_view_supplies_spine_inputs_and_the_meter(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Back-filled with Finished on, in a color the user picked.
    dune = library_builder.book(title="Dune", authors=["Frank Herbert"], spine_color_user="#F2D35B")
    library_builder.reading(dune, start_date=None, finish_date="2026-02-01", current_page=300)
    # Finished once, now being re-read, with a cover-derived color.
    omens = library_builder.book(
        title="Good Omens",
        authors=["Terry Pratchett", "Neil Gaiman"],
        spine_color_from_cover="#336699",
    )
    library_builder.reading(omens, finish_date="2026-03-01", current_page=300)
    library_builder.reading(omens, current_page=40)
    # Finished twice: still one Book.
    nana = library_builder.book(title="Nana", authors=["Émile Zola"])
    library_builder.reading(nana, finish_date="2026-01-10", current_page=300)
    library_builder.reading(nana, finish_date="2026-04-10", current_page=300)
    # Started, never finished.
    emma = library_builder.book(title="Emma", authors=["Jane Austen"])
    library_builder.reading(emma, current_page=10)
    # Never started, three authors, curated color.
    library_builder.book(
        title="The Science of Discworld", authors=["Terry Pratchett", "Ian Stewart", "Jack Cohen"]
    )
    library_builder.write(tmp_path)

    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/catalog").json()

    # X counts Books with at least one finished Reading; Y counts all Books.
    assert body["meter"] == {"finished": 3, "total": 5}
    spines = [
        (b["title"], b["firstAuthor"], b["authorCount"], b["spineColor"], b["finished"])
        for b in body["books"]
    ]
    assert spines == [
        ("Dune", "Frank Herbert", 1, "#F2D35B", True),
        ("Good Omens", "Terry Pratchett", 2, "#336699", True),
        ("Nana", "Émile Zola", 1, "#9B6753", True),
        ("Emma", "Jane Austen", 1, "#B48A45", False),
        ("The Science of Discworld", "Terry Pratchett", 3, "#7A6283", False),
    ]


def test_story_7_2_catalog_books_carry_type_language_and_tags(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Story 7.2: Catalog's filter chips read each Book's type, language and tags as stored."""
    library_builder.book(
        title="Candide", type="ebook", language="French", tags=["Classic", "satire"]
    )
    library_builder.book(title="Flights", type="hardcover", language="Polish", tags=[])
    library_builder.write(tmp_path)

    body = api_client(tmp_path, raise_server_exceptions=True).get("/api/views/catalog").json()

    assert [(b["title"], b["type"], b["language"], b["tags"]) for b in body["books"]] == [
        ("Candide", "ebook", "French", ["Classic", "satire"]),
        ("Flights", "hardcover", "Polish", []),
    ]


def test_catalog_and_home_books_carry_the_edition(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """Twin spines are told apart by edition first, so both views carry it as stored."""
    library_builder.book(title="Dune", authors=["Frank Herbert"], edition=1)
    library_builder.book(title="Dune", authors=["Frank Herbert"], edition=2)
    library_builder.write(tmp_path)

    client = api_client(tmp_path, raise_server_exceptions=True)
    for view in ("catalog", "home"):
        body = client.get(f"/api/views/{view}").json()
        assert [(b["title"], b["edition"]) for b in body["books"]] == [("Dune", 1), ("Dune", 2)]
