---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-15'
storyId: '10.1'
storyKey: '10-1-reverse-the-catalog-order'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-101-reverse-the-catalog-order'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-10-1-reverse-the-catalog-order.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-sort-direction.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 10, Story 10.1; AR28, UX-DR63, UX-DR64)'
  - '_bmad-output/planning-artifacts/catalog-sort-direction-plan-2026-11-15.md (D1–D9, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Sort select line 128, Sort direction toggle line 129, Ordering lines 286 and 299, Names line 389)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.sort-direction-toggle line 229, contrast lines 522–523, Forced colors line 570, Catalog line 612, Sort select and Sort direction toggle lines 664–665)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 catalog sort line 98, AD-15 line 212, Seed lines 382–383, map line 395)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/implementation-artifacts/deferred-work.md (epic gate: no unresolved spine drift)'
  - '_bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/lib/catalog.ts, src/lib/catalogSort.ts, src/components/SortSelect.tsx (+ .module.css), src/pages/CatalogPage.tsx, src/pages/HomePage.tsx, src/styles/tokens.css'
  - 'frontend/e2e/catalog-sort.spec.ts, bookcase-details.spec.ts, catalog-filter.spec.ts (APP_STORAGE_KEYS), catalog-tiles.spec.ts (empty library), bookcase.ts, home.ts, tiles.ts, library.ts, stats.ts, card-note-add-another.ts, fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a browser that stored only bookvie.catalogSort = "dateAdded" before this story (no reversal key), when the Catalog opens, then the order is newest first, exactly as before, and the toggle reads "↑ Newest first"; and with nothing stored, the order is Author A–Z and the toggle reads "↑ A–Z" (AR28)' }
  - { id: AC-2, idSource: generated, text: 'Given a non-empty Catalog, when it renders, then the Sort direction toggle is joined to the Sort select''s right edge as one compound field: the same height and border, the shared edge drawn once, surface-inset fill, an ink-secondary arrow then the order''s text in body-sm/ink, its minimum width that of the current key''s wider label (UX-DR63); and on an empty Catalog neither the select nor the toggle shows' }
  - { id: AC-3, idSource: generated, text: 'Given each of the four keys in its natural direction, when I press the toggle (click, Enter or Space), then the bookcase, the list and the tiles reorder to exactly the reversed key order, and the toggle''s text changes: "A–Z" to "Z–A" (Author, Title), "Newest first" to "Oldest first", "Fewest first" to "Most first", with the arrow from ↑ to ↓; and pressing it again restores the natural order and text; and the controls to its right don''t move when it''s pressed' }
  - { id: AC-4, idSource: generated, text: 'Given two Books with the same first author, and two with the same title, when the order is reversed, then the tied Books keep title A–Z, then the Book added earlier first, exactly as in the natural direction: only the key''s own order flips (AR28)' }
  - { id: AC-5, idSource: generated, text: 'Given Author reversed (Z–A), when I choose Pages in the Sort select, then the order is fewest first, the toggle reads "↑ Fewest first", and the stored reversal is not reversed, so a reload still shows fewest first' }
  - { id: AC-6, idSource: generated, text: 'Given the order reversed, when I reload the page, or open Home, then the Catalog is still reversed, and Home''s bookcase slice packs its rows in the reversed order before choosing them; and bookvie.catalogSortReversed holds the reversal, bookvie.catalogSort keeps its old format, and neither is in an export; a restore neither brings nor replaces them' }
  - { id: AC-7, idSource: generated, text: 'Given storage that throws, a junk bookvie.catalogSortReversed, or a stored key that isn''t one of the four, when the Catalog opens, then the order is the key''s natural direction (Author A–Z for a bad key) and the Catalog still sorts; and a write that fails still reverses the order for this visit, with no message' }
  - { id: AC-8, idSource: generated, text: 'Given a screen reader or keyboard user, when they reach the toggle, then it is a plain button with no aria-pressed, its accessible name is its visible text with the arrow aria-hidden, and the select and the toggle sit in a role="group" labelled by the visible "Sort" label; and it is the next Tab stop after the Sort select, a press keeps focus on it, and the status region stays silent; and the bookcase''s arrow-key order follows the reversed order (UX-DR64)' }
  - { id: AC-9, idSource: generated, text: 'Given the select or the toggle has focus, when it renders, in light, dark or forced-colors: active, then the focused half is drawn above the other so its halo or focus ring isn''t hidden by the shared edge, there is no hover change, and under forced colors the toggle is ButtonFace with ButtonText text, border and arrow, the shared edge still visible' }
