package bookvie.domain.reading;

import bookvie.domain.Book;

import java.time.LocalDate;

/**
 * Represents one full read-through of a book.
 */
public final class Reading {

    private final Book book;

    private Period readingPeriod;

    /**
     * Represents the current page being read in the book.
     * <p>
     * This value is updated as the reading progresses and must adhere to the following constraints:
     * - It cannot be negative.
     * - It cannot be zero.
     * - It cannot exceed the total number of pages in the book.
     * - It cannot be less than the current value of this field.
     */
    private int currentPage;

    public Reading(final Book book) {
        if (book == null) {
            throw new IllegalArgumentException("Cannot read a null book!");
        }
        this.book = book;
        this.readingPeriod = Period.empty();
    }

    public LocalDate getStartedOn() {
        return readingPeriod.startDate();
    }

    public LocalDate getFinishedOn() {
        return readingPeriod.finishDate();
    }

    public int currentPage() {
        return currentPage;
    }

    /**
     * Initiates the reading process of the book using the current date as the start date.
     * This method delegates to the {@link #start(LocalDate)} method with the current date.
     * Validates the readiness to start by ensuring a book is assigned and the reading
     * has not already been marked as finished.
     *
     * @throws IllegalArgumentException if no book is assigned or if the book
     *                                  has already been marked as finished.
     */
    public void start() {
        start(LocalDate.now());
    }

    /**
     * Initiates the reading process of the book by setting the specified start date.
     * Validates the readiness to start by ensuring a book is assigned and the reading
     * has not already been marked as finished.
     *
     * @param date the date when the reading should start. Must not be null.
     * @throws IllegalArgumentException if no book is assigned or if the book
     *                                  has already been marked as finished.
     */
    public void start(LocalDate date) {
        if (isCompleted()) {
            throw new IllegalArgumentException("Cannot start reading after finishing it!");
        }
        this.currentPage = 0;
        this.readingPeriod = Period.startOn(date);
    }

    /**
     * Marks the reading of the book as finished using the current date as the finish date.
     * If the reading process has not started, it will be initiated with the current date.
     * Ensures the progress is updated to the last page of the book.
     *
     * @throws IllegalArgumentException if no book is assigned to the reading or
     *                                  if the book has already been marked as finished.
     */
    public void complete() {
        complete(LocalDate.now());
    }

    /**
     * Marks the reading of the book as finished on the specified date.
     * If the reading process has not already started, it will be initiated
     * with the given finish date. Ensures the progress is updated to the final page
     * upon finishing. Throws an exception if the reading has already been completed.
     *
     * @param date the date on which the reading is finished. Must not be null.
     * @throws IllegalArgumentException if the book has already been marked as finished.
     */
    public void complete(LocalDate date) {
        if (isCompleted()) {
            throw new IllegalArgumentException("Cannot finish reading twice!");
        }
        onPage(book.getPages());
        readingPeriod = readingPeriod.finishOn(date);
    }

    /**
     * Updates the current page of the book being read.
     * Validates the page number and ensures it adheres to logical constraints
     * such as not exceeding the book's total pages, not going below the first page,
     * and not regressing behind the current progress.
     * If the reading process has not started yet, it will be initiated.
     *
     * @param currentPage the page number to update to. Must be greater than 0,
     *                    must not exceed the total number of pages in the book,
     *                    and must not be less than the current page progress.
     * @throws IllegalArgumentException if the provided page number violates any of the constraints.
     */
    public void onPage(int currentPage) {
        if (readingPeriod.isReadyToStart()) {
            start();
        }
        validate(currentPage);
        this.currentPage = currentPage;
    }

    private void validate(int currentPage) {
        if (currentPage <= 0) {
            throw new IllegalArgumentException("Incorrect pages progress!");
        }
        if (currentPage > book.getPages()) {
            throw new IllegalArgumentException("Cannot read more pages than the book has!");
        }
        if (currentPage < this.currentPage) {
            throw new IllegalArgumentException("Cannot read less pages than already read!");
        }
    }

    /**
     * Determines whether the reading of the book has been completed.
     * A reading is considered finished if the finish date is not null
     * and the current page matches the total number of pages in the book.
     *
     * @return true if the reading is finished, false otherwise.
     */
    public boolean isCompleted() {
        return readingPeriod.isFinished() && currentPage == book.getPages();
    }

    /**
     * Resets the reading progress of the book.
     * <p>
     * - The finish date is set to null.
     * - The current page is set to 0.
     * - The reading process is restarted.
     */
    public void reset() {
        readingPeriod = Period.empty();
        start();
    }
}
