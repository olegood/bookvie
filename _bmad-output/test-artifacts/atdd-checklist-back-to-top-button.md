---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-18'
storyId: 'back-to-top-button'
storyKey: 'back-to-top-button'
storyFile: '_bmad-output/implementation-artifacts/spec-back-to-top-button.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-back-to-top-button.md'
generatedTestFiles:
  - 'frontend/e2e/back-to-top.spec.ts'
  - 'frontend/e2e/back-to-top.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-back-to-top-button.md (Intent D1–D5, Boundaries, I/O matrix, AC-1 to AC-9)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Search field row, Catalog scale, Highlight after add, Focus ring)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.button-secondary, Elevation & Depth)'
  - '_bmad-output/test-artifacts/atdd-checklist-pile-arrow-key-navigation.md (format for a standalone spec, guard-leaf controls)'
  - 'frontend/src/pages/CatalogPage.tsx, frontend/src/pages/CardNotesPage.tsx, frontend/src/pages/SearchTitles.tsx, frontend/src/styles/base.css'
  - 'frontend/e2e/fixtures.ts, library.ts, bookcase.ts, tiles.ts, sort-direction.ts, playwright.config.ts (Desktop Chrome, 1280×720)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: supplied, text: 'In Bookcase, List and Tiles, no button at the top; a "Back to top" button with that visible text, fixed bottom-right, once scrolled more than one window height; hidden again within one window height of the top' }
  - { id: AC-2, idSource: supplied, text: 'On Catalog a press (click, Enter or Space) scrolls to scrollY 0 and focuses Search titles, which keeps its text' }
  - { id: AC-3, idSource: supplied, text: 'On Card notes the button behaves as in AC-1 and AC-2, focusing Search card notes' }
  - { id: AC-4, idSource: supplied, text: 'Under prefers-reduced-motion: reduce the page reaches the top instantly; otherwise the scroll is smooth and still ends at the top with focus on the search field' }
  - { id: AC-5, idSource: supplied, text: 'A Catalog or Card notes page shorter than two window heights never shows the button, even scrolled to the bottom' }
  - { id: AC-6, idSource: supplied, text: 'Hidden, the button is not focusable and not in the accessibility tree; shown, it is the last Tab stop inside main and shows the focus ring on keyboard focus' }
  - { id: AC-7, idSource: supplied, text: 'Scrolled to the very bottom, the button does not overlap the last Book (spine, row or tile), the last card note, or any control' }
  - { id: AC-8, idSource: supplied, text: 'Home, Stats, Backup and Book detail render no Back to top button' }
  - { id: AC-9, idSource: supplied, text: 'DESIGN.md and EXPERIENCE.md describe the button as it ships; npm run check passes' }
---

# ATDD Checklist: Back to top button on Catalog and Card notes

**Date:** 2026-11-18
**Author:** Oleg
**Primary test level:** E2E (Playwright against the real `bookvie`)

---

## Summary

On Catalog and Card notes, once the page is scrolled more than one window height, a fixed "↑ Back to top" button shows in the bottom-right corner. A press scrolls to the top (smooth, instant under reduced motion) and focuses the page's search field, keeping its text. Hidden, it is no Tab stop and no accessible node. Other pages never have it.

**Source:** the standalone pipeline spec `spec-back-to-top-button.md` (commit `799b3e2`). It isn't a sprint story, so there's no `story_key` in `sprint-status.yaml`; the checklist key is the spec's slug.

**Stack:** `fullstack`. `tea_use_playwright_utils` is true in config, but the package isn't installed and the suite uses plain Playwright with the project's `fixtures.ts`, as every earlier bookvie checklist does. There's no application endpoint to intercept.

**Generation mode:** AI generation from the spec and the shipped pages. Locators come from shipped helpers (`search`, `bookcase`, `bookRows`, `tileLinks`, `viewToggle`) and from the button's name, which the spec pins (D4).

**Execution:** sequential, one author, as in earlier standalone specs. There's no API half: the feature is client-only.

**No backend change.**

---

## Acceptance Criteria

