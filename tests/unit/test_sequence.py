import pytest

from bookvie.domain.errors import SequenceLocked, DomainError
from bookvie.domain.status import Status


def test_sequence_books_keep_order(sequence):
    sequence.add_book("A")
    sequence.add_book("B")
    sequence.add_book("C", position=0)

    assert sequence.book_ids == ["C", "A", "B"]


def test_sequence_book_cannot_be_added_twice(sequence):
    sequence.add_book("A")
    with pytest.raises(SequenceLocked, match="book is already in this sequence"):
        sequence.add_book("A")


def test_sequence_removing_an_absent_book_is_an_error(sequence):
    with pytest.raises(DomainError, match="'Autumn Python Reading' does not contain this book"):
        sequence.remove_book("nope")


@pytest.mark.parametrize("closing", [Status.FINISHED, Status.ABANDONED])
def test_sequence_closed_sequence_rejects_every_edit(sequence, closing):
    sequence.add_book("A")
    sequence.change_status(Status.IN_PROGRESS)
    sequence.change_status(closing)

    error = f"sequence '{sequence.name}' is {closing.value} and cannot be changed"
    with pytest.raises(SequenceLocked, match=error):
        sequence.add_book("B")
    with pytest.raises(SequenceLocked, match=error):
        sequence.remove_book("B")
    with pytest.raises(SequenceLocked, match=error):
        sequence.rename("Winter Reading")


def test_sequence_moving_an_absent_book_is_an_error(sequence):
    sequence.add_book("A")
    with pytest.raises(DomainError, match="'Autumn Python Reading' does not contain this book"):
        sequence.move_book("nope", 0)


def test_sequence_moving_a_book_reorders_in_place(sequence):
    for book_id in ["A", "B", "C"]:
        sequence.add_book(book_id)
    sequence.move_book("C", 0)
    assert sequence.book_ids == ["C", "A", "B"]


def test_sequence_a_new_sequence_is_still_editable(sequence):
    assert sequence.is_editable
    sequence.add_book("A")
    assert sequence.size == 1
