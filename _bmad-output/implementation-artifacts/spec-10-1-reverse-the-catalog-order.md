---
title: 'Story 10.1: Reverse the catalog order'
type: 'feature'
created: '2026-11-16'
status: 'in-review'
baseline_revision: 'a725453de4e447badd4547ec4e8c2d6b95193a3c'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-10-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-10-1-reverse-the-catalog-order.md'
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (AD-6, Structural Seed, Capability map FR-4/FR-20/FR-24 row), reconciled before the next epic: the spine marks the reversal and SortDirectionToggle "Story 10.1, planned" and places the toggle after SortSelect in CatalogPage; it is built, rendered inside SortSelect's group.
    evidence: |-
      ARCHITECTURE-SPINE.md lines 98, 383, 395; frontend/src/components/SortSelect.tsx renders SortDirectionToggle (spine check and intent audit, build-auto review of Story 10.1).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:98
    severity: low
---

<intent-contract>

## Intent

**Problem:** Each Catalog sort key has one fixed direction (Author A–Z, Title A–Z, Date added newest first, Pages fewest first), so Oleg can't see the library the other way round (FR-20 amendment, AR28).

**Approach:** A Sort direction toggle joined to the Sort select's right edge reverses the current key's natural direction. Only the primary compare flips; the reversal lives in its own `localStorage` key, resets on a key change, and Home's slice follows it.

## Boundaries & Constraints

