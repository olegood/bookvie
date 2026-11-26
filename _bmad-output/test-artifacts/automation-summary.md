---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-26'
storyId: '16.2'
storyKey: '16-2-show-only-my-favourites'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-16-2-show-only-my-favourites.md (ACs, I/O matrix, Auto Run Result, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md (Green-phase follow-ups, implementation checklist)
  - _bmad-output/implementation-artifacts/deferred-work.md (the build review's untested chip-off branch)
  - _bmad/tea/config.yaml
  - frontend/src/pages/CatalogPage.tsx, frontend/src/lib/useFavourite.ts, frontend/src/components/FilterChips.tsx and .module.css, frontend/src/api/intents.ts, frontend/src/api/views.ts
  - frontend/e2e/favourites-chip.spec.ts, favourite-star.spec.ts, catalog-filter.ts, catalog-filter.spec.ts (axe pattern), bookcase.ts, favourite.ts, library.ts, intents.ts, sort-direction.ts, stats.ts, tiles.ts, spine-popover.spec.ts
  - resources/knowledge: test-quality.md (the core fragments; Traditional Patterns, no Playwright Utils)
---

# Automation Summary: Story 16.2, show only my favourites

## Preflight

- **Done at HEAD.** `git show HEAD:…/sprint-status.yaml` reads `16-2-show-only-my-favourites: done` (review commit `f6e8920`), and the working tree was clean.
- **Stack:** `fullstack` (auto). Playwright (Chromium only) and pytest are in place. The story is frontend only, so no pytest target.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's 7 green-phase follow-ups, and the build review's deferred test for the "chip went off before the refetched view rendered" branch.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. I didn't explore with `playwright-cli`: every locator already ships and is used by the story's leaves.
- **Execution mode:** sequential in this session (7 leaves in one file, so one author keeps the helper-reuse rule simple), as in 16.1's run.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| The chip-off branch: an unstar whose refetch fails waits; Favourites off then speaks the plain line, focus kept (deferred by the build review) | E2E | P1 | **New** `favourites-chip.spec.ts:791` |
| AC-1 axe off and on, light and dark; ✓ before the star in dark; forced colors on: Highlight border at 2px, CanvasText check and star | E2E | P2 | **New** `:572` |
| AC-2 Title A–Z and Z–A in List and Tiles | E2E | P2 | **New** `:627` |
| AC-3 empty state in List and Tiles | E2E | P2 | **New** `:652` |
| AC-6 Tiles previous and Search titles; List next | E2E | P2 | **New** `:674` |
| AC-7 popover previous and Search titles; Esc and Tab-out with the chip on | E2E | P2 | **New** `:713` |
| AC-8 bookvie stopped (`connectionrefused`); the next filter change empties the line, chip stays on | E2E | P2 | **New** `:761` |
| Unit follow-up (`matchesFilters`, `filtersOn`, `liveFilters`, `NO_FILTERS`) | Unit | — | Already written by the build: `catalogFilter.test.ts:97`, `:101`, `:186`, `:194`, `:234` |

The coverage is selective: each target is a follow-up the ATDD checklist named or the deferred branch.

**How the chip-off branch is reached.** A held refetch can't reach it: `sendIntent` resolves only after the refetch, so `onSaved` runs when the refetched view is already in the cache, and the next render has the Book gone. The branch runs only when the refetch after a committed save fails (react-query keeps the last data, `retry: false`). The leaf answers that one refetch with a 503 (`page.route(…, { times: 1 })`). It is also the "stuck pending unstar" path the review rejected as rare. The leaf pins what the code does there: nothing is said while it waits, and turning the chip off speaks "Emma is not a favourite." once, without moving focus. The next successful refetch then says nothing more.

## Files

- `frontend/e2e/favourites-chip.spec.ts`: a new describe block, "Story 16.2 Show only my favourites (automate)", with 7 leaves. New imports: `AxeBuilder`, `ACCENT_DARK` and `sortSelect` (`library.ts`), `sortToggle` (`sort-direction.ts`), `SET_FAVOURITE` (`intents.ts`). The 9 ATDD leaves are unchanged.
- `_bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md`: the 7 follow-ups and the 6 implementation-checklist lines are ticked with their evidence. Remaining `[ ]`: **0**.
- `_bmad-output/implementation-artifacts/deferred-work.md`: a `resolved:` line on the build review's chip-off test entry. The spine-drift entry stays open for the reconciliation before Epic 17.
- This summary.

**Helpers:**
- Reused (spec-local): `FAVOURITES_SHELF`, `UNSTARRED_SHELF`, the spine-name constants, `STARRED`, `NO_MATCH`, `spoken`, `rowTitleLink`.
- Reused (modules): `favouritesChip`, `chip`, `clearFilters`, `main`, `recordStatus`, `spineNames` (`catalog-filter.ts`); `bookcase`, `bookRows`, `popover`, `search`, `spine`, `spines`, `viewToggle` (`bookcase.ts`); `favouriteStar`, `starShape`, `COULDNT_SAVE` (`favourite.ts`); `storeTiles`, `tile`, `tileLinks`, `tileNames`, `tiles` (`tiles.ts`); `sortSelect`, `ACCENT_DARK`, `FAVOURITE_DARK` (`library.ts`); `sortToggle` (`sort-direction.ts`); `systemColor` (`dev-mode.ts`); `afterAnnounceDelay` (`stats.ts`); `SET_FAVOURITE` (`intents.ts`).
- Added: none. The one-shot 503 on `/api/views/catalog` and the `connectionrefused` route are inline, as in `favourite-star.spec.ts:651`.

## Validation

- `favourites-chip.spec.ts`: 16 passed (9 ATDD, 7 new). With `favourite-star.spec.ts`, `--repeat-each=3`: 90 passed, none flaky.
- **Mutation probes** (each a hand edit to `frontend/src/pages/CatalogPage.tsx`, restored from a scratch copy, then rebuilt; `git status` afterwards showed only the test files modified):
  - The `!favouritesOn` block removed: only `:791` fails (the status never reads "Emma is not a favourite.").
  - The "else the previous" fallback removed: `:674`, `:713` and the ATDD AC-6 leaf fail, on focus.
- One fix during generation: `:791` first pressed the star before the chip's "3 books match." was spoken, so the save emptied it, the same timing the ATDD leaves handle with `afterCount`. It now waits for the count first. That isn't a product defect.
- `npm run check:api`: exit 0 (tsc, oxlint, Prettier, 432 unit tests).
- No production file changed. No CLI session opened, and no temp artifact was left (the probe's backup sat in the session scratchpad).

## Assumptions and risks

- "Another sort" is read as Title, with its reversed direction. The other sort keys share the same `sorted` list the chip filters, so one more key adds no branch.
- The `:791` leaf pins today's choice for the stuck case: the plain star line replaces the chip's own count. Blind Hunter raised this in the code review and it was rejected as rare. If the retro reopens it, this leaf is the one to change.
- The ✓-before-the-star check in dark measures geometry: the star starts past the chip's padding, and its right edge comes before the text. The light case's DOM-order check is in the ATDD AC-2 leaf.

## Next

Story 16.2's pipeline is complete, and it closes Epic 16. Next is the Epic 16 retrospective (`bmad-retrospective`). After it come the epic's trace and gate, and the spine reconciliation for the open spine-drift entries, all before Epic 17's first story.