---

# ATDD Checklist: Story 10.1 Reverse the catalog order

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 10.1 has 9 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-9 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`. There is no story spec file yet; the story is the `epics.md` section, as for 9.1 and 9.2.
- **Epic gate:** 10.1 is Epic 10's first story. `epic-9-retrospective` is `done`, and so are all its action items (67 and 68 included). Every "spine drift" entry in `deferred-work.md` has a `resolved:` line, the last one (`:1013`, Story 9.2) included. The gate is clear. The spine already describes the reversal as "Story 10.1, planned" (AD-6 `:98`, AD-15 `:212`, Seed `:383`, map `:395`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `lib/catalog.ts` `sortBooks(books, key)`: one `PRIMARY` compare per key, then title, `createdAt` older first, then id. Date added is already newest first (`byCreatedAt(b, a)`).
  - `lib/catalogSort.ts`: `bookvie.catalogSort`, read and written in try/catch; junk or a storage error reads as `author`. No reversal key.
  - `components/SortSelect.tsx`: a `div` with a `<label htmlFor>` "Sort" and the native `select`, its own rounded border on every corner. No group role, no toggle.
  - `CatalogPage.tsx:292` `chooseSort` sets and writes the key. `:316` renders the select only when the catalog isn't empty. `HomePage.tsx:70` reads the key once per visit and sorts the slice with it.
  - **No backend change and no API leaf.** The reversal never reaches the server (AD-15). Export and restore are covered by the follow-ups below.

## Generation Mode

**AI generation**, run sequentially in this session, as for 8.1 to 9.2. No recording was needed: the toolbar, bookcase, List, Tiles and Home's slice already ship, and their roles and names are in `bookcase.ts`, `tiles.ts` and `home.ts`. Every criterion is about what the browser shows or does after a press, a key change or a reload, so all 9 leaves are E2E. The helpers' pure parts (`sortBooks` with `reversed`, the label table, the read and write of the reversal) get unit tests in the build, next to `catalog.test.ts` and `catalogSort.test.ts` (plan §4).

## Test Strategy

**Seeds.** `SORT_SHELF` is Story 7.1's shelf, copied into `sort-direction.ts` because a spec can't be imported. Every key orders it differently. Its two Dune editions tie on everything but the id, so a reversal that flips the tie-breaks, or a plain `reverse()`, puts the finished one first and fails. `TIE_SHELF` has two Austens (Emma is newer than Persuasion) and two Dune editions (edition 1 added earlier), seeded in an order a stored-order sort would show. AC-6 uses Story 7.1's 180-Book several-row slice.

**The stored "reversed" value is pinned to `"true"`** (plan D6, `"true"` / absent). AC-4 and AC-5 seed it to start reversed, so their first assertion is the criterion itself. How "not reversed" is stored (the key removed, or another value) is left open: the leaves assert only `!== "true"` and the natural order after a reload.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P0 | Only `catalogSort = "dateAdded"` stored. **The toggle's name is "Newest first".** Then: its text is `↑ Newest first`, the select shows Date added, the bookcase is `BY_DATE_ADDED`, and the key still reads `dateAdded`. Then storage is cleared and the page reloaded: "A–Z", `↑ A–Z`, Author, `BY_AUTHOR`. | The upgrade path: what an existing browser shows (Murat's P0) |
| AC-2 | E2E | P1 | **The toggle's background is `surface-inset`.** Then: 42px and the select's height and top. It starts where the select ends (within 0.5px). It has no left border, and the select's right border is 1.5px. Top, right and bottom are 1.5px solid `input-border`. The select's right corners are square, the toggle's left corners square and its right corners 9px (`rounded.md`). The arrow reads `↑` in `ink-secondary`, sits inside the toggle and comes before the text. The text is `ink` at 14px. Then an empty library: the empty-shelf line and New book show, with no Sort group, no select and no toggle. | Geometry and computed style only exist in the browser |
| AC-3 | E2E | P0 | Natural Author. **The toggle's name is "A–Z".** Then for each key, pressed by click (Author, Pages), Enter (Title) or Space (Date added), the bookcase is the exact reversed order (`AUTHOR_Z_A`, `TITLE_Z_A`, `OLDEST_FIRST`, `MOST_FIRST`), the text is `↓ Z–A` / `↓ Oldest first` / `↓ Most first`, and the Bookcase view button's box is unchanged. A second press restores the natural order and `↑` text. Under Pages the toggle keeps its width from "Fewest first" to "Most first" (the minimum width). Then the List rows and the tiles show `MOST_FIRST`, and a press in Tiles restores `BY_PAGES`. | The transition this story adds, in all three views |
| AC-4 | E2E | P1 | Author reversed, stored. **The bookcase is `TIES_AUTHOR_Z_A`** (Kindred, Emma, Persuasion, Dune ed. 1, Dune ed. 2). Then the name is "Z–A". Then Title (natural, after the reset) is `TIES_BY_TITLE`, and after a press `TIES_TITLE_Z_A`: the twins keep edition 1 (added earlier) first in both directions. | Order of real spines, from the browser's sort |
| AC-5 | E2E | P0 | Author reversed, stored; choose Pages. **The toggle's name is "Fewest first".** Then: `↑ Fewest first`, `BY_PAGES`, the stored reversal `!== "true"`, the key `pages`. After a reload, still "Fewest first" and `BY_PAGES`. Then in the app: Author reads "A–Z", a press gives `AUTHOR_Z_A` and stores `"true"`, Title reads "A–Z", `BY_TITLE`, and the stored reversal isn't `"true"` again. | The reset is a transition between two stored states |
| AC-6 | E2E | P1 | 180 Books, Pages stored, the toggle pressed, then a reload. **The Catalog is most first** (Book 001 … Book 180). Then: "Most first"; the reversal reads `"true"` and the key `pages` (its old format). Home through the nav link: 3 rows, `sliceRows` equals the 7.1 oracle `expectedSlice` over the most-first order, which differs from the fewest-first oracle at this width, with Main's row first. The same on a fresh load of Home. | Reload and Home's packing are browser state across pages |
| AC-7 | E2E | P1 | Title stored with the reversal `"yes"`. **The toggle's name is "A–Z".** Then `BY_TITLE`. The same for `''`, `'{"reversed":true}'` and `'1'`. Then `catalogSort = "shelves"` with the reversal `"true"`: Author, "A–Z", `BY_AUTHOR`. Then a new page whose storage throws after Pages reversed was stored: "A–Z", `BY_AUTHOR`; a click gives `AUTHOR_Z_A` and "Z–A"; after the announce delay `alert` and `status` are empty, and there is no page error. | Storage and reload are browser state |
| AC-8 | E2E | P1 | **A button named "A–Z" is visible inside the group named "Sort".** Then: a `BUTTON` of `type="button"` with no `aria-pressed`, `aria-label` or `aria-labelledby`, and the arrow `aria-hidden` with `↑`. The group holds the Sort select, is named through `aria-labelledby` (no `aria-label`), and the visible "Sort" text shows. Tab: select, toggle, Bookcase, then Shift+Tab back to the toggle. Enter, Space, Enter: the name goes Z–A, A–Z, Z–A, and focus stays on the toggle each time. The bookcase is `AUTHOR_Z_A`, and after the announce delay no `status` text was set. Arrow keys: the first spine is Beloved; ArrowRight gives Kindred, End the finished Dune, Home Beloved. | Roles, names, focus and keys in the browser |
| AC-9 | E2E | P2 | Focus the select. **`raisedHalf` is `'select'`.** Then the select's right border is `accent`. Tab: the toggle has focus, `raisedHalf` is `'toggle'`, and the outline is 2px solid `accent` at offset 2px. Hover with no focus: `surface-inset`, `input-border`, `ink`, unchanged. Dark: the twins of the background, border, text and arrow. Forced colors: the background is `ButtonFace`, the text, three borders and arrow are `ButtonText`, and the select's right border is 1.5px solid and not transparent. | Stacking, theme and forced-colors media only exist in the browser |

**Primary branch per criterion.** AC-3 is the transition: a press in each key's natural direction. AC-5 is the key change while reversed. AC-6 is the reload after a press, then Home. AC-7 opens with junk, the criterion's most common input, then the bad key, then throwing storage.

**What the leaves pin (the contract for the build):**
- A `role="group"` named "Sort" through `aria-labelledby` to the visible label. It holds the `select`, which keeps its own name "Sort" (so the 7.1 locators still work), and one `button type="button"`, the toggle.
- The toggle's text is an `aria-hidden` arrow (`↑` natural, `↓` reversed), then the label: "A–Z" / "Z–A", "Newest first" / "Oldest first", "Fewest first" / "Most first". There is no `aria-label`, so the accessible name is the label alone.
- `localStorage['bookvie.catalogSortReversed'] === 'true'` means reversed. Every other value, and an unreadable one, means natural. A stored key that isn't one of the four means natural too. A key change stores "not reversed".
- `sortBooks` flips only the primary compare, for the bookcase, List, Tiles and Home's slice (before `slicePriority` picks rows).
- The compound look from DESIGN.md's `components.sort-direction-toggle` (`border: 1.5px`, `radius: 0 9px 9px 0`, `height: 42px`). The select's right corners are square. The focused half is raised with `z-index` (`position: relative; z-index: 1`).

**Open for the build (not pinned):**
- **How "not reversed" is stored:** the key removed (plan D6) or a value other than `"true"`. If a value is written, see `catalog-filter.spec.ts` below.
- **Where the group lives:** inside `SortSelect`, or in a wrapper in `CatalogPage` around `SortSelect` and a new `SortDirectionToggle` (plan §4). Either way, the label's `htmlFor` keeps naming the select.
- **The toggle's padding (`spacing.3`) and arrow gap (`spacing.1`)**, and how the minimum width is reached (a CSS `min-width` per key, or a hidden sizer). The leaves pin only that the width doesn't change on a press under Pages.

## Existing leaves this story changes (for the build)

The epic gate says the existing catalog and home-slice specs pass unchanged with the toggle not pressed. **Two leaves can't**, because UX-DR64 adds a Tab stop between the Sort select and the view toggle:
- `catalog-sort.spec.ts:84` (Story 7.1 AC-1), lines 100–102: Tab from the Sort select expects Bookcase. Insert the toggle ("A–Z") as the stop between them.
- `bookcase-details.spec.ts:72` ("Tab order is Search titles, Sort, Bookcase, …"), lines 84–85: the same insertion. Update the title to name the toggle.

These are spec-mandated changes, not regressions. The build should record them in the story's spec as a known exception to the epic gate. Things to watch:
- `catalog-filter.spec.ts:30` `APP_STORAGE_KEYS` lists the app's only localStorage keys, and `:678` checks every stored key is among them. That leaf changes no sort, so it holds either way. If any leaf that changes the key starts storing `bookvie.catalogSortReversed`, add the key to the list.
- The toolbar gets wider by the toggle. Leaves that measure toolbar row 1 or New book's position (Catalog layout, `catalog-tiles.spec.ts`) and the axe passes over Catalog will see it.
- `catalog-sort.spec.ts` and `home-slice.spec.ts` otherwise run with no reversal stored, so they must pass unchanged.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Unit, `lib/catalog.ts`:** `sortBooks(books, key, true)` for each key is the natural order with only the primary compare negated: ties by title, `createdAt` and id stay put. `reversed` defaults to `false`, so today's calls are unchanged. (done: `frontend/src/lib/catalog.test.ts:161`, `:168`, `:174`)
- [x] **Unit, `lib/catalogSort.ts`:** `readCatalogSortReversed` reads `"true"` as reversed, and `null`, `''`, junk, a throwing `getItem` and a stored key that isn't one of the four as not reversed. `writeCatalogSortReversed` doesn't throw on a throwing `setItem`. The label table gives each key's two labels. (done: `frontend/src/lib/catalogSort.test.ts:70`, `:82`, `:89`, `:98`, `:105`, `:115`)
- [x] **E2E, AC-6 export and restore (AR27/AD-15):** the export zip holds neither `catalogSortReversed` nor `catalogSort`, and no request carries them. A restore from another library keeps the reversal as it was, both reversed and not (as in `card-note-add-another-automate.spec.ts:113`, with `zipEntries`, `exportOf` and `restoreFrom`). (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:77`)
- [x] **E2E, AC-6 Home with the reversal stored and the key Author** (the one-row `SORT_SHELF` slice): `AUTHOR_Z_A`, after both a fresh load and in-app navigation without a reload. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:134`)
- [x] **E2E, AC-7 Home with storage that throws** after a reversal was stored: the slice is in Author A–Z. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:165`)
- [x] **E2E, AC-3 Search titles and filters keep working while reversed:** "d" under Pages reversed shows Emma hidden, `[DUNE_UNREAD, DUNE_FINISHED, BELOVED, KINDRED]`, and a press keeps the search text and the filter chips. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:193`; the expected order was checked against the data, and the Unread chip is the filter pressed)
- [x] **E2E, AC-3 the List view press:** with List shown, a press reorders the rows and focus stays on the toggle. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:227`)
- [x] **E2E, AC-2 the minimum width for Author, Title and Date added:** the toggle's width doesn't change on a press. Also the padding (12px) and the arrow gap (4px), measured with a `Range` on the text node (probe first). (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:247`; A–Z and Z–A share glyphs, so only Date added can catch a broken minimum width; the narrower label is centred, so the gap and right padding are asserted on the wider label)
- [x] **E2E, AC-8 a new Book under Date added while reversed** (oldest first) goes to the end in sort order, and is still focused, in view and ringed (as `catalog-sort.spec.ts` "a Book just added is the first spine"). (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:284`)
- [x] **E2E, AC-8 the Tab stop stays on the last-focused Book across a press** (as `catalog-sort.spec.ts:288`). (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:321`)
- [x] **E2E, AC-9 axe** on the Catalog with the toggle in both states, in both themes. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:350`)
- [x] **E2E, AC-9 the dark-theme focus looks:** the select's border and halo, and the toggle's ring, use the accent dark twin. (done: `frontend/e2e/catalog-sort-direction-automate.spec.ts:377`)