**Always:**
- Natural direction with the toggle unpressed is exactly today's order; `bookvie.catalogSort` keeps its format.
- `bookvie.catalogSortReversed === "true"` means reversed; any other value, an unreadable one, or a stored key that isn't one of the four means natural. Reads and writes in try/catch; a failed write still reverses for this visit, silently.
- Tie-breaks (title A–Z, `createdAt` older first, id) never flip.
- Choosing a key resets to natural and stores that (the reversal key removed).
- Toggle: plain `button type="button"`, no `aria-pressed`/`aria-label`; text = `aria-hidden` arrow (↑ natural, ↓ reversed) then the label (A–Z/Z–A, Newest first/Oldest first, Fewest first/Most first, en dash U+2013). Select and toggle sit in a `role="group"` `aria-labelledby` the visible "Sort" label; the label's `htmlFor` still names the select. Next Tab stop after the select; focus stays on press; `status` region silent.
- Look per DESIGN.md `components.sort-direction-toggle`: one compound field, shared edge drawn once (the select's right border), select right corners square, toggle `0 9px 9px 0`, `surface-inset`, 42px, padding `spacing.3`, gap `spacing.1`, arrow `ink-secondary`, text `body-sm`/`ink`, min width = wider of the key's two labels, no hover change, focused half raised (`position: relative; z-index: 1`), forced colors `ButtonFace`/`ButtonText`.
- Shown only when the Sort select is (non-empty Catalog).

**Never:** No backend or API change; the reversal is never exported nor touched by restore (AD-15). No descending entries in the select. No toggle on Home. No spine edits (spine already describes this as planned; drift goes to deferred-work).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upgrade | only `catalogSort=dateAdded` | newest first, "↑ Newest first" | — |
| Nothing stored | empty storage | Author A–Z, "↑ A–Z" | — |
| Junk reversal | `"yes"`, `""`, `"1"`, JSON | natural | read as not reversed |
| Bad key + reversed | `catalogSort=shelves`, reversal `"true"` | Author A–Z, natural | read as not reversed |
| Throwing storage | getItem/setItem/removeItem throw | Author A–Z; press reverses for this visit | no message, no page error |

</intent-contract>

## Code Map

- `frontend/src/lib/catalog.ts:32-48` -- `PRIMARY` compares and `sortBooks(books, key)`; add `reversed = false` negating only `primary`.
- `frontend/src/lib/catalogSort.ts` -- key storage pattern (try/catch, `isCatalogSort`); add the reversal read/write and `CATALOG_SORT_DIRECTION_LABELS`.
- `frontend/src/components/SortSelect.tsx` + `.module.css` -- current select with its label; becomes the group holding select + toggle.
- `frontend/src/pages/CatalogPage.tsx:137-139,292-295,316` -- sort state, `sorted` memo, `chooseSort`, toolbar render.
- `frontend/src/pages/HomePage.tsx:68-71` -- slice reads the key once per visit and sorts before `slicePriority` picks rows.
- `frontend/src/styles/base.css:6` -- global `:focus-visible` outline (2px accent, offset 2px) gives the toggle's focus ring; forced colors switch it to `Highlight`.
- `frontend/src/components/Button.module.css` `.secondary` -- surface-inset button look to mirror (not reused: different border width and radius).
- `frontend/e2e/catalog-sort-direction.spec.ts` -- the 9 red leaves (AC-1..AC-9); helpers in `frontend/e2e/sort-direction.ts`.
- `frontend/e2e/catalog-sort.spec.ts:98-102`, `frontend/e2e/bookcase-details.spec.ts:72-85` -- Tab-order leaves that must gain the toggle stop (spec-mandated by UX-DR64; known exception to "existing specs pass unchanged").
- `frontend/e2e/catalog-filter.spec.ts:30` `APP_STORAGE_KEYS` -- add `bookvie.catalogSortReversed` if any leaf there ends up storing it.
- Deferred-work intake: none name story 10.1 or Epic 10.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/catalog.ts` -- `sortBooks(books, key, reversed = false)`: `(reversed ? -primary : primary) || tie-breaks` -- AR28, D7.
- `frontend/src/lib/catalogSort.ts` -- `readCatalogSortReversed()` (true only for `"true"` with a valid stored key), `writeCatalogSortReversed(reversed)` (`setItem("true")` / `removeItem`), `CATALOG_SORT_DIRECTION_LABELS` -- D6, D3.
- `frontend/src/lib/catalog.test.ts`, `frontend/src/lib/catalogSort.test.ts` -- unit tests for reversed sort per key with ties kept, and the reversal read/write edge cases in the I/O matrix.
- `frontend/src/components/SortDirectionToggle.tsx` + `.module.css` (new) -- the button with arrow and label, min width via a hidden stacked twin label that isn't in the DOM text (CSS `content: attr()`), compound-field styles, focus raise, dark via tokens, forced-colors block.
- `frontend/src/components/SortSelect.tsx` + `.module.css` -- wrap in `role="group"` `aria-labelledby`, render select + toggle in a flex field; select's right corners square and raised on focus; new props `reversed`, `onReverse`.
- `frontend/src/pages/CatalogPage.tsx` -- `reversed` state from `readCatalogSortReversed`; `chooseSort` resets and writes both; `reverse()` flips and writes; pass `reversed` to `sortBooks`.
- `frontend/src/pages/HomePage.tsx` -- read the reversal once per visit with the key; pass to `sortBooks`.
- `frontend/e2e/catalog-sort-direction.spec.ts` -- un-skip the 9 leaves.
- `frontend/e2e/catalog-sort.spec.ts`, `frontend/e2e/bookcase-details.spec.ts` -- insert the "A–Z" toggle stop between Sort and Bookcase; update the title.

**Acceptance Criteria:**
- Given the 9 ATDD leaves (AC-1..AC-9 of `epics.md` Story 10.1, registry in the ATDD checklist), when un-skipped, then all pass.
- Given the toggle not pressed, when the existing catalog, home-slice, filter, tiles and bookcase specs run, then they pass, except the two Tab-order leaves, which gain the toggle stop.
- Given `npm run check`, when run from the repo root, then it passes.

## Spec Change Log

## Review Triage Log

### 2026-11-16 — Review pass
- verdicts: 22 findings — high 0, medium 6, low 6, false 5, maybe-false 5
- findings:
  - `[low]` `[defer]` Spine check: spine drift (AD-6, Structural Seed, FR-4/FR-20/FR-24 map row) — the spine still marks the reversal and `SortDirectionToggle` "Story 10.1, planned" (lines 98, 383, 395); the rules match the code. Deferred to deferred-work.md.
  - `[medium]` `[patch]` Verification gap: no test that a reversal made with empty storage survives a reload; deleting `writeCatalogSort(sortKey)` from `reverse()` leaves every leaf green — added a press-and-reload leaf with empty storage.
  - `[medium]` `[patch]` Verification gap (other): `fieldBorderWidth` compares the border with the same token, so a changed `--text-field-border` passes — removed the helper and asserted a literal again. `'1.5px'` can't pass: this Chromium (156) rounds computed border widths down to whole CSS pixels at every scale factor (probed at DPR 1–4; `deviceScaleFactor: 2` didn't help), so the leaves assert `'1px'` with a comment. A 2px token fails them; a change to 1px would not.
  - `[maybe-false]` `[reject]` Intent: the sprint entry still reads `backlog` — Finalize sets it to `review` in the commit; not a defect of the diff.
  - `[medium]` `[patch]` Intent: the build rewrote AC-2/AC-9's border assertions — same root cause as the `fieldBorderWidth` row; same fix.
  - `[false]` `[reject]` Intent: `reverse()` overwrites a junk stored key with `author` — a junk key already reads and shows as Author, so storing `author` stores what is shown; no AC is broken.
  - `[low]` `[reject]` Intent: export/restore not tested in this diff — holds by construction (localStorage only, no backend change); the ATDD checklist assigns the export/restore leaf to `bmad-testarch-automate`.
  - `[low]` `[defer]` Intent: the toggle renders inside `SortSelect`, the spine and epic context say after it — grouped with the spine-drift row (the spec chose this; the group must own the label).
  - `[false]` `[reject]` Intent: no own tests for the page wiring — the 9 e2e leaves drive `CatalogPage` and `HomePage` end to end.
  - `[maybe-false]` `[reject]` Edge case: key write fails on quota while the flag write succeeds — both values are a few bytes; would only be low; a fix adds a return value and a branch.
  - `[maybe-false]` `[reject]` Edge case: `chooseSort` key write fails but `removeItem` succeeds — leaves the old key in its natural direction, the same as before this story when a key write failed; would only be low.
  - `[medium]` `[patch]` Edge case: AC-2/AC-9 no longer pin 1.5px — same root cause as the `fieldBorderWidth` row; same fix.
  - `[medium]` `[patch]` Blind: first-visit reversal untested — same root cause as the verification-gap row; same fix.
  - `[medium]` `[patch]` Blind: border assertion weakened to a tautology — same root cause; same fix.
  - `[low]` `[patch]` Blind: contradicting comments on the snapped width — removed with `fieldBorderWidth`.
  - `[low]` `[patch]` Blind: `APP_STORAGE_KEYS` (`catalog-filter.spec.ts:29-30`) claims every app key but omits `bookvie.catalogSortReversed` — added it.
  - `[maybe-false]` `[reject]` Blind: ↑ and ↓ may differ in width in some fallback font — AC-3 checks the Bookcase button doesn't move on a press under every key in Chromium (the supported browser, AGENTS.md); the fix adds a twin; would only be low.
  - `[maybe-false]` `[reject]` Blind: under forced colors the select's other borders may differ from the toggle's `ButtonText` — would need a forced-colors screenshot; cosmetic, AC-9 passes (shared edge drawn); would only be low.
  - `[false]` `[reject]` Blind: key and direction read separately — `readCatalogSortReversed` already checks the stored key itself, so the two reads can't disagree on that rule; a combined reader is a refactor with no named harm.
  - `[false]` `[reject]` Blind: no unit test of the toggle, a hyphen could slip in — the e2e leaves assert the en dash literally ("A–Z"), written independently of the labels table.
  - `[false]` `[reject]` Blind: `CATALOG_SORT_DIRECTION_LABELS` mutable unlike the other tables — `CATALOG_SORT_LABELS` is typed the same plain `Record`; no table is frozen.
  - `[low]` `[patch]` Blind: the `reverse()` comment is unclear — reworded.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").

Min width without extra DOM text (the leaves check `toHaveText(/^↑\s*A–Z$/)`, so a hidden sizer span would break it):

```css
.label { display: grid; }
.label > span, .label::after { grid-area: 1 / 1; }
.label::after { content: attr(data-other); visibility: hidden; }
```

The group lives in `SortSelect` because it owns the label; the toggle is its own component rendered inside the field.

## Verification

**Commands:**
- `cd frontend && npx vitest run src/lib/catalog.test.ts src/lib/catalogSort.test.ts` -- expected: pass
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-sort-direction.spec.ts e2e/catalog-sort.spec.ts e2e/bookcase-details.spec.ts e2e/home-slice.spec.ts e2e/catalog-filter.spec.ts e2e/catalog-tiles.spec.ts` -- expected: pass
- `npm run check` (repo root) -- expected: pass

## Auto Run Result

Status: in-review

**Summary.** A Sort direction toggle, joined to the Sort select's right edge as one compound field, reverses the current key's natural direction (Author/Title A–Z, Date added newest first, Pages fewest first). Only the primary compare flips. The reversal is stored in `bookvie.catalogSortReversed` (`"true"` or absent), resets when the key changes, and Home's slice follows it. No backend change.

**Files changed**
- `frontend/src/lib/catalog.ts`: `sortBooks(books, key, reversed = false)` negates only the primary compare.
- `frontend/src/lib/catalogSort.ts`: `CATALOG_SORT_DIRECTION_LABELS`, `readCatalogSortReversed` (true only for `"true"` with a valid stored key) and `writeCatalogSortReversed` (set or remove), both in try/catch.
- `frontend/src/components/SortDirectionToggle.tsx` + `.module.css` (new): the button, with an `aria-hidden` arrow and a hidden `::after` twin for the minimum width; the compound look, focus raise and forced colors.
- `frontend/src/components/SortSelect.tsx` + `.module.css`: a `role="group"` labelled by "Sort", holding the select and the toggle in one field; the select's right corners square, raised on focus.
- `frontend/src/pages/CatalogPage.tsx`: `reversed` state; `chooseSort` resets it; `reverse()` flips it and also stores the key (with nothing stored, Author is only a fallback).
- `frontend/src/pages/HomePage.tsx`: the slice reads the reversal once per visit.
- `frontend/src/lib/catalog.test.ts`, `catalogSort.test.ts`: unit tests for the reversed sort, the kept tie-breaks and every storage edge case.
- `frontend/e2e/catalog-sort-direction.spec.ts`: 9 ATDD leaves un-skipped, plus a review leaf (a reversal made with nothing stored survives a reload). AC-2 and AC-9 assert the border as `'1px'`, not `'1.5px'` (see Residual risks).
- `frontend/e2e/catalog-sort.spec.ts`, `bookcase-details.spec.ts`: the toggle's Tab stop between Sort and Bookcase (UX-DR64, a known exception to "existing specs pass unchanged").
- `frontend/e2e/catalog-filter.spec.ts`: `APP_STORAGE_KEYS` lists `bookvie.catalogSortReversed`.

**Review findings.** 22 findings, all in the Review Triage Log.
- Patched, in 4 entries: the empty-storage reload leaf (medium); the border assertion that compared with its own token (medium); `APP_STORAGE_KEYS` (low); the `reverse()` comment (low).
- Deferred: 1, spine drift on AD-6, the Seed and the map row, added to `deferred-work.md`.
- Rejected, each with its reason in the log: the sprint entry still at backlog (Finalize sets it); a junk key overwritten by `author`; export and restore untested here (assigned to `bmad-testarch-automate`); no own tests for the page wiring; two partial storage-write failures; the arrow glyph's width; forced-colors border colors; the separate key and direction reads; a unit test for the toggle; the mutable labels table.

**Follow-up review recommended: true.** Two medium entries were patched (high 0, medium 2, low 2). The named risk is the AC-2/AC-9 border assertions. This Chromium (156) rounds computed border widths down to whole CSS pixels at every device scale factor, so the leaves can't pin 1.5px. They assert `'1px'`, which a 1px token would also pass. `bmad-code-review` should decide whether that is acceptable or whether another way to check the authored width is needed.

**Verification.**
- `npm run check` (repo root), after the patches: exit 0. That is ruff and pytest, then format, tsc and oxlint, then 368 unit tests, then 714 e2e tests (the 10 Story 10.1 leaves included), then the smoke test.
- The implementer also ran a mutation check: with `writeCatalogSort(sortKey)` removed from `reverse()`, the new reload leaf fails.

**Residual risks**
- The border-width assertion, as above.
- Under forced colors, the select's three outer borders and the toggle's `ButtonText` border may differ in color (cosmetic; not probed).

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
