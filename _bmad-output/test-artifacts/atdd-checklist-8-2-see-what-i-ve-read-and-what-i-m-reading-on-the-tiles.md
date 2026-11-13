---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-13'
storyId: '8.2'
storyKey: '8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-82-see-what-ive-read-and-what-im-reading-on-the-tiles'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-tile-marks.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 8.2; Story 8.3 for the boundary)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.catalog-tile ribbon and reading-bar tokens, Catalog tile → Finished ribbon, Reading bar, Dark theme; Forced colors line 549)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Tiles → Name, Status marks)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md (format, boundary)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/models.py (ShelfBook.finished, percent, spine_color, cover_file), backend/tests/builder.py (spineColorUser)'
  - 'frontend/src/pages/CatalogTiles.tsx and .module.css, src/styles/tokens.css, src/lib/catalog.ts (status strings)'
  - 'frontend/e2e/catalog-tiles.spec.ts, bookcase.ts (finished), book-states.spec.ts (reading shapes, status strings), fixtures.ts (startSeededServer), home.ts (stopAndRemove), intents.ts (COVER_PNG), catalog-empty.spec.ts (catalog view route)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Book whose catalog view has finished: true, when its tile renders, then a bookmark ribbon 16×24px with a 6px V-notch hangs from the visible cover''s top edge, 10px in from its right edge, filled with the Book''s exact spineColor, with a 1px spine-edge line on its sides and notch and a 1.5px spine-label-strip halo outside that line, and no glyph or text on it (UX-DR56); and it sits on the visible cover, not on the empty part of the box' }
  - { id: AC-2, idSource: generated, text: 'Given a Book whose catalog view has a non-null percent, when its tile renders, then a 5px reading bar sits in the reserved slot 6px below the box, the box''s width, accent-soft track and accent fill to percent, square ends; it is never recomputed from currentPage and pages (AR24); and a Book with percent: null shows no bar, and the slot stays empty so captions still line up across the row' }
  - { id: AC-3, idSource: generated, text: 'Given a finished Book being re-read, when its tile renders, then it shows both the ribbon and the bar' }
  - { id: AC-4, idSource: generated, text: 'Given an unread Book with no Reading, when its tile renders, then it has no mark' }
  - { id: AC-5, idSource: generated, text: 'Given any tile, when a screen reader reads it, then the ribbon and the bar are aria-hidden, and the status is in the link''s name from Story 8.1 ("finished", "Main book, 64%", "finished, waiting for you, page 40"), so status never depends on color or shape alone' }
  - { id: AC-6, idSource: generated, text: 'Given the dark theme, when tiles render, then the ribbon fill, its halo and the bar keep their meaning; only spine-edge and chrome colors take their dark twins' }
  - { id: AC-7, idSource: generated, text: 'Given forced-colors: active, when tiles render, then the ribbon and the bar''s fill use forced-color-adjust: none with CanvasText, the bar''s track becomes Canvas with a CanvasText outline, the ribbon halo becomes Canvas, and the cover hairline becomes CanvasText' }
---

# ATDD Checklist: Story 8.2 See what I've read and what I'm reading on the tiles

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 8.2 has 7 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-7 in source order (registry above). `sprint-status.yaml` reads `backlog`, and 8.1 is `done`. 8.2 isn't the epic's first story, so there's no epic gate to check.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `ShelfBook` already carries `finished`, `percent` (floor, AD-6), `spineColor` and `coverFile`, so **no backend change and no API leaf**.
  - `CatalogTiles.tsx` renders each tile as a link holding an `aria-hidden` cover box (`.box`), an empty `.slot` (11px, `--catalog-tile-reading-bar-slot`) and the caption. The `img` is sized to the cover's own shape at the box's bottom (`max-width/height: 100%`, not scaled up), so its rectangle *is* the visible cover.
  - The link name already carries the status (`spineNames`), e.g. "Main book, 64%", "finished, waiting for you, page 40".
  - `tokens.css` has `--catalog-tile-cover-min-width` and `--catalog-tile-reading-bar-slot` only. The ribbon and bar tokens (DESIGN.md lines 367–377) go in with this story, character for character (`app-shell.spec.ts` compares them).
  - `--color-spine-label-strip` has no dark twin (light in both themes). `--color-spine-edge`, `--color-accent` and `--color-accent-soft` do.
