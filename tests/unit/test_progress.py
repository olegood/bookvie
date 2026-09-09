import re

import pytest

from bookvie.domain.errors import DomainError
from bookvie.domain.models import Progress


@pytest.mark.smoke
def test_default_attributes():
    # WHEN initializing default progress
    progress = Progress()

    # THEN progress starts at zero
    assert progress.pages_read == 0
    assert progress.total_pages == 0
    assert progress.percent == 0.0


def test_incorrect_pages_read():
    # EXPECT negative pages read to raise DomainError
    with pytest.raises(DomainError, match="page counts cannot be negative"):
        Progress(pages_read=-42)


def test_incorrect_total_pages():
    # EXPECT negative total pages to raise DomainError
    with pytest.raises(DomainError, match="page counts cannot be negative"):
        Progress(total_pages=-42)


def test_pages_read_greater_than_total_pages(pages_read=10, total_pages=5):
    # EXPECT pages read exceeding total pages to raise DomainError
    error_message = re.escape(f"pages read ({pages_read}) exceeds total ({total_pages})")
    with pytest.raises(DomainError, match=error_message):
        Progress(pages_read, total_pages)


def test_percent():
    # WHEN progress has partial completion
    progress = Progress(pages_read=5, total_pages=10)

    # THEN percent reflects the completion ratio
    assert progress.percent == 50.0


def test_pages_left():
    # WHEN progress has remaining pages
    progress = Progress(pages_read=20, total_pages=100)

    # THEN pages_left calculates remaining difference
    assert progress.pages_left == 80


def test_is_complete_actively_reading():
    # EXPECT incomplete progress when pages read is less than total
    progress = Progress(pages_read=25, total_pages=100)
    assert not progress.is_complete


def test_is_complete():
    # EXPECT complete progress when pages read equals total
    progress = Progress(pages_read=100, total_pages=100)
    assert progress.is_complete


def test_addition():
    # GIVEN two progress instances
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    # WHEN adding two progress instances
    progress_total = progress_one + progress_two

    # THEN combined progress sums pages and calculates percentage
    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_radd():
    # GIVEN two progress instances
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    # WHEN summing progress instances with sum()
    progress_total = sum([progress_one, progress_two])

    # THEN combined progress sums pages and calculates percentage
    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_string_value():
    # WHEN formatting progress as string
    progress = Progress(pages_read=50, total_pages=100)

    # THEN formatted representation includes count and percentage
    assert str(progress) == "50/100 pages (50.0%)"
