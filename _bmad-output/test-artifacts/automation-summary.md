---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-17'
storyId: '11.1'
storyKey: '11-1-a-favicon-for-bookvie'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-11-1-a-favicon-for-bookvie.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings, Verification)
  - _bmad-output/test-artifacts/atdd-checklist-11-1-a-favicon-for-bookvie.md
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts; frontend/e2e/fixtures.ts
  - frontend/e2e/favicon.spec.ts; frontend/e2e/favicon.ts
  - frontend/public/favicon.svg; frontend/index.html
  - backend/bookvie/http/app.py (favicon route); backend/tests/test_app.py; backend/tests/test_wheel_build.py; backend/pyproject.toml
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

# Automation Summary: A favicon for bookvie (story 11.1)

The previous version of this file held the summary for story 10.1. It's in git history (`34cd03a`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 11.1 is `done` after `bmad-code-review` (commit `890c13e`, working tree clean at the start of this run). The spec and ATDD checklist are present.
- **Config:** `tea_use_playwright_utils: false`, and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 8 green-phase follow-ups and the 7 lines of its implementation checklist. The code review deferred only spine drift (no test work).

## Coverage Plan

Browser exploration skipped: the favicon has no UI to explore, and `playwright-cli` isn't installed. Targets come from the spec, the ATDD checklist and the Story 11.1 source.

The build already delivered four of the eight follow-ups, so they are ticked, not re-written. The remaining four are new leaves: three e2e leaves (one runs under both schemes) in a new `frontend/e2e/favicon-automate.spec.ts` (the `*-automate.spec.ts` convention), and one pytest in `backend/tests/test_wheel_build.py`. The 6 ATDD leaves stay as they are.

| # | Target (ATDD follow-up) | Level | Priority | Why |
|---|---|---|---|---|
| 1 | AC-3 HEAD `/favicon.svg` | API | — | Already delivered by the build (`test_app.py:89`); tick only. |
| 2 | AC-3 no built icon: 404, never `index.html` | API | — | Already delivered by the build (`test_app.py:100`); tick only. |
| 3 | AC-3 foreign `Host` gets 403 | API | — | Already delivered by the build (`test_app.py:115`); tick only. |
| 4 | AC-4 smoke compares the installed server's body with the built file | Smoke | — | Already delivered by the build (`scripts/smoke.mjs:137`); tick only. |
| 5 | AC-1 the 16×16 silhouette: spines and plank stay apart, in both schemes | E2E | P2 | The tab draws the icon at 16 px; only a real raster shows whether the gaps survive. |
| 6 | AC-2 the served `index.html` text holds exactly one icon link on every route | E2E (request) | P2 | The ATDD leaf reads the DOM after scripts ran; this reads the HTML Chromium gets. |
| 7 | AC-4 the wheel carries a top-level `static/favicon.svg` | Pytest (real `uv build`) | P2 | The wheel test covered `index.html` and `assets/` only. |
| 8 | AC-5 forced colors leave the fill alone | E2E | P3 | Records today's Chromium behavior so a change is noticed. |

**Scope:** selective. The checklist's follow-ups, nothing more.

## Execution

- **Mode:** `tea_execution_mode: auto` would resolve to **subagent**. This run stayed **sequential** in the main session instead: four small leaves, all pinned by a probe that had to run first, didn't justify a worker hand-off. The output contract is unchanged.
- **Probe:** a throwaway `frontend/e2e/favicon.probe.spec.ts` drew the served `/favicon.svg` through an `<img>` into a 16×16 canvas under both schemes and dumped its alpha grid. Spine columns 2–4, 7–9 and 11–13 read 255 in rows 6–11; the gap columns read 127 (col 5) and 63 (col 10); row 12 (between the spines and the plank) reads at most 128; plank rows 13–14 read 255 from column 1 to 14. Every opaque pixel was `rgb(85, 112, 89)` under light and `rgb(147, 181, 151)` under dark, so a rasterized `<img>` follows the page's scheme as the tab does. Under `forcedColors: 'active'` the document's fill stayed the accent in both schemes. The raw HTML of `/`, `/catalog` and `/no-such-page` held the one link tag. The probe was then removed with `rm`.
- **Production code untouched:** `git status` lists only the files below.

## Tests Added

**New helper:** `faviconRaster(page, url, size)` in `frontend/e2e/favicon.ts`. It draws an image through `<img>` into a canvas and returns the alpha grid and the opaque colors. It is what the probe ran, moved into the helper file. No existing helper changed, and no fixture or factory was added.

