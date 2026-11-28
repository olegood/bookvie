---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-28'
storyId: 'epic-17-retro-item-112'
storyKey: 'epic-17-retro-item-112-rescue-focus-from-any-removed-stats-control'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-epic-17-retro-item-112-rescue-focus-from-any-removed-stats-control.md (Intent, Always/Never, I/O matrix, ACs, Implementation Notes, Review Findings)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/src/pages/StatsPage.tsx, frontend/src/components/StatsFinishedList.tsx, frontend/src/lib/announce.ts, frontend/src/lib/stats.ts
  - frontend/e2e/stats-bars-focus.spec.ts, stats.ts; frontend/src/lib/announce.test.ts, stats.test.ts
  - resources/knowledge: test-levels-framework.md, test-priorities-matrix.md, data-factories.md, selective-testing.md, ci-burn-in.md, test-quality.md, fixture-architecture.md, network-first.md, playwright-cli.md (core and Traditional Patterns; no Playwright Utils, no Pact)
---

# Automation Summary: Epic 17 retro item 112, rescue focus from any removed Stats control

## Preflight

- **Done at HEAD:** the spec's frontmatter reads `status: 'done'` at HEAD (`c6eb8f9`, the code review's commit). Item 112 is a retro item, not a story, so it has no `development_status` key.
- **Stack:** fullstack (`frontend/package.json` with React and `playwright.config.ts`; `backend/pyproject.toml`). The change is frontend only.
- **Framework:** Playwright, Chromium only (`testDir: 'e2e'`), and `node --test` for `frontend/src/**/*.test.ts`.
- **Mode:** BMad-Integrated, from the spec.
- **ATDD checklist:** none. Oleg waived the ATDD step for this spec (code review, 2026-11-28).
- **Config:** `tea_use_playwright_utils: false`, `tea_use_pactjs_utils: false`, `tea_browser_automation: auto`, `test_stack_type: auto`.

## Coverage plan

**Already covered** (spec and review, re-read this run):
- All 8 I/O-matrix rows have a leaf in `frontend/e2e/stats-bars-focus.spec.ts`.
- `arrivalSearch` has 6 unit cases in `stats.test.ts`, and `clearStatus` has 3 in `announce.test.ts`.
- The midnight-focused leaf (`:204`) fails with the same-selection clause removed (code review probe).

**Gaps, and the level for each.** The leaves reuse the spec's local helpers (`H1`, `nextStatsResponse`, `removeFebruaryFinish`, `refetchOnFocus`), so no helper is added or moved.

| # | Target | Level | Priority | Why it's not a duplicate | Result |
|---|---|---|---|---|---|
| 1 | A row of the whole range (no `period`) that a refetch empties when no bar is left: focus goes to the `h1`, the address is unchanged, nothing is spoken | E2E | P2 | The rescue's "else the `h1`" with no drop. The last-row leaf goes through a drop. | `stats-bars-focus.spec.ts:327` |
| 2 | A failed new-day fetch with focus on a narrowed row: the `h1` gets focus at once, and the recovery leaves it there | E2E | P2 | `StatsFinishedList`'s report on the failed path. The matrix leaf starts from a bar (`StatsBars`). | `stats-bars-focus.spec.ts:353` |
| 3 | `clearStatus` after an alert replaced a pending status line keeps the alert (`pendingKind` follows the latest `announce`) | Unit | P2 | The existing cases cover a single pending line only. | `announce.test.ts`, "[P2] clearStatus keeps an alert that replaced a pending status line" |
| 4 | `arrivalSearch` with a canonical range and a malformed `period` returns `null` (the settled drop handles it); a bad range with no `period` returns `range=thisYear` | Unit | P2 | It pins the pure contract that e2e `stats-bars-select.spec.ts:567` reaches only through the UI. | `stats.test.ts`, two `[P2]` cases in `arrivalSearch` |

**Scope:** selective. These are the edge paths the change opened that no leaf reaches. Safari and Firefox are out of scope (AGENTS.md "Supported browser").

- **Execution mode:** sequential in this session, as in 17.1 and 17.2. The change is frontend only, so the API and backend workers had no target.

## Results

- **Tests added:** 4 targets. They are 2 e2e leaves in a new `(automate)` describe at the end of `frontend/e2e/stats-bars-focus.spec.ts`, and 3 unit cases: 1 in `frontend/src/lib/announce.test.ts`, 2 in `frontend/src/lib/stats.test.ts`.
- **Runs this session:**
  - `stats-bars-focus.spec.ts`: 10 passed.
  - Burn-in of the two new leaves (`--repeat-each=5 --retries=0`): 10 passed.
  - `npm run check:api` exit 0. That covers api:gen, Prettier, oxlint and `tsc -b`, and the unit suite passed 469 (466 before this run).
- **Mutation probes:** each was an edit reverted by hand, then a rebuild, with `git status` showing only test files after.
  - With the rescue's `|| failed` removed, `:353` fails, along with the matrix leaf at `:255`.
  - With the row `li`'s ref removed, `:327` and `:353` fail, along with the three matrix row leaves.
- **Files changed:** `frontend/e2e/stats-bars-focus.spec.ts`, `frontend/src/lib/announce.test.ts`, `frontend/src/lib/stats.test.ts`, and this summary.
- **Production code:** none touched. No defect was found.
- **ATDD checklist:** none for this spec, since ATDD was waived.

## Helpers

One local helper was added to `stats-bars-focus.spec.ts`: `removeEveryFinish(page)`, the "every finish removed" stats route.
- The new whole-range leaf needed the same stub as the existing last-row leaf (`:138`), which had it inline. So the stub moved into one helper that both use, and that leaf's assertions and title are unchanged.
- No existing helper fits. `removeFebruaryFinish` removes one finish. Nothing in stats.ts stubs the route: `NOTHING_FINISHED` is a seeded library, not a route.
- The leaves also reuse:
  - from the spec: `H1` and `refetchOnFocus`;
  - from home.ts: `serverAtFakeToday` and `stopAndRemove`;
  - from stats.ts: `BARS`, `finishedLinks`, `address`, `afterAnnounceDelay`, `STATS_API`, `COULDNT_LOAD` and `statsRequestFor`.

## Risks and next

- **Not automated:** a refetch that reorders kept rows (a focused `li` moved by `insertBefore`). The code review rejected it as rare (another context must change a finish date while focus sits on a row), and its fix is a production change.
- **Next:** Epic 17's remaining before-next-epic items in `sprint-status.yaml` (the trace and gate, item 115, and the spine reconciliation, item 114). Item 112's own sprint entry still reads `open`.
