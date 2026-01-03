package bookvie.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Represents one full read-through of a book.
 */
@Data
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

}
