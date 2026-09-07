from dataclasses import dataclass, field
from uuid import uuid4


def new_id() -> str:
    return uuid4().hex[:12]


@dataclass(frozen=True, slots=True)
class Progress:
    pages_read: int = 0
    total_pages: int = 0

    def __post_init__(self):
        if self.pages_read < 0 or self.total_pages < 0:
            raise ValueError("page counts cannot be negative")
        if self.pages_read > self.total_pages:
            raise ValueError(f"pages read ({self.pages_read}) exceeds total ({self.total_pages})")

    @property
    def percent(self) -> float:
        if self.total_pages == 0:
            return 0.0
        return round(100 * self.pages_read / self.total_pages, 2)

    @property
    def pages_left(self) -> int:
        return self.total_pages - self.pages_read

    @property
    def is_complete(self) -> bool:
        return 0 < self.total_pages == self.pages_read

    def __add__(self, other: "Progress") -> "Progress":
        if not isinstance(other, Progress):
            return NotImplemented
        return Progress(
            pages_read=self.pages_read + other.pages_read,
            total_pages=self.total_pages + other.total_pages,
        )

    def __radd__(self, other: object) -> "Progress":
        if other == 0:
            return self
        return NotImplemented

    def __str__(self) -> str:
        return f"{self.pages_read}/{self.total_pages} pages ({self.percent:.1f}%)"


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