## Helper probes

Run in `frontend/e2e/sort-direction.probe.spec.ts` (Chromium, 1280×900 viewport as in every leaf, `deviceScaleFactor` 1, `colorScheme: 'light'`; `systemColor` also under `forcedColors: 'active'`, as AC-9 calls it) with `TZ=Europe/Madrid npx playwright test e2e/sort-direction.probe.spec.ts`. All 3 passed, and the file was then removed with `rm`.

- **`spineOrder`** (`sort-direction.ts`), on the shipping Catalog with Pages stored: it returned `BY_PAGES` (expected) and refused `BY_AUTHOR`. After choosing Author and a reload, it returned `BY_AUTHOR`.
- **`stored`**: `'pages'` for `bookvie.catalogSort` (expected), refusing `'author'`; `null` for an absent key; `'author'` after the app wrote it.
- **`storeOnce`** (setup, probed because AC-1, AC-4 to AC-6 reload after it): it seeded `pages` on the first load, and after the app wrote `author` a reload kept `author` (it didn't seed again).
- **`raisedHalf`**, on `setContent` groups: plain → `'neither'`; select `position: relative; z-index: 1` → `'select'`; button the same → `'toggle'`; a flex item's `z-index` without `position` → `'select'`; a raised wrapper (z 3) around the select against a button at z 1 → `'select'`; a `z-index` on an unpositioned child of a block parent → `'neither'` (ignored, as the browser does). It refused `'select'` for the raised button.
- **`systemColor`**, under forced colors: `ButtonFace` `rgb(255, 255, 255)`, `ButtonText` `rgb(0, 0, 0)`; a `setContent` button styled `ButtonFace`/`ButtonText` had exactly those computed colors. It refused `ButtonText` for `ButtonFace`, and returned `rgb(1, 2, 3)` for an author color. **Limit:** in Chromium's emulated forced colors `Canvas` is also `rgb(255, 255, 255)`, so AC-9 can't tell `ButtonFace` from `Canvas` here.
- **Reused unchanged, so not probed:** `boxOf`, `recordStatus` / `statusTexts` (`card-note-add-another.ts`), `tileNames`, `tiles` (`tiles.ts`), `sliceRows`, `rowCapacity`, `expectedSlice`, `slice` (`home.ts`), `bookRows`, `tabIntoBookcase`, `shelfOf`, `finished` (`bookcase.ts`), `afterAnnounceDelay` (`stats.ts`), `rgbOf` (`library.ts`). `sortGroup`, `sortSelect`, `sortToggle` and `toggleArrow` are role and attribute locators.
- **Render-before-read**, checked over all 9 leaves. Each one-shot read runs after a web-first wait on what it reads:
  - AC-1's `stored` read and AC-5's run after an `expect.poll` on the bookcase order (the Catalog is drawn and has read storage).
  - AC-2's `boxOf` calls on the select and toggle run after `toHaveCSS` on the toggle, and the arrow's after `toHaveText('↑')`. Its empty-library absence reads run after the empty-shelf line and New book are visible.
  - AC-3's `boxOf` calls on the Bookcase button and the toggle run after the toggle's `toHaveAccessibleName` or `toHaveText` and the order poll.
  - AC-6's `stored` reads run after `toHaveAccessibleName('Most first')`, and `rowCapacity` after the slice's `toHaveAccessibleName('Bookcase slice, 3 rows')`.
  - AC-8's `tagName` read runs after the button's `toBeVisible`. `recordStatus` starts after `toBeFocused` on the toggle. `statusTexts` is read after the order poll and `afterAnnounceDelay`.
  - AC-9's `raisedHalf` reads are inside `expect.poll`. `systemColor` reads the page's palette, not the app.
  - AC-7's `alert` / `status` reads are web-first and run after the order poll and `afterAnnounceDelay`.
  - No leaf needed a fix.

## TDD Red Phase

9 skipped leaves in `frontend/e2e/catalog-sort-direction.spec.ts`, inside the `Story 10.1 Reverse the catalog order (ATDD)` describe. Each is a `test.skip(` carrying exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `catalog-sort-direction.spec.ts:60` a browser that stored only the Date added sort opens newest first reading "↑ Newest first", and with nothing stored Author A–Z reads "↑ A–Z" | P0 |
| AC-2 | `catalog-sort-direction.spec.ts:84` the toggle is joined to the Sort select as one compound field in surface-inset with an ink-secondary arrow and body-sm ink text, and an empty Catalog shows neither | P1 |
| AC-3 | `catalog-sort-direction.spec.ts:137` for each key the toggle reverses the bookcase, the list and the tiles, says the new order with ↓, restores on a second press, and the controls to its right stay put | P0 |
| AC-4 | `catalog-sort-direction.spec.ts:210` reversed, Books with the same first author keep title A–Z and Books with the same title keep the one added earlier first | P1 |
| AC-5 | `catalog-sort-direction.spec.ts:230` choosing another key while reversed gives that key's natural order, reads its natural label and stores not reversed | P0 |
| AC-6 | `catalog-sort-direction.spec.ts:262` the reversal survives a reload, Home packs its slice rows in the reversed order before choosing them, and the sort key keeps its format | P1 |
| AC-7 | `catalog-sort-direction.spec.ts:311` junk in the reversal key or a stored key that isn't one of the four opens the natural direction, and with storage that throws the toggle still reverses for this visit with no message | P1 |
| AC-8 | `catalog-sort-direction.spec.ts:373` the toggle is a plain button named by its visible text in a "Sort" group, the next Tab stop after the select, keeps focus on a press with status silent, and the bookcase arrows follow the reversed order | P1 |
| AC-9 | `catalog-sort-direction.spec.ts:432` the focused half is raised above the other, no hover change, the dark twins, and ButtonFace with ButtonText under forced colors with the shared edge still drawn | P2 |

**Red today.** This run came after all three probes passed, on the file as it is now (after Prettier). The leaves were un-skipped in a throwaway copy, `catalog-sort-direction.red.spec.ts` (the same line numbers), and run with a 30 s timeout. The copy was then removed with `rm`.
- **AC-1** fails at its first assertion (`:69`): no toggle for `toHaveAccessibleName('Newest first')`.
- **AC-2** fails at its first assertion (`:94`): no toggle for `toHaveCSS('background-color', …)`.
- **AC-3** fails at its first assertion (`:147`): no toggle for `toHaveAccessibleName('A–Z')`.
- **AC-4** fails at its first assertion (`:219`): the bookcase is in natural Author order, not `TIES_AUTHOR_Z_A`.
- **AC-5** fails at its first assertion (`:241`): no toggle for `toHaveAccessibleName('Fewest first')`.
- **AC-6** fails at its setup click on the toggle (`:285`), before its first assertion (`:288`). Precedent: 9.2 AC-3 to AC-7. The build should check that it goes red at `:288` once the toggle renders and before the reversal is stored.
- **AC-7** fails at its first assertion (`:329`): no toggle for `toHaveAccessibleName('A–Z')`.
- **AC-8** fails at its first assertion (`:382`): no button "A–Z" in a group "Sort".
- **AC-9** fails at its first assertion (`:443`): `raisedHalf` finds no group.

Each leaf's seed loaded and the Catalog drew (the order polls before each first assertion passed). `git status` afterwards lists only this checklist, the spec and its helper module, with no `*.probe.*` file and no throwaway copy.

**Skipped as committed:** `TZ=Europe/Madrid npx playwright test e2e/catalog-sort-direction.spec.ts` gives 9 skipped. Prettier, `tsc -b` and oxlint are clean.

## Data Factories, Fixtures and Mocks

- **No new shared factory or fixture.** The leaves use `seededServer` (`fixtures.ts`), `shelfOf` and `finished` (`bookcase.ts`), and the Home and Tiles helpers listed above.
- **New helper module `frontend/e2e/sort-direction.ts`** for 10.1's spec and the automate leaves to come: the two storage keys and `REVERSED`, the light and dark tokens, `bookId`, `SORT_SHELF` and `TIE_SHELF` with every natural and reversed order, the `sortGroup` / `sortSelect` / `sortToggle` / `toggleArrow` locators, `storeOnce`, and the measuring helpers `spineOrder`, `stored`, `raisedHalf` and `systemColor`.
- **Mocks:** none. Throwing storage is an init script on a second page (AC-7), as in `catalog-sort.spec.ts:228`.
- **No `data-testid`, no class names:** group, select, button, lists, spines, rows and tiles by role and name. The arrow is found by `aria-hidden="true"` inside the toggle, which the criterion itself names.

## Next Steps (Task-by-Task Activation)

During the build (`bmad-build-auto`), for each task:
1. Remove `test.skip(` from the leaf for the current criterion (keep the title).
2. Run `TZ=Europe/Madrid npx playwright test e2e/catalog-sort-direction.spec.ts` from `frontend/`.
3. Check that the leaf fails first, then passes once the task is built.
4. If an activated leaf still fails, fix the implementation (a feature bug) or the leaf (a test bug), and say which in the spec.

Suggested order: unit tests for `sortBooks(…, reversed)` and the `catalogSort` reversal. Then AC-8 and AC-2 (the group, the toggle and its look), AC-1 (the labels), AC-3 (the press in three views), AC-4, AC-5 (the reset), AC-7, AC-6 (Home) and AC-9. Update the two Tab-order leaves above when the toggle lands, then re-run `catalog-sort.spec.ts`, `home-slice.spec.ts`, `bookcase-details.spec.ts` and `catalog-filter.spec.ts`.

## Completion

- **Phase:** red. 9 skipped leaves in `frontend/e2e/catalog-sort-direction.spec.ts`, each confirmed red after the helper probes passed. 8 fail at their first assertion. AC-6 fails at the setup click on the missing toggle.
- **Checklist:** this file. **Story key:** `10-1-reverse-the-catalog-order`. **Story:** `epics.md` Story 10.1 (no story spec file yet, so no ATDD Artifacts link was added to one).
- **Assumptions to confirm:** the stored reversed value is `"true"` (plan D6). The arrows are `↑` U+2191 and `↓` U+2193, and the labels use the en dash `–` U+2013. The forced-colors check can't tell `ButtonFace` from `Canvas` in Chromium's emulation. Two existing Tab-order leaves must change despite the epic gate's "unchanged" wording.
- **Next:** `bmad-build-auto` for Story 10.1, then `bmad-code-review` in a new session, then `bmad-testarch-automate`. 10.1 closes Epic 10, so the Epic 10 retrospective follows.
