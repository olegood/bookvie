"""Story 17.1 See the Books finished in a range: the stats view's finishes (API, ATDD).

The criteria the server decides (AR74, AR79):

- AC-1: ``GET /api/views/stats`` gains ``finishes``, one ``StatsFinish`` per finished
  Reading whose ``finishDate`` falls in the range, read as stored, adding up to
  ``books`` and ``pages`` for every preset's dates and a Custom range starting
  mid-month. Back-fills are in it, a Book finished twice has two entries, a side
  read isn't, and a null ``finishedPages`` is sent as 0.
- AC-2: ``finishes`` is ordered by ``finishDate`` newest first, then the server title
  key, then Book id, then the Readings' stored order, the same on every fetch; All
  time sends every finish, and an empty range or library sends ``[]``.
- AC-3: ``StatsView.finishes`` is a required ``StatsFinish[]`` in the OpenAPI schema
  that ``api:gen`` turns into ``schema.d.ts``.
- AC-4: ``get_stats`` returns the route's view, ``finishes`` included, and its
  description is Story 17.1's.

The list, its rows and the Stats address are read in the browser
(``frontend/e2e/stats-finished.spec.ts``).
"""

from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from bookvie.http.app import create_app
from tests.agent_client import (
    _DESCRIPTION,
    DESCRIPTIONS,
    McpClient,
    _epic,
    _story_at,
    structured_of,
)
from tests.builder import LibraryBuilder
from tests.helpers import api_client

# The keys of one StatsFinish (AR74, the spine's AD-6 "Finishes").
FINISH_KEYS = {
    "readingId",
    "bookId",
    "title",
    "firstAuthor",
    "authorCount",
    "coverFile",
    "spineColor",
    "finishDate",
    "finishedPages",
    "rating",
}

# Fixed ids, so the Book id tie-break has a known answer: EMILE_A sorts before EMILE_B.
EMILE_A = "0a000000-0000-4000-8000-000000000001"
EMILE_B = "0b000000-0000-4000-8000-000000000002"

# The preset dates at fake today 2026-10-28 (the client resolves presets; the server
# sees only from and to), and a Custom range starting mid-month.
RANGES: list[tuple[str | None, str | None]] = [
    ("2026-10-01", "2026-10-28"),  # This month
    ("2026-01-01", "2026-10-28"),  # This year
    ("2025-01-01", "2025-12-31"),  # Last year
    (None, None),  # All time
    ("2026-02-15", "2026-09-20"),  # Custom, from mid-February
]


def _stats(client: TestClient, start: str | None = None, end: str | None = None) -> dict[str, Any]:
    """The stats view from ``start`` to ``end``, both inclusive; All time without them."""
    params = {} if start is None else {"from": start, "to": end}
    return client.get("/api/views/stats", params=params).json()


def _seed(b: LibraryBuilder) -> dict[str, str]:
    """The AC-1 library; returns the Reading ids by name.

    - ``ddia``: DDIA, Martin Kleppmann, finished 14 March 2026, 611 pages, rated 4,
      with a cover.
    - ``dune``: Dune, back-filled (no start date), finished 1 June 2026, 412 pages,
      unrated, no cover.
    - ``kindred_feb`` and ``kindred_apr``: Kindred, finished 10 February and again
      20 April 2026, 286 pages each.
    - ``beloved_1`` and ``beloved_2``: Beloved, finished twice on 20 September 2026,
      rated 3 then 5, in that stored order.
    - ``emma``: Emma, finished 5 May 2026 with ``finishedPages`` null.
    - ``xp``: three authors, finished 12 October 2026, 1 page, rated 1.
    - ``solaris``: finished 3 November 2025, 204 pages.
    - Hyperion: a side read, never finished.
    """
    ids: dict[str, str] = {}
    ddia = b.book(
        title="Designing Data-Intensive Applications",
        authors=["Martin Kleppmann"],
        pages=616,
        cover_file="covers/ddia.jpg",
    )
    ids["ddia"] = b.reading(
        ddia,
        start_date="2026-02-20",
        finish_date="2026-03-14",
        finished_pages=611,
        current_page=616,
        rating=4,
    )
    dune = b.book(title="Dune", authors=["Frank Herbert"], pages=412)
    ids["dune"] = b.reading(
        dune, start_date=None, finish_date="2026-06-01", finished_pages=412, current_page=412
    )
    kindred = b.book(title="Kindred", authors=["Octavia E. Butler"], pages=286)
    ids["kindred_feb"] = b.reading(
        kindred,
        start_date="2026-02-01",
        finish_date="2026-02-10",
        finished_pages=286,
        current_page=286,
    )
    ids["kindred_apr"] = b.reading(
        kindred,
        start_date="2026-04-01",
        finish_date="2026-04-20",
        finished_pages=286,
        current_page=286,
    )
    beloved = b.book(title="Beloved", authors=["Toni Morrison"], pages=324)
    for name, rating in (("beloved_1", 3), ("beloved_2", 5)):
        ids[name] = b.reading(
            beloved,
            start_date=None,
            finish_date="2026-09-20",
            finished_pages=324,
            current_page=324,
            rating=rating,
        )
    emma = b.book(title="Emma", authors=["Jane Austen"], pages=400)
    ids["emma"] = b.reading(emma, finish_date="2026-05-05", finished_pages=None, current_page=400)
    xp = b.book(
        title="Extreme Notes", authors=["Kent Beck", "Ward Cunningham", "Ron Jeffries"], pages=1
    )
    ids["xp"] = b.reading(
        xp,
        start_date="2026-10-11",
        finish_date="2026-10-12",
        finished_pages=1,
        current_page=1,
        rating=1,
    )
    solaris = b.book(title="Solaris", authors=["Stanisław Lem"], pages=204)
    ids["solaris"] = b.reading(
        solaris,
        start_date="2025-10-20",
        finish_date="2025-11-03",
        finished_pages=204,
        current_page=204,
    )
    hyperion = b.book(title="Hyperion", authors=["Dan Simmons"], pages=482)
    b.reading(hyperion, start_date="2026-10-01", current_page=210)
    b.side_read(hyperion)
    return ids


