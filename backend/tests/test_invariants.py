"""Every AD-18 rule has a failing and a passing case."""

import pytest

from bookvie.domain import InvariantViolation, check_invariants
from tests.builder import LibraryBuilder


def _fails(builder: LibraryBuilder, rule: str) -> None:
    with pytest.raises(InvariantViolation) as exc:
        check_invariants(builder.build())
    assert exc.value.rule == rule
    assert exc.value.message == str(exc.value)


def _passes(builder: LibraryBuilder) -> None:
    check_invariants(builder.build())


def test_empty_library_passes(library_builder: LibraryBuilder) -> None:
    _passes(library_builder)


# --- every pointer references an existing Book ----------------------------


@pytest.mark.parametrize("pointer", ["main", "up_next", "side_read"])
def test_dangling_pointer_fails(library_builder: LibraryBuilder, pointer: str) -> None:
    library_builder.book()
    getattr(library_builder, pointer)("no-such-book")
    _fails(library_builder, "pointer_exists")


@pytest.mark.parametrize("pointer", ["main", "up_next", "side_read"])
def test_existing_pointer_passes(library_builder: LibraryBuilder, pointer: str) -> None:
    book = library_builder.book()
    library_builder.reading(book)
    getattr(library_builder, pointer)(book)
    _passes(library_builder)


# --- the Main book is neither Up next nor a Side read ---------------------


def test_main_as_up_next_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book)
    library_builder.main(book).up_next(book)
    _fails(library_builder, "main_not_up_next")


def test_main_as_side_read_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book)
    library_builder.main(book).side_read(book)
    _fails(library_builder, "main_not_side_read")


def test_main_up_next_and_side_read_on_different_books_pass(
    library_builder: LibraryBuilder,
) -> None:
    main, up_next, side = (library_builder.book() for _ in range(3))
    library_builder.reading(main)
    library_builder.main(main).up_next(up_next).side_read(side)
    _passes(library_builder)


# --- no Book is a Side read twice ----------------------------------------


def test_repeated_side_read_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.side_read(book).side_read(book)
    _fails(library_builder, "unique_side_reads")


def test_four_copies_of_one_side_read_report_the_repeat(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    for _ in range(4):
        library_builder.side_read(book)
    _fails(library_builder, "unique_side_reads")


def test_side_read_that_is_also_up_next_passes(library_builder: LibraryBuilder) -> None:
    """Epic 4 allows it: the Book shows in On the side and in Up next."""
    book = library_builder.book()
    library_builder.up_next(book).side_read(book)
    _passes(library_builder)


# --- at most 3 Side reads ---------------------------------------------------


def test_four_side_reads_fail(library_builder: LibraryBuilder) -> None:
    for _ in range(4):
        library_builder.side_read(library_builder.book())
    _fails(library_builder, "side_reads_max")


def test_three_side_reads_pass(library_builder: LibraryBuilder) -> None:
    for _ in range(3):
        library_builder.side_read(library_builder.book())
    _passes(library_builder)


# --- a Book has at most one unfinished Reading ----------------------------


def test_two_unfinished_readings_fail(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book)
    library_builder.reading(book)
    _fails(library_builder, "one_unfinished_reading")


def test_finished_readings_plus_one_unfinished_pass(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book, finish_date="2025-05-01", finished_pages=300)
    library_builder.reading(book, start_date=None, finish_date="2025-01-01", finished_pages=280)
    library_builder.reading(book)
    _passes(library_builder)


# --- the Main book has an unfinished Reading ------------------------------


def test_main_without_unfinished_reading_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book, finish_date="2025-05-01", finished_pages=300)
    library_builder.main(book)
    _fails(library_builder, "main_has_unfinished_reading")


def test_main_with_unfinished_reading_passes(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book, current_page=12)
    library_builder.main(book)
    _passes(library_builder)


# --- unfinished Reading pages within the page count -----------------------


@pytest.mark.parametrize("page", [-1, 301])
def test_unfinished_reading_page_out_of_range_fails(
    library_builder: LibraryBuilder, page: int
) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(book, current_page=page)
    _fails(library_builder, "reading_page_in_range")


@pytest.mark.parametrize("page", [0, 300])
def test_unfinished_reading_page_at_bounds_passes(
    library_builder: LibraryBuilder, page: int
) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(book, current_page=page)
    _passes(library_builder)


