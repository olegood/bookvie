"""``domain.ordering``: the server's title ordering key (ARCHITECTURE-SPINE "Title ordering")."""

import pytest

from bookvie.domain import title_key


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Émile", "emile"),
        ("Émile", "Emile"),
        ("STRASSE", "straße"),
        ("Ångström", "angstrom"),
        ("ﬁre", "fire"),  # NFKD folds the ligature
    ],
)
def test_title_key_ignores_diacritics_case_and_compatibility_forms(a: str, b: str) -> None:
    assert title_key(a) == title_key(b)


def test_title_key_orders_accented_titles_with_their_base_letters() -> None:
    titles = ["Zola", "Émile", "Austerlitz", "beloved"]
    assert sorted(titles, key=title_key) == ["Austerlitz", "beloved", "Émile", "Zola"]


def test_title_key_keeps_distinct_titles_distinct() -> None:
    assert title_key("Emma") != title_key("Emile")
