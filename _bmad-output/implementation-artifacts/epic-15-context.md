# Epic 15 Context: See one publisher's shelf

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Oleg see one publisher's shelf, such as everything from Manning, in the Catalog's bookcase, list and tiles. A Publisher ▾ filter chip after Tag lists the library's publishers, the biggest first. Each one shows its Book count in the whole library, so the list keeps its order while other filters change. GitHub issue #4 asked for grouping by author, publisher or year. The plan turned that into this one filter: there are no section headings, and author and year grouping are closed. The epic first adds the publisher to the catalog view with no visible change (15.1), then builds the chip on it (15.2).

## Stories

- Story 15.1: Carry the publisher in the catalog view
- Story 15.2: Filter the catalog by publisher

## Requirements & Constraints

- The catalog view's `ShelfBook` carries `publisher`, a required string equal to the Book's stored, trimmed publisher. Publisher is always present and never blank, so no "Unknown" bucket is needed.
- The MCP `list_catalog` tool returns the same view, so its Books carry `publisher` too. Its description and arguments don't change, and it gets no Publisher filter.
- **Filtering.** Within Publisher, the checked values combine with OR. With the other chip groups and Search titles, they combine with AND. Books that don't match are hidden, not dimmed, and the shelf closes up in all three views. The closed chip reads "Publisher: N". The `status` region announces "N books match."
- **Order and counts.** The list is ordered by each publisher's Book count across the whole library, most first, with ties A–Z by the Catalog's collator. Other chips and Search titles never change the counts or the order: no live counts.
- **Case.** Values that differ only in case are one row, labelled with the first spelling in library order. The row's count covers every spelling, and checking it matches every spelling.
- **Live data.** After a refetch, a checked publisher that no Book has any more is dropped (`liveFilters`), so it can't leave the Catalog empty.
- **Page state only.** Like every chip, Publisher is never stored and never exported. It resets on "Clear filters", on reload, on leaving the Catalog and when a Book is added. It never applies to Home's slice or the "X of Y finished" meter.
- **Gate.** The per-epic quality gates, plus green P0 risks:
  - Publisher filters the bookcase, the list and the tiles, with OR inside the chip and AND with the other chips and Search titles.
  - The order is by library count with ties A–Z, and it holds while other filters change.
  - The existing catalog, home-slice and catalog-filter e2e specs pass unchanged while Publisher is left untouched, with one exception: Publisher ▾ is the row's new last chip, so the two leaves that Tab along the row include it (`catalog-filter.spec.ts` AC-4's Clear filters stop and `bookcase-details.spec.ts`'s toolbar Tab sequence). Every other assertion is unchanged; the Story 7.2 helpers moved to `e2e/catalog-filter.ts`.
- **Out of scope:**
  - grouping under headings
  - the publisher on Book detail as a link to the filtered Catalog, which would need filters in the URL
  - a Publisher filter on `list_catalog`
  - a search field inside the chip popups
  - behavior that only Safari or Firefox shows
  - Mac checks: this epic needs none

## Technical Decisions

- **The contract starts in Python (AD-8).** Add `publisher` to `ShelfBook` in `backend/bookvie/views/models.py` and fill it in `views/shelf.py`. Then run `npm --prefix frontend run api:gen`. `schema.d.ts` is generated: never edit or format it by hand. `check:api` compares it byte for byte.
- **Fixtures.** Every `ShelfBook` fixture in the frontend unit tests and the e2e helpers gains `publisher`. Add it through the existing shared helpers rather than new copies.
- **Filter rules (AD-6) live in `lib/catalogFilter.ts`.** Story 15.2 adds:
  - `CatalogFilters.publishers`, an entry in `NO_FILTERS` and `FilterableBook.publisher`
  - the publisher match in `matchesFilters` and the publisher check in `liveFilters`
  - a new `publisherValues()` that returns each value with its library count, ordered by count (most first), then by collator A–Z
- **Keep the existing helper's rules.** `filterValues()` (Language and Tag) stays as it is: keyed by `toLocaleLowerCase`, first spelling as the label, collator A–Z. The Publisher list reuses the same keying and labelling.
- **The chip reuses the shared list.** `components/FilterChips.tsx` adds Publisher through the same `list(...)` checkbox-popup path, after Tag, and its rows also render the count.
- **Counts come from all Books.** `pages/CatalogPage.tsx` builds the publisher list from all of the catalog view's Books, never from the filtered set.
- **The spine already covers this epic.** It was updated before the epic: AD-6's filter-chips bullet includes Publisher, and the FR-4/FR-20 capability-map row names `ShelfBook.publisher`. No new AD.

## UX & Interaction Patterns

- **Filter row order:** Status, Type, Language ▾, Tag ▾, Publisher ▾.
- **Popup.** Publisher ▾ opens the same `surface` checkbox list as Language and Tag. Its rows are `body-sm`/`ink`, the list is at most 320px tall and it scrolls beyond that.
- **Count.** It sits inline after the name, one space apart, in `body-sm`/`ink-tertiary` ("Manning 49"), not in a right-aligned column. Language and Tag rows still show no count.
- **Accessibility.** Each row is a checkbox whose accessible name is its visible text plus the noun, singular or plural: "Manning 49 books", "Apress 1 book".
- **Keyboard.** The chip opens, closes on Esc and returns focus exactly as Language ▾ and Tag ▾ do.
- **No design tokens change.** `tokens.css` is untouched.

## Cross-Story Dependencies

- Story 15.2 depends on 15.1: the filter is built from `ShelfBook.publisher`.
- Story 15.1 must cause no visible change on the Catalog, Home or Card notes pages.
- Story 15.2 closes the epic. After it come test automation, the Epic 15 retrospective and its before-next-epic items. Don't start the next epic first.
