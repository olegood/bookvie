import re

import pytest

from bookvie.domain.errors import DomainError
from bookvie.domain.models import Progress


@pytest.mark.smoke
def test_default_attributes():
    progress = Progress()

    assert progress.pages_read == 0
    assert progress.total_pages == 0
    assert progress.percent == 0.0


def test_incorrect_pages_read():
    with pytest.raises(DomainError, match="page counts cannot be negative"):
        Progress(pages_read=-42)


def test_incorrect_total_pages():
    with pytest.raises(DomainError, match="page counts cannot be negative"):
        Progress(total_pages=-42)


def test_pages_read_greater_than_total_pages(pages_read=10, total_pages=5):
    error_message = re.escape(f"pages read ({pages_read}) exceeds total ({total_pages})")
    with pytest.raises(DomainError, match=error_message):
        Progress(pages_read, total_pages)


def test_percent():
    progress = Progress(pages_read=5, total_pages=10)
    assert progress.percent == 50.0


def test_pages_left():
    progress = Progress(pages_read=20, total_pages=100)
    assert progress.pages_left == 80


def test_is_complete_actively_reading():
    progress = Progress(pages_read=25, total_pages=100)
    assert not progress.is_complete


def test_is_complete():
    progress = Progress(pages_read=100, total_pages=100)
    assert progress.is_complete


def test_addition():
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    progress_total = progress_one + progress_two

    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_radd():
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    progress_total = sum([progress_one, progress_two])

    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_string_value():
    progress = Progress(pages_read=50, total_pages=100)
    assert str(progress) == "50/100 pages (50.0%)"
