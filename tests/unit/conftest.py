import pytest

from bookvie.domain.models import Book, ReadingSequence


@pytest.fixture
def book():
    """A book with required attributes"""
    return Book(title="Python Testing with pytest", total_pages=248)


@pytest.fixture
def sequence():
    """A reading sequence with required attributes"""
    return ReadingSequence(name="Autumn Python Reading")