`frontend/e2e/favicon-automate.spec.ts`, describe "Story 11.1 A favicon for bookvie (automate)":

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 27 | AC-1 drawn at 16×16 under the light / dark scheme, the three spines and the plank stay apart in one flat fill (2 leaves, one per scheme) | P2 | the middle spine widened to start at x 11 (`row 7, gap column 5` read 254, both schemes); separately, the dark `@media` rule removed (the dark leaf's opaque color read the light accent) |
| 60 | AC-2 the served index.html of every route holds exactly one icon link, before any script runs | P2 | a second `<link rel="shortcut icon" href="/favicon.ico" />` in `index.html` (2 matches on `/`) |
| 76 | AC-5 under forced colors the served favicon keeps its accent fill in both schemes | P3 | `@media (forced-colors: active) { path { fill: CanvasText; } }` in the SVG (read `rgb(0, 0, 0)`) |

`backend/tests/test_wheel_build.py:64` `test_wheel_contains_the_top_level_favicon` (P2): builds a real wheel with `index.html` and a top-level `favicon.svg` in the copied `static/`, and reads `bookvie/http/static/favicon.svg` back from it byte for byte. Proven red only with both `artifacts` narrowed to `index.html` and `assets/**` **and** an `exclude` of the favicon in `pyproject.toml` (`KeyError: no item named …favicon.svg`). Either mutation alone stays green: in this copied tree, `packages = ["bookvie"]` already picks up `static/`, and `artifacts` outranks `exclude`.

Every mutation was a by-hand edit of one file (`frontend/public/favicon.svg`, `frontend/index.html` or `backend/pyproject.toml`), copied to the session scratch directory first and copied back after; `cmp` confirmed each file matches its original. No git command changed the tree.

Priority coverage: P0 0, P1 0, P2 4, P3 1. The story's P0 and P1 paths are the ATDD leaves.

## Validation

- New and ATDD e2e together, `--repeat-each=3`: 27 passed. `tests/test_wheel_build.py`: 3 passed. Prettier (frontend) and ruff format and check (backend) clean on the changed files.
- `npm run check` (repo root, this session, after every mutation was reverted): **exit 0**. That is ruff and pytest (1579 passed: 1578 before this run, plus 1; coverage gates domain 100%, intents+store 98.08%), format, tsc and oxlint, node tests (369 passed), `check:e2e` (**733 passed**: 729 before this run, plus 4), and smoke ok (`GET /favicon.svg -> 200 as image/svg+xml, the built file`). The e2e global setup rebuilt `static/` from the restored sources.
- Quality scan of the new spec: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (two schemes, four routes, fixed pixel columns). The raster is read only after the banner's navigation is visible and `image.decode()` has resolved; the forced-colors reads go through `expect.poll`.
- No CLI browser sessions were opened. Temp artifacts (probe output, file backups, the check log) are in the session scratch directory, not the repo.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is false and the package isn't installed; the leaves use the repo's own fixtures and helpers.

## ATDD Checklist

`atdd-checklist-11-1-a-favicon-for-bookvie.md`: all 8 green-phase follow-ups and all 7 implementation-checklist lines are ticked, each with its evidence. Remaining `[ ]`: **0**.

## Assumptions and Risks

- **The 16×16 pixel columns are tied to today's drawing.** A redrawn icon (DESIGN.md → Favicon) moves the gaps, and the leaf's column constants need updating with it. The leaf names the row and column on failure.
- **Chromium's antialiasing sets the gap alphas** (127 and 63). The leaf only asks for less than 160, so a renderer change in the low bits won't trip it, but a change in how Chromium rasterizes half-covered pixels could.
- **The canvas raster stands in for the tab strip.** Chromium draws the real tab icon in browser UI that Playwright can't read; Oleg's by-hand check in the spec covers that.
- **The forced-colors leaf records behavior, not a requirement.** If Chromium starts forcing SVG documents' author fills, the leaf fails and the decision is whether the icon should follow.
- **The wheel test can't fail from the `artifacts` glob alone** in its copied tree (see above). It guards against the favicon being excluded from the wheel, not against the glob being narrowed. The smoke test still proves the real installed wheel serves the icon.

## Next

Story 11.1 is Epic 11's first story, and 11.2 to 11.4 are still to do. Next: Story 11.2's ATDD (`bmad-testarch-atdd`). `deferred-work.md` has three spine-drift entries from this story; those wait for the Epic 11 reconciliation, not for 11.2.
