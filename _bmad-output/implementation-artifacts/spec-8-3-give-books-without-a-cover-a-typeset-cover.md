---
title: 'Story 8.3: Give books without a cover a typeset cover'
type: 'feature'
created: '2026-11-13'
baseline_revision: '88ee0276f27770606f90b13168fa9e0298a4682c'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: AD-6's Tiles bullet lists what a tile reads from the catalog view (packing, the ribbon from `finished`, the bar from `percent`, the name, the cover URL) and says nothing of the typeset cover, its read = `finished` rule, or the failed-cover fallback.
    evidence: |-
      ARCHITECTURE-SPINE.md AD-6 Tiles bullet; frontend/src/pages/CatalogTiles.tsx `TypesetCover` (reads `finished`, `spineColor`, `title`, `firstAuthor` as is). The code follows AD-6 (client presentation only); only the spine text is behind.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
---

<intent-contract>

## Intent

**Problem:** On Tiles, a Book without a cover (or whose cover fails to load) shows the dashed no-cover placeholder, so the grid reads as broken (FR-25, UX-DR57).

**Approach:** In Tiles only, replace that placeholder with a typeset cover drawn from the catalog view as is. A read Book (`finished: true`) gets its exact `spineColor` with a light plate holding the title and the first author. An unread one looks like an unread spine seen from the front: the unread fill and outline, with the text and no plate.

## Boundaries & Constraints

**Always:**
- "Read" is the view's `finished`, as on the bookcase. A Main book never finished (Emma) gets the unread typeset cover and keeps its reading bar.
- Read: fills the whole box in the exact `spineColor`, with a 1px `spine-edge` border and 4px (`radius-cover`) corners. A `spine-label-strip` plate with 2px corners sits 10px in from both sides of the box and its top 34px below the box's top (measured from the box's outer edge, so the border is subtracted). It holds the title (`book-title-sm`, weight 400, at most 4 lines, `spine-label`) and the first author (`meta`, one line, ellipsis, `spine-label`). All text lies inside the plate.
- Unread: `spine-unread-fill` with a solid 1.5px `spine-unread-outline` border and 4px corners. The same title and author layout in `spine-unread-text`, and nothing paints `spine-label-strip`.
- A failed cover (`state === 'failed'`) renders the same typeset cover, chosen by `finished`. The loading state stays 8.1's flat `surface-inset` box.
- The typeset cover lives inside the `aria-hidden` box, so the link's name doesn't change. The 8.2 ribbon is drawn over it (later in DOM order) and stays clear of the plate. The focus and highlight rings stay on the box, which never changes size.
- Dark theme comes from tokens alone: the read fill, plate and `spine-label` don't change, while `spine-edge` and `spine-unread-*` take their dark twins.
- Forced colors: the typeset cover is `Canvas` with a `CanvasText` border and `CanvasText` text.
- The 5 ATDD leaves in `catalog-typeset-covers.spec.ts` are the contract. Turn them on and don't weaken them.

