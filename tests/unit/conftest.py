import pytest

from bookvie.domain.models import Book


@pytest.fixture
def book():
    """A book with required attributes"""
    return Book(title="Python Testing with pytest", total_pages=248)
