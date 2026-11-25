# Epic 16 Context: Remember the Books that mattered

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Oleg star a Book to record that it had an impact on him. The star is a verdict about the Book, not a tag or a way to find it again, so any Book can have it, read or not. He sets it on Book detail next to the title, on a cover in Tiles, in a List row and in the Bookcase's Spine popover. A starred Book's spine carries a small star mark. One click on the ★ Favourites chip, first in the Catalog's filter row, shows only the starred Books. Edits never touch the star, a backup carries it, and agents can read it but not set it. Story 16.1 adds the star end to end (FR-31). Story 16.2 builds the chip on `ShelfBook.favourite`.

## Stories

- Story 16.1: Star a Book
- Story 16.2: Show only my favourites

## Requirements & Constraints

- **Stored field.** Each Book has `favourite: bool`. It is required in the store model with no default: a version 4 file or archive without it is refused (`restore_invalid` on restore; startup exits non-zero with nothing changed). `add-book`/`add_book` store `false`. It adds no invariant rule.
- **One writer.** Only `POST /api/intents/set-favourite` `{bookId, favourite}` changes it. It sets the value it is sent and never toggles. Sending the current value is a 200 no-op that writes nothing, so `library.json` stays byte-identical. A deleted Book is 409 `book_not_found`, checked before the no-op. A missing or non-boolean `favourite` is 422 `invalid_fields`. It meets the standard intent ACs.
- **Edits keep the star.** `edit-book`, the Edit panel, `edit_book` and every other intent (start, page, pause, finish, Up next, Side read, Purpose, Card notes, spine color) leave `favourite` as it was. `favourite` is never in `editForm` or in `edit_book`'s input schema.
- **Backups.** A pre-Epic 16 library or backup migrates to version 4 with every Book `false`, and startup keeps `library.v3.bak.json`. Stars survive an export and restore round trip.
- **Agents** (read only): `get_book`, `list_catalog` and `get_home` carry `favourite` as stored, and no tool's description or arguments change. There is no `set_favourite` tool: it joins the never-registered names in the agent tests. `find_book` neither returns nor matches it.
- **Filter (16.2).** Favourites is its own group, ANDed with every other group and with Search titles. Books that don't match are hidden, not dimmed. "N books match." is announced. It is page state only: never stored or exported, reset on reload, on leaving the Catalog and when a Book is added, and never applied to Home's slice or the "X of Y finished" meter. `liveFilters` never turns it off. With nothing starred, the Catalog shows "No books match these filters." with "Clear filters", which turns every chip off.
- **Gate.** The per-epic quality gates, plus green P0 risks:
  - Edits on the web and with `edit_book` keep the star.
  - An old backup restores with no stars, and the star round-trips.
  - Starring and unstarring work from all four places, show in the other views after the refetch, and a no-op succeeds.
  - The chip shows exactly the starred Books in all three views and ANDs with Unread, a Tag and a Search title.
- **Existing tests.** Only the leaves the epic's gate lists may change. Examples: the schema-version pins move from 3 to 4, and "newer version" pins become 5. The field and route sets gain `favourite` or `set-favourite`. Some e2e Tab, button-count and legend leaves change. For 16.2, "Clear filters" focuses Favourites, and the toolbar Tab order starts with it. Every other existing test passes unchanged.
- **Out of scope:**
  - a favourites filter on Card notes or the Boxes shelf search
  - an agent tool that sets the star
  - a Favourites sort, a Stats count or a favourites page
  - reporting in `preview_restore` the stars a restore would lose
  - an optimistic star with rollback
  - behavior that only Safari or Firefox shows
  - Mac checks: this epic needs none

## Technical Decisions

