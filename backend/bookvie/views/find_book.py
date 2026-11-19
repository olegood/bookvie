"""The ``find_book`` view: every Book a free-text query may mean (FR-28, AD-21).

It finds candidates and never picks one. Text is compared folded: by
:func:`fold_typography` (typographic quotes and dashes as ASCII, whitespace
runs as one space) and then :func:`title_key` (case and accents). A Book
matches when the query is a substring of its title, subtitle or an author;
when it equals the initials of the title's words (a word is a run of letters
and digits once apostrophes are dropped, so "Data-Intensive" is two words and
"Don't" one), ignoring the query's other characters, from two characters up;
or when the query, without hyphens and whitespace, is shaped like an ISBN-10
or ISBN-13 and equals the Book's ISBN through :func:`normalize_isbn`, so an
ISBN-10 finds its ISBN-13.

Every match is returned, best first: exact title, ISBN, title prefix, title
substring or initials, author, subtitle; ties by :func:`title_key`, edition,
then id.
"""

from collections.abc import Iterator

from bookvie.domain import Book, Library, title_key
from bookvie.domain.duplicates import fold_typography, normalize_isbn
from bookvie.intents.contract import FieldError, invalid_fields

from .models import BookCandidate, FindBookView
from .shelf import role_of

QUERY_FIELD = "query"
BLANK_QUERY_MESSAGE = "Give part of a title, an author or an ISBN."

_EXACT_TITLE, _ISBN, _TITLE_PREFIX, _TITLE_PART, _AUTHOR, _SUBTITLE = range(6)
_MIN_INITIALS = 2


def _fold(text: str) -> str:
    return title_key(fold_typography(text))


def _words(text: str) -> Iterator[str]:
    """The runs of letters and digits in ``text``."""
    word: list[str] = []
    for ch in text:
        if ch.isalnum():
            word.append(ch)
        elif word:
            yield "".join(word)
            word = []
    if word:
        yield "".join(word)


def _initials(text: str) -> str:
    """The first letter of each word of folded ``text``, apostrophes dropped first."""
    return "".join(word[0] for word in _words(text.replace("'", "")))


def _isbn_query(query: str) -> str | None:
    """The query as a normalized ISBN when it is shaped like one, else ``None``."""
    compact = "".join(ch for ch in query if ch != "-" and not ch.isspace()).upper()
    if not compact.isascii():
        return None
    if len(compact) == 13 and compact.isdigit():
        return normalize_isbn(compact)
    if len(compact) == 10 and compact[:9].isdigit() and (compact[9].isdigit() or compact[9] == "X"):
        return normalize_isbn(compact)
    return None


def _rank(book: Book, key: str, initials: str, isbn: str | None) -> int | None:
    """The best way ``book`` matches the query, or ``None`` when it doesn't."""
    title = _fold(book.title)
    if title == key:
        return _EXACT_TITLE
    if isbn is not None and book.isbn and normalize_isbn(book.isbn) == isbn:
        return _ISBN
    if title.startswith(key):
        return _TITLE_PREFIX
    if key in title or (len(initials) >= _MIN_INITIALS and _initials(title) == initials):
        return _TITLE_PART
    if any(key in _fold(author) for author in book.authors):
        return _AUTHOR
    if book.subtitle and key in _fold(book.subtitle):
        return _SUBTITLE
    return None


def find_book(library: Library, query: str) -> FindBookView:
    """Every Book ``query`` matches, best first; 422 ``invalid_fields`` on a blank query."""
    stripped = query.strip()
    if not stripped:
        raise invalid_fields([FieldError(field=QUERY_FIELD, message=BLANK_QUERY_MESSAGE)])
    key = _fold(stripped)
    initials = "".join(ch for ch in key if ch.isalnum())
    isbn = _isbn_query(stripped)
    ranked = [
        (rank, title_key(book.title), book.edition, book.id, book)
        for book in library.books
        if (rank := _rank(book, key, initials, isbn)) is not None
    ]
    ranked.sort(key=lambda entry: entry[:4])
    return FindBookView(
        books=[
            BookCandidate(
                id=book.id,
                title=book.title,
                subtitle=book.subtitle,
                authors=list(book.authors),
                edition=book.edition,
                type=book.type,
                role=role_of(library, book),
            )
            for *_, book in ranked
        ]
    )
