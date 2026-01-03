package bookvie.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class Book {

    @Id
    @GeneratedValue(generator = "UUID")
    private UUID uuid = UUID.randomUUID();

    private String title;
    private String subtitle;

    private String authors;
    private String language;

    private String description;

    private String publisher;
    private LocalDate publishDate;

    private int pages;

}