# --- resume segments: a Reading with a start date; each starts at a new page --------


def _seg(start: int, end: int) -> dict[str, int]:
    return {"startPage": start, "endPage": end}


def test_segments_without_a_start_date_fail(library_builder: LibraryBuilder) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(
        book,
        start_date=None,
        start_page=100,
        earlier_segments=[_seg(0, 20)],
        current_page=300,
        finish_date="2025-05-01",
        finished_pages=300,
    )
    _fails(library_builder, "reading_segments_need_start_date")


def test_no_segments_without_a_start_date_pass(library_builder: LibraryBuilder) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(
        book, start_date=None, current_page=300, finish_date="2025-05-01", finished_pages=300
    )
    _passes(library_builder)


@pytest.mark.parametrize(
    ("segments", "start_page"),
    [
        pytest.param([_seg(0, 20)], 20, id="ends-on-the-reading-s-start"),
        pytest.param([_seg(0, 20), _seg(20, 50)], 100, id="ends-on-the-next-segment-s-start"),
        pytest.param([_seg(0, 20), _seg(30, 30), _seg(30, 40)], 100, id="a-later-pair"),
    ],
)
def test_a_segment_starting_where_the_one_before_ended_fails(
    library_builder: LibraryBuilder, segments: list[dict[str, int]], start_page: int
) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(
        book, start_page=start_page, earlier_segments=segments, current_page=start_page
    )
    _fails(library_builder, "reading_segment_starts_at_new_page")


@pytest.mark.parametrize(
    ("segments", "start_page"),
    [
        pytest.param([_seg(0, 20)], 300, id="skip-ahead"),
        pytest.param([_seg(300, 300)], 30, id="skip-back"),
        pytest.param([_seg(0, 20), _seg(10, 50), _seg(60, 40)], 100, id="lowered-in-a-segment"),
    ],
)
def test_segments_each_starting_at_a_new_page_pass(
    library_builder: LibraryBuilder, segments: list[dict[str, int]], start_page: int
) -> None:
    book = library_builder.book(pages=300)
    library_builder.reading(
        book, start_page=start_page, earlier_segments=segments, current_page=start_page
    )
    _passes(library_builder)


def test_segment_pages_above_the_book_s_pages_pass(library_builder: LibraryBuilder) -> None:
    """Pages can be edited below a finished Reading's segments, as below its startPage."""
    book = library_builder.book(pages=100)
    library_builder.reading(
        book,
        start_page=300,
        earlier_segments=[_seg(0, 250)],
        current_page=330,
        finish_date="2025-05-01",
        finished_pages=330,
    )
    _passes(library_builder)


def test_finished_reading_keeps_its_page_after_pages_drop(
    library_builder: LibraryBuilder,
) -> None:
    """Finished Readings keep the page count they finished with (FR-1)."""
    book = library_builder.book(pages=200)
    library_builder.reading(book, current_page=300, finish_date="2025-05-01", finished_pages=300)
    _passes(library_builder)


# --- card-note pages within the page count --------------------------------


@pytest.mark.parametrize(
    ("start", "end"),
    [(0, None), (301, None), (5, 4), (299, 301), (-3, 2)],
)
def test_card_note_pages_out_of_range_fail(
    library_builder: LibraryBuilder, start: int, end: int | None
) -> None:
    book = library_builder.book(pages=300)
    library_builder.card_note(book, page_start=start, page_end=end)
    _fails(library_builder, "card_note_pages_in_range")


@pytest.mark.parametrize(("start", "end"), [(1, None), (300, None), (4, 5), (1, 300)])
def test_card_note_pages_in_range_pass(
    library_builder: LibraryBuilder, start: int, end: int | None
) -> None:
    book = library_builder.book(pages=300)
    library_builder.card_note(book, page_start=start, page_end=end)
    _passes(library_builder)


def test_card_note_page_end_equal_to_its_start_fails(library_builder: LibraryBuilder) -> None:
    """One page is stored with ``pageEnd`` null; no intent stores "5–5" as 5 to 5."""
    book = library_builder.book(pages=300)
    library_builder.card_note(book, page_start=5, page_end=5)
    _fails(library_builder, "card_note_page_end_after_start")


# --- a Book's language and tags are non-blank and trimmed ------------------


