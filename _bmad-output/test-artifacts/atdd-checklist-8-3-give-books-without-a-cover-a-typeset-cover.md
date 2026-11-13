---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-13'
storyId: '8.3'
storyKey: '8-3-give-books-without-a-cover-a-typeset-cover'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-83-give-books-without-a-cover-a-typeset-cover'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md'
generatedTestFiles:
  - 'frontend/e2e/catalog-typeset-covers.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 8.3)'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.catalog-tile typeset-* tokens lines 378–387; Catalog tile → Typeset cover, read / unread, Dark theme lines 718–721; Forced colors line 549; Components → Spine, read and unread)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Tiles → Covers line 294; No cover line 317; No-cover placeholder line 144)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/test-artifacts/atdd-checklist-8-2-see-what-i-ve-read-and-what-i-m-reading-on-the-tiles.md (format, boundary)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CatalogTiles.tsx and .module.css, src/components/Cover.tsx and .module.css, src/lib/catalog.ts (spineName), src/styles/tokens.css'
  - 'frontend/e2e/tile-marks.ts (lookOf, colors, locators), catalog-tile-marks.spec.ts, catalog-tiles.spec.ts (8.1 AC-5 placeholder leaf), home.ts (mainBookCard, upNextPane, sizeOf), cover.spec.ts (Book detail placeholder), fixtures.ts (startSeededServer), bookcase.ts (finished)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a read Book without a cover, when its tile renders, then the box is filled with the Book''s exact spineColor, with a 1px spine-edge border and 4px corners, and a spine-label-strip plate inset 10px from the sides and starting 34px from the top holds the title (book-title-sm at weight 400, up to 4 lines, spine-label color) and the first author (meta, one line) (UX-DR57); and no text sits straight on the Book''s color, and the ribbon from Story 8.2 hangs clear of the plate' }
  - { id: AC-2, idSource: generated, text: 'Given an unread Book without a cover, when its tile renders, then the box is spine-unread-fill with a 1.5px spine-unread-outline border, the title and author in spine-unread-text, and no plate, like an unread spine seen from the front' }
  - { id: AC-3, idSource: generated, text: 'Given a Book whose cover image fails to load, when its tile renders, then the typeset cover for its read state replaces the image' }
  - { id: AC-4, idSource: generated, text: 'Given the dark theme or forced-colors: active, when typeset covers render, then the read fill and plate are the same in both themes while spine-edge and the unread colors take their dark twins, and under forced colors the typeset cover is Canvas with a CanvasText border and CanvasText text' }
  - { id: AC-5, idSource: generated, text: 'Given the Main book card, the Up next thumbnail or Book detail, when a Book has no cover, then they keep the existing no-cover placeholder; the typeset cover applies to catalog tiles only' }
---

# ATDD Checklist: Story 8.3 Give books without a cover a typeset cover

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 8.3 has 5 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-5 in source order (registry above). The "And" line under the first criterion belongs to AC-1. `sprint-status.yaml` reads `backlog`, and 8.2 is `done`. 8.3 isn't the epic's first story, so there's no epic gate to check.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - The catalog view already carries `coverFile`, `finished` and `spineColor`, so **no backend change and no API leaf**.
  - `CatalogTiles.tsx` `TileCover` renders `<Cover coverFile={null} size="fill" />` (the no-cover placeholder: `surface-inset`, a 1.5px dashed `spine-unread-outline` border, two title bars) when `coverFile` is null or the `img` fails. 8.2's ribbon is drawn over that placeholder at the box's top.
  - `tokens.css` has none of the `typeset-*` tokens (DESIGN.md lines 378–387). They go in with this story, by hand.
  - `--color-spine-label` and `--color-spine-label-strip` have no dark twin. `--color-spine-edge` and the `spine-unread-*` colors do.
- **What "read" means:** the view's `finished`, as on the bookcase (DESIGN.md → Spine: a Main book that was never finished has an unread body). So Emma, Main at 64% and never finished, gets the **unread** typeset cover and keeps her reading bar. That's an interpretation. If Oleg wants a Book being read to count as read, AC-2's Emma assertions change.

## Generation Mode

**AI generation**, run sequentially in this session, as for 8.1 and 8.2. Recording isn't needed: Tiles already exist, and the new look is checked by pixels and computed styles. All 5 criteria are about how a tile looks in the browser (AC-5 about three other places too), so all 5 leaves are E2E.

