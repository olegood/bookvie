---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-11'
storyId: '6.2'
storyKey: '6-2-see-when-my-whole-unread-library-will-be-finished'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-6-2-see-when-my-whole-unread-library-will-be-finished.md (Intent, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md
  - _bmad-output/implementation-artifacts/deferred-work.md (code review of spec-6-2, 2026-11-11)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-pace-calculator.spec.ts; frontend/e2e/bookcase.ts; frontend/e2e/library.ts; frontend/src/lib/pace.cases.json; backend/tests/test_library_pages_left.py; backend/tests/test_progress.py
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

# Automation Summary: See when my whole unread library will be finished (story 6.2)

The previous version of this file held the summary for story 6.1. It's in git history (`110de76`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-Integrated. The story is `done` after `bmad-code-review` (`d5eea8a`).
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `frontend/package.json`, so that gate stays closed and the Traditional Patterns fragments load instead. `tea_use_pactjs_utils` is on, but contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`. Auto-heal is off.
- **Inputs:** four test deferrals from the code review in `deferred-work.md` ("Deferred from: code review of spec-6-2-…"), plus the ATDD checklist, which is stale (the old seed with 1710, "Skipped as committed", and every line still `[ ]`).

## Coverage Plan

**Scope:** selective. The ATDD leaves and the build's `[P2]` leaves already cover AC-1 to AC-4 and every row of the I/O matrix. This run adds the code review's deferrals and nothing that a lower level already covers.

**Browser exploration:** skipped. The row is small, the ATDD leaves already pin its locators (roles and exact names), and reading the code was enough.

| # | Target | Level | Priority | Where | Why at this level |
|---|---|---|---|---|---|
| T1 | The expanded calculator follows a catalog view refetch: add a Book through New book on Catalog. The result moves to the new total and the typed "30" stays (deferred) | E2E | P1 | `catalog-pace-calculator.spec.ts` | Only the browser shows a mounted `LibraryPace` getting a new `pagesLeft` from the refetch |
| T2 | Keyboard: Enter and Space on the toggle switch `aria-expanded` while focus stays on it. Expanded, Tab goes toggle → "pages/day" → the shelf (deferred: position and keyboard) | E2E | P2 | `catalog-pace-calculator.spec.ts` | Focus and Tab order exist only in the browser |
| T3 | List view: the expanded field comes before the table in document order (deferred: position) | E2E | P2 | the List view `[P2]` leaf, one more step | The same leaf already expands the calculator in List view |
| T4 | Expanded state: switching between Bookcase and List keeps it open, and leaving Catalog in-app and coming back collapses it (deferred) | E2E | P2 | `catalog-pace-calculator.spec.ts` | AC-3 only proves "collapsed on every visit" through a full reload, not through in-app navigation |
| T5 | Library clamp: a Book whose Pages were edited below its Reading's page adds 0 to the library sum, never a negative number (deferred) | Unit (views) | P2 | `test_library_pages_left.py` | `test_progress.py:56` pins the Book-scope clamp. This pins the library sum, where a naive `Σpages − Σpage` would let the overshoot cancel. Planned at API level; the store refuses this state, so the leaf calls `catalog()` and `book_detail()` on a built library, as `test_progress.py` does |

**Not planned:**
- **PAC-UNIT-002 8100 cases** (ATDD follow-up). `pace.cases.json` is a days-only table: its `about` says every case is under 60 days, and `pace.test.ts` checks the line's "About N days" prefix. 8,100 pages at 30 and at 17 are 270 and 477 days, so their lines are in months. AC-2 and AC-3 already pin those exact lines in the browser ("About 16 months · February 2028", "About 9 months · July 2027"), and `pace.test.ts` covers the arithmetic from days to months.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There's no new endpoint or view field, and AC-1 and AC-4 already pin the catalog view over HTTP.
  - **3B-e2e:** T1 to T4. For its fail-proofs it changed only frontend app files.
  - **3B-backend:** T5. It changed no app file: its fail-proof monkeypatched `bookvie.views.shelf.pages_left` in a throwaway test, which it then deleted.
- **Fixtures:** none added. The e2e spec reuses `SWING_TIME`, `bookcase`, `spine` and `viewToggle` (`bookcase.ts`), and `openNewBook` and `fillFields` (`library.ts`). It adds one constant, `FIRST_SPINE`.
- **Review of the workers' output:** read in full. The only change was rewrapping the new header comment in the spec, which had a line of about 140 characters. Afterwards `git status` showed only test files and test artifacts changed, and every run below was made after that.

## Tests Added

| File | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| `frontend/e2e/catalog-pace-calculator.spec.ts:264` | an add on Catalog refetches the view and the expanded calculator counts the new Book, keeping the typed pace | P1 | T1 | `LibraryPace` keeps `pagesLeft` from mount ("About 14 days" stays); `PaceCalculator` keyed by `pagesLeft` (typed pace lost) |
| `frontend/e2e/catalog-pace-calculator.spec.ts:296` | the link works from the keyboard: Enter expands, Tab reaches the field then the bookcase, Space collapses | P2 | T2 | the toggle as a `div role="button"` (Enter, then Space, do nothing); `autoFocus` on the field (focus leaves the toggle); a tab stop on the `output` (the spine isn't next) |
| `frontend/e2e/catalog-pace-calculator.spec.ts:170` | `[P2] List view…`, new step: the field comes before the table | P2 (leaf) | T3 | `<LibraryPace>` moved after the Bookcase/List branch |
| `frontend/e2e/catalog-pace-calculator.spec.ts:330` | the expanded calculator survives a switch to List, and an in-app revisit starts collapsed | P2 | T4 | `<LibraryPace key={catalogView}>` (collapses on switch); `expanded` in a module-level variable (stays open on revisit) |
| `backend/tests/test_library_pages_left.py:184` | `test_p2_a_book_with_pages_edited_below_its_page_adds_0_to_library_pages_left` | P2 | T5 | `pages_left` unclamped: 153, not 191 |

Every mutation was reverted, and `git diff --stat -- frontend/src backend/bookvie` was empty afterwards.

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** every target maps to a deferral and an ATDD line.
- **Duplicates:** none. T5 is at library scope, and the Book scope stays in `test_progress.py`.
- **Quality:**
  - no hard waits, conditionals or `.only`/`.skip`;
  - every assertion constrains a value (exact text, `aria-expanded`, focus, document order, 191 and 0);
  - T1 is network-first (`waitForResponse` is registered before the save);
  - each leaf starts its own server and stops it in `finally`.
- **Browser sessions:** no CLI sessions were opened.
- **Temp files:** the worker JSONs are in `/tmp/tea-automate-*-2026-11-11T14-51-52-000Z.json`, the step file's paths, not `{test_artifacts}/`. They are scratch and aren't committed.

Runs, all in this session after the workers finished:
- `TZ=Europe/Madrid npm run check`: exit 0. That covers Prettier, ruff, oxlint, `tsc -b`, the `api:gen` byte compare, pytest (1,348 passed, coverage 98%), the node unit tests (0 skipped), 529 e2e passed (526 before this run), and the smoke check.
- The workers' own runs, before the header rewrap: `catalog-pace-calculator.spec.ts` 10 passed, with the bookcase and list specs 41 passed; `test_library_pages_left.py` and `test_progress.py` 7 passed.

## ATDD Checklist

`atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md` now has 0 `[ ]` lines:
- **Ticked with evidence:** the 5 implementation lines and 8 of the 9 green-phase follow-ups.
- **Retired:** PAC-UNIT-002's 8100 cases (reason in Not planned, above).
- **Stale prose corrected:** the AC-4 seed row and first assertion now read Piranesi paused at p.45 (200) and 1665. A "Since then (green)" note records the build's activation and re-seed.

`deferred-work.md` has 4 `resolved:` lines under "Deferred from: code review of spec-6-2": the refetch, the position, the remaining follow-ups, and the checklist. The DESIGN.md contrast row stays open for the next DESIGN.md pass.

## Playwright Utils deviations

`tea_use_playwright_utils` is true, but `@seontechnologies/playwright-utils` isn't installed, so the mandate doesn't apply. Every new e2e leaf uses the project's vanilla patterns, as Story 6.1's automate block does:
- `frontend/e2e/catalog-pace-calculator.spec.ts:276`: `page.waitForResponse` in place of `interceptNetworkCall`.
- `frontend/e2e/catalog-pace-calculator.spec.ts:16`: `test` comes from `./fixtures.ts`, not `support/merged-fixtures`, which doesn't exist.

Recommended utilities that weren't wired: none needed. bookvie has no auth, and the e2e servers are per-test local processes.

## Assumptions and Risks

- **The library clamp is defensive.** A Reading past its Book's Pages can't be stored (invariant `reading_page_in_range`) or reached through the API (409 `pages_below_current_page`). T5 pins the sum so that a loosened invariant or a restore path doesn't make an overshoot cancel real pages left.
- **T1's refetch wait** matches any successful `/api/views/catalog` response after it is registered. The result assertion that follows ("About 24 days · 21 November") is what proves the new view rendered.
- **"Finishing a Book" in the live-update follow-up** has no control on Catalog, so T1 covers the add. Book detail's finish-in-place leaf (Story 6.1) covers the finish path for the same component.

## Next

Story 6.2's pipeline is complete: ATDD, build, code review, then automate. The next step is story 6.3's ATDD (`bmad-testarch-atdd`). Epic 6 isn't closed, so no retrospective, trace or gate is due yet.
