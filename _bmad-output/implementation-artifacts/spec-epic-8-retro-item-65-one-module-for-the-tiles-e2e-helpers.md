---
title: 'Move the Tiles e2e helpers into one module, and make coversLoaded wait for a visible cover'
type: 'refactor'
created: '2026-11-14'
status: 'done'
baseline_commit: '8d15cda7b22acde5b0b6102e4f87299bca93bbf2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-retro-2026-11-13.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 8 retro item 65 (F-D1, E8-R2; sprint item `epic-8-retro-item-65-…`), due before the plan is called complete. The Tiles e2e helpers are copied between files. `bookId`, `tiles`, `tileLinks`, `tile`, `storeTiles`, `tileNames`, `coverBox`, `ringRect` and `sameRect` are each defined in both `catalog-tiles.spec.ts` and `catalog-tiles-automate.spec.ts`, and `bookId`, `tiles` and `storeTiles` a third time in `tile-marks.ts`. `openTiles` is defined differently in two automate specs. `WIDE_COVER` is declared in three places. `typeset-covers.ts` and `tile-marks.ts` re-declare spine-label colors that `bookcase.ts` already has. `coversLoaded` (`tile-marks.ts:71-79`) passes on an empty image list and checks `complete`, not the visible loaded cover (E8-R2).

**Approach:** a new `frontend/e2e/tiles.ts` holds the shared Tiles helpers, and `tile-marks.ts` re-exports them, so its importers keep working. The specs import from there instead of defining their own copies. The spine-label colors come from `bookcase.ts`, and `WIDE_COVER` from `tiles.ts`. `coversLoaded` requires at least one image and waits until every image is loaded and shown. The move is pure: no leaf changes an assertion, and the e2e suite stays green with the same test count.

## Boundaries & Constraints

**Always:** keep every leaf's assertions, expected values and test titles byte for byte. Keep the leaves' own setup (shelves, names, colors local to one spec) where it is. Run Prettier on the changed files only (`npx prettier --write <file>` inside `frontend/`). Undo a step's changes only by file edits or `git apply -R` of a saved patch (AGENTS.md "Story pipeline", Epic 8 retro item 64).

**Never:** move helpers outside the Tiles files (`catalog-filter`, `catalog-sort` and `home-slice` keep their own `bookId`). Don't change app code under `frontend/src/`, and don't pin a CSS class name in a helper. Don't touch `tokens.css` or the generated schema.

</frozen-after-approval>

## Code Map

