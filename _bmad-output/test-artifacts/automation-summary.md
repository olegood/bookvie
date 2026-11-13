---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-13'
storyId: '8.1'
storyKey: '8-1-see-my-catalog-as-covers'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md (Intent, Always rules, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md
  - _bmad-output/implementation-artifacts/epic-8-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build-auto review and code review of spec-8-1, 2026-11-13)
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Catalog tile, Layout → Tiles)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-tiles.spec.ts; frontend/e2e/bookcase-details.spec.ts (Tab order, reduced-motion scroll, ring fade); frontend/e2e/catalog-pace-calculator.spec.ts (axe on Tiles); frontend/src/lib/catalogView.test.ts
  - frontend/src/pages/CatalogTiles.tsx, CatalogTiles.module.css, CatalogPage.tsx; frontend/src/components/Cover.tsx; frontend/src/lib/catalogView.ts
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

# Automation Summary: See my catalog as covers (story 8.1)

The previous version of this file held the summary for story 7.2. It's in git history (`b45cae8`).

## Preflight

- **Stack:** `fullstack`, auto-detected.
  - Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test` for `src/lib`.
  - Backend: pytest (`backend/tests/conftest.py`).
  - Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 8.1 is `done` after `bmad-code-review` (`093ee0c`). The spec, the ATDD checklist and the epic context are all present.
- **Config:**
  - `tea_use_playwright_utils: false` in `_bmad/tea/config.yaml`, and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`).
  - There are no Pact artifacts, so no contract fragments load.
  - `tea_browser_automation: auto` loads `playwright-cli.md`, but `playwright-cli` isn't on PATH. Browser exploration is skipped; targets come from the code and the docs.
- **What exists for 8.1:**
  - **API:** `test_bookcase_view.py` (AC-1, `coverFile` on `ShelfBook`), `test_views.py`'s snapshot, and `check:api`'s schema comparison.
  - **Unit:** `catalogView.test.ts` covers `tiles`, a junk value and storage that throws; `catalog.test.ts` covers `tilesName`.
  - **E2E:** `catalog-tiles.spec.ts` has the 9 ATDD leaves (AC-2 to AC-10) plus 2 review leaves (5 and 8 columns; a twin under a filter). `bookcase-details.spec.ts:72` covers the Tab order through Bookcase, List and Tiles. `catalog-pace-calculator.spec.ts` runs axe on Tiles in both themes. `restore.spec.ts` keeps `tiles` across a restore.

## Coverage Plan

Scope: **selective**. The storage rules are covered at unit level, and the ATDD leaves cover every criterion end to end. This run closes the ATDD checklist's open green-phase follow-ups and the forced-colors gap the code review deferred. Every target is E2E: each one depends on the rendered grid, computed styles under an emulated media feature, real focus, the add flow or storage seen by the page, which no unit can reach. There is no backend target.

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| 1 | Under forced colors, the loading box's and the loaded cover's hairlines are `CanvasText`, and the focus and highlight rings on the cover box are `Highlight` | E2E | P2 | ATDD follow-up "AC-4 forced colors"; deferred by the code review (spec Always rule) |
| 2 | In the dark theme, the caption's title and author and the loading box use DESIGN.md's dark twins | E2E | P2 | ATDD follow-up "AC-3 dark theme and axe" (axe in both themes is already in `catalog-pace-calculator.spec.ts`) |
| 3 | A junk stored view opens Bookcase; with `localStorage` that throws, Catalog opens in Bookcase and pressing Tiles still switches for the visit | E2E | P2 | ATDD follow-up "AC-2 unknown value and throwing storage" (I/O matrix row) |
| 4 | Space and Enter on the focused Tiles button press it | E2E | P3 | ATDD follow-up "AC-2 keyboard"; the Tab half is `bookcase-details.spec.ts:72` |
| 5 | Under every sort, with a search and a filter on, the shown tile names equal the shown spine names in the same order | E2E | P2 | ATDD follow-up "AC-6 List and Bookcase parity" |
| 6 | An add under reduced motion scrolls the new tile's `li` with `behavior: 'auto'`, and without it `'smooth'` | E2E | P2 | ATDD follow-up "AC-7 reduced motion" |
| 7 | An add with a filter on that would hide the new Book clears the filter, and the new tile is focused and ringed | E2E | P2 | ATDD follow-up "AC-7 filters" |
| 8 | The highlight ring on the new tile's cover box is gone after `HIGHLIGHT_MS` | E2E | P2 | ATDD follow-up "AC-7 ring timing" |
| 9 | A click on a tile's cover box, and one on its caption, opens Book detail | E2E | P2 | ATDD follow-up "AC-9 mouse"; "one Tab stop per tile" is AC-9's leaf |