- **Boundary with 8.3:** 8.2 owns the ribbon and the bar. The no-cover placeholder stays as in 8.1. A finished Book without a cover gets the ribbon on the placeholder's top, so the box's top. 8.3's typeset plate must clear that ribbon.

## Generation Mode

**AI generation**, run sequentially in this session as for 8.1. The marks don't exist yet, so there's nothing to record. All 7 criteria are about how a tile looks or reads in the browser, so all 7 leaves are E2E.

**How marks are found.** The leaves don't pin how the build draws the ribbon (SVG, `clip-path`, borders, pseudo-elements). They screenshot each tile at device scale 2, decode it in the page with a canvas, and sample the pixels where DESIGN.md puts the ribbon and the bar. Distances are measured from the visible cover's rectangle (the loaded `img`, else the 2:3 box) and from the box. AC-5 is the only leaf that looks at the DOM, by geometry, under the ribbon and bar points.

## Test Strategy

**Seed (`MARK_SHELF`):** six Books, every one 330 pages, one row at 1280×900 under Author sort, with user spine colors so no cover decides them.

| Order | Book | State | Status in its name | Cover | Spine color | Marks |
|---|---|---|---|---|---|---|
| 1 | Bleak House, Charles Dickens | finished | finished | `covers/wide.png`, 120×80, rgb(30, 90, 120), drawn on a canvas | `#B03A2E` | ribbon |
| 2 | Dune, Frank Herbert | finished, re-read paused at p.40 | finished, waiting for you, page 40 | `COVER_PNG` 40×60 | `#2E5A88` | ribbon + bar 12% |
| 3 | Emma, Jane Austen | Main at p.212 | Main book, 64% | none | `#6B8E23` | bar 64% |
| 4 | Kindred, Octavia E. Butler | unread, no Reading | not read yet | none | `#7A4E8C` | none |
| 5 | Good Omens, Terry Pratchett | finished | finished | none | `#6B8E23` | ribbon (on the placeholder) |
| 6 | Austerlitz, W. G. Sebald | paused at p.120 | waiting for you, page 120 | none | `#2E5A88` | bar 36% |

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P0 | **9px below Bleak House's visible (wide, low-sitting) cover top, 18px in from its right, the pixel is `#B03A2E`.** Then the cover starts > 40px below the box top. The same x at the box's top is not red (not on the empty box). The notch point (1px above the lower end) shows the cover. A rightward scan reads fill → `spine-edge` → `spine-label-strip` → cover. The link's text is only the caption. Good Omens (no cover) has its olive ribbon at the box's top. | Shape, color and placement only meet in the rendered page |
| AC-2 | E2E | P0 | **With the catalog view routed to say Emma's `percent` is 25 (her Reading says 64%), the bar's `accent` run is 24–26% of the box's width.** Then the bar starts at the box's left and ends at its right, `accent` then `accent-soft`, nothing 3px above or 2px below the slot, square corner pixels. Austerlitz's bar is 36%. Kindred (`percent: null`) has no bar and an empty slot, and the six titles share one top. | "Never recomputed" is only provable by giving the page a `percent` that disagrees with the pages. AR24 |
| AC-3 | E2E | P1 | **Dune's marks are `{ ribbon: true, bar: true }`.** Then its bar is 12% and its ribbon scan reads fill → edge → halo → its red-orange cover. | Both marks on one tile |
| AC-4 | E2E | P1 | **The six tiles' marks equal the table above, Kindred `{ ribbon: false, bar: false }`.** Then Kindred's slot row is all page color. | A negative criterion: one probe across every tile so Kindred's "no mark" is told apart by the same check that sees the others' marks. That's what makes it red today (see below) |
| AC-5 | E2E | P1 | **Every element inside Emma's link under her bar's point (smaller than 11px one way) is in an `aria-hidden` subtree.** Then the same for Dune's bar and ribbon, and Bleak House's ribbon. All six links are named with their status, and Dune's and Emma's links hold only caption text. | The accessibility tree and the drawn marks only meet in the page |
| AC-6 | E2E | P2 | **In the dark theme, Bleak House's ribbon is still `#B03A2E`.** Then the scan reads fill → dark `spine-edge` (#858A7F) → the same light halo → cover, with no light `spine-edge` pixel. Emma's bar is 64% in dark `accent` on dark `accent-soft`. | Theme tokens |
| AC-7 | E2E | P2 | **Under `forcedColors: 'active'`, Bleak House's ribbon is `CanvasText`** (read from a probe element). Then the scan reads `CanvasText` → `Canvas` (halo) → cover. Emma's bar is 64% `CanvasText` on a `Canvas` track, a `CanvasText` line sits on the track's top edge, and the cover hairline is `CanvasText` (8.1 already). | Forced colors are browser behavior. DESIGN.md line 549 |

