---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-27'
storyId: '17.1'
storyKey: '17-1-see-the-books-finished-in-a-range'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-17-1-see-the-books-finished-in-a-range.md (ACs, I/O matrix, Auto Run Result, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-17-1-see-the-books-finished-in-a-range.md (Green-phase follow-ups, Implementation checklist)
  - _bmad/tea/config.yaml
  - frontend/src/components/StatsFinishedList.tsx, StatsFinishedList.module.css, RatingStars.tsx, RatingStars.module.css; frontend/src/pages/StatsPage.tsx; frontend/src/styles/base.css, tokens.css
  - frontend/e2e/stats-finished.spec.ts, stats.spec.ts, stats-bars.spec.ts, stats.ts, home.ts, library.ts, sort-direction.ts, dev-mode.ts, bookcase.ts, back-to-top-automate.spec.ts, catalog-tiles-automate.spec.ts
  - resources/knowledge: test-levels-framework.md, test-priorities-matrix.md, data-factories.md, selective-testing.md, ci-burn-in.md, test-quality.md, fixture-architecture.md, network-first.md, playwright-cli.md (core and Traditional Patterns; no Playwright Utils)
---

# Automation Summary: Story 17.1, see the Books finished in a range

## Preflight

- **Done at HEAD.** At HEAD (`1465248`, the code review's commit), `sprint-status.yaml` has `17-1-see-the-books-finished-in-a-range: done`. The working tree was clean.
- **Stack:** `fullstack` (auto). Playwright (Chromium only) and pytest are in place.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's eight green-phase follow-ups.
  - Two of them were already covered by unit tests the build added: AC-6 in `stats.test.ts` and AC-11 in `samePage.test.ts`.
  - The other six had no test.
- **No backend target:** the backend's AC-1 to AC-4 are covered by `test_stats_finishes.py`, and the review pinned the title-key tie-break (`1465248`).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. I didn't explore with `playwright-cli`, because every locator already ships in `stats.ts`.
- **Execution mode:** sequential in this session. All six leaves go in one new file.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| AC-7 stars (14px, 2px apart, accent and input-border, never gold), the cover's corners and hairline, hover and `:focus-visible` underline the title only, the ring around the row, dark, forced colors (typeset Canvas with a CanvasText edge, plate Canvas, cover edge CanvasText) | E2E | P2 | `stats-finished-automate.spec.ts:115` |
| AC-8 All time with nothing finished: no `h2`, no list, "No books finished yet." | E2E | P2 | `stats-finished-automate.spec.ts:179` |
| AC-9 the bars stay the shown view's while the next range loads | E2E | P2 | `stats-finished-automate.spec.ts:197` |
| AC-12 Forward after Back, then Back to the same list with the `h1` focused; a reload of the Custom address opens the same list, `h1` unfocused, nothing said | E2E | P1 | `stats-finished-automate.spec.ts:234` |
| AC-14 `range=thisYear` at 00:30 on 1 January 2027 asks for 2027-01-01 alone and keeps its address; `range=lastYear` asks for all of 2026 | E2E | P2 | `stats-finished-automate.spec.ts:281` |
| AC-15 arriving by Back from a Book, by the nav link on a ranged address, and by the nav from Home announces nothing, after a press did | E2E | P1 | `stats-finished-automate.spec.ts:316` |
| AC-6 heading and row-name strings | Unit | P1 | already covered: `stats.test.ts:245`, `:261` |
| AC-11 the same-page predicate | Unit | P1 | already covered: `samePage.test.ts:5` |

## Files

- **Created:** `frontend/e2e/stats-finished-automate.spec.ts` (6 leaves).
- **Updated:**
  - `_bmad-output/test-artifacts/atdd-checklist-17-1-see-the-books-finished-in-a-range.md`: every line ticked with its evidence. `grep -cF '[ ]'` gives **0**.
  - this summary.
- **Production code:** none touched.

## Helpers

None was added to an `e2e/*.ts` module. The new spec has five local helpers, because no exported helper does their job:
- `h1`
- `chartRows`: the chart's table rows. `stats-bars.spec.ts` has `chartTable`, but only inside that spec, and a spec can't import from another spec.
- `starsLook`
- `underlines`
- `typesetLook`

It also has a `LINE` constant. `catalog-tiles.spec.ts` has the same constant, but only inside that spec.

`typesetLook` finds the typeset cover by its solid edge, not its fill. Under forced colors Chromium reports a transparent background as `rgba(255, 255, 255, 0)`. `stats.ts` `thumbnailLook` reads any background other than `rgba(0, 0, 0, 0)` as a fill, so in forced colors it picks the outer box, which has no edge. In normal colors `thumbnailLook` is right, and AC-7 in `stats-finished.spec.ts` still uses it.

## Validation

- `npx playwright test e2e/stats-finished-automate.spec.ts --repeat-each=5`: 30 passed.
- `oxlint`, `tsc -b` and `prettier --check` on the new file: clean.
- Full `npm run check` after the new spec, 2026-11-27: exit 0. pytest 2538 passed, unit 452 passed, e2e 953 passed (947 + these 6, none skipped), smoke ok.
- **No production mutation probes:** automate edits tests only. Each leaf asserts behavior the ATDD checklist named and the build shipped, and none of the six exposed a defect.

## Assumptions and risks

- AC-7's focus check focuses the row and then moves Shift+Tab, Tab, so `:focus-visible` matches as it would for a keyboard user.
- AC-15's nav-from-Home step waits for Home's `h1` before pressing Stats. Without that wait the second press can land before Home renders.
- No defect found, so no `deferred-work.md` entry.

## Next

Story 17.1 is done and tested. Story 17.2 (`17-2-choose-a-month-or-year-by-its-bar`) is next in Epic 17: its ATDD (`bmad-testarch-atdd`) comes first.
