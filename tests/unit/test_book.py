import pytest

from bookvie.domain.errors import DomainError
from bookvie.domain.models import Book


def test_default_attributes(book):
    # EXPECT the book has the expected attributes
    assert book.title == "Python Testing with pytest"
    assert book.total_pages == 248
    assert book.subtitle is None
    assert book.authors == ()
    assert book.isbn is None
    assert book.year is None


def test_book_always_has_id(book):
    # EXPECT the book always has an id
    assert book.id is not None


def test_display_name(book):
    # WHEN book has subtitle
    book.subtitle = "Simple, Rapid, Effective, and Scalable"

    # THEN display title has subtitle with a colon
    assert book.display_title == "Python Testing with pytest: Simple, Rapid, Effective, and Scalable"


@pytest.mark.parametrize("bad_title", ["", "   ", "\n ", "\t  \n"])
def test_title_cannot_be_empty(bad_title):
    # EXPECT a book needs a correct title
    with pytest.raises(DomainError, match="book title cannot be empty"):
        Book(title=bad_title, total_pages=10)


@pytest.mark.parametrize("bad_total_pages", [-42, 0])
def test_book_needs_at_least_one_page(bad_total_pages):
    # EXPECT a book needs at least one page
    with pytest.raises(DomainError, match="a book needs at least one page"):
        Book(title="Python Testing with pytest", total_pages=bad_total_pages)


def test_book_has_one_author(book):
    # WHEN book has one author
    book.authors = ("Brian Okken",)

    # THEN authors is a tuple of one name
    assert book.authors == ("Brian Okken",)


def test_book_has_multiple_authors(book):
    # WHEN book has multiple authors
    book.title = "Learning LandChain"
    book.authors = ("Mayo Oshin", "Nuno Campos")

    # THEN authors is a tuple of two names
    assert book.authors == ("Mayo Oshin", "Nuno Campos")
