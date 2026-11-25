---
title: 'Story 16.2: Show only my favourites'
type: 'feature'
created: '2026-11-25'
status: 'in-review'
baseline_revision: 'a149a1e60fc7d72c96be373d941a6adda7d0a1f8'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md'
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-6, AD-7; Capability -> Architecture Map FR-31 row, Structural Seed lib/ line), reconciled before the next epic: lib/useFavourite now takes an onSaved option that lets pages/CatalogPage take over the star's success line (the unstar with the Favourites chip on), and the spine names neither the module nor the hand-off.
    evidence: |-
      Spine Check, build-auto review of spec-16-2-show-only-my-favourites. Same gap as the open entry from Story 16.1's review (deferred-work.md, "Spine drift (Capability -> Architecture Map FR-31 row, Structural Seed; AD-6, AD-7)"). The code follows AD-6 and AD-7.
    location: >-
      ARCHITECTURE-SPINE.md (Capability map FR-31 row, Structural Seed)
    severity: low
  - summary: >-
      No test covers CatalogPage's "Favourites chip went off before the refetched view dropped the unstarred Book" branch, which speaks the plain "Title is not a favourite." line instead of the combined one.
    evidence: |-
      Verification-gap layer, build-auto review of spec-16-2-show-only-my-favourites. AC-6 to AC-8 keep the chip on throughout; favourite-star.spec.ts unstars with the chip off from the start, so onSaved returns false and the branch never runs. Needs a held catalog-view refetch (route hold and release, as favourite-star.spec.ts AC-7 does); for bmad-testarch-automate.
    location: >-
      frontend/src/pages/CatalogPage.tsx (unstar layout effect, the !favouritesOn branch)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Oleg can star Books (16.1), but the Catalog can't show only the starred ones, so the "shelf of Books that mattered" exists only scattered through the library (FR-31, FR-20).

**Approach:** Add a lone Favourites toggle chip, first in the filter row, as its own AND group in `lib/catalogFilter.ts`. "Clear filters" turns it off and focuses it. When an unstar with the chip on hides a Book, `pages/CatalogPage` moves focus to the next shown Book and announces one combined line.

## Boundaries & Constraints

