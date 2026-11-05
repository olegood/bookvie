---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-05'
storyId: '3.5'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-5-see-my-reading-on-home-s-shelf.md (incl. I/O matrix, Review Findings and Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-5-see-my-reading-on-home-s-shelf.md
  - _bmad/tea/config.yaml
  - backend/bookvie/views/shelf.py (_slice_priority), backend/bookvie/domain/ordering.py, backend/bookvie/domain/model.py (Book.latest_finished)
  - backend/tests/test_home_slice.py, test_ordering.py, test_edit_book.py
  - frontend/src/lib/slice.ts, slice.test.ts
  - frontend/e2e/home-slice.spec.ts
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

# Automation Summary: Story 3.5, See my reading on Home's shelf

The Story 3.4 summary that used to live in this file is in git history (`4741207`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, review findings, triage log) and the ATDD checklist.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. The mode was `auto` and subagents were available, but there was one small pytest target, so I wrote it inline.
**Total tests added:** 1 pytest test. Results are under Validation.
**Browser exploration:** skipped. There is no new E2E target.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.5 shipped with broad coverage:

- Backend: `test_home_slice.py` covers AC-1 over HTTP (Main re-read, Up next finished, a back-filled finish, a date tie by title, the unfinished Book left out, no Main, no roles, only Main, empty), plus title-key and id ties, Main == Up next, and roles that name missing Books. `test_ordering.py` pins `title_key`. Branch coverage of `views/shelf.py` is 100%.
- Client logic: `slice.test.ts` covers every client row in the I/O matrix for `rowCapacity` and `sliceRows`.
- E2E: `home-slice.spec.ts` has 15 tests: the 5 ATDD leaves, the follow-ups (1 row, no Main, 0%, last page) and the review patches (refocus after a repack, Catalog fill, popover and Escape, popover follows a repack, 600ms vs reduced motion, forced colors).

Branch coverage is not the same as pinned behaviour, so I ran mutation probes.

**`sliceRows` / `rowCapacity` against `slice.test.ts`:**

| Mutant | node --test |
|---|---|
| break at 4 rows instead of 3 | killed |
| no bookcase-order sort of the rest | killed |
| a row chosen twice | killed |
| display order = choice order | killed |
| `floor` → `round` in capacity | killed |
| gap dropped from capacity | killed |
| `k` not floored | survives; unreachable, since `rowCapacity` always returns an integer |

**`_slice_priority` finish choice, full pytest suite (985 tests):**

| Mutant | pytest |
|---|---|
| `Book.latest_finished` → earliest finish (model level) | killed by `test_edit_book.py` |
| `Book.latest_finished` → last stored finish (model level) | killed by `test_edit_book.py` |
| in `_slice_priority`, `latest_finished()` → first stored finish | **survives** (985 passed) |
| in `_slice_priority`, `latest_finished()` → last stored finish | **survives** |

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **No test checks that the slice uses a Book's latest finish when readings aren't stored in date order.** | AC-1's re-read Emma (09-20, then 10-10) lands between Dune (10-20) and Austerlitz (09-15) whichever of its finishes is used, so the "its latest finish counts" comment pins nothing. Stored order isn't date order: a back-filled read from years ago is added after the reads it predates. If the slice took the last stored finish, a Book you finished last week would drop to the bottom of the priority, and its row could fall out of Home's 3 rows. `Book.latest_finished` is pinned in `test_edit_book.py`, but nothing pins that the slice calls it. | Unit (pytest, `home()`) | P2 (AC-1, PRG-API-003) |

**Not selected:**
- The deferred negative focus case (focus dropped to `body`, then a resize must not refocus a slice spine). The code review deferred it to the next slice-focus work. It's a narrow interaction edge, and adding it here would pre-empt that decision.
- A popover whose spine leaves the 3 rows during a resize. The review rated it low.
- Component tests for slice mode. The node runner has no DOM, and the repo has no `.test.tsx` convention. E2E covers measuring, naming, keys and paint.
- More e2e. Every ATDD follow-up and review patch is already a test.
- Browser exploration. There is no new E2E target.

## Tests Added

1. **`backend/tests/test_home_slice.py::test_slice_priority_places_a_book_by_its_latest_finish_date_not_its_stored_order`** (P2, G1, AC-1). The Lathe of Heaven has three finishes, stored as 2026-09-01, 2026-10-25, then a back-filled 2019-03-01. Kindred finished on 2026-10-01. The test asserts `slice_priority == [lathe, kindred]`. Using the first or the last stored finish would put Lathe after Kindred.

## Files Created/Updated

- `backend/tests/test_home_slice.py`: 1 test added.
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- `npm run check:py` passes: pytest went from 985 to 986 passed. Coverage gates: domain 100%, intents+store 97.60%.
- `ruff check` and `ruff format` are clean on `test_home_slice.py`.
- Mutation check. I ran both `_slice_priority` mutants against the new test, then reverted them. Each one now fails the new test. All frontend mutants were reverted too, and `git status` shows only the test file and this summary.
- `check:api`, e2e and smoke were not re-run because no app, frontend or e2e file changed.
- Burn-in is not needed. The test is deterministic: fixed dates, built in memory with `LibraryBuilder`, no clock, no network.
- No CLI browser sessions were opened, and the probes left no temp files in the repo.

## Assumptions and Risks

- `Book.readings` stays in insertion order, not date order. That's why G1 matters, and it's how back-fills are stored today.
- The AD-6 wording drift (the client chooses rows from an id priority) is still in `deferred-work.md`, for the spine reconciliation at the end of the epic.

## Next Recommended Workflow

`bmad-testarch-trace` at the Epic 3 gate, or `bmad-testarch-test-review` on `home-slice.spec.ts` (15 tests, the largest spec this epic added).
