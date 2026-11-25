# Epic 16 Context: Remember the Books that mattered

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Oleg stars a Book to record that it had an impact on him. The star is his verdict about the Book. It is not a tag and not a way to find the Book again, so any Book can carry it, read or not. He sets it on Book detail next to the title, on a Catalog tile, in a List row and in the Bookcase's Spine popover. A starred Book's spine carries a small star mark. One click on the Favourites chip, first in the Catalog filter row, shows only the starred Books. Edits never touch the star, backups carry it, and agents can read it but never set it.

## Stories

- Story 16.1: Star a Book
- Story 16.2: Show only my favourites

## Requirements & Constraints

- Any Book can be starred, whatever its reading state. The Book page holds the main control, and tiles, List rows and the Spine popover are shortcuts to it.
- Edits keep the star (P0). Editing a starred Book on the web or with `edit_book` leaves it starred.
- Backups (P0): a library or backup from before Epic 16 loads and restores with no Book starred, and a star survives an export and restore round trip.
- Star and unstar (P0) work from all four places and show in the other views after the refetch. Setting the current value is a successful no-op.
- Filter (P0): the chip shows exactly the starred Books in the bookcase, the list and the tiles. It ANDs with Unread, a Tag and Search titles.
- P1: the couldn't-save failure, the hover-only outline on tiles and rows, stable accessible names with `aria-pressed`, the chip not being remembered (a reload resets it, and Home and the meter ignore it), agents reading `favourite` with no tool to set it, and the existing filter specs passing with the chip off.
- Standard intent ACs apply to `set-favourite`. An injected write, fsync or rename failure leaves `library.json` byte-identical and returns 503 `couldnt_save`. Invariants hold after every success. A Book that is gone gets 409 `book_not_found`, and every new error code has an API test. Every save surface shows "Couldn't save. Your data wasn't changed." on a 503.
- Per-epic gates: P0 100%, P1 at least 95%, `check:api` clean, coverage at least 90% on `domain/` and at least 80% on `intents/` and `store/`.
- Existing tests stay unchanged except the leaves the epic's gate names in `epics.md`: version pins from 3 to 4 ("newer version" from 4 to 5), field and route sets, spine-popover, tile and legend e2e leaves for 16.1, and the "Clear filters" focus and toolbar Tab order leaves for 16.2. Open the gate list before you change any other test.
- Out of scope: favourites on Card notes or the Boxes shelf search, an agent tool that sets the star, a Favourites sort, a favourites count in Stats, a favourites page, `preview_restore` reporting the stars a restore would lose, an optimistic star, Safari- or Firefox-only behavior, and Mac checks (there are none).

## Technical Decisions

- **Stored field:** every Book has `favourite: bool`. It is required in the store model with no default, and it adds no invariant rule. The schema goes from version 3 to 4 (`CURRENT_VERSION` and `SCHEMA_VERSION` both become 4) with one migration step that sets `false` on every Book. Startup keeps `library.v3.bak.json`. A version 4 file or archive without `favourite` is refused (`restore_invalid` on restore).
- **The only writer:** `POST /api/intents/set-favourite`. It is multipart with a JSON `intent` part `{bookId, favourite}`, and it sets the value it is sent, never toggling. `add-book` stores `false`. `edit-book` and every other intent keep the stored value. `favourite` is never an Edit form field, so it never appears in `editForm` or in `edit_book`'s input. Setting the current value returns 200 and commits nothing (`store.UNCHANGED`), and that check runs after `book_not_found`.
- **Views:** `ShelfBook` (in the catalog and home views) and `BookDetailView` carry `favourite` as stored. Add it in Python first, then run `api:gen`. Every surface reads that one field. The test builders default it to `false`.
- **No optimistic UI:** the star changes only after `set-favourite` succeeds and the views refetch. A failure leaves it as it was, so there is nothing to roll back.
- **Spine names:** a starred Book's name ends with ", favourite" after the status. Twins are matched on the name without that suffix, so starring one Book never renames another. Tiles use the same builder.
- **Favourites filter** (`lib/catalogFilter.ts`, `components/FilterChips.tsx`): a lone on/off toggle that keeps Books whose `ShelfBook.favourite` is true. It is its own group for the AND rule. `liveFilters` never turns it off, so with nothing starred it stays on and the empty state shows. It counts as a filter for "Clear filters" and the empty state. It is page state only: reset when Catalog unmounts or a Book is added, and never applied to Home's slice or the "X of Y finished" meter.
- **Unstar with the chip on:** `pages/CatalogPage` owns focus and the announcement, not the star's own flow and not `useSpinePopover`'s fallback.
- **Agents:** `get_book`, `list_catalog` and `get_home` show `favourite` because they return their views unchanged. `set_favourite` is never registered (`AGENT_TOOL_NAMES` stays the same, and the never-registered probes name it). Tool descriptions don't change, and `find_book` neither returns nor matches `favourite`.
- **Gold tokens:** `favourite` `#9A7120` and `favourite-dark` `#D2A54E` live in DESIGN.md's `colors` and in `tokens.css`. They change together, because `app-shell.spec.ts` compares the two files, and nobody runs a formatter on `tokens.css`.

