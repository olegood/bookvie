---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-17'
storyId: '11.2'
storyKey: '11-2-keep-development-apart-from-the-real-library'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-11-2-keep-development-apart-from-the-real-library.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings, Verification)
  - _bmad-output/test-artifacts/atdd-checklist-11-2-keep-development-apart-from-the-real-library.md
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts; frontend/e2e/fixtures.ts
  - frontend/e2e/dev-mode.spec.ts; frontend/e2e/dev-mode-production.spec.ts; frontend/e2e/dev-proxy.spec.ts; frontend/e2e/dev-mode.ts
  - frontend/src/components/AppShell.tsx + AppShell.module.css; frontend/src/lib/page.ts; frontend/src/api/views.ts
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.dev-pill, DEV pill row)
  - backend/bookvie/cli.py; backend/tests/test_dev_mode.py; backend/tests/test_cli.py (real-process pattern); backend/tests/test_wheel_build.py
  - scripts/smoke.mjs
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

# Automation Summary: Keep development apart from the real library (story 11.2)

The previous version of this file held the summary for story 11.1. It's in git history (`1d82463`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 11.2 is `done` after `bmad-code-review` (commit `402fc43`, working tree clean at the start of this run). The spec and ATDD checklist are present.
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `package.json`, so the Playwright Utils gate stays shut and the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 18 green-phase follow-ups and the 7 lines of its implementation checklist. The code review deferred the CI case-variant gap (a CI-gate question, no test to write while the local check is the gate) and spine drift (no test work).

## Coverage Plan

Browser exploration skipped: `playwright-cli` isn't installed, and the existing `dev-mode.ts` helpers already describe the pill and the shell. Targets come from the spec, the ATDD checklist and the Story 11.2 source.

The build already delivered 9 of the 18 follow-ups (the pytest edge cases, the favicon route, the wheel, smoke and the `pageTitle` unit test), so they are ticked, not re-written. The other 9 are new leaves: 8 e2e leaves in a new `frontend/e2e/dev-mode-automate.spec.ts` (the `*-automate.spec.ts` convention) and one parametrized pytest in `backend/tests/test_dev_mode.py`. The 11 ATDD leaves stay as they are.

| # | Target (ATDD follow-up) | Level | Priority | Why |
|---|---|---|---|---|
| 1 | AC-2 a real `python -m bookvie.cli --dev` process exits 2 | Pytest (subprocess) | P1 | The ATDD leaves call `main()` in-process; only a real process shows the exit code a shell sees and that nothing reaches stdout. |
| 2 | AC-6 through Vite: pill and `DEV · ` title | E2E | P1 | The build's residual risk: the client was proven only on server-served bundles. |
| 3 | AC-6 Tab order never stops in the wordmark | E2E | P1 | Keyboard users; the ATDD leaf checks `focus()` on the pill, not the Tab sequence. |
| 4 | AC-6 axe in light and dark, banner reads "bookvie DEV" | E2E | P1 | Contrast of the amber pill in both schemes. |
| 5 | AC-8 client navigation after a failed refetch keeps the prefix | E2E | P1 | The ATDD leaf stays on one route; a route change rebuilds the title. |
| 6 | AC-6 Theme Dark under OS light, Theme Light under OS dark | E2E | P2 | The pill's `data-theme` rules; the ATDD leaf switches only the OS scheme. |
| 7 | AC-6 centered on the word, about 20px tall | E2E | P2 | DESIGN.md → DEV pill geometry. |
| 8 | AC-9 forced colors in the dark scheme | E2E | P2 | The dark-scheme pill rule outranks the forced-colors rule on specificity (Acceptance Auditor, code review). |
| 9 | AC-7 a production page under forced colors shows nothing new | E2E | P2 | Production unchanged in the high-contrast path too. |
| — | 9 follow-ups delivered by the build | Pytest / smoke / unit | — | Tick only, each with its test (see the ATDD checklist). |

**Scope:** selective. The checklist's follow-ups, nothing more.

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session instead: nine small leaves in two files that share helpers didn't justify a worker hand-off, and workers editing one spec in the shared checkout would collide. The output contract is unchanged.
- **One structural fix while writing:** `test.use({ serverDev: true })` can't sit inside a `describe` (it forces a new worker), so it is top-level, and the production leaf starts its own server with `startSeededServer`, as `dev-mode.spec.ts`'s AC-4 leaf does.
- **Production code untouched:** `git status` lists only the files below.

## Tests Added

No helper, fixture or factory was added; the leaves use `dev-mode.ts` (`devPill`, `watchAppInfo`, `systemColor`, `elementsColored`, `designComponentColor`, `ROUTES`) and `fixtures.ts` (`freePort`, `startSeededServer`).