The spec's ids are kept as supplied (AC-1 to AC-9). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Shows past one window height in all three views, fixed bottom-right; hides near the top | E2E | P0 | `[P0] AC-1` |
| AC-2 | Click, Enter, Space → top, focus on Search titles, text kept | E2E | P0 | `[P0] AC-2` |
| AC-3 | Same on Card notes, focus on Search card notes | E2E | P0 | `[P0] AC-3` |
| AC-4 | Smooth by default, instant under reduced motion | E2E | P1 | `[P1] AC-4` |
| AC-5 | A short page never shows it | E2E | P1 | `[P1] AC-5` |
| AC-6 | Hidden: no Tab stop, no node; shown: last Tab stop in main, focus ring | E2E | P1 | `[P1] AC-6` |
| AC-7 | Covers nothing at the very bottom | E2E | P1 | `[P1] AC-7` |
| AC-8 | Not on Home, Stats, Backup, Book detail | E2E | P2 | `[P2] AC-8` |
| AC-9 | DESIGN.md and EXPERIENCE.md describe it; secondary-button colors | E2E | P2 | `[P2] AC-9` |

**Priorities:**
- **P0:** the feature itself on both pages (AC-1 to AC-3).
- **P1:** motion, the short-page guard, keyboard and screen reader behavior, and not covering content.
- **P2:** the page-scope guard and the docs.

**Level:** E2E only. Scroll position, a fixed box, `prefers-reduced-motion`, focus and Tab order are only trustworthy in a real browser, and there's no pure logic worth a unit test (the threshold is one comparison).

---

## Helper probes

Helpers reused: `shelfOf`, `bookcase`, `bookRows`, `search`, `spines`, `viewToggle` (bookcase.ts); `tileLinks` (tiles.ts); `ACCENT`, `bookId`, `DESIGN_MD`, `INK`, `SURFACE_INSET` (library.ts); `INPUT_BORDER` (sort-direction.ts); `test`, `expect`, `seededServer` (fixtures.ts). All unchanged, so not probed.
Helpers added (all in the new module `frontend/e2e/back-to-top.ts`):
- `backToTop(page)`: the button's locator; no existing helper names it.
- `LONG_SHELF`, `MATCHES_ALL_BOOKS`, `LONG_NOTES`, `LAST_NOTE`, `MATCHES_ALL_NOTES`: seeds; `shelfOf` is reused inside `LONG_SHELF`. The pile's `LIBRARY` (pile.ts) has 7 notes, too short for this.
- `scrollToY(page, y | 'bottom')`: an instant scroll that waits two frames for a frame-throttled scroll listener. No existing helper scrolls the window.
- `pressAndSample(page)`: clicks inside the page and reads `scrollY` one frame later, to tell smooth from instant. Nothing similar exists.
- `coveredBy(button)`: the spines, rows, tiles, notes and controls in `main` overlapping a box. `sameRect` (tiles.ts) compares two rects; it doesn't search for overlaps.

Probes (a temporary `frontend/e2e/back-to-top.probe.spec.ts`, run with `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/back-to-top.probe.spec.ts`, 1280×720, `deviceScaleFactor` 1, light; removed with `rm`):
- `scrollToY`: on a `setContent` page with a 5000px item and `body{margin:0}`, `1000` → `1000` (refused `1001`), `'bottom'` → `4280` (5000 − 720), `0` → `0`.
- `pressAndSample`: same page, a button calling `scrollTo({top:0, behavior:'smooth'})` → `{ before: 4280, afterOneFrame: 4280 }` (> 0, accepted as "not arrived"); with `behavior:'instant'` → `{ before: 4280, afterOneFrame: 0 }`. So the helper refuses an instant scroll as smooth and the reverse. Under emulated `reducedMotion: 'reduce'`, a smooth request is still not instant (`afterOneFrame` 4280): Chromium doesn't turn it into a jump by itself, so AC-4 really tests the app's choice.
- `coveredBy`: a fixed button over a 5000px `li` → `['li: tall item']`; with the `li` 100px tall, away from the button → `[]`.
- Found while probing: a smooth scroll still running when the next document loads in the same tab keeps moving it. The leaves wait for `scrollY` 0 after every smooth press, so no leaf starts on a moving page.