**How the typeset cover is read.** The leaves don't pin the DOM shape (a component inside `.box`, the box's own background, SVG). `typesetOf` finds the 2:3 box by geometry, then:
- **pixels** from a screenshot at device scale 2: the corner, each border's outer device pixel, a scan across the left border, a run down it (a dashed line has gaps), the side band 5px in at 85% of the height, a point between the ribbon and the plate, and the plate itself, found by its `spine-label-strip` color down a column 13px in, then across a row 3px into it.
- **the DOM** for the text: every non-blank text node in the box, its block's rectangle, and its computed color, font family, size, weight and line height. Also every background painted inside the box.

## Test Strategy

**Seed (`TYPESET_SHELF`):** seven Books, every one 330 pages, one row at 1280×900 under Author sort, with user spine colors. Emma is the Main book, Kindred is Up next.

| Book | State | Name | Cover | Spine color | Expected tile |
|---|---|---|---|---|---|
| Good Omens, Terry Pratchett + Neil Gaiman | finished | …and 1 other, finished | none | `#6B8E23` | read typeset + ribbon, first author only |
| The Strange Case of Dr Jekyll and Mr Hyde and Other Tales of Terror and the Supernatural, Robert Louis Stevenson | finished | …, finished | none | `#B03A2E` | read typeset, title cut at 4 lines, author on one line |
| Kindred, Octavia E. Butler | unread, Up next | not read yet, Up next | none | `#7A4E8C` | unread typeset |
| Emma, Jane Austen | Main at p.212, never finished | Main book, 64% | none | `#6B8E23` | unread typeset + bar |
| Middlemarch, George Eliot | finished | finished | `covers/broken.png` (not an image) | `#B03A2E` | read typeset |
| Nostromo, Joseph Conrad | unread | not read yet | `covers/broken.png` | `#2E5A88` | unread typeset |
| Bleak House, Charles Dickens | finished | finished | `covers/wide.png`, 120×80 | `#7A4E8C` | its cover, no typeset |

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P0 | **Good Omens' box, 5px in at 85% of its height, is `#6B8E23`.** Then: a 1–2 device-pixel `spine-edge` border on all four sides, the corner pixel is the page (4px corners), and the plate starts at 34±1px and is inset 10±1px on both sides. The box's text is exactly `['Good Omens', 'Terry Pratchett']`: the title in `spine-label` 15.5px 400 `ui-serif…`, the author in `spine-label` 13px `system-ui…`. Every text block lies inside the plate. The ribbon still reads fill → edge → halo → fill, the fill shows 29px down on the ribbon's line, and the plate starts below 25.5px. The Jekyll title is 3.5–4 lines tall and its author one line, both inside the plate. | The fill, plate and text only meet in the rendered page |
| AC-2 | E2E | P1 | **Kindred's box holds `[['Kindred', #77716A], ['Octavia E. Butler', #77716A]]`.** Then: the side band is `#FDFCF9` (±2), with no purple painted. The left border is solid along its whole run, 3–4 device pixels of `spine-unread-outline`. Nothing inside paints `spine-label-strip`. Emma's box (Main, never finished) has the same unread text and fill. | The text is the first property that's new: `surface-inset` (#FAF9F6) and `spine-unread-fill` (#FDFCF9) can't be told apart by pixels |
| AC-3 | E2E | P1 | **Middlemarch's box (read, file not an image), 5px in at 85%, is `#B03A2E`.** Then: no visible `img`, the plate at 34px, and `Middlemarch`/`George Eliot` in `spine-label`. Nostromo (unread, same file) has the unread fill and text. Bleak House keeps its cover and has no text in its box. | Load failure is browser behavior |
| AC-4 | E2E | P2 | **In the dark theme, Good Omens' side band is still `#6B8E23`.** Then: the plate at 34px is still light, the text is still `spine-label`, and the edge is dark `#858A7F` with no light `spine-edge` pixel. Kindred is `#252822` (±6) with a `#70766A` outline of 3+ device pixels, `#A39E92` text and no plate pixel. Under `forcedColors: 'active'`, Good Omens and Kindred are `Canvas` with a `CanvasText` left and top border, and both texts are `CanvasText`. | Theme tokens and forced colors |
| AC-5 | E2E | P1 | **One probe: `{ mainCard: 200×300, upNext: 44×64, detail: 200×300, tile: 'typeset' }`.** The first three are the sizes of the `img` "No cover" in Home's Main book card (Emma), Up next pane (Kindred) and Good Omens' Book detail. They're read before the probe. `tile` is Good Omens' side band. | A "keep as is" criterion: one probe, so the three places that don't change are checked by the same assertion that sees the tile change. That's what makes it red today (as 8.2 AC-4) |

