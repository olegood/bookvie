import pytest

from bookvie.domain.models import Book, ReadingSequence, Reading


@pytest.fixture
def book():
    """A book with required attributes"""
    return Book(title="Python Testing with pytest", total_pages=248)


@pytest.fixture
def sequence():
    """A reading sequence with required attributes"""
    return ReadingSequence(name="Autumn Python Reading")


@pytest.fixture
def reading(book, sequence):
    """A reading always belongs to a (book, sequence) pair."""
    return Reading(book_id=book.id, sequence_id=sequence.id)
