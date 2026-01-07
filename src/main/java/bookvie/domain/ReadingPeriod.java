package bookvie.domain;

import java.time.LocalDate;

public record ReadingPeriod(LocalDate startDate, LocalDate finishDate) {

    public static ReadingPeriod empty() {
        return new ReadingPeriod(null, null);
    }

    public static ReadingPeriod startOn(LocalDate startDate) {
        return new ReadingPeriod(startDate, null);
    }

    public ReadingPeriod finishOn(LocalDate finishDate) {
        return new ReadingPeriod(startDate, finishDate);
    }

    public boolean isReadyToStart() {
        return empty().equals(this);
    }

    public boolean isFinished() {
        return startDate != null && finishDate != null;
    }

}
