package bookvie.domain.reading;

public final class Duration {

    public enum Unit {
        HOURS,
        POMODOROS
    }

    private final double value;
    private final Unit unit;

    private Duration(double value, Unit unit) {
        if (value <= 0) {
            throw new IllegalArgumentException("Duration must be positive!");
        }
        if (Unit.POMODOROS == unit && value % 1 != 0) {
            throw new IllegalArgumentException("Pomodoros must be a whole number!");
        }
        this.value = value;
        this.unit = unit;
    }

    public static Duration hours(double hours) {
        return new Duration(hours, Unit.HOURS);
    }

    public static Duration pomodoros(int pomodoros) {
        return new Duration(pomodoros, Unit.POMODOROS);
    }

    public double value() {
        return value;
    }

    public Unit unit() {
        return unit;
    }

}
