---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-07'
storyId: '4.1'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-4-1-keep-the-interrupted-book-as-up-next.md (I/O matrix, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (spec-4-1 entries; none routes work to automate)
  - _bmad/tea/config.yaml
  - frontend/src/components/StartDialog.tsx, UpNextPane.tsx, UpNextPane.module.css, frontend/src/lib/startReading.ts
  - backend/bookvie/views/shelf.py, backend/bookvie/intents/start_reading.py
  - frontend/e2e/up-next.spec.ts, finish-reading.spec.ts, start-reading.spec.ts, stale-hand-offs.spec.ts, home.ts, intents.ts
  - backend/tests/test_up_next.py, test_start_reading.py
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 4.1, Keep the interrupted book as Up next

This file used to hold the Story 3.7 summary, which is in git history (`9cd094d`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, triage log, review findings) and the ATDD checklist's green-phase follow-ups. No `deferred-work.md` entry routes work to this run.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were four small e2e targets, all in one spec, written inline.
**Total tests added:** 4 Playwright tests.
**Browser exploration:** skipped. The ATDD contract pins the roles and names, so I worked from the source and from mutation probes.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 4.1 shipped with broad coverage:
- **API:** 5 tests in `test_up_next.py`, plus an `up_next` axis (none/dune/other) on `test_start_reading_across_the_state_matrix`. The Up next pointer is also modelled in `test_reading_state_machine.py`, and `test_finishing_the_main_book_leaves_up_next_alone` covers the finish.
- **E2E:** 12 tests in `up-next.spec.ts` (4 ATDD leaves, 6 follow-ups, 2 review patches), and Up next cases in `finish-reading.spec.ts`.
- **Unit:** `startReading.test.ts` covers `detailPrimary`, `popoverStart` and `upNextStart`.

I checked the checklist's 13 follow-ups against these tests. Four had no test:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **A finished Up next with no Reading in progress.** The spec counts it as never started: it gets **Start reading**, and when displaced the dialog says it "returns to the catalog." | Only the home view's `paused: false` was asserted (`test_up_next.py`). No browser test read the pane label or the displacement line for a finished *Z*, and the matrix's `other` Up next is always a never-started Emma. | E2E | P1 (AC-2, AC-4) |
| G2 | **Book detail for a never-started Up next.** It should offer **Start reading** and open "Start *X*?" with only the pause line. | The AC-4 follow-up checked only that Book detail's button exists, not the dialog it opens. | E2E | P1 (AC-3) |
| G3 | **A long title clamps to 2 lines in the pane** (DESIGN.md → Section pane). | No test. | E2E | P2 (AC-4) |
| G4 | **A stale Start dialog.** A dialog left open while another tab starts a Book should apply to the server's state on confirm, with no warning (A2). | No test. The AC-6 leaf covers only the refetch on focus. | E2E | P1 (AC-6, R-11) |

**Not selected:**
- RDG-E2E-001 is ticked by `bmad-testarch-trace`, not here. Both of its conditions are now green.
- Side reads in `start-reading` (`main_not_side_read`) belong to Story 4.7 (`deferred-work.md:377`).
- The spine name for a paused Up next, and the Delete Confirm role line, are Story 4.6's (`deferred-work.md:382,396`).

## Tests Added

The four tests are in a new `Story 4.1 Keep the interrupted book as Up next (automate)` block in `frontend/e2e/up-next.spec.ts`:

1. **`[P1] AC-2/AC-4 a finished Up next with no Reading in progress gets Start reading, returns to the catalog., and keeps its Readings`** (G1).
   - **Seed:** The Left Hand of Darkness is Main, Dune is the finished Up next, and Fahrenheit 451 is never started.
   - The pane names its button "Start reading Dune" and has no Resume.
   - The dialog's accessible description holds both lines: "… Dune returns to the catalog."
   - After confirming, the pointers are (Fahrenheit 451, The Left Hand of Darkness), and Dune's stored Book is deep-equal to its seed.
2. **`[P1] AC-3 Book detail offers Start reading for a never-started Up next: Start X? with the pause line and no displacement line`** (G2).
   - The dialog's Purpose is empty, and its description is only the pause line.
   - After confirming, the pointers are (Dune, The Left Hand of Darkness), Dune has a new Reading at p.0 from today, and the pane offers "Resume The Left Hand of Darkness".
3. **`[P2] AC-4 a long Up next title clamps to 2 lines in the pane, and the row stays inside it`** (G3). The title link's height divided by its line height is 2, its content is clipped (`scrollHeight > clientHeight`), and the compact button stays inside the pane.
4. **`[P1] AC-6 a Start dialog left open while another tab starts a Book applies to the current state on confirm, with no warning (A2)`** (G4).
   - The page opens "Start Fahrenheit 451?" while The Left Hand of Darkness is Main.
   - `page.request` then starts Dune, as the other tab.
   - The page confirms. There is no alert and no dialog. Fahrenheit 451 is Main, and Dune (just interrupted) is Up next. The Left Hand of Darkness is paused at p.212 and no longer Up next, so it is in Waiting for you.

## Files Created/Updated

- `frontend/e2e/up-next.spec.ts`: the automate block, 4 tests.
- `_bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md`: 26 `- [ ]` lines ticked with evidence. 1 line remains (below).
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- **`npm run check` passes:**
  - `ruff` is clean, and pytest gives 1052 passed.
  - The coverage gates pass: domain 100%, intents+store 97.75%.
  - `check:api` is clean (Prettier, oxlint, `tsc -b`, `schema.d.ts` in sync).
  - e2e goes from 303 to 307 passed, and smoke is ok.
- **Mutation check.** Each mutant was reverted after its run, and `git status` shows only the spec change.
  - **M1** (`views/shelf.py` `paused` = "has any Reading", so a finished Up next counts as paused) is killed by test 1, at `toHaveText('Start reading')`.
  - **M2** (`-webkit-line-clamp`/`line-clamp` removed from `.title`) is killed by test 3: 4 lines instead of 2.
  - **M3** (`StartDialog` shows the displacement line even when *X* is the Up next Book) is killed by test 2, and also by 3 existing leaves (`up-next.spec.ts:148,352,385`). Test 2 adds the Book-detail opener and the stored result, so on this mutant it overlaps the existing suite.
  - Test 4 characterizes A2 (last write wins against the current state). No single-line mutant in the client separates it from the existing AC-6 leaf. It guards against a future stale-confirmation guard landing without a spec change.
- **Burn-in:** the 4 new tests passed `--repeat-each=10 --retries=0 --workers=4`, 40 of 40.
- No CLI browser sessions were opened. The checklist-tick script stayed in the session scratchpad, outside the repo.

## ATDD Checklist

- **Remaining `[ ]` count:** 1 (`grep -cF '[ ]'`).
- **The open line:** RDG-E2E-001 (UJ-3), which is ticked in the trace. Its conditions are met: `up-next.spec.ts:99` (AC-2) and `:295` (returns to the catalog.) both pass. The planned work is `bmad-testarch-trace` at the Epic 4 gate.

## Assumptions and Risks

- **Test 3 uses a 1280px viewport.** The Book's title is long enough to wrap past 2 lines at the 320px side column. If the side column ever widens a lot, raise the title length rather than loosen the assertion.
- **Test 4 sends the other tab's start through `page.request`,** not a second browser context. This is the same pattern as the review-patch test at `:457`. The dialog doesn't refetch without a focus event, so it stays stale, which is what the test needs.
- **If ARCHITECTURE-SPINE's deferred stale-confirmation guard is ever built,** test 4 must change with it. That is intended.

## Next Recommended Workflow

Story 4.1 is not the last story of Epic 4 (4.2 to 4.7 are `backlog`), so there is no retrospective or gate yet. The next step is the next story, 4.2 (`bmad-build`). Optionally, run `bmad-testarch-test-review` on `up-next.spec.ts` first: it now has 16 tests, and AC-3's test 2 partly overlaps.
