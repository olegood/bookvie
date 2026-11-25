---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-25'
storyId: '16.2'
storyKey: '16-2-show-only-my-favourites'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-162-show-only-my-favourites'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md'
generatedTestFiles:
  - 'frontend/e2e/favourites-chip.spec.ts'
  - 'frontend/e2e/catalog-filter.ts (favouritesChip)'
  - 'frontend/e2e/library.ts (isFocused)'
  - 'frontend/e2e/favourite.ts (COULDNT_SAVE, COULDNT_SAVE_BODY, routeCouldntSave, moved from favourite-star.spec.ts)'
  - 'frontend/e2e/bookcase.ts (popover, moved from favourite-star.spec.ts)'
  - 'frontend/e2e/favourite-star.spec.ts (imports the moved helpers; no leaf changed)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 16 intro, gate incl. "Story 16.2, e2e", out of scope; Story 16.2; AR70, AR71, UX-DR103, UX-DR104)'
  - '_bmad-output/planning-artifacts/favourite-books-plan-2026-11-25.md (D8–D10, 16.2 plan, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Filter chips → Favourites chip, components.favourite-star row-size, Forced colors, contrast table) and EXPERIENCE.md (Filter chips row, Favourite star → With the Favourites chip on, State rows, Focus after close)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-16 in-progress, 16-1 done, 16-2 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md and atdd-checklist-15-2-filter-the-catalog-by-publisher.md (format, unit-test precedent)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/lib/catalogFilter.ts, components/FilterChips.tsx and .module.css, pages/CatalogPage.tsx, lib/useFavourite.ts, lib/catalog.ts (spineNames, matchCountCopy)'
  - 'frontend/e2e/fixtures.ts, library.ts, catalog-filter.ts, favourite.ts, intents.ts, bookcase.ts, tiles.ts, home.ts; catalog-filter.spec.ts, favourite-star.spec.ts, bookcase-details.spec.ts, catalog-publisher-filter.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a non-empty Catalog, when it renders, then the filter row starts with the Favourites chip, before Status: a lone toggle button named exactly "Favourites" with aria-pressed="false", not inside a role="group", with no popup, showing a leading gold star that is aria-hidden (UX-DR103); it shows even when no Book is starred, and is never hidden or disabled.' }
  - { id: AC-2, idSource: generated, text: 'Given three starred Books among many, when I press Favourites, then it reads aria-pressed="true" with the selected chip style and the check glyph before the star, only the three starred Books show in the bookcase, the list and the tiles (the others are hidden, not dimmed, and the shelf closes up), and status announces "3 books match." (AR70); with Favourites plus Unread, only the starred unread Books show; with Favourites plus a Tag and a Search title, only the Books that match all three show (AND); pressing it again turns it off and shows every Book.' }
  - { id: AC-3, idSource: generated, text: 'Given Favourites on and no Book starred, when the Catalog renders, then it shows "No books match these filters." with "Clear filters", and the chip stays on: a refetch never turns it off (liveFilters leaves it alone) (AR70).' }
  - { id: AC-4, idSource: generated, text: 'Given Favourites on, alone or with other chips, when I press "Clear filters", then every chip is off, Favourites included, and focus goes to the Favourites chip (UX-DR103).' }
  - { id: AC-5, idSource: generated, text: 'Given Favourites on, when I reload the page, leave Catalog and come back, or add a Book, then Favourites is off again, as every chip is: it is never stored and never in an export; and it never changes Home''s bookcase slice or the "X of Y finished" meter (AR70).' }
  - { id: AC-6, idSource: generated, text: 'Given Favourites on in Tiles or List view, when I unstar a Book from its tile or its row, then once the refetched view renders, the Book is hidden, focus moves to the next remaining Book in sort order (its tile link or its row''s title link), else the previous one, else Search titles, and status announces "*Dune* is not a favourite. 11 books match." as one message (UX-DR104); pages/CatalogPage decides that focus and that message; the star''s own announcement doesn''t also speak (AR70).' }
  - { id: AC-7, idSource: generated, text: 'Given Favourites on in Bookcase view, when I unstar a Book from its Spine popover, then once the refetched view renders, the popover closes with its spine, focus moves to the next remaining spine in sort order, else the previous, else Search titles, and the same single message is announced (UX-DR104).' }
  - { id: AC-8, idSource: generated, text: 'Given a failed unstar with Favourites on, when the save fails, then the Book stays shown and starred, and the couldn''t-save line shows as Story 16.1 places it (UX-DR102).' }
  - { id: AC-9, idSource: generated, text: 'Given the existing catalog filter e2e specs, when they run with Favourites off, then they pass, except the leaves the Epic 16 gate names for Story 16.2 ("Clear filters" focuses Favourites; the toolbar Tab order and the row''s button list start with Favourites), which are updated as it says.' }
