---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-05'
storyId: '3.4'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-4-see-where-i-left-off-and-how-long-is-left.md (incl. I/O matrix and Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-4-see-where-i-left-off-and-how-long-is-left.md
  - _bmad-output/test-artifacts/test-design-qa.md, test-design-progress-system.md (PAC-UNIT-001, PRG-UNIT-001, PRG-E2E-001/002, R-07, R-10)
  - _bmad-output/implementation-artifacts/deferred-work.md (3.4 spine drift)
  - _bmad/tea/config.yaml
  - backend/bookvie/domain/pace.py, backend/bookvie/views/shelf.py
  - backend/tests/test_reentry.py, test_views.py
  - frontend/src/components/ReentryLine.tsx (+ .module.css)
  - frontend/e2e/reentry.spec.ts, home.ts, update-page.spec.ts
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

# Automation Summary: Story 3.4, See where I left off and how long is left

The Story 3.3 summary that used to live in this file is in git history (`c123939`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, review triage log), the ATDD checklist, the system test design, and `deferred-work.md`.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. The mode was `auto` and subagents were available, but there was one small pytest target, so I wrote it inline.
**Total tests added:** 1 pytest test. Results are under Validation.
**Browser exploration:** skipped. There is no new E2E target.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.4 shipped with near-complete coverage:

- Backend: `test_reentry.py` covers PAC-UNIT-001 (Σ pages ÷ Σ inclusive days, re-reads, stored `finishedPages`, back-filled and unfinished out, same day, DST, 0 pages, start-after-finish, missing `finishedPages`, the Main book's earlier Reading) and PRG-UNIT-001 (ceil, min 1, `null` without pace, at pace 0 and with no pages left, through `home()` and over HTTP). `test_views.py` pins the whole `mainBook`, including `daysLeft: null`. Branch coverage of `domain/pace.py` and `views/shelf.py` is 100%.
- E2E: `reentry.spec.ts` has 8 tests: the 4 ATDD leaves (AC-3 to AC-6) and every green-phase follow-up (a year ago, no `lastProgressUpdate`, deleting the Main book, Last export past midnight). `update-page.spec.ts` P0 AC-2 asserts "~9 days left" → "~6 days left" after the refetch (PRG-E2E-001). Home's axe test scans the line in both themes.

Branch coverage is not the same as pinned behaviour, so I ran mutation probes on `days_left` against `test_reentry.py`, `test_views.py` and `test_home_view.py`:

| Mutant | pytest |
|---|---|
| `ceil(x)` → `round(x)` | killed |
| `ceil(x)` → `floor(x) + 1` | **survives** (32 passed) |
| exact `Fraction` division → `pages_left / float(pace)` | **survives** (32 passed) |

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **Days left is never tested where pages left ÷ pace is a whole number, or where float division would round wrong.** | Every pytest case has a fractional quotient (6.16, 0.99, 1.03, 11.36, 9.04), so `floor + 1` agrees with `ceil` on all of them. `pace.py`'s docstring promises "the ceiling never meets a float rounding error", but no test would notice a float. Only `update-page.spec.ts` (180 ÷ 20 = 9) sees an exact quotient, and the ATDD level split puts every number in pytest. At 52 pages over 3 days, 260 pages left is exactly 15 days, but `260 / (52/3)` in floats is 15.000000000000002 → 16. That is a real "~16 days left" for a reader who logged 52 pages over 3 days. | Unit (pytest), plus one `home()` case | P1 (R-10, PRG-UNIT-001) |

**Not selected:**
- More e2e. Every ATDD follow-up is already a test, and the numbers belong in pytest (AD-6).
- A component test for `ReentryLine`. The node runner has no DOM, and each branch (each fact omitted, "1 day" vs "N days") is an e2e assertion already.
- Browser exploration. There is no new E2E target.
- The R-17 timing smoke and the AD-19/AD-20 spine drift. They belong to the Epic 3 gate and the spine reconciliation (`deferred-work.md`).

## Tests Added

1. **`backend/tests/test_reentry.py::test_ac2_p1_days_left_is_exact_when_pages_left_divide_evenly_by_pace`** (P1, G1, PRG-UNIT-001, R-10). It checks three things:
   - Whole quotients give exactly that many days: `days_left(180, 20) == 9` and `days_left(900, 900/31) == 31`.
   - The float trap: it first asserts that `260 / float(52/3)` really is above 15, then that `days_left(260, Fraction(52, 3)) == 15`.
   - The same number through `home()`: Kindred, 52 pages over 2026-09-01 to 09-03, and the Main book at p.70 of 330 → `measured_pace == 52/3` and `daysLeft == 15`.

## Validation

- `npm run check:py` passes: pytest went from 970 to 971 passed. Coverage gates: domain 100%, intents+store 97.60%.
- `ruff check` and `ruff format --check` are clean on `test_reentry.py`.
- Mutation check. I ran each mutant against `test_reentry.py`, `test_views.py` and `test_home_view.py`, then reverted it; `git status` shows only the test file and this summary.
  - `ceil` → `floor + 1`: survived before, now fails the new test.
  - exact division → `float` division: survived before, now fails the new test.
- `check:api`, e2e and smoke were not re-run because no app, frontend or e2e file changed.
- Burn-in is not needed. The test is deterministic: fixed values, no clock, no network, no randomness.
- Quality: no sleeps and no shared state. The test builds in memory with `LibraryBuilder`, and its assertions are explicit.
- Checklist: the framework is ready, the gap maps to G1 → PRG-UNIT-001 (AC-2), the artifact is in `_bmad-output/test-artifacts/`, and no browser CLI sessions were opened.

## Assumptions and Risks

- The test asserts that the float trap is real (`260 / float(pace) > 15`). If a later Python changed float division, that line would fail loudly instead of the test quietly losing its point.
- The future Quick pace calculator (FR-15) will compute days left on the client. R-10 asks for a parity test between client and server rounding then. The `52/3, 260 → 15` case belongs in that shared table, because JavaScript numbers are floats and will hit this exact trap.
- The spine drift for pace, `daysLeft` and nullable `lastProgressUpdate` (SC1 to SC4) is still open in `deferred-work.md`. This run doesn't touch it.

## Next Steps

- When the Quick pace calculator lands, put the client and server days-left cases in one shared table, like 3.3's `pageField.cases.json`, and include the float-trap case.
- Story 3.5 (spine fill) and 3.6 (Finish dialog): re-run this workflow after each one.
- Run `bmad-testarch-trace` at the end of Epic 3. PAC-UNIT-001, PRG-UNIT-001 and PRG-E2E-002 can be ticked from 3.4. The R-17 timing smoke is still on the gate list.
