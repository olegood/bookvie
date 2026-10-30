---
title: 'Story 1.10: See the library as a bookcase'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '839eb7aae16f6b3035959206202c33d9acecb966'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Catalog shows only a table, so the library can't be read at a glance as read versus unread, and the cataloging skill has no spine to confirm a save on.

**Approach:** Client-only. Add the Bookcase view as the Catalog default: a `shelf-wall` card with a "BOOKCASE" header, the library meter, every Book as a spine button on birch planks, and a legend. A remembered "Catalog view" toggle (Bookcase · List) switches to the existing List view. Turn on the 11 ATDD scaffolds (`backend/tests/test_bookcase_view.py`, `frontend/e2e/bookcase.spec.ts`). The criteria are epics.md → Story 1.10, AC-1…AC-11 in the checklist.

## Boundaries & Constraints

**Always:** The names, roles and computed-style shapes in the checklist's "Contract the Scaffolds Pin". Every spine is in the DOM (no virtualization). The spine is the `button`: its border box is 28 × height, its own background is the fill, and its top/left/right borders are the edge or the unread outline with no bottom border. Height = `min(200, ceil((120 + 0.3 × w) / 8) × 8)`, where w is the label's measured one-line length in `spine-label`. The label is vertical text, one line, with an ellipsis, at most 88px long, on a 16px-wide strip of at most 96px (read spines only). Order with the existing `sortBooks`. Search titles keeps one `query` for both views. Arrow keys skip `hidden` spines and don't wrap. Under reduced motion the ring is instant and scrolling uses `behavior: 'auto'`. Forced colors follow DESIGN.md → Forced colors. Un-skip the scaffolds without weakening them.

Decisions: when the tab-stop spine is hidden, the stop moves to the nearest visible spine in sort order, and on a tie to the previous one. The moved stop stays when the search is cleared. Real focus moves only if that spine had focus, and goes to Search titles when no spine remains. The stored choice uses the key `bookvie.catalogView`; junk or a throwing storage means Bookcase. An empty library shows neither the toggle nor Search titles. With exactly one co-author the spine name reads "by *First author* and 1 other"; with more, "and N others". The list name "Bookcase, N books" counts all Books, even during a search ("1 book" when there is one). The spec was kept whole at ~2,200 tokens.

**Never:** No spine popover and no Enter/Space action (Stories 1.14, 3.2, 4.4). No markers or Main-book fill (Epics 3–4). No Sort select or filters (Epic 7). No server or contract change. No type-ahead. No planning-doc edits.

</frozen-after-approval>

## Code Map

