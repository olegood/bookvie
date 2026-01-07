package bookvie.domain;

import java.time.LocalDate;

public record ReadingDates(LocalDate startDate, LocalDate finishDate) {

    public static ReadingDates empty() {
        return new ReadingDates(null, null);
    }

    public static ReadingDates startOn(LocalDate startDate) {
        return new ReadingDates(startDate, null);
    }

    public ReadingDates finishOn(LocalDate finishDate) {
        return new ReadingDates(startDate, finishDate);
    }

    public boolean arePacked() {
        return startDate != null && finishDate != null;
    }

}
