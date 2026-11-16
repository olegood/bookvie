---
title: 'One module for the copied e2e helpers: bookId, sortSelect and the DESIGN.md colors'
type: 'refactor'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
baseline_commit: 'c5a76a2abbe88b5c12a9fb27d359da7435cbfbd7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-10-retro-2026-11-16.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** this is Epic 10 retro item 73 (E10-D1; sprint item `epic-10-retro-item-73-one-module-for-the-copied-e2e-helpers`), due before Epic 11. The e2e suite defines `bookId` in five places, `sortSelect` in five, and the same DESIGN.md color constants in several helper modules and specs. A future token change has to be made in every copy, and a missed copy fails or passes for the wrong reason.

**Approach:** move `bookId`, `sortSelect` and the copied DESIGN.md color constants into `frontend/e2e/library.ts` beside `rgbOf`. Every file that defined a copy imports it from there instead. No assertion, value or test name changes.

## Boundaries & Constraints

**Always:** every moved constant keeps its exact value (the same `rgb(r, g, b)` string the copy had). Helper modules that other specs import a moved name from (`bookcase.ts`, `card-note-add-another.ts`, `sort-direction.ts`, `tiles.ts`) re-export it from `library.ts`, the way `tile-marks.ts` already re-exports `tiles.ts`, so their importers don't change. Format the changed files with the pinned Prettier.

**Never:** change an assertion, a test title or a value. Move a constant only one file defines (`SHELF_WALL`, `ACCENT_SOFT`, `INPUT_BORDER`, …). Touch the `Rgb` tuples in `tile-marks.ts` (`LIGHT`, `DARK`) or `typeset-covers.ts` (`UNREAD`): they hold the same colors as pixel tuples for sampling, a different form. Run any git command that AGENTS.md "Story pipeline" bans.

**Decision (Oleg, 2026-11-16): every copy.** The action's "every spec and helper module that copies them" wins over its shorter Changes list. These seven specs also drop their copies of moved colors and import from `library.ts`: `book-detail`, `duplicate-dialog`, `new-book-panel`, `restore-refusals`, `reentry`, `add-card-note`, `home`.

</frozen-after-approval>

## Code Map

