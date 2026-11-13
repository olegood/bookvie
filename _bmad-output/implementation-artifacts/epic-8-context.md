# Epic 8 Context: See the catalog as covers

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Add **Tiles**, a third Catalog view next to Bookcase and List: a grid of book covers in the current sort and filters. It lets Oleg find a Book by its cover instead of its title. Each tile opens its Book. Read Books carry a bookmark ribbon in their spine color, and Books being read show a reading bar. A Book without a cover gets a typeset cover so the grid never looks broken. The bookcase stays the default and main picture. Tiles are another way to see the same Catalog, and it behaves the same in every way.

## Stories

- Story 8.1: See my catalog as covers
- Story 8.2: See what I've read and what I'm reading on the tiles
- Story 8.3: Give books without a cover a typeset cover

## Requirements & Constraints

- Toggle: Bookcase (default) · List · Tiles. The choice is remembered on this computer and is not exported. A restore neither brings nor replaces it. An unknown stored value falls back to Bookcase.
- Search titles, Sort and the filter chips apply to Tiles exactly as to the other views. Non-matching tiles are `hidden` and the grid closes up. The same "N books match." status, empty shelf and no-match states ("No titles match “query”.", "No books match these filters." with "Clear filters") apply.
- Each tile is one link to Book detail. A tile has no buttons and no popover; the Spine popover belongs to the bookcase only.
- Status never depends on color or shape alone. The tile's accessible name carries it, and the ribbon and bar are `aria-hidden`.
- Status marks:
  - Finished ribbon when the view's `finished` is true.
  - Reading bar when `percent` is non-null.
  - A re-read shows both.
  - An unread Book with no Reading has no mark.
  - Up next, Waiting and Side read have no mark of their own; they appear only in the name.
- Performance (scale is about 500 Books):
  - All tiles are in the page, with no virtual rows, so find-in-page and Tab reach every one.
  - With 500 Books, each with a 1200px cover, the grid and the first screen of covers render in about 1 s in Chromium at 1280px.
  - Scrolling to the end shows no layout shift.
  - If this check fails, record the measurement and open a follow-up story for cover thumbnails. A failure does not block the epic.
- Epic gate: the per-epic quality gates:
  - P0 = 100%, P1 ≥ 95%.
  - Every error code has an API test.
  - `check:api` is clean.
  - Coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.

## Technical Decisions

- **API:** the catalog view's `ShelfBook` gains `coverFile`, the stored cover file name, or `null` without a cover.
  - Add it to the Python model in `views/models` first, then regenerate the TS schema with `npm --prefix frontend run api:gen`. Python is the contract's source of truth.
  - `check:api` must pass.
- **Client presentation only:**
  - Tiles render the same sorted, filtered array as the bookcase and List.
  - The ribbon reads the view's `finished` as is.
  - The bar fills to the view's `percent` as is, never recomputed from `currentPage`/`pages`.
- **Accessible name:** reuse the spine name builder (`lib/catalog` `spineName`/`spineNames`): "*Title* by *First author*, *status*", with the "and N others" rule and twin disambiguation.
  - `spineNames` runs over the whole catalog view, never a filtered subset.
  - Examples: "finished", "Main book, 64%", "finished, waiting for you, page 40".
- **Remembered view:** `lib/catalogView` gains the `tiles` value under the `localStorage` key `bookvie.catalogView`, with reads and writes wrapped in try/catch. `components/ViewToggle` becomes three options.
- **Covers:**
  - Source: `/media/<coverFile>` (`coverFile` is the stored `covers/<name>`; `lib/bookDetail` `coverSrc`) at the stored size (up to 1200px), served with immutable caching.
  - Load with `loading="lazy"`, `decoding="async"` and empty `alt`.
  - **No thumbnails.** Thumbnails stay deferred unless the speed check fails. Adding them would amend the cover-storage and export/restore decisions (AD-12 and AD-14) and need a backfill migration.
- **Code layout:**
  - New tiles grid page component alongside `pages/Bookcase` and `pages/CatalogList`, wired in `pages/CatalogPage`.
  - Styling uses CSS Modules over `frontend/src/styles/tokens.css`. No CSS framework.
