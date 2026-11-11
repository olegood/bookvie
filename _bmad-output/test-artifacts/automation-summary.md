---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-11'
storyId: '6.4'
storyKey: '6-4-see-my-reading-month-by-month'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-6-4-see-my-reading-month-by-month.md (Intent, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-6-4-see-my-reading-month-by-month.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build-auto and code review of spec-6-4, 2026-11-11)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/stats.spec.ts (split this run into stats.ts and stats-bars.spec.ts); frontend/e2e/card-notes.spec.ts (token probe pattern); frontend/src/lib/stats.test.ts; backend/tests/test_stats.py
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

# Automation Summary: See my reading month by month (story 6.4)

The previous version of this file held the summary for story 6.3. It's in git history (`fa9fb3a`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-Integrated. The story is `done` after `bmad-code-review` (`a12fb25`), which closed Epic 6.
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `frontend/package.json`, so that gate stays closed and the Traditional Patterns fragments load instead. `tea_use_pactjs_utils` is on, but contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`. Auto-heal is off.
- **Inputs:** the 6.4 entries in `deferred-work.md` are spine drift (AD-6) and the field docstrings that don't reach the OpenAPI, and neither needs a test. The ATDD checklist has 21 `[ ]` lines. The build and the code review already built most of them.

## Coverage Plan

**Scope:** selective. The 4 ATDD leaves, the build's 9 backend tests and 6 e2e leaves, the 3 client unit suites and the code review's 4 tightened leaves cover AC-1 to AC-4 and every row of the I/O matrix. This run adds only the spec rules that no test pins yet.

**Browser exploration:** skipped. The page is small, the existing leaves already pin its locators (`chartColumns`, `chartTable`), and reading the code was enough.

| # | Target | Level | Priority | Where | Why at this level |
|---|---|---|---|---|---|
| T1 | The bars use the theme's `accent` fill on an `accent-soft` track, and the value and period labels are `meta`, in light and dark (spec, "The chart"; ATDD follow-up "design tokens") | E2E | P2 | `stats-bars.spec.ts` | Only the browser resolves the tokens per theme. axe checks contrast, not which token is used, so swapping the fill and track would still pass |
| T2 | The first bar carries its year even when it isn't January: Custom 2026-09-01..2026-10-28 reads `Sep / 2026`, then `Oct` (spec, "The period labels") | E2E | P2 | `stats-bars.spec.ts` | `barLines(…, first)` is unit-tested, but the only e2e first bar is January, which carries its year anyway. `StatsBars` could pass `false` for `first` and every test would pass |

**Not planned:**
- **A finish with no `finishedPages` in its own bucket** (code review, rejected). `test_p1_the_buckets_add_up_to_the_totals` already includes such a Reading, so dropping it from a bucket fails that test.
- **Year buckets without a cap, many columns** (code review, rejected). It's cosmetic in an `aria-hidden` chart, and the spec keeps it.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There is no new endpoint and no API target.
  - **3B-backend:** not launched. There is no backend target (see Not planned).
  - **3B-e2e:** T1 and T2. For its fail-proofs it changed only `StatsBars.module.css` and `StatsBars.tsx`, and restored both from copies. The T2 mutation fails `tsc -b` (unused `index`), but Playwright's `global-setup.ts` runs `vite build` without tsc, so the mutated bundle was still served.
- **Fixtures:** none added. The worker added two computed font sizes (`valueFontSize`, `periodFontSize`) to the `chartColumns` helper.
- **Split for H5 (file size):** with the new leaves, `stats.spec.ts` reached 1,029 lines, over the project hook's 1,000-line limit (tea-enforce H5 HIGH). It now follows the `home.ts` / `bookcase.ts` pattern:
  - `frontend/e2e/stats.ts` (166 lines): the shared seeds (`FLOW_7`, `NOTHING_FINISHED`, …) and locator helpers (`preset`, `dateField`, `figure`, `statsRequest`, …), now exported.
  - `frontend/e2e/stats.spec.ts` (510 lines): Story 6.3.
  - `frontend/e2e/stats-bars.spec.ts` (385 lines): Story 6.4, its chart helpers and its two seeds (`THE_TOME`, `YEARS_APART`).
  - No leaf changed in the move: the two specs ran 28 passed, the same count as the single file.
- **Review of the worker's output:** read in full; no changes were needed beyond the split. Its output JSON reports `success: true`. It is in the job's scratch directory, not `/tmp`, because this session keeps temp files there; it is scratch and isn't committed.

## Tests Added

| File | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| `frontend/e2e/stats-bars.spec.ts:314` | AC-2 the bars are an accent fill on an accent-soft track, with meta labels, in light and in dark | P2 | T1 | `.fill` and `.track` swap `--color-accent` and `--color-accent-soft` (expected `rgb(85, 112, 89)`, got `rgb(227, 235, 226)`; only this leaf failed) |
| `frontend/e2e/stats-bars.spec.ts:367` | AC-2 the first bar carries its year even when it is not January | P2 | T2 | `StatsBars` passes `false` for `barLines`' `first` (the `2026` line is missing; only this leaf failed) |

Every mutation was reverted. Afterwards `git diff --stat -- frontend/src backend/bookvie` is empty.

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** each target maps to a spec rule that no test pinned before (the chart's tokens and `meta` labels; the first bar's year).
- **Duplicates:** none. The forced-colours leaf checks system colours; T1 checks the theme tokens. The January leaf can't tell the first-bar rule from the January rule; T2 can.
- **Quality:**
  - no `waitForTimeout`, conditionals or `.only`/`.skip`;
  - every assertion constrains a value (resolved colours, font sizes, exact period lines);
  - T2 is network-first: `statsRequestFor` is registered before the fill that sends the request;
  - each leaf starts its own server and stops it in `finally`;
  - no file over 1,000 lines after the split.
- **Browser sessions:** no CLI sessions were opened.

Runs, in this session after the worker finished and after the split:
- `TZ=Europe/Madrid npm run check`: exit 0. That covers Prettier, ruff, oxlint, `tsc -b`, the `api:gen` byte compare, pytest (1,390 passed, coverage 98%), the node unit tests, 557 e2e passed (555 before this run), and the smoke check.
- `stats.spec.ts` and `stats-bars.spec.ts` together: 28 passed. The worker's runs: the two new leaves 10 of 10 with `--repeat-each=5`.

## ATDD Checklist

`atdd-checklist-6-4-see-my-reading-month-by-month.md` now has 0 `[ ]` lines:
- **Ticked with evidence:** the 9 implementation lines and all 12 green-phase follow-ups. 10 of the follow-ups were already built by the build and the code review; T1 and T2 closed the design-token and period-label lines.
- **Retired:** none.
- **Red phase:** the section is now marked historical, with a "Since then (green)" note. Its references to 6.4 leaves point at `stats-bars.spec.ts`.

`deferred-work.md` needs no `resolved:` line. Its 6.4 entries are spine drift, which the next-epic reconciliation closes, and the OpenAPI docstrings, a project-wide choice.

## Playwright Utils deviations

`tea_use_playwright_utils` is true, but `@seontechnologies/playwright-utils` isn't installed, so the mandate doesn't apply. The new leaves use the spec's vanilla patterns:
- `frontend/e2e/stats-bars.spec.ts:367`: `page.waitForRequest` (via `statsRequestFor`) in place of `interceptNetworkCall`.
- `frontend/e2e/stats-bars.spec.ts:12`: `test` comes from `./fixtures.ts`, not `support/merged-fixtures`, which doesn't exist.

Recommended utilities that weren't wired: none needed. bookvie has no auth, and the e2e servers are per-test local processes.

## Assumptions and Risks

- **T1 reads tokens through a probe element**, as `card-notes.spec.ts` does. If DESIGN.md ever gives `accent` and `accent-soft` the same value in a theme, T1 would no longer tell them apart. Its light/dark difference check would still catch a theme that didn't switch.
- **T2's mutation isn't type-clean.** `tsc -b` refuses it, so CI's check would also catch that particular mutation. The leaf still guards any type-clean way of losing the first bar's year.

## Next

Story 6.4's pipeline is complete: ATDD, build, code review, then automate. 6.4 closed Epic 6, so the next step is the **Epic 6 retrospective** (`bmad-retrospective` for epic 6). Before Epic 7's first story come the retrospective, the epic's trace and gate, and the spine reconciliation of Epic 6's "spine drift" entries (AGENTS.md "Epic boundaries").
