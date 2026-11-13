---
title: "Story 8.2: See what I've read and what I'm reading on the tiles"
type: 'feature'
created: '2026-11-13'
baseline_revision: '357ed27f890e1aa7e25e4bd13724854953f5e226'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, Capability map FR-25), reconciled before the next epic: the spine still calls the Tiles view "Epic 8, planned" and the FR-25 row "not built", while Stories 8.1 and 8.2 have built the tiles, the finished ribbon and the reading bar.
    evidence: |-
      ARCHITECTURE-SPINE.md AD-6 Tiles bullet and the FR-25 map row; frontend/src/pages/CatalogTiles.tsx (Ribbon from `finished`, ReadingBar from `percent` as is). Same drift as Story 8.1's deferred entry, now larger.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
---

<intent-contract>

## Intent

**Problem:** On Tiles, a cover alone doesn't say whether Oleg has read the Book or is reading it now (FR-25, UX-DR56, AR24).

**Approach:** Each tile gains two `aria-hidden` marks drawn from the catalog view as is. A finished ribbon (when `finished`) is a bookmark in the exact `spineColor` hanging from the visible cover's top. A reading bar (when `percent !== null`) sits in 8.1's reserved slot and is filled to `percent`. The status already lives in the link's spine name.

## Boundaries & Constraints

**Always:**
- The ribbon reads `book.finished` and the bar reads `book.percent`, never `currentPage`/`pages`. A re-read shows both.
- Ribbon: 16×24px with a 6px V-notch at its lower end, 10px in from the visible cover's right edge, hanging from its top. Fill is the exact `spineColor`. A 1px `spine-edge` line runs on its sides and notch (not its top), with a 1.5px `spine-label-strip` halo outside that line. No text or glyph.
- "Visible cover" means the loaded `img`'s rectangle. For the placeholder (no cover, or a failed cover) it is the box. While a cover is loading, no ribbon shows.
- Bar: 5px tall, 6px below the box, the box's width, `accent-soft` track, `accent` fill from the left, square ends. Inside the 11px slot, so captions keep lining up.
- The ribbon stays inside the `aria-hidden` box. The slot is `aria-hidden` too. No mark adds text to the link.
- Colors come from tokens, so the dark theme needs no extra rule. `spine-label-strip` stays light, and `spine-edge` and `accent*` take their dark twins.
- Forced colors: ribbon fill and edge, and the bar fill, use `forced-color-adjust: none` with `CanvasText`. The ribbon halo becomes `Canvas`. The bar track becomes `Canvas` with a `CanvasText` outline.
- The 8.1 behavior holds: the box never changes size, the cover is shown whole at the bottom, there is zero layout shift (AC-10 of 8.1), and the focus and highlight rings stay on the box.
- The 7 ATDD leaves in `catalog-tile-marks.spec.ts` are the contract. Turn them on and don't weaken them.