Shipped numbers:
- The spec quotes "about 15 rows at 1280px" for 500 Books; no leaf asserts it. Measured instead, for the seeds the leaves rely on (same probe, 1280×720): `LONG_SHELF` page height Bookcase 3271px, List 16142px, Tiles 18798px; `LONG_NOTES` Card notes 21902px. All more than two windows (1440px), as AC-1, AC-3 and AC-7 need.
- AC-5's short page: `shelfOf(3)` at 720px is 720px tall (not more than one window); at a 200px window the bottom is `scrollY` 431 (> 200), so the control can show the button.
- AC-8 at a 200px window, bottom `scrollY`: Home 1259, Stats 361, Backup 381, Book detail 875, all > 200. At 300px Stats (261) and Backup (281) didn't pass one window height, so the leaf uses 200px and asserts the reached `scrollY` first, so the absence isn't vacuous.
- Colors: AC-6's `ACCENT` and AC-9's `SURFACE_INSET`, `INK`, `INPUT_BORDER` are the shipped light values already exported and used by Story 10.1's suite. No width or other number is asserted.

Render-before-read: checked on all 10 leaves. Every read waits first on a shipped element with its expected count or name (`Bookcase, 400 books`, `bookRows` 400, `tileLinks` 400, the last note attached, the `h1`, the empty shelf's line), and the docs reads in AC-9 need no render. No leaf needed a fix.

Storage keys: no new localStorage key.

---

## TDD Red Phase

There are 10 leaves in `frontend/e2e/back-to-top.spec.ts`, one per criterion and a second for AC-5 (the empty pages, added after the build; see Changed during the build). The 9 red-phase leaves were each `test.skip(...)` with the reason in a comment on the line above; the 10th was added as a plain `test(` and never skipped. Each title carries exactly one `[P#] AC-n`; the `describe` is "Back to top".

**Red check** (after the probes passed): each leaf run once un-skipped on the current code, using a throwaway copy (`back-to-top-redcopy.spec.ts`, removed with `rm`). The 9 leaves of the red phase all failed:

| Leaf | Fails at | Today |
|---|---|---|
| AC-1 | first criterion assertion: button visible after scrolling 1.5 windows (Bookcase) | not found |
| AC-2 | button visible at the bottom, before the press | not found |
| AC-3 | button visible after scrolling 1.5 windows on Card notes | not found |
| AC-4 | button visible at the bottom, before the smooth press | not found |
| AC-5 | its control step: button visible on the 200px window | not found |
| AC-6 | button visible at the bottom, before the focus checks | not found |
| AC-7 | button visible at the bottom (Bookcase), before the overlap check | not found |
| AC-8 | its control step: button visible on Catalog | not found |
| AC-9 | its first assertion: DESIGN.md has a `back-to-top:` component | no match |

**The 10th leaf's red check** (code review, 2026-11-18): it was added after the build, so it was checked by mutation instead. With `{!empty && …}` dropped from CatalogPage's mount, the leaf failed at `back-to-top.spec.ts:210` (Catalog half). With only `{groups.length > 0 && …}` dropped from CardNotesPage's mount, it failed at `:222` (Card notes half). Both edits were reverted.

**AC-5 and AC-8 are guards** that today's code already satisfies on its own (there's no button anywhere). Each leaf therefore also needs the button to show once: AC-5 on the same short Catalog made scrollable by a 200px window, AC-8 on Catalog with the same library. That control makes the leaf red now and keeps "no button" from being vacuous after the build. This follows the pile spec's exception to "the first failing assertion is the criterion's own".

**Skipped as committed:** `playwright test e2e/back-to-top.spec.ts --list` listed 9 tests (10 once the empty-pages leaf was added). Prettier, `oxlint` and `tsc -b` pass on both files.

---

## Contract the Scaffolds Pin

- **Name and text:** a `button` whose accessible name is exactly "Back to top", and whose text is "↑ Back to top" (the arrow `aria-hidden`; `toHaveText(/^\s*↑\s*Back to top\s*$/)`).
- **When:** rendered (or not `hidden`) only while `window.scrollY > window.innerHeight`; re-evaluated on scroll and on resize. `toHaveCount(0)` is the hidden check, so a `hidden` attribute or not rendering both pass; `visibility: hidden` or `opacity: 0` alone don't.
- **Where:** `position: fixed`, its box in the bottom-right quarter of the viewport, the same box at two scroll positions. Inside `main`, after the page's content.
- **Press:** `window.scrollTo({ top: 0, behavior })` with `'smooth'`, or `'instant'` under `prefers-reduced-motion: reduce`, read at press time. Focus the search field with `preventScroll: true`. `scrollY` must still be unchanged one frame after a smooth press, which is Chromium's own behavior; a jump fails AC-4.
- **Look:** background `surface-inset`, text `ink`, border color `input-border` (DESIGN.md `button-secondary`); the shipped `:focus-visible` outline (solid, `accent`).
- **Room at the bottom:** at the very bottom nothing in `main` (li, tr, a, button, input, select, textarea, summary, `[tabindex]`) overlaps the button's box, in all three views and on Card notes.
- **Docs:** DESIGN.md gets a `  back-to-top:` component; EXPERIENCE.md a component-table row starting `| Back to top |`.