@pytest.mark.parametrize("language", ["", "   ", "\n\t "])
def test_blank_language_fails(library_builder: LibraryBuilder, language: str) -> None:
    library_builder.book(language=language)
    _fails(library_builder, "book_language_required")


@pytest.mark.parametrize("language", [" English", "English ", "English\n", "\u00a0English"])
def test_untrimmed_language_fails(library_builder: LibraryBuilder, language: str) -> None:
    library_builder.book(language=language)
    _fails(library_builder, "book_language_trimmed")


@pytest.mark.parametrize("tag", ["", "   ", "\t"])
def test_blank_tag_fails(library_builder: LibraryBuilder, tag: str) -> None:
    library_builder.book(tags=["novel", tag])
    _fails(library_builder, "book_tag_required")


@pytest.mark.parametrize("tag", [" novel", "novel ", "novel\n", "\u00a0novel"])
def test_untrimmed_tag_fails(library_builder: LibraryBuilder, tag: str) -> None:
    library_builder.book(tags=[tag])
    _fails(library_builder, "book_tag_trimmed")


@pytest.mark.parametrize(
    ("language", "tags"),
    [
        ("English", []),
        ("Brazilian Portuguese", ["science fiction", "to read"]),
        ("de", ["Klassiker"]),
    ],
)
def test_trimmed_language_and_tags_pass(
    library_builder: LibraryBuilder, language: str, tags: list[str]
) -> None:
    """Inner spaces are kept, as the intents keep them; a Book may have no tags."""
    library_builder.book(language=language, tags=tags)
    _passes(library_builder)


# --- a Book's title, authors, publisher, tags and coverFile -----------------
# (the deferred-work entries from Story 2.2's and item 60's reviews)


@pytest.mark.parametrize("title", ["", " ", "\n\t "])
def test_blank_title_fails(library_builder: LibraryBuilder, title: str) -> None:
    library_builder.book(title=title)
    _fails(library_builder, "book_title_required")


@pytest.mark.parametrize("title", [" Dune", "Dune ", "Dune\n", "\u00a0Dune"])
def test_untrimmed_title_fails(library_builder: LibraryBuilder, title: str) -> None:
    library_builder.book(title=title)
    _fails(library_builder, "book_title_trimmed")


def test_no_authors_fails(library_builder: LibraryBuilder) -> None:
    library_builder.book(authors=[])
    _fails(library_builder, "book_authors_required")


@pytest.mark.parametrize("author", ["", " ", "\t"])
def test_blank_author_fails(library_builder: LibraryBuilder, author: str) -> None:
    library_builder.book(authors=["A", author])
    _fails(library_builder, "book_author_required")


@pytest.mark.parametrize("author", [" A", "A ", "A\n", "\u00a0A"])
def test_untrimmed_author_fails(library_builder: LibraryBuilder, author: str) -> None:
    library_builder.book(authors=[author])
    _fails(library_builder, "book_author_trimmed")


@pytest.mark.parametrize("author", ["A; B", "A;B", "A;"])
def test_author_with_a_semicolon_fails(library_builder: LibraryBuilder, author: str) -> None:
    """The Edit form joins authors with "; ", so such an author splits on the next edit."""
    library_builder.book(authors=[author])
    _fails(library_builder, "book_author_no_semicolon")


@pytest.mark.parametrize("publisher", ["", " ", "\n"])
def test_blank_publisher_fails(library_builder: LibraryBuilder, publisher: str) -> None:
    library_builder.book(publisher=publisher)
    _fails(library_builder, "book_publisher_required")


@pytest.mark.parametrize("publisher", [" Ace", "Ace ", "Ace\n", "\u00a0Ace"])
def test_untrimmed_publisher_fails(library_builder: LibraryBuilder, publisher: str) -> None:
    library_builder.book(publisher=publisher)
    _fails(library_builder, "book_publisher_trimmed")


@pytest.mark.parametrize("tag", ["a,b", "a, b", "novel,"])
def test_tag_with_a_comma_fails(library_builder: LibraryBuilder, tag: str) -> None:
    """The Edit form joins tags with ", ", so such a tag splits on the next edit."""
    library_builder.book(tags=[tag])
    _fails(library_builder, "book_tag_no_comma")