- **Tokens:**
  - Tile values live in DESIGN.md `components.catalog-tile`. No new primitive tokens.
  - Copy any token DESIGN.md adds into `tokens.css` character for character in the story that first uses it. `e2e/app-shell.spec.ts` compares the two.
- **Superseded plan details:** DESIGN.md and the epics file override the earlier tiles plan where they differ:
  - The ribbon has no check glyph.
  - The name format is the spine name.
  - The unread typeset cover uses the `spine-unread-*` colors.

## UX & Interaction Patterns

- **Grid:**
  - A `list` named "Tiles, N books" on the plain page background, with no card and no planks.
  - Packed with `repeat(auto-fill, minmax(140px, 1fr))`, with 24px between columns and 32px between rows.
  - That gives 5 columns at 1024px, 7 at 1280px and 8 at 1440px.
- **Tile:**
  - A 2:3 cover box at the column width.
  - An 11px reserved reading-bar slot, always present so captions line up across a row.
  - Title in `book-title-sm` at weight 600, `ink`.
  - First author in `body-sm`, `ink-secondary`.
  - Title and author each sit on one line, cut with an ellipsis.
- **Cover in the box:**
  - Shown whole (`object-fit: contain`) at the bottom of the box, with 4px corners and a 1px `line` hairline. Never cropped, dimmed, tinted or shadowed.
  - While loading, the box shows a flat `surface-inset` fill with the same hairline. The box never changes size.
- **Focus and highlight:**
  - Each tile is one Tab stop in sort order. Enter opens Book detail.
  - The 2px accent focus ring and the post-add highlight ring go around the cover box, not the visible cover.
  - After an add: the new tile scrolls into view and gets focus and the highlight ring (instant under reduced motion). A search or filter that would hide it is cleared first.
  - After a delete: focus goes to Search titles.
- **Ribbon:**
  - A 16×24px bookmark with a 6px V-notch, hanging from the visible cover's top edge, 10px in from its right edge.
  - Filled with the exact `spineColor`.
  - A 1px `spine-edge` line on its sides and notch, and a 1.5px `spine-label-strip` halo outside that line.
  - No text or glyph.
- **Reading bar:**
  - 5px tall, 6px below the box, the box's width.
  - `accent-soft` track with `accent` fill, square ends.
- **Typeset cover, tiles only:**
  - Read: the exact `spineColor` fill with a 1px `spine-edge` border and 4px corners. A `spine-label-strip` plate, inset 10px from the sides and starting 34px from the top, holds the title (`book-title-sm` weight 400, up to 4 lines, `spine-label`) and the author (`meta`, 1 line). No text sits straight on the Book's color.
  - Unread: `spine-unread-fill` with a 1.5px `spine-unread-outline` border, text in `spine-unread-text`, and no plate.
  - It also replaces a cover image that fails to load.
  - The Main book card, the Up next thumbnail and Book detail keep the old no-cover placeholder.
- **Dark theme:**
  - Ribbon fill, halo, read typeset fill and plate stay the same in both themes.
  - `spine-edge`, the chrome colors and the `spine-unread-*` colors take their dark twins.
- **Forced colors:**
  - Ribbon and bar fill use `forced-color-adjust: none` with `CanvasText`.
  - The bar track becomes `Canvas` with a `CanvasText` outline.
  - The ribbon halo becomes `Canvas`.
  - The typeset cover becomes `Canvas` with a `CanvasText` border and text.
  - The cover hairline and the loading-box border become `CanvasText`.

## Cross-Story Dependencies

- 8.1 builds the foundation that 8.2 and 8.3 extend: `coverFile` in the API, the toggle, the grid, the tile link and name, and the reserved bar slot. 8.1 also updates existing unit and e2e tests that assume two view options.
- In 8.1, Books without a cover and covers that fail to load use the existing no-cover placeholder. 8.3 replaces it in Tiles only.
- 8.3's read typeset cover keeps its plate clear of 8.2's ribbon, which is why the plate starts 34px from the top.
- Epic 8 builds on Epic 7's Catalog sort, filters, view toggle and `localStorage` preferences, and on the bookcase's spine names, highlight-after-add and delete hand-off.