- `frontend/src/pages/CatalogPage.tsx` -- owns `query`, `search()` with the debounced count, `onAdded` → `added` effect (scroll, focus, ring for `HIGHLIGHT_MS`, then announce), `EmptyShelf`. Add the view choice and render `Bookcase` or `CatalogList`. Rename `titleCells` to `focusTargets` (id → element) so both views register what gets focus after an add. Toolbar order: Search titles, toggle, **New book**.
- `frontend/src/pages/CatalogPage.module.css` -- `.bookcase`, `.row`, `.plank` (the empty shelf). Move the card and plank styles into the Bookcase module and have `EmptyShelf` reuse them, so both share one look.
- `frontend/src/pages/CatalogList.tsx` -- takes `titleCells`; rename the prop only. Its no-match line pattern (`noMatchCopy`) is reused by the bookcase.
- `frontend/src/lib/catalog.ts` -- `sortBooks`, `matchesTitle`, `noMatchCopy`. Add `spineName(book)` here.
- `frontend/src/lib/theme.ts` + `components/ThemeToggle.tsx` (+ `.module.css`) -- the storage try/catch and the segmented-control markup and look to copy for the view toggle.
- `frontend/src/pages/SearchTitles.tsx` -- add an optional `inputRef` prop on the input, so the page can focus it when no spine remains.
- `frontend/src/styles/tokens.css` -- all spine, shelf, plank and accent tokens already exist (light and dark). Add `--space-shelf-gap: 24px` only if needed.
- `frontend/src/api/views.ts` -- `ShelfBook` (`id`, `title`, `firstAuthor`, `authorCount`, `spineColor`, `finished`), `LibraryMeter` (`finished`, `total`). Read only.
- `frontend/e2e/catalog-list.spec.ts` (all tests), `new-book-panel.spec.ts` (the AC-5 row-focus test), `duplicate-dialog.spec.ts` (AC-8, the table focus check) -- they assume List is the default. Switch to List first by seeding `bookvie.catalogView` with `page.addInitScript`, or by clicking **List**.
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html` -- the reference markup for `.shelfcard`, `.meter`, `.strip`, `.lab` (`writing-mode: vertical-rl`) and `.legend`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/spine.ts` (+ `spine.test.ts`) -- `spineHeight(w)` and the tie rule `nearestVisible(ids, fromIndex, visible)`. Unit-test w = 0 → 120, 26.7 → 128, 26.8 → 136, > 240 → 200, and the ties.
- [x] `frontend/src/lib/catalog.ts` (+ test) -- `spineName(book)` ("and 1 other" / "and N others"), with no dangling "by" when `firstAuthor` is "".
- [x] `frontend/src/lib/catalogView.ts` -- `readCatalogView`/`writeCatalogView` ('bookcase' | 'list'), in the `theme.ts` style.
- [x] `frontend/src/components/ViewToggle.tsx` (+ `.module.css`) -- the "Catalog view" group with ThemeToggle's look and no glyphs.
- [x] `frontend/src/pages/Bookcase.tsx` (+ `Bookcase.module.css`) -- the card, the header with the `section-label` heading and the meter (`role="progressbar"`, 180 × 4 bar, visible "X of Y finished"), the `ul` "Bookcase, N books", the legend (finished · not read yet), and the no-match line in place of the list. Spines: `li > button` with `aria-label`, a strip span and a label span, and `--spine-color` on read spines. Heights are measured in a `useLayoutEffect` (read every label's `scrollHeight` first, then set a heights state). Roving tabindex and keys are on the `ul`'s `onKeyDown`. The highlight ring is a class on the button; the focus ring uses `:focus-visible` with an accent `outline` plus a `page` box-shadow band (see Design Notes).
- [x] `frontend/src/pages/CatalogPage.tsx` (+ css), `CatalogList.tsx`, `SearchTitles.tsx` -- wiring as in the Code Map.
- [x] `backend/tests/test_bookcase_view.py`, `frontend/e2e/bookcase.spec.ts` -- un-skip all 11. Update the three List-default specs.
- [x] `_bmad-output/test-artifacts/atdd-checklist-1-10-…md` -- tick the implementation checklist.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 11 Story 1.10 scaffolds active and every earlier test passing.
- Given an empty library, when Catalog opens, then only **New book** and the empty shelf show (catalog-empty AC-8 still passes).
- Given a stored view value that is junk, or storage that throws, when Catalog opens, then Bookcase shows and the page works.

## Implementation Notes

- Spine height boundary: the formula gives 120 + 0.3 × 26.7 = 128.01, which rounds up to 136, so "26.7 → 128" can't hold. The step boundary is w = 80/3 ≈ 26.667. `spine.test.ts` pins 26.66 → 128, 26.67 → 136 and 26.8 → 136.
- w is the label's `scrollHeight`, an integer. On Chromium/macOS, *Dune* measures 28.27px (28) and *The Left Hand of Darkness* 145.69px (146), which gives 136 and 168.
- The moved Tab stop is persisted with a during-render state adjustment, not an effect. Real focus moves in a layout effect, and only when the focused element is a spine inside a now-`hidden` item.
- The height measurement sets state in a `useLayoutEffect`, as the spec says. It carries one `oxlint-disable-next-line react/set-state-in-effect`.
- The progressbar has `aria-label="Books finished"`, because axe's `aria-progressbar-name` needs a name.
- The plank fade under each row is a fixed `rgb(0 0 0 / 0.1)`, because no color token exists for it. Under forced colors the shelf opts out (`forced-color-adjust: none`) so its CanvasText plank gradient survives; each item opts back in.
- Added `catalogView.test.ts` for junk and throwing storage.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | blind | Highlight ring not instant under reduced motion | false | `styles/base.css:38` sets every transition to 0s under `prefers-reduced-motion: reduce` | reject |
| 2 | blind | 600ms transition also fades the focus page band | low | Real but only the page-colored band behind an instant outline fades; fix needs a fade-state class | reject |
| 3 | blind, edge | Heights never re-measured (font load, text-spacing, zoom) | low | Spine font is a system stack (`tokens.css:116`), no web fonts; zoom scales CSS px uniformly; only user text-spacing sheets hit it; fix needs a ResizeObserver | reject |
| 4 | blind, edge | `measured` cache never pruned | low | A few bytes per deleted Book for one page lifetime | reject |
| 5 | blind | Plank gradient stops are literals, not the row-height/row-gap tokens | low | Changing `--space-shelf-row-height` or `--space-8` would misalign planks silently; `calc()` is a direct fix | patch |
| 6 | blind | Gradient plank shadow is a fixed color, unlike `--shadow-plank` | low | Dark-mode shadow is fainter than the empty shelf's; fixing needs a new token | reject |
| 7 | blind | Meter track invisible under forced colors | low | `.bar` background forced to Canvas while only `.barFill` opts out | patch |
| 8 | blind | Spec in-review vs sprint-status in-progress | false | The workflow syncs sprint status at a later step | reject |
| 9 | blind | Ticked checklist AC-3 unit item still reads "26.7 → 128"; AC-4 follow-up done but unticked | low | `spine.test.ts` pins 26.66/26.67; `catalog.test.ts` covers one co-author and no author | patch |
| 10 | blind | Junk/throwing storage only unit-tested, not in a page | low | Acceptance criterion 3 has no browser test; a small e2e is direct | patch |
| 11 | blind | Duplicate-dialog and panel focus tests pinned to List | low | Bookcase shares the `onAdded` focus path, already covered by AC-9 | reject |
| 12 | blind | Arrow keys start from `stop`, wrong after a Safari click | false | A Safari click does not focus the button, so keydown never reaches the `ul`; any focused spine set `stopId` via `onFocus` | reject |
| 13 | blind | Inline ref callbacks re-run on each render | low | AC-6 passes at 500 spines; memoizing adds complexity | reject |
| 14 | blind, edge | `spineName` drops co-authors when `firstAuthor` is "" | false | `book_fields.py:94` drops empty author names, so `authorCount ≥ 1` implies a first author | reject |
| 15 | blind | `MeterBar` does not clamp finished > total | false | The meter is computed by the server from the same Books; no path makes finished exceed total | reject |
| 16 | edge | `scrollHeight` is integer-rounded near step boundaries | low | One step off only within 0.5px of a boundary; exact measurement needs a Range rect | reject |
| 17 | edge | New spine scrolled into view before its height is set | low | The parent's passive effect runs before the measured re-render; scrolling up leaves the grown top off-screen. Scrolling the fixed-height `li` fixes it | patch |
| 18 | edge | Subpixel bottoms split one row in `verticalNeighbour` | false | Slots in one flex line share one bottom and the same fixed height, so the values are identical | reject |
| 19 | edge | Shift+Arrow not excluded | false | No other meaning for Shift+Arrow on a spine; no bad outcome | reject |
| 20 | edge | Unit test doesn't pin "26.7 → 128" | low | Disclosed spec arithmetic error; fix would edit this spec | reject |
| 21 | edge | Empty-shelf padding changed | low | Deliberate move onto the shared card; catalog-empty tests pass | reject |
| 22 | gap | Moved Tab stop after clearing search untested | gap | Filed evidence: deleting the stop persistence keeps AC-8 green | patch |
| 23 | gap | Arrows skipping hidden spines and not wrapping untested | gap | Filed evidence: wrap-around or `ids` in `keyDown` keeps AC-7/AC-8 green | patch |
| 24 | gap | Spines first rendered hidden never height-checked once shown | gap | Filed evidence: caching hidden labels at 120 keeps every test green | patch |
| 25 | gap | Focus-move off a hidden spine has no reachable trigger | low | Spec Decision requires it for Epic 7 filters / Story 1.12 delete; keep as a guard | reject |

## Design Notes

Planks without row-packing JS: the `ul` is `display: flex; flex-wrap: wrap; column-gap: 4px; row-gap: 36px; padding: 0 12px 12px`, and each `li` is 204px tall with `align-items: flex-end`. A `repeating-linear-gradient` with a 240px period draws the plank (8px face, 4px edge, and a faint shadow fade) under each row, so the rows follow the viewport width and a short last row still stands on a full plank. Under forced colors, the gradient uses `CanvasText`.

Focus ring versus highlight: AC-9 polls for the accent box-shadow to go away while the spine stays focused, so the focus ring must not be an accent box-shadow: `outline: 2px solid accent; outline-offset: 2px; box-shadow: 0 0 0 2px page`. The highlight is `box-shadow: 0 0 0 2px page, 0 0 0 4px accent`, faded by the same 600ms transition as the List row.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_bookcase_view.py` -- expected: 1 passed.
- `npm --prefix frontend run check:api` -- expected: contract, `tsc -b`, oxlint and unit tests (including `spine.test.ts`) pass.
- `npm run build && npm --prefix frontend run e2e -- e2e/bookcase.spec.ts` -- expected: 10 passed.
- `npm run check` -- expected: exit 0.