def test_ac1_p0_finishes_hold_one_entry_per_finished_reading_in_the_range_read_as_stored(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """[P0] AC-1 one StatsFinish per finished Reading in the range, adding up to the counts."""
    b = library_builder
    ids = _seed(b)
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    this_year = _stats(client, "2026-01-01", "2026-10-28")
    # The criterion: the Readings behind This year's count, back-fills and both
    # Kindreds included, Solaris (2025) and the side read not.
    assert {f["readingId"] for f in this_year.get("finishes", [])} == {
        ids[name]
        for name in (
            "ddia",
            "dune",
            "kindred_feb",
            "kindred_apr",
            "beloved_1",
            "beloved_2",
            "emma",
            "xp",
        )
    }

    by_reading = {f["readingId"]: f for f in this_year["finishes"]}
    assert all(set(f) == FINISH_KEYS for f in this_year["finishes"]), this_year["finishes"]
    ddia = by_reading[ids["ddia"]]
    library = b.build()
    ddia_book = next(book for book in library.books if book.title.startswith("Designing"))
    assert ddia == {
        "readingId": ids["ddia"],
        "bookId": ddia_book.id,
        "title": "Designing Data-Intensive Applications",
        "firstAuthor": "Martin Kleppmann",
        "authorCount": 1,
        "coverFile": "covers/ddia.jpg",
        "spineColor": ddia_book.spine_color,
        "finishDate": "2026-03-14",
        "finishedPages": 611,
        "rating": 4,
    }
    # The back-fill is listed, unrated and without a cover.
    dune = by_reading[ids["dune"]]
    assert (dune["finishDate"], dune["rating"], dune["coverFile"]) == ("2026-06-01", None, None)
    # Kindred twice, with its two dates.
    assert (
        by_reading[ids["kindred_feb"]]["finishDate"],
        by_reading[ids["kindred_apr"]]["finishDate"],
    ) == ("2026-02-10", "2026-04-20")
    # A stored null finishedPages is sent as 0.
    assert by_reading[ids["emma"]]["finishedPages"] == 0
    xp = by_reading[ids["xp"]]
    assert (xp["firstAuthor"], xp["authorCount"], xp["rating"]) == ("Kent Beck", 3, 1)
    assert "Hyperion" not in {f["title"] for f in this_year["finishes"]}

    # Every preset's dates and a Custom range from mid-month add up to the counts.
    for start, end in RANGES:
        view = _stats(client, start, end)
        assert len(view["finishes"]) == view["books"], (start, end)
        assert sum(f["finishedPages"] for f in view["finishes"]) == view["pages"], (start, end)


def test_ac2_p0_finishes_are_newest_first_then_title_key_book_id_and_stored_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    """[P0] AC-2 the order, stable between fetches; All time unpaged; [] when empty."""
    b = library_builder
    ids = _seed(b)
    # Two Books whose titles share a title key ("Émile" and "EMILE"), finished on
    # Beloved's day: after Beloved by the key, then by Book id. A raw compare, a
    # casefold alone or accent stripping alone would each put "EMILE" first.
    emile_b = b.book(id=EMILE_B, title="EMILE", authors=["Jean-Jacques Rousseau"], pages=500)
    ids["emile_b"] = b.reading(
        emile_b, start_date=None, finish_date="2026-09-20", finished_pages=500, current_page=500
    )
    emile_a = b.book(id=EMILE_A, title="Émile", authors=["Jean-Jacques Rousseau"], pages=480)
    ids["emile_a"] = b.reading(
        emile_a, start_date=None, finish_date="2026-09-20", finished_pages=480, current_page=480
    )
    b.write(tmp_path)
    client = api_client(tmp_path, raise_server_exceptions=True)

    first = _stats(client, "2026-01-01", "2026-10-28")
    expected = [
        ids[name]
        for name in (
            "xp",  # 12 October
            "beloved_1",  # 20 September: "beloved" by the title key, stored order
            "beloved_2",
            "emile_a",  # then the two Emiles, one key, by Book id
            "emile_b",
            "dune",  # 1 June
            "emma",  # 5 May
            "kindred_apr",  # 20 April
            "ddia",  # 14 March
            "kindred_feb",  # 10 February
        )
    ]
    # The criterion: newest first, then the title key, then Book id, then stored order.
    assert [f["readingId"] for f in first.get("finishes", [])] == expected

    second = _stats(client, "2026-01-01", "2026-10-28")
    assert [f["readingId"] for f in second["finishes"]] == expected

    # All time: every finish, Solaris last, no paging.
    all_time = _stats(client)
    assert [f["readingId"] for f in all_time["finishes"]] == [*expected, ids["solaris"]]
    assert len(all_time["finishes"]) == all_time["books"] == 11

    # A range with no finishes.
    assert _stats(client, "2024-01-01", "2024-12-31")["finishes"] == []

    # All time in an empty library (test_stats.py:253's view gains "finishes": []).
    LibraryBuilder().write(tmp_path / "empty")
    empty = api_client(tmp_path / "empty", raise_server_exceptions=True)
    assert _stats(empty) == {
        "books": 0,
        "pages": 0,
        "bucket": "month",
        "buckets": [],
        "finishes": [],
    }


def test_ac3_p1_the_openapi_schema_gives_stats_view_a_required_list_of_stats_finish() -> None:
    """[P1] AC-3 what api:gen reads: StatsView.finishes, required, of StatsFinish."""
    schemas = create_app().openapi()["components"]["schemas"]

    # The criterion: finishes is a required field of StatsView.
    assert "finishes" in schemas["StatsView"].get("required", [])

    finishes = schemas["StatsView"]["properties"]["finishes"]
    assert finishes["type"] == "array"
    assert finishes["items"] == {"$ref": "#/components/schemas/StatsFinish"}
    finish = schemas["StatsFinish"]
    assert set(finish["properties"]) == FINISH_KEYS
    # Every key is always sent; rating and coverFile may be null.
    assert set(finish["required"]) == FINISH_KEYS
    assert finish["properties"]["finishedPages"]["type"] == "integer"


def _story_17_1_description() -> str:
    """``get_stats``'s description as Story 17.1 quotes it in ``epics.md``."""
    epic = _epic(17)
    found = [m for m in _DESCRIPTION.finditer(epic) if _story_at(epic, m.start()) == "17.1"]
    assert len(found) == 1, [m.group(2)[:40] for m in found]
    return found[0].group(2)


def test_ac4_p1_get_stats_returns_the_routes_finishes_and_story_17_1s_description(
    connect_mcp: Callable[..., McpClient], tmp_path: Path
) -> None:
    """[P1] AC-4 get_stats answers as the route does, finishes included."""
    folder = tmp_path / "library"
    b = LibraryBuilder()
    ids = _seed(b)
    b.write(folder)
    client = connect_mcp(data_dir=folder)

    year = {"from": "2026-01-01", "to": "2026-10-28"}
    ranged = structured_of(client.call_tool("get_stats", year))
    # The criterion: the tool's finishes, newest first, Extreme Notes on 12 October.
    assert [f["readingId"] for f in ranged.get("finishes", [])][:1] == [ids["xp"]]

    route = client.http.get("/api/views/stats", params=year)
    assert ranged == route.json()
    every = structured_of(client.call_tool("get_stats"))
    assert every == client.http.get("/api/views/stats").json()
    assert len(every["finishes"]) == every["books"] == 9

    tool = client.tool("get_stats")
    assert tool["description"] == DESCRIPTIONS["get_stats"]
    # The description test reads Story 17.1's line, which replaces Story 12.2's.
    assert DESCRIPTIONS["get_stats"] == _story_17_1_description()