**Never:**
- No change to the placeholder in the Main book card, the Up next thumbnail, the empty card's suggestion or Book detail.
- No backend or API change, and no new primitive token.
- No text on the Book's color directly. No typeset text in the link's accessible name.
- Don't edit the architecture spine. Spine drift is deferred.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Read, no cover | `coverFile: null`, `finished: true` | Spine-color typeset with plate, title and first author; ribbon over the top-right | — |
| Unread, no cover | `coverFile: null`, `finished: false` | Unread typeset: unread fill, solid outline, unread text, no plate | — |
| Main, never finished | `finished: false`, `percent: 64` | Unread typeset and the reading bar | — |
| Broken cover | file isn't an image | Once `error` fires, the typeset cover for its `finished` | No broken `img` left visible |
| Cover loading | image not arrived | 8.1's flat `surface-inset` loading box, not a typeset cover | — |
| Long title / author | title longer than 4 lines, long author | Title clamped at 4 lines, author cut with an ellipsis on 1 line, both inside the plate | — |
| No author | `firstAuthor: ''` (unreachable: `invariants.py:88` requires authors; the view's fallback is `''`) | Only the title, no empty author line | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CatalogTiles.tsx:63` -- `TileCover`. Its no-cover/failed branch (line 69) renders `<Cover coverFile={null} title={title} size="fill" />` then the `Ribbon`. Replace the `Cover` with a new local `TypesetCover` (title, first author, finished, spine color). `TileCover` needs `firstAuthor` passed in from the map at line 141. The `Ribbon` (line 34) and its per-Book custom property pattern (`CSSProperties & Record<'--ribbon-color', string>`) are the model for `--typeset-color`.
- `frontend/src/pages/CatalogTiles.module.css:27` -- `.box`: `position: relative`, 2:3, `border-radius: var(--radius-cover)`, no border of its own. A typeset element at `position: absolute; inset: 0; box-sizing: border-box` fills it exactly. `.ribbon` (line 100) is absolute in the box, so it lands over the typeset cover when it comes after it. The forced-colors block is at line 183.
- `frontend/src/components/Cover.tsx` / `Cover.module.css` -- the `fill` size (Cover.tsx:12, 19–20, 38; `.fill` in Cover.module.css:44) is used only by `CatalogTiles.tsx:72`. Once replaced, remove the `fill` variant. `main` and `thumb` stay exactly as they are.
- `frontend/src/styles/tokens.css:183–192` -- the `--catalog-tile-*` literals. Add the three length literals from DESIGN.md `components.catalog-tile` (lines 380–382): `--catalog-tile-typeset-plate-inset: 10px; --catalog-tile-typeset-plate-top: 34px; --catalog-tile-typeset-plate-radius: 2px;`. Colors and type come from existing tokens: `--color-spine-edge`, `--color-spine-label-strip`, `--color-spine-label`, `--color-spine-unread-{fill,outline,text}`, `--font-book-title-sm-*`, `--font-meta-*`, `--hairline`, `--radius-cover`. `--text-field-border` is 1.5px but means something else: write the unread border as a literal with a DESIGN.md comment.
- `frontend/e2e/catalog-typeset-covers.spec.ts` -- 5 leaves, `test.skip(` → `test(`. The box is the first descendant as wide as the `li` at 2:3, so the typeset element must not come before the box in DOM order (it's inside it). `boxFacts` collects text nodes inside the box and the backgrounds of its descendants. The plate is found by a column 13px in from the box's left, so the plate needs more than 3px of left padding before any glyph.
- Superseded leaves (ATDD checklist, "Existing leaves this story changes"):
  - `frontend/e2e/catalog-tiles.spec.ts:407` (8.1 AC-5) asserts the dashed placeholder in Tiles.
  - `frontend/e2e/catalog-tile-marks.spec.ts:223` picks the first leaf text node in each link as the caption title; the typeset title now comes first on no-cover tiles.
  - `frontend/e2e/catalog-tile-marks.spec.ts:347` asserts `toHaveText('EmmaJane Austen')` on Emma's link, which now also holds the typeset text.
  - Re-run the ribbon-over-placeholder checks: `catalog-tile-marks.spec.ts:91,171,287,539` and `catalog-tile-marks-automate.spec.ts:298,377`.
- `frontend/e2e/cover.spec.ts`, `home.spec.ts`, `up-next.spec.ts` -- the placeholder elsewhere. They must stay green.
- `README.md:8` -- the Status line. Project docs: the 8.2 links are at lines 135–136.
- Deferred-work intake:
  - `deferred-work.md:958` (the `/media/covers/<coverFile>` wording, "so Stories 8.2 and 8.3 don't copy it"): not in this story. It belongs to the Epic 8 spine reconciliation, and this story builds no cover URL.
  - No other open entry names story 8.3.

## Tasks & Acceptance

**Execution:**
- `frontend/src/styles/tokens.css` -- after `--catalog-tile-reading-bar-gap`, add the three `--catalog-tile-typeset-plate-*` literals. Hand-edit only, never format the file.
- `frontend/src/pages/CatalogTiles.tsx`:
  - Add `TypesetCover({ title, author, finished, color })`: a `div` (`styles.typeset` plus `styles.typesetRead` or `styles.typesetUnread`, with an inline `--typeset-color` for read) holding a `div` (`styles.plate`, plus `styles.plateRead` for read) with a title `span` and, when the author isn't empty, an author `span`. No `role` and no `aria-*`: it's inside the `aria-hidden` box.
  - In `TileCover`'s no-cover/failed branch, render `<TypesetCover … />` in place of `<Cover … size="fill" />`, keeping the `Ribbon` after it. Pass `firstAuthor` through `TileCoverProps`. Drop the `Cover` import.
  - Update the doc comments of `TileCover` and `CatalogTiles`.
- `frontend/src/pages/CatalogTiles.module.css`:
  - `.typeset`: `position: absolute; inset: 0; box-sizing: border-box; border-radius: var(--radius-cover); border: var(--typeset-border) solid …`, with `--typeset-border` set per variant (`var(--hairline)` read, `1.5px` unread).
  - `.typesetRead`: background `var(--typeset-color)`, border color `--color-spine-edge`, text color `--color-spine-label`. `.typesetUnread`: `--color-spine-unread-fill`, `--color-spine-unread-outline`, `--color-spine-unread-text`.
  - `.plate`: `position: absolute; top: calc(var(--catalog-tile-typeset-plate-top) - var(--typeset-border)); left/right: calc(var(--catalog-tile-typeset-plate-inset) - var(--typeset-border))`, padding `var(--space-2)` (more than 3px), radius `--catalog-tile-typeset-plate-radius`. `.plateRead` adds the `--color-spine-label-strip` background.
  - `.typesetTitle`: `book-title-sm` family, size and line height, weight `var(--font-book-title-sm-weight)` (400), `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; overflow-wrap: anywhere`. `.typesetAuthor`: `meta` tokens, `display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
  - Forced colors: `.typeset { background: Canvas; border-color: CanvasText; color: CanvasText }` and `.plateRead { background: Canvas }`.
- `frontend/src/components/Cover.tsx`, `Cover.module.css` -- remove the unused `fill` size (the union branch, the `.fill` class and the doc line).
- `frontend/e2e/catalog-typeset-covers.spec.ts` -- turn on all 5 leaves.
- `frontend/e2e/catalog-typeset-covers.spec.ts` -- a matrix leaf the ATDD doesn't cover, in a second `describe` reusing the file's helpers, run red-then-green where it can be:
  - Loading: hold Bleak House's cover request with `page.route`, check its box is the flat `surface-inset` loading box with no text, then release it and check the cover shows with no typeset text.
- Superseded leaves:
  - `frontend/e2e/catalog-tiles.spec.ts:407` -- rewrite to the typeset cover: for Dune 2 (no cover) and Kindred (broken file), no visible `img`, the box keeps a covered tile's size, and the box holds the title text. Keep the leaf's id and priority, and rename it to say "typeset cover".
  - `frontend/e2e/catalog-tile-marks.spec.ts:223` -- take the caption title from outside the 2:3 box (for example the last two leaf text elements in the link).
  - `frontend/e2e/catalog-tile-marks.spec.ts:347` -- assert the link's text ends with the caption, or read the caption element's text, so the typeset text in the `aria-hidden` box doesn't break it. The accessible-name check stays as is.
  - Update comments that say "placeholder" for Tiles in `catalog-tile-marks.spec.ts`, `catalog-tile-marks-automate.spec.ts` and `tile-marks.ts` where they now mean the typeset cover. Don't change their assertions unless a run proves they're superseded, and record any such change in the checklist.
- `_bmad-output/test-artifacts/atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md` -- tick the activation items, the Tokens follow-up, and the matrix leaf added. Record that the No-author row has no leaf because the store refuses a Book without authors. Add Green Phase notes.
- `README.md`:
  - On the Status line (line 8), after "show a reading bar", add that Books without a cover get a typeset cover in their spine color. Keep "43 of 44 stories done".
  - In Project docs, after the Story 8.2 ATDD checklist line, add "Story 8.3 spec" (`_bmad-output/implementation-artifacts/spec-8-3-give-books-without-a-cover-a-typeset-cover.md`) and "Story 8.3 ATDD checklist" (`_bmad-output/test-artifacts/atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md`).

**Acceptance Criteria:**
- Given a read Book without a cover, when its tile renders, then the box is its exact spine color with a 1px `spine-edge` border and 4px corners, and a `spine-label-strip` plate 10px from the sides and 34px from the top holds the title (`book-title-sm` 400, at most 4 lines, `spine-label`) and the first author (`meta`, one line). No text sits straight on the color, and the 8.2 ribbon hangs clear of the plate.
- Given an unread Book without a cover, when its tile renders, then the box is `spine-unread-fill` with a solid 1.5px `spine-unread-outline` border, the title and author in `spine-unread-text`, and no plate.
- Given a cover that fails to load, when its tile renders, then the typeset cover for its `finished` replaces it, with no visible `img`.
- Given the dark theme, then the read fill, plate and text are unchanged while the edge and unread colors take their dark twins. Given forced colors, then the typeset cover is `Canvas` with a `CanvasText` border and text.
- Given the Main book card, Up next or Book detail, when a Book has no cover, then they show the old "No cover" placeholder at 200×300 / 44×64 / 200×300.
- Given any tile, when a screen reader reads it, then the link's accessible name is still the spine name, unchanged by the typeset text.
- Given Stories 8.1 and 8.2's tests, when this story lands, then they pass, with only the superseded leaves listed above changed.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 28 findings — high 0, medium 0, low 18, false 10, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine check: AD-6's Tiles bullet doesn't mention the typeset cover, its read = `finished` rule or the failed-cover fallback — spine drift, deferred (spec `deferred:` and deferred-work.md); the code follows AD-6.
  - `[low]` `[patch]` Verification gap (other): the ATDD checklist says the no-author row has "No leaf" and counts 6 passed, but the file has the route-forced no-author leaf (7) — checklist item ticked, the leaf described, counts now 2 automate leaves / 7 passed.
  - `[low]` `[reject]` Verification gap (other): the no-author leaf can't tell an empty `display: block` author span from none — true, but an empty block span has no line box and zero height, so the page looks identical; no user-visible harm, and pinning it needs DOM-shape assertions the file avoids by design.
  - `[low]` `[reject]` Intent: the unread 1.5px outline is a 1px border plus a 0.5px inset shadow, so forced colors (which drop shadows) show a 1px `CanvasText` border — Chromium floors border widths to whole CSS px (the ATDD AC-2/AC-4 leaves failed with `border: 1.5px`); the AC asks only for a `CanvasText` border under forced colors. The only fix that matches the spec's Tasks literally is a spec edit; the ATDD contract (Always) wins over the Tasks' technique.
  - `[low]` `[patch]` Intent: the rewritten 8.1 AC-5 leaf no longer pins the look — grouped with the Blind row below; it now asserts the typeset title's computed color (both its Books are unread: `spine-unread-text`).
  - `[false]` `[reject]` Intent: more 8.1 leaves changed than the spec listed — the spec says change others only when a run proves them superseded and record it in the checklist; each (`.last()` in 8.1 AC-3/AC-9, inset shadows in AC-7) failed only on the duplicated typeset text or the unread shadow and is recorded.
  - `[false]` `[reject]` Intent: the link's text now holds the title and author twice — DESIGN.md puts the text on the typeset cover; it sits in the `aria-hidden` box, so the accessible name is unchanged (the ATDD checklist flags find-in-page for the review).
  - `[low]` `[patch]` Intent: checklist and tests disagree on the no-author leaf — same root cause and fix as the verification-gap row.
  - `[false]` `[reject]` Intent: the loading leaf goes beyond the epic's ACs — it covers the spec's "Cover loading" matrix row.
  - `[false]` `[reject]` Intent: `cover.spec.ts`, `home.spec.ts`, `up-next.spec.ts` are only "described" as green — they ran in the spec's targeted command (120 passed) and in `npm run check`.
  - `[false]` `[reject]` Intent: the ribbon-clear and dark-theme assertions aren't visible in the diff — they are in the ATDD leaves committed at the baseline, switched on unchanged, and passed.
  - `[low]` `[patch]` Blind: the checklist contradicts the diff on the no-author leaf — same fix as the verification-gap row.
  - `[low]` `[patch]` Blind: the Green Phase leaf count is wrong — same fix.
  - `[low]` `[reject]` Blind: the spec's Tasks still say a 1.5px unread border — the fix is an edit to the spec under review; recorded under Auto Run Result instead.
  - `[low]` `[reject]` Blind: the spec's Tasks still say to record that the no-author row has no leaf — the fix is an edit to the spec under review.
  - `[low]` `[patch]` Blind: AC-7's ring-fade check accepts any shadow string containing "inset" — the computed list is now split on commas outside parentheses and every shadow must be inset.
  - `[low]` `[patch]` Blind: 8.2 AC-5 pins `'EmmaJane AustenEmmaJane Austen'`, against the spec's "ends with the caption" — now `/^(?:EmmaJane Austen)?EmmaJane Austen$/`; Dune's exact check stays.
  - `[low]` `[reject]` Blind: the `.at(-2)`/`.last()` caption pickers are fragile — every caption has an author (the store requires authors, `invariants.py:88`), so the pick is stable; a sturdier selector adds structure for a case that can't occur.
  - `[low]` `[patch]` Blind: nothing clips the plate if the text grows past the box — `.typeset` gains `overflow: hidden` (the ribbon is a sibling, not clipped).
  - `[low]` `[patch]` Blind: the rewritten 8.1 AC-5 drops the variant check — titles' computed color asserted (`rgb(119, 113, 106)` for both unread Books).
  - `[false]` `[reject]` Blind: `TypesetCover` sets no `--typeset-color` when unread and `firstAuthor` has no doc comment — the unread cover doesn't use the color; no named harm.
  - `[low]` `[reject]` Blind: the loading leaf's "nothing painted inside" would miss a border-only typeset cover — the loading branch renders only the frame and `img`, and the typeset cover is in the other branch; an edge-pixel check adds work for a regression the branch structure rules out.
  - `[false]` `[reject]` Blind: open green-phase follow-ups have no note — they are the ATDD checklist's input to `bmad-testarch-automate`, step 4 of the story pipeline, by design.
  - `[false]` `[reject]` Blind: the no-author leaf's `hasText` filter could match another item — TYPESET_SHELF has one Good Omens and the grid is the only list with items; `tileItem` needs the spine name, which changes with `firstAuthor`.
  - `[low]` `[patch]` Edge: the plate can spill past the box under large fonts — same fix as the Blind overflow row.
  - `[low]` `[patch]` Edge: a ring plus an inset shadow on one element passes AC-7 — same fix as the Blind AC-7 row.
  - `[false]` `[reject]` Edge: `.at(-2)` picks the wrong node with no author line — captions always have an author (`invariants.py:88`).
  - `[false]` `[reject]` Edge: unread outline 1px under forced colors — duplicate of the Intent row; the AC requires only a `CanvasText` border, which is drawn.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why the plate offset subtracts the border:** absolutely positioned children are placed from the typeset element's padding box, inside its border. DESIGN.md measures 34px and 10px from the box's edge, and the leaves check it ±1px, so `top: calc(34px - border)`. The unread text uses the same plate element without a background, so both covers share one layout.
- **Shape:**

```tsx
<div className={`${styles.typeset} ${styles.typesetRead}`} style={{ '--typeset-color': color }}>
  <div className={`${styles.plate} ${styles.plateRead}`}>
    <span className={styles.typesetTitle}>{title}</span>
    {author !== '' && <span className={styles.typesetAuthor}>{author}</span>}
  </div>
</div>
```

## Verification

**Commands:**
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-typeset-covers.spec.ts e2e/catalog-tiles.spec.ts e2e/catalog-tiles-automate.spec.ts e2e/catalog-tile-marks.spec.ts e2e/catalog-tile-marks-automate.spec.ts e2e/catalog-pace-calculator.spec.ts e2e/cover.spec.ts e2e/home.spec.ts e2e/up-next.spec.ts e2e/app-shell.spec.ts` -- expected: all pass.
- `npm run check` (repo root) -- expected: green (ruff, Prettier, oxlint, `tsc -b`, `check:api`, pytest, coverage, node tests, the full Playwright suite, smoke).

**Manual checks:**
- A screenshot of the seven-Book `TYPESET_SHELF` row at 1280px in light, dark and forced colors: read typeset covers with plates, unread ones without, the ribbon clear of the plate.

## Auto Run Result

Status: in-review

**Summary.** On Catalog's Tiles, a Book without a cover, or whose cover fails to load, now gets a typeset cover in place of the dashed no-cover placeholder. Which one depends on `finished`:
- **Read:** fills the box with the exact `spineColor`, with a 1px `spine-edge` border and 4px corners. A `spine-label-strip` plate, 10px in from the sides and 34px from the top, holds the title (`book-title-sm` 400, clamped at 4 lines) and the first author (`meta`, one line), both in `spine-label`. The 8.2 ribbon hangs clear of the plate.
- **Unread:** `spine-unread-fill` with a 1.5px `spine-unread-outline` and the same text layout in `spine-unread-text`, with no plate.

The cover sits inside the `aria-hidden` box, so the link's name doesn't change. The dark theme comes from tokens. Under forced colors the cover is `Canvas` with a `CanvasText` border and text. The Main book card, Up next and Book detail keep the old placeholder.

**Departure from the spec's Tasks.** The unread 1.5px outline is a 1px border plus a 0.5px inset shadow of the same color, not `border: 1.5px`, because Chromium floors border widths to whole CSS pixels. The ATDD AC-2 and AC-4 leaves failed with a 1.5px border. As a result, the plate offset subtracts 1px on both covers, and under forced colors the shadow drops, leaving a 1px `CanvasText` border.

**Files changed.**
- `frontend/src/pages/CatalogTiles.tsx`: new `TypesetCover` in `TileCover`'s no-cover/failed branch, with `firstAuthor` passed through.
- `frontend/src/pages/CatalogTiles.module.css`: the typeset, plate, title and author rules (`overflow: hidden` on the cover), plus forced colors.
- `frontend/src/styles/tokens.css`: the three `--catalog-tile-typeset-plate-*` literals from DESIGN.md.
- `frontend/src/components/Cover.tsx`, `Cover.module.css`: the unused `fill` size removed.
- `frontend/e2e/catalog-typeset-covers.spec.ts`: the 5 ATDD leaves on, unchanged, plus two automate leaves: loading, and an empty first author forced by route. The empty-author leaf was red against a build that drew an empty author line.
- `frontend/e2e/catalog-tiles.spec.ts`, `catalog-tiles-automate.spec.ts`, `catalog-tile-marks.spec.ts`, `catalog-tile-marks-automate.spec.ts`, `tile-marks.ts`: superseded leaves updated (8.1 AC-5 is now the typeset cover with its text color) and caption pickers changed to `.last()` / `.at(-2)`. The AC-7 ring-fade check now accepts only all-inset shadow lists. Emma's link text allows the hidden typeset copy. Comments updated.
- `_bmad-output/test-artifacts/atdd-checklist-8-3-…md`: activation, Tokens and the matrix leaves ticked, with Green Phase notes.
- `README.md`: the Status line, and the Story 8.3 spec and checklist links.
- `deferred-work.md`: one spine-drift entry.
- `sprint-status.yaml`: `review`.

**Review.**
- 28 findings from 5 layers: 0 high, 0 medium, 18 low, 10 false.
- 11 rows patched, as 5 fixes:
  - the checklist's no-author leaf and counts;
  - AC-7's shadow-list split;
  - Emma's link-text regex;
  - `.typeset { overflow: hidden }`;
  - 8.1 AC-5's variant color check.
- 1 deferred: spine drift, AD-6.
- 16 rejected, each with its reason in the triage log:
  - the 1.5px technique and two stale spec Tasks lines (fixing them means editing the spec under review);
  - duplicated tile text (DESIGN.md's design, and the name is unchanged);
  - caption pickers (authors are required, `invariants.py:88`);
  - and false claims about scope, coverage and the leaves.

**Follow-up review recommendation:** `false`. Every patched entry was low (0 high, 0 medium patched).

**Verification.**
- The spec's targeted Playwright command passed: 120 tests before the patches. `catalog-typeset-covers.spec.ts` passed 7 of 7.
- `npm run check` exits 0 after the patches:
  - ruff, Prettier, oxlint, `tsc -b` and `check:api`;
  - pytest: 1573 passed, coverage gates ok (domain 100%, intents+store 98.08%);
  - node tests: 354 passed;
  - Playwright: 658 passed;
  - smoke ok.
- Matrix audit: every row has a passing leaf:
  - read, unread and Main never finished: AC-1 and AC-2;
  - broken cover: AC-3;
  - loading, and no author: the automate leaves;
  - long title and author: AC-1 (Jekyll).

**Residual risks:**
- The manual screenshots of the seven-Book row in light, dark and forced colors were not taken. The looks are checked by pixels at DPR 2 in Chromium only.
- Under forced colors the unread outline is 1px.
- Each title on a no-cover tile appears twice in the page text, so find-in-page finds it twice. That is DESIGN.md's design.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
