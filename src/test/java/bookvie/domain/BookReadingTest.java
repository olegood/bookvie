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
    void shouldHaveBookBeforeStartReading() {
        // when
        reading = BookReading.builder()
                .book(null)
                .build();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.start())
                .withMessage("Cannot start reading without a book!");
    }

    @Test
    void shouldSetTodayWhenStartReading() {
        // when
        reading.start();

        // then
        assertThat(reading.getStartDate()).isToday();
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
    void shouldStartReadingWithNoPagesRead() {
        // when
        reading.start();

        // then
        assertThat(reading.getPagesRead()).isZero();
    }

    @Test
    void shouldSetTodayWhenFinishReading() {
        // given
        var today = LocalDate.now();

        // when
        reading.finish();

        // when
        assertThat(reading.getEndDate()).isEqualTo(today);
    }

    @Test
    void shouldSpecifyDateWhenFinishReading() {
        // given
        var finishDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.finish(finishDate);

        // then
        assertThat(reading.getEndDate()).isEqualTo(finishDate);
    }

    @Test
    void shouldMatchBookReadPagesWhenFinishReading() {
        // when
        reading.finish();

        // then
        assertThat(reading.getPagesRead()).isEqualTo(reading.getBook().getPages());
    }

    @Test
    void shouldSetStartDateTheSameAsFinishedWhenWasNotStartedExplicitly() {
        // given

        // when
        reading.finish();

        // then
        assertThat(reading.getStartDate()).isEqualTo(reading.getEndDate());
        assertThat(reading.getStartDate()).isToday();
        assertThat(reading.getEndDate()).isToday();
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
