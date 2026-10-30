"""The AD-18 invariants, checked before every commit.

:func:`check_invariants` raises :class:`InvariantViolation` for the first rule
the library breaks. ``rule`` is a stable identifier for tests and logs;
``message`` names the offending Book.
"""

from .model import Library

MAX_SIDE_READS = 3


class InvariantViolation(Exception):
    def __init__(self, rule: str, message: str) -> None:
        super().__init__(message)
        self.rule = rule
        self.message = message


def check_invariants(library: Library) -> None:
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

    if len(library.side_read_book_ids) > MAX_SIDE_READS:
        raise InvariantViolation(
            "side_reads_max",
            f"{len(library.side_read_book_ids)} Side reads; at most {MAX_SIDE_READS} are allowed",
        )

    for book in library.books:
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