**Never:**
- No typeset cover (Story 8.3). The placeholder stays as in 8.1.
- No backend or API change. No marks for Up next, Waiting or Side read beyond what `finished` and `percent` give.
- No dimming, tint, crop or shadow on covers. No marks on the bookcase, the List or Home.
- Don't edit the architecture spine. Spine drift is deferred.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Finished, cover loaded | `finished: true`, image decoded | Ribbon on the image's top-right, inset 10px | — |
| Finished, cover loading | image not yet arrived | No ribbon yet. It appears with the cover, and the box doesn't move | — |
| Finished, no or broken cover | `coverFile` null, or `error` | Ribbon at the box's top-right, on the placeholder | — |
| Reading | `percent: 64` | Bar 64% `accent` on `accent-soft` | — |
| Re-read | `finished: true`, `percent: 12` | Ribbon and bar | — |
| Unread | `finished: false`, `percent: null` | No mark, and the slot is empty | — |
| Boundaries | `percent: 0` / `100` | Full track and no fill / full fill | — |
| Narrow cover | visible cover narrower than 26px | Ribbon clamped inside the cover's right edge where it can be (never overflows its left) | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CatalogTiles.tsx:30` -- `TileCover`. Add a `finished` prop and render `<Ribbon color={spineColor} />` (a) next to `<Cover size="fill">` in the placeholder branch, and (b) inside a new frame `span` that wraps the `img`, only once `loaded`. Line 89 has the empty `.slot`: make it `aria-hidden="true"` and render the bar inside it when `book.percent !== null`.
- `frontend/src/pages/CatalogTiles.module.css:47` -- `.cover`. The `img` is `position: absolute; inset: 0; margin: auto auto 0` with `max-width/height: 100%`, so no element hugs the visible cover. The frame takes over that positioning (abspos, `inset: 0`, `margin: auto auto 0`, `width/height: fit-content`). The `img` becomes a block inside it, capped with container units on the box (`container-type: inline-size`; `max-width: 100cqw; max-height: 150cqw`). The frame's rectangle is then exactly the `img`'s, and the ribbon is `position: absolute; top: 0; right: …` in it. Line 79: the slot's comment.
- `frontend/src/pages/Bookcase.tsx:251` -- the pattern for a per-Book color: `CSSProperties & Record<'--spine-color', …>` inline custom property. Copy it for `--ribbon-color`.
- `frontend/src/components/Cover.tsx` / `Cover.module.css` -- the `fill` placeholder. Read-only, and it stays as in 8.1.
- `frontend/src/styles/tokens.css:183` -- after `--catalog-tile-reading-bar-slot`, add the literals DESIGN.md `components.catalog-tile` gives (lines 367–376): `--catalog-tile-ribbon-width: 16px; --catalog-tile-ribbon-height: 24px; --catalog-tile-ribbon-notch: 6px; --catalog-tile-ribbon-inset: 10px; --catalog-tile-ribbon-halo: 1.5px; --catalog-tile-reading-bar-height: 5px; --catalog-tile-reading-bar-gap: 6px;`. The edge is `--hairline`. Colors: `--color-spine-edge`, `--color-spine-label-strip`, `--color-accent`, `--color-accent-soft`. `app-shell.spec.ts` compares only primitives.
- `frontend/e2e/catalog-tile-marks.spec.ts` -- 7 leaves, `test.skip(` → `test(`. Marks are read from pixels at DPR 2. The visible cover is `li img`'s rect. The box is the first descendant as wide as the `li` at 2:3. The frame must never be that first match: the box comes first in DOM order, so this holds.
- `frontend/e2e/catalog-tiles.spec.ts`, `catalog-tiles-automate.spec.ts` -- 8.1's leaves (cover geometry, loading box, AC-10 speed and zero layout shift, forced-colors hairline on `img`). They must stay green with the frame.
- `frontend/e2e/catalog-pace-calculator.spec.ts` -- the axe pass over Tiles. It must stay green with marks on screen.
- `README.md:8` -- Status line. Project docs: the 8.1 links are at lines 133–134.
- Deferred-work intake:
  - `deferred-work.md:958` ("so Stories 8.2 and 8.3 don't copy it", the `/media/covers/<coverFile>` wording in `epic-8-context.md`): not in this story. Its fix belongs to the Epic 8 spine reconciliation, and this story builds no cover URL (it keeps `coverSrc`).
  - No other open entry names story 8.2.

## Tasks & Acceptance