## Changed during the build

- **AC-6's keyboard steps** (2026-11-18, build). The scaffold focused the button, pressed Shift+Tab, then Tab to give it keyboard focus. In Bookcase the Tab stop before the button is the roving spine, which starts on the first spine at the top of the page. Shift+Tab therefore scrolled the page to the top, the button hid (spec: shown only past one window height), and the Tab could not land on it. The assertions are unchanged; only the order is: focus the button, Tab (nothing in `main` after it), then Shift+Tab back onto it, which is keyboard focus and shows the ring.
- **A second AC-5 leaf, `[P2] AC-5 an empty Catalog and a Card notes page with no notes …`** (added after the build, from the spec's I/O matrix row "Empty pages"). At a 200px window, the empty Catalog and Card notes with no notes have no search field and no button. The empty Catalog scrolls past one window by itself; the empty Card notes page can't (measured: `scrollY` 0 at 200px, 57 at 120px), so the leaf appends a 3000px `div` to `main` and asserts the reached `scrollY` > 200 first, or the absence would be vacuous.
- **AC-6, Home key step** (build review; changed in code review 2026-11-18 on Oleg's decision). With the button keyboard-focused at the bottom, Home scrolls to the top (`scrollY` polled to 0) and the button stays shown and focused; Shift+Tab moves focus off it, and then it goes (`toHaveCount(0)`) with focus not on `body`. The build first moved focus to the search field when the focused button hid. The review replaced that, because a keyboard user scrolling up with PageUp would land in an off-screen field and type into it.
- **AC-1, resize step** (review). At 1280×720 in Bookcase, `scrollY` 1080 shows the button; a 1200px-tall window (the page still overflows, so `scrollY` stays 1080, asserted) hides it with no scroll, and back to 720 shows it. AC-5's resize also clamps `scrollY`, which fires `scroll`, so it didn't prove the resize listener on its own.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| none expected | The button appears only on long pages. Suites that scroll a long Catalog (for example the 180-Book slice in `catalog-sort-direction.spec.ts`) could meet it in a Tab sequence or an overlap check; re-run the full e2e suite. |

## Assumptions for the build to confirm

- **Chromium keeps the smooth scroll it started** when focus moves with `preventScroll: true` during it.
- **`Space` on a focused button** activates it rather than scrolling the page (native behavior).
- **Card notes' empty and no-match states** have no long page, so passing a null ref there renders nothing (spec Design Notes).

---

## Implementation Checklist

Activate one leaf at a time: change `test.skip(` to `test(` and delete its RED comment. Watch it fail, implement, then watch it pass.
- **Command:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/back-to-top.spec.ts -g "AC-1"`

- [x] **`BackToTop` component** (`frontend/src/components/BackToTop.tsx` + CSS module): threshold, fixed placement, press behavior, reduced motion (share one helper with the three existing `matchMedia` copies).
- [x] **Catalog:** mount it after the views with `searchRef`; leave room at the bottom of the page.
- [x] **Card notes:** give `SearchTitles` an `inputRef` and mount it.
- [x] **DESIGN.md** `back-to-top` component and **EXPERIENCE.md** row.
- [x] Activate AC-1, AC-2, AC-3, then AC-4, AC-6, AC-7, AC-5, AC-8, AC-9.
- [x] Re-run the full e2e suite (`npm run check`).

### Green-phase follow-ups (for `bmad-testarch-automate`, not red leaves)

- [ ] **AC-1, resize:** a window made taller hides the button without a scroll (AC-5 covers the reverse).
- [ ] **AC-1, filters:** with a filter chip on, the threshold still follows the page's height.
- [ ] **AC-6, dark and forced colors:** dark twins of the colors; under forced colors the border is still drawn.
- [ ] **AC-3, scoped Card notes:** `?book=` scope with many notes behaves the same.
- [ ] **Side panel:** with Book detail's side panel or New book open, the button isn't reachable (the page is inert).
- [ ] **axe:** no violations on Catalog and Card notes with the button shown, light and dark.
