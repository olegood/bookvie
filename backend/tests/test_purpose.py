"""``domain.purpose``: the one Purpose trim rule (FR-9)."""

import pytest

from bookvie.domain import normalize_purpose


@pytest.mark.parametrize(
    ("sent", "stored"),
    [
        ("x", "x"),
        ("  x  ", "x"),
        ("\tTo see how Le Guin builds a world\n", "To see how Le Guin builds a world"),
        ("  two  words  ", "two  words"),
        ("", None),
        ("   ", None),
        ("\n\t ", None),
        (None, None),
    ],
)
def test_normalize_purpose_trims_and_empties_to_none(sent: str | None, stored: str | None) -> None:
    assert normalize_purpose(sent) == stored
