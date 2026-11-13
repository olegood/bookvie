---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-13'
storyId: '8.1'
storyKey: '8-1-see-my-catalog-as-covers'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-81-see-my-catalog-as-covers'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md'
generatedTestFiles:
  - 'backend/tests/test_bookcase_view.py'
  - 'frontend/e2e/catalog-tiles.spec.ts'
  - 'frontend/src/lib/catalogView.test.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 8 intro and gate; Story 8.1; Stories 8.2 and 8.3 for the boundary)'
  - '_bmad-output/planning-artifacts/catalog-tiles-plan-2026-11-13.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Tiles, Catalog view toggle row, State Patterns)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.catalog-tile tokens, Catalog tile, Layout → Tiles, No-cover placeholder, Catalog view toggle, focus-ring, highlight-ring)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 Tiles bullet, AD-12 cover names, FR-25 row)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml, deferred-work.md (epic gate)'
  - '_bmad-output/test-artifacts/atdd-checklist-7-2-filter-my-catalog.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/models.py (ShelfBook has has_cover but no cover_file; HomeMainBook.cover_file is covers/<name>), backend/bookvie/views/shelf.py, backend/tests/builder.py, backend/tests/test_bookcase_view.py'
  - 'frontend/src/lib/catalogView.ts and its test, components/ViewToggle.tsx, components/Cover.tsx and Cover.module.css, pages/CatalogPage.tsx, pages/CatalogList.tsx, lib/catalog.ts (spineName, spineNames, sortBooks)'
  - 'frontend/e2e/bookcase.ts, fixtures.ts (startSeededServer), home.ts (stopAndRemove), intents.ts (COVER_PNG), bookcase.spec.ts, catalog-sort.spec.ts, catalog-filter.spec.ts, delete-book.spec.ts, catalog-pace-calculator.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the catalog view, when it is fetched, then every ShelfBook carries coverFile (the stored cover file name, null without a cover), added to the Python model first and then to the generated schema with api:gen, and check:api passes (AR25)' }
  - { id: AC-2, idSource: generated, text: 'Given the Catalog toolbar, when it renders, then the "Catalog view" group offers Bookcase (default) · List · Tiles as three toggle buttons with aria-pressed, in the theme toggle''s look (UX-DR54), and choosing Tiles is remembered in localStorage under bookvie.catalogView (try/catch); an unknown stored value still falls back to Bookcase, and a restore neither brings nor replaces the choice (AR26)' }
  - { id: AC-3, idSource: generated, text: 'Given Tiles is chosen, when the Catalog renders, then the Books appear as a list named "Tiles, N books" on the plain page background, packed with repeat(auto-fill, minmax(140px, 1fr)), 24px between columns and 32px between rows, so a 1280px window shows 7 columns (UX-DR55); each tile is one link to Book detail, holding a 2:3 cover box, an 11px reserved reading-bar slot, the title in book-title-sm at weight 600 and the first author in body-sm ink-secondary, each on one line cut with an ellipsis; and the link''s accessible name is the spine''s name, built by the same function, with the same "and N others" rule and twin disambiguation (AR24, UX-DR58)' }
  - { id: AC-4, idSource: generated, text: 'Given a Book with a cover, when its tile renders, then the cover is /media/covers/<coverFile> with loading="lazy", decoding="async" and empty alt, shown whole (object-fit: contain) at the bottom of the box with 4px corners and a 1px line hairline, never cropped, dimmed or shadowed; and until it loads the box shows a flat surface-inset fill with the same hairline, and the box never changes size, so nothing in the grid moves as covers arrive' }
  - { id: AC-5, idSource: generated, text: 'Given a Book without a cover, or a cover that fails to load, when its tile renders, then the box shows the existing no-cover placeholder at the box size (Story 8.3 replaces it with the typeset cover)' }
  - { id: AC-6, idSource: generated, text: 'Given Search titles text, a sort or filter chips, when they change in Tiles, then tiles follow the same sorted array as the bookcase and List, non-matching tiles are hidden and the grid closes up, and the status region reads "N books match." as in the other views (AR24); and "No titles match “query”.", "No books match these filters." with "Clear filters", and the empty shelf with New book show in place of the grid' }
  - { id: AC-7, idSource: generated, text: 'Given Tiles is showing, when I add a Book with the New book panel, then the new tile is scrolled into view in the current sort, focused and given the highlight ring around its cover box (instant under reduced motion), and a search or filter that would hide it is cleared first' }
  - { id: AC-8, idSource: generated, text: 'Given I delete a Book from its page, when I land back on the Catalog in Tiles, then focus goes to Search titles, as in the other views' }
  - { id: AC-9, idSource: generated, text: 'Given a tile, when I Tab through the grid and press Enter, then each tile is one Tab stop in sort order with the 2px accent focus ring around its cover box, and Enter opens Book detail' }
  - { id: AC-10, idSource: generated, text: 'Given a seeded library of 500 Books, each with a 1200px cover, when I switch to Tiles in Chromium at 1280px, then the grid and the first screen of covers render in about 1 second, and scrolling to the end shows no layout shift (FR-25, NFR7); and if this fails, the story records the measurement and a follow-up story for cover thumbnails is opened (AR26)' }
  - { id: AC-11, idSource: generated, text: 'Given the existing unit and e2e tests that assume two view options, when this story lands, then they cover the three options, and Bookcase and List behave as before' }
