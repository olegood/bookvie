---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-10-30'
storyId: '1.6'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-1-6-open-bookvie-to-an-empty-shelf.md
  - _bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md
  - _bmad-output/test-artifacts/test-design-qa.md
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/fixtures.ts
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

# Automation Summary: Story 1.6, Open bookvie to an empty shelf

The Story 1.1 summary that used to live in this file is in git history (`28f0bfa`).

**Execution mode:** BMad-Integrated (story spec + ATDD checklist + system test design)
**Detected stack:** fullstack, run scoped to **frontend**. Story 1.6 changed only `frontend/`, and it adds no endpoint.
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`), so the vanilla `fixture-architecture` / `network-first` patterns apply.
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Config resolves to subagent mode, but 12 small targets in 5 files cost less to write inline. No API or backend worker ran: the story has no endpoint and no backend change.
**Total tests added:** 13 new tests plus 4 assertions in existing tests (unit 41 → 48, e2e 47 → 53, all green).
**Browser exploration:** skipped. `playwright-cli` is not installed, and the shell is small enough to map from source. Every selector reuses a role or name the green ATDD tests already pin.

## Baseline

- `npm --prefix frontend run check:api`: 41 unit tests, all pass.
- `npx playwright test`: 47 e2e tests, all pass (5.9 s).
- All 14 ATDD criteria are active. The code review added 9 more e2e tests: storage that throws, junk stored theme, background refetch, the nav underline, forced colors, a non-empty shelf, the 404 title, Back focus, and Try again focus.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Only behaviour in the spec (Always rules, I/O matrix, ACs) with no test that can fail on it.

| # | Target (AC / constraint) | Level | Priority | File |
|---|---|---|---|---|
| 1 | Light wins over an OS dark preference (`:root:not([data-theme="light"])`) | E2E | P1 | `e2e/app-shell.spec.ts` |
| 2 | Theme is applied before the first render: `data-theme` is set before `#root` gets content | E2E | P2 | `e2e/app-shell.spec.ts` |
| 3 | AC-2 Skip to content is off-screen until it takes focus | E2E | P2 | `e2e/app-shell.spec.ts` |
| 4 | AC-5 live regions sit outside `main`; `status` is polite | E2E | P2 | `e2e/app-shell.spec.ts` |
| 5 | AC-9 `button-secondary` (Try again) matches DESIGN.md | E2E | P2 | `e2e/catalog-empty.spec.ts` |
| 6 | AC-7 a second failed Try again shows and announces Couldn't load again | E2E | P2 | `e2e/catalog-empty.spec.ts` |
| 7 | AC-6 matrix "`main` empty" while loading | E2E (added assertion) | P1 | `e2e/catalog-empty.spec.ts` |
| 8 | AC-7 matrix "visible … in `main`": the failure line is visible, not only in the hidden alert | E2E (added assertion) | P0 | `e2e/catalog-empty.spec.ts` |
| 9 | AC-9 link underline is 1px | E2E (added assertion) | P2 | `e2e/app-shell.spec.ts` |
| 10 | AC-12 month/year boundaries, leap year, spring-forward DST, across four time zones | Unit | P2 | `src/lib/relativeDay.test.ts` |
| 11 | AC-14 the copy guard's detectors flag known-bad samples, so the guard can fail | Unit | P2 | `scripts/copy.test.mjs` |
| 12 | Always: pages get data only via `src/api/` (no raw `fetch`/XHR elsewhere); no `data-testid` in `src/` or `e2e/` | Unit (static) | P1 | `scripts/boundaries.test.mjs` (new) |

