"""The AD-18 invariants, checked before every commit.

:func:`check_invariants` raises :class:`InvariantViolation` for the first rule
the library breaks. ``rule`` is a stable identifier for tests and logs;
``message`` names the offending Book, or the repeated id.
"""

from .cover_file import cover_name
from .model import Library

MAX_SIDE_READS = 3


class InvariantViolation(Exception):
    def __init__(self, rule: str, message: str) -> None:
        super().__init__(message)
        self.rule = rule
        self.message = message


def _first_repeat(ids: list[str]) -> str | None:
    seen: set[str] = set()
    for item in ids:
        if item in seen:
            return item
        seen.add(item)
    return None


def check_invariants(library: Library) -> None:
    repeated = _first_repeat([book.id for book in library.books])
    if repeated is not None:
        raise InvariantViolation("unique_book_ids", f"Book id {repeated} is used more than once")
    for book in library.books:
        repeated = _first_repeat([reading.id for reading in book.readings])
        if repeated is not None:
            raise InvariantViolation(
                "unique_reading_ids",
                f"Book {book.id} has Reading id {repeated} more than once",
            )
    # Library-wide, not per Book: the unscoped Card notes page keys each Edit by note id.
    repeated = _first_repeat([note.id for book in library.books for note in book.card_notes])
    if repeated is not None:
        raise InvariantViolation(
            "unique_card_note_ids", f"Card note id {repeated} is used more than once"
        )

    ids = {book.id for book in library.books}

    pointers = [("mainBookId", library.main_book_id), ("upNextBookId", library.up_next_book_id)]
    pointers += [("sideReadBookIds", book_id) for book_id in library.side_read_book_ids]
    for name, book_id in pointers:
        if book_id is not None and book_id not in ids:
            raise InvariantViolation(
                "pointer_exists", f"{name} points at {book_id}, which is not a Book"
            )

    main = library.main_book_id
    if main is not None and main == library.up_next_book_id:
        raise InvariantViolation("main_not_up_next", f"Book {main} is both Main book and Up next")
    if main is not None and main in library.side_read_book_ids:
        raise InvariantViolation(
            "main_not_side_read", f"Book {main} is both Main book and a Side read"
        )

    repeated = _first_repeat(library.side_read_book_ids)
    if repeated is not None:
        raise InvariantViolation(
            "unique_side_reads", f"Book {repeated} is a Side read more than once"
        )
    if len(library.side_read_book_ids) > MAX_SIDE_READS:
        raise InvariantViolation(
            "side_reads_max",
            f"{len(library.side_read_book_ids)} Side reads; at most {MAX_SIDE_READS} are allowed",
        )

    for book in library.books:
        # add-book and edit-book store every field with str.strip() applied, the title,
        # authors, language and publisher required and empty tags dropped (domain/book_fields).
        # Catalog's filter lists show the language and tags as is; the title, authors and
        # publisher drive sort and search, and must round-trip through the Edit form.
        if not book.title.strip():
            raise InvariantViolation("book_title_required", f"Book {book.id} has no title")
        if book.title != book.title.strip():
            raise InvariantViolation(
                "book_title_trimmed", f"Book {book.id} has a title with whitespace around it"
            )
        if not book.authors:
            raise InvariantViolation("book_authors_required", f"Book {book.id} has no authors")
        for author in book.authors:
            if not author.strip():
                raise InvariantViolation(
                    "book_author_required", f"Book {book.id} has a blank author"
                )
            if author != author.strip():
                raise InvariantViolation(
                    "book_author_trimmed",
                    f"Book {book.id} has an author with whitespace around it",
                )
            # The Edit form joins authors with "; " and split_authors splits on ";".
            if ";" in author:
                raise InvariantViolation(
                    "book_author_no_semicolon", f"Book {book.id} has an author with a semicolon"
                )
        if not book.language.strip():
            raise InvariantViolation("book_language_required", f"Book {book.id} has no language")
        if book.language != book.language.strip():
            raise InvariantViolation(
                "book_language_trimmed",
                f"Book {book.id} has a language with whitespace around it",
            )
        if not book.publisher.strip():
            raise InvariantViolation("book_publisher_required", f"Book {book.id} has no publisher")
        if book.publisher != book.publisher.strip():
            raise InvariantViolation(
                "book_publisher_trimmed",
                f"Book {book.id} has a publisher with whitespace around it",
            )
        for tag in book.tags:
            if not tag.strip():
                raise InvariantViolation("book_tag_required", f"Book {book.id} has a blank tag")
            if tag != tag.strip():
                raise InvariantViolation(
                    "book_tag_trimmed", f"Book {book.id} has a tag with whitespace around it"
                )
            # The Edit form joins tags with ", " and split_tags splits on ",".
            if "," in tag:
                raise InvariantViolation(
                    "book_tag_no_comma", f"Book {book.id} has a tag with a comma"
                )
        # merge_tags drops a tag equal to an earlier one ignoring case.
        if _first_repeat([tag.casefold() for tag in book.tags]) is not None:
            raise InvariantViolation(
                "book_tags_unique", f"Book {book.id} has a tag more than once, ignoring case"
            )
        # mint_cover_file names covers/<book-id>-<uuid>.<ext>; a value that isn't
        # covers/<plain name> names no file in covers/ (cover_name returns None).
        if book.cover_file is not None and cover_name(book.cover_file) is None:
            raise InvariantViolation(
                "book_cover_file_in_covers",
                f"Book {book.id} has a coverFile that isn't covers/<name>",
            )

        unfinished = [r for r in book.readings if not r.finished]
        if len(unfinished) > 1:
            raise InvariantViolation(
                "one_unfinished_reading",
                f"Book {book.id} has {len(unfinished)} unfinished Readings",
            )
        if book.id == main and not unfinished:
            raise InvariantViolation(
                "main_has_unfinished_reading",
                f"Main book {book.id} has no unfinished Reading",
            )
        for reading in unfinished:
            if not 0 <= reading.current_page <= book.pages:
                raise InvariantViolation(
                    "reading_page_in_range",
                    f"Reading {reading.id} of Book {book.id} is at page "
                    f"{reading.current_page}, outside 0 to {book.pages}",
                )
        for note in book.card_notes:
            end = note.page_end if note.page_end is not None else note.page_start
            if not 1 <= note.page_start <= end <= book.pages:
                raise InvariantViolation(
                    "card_note_pages_in_range",
                    f"Card note {note.id} of Book {book.id} covers pages "
                    f"{note.page_start} to {end}, outside 1 to {book.pages}",
                )
            # One page is stored as pageEnd null; the Page parser never stores "5–5" as 5 to 5.
            if note.page_end == note.page_start:
                raise InvariantViolation(
                    "card_note_page_end_after_start",
                    f"Card note {note.id} of Book {book.id} ends on its start page "
                    f"{note.page_start}; one page has no pageEnd",
                )
            # add-card-note and edit-card-note store the Note text with str.strip() applied.
            if not note.text.strip():
                raise InvariantViolation(
                    "card_note_text_required",
                    f"Card note {note.id} of Book {book.id} has no text",
                )
            if note.text != note.text.strip():
                raise InvariantViolation(
                    "card_note_text_trimmed",
                    f"Card note {note.id} of Book {book.id} has text with whitespace around it",
                )
