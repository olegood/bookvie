package bookvie.domain.reading;

import bookvie.domain.Book;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Month;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class ReadingTest {

    private Book book;
    private Reading reading;

    @BeforeEach
    void setUp() {
        book = Book.builder()
                .pages(100)
                .build();

        reading = new Reading(book);
    }

    @Test
    void shouldThrowExceptionWhenBookIsNull() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> new Reading(null))
                .withMessage("Cannot read a null book!");
    }

    @Test
    void shouldSetTodayWhenStartReading() {
        // when
        reading.start();

        // then
        assertThat(reading.startedOn()).isToday();
    }

    @Test
    void shouldStartReadingWithSpecifiedDate() {
        // given
        var startDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.start(startDate);

        // then
        assertThat(reading.startedOn()).isEqualTo(startDate);
    }

    @Test
    void shouldStartReadingWithNoPagesOnPage() {
        // when
        reading.start();

        // then
        assertThat(reading.lastPageRead()).isZero();
    }

    @Test
    void shouldSetTodayWhenCompleteReading() {
        // given
        var today = LocalDate.now();

        // when
        reading.complete();

        // when
        assertThat(reading.finishedOn()).isEqualTo(today);
    }

    @Test
    void shouldSpecifyDateWhenCompleteReading() {
        // given
        var finishDate = LocalDate.of(2026, Month.FEBRUARY, 15);

        // when
        reading.complete(finishDate);

        // then
        assertThat(reading.finishedOn()).isEqualTo(finishDate);
    }

    @Test
    void shouldMatchBookFinishAtPagePagesWhenCompleteReading() {
        // when
        reading.complete();

        // then
        assertThat(reading.lastPageRead()).isEqualTo(book.getPages());
    }

    @Test
    void shouldSetStartDateTheSameAsFinishedWhenWasNotStartedExplicitly() {
        // when
        reading.complete();

        // then
        assertThat(reading.startedOn()).isToday();
        assertThat(reading.finishedOn()).isToday();
        assertThat(reading.startedOn()).isEqualTo(reading.finishedOn());
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
        assertThat(reading.lastPageRead()).isEqualTo(50);
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
        assertThat(reading.startedOn()).isToday();
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
        assertThat(reading.lastPageRead()).isEqualTo(book.getPages());
        assertThat(reading.startedOn()).isToday();
        assertThat(reading.finishedOn()).isToday();
    }

    @Test
    void shouldResetProgressBackToStart() {
        // given
        reading.onPage(50);
        reading.complete();

        // when
        reading.reset();

        // then
        assertThat(reading.lastPageRead()).isZero();
        assertThat(reading.isCompleted()).isFalse();
        assertThat(reading.startedOn()).isToday();
        assertThat(reading.finishedOn()).isNull();
    }

}