**Red today** (each leaf un-skipped in a throwaway copy, run with a 30 s timeout, then the copy deleted):
- **AC-1, AC-3, AC-4** fail at their first assertion: the side band shows the placeholder's `surface-inset`, not the spine color.
- **AC-2** fails at its first assertion: the box holds no text (`[]`).
- **AC-5** fails at its first assertion with only `tile` differing (`'placeholder'`). `mainCard`, `upNext` and `detail` already match, which is the guard.

No leaf failed in setup. The seed and both cover files loaded, and the failure screenshot shows one row of seven: Bleak House's wide cover, and six dashed placeholders, four of them carrying a ribbon and Emma's with a bar.

**What the leaves pin (the contract for the build):**
- **Read typeset cover (`finished: true`):**
  - Fills the whole box in the exact `spineColor` (±24), with a 1px `spine-edge` border on all four sides and 4px corners.
  - The plate is `spine-label-strip`, 10±1px from both sides, its top 34±1px from the box's top. Whatever is directly below the plate is the fill again.
  - The text is the title, then the first author (no "and N others"), both `spine-label`. The title is 15.5px, weight 400, `ui-serif…`, with at most 4 lines visible (the block's height ≤ 4.05 × line height). The author is 13px `system-ui…`, one line.
  - Every text block in the box lies inside the plate (±1px).
- **Unread typeset cover (`finished: false`):** the `spine-unread-fill` fill. A solid 1.5px `spine-unread-outline` border. The title and the first author in `spine-unread-text`. Nothing paints `spine-label-strip`, and nothing paints the spine color.
- **Failed cover:** the same as no cover, chosen by `finished`. No visible `img` is left.
- **Dark:** the read fill, plate and `spine-label` text don't change. `spine-edge` is `#858A7F`. The unread cover is `#252822` / `#70766A` / `#A39E92`.
- **Forced colors:** the fill is `Canvas`, the border `CanvasText`, all text `CanvasText`, read or unread.
- **Elsewhere:** `Cover`'s "No cover" placeholder stays at 200×300 (Main book card, Book detail) and 44×64 (Up next).

**Open for the build (not pinned):**
- **The plate's padding, height and vertical text layout.** Only its top, its side insets, and that it holds the text are pinned. The plate column is sampled 13px in, so a glyph within 3px of the plate's left edge could cut the detected plate short.
- **The unread cover's text position and fonts.** DESIGN.md says only "the title and author in `spine-unread-text`". Using the read cover's layout without the plate is the natural reading. Only the colors and the order are pinned.
- **How the clamp is drawn** (`-webkit-line-clamp`, max-height). The leaf measures the title's nearest block ancestor.
- **The text inside the box duplicates the caption.** It sits inside the `aria-hidden` box, so the link's name doesn't change, but find-in-page will see each title twice. That's DESIGN.md's design. Raise it in the review if it matters.
- **The ribbon on the typeset cover.** It's the same color as the fill, so only its edge and halo show it (the 8.2 design intent). Pinned only as fill → edge → halo → fill.

## Existing leaves this story changes (for the build)

These assert the 8.1/8.2 placeholder or the link's text, and will go red once the typeset cover lands. Update them in the build. They're superseded, not regressions:
- `catalog-tiles.spec.ts:407` (8.1 AC-5) asserts the no-cover placeholder in Tiles for a Book without a cover and a failed cover. Rewrite it to the typeset cover, or narrow it to the box size only.
- Not affected: `catalog-tiles.spec.ts:357` and `catalog-tiles-automate.spec.ts:319` read `surface-inset` on a cover that is still *loading* (Dune, with a held cover), which stays as in 8.1.
- `catalog-tile-marks.spec.ts:347` (8.2 AC-5) uses `toHaveText('EmmaJane Austen')` on Emma's link. Emma has no cover, so the typeset text inside the box joins the link's text content.
- `catalog-tile-marks.spec.ts:223` (8.2 AC-2) takes the first leaf text element in each link as the caption title. On a no-cover tile that's now the typeset title inside the box, so the title tops won't line up. Scope it to the caption, for example the last two text elements or ones outside the 2:3 box.
- `catalog-tile-marks.spec.ts` Good Omens / Middlemarch ribbon checks and `catalog-tile-marks-automate.spec.ts:298`: the ribbon now hangs over a filled box. `inOrder([fill, edge, strip])` should still pass. Re-run them.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-1 a light spine color** (for example the pale yellow `#F2D35B`): the plate and edge keep the text legible, and the edge still shows against the page.
- [x] **E2E, AC-1 a Book with no author:** only the title on the plate. The store refuses a Book without authors (`invariants.py:88`), so the leaf `[P3] AC-1 a view with an empty first author puts only the title on the plate` (automate describe in `catalog-typeset-covers.spec.ts`) forces `firstAuthor: ''` into the catalog view with `page.route`. It was red against a build that rendered an empty author line.
- [ ] **E2E, AC-1/AC-2 user text spacing or a 200% zoom:** the plate grows and the text stays inside it, within the box.
- [ ] **E2E, AC-1 the color changes from Book detail** (Change color): back on Tiles, the typeset fill follows.
- [ ] **E2E, AC-1/AC-2 finishing a Book** moves its tile from the unread to the read typeset cover after the view refetch.
- [ ] **E2E, AC-3 a cover request that fails at the network** (`route.abort()`), not only a file that isn't an image.
- [x] **E2E, AC-3 the loading state** (added in the build, `catalog-typeset-covers.spec.ts` automate describe, red-then-green against a build that typesets while loading): while a cover is loading the box is the flat loading fill (8.1), not a typeset cover, and the box doesn't move when it loads or fails.
- [ ] **E2E, AC-3 removing a cover** from Book detail turns the tile into its typeset cover.
- [ ] **E2E, AC-4 axe on Tiles** in both themes with typeset covers on screen (extend `catalog-pace-calculator.spec.ts`'s Tiles pass). Contrast: `spine-label` on the plate and `spine-unread-text` on `spine-unread-fill` are DESIGN.md's checked pairs.
- [ ] **E2E, AC-4 the highlight and focus rings** around a typeset box (after an add with no cover).
- [ ] **E2E, AC-5 the empty Main book card's suggestion thumbnail** keeps the placeholder too.
- [x] **Tokens:** `components.catalog-tile.typeset-*` copied into `tokens.css` by hand (not compared by `app-shell.spec.ts`).

## TDD Red Phase

5 skipped leaves in `frontend/e2e/catalog-typeset-covers.spec.ts`, inside the `Story 8.3 Give books without a cover a typeset cover (ATDD)` describe. Each is a `test.skip(` carrying exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `catalog-typeset-covers.spec.ts:379` a read Book without a cover gets its spine color with a paper plate holding the title and the first author, clear of the ribbon | P0 |
| AC-2 | `catalog-typeset-covers.spec.ts:441` an unread Book without a cover gets the unread typeset cover: unread fill, solid outline, unread text, no plate | P1 |
| AC-3 | `catalog-typeset-covers.spec.ts:482` a cover image that fails to load is replaced by the typeset cover for its read state | P1 |
| AC-4 | `catalog-typeset-covers.spec.ts:521` dark theme and forced colors | P2 |
| AC-5 | `catalog-typeset-covers.spec.ts:568` the Main book card, the Up next thumbnail and Book detail keep the no-cover placeholder; the typeset cover is for tiles only | P1 |

**Skipped as committed** (run in this session): `TZ=Europe/Madrid npx playwright test e2e/catalog-typeset-covers.spec.ts` gives 5 skipped. Prettier, `tsc -b` and oxlint are clean.

## Data Factories, Fixtures and Mocks

- **No new shared factory or fixture.** The leaves use `startSeededServer` with `stopAndRemove`, `finished()`, and from `tile-marks.ts`: `solidPng`, `storeTiles`, `tileItem`, `lookOf`, `near`, `inOrder`, `MARGIN`, and the colors.
- **Local to the spec:** `TYPESET_SHELF`, `typesetServer`, `boxFacts` (the text and backgrounds in the box), `pixelsAt` (samples points from a tile screenshot, as `lookOf` does), `typesetOf` (the pixel samples and the plate), `inside`, `count`, `forcedPalette`.
- **Mocks:** none. The broken cover is a real file that isn't an image.
- **No `data-testid`, no class names:** tiles by role and name, the box by geometry, the cover by pixels and computed styles, and the placeholder elsewhere by its `img` role "No cover".

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: change `test.skip(` to `test(`, watch it fail, implement, watch it pass. Run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-typeset-covers.spec.ts`.

### Tokens
- [x] Copy `components.catalog-tile`'s `typeset-*` tokens into `tokens.css` (DESIGN.md 378–387).

### The read typeset cover (AC-1)
- [x] In `CatalogTiles.tsx`, replace `<Cover … size="fill" />` with a typeset cover when `coverFile` is null or the cover failed: the spine color fill, a 1px `spine-edge` border, 4px corners, a `spine-label-strip` plate 10px from the sides and 34px from the top, the title (`book-title-sm` 400, clamped at 4 lines) and `firstAuthor` (`meta`, one line, ellipsis), both in `spine-label`. Keep it inside the `aria-hidden` box, with the ribbon drawn over it.
- [x] Activate AC-1.

### The unread typeset cover and failures (AC-2, AC-3)
- [x] When `!book.finished`: `spine-unread-fill`, a 1.5px solid `spine-unread-outline` border, the text in `spine-unread-text`, no plate.
- [x] The failed-cover path (`state === 'failed'`) uses the same component.
- [x] Activate AC-2 and AC-3.

### Dark and forced colors (AC-4)
- [x] Dark: nothing to do if the colors come from tokens.
- [x] `@media (forced-colors: active)`: the typeset box gets a `Canvas` background, a `CanvasText` border and `CanvasText` text.
- [x] Activate AC-4.

### Tiles only (AC-5)
- [x] Leave `Cover.tsx`'s placeholder for the Main book card, Up next and Book detail. If `size="fill"` is no longer used, remove it.
- [x] Activate AC-5.

### Superseded leaves
- [x] Update the 8.1/8.2 leaves listed under "Existing leaves this story changes".

## Green Phase

- **All 5 ATDD leaves on and green**, unchanged, plus 2 automate leaves in a second `describe` of the same file: the loading state, and an empty first author forced into the view with `page.route`. 7 passed.
- **The unread 1.5px outline:** Chromium floors border widths to whole CSS pixels, even at device scale 2 (`border: 1.5px` computes to `1px`), so AC-2/AC-4's 3-device-pixel outline failed with a plain border. The unread cover draws it as the 1px border plus a 0.5px inset `box-shadow` in the same color. Under forced colors the shadow drops and the 1px `CanvasText` border stays. The plate offset subtracts the 1px border for both covers.
- **Superseded leaves changed** (assert the old placeholder or the link's text; the typeset text in the `aria-hidden` box now duplicates the caption):
  - `catalog-tiles.spec.ts` AC-5: rewritten to the typeset cover (no `img`, box at a covered tile's size, the title in the box), same priority, renamed "typeset cover".
  - `catalog-tile-marks.spec.ts` AC-2: the caption title is the second-to-last leaf text element.
  - `catalog-tile-marks.spec.ts` AC-5: Emma's link text is `'EmmaJane AustenEmmaJane Austen'` (typeset, then caption). The accessible-name checks are unchanged.
  - **Not listed in the build spec, proven superseded by a run** (strict-mode duplicates, or the unread outline's inset shadow):
    - `catalog-tiles.spec.ts` AC-3: Good Omens' author and Tufte's title take `.last()` (the caption's).
    - `catalog-tiles-automate.spec.ts` AC-9: the caption clicks take `.last()`.
    - `catalog-tiles-automate.spec.ts` AC-7: the "ring faded" check ignores inset shadows (the ring is never inset; Swing Time's unread typeset cover carries one).
  - Comments that said "placeholder" for Tiles now say "typeset cover" (`catalog-tile-marks.spec.ts`, `catalog-tile-marks-automate.spec.ts`, `tile-marks.ts`). The ribbon-over-cover checks passed unchanged.
- `Cover`'s `fill` size is removed; `main` and `thumb` are unchanged, and `cover.spec.ts`, `home.spec.ts`, `up-next.spec.ts` stay green.

## Completion

- **Phase:** green. The 5 leaves in `frontend/e2e/catalog-typeset-covers.spec.ts` (each confirmed red at its first assertion before the build) now pass, with 2 automate leaves beside them (the loading state, and the route-forced empty first author). 7 passed.
- **Checklist:** this file. **Story key:** `8-3-give-books-without-a-cover-a-typeset-cover`. **Story:** `epics.md` Story 8.3.
- **Assumption to confirm:** "read" = `finished` (Emma, Main and never finished, gets the unread typeset cover).
- **Next:** `bmad-build-auto` for Story 8.3, then `bmad-code-review` in a new session, then `bmad-testarch-automate`.