## UX & Interaction Patterns

- **Star control:** a `button` with `aria-pressed`, an `aria-hidden` SVG star (one path, never a glyph character) and no visible text. Starred is filled gold and unstarred is an outline. Its name is "Favourite" on Book detail and in the Spine popover, and "Favourite *Title*" on tiles and List rows. e2e finds it with `exact: true`, since "Favourite" is a prefix of "Favourites". The button is never disabled. A second press before the refetch sends the same value.
- **Book detail:** a plain icon button `{spacing.3}` after the `h1` text, centered on its first line, always shown, with the focus ring.
- **Spine popover:** the star sits right after the title and comes first in the popover's DOM. On open, focus goes to the primary action (else the first link), never the star. Shift+Tab from that control reaches the star. Shift+Tab from the star closes the popover and returns focus to the spine.
- **Tile:** a bare star with a paper halo at the 2:3 cover box's top left, inset on the box rather than the visible cover, and never over the finished ribbon. It is a sibling of the tile link inside the list item, so Tab reaches the link, then its star. Starred stars always show. Unstarred stars are drawn only on `:hover` or `:focus-within`, instantly, and stay in the Tab order.
- **List row:** the star comes `{spacing.2}` after the title link and never makes the row taller. It follows the same hover and focus rules as tiles.
- **Spine mark:** a small paper square with a gold star near the spine's foot, also drawn over a Main book's fill and alongside a marker dot. It is not a control. The legend always lists "favourite".
- **Announcements:** `status` says "*Dune* is a favourite." or "*Dune* is not a favourite." On failure, `alert` says "Couldn't save. Your data wasn't changed.", under the title row on Book detail or in an open popover. On Tiles, on List, or after the popover has closed, the line shows once under the filter row, without scrolling to it. It empties at the next save or filter change, and focus stays where it is.
- **Gold:** fills the star only, never text, borders, backgrounds or rating stars. On covers and spines it is `#9A7120` in both themes. In forced colors every star uses `forced-color-adjust: none` with a `CanvasText` fill or stroke, on a `Canvas` halo or square. Nothing animates.
- **Favourites chip:** first in the filter row, before Status. It is a lone toggle with `aria-pressed`, named "Favourites", outside any `role="group"`, with no popup. It shows a leading gold star in both states. When on, it uses the selected chip style with the check glyph before the star. It shows whenever the catalog has Books, and it is never hidden or disabled. When on, it announces "N books match."; with nothing starred, the empty state reads "No books match these filters." "Clear filters" turns every chip off and focuses the Favourites chip.
- **Unstar with the chip on:** the Book hides once the refetch renders. Focus moves to the next remaining Book in sort order (its tile link, its row's title link or its spine), else the previous one, else Search titles. One `status` message says "*Dune* is not a favourite. 11 books match." From the popover, the popover closes with its spine, and focus follows the same rule.

## Cross-Story Dependencies

- Story 16.2 builds on 16.1's `ShelfBook.favourite`, the star's save flow and its couldn't-save placement. 16.1 added the shared star button (`components/FavouriteStar`) and its save hook (`lib/useFavourite`). An open spine drift entry records that the spine doesn't name them yet.
- Story 16.2 closes the epic. Afterwards come automate, then the retrospective with the trace and gate and the spine reconciliation, before any Epic 17 story.
