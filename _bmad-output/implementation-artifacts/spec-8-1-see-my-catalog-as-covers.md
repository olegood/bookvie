---
title: 'Story 8.1: See my catalog as covers'
type: 'feature'
created: '2026-11-13'
baseline_revision: '91e7cbaf4a1fa61630750194ad064178b4983ee0'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, AD-15, Structural Seed, Capability map FR-25, Deferred → Cover thumbnails), reconciled before the next epic: the spine still calls the Tiles view planned and not built, writes the cover URL as `/media/covers/<coverFile>` although `coverFile` is the stored `covers/<name>` served at `/media/<coverFile>`, lists only Bookcase · List for `lib/catalogView` in the Seed, omits `pages/CatalogTiles`, and doesn't record that Epic 8's cover speed check passed.
    evidence: |-
      ARCHITECTURE-SPINE.md lines 102 (AD-6 "Epic 8, planned"; "/media/covers/<coverFile>"), 382 (Seed catalogView "Bookcase · List"), 395-396 (FR-4/FR-25 map rows, "not built"), 415 (Deferred cover thumbnails "Revisit only if Epic 8's check fails"). Code: backend/bookvie/views/models.py ShelfBook.cover_file, frontend/src/pages/CatalogTiles.tsx (coverSrc → /media/<coverFile>), frontend/src/lib/catalogView.ts. AC-10 measured median 58 ms, zero layout shift.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
  - summary: >-
      Every tile fails axe's label-content-name-mismatch (WCAG 2.5.3, Label in Name): the visible caption "Dune" / "Frank Herbert" isn't one word run of the spine-name label "Dune by Frank Herbert, not read yet". DESIGN.md's caption and EXPERIENCE.md's name can't both stay as written and pass; needs a design decision (show "by" in the caption, change the caption's text, or accept the finding).
    evidence: |-
      frontend/e2e/catalog-pace-calculator.spec.ts disables the rule for the Tiles pass and runs it on everything outside the tile links in a second pass; frontend/src/pages/CatalogTiles.tsx caption. The intent fixes both the name (spine name) and the caption (title, first author), so the change can't settle it alone.
    location: >-
      frontend/src/pages/CatalogTiles.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Catalog shows Books only as spines or table rows, so Oleg can't find a Book by its cover (FR-25, UX-DR54, UX-DR55, UX-DR58).

**Approach:** The catalog view's `ShelfBook` gains `coverFile`. The Catalog view toggle gains a third option, **Tiles**, remembered like the other two. Tiles render a CSS grid of one-link tiles from the same `sorted`, `shown`, `noMatch`, `highlightId` and `focusTargets` that `CatalogPage` already passes to the bookcase and the List. Each tile has a fixed 2:3 cover box (lazy cover image at its bottom, or the existing no-cover placeholder), an empty 11px reading-bar slot, and a one-line title and first author. The link is named by `spineNames`.

## Boundaries & Constraints

**Always:**
- `coverFile` is the stored value (`covers/<name>`) or `null`, as `HomeMainBook` and `BookDetailView` send it. Add it to the Python model first, then run `npm --prefix frontend run api:gen`. `hasCover` stays.
- Tiles read the same `sorted` array and `shown` set as the other views. Names come from `spineNames(books)` over every Book, not only the shown ones.
- The cover box never changes size: 2:3 at column width, `box-sizing: border-box`, borders inside it.
- Each tile is one link and one Tab stop. The image has `alt=""`. The cover box is `aria-hidden`, and the link's `aria-label` carries the name.
- The focus ring and the highlight ring go on the cover box, not the link or the visible cover.
- Use the tokens in `tokens.css`. Add only the two literal dimensions DESIGN.md's `components.catalog-tile` gives that have no primitive, under `/* components */`.
- Forced colors: the cover hairline and the loading box's border become `CanvasText`.
- The ATDD leaves are the contract. Turn them on and don't weaken them.

