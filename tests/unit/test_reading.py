import pytest

from bookvie.domain.errors import DomainError
from bookvie.domain.status import Status


@pytest.mark.smoke
def test_new_reading_starts_empty(reading, sequence, book):
    # EXPECT a new reading starts with default empty state
    assert reading.status is Status.NEW
    assert reading.sequence_id == sequence.id
    assert reading.progress(book).pages_read == 0


def test_recording_pages_starts_the_reading(reading, book):
    # WHEN recording pages in a new reading
    reading.record(42, book)

    # THEN the reading transitions to in progress and sets started_at
    assert reading.status is Status.IN_PROGRESS
    assert reading.started_at is not None


def test_reaching_the_last_page_finishes_it(reading, book):
    # WHEN recording up to the total pages
    reading.record(book.total_pages, book)

    # THEN the reading finishes and sets finished_at
    assert reading.status is Status.FINISHED
    assert reading.finished_at is not None


def test_finished_reading_is_frozen(reading, book):
    # GIVEN a reading that reached completion
    reading.record(book.total_pages, book)

    # EXPECT recording additional pages on a finished reading to fail
    with pytest.raises(DomainError, match="cannot record pages on a Finished reading"):
        reading.record(5, book)


def test_abandoned_reading_can_be_resumed(reading, book):
    # GIVEN an abandoned reading
    reading.record(50, book)
    reading.abandon()
    assert reading.status is Status.ABANDONED

    # WHEN resuming the reading
    reading.resume()

    # THEN the reading transitions back to in progress
    assert reading.status is Status.IN_PROGRESS


def test_finished_is_terminal(reading, book):
    # GIVEN a finished reading
    reading.record(book.total_pages, book)

    # EXPECT finished status to be terminal and cannot be abandoned
    with pytest.raises(DomainError):
        reading.abandon()


def test_a_reading_rejects_a_foreign_book(reading):
    # GIVEN a different book instance
    from bookvie.domain.models import Book
    another_book = Book(title="Another Book", total_pages=40)

    # EXPECT recording progress for a foreign book to fail
    with pytest.raises(DomainError, match="reading record does not belong to this book"):
        reading.record(5, another_book)
