import re

import pytest

from bookvie.domain.models import Progress


def test_progress_creation():
    progress = Progress()

    assert progress.pages_read == 0
    assert progress.total_pages == 0
    assert progress.percent == 0.0


def test_progress_incorrect_pages_read():
    with pytest.raises(ValueError, match="page counts cannot be negative"):
        Progress(pages_read=-1)


def test_progress_incorrect_total_pages():
    with pytest.raises(ValueError, match="page counts cannot be negative"):
        Progress(total_pages=-1)


def test_progress_pages_read_greater_than_total_pages():
    with pytest.raises(ValueError, match=re.escape("pages read (10) exceeds total (5)")):
        Progress(pages_read=10, total_pages=5)


def test_progress_percent():
    progress = Progress(pages_read=5, total_pages=10)
    assert progress.percent == 50.0


def test_progress_pages_left():
    progress = Progress(pages_read=20, total_pages=100)
    assert progress.pages_left == 80


def test_progress_is_complete_actively_reading():
    progress = Progress(pages_read=25, total_pages=100)
    assert not progress.is_complete


def test_progress_is_complete():
    progress = Progress(pages_read=100, total_pages=100)
    assert progress.is_complete


def test_progress_addition():
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    progress_total = progress_one + progress_two

    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_progress_radd():
    progress_one = Progress(pages_read=50, total_pages=100)
    progress_two = Progress(pages_read=75, total_pages=100)

    progress_total = sum([progress_one, progress_two])

    assert progress_total.pages_read == 125
    assert progress_total.total_pages == 200
    assert progress_total.percent == 62.5


def test_progress_string_value():
    progress = Progress(pages_read=50, total_pages=100)
    assert str(progress) == "50/100 pages (50.0%)"
