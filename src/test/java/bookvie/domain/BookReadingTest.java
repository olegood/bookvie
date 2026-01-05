package bookvie.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Month;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class BookReadingTest {

    private BookReading reading;

    @BeforeEach
    void setUp() {
        var book = Book.builder()
                .pages(100)
                .build();

        reading = BookReading.builder()
                .book(book)
                .build();
    }

    @Test
    void shouldStartReading() {
        // when
        reading.start();

        // then
        assertThat(reading.getStartDate()).isNotNull();
    }

    @Test
    void shouldStartReadingWithSpecifiedDate() {
        // given
        var startDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.start(startDate);

        // then
        assertThat(reading.getStartDate()).isEqualTo(startDate);
    }

    @Test
    void shouldNotExceedTotalPagesWhenRead() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(105))
                .withMessage("Cannot read more pages than the book has!");
    }

    @Test
    void shouldNotAcceptZeroPagesRead() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(0))
                .withMessage("Cannot read zero pages!");
    }

    @Test
    void shouldNotAcceptNegativePagesRead() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.read(-15))
                .withMessage("Cannot read negative pages!");
    }

    @Test
    void shouldReadPages() {
        // when
        reading.read(50);

        // then
        assertThat(reading.getPagesRead()).isEqualTo(50);
    }
}
