---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-08'
storyId: '4.2'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-4-2-see-every-paused-book-in-waiting-for-you.md (I/O matrix, Implementation Notes, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md (Implementation Checklist, Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - frontend/src/components/WaitingPane.tsx, WaitingPane.module.css, frontend/src/pages/HomePage.tsx
  - frontend/e2e/waiting-for-you.spec.ts, up-next.spec.ts, home-slice.spec.ts, home.ts, intents.ts
  - backend/tests/test_waiting_for_you.py, test_reading_state_machine.py
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

# Automation Summary: Story 4.2, See every paused book in Waiting for you

This file used to hold the Story 4.1 summary, which is in git history (`56ce9c8`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, Implementation Notes, triage log, review findings) and the ATDD checklist. The spec's deferred-work intake names nothing for 4.2.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were three small e2e targets, all in one spec, written inline.
**Total tests added:** 3 Playwright tests.
**Browser exploration:** skipped. The ATDD contract pins the roles and names, so I worked from the source and from mutation probes.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 4.2 shipped with broad coverage:
- **Unit and API:** 4 tests in `test_waiting_for_you.py` (AC-1 order and ties, AC-4 the Epic 3 library, `pausedAt: null`, the empty list), and the list asserted in `test_reading_state_machine.py:389` (RDG-UNIT-002).
- **E2E:** 12 tests in `waiting-for-you.spec.ts` (5 ATDD leaves, 6 follow-ups, 1 for the 503 row of the matrix).
- **Unit (frontend):** `gauge.test.ts` covers `miniBarValueText`.

I checked the checklist's 21 open lines against these tests. Three had no test:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **A long title clamps to 2 lines in a row**, and the row stays inside the pane (DESIGN.md → Section pane). | The spec's Implementation Notes list it as not covered. The Up next pane has this test (`up-next.spec.ts:584`), the Waiting pane didn't. | E2E | P2 (AC-2) |
| G2 | **The mini bar under forced colors** keeps a visible track and a fill distinct from it. | Implementation Notes: "the forced-colors look of the mini bar … was not checked". The bar sets `forced-color-adjust: none`, so without its `@media (forced-colors)` block the accent colors pass through unchanged. | E2E | P2 (AC-2) |
| G3 | **No Main book with a paused Up next:** it is only the empty card's suggestion, and the count leaves it out. | The checklist follow-up for AC-7. The static seeds at `:355` cover a paused Up next alone, which shows no pane at all, so the count was never read beside the suggestion. | E2E | P1 (AC-7) |

**Not selected:**
- **Cancel after a refetch removed the row while the dialog was open.** Review finding BH (rejected) and triage row 12: the `isConnected` fallback is the same code path, and `up-next.spec.ts:439` fails without it.
- **A paused Side read as a row in the browser.** Side reads have no UI or intent until Story 4.7. The server half is the AC-1 unit case.
- **RDG-API-006** and **RDG-E2E-002** are ticked by `bmad-testarch-trace`, not here. RDG-E2E-002 also needs Story 4.3's Pause.

## Tests Added

The three tests are in a new `Story 4.2 See every paused book in Waiting for you (automate)` block at the end of `frontend/e2e/waiting-for-you.spec.ts`:

1. **`[P2] AC-2 a long title clamps to 2 lines in its row, and the row stays inside the pane`** (G1, `:498`).
   - **Seed:** Dune is Main. A Book with a 100-character title is paused on 5 October, and Fahrenheit 451 on 10 October. The test asserts that row order first.
   - The title link's height divided by its line height is 2, and its content is clipped.
   - The compact **Resume** stays inside the pane, on the bar's line, and the next row's title starts below it.
2. **`[P2] AC-2 under forced colors the mini bar keeps a visible track and a fill distinct from it`** (G2, `:538`).
   - With normal colors, the fill differs from the track.
   - With `forcedColors: 'active'`, the fill still differs from the track, the track's border is the fill's color (CanvasText), the fill is no longer the accent, and the fill still covers 36% of the track.
3. **`[P1] AC-7 with no Main book a paused Up next is only the empty card's suggestion, and a row's Cancel still returns to that row`** (G3, `:566`).
   - **Seed:** no Main book. The Left Hand of Darkness is the Up next, paused on 5 October (the oldest pause). Fahrenheit 451 is waiting.
   - The empty card offers "Resume The Left Hand of Darkness", the Up next pane is hidden, and the Waiting pane reads "(1)" with only Fahrenheit 451.
   - The row's dialog has no trade-off line. On Cancel, focus returns to the row's **Resume**, not to the card's suggestion button, which is the next fallback. Nothing is sent, and Up next is unchanged.

## Files Created/Updated

- `frontend/e2e/waiting-for-you.spec.ts`: the automate block, 3 tests.
- `_bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md`: all 21 `- [ ]` lines ticked with evidence (`file:line`). 0 remain.
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- **`TZ=Europe/Madrid npm run check` passes:**
  - `ruff` is clean, and pytest gives 1056 passed. Backend coverage total is 98%.
  - `check:api` is clean (Prettier, oxlint, `tsc -b`, `schema.d.ts` in sync).
  - e2e goes from 319 to 322 passed, and smoke is ok.
- **Mutation check.** Each mutant was reverted after its run, and `git status` shows only the spec change.
  - **M1** (`-webkit-line-clamp`/`line-clamp` removed from `WaitingPane.module.css` `.title`) is killed by test 1.
  - **M2** (the `@media (forced-colors: active)` block removed from `WaitingPane.module.css`) is killed by test 2.
  - **M3** (`HomePage.tsx` Cancel ignores `opener`, so focus takes the fallbacks) is killed by test 3: focus lands on the card's suggestion. The existing Cancel test at `:290` also kills it. Test 3 adds the no-Main-book case, where the fallback is a plausible button rather than `main`.
- **Burn-in:** the 3 new tests passed `--repeat-each=10 --retries=0 --workers=4`, 30 of 30.
- No CLI browser sessions were opened. The mutation backups and the checklist-tick script stayed in the session scratchpad, outside the repo.

## ATDD Checklist

- **Remaining `[ ]` count:** 0 (`grep -cF '[ ]'`).
- The checklist's Implementation Checklist lines (the build's tasks) were still unticked. Each is ticked now against the code and the tests that prove it.
- **The RDG-UNIT-002 follow-up** is ticked for the rows the state machine reaches: paused, and a finished Book's paused re-read. A paused Side read can't occur in the machine until Story 4.7 adds a side-read intent (it asserts `side_read_book_ids == []`). Until then, the AC-1 unit case at `test_waiting_for_you.py:63` covers it.

## Assumptions and Risks

- **Test 1 uses a 1280px viewport,** as the Up next clamp test does. If the side column widens a lot, raise the title length rather than loosen the assertion.
- **Test 2 compares computed colors, not named system colors.** Chromium resolves `Canvas` and `CanvasText` to the emulated forced-colors palette. The test asserts only that they differ and that border and fill agree, so a palette change in Chromium won't break it.
- **The Waiting pane's CSS is a copy of the Up next pane's** (triage row 5 added a back-reference comment). Tests 1 and 2 pin the Waiting copy, so a change to one pane that skips the other now fails a test.

## Next Recommended Workflow

Story 4.2 is not the last story of Epic 4 (4.3 to 4.7 are `backlog`), so there is no retrospective or gate yet. The next step is the next story, 4.3 (`bmad-build`). Its Pause spec should move `waitingPane`, `waitingHeading` and `rowTitles` to `home.ts` (checklist line 258) and finish RDG-E2E-002.