**Execution:**
- `frontend/src/styles/tokens.css` -- add the seven `--catalog-tile-ribbon-*` / `--catalog-tile-reading-bar-*` literals under `/* components */`. Hand-edit only.
- `frontend/src/pages/CatalogTiles.tsx`:
  - Add a `Ribbon` subcomponent: an `aria-hidden` inline SVG, `viewBox="0 0 16 24"`, `overflow: visible`, with an inline `--ribbon-color`. Draw three layers: the halo stroke on the open path `M0 0V24L8 18L16 24V0`, the fill polygon `0,0 16,0 16,24 8,18 0,24`, then the edge stroke on the same open path.
  - Pass `finished` and `spineColor` into `TileCover`. Wrap the `img` in a frame `span` that holds the `Ribbon` once `loaded && finished`. Add the `Ribbon` to the placeholder branch when `finished`.
  - Mark the slot `aria-hidden="true"`. Inside it, when `percent !== null`, render a track `div` with a fill `div` at `width: ${percent}%`.
  - Update the doc comments.
- `frontend/src/pages/CatalogTiles.module.css`:
  - `.box` gains `container-type: inline-size`.
  - New `.frame`, which takes `.cover`'s positioning. `.cover` becomes a block with `max-width: 100cqw; max-height: 150cqw`, keeping its hairline, radius and opacity rules.
  - `.ribbon` sits at `top: 0; right: clamp(0px, var(--catalog-tile-ribbon-inset), 100% - var(--catalog-tile-ribbon-width))`, sized by tokens. Its strokes: the halo is `--color-spine-label-strip` at `calc(var(--hairline) + 2 * var(--catalog-tile-ribbon-halo))`, and the edge is `--color-spine-edge` at `--hairline`, with `linejoin` `round` for the halo.
  - `.bar`: margin-top is the gap and height is the bar height, with `--color-accent-soft` background. `.barFill`: `--color-accent`, height 100%. No radius on either.
  - Forced colors as in Always.
- `frontend/e2e/catalog-tile-marks.spec.ts` -- turn on all 7 leaves.
- `frontend/e2e/catalog-tile-marks.spec.ts` -- matrix leaves the ATDD doesn't cover, in a second `describe` that reuses the file's helpers (`lookOf`, `marksOf`, `barPercent`, `near`), each run red-then-green where it can be:
  - (a) Loading: hold the cover request with `page.route`, check that no ribbon element is under the ribbon point and the box hasn't moved, then release the request and check the ribbon appears on the cover.
  - (b) Broken cover: a finished Book whose cover file isn't an image gets the ribbon at the box's top.
  - (c) Boundaries: route the catalog view to `percent: 0` and `percent: 100`. Expect a full `accent-soft` track with no `accent` pixel, and a full `accent` fill.
  - (d) Narrow cover: a finished Book with a 20×60 cover keeps the ribbon's left edge at or right of the cover's left edge.
- `_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md` -- tick the activation items and the Tokens follow-up.
- `README.md`:
  - On the Status line (line 8), after "(Tiles)", add that read Books carry a ribbon in their spine color and Books being read show a reading bar. Keep "42 of 44 stories done".
  - In Project docs, after the Story 8.1 ATDD checklist line, add "Story 8.2 spec" (`_bmad-output/implementation-artifacts/spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md`) and "Story 8.2 ATDD checklist" (`_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md`).

**Acceptance Criteria:**
- Given a finished Book, when its tile renders, then a 16×24 bookmark with a 6px notch hangs from its visible cover's top, 10px in from the right. It is filled with the exact spine color, edged in `spine-edge` and haloed in `spine-label-strip`, and it never sits on the empty part of the box.
- Given a Book with a non-null `percent`, when its tile renders, then a 5px bar 6px below the box fills to `percent` of the box's width with square ends. With `percent: null` the slot stays empty and the captions share one top.
- Given a finished Book being re-read, when its tile renders, then it shows both marks. Given an unread Book with no Reading, then it shows none.
- Given any tile, when a screen reader reads it, then the marks are inside `aria-hidden` subtrees, the link's text is only the caption, and its name carries the status.
- Given the dark theme, when tiles render, then the ribbon fill and halo are unchanged, the edge is dark `spine-edge`, and the bar uses dark `accent` on dark `accent-soft`.
- Given forced colors, when tiles render, then the ribbon and bar fill are `CanvasText`, the halo and track are `Canvas`, the track has a `CanvasText` outline, and the cover hairline is `CanvasText`.
- Given Story 8.1's tests, when this story lands, then they all still pass, AC-10's zero layout shift included.

