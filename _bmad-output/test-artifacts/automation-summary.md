---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-25'
storyId: '16.1'
storyKey: '16-1-star-a-book'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-16-1-star-a-book.md (ACs, I/O matrix, Auto Run Result, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md (acceptanceCriteria registry, Green-phase follow-ups)
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.favourite-star, Favourite star, Spine → Favourite mark, Bookcase legend)
  - _bmad/tea/config.yaml
  - frontend/src/components/FavouriteStar.tsx and .module.css, frontend/src/lib/useFavourite.ts, frontend/src/pages/Bookcase.module.css, frontend/src/styles/tokens.css
  - frontend/e2e/favourite-star.spec.ts, favourite.ts, library.ts, intents.ts, bookcase.ts, tiles.ts, catalog-filter.ts, home.ts, dev-mode.ts, spine-popover.spec.ts, catalog-empty.spec.ts (connectionrefused pattern)
  - backend/tests/test_cli.py, builder.py, test_favourite.py
---

# Automation Summary: Story 16.1, star a Book

## Preflight

- **Done at HEAD.** `git show HEAD:…/sprint-status.yaml` reads `16-1-star-a-book: done` (review commit `5071012`), and the working tree was clean.
- **Stack:** `fullstack` (auto). Playwright (Chromium only) and pytest are in place.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's 9 green-phase follow-ups, the spec's ACs, and the review's findings. One of those findings was the stale-popover patch in `useFavourite.ts`, which no test pinned.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. I didn't explore with `playwright-cli`. Every locator already ships and is used by the story's leaves; numbers were measured with a probe spec (below).
- **Execution mode:** auto resolved to subagent, but I ran sequentially in this session. The plan is 7 leaves in two files, and one author keeps the helper-reuse rule simple. This follows the item-105 run.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| AC-8 List view's line, bookvie stopped, no jump | E2E | P1 | **New** `favourite-star.spec.ts:653` |
| AC-8 a failure landing after its popover closed while another popover is open (the review's patch) | E2E | P1 | **New** `:691` |
| AC-7/9/10 targets, sizes, `{spacing.3}`/`{spacing.2}` gaps, focus ring, no transition | E2E | P2 | **New** `:738` (popover size too) |
| AC-9/10/12/13 dark row and popover stars, tile halo in dark, forced colors in dark | E2E | P2 | **New** `:820` |
| AC-9/11 twins' stars | E2E | P2 | **New** `:873` |
| AC-11 mark and marker dot don't overlap; mini legend swatch; AC-14 Catalog meter | E2E | P2 | **New** `:898` |
| AC-1 `bookvie` exits 1 on a v4 Book without `favourite` | CLI (pytest) | P2 | **New** `backend/tests/test_cli.py:727` |
| AC-8 line after the popover closed | E2E | — | Already written by the build (`:226`); `:691` adds the cross-popover case |
| AC-12 Tab from the last control closes | E2E | — | Already covered: `spine-popover.spec.ts:181` (gate-updated for the star) |
| AC-9 wide cover | — | P3 | **Retired:** the star is positioned on the 2:3 box, which the AC-9 leaf already measures with `coverBox`; a wide cover only changes the image inside the link |
| AC-13 Canvas halo by pixel sampling | E2E | — | Covered by computed style instead (`:820`: halo fill Canvas, glow `none`) |

The coverage is selective: each target is either a follow-up the ATDD checklist named or a regression guard for the review's patch.

## Files

- `frontend/e2e/favourite-star.spec.ts`: a new describe block, "Story 16.1 Star a Book (automate)", with 6 leaves, plus the spec-local `spaceToken`. It imports `INK_SECONDARY_DARK` (`library.ts`) and `tileNames` (`tiles.ts`). The 8 ATDD leaves are unchanged.
- `backend/tests/test_cli.py`: one leaf, plus an import of `LibraryBuilder`.
- `_bmad-output/test-artifacts/atdd-checklist-16-1-star-a-book.md`: the 9 follow-ups are ticked (a wide cover retired within the AC-9 line), and the 8 implementation-checklist lines are ticked with their evidence. Remaining `[ ]`: **0**.
- This summary.

**Helpers:**
- Reused (spec-local): `routeCouldntSave`, `popover`, `legend`, `tileItemStarting`, `starSize`, `COULDNT_SAVE`, `COULDNT_SAVE_BODY`, `DUNE`, `EMMA`.
- Reused (`favourite.ts`): `favouriteStar`, `starShape`, `spineMark`.
- Reused (`library.ts`): `firstLineRect`, `bookId`, `DUNE_ID`, `ACCENT`, `FAVOURITE`, `FAVOURITE_DARK`, `INK_SECONDARY_DARK`, `SPINE_LABEL_STRIP`.
- Reused from other modules: `requestsTo`, `starBook`, `SET_FAVOURITE` (`intents.ts`); `bookRows`, `bookcase`, `spines`, `viewToggle`, `shelfOf` (`bookcase.ts`); `tiles`, `tileLinks`, `tileNames`, `storeTiles` (`tiles.ts`); `chip`, `chipGroup` (`catalog-filter.ts`); `mainAt`, `LEFT_HAND_ID` (`home.ts`); `systemColor` (`dev-mode.ts`); `LibraryBuilder` (pytest).
- Added: `spaceToken` (spec-local). No helper read a `--space-*` token; the AC-13 leaf reads `--color-favourite` inline the same way. The held-then-503 route in `:691` is inline. It differs from `routeCouldntSave` on purpose: it holds the answer until the second popover is open.

**Shipped numbers** (probe `e2e/favourite-auto.probe.spec.ts`, Chromium 1280×900, light; removed with `rm`):
- Detail: 34×34 target, 18px star, 12px after the h1's first line (`--space-3` 12px).
- Popover: 34px target, 16px star.
- Row: 24px target, 15px star, 8px after the title link (`--space-2` 8px).
- Tile: 32px target, 22px star, centred.
- Transitions: `0s` on the star, its svg, cell and tile. The row's `TR` has an unrelated 0.6s `box-shadow` transition.
- Legend swatches: favourite 12×12, spine swatches 11×15.
- The marker dot ends at y 391.5; the mark starts at 521.5.
- A stopped server (`connectionrefused`) shows "Couldn't save. Your data wasn't changed.".
- The pressed star keeps its place on screen: `scrollY` moved 1874 → 1915 by scroll anchoring.
- All asserted as measured, via tokens or DESIGN.md values.

## Validation

- `favourite-star.spec.ts`: 14 passed (8 ATDD, 6 new). With `spine-popover`, `catalog-tiles` and `book-states`: 57 passed.
- **Mutation probe** (the review's line in `useFavourite.ts:84` reverted by hand to `inlineNow.current === null ? 'row' : 'inline'`, then restored by hand; `git status` afterwards showed only the two test files modified): `:691` fails at "Expected: 0, Received: 1", because Emma's popover took Dune's line. The other two AC-8 leaves pass, as they should.
- One fix during generation: the row and tile focus-ring checks first used `focus()` after a mouse click on the view toggle, which Chromium doesn't show as `:focus-visible`. They now reach the star with Tab. That isn't a product defect.
- `npm run check:api`: exit 0, 428 unit tests. `npm run check:py`: 2534 passed (the review's 2533 plus the new CLI leaf).
- No production file changed. No CLI session opened, and no temp artifact was left.

## Assumptions and risks

- "Doesn't scroll to it" is read as "the view doesn't jump to the line". The leaf asserts that the pressed star keeps its place on screen. A raw `scrollY` check would fail on Chromium's scroll anchoring, which is the behaviour that keeps the star in place.
- The legend's "mini" swatch has no number in DESIGN.md. The leaf asserts relations: square, smaller than the spine mark, no taller than a spine swatch.
- On Home a failed popover save shows no visible line once the popover closes. The spec accepts this, so no leaf pins it.

## Next

Story 16.1's pipeline is complete. Story 16.2 (`16-2-show-only-my-favourites`, backlog) starts with `bmad-testarch-atdd`.
