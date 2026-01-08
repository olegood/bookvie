package bookvie.domain.reading;

import java.time.LocalDate;

public record Period(LocalDate startDate, LocalDate finishDate) {

    public static Period empty() {
        return new Period(null, null);
    }

    public static Period startOn(LocalDate startDate) {
        return new Period(startDate, null);
    }

    public Period finishOn(LocalDate finishDate) {
        return new Period(startDate, finishDate);
    }

    public boolean isReadyToStart() {
        return empty().equals(this);
    }

    public boolean isFinished() {
        return startDate != null && finishDate != null;
    }

}
