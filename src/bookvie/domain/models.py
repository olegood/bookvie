from dataclasses import dataclass, field
from uuid import uuid4


def new_id() -> str:
    return uuid4().hex[:12]


@dataclass(slots=True)
class Book:
    """Reference data about a book."""
    title: str
    total_pages: int
    subtitle: str | None = None
    authors: tuple[str, ...] = ()
    isbn: str | None = None
    year: int | None = None
    id: str = field(default_factory=new_id)

    def __post_init__(self):
        """Ensure that the book title and total pages are valid."""
        if not self.title.strip():
            raise ValueError("book title cannot be empty")
        if self.total_pages < 1:
            raise ValueError("a book needs at least one page")
        self.authors = tuple(self.authors)

    @property
    def display_title(self) -> str:
        """The title of the book, optionally followed by the subtitle."""
        return f"{self.title}: {self.subtitle}" if self.subtitle else self.title
