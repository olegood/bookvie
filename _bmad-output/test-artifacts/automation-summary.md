---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-05'
storyId: '3.1'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-1-see-my-main-book-on-home.md (incl. I/O matrix, Review Findings and Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-1-see-my-main-book-on-home.md
  - _bmad/tea/config.yaml
  - backend/bookvie/domain/progress.py, views/shelf.py, views/models.py, store/local_state.py
  - backend/tests/test_progress.py, test_home_view.py, test_views.py, test_store.py, test_export.py (existing coverage)
  - frontend/src/pages/HomePage.tsx, BookDetailPage.tsx, lib/gauge.ts, lib/today.ts, lib/catalog.ts, lib/bookDetail.ts, lib/relativeDay.ts (+ their node tests)
  - frontend/e2e/home.spec.ts, restore.spec.ts, delete-book.spec.ts, error-screens.spec.ts, fixtures.ts
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

# Automation Summary: Story 3.1, See my Main book on Home

The Story 2.3 summary that used to live in this file is in git history (`6454384`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (with its I/O matrix, review findings and triage log) and the ATDD checklist.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were only two small targets, so I wrote both inline.
**Total tests added:** 1 API/view test and 1 E2E test. Results are under Validation.
**Browser exploration:** skipped. The one E2E target reuses locators the existing `home.spec.ts` AC-9 test already pins, read from `BookDetailPage.tsx`.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.1 already covers almost everything:

- Backend: 885 tests. A branch-coverage run (`--cov-branch`) shows `domain/progress.py`, `views/shelf.py` and `views/models.py` at 100% line and branch.
- Node unit tests cover `gauge`, `today`, `spineName` (all four I/O-matrix states), `currentReadingStatus` and `lastExportLine`.
- E2E: 17 tests in `home.spec.ts`. They cover the 9 ATDD leaves plus the follow-ups: the gauge edges, the half tick, no cover, Last export placement, a failed load, the hand-off, and the date recompute.

So the gaps are about how parts combine, not about missing lines:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | A finished Book re-read as Main. Shelf, Home card and Book detail must all show the *current* Reading's percentage. | This is the I/O matrix's "finished, re-reading, 12%" spine row. `spineName` is unit-tested for it. On the server side, `test_shelf_books_carry_role_percent_and_waiting_page` has no Main book that is also finished. AD-6 promises one number across the three views, and no test checks them against each other. A regression that read the finished Reading would show 100% on the spine and the card. | API (view) | P2 |
| G2 | Book detail with no unfinished Reading (not read yet, or finished) shows no Current reading region. A bare paused Reading (no start date, no Purpose) shows no "· started" and no Purpose line. | The server half is pinned: `currentReading` is `None` for these Books (`test_book_view_current_reading_main_paused_and_none`). But the e2e suite only renders the block for the Main and paused-with-Purpose cases (AC-9), so the client's `current !== null` and `purpose !== null` branches have no browser test. | E2E | P2 |

**Not selected:**
- Home with a malformed `local-state.json`. The review triage rated it low. `home_for` is one line over `read_last_export`, whose malformed cases are already pinned in `test_store.py` (and through Backup in `test_export.py`). A Home-level copy would duplicate them (duplicate-coverage guard).
- No Current reading block for an Up-next Book with a paused Reading. The server half is pinned (`current(neuromancer) is None`). The review deferred the client behavior to Epic 4, and an e2e test now would pin a decision that is still open.
- A Main-book spine with `percent === null` falling back to the read status. The `main_has_unfinished_reading` invariant rules this state out (triage EC3).
- E2E spine names for the two re-read states. `spineName` is unit-tested on server-shaped data, and G1 pins the server half. A browser test would only repeat the composition.

## Tests Added

1. **`backend/tests/test_views.py::test_a_finished_book_re_read_as_main_reads_the_re_read_in_every_view`** (P2, G1). Emma (400 pages) has a finished Reading at 400 and a Main re-read at page 48. The catalog `ShelfBook` is `("main", finished=True, 48, 12%, waitingPage None)`. Home's `mainBook` is 48 / 12%. Book detail's `currentReading` is `main` at 12%, and `latestFinishDate` is still set.
2. **`frontend/e2e/home.spec.ts` › `[P2] AC-9 Book detail has no Current reading block without an unfinished Reading; a bare paused one shows no start date or Purpose`** (G2). The seed has Neuromancer (no Readings), Piranesi (finished) and Dune, paused at 40 of 412 with `startDate: null` and no Purpose.
   - Neuromancer and Piranesi show their `h1` and the Readings region, and no Current reading region or progressbar.
   - Dune's region reads exactly "Waiting for you, page 40", with gauge valuetext "9%, page 40 of 412" (9.7…% floored). It contains no "started" and no "Purpose".

## Validation

- `npm run check` is green:
  - pytest: 885 → 886 passed. Coverage gates: domain 100%, intents+store 97.47%.
  - node: 162 pass, 0 fail.
  - e2e: 203 → 204 passed.
  - smoke: ok.
- Mutation check. Each mutation was run against the new tests and then reverted; `git diff backend/bookvie frontend/src` is empty.
  - The shelf `percent` reads the first Reading instead of the current one: G1 fails.
  - `current_reading` returns the first Reading: G1 fails. G2 still passes, correctly: `reading_status` still marks the finished Reading *finished*, so no block appears.
  - `_role_reading` gives a waiting role to any Book with a Reading: G2 fails (`toHaveCount(0)` on the region).
  - The Purpose line renders without a Purpose: G2 fails (`not.toContainText('Purpose')`).
- `ruff check` is clean on `test_views.py`. tsc and oxlint run in `check:api` and are clean.
- Quality: no hard waits and no conditionals. Data is seeded per test through `seededServer`. G2 uses web-first assertions only.
- Size: `home.spec.ts` is ~476 lines and `test_views.py` 484, both well under the 1,000-line limit.
- Checklist: the framework is ready, coverage is mapped (G1, G2 → I/O matrix rows), artifacts are only in `_bmad-output/test-artifacts/`, and no browser CLI sessions were opened.

## Assumptions and Risks

- G2 pins "no block" for a finished Book with no unfinished Reading. If Epic 3/4 adds a block for finished Books (for example "Read again"), this test is the place to change.
- The G1 test calls the view functions directly, not over HTTP. The HTTP shape of the same fields is already pinned by `test_home_view_main_book_card_fields` and `test_book_view_current_reading_main_paused_and_none`.
- The Up-next Current reading decision is still open (deferred-work.md, Story 3.1 review). Neither new test pins it.

## Next Steps

- `bmad-testarch-test-review` on `home.spec.ts` (now 18 tests, ~476 lines), or move on to Story 3.2.
- `bmad-testarch-trace` at the end of Epic 3.
