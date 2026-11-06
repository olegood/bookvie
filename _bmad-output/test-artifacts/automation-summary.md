---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-06'
storyId: '3.6'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-6-finish-my-main-book.md (incl. I/O matrix, Review Findings and Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-6-finish-my-main-book.md
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/finish_reading.py
  - backend/tests/test_finish_reading.py, test_reading_state_machine.py
  - frontend/src/components/FinishDialog.tsx, frontend/src/lib/bookDetail.ts (+ bookDetail.test.ts, today.test.ts, api/books.test.ts)
  - frontend/e2e/finish-reading.spec.ts
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

# Automation Summary: Story 3.6, Finish my Main book

The Story 3.5 summary that used to live in this file is in git history (`1b59f16`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, review findings, triage log) and the ATDD checklist.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. The mode was `auto` and subagents were available, but there were only two small targets, so I wrote them inline.
**Total tests added:** 1 pytest test and 1 Playwright test. Results are under Validation.
**Browser exploration:** skipped. The dialog's roles and names are already pinned by the ATDD leaves, so I worked from source and the spec.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.6 shipped with broad coverage:

- Backend: `test_finish_reading.py` has 17 tests (AC-2/3/7/8/9 plus the follow-ups: Matrix boundaries, re-read, paused non-Main, `purposeFulfilled` without a Purpose, malformed answers, ratings and dates, form-order errors, malformed intent, the Book view). `test_reading_state_machine.py` has a `finish` rule. Branch coverage of `intents/finish_reading.py` is 100%.
- Client logic: `bookDetail.test.ts` (`readingLines`, `starsLabel`, `purposeFulfilledLine`), `today.test.ts` (`localIsoDate`), `books.test.ts` (`finishReading`).
- E2E: `finish-reading.spec.ts` has 15 tests: the ATDD leaves plus the review patches (409 from both openers, the hand-off focusing once, Back not reopening, axe, couldn't-save, a future date, no Purpose).

Branch coverage is not the same as pinned behaviour, so I ran mutation probes.

**`finish_reading.py`, full pytest suite:**

| Mutant | pytest |
|---|---|
| `finishedOn < start` → `<=` | killed |
| `finishedPages` = `currentPage` instead of the Book's pages | killed |
| always clear Main / never clear Main | killed / killed |
| drop the answer / drop the rating | killed / killed |
| finish every Reading, not only the current one | killed |
| rating 0 accepted / `True` accepted as 1 | killed / killed |
| no "needs a Purpose" check | killed |
| only the first field error reported | killed |
| check field errors **before** `reading_already_finished` | **killed only by the Hypothesis state machine** (`test_reading_plan_holds_under_random_intent_sequences`, not derandomized, 60 examples) |

**`FinishDialog.tsx`, finish-reading + update-page e2e (26 tests):**

| Mutant | e2e |
|---|---|
| "No rating" `onChange` is a no-op | **survives** (26 passed) |

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **No example test pins `reading_already_finished` before the 422s.** | The spec's Always clause fixes the refusal order: `book_not_found`, then `reading_already_finished`, then `invalid_fields`. The Matrix row "Gone Book + bad date" pins the first step (AC-9). AC-8 sends valid fields, so the second step is caught only when Hypothesis happens to draw a finish of a finished Book with a bad date. A stale tab with a bad date would otherwise get pointed at its fields instead of told the Reading is finished. | API (pytest) | P2 (AC-8, AD-9) |
| G2 | **Nothing tests changing your mind back to "No rating".** | With the no-op mutant, a user who picks a star can't un-rate: the controlled radio snaps back, and Done sends the star. No leaf checks a star and then "No rating". AC-1 only checks that "No rating" is selected on open. The unrated, unanswered Readings row (dates only, no star image) also had no e2e check. | E2E | P2 (AC-2, AC-6) |

**Not selected:**
- More `finish_reading.py` tests. Every other mutant is killed.
- Going back to "no answer" for Purpose fulfilled. The spec pins yes · partly · not yet with none checked, and the review rejected adding a way back.
- Things the code review deferred or rejected: `min`/`max` on the date field, answers editable in flight, the Book view failing before open, a stale cached Purpose. Testing them would pre-empt those decisions.
- Component tests. The node runner has no DOM, and the repo has no `.test.tsx` convention.
- Pre-existing ruff findings in `test_finish_reading.py` (import block and 41 format lines, present at HEAD; `npm run check` doesn't run ruff). Out of scope; my added lines are formatted.

## Tests Added

1. **`backend/tests/test_finish_reading.py::test_a_reading_already_finished_is_refused_before_any_field_error`** (P2, G1, AC-8). The Left Hand of Darkness is already finished (2026-10-29). The test sends a future `finishedOn`, `"partly"` with no Purpose, and rating 9, then asserts 409 `reading_already_finished` and unchanged bytes.
2. **`frontend/e2e/finish-reading.spec.ts` › `[P2] AC-2 choosing a star, then No rating again, finishes with no rating and the Readings row shows no stars`** (P2, G2). From Mark finished: pick 3 stars, then "No rating". The test asserts every star is an outline, then Done. It checks the intent `{…, purposeFulfilled: null, rating: null}` and the stored nulls. On Book detail it checks the row reads "Started 1 Oct 2026 · Finished 28 Oct 2026" with no star image.

## Files Created/Updated

- `backend/tests/test_finish_reading.py`: 1 test added.
- `frontend/e2e/finish-reading.spec.ts`: 1 test added (automate block).
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- `npm run check` passes. pytest went from 1024 to 1025 passed. Coverage gates: domain 100%, intents+store 97.72%. `check:api` is clean, e2e went from 275 to 276 passed, and smoke is ok.
- Mutation check. G1's test fails on the refusal-order mutant (`assert 422 == 409`). G2's test is the only one of 27 that fails on the no-op "No rating" mutant (`locator.check: Clicking the checkbox did not change its state`). Both mutants were reverted, and `git diff frontend/src backend/bookvie` is empty.
- Burn-in: the new e2e leaf passed `--repeat-each=10 --retries=0`, 10 of 10. The pytest test is deterministic: built in memory with `LibraryBuilder`, fixed Clock.
- No CLI browser sessions were opened. Probe scripts and backups stayed in the session scratchpad, outside the repo.

## Assumptions and Risks

- The state machine stays non-derandomized. G1 makes the refusal order deterministic, so the property test still adds value without carrying the order alone.
- The G2 leaf asserts the row's exact text. If Story 3.7 or 4.5 adds row content for unrated Readings, update this leaf.

## Next Recommended Workflow

`bmad-testarch-test-review` on `finish-reading.spec.ts` (16 tests, now the largest spec in Epic 3), or `bmad-testarch-trace` at the Epic 3 gate.