---

# ATDD Checklist: Story 16.2 Show only my favourites

## Preflight

- **Branch:** `master` at `f630157`, clean at the start. Story steps don't change branches (AGENTS.md → Story pipeline), so this run stays on `master` and leaves its files uncommitted.
- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, Chromium only) and pytest are in place. This story touches only the frontend: no intent, view field or migration (AR70 lives in `lib/catalogFilter.ts`, `components/FilterChips.tsx` and `pages/CatalogPage.tsx`).
- **Story:** `epics.md` Story 16.2 has 9 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-9 in source order (registry above). Each "And" line belongs to the criterion above it.
- **Epic gate:** 16.2 is not Epic 16's first story, so the spine-drift stop doesn't apply. `sprint-status.yaml` reads `done` for 16.1 and `backlog` for 16.2. 16.2 closes the epic: after its review come automate, then the Epic 16 retro (AGENTS.md → Epic boundaries).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`.
- **What exists today:**
  - `ShelfBook.favourite` and `LibraryBuilder`'s `favourite` field ship (16.1), so every leaf seeds starred Books directly (`favourite: true`) and needs no setup intent.
  - `CatalogFilters` has five groups (status, types, languages, tags, publishers); `filtersOn`, `matchesFilters` and `liveFilters` know nothing of favourites. `clearFilters` focuses `readChipRef`.
  - `useFavourite` announces "*Title* is (not) a favourite." itself on `ok`. AC-6 and AC-7 ask CatalogPage to own one combined message instead when the chip is on.
  - The shipped names: a starred Book's spine and tile end ", favourite" (`spineNames`); a List row's title link is named by the title; its star "Favourite *Title*"; Tab from New book lands on Read (all measured, see Helper probes).

## Generation Mode

**AI generation, sequential.** The e2e leaves were written in this session rather than by a 4B subagent: the run already held every name and helper the leaves need, and there is no 4A work. There are **no API or pytest leaves**, since the story changes no backend behaviour. Selectors come from EXPERIENCE.md's names ("Favourites", "Favourite *Title*") and the shipped names measured on the app, not from a recording: the chip doesn't exist yet.

**No unit leaves.** As in Story 15.2, `catalogFilter.test.ts` cases for the favourites group are green-phase follow-ups: a skipped test that reads a field `CatalogFilters` doesn't have yet would break `tsc -b`.

## Test Strategy

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E | P1 | `favourites-chip.spec.ts:104` | a button named exactly "Favourites" has `aria-pressed="false"` |
| AC-2 | E2E | P0 | `:153` | after one press (inside the poll), the chip's `aria-pressed` is `"true"` |
| AC-3 | E2E | P1 | `:224` | after one press with nothing starred, "No books match these filters." shows once |
| AC-4 | E2E | P1 | `:261` | after pressing Favourites, then Clear filters (both inside the poll), the chip has focus and is off |
| AC-5 | E2E | P1 | `:308` | after pressing Favourites, going Home and back to Catalog (inside the poll), the chip reads `"false"` |
| AC-6 | E2E | P0 | `:368` | after Favourites, then Emma's tile star (inside the poll), Austerlitz's tile link has focus and the status texts are exactly "3 books match.", "Emma is not a favourite. 2 books match." |
| AC-7 | E2E | P0 | `:416` | after Favourites, Emma's spine and its popover's star (inside the poll), the popover is gone, Austerlitz's spine has focus, and the same two texts |
| AC-8 | E2E (routed 503) | P1 | `:451` | after Favourites, then Emma's tile star (inside the poll), `alert` says "Couldn't save. Your data wasn't changed." |
| AC-9 | E2E | P1 | `:503` | Tab from New book focuses Favourites |

Every leaf whose criterion follows a press on the missing chip makes that press inside its first `expect.poll` with `pressOnceThen` (nested for a chain of presses), so the leaf fails on the criterion's assertion, not on a click that waits for a missing control (16.1's pattern).

**AC-6's numbers.** The AC's "11 books match." is an example; the leaf's shelf gives "2 books match.". The leaf asserts the whole message as one text and that no separate "Emma is not a favourite." was spoken.

**AC-9** is a meta criterion ("the existing specs pass … except the gate's leaves"). Its leaf pins the one change the gate's updated leaves share (Favourites first in Tab order, before Read) and that the chip filters nothing while off. The rest of AC-9 is checked by the full e2e run and the review's diff read: the gate's leaves change as listed below, and no others.

**Export** (AC-5 "never in an export"): not a leaf. The chip is page state and an export is `library.json` plus covers, written by the backend, so it cannot carry it. The leaf checks the browser side: `localStorage` and `sessionStorage` keys are unchanged while the chip is on and after a reload.

## What each leaf covers after its first assertion

- **AC-1.** In no `role="group"`; no `aria-haspopup`, no `aria-expanded`; text "Favourites"; before the Status group in DOM order, left of it on the same line; the first element child is an `aria-hidden` SVG whose star is filled `FAVOURITE` while off, `row-size` (15px) wide. A second library with nothing starred: chip visible, enabled, `aria-pressed="false"`.
- **AC-2.** `accent-soft` fill, 2px `accent` border, a ✓ before the star (a `::before`, or a DOM check before the SVG); text still "Favourites"; the bookcase shows the 3 starred Books in sort order, "3 books match.", Dubliners and Flights hidden; List rows and Tiles show the same 3; Favourites + Unread gives Bleak House and Emma with "2 books match."; Favourites + Tag "novel" + Search "l" gives Bleak House and Austerlitz (Flights matches the Tag and the search but isn't starred); off again, Flights is back; cleared, all 6.
- **AC-3.** The chip stays on and enabled; the bookcase is hidden; two Clear filters links; "0 books match."; a catalog refetch (window focus, awaited on `/api/views/catalog`) keeps it on and the empty state; starring Dubliners elsewhere, then a refetch, shows only Dubliners with the chip still on.
- **AC-4.** Unread off too; all 6 back; no Clear filters link. Favourites alone, then the row's Clear filters: focus on the chip, off. Favourites + Ebook (no match), then the shelf area's Clear filters: focus on the chip, both off.
- **AC-5.** After coming back, all 6 show. On again: the meter still reads "3 of 6 finished"; storage keys unchanged. Reload: off, storage unchanged. On, then Home: the slice shows all 6. Back, on, add Swing Time: off, the new spine focused, 7 spines.
- **AC-6.** Tiles: 2 tiles left, chip still on. List: unstarring the last row (Austerlitz) focuses the previous row's title link (Bleak House) and says "Austerlitz is not a favourite. 1 book matches." with no separate star line; unstarring the last shown Book focuses Search titles, shows the empty state and says "Bleak House is not a favourite. 0 books match."; the chip stays on.
- **AC-7.** The bookcase shows Bleak House and Austerlitz; no spine keeps Emma's starred name, and her unstarred spine is hidden.
- **AC-8.** Tiles: the 3 starred tiles still show, Emma's star `aria-pressed="true"` and focused; only "3 books match." was spoken; the line shows once, under the filter row and above the grid. Bookcase: the same failure from Emma's popover shows the line inside the popover, which stays open, the star still pressed, the shelf unchanged.
- **AC-9.** The next Tab reaches Read; the chip is off; Unread shows Bleak House, Dubliners and Emma (starred Books included) with "3 books match.".

## Existing tests this story changes (for the build)

The gate's list, checked in this run (the gate gives each leaf's start line):

- `catalog-filter.spec.ts:231` (AC-4, Read focused at `:244`), `:263` (AC-5, `:281`), `:430` (List AC-5, `:445`), `:471` (AC-6, `:500`): "Clear filters" focuses Favourites, not Read. `grep -n "'Read')).toBeFocused"` over `frontend/e2e/*.spec.ts` finds only these four.
- `bookcase-details.spec.ts:71`: its Tab loop at `:95` starts at Read; Favourites comes first.
- `catalog-publisher-filter.spec.ts:175`: its row is `chipGroup(page, 'Status').locator('xpath=..')`, the FilterChips row. If the chip sits in that row element (DESIGN: "first in the row"), the button list at `:184` starts with `'Favourites'`.

Not changed by this run: the leaves above would fail today if updated, so the build updates them with the chip. Not affected: AC-1 of 7.2 (`chipGroup(...).getByRole('button')` stays inside the Status group).

## Spec questions for the build and review

1. **The chip's star is an SVG.** AC-1's leaf asserts the button's first element child is an `aria-hidden` `svg` (UX-DR95: "One SVG star path … no glyph character"), filled gold. A text ★ would fail it; that would be a spec question, not a leaf to loosen.
2. **One message.** AC-6 and AC-7 read the `status` region's texts in order and expect exactly the chip's count, then the combined line. If the build empties the region between (it does today), the empty texts are ignored; a separate "Emma is not a favourite." fails the leaf.
3. **Which row the chip lives in.** AC-1 asserts it is left of Status on the same line and earlier in the DOM; it doesn't require the FilterChips row element. The gate's publisher leaf is conditional on that.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] AC-1: the chip's star in dark (`FAVOURITE_DARK`) and under forced colors (`forced-color-adjust: none`, CanvasText fill, the chip keeps its border indicator); the ✓ placement in dark; axe on the row with the chip on and off, in both themes.
- [ ] AC-2: the Tiles and List orders under another sort and under the reversed direction.
- [ ] AC-3: the empty state in List and Tiles with Favourites on.
- [ ] AC-6: Tiles "else the previous" and "else Search titles"; List "next" (the leaf covers previous and Search titles there).
- [ ] AC-7: "else the previous" and "else Search titles" from the popover; Esc and Tab-out of the popover still work with the chip on.
- [ ] AC-8: bookvie stopped instead of a routed 503; the line emptied by the next filter change with the chip on.
- [ ] Unit (`src/lib/catalogFilter.test.ts`): `matchesFilters` with favourites on keeps only `favourite: true` and ANDs with every group; `filtersOn` is true with only favourites; `liveFilters` returns the same object with favourites on and nothing starred; `NO_FILTERS` has it off.

## Helper probes

- **Helpers reused:** `test`, `expect`, `seededServer` (fixtures.ts); `bookcase`, `bookRows`, `finished`, `search`, `spine`, `spines`, `viewToggle` (bookcase.ts); `addSwingTime`, `anySpine`, `chip`, `chipGroup`, `clearFilters`, `main`, `recordStatus`, `spineNames`, `storageKeys`, `SWING`, `tagChip` (catalog-filter.ts); `favouriteStar`, `starShape` (favourite.ts); `slice` (home.ts); `starBook` (intents.ts); `ACCENT`, `bookId`, `designColor`, `designComponentValue`, `FAVOURITE`, `pressOnceThen`, `rgbOf` (library.ts); `storeTiles`, `tile`, `tileLinks`, `tileNames`, `tiles` (tiles.ts). Moved unchanged, so not probed: `popover` (favourite-star.spec.ts → bookcase.ts), `COULDNT_SAVE`, `COULDNT_SAVE_BODY`, `routeCouldntSave` (favourite-star.spec.ts → favourite.ts); `favourite-star.spec.ts` now imports them and still passes. The same `popover` stays spec-local in `spine-popover.spec.ts:67` and `set-up-next.spec.ts:67` (and inline in `start-reading.spec.ts:275`); switching those to the export is left to `bmad-testarch-automate`.
- **Helpers added:**
  - `favouritesChip` (catalog-filter.ts): the chip by its exact name in `main`. No locator found it; `chip` looks inside a named group, and the Favourites chip is in none.
  - `isFocused` (library.ts): whether a locator has focus, as a value for `expect.poll`, where `toBeFocused` can't sit. No exported reader did this (`card-note-add-another.ts:127` reads `activeElement` for a different purpose, its label).
  - Spec-local: `spoken` (the recorded status texts without the empty ones), `rowTitleLink` (a List row's title link by title), `FAVOURITES_SHELF`, `UNSTARRED_SHELF` and the name constants.
- **Shipped numbers:**
  - `row-size` 15px (DESIGN `components.favourite-star`, read at run time): measured 15×15 on the shipped List row star (e2e probe below). The chip's star is new UI defined by it; asserted at `row-size`, ±0.5px.
  - `accent-soft` light `#E3EBE2` (`tokens.css:24`, read with `designColor`): the shipped pressed Read chip measured `rgb(227, 235, 226)`. Asserted as measured.
  - The 2px selected border: `--indicator-width`, a whole pixel, as 7.2's AC-1 asserts on the shipped chips.
  - The meter's "3 of 6 finished" and the counts are this leaf's data, measured on the app (below).
- **Widths:** the 2px border is a whole pixel. No fractional border or outline width is asserted; E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key (`grep -rln localStorage frontend/src`: catalogSort, catalogView, theme, cardNoteAddAnother, cardNotesView). The chip is page state. `APP_STORAGE_KEYS` unchanged.
- **e2e probes** (Chromium Desktop Chrome, 1280×900, `deviceScaleFactor` 1, light; removed with `rm`):
  - `e2e/favourites-app.probe.spec.ts`, 1 passed, on the leaves' shelf: spine and tile names (starred ones end ", favourite", Author order Bleak House, Dubliners, Emma, Flights, Candide, Austerlitz); Tab from New book reaches Read; meter "3 of 6 finished"; List title links named by title, row stars "Favourite *Title*", row star SVG 15×15; Home's slice "1 row" with all 6 names.
  - `e2e/favourites-helpers.probe.spec.ts`, 6 passed (`npx playwright test e2e/favourites-helpers.probe.spec.ts`):
    - `favouritesChip`: matches "Favourites" and a button with an `aria-hidden` svg before that text; refused "Favourite", "Favourite Emma" and "Favourites 3".
    - `isFocused`: true for the focused button, false for the other.
    - `spoken`: `'one', '', 'two'` recorded gives `['one', 'two']`, not the raw list.
    - Nested `pressOnceThen`: null while the second control is absent, then each control clicked exactly once (`1/1`), in order; a missing first control never reaches the inner read.
    - The AC-2 check-glyph read: false on the shipped unpressed Read chip, true pressed (`::before` ✓); a DOM ✓ before the svg true, after it false.
    - `rowTitleLink`'s locator: one link for "Bleak House", none for "Bleak"; `accent-soft` as above, refused `accent`.
- **Render-before-read:** every leaf waits web-first on shipped UI before a one-shot read (`chipGroup(page, 'Status')` visible, `spines` or `tileLinks` `toHaveCount`), and every read that depends on the chip sits inside the first `expect.poll` or after a web-first wait. Fixed while writing: AC-6 and AC-8 now wait for `tileLinks` `toHaveCount(2)` / `(3)` before `tileNames`; AC-1's DOM-order read uses the Status group's own handle (a `main [role=group]` query would have found the Catalog view toggle first).

## TDD Red Phase

9 skipped leaves in `frontend/e2e/favourites-chip.spec.ts` (`test.skip('[P*] AC-n …')`, each with a `// Red phase:` reason).

**Red today**, run after the probes above passed, from a throwaway un-skipped copy with the same line numbers (`--timeout=20000`), removed with `rm`:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `favourites-chip.spec.ts:115` | no "Favourites" button |
| AC-2 | `:164` | the poll got `null`: no chip to press |
| AC-3 | `:235` | `null`: no chip, no empty state |
| AC-4 | `:284` | `null` |
| AC-5 | `:335` | `null` |
| AC-6 | `:392` | `null`: nothing hides Emma, nothing moves focus |
| AC-7 | `:443` | `null` |
| AC-8 | `:473` | `null` |
| AC-9 | `:516` | Tab from New book reaches Read; no "Favourites" |

## Implementation checklist (for `bmad-build-auto`)

- [ ] `CatalogFilters` gains the favourites toggle (off in `NO_FILTERS`); `matchesFilters` keeps only `favourite: true` when on; `filtersOn` counts it; `liveFilters` leaves it alone.
- [ ] `FilterChips`: the Favourites chip first in the row, a lone `aria-pressed` button with a leading `aria-hidden` SVG star (`row-size`, `favourite` / `favourite-dark`), the usual selected style; forced colors.
- [ ] `CatalogPage`: "Clear filters" focuses the Favourites chip; the chip is page state (reset on unmount, reload and add).
- [ ] `CatalogPage` owns an unstar that the chip hides: once the refetched view renders, focus to the next shown Book (tile link, row title link, spine), else previous, else Search titles, and one `status` message "*Title* is not a favourite. N books match."; the star's own line doesn't also speak; from the popover it closes with its spine.
- [ ] The gate's existing leaves above.
- [ ] Un-skip the 9 leaves, run `npm run check`.

## Suite

- `npm run check:api`: passed (format, `tsc -b`, oxlint, 428 unit tests).
- `npx playwright test e2e/favourite-star.spec.ts e2e/favourites-chip.spec.ts e2e/spine-popover.spec.ts`: 33 passed, 9 skipped. The full e2e suite wasn't run.
- `git status` after the run: only the six files in `generatedTestFiles` and this checklist; no `*.probe.*` file or throwaway copy.