- **Migration (AD-13/AD-14).** Version 4 adds `favourite: false` to every Book. `store/migrations` `CURRENT_VERSION` and `domain/model` `SCHEMA_VERSION` both become 4. The chain test must still prove it contiguous from 1.
- **Intent (AD-3).** The intent is a new module `intents/set_favourite`, routed in `http/api`. Its body is `multipart/form-data` with a JSON `intent` part, like every intent, even with no file. The `book_not_found` check runs inside the commit.
- **The contract starts in Python (AD-8).** Add `favourite` to `ShelfBook` and `BookDetailView` in `views/models.py`, fill them in `views/shelf`, then run `npm --prefix frontend run api:gen`. Never edit or format `schema.d.ts` by hand.
- **Fixtures.** `backend/tests/builder.py`'s default Book gets `"favourite": False`, and `tests/helpers.py`'s `EMPTY_LIBRARY` and `STORED_BOOK_KEYS` follow. Frontend and e2e fixtures add it through the shared builders.
- **No optimistic UI (AD-7).** The star changes only after the save succeeds and the views refetch. A failure leaves it as it was, so there is nothing to roll back.
- **Spine names (`lib/catalog` `spineNames`).** A starred Book's name ends with ", favourite" after the status. Twins are found on the name without it, so starring one Book never renames another.
- **Filter rules (AD-6, `lib/catalogFilter.ts`).** Add `CatalogFilters.favourites: boolean`, its entry in `NO_FILTERS`, `FilterableBook.favourite` and the match in `matchesFilters`. `liveFilters` leaves Favourites alone.
- **Chip.** The chip lives in `components/FilterChips.tsx`, and `pages/CatalogPage.tsx` wires it.
- **Unstar with the chip on.** `pages/CatalogPage` owns the focus move and the combined message, never the star's own flow or `useSpinePopover`'s fallback.
- **Gold tokens (UX-DR101).** `favourite` `#9A7120` and `favourite-dark` `#D2A54E` move from `{components.favourite-star}`'s literals into DESIGN.md's `colors` and `tokens.css` in the same change. `tokens.css` copies DESIGN.md character for character, and never run a formatter on it.
- **The spine already covers this epic.** It was updated before the epic: AD-18 (the field), AD-13 (version 4), AD-3 (`set-favourite`), AD-6 (the Favourites group), AD-21 (read only) and the FR-31 capability-map row.

## UX & Interaction Patterns

- **Star control.** A `button` with `aria-pressed`, holding one SVG star path with no glyph character. The icon is `aria-hidden` and the button has no visible text. It is filled gold when starred and an outline when not. It is never disabled.
  - **Names.** It is "Favourite" on Book detail and in the Spine popover, and "Favourite *Title*" on a tile or List row. e2e matches with `exact: true`.
  - **Messages.** After the change, `status` announces "*Dune* is a favourite." or "*Dune* is not a favourite."
  - **Couldn't save.** The star stays as it was, and `alert` says "Couldn't save. Your data wasn't changed." The line sits under the title row on Book detail and in an open popover. On Tiles and List, or once the popover has closed, it shows once under the filter row. It is emptied at the next save or filter change, and focus doesn't move.
- **Book detail.** A plain icon button `{spacing.3}` after the `h1`, centered on its first line, always shown.
- **Tiles.** The star is a bare star with a paper halo at the 2:3 cover box's top left, never over the finished ribbon. Starred is always shown. Unstarred is drawn only on hover or focus-within, at once. The button is a sibling after the tile's link, so Tab goes link, star, next tile.
- **List.** The star sits `{spacing.2}` after the title link in the title cell. The row is no taller. Hover and focus follow the tile rules.
- **Spine popover.** The button comes right after the title and is first in the DOM. On open, focus goes to the primary action, never the star. Shift+Tab from there reaches the star, and Shift+Tab from the star closes the popover and returns focus to the spine.
- **Spine mark.** A small paper square with a gold star at the spine's foot. It also shows over a Main book's fill and next to a marker dot. It is not a control. It appears on the Catalog's bookcase and on Home's slice. The legend always shows a "favourite" item.
- **Forced colors.** Every star uses `forced-color-adjust: none`: a `CanvasText` fill (starred) or stroke (unstarred), on a `Canvas` halo or square. Gold fills only stars, and a Reading's rating stars stay sage. No animation.
- **Favourites chip.** It is first in the row, before Status: a lone toggle (not in a `role="group"`) named "Favourites", with no popup and a leading `aria-hidden` gold star. When on, it uses the selected chip style with the check glyph before the star. It shows whenever the Catalog has Books.
- **Unstar with the chip on.** Once the refetch renders, focus goes to the next remaining Book in sort order: its tile link, its row's title link or its spine. Else it goes to the previous Book, else to Search titles. One message is announced: "*Dune* is not a favourite. 11 books match." From the popover, the popover closes with its spine first.

## Cross-Story Dependencies

- Before Story 16.1, resolve any unresolved "spine drift" entries in `deferred-work.md` (Epic 15's reconciliation landed in `d75b35e`).
- Story 16.2 depends on 16.1's `ShelfBook.favourite`. It also depends on the star's save and announcement flow, which the unstar-with-chip-on path reuses.
- Story 16.2 closes the epic. After it come test automation, the Epic 16 retrospective and its before-next-epic items. Don't start the next epic first.
