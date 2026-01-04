package bookvie.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class BookReadingTest {

    @Test
    void shouldNotExceedTotalPagesWhenRead() {
        // when
        var book = Book.builder()
                .pages(100)
                .build();

        var reading = BookReading.builder()
                .book(book)
                .build();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(105))
                .withMessage("Cannot read more pages than the book has!");
    }

    @Test
    void shouldNotAcceptNegativePagesRead() {
        // when
        var book = Book.builder()
                .pages(100)
                .build();

        var reading = BookReading.builder()
                .book(book)
                .build();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(-20))
                .withMessage("Cannot read negative pages!");
    }

    @Test
    void shouldNotAcceptZeroPagesRead() {
        // when
        var book = Book.builder()
                .pages(100)
                .build();

        var reading = BookReading.builder()
                .book(book)
                .build();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(0))
                .withMessage("Cannot read zero pages!");
    }

    @Test
    void shouldReadPages() {
        // given
        var book = Book.builder()
                .pages(100)
                .build();

        var reading = BookReading.builder().book(book).build();

        // when
        reading.read(50);

        // then
        assertThat(reading.getPagesRead()).isEqualTo(50);
    }

}