### Review Findings

Code review 2026-11-13 (`bmad-code-review`, diff `357ed27..2d38a37`, 5 layers): 4 patch, 1 defer, 15 rejected.

- [x] [Review][Patch] Cover centering moved from the `img` to `.frame`, and no test checks it. Losing `.frame`'s horizontal auto margins puts every narrow cover bottom-left, and the suite stays green. Add a left/right-gap check (±1px) to the large-cover leaf, where Villette's 300×900 cover is narrower than its box [frontend/e2e/catalog-tile-marks.spec.ts:823]
- [x] [Review][Patch] The ribbon's top and height are loosely pinned. `.ribbon { top: 4px }` or `--catalog-tile-ribbon-height: 32px` (the shape letterboxed 4px down) both pass AC-1, AC-3, AC-6 and AC-7. Sample the fill 1px below the cover's top, no fill 1px above it, and the fill just above the notch apex [frontend/e2e/catalog-tile-marks.spec.ts:356]
- [x] [Review][Patch] The checklist's ticked Tokens item says "matched by `app-shell.spec.ts`", but that file compares only primitives and never reads `components.catalog-tile` [_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md:112]
- [x] [Review][Patch] `--catalog-tile-ribbon-notch` is used nowhere, and changing it does nothing because the notch is literal in the SVG. Note that next to the token [frontend/src/styles/tokens.css:187]
- [x] [Review][Defer] Spine drift: AD-6's Tiles bullet and the FR-25 map row still say "planned / not built" [ARCHITECTURE-SPINE.md AD-6] — deferred: spine drift, reconciled before the next epic. Already recorded in `deferred-work.md` and the spec's `deferred:` front matter by build-auto, so it is not added again.

