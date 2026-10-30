"""``LibraryBuilder``: seed a library for a test (TC-1).

Every Book, Reading and Card note gets valid defaults (UUIDs, a curated spine
color, deterministic timestamps), so a test names only what it cares about::

    builder = LibraryBuilder()
    dune = builder.book(title="Dune", pages=412)
    builder.reading(dune, current_page=120)
    builder.main(dune)
    library = builder.build()      # no invariant check: failing cases work too
    builder.write(data_dir)        # checks invariants, then writes library.json

Overrides use snake_case keyword names. From the command line, a partial
camelCase library on stdin is completed and written to a data folder (the
e2e suite seeds servers this way)::

    echo '{"books": [{"title": "Dune"}]}' | python -m tests.builder <data_dir>
"""

import json
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from pydantic.alias_generators import to_camel

from bookvie.domain import Library, check_invariants
from bookvie.store import LIBRARY_NAME, serialize

# Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone (DESIGN.md, Spine colors).
CURATED = ("#749076", "#5B7590", "#9B6753", "#B48A45", "#7A6283", "#4B7C7B", "#6C7650", "#6F7375")

_BASE_TIME = datetime(2026, 1, 1, 9, 0, tzinfo=timezone(timedelta(hours=1)))
_BASE_DATE = date(2026, 1, 1)


def _json_default(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"{type(value).__name__} is not JSON serializable")


def _camel(overrides: dict[str, Any]) -> dict[str, Any]:
    return {to_camel(key): value for key, value in overrides.items()}


class LibraryBuilder:
    def __init__(self) -> None:
        self._doc: dict[str, Any] = {
            "schemaVersion": 1,
            "mainBookId": None,
            "upNextBookId": None,
            "sideReadBookIds": [],
            "books": [],
        }
        self._stamps = 0

    def _stamp(self) -> str:
        self._stamps += 1
        return (_BASE_TIME + timedelta(minutes=self._stamps)).isoformat()

    def _book(self, book_id: str) -> dict[str, Any]:
        for book in self._doc["books"]:
            if book["id"] == book_id:
                return book
        raise KeyError(f"no Book {book_id} in this builder")

    # --- entities ----------------------------------------------------------

    def book(self, **overrides: Any) -> str:
        return self._add_book(_camel(overrides))

    def _add_book(self, overrides: dict[str, Any]) -> str:
        n = len(self._doc["books"])
        curated = CURATED[n % len(CURATED)]
        book: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "createdAt": self._stamp(),
            "ownership": "owned",
            "title": f"Book {n + 1}",
            "subtitle": None,
            "authors": [f"Author {n + 1}"],
            "pages": 300,
            "edition": 1,
            "language": "English",
            "publisher": "Publisher",
            "type": "paperback",
            "isbn": None,
            "year": None,
            "tags": [],
            "coverFile": None,
            "spineColorUser": None,
            "spineColorFromCover": None,
            "spineColorCurated": curated,
            "spineColor": None,
            "readings": [],
            "cardNotes": [],
        }
        readings = overrides.pop("readings", [])
        notes = overrides.pop("cardNotes", [])
        book.update(overrides)
        if book["spineColor"] is None:
            book["spineColor"] = (
                book["spineColorUser"] or book["spineColorFromCover"] or book["spineColorCurated"]
            )
        self._doc["books"].append(book)
        for reading in readings:
            self._add_reading(book["id"], dict(reading))
        for note in notes:
            self._add_card_note(book["id"], dict(note))
        return book["id"]

    def reading(self, book_id: str, **overrides: Any) -> str:
        """An unfinished Reading at page 0 unless overridden."""
        return self._add_reading(book_id, _camel(overrides))

    def _add_reading(self, book_id: str, overrides: dict[str, Any]) -> str:
        reading: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "startDate": _BASE_DATE.isoformat(),
            "currentPage": 0,
            "purpose": None,
            "lastProgressUpdate": self._stamp(),
            "pausedAt": None,
            "finishDate": None,
            "finishedPages": None,
            "purposeFulfilled": None,
            "rating": None,
        }
        reading.update(overrides)
        self._book(book_id)["readings"].append(reading)
        return reading["id"]

    def card_note(self, book_id: str, **overrides: Any) -> str:
        return self._add_card_note(book_id, _camel(overrides))

    def _add_card_note(self, book_id: str, overrides: dict[str, Any]) -> str:
        note: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "text": "A note",
            "pageStart": 1,
            "pageEnd": None,
            "createdAt": self._stamp(),
        }
        note.update(overrides)
        self._book(book_id)["cardNotes"].append(note)
        return note["id"]

    # --- pointers ----------------------------------------------------------

    def main(self, book_id: str | None) -> "LibraryBuilder":
        self._doc["mainBookId"] = book_id
        return self

    def up_next(self, book_id: str | None) -> "LibraryBuilder":
        self._doc["upNextBookId"] = book_id
        return self

    def side_read(self, book_id: str) -> "LibraryBuilder":
        self._doc["sideReadBookIds"].append(book_id)
        return self

    # --- output ------------------------------------------------------------

    def build(self) -> Library:
        """The library as built; types are validated, invariants are not."""
        return Library.model_validate_json(json.dumps(self._doc, default=_json_default))

    def write(self, data_dir: Path) -> Path:
        """Check invariants, then write ``library.json`` into ``data_dir``."""
        library = self.build()
        check_invariants(library)
        data_dir = Path(data_dir)
        data_dir.mkdir(parents=True, exist_ok=True)
        path = data_dir / LIBRARY_NAME
        path.write_bytes(serialize(library))
        return path

    @classmethod
    def from_partial(cls, partial: dict[str, Any]) -> "LibraryBuilder":
        """A builder holding ``partial`` (camelCase) with every default filled in."""
        builder = cls()
        partial = dict(partial)
        for book in partial.pop("books", []):
            builder._add_book(dict(book))
        builder._doc.update(partial)
        return builder


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("usage: python -m tests.builder <data_dir> < partial-library.json", file=sys.stderr)
        return 2
    data_dir = Path(args[0]).expanduser().resolve()
    if data_dir == (Path.home() / "bookvie-data").resolve():
        print(f"tests.builder: refusing the real library {data_dir}", file=sys.stderr)
        return 2
    partial = json.loads(sys.stdin.read() or "{}")
    LibraryBuilder.from_partial(partial).write(data_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
