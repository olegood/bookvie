---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-05'
storyId: '3.2'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-2-start-reading-a-book.md (incl. I/O matrix, Review Findings and Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md
  - _bmad-output/test-artifacts/test-design-qa.md, test-design-progress-system.md (RDG-API-001, RDG-UNIT-002)
  - _bmad/tea/config.yaml
  - backend/bookvie/intents/start_reading.py, edit_purpose.py, delete_book.py, domain/purpose.py, domain/invariants.py, views/shelf.py
  - backend/tests/test_start_reading.py, test_purpose.py, test_store.py (Hypothesis precedent), builder.py, helpers.py
  - frontend/src/lib/startReading.ts (+ node test), frontend/e2e/start-reading.spec.ts
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

# Automation Summary: Story 3.2, Start reading a book

The Story 3.1 summary that used to live in this file is in git history (`fc028f5`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (with its I/O matrix, review findings and triage log), the ATDD checklist, and the system test design.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There was one backend target, so I wrote it inline.
**Total tests added:** 1 Hypothesis state machine (60 examples × up to 25 steps per run) and 1 seed sanity test. Results are under Validation.
**Browser exploration:** skipped. There is no new E2E target.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.2 left very little uncovered:

- Backend: `test_start_reading.py` has the 3 ATDD leaves, plus RDG-API-001's full state matrix (never started, finished, paused, each with and without a Main book), `already_main` with history, 422s on malformed intents, and `edit-purpose`'s own rules. `domain/purpose.py` is 100%, and `intents/start_reading.py` and `edit_purpose.py` are covered.
- Node: `detailPrimary` and `popoverStart` cover every role.
- E2E: 23 tests in `start-reading.spec.ts`. They cover the 8 ATDD leaves, every green-phase follow-up in the checklist, and the review patches.

The one gap is a P0 item the test design and the checklist both tie to this story:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **RDG-UNIT-002**: random intent sequences must keep the invariants, at most one unfinished Reading per Book, and "Waiting = paused − Up next". | The test design calls it R-01's "highest-yield test" (P0). The checklist says it "needs `start-reading` to exist. It should land with 3.2 or 3.3, before the epic gate." Every existing test covers a single intent from a single seeded state. None chains them, so nothing checks a pause → resume → re-read → delete-the-Main → start-again sequence. | Unit (property-based) | P0 |

**Not selected:**
- Up next and Side-read starts (`main_not_up_next` 500s). The review deferred them to Story 4.1. Nothing in 3.2 can set those pointers, so the machine asserts that they stay empty instead of driving them.
- More E2E. The checklist's follow-ups and the review's patches are all pinned already. Another browser test would duplicate them (duplicate-coverage guard).
- The add-book property test from `deferred-work.md` (Story 1.7). It is outside 3.2's scope, but it can join this machine as an `add` rule later.

## Tests Added

1. **`backend/tests/test_reading_state_machine.py::test_reading_plan_holds_under_random_intent_sequences`** (P0, G1). This is a Hypothesis `RuleBasedStateMachine` seeded with Dune (never started), Emma (finished), Neuromancer (paused at p.50, with a Purpose) and Fahrenheit 451 (Main at p.120). Its rules are `start` (`start-reading`), `edit` (`edit-purpose`), `delete` (`delete-book`) and `days_pass`. The intents name either a seeded Book or one that never existed. Purposes are `None`, blank, padded, or random text.
   - **Refusals:** the code must match a simple model (`book_not_found`, `already_main` or `reading_already_finished`), and `library.json` must be byte-for-byte unchanged.
   - **`start`:** the previous Main book's current Reading gains `pausedAt` = today and nothing else changes. A paused Reading resumes in place, with `lastProgressUpdate` = now and the normalized Purpose. Otherwise exactly one new Reading is appended with the contract's fields, and the earlier Readings stay identical. `mainBookId` is the Book, and every other Book is untouched.
   - **`edit`:** only that Reading's `purpose` changes. **`delete`:** only that Book goes, and a vacated Main book stays `null`.
   - **Invariants after every step:** `check_invariants()` holds, there is at most one unfinished Reading per Book, and the file on disk reads back as `store.library`. In the catalog, only `mainBookId` is `main`. `waiting` (with `waitingPage`) is exactly the Books with a paused Reading, and the rest have no role. Home's `mainBook` is the Main book at its current page, or `null`.
2. **`…::test_the_seed_covers_every_starting_state`.** This pins that the seed starts the machine from all four RDG-API-001 rows, so a later builder change can't silently shrink it.

## Validation

- `npm run check:py` is green. pytest went from 931 to 933 passed. Coverage gates: domain 100%, intents+store 97.53%.
- `check:api`, e2e and smoke were not re-run because no frontend or contract file changed.
- Burn-in: the new file passed 5 runs in a row, each with fresh random sequences, in about 5–8s per run.
- Mutation check. Each mutation was run against the new test and then reverted; `git diff backend/bookvie` is empty.
  - `_pause_main` sets `pausedAt` to `None`: fails (the old Main book's snapshot comparison).
  - Resume resets `currentPage` to 0: fails.
- `ruff check` and `ruff format` are clean on the new file.
- Quality: no sleeps and no shared state. Each example gets its own temporary data directory, cleaned up in `teardown`. Time comes only through `FakeClock`. The file is ~300 lines.
- Checklist: the framework is ready, coverage is mapped (G1 → RDG-UNIT-002 and RDG-API-001's rows), artifacts are only in `_bmad-output/test-artifacts/`, and no browser CLI sessions were opened.

## Assumptions and Risks

- The machine calls the intent functions directly, not over HTTP. The routes, the multipart parsing and the envelopes are pinned per intent in `test_start_reading.py` and `test_intent_routes.py`.
- `views_agree_with_the_pointers` asserts that `upNextBookId` and `sideReadBookIds` stay empty. Once Epic 4's intents join the machine, swap that assertion for the "Waiting = paused − Up next" rule with a real Up next.
- The budget is 60 examples × 25 steps (about 5s). If CI time gets tight, lower the budget through a Hypothesis profile, not by dropping rules.

## Next Steps

- Add rules to `ReadingPlan` as Stories 3.3+ land (`update-progress`, `finish`, `pause`, then Epic 4's Up next and Side reads). That way RDG-UNIT-002 grows with R-01 rather than being written at the gate.
- Run `bmad-testarch-trace` at the end of Epic 3.
