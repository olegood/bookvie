package bookvie.domain;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * Represents one full read-through of a book.
 */
@Builder
@Getter
public class BookReading {

    private Book book;

    private LocalDate startDate;
    private LocalDate endDate;

    private int pagesRead;

    public void start() {
        start(LocalDate.now());
    }

    public void start(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void read(int pages) {
        if (pages < 0) {
            throw new IllegalArgumentException("Cannot read negative pages!");
        }
        if (pages == 0) {
            throw new IllegalArgumentException("Cannot read zero pages!");
        }
        if (pages > book.getPages()) {
            throw new IllegalArgumentException("Cannot read more pages than the book has!");
        }
        this.pagesRead = pages;
    }

}