**Not added (and why):**
- Non-2xx first load at E2E: `views.test.ts` "rejects on an error status" and `toViewState` cover it at unit level. The abort path already drives the same `failed` UI.
- An explicit "h1 not focused on first load" test: AC-2 already pins it, because Tab must land on Skip to content first.
- TextField, Button `disabledReason`, `theme.ts` units, `useNow`, cross-tab sync, Invalid Date: the code review rejected these twice (triage #13, #17, #18, #22, #23) because they have no consumer yet. This run does not reopen that.
- `errorElement` for render crashes: deferred in `deferred-work.md` (triage #5).

## Priority Totals

| Level | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| E2E (new tests) | 0 | 1 | 5 | 0 | 6 |
| Unit (new tests) | 0 | 2 | 5 | 0 | 7 |
| **Total new** | 0 | 3 | 10 | 0 | **13** |

Added assertions in existing tests: AC-6 `main` is empty while loading (P1), AC-7 the failure line is visible in `main` (P0), and AC-9 the link underline is 1px (P2). The unit P2 count is the relativeDay case run once per zone (4) plus the copy-guard detector self-test (1).

## Files Created/Updated

### Created
- `frontend/scripts/boundaries.test.mjs`: two static guards. Only `src/api/` may call `fetch`/XHR/EventSource/WebSocket/`sendBeacon`. No `data-testid`, `getByTestId` or `testIdAttribute` may appear in `src/` or `e2e/`. Each guard first checks that it scanned something (`src/api/views.ts`, `e2e/app-shell.spec.ts`), so neither can pass on an empty scan.

### Updated
- `frontend/e2e/app-shell.spec.ts`: new `(automate)` describe with 4 tests: Light holds over an OS dark preference; the stored theme reaches `<html>` before `#root` gets content (a MutationObserver records the order); Skip to content stays off-screen until focused; the live regions sit outside `main` and status is polite. AC-9 also asserts the link's 1px underline now.
- `frontend/e2e/catalog-empty.spec.ts`: new `(automate)` describe with 2 tests. A second failed Try again shows Couldn't load again and re-announces it (the alert's text history must read `['', COULDNT_LOAD]`). Try again matches `button-secondary`. AC-6 and AC-7 each get one added assertion (see above).
- `frontend/src/lib/relativeDay.test.ts`: one case per zone (Madrid, New York, Chatham, Kolkata) for month and year ends, the leap day, 365 against 366 days across 29 Feb 2028, and the 2026 DST changes in both hemispheres. TZ is put back after each case.
- `frontend/scripts/copy.test.mjs`: the AC-14 checks are lifted into named detectors (`shouting`, `greetingsOrPraise`, `redColors`, `hoverOnly`, `forbiddenCode`). The ATDD test runs the same checks over the same files. A new test shows each detector flags a bad sample and passes a calm one (accent and wood hexes, the `:hover` + `:focus-visible` pair, `event.key === 'Escape'`).

## Validation

- `npm run check`: exit 0. pytest 353 passed, `check:api` 48/48, e2e 53/53, smoke ok.
- Burn-in: `app-shell.spec.ts` + `catalog-empty.spec.ts` `--repeat-each=10 --retries=0` → 240/240 in 18.1 s.
- Mutation checks, each reverted and rebuilt afterwards (only test files differ in `git status`):
  - `relativeDay` with `Math.round(ms / DAY_MS)` → all 4 zone cases fail, as does the ATDD case.
  - A raw `fetch` in `NotFoundPage.tsx` → "only src/api/ talks to the server" fails.
  - Dropping the `:not([data-theme="light"])` guard in tokens.css → "Light holds when the OS prefers dark" fails.
  - Theme applied from a `ThemeToggle` effect instead of before `createRoot` → "stored theme is on <html> before the app renders" fails. `setTimeout(applyTheme, 0)` passes, correctly: it still lands before React's first commit.
- One self-inflicted failure, fixed in the same run: the theme-order observer at first recorded one `render` for each of the shell's 4 top-level nodes. It now records only the first insertion.
- Quality: no hard waits, every `page.route` is set before `goto`, role and name selectors only, tests grouped and named for behaviour, one assertion dialect per file. No CLI browser sessions were opened.

## Key Assumptions and Risks

- The theme-order test reads DOM mutation order, not pixels. It proves the theme is set before React's first commit. It does not prove that no frame painted first; the code review rejected that flash as maybe-false.
- The RGB values in the AC-9 `button-secondary` test are DESIGN.md light tokens, written in by hand as the ATDD tests do. A token change will turn this test red together with AC-1, which is intended.
- `boundaries.test.mjs` copies the small file walker and comment stripper from `copy.test.mjs` instead of sharing them. That's two copies of about 10 lines; extract a helper if a third scanner appears.

## Playwright Utils deviations

None. The mandate is off (`tea_use_playwright_utils: false`).

## Next Recommended Workflow

- `bmad-testarch-trace` for Story 1.6, to roll the 14 ACs and these additions into the traceability matrix and gate decision.
- Optionally `bmad-testarch-test-review` on `app-shell.spec.ts`. At about 360 lines it's the largest spec in the suite.
