"""The intent model base every intent shares (Epic 1 retro item 4)."""

import pytest
from pydantic import ValidationError

from bookvie.intents.intent_model import IntentModel


class _Sample(IntentModel):
    nullable = frozenset({"color"})

    book_id: str
    note: str | None = None
    color: str | None


def test_camel_case_keys_and_omitted_defaults() -> None:
    intent = _Sample.model_validate({"bookId": "b1", "color": None})
    assert intent.book_id == "b1"
    assert intent.note is None
    assert intent.color is None


def test_explicit_null_is_refused_unless_nullable() -> None:
    with pytest.raises(ValidationError):
        _Sample.model_validate({"bookId": "b1", "note": None, "color": None})


def test_nullable_field_is_still_required() -> None:
    with pytest.raises(ValidationError):
        _Sample.model_validate({"bookId": "b1"})


@pytest.mark.parametrize(
    "doc",
    [
        {"bookId": "b1", "color": None, "extra": "x"},
        {"book_id": "b1", "color": None},
        {"bookId": 1, "color": None},
    ],
)
def test_unknown_snake_case_and_loose_values_are_refused(doc: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        _Sample.model_validate(doc)
