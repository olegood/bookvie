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

    private final Book book;

    private LocalDate startDate;
    private LocalDate finishDate;


    /**
     * Represents the current page being read in the book.
     * <p>
     * This value is updated as the reading progresses and must adhere to the following constraints:
     * - It cannot be negative.
     * - It cannot be zero.
     * - It cannot exceed the total number of pages in the book.
     * - It cannot be less than the current value of this field.
     */
    private int onPage;

    public void start() {
        start(LocalDate.now());
    }

    public void start(LocalDate startDate) {
        if (book == null) {
            throw new IllegalArgumentException("Cannot start reading without a book!");
        }
        if (this.finishDate != null) {
            throw new IllegalArgumentException("Cannot start reading after finishing it!");
        }
        this.startDate = startDate;
    }

    public void finish() {
        finish(LocalDate.now());
    }

    public void finish(LocalDate finishDate) {
        if (this.finishDate != null) {
            throw new IllegalArgumentException("Cannot finish reading twice!");
        }
        if (this.startDate == null) {
            start(finishDate);
        }
        onPage(book.getPages());
        this.finishDate = finishDate;
    }

    public void onPage(int page) {
        if (this.startDate == null) {
            start();
        }
        if (page < 0) {
            throw new IllegalArgumentException("Cannot read negative pages!");
        }
        if (page == 0) {
            throw new IllegalArgumentException("Cannot read zero pages!");
        }
        if (page > book.getPages()) {
            throw new IllegalArgumentException("Cannot read more pages than the book has!");
        }
        if (page < onPage) {
            throw new IllegalArgumentException("Cannot read less pages than already read!");
        }
        this.onPage = page;
    }

    public boolean isFinished() {
        return this.finishDate != null && this.onPage == book.getPages();
    }
}