- `frontend/e2e/library.ts` -- gains `bookId(n)`, `sortSelect(page)` (`page.getByRole('main').getByRole('combobox', { name: 'Sort', exact: true })`) and the colors as `rgbOf('#hex')` under their DESIGN.md names: `INK`, `INK_DARK`, `INK_SECONDARY`, `INK_SECONDARY_DARK`, `INK_TERTIARY`, `ACCENT`, `ACCENT_DARK`, `SURFACE_INSET`, `SURFACE_INSET_DARK`, `SPINE_LABEL_STRIP`, `SPINE_UNREAD_TEXT`.
- `frontend/e2e/bookcase.ts:7-15` -- `INK`, `ACCENT`, `SPINE_LABEL_STRIP`, `SPINE_UNREAD_TEXT` become re-exports. It has 10 importers (`ACCENT` alone).
- `frontend/e2e/card-note-add-another.ts:16-20` -- all five colors become re-exports.
- `frontend/e2e/sort-direction.ts:19-31,128,212` -- `bookId`, `sortSelect` and the shared colors become re-exports. `INPUT_BORDER*` stays.
- `frontend/e2e/tiles.ts:16` -- `bookId` becomes a re-export. `tile-marks.ts:10` re-exports it on from `tiles.ts`, unchanged.
- `frontend/e2e/tile-marks.ts:7,33` -- its `SPINE_LABEL_STRIP` is already derived from `bookcase.ts`, so it is unchanged.
- Specs with local copies: `catalog-sort.spec.ts:24,70`, `catalog-filter.spec.ts:24-27,39,166` (its `sortSelect` goes through a local `main(page)`, which is equivalent), `home-slice.spec.ts:60`, `catalog-tiles.spec.ts:42-44,86`, `catalog-tiles-automate.spec.ts:27-29,54`. Each deletes the copy and imports from `library.ts`. `LINE`/`LINE_DARK` and other single-file colors stay.
- The seven decision specs: `book-detail.spec.ts:21` (`INK`; `SURFACE` stays), `duplicate-dialog.spec.ts:14,16`, `new-book-panel.spec.ts:13-14`, `restore-refusals.spec.ts:31-32`, `reentry.spec.ts:50-51` (its `{ light, dark }` objects keep their shape and names but are built from the imported constants under aliases; `#9A9E94`, defined only there, stays a literal), `add-card-note.spec.ts:22`, `home.spec.ts:35`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/e2e/library.ts` -- add `bookId`, `sortSelect` and the colors above, each with a one-line doc comment naming its DESIGN.md token.
- [x] `frontend/e2e/{bookcase,card-note-add-another,sort-direction,tiles}.ts` -- replace each copy with `export { … } from './library.ts'`, plus an import where the module uses it itself.
- [x] The five listed specs and the seven in the decision -- delete the local copies and import from `library.ts`.

**Acceptance Criteria:**
- Given the change, when you grep `frontend/e2e` for `function bookId`, `function sortSelect`, or a definition of a moved color, then only `library.ts` matches.
- Given each moved copy's old value, when you compare it with `library.ts`'s value, then they are equal. Check this before deleting each copy.
- Given the change, when `npm run check` runs, then it passes with the same e2e test count as on HEAD.

## Verification

**Commands:**
- `npm run check` (from the repo root) -- expected: green, with the same number of e2e tests as before the change.
- `git diff --stat -- frontend/e2e` -- expected: only e2e files, and no changed `expect(` line.

## Review Triage Log

### 2026-11-16: pass 1 (Blind Hunter, Edge Case Hunter, Verification Gap, Spine Check)

Spine Check: no findings (AD-17, AD-6, AD-15, AD-20 checked). Edge Case Hunter: none. Verification Gap: none. Blind Hunter: floor N = 6, 10 findings.

- **`[medium]` `[patch]` `SCRIM` copied in two specs.** `new-book-panel` and `card-notes-pile` both held tokens.css `--color-scrim` (light). It now lives in `library.ts`.
- **`[low]` `[patch]` `PAGE` copied under two names.** `bookcase-details` (`PAGE`) and `card-notes-pile` (`PAGE_LIGHT`) held the same `--color-page` value. It now lives in `library.ts`, and `card-notes-pile` imports it as `PAGE_LIGHT`.
- **`[low]` `[defer]` Inline copies remain.** `rgb(…)` literals of moved tokens in five specs, and the inline Sort locator and id template, existed before this change. They are in `deferred-work.md`.
- **`[low]` `[patch]` `tile-marks.ts` reached `SPINE_LABEL_STRIP` in two hops.** It now imports from `library.ts`, and the comment says so. The AC wording about its derived tuple is rejected, since that fix would only edit this spec.
- **`false`: specs mix import sources.** Helper modules re-export from `library.ts` by design (spec Boundaries), so every name still has one definition.
- **`[low]` rejected: light and dark twins are split.** Single-file dark values stay, per the spec's Never list. Moving them is more than a deletion, and the deferred entry above names them.
- **`[medium]` unverified `[defer]`: nothing checks `library.ts` against `tokens.css`.** That would be a new check, outside the move-only intent. It is in `deferred-work.md`.
- **`[low]` `[patch]`/rejected: comments.** `new-book-panel`'s orphaned comment and `catalog-tiles-automate`'s "comes from" line are removed. The comments now above imports in `home`/`restore-refusals` stay: they are still accurate, and moving them is cosmetic.
- **Rejected: the verification record and stale Code Map anchors.** The fix would only edit this spec. Counts: 724 e2e tests on HEAD (`playwright test --list`) and 724 passed after the patches (`npm run check`, exit 0).