- `frontend/e2e/tile-marks.ts:35-79` -- today's shared copies: `bookId`, `storeTiles`, `tiles`, `tileItem` (a listitem filtered by its link, unlike the specs' `tile`, which returns the link) and `coversLoaded`, plus `type Rect` (`:81`) and `SPINE_LABEL_STRIP: Rgb` (`:23`). It is imported by `catalog-tile-marks*.spec.ts`, `catalog-typeset-covers*.spec.ts` and `typeset-covers.ts`.
- `frontend/e2e/catalog-tiles.spec.ts:41-180` -- local `bookId`, `tiles`, `tileLinks`, `tile`, `storeTiles`, `tileNames` (aria-label, else aria-labelledby text, else textContent → `string[]`), `type Rect`, `BoxLook`, `coverBox`, `ringRect(link, accent)`, `sameRect`. `sortSelect`, the shelf and the names stay local.
- `frontend/e2e/catalog-tiles-automate.spec.ts:28-145` -- the same helpers again. Its `tileNames` returns `aria-label` only (`(string | null)[]`) and is compared with `spineNames` at `:410`. `viewButton`, `typeChip`, `spineNames`, `ringedCoverBox` and `systemColor` stay local.
- `frontend/e2e/catalog-tile-marks-automate.spec.ts:42-55` -- `WIDE_COVER`, `openTiles` (storeTiles, goto, `coversLoaded`) and `navigateToCatalog` (nav click, `coversLoaded`).
- `frontend/e2e/catalog-typeset-covers-automate.spec.ts:74-84` -- `openTiles` (storeTiles, goto, `expect(tiles).toBeVisible()`) and `navigateToCatalog`, both without waiting for covers.
- `frontend/e2e/catalog-tile-marks.spec.ts:43` -- a third `WIDE_COVER`. It calls `coversLoaded` 11 times.
- `frontend/e2e/typeset-covers.ts:25-26,43` -- `SPINE_LABEL = 'rgb(43, 46, 42)'` (DESIGN.md `spine-label` #2B2E2A, the same value as `bookcase.ts` `INK`), `SPINE_LABEL_STRIP_CSS` (duplicates `bookcase.ts:11` `SPINE_LABEL_STRIP`) and `WIDE_COVER`.
- `frontend/e2e/bookcase.ts:7-14` -- the CSS color constants. It has no `SPINE_LABEL` yet.
- `frontend/src/pages/CatalogTiles.tsx:99-123`, `CatalogTiles.module.css:64-82` -- the loaded state: the `img` gets `coverLoaded` (`opacity: 1`) only after `onLoad`. Before that, `.cover` is transparent. A failed image is replaced by the typeset cover.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/e2e/bookcase.ts` -- add `export const SPINE_LABEL = 'rgb(43, 46, 42)'` (DESIGN.md `spine-label`) beside `SPINE_LABEL_STRIP` -- the one home for the spine-label colors.
- [x] `frontend/e2e/tiles.ts` (new) -- export `bookId`, `storeTiles`, `tiles`, `tileLinks`, `tile`, `tileItem`, `tileNames` (the richer `catalog-tiles.spec.ts` version, typed `string[]`), `type Rect`, `type BoxLook`, `coverBox`, `ringRect`, `sameRect`, `coversLoaded`, `openTiles(page, url, { covers })` and `WIDE_COVER`. `openTiles` stores Tiles, goes to `${url}/catalog`, waits for `tiles(page)` to be visible, and runs `coversLoaded` when `covers` is true. -- one module.
- [x] `frontend/e2e/tiles.ts` `coversLoaded` -- poll until the grid holds at least one `img`, and every `img` is `complete`, has `naturalWidth > 0`, and has a computed `opacity` of `1` (the loaded, shown cover, read without a class name) -- E8-R2.
- [x] `frontend/e2e/tile-marks.ts` -- delete the moved definitions and re-export them from `./tiles.ts`. `SPINE_LABEL_STRIP: Rgb` is derived from `bookcase.ts`'s string, with the same value -- importers unchanged.
- [x] `frontend/e2e/typeset-covers.ts` -- `SPINE_LABEL` and `SPINE_LABEL_STRIP_CSS` re-export `bookcase.ts`'s `SPINE_LABEL` and `SPINE_LABEL_STRIP`, and `WIDE_COVER` re-exports `tiles.ts`'s -- importers unchanged.
- [x] `frontend/e2e/catalog-tiles.spec.ts`, `catalog-tiles-automate.spec.ts` -- delete the local copies and import them from `./tiles.ts` -- dedupe.
- [x] `frontend/e2e/catalog-tile-marks-automate.spec.ts` -- use `openTiles(page, url, { covers: true })` and `WIDE_COVER` from `./tiles.ts`. `navigateToCatalog` stays local. `catalog-typeset-covers-automate.spec.ts` -- use `openTiles(page, url)`. `catalog-tile-marks.spec.ts` -- import `WIDE_COVER`.

**Acceptance Criteria:**
- Given the refactor, when `grep -nE "^(async )?function (bookId|tiles|tileLinks|tile|storeTiles|tileNames|coverBox|ringRect|sameRect|openTiles)\b" frontend/e2e/catalog-tile*.spec.ts frontend/e2e/catalog-typeset*.spec.ts` runs, then it prints nothing, and `WIDE_COVER =` appears only in `tiles.ts`.
- Given `git diff` of the spec files, when the removed and added `expect(` lines are compared, then none differs.
- Given an empty grid, or a grid whose only `img` is still transparent, when `coversLoaded` polls, then it doesn't pass. Probe both, plus a loaded grid, once in a temporary `*.probe.spec.ts`, then `rm` it.
- Given the change, when `npm run check` runs from the repo root, then it exits 0 with the same e2e pass count as before the change.

## Implementation Notes

- **Baseline (8d15cda):** `npx playwright test --list` gave 666 tests, 57 of them in the Tiles specs. A full `npm run check` before any edit exited 0 (pytest 1573, e2e 666, smoke ok).
- **Departure from the task list:** not every `openTiles` call in `catalog-tile-marks-automate.spec.ts` takes `{ covers: true }`. Five leaves (`:236`, `:313`, `:329`, `:351`, `:393`) seed shelves with no cover file (`mainAt(150)`, `ROLES_SHELF`, the rings shelf), so the stricter `coversLoaded` would never pass there. They passed before only because the old check passed on an empty list, which is the E8-R2 flaw. They now call `openTiles(page, server.url)`, which waits for the grid. The three leaves with covers keep `{ covers: true }`. The local `navigateToCatalog` got the same option and now waits for the grid as well, and only its cover leaf (`:173`) asks for covers.
- **`expect(` diff:** the only line removed and the only line added is the same `await expect(tiles(page)).toBeVisible()`. One sits in the deleted typeset `openTiles`, the other in the new grid wait in `navigateToCatalog`. Both are helper waits, so no leaf assertion changed.
- **`SPINE_LABEL_STRIP: Rgb`** in `tile-marks.ts` is parsed from `bookcase.ts`'s CSS string, with the same value.
- **Probe:** a temporary `covers-loaded.probe.spec.ts` checked four grids. An empty grid didn't pass. A held, transparent cover didn't pass. The same grid passed once the cover was released. A loaded cover forced to opacity 0 didn't pass. The file was removed afterwards.
- **First full checks after the change:** run 1 had the five failures above. Run 2 had 665 passed and 1 flake in `spine-popover.spec.ts:345` (Story 1.14), which read 0 spine boxes. It passed 10 of 10 with `--repeat-each=10`, and this change doesn't touch it apart from one added constant in `bookcase.ts`. Run 3 exited 0 with 666 e2e passed.

- **After the review patches:** `navigateToCatalog` moved to `tiles.ts`, and `DUNE_COVER` and `BROKEN_COVER` joined `WIDE_COVER` there. `SPINE_LABEL_STRIP` is now parsed strictly by a local `rgbOf`. The `typeset-covers.ts` re-exports are consistent, and the `tiles.ts` header says what the module holds. The only `expect(` lines the diff removes from the specs are the two `await expect(tiles(page)).toBeVisible()` waits in the deleted helper copies. That wait now lives in `tiles.ts`, and no leaf assertion changed. The six Tiles specs pass (57 of 57).
- **Final check (2026-11-14), after the last patch:** `npm run check` exited 0. ruff clean, pytest 1573 passed, `check:api` clean, e2e 666 passed (the baseline count), smoke ok.
- **Sprint item 65** is marked `done` with `sprint_status.py update --set-action-status` in the same commit, approved by Oleg on 2026-11-14.

## Review Triage Log

### 2026-11-14: review pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap, Spine Check)

Spine Check: no findings (AD-6, AD-15, AD-17 and AD-20 checked). The other layers reported 13 findings.

- **`[low]` `[patch]` `navigateToCatalog` was still copied in both automate specs, with the same body once the build added the grid wait.** Moved to `tiles.ts` with `{ covers }`.
- **`[low]` `[patch]` `DUNE_COVER` and `BROKEN_COVER` were declared three times each,** the same kind of duplicate as `WIDE_COVER`. Both are now exported from `tiles.ts`.
- **`[low]` `[patch]` `SPINE_LABEL_STRIP` was parsed loosely, with `match(/\d+/g)!` and a cast** (Blind Hunter and Edge Case Hunter). It now matches `rgb(r, g, b)` exactly and throws otherwise.
- **`[low]` `[patch]` In `typeset-covers.ts`, `WIDE_COVER` was imported and then re-exported in a different style from its neighbours.** Made consistent.
- **`[low]` `[patch]` The `tiles.ts` header listed the stories that use it,** a list that goes stale. It now says what the module holds.
- **`[low]` `[defer]` No kept test guards the stricter `coversLoaded`** (Verification Gap). Deferred to `deferred-work.md`: the repo has no tests of its own e2e helpers.
- **`[low]` rejected: `covers` defaults to `false`, so a leaf could forget it.** Every read after a cover wait already polls its value (`expect.poll` on `lookOf`), and making the option required would touch every caller for a hypothetical leaf.
- **`false` rejected: `coversLoaded` doesn't check the expected number of `img` elements.** `CatalogTiles.tsx` renders every tile's `img` in the same commit as the grid, so a second `img` can't arrive after the first.
- **`[low]` rejected: `SPINE_LABEL` repeats `INK`'s literal.** They are two DESIGN.md tokens (`spine-label`, `ink`) that happen to be equal, and the comment names the token.
- **`[low]` rejected: the specs import Tiles helpers from both `tiles.ts` and `tile-marks.ts`.** The re-exports keep the 8.2 and 8.3 importers unchanged, which the spec asks for. Cosmetic.
- **`false` rejected: the shared `tileNames` weakens the automate comparison at `:410`.** If a tile lost its `aria-label`, the old version gave `null` and the new one gives text. Both differ from `spineNames`' label, so the leaf fails either way.
- **`[low]` rejected: after a client-side navigation, `navigateToCatalog`'s cover wait could pass on the old cover** (Edge Case Hunter). The next assertion polls the new cover's width (`:177`), so the leaf still checks the right cover.

## Design Notes

- A computed `opacity` of `1` is how the `img` shows it has loaded without pinning `coverLoaded`. A failed cover is swapped for the typeset cover and drops its `img`, so a mixed grid still settles.
- `tileNames` takes the richer version. Every tile has an `aria-label`, so the automate leaf at `:410` gets the same strings.

## Verification

**Commands:**
- `npm --prefix frontend run check:api` -- expected: Prettier, oxlint and `tsc -b` clean.
- `npm run check` (repo root) -- expected: exit 0; the e2e pass count matches the count from a baseline run before the change.
