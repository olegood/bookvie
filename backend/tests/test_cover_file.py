"""``cover_name`` and the store's guards behind ``book_cover_file_in_covers``.

``check_invariants`` now keeps a bad ``coverFile`` out of every stored
library, so these build a :class:`Library` directly (no invariants run) to
pin the second line of defence: such a value never names a file in ``covers/``.
"""

import pytest

from bookvie.domain.cover_file import cover_name
from bookvie.store import referenced_covers
from tests.builder import LibraryBuilder


@pytest.mark.parametrize(
    ("cover_file", "name"),
    [("covers/x.jpg", "x.jpg"), ("covers/b-1234.png", "b-1234.png"), ("covers/a b.jpg", "a b.jpg")],
)
def test_a_plain_name_in_covers_is_its_name(cover_file: str, name: str) -> None:
    assert cover_name(cover_file) == name


@pytest.mark.parametrize(
    "cover_file",
    [
        "",
        "covers",
        "covers/",
        "covers/.",
        "covers/..",
        "covers/../library.json",
        "covers/a/b.jpg",
        "covers/a\\b.jpg",
        "covers/a\0.jpg",
        "/covers/x.jpg",
        "elsewhere/x.jpg",
    ],
)
def test_anything_else_names_no_cover(cover_file: str) -> None:
    assert cover_name(cover_file) is None


def test_referenced_covers_skips_a_cover_file_outside_covers() -> None:
    builder = LibraryBuilder()
    builder.book(cover_file="covers/dune.jpg")
    builder.book(cover_file="covers/../library.json")
    builder.book(cover_file=None)

    assert referenced_covers(builder.build()) == {"dune.jpg"}