**Not automated:**
- **"AC-6 focus fallback"** is retired. In Chromium every control that changes `shown` (Search titles, the chips, Clear filters) takes focus when used, so a focused tile can't be hidden; the build review rejected the same case on that ground. A click that moves no focus happens only in Safari, which is out of scope (AGENTS.md "Supported browser").

**Already covered (ticked in the ATDD checklist, not re-tested):** the API field and the schema; the unit storage rules; the restore; the 5- and 8-column widths; twins under a filter; AC-10's speed check; axe on Tiles in both themes.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There is no new endpoint; `coverFile` already has its pytest and `check:api`.
  - **3B-backend:** not launched. There is no backend target.
  - **3B-e2e:** targets 1–9. For its fail-proofs it changed only `frontend/src` and restored each change with `git checkout`. Afterwards `git diff --stat -- frontend/src backend` is empty.
- **New file:** the leaves went into `frontend/e2e/catalog-tiles-automate.spec.ts` (526 lines), because adding them to `catalog-tiles.spec.ts` (663 lines) would have passed the 1000-line limit.
- **Fixtures:** none added. The new file copies the helpers it needs from `catalog-tiles.spec.ts` (`tiles`, `tileLinks`, `tile`, `storeTiles`, `tileNames`, `coverBox`, `ringRect`, `sameRect`, `bookId`) rather than moving them to a shared module, so the ATDD spec stays untouched. It adds `systemColor`, `holdCover`, `addSwingTime`, `ringedCoverBox`, `spineNames`, `typeChip` and `viewButton`. If a third tiles spec appears (Stories 8.2, 8.3), move the shared helpers into an `e2e/tiles.ts` module, like `bookcase.ts`.
- **Review of the worker's output:** read in full. No changes were needed. Its output JSON reports `success: true` with `test_count: 12`. It is in this session's scratch directory, not `/tmp`, and isn't committed.

## Tests Added

All 12 are in `frontend/e2e/catalog-tiles-automate.spec.ts`, in `Story 8.1 See my catalog as covers (automate)`.

| Line | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| 244 | AC-4 forced colors: the loading box and the loaded cover keep a CanvasText hairline | P2 | 1 | The forced-colors `.loading, .cover` border rule is removed, or narrowed to `.loading` |
| 274 | AC-4 forced colors: the focus ring and the post-add highlight ring on the cover box are Highlight outlines | P2 | 1 | The forced `outline-color: Highlight` on focus, or the forced `.highlight .box` outline, is removed |
| 302 | AC-3 dark theme: the caption is dark ink and ink-secondary, the loading box the dark fill and hairline | P2 | 2 | `.title`, `.author` or the `.loading` fill or hairline is hard-coded to its light value |
| 331 | AC-2 a junk stored view opens Catalog in Bookcase | P2 | 3 | `readCatalogView` returns the stored value unchecked |
| 342 | AC-2 with storage that throws, Catalog opens in Bookcase and Tiles still shows for the visit | P2 | 3 | The try/catch in `readCatalogView` or `writeCatalogView` is removed |
| 373 | AC-2 the view toggle works from the keyboard: Space presses Tiles, Enter presses List | P3 | 4 | A toggle `<button>` becomes a `<span role="button" tabIndex={0}>` |
| 394 | AC-6 with a search and a filter on, every Sort shows the same Books in the same order in Tiles as in Bookcase | P2 | 5 | Tiles reverse `books`, or drop `hidden` on the `li` |
| 425 | AC-7 an add in Tiles with reduced motion "reduce" scrolls the new tile's list item with behavior "auto" | P2 | 6 | The scroll is always `'smooth'`, or scrolls the link instead of `closest('li')` |
| 425 | AC-7 an add in Tiles with reduced motion "no-preference" scrolls the new tile's list item with behavior "smooth" | P2 | 6 | The scroll is always `'auto'`, or scrolls the link |
| 451 | AC-7 an add in Tiles clears a filter that would hide the new Book, then focuses and rings its tile | P2 | 7 | `onSaved` no longer clears the filters |
| 473 | AC-7 the highlight ring stays on the new cover box for HIGHLIGHT_MS, then fades off | P2 | 8 | The highlight timeout is a no-op, `HIGHLIGHT_MS` is cut to 700, or the fade never ends |
| 499 | AC-9 a click on a tile's cover box or on its caption opens that Book's detail | P2 | 9 | A click on the cover box, or on the caption, is prevented |