`frontend/e2e/dev-mode-automate.spec.ts`:

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 46 | AC-6 the DEV pill follows bookvie Theme over the OS scheme | P2 | `:root[data-theme='dark'] .devPill` renamed to a selector that never matches (background stayed light amber) |
| 70 | AC-6 the DEV pill is centered on "bookvie" and about 20px tall | P2 | not mutated; measured 20px and centered within 1px today |
| 93 | AC-6 Tab from Skip to content to the Theme toggle never lands in the wordmark | P1 | `tabIndex={0}` on the pill (the Tab walk stopped inside the wordmark) |
| 117 | AC-6 axe passes in light and dark; the banner reads "bookvie DEV" | P1 | not mutated |
| 134 | AC-8 after a failed refetch, a client-side route change keeps the prefix and the pill | P1 | not mutated |
| 160 | AC-9 forced colors in the dark scheme: Canvas, CanvasText, 1px CanvasText border | P2 | not mutated; it passes, so Chromium's forced colors win over the dark rule's specificity |
| 190 | AC-6 a tab served by Vite shows the pill and the `DEV · ` title | P1 | not mutated |
| 224 | AC-7 a production page under forced colors: no pill, no prefix, no dev amber (light and dark, every route) | P2 | not mutated |

`backend/tests/test_dev_mode.py:390` `test_a_real_dev_process_refuses_the_real_library_with_exit_2` (P1, 2 leaves: the real folder existing and missing): runs `python -m bookvie.cli --dev --no-browser --data-dir ~/bookvie-data` with `HOME` a temp folder and checks exit 2, stderr exactly the refusal plus a newline, empty stdout, the real folder unchanged (or still absent) and no `~/bookvie-data-dev` created. Not mutated: a refusal that let the start through would leave the server running into the 30 s timeout, which fails the leaf too.

Both mutations were by-hand edits of `AppShell.module.css` and `AppShell.tsx`, copied to the session scratch directory first and copied back after; the bundle was rebuilt and `git status` showed neither file changed. No git command changed the tree.

Priority coverage: P0 0, P1 5 (with the pytest), P2 4, P3 0. The story's P0 paths are the ATDD leaves.

## Validation

- New and ATDD e2e together (`dev-mode-automate`, `dev-mode`, `dev-mode-production`, `dev-proxy`), `--repeat-each=3`: 51 passed. The new pytest: 2 passed. Prettier, `tsc -b` and oxlint (frontend) and ruff format and check (backend) clean on the changed files.
- `npm run check` (repo root, this session, after both mutations were reverted): **exit 0**. That is ruff and pytest (1605 passed: 1603 before this run, plus 2; coverage gates domain 100%, intents+store 98.08%), format, tsc and oxlint, node tests (371 passed, 0 skipped), `check:e2e` (**749 passed**: 741 before this run, plus 8), and smoke ok (`installed favicon-dev.svg is the built file`). No `~/bookvie-data-dev` was created.
- Quality scan of the new spec: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (two schemes, `ROUTES`, four border sides, at most 30 Tab presses). Refetches are awaited through `watchAppInfo` and `expect.poll`; the Vite server is closed in `afterEach`, the production server in `finally`.
- No CLI browser sessions were opened. Temp artifacts (file backups, the check logs) are in the session scratch directory, not the repo.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is true in config, but `@seontechnologies/playwright-utils` isn't installed, so the mandate's gate doesn't open; the leaves use the repo's own fixtures and helpers (`page.route`, `page.on('response')`), as every other spec does.

## ATDD Checklist

`atdd-checklist-11-2-keep-development-apart-from-the-real-library.md`: all 18 green-phase follow-ups and all 7 implementation-checklist lines are ticked, each with its evidence. Remaining `[ ]`: **0**.

## Assumptions and Risks

- **The geometry leaf is tied to today's font metrics.** A different system font in `section-label` could move the height by more than 1px; DESIGN.md says "about 20px", and the leaf allows ±1.
- **The Vite leaf points the proxy at the test's dev server,** not at 8766, as `dev-proxy.spec.ts` does; the static map test in `dev-proxy.spec.ts` covers the 8766 target.
- **The AC-9 dark leaf records Chromium's forced-colors override** of the dark rule's background. If Chromium stopped forcing author backgrounds, the leaf would fail, and the fix is a forced-colors rule with the dark selector's specificity.
- **The case-variant refusal still runs only on macOS** (code review deferral, `deferred-work.md`).

## Next

Story 11.2 is Epic 11's second story; 11.3 and 11.4 are still to do. Next: Story 11.3's ATDD (`bmad-testarch-atdd`). The spine-drift entries from 11.1 and 11.2 wait for the Epic 11 reconciliation.