**Rejected:**
- `low` A wide cover under ~26px tall lets the ribbon hang past the box's bottom into the slot. That needs an aspect ratio over ~5.7:1, which no real cover has. A fix adds clipping or sizing rules (Edge, Blind).
- `low` On covers under ~20px wide the halo, and under 16px the fill, cross the cover's left edge. Same refutation as build-auto's triage: no real cover is that narrow, and the matrix row says "where it can be" (Edge, Auditor, Blind).
- `low` The held route's `route.continue()` could reject after a failed test. This happens only on the failure path, after `release()` in `finally`, and it is test noise at worst (Edge).
- `low` The loading leaf compares the box only relative to the `li`. 8.1's AC-10 leaf already measures zero layout shift page-wide (Edge, Blind).
- `false` The ATDD leaves were weakened via `lookOf`. Every expected value and comparison is unchanged, and the sampling fixes put samples where the leaves meant them (Auditor).
- `low` An 8.1 leaf now uses `expect.poll`. It checks the same equality, fixes a recorded race, and is documented in the checklist. Reverting it brings the flake back (Auditor).
- `reject` The triage-log counts don't match its rows (7 false, not 10). The fix is an edit to the spec under review (Blind).
- `false` The `percent: 100` leaf doesn't match "re-read at last page, unfinished". Austerlitz is unfinished at 100% in that leaf, which is the boundary AC-2 needs (Blind).
- `low` Mark presence is checked by pixels only. This is deliberate (the file header), so the leaves don't depend on how the marks are drawn (Blind).
- `false` The ribbon on the placeholder isn't checked against the placeholder's art. The matrix puts it at the box's top-right on the placeholder, and the broken-cover leaf checks exactly that (Blind).
- `false` The forced-colors bar outline paints into the caption's area. It adds 1px into the caption's `space-2` top margin and touches no text (Blind).
- `reject` A Design Note still reads as an open fallback instruction. The fix is an edit to the spec under review (Blind).
- `reject` Line references in the spec and checklist are inconsistent or will go stale. The fix is an edit to the spec under review (Blind).
- `false` The deferred-work evidence path breaks the file's format. The 8.1 entry (`deferred-work.md:949`) cites bare `ARCHITECTURE-SPINE.md` the same way (Blind).
- `false` The README describes the marks while the story is in review. The README update belongs to the build commit by the pipeline's convention, and the count stays unchanged until done (Blind).

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 28 findings — high 0, medium 0, low 18, false 10, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine check: AD-6 and the FR-25 map row still say Tiles is planned and not built — spine drift, deferred (spec `deferred:` and deferred-work.md).
  - `[false]` `[reject]` Intent: the `lookOf` sampler was changed while the contract leaves were turned on — every expected value and assertion is unchanged; the fixes correct where samples land (element screenshots cut the 3px outside samples, the half-pixel tile origin, and `slice(6, -6)` ending on `box.right`, outside the box).
  - `[low]` `[patch]` Intent: an 8.1 leaf (`catalog-tiles.spec.ts`, twin names) was edited — it now polls the same exact equality after `goto` (a race: it failed once in `npm run check`, passed 15/15 alone); patched by recording it in the checklist's Green Phase.
  - `[false]` `[reject]` Intent: loading, broken-cover and narrow-cover behavior goes beyond the epic AC — each is a row of this spec's I/O matrix, consistent with "sits on the visible cover", and each has a leaf.
  - `[low]` `[reject]` Intent: the `img` hairline now appears only once loaded — the loading box keeps its own hairline and the `img` is invisible until loaded, so nothing visible changes; it keeps 8.1's zero layout shift.
  - `[false]` `[reject]` Intent: the dark bar uses dark `accent` twins — DESIGN.md → Dark theme: chrome colors take their dark twins, and the ATDD AC-6 leaf pins `#93B597` on `#2C3A2E`.
  - `[low]` `[reject]` Intent: no real high-contrast mode or screen reader — the repo's standard is emulated forced colors and Chromium's tree; manual screenshots in light, dark and forced colors were taken.
  - `[false]` `[reject]` Intent: no commit, code review or automate — by design, build-auto ends in review (AGENTS.md "Story pipeline"); Finalize commits.
  - `[low]` `[reject]` Blind: on a cover under ~26px wide the ribbon's halo paints on the empty box — no real cover is that narrow (8.1's review: 2 of 410 are only a few px under the ~148px box); a fix needs new sizing branches.
  - `[low]` `[patch]` Blind: no test with a cover taller than 2:3 — grouped with the verification-gap finding below; new leaf added.
  - `[low]` `[patch]` Blind: `max-height: 150cqw` repeats the 2:3 ratio unexplained — comment added; while loading the `img` is 0×0, so the box's border doesn't matter.
  - `[low]` `[reject]` Blind: `--catalog-tile-ribbon-notch` unused and the SVG geometry is literal — the tokens are copied from DESIGN.md character for character; the `viewBox` geometry is DESIGN.md's fixed shape.
  - `[false]` `[reject]` Blind: `ReadingBar` doesn't clamp `percent` — `invariants.py:156` keeps `0 <= currentPage <= pages`, so `percent` (`progress.py`) is always 0–100.
  - `[false]` `[reject]` Blind: the ribbon pops in ahead of a fading cover — `.cover` has no opacity transition; the ribbon and the cover appear in the same render.
  - `[low]` `[patch]` Blind: the loading leaf leaves its held route pending on failure — `release()` now also runs in `finally`.
  - `[low]` `[reject]` Blind: the two edge-shelf leaves duplicate setup — test-only duplication of a few lines; the server needs both cover files.
  - `[low]` `[patch]` Blind: exact `toBe(100)` on a half-pixel count — now within 1; the per-pixel `every(accent)` check stays.
  - `[low]` `[patch]` Blind: the 8.1 `expect.poll` change is undocumented — same fix as the Intent row (checklist note).
  - `[low]` `[patch]` Blind: the checklist reads "TDD Red Phase (current)" and Completion is stale — heading and Completion updated; open follow-ups left for `bmad-testarch-automate`.
  - `[low]` `[reject]` Blind: the Green Phase "went red" claims don't name each mutation — the loading leaf also asserts the ribbon appears after release, so it can't pass vacuously; the new large-cover leaf records its mutation.
  - `[low]` `[reject]` Blind: `lookOf`'s clip has no viewport-edge guard — the grid sits inside page padding at 1280px in every leaf; a guard adds branches for no reached case.
  - `[low]` `[patch]` Blind: `.slot`'s `display: flow-root` is unexplained — comment added.
  - `[low]` `[patch]` Verification gap: no cover larger than the box exercises the `cqw` caps — new leaf (600×300 and a finished 300×900): each `img` inside its box within 1px, bottom on the box's bottom, ribbon on the tall cover; red with `max-height: 150cqw` removed (Villette's cover 224px above its box).
  - `[low]` `[reject]` Edge: a cover under 16px wide lets the ribbon overflow its left — same as the Blind narrow-cover row.
  - `[low]` `[reject]` Edge: the matrix's "never overflows its left" fails under 16px — the row says "where it can be"; same refutation.
  - `[false]` `[reject]` Edge: `percent` outside 0–100 — same refutation as the Blind row.
  - `[low]` `[patch]` Edge: exact `toBe(100)` and the fixed slice — same fix as the Blind row; the slice's bounds come from `barRow`'s construction (6 samples = 3px each side).
  - `[low]` `[patch]` Edge: held route on failure — same fix as the Blind row.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why a frame:** an `img` can't hold children, and 8.1 sizes the `img` by abspos replaced-element rules, so nothing else knows its rectangle. A `fit-content` frame around an in-flow `img` hugs it only if the `img`'s caps don't refer to the frame. `cqw` on the box gives caps the frame doesn't take part in. Verify with a wide cover (Bleak House, 120×80), a small one (Dune, 40×60) and a tall one taller than 2:3: the `img` must stay whole inside the box, bottom-centered. If a tall cover overflows, fall back to measuring the image's natural size on `load` and giving the frame `aspect-ratio: w / h; width: min(100%, w px, 150% * w / h)`.
