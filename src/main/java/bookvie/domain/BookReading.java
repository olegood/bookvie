package bookvie.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Represents one full read-through of a book.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class BookReading {

    @Id
    private UUID uuid = UUID.randomUUID();

    @ManyToOne
    private Book book;

    private LocalDate startDate;
    private LocalDate endDate;

    private int pagesRead;

    private void setPagesRead(int pagesRead) {
        if (pagesRead < 0) {
            throw new IllegalArgumentException("Cannot read negative pages!");
        }
        if (pagesRead == 0) {
            throw new IllegalArgumentException("Cannot read zero pages!");
        }
        if (pagesRead > book.getPages()) {
            throw new IllegalArgumentException("Cannot read more pages than the book has!");
        }
        this.pagesRead = pagesRead;
    }

    public void read(int pages) {
        setPagesRead(pages);
    }
}
