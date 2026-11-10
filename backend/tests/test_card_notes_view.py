"""Story 5.3 Find a note across all my books: the ``card-notes`` view (API).

The criterion the server decides (FR-19, AD-6):

- AC-2: unscoped, ``GET /api/views/card-notes`` lists every Card note grouped
  under its Book's title, in page order within each Book (``pageStart``, then
  ``createdAt``). Only Books with notes get a group, and the groups go by
  title A to Z: ``title_key``, then Book id (decided with Oleg, 2026-11-10).
  With no notes at all, there are no groups.

The page that renders the view (serif group titles, page refs, each note's
Edit, "No card notes yet."), both searches, the nav item, the Main book card's
count link, "See all card notes" and the scope chip are read in the browser
(``frontend/e2e/card-notes.spec.ts``).

The follow-ups pin the scoped view (``?book=<id>``: one group and ``scope``,
404 ``book_not_found`` for an unknown id), OpenAPI, and the Main book's
``cardNoteCount`` on the home view.
"""

from pathlib import Path

from tests.builder import LibraryBuilder
from tests.helpers import api_client, library_bytes

CARD_NOTES_VIEW = "/api/views/card-notes"


# --- AC-2: every note, grouped by Book title, in page order ---------------------------


def test_ac2_p0_card_notes_view_groups_every_note_by_book_title_in_page_order(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Seeded out of order on purpose: library order is Neuromancer, Emma,
    # Émile, Dune; notes are stored out of page order, and two Dune notes share
    # p.96 with the later createdAt stored first.
    neuromancer = library_builder.book(title="Neuromancer", pages=271)
    library_builder.card_note(neuromancer, text="The sky above the port.", page_start=3)
    emma = library_builder.book(title="Emma", pages=474)
    library_builder.card_note(emma, text="Badly done, Emma!", page_start=368)
    emile = library_builder.book(title="Émile", pages=500)
    library_builder.card_note(emile, text="Everything is good.", page_start=37)
    dune = library_builder.book(title="Dune", pages=412)
    mystery = library_builder.card_note(dune, text="The mystery of life.", page_start=300)
    later = library_builder.card_note(
        dune,
        text="He who controls the spice.",
        page_start=96,
        created_at="2026-10-21T09:00:00+02:00",
    )
    beginning = library_builder.card_note(
        dune, text="A beginning is a delicate time.", page_start=42, page_end=45
    )
    spice = library_builder.card_note(
        dune, text="The spice must flow.", page_start=96, created_at="2026-10-20T21:15:00+02:00"
    )
    fear = library_builder.card_note(dune, text="Fear is the mind-killer.", page_start=12)
    library_builder.book(title="Good Omens")  # no notes: no group
    library_builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = api_client(tmp_path, raise_server_exceptions=True).get(CARD_NOTES_VIEW)

    # The criterion: one group per Book with notes, by title key, then Book id.
    # title_key puts "Émile" (emile) before "Emma" (emma).
    assert response.status_code == 200
    body = response.json()
    assert [group["title"] for group in body["groups"]] == ["Dune", "Émile", "Emma", "Neuromancer"]
    assert [group["bookId"] for group in body["groups"]] == [dune, emile, emma, neuromancer]
    # Unscoped: no scope chip.
    assert body["scope"] is None
    # Page order within a Book: pageStart, then createdAt; a range keeps pageEnd.
    dune_notes = body["groups"][0]["notes"]
    assert [note["id"] for note in dune_notes] == [fear, beginning, spice, later, mystery]
    assert dune_notes[1] == {
        "id": beginning,
        "text": "A beginning is a delicate time.",
        "pageStart": 42,
        "pageEnd": 45,
        "createdAt": dune_notes[1]["createdAt"],
    }
    assert dune_notes[2]["pageEnd"] is None
    assert [len(group["notes"]) for group in body["groups"]] == [5, 1, 1, 1]
    # A view is a read: the file is untouched.
    assert library_bytes(tmp_path) == before

    # With no notes at all, there are no groups (the page reads "No card notes yet.").
    empty = tmp_path / "empty"
    LibraryBuilder().write(empty)
    response = api_client(empty, raise_server_exceptions=True).get(CARD_NOTES_VIEW)
    assert response.status_code == 200
    assert response.json() == {"scope": None, "groups": []}


def test_groups_with_the_same_title_key_go_by_book_id(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    # Stored with the higher id first, so library order alone would get it wrong.
    later = library_builder.book(id="bbbbbbbb-0000-4000-8000-000000000000", title="Dune")
    library_builder.card_note(later, page_start=1)
    earlier = library_builder.book(id="aaaaaaaa-0000-4000-8000-000000000000", title="dune")
    library_builder.card_note(earlier, page_start=1)
    library_builder.write(tmp_path)

    response = api_client(tmp_path, raise_server_exceptions=True).get(CARD_NOTES_VIEW)

    assert response.status_code == 200
    assert [group["bookId"] for group in response.json()["groups"]] == [earlier, later]


# --- Follow-ups: the scoped view, its 404, OpenAPI ------------------------------------


def test_the_scoped_view_holds_only_that_books_group_and_its_scope(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    later = library_builder.card_note(dune, text="The mystery of life.", page_start=300)
    first = library_builder.card_note(dune, text="Fear is the mind-killer.", page_start=12)
    emma = library_builder.book(title="Emma", pages=474)
    library_builder.card_note(emma, text="Badly done, Emma!", page_start=368)
    library_builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = api_client(tmp_path, raise_server_exceptions=True).get(
        CARD_NOTES_VIEW, params={"book": dune}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["scope"] == {"bookId": dune, "title": "Dune"}
    assert [(g["bookId"], g["title"]) for g in body["groups"]] == [(dune, "Dune")]
    assert [note["id"] for note in body["groups"][0]["notes"]] == [first, later]
    assert library_bytes(tmp_path) == before


def test_the_scoped_view_of_a_book_without_notes_has_its_scope_and_no_groups(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.card_note(dune, page_start=12)
    emma = library_builder.book(title="Emma", pages=474)
    library_builder.write(tmp_path)

    response = api_client(tmp_path, raise_server_exceptions=True).get(
        CARD_NOTES_VIEW, params={"book": emma}
    )

    assert response.status_code == 200
    assert response.json() == {"scope": {"bookId": emma, "title": "Emma"}, "groups": []}


def test_the_scoped_view_of_an_unknown_book_is_404_book_not_found(
    tmp_path: Path, library_builder: LibraryBuilder
) -> None:
    dune = library_builder.book(title="Dune", pages=412)
    library_builder.card_note(dune, page_start=12)
    library_builder.write(tmp_path)
    before = library_bytes(tmp_path)

    response = api_client(tmp_path).get(CARD_NOTES_VIEW, params={"book": "nope"})

    assert response.status_code == 404
    error = response.json()["error"]
    assert (error["kind"], error["code"]) == ("refusal", "book_not_found")
    assert library_bytes(tmp_path) == before


def test_openapi_documents_the_card_notes_view(tmp_path: Path) -> None:
    openapi = api_client(tmp_path).get("/openapi.json").json()
    operation = openapi["paths"][CARD_NOTES_VIEW]["get"]
    params = {p["name"]: p for p in operation["parameters"]}
    assert set(params) == {"book"}
    assert params["book"]["in"] == "query"
    assert params["book"]["required"] is False
    ok = operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    assert ok == "#/components/schemas/CardNotesView"
    not_found = operation["responses"]["404"]["content"]["application/json"]["schema"]["$ref"]
    assert not_found == "#/components/schemas/ErrorResponse"
    schemas = openapi["components"]["schemas"]
    assert {"CardNotesView", "CardNotesGroup", "CardNotesScope"} <= set(schemas)
    assert set(schemas["CardNotesView"]["properties"]) == {"scope", "groups"}
