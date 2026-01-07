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

        reading = new BookReading(book);
    }

    @Test
    void shouldHaveBookBeforeStartReading() {
        // when
        reading = new BookReading(null);

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.start())
                .withMessage("Cannot operate without a book!");
    }

    @Test
    void shouldHaveBookAfterCompleteReading() {
        // when
        reading = new BookReading(null);

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.complete())
                .withMessage("Cannot operate without a book!");
    }

    @Test
    void shouldSetTodayWhenStartReading() {
        // when
        reading.start();

        // then
        assertThat(reading.getStartedOn()).isToday();
    }

    @Test
    void shouldStartReadingWithSpecifiedDate() {
        // given
        var startDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.start(startDate);

        // then
        assertThat(reading.getStartedOn()).isEqualTo(startDate);
    }

    @Test
    void shouldStartReadingWithNoPagesOnPage() {
        // when
        reading.start();

        // then
        assertThat(reading.currentPage()).isZero();
    }

    @Test
    void shouldSetTodayWhenCompleteReading() {
        // given
        var today = LocalDate.now();

        // when
        reading.complete();

        // when
        assertThat(reading.getFinishedOn()).isEqualTo(today);
    }

    @Test
    void shouldSpecifyDateWhenCompleteReading() {
        // given
        var finishDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.complete(finishDate);

        // then
        assertThat(reading.getFinishedOn()).isEqualTo(finishDate);
    }

    @Test
    void shouldMatchBookFinishAtPagePagesWhenCompleteReading() {
        // when
        reading.complete();

        // then
        assertThat(reading.currentPage()).isEqualTo(reading.book().getPages());
    }

    @Test
    void shouldSetStartDateTheSameAsFinishedWhenWasNotStartedExplicitly() {
        // when
        reading.complete();

        // then
        assertThat(reading.getStartedOn()).isToday();
        assertThat(reading.getFinishedOn()).isToday();
        assertThat(reading.getStartedOn()).isEqualTo(reading.getFinishedOn());
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
                .withMessage("Incorrect pages progress!");
    }

    @Test
    void shouldNotAcceptNegativePagesOnPage() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.onPage(-15))
                .withMessage("Incorrect pages progress!");
    }

    @Test
    void shouldOnPagePages() {
        // when
        reading.onPage(50);

        // then
        assertThat(reading.currentPage()).isEqualTo(50);
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
        assertThat(reading.getStartedOn()).isToday();
    }

    @Test
    void shouldNotStartItOverIfFinished() {
        // when
        reading.complete();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.start())
                .withMessage("Cannot start reading after finishing it!");
    }

    @Test
    void shouldNotCompleteReadingTwice() {
        // when
        reading.complete();

        // then
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> reading.complete())
                .withMessage("Cannot finish reading twice!");
    }

    @Test
    void shouldEnsureTheReadingIsCompleted() {
        // when
        reading.complete();

        // then
        assertThat(reading.isCompleted()).isTrue();
    }

    @Test
    void shouldReturnFalseWhenReadingIsNotFinished() {
        // when
        reading.start();

        // then
        assertThat(reading.isCompleted()).isFalse();
    }

    @Test
    void shouldNotAcceptAsFinishedIfOnPageDoesNotMatchBooksTotal() {
        // given
        reading.onPage(50);

        // then
        assertThat(reading.isCompleted()).isFalse();
    }

    @Test
    void shouldAcceptAsFinishedOnlyIfAllCriteriaMet() {
        // when
        reading.complete();

        // then
        assertThat(reading.isCompleted()).isTrue();
        assertThat(reading.currentPage()).isEqualTo(reading.book().getPages());
        assertThat(reading.getStartedOn()).isToday();
        assertThat(reading.getFinishedOn()).isToday();
    }

    @Test
    void shouldResetProgressBackToStart() {
        // given
        reading.onPage(50);
        reading.complete();

        // when
        reading.reset();

        // then
        assertThat(reading.currentPage()).isZero();
        assertThat(reading.isCompleted()).isFalse();
        assertThat(reading.getStartedOn()).isToday();
        assertThat(reading.getFinishedOn()).isNull();
    }

}
