---
title: "Story 3.5: See my reading on Home's shelf"
type: 'feature'
created: '2026-11-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ed628305b968b2b38e0d05f828015d54647bae5a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-5-see-my-reading-on-home-s-shelf.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Home shows the Main book's progress only as a number. There is no bookcase on Home, and no spine anywhere shows how far the Main book has been read.

**Approach:** The server adds `slicePriority` to the home view (AD-6). Home renders a bookcase slice below its grid: the full bookcase packed into rows at the current width, up to 3 rows chosen from the priority, the Main book's row first. The Main spine is filled to its percentage (on Catalog too), and the legend gains "Main book, filled to its %". Names, shapes and behaviours follow the ATDD checklist's "Contract the Scaffolds Pin". The 6 red leaves are activated, not rewritten.

## Boundaries & Constraints

**Always:**
- `HomeView.slice_priority: list[str]` (wire `slicePriority`). Order: the Main book, then Up next (if it isn't the Main book), then every other Book with a finished Reading, by latest `finishDate` newest first. Ties go by the title key, then Book id. Each id appears at most once. Back-filled finishes count. A Book with no role and no finish is not listed. The title key is NFKD with combining marks stripped, then casefolded (spine "Title ordering"). It is a new `domain` function.
- The client packs `sortBooks(books)` (Author, as Catalog does today) into rows of `k = max(1, floor((W + gap) / (spineWidth + gap)))`, where W is the list's content width. It chooses rows in the order of `slicePriority`, up to 3 distinct rows, then fills from the first bookcase rows. With a Main book, its row comes first and the rest follow in bookcase order. Without one, all rows are in bookcase order. This is a pure function in `lib/`, mirroring `expectedSlice` in the e2e spec.
- The slice is the Catalog's `Bookcase` region ("Bookcase" `h2`, meter, legend, popover, Start dialog) with "See all in Catalog" (`link` to `/catalog`) after the meter. Its `list` is named "Bookcase slice, N rows" ("1 row"). It has one `li` per row (as `key-home.html` does), with the spine buttons inside. It recomputes on resize (`ResizeObserver`), never filters and never scrolls.
- Keys in the slice: one roving Tab stop. Left and Right move through the displayed order and cross rows. Home and End go to the first and last displayed spine. Up and Down use the existing `verticalNeighbour`.
- Main spine, never finished (`role === 'main' && !finished`): the unread body and outline, a painted strip (`spine-label-strip`), and below the strip a body whose fill in `--spine-color` rises from the plank to `percent`% of that body. The fill has a 2px `spine-edge` line on top, so at 0% only the line shows at the plank. The fill transitions its height over 600ms ease-out, except under `prefers-reduced-motion: reduce`.
- Re-read Main (`role === 'main' && finished`): the read spine unchanged, plus the marker.
- Main-book marker on both: a 7px dot in `spine-unread-text` with a 1.5px `marker-ring` ring, centered 8px from the top. The strip moves down to `--space-spine-label-strip-top-marked` (20px). This applies on Catalog too.
- Legend on Home and Catalog, always shown (the mockup shows it with no Main book too): "Main book, filled to its %" with a mini main swatch.
- Forced colors: the fill, line and marker stay distinct, following the existing read and unread rules.
- WCAG 2.2 AA in both themes (Home's axe test covers the slice).

**Never:**
- No client-side priority sorting or percentage arithmetic (AD-6). No stored-shape change, no new intent, no new error code.
- No Up next or Waiting markers, no Sort select, no finish fill, ring or "Finished *X*." line (Epic 4, Story 3.7).
- No scrolling container and no Search titles in the slice.

**Decisions (low-stakes):**
- Rows are `li`s, not one `li` per spine, so a partial last row never shares a line with the next displayed row.
- The fill takes 600ms, matching the finish fill. The gauge has no transition.

## I/O & Edge-Case Matrix

| Scenario | State | Expected |
|---|---|---|
| Full priority | Main re-read, Up next finished newest, ties | `[main, upNext, …newest first, tie by title]` |
| No Main | Up next set | Up next leads; former Main by its finish |
| Empty library | — | `[]`; Home keeps the empty shelf, no slice |
| Few rows | library fits in 1–2 rows | every row; "Bookcase slice, 1 row" |
| Same row | Main and Up next share a row | row counted once; next priorities fill |
| Partial row | Main on the short last row | shown alone on its plank, first |
| 0% / 100% | p.0; last page | line at plank; fill to strip bottom, marker kept |

</frozen-after-approval>

## Code Map

Backend:
- new `backend/bookvie/domain/ordering.py` `title_key(title) -> str`, exported in `domain/__init__.py` `__all__` (`unicodedata`, as `duplicates.py:46` does).
- `backend/bookvie/views/models.py:72` `HomeView` -- add `slice_priority: list[str]` with a docstring.
- `backend/bookvie/views/shelf.py:113` `home()` -- add a `_slice_priority(library)` helper. Use `library.main_book_id` and `library.up_next_book_id` (only if `library.book(id)` exists) and `Book.latest_finished()` (`model.py:83`). Drop the "(until Story 3.5's slice)" note.
- Then run `npm --prefix frontend run api:gen`. If `test_views.py` or `test_home_view.py` compare the whole home body, update them only for that.

Frontend (`frontend/src`):
- new `lib/slice.ts` (+ `slice.test.ts`) -- `rowCapacity(width, spine, gap)`, `sliceRows(ids, k, priority, mainId) -> string[][]`. Add `sliceName(n)` in `lib/catalog.ts` next to `bookcaseName`.
- `pages/Bookcase.tsx` -- add an optional slice mode (for example `slice?: { priority: readonly string[] }`). Make Catalog's `query`, `highlightId`, `focusTargets` and `searchRef` apply only to Catalog, through a discriminated union. In slice mode, measure the `ul` content width, plus the spine width and gap from computed style, in a layout effect. Render rows as `li`s. Feed the flattened displayed ids to `keyDown`, the Tab stop and the height measuring, which already skips missing labels. Extract the spine button (with `main` / `marked` classes, a fill body and a marker) so both modes share it. Add the link and the legend item.
- `pages/Bookcase.module.css` -- `.marked` (padding-top 20px, a `.marker` dot absolutely positioned, the button `position: relative`). `.main` is the unread outline, column flex with `.read`-style strip paint and a `.body` (flex 1, relative, overflow hidden, unread fill) holding a `.fill` (absolute bottom, `height: var(--percent)`, content-box `border-top: 2px solid var(--color-spine-edge)`, transition). `.sliceRow` is one 204px flex line with the spine gap, aligned flex-end. Add the legend `.swatchMain` (gradient as in the mockup's `.lg.main`) and forced-colors rules. Planks keep the shelf's repeating gradient (rows are 204px, 36px apart).
- `pages/HomePage.tsx` + `.module.css` -- below `.grid`, when the library isn't empty: `<Bookcase books={sortBooks(books)} meter={meter} slice={{ priority: slicePriority }} />`, full width, `margin-top: var(--space-6)`. Update the docstring.
- `pages/CatalogPage.tsx` -- adapt to the union props only.

E2E (`frontend/e2e`): `home-slice.spec.ts` (5 leaves), `bookcase.ts` helpers. Catalog and Home specs that count legend items, or assert spine paint on a Main book, may need the new item or marker.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/ordering.py`, `domain/__init__.py` -- `title_key`, with tests (diacritics and case: "Émile" == "emile").
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- `slice_priority`; regenerate `schema.d.ts`.
- [x] `backend/tests/test_home_slice.py` -- un-skip AC-1. Add a title-key tie and an id tie.
- [x] `frontend/src/lib/slice.ts`, `slice.test.ts`, `lib/catalog.ts` -- packing, choosing and naming, with unit tests for every Matrix row on the client.
- [x] `frontend/src/pages/Bookcase.tsx`, `Bookcase.module.css`, `CatalogPage.tsx` -- slice mode, Main spine, marker, legend item.
- [x] `frontend/src/pages/HomePage.tsx`, `HomePage.module.css` -- mount the slice.
- [x] `frontend/e2e/home-slice.spec.ts` -- un-skip the 5 leaves. Add follow-ups: a library under 3 rows ("1 row"), no Main book (bookcase order), and the 0% line.
- [x] `README.md` -- Epic 3 status line (the slice on Home).

**Acceptance Criteria:**
- Given the ATDD leaves, when they are activated, then `pytest tests/test_home_slice.py` and `e2e/home-slice.spec.ts` pass.
- Given the whole suite, when `npm run check` runs, then it passes, including the coverage gates, `check:api` and axe on Home and Catalog.

### Review Findings

Code review 2026-11-05. Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check.

- [x] [Review][Patch] Open popover keeps a stale position after a resize repack: the repack remounts the anchored spine (`li key={row[0]}`), but `anchor` only changes with `openId`, so `SpinePopover`'s placement effect never re-runs against the new spine. Make `anchor` also depend on `rows` [frontend/src/pages/Bookcase.tsx:193]
- [x] [Review][Patch] AC-6 "instantly under reduced motion" is never observed: `spineColumn` screenshots with `animations: 'disabled'`, which fast-forwards the transition. Assert the fill's `transition-duration` is `0s` under `reducedMotion: 'reduce'` and `0.6s` without it [frontend/e2e/home-slice.spec.ts:344]
- [x] [Review][Patch] Forced-colors rules for the Main spine (fill, line, marker) are not exercised: no test emulates `forcedColors: 'active'` with a Main book. Add a leaf comparing the fill's `background-color` and `border-top-color` with the spine body's [frontend/src/pages/Bookcase.module.css]
- [x] [Review][Patch] Tie test docstring says `"émile"`, but the data is `"ÉMILE"`, whose title key is `"emile"` [backend/tests/test_home_slice.py:117]
- [x] [Review][Defer] Dropping focus to `body` and then resizing must not refocus a slice spine: only the positive refocus path is pinned [frontend/src/pages/Bookcase.tsx:349] — deferred: narrow interaction edge; the negative case can join the next slice-focus work
- [x] [Review][Defer] AD-6 wording drift (the client chooses rows from an id priority) [_bmad-output/planning-artifacts/ARCHITECTURE-SPINE.md] — deferred: already recorded in deferred-work.md (SC1); the spine is reconciled per epic

Patches applied and verified: each new e2e leaf fails on its mutation (stale bundle without the `anchor` fix: popover x 384 vs 61; the `.fill` transition or its forced-colors rule removed) and passes with the code; `npm run check` green (985 pytest, 262 e2e, coverage gates, `check:api`, smoke). Note: `base.css` already zeroes transitions under reduced motion, so `.fill`'s own reduced-motion block is redundant; the new leaf pins the behaviour either way.

**Rejected:**
- EC/BH/AA: Main row not chosen yields 4 rows — false: `books` and `slicePriority` come from the same home view, and `_slice_priority` always lists `main_book_id` first, so its row is always chosen.
- EC/BH: `cssLength` 0 → NaN/Infinity capacity — false: both tokens are px in `tokens.css` (28px, 4px).
- EC/BH: unfinished Main with `percent: null` — false: invariant `main_has_unfinished_reading` guarantees a Reading, so `percent` is set.
- EC: popover closes when a resize drops its spine out of the 3 rows, and focus falls to body — low: needs a resize with the popover open on a fill row; the fix adds a guard.
- BH: `title_key` doesn't fold Ø/Ł/Æ — rejected: the fix edits the spine's "Title ordering" convention.
- BH: the e2e `expectedSlice` duplicates `sliceRows` — false: the spec asks for an independent mirror as the test oracle.
- BH: no component tests for slice mode — low: no named harm; e2e covers it, and the repo has no `.test.tsx` convention.
- BH: legend swatch line is 1.5px, not 2px — false: it matches the mockup's `.lg.main` gradient exactly.
- BH: rows keyed by `row[0]` remount spines (root-cause redesign) — low: the symptoms are handled (focus) or patched (popover); a redesign isn't a direct fix.
- BH: spec frontmatter status, deferred-work formatting, README story count — low: the status is set by this review, the README count is already deferred, the formatting is cosmetic.
- AA: marker "centered 8px from the top" vs `top: 8px` — rejected: the CSS matches the mockup; the fix edits the spec wording.
- AA: 2px line clipped at 100% — false: the Matrix says "fill to strip bottom"; already accepted in pass 1 (BH6+EC7).
- AA: forced-colors strip merges with the Main body — low: the constraint names only the fill, line and marker, which stay distinct; changing the strip is a design choice.

## Implementation Notes

- `CatalogPage.tsx` needed no change: its props already fit the Catalog side of the union. `api/views.test.ts`'s `HomeView` fixture gained `slicePriority: []` for `tsc`.
- Slice rows are keyed by their first id, so a repack remounts the spine buttons. A `sliceFocused` ref (set on spine focus, cleared when focus leaves to another element or is dropped) lets a layout effect put focus back on the Tab-stop spine, or the first displayed one.
- Under forced colors, the fill is `CanvasText` with a `Highlight` line, and the marker is a Canvas dot in a CanvasText ring. The legend swatch uses `--color-spine-slate` as a fixed sample color.
- Review pass 1 patches: refocus after a resize repack, with an e2e that fails without the fix (3/3) and passes with it (5/5); the Main spine fill and marker on Catalog; a slice spine opening its popover, and Escape returning focus to it. Re-verified by the orchestrator: `pytest` 985 passed; `npm run check` green (coverage gates, `check:api`, e2e, smoke). Deferred: AD-6 spine wording (deferred-work.md).

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH1+EC1+EC2 | Resize repacks rows (`li key={row[0]}`), remounting spine buttons; focus drops to body | medium | Moving a keyed child to another parent remounts it; the refocus effect only checks `li[hidden]`, which slice mode never renders. | patch |
| VG1 | Main spine fill and marker on Catalog never checked | gap (pre-verified) | Paint checks only reach `sliceSpine`; Catalog checks name and legend only. | patch |
| VG2 | Popover from Home's slice never opened in a test | gap (pre-verified) | No Home spec clicks a slice spine. | patch |
| SC1 | AD-6 says the server picks the slice's Books and row priority; the client now picks rows from an id priority | low | Real doc drift; the spine is reconciled per epic (as SC1–SC4 of 3.4). | defer |
| SC2 | `schema.d.ts` regeneration missing from the diff | false | The review diff excluded `api/generated` on purpose; the working tree has `slicePriority: string[]` and `check:api` passed. | reject |
| BH2 | Start from a slice popover: focus target gone if the spine leaves the slice | false | Confirm navigates to Home and focuses the title link; Cancel falls back to `main` via `fallbackTarget`. | reject |
| BH3 | Catalog's Main fill and marker unmentioned and untested | low | Same gap as VG1 (patched); README describes Home only, no harm. | reject |
| BH4 | No component tests for slice mode | low | No named harm; e2e covers measuring, naming and keys; no `.test.tsx` convention in the repo. | reject |
| BH5+EC4+EC5 | `cssLength` reads 0 for non-px tokens, NaN/Infinity capacity | low | Both tokens are px in `tokens.css`; unreachable today, fix adds guards. | reject |
| BH6+EC7 | 100% fill clips the 2px line | false | Intended: Matrix says "fill to strip bottom"; the last-page e2e passes. | reject |
| BH7 | Backend priority cases missing (role + finish, re-read earlier finish, unfinished excluded, HTTP camelCase) | false | AC-1 covers all: Left Hand and Kindred finished in roles, Left Hand by 05-01 without Main, the paused Book excluded, asserted over HTTP. | reject |
| BH8 | `_slice_priority` could use one sort key | low | Style only, no harm. | reject |
| BH9 | Client `sortBooks` has no id tie-break; two title orderings | low | Pre-existing Catalog sort; the spine documents `Intl.Collator` for the client. | reject |
| BH10 | README story count stale | low | Pre-existing, already in deferred-work.md. | reject |
| BH11 | Marker geometry hard-coded | false | DESIGN.md says marker size is a literal component dimension on purpose; values match the mockup. | reject |
| BH12 | Diff omits sprint-status, spec, schema | false | Excluded from the review diff on purpose; all in the working tree. | reject |
| EC3 | Main row not chosen gives 4 rows | false | The server always lists the Main book first, so its row is always chosen. | reject |
| EC6 | Unfinished Main with null `percent` | false | Invariant: the Main book has an unfinished Reading, so `percent` is set. | reject |
| EC8 | `CatalogPage.tsx` unchanged though listed | false | The Code Map says "adapt to the union props only"; none were needed. | reject |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- all pass, 0 skipped from 3.5
- `npm run check:api` -- clean
- `npm run check` -- green, including e2e and coverage gates