**Red today** (each leaf un-skipped in a throwaway copy and run, 30 s timeout, copy deleted):
- **AC-1, AC-6, AC-7** fail at their first assertion: the ribbon point shows the cover's color, not the spine color or `CanvasText`.
- **AC-2** fails at its first assertion: no `accent`/`accent-soft` pixel on the bar row (`-1`).
- **AC-3** fails at its first assertion: Dune's marks are `{ ribbon: false, bar: false }`.
- **AC-4** fails at its first assertion: all six tiles read `{ ribbon: false, bar: false }`. Kindred's row already matches, and the five marked rows don't. That's the guard that makes a "no mark" criterion red.
- **AC-5** fails at its first assertion: under Emma's bar point there's the empty `.slot`, which isn't `aria-hidden` (`hidden: false`).

No leaf failed in setup. The seed, the two cover files and the route ran cleanly, and the screenshot shows one row of six with Bleak House's wide cover low in its box.

**What the leaves pin (the contract for the build):**
- **Ribbon:** at device scale 2, the pixel 9px below the visible cover's top and `10 + 8`px in from its right is the Book's `spineColor` (±24 RGB distance). The visible cover is the loaded `img`'s rectangle, or the box when there's no `img`. 1px above its lower end on the center line is *not* the fill (the notch). Rightward from the center at that height, the fill, a `spine-edge` pixel, a `spine-label-strip` pixel and then the cover appear in that order. No text inside the link besides the caption.
- **Bar:** on the row `box.bottom + 6 + 2.5`, `accent` pixels make up `percent`% of the box's width (±1.5), starting at the box's left, `accent-soft` to its right edge. Nothing in `accent`/`accent-soft` 3px outside either end, 3px below the box or 2px below the bar. The corner device pixels are the fill and the track (square ends).
- **`percent` only:** the bar follows the view's `percent` even when it disagrees with `currentPage`/`pages`.
- **Hidden:** whatever element draws the ribbon or the bar is inside an `aria-hidden="true"` subtree.
- **Dark:** ribbon fill and halo unchanged, `spine-edge` → `#858A7F`, bar → `#93B597` on `#2C3A2E`.
- **Forced colors:** ribbon fill and bar fill `CanvasText`, halo and track `Canvas`, a `CanvasText` line on the track's top edge, cover hairline `CanvasText`.