**Always:**
- The chip is a `button` named exactly "Favourites", `aria-pressed`, in no `role="group"`, no popup, with a leading `aria-hidden` `StarIcon` SVG (`row-size`, filled `--color-favourite` on or off; under forced colors `forced-color-adjust: none` and a CanvasText fill). On, it is the usual selected chip; the existing `::before` check sits before the star. Shown whenever the catalog has Books; never hidden or disabled.
- On, only `favourite: true` Books pass, ANDed with every group and Search titles. `filtersOn` counts it; `liveFilters` never changes it. Page state only: off in `NO_FILTERS`, so unmount, reload and an add reset it; never stored; never applied to Home or the meter.
- Unstar that the chip hides: once the refetched view renders, focus the next shown Book in sort order (the current view's `focusTargets` element), else the previous, else Search titles; `status` says "*Title* is not a favourite. N books match." once (via `favouriteStatus` and `matchCountCopy`), and the star flow's own line is not announced. From the popover, the popover closes with its spine (the existing render-time close) and the same rule applies. Focus is set in a layout effect, so `useSpinePopover`'s passive fallback never takes it.
- A failed save keeps 16.1's behaviour exactly.

**Never:** No storage key. No change to Home, the meter, the star's own placement, or any agent tool. No new announce path for star presses that the chip doesn't hide. Existing e2e tests change only where the Epic 16 gate names them for 16.2. No `README.md` or spine edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chip on | 3 of 6 starred | 3 Books shown; "3 books match." | — |
| Nothing starred | chip on, 0 starred | "No books match these filters." + Clear filters; chip stays on across refetches | — |
| Unstar, next exists | chip on, unstar the middle shown Book | next shown Book focused; "X is not a favourite. N books match." | — |
| Unstar, last shown | unstar the last in order | previous shown Book focused | — |
| Unstar, only one | unstar the only shown Book | Search titles focused; "… 0 books match." and the empty state | — |
| Unstar, chip off | unstar anywhere | 16.1 behaviour: "X is not a favourite.", focus kept | — |
| Unstar fails | 503 with chip on | Book shown and starred; couldn't-save line as 16.1 | focus kept |

</intent-contract>

## Code Map

- `frontend/src/lib/catalogFilter.ts` -- `CatalogFilters` (add `favourites: boolean`), `NO_FILTERS`, `FilterableBook` (add `favourite: boolean`; `ShelfBook` has it), `matchesFilters`, `filtersOn`. `liveFilters` spreads `filters`, so it keeps the toggle; leave it.
- `frontend/src/lib/catalogFilter.test.ts:18` -- `book()` defaults gain `favourite: false`; add favourites cases (AND, `filtersOn`, `liveFilters` identity).
- `frontend/src/components/FilterChips.tsx` -- add the chip before the Status group; `readRef` prop becomes `favouritesRef`. `FilterChips.module.css` -- the star class (size, gold fill overriding `FavouriteStar.module.css`'s `.shape { fill: none }`, forced colors).
- `frontend/src/components/FavouriteStar.tsx:17` -- `StarIcon`, reused.
- `frontend/src/lib/useFavourite.ts:57,79` -- `useFavourite()` gains an optional `onSaved(book, favourite) => boolean`; when it returns true the hook skips its own `status` line.
- `frontend/src/pages/CatalogPage.tsx` -- `readChipRef` → `favouritesChipRef` (`clearFilters`), pass `onSaved` to `useFavourite`, hold the pending unstar, and a `useLayoutEffect` on `[pending, sorted, shown]` that focuses and announces once the Book is gone from `shown`; if the chip went off first, announce the plain star line instead.
- `frontend/src/pages/Bookcase.tsx:197`, `lib/useSpinePopover.ts` (vanished effect) -- read-only: Bookcase's layout effect moves focus only for a focused hidden spine; the popover's fallback only runs when focus is on `body`.
- `focusTargets` -- already filled by Bookcase (spines), CatalogList (title links) and CatalogTiles (tile links).
- Gate's e2e leaves to update: `catalog-filter.spec.ts:244,281,445,500` (Read → Favourites focused), `bookcase-details.spec.ts:95` (Favourites before Read), `catalog-publisher-filter.spec.ts:184` (row's buttons start with Favourites).
- Red leaves to un-skip: `frontend/e2e/favourites-chip.spec.ts` (9).
- Deferred-work intake: none name story 16.2.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/catalogFilter.ts`, `catalogFilter.test.ts` -- the toggle in the types and rules; unit tests.
- `frontend/src/components/FilterChips.tsx`, `FilterChips.module.css` -- the chip and its star.
- `frontend/src/lib/useFavourite.ts` -- the `onSaved` option.
- `frontend/src/pages/CatalogPage.tsx` -- the ref, the toggle wiring, the unstar focus and message.
- `frontend/e2e/catalog-filter.spec.ts`, `bookcase-details.spec.ts`, `catalog-publisher-filter.spec.ts` -- the gate's leaf updates; un-skip `favourites-chip.spec.ts`.

**Acceptance Criteria:**
- AC-1 to AC-9 as numbered in `_bmad-output/test-artifacts/atdd-checklist-16-2-show-only-my-favourites.md` (copied from epics.md Story 16.2), each proven by its leaf in `frontend/e2e/favourites-chip.spec.ts`, un-skipped and passing.
- Given the whole suite, when `npm run check` and the full e2e suite run, then both pass, and only the existing tests named in the Code Map changed.

## Spec Change Log

## Review Triage Log

### 2026-11-25 — Review pass
- verdicts: 31 findings — high 0, medium 0, low 16, false 15, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine Check: `useFavourite` gains `onSaved`, and the spine still names neither `lib/useFavourite` nor this hand-off — spine drift (AD-6, AD-7), added to the open entry at `deferred-work.md:1868`; the code follows AD-6/AD-7.
  - `[false]` `[reject]` Intent 1: the ATDD leaves AC-6–AC-8 were edited (`afterCount`), dropping "unstar before the chip's count is spoken" — no assertion changed; a save always empties pending announcements (16.1, `useIntentRequest.run`), so the red leaf demanded a line no build can keep when the star is pressed under 100ms after the chip, which a person never does. Recorded under Auto Run Result.
  - `[low]` `[reject]` Intent 2: the next/previous/Search fallback is only partly exercised per view (Tiles next only, popover next only) — already listed as green-phase follow-ups in the ATDD checklist for `bmad-testarch-automate`, the pipeline's next test step; the shared effect is view-independent.
  - `[low]` `[patch]` Intent 3: the chip star's visual states lack e2e coverage — AC-1/AC-2 already assert the selected style, the check before the star and the light gold fill; grouped with VG gap 2, patched with a dark and forced-colors step in AC-1.
  - `[false]` `[reject]` Intent 4: `onSaved` adds API to a 16.1 hook — descriptive; the default `{}` keeps every other caller's behaviour (Book detail, Home) and CatalogPage still owns the message as AR70 asks.
  - `[false]` `[reject]` Intent 5: `epic-16-context.md` rewritten outside the story — step-01 of `bmad-build-auto` requires recompiling it when a planning doc is newer (DESIGN.md changed in 16.1); its details live in epics.md.
  - `[low]` `[reject]` Edge 1: a successful unstar whose refetch fails leaves `pendingUnstar` set, so a later change can move focus and speak a stale line — real (`sendIntent` returns ok after a failed refetch, `api/intents.ts:49`), but needs the local server to fail in the milliseconds between a committed write and its refetch, and no fix is a direct correction (it needs refetch-error state or a timeout).
  - `[low]` `[reject]` Edge 2: turning the chip off while an unstar is pending replaces the count with the plain star line — the window is between the save resolving and the refetched render; not met in use, and the spec chose the plain line for it.
  - `[low]` `[reject]` Edge 3: two Books unstarred before the first refetch renders lose one line — `onSaved` runs only after each refetch completed, so the second save would have to round-trip inside one render; not met in use, and a queue adds state.
  - `[low]` `[patch]` Edge 4: no focus when `focusTargets` lacks the neighbour — patched: fall back to Search titles.
  - `[false]` `[reject]` Edge 5: a search or filter hides the Book before the refetch does — `onSaved` runs after the refetch has completed, so `shown` already reflects it at the next render; typing would have to land inside that render.
  - `[low]` `[patch]` Edge 6: a waiting Search titles count replaces the combined line — patched: `cancelCount()` before the announce.
  - `[false]` `[reject]` Edge 7 (claim): acceptance proven by edited tests — same as Intent 1; assertions unchanged.
  - `[false]` `[reject]` Edge 8 (claim): the chip-off branch is a new announce path — it speaks the very line `onSaved` suppressed for that press, the star's own line, not a new one.
  - `[low]` `[patch]` Edge 9 (claim): the passive fallback can still take focus when the target is missing — same root cause as Edge 4, patched with it.
  - `[low]` `[reject]` Blind 1: the person hears nothing when the refetch after a save fails — same root cause and rarity as Edge 1.
  - `[low]` `[reject]` Blind 2: a stuck pending unstar is announced much later — same root cause as Edge 1.
  - `[false]` `[reject]` Blind 3: two quick unstars lose one message — same as Edge 3: the overwrite window is inside one render.
  - `[low]` `[patch]` Blind 4: a missing focus target leaves focus on body — same as Edge 4, patched.
  - `[low]` `[patch]` Blind 5: `onSaved` reads `latest.current`, updated in a passive effect — patched: updated in a layout effect.
  - `[false]` `[reject]` Blind 6: the ATDD bodies changed without a record — same as Intent 1; the fix would edit this spec, and the change is recorded under Auto Run Result.
  - `[false]` `[reject]` Blind 7: the edit hides the "count cancelled by a fast press" behaviour — that is 16.1's save behaviour for every star and needs a press under 100ms after the chip.
  - `[false]` `[reject]` Blind 8: `afterAnnounceDelay` imported from `stats.ts` — reuse per the helper rule (import from where it lives); no caller diverges.
  - `[false]` `[reject]` Blind 9: the epic context rewrite is out of scope and drops facts — same as Intent 5.
  - `[false]` `[reject]` Blind 10: no unit test for `onSaved` — both branches are proven end to end (AC-6/AC-7 suppress it; `favourite-star.spec.ts:316` keeps it with the chip off); no named harm.
  - `[false]` `[reject]` Blind 11: the Code Map's effect deps differ from the code — the fix edits this spec.
  - `[false]` `[reject]` Blind 12: the I/O matrix lacks edge cases — the fix edits this spec; the cases it names are Edge 1–3, triaged above.
  - `[low]` `[patch]` Blind 13: two comment lines in `catalogFilter.ts` overrun the block's wrap — patched: re-wrapped.
  - `[low]` `[defer]` VG gap 1: the "chip went off before the refetch rendered" branch has no test — pre-verified; deferred to `bmad-testarch-automate` (needs a held catalog refetch).
  - `[low]` `[patch]` VG gap 2: the chip star under forced colors and in dark is not asserted — patched: AC-1 gains dark and forced-colors steps.
  - `[false]` `[reject]` VG other: a stuck `pendingUnstar` (hypothesis) — same as Edge 1, triaged there.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **Why a layout effect.** Child layout effects run before the parent's, and all layout effects before passive ones. Bookcase's layout effect only moves focus off a focused hidden spine (the popover's star isn't one), so CatalogPage's layout effect focuses the next Book, and `useSpinePopover`'s passive vanished effect then finds focus off `body` and does nothing.

## Verification

**Commands:**
- `npm run check` -- expected: exits 0.
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/favourites-chip.spec.ts e2e/catalog-filter.spec.ts e2e/bookcase-details.spec.ts e2e/catalog-publisher-filter.spec.ts e2e/favourite-star.spec.ts` -- expected: all pass, none skipped.
- `npm run check:e2e` -- expected: the full e2e suite passes.

## Auto Run Result

Status: in-review

**Summary.** The Catalog's filter row now starts with a lone Favourites toggle chip (`aria-pressed`, no group, no popup, a leading `aria-hidden` gold `StarIcon`). On, it keeps only starred Books in the bookcase, the list and the tiles, ANDed with every other group and Search titles. It is page state only (off in `NO_FILTERS`, so unmount, reload and an add reset it), `liveFilters` never turns it off, and "Clear filters" focuses it. An unstar that the chip hides is handed to `pages/CatalogPage` through a new `useFavourite({ onSaved })` option: once the refetched view no longer shows the Book, a layout effect focuses the next shown Book in sort order, else the previous, else Search titles, and announces one "*Title* is not a favourite. N books match." line.

**Files changed.**
- `frontend/src/lib/catalogFilter.ts` -- `favourites` in `CatalogFilters` and `NO_FILTERS`, `favourite` in `FilterableBook`; `matchesFilters` and `filtersOn` count it.
- `frontend/src/lib/catalogFilter.test.ts` -- starred Books in the shelf; Favourites alone and ANDed with each group, `filtersOn`, `NO_FILTERS`, `liveFilters` keeping it.
- `frontend/src/components/FilterChips.tsx`, `FilterChips.module.css` -- the chip first in the row (`readRef` became `favouritesRef`); its star's size, gold fill and forced colors.
- `frontend/src/lib/useFavourite.ts` -- the `onSaved` option.
- `frontend/src/pages/CatalogPage.tsx` -- `favouritesChipRef` for Clear filters; the pending unstar and its layout effect; `latest` updated in a layout effect.
- `frontend/e2e/favourites-chip.spec.ts` -- the 9 ATDD leaves un-skipped; AC-6 to AC-8 now wait one announce delay after the chip press before pressing the star (`afterCount`, spec-local, built on `afterAnnounceDelay` from `stats.ts`). No assertion changed: every save empties pending announcements (16.1), so a star pressed under 100ms after the chip cancels its "3 books match.", a timing no person produces. AC-1 gained dark and forced-colors steps for the chip star (review patch).
- `frontend/e2e/catalog-filter.spec.ts` (4 focus leaves), `bookcase-details.spec.ts` (Tab order), `catalog-publisher-filter.spec.ts` (row buttons) -- the gate's 16.2 leaves, and no others.
- `_bmad-output/implementation-artifacts/epic-16-context.md` -- recompiled at step 1 (DESIGN.md was newer).
- `_bmad-output/implementation-artifacts/deferred-work.md`, `sprint-status.yaml` -- the two deferrals; 16.2 → `review`.

**Helpers.** Added only the spec-local `afterCount` (no export reads a `pressOnceThen` reader after the announce delay); reused `afterAnnounceDelay`, `systemColor` and `FAVOURITE_DARK`.

**Review findings.** 31 findings: 16 low, 15 false. Patched (all low): the missing-focus-target fallback to Search titles (Edge 4, Edge 9, Blind 4), `cancelCount()` before the combined line (Edge 6), `latest` in a layout effect (Blind 5), comment re-wrap in `catalogFilter.ts` (Blind 13), dark and forced-colors coverage of the chip star (VG gap 2, Intent 3). Deferred: spine drift for `useFavourite`'s `onSaved` (AD-6, AD-7), and a test for the "chip off before the refetch rendered" branch (for `bmad-testarch-automate`). Rejected, with reasons in the triage log: a stuck pending unstar after a failed refetch (Edge 1, Blind 1, Blind 2, VG other: real but needs the local server to fail between a committed write and its refetch, and no fix is a direct correction), the chip-off and double-unstar windows (Edge 2, Edge 3, Blind 3: inside one render), the partial fallback coverage (Intent 2: already the checklist's follow-ups), and the false or spec-edit findings (Intent 1, 4, 5; Edge 5, 7, 8; Blind 6–12).

**Follow-up review recommendation:** false. Patched entries: 0 high, 0 medium, 5 low.

**Verification.** `npm run check` exited 0 before and after the patches (after: check:api with 432 unit tests, check:py 2534 passed, check:e2e 917 passed with none failed or skipped, the 9 new leaves included, check:smoke ok). The implementation agent also ran the five named specs with `--repeat-each=3` (237 passed, none flaky). Matrix audit: every I/O row has a passing leaf (AC-2, AC-3, AC-6 tiles and List, AC-7, AC-8, and `favourite-star.spec.ts` for the chip-off unstar).

**Residual risks.** If the refetch after a successful unstar fails, the pending unstar waits, so the success goes unspoken and a later refetch moves focus and speaks the line late (rejected above as rare). The ATDD checklist's green-phase follow-ups (more fallback branches per view, axe on the chip row, empty states in List and Tiles) are for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