@pytest.mark.parametrize(
    "tags", [["novel", "novel"], ["Novel", "novel"], ["to read", "TO READ"], ["Straße", "STRASSE"]]
)
def test_a_tag_repeated_ignoring_case_fails(
    library_builder: LibraryBuilder, tags: list[str]
) -> None:
    """merge_tags compares with casefold(), so such tags show twice on Book detail."""
    library_builder.book(tags=tags)
    _fails(library_builder, "book_tags_unique")


@pytest.mark.parametrize(
    "cover_file",
    [
        "elsewhere/x.jpg",
        "covers/",
        "covers/a/b.jpg",
        "covers/..",
        "covers/.",
        "covers/a\\b.jpg",
        "covers/../library.json",
        "covers/a\0.jpg",
        "",
        "/covers/x.jpg",
    ],
)
def test_cover_file_outside_covers_fails(library_builder: LibraryBuilder, cover_file: str) -> None:
    library_builder.book(cover_file=cover_file)
    _fails(library_builder, "book_cover_file_in_covers")


@pytest.mark.parametrize(
    "cover_file", [None, "covers/b-0f0e0d0c-0b0a-4908-8706-050403020100.jpg", "covers/x.png"]
)
def test_cover_file_in_covers_passes(
    library_builder: LibraryBuilder, cover_file: str | None
) -> None:
    library_builder.book(cover_file=cover_file)
    _passes(library_builder)


def test_inner_spaces_in_title_authors_publisher_and_tags_pass(
    library_builder: LibraryBuilder,
) -> None:
    """Inner whitespace is kept, as the intents keep it: str.strip() trims only the ends."""
    library_builder.book(
        title="The Left Hand of Darkness",
        authors=["Ursula K. Le Guin", "Second Author"],
        publisher="Ace Books",
        tags=["science fiction", "to read"],
    )
    library_builder.book(
        title="Dune\nMessiah", publisher="Ace\u00a0Books", authors=["Le\u00a0Guin"]
    )
    _passes(library_builder)


# --- card-note text is non-blank and trimmed -------------------------------


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_blank_card_note_text_fails(library_builder: LibraryBuilder, text: str) -> None:
    book = library_builder.book()
    library_builder.card_note(book, text=text)
    _fails(library_builder, "card_note_text_required")


@pytest.mark.parametrize("text", [" A note", "A note ", "A note\n", "\u00a0A note"])
def test_untrimmed_card_note_text_fails(library_builder: LibraryBuilder, text: str) -> None:
    book = library_builder.book()
    library_builder.card_note(book, text=text)
    _fails(library_builder, "card_note_text_trimmed")


@pytest.mark.parametrize("text", ["A", "Line one\n\n  Line two", "Fear is the mind-killer."])
def test_trimmed_card_note_text_passes(library_builder: LibraryBuilder, text: str) -> None:
    """Inner whitespace and newlines are kept, as the intents keep them."""
    book = library_builder.book()
    library_builder.card_note(book, text=text)
    _passes(library_builder)


# --- ids are unique --------------------------------------------------------


def test_repeated_book_id_fails(library_builder: LibraryBuilder) -> None:
    library_builder.book(id="same")
    library_builder.book(id="same")
    _fails(library_builder, "unique_book_ids")


def test_repeated_reading_id_in_a_book_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.reading(book, id="r", finish_date="2026-01-02", current_page=300)
    library_builder.reading(book, id="r")
    _fails(library_builder, "unique_reading_ids")


def test_repeated_card_note_id_in_a_book_fails(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.card_note(book, id="n")
    library_builder.card_note(book, id="n")
    _fails(library_builder, "unique_card_note_ids")


def test_same_reading_ids_in_different_books_pass(library_builder: LibraryBuilder) -> None:
    for _ in range(2):
        book = library_builder.book()
        library_builder.reading(book, id="r")
    _passes(library_builder)


def test_repeated_card_note_id_across_books_fails(library_builder: LibraryBuilder) -> None:
    """Card note ids are unique in the library: the unscoped Card notes page keys Edit by them."""
    for _ in range(2):
        book = library_builder.book()
        library_builder.card_note(book, id="n")
    _fails(library_builder, "unique_card_note_ids")


def test_distinct_ids_pass(library_builder: LibraryBuilder) -> None:
    book = library_builder.book()
    library_builder.book()
    library_builder.reading(book, finish_date="2026-01-02", current_page=300)
    library_builder.reading(book)
    library_builder.card_note(book)
    library_builder.card_note(book)
    _passes(library_builder)