Every mutation was reverted.

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** each target maps to an open ATDD follow-up, and target 1 also to the code review's forced-colors deferral.
- **Duplicates:** none. Each "already covered" item above was ticked from its existing test, not re-tested.
- **Quality:**
  - no `waitForTimeout`, `.only` or `.skip`, and no flow conditionals;
  - each assertion constrains a value (exact names and orders, computed colors, outline widths, scroll options, URLs, page errors);
  - every leaf seeds its own server (`seededServer`, or `startSeededServer` with cover files);
  - the new file is 526 lines.
  - One `page.route` holds the static cover file `/media/covers/dune.png` so the loading state can be read. It is a media request, not an app API call, the same hold AC-4's ATDD leaf uses.
- **Browser sessions:** `playwright-cli` isn't installed, so no CLI sessions were opened.
- **Temp artifacts:** the worker JSON stays in the session scratch directory and isn't committed.

Runs:
- Worker: the two tiles specs 23 of 23. The 12 new leaves 60 of 60 with `--repeat-each=5 --retries=0`. Prettier and `tsc -b` are clean, and oxlint reports nothing in the new file.
- `TZ=Europe/Madrid npm run check`, after the worker finished: exit 0. That covers ruff, pytest (1,573 passed, coverage gates ok), the node unit tests, 632 e2e passed (620 before this run) and the smoke check.

## ATDD Checklist

`atdd-checklist-8-1-see-my-catalog-as-covers.md` now has 0 `[ ]` lines:
- **Ticked with evidence:** 9 green-phase follow-ups, each with its test line.
- **Retired:** "AC-6 focus fallback", for the reason under Coverage Plan.
- **Red phase:** the section is now marked historical, with a "Since then (green)" note.

`deferred-work.md`: the code review's 8.1 forced-colors entry has a `resolved:` line. The 8.1 `epic-8-context.md` cover-URL entry and the spine drift entry stay open for the Epic 8 spine reconciliation. The label-in-name entry stays as Oleg's recorded decision (accepted as designed).

## Assumptions and Risks

- **Forced colors are emulated.** `emulateMedia({ forcedColors: 'active' })` in Chromium resolves `CanvasText` and `Highlight` to its own palette, and the leaves read those values from a probe rather than pinning them. Real Windows High Contrast themes weren't run.
- **Dark-theme values** are DESIGN.md's dark `ink`, `ink-secondary`, `surface-inset` and `line`, copied from the tokens. A token change needs `:302` updated.
- **Ring timing** checks that the ring lasts at least `HIGHLIGHT_MS / 2` after it is first seen, and is gone by `HIGHLIGHT_MS` plus 3 s. A slow machine can't fail it early, but a shorter `HIGHLIGHT_MS` above 1000 ms wouldn't be caught.
- **The label-in-name gap stays:** the Tiles axe pass keeps `label-content-name-mismatch` off for the tile links, as decided in the code review.

## Next

Story 8.1's pipeline is complete: ATDD, build, code review, then automate. Epic 8 continues with Story 8.2 (`8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles`, backlog): its ATDD (`bmad-testarch-atdd`) comes first.
