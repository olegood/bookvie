package bookvie.domain.reading;

public record Duration(double value, Unit unit) {

    public enum Unit {
        HOURS,
        POMODOROS
    }

    public Duration {
        if (value <= 0) {
            throw new IllegalArgumentException("Duration must be positive!");
        }
        if (Unit.POMODOROS == unit && value % 1 != 0) {
            throw new IllegalArgumentException("Pomodoros must be a whole number!");
        }
    }

    public static Duration hours(double hours) {
        return new Duration(hours, Unit.HOURS);
    }

    public static Duration pomodoros(int pomodoros) {
        return new Duration(pomodoros, Unit.POMODOROS);
    }

}
