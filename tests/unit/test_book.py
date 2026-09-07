import pytest

from bookvie.domain.errors import DomainError
from bookvie.domain.models import Book


def test_book_defaults(book):
    # EXPECT the book has the expected attributes
    assert book.title == "Python Testing with pytest"
    assert book.total_pages == 248
    assert book.subtitle is None
    assert book.authors == ()
    assert book.isbn is None
    assert book.year is None


def test_book_id(book):
    # EXPECT the book always has an id
    assert book.id is not None


def test_book_display_name(book):
    # WHEN book has subtitle
    book.subtitle = "Simple, Rapid, Effective, and Scalable"

    # THEN display title has subtitle
    assert book.display_title == "Python Testing with pytest: Simple, Rapid, Effective, and Scalable"


def test_book_has_no_title():
    # EXPECT a book needs a title
    with pytest.raises(DomainError, match="book title cannot be empty"):
        Book(title="   ", total_pages=10)


def test_book_has_no_pages():
    # EXPECT a book needs at least one page
    with pytest.raises(DomainError, match="a book needs at least one page"):
        Book(title="Python Testing with pytest", total_pages=0)


def test_book_with_one_author(book):
    # WHEN book has one author
    book.authors = ("Brian Okken",)

    # THEN authors are a tuple
    assert book.authors == ("Brian Okken",)


def test_book_with_multiple_authors():
    # WHEN book has multiple authors
    book = Book(title="Learning LangChain", total_pages=268, authors=("Mayo Oshin", "Nuno Campos"))

    # THEN authors are a tuple
    assert book.authors == ("Mayo Oshin", "Nuno Campos")
