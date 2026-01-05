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
    void shouldStartReadingWithNoPagesOnPage() {
        // when
        reading.start();

        // then
        assertThat(reading.getOnPage()).isZero();
    }

    @Test
    void shouldSetTodayWhenFinishReading() {
        // given
        var today = LocalDate.now();

        // when
        reading.finish();

        // when
        assertThat(reading.getFinishDate()).isEqualTo(today);
    }

    @Test
    void shouldSpecifyDateWhenFinishReading() {
        // given
        var finishDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.finish(finishDate);

        // then
        assertThat(reading.getFinishDate()).isEqualTo(finishDate);
    }

    @Test
    void shouldMatchBookFinishAtPagePagesWhenFinishReading() {
        // when
        reading.finish();

        // then
        assertThat(reading.getOnPage()).isEqualTo(reading.getBook().getPages());
    }

    @Test
    void shouldSetStartDateTheSameAsFinishedWhenWasNotStartedExplicitly() {
        // given

        // when
        reading.finish();

        // then
        assertThat(reading.getStartDate()).isEqualTo(reading.getFinishDate());
        assertThat(reading.getStartDate()).isToday();
        assertThat(reading.getFinishDate()).isToday();
    }

    @Test
    void shouldNotExceedTotalPagesWhenOnPage() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.onPage(105))
                .withMessage("Cannot read more pages than the book has!");
    }

    @Test
    void shouldNotAcceptZeroPagesOnPage() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.onPage(0))
                .withMessage("Cannot read zero pages!");
    }

    @Test
    void shouldNotAcceptNegativePagesOnPage() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.onPage(-15))
                .withMessage("Cannot read negative pages!");
    }

    @Test
    void shouldOnPagePages() {
        // when
        reading.onPage(50);

        // then
        assertThat(reading.getOnPage()).isEqualTo(50);
    }

    @Test
    void shouldNotReadLessPagesThanAlreadyOnPage() {
        // when
        reading.onPage(25);

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.onPage(10))
                .withMessage("Cannot read less pages than already read!");
    }

    @Test
    void shouldStartReadingIfNotExplicitlySetTheDate() {
        // when
        reading.onPage(30);

        // then
        assertThat(reading.getStartDate()).isToday();
    }

    @Test
    void shouldNotStartItOverIfFinished() {
        // when
        reading.finish();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.start())
                .withMessage("Cannot start reading after finishing it!");
    }

    @Test
    void shouldNotFinishReadingTwice() {
        // when
        reading.finish();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.finish())
                .withMessage("Cannot finish reading twice!");
    }

    @Test
    void shouldEnsureTheReadingIsFinished() {
        // when
        reading.finish();

        // then
        assertThat(reading.isFinished()).isTrue();
    }

    @Test
    void shouldReturnFalseWhenReadingIsNotFinished() {
        // when
        reading.start();

        // then
        assertThat(reading.isFinished()).isFalse();
    }

    @Test
    void shouldNotAcceptAsFinishedIfOnPageDoesNotMatchBooksTotal() {
        // given
        reading.onPage(50);

        // then
        assertThat(reading.isFinished()).isFalse();
    }

    @Test
    void shouldAcceptAsFinishedOnlyIfAllCriteriaMet() {
        // when
        reading.finish();

        // then
        assertThat(reading.isFinished()).isTrue();
        assertThat(reading.getOnPage()).isEqualTo(reading.getBook().getPages());
        assertThat(reading.getStartDate()).isToday();
        assertThat(reading.getFinishDate()).isToday();
    }

}
