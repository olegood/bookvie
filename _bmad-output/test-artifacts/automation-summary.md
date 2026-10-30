---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-30'
storyId: '1.9'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md
  - _bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 1.9 entries)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/fixtures.ts
  - backend/tests/test_duplicate_book.py, test_add_book.py, test_store.py
  - frontend/e2e/duplicate-dialog.spec.ts, catalog-empty.spec.ts (axe pattern)
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

# Automation Summary: Story 1.9, Get warned about duplicates

The Story 1.6 summary that used to live in this file is in git history (`0b8f737`).

**Execution mode:** BMad-Integrated (story spec + ATDD checklist + deferred-work entries)
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`). Story 1.9 changed both sides.
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Config resolves to subagent mode, but 8 small targets in 2 existing files cost less to write inline.
**Total tests added:** 8 (pytest 489 → 493, e2e 76 → 80, all green).
**Browser exploration:** skipped. `playwright-cli` is not installed, and the dialog is small enough to map from source. Every selector reuses a role or name the green ATDD tests already pin.

## Coverage Plan by Test Level and Priority

Scope: **selective**. The targets are the ATDD checklist's unticked green-phase follow-ups and the two Story 1.9 entries in `deferred-work.md`. Each one is behaviour the code already has but no test can fail on.

| # | Target | Level | Priority | File |
|---|---|---|---|---|
| 1 | Two simultaneous identical adds: one 200, one 409. The check must run under the store lock (deferred-work) | API (integration) | P1 | `backend/tests/test_duplicate_book.py` |
| 2 | 10 matches: `duplicates` lists all 10 in catalog order; the message names three, then "and 7 more." | API | P2 | `backend/tests/test_duplicate_book.py` |
| 3 | A Book that matches by ISBN and by title + author is listed once | API | P2 | `backend/tests/test_duplicate_book.py` |
| 4 | Stored authors that repeat a name: matched like one name, and listed as stored | API | P2 | `backend/tests/test_duplicate_book.py` |
| 5 | Add anyway is guarded: pressing Add book while the resend is in flight sends nothing | E2E | P1 | `frontend/e2e/duplicate-dialog.spec.ts` |
| 6 | After Don't add, editing the ISBN so it no longer matches saves without a dialog | E2E | P2 | `frontend/e2e/duplicate-dialog.spec.ts` |
| 7 | Tab and Shift+Tab cycle between the dialog's two buttons, in both directions | E2E | P2 | `frontend/e2e/duplicate-dialog.spec.ts` |
| 8 | axe in both themes with the dialog open; the heading is the dark theme's ink | E2E | P2 | `frontend/e2e/duplicate-dialog.spec.ts` |

Priorities: #1 is P1 because a race that saves two copies is R-08 (duplicate detection misfires, DATA), but it needs two writers in the same instant, which a single-user local app rarely sees. #5 is P1 because a double save after **Add anyway** writes a third copy, though only on a fast double press. The rest are P2 edge cases on rules or UI that P0 tests already cover in the main path.

Level split: the rules stay at API (#1–#4). The E2E tests assert only what needs the browser: the in-flight guard, the form state after Don't add, the focus trap and accessibility.

**Not added (and why):**
- AC-9 `book_not_found`: it doesn't apply to `add-book`, which names no existing Book. Story 1.11's `edit-book` takes it.
- The fallback to the server `message` in the dialog: the code review rejected it as unreachable from the real server.
- Screen reader checks of the moved live regions: manual (deferred from 1.8), not automatable here.

## Baseline

- Story 1.9 was green at `33f9103`: 9 ATDD scaffolds active, plus the code review's follow-ups (multi-match copy, wire shape, the flag, the 979 prefix, Unicode folding, description wording, `couldnt_save` on the resend).

## Priority Totals

| Level | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| API / integration (pytest) | 0 | 1 | 3 | 0 | 4 |
| E2E (Playwright) | 0 | 1 | 3 | 0 | 4 |
| **Total new** | 0 | 2 | 6 | 0 | **8** |

## Files Created/Updated

### Updated
- `backend/tests/test_duplicate_book.py`: new `automate` section with 4 tests.
  - 10 matches: all listed in catalog order, and the message ends ", and 7 more."
  - A Book that matches on ISBN and on title + author is listed once.
  - Repeated stored authors match as one name and are listed as stored. Repeating an unshared name doesn't make it shared.
  - Two simultaneous identical adds give one saved Book and one 409. The first add is held in its rename with the lock taken. A `_ContendedLock` wrapper on `store.lock` releases it only once the second add is waiting on the lock. That makes the race deterministic, with no sleeps.
- `frontend/e2e/duplicate-dialog.spec.ts`: new `(automate)` describe with 4 tests, and a spec-local `addBookRequests(page)` helper.
  - While the Add anyway resend is held, a forced click on the aria-disabled Add book and a `form.requestSubmit()` both send nothing. Exactly 2 POSTs go out, and the catalog gets one new Dune.
  - After Don't add, editing the ISBN to another edition's saves without a dialog. Neither send carries `confirmDuplicate`.
  - Tab and Shift+Tab wrap between Don't add and Add anyway in both directions.
  - axe (WCAG 2.0–2.2 A/AA) finds nothing with the dialog open, in light and dark. The heading is ink in each theme.
- `_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md`: 6 follow-up lines ticked. Only the AC-9 `book_not_found` line stays open, because it doesn't apply.
- `_bmad-output/implementation-artifacts/deferred-work.md`: both Story 1.9 entries marked resolved.

No new fixtures or factories. Seeding reuses `LibraryBuilder` / `seededServer`, and the stalling filesystem copies `test_store.py`'s `Slow` pattern.

## Validation

- `npm run check`: exit 0. pytest 493 passed (coverage 98%), `check:api` 73/73, e2e 80/80, smoke ok.
- Burn-in: `duplicate-dialog.spec.ts --repeat-each=10 --retries=0` → 120/120. The concurrency test ran 30 times in a row, 30/30.
- Mutation checks, each reverted afterwards (only test and doc files differ in `git status`):
  - Duplicate check moved before `commit` (outside the lock) → only the concurrency test fails. The other 22 pass, which confirms the gap deferred-work named.
  - `inFlight` guard removed from `NewBookPanel.submit` → the in-flight test fails (3 POSTs instead of 2).
  - Shift+Tab branch removed from `keepFocusInside` → the Tab/Shift+Tab test fails.
- One self-inflicted failure, fixed in the same run. The first draft of the in-flight test pressed Enter in Title, and that version survived the `inFlight` mutant. Implicit submission clicks the default button, and `Button` cancels clicks while aria-disabled, so the guard was never reached. `requestSubmit()` skips the button and does reach it. The forced click stays in the test to pin the button layer.
- Lint: `tsc -b` and `oxlint` are clean. `ruff check` reports 3 ISC004 hits in the existing parametrize block (already at `33f9103`, not touched here). The file is not `ruff format`-clean either, as before.
- Quality: no hard waits (the held resend is a promise, and the threads use events with 5 s timeouts). Every `page.route` is set before `goto`. Role and name selectors only, except `panel.locator('form')`: a form has no accessible name here. One concern per test.

## Key Assumptions and Risks

- The concurrency test swaps `store.lock` for a wrapper. If `Store` ever takes the lock by another path, for example a private attribute, the test stops proving contention: `lock.contended.wait(5)` would time out and fail loudly instead of passing.
- `requestSubmit()` stands in for an agent or script submitting the form. A human can't reach the `inFlight` guard while `busy` has rendered. The guard covers the same-tick window before that render.
- `INK_DARK` is the DESIGN.md dark token, written in by hand like `INK`. A token change turns this test red together with the Story 1.6 axe tests, which is intended.

## Playwright Utils deviations

None. The mandate is off (`tea_use_playwright_utils: false`).

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.9, to roll the 9 ACs, the review follow-ups and these 8 tests into the traceability matrix and gate decision.
- Optionally `bmad-testarch-test-review` on `duplicate-dialog.spec.ts`. At about 470 lines it is now the largest e2e spec. The repeated "seed, open, fill, Add book" preamble could become a spec-local `openDuplicateDialog(page, server, fields)`.
