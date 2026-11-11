---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-11'
storyId: '6.1'
storyKey: '6-1-see-when-this-book-will-be-finished'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-6-1-see-when-this-book-will-be-finished.md (Intent, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-6-1-see-when-this-book-will-be-finished.md
  - _bmad-output/implementation-artifacts/deferred-work.md (code review of spec-6-1, 2026-11-11)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/pace-calculator.spec.ts; frontend/src/lib/pace.test.ts; backend/tests/test_pace_calculator.py
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

# Automation Summary: See when this book will be finished (story 6.1)

The previous version of this file held the summary for the pile arrow keys spec. It's in git history (`fd247de`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-Integrated. The story is `done` after `bmad-code-review` (`294de05`).
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `frontend/package.json`, so the gate is closed and the Traditional Patterns fragments load. `tea_use_pactjs_utils` is on, but contract testing isn't relevant (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`. Auto-heal is not enabled.
- **Inputs:** the run covers the code review's deferred leaf (finish on Book detail → "Nothing left to read.") and the ATDD checklist's open lines (17 `[ ]`, of which the green-phase follow-ups are the open work).

## Coverage Plan

**Scope:** selective. The ATDD leaves already cover AC-1 to AC-6, and the code review added three assertions. This run adds the deferred leaf and the checklist's open follow-ups, and nothing that duplicates a lower level.

**Browser exploration:** skipped. The block is small, the locators are already pinned by the ATDD leaves (roles and exact names), and code analysis was enough.

| # | Target | Level | Priority | Where | Why at this level |
|---|---|---|---|---|---|
| T1 | Finish Dune on its own Book detail: the mounted calculator switches to "Nothing left to read." and drops its field (deferred from code review) | E2E | P1 | `pace-calculator.spec.ts` | Only the browser shows a mounted component getting a new `pagesLeft` from the view refetch |
| T2 | A fractional Measured pace (100 pages over 3 days, 33.33…) prefills "33.3" and gives its result | E2E | P2 | `pace-calculator.spec.ts` | The unit test pins `pacePrefill(100/3)`, the API test the unrounded number; this joins them in the page |
| T3 | Years in the browser: 412 pages at "0.5" → "About 2 years · January 2029" | E2E | P2 | AC-3 leaf, one more step | AC-3 checks one case per unit and lacked years |
| T4 | A tab left open past midnight: on focus the finish date moves on a day | E2E | P2 | `pace-calculator.spec.ts` | `useNow` (AD-20) only runs in the browser |
| T5 | A view refetch keeps the typed pace | E2E | P2 | `pace-calculator.spec.ts` | Window focus refetches the view; the typed state must survive it |
| T6 | axe finds nothing on the block, with a result and with "Nothing left to read.", in both themes | E2E | P2 | `pace-calculator.spec.ts` | Same pattern as `pause.spec.ts` |
| T7 | PAC-UNIT-002: one table of (pages left, pace, days), read by `pace.test.ts` and by `test_pace_calculator.py` against `days_left`. It includes the float cases from the code review (21 at 0.7, 21 and 42 at 1.4) | Unit + API-level unit | P2 | `frontend/src/lib/pace.cases.json` (new), as `pageField.cases.json` | Keeps the client's rounding and the server's from drifting apart |

**Not planned:**
- **Reset when another Book opens** (`key={book.id}`): every e2e navigation is a full `page.goto`, which remounts anyway, so a browser test can't tell the key from a reload without an in-app link between two Books' pages. None exists on Book detail.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. No new endpoint or view field; AC-1 already pins the book view.
  - **3B-e2e:** T1 to T6.
  - **3B-backend:** T7, both readers of the shared table.
- **Fixtures:** none added to `e2e/fixtures.ts` or `home.ts`. The spec gained one local seed, `FRACTIONAL_PACE` (Dune and a 100-page Fahrenheit 451 read over 3 days).
- **Review of the workers' output:** both workers mutated app files briefly for their fail-proofs, at overlapping times. After both finished, `git status` showed only test files changed, and every run below was made after that.

## Tests Added

| File | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| `frontend/e2e/pace-calculator.spec.ts:208` | finishing a never-started Book from its Book detail turns the result into "Nothing left to read." with no reload | P1 | T1 | `pagesLeft <= 0` → `< 0` in `PaceCalculator` |
| `frontend/e2e/pace-calculator.spec.ts:229` | a fractional Measured pace prefills one decimal and the result uses the prefilled value | P2 | T2 | `pacePrefill` returns `String(measuredPace)` ("33.333333333333336") |
| `frontend/e2e/pace-calculator.spec.ts:92` | `[P1] AC-3`, new "0.5" step → "About 2 years · January 2029" | P1 (leaf) | T3 | years threshold moved from 24 to 30 months |
| `frontend/e2e/pace-calculator.spec.ts:245` | a tab left open past midnight moves the finish date a day when it regains focus | P2 | T4 | `useNow`'s window `focus` listener removed |
| `frontend/e2e/pace-calculator.spec.ts:265` | a Book view refetch keeps the typed pace and its result | P2 | T5 | `key={book.id}` → `key={Math.random()}` |
| `frontend/e2e/pace-calculator.spec.ts:286` | axe finds nothing on Book detail with a pace result and with nothing left to read, in both themes | P2 | T6 | an inline low-contrast color on the field ("light Dune: color-contrast (1)") |
| `frontend/src/lib/pace.cases.json` (new) | the shared table: 9 cases, 3 of them float traps (21 @ 0.7, 21 @ 1.4, 42 @ 1.4) | — | T7 | — |
| `frontend/src/lib/pace.test.ts:80` | `[P2] PAC-UNIT-002` rounds the days as the server does for the shared cases | P2 | T7 | a case changed to 31 days; or the review's float correction removed from `pace.ts` |
| `backend/tests/test_pace_calculator.py:121` | `test_pac_unit_002_p2_days_left_agrees_with_the_pace_calculators_shared_cases` | P2 | T7 | a case changed to 31 days |

## Validation

Re-run by me after both workers finished (TZ=Europe/Madrid):
- `uv run pytest tests/test_pace_calculator.py`: 2 passed.
- `node --test src/lib/pace.test.ts`: 5 passed.
- `playwright test e2e/pace-calculator.spec.ts --repeat-each=3 --retries=0`: 33 passed (11 leaves × 3).
- `npm run check`: exit 0 (format, lint, `tsc -b`, `api:gen` diff, full pytest, coverage, its e2e scope: 519 passed, smoke).

**Checklist validation** (`checklist.md`): the run meets it, read through the repo's conventions. These items don't apply as worded: tests live in `frontend/e2e/` and `backend/tests/`, not `tests/e2e/`; locators are roles and exact names, never `data-testid` (the ATDD checklist's "Required data-testid Attributes: None"); leaves assert one concern, not one `expect`. No Pact, auth or network mocks were needed. No playwright-cli session was opened.

**ATDD checklist:** every `[ ]` line in `atdd-checklist-6-1-see-when-this-book-will-be-finished.md` is now `[x]` with its evidence. Remaining `[ ]`: **0**.

**Deferred work:** the code review's entry (finish on Book detail) has a `resolved:` line pointing at T1.

## Playwright Utils deviations

None. The package isn't installed, so the vanilla patterns apply: T5 uses `page.waitForResponse`, registered before the `focus` that triggers the refetch. No RECOMMENDED utility was wanted.

## Assumptions and Risks

- **Reset when another Book opens** (`key={book.id}`) has no browser test: Book detail has no in-app link to another Book's page, and `page.goto` remounts anyway. T5 guards the other half of the key (a refetch keeps the typed text).
- **The shared table covers days only** (every case under 60 days). Months and years rounding is client-only (the server has no months), and AC-6 pins it.
- **The e2e workers' fail-proofs were run by the workers**, not re-run here. The green runs above were.

## Next

- Story 6.1 is through the pipeline (ATDD, build-auto, code review, automate). Story 6.2 (`6-2-see-when-my-whole-unread-library-will-be-finished`) starts with `bmad-testarch-atdd`.
- PAC-API-001 and PAC-E2E-001 cover Book scope; 6.2 adds library scope and Catalog. Tick the trace when both are green.
