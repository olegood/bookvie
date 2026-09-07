from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

from .errors import DomainError, SequenceLocked
from .status import Status


def new_id() -> str:
    return uuid4().hex[:12]


@dataclass(frozen=True, slots=True)
class Progress:
    pages_read: int = 0
    total_pages: int = 0

    def __post_init__(self):
        if self.pages_read < 0 or self.total_pages < 0:
            raise DomainError("page counts cannot be negative")
        if self.pages_read > self.total_pages:
            raise DomainError(f"pages read ({self.pages_read}) exceeds total ({self.total_pages})")

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
            raise DomainError("book title cannot be empty")
        if self.total_pages < 1:
            raise DomainError("a book needs at least one page")
        self.authors = tuple(self.authors)

    @property
    def display_title(self) -> str:
        """The title of the book, optionally followed by the subtitle."""
        return f"{self.title}: {self.subtitle}" if self.subtitle else self.title


@dataclass(slots=True)
class ReadingSequence:
    """A named, ordered list of books."""
    name: str
    description: str = ""
    book_ids: list[str] = field(default_factory=list)
    status: Status = Status.NEW
    id: str = field(default_factory=new_id)
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if not self.name.strip():
            raise DomainError("sequence name cannot be empty")

    @property
    def is_editable(self) -> bool:
        return self.status.is_open

    @property
    def size(self) -> int:
        return len(self.book_ids)

    def add_book(self, book_id: str, position: int | None = None) -> None:
        self._ensure_editable()
        if book_id in self.book_ids:
            raise SequenceLocked("book is already in this sequence")
        if position is None:
            self.book_ids.append(book_id)
        else:
            self.book_ids.insert(position, book_id)

    def remove_book(self, book_id: str) -> None:
        self._ensure_editable()
        self.ensure_contains(book_id)
        self.book_ids.remove(book_id)

    def move_book(self, book_id: str, position: int) -> None:
        self._ensure_editable()
        self.ensure_contains(book_id)
        self.book_ids.remove(book_id)
        self.book_ids.insert(position, book_id)

    def rename(self, name: str) -> None:
        self._ensure_editable()
        if not name.strip():
            raise DomainError("sequence name cannot be empty")
        self.name = name

    def change_status(self, target: Status) -> None:
        self.status.ensure_can_change_to(target)
        self.status = target

    def ensure_contains(self, book_id: str) -> None:
        if book_id not in self.book_ids:
            raise DomainError(f"'{self.name}' does not contain this book")

    def _ensure_editable(self) -> None:
        if not self.is_editable:
            raise SequenceLocked(f"sequence '{self.name}' is {self.status.value} and cannot be changed")
