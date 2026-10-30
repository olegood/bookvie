"""Duplicate detection (FR-3, AD-10): pure matching rules on Book fields.

Two Books are possible duplicates when both have an ISBN and the normalized
ISBNs are equal. When either Book lacks an ISBN, they are duplicates when the
titles match and at least one author is shared. Titles and author names are
compared by one key: Unicode NFKC normalized, typographic quotes and dashes
folded to their ASCII forms, trimmed, runs of whitespace collapsed to one
space, and casefolded. Two different ISBNs never match on
title and author alone.
"""

import re
import unicodedata
from collections.abc import Iterable

from .book_fields import BookFields
from .model import Book

_WHITESPACE = re.compile(r"\s+")
# A title pasted from a store page carries ’ and – where a typed one has ' and -.
_TYPOGRAPHIC = str.maketrans(
    {"\u2018": "'", "\u2019": "'", "\u02bc": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-"}
)


def normalize_isbn(raw: str) -> str:
    """The ISBN as 13 characters: hyphens and spaces removed, ISBN-10 converted.

    An ISBN-10 becomes ``978`` + its first nine digits + the ISBN-13 check
    digit. Anything that isn't 10 characters is returned stripped (an ISBN-13
    already is, and stored ISBNs are validated).
    """
    compact = raw.replace("-", "").replace(" ", "").upper()
    if len(compact) != 10:
        return compact
    stem = "978" + compact[:9]
    total = sum(int(digit) * (3 if index % 2 else 1) for index, digit in enumerate(stem))
    return stem + str((10 - total % 10) % 10)


def isbns_match(a: str, b: str) -> bool:
    return normalize_isbn(a) == normalize_isbn(b)


def _key(text: str) -> str:
    """NFKC normalized, quotes and dashes folded, trimmed, whitespace runs collapsed, casefolded."""
    folded = unicodedata.normalize("NFKC", text).translate(_TYPOGRAPHIC)
    return _WHITESPACE.sub(" ", folded.strip()).casefold()


def titles_match(a: str, b: str) -> bool:
    return _key(a) == _key(b)


def _author_keys(authors: Iterable[str]) -> set[str]:
    return {key for key in (_key(name) for name in authors) if key}


def authors_match(a: list[str], b: list[str]) -> bool:
    """True when at least one name is shared, compared by the same key as titles."""
    return bool(_author_keys(a) & _author_keys(b))


def is_duplicate(book: Book, fields: BookFields) -> bool:
    if book.isbn and fields.isbn:
        return isbns_match(book.isbn, fields.isbn)
    return titles_match(book.title, fields.title) and authors_match(book.authors, fields.authors)


def find_duplicates(books: Iterable[Book], fields: BookFields) -> list[Book]:
    """Every Book that ``fields`` would duplicate, each once, in catalog order."""
    return [book for book in books if is_duplicate(book, fields)]
