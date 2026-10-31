"""The canonical library document (AD-18, AD-19).

These models are the persisted shape of ``library.json`` and the schema the
store validates against. Field order is the key order in the file (AD-2).
Keys are camelCase on the wire and snake_case in Python. Unknown keys are
refused (AD-13), and types are strict: a string never becomes a number.

Only types and the bounds named in AD-18/AD-19 live here; field validation
(trimming, ISBN, year, …) belongs to the intents (Story 1.7), and the
cross-entity rules live in :mod:`bookvie.domain.invariants`.
"""

from datetime import date
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

SCHEMA_VERSION = 1

BookType = Literal["paperback", "hardcover", "ebook"]
PurposeFulfilled = Literal["yes", "partly", "notYet"]
Rating = Annotated[int, Field(ge=1, le=5)]


class _Model(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        strict=True,
    )


class Reading(_Model):
    id: str
    start_date: date | None
    current_page: int
    purpose: str | None
    last_progress_update: AwareDatetime | None
    paused_at: date | None
    finish_date: date | None
    finished_pages: int | None
    purpose_fulfilled: PurposeFulfilled | None
    rating: Rating | None

    @property
    def finished(self) -> bool:
        return self.finish_date is not None


class CardNote(_Model):
    id: str
    text: str
    page_start: int
    page_end: int | None
    created_at: AwareDatetime


class Book(_Model):
    id: str
    created_at: AwareDatetime
    ownership: Literal["owned"]
    title: str
    subtitle: str | None
    authors: list[str]
    pages: Annotated[int, Field(ge=1)]
    edition: Annotated[int, Field(ge=1)]
    language: str
    publisher: str
    type: BookType
    isbn: str | None
    year: int | None
    tags: list[str]
    cover_file: str | None
    spine_color_user: str | None
    spine_color_from_cover: str | None
    spine_color_curated: str
    spine_color: str
    readings: list[Reading]
    card_notes: list[CardNote]

    def latest_finished(self) -> Reading | None:
        """The finished Reading with the greatest ``finishDate``; the later in list order on a tie."""
        latest: Reading | None = None
        for reading in self.readings:
            if reading.finish_date is None:
                continue
            if latest is None or reading.finish_date >= latest.finish_date:  # type: ignore[operator]
                latest = reading
        return latest


class Library(_Model):
    schema_version: int
    main_book_id: str | None
    up_next_book_id: str | None
    side_read_book_ids: list[str]
    books: list[Book]

    @classmethod
    def empty(cls) -> "Library":
        return cls(
            schema_version=SCHEMA_VERSION,
            main_book_id=None,
            up_next_book_id=None,
            side_read_book_ids=[],
            books=[],
        )

    def book(self, book_id: str) -> Book | None:
        return next((b for b in self.books if b.id == book_id), None)
