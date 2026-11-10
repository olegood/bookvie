"""The Card note Page parser (FR-17, AD-18): every accepted form and every refusal."""

import pytest

from bookvie.domain import (
    ONE_RANGE_MESSAGE,
    PAGE_REQUIRED_MESSAGE,
    REVERSED_RANGE_MESSAGE,
    page_range_message,
    parse_note_pages,
)

PAGES = 330
OUT_OF_RANGE = page_range_message(PAGES)


def test_out_of_range_message_names_the_page_count() -> None:
    assert OUT_OF_RANGE == "Page must be between 1 and 330."


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("42", (42, None)),
        ("p.42", (42, None)),
        ("p. 42", (42, None)),
        ("p42", (42, None)),
        ("pp.42", (42, None)),
        ("42–42", (42, None)),
        ("42-42", (42, None)),
        ("  42  ", (42, None)),
        ("1", (1, None)),
        ("330", (330, None)),
        ("42–45", (42, 45)),
        ("42-45", (42, 45)),
        ("42 – 45", (42, 45)),
        ("42 - 45", (42, 45)),
        ("pp. 42–45", (42, 45)),
        ("pp.42-45", (42, 45)),
        ("pp 42 – 45", (42, 45)),
        ("p.42–45", (42, 45)),
        ("1–330", (1, 330)),
        ("042", (42, None)),
    ],
)
def test_parse_note_pages_accepts_one_page_or_one_range(
    raw: str, expected: tuple[int, int | None]
) -> None:
    assert parse_note_pages(raw, PAGES) == expected


@pytest.mark.parametrize(
    ("raw", "message"),
    [
        ("", PAGE_REQUIRED_MESSAGE),
        ("   ", PAGE_REQUIRED_MESSAGE),
        ("\t\n", PAGE_REQUIRED_MESSAGE),
        ("abc", ONE_RANGE_MESSAGE),
        ("p.", ONE_RANGE_MESSAGE),
        ("pp.", ONE_RANGE_MESSAGE),
        ("42 to", ONE_RANGE_MESSAGE),
        ("42 to 45", ONE_RANGE_MESSAGE),
        ("42–45, 50–52", ONE_RANGE_MESSAGE),
        ("42, 50", ONE_RANGE_MESSAGE),
        ("42–", ONE_RANGE_MESSAGE),
        ("–42", ONE_RANGE_MESSAGE),
        ("42–45–50", ONE_RANGE_MESSAGE),
        ("-5", ONE_RANGE_MESSAGE),
        ("4.2", ONE_RANGE_MESSAGE),
        ("ppp.42", ONE_RANGE_MESSAGE),
        ("page 42", ONE_RANGE_MESSAGE),
        ("٤٢", ONE_RANGE_MESSAGE),
        ("0", OUT_OF_RANGE),
        ("331", OUT_OF_RANGE),
        ("42–400", OUT_OF_RANGE),
        ("0–42", OUT_OF_RANGE),
        # Out of range is checked before reversed.
        ("400–42", OUT_OF_RANGE),
        ("45–42", REVERSED_RANGE_MESSAGE),
        ("pp. 45 - 42", REVERSED_RANGE_MESSAGE),
    ],
)
def test_parse_note_pages_refuses_with_the_message(raw: str, message: str) -> None:
    assert parse_note_pages(raw, PAGES) == message
