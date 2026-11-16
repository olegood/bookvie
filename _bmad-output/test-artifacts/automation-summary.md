---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-16'
storyId: '10.1'
storyKey: '10-1-reverse-the-catalog-order'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-10-1-reverse-the-catalog-order.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-10-1-reverse-the-catalog-order.md
  - _bmad-output/implementation-artifacts/epic-10-context.md
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-sort-direction.spec.ts; frontend/e2e/sort-direction.ts
  - frontend/src/components/SortDirectionToggle.tsx; frontend/src/components/SortSelect.tsx; frontend/src/lib/catalogSort.ts (+ .test.ts); frontend/src/lib/catalog.ts (+ .test.ts); frontend/src/pages/CatalogPage.tsx; frontend/src/pages/HomePage.tsx
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

# Automation Summary: Reverse the catalog order (story 10.1)

The previous version of this file held the summary for story 9.2. It's in git history (`f633bf4`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 10.1 is `done` after `bmad-code-review` (2026-11-16; the review's patches are in the working tree, not yet committed). Spec, ATDD checklist and epic context are present.
- **Config:** `tea_use_playwright_utils: false`, and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 12 open green-phase follow-ups. The code review deferred only spine drift (no test work).

## Coverage Plan

Browser exploration skipped: `playwright-cli` isn't installed. Targets come from the spec, the ATDD checklist and the Story 10.1 source.

**Level:** E2E, in a new `frontend/e2e/catalog-sort-direction-automate.spec.ts` (the `*-automate.spec.ts` convention), reusing `sort-direction.ts` and the other shared helpers. Storage across reloads, Home's packing, focus, axe and computed style only show in a real browser. The two unit follow-ups were already delivered by the build (`catalog.test.ts`, `catalogSort.test.ts`), so they are ticked, not re-written. The 10 ATDD and review leaves stay as they are. No backend or API target: the story changed neither.

| # | Target (ATDD follow-up) | Priority | Why |
|---|---|---|---|
| 1 | Unit, `sortBooks(…, true)` per key with ties kept, `reversed` defaulting to `false` | — | Already delivered by the build (`catalog.test.ts`, 3 tests); tick only. |
| 2 | Unit, `readCatalogSortReversed` / `writeCatalogSortReversed` edge cases and the label table | — | Already delivered by the build (`catalogSort.test.ts`, 6 tests); tick only. |
| 3 | AC-6 export and restore (AR27/AD-15): the zip holds neither key, no request carries them, a restore keeps the reversal as it was (reversed and not) | P2 | A browser preference must not travel with the library. |
| 4 | AC-6 Home with Author reversed stored: `AUTHOR_Z_A` on a fresh load and after in-app navigation | P1 | Home reads the reversal once per visit; the ATDD leaf covers only Pages. |
| 5 | AC-7 Home with storage that throws after a reversal was stored: the slice is Author A–Z | P1 | The Always rule's failure branch on Home. |
| 6 | AC-3 Search titles and filters keep working while reversed, and a press keeps the search text and chips | P1 | The reversal shares the sorted array with search and filters. |
| 7 | AC-3 the List view press: rows reorder and focus stays on the toggle | P2 | The ATDD leaf presses in Bookcase and Tiles only. |
| 8 | AC-2 the minimum width for Author, Title and Date added; padding 12px and arrow gap 4px | P2 | DESIGN.md `components.sort-direction-toggle`; the ATDD leaf pins Pages only. |
| 9 | AC-8 a new Book under Date added reversed goes to the end, still focused, in view and ringed | P1 | The add-a-book focus path meets the reversed order. |
| 10 | AC-8 the bookcase Tab stop stays on the last-focused Book across a press | P2 | Roving tabindex across a re-sort. |
| 11 | AC-9 axe on the Catalog with the toggle in both states, both themes | P1 | New control in the toolbar. |
| 12 | AC-9 the dark-theme focus looks: select border and halo, toggle ring in the accent dark twin | P2 | The ATDD leaf checks focus in light only. |

**Scope:** selective. The checklist's follow-ups, nothing more.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. No endpoint changed.
  - **3B-backend:** not launched. No backend target.
  - **3B-e2e:** targets 3–12. For its red proofs it made temporary edits to `frontend/src` and reverted each one by hand. Afterwards `git diff --stat -- frontend/src backend` lists only `frontend/src/lib/catalogSort.test.ts`, the code review's uncommitted title fix. No banned git command was run.
- **New file:** `frontend/e2e/catalog-sort-direction-automate.spec.ts` (406 lines, 10 leaves).
- **Shared helpers:** 3 exports added to `frontend/e2e/sort-direction.ts`, none of the existing ones changed: `ACCENT_DARK`, `FOCUS_HALO_DARK`, and `toggleInsets` (a `Range` on the arrow and label text nodes, measuring the left padding, the arrow gap and the right padding). `toggleInsets` was probed in a throwaway `sort-direction.probe.spec.ts` against `setContent` buttons (it returned their styled padding and gap, and refused 12) and on the app, then removed. No new fixture or factory.
- **Review of the worker's output:** read in full. One change: an unused `FOCUS_HALO` export was removed. Its JSON is in this session's scratch directory, not committed. One red proof was re-run independently: with the `catch` in `readCatalogSortReversed` returning `true`, `:165` fails on the slice order. The `catch` was then edited back by hand and the app rebuilt.

