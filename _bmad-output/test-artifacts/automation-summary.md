---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-13'
storyId: '8.2'
storyKey: '8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md (Intent, Always rules, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md
  - _bmad-output/implementation-artifacts/epic-8-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build-auto review of spec-8-2, 2026-11-13)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-tile-marks.spec.ts; frontend/e2e/catalog-tiles.spec.ts; frontend/e2e/catalog-tiles-automate.spec.ts; frontend/e2e/catalog-pace-calculator.spec.ts (axe on Tiles)
  - frontend/src/pages/CatalogTiles.tsx, CatalogTiles.module.css; frontend/src/styles/tokens.css
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

# Automation Summary: See what I've read and what I'm reading on the tiles (story 8.2)

The previous version of this file held the summary for story 8.1. It's in git history (`b6d59fc`).

## Preflight

- **Stack:** `fullstack`, auto-detected.
  - Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test` for `src/lib`.
  - Backend: pytest (`backend/tests/conftest.py`).
  - Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 8.2 is `done` after `bmad-code-review` (`f8fccfa`). The spec, the ATDD checklist and the epic context are all present.
- **Config:**
  - `tea_use_playwright_utils: false`, and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`).
  - There are no Pact artifacts, so no contract fragments load.
  - `tea_browser_automation: auto` loads `playwright-cli.md`, but `playwright-cli` isn't on PATH. Browser exploration is skipped; targets come from the code and the docs.
- **What exists for 8.2:**
  - **API:** none needed. `finished`, `percent` and `spineColor` already exist on the catalog view (`backend/tests/test_book_states.py`), and 8.2 changes no contract.
  - **E2E:** `catalog-tile-marks.spec.ts` has the 7 ATDD leaves (AC-1 to AC-7) and 5 matrix leaves (loading, broken cover, 0/100%, narrow cover, large covers). The code review added the ribbon's top and apex samples to AC-1 and a centering check to the large-cover leaf. `catalog-pace-calculator.spec.ts` runs axe on Tiles in both themes.

## Coverage Plan