**Never:**
- No ribbon, no reading bar, no typeset cover. Those are Stories 8.2 and 8.3. The slot stays empty.
- No thumbnails, no virtual rows, no new backend endpoint, no change to export or restore.
- No popover or buttons on a tile. No shadow, crop, filter or dimming on covers.
- Don't edit the architecture spine. Spine drift is deferred.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cover loading | `coverFile` set, image not arrived | The box shows a `surface-inset` fill and a 1px `line` border; the image is invisible | — |
| Cover loaded | Image decoded | Fill and border go. The image keeps its own shape (max 100% each way), sits at the bottom center, and has 4px corners and a 1px `line` border | — |
| No cover | `coverFile` null | No `img`. `Cover`'s placeholder fills the box | — |
| Broken cover | The file isn't an image | The `img` is removed on `error` and the placeholder shows | No broken-image icon |
| Stored `tiles` | `localStorage` holds `tiles` | Catalog opens in Tiles | Junk → Bookcase; storage that throws → Bookcase, and a switch still works for the visit |
| Nothing shown | Search or filters match none | The `noMatch` line, and the list is `hidden` | — |

</intent-contract>

## Code Map

- `backend/bookvie/views/models.py:24` -- `ShelfBook`. Add `cover_file: str | None` next to `has_cover` (line 40), with a docstring. Mirror `HomeMainBook.cover_file` (line 68).
- `backend/bookvie/views/shelf.py:50` -- `_shelf_book`. Set `cover_file=book.cover_file` next to `has_cover` (line 67).
- `backend/tests/test_bookcase_view.py:270` -- AC-1 leaf. Delete `@pytest.mark.skip(reason=RED_8_1)` and the `RED_8_1` constant, and drop `import pytest` if nothing else uses it.
- `frontend/src/api/generated/schema.d.ts` -- regenerated only with `api:gen`. Never formatted.
- `frontend/src/lib/catalogView.ts` -- `CatalogViewChoice`, `CATALOG_VIEWS`, `isCatalogView`. Add `tiles`.
- `frontend/src/lib/catalogView.test.ts:47` -- AC-11 leaf, `it.skip` → `it`.
- `frontend/src/components/ViewToggle.tsx` -- `LABELS` gains `tiles: 'Tiles'`. Update the doc comment to Bookcase · List · Tiles.
- `frontend/src/lib/catalog.ts:180` -- `bookcaseName(total)` is the pattern ("Bookcase, N books"). Add `tilesName(total)` → "Tiles, N book(s)" next to it.
- `frontend/src/pages/CatalogPage.tsx:318-343` -- the view switch. Render `CatalogTiles` for `'tiles'` with the same props as `CatalogList`. The add effect (`focusTargets`, `closest('li')`, `scrollIntoView`, `setHighlightId`) and the delete hand-off (`searchRef`) already work for any view that registers its links.
- `frontend/src/pages/CatalogList.tsx` -- the pattern to copy: `none` → `<p>` noMatch plus a `hidden` container, `li`/`tr` `hidden={!shown.has(id)}`, and a `Link` ref registering `focusTargets` with a cleanup.
- `frontend/src/components/Cover.tsx` -- the placeholder (`role="img"` "No cover", 200×300 or 44×64). Add a `size="fill"` variant (100% × 100%, title bars unchanged) and use it in tiles.
- `frontend/src/lib/bookDetail.ts:75` -- `coverSrc(coverFile)` → `/media/covers/<name>` with encoded segments. Reuse it.
- `frontend/src/styles/tokens.css:164` -- the `/* components */` block. Add `--catalog-tile-cover-min-width: 140px;` and `--catalog-tile-reading-bar-slot: 11px;`. Everything else maps to primitives: `--space-6` (24px), `--space-7` (32px), `--space-2` (8px), `--radius-cover` (4px), `--font-book-title-sm-*` (15.5px, `ui-serif`), `--font-body-sm-*` (14px), `--color-line`, `--color-surface-inset`, `--color-ink-secondary`, `--color-accent`, `--color-page`. `app-shell.spec.ts` compares only primitives.
- `frontend/src/pages/CatalogList.module.css:52` -- the highlight ring (`0 0 0 2px page, 0 0 0 4px accent`) and its 600ms fade-off. `styles/base.css:6` -- the global `:focus-visible` outline (2px accent, 2px offset).
- `frontend/e2e/catalog-tiles.spec.ts` -- 9 leaves, `test.skip` → `test`. `coverBox` finds the box by geometry: the first descendant of the link that is as wide as the `li` (±1px) at 2:3. So the box must be the first such element, with no border that shrinks a child placeholder. `ringRect` looks for the first element in the `li` with an `accent` outline or box-shadow.
- `frontend/e2e/bookcase.spec.ts:60` -- expects `['Bookcase', 'List']`. Change it to three options.
- `frontend/e2e/catalog-pace-calculator.spec.ts:271` -- the axe loop over `['bookcase', 'list']`. Add `'tiles'` and wait for the Tiles list.
- `frontend/e2e/restore.spec.ts:123` -- sets `list` before a restore. Add a `tiles` check (follow-up from the checklist).
- `README.md:8` -- Status line. Project docs list at line 116.
- Deferred-work intake: no open entry names story 8.1 or Epic 8. The three "before Epic 8" lines (919, 926, 936) are all `resolved:`.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/models.py`, `backend/bookvie/views/shelf.py` -- add `ShelfBook.cover_file` and fill it from `book.cover_file` -- AC-1.
- `backend/tests/test_bookcase_view.py` -- turn on the AC-1 leaf.
- `frontend/src/api/generated/schema.d.ts` -- run `npm --prefix frontend run api:gen` -- `check:api` compares it byte for byte.
- `frontend/src/lib/catalogView.ts`, `frontend/src/components/ViewToggle.tsx` -- add `tiles` and the label "Tiles" -- AC-2, AC-11.
- `frontend/src/lib/catalogView.test.ts` -- turn on AC-11.
- `frontend/src/lib/catalog.ts` and `catalog.test.ts` -- add `tilesName(total)` with a unit test (1 book, N books).
- `frontend/src/styles/tokens.css` -- add the two literals under `/* components */`. Hand-edit only, no formatter.
- `frontend/src/components/Cover.tsx` and `Cover.module.css` -- add the `fill` size (width and height 100%).
- `frontend/src/pages/CatalogTiles.tsx` (new) -- props are `CatalogList`'s. Render `<ul role="list" aria-label={tilesName(books.length)} hidden={none}>`, with `<li hidden={!shown.has(id)}>` per Book holding one `Link` to `/book/<id>`: `aria-label={names.get(id)}` (`spineNames(books)`, memoized), registered in `focusTargets` like `CatalogList`, with a highlight class when `id === highlightId`. Inside the link: the cover box (`aria-hidden`), the empty slot, the title span (title text only), and the author span (`firstAuthor` only). The `<p>` with `noMatch` shows when none is shown. A `TileCover` subcomponent, keyed by `coverFile`, holds `'loading' | 'loaded' | 'failed'`: `onLoad` → loaded, `onError` → failed. A ref callback also marks it loaded when the `img` is already `complete` with `naturalWidth > 0`. Null or failed renders `<Cover coverFile={null} title=… size="fill" />`.
- `frontend/src/pages/CatalogTiles.module.css` (new) -- see Design Notes.
- `frontend/src/pages/CatalogPage.tsx` -- render `CatalogTiles` for `'tiles'`. Update the comments that say "spine or row" / "both views" to cover tiles.
- `frontend/e2e/catalog-tiles.spec.ts` -- turn on all 9 leaves.
- `frontend/e2e/bookcase.spec.ts`, `catalog-pace-calculator.spec.ts`, `restore.spec.ts` -- the three-option updates in the Code Map -- AC-11.
- `_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md` -- tick the activated leaves and green-phase items done, and record AC-10's measured ms.
- `README.md` -- on the Status line (line 8), add that Epic 8 is in progress and the Catalog can now be shown as a grid of covers (Tiles). Keep "41 of 41 stories". In Project docs, after the Deferred work line, add "Story 8.1 spec" (`_bmad-output/implementation-artifacts/spec-8-1-see-my-catalog-as-covers.md`) and "Story 8.1 ATDD checklist" (`_bmad-output/test-artifacts/atdd-checklist-8-1-see-my-catalog-as-covers.md`).

**Acceptance Criteria:**
- Given the catalog view, when it is fetched, then each `ShelfBook` has `coverFile` (`covers/dune.png` or `null`), and `check:api` passes.
- Given the toolbar, when it renders, then the Catalog view group shows Bookcase · List · Tiles in the theme toggle's look, and Tiles is remembered under `bookvie.catalogView`.
- Given Tiles, when Catalog renders at 1280px, then a list "Tiles, N books" shows 7 columns with gaps of 24px and 32px. Each tile is one link named like its spine, and its caption is one line with an ellipsis, 19px below a 2:3 box.
- Given a cover, when it loads, then it shows whole at the bottom of an unchanged box. Before it loads, the box shows the flat fill with the hairline. With no cover or a broken one, the box shows the placeholder.
- Given search, sort or filters, when they change in Tiles, then the tiles reorder or hide, the grid closes up, the counts are announced, and the empty and no-match states replace the grid.
- Given an add, a delete or the Tab key in Tiles, then the add focuses the new tile and rings its cover box, the delete focuses Search titles, and Tab visits one stop per tile, ringed on the box, with Enter opening Book detail.
- Given 500 Books with 1200px covers, when Tiles opens at 1280px, then the first screen's covers are decoded within 1200 ms and scrolling shows zero layout shift. If this fails, record the measurement and open a thumbnail follow-up in `deferred-work.md`.
- Given the existing tests, when the story lands, then they assert three options, and Bookcase and List behave as before.

### Review Findings

Code review, 2026-11-13. A new session; it re-ran `npm run check` itself. 27 findings from 5 layers: 1 decision-needed (resolved: deferred, accepted as designed), 0 patch, 4 deferred (10 findings), 17 rejected.

- [x] [Review][Defer] Every tile fails WCAG 2.5.3 Label in Name — the visible caption "Dune" / "Frank Herbert" isn't a word run of the link's name "Dune by Frank Herbert, not read yet", so axe's `label-content-name-mismatch` is turned off for the tile links (`catalog-pace-calculator.spec.ts`), and the second scoped pass checks almost nothing on Tiles. No story in Epic 8 owns the fix. Medium. Sources: blind-hunter + acceptance-auditor. [frontend/src/pages/CatalogTiles.tsx:78] — deferred (Oleg's decision in this review): accepted as designed. A single-user app whose user doesn't use voice control; the caption stays title + first author as DESIGN.md has it, and the rule stays off for the tile links only.
- [x] [Review][Defer] Nothing tests the Tiles forced-colors rules (the `CanvasText` hairlines, the `Highlight` rings) [frontend/src/pages/CatalogTiles.module.css:120] — deferred: the ATDD checklist's open "E2E, AC-4 forced colors" item, for `bmad-testarch-automate`.
- [x] [Review][Defer] The cover URL is written as `/media/covers/<coverFile>` in `epic-8-context.md` (and in this spec's Code Map); the code builds `/media/<coverFile>`, which is right [_bmad-output/implementation-artifacts/epic-8-context.md] — deferred: fix with the Epic 8 spine reconciliation, alongside AD-6's same wording, so Stories 8.2 and 8.3 don't copy it.
- [x] [Review][Defer] Spine drift: AD-6 (Tiles "planned", cover URL), AD-15 Seed (`catalogView` Bookcase · List), the FR-25 and FR-4 map rows, Deferred → Cover thumbnails [ARCHITECTURE-SPINE.md:102,382,395-396,415] — deferred: already recorded by the build in `deferred-work.md` and this spec's `deferred:` block; spine drift, reconciled before the next epic.

**Rejected:**
- `false` Empty `firstAuthor` collapses a caption (blind, edge) — `invariants.py:88` refuses a Book with no authors, so `shelf.py:57`'s `""` fallback is never reached by a valid library.
- `false` A tile could get no name if `spineNames` skips an id (blind) — `catalog.ts:163` maps every input Book.
- `false` The restore check reads storage mid-navigation (edge) — `BackupPage.tsx:155` awaits `navigate('/')` before it announces "Restored.", so the status assertion waits for the navigation.
- `low` Small covers aren't scaled up to the box (edge) — 2 of the 410 covers in the real library are narrower than a tile's ~148px box, by a few px; scaling them means an `img` that fills the box, which moves the hairline off the visible cover (DESIGN.md → Cover box).
- `low` A transient load error shows the placeholder until the next visit (edge) — a local server; a retry path adds state for a case not seen in use.
- `low` In forced colors the highlight ring looks like the focus ring (blind) — the same plain `Highlight` outline `CatalogList.module.css:92` uses.
- `low` No `@ts-expect-error` pins `Cover`'s `fill` union (blind) — `tsc -b` already refuses the wrong call; a typecheck-only test adds a harness for a narrow case.
- `low` The tile link's inline ref callback re-runs every render (blind) — the `CatalogList` pattern; a few `Map` operations per Book per keystroke.
- `low` AC-10 counts `naturalWidth > 0`, not paint, and is costly (blind) — 58 ms against a 1200 ms budget, and the leaf took 4.1 s in this review's run; the limit is recorded as a residual risk.
- `low` The `tiles` restore check doesn't open Catalog (blind) — opening in Tiles from the stored value is AC-2's leaf; this check only needs the value kept.
- `low` The AC-5 leaf can't tell 1.5px from 1px at DPR 1 (auditor) — Chromium snaps the width; the placeholder's CSS is the unchanged `Cover` rule.
- `low` The checklist ticks "the export holds no view key" for Tiles (auditor) — the earlier block asserts the key's absence, which doesn't depend on its value.
- `low` No e2e for junk or throwing storage (auditor) — `catalogView.test.ts` covers both on the code path the page uses; the open checklist item goes to automate.
- `low` The checklist under-reports and names no owner for open items (blind) — `bmad-testarch-automate` resolves the checklist next, by rule.
- `low` `hasCover` duplicates `coverFile` (blind) — both come from `book.cover_file` in one builder; no caller diverges.
- `reject` The spec's `review_loop_iteration` and a README line number are off (blind) — the fix edits the spec under review.
- `reject` The spec's Code Map cover URL (auditor) — same; the `epic-8-context.md` half is deferred above.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- verdicts: 32 findings — high 0, medium 2, low 23, false 7, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine check: AD-6 writes the cover URL as `/media/covers/<coverFile>` while `coverFile` is `covers/<name>` served at `/media/<coverFile>` — the code follows Home's and Book detail's views and the ATDD pin; spine drift, deferred.
  - `[low]` `[defer]` Spine check: AD-6 still calls Tiles "Epic 8, planned" — spine drift, deferred.
  - `[low]` `[defer]` Spine check: the FR-25 map row says "not built" — spine drift, deferred.
  - `[low]` `[defer]` Spine check: the Seed's `lib/catalogView` lists only Bookcase · List — spine drift, deferred.
  - `[low]` `[defer]` Spine check: the Seed and the FR-4 row omit `pages/CatalogTiles` — spine drift, deferred.
  - `[low]` `[defer]` Spine check: Deferred → Cover thumbnails doesn't record that the speed check passed — spine drift, deferred.
  - `[medium]` `[defer]` Intent: an axe rule (`label-content-name-mismatch`) is turned off for Tiles — real WCAG 2.5.3 finding on every tile, but the intent fixes both the name and the caption, so it needs a design decision; deferred (deferred-work.md), and the rule's scope was narrowed by the patch below.
  - `[low]` `[reject]` Intent: the AC-5 leaf now reads the computed width of `1.5px dashed` instead of the literal — at DPR 1 Chromium snaps 1.5px to 1px, so the literal could never match; the placeholder's CSS is the unchanged pre-existing `Cover` rule. Not worth a change.
  - `[false]` `[reject]` Intent: the AC-7 leaf was loosened — it now polls both rectangles and still requires the same rect; timing only.
  - `[low]` `[patch]` Intent: AC-10's measurement isn't in the spec — recorded under Auto Run Result.
  - `[low]` `[reject]` Intent: AC-2's junk and throwing-storage cases are only unit-tested — `catalogView.test.ts` covers both on the same code path the page uses; the e2e follow-up belongs to automate.
  - `[low]` `[patch]` Intent: 5 columns at 1024px and 8 at 1440px untested — new leaf "[P2] AC-3 the grid packs 5 columns at 1024px and 8 at 1440px" added, passes.
  - `[low]` `[reject]` Intent: forced colors untested — no forced-colors harness in this story's leaves; Epic 8 puts tile forced-colors checks with 8.2. Left to automate.
  - `[false]` `[reject]` Intent: "Bookcase and List behave as before" has no evidence — the full suite (620 e2e) passed with only the three-option assertions changed.
  - `[false]` `[reject]` Intent: backend coverage — the reviewer found alignment, not a defect.
  - `[false]` `[reject]` Intent: the pipeline stops before code review — by design, build-auto ends in review (AGENTS.md "Story pipeline").
  - `[low]` `[patch]` Blind: the axe exclusion covers the whole page — a second Tiles pass now runs `label-content-name-mismatch` on everything except `ul[aria-label^="Tiles, "] a`.
  - `[false]` `[reject]` Blind: focus drops to body when a search or filter hides a focused tile — the only controls that change `shown` (Search titles, chips, Clear filters) take focus themselves, and an add only clears filters, so a focused tile can't be hidden.
  - `[low]` `[reject]` Blind: `hasCover` duplicates `coverFile` — both come from `book.cover_file` in the same builder; the spec keeps `hasCover` for the Spine popover. No named caller diverges.
  - `[false]` `[reject]` Blind: a cached broken image leaves the tile in loading — React attaches `onError` before it sets `src`, and load/error fire asynchronously, so the event can't be missed; a `complete`-only check would also mark not-yet-requested lazy images failed.
  - `[low]` `[patch]` Blind: `Cover` `size="fill"` silently drops a real `coverFile` — props are now a union; `fill` only type-checks with `coverFile: null`.
  - `[low]` `[patch]` Blind: open green-phase follow-ups — the two that no longer apply (name builder, docs-if-AC-10-fails) are closed in the checklist; the rest belong to `bmad-testarch-automate`.
  - `[low]` `[patch]` Blind: AC-10's measurement may not reach the spec — recorded under Auto Run Result (same as the intent row).
  - `[low]` `[patch]` Blind: the `tilesName` test title doesn't match its plural assertion — renamed "counts every book, one in the singular".
  - `[low]` `[reject]` Blind: the restore check doesn't assert the export has no view key — the key's absence doesn't depend on its value, and the earlier block asserts it; a duplicate assertion adds nothing.
  - `[low]` `[reject]` Blind: README links per-story files and says Epic 8 is in progress — required by the story-work rule (README is part of a story's done, PL-7).
  - `[false]` `[reject]` Edge: cached broken image stuck in loading — same refutation as the Blind row.
  - `[low]` `[patch]` Edge: `Cover` `fill` with a real `coverFile` — same fix as the Blind row.
  - `[low]` `[patch]` Verification gap: no check that a twin keeps "edition 1" when a filter hides the other — new leaf "[P1] AC-3 a twin tile keeps its edition in its name when a filter hides the other twin", passes.
  - `[low]` `[patch]` Verification gap: column count only at 1280px — same leaf as the intent row.
  - `[low]` `[reject]` Verification gap (other): AC-5's probe can't tell 1.5px from 1px — same as the intent row.
  - `[medium]` `[defer]` Verification gap (other): the Tiles axe pass turns off label-in-name — same deferral as the intent row.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Where the hairline sits:** on the visible cover, as DESIGN.md says ("so a white cover still has an edge"). The `img` is `position: absolute; inset: 0; margin: auto auto 0; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; object-position: 50% 100%`. A replaced element keeps its own ratio and is bottom-centered. Until it loads it is 0×0 and `opacity: 0`, so neither the dot nor a layout shift shows. Chromium's layout-shift tracker ignores rects that were empty. AC-10 measures this; if it fails, fall back to an `img` that fills the box (100% × 100%).
- **Box CSS:**

```css
.box { position: relative; aspect-ratio: 2 / 3; width: 100%; box-sizing: border-box; border-radius: var(--radius-cover); }
.loading { background: var(--color-surface-inset); border: var(--hairline) solid var(--color-line); }
.link { display: block; color: inherit; text-decoration: none; outline: none; }
.link:focus-visible .box { outline: var(--focus-ring-width) solid var(--color-accent); outline-offset: var(--focus-ring-offset); }
.highlight .box { box-shadow: 0 0 0 2px var(--color-page), 0 0 0 4px var(--color-accent); }
.slot { height: var(--catalog-tile-reading-bar-slot); }
.caption { margin-top: var(--space-2); }
.title, .author { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--catalog-tile-cover-min-width), 1fr)); column-gap: var(--space-6); row-gap: var(--space-7); list-style: none; margin: 0; padding: 0; }
```

  The title uses `--font-book-title-sm-*` at weight 600 in `--color-ink`; the author uses `--font-body-sm-*` in `--color-ink-secondary`. The highlight fades off like `CatalogList`'s (a `transition` on `.box`). Under forced colors, the outline and highlight become `Highlight`, and the `img` border and the `.loading` border become `CanvasText`.
- **Placeholder semantics:** the box is `aria-hidden`, so the placeholder's `role="img"` "No cover" doesn't double the link's name.

## Verification

**Commands:**
- `cd backend && uv run pytest` -- expected: all pass, AC-1 included.
- `cd frontend && node --test src/lib/*.test.ts` -- expected: all pass, AC-11 included.
- `npm run check` (repo root) -- expected: green (ruff, Prettier, oxlint, `tsc -b`, `check:api`, coverage).
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/catalog-tiles.spec.ts e2e/bookcase.spec.ts e2e/catalog-pace-calculator.spec.ts e2e/restore.spec.ts e2e/app-shell.spec.ts e2e/catalog-sort.spec.ts e2e/catalog-filter.spec.ts` -- expected: all pass. Record AC-10's annotation.
- Full e2e suite once at the end -- expected: no regressions.

## Auto Run Result

Status: in-review

**Summary.** The Catalog gains a third view, Tiles, as described in the intent. The catalog view's `ShelfBook` now carries `coverFile`. The toggle reads Bookcase · List · Tiles and remembers the choice. A new `CatalogTiles` grid renders the same sorted, filtered Books as one-link tiles named by `spineNames`. Each tile has a fixed 2:3 cover box: the lazy cover shown whole at the bottom with its hairline, a flat fill while it loads, and `Cover`'s placeholder when there's no cover or it fails to load. Below the box are the empty 11px reading-bar slot and the one-line title and first author. The add, delete and keyboard hand-offs work, with the focus and highlight rings on the cover box.

**Files changed.**
- Backend:
  - `backend/bookvie/views/models.py` and `views/shelf.py`: `ShelfBook.cover_file`.
  - `backend/tests/test_bookcase_view.py`: the AC-1 leaf is on.
  - `backend/tests/test_views.py`: the snapshot and the old "no coverFile" assertion now expect `coverFile`.
- `frontend/src/api/generated/schema.d.ts`: regenerated with `api:gen`.
- Frontend `lib/`:
  - `catalogView.ts` and its test: `tiles`, and the AC-11 leaf is on.
  - `catalog.ts` and its test: `tilesName`.
- Frontend components and pages:
  - `components/ViewToggle.tsx`: the Tiles label.
  - `components/Cover.tsx` and `.module.css`: the `fill` placeholder size, with type-narrowed props.
  - `pages/CatalogTiles.tsx` and `.module.css` (new): the grid, the tile and `TileCover`.
  - `pages/CatalogPage.tsx`: renders Tiles, and its comments are updated.
- `frontend/src/styles/tokens.css`: two catalog-tile literals.
- e2e:
  - `catalog-tiles.spec.ts`: the 9 ATDD leaves are on, AC-5 and AC-7 got the adjustments noted in the triage log, and two leaves are new (column widths, twin under a filter).
  - `bookcase.spec.ts` and `bookcase-details.spec.ts`: three options, and the Tab order.
  - `catalog-pace-calculator.spec.ts`: an axe pass for Tiles, plus a scoped label-in-name pass.
  - `restore.spec.ts`: `tiles` survives a restore.
- Docs:
  - `README.md`: the Status line and the spec and checklist links.
  - The ATDD checklist: items ticked, and AC-10's numbers.
  - `deferred-work.md`: two entries.
  - `sprint-status.yaml`: `review`.

**Review.**
- 32 findings: 10 patched, 8 deferred in two items (spine drift; the label-in-name design decision), and 14 rejected. Each has its reason in the triage log.
- The patched entries are all `low`: 0 high, 0 medium.

**Follow-up review recommendation:** `false`. Every patched entry was low.

**AC-10 measurement:**
- 500 Books with 800×1200 JPEG covers, Chromium, 1280px.
- First screen of covers decoded in 57, 58 and 58 ms (median 58 ms), against a 1200 ms budget.
- Zero cumulative layout shift while scrolling to the end.
- No thumbnail follow-up is needed.

**Verification.**
- `npm run check` exits 0 after the patches:
  - ruff, Prettier, oxlint, `tsc -b` and `check:api`;
  - pytest: 1573 passed, coverage gates ok (domain 100%, intents+store 98.08%);
  - node unit tests: 247 passed;
  - Playwright: 620 passed;
  - smoke ok.
- The I/O matrix audit passed:
  - Loading and loaded: AC-4.
  - No cover and broken cover: AC-5.
  - Stored, junk and throwing storage: `catalogView.test.ts`.
  - Nothing shown: AC-6.

**Residual risks:**
- AC-10 uses one synthetic JPEG repeated 500 times over loopback, and it counts an image as done at `naturalWidth > 0`, not at paint.
- The tiles still fail WCAG 2.5.3 label-in-name until the design decision is made (deferred).
- The placeholder's 1.5px border can't be told from 1px at DPR 1.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
