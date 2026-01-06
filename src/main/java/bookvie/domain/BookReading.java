package bookvie.domain;

import java.time.LocalDate;

/**
 * Represents one full read-through of a book.
 */
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

    public BookReading(Book book) {
        this.book = book;
    }

    public LocalDate getStartedOn() {
        return startDate;
    }

    public LocalDate getFinishedOn() {
        return finishDate;
    }

    public int currentPage() {
        return onPage;
    }

    public Book book() {
        return book;
    }

    public void start() {
        start(LocalDate.now());
    }

    public void start(LocalDate startDate) {
        if (hasNoBook()) {
            throw new IllegalArgumentException("Cannot operate without a book!");
        }
        if (isFinished()) {
            throw new IllegalArgumentException("Cannot start reading after finishing it!");
        }
        this.startDate = startDate;
    }

    public void finish() {
        if (hasNoBook()) {
            throw new IllegalArgumentException("Cannot operate without a book!");
        }
        finish(LocalDate.now());
    }

    public void finish(LocalDate finishDate) {
        if (isFinished()) {
            throw new IllegalArgumentException("Cannot finish reading twice!");
        }
        if (isReadyToStart()) {
            start(finishDate);
        }
        onPage(book.getPages());
        this.finishDate = finishDate;
    }

    private boolean isReadyToStart() {
        return hasBook() && startDate == null;
    }

    private boolean hasBook() {
        return book != null;
    }

    private boolean hasNoBook() {
        return !hasBook();
    }

    public void onPage(int pageNo) {
        if (isReadyToStart()) {
            start();
        }
        if (pageNo <= 0) {
            throw new IllegalArgumentException("Incorrect pages progress!");
        }
        if (pageNo > book.getPages()) {
            throw new IllegalArgumentException("Cannot read more pages than the book has!");
        }
        if (pageNo < onPage) {
            throw new IllegalArgumentException("Cannot read less pages than already read!");
        }
        this.onPage = pageNo;
    }

    public boolean isFinished() {
        return this.finishDate != null && this.onPage == book.getPages();
    }

    public void reset() {
        this.finishDate = null;
        this.onPage = 0;
        start();
    }
}