Scope: **selective**. The ATDD and matrix leaves cover every criterion end to end. This run closes the ATDD checklist's 8 open green-phase follow-ups. Every target is E2E: each one depends on pixels of the rendered tile, the catalog view the page fetched after a real intent, real focus, or axe over the rendered page, which no unit can reach. There is no backend target.

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| 1 | Changing a finished Book's cover to a different shape moves the ribbon with the visible cover | E2E | P2 | ATDD follow-up "AC-1 ribbon after a cover change" |
| 2 | The ribbon's 16px width and its left leg: a leftward scan from the center reads fill, `spine-edge`, `spine-label-strip`, cover; the notch's apex sits 18px below the top | E2E | P3 | ATDD follow-up "AC-1 notch depth and width" (the top and the apex's upper side are pinned since the code review) |
| 3 | After Update page on Home, the Catalog tile's bar shows the new `percent` | E2E | P2 | ATDD follow-up "AC-2 the bar follows a page update" |
| 4 | An Up next Book paused at a page shows its bar | E2E | P2 | ATDD follow-up "AC-2 an Up next Book paused at a page" |
| 5 | A finished Book being re-read as Main shows both marks | E2E | P2 | ATDD follow-up "AC-3 a Main re-read" |
| 6 | Up next never started, and a Side read without a Reading, show no mark | E2E | P2 | ATDD follow-up "AC-4 Up next, never started, and Side read without a Reading" |
| 7 | axe on Tiles in both themes with a ribbon and a bar on screen | E2E | P2 | ATDD follow-up "AC-5 axe on Tiles" (tick from `catalog-pace-calculator.spec.ts` if its seed already shows both marks) |
| 8 | The focus ring and the post-add highlight ring sit around the box with the ribbon on it, and the ribbon isn't clipped | E2E | P3 | ATDD follow-up "AC-6/AC-7 the highlight and focus rings" |

**Already covered (not re-tested):** every AC and matrix row (see above), the ribbon's top and the notch's upper side (code review), and covers staying centered.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There is no new endpoint, and `finished`, `percent` and `spineColor` already have their pytest.
  - **3B-backend:** not launched. There is no backend target.
  - **3B-e2e:** targets 1–8. For its fail-proofs it changed only `frontend/src` and restored each change with `git checkout`. Afterwards `git diff --stat -- frontend/src backend` is empty.
- **New file:** the leaves went into `frontend/e2e/catalog-tile-marks-automate.spec.ts` (400 lines), beside the ATDD spec (now 670 lines).
- **Shared helpers:** 8.1's summary said to move the shared tiles helpers into a module once a third tiles spec appeared. This run moved the pixel helpers out of `catalog-tile-marks.spec.ts` into `frontend/e2e/tile-marks.ts` (263 lines): `lookOf`, `TileLook`, `near`, `inOrder`, `barPercent`, `marksOf`, `solidPng`, `storeTiles`, `tiles`, `tileItem`, `coversLoaded`, `bookId`, the colors, `RIBBON` and `BAR`. The ATDD spec now imports them. The move is pure: each moved function is identical apart from `export`, and the ATDD spec's diff is removals plus the import block. `lookOf` gained three sample fields (`scanLeft`, `scanDown`, `ringAbove`) and changed none.
- **Review of the worker's output:** read in full, and the move checked by diffing each helper against `HEAD`. No changes were needed. Its output JSON reports `success: true` with `test_count: 7`. It is in this session's scratch directory, not committed.

## Tests Added

All 7 are in `frontend/e2e/catalog-tile-marks-automate.spec.ts`, in `Story 8.2 See what I've read and what I'm reading on the tiles (automate)`.

| Line | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| 148 | AC-1 after a finished Book's cover is changed to a different shape, the ribbon hangs from the new cover | P2 | 1 | The ribbon is placed for the old 120×80 cover instead of on the frame, or the frame is fixed at the old size |
| 203 | AC-1 the ribbon is 16px wide with a left leg like its right one, and the notch's apex is 18px below the cover's top | P3 | 2 | The apex moves to `8,14`, or the left leg loses its edge and halo |
| 243 | AC-2 after Update page on Home, the Main book's tile shows the bar at the new percent | P2 | 3 | The catalog view is never refetched after Update page (`staleTime: Infinity`, only the home view invalidated) |
| 268 | AC-2 an Up next Book paused at a page shows its bar, and no ribbon | P2 | 4 | No bar for an Up next Book |
| 284 | AC-3 a finished Book being re-read as the Main book shows both the ribbon and the bar | P2 | 5 | No ribbon on the Main book |
| 306 | AC-4 an Up next Book never started and a Side read without a Reading have no mark, while the others carry theirs | P2 | 6 | Up next or a Side read gets a bar at `percent ?? 0` |
| 348 | AC-1 the focus ring and the post-add highlight ring run around the box with the ribbon on it, without clipping it | P3 | 8 | `.ribbon { top: -4px }`, so the ribbon pokes out over the ring |

Every mutation was reverted.

**Target 7 (axe on Tiles):** no new leaf. `catalog-pace-calculator.spec.ts:266` runs axe on Tiles in light and dark over Flow 5, which already shows a finished Book's ribbon (Fahrenheit 451, no cover, so the ribbon is on the placeholder at once) and two bars (Main at 36%, a paused Book at 29%).

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** each target maps to one open ATDD follow-up.
- **Duplicates:** none. The ribbon's top and the apex's upper side, pinned by the code review, aren't re-tested. Target 7 is ticked from the existing axe pass.
- **Quality:**
  - no `waitForTimeout`, `.only`, `.skip` or `if (` in the new file;
  - each assertion constrains a value (pixel colors and their order, percentages within 1.5, rectangles, pixel counts);
  - every leaf starts its own server and stops it in `finally`;
  - target 1 changes the cover through the real Edit book panel, and target 3 updates the page through Home's Update page, then reaches Catalog through the app's navigation, so the bar comes from the refetched view.
- **Browser sessions:** `playwright-cli` isn't installed, so no CLI sessions were opened.
- **Temp artifacts:** the worker JSON and mutation script stay in the session scratch directory and aren't committed.

Runs:
- Worker: the two tile-marks specs 19 of 19. The 7 new leaves 35 of 35 with `--repeat-each=5 --retries=0`. Prettier, `tsc -b` and oxlint are clean on the three touched files.
- `TZ=Europe/Madrid npm run check`, after the worker finished: exit 0. That covers ruff, Prettier, oxlint, `tsc -b`, `check:api`, pytest (1,573 passed, coverage gates ok), the node unit tests (354 passed), 651 e2e passed (644 before this run) and the smoke check.

## ATDD Checklist

`atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md` now has 0 `[ ]` lines. All 8 green-phase follow-ups are ticked, each with its test line; AC-5 axe with `catalog-pace-calculator.spec.ts:266`. Nothing was retired.

`deferred-work.md`: unchanged. The 8.2 spine drift entry stays open for the Epic 8 spine reconciliation.

## Assumptions and Risks

- **Pixels in Chromium only.** Every mark is read from screenshots at device scale 2 in Chromium (AGENTS.md "Supported browser").
- **The ring leaf** reads the ring's accent 3px above the cover box. A change to `--focus-ring-offset` or the highlight's 2px gap needs it updated.
- **Covers under ~20px wide or ~26px tall** still let the ribbon or its halo reach past the cover, as the code review accepted. No leaf pins those shapes.
- **`tile-marks.ts` is shared** by both tile-marks specs now. A change to `lookOf`'s existing fields affects the ATDD leaves too.

## Next

Story 8.2's pipeline is complete: ATDD, build, code review, then automate. Epic 8 continues with Story 8.3 (`8-3-give-books-without-a-cover-a-typeset-cover`, backlog): its ATDD (`bmad-testarch-atdd`) comes first.