## Tests Added

All in `frontend/e2e/catalog-sort-direction-automate.spec.ts`, describe "Story 10.1 Reverse the catalog order (automate)":

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 77 | AC-6 the reversal never reaches the server or the export, and a restore from another library leaves it as it was, reversed and not | P2 | `BackupPage` removing `bookvie.catalogSortReversed` after a restore |
| 134 | AC-6 Home's one-row slice follows Author reversed, on a fresh load and after a press made in the app | P1 | `HomePage` forcing `reversed` to false |
| 165 | AC-7 Home with storage that throws after Author reversed was stored shows the slice Author A–Z | P1 | the `catch` in `readCatalogSortReversed` returning true (re-run in this session) |
| 193 | AC-3 Search titles and the filter chips keep working while reversed, and a press keeps the search text and the chips | P1 | `reverse()` calling `setFilters(NO_FILTERS)` |
| 227 | AC-3 in List view a press reorders the rows and keeps focus on the toggle | P2 | `reverse()` focusing Search titles |
| 247 | AC-2 under Author, Title and Date added the toggle keeps its width on a press, with 12px padding and a 4px arrow gap | P2 | `.label::after { content: none }` (Date added width 117.30 → 111.28); separately the gap `--space-1` → `--space-2` |
| 284 | AC-8 under Date added reversed a Book just added is the last spine, focused, in view and ringed | P1 | `scrollIntoView` removed from the added effect |
| 321 | AC-8 the bookcase Tab stop stays on the last-focused Book across a press, and the arrows go on in the reversed order | P2 | `key={String(reversed)}` on `<Bookcase>` (a remount) |
| 350 | AC-9 the Catalog passes axe with the toggle natural and reversed, in both themes | P1 | `.toggle` text in `#9a9a9a` (contrast) |
| 377 | AC-9 in the dark theme the focused select's border and halo and the toggle's ring use the accent's dark twin | P2 | `.select:focus` border hard-coded to the light accent; separately the toggle's `outline-color` |

Priority coverage: P0 0, P1 5, P2 5. The story's P0 paths are the ATDD AC-1, AC-3 and AC-5 leaves.

## Validation

- Worker: the new file `--repeat-each=3`, 30 passed; with the ATDD spec, 20 passed; Prettier, `tsc -b` and oxlint clean (oxlint's only warnings are in the untouched `src/lib/usePauseFlow.tsx`).
- `npm run check` (repo root, this session, after removing `FOCUS_HALO`): **exit 0**. That is ruff and pytest (1573 passed), format, tsc and oxlint, node tests (368 passed), `check:e2e` (**724 passed**: 714 before this run, plus 10), and smoke ok.
- Quality scan of the new file: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (three keys, two themes). Locators go by role and name; geometry only for the toggle's width and insets.
- No CLI browser sessions were opened (`playwright-cli` isn't installed). Temp artifacts are in the session scratch directory, not the repo.
- Production code untouched: `git diff --stat -- frontend/src backend` lists only the review's test-title edit.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is false and the package isn't installed; the leaves use the repo's own fixtures (`seededServer`, `storeOnce`, `exportOf`, `restoreFrom`). No `page.route` was needed.

## ATDD Checklist

`atdd-checklist-10-1-reverse-the-catalog-order.md`: all 12 green-phase follow-ups are ticked, each with its `file:line`. The two unit lines point at the build's `catalog.test.ts` and `catalogSort.test.ts`. Remaining `[ ]`: **0**.

## Assumptions and Risks

- **`:247` can catch a broken minimum width only under Date added.** "A–Z" and "Z–A" use the same glyphs, so their widths match with or without the hidden twin.
- **`:350`'s dark and reversed scans were not shown red on their own.** The contrast mutation fails the light pass first.
- **The export half of `:77` can't be broken from the frontend.** The server builds the zip from `library.json`; only a backend change could put the key in it. The request scan catches the key name in any request.
- **The narrower label is centred** in the minimum width ("Oldest first" has a 7px gap and 15px right padding), so `:247` asserts the gap and right padding on the wider label only. DESIGN.md doesn't say where the narrower label sits.
- **The code review's patches were uncommitted** when this run started, and stay in the working tree beside this run's files.

## Next

Story 10.1 closes Epic 10. Next: the Epic 10 retrospective (`bmad-retrospective`), then its before-next-epic items, the Epic 10 trace and gate and the spine reconciliation (two spine-drift entries in `deferred-work.md`), before Epic 11's first story.
