package bookvie.domain;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Builder
@Getter
public class Book {

    private String title;
    private String subtitle;

    private String authors;
    private String language;

    private String description;

    private String publisher;
    private LocalDate publishDate;

    private int pages;

}
