"""``parse_book_fields``'s extra Finished on rule (edit mode)."""

from datetime import date

import pytest

from bookvie.domain.book_fields import BookFields, parse_book_fields

TODAY = date(2026, 11, 3)
FORM = {
    "title": "Dune",
    "pages": "412",
    "authors": "Frank Herbert",
    "language": "English",
    "publisher": "Ace",
    "type": "paperback",
}


def test_rule_gets_the_parsed_date_once_and_its_message_is_the_failure() -> None:
    calls: list[date | None] = []

    def rule(finished_on: date | None) -> str | None:
        calls.append(finished_on)
        return "Nope."

    result = parse_book_fields({**FORM, "finishedOn": "2026-10-01"}, TODAY, rule)
    assert calls == [date(2026, 10, 1)]
    assert result == [("finishedOn", "Nope.")]


def test_rule_gets_none_for_an_empty_date_and_may_accept() -> None:
    calls: list[date | None] = []

    def rule(finished_on: date | None) -> str | None:
        calls.append(finished_on)
        return None

    result = parse_book_fields({**FORM, "finishedOn": "  "}, TODAY, rule)
    assert calls == [None]
    assert isinstance(result, BookFields)


@pytest.mark.parametrize("raw", ["not a date", "2026-12-01"])
def test_rule_is_not_called_for_a_malformed_or_future_date(raw: str) -> None:
    def rule(finished_on: date | None) -> str | None:
        raise AssertionError("must not be called")

    result = parse_book_fields({**FORM, "finishedOn": raw}, TODAY, rule)
    assert isinstance(result, list)
    assert [key for key, _ in result] == ["finishedOn"]
