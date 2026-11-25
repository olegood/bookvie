---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-25'
storyId: '15.2'
storyKey: '15-2-filter-the-catalog-by-publisher'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-15-2-filter-the-catalog-by-publisher.md (ACs, I/O matrix, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-15-2-filter-the-catalog-by-publisher.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/epic-15-context.md
  - _bmad/tea/config.yaml
  - frontend/src/lib/catalogFilter.ts, frontend/src/components/FilterChips.tsx, FilterChips.module.css, frontend/src/pages/CatalogPage.tsx
  - frontend/src/lib/catalogFilter.test.ts
  - frontend/e2e/catalog-publisher-filter.spec.ts, catalog-filter.spec.ts, catalog-filter.ts, library.ts, bookcase.ts, fixtures.ts
---

# Automation Summary: Story 15.2 Filter the catalog by publisher

## Preflight

- **Done at HEAD.** `git show HEAD:…/sprint-status.yaml` reads `15-2-filter-the-catalog-by-publisher: done` (review commit `2a14a4d`), and the working tree was clean.
- **Stack:** `fullstack` (auto). The story is client-only: `catalogFilter.ts`, `FilterChips.tsx`/`.module.css` and `CatalogPage.tsx`, with no server change. So every target is an e2e leaf or a `node --test` unit test. No pytest target.
- **Mode:** BMad-Integrated. The inputs were the ATDD checklist's 9 open green-phase follow-ups, the spec's ACs and I/O matrix, and the review's findings (`2a14a4d`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. No browser exploration session was opened: the chip reuses the shipped `ValueList`, and the ATDD run's probes already mapped its structure.
- **Execution mode:** sequential, in this session. Five small leaves in one spec, plus the reuse rule, which needs one author to compare helpers.

## Coverage plan

| Follow-up (ATDD checklist) | Level | Priority | Result |
|---|---|---|---|
| `publisherValues()` order, numeric ties, case merge and count, blank, no mutation | Unit | P1 | Already written by the build: `catalogFilter.test.ts:117–161` |
| `matchesFilters` OR/AND/case for publishers; `filtersOn` | Unit | P1 | Already written: `catalogFilter.test.ts:75`, `:79`, `:168` |
| `liveFilters` drops a gone publisher; same object when live | Unit | P1 | Already written: `catalogFilter.test.ts:196`, `:202` |
| AC-1 axe with the Publisher list open, light and dark | E2E | P2 | **New** leaf `catalog-publisher-filter.spec.ts:543` |
| AC-2 dark: count `ink-tertiary-dark`, name `ink-dark` | E2E | P2 | **New**, the same leaf (`:543`) |
| AC-4 zero matches → "No books match these filters." + Clear filters | E2E | P2 | **New** leaf `:572` |
| AC-4 each Publisher change re-announces, even word for word | E2E | P2 | **New** leaf `:595` |
| AC-1/AC-2 a long name with an apostrophe stays on one line | E2E | P2 | **New** leaf `:621` |
| AC-8 Esc after focusless clicks | E2E | — | **Retired**: macOS Safari behavior (AGENTS.md → Supported browser) |

Scope is selective: the 8 ATDD leaves already cover every AC's main path, and the review's patch added the one-space check to AC-2. This run covers the secondary branches the ATDD run listed, and adds nothing that repeats a unit test at the e2e level.

## Files created or updated

- `frontend/e2e/catalog-publisher-filter.spec.ts`: a new `Story 15.2 Filter the catalog by publisher (automate)` describe block with 4 leaves (P2), placed in the same file so they reuse its seeds and helpers (`PUBLISHER_SHELF`, `PUBLISHER_ROWS`, `checkPublisher`, `startsOf`, `fullName`, `escapeRegExp`). `catalog-sort.spec.ts` and others mix ATDD and automate describes in the same way.
- `frontend/e2e/catalog-filter.ts`: gains `recordStatus`, moved unchanged from `catalog-filter.spec.ts`.
- `frontend/e2e/catalog-filter.spec.ts`: imports `recordStatus` from the shared module and drops its local copy and the now-unused `Page` import. No leaf or assertion changed.
- `_bmad-output/test-artifacts/atdd-checklist-15-2-filter-the-catalog-by-publisher.md`: 8 follow-ups ticked with their evidence, 1 retired. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Helpers

- **Added:** none.
- **Moved:** `recordStatus`, from `catalog-filter.spec.ts` to `e2e/catalog-filter.ts`, so the new re-announce leaf imports it instead of copying it. Found by `grep -n '^export' frontend/e2e/*.ts` (no exported status recorder) and a spec-local `grep -nE 'statusTexts|MutationObserver' frontend/e2e/*.spec.ts`, which found only the 7.2 copy.
- **Reused:** `countLook`, `listNames`, `listPopup`, `publisherChip`, `chip`, `main`, `spineNames` (catalog-filter.ts); `designColor`, `rgbOf`, `bookId` (library.ts); `bookcase` (bookcase.ts); the spec's own seeds and `checkPublisher`.

## Validation

- `TZ=Europe/Madrid npx playwright test e2e/catalog-publisher-filter.spec.ts e2e/catalog-filter.spec.ts`: **37 passed** (8 ATDD + 4 automate for 15.2, 25 for 7.2), none skipped.
- **Mutation check:** with `white-space: nowrap` removed from `.option`, the long-name leaf failed (4 distinct row heights, expected 1). The CSS edit was reverted by hand, and `git status` then showed only the three e2e files.
- `npm run check:api` (prettier check, oxlint, `tsc -b`, the unit tests): exit 0, 425 unit tests passed. The oxlint warnings it prints are in files this run didn't touch.
- No production file was changed: `git diff --name-only` lists only `frontend/e2e/` files and this step's records.
- No CLI browser session was opened, and no temp artifact was left outside `test-results/`.

## Assumptions and risks

- The dark-theme colors are read from DESIGN.md through `designColor('ink-dark')` and `designColor('ink-tertiary-dark')`, so a token change in DESIGN.md moves the expectation with it.
- The long-name leaf checks one line by comparing row heights in the list. A future row design with deliberately different heights would need a different check.
- The review's deferred item (a dropped key in `rawFilters` can come back after an edit back in the same visit) is in `deferred-work.md` and isn't tested here, because it describes current behavior that a fix would change.

## Next

Story 15.2 closes Epic 15. Next: the Epic 15 retrospective (`bmad-retrospective`), then the before-next-epic items: the trace and gate (`bmad-testarch-trace`) and the spine reconciliation (AGENTS.md → Architecture spine).