**Open for the build (not pinned):**
- **The ribbon's outer box.** Whether the 1px edge and the 1.5px halo sit inside or outside 16×24 isn't pinned. The scan only needs them in order, within 8px right of the center.
- **The halo across the top.** DESIGN.md puts the edge "on its sides and notch". The leaves don't sample the top edge.
- **A cover narrower than the ribbon plus its inset.** `COVER_PNG` is 40px wide, so Dune's ribbon starts 14px in from the cover's left. A cover under 26px wide would push the ribbon off its left side. Not pinned. Clamping is the build's call.
- **Small covers aren't scaled up.** That's 8.1's behavior (Dune's 40×60 cover shows at 40×60 in a ~150px box), not 8.2's. The ribbon follows the visible cover either way. Raise it in the review if it looks wrong on Oleg's real covers.
- **The ribbon on the placeholder.** It's pinned at the box's top (Good Omens) until 8.3 replaces the placeholder.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-1 ribbon after a cover change:** editing a finished Book's cover to a different shape moves the ribbon with the visible cover.
- [x] **E2E, AC-1 cover that fails to load:** a finished Book with a broken cover file gets the ribbon at the placeholder's top (8.1's Kindred-style broken file).
- [ ] **E2E, AC-1 notch depth and width:** sample 16×24 and the 6px notch more finely (left leg, notch apex at `top + 18`).
- [ ] **E2E, AC-2 the bar follows a page update:** after Update page on Home, the Catalog tile's bar grows (view refetch), with no recompute in the client.
- [x] **E2E, AC-2 the boundaries:** `percent: 0` shows a full track and no fill. `percent: 100` (re-read at the last page, unfinished) shows a full fill.
- [ ] **E2E, AC-2 an Up next Book paused at a page:** "Up next, paused at page N" also shows its bar (unfinished Reading).
- [ ] **E2E, AC-3 a Main re-read:** "finished, re-reading, 12%" shows both marks, as the paused re-read does.
- [ ] **E2E, AC-4 Up next, never started, and Side read without a Reading:** no mark (EXPERIENCE.md → Status marks: those states are only in the name).
- [ ] **E2E, AC-5 axe on Tiles** in both themes with marks on screen (extend `catalog-pace-calculator.spec.ts`'s Tiles pass).
- [ ] **E2E, AC-6/AC-7 the highlight and focus rings** still sit around the box with the ribbon on it, and the ribbon isn't clipped by the ring.
- [x] **Tokens:** `components.catalog-tile.ribbon-*` and `reading-bar-*` copied into `tokens.css` by hand. No test matches them: `app-shell.spec.ts` compares only DESIGN.md's primitives (colors, typography, rounded, spacing). The AC-1 leaf pins the ribbon's top and its depth to the notch's apex by pixels instead (code review of Story 8.2).

## TDD Red Phase

7 skipped leaves in `frontend/e2e/catalog-tile-marks.spec.ts`, inside the `Story 8.2 See what I've read and what I'm reading on the tiles (ATDD)` describe, each a `test.skip(` carrying exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `catalog-tile-marks.spec.ts:313` a finished Book's tile carries a ribbon in its spine color, hanging from the visible cover's top | P0 |
| AC-2 | `catalog-tile-marks.spec.ts:347` a Book with a percent shows a reading bar filled to that percent, never recomputed, and a null percent leaves the slot empty | P0 |
| AC-3 | `catalog-tile-marks.spec.ts:406` a finished Book being re-read shows both the ribbon and the bar | P1 |
| AC-4 | `catalog-tile-marks.spec.ts:426` an unread Book with no Reading has no mark, while the others carry theirs | P1 |
| AC-5 | `catalog-tile-marks.spec.ts:461` the ribbon and the bar are hidden from screen readers, and the status is in the link name | P1 |
| AC-6 | `catalog-tile-marks.spec.ts:519` in the dark theme the ribbon fill, its halo and the bar keep their meaning; spine-edge and chrome take their dark twins | P2 |
| AC-7 | `catalog-tile-marks.spec.ts:547` under forced colors the ribbon and the bar draw in CanvasText and Canvas | P2 |

**Skipped as committed** (run in this session): `TZ=Europe/Madrid npx playwright test e2e/catalog-tile-marks.spec.ts` gives 7 skipped. Prettier, `tsc -b` and oxlint are clean.

## Green Phase

All 7 leaves are on and pass. Three sampling fixes in `lookOf` were needed. They don't change any assertion:
- **Screenshot past the tile.** An element screenshot stops at the `li`, which is exactly the box's width. That means the "3px outside the box" samples clamped onto the bar's own edge, adding about 2% to every `barPercent`. `lookOf` now screenshots the page with an 8px margin around the tile.
- **Whole-pixel origin.** At 1280px the row sits at y 282.5, and Chromium paints it on the whole pixel it rounds to. Samples now map from the rounded tile origin, and the clip is on whole CSS pixels.
- **The half-open box range.** `barRow` runs from `box.left - 3` to `box.right + 3` inclusive, so the in-box samples are `slice(6, -7)`, not `slice(6, -6)`. The old last sample sat on `box.right`, outside the box.

**8.1 AC-10 regression caught and fixed.** The new frame around the `img` made 8.1's zero-layout-shift leaf fail under load, at 0.02–0.08 in 5 of 8 runs. Before load, the `img`'s 1px hairline made the frame 2×2, and Chromium counts a non-empty rect that grows as a shift. The hairline now applies only once the cover has loaded (`.coverLoaded`), so the frame is 0×0 until then. That passed 12 of 12 runs with 4 workers.

Five spec-matrix leaves were added in a second describe:
- no ribbon while the cover loads
- a broken cover
- `percent` 0 and 100
- a cover 20px wide
- a large wide cover (600×300) and a large cover taller than 2:3 (300×900), each whole inside its box and bottom-aligned

Each one went red against a mutated build before going green. The large-cover leaf failed with `max-height: 150cqw` removed.

**Story 8.1 test touched:** in `frontend/e2e/catalog-tiles.spec.ts`, the twin-name read right after `goto` is now an `expect.poll`. That fixes a race, unrelated to the marks, where the grid hadn't rendered yet. The assertion is the same.

**Follow-ups:** the unticked green-phase follow-ups above are left for `bmad-testarch-automate`.

## Data Factories, Fixtures and Mocks

- **No new shared factory or fixture.** The leaves use `startSeededServer` with `stopAndRemove`, `COVER_PNG` and `finished()`.
- **Local to the spec:** `MARK_SHELF`, `solidPng` (a flat PNG drawn on a canvas), `markServer`, `storeTiles`, `tiles`, `tileItem`, `coversLoaded`, `lookOf` (screenshots one tile and samples the ribbon and bar points), `near`/`inOrder`/`barPercent`/`marksOf` (color comparisons).
- **Mocks:** AC-2 routes `**/api/views/catalog` and rewrites Emma's `percent` to 25. Everything else runs against the real server.
- **No `data-testid`, no class names:** tiles by role and name, the box by geometry, the marks by pixels.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: change `test.skip(` to `test(`, watch it fail, implement, watch it pass. Run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-tile-marks.spec.ts`.

### Tokens
- [x] Copy `components.catalog-tile`'s `ribbon-*` and `reading-bar-*` tokens into `tokens.css` (DESIGN.md 367–377).

### The reading bar (AC-2, AC-4)
- [x] In `CatalogTiles.tsx`, render an `aria-hidden` bar inside `.slot` when `book.percent !== null`: 6px below the box, 5px tall, `accent-soft` track, `accent` fill to `percent`%, square ends. Never derive it from `currentPage`/`pages`.
- [x] Activate AC-2.

### The ribbon (AC-1, AC-3, AC-4)
- [x] Render the ribbon when `book.finished`, positioned on the visible cover: the loaded `img`'s top and right, or the box for the placeholder. The `img` is sized to its own shape, so a wrapper hugging the `img` works. Fill `spineColor`, a 1px `spine-edge` line on its sides and notch, a 1.5px `spine-label-strip` halo outside it. No text.
- [x] Activate AC-1, then AC-3 and AC-4.

### Accessibility, dark, forced colors (AC-5, AC-6, AC-7)
- [x] Keep the ribbon inside the `aria-hidden` box and mark the bar (or the slot) `aria-hidden`.
- [x] Dark: nothing to do if the colors come from tokens. `spine-label-strip` has no dark twin.
- [x] `@media (forced-colors: active)`: `forced-color-adjust: none` on the ribbon and the bar fill, with `CanvasText`. Track `Canvas` with a `CanvasText` outline, halo `Canvas`.
- [x] Activate AC-5, AC-6 and AC-7.

## Completion

- **Phase:** green. All 7 ATDD leaves in `frontend/e2e/catalog-tile-marks.spec.ts` are on and pass, along with 5 spec-matrix leaves.
- **Checklist:** this file. **Story key:** `8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles`. **Story:** `epics.md` Story 8.2. **Spec:** `_bmad-output/implementation-artifacts/spec-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md`.
- **Next:** `bmad-code-review`, then `bmad-testarch-automate` for the unticked follow-ups.
