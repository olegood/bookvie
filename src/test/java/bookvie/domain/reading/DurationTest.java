package bookvie.domain.reading;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class DurationTest {

    @Test
    void shouldNotAcceptNegativeValue() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> Duration.hours(-2.0))
                .withMessage("Duration must be positive!");
    }

    @Test
    void shouldNotAcceptZeroValue() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> Duration.hours(0))
                .withMessage("Duration must be positive!");
    }

    @Test
    void shouldUseFactoryMethodForHoursUnit() {
        // when
        var duration = Duration.hours(2);

        // then
        assertThat(duration.value()).isEqualTo(2.0);
        assertThat(duration.unit()).isEqualTo(Duration.Unit.HOURS);
    }

    @Test
    void shouldUseFactoryMethodForPomodorosUnit() {
        // when
        var duration = Duration.pomodoros(6);

        // then
        assertThat(duration.value()).isEqualTo(6.0);
        assertThat(duration.unit()).isEqualTo(Duration.Unit.POMODOROS);
    }

    @Test
    void shouldNotCreatePomodorosWithDecimals() {
        // expect
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> new Duration(2.5, Duration.Unit.POMODOROS))
                .withMessage("Pomodoros must be a whole number!");
    }

}