---

# ATDD Checklist: Story 8.1 See my catalog as covers

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Story:** `epics.md` Story 8.1 has 11 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-11 in source order (registry above).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments load. Contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`.
- **Epic gate:** passed. 8.1 is the first story of Epic 8. In `sprint-status.yaml`, `epic-7` and `epic-7-retrospective` are `done`. Every "spine drift" entry in `deferred-work.md` has a `resolved:` line. The one match without one (`deferred-work.md:827`, under 6.4) only refers to a drift entry above it. The last commit, `3c63194`, reconciled the spine before Epic 8.
- **What exists today:**
  - `ViewToggle` maps `CATALOG_VIEWS` (`['bookcase', 'list']`) to buttons, and `lib/catalogView.ts` reads and writes `bookvie.catalogView` inside try/catch. A stored `tiles` counts as junk today and falls back to Bookcase.
  - `CatalogPage` renders `Bookcase` or `CatalogList` from one `sorted` array and one `shown` set (search and filters). `focusTargets` holds what an add focuses, `highlightId` drives the ring for `HIGHLIGHT_MS`, and the delete hand-off focuses `searchRef`.
  - Spine names come from `spineNames` (`lib/catalog.ts`): "Title by First author[ and N others][, twin qualifier], status".
  - `Cover` (`components/Cover.tsx`) has the no-cover placeholder: `surface-inset` fill, 1.5px dashed `spine-unread-outline`, two bars, `role="img"` "No cover", sized for 200×300 or 44×64.
  - **The backend has to change.** `ShelfBook` has `has_cover` but no `cover_file`. `HomeMainBook`, `HomeUpNext` and `BookDetailView` carry `cover_file` as stored, `covers/<name>`, and the client builds `/media/<coverFile>` with `coverSrc`.
  - DESIGN.md's `components.catalog-tile` tokens aren't in `tokens.css` yet. The plan says they're copied in the story that first uses them, and `e2e/app-shell.spec.ts` compares them.
- **Boundary with Stories 8.2 and 8.3:** 8.1 owns the toggle's third option, the grid, the tile's box, slot and caption, the link and its name, cover loading, the placeholder, search, sort and filters, the add, delete and keyboard hand-offs, and the speed check. 8.2 owns the ribbon and the reading bar (8.1 only reserves the 11px slot). 8.3 owns the typeset cover. 8.1 shows the existing placeholder.

## Generation Mode

**AI generation**, run sequentially in this session, without subagents, as for 7.1 and 7.2. The tiles don't exist yet, so there is nothing to record. The leaves reuse `bookcase.ts`'s locators, the add flow from `catalog-sort.spec.ts`, and the delete flow from `delete-book.spec.ts`.

There is one API leaf (AC-1, pytest), because that criterion is the server's contract. There is one unit leaf (AC-11), because the criterion is about the existing tests and `catalogView.test.ts` is the unit test that assumes two options. The other nine are E2E.

## Test Strategy

There is one red leaf per criterion, 11 in all. Every E2E leaf runs at 1280×900 in light theme under the default Author sort.

**Seed (`TILE_SHELF`):** nine Books, seeded out of order. Under Author they stand as below: seven on row 1 at 1280px and two on row 2.

| Author order | Title | First author | Why it's there |
|---|---|---|---|
| 1 | Bleak House | Charles Dickens | finished |
| 2 | The Visual Display of Quantitative Information, Second Edition | Edward R. Tufte | the title needs an ellipsis |
| 3 | Dune (edition 1) | Frank Herbert | twin; cover `covers/dune.png` |
| 4 | Dune (edition 2) | Frank Herbert | twin; no cover |
| 5 | Emma | Jane Austen | |
| 6 | Kindred | Octavia E. Butler | cover file that isn't an image (fails to load) |
| 7 | Good Omens | Terry Pratchett (+1) | "and 1 other" |
| 8 | The Science of Discworld | Terry Pratchett (+2) | "and 2 others" |
| 9 | Austerlitz | W. G. Sebald | finished |

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | API | P0 | **The catalog's `books[]` carry `coverFile`: `covers/dune.png` for Dune and `None` for Emma.** Then `hasCover` agrees. | The server's view contract (AD-6, AD-8) |
| AC-2 | E2E | P1 | **The `Catalog view` group's buttons are Bookcase, List, Tiles.** Then Bookcase is pressed by default. Clicking Tiles presses it and unpresses the other two. The grid shows and the bookcase and table are gone. The pressed option's background, color, border, font size and height equal the pressed Theme option's. `bookvie.catalogView` holds `tiles`, and a reload keeps Tiles. | The control, its state and its look exist only in the browser |
| AC-3 | E2E | P0 | **The list is named "Tiles, 9 books".** Then it has 9 list items with one link each. The link names equal the spine names in Author order, including the twins' "edition 1"/"edition 2" and "and N others". The grid is `display: grid`, with 7 columns (each ≥ 140px), a 24px column gap, a 32px row gap and a transparent background. Seven tiles share row 1's top. The cover box is 2:3, and the title starts 19px (11px slot + 8px caption gap) below it. The title is `ui-serif` 15.5px weight 600. The caption shows the first author only, in 14px `ink-secondary`. Title and author are `nowrap`, `ellipsis` and `overflow: hidden`, and Tufte's title really overflows. After switching to Bookcase, the spines' `aria-label`s equal the same list. | Layout, type and names meet only in the page. AR24 |
| AC-4 | E2E | P1 | **Dune's `img` has `src="/media/covers/dune.png"`.** Then it has `loading="lazy"`, `decoding="async"` and `alt=""`. While the image is held back (`page.route`), the box shows a `surface-inset` fill with a 1px solid `line` border. Once the image has loaded, the box has the same rectangle. The image is `object-fit: contain` at `object-position` … 100%, with 4px corners, a 1px `line` border, no shadow, no filter and opacity 1. Its bottom is on the box's bottom and it stays inside the box. | Image loading and layout stability are browser behavior |
| AC-5 | E2E | P1 | **Dune (edition 2)'s box is filled by an element with a `surface-inset` fill and a 1.5px dashed `spine-unread-outline` border** (the placeholder), and the tile has no `img`. Kindred's broken cover gives the same placeholder and no visible `img`. Kindred's box is the size of Dune (edition 1)'s. | The image error path is browser behavior |
| AC-6 | E2E | P0 | **After Sort → Title, the tiles read Austerlitz … Tufte in title order.** Then Search titles "dune" leaves the two Dunes, `status` reads "2 books match.", 7 items are `li[hidden]`, and the two Dunes sit side by side on one row, at most a gap apart. The Read chip leaves Austerlitz and Bleak House and announces "2 books match.". Read plus "dune" shows "No books match these filters." and hides the grid, and the later Clear filters brings back the Dunes. "zzz" shows `No titles match “zzz”.` with no grid. An empty library shows the empty shelf line and New book, with no grid. | Sorting, hiding, closing up and announcing meet only in the page. AR24 |
| AC-7 | E2E | P1 | **With 300 Books and Search titles "Book 001", after adding Swing Time, its tile is focused.** Then the panel is closed, the search is empty, 301 tiles show, the new tile is in the viewport, and `status` reads "Added Swing Time.". The element carrying the `accent` ring has the cover box's rectangle. | The add hand-off and the ring's placement |
| AC-8 | E2E | P1 | **After deleting Emma from Book detail, Catalog shows the list "Tiles, 2 books".** Then Search titles is focused, `status` reads "Deleted Emma.", and the tiles are Dune and Austerlitz. | The delete hand-off. Search titles already gets focus in Bookcase, so the Tiles grid is the part that fails first |
| AC-9 | E2E | P1 | **Tab from "How long until…?" lands on Bleak House's tile.** Then Tab moves to Tufte and Dune (edition 1). The focused tile's `accent` ring has the cover box's rectangle (a 2px outline, or a box-shadow ring). Enter opens `/book/<Dune id>` with the `h1` Dune. | The keyboard model |
| AC-10 | E2E | P1 | **The time from pressing Tiles until every `img` on the first screen is complete with a natural width is at most 1200 ms.** This runs on 500 Books, each with an 800×1200 JPEG of 20px colored blocks. The time is recorded as a test annotation. Then the list is named "Tiles, 500 books". Scrolling to the end a screen at a time, with a 100 ms pause per screen, gives a total `layout-shift` of 0, also recorded. | A performance check in Chromium at 1280px. NFR7 |
| AC-11 | Unit | P1 | **`readCatalogView()` with `tiles` stored returns `tiles`.** Then `CATALOG_VIEWS` is `['bookcase', 'list', 'tiles']`, `list` still reads as List, and junk (`mosaic`) still means Bookcase. | `catalogView.test.ts` is the unit test that assumes two options. The e2e ones are listed under "Existing tests the build must update" |

**Red today** (each leaf was un-skipped in a throwaway copy and run, with a 15 s timeout for the E2E leaves, and the copy was deleted):
- **AC-1** fails at its first assertion: `('Dune', 'missing') != ('Dune', 'covers/dune.png')`.
- **AC-2** fails at its first assertion: the toggle has two buttons, not three.
- **AC-3, AC-4, AC-7, AC-8 and AC-9** fail at their first assertion with "element(s) not found": the Tiles list, Dune's tile `img`, the new tile, the Tiles list, and Bleak House's tile.
- **AC-5** fails at its first assertion: the poll on Dune (edition 2)'s box times out, because there is no tile.
- **AC-6** fails at its first assertion: the poll on the tile names after the sort change. The sort change itself runs.
- **AC-10** fails at the transition: pressing Tiles throws "no Tiles option". Its setup (500 seeded Books, 500 cover files and the server start) ran cleanly.
- **AC-11** fails at its first assertion: `'bookcase' !== 'tiles'`.

One leaf failed in setup on the first run: AC-8 used `getByRole('dialog')`, but the Confirm dialog is an `alertdialog`. It was fixed and re-run red as above. No leaf fails because of a seed error.

**What the leaves pin (the contract for the build):**
- **API:** `ShelfBook.coverFile` is the stored value, `covers/<name>`, as Home's and Book detail's views name it, or `null`.
- **Toggle:** the buttons are exactly **Bookcase**, **List** and **Tiles**, in that order, in the `Catalog view` group. The stored value is `tiles`. A pressed option computes the same background, color, border, font size and height as the pressed Theme option.
- **Grid:** a `list` named `Tiles, N books`, with one `listitem` per Book (hidden ones included in the DOM). Each item holds exactly one `link`, whose accessible name is the spine's name (`aria-label` or `aria-labelledby`). The grid is CSS `grid`, with 24px and 32px gaps, columns of at least 140px, 7 columns at 1280px and a transparent background.
- **Tile:** inside the link is a descendant as wide as the list item at 2:3 (the cover box). The title's element starts 19px below the box. The title's text node holds the full title, and its element is `ui-serif`, 15.5px, weight 600, `nowrap`, `ellipsis`, `overflow: hidden`. The author line holds only the first author, at 14px in `ink-secondary`.
- **Cover:** an `img` with `src` `/media/covers/<name>`, `loading="lazy"`, `decoding="async"` and `alt=""`. It is `object-fit: contain`, bottom-positioned, with 4px corners, a 1px `line` border, no shadow, no filter and full opacity, inside the box and on its bottom edge. While the image loads, an element at the box's size has a `surface-inset` fill and a 1px solid `line` border. The box's rectangle doesn't change when the image arrives.
- **No cover:** an element at the box's size has the placeholder's fill and its dashed border, and there's no `img` (no visible one after an error).
- **Hiding:** non-matching tiles are `li[hidden]`, and the rest close up. The count and the no-match lines are the other views'.
- **Add:** the new tile's link is focused and in view, the search is cleared, and the `accent` ring is drawn by an element with the cover box's rectangle.
- **Keyboard:** "How long until…?" → Tab → the first tile. Each tile is one Tab stop. Enter follows the link to `/book/<id>`.
- **Speed:** ≤ 1200 ms from pressing Tiles to the first screen's covers decoded, and zero cumulative layout shift while scrolling to the end.

**Open for the build (not pinned):**
- **Where the hairline sits.** The leaves pin the 1px `line` border on the `img`. With `object-fit: contain` on an `img` that fills the box, the border would frame the box, not the visible cover. Sizing the `img` to the cover's own shape (max 100% each way, at the bottom) puts it on the cover. Either passes AC-4, but only the second matches "the visible cover".
- **What the empty part of the box looks like after load:** whether the `surface-inset` fill stays behind a narrow cover or goes. The DESIGN.md wording ("until the image arrives") suggests it goes.
- **The placeholder in a tile:** whether it keeps `role="img"` "No cover" inside the link, or is `aria-hidden`. The link's name already says everything.
- **`coverFile`'s shape.** AC-1 says "the stored cover file name" and AC-4 says `/media/covers/<coverFile>`. The stored value is `covers/<name>`, so the leaves pin the stored value on the wire (like the other views) and the final `src` in the page. If the build sends the bare name instead, AC-1's leaf has to change, and the spine's AD-6 bullet is then the drift.
- **The 1200 ms budget.** "About 1 second" with a fifth of slack. If AC-10 fails on Oleg's machine, record the annotation's measurement in the story and open the cover-thumbnail follow-up (AR26). Don't raise the budget.
- **Tokens.** `components.catalog-tile`'s tokens go into `tokens.css` in this story, character for character, and `app-shell.spec.ts` compares them.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **API, `check:api`:** the regenerated `schema.d.ts` has `coverFile: string | null` on `ShelfBook`, and `test_contract.py` passes.
- [ ] **Unit, the name builder:** if the build adds a tile-name helper rather than reusing `spineNames`, test that it returns `spineNames`' output (the AC says "built by the same function").
- [ ] **E2E, AC-2 restore:** after a restore, `bookvie.catalogView` is unchanged (Tiles stays Tiles, and List stays List), and the export holds no view key. `restore.spec.ts:123` already sets `list` before a restore, so extend it with `tiles`.
- [ ] **E2E, AC-2 unknown value and throwing storage:** `mosaic` stored opens Bookcase, and `localStorage` that throws still lets Tiles switch for the visit.
- [ ] **E2E, AC-2 keyboard:** Tab reaches Tiles after List, and Space or Enter presses it.
- [ ] **E2E, AC-3 widths:** 5 columns at 1024px and 8 at 1440px (DESIGN.md → Layout → Tiles).
- [ ] **E2E, AC-3 dark theme and axe:** run axe on Tiles in both themes, and check the caption colors' dark twins.
- [ ] **E2E, AC-4 forced colors:** the cover hairline and the loading box's border become `CanvasText` (DESIGN.md line 549).
- [ ] **E2E, AC-6 List and Bookcase parity:** with the same search and filters, the visible tile names equal the visible spine names, in the same order, under every sort.
- [ ] **E2E, AC-6 focus fallback:** when a focused tile is hidden by a filter change, pin where focus goes (the bookcase moves it to the nearest visible spine, and the List doesn't move it).
- [ ] **E2E, AC-7 reduced motion:** with `reducedMotion: 'reduce'`, the scroll is instant (`behavior: 'auto'`).
- [ ] **E2E, AC-7 filters:** with a filter on that would hide the new Book, the filter is cleared too (Story 7.2's `onSaved` already clears both).
- [ ] **E2E, AC-7 ring timing:** the highlight ring is gone after `HIGHLIGHT_MS`.
- [ ] **E2E, AC-9 mouse:** clicking a tile's cover or caption opens Book detail, and the cover `img` isn't a second Tab stop.
- [ ] **E2E, AC-10 repeat:** run the speed check three times and record the median. Don't put a burn-in loop in CI.
- [ ] **Docs:** if AC-10 fails, record the measurement in the story spec and open the cover-thumbnail story (ARCHITECTURE-SPINE → Deferred).

## Existing tests the build must update (AC-11)

- `frontend/e2e/bookcase.spec.ts:60` expects the toggle's buttons to be exactly `['Bookcase', 'List']`. That becomes `['Bookcase', 'List', 'Tiles']`, and its Bookcase and List steps stay as they are.
- `frontend/src/lib/catalogView.test.ts`: the new AC-11 leaf. The four existing cases stay.
- `frontend/e2e/catalog-pace-calculator.spec.ts:271` loops over `['bookcase', 'list']` for axe in both themes. Add `tiles` once the grid exists.
- `backend/tests/test_contract.py` and `frontend/src/api/generated/schema.d.ts` change when `ShelfBook` gains `coverFile`. Regenerate the schema with `npm --prefix frontend run api:gen`; `check:api` compares it byte for byte.
- `frontend/e2e/app-shell.spec.ts` compares `tokens.css` with DESIGN.md, so any `catalog-tile` tokens added must match it character for character.
- `tabIntoBookcase` (`bookcase.ts`) assumes the Tab stop before the bookcase is "How long until…?". AC-9 relies on the same being true for the grid.

## TDD Red Phase (current)

There is one skipped leaf per criterion, 11 in all:
- **API (1):** in `backend/tests/test_bookcase_view.py`, marked `@pytest.mark.skip(reason=RED_8_1)`.
- **Unit (1):** in `frontend/src/lib/catalogView.test.ts`, an `it.skip(`.
- **E2E (9):** in `frontend/e2e/catalog-tiles.spec.ts`, inside the `Story 8.1 See my catalog as covers (ATDD)` describe, each a `test.skip(`.

Each title carries exactly one `[P*] AC-n` (the pytest name carries `ac1_p0`).

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `test_bookcase_view.py:106` catalog books carry their cover file or null | P0 |
| AC-2 | `catalog-tiles.spec.ts:188` the Catalog view toggle offers Bookcase, List and Tiles, and remembers Tiles | P1 |
| AC-3 | `catalog-tiles.spec.ts:224` Tiles show the Books as a list of tiles, 7 to a row at 1280px, each one link named like its spine | P0 |
| AC-4 | `catalog-tiles.spec.ts:293` a cover is shown whole at the bottom of a box that never changes size, flat until it loads | P1 |
| AC-5 | `catalog-tiles.spec.ts:369` a Book without a cover, or with a cover that fails to load, shows the no-cover placeholder at the box size | P1 |
| AC-6 | `catalog-tiles.spec.ts:398` Search, Sort and filters reorder and hide tiles, announce the count, and the empty states replace the grid | P0 |
| AC-7 | `catalog-tiles.spec.ts:451` a Book added in Tiles is cleared into view, scrolled to, focused and ringed around its cover box | P1 |
| AC-8 | `catalog-tiles.spec.ts:483` after a delete, Catalog comes back in Tiles with Search titles focused | P1 |
| AC-9 | `catalog-tiles.spec.ts:501` each tile is one Tab stop in sort order, ringed around its cover box, and Enter opens Book detail | P1 |
| AC-10 | `catalog-tiles.spec.ts:529` with 500 Books with 1200px covers, Tiles shows its first screen of covers in about 1 second, and scrolling shifts nothing | P1 |
| AC-11 | `catalogView.test.ts:47` reads a stored Tiles choice and offers Bookcase, List and Tiles in that order | P1 |

**Skipped as committed** (run in this session):
- `uv run pytest tests/test_bookcase_view.py` gives 3 passed and 1 skipped. Its one warning is the existing Starlette deprecation at import.
- `node --test src/lib/catalogView.test.ts` gives 4 passed and 1 skipped.
- `TZ=Europe/Madrid npx playwright test e2e/catalog-tiles.spec.ts` gives 9 skipped.
- Prettier, `tsc -b` and oxlint are clean on the frontend files, and ruff is clean on the backend file.

## Data Factories, Fixtures and Mocks

- **No new factory or fixture.** The leaves use these existing helpers:
  - `seededServer`, and `startSeededServer` with `stopAndRemove` for leaves that need cover files.
  - `COVER_PNG` from `intents.ts`.
  - From `bookcase.ts`: `bookcase`, `spines`, `search`, `viewToggle`, `tabIntoBookcase`, `shelfOf`, `finished`, `SWING_TIME`, `TUFTE` and `ACCENT`.
- **New helpers, local to the spec:**
  - `bookId(n)` and `TILE_SHELF` with `TILE_FILES` (a real PNG, and a "cover" that isn't an image).
  - `withoutCover`, which drops `coverFile` for servers started with no files.
  - `tiles`, `tileLinks`, `tile`, `sortSelect` and `storeTiles` (sets the stored view before load).
  - `tileNames`, the visible links' names from `aria-label`, `aria-labelledby` or text.
  - `coverBox`, which finds the 2:3 box by geometry and lists the elements that fill it, with their fill and border. No class name is pinned.
  - `ringRect`, the rectangle of whichever element carries the `accent` outline or box-shadow.
  - `sameRect`, which compares two rectangles to within 1px.
- **Mocks:** AC-4 holds back Dune's cover with `page.route` and then lets it through unchanged. The other leaves run against the real server and the real cover files. AC-10 draws its JPEG on a canvas in the browser and writes 500 copies under 500 names.
- **No `data-testid`:** the leaves locate elements by role, accessible name, text and geometry.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time. For the API leaf, delete its `@pytest.mark.skip(reason=RED_8_1)` line. For the others, change `it.skip(` or `test.skip(` to `it(` or `test(`. Watch it fail, implement, then watch it pass. For E2E, run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-tiles.spec.ts`.

### Backend: `coverFile` (AC-1)
- [ ] Add `cover_file: str | None` to `ShelfBook` and fill it in `views/shelf.py`'s `_shelf_book`. Regenerate `schema.d.ts` with `api:gen`.
- [ ] Activate AC-1.

### The third option (AC-2, AC-11)
- [ ] Add `tiles` to `CatalogViewChoice`, `CATALOG_VIEWS` and `isCatalogView`, and add `Tiles` to `ViewToggle`'s labels. Update `bookcase.spec.ts:60`.
- [ ] Activate AC-11, then AC-2.

### The grid and its tiles (AC-3, AC-5)
- [ ] Add a tiles page component, such as `pages/CatalogTiles.tsx`, rendered by `CatalogPage` for `tiles` from the same `sorted`, `shown`, `noMatch`, `highlightId` and `focusTargets` as the other views. Name the list with a `tilesName(total)` next to `bookcaseName`. Name each link with `spineNames(books)`.
- [ ] Copy `components.catalog-tile`'s tokens into `tokens.css`, and lay out the grid, box, slot and caption from them.
- [ ] Render the placeholder at the box size for `coverFile === null` and after an `img` error.
- [ ] Activate AC-3, then AC-5.

### Covers (AC-4, AC-10)
- [ ] Add an `img` with `src={coverSrc(coverFile)}`, `loading="lazy"`, `decoding="async"` and `alt=""`, shown whole at the bottom of a fixed box that has the loading fill.
- [ ] Activate AC-4, then AC-10. Record AC-10's measurement in the spec either way.

### Search, sort, filters and empty states (AC-6)
- [ ] Hide items with `hidden` from `shown`, and show `noMatch` in place of the grid. The empty library already renders `EmptyShelf`.
- [ ] Activate AC-6.

### Hand-offs and keyboard (AC-7, AC-8, AC-9)
- [ ] Register each tile link in `focusTargets`. Put the highlight ring and the focus ring on the cover box (for example, `:focus-visible` on the link styles the box).
- [ ] Activate AC-7, AC-8 and AC-9.

## Completion

- **Test files:** `backend/tests/test_bookcase_view.py` (1 skipped leaf added), `frontend/src/lib/catalogView.test.ts` (1 skipped leaf added), and `frontend/e2e/catalog-tiles.spec.ts` (new, 9 skipped leaves).
- **Checklist:** this file. **Story key:** `8-1-see-my-catalog-as-covers`. **Story:** `epics.md` Story 8.1. There is no spec file yet, and `sprint-status.yaml` still reads `backlog`.
- **Next:** `bmad-build-auto` for story 8.1 (AGENTS.md "Story pipeline"). Its build turns these leaves on. Then come `bmad-code-review` in a new session and `bmad-testarch-automate`.
