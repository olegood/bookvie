import pytest

from bookvie.domain.models import Book


def test_book_defaults():
    # WHEN create a book with required attributes
    book = Book(title="Python Testing with pytest", total_pages=248)

    # THEN the book has the expected attributes
    assert book.title == "Python Testing with pytest"
    assert book.total_pages == 248
    assert book.subtitle is None
    assert book.authors == ()
    assert book.isbn is None
    assert book.year is None


def test_book_id():
    # WHEN create a book with required attributes
    book = Book(title="Python Testing with pytest", total_pages=248)

    # THEN id
    assert book.id is not None


def test_book_display_name():
    # WHEN create a book with required attributes
    book = Book(title="The Great Gatsby", subtitle="A Novel", total_pages=100)

    # THEN display title has subtitle
    assert book.display_title == "The Great Gatsby: A Novel"


def test_book_has_no_title():
    # EXPECT a book needs a title
    with pytest.raises(ValueError, match="book title cannot be empty"):
        Book(title="   ", total_pages=10)


def test_book_has_no_pages():
    # EXPECT a book needs at least one page
    with pytest.raises(ValueError, match="a book needs at least one page"):
        Book(title="Python Testing with pytest", total_pages=0)


def test_book_with_one_author():
    # WHEN create a book with one author
    book = Book(title="Python Testing with pytest", total_pages=248, authors=("Brian Okken",))

    # THEN authors are a tuple
    assert book.authors == ("Brian Okken",)


def test_book_with_multiple_authors():
    # WHEN create a book with authors
    book = Book(title="Learning LangChain", total_pages=268, authors=("Mayo Oshin", "Nuno Campos"))

    # THEN authors are a tuple
    assert book.authors == ("Mayo Oshin", "Nuno Campos")