- **Loading:** the frame is 0×0 until the image decodes (the `img` is 0×0), so 8.1's empty-rect layout-shift rule still holds. The ribbon renders only when `loaded`.
- **SVG layers** (user units = px):

```tsx
<svg className={styles.ribbon} viewBox="0 0 16 24" aria-hidden="true" style={{ '--ribbon-color': color }}>
  <path className={styles.ribbonHalo} d="M0 0V24L8 18L16 24V0" />
  <polygon className={styles.ribbonFill} points="0,0 16,0 16,24 8,18 0,24" />
  <path className={styles.ribbonEdge} d="M0 0V24L8 18L16 24V0" />
</svg>
```

  The halo stroke straddles the outline at `1 + 2 × 1.5` = 4px wide, and the fill hides its inner half. That leaves, from the fill outward: 0.5px of edge over the fill, 0.5px of edge outside it, then 1.5px of halo. `fill: none` goes on the paths.
- **Forced-colors bar outline:** an outside `outline: var(--hairline) solid CanvasText` on the track. AC-7 needs the track's right end to be `Canvas` inside the box, so the outline can't be inset.

## Verification

**Commands:**
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-tile-marks.spec.ts e2e/catalog-tiles.spec.ts e2e/catalog-tiles-automate.spec.ts e2e/catalog-pace-calculator.spec.ts e2e/app-shell.spec.ts` -- expected: all pass.
- `npm run check` (repo root) -- expected: green (ruff, Prettier, oxlint, `tsc -b`, `check:api`, pytest, coverage, node tests, the full Playwright suite, smoke).

**Manual checks:**
- A screenshot of the six-Book `MARK_SHELF` row at 1280px in light, dark and forced colors. The ribbons sit on the covers, and the bars line up under the boxes.

## Auto Run Result

Status: in-review

**Summary.** On Catalog's Tiles, a finished Book now carries a bookmark ribbon in its exact spine color, hanging from its visible cover's top, 10px in from the right. It has a `spine-edge` line and a light `spine-label-strip` halo. A Book with a `percent` shows a 5px reading bar in the reserved slot, 6px below the box, filled to `percent` as is. A re-read shows both marks, and an unread Book shows none. Both marks are `aria-hidden`, since the status is already in the link's name. Colors come from tokens, so the dark theme works without extra rules, and forced colors get `CanvasText`/`Canvas`. A frame `span` now hugs the cover `img` (caps in `cqw` of the box), so the ribbon can hang from the visible cover. The ribbon shows only once the cover has loaded, or on the placeholder.

**Files changed.**
- `frontend/src/pages/CatalogTiles.tsx`: `Ribbon` (three-layer SVG), the cover frame, the `aria-hidden` slot with `ReadingBar`.
- `frontend/src/pages/CatalogTiles.module.css`:
  - The box is a size container. The frame and the `cqw`-capped cover are new.
  - New ribbon, bar and forced-colors rules.
  - The `img` hairline shows once it has loaded.
- `frontend/src/styles/tokens.css`: seven `--catalog-tile-ribbon-*` / `reading-bar-*` literals from DESIGN.md.
- `frontend/e2e/catalog-tile-marks.spec.ts`:
  - The 7 ATDD leaves are on, with `lookOf` sampling fixes; no assertion changed.
  - Five matrix leaves: loading, a broken cover, 0/100%, a narrow cover, and large covers.
- `frontend/e2e/catalog-tiles.spec.ts`: the 8.1 twin-name read polls after `goto` (a race).
- `_bmad-output/test-artifacts/atdd-checklist-8-2-…md`: activation ticked, Green Phase notes.
- `README.md`: the Status line, and the Story 8.2 spec and checklist links.
- `deferred-work.md`: one spine-drift entry.
- `sprint-status.yaml`: `review`.

**Review.**
- 28 findings from 5 layers: 0 high, 0 medium, 18 low, 10 false.
- 14 rows were patched, as 6 fixes: the large-cover leaf, `release()` in `finally`, the 100% tolerance, two CSS comments, and the checklist with the 8.1 note.
- 1 deferred (spine drift).
- 13 rejected, each with its reason in the triage log: false claims (`percent` is bounded by `invariants.py:156`, there is no cover fade, the sampler fixes keep every assertion), narrow covers under ~26px that don't occur, token and geometry duplication that DESIGN.md dictates, and test-only nits.

**Follow-up review recommendation:** `false`. Every patched entry was low (0 high, 0 medium patched).

**Verification.**
- `npm run check` exits 0 after the patches:
  - ruff, Prettier, oxlint, `tsc -b` and `check:api`;
  - pytest: 1573 passed, coverage gates ok (domain 100%, intents+store 98.08%);
  - node tests: 354 passed;
  - Playwright: 644 passed;
  - smoke ok.
- The spec's targeted Playwright command passed (61 tests before the patches). `catalog-tile-marks.spec.ts` passes 12 of 12 after them.
- Matrix audit: every row has a passing leaf:
  - loaded: AC-1 and AC-3;
  - loading, broken cover, 0/100% and narrow cover: the matrix leaves;
  - reading: AC-2;
  - re-read: AC-3;
  - unread: AC-4.
- Manual screenshots of the six-Book row in light, dark and forced colors show the ribbons on the covers and the bars aligned.

**Residual risks:**
- Covers under ~26px wide let the ribbon or its halo reach past the cover's left edge.
- The marks are checked in Chromium only, by pixels at DPR 2.
- The Story 8.1 twin-name leaf had a latent race, now fixed by polling.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
