"""Response models of the read-only views (camelCase on the wire)."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _View(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LibraryMeter(_View):
    """The "X of Y finished" meter: Books with a finished Reading, of all Books."""

    finished: int
    total: int


class ShelfBook(_View):
    id: str
    title: str
    first_author: str
    author_count: int
    spine_color: str
    finished: bool


class HomeView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]


class CatalogView(_View):
    meter: LibraryMeter
    books: list[ShelfBook]
