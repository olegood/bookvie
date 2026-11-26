---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-26'
storyId: 'epic-16-retro-item-107-clear-a-stuck-pending-unstar'
storyKey: 'epic-16-retro-item-107-clear-a-stuck-pending-unstar'
storyFile: '_bmad-output/implementation-artifacts/spec-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md'
generatedTestFiles:
  - 'frontend/e2e/favourites-chip-stuck-unstar.spec.ts (new, describe block "Epic 16 retro item 107 Clear a stuck pending unstar (ATDD)", 5 skipped leaves)'
  - 'frontend/e2e/favourites-shelf.ts (new, the shelf, names and spoken moved out of favourites-chip.spec.ts)'
  - 'frontend/e2e/favourites-chip.spec.ts (imports the moved constants; no leaf changed)'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-epic-16-retro-item-107-clear-a-stuck-pending-unstar.md'
  - '_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md (E16-R1, action item 107)'
  - '_bmad-output/implementation-artifacts/spec-16-2-show-only-my-favourites.md (AC-6 to AC-8, triage log)'
  - '_bmad-output/test-artifacts/atdd-checklist-epic-15-retro-item-105-prune-rawfilters-when-livefilters-drops-a-key.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/pages/CatalogPage.tsx, src/lib/useFavourite.ts, src/lib/catalog.ts (matchCountCopy)'
  - 'frontend/e2e/favourites-chip.spec.ts, catalog-filter.ts, favourite.ts, intents.ts, tiles.ts, bookcase.ts, library.ts, stats.ts, update-notice.ts, catalog-publisher-filter.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: supplied, text: 'Given a pending unstar whose refetch failed, when the person types in Search titles, then every typed character stays in the box, focus stays in it, and no "*Title* is not a favourite." line is spoken, then or after any later refetch.' }
  - { id: AC-2, idSource: supplied, text: 'Given a pending unstar whose refetch failed, when the person changes any filter (Favourites, another chip, Clear filters) or saves a New book, then only that action''s own line is spoken, and the pending unstar never speaks or moves focus afterwards.' }
  - { id: AC-3, idSource: supplied, text: 'Given a pending unstar whose refetch failed, when the person presses another Book''s star or the same star again, then the new press is the only pending unstar, and its refetched render behaves as Story 16.2''s AC-6 and AC-7.' }
  - { id: AC-4, idSource: supplied, text: 'Given a pending unstar, when a refetch finally hides the Book while focus is on a visible control other than the hidden star, then focus stays on that control, and the combined line is spoken once.' }
  - { id: AC-5, idSource: supplied, text: 'Given the whole suite, when npm run check runs, then it passes; favourites-chip.spec.ts AC-1 to AC-9, its other automate leaves and favourite-star.spec.ts pass unchanged, and :791 is the only existing leaf rewritten.' }
---

# ATDD Checklist: Epic 16 retro item 107, clear a stuck pending unstar

## Preflight

- **Branch:** `master`, after the spec commit `112023a`. This run made no commit and changed no git state.
- **Stack:** `fullstack`, auto-detected. Playwright (Chromium only) and pytest are both in place. The fix is client-only (`CatalogPage.tsx`), so every leaf is e2e.
- **Story:** a standalone spec through the story pipeline (its Design Notes `**Pipeline:**` line), status `ready-for-dev`. Its criteria come numbered AC-1 to AC-5, and those ids are used as supplied.
- **Epic gate:** this isn't an epic story, so the spine-drift gate doesn't apply.
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns apply. No Pact. `tea_browser_automation: auto`.
- **What exists today:**
  - `CatalogPage.tsx:199-210`: `onSaved` sets `pendingUnstar` and returns true, so the star's own line is suppressed.
  - `:260-288`: the layout effect. It moves focus and speaks once the Book leaves `shown`, or speaks the plain line once the chip goes off.
  - `sendIntent` resolves `ok` after a failed refetch (`api/intents.ts:49`), so a single 503 on the refetch leaves the pending unstar set.
  - `queryClient.ts`: `retry: false`, `refetchOnWindowFocus: true`.
  - `favourites-chip.spec.ts:763` pins today's chip-off line. The spec calls it `:791`; it sat at `:792` before the split below.

## Generation Mode

**AI generation**, sequential, in this session. There is no API surface, so no worker A. All five leaves share one setup, the stuck unstar from the `favourites-chip.spec.ts:763` leaf, so having one author keeps the helper reuse in view. No recording was needed: every locator already ships.

## Test Strategy

All five leaves are in a new file, `frontend/e2e/favourites-chip-stuck-unstar.spec.ts`, in one describe block. **Why a new file:** with them added, `favourites-chip.spec.ts` reached 1009 lines, and the TEA enforcement hook flags any test file over 1000 (H5). The leaves are a separate subject (retro item 107), so they moved out. 16.2's shelf (`FAVOURITES_SHELF`), the six names, `BY_AUTHOR`, `STARRED` and `spoken` moved to `frontend/e2e/favourites-shelf.ts`, which both specs import. No leaf in `favourites-chip.spec.ts` changed, and it runs the same 16 leaves. They run at 1280×900 in the light theme, in Tiles, on 16.2's `FAVOURITES_SHELF`. Each one starts from `stuckUnstarOfEmma`: Favourites on, then Emma unstarred from her tile, then one 503 on the catalog refetch. In that state Emma is still shown and starred, focus is on her star, and only "3 books match." has been spoken.

| AC | Level | Priority | Leaf | First assertion that can fail (red run) |
|---|---|---|---|---|
| AC-1 | E2E | P0 | `:73` | Click Search titles, then type "Bl" with `pressSequentially`. **Criterion:** the box value is "Bl". Red: it's "B", because the first key hid Emma, the effect focused the Bleak House tile, and the "l" went to its link. After that: focus is in the box, only Bleak House shows, "1 book matches.", and no unstar line, then or after a refetch. |
| AC-2 (chip off) | E2E | P1 | `:97` | Favourites pressed off (`aria-pressed=false`, the shipped Given, which passes). **Criterion:** status "6 books match.". Red: "Emma is not a favourite.". After that: focus is on the chip, and after the next refetch the only line since the press is "6 books match.". This leaf replaces `favourites-chip.spec.ts:763`. |
| AC-2 (another chip) | E2E | P1 | `:121` | Read pressed on, so only Austerlitz shows (the Given, which passes). **Criterion:** Read keeps focus. Red: focus moved to the Austerlitz tile. After that: the only line is "1 book matches.", unchanged after a refetch, with focus still on Read. |
| AC-3 | E2E | P1 | `:146` | Bleak House unstarred while Emma's unstar waits, and its refetch renders. Only Austerlitz shows, it is focused, and one line says "Bleak House is not a favourite. 1 book matches.". **Passes in red, by design.** It guards that dropping the pending unstar at the press keeps 16.2's AC-6 for the new press. |
| AC-4 | E2E | P1 | `:167` | Focus on Sort, then a window-focus refetch hides Emma (Bleak House and Austerlitz show). **Criterion:** Sort keeps focus. Red: focus moved to the Austerlitz tile. After that: the line "Emma is not a favourite. 2 books match." is spoken once. |
| AC-5 | Command | — | none | `npm run check` and the spec's named files. It is a process criterion with no leaf of its own. |

**What the leaves pin (the build's contract):**
- A pending unstar never moves focus off a control the person is on. That covers both an action (typing, a chip press) and a late refetch.
- After a person's action, only that action's line is spoken, never the waiting unstar's line.
- A later refetch never revives the dropped unstar.
- A new star press behaves as 16.2's AC-6.

**Open for the build (not pinned):** whether `press` is wrapped or a hook option is added (the spec prefers wrapping), and whether the `!favouritesOn` branch is removed or kept as a silent guard.

**For the build: `favourites-chip.spec.ts:763` must go.** Its chip-off assertion ("Emma is not a favourite.") contradicts AC-2. Delete it when un-skipping AC-2's chip-off leaf, which keeps its setup. That is the one existing leaf the spec allows to be rewritten.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-2, New book save while waiting:** save a New book with the unstar pending. Only "Added *Title*." is spoken, focus goes to the new Book as today, and nothing more after a refetch.
- [ ] **E2E, AC-2, Clear filters while waiting:** the same as the chip-off leaf, through the Clear filters link (focus goes to Favourites).
- [ ] **E2E, AC-3, the same star again:** while Emma waits, press her star again (it still shows starred), then the refetch renders. The result is a normal 16.2 AC-6 unstar of Emma.
- [ ] **E2E, the popover path:** Catalog bookcase, Emma's unstar pending from her Spine popover, then type in Search titles. Focus stays in the box (covers the wrapped `press` reaching Bookcase).
- [ ] **E2E, List view:** the AC-1 flow in List (title links as focus targets).

## Helper probes

Helpers reused: `test`, `expect`, `seededServer` (fixtures.ts); `favouritesChip`, `chip`, `recordStatus` (catalog-filter.ts); `favouriteStar` (favourite.ts); `SET_FAVOURITE` (intents.ts); `storeTiles`, `tiles`, `tile`, `tileLinks`, `tileNames` (tiles.ts); `search` (bookcase.ts); `sortSelect` (library.ts); `afterAnnounceDelay` (stats.ts); `focusWindow` (update-notice.ts); `FAVOURITES_SHELF`, `STARRED`, `BLEAK_HOUSE`, `AUSTERLITZ`, `spoken` (Story 16.2's, moved unchanged from favourites-chip.spec.ts to favourites-shelf.ts).

Helpers added (all local to the new describe block):
- `stuckUnstarOfEmma(page, url)`: the `favourites-chip.spec.ts:763` leaf's setup as one function, since all five leaves need it. Once `:763` goes, its inline copy goes with it.
- `refetchCatalog(page)`: `focusWindow` plus a wait for a 200 `/api/views/catalog`. `catalog-publisher-filter.spec.ts:692` has a `refetchCatalog(page, status)` local to its describe block, with `bringToFront` for a second context. It can't be imported, and moving it would change another spec's file for no assertion's sake.
- `unstarLines(announced, from)`: the "is not a favourite." lines in the recorder. It filters 16.2's `spoken`.

Shipped numbers: none quoted. The counts come from `FAVOURITES_SHELF` and `matchCountCopy`.

Probe (Chromium, 1280×900, `deviceScaleFactor` 1, light): `TZ=Europe/Madrid npx playwright test e2e/favourites-chip-107-red.probe.spec.ts`, then removed with `rm`.
- **`stuckUnstarOfEmma`, known good:** on the shipped app it returned with Emma still in `STARRED`, her star focused, and only "3 books match." spoken. Passed.
- **`stuckUnstarOfEmma`, refusal:** with a pass-through route registered after the helper's one-time 503, so the refetch succeeds, the helper threw (its `STARRED` check failed with Emma hidden). Passed.
- **`refetchCatalog`:** on the shipped Catalog it resolved after a 200. With a 503 route on the view, it did not resolve within 4 s (refused). Passed.

Render-before-read: all five new leaves were checked.
- Every one-shot `tileNames` read inside a leaf is an `expect.poll`. The one in the helper follows an awaited refetch response and an announce delay, as `:763` does.
- Every `spoken` read follows `afterAnnounceDelay` or a web-first `toHaveText` on the status region.
- No leaf needed a fix.

Storage keys: no new localStorage key.

## TDD Red Phase

- **Leaves:** 5 e2e leaves in `favourites-chip-stuck-unstar.spec.ts`, all `test.skip`, each with a `// Red phase:` reason above it. AC-5 is a command criterion with no leaf.
- **Red run** (2026-11-26, after the probes passed and after the last leaf change): a throwaway un-skipped copy, `e2e/favourites-chip-107-red.probe.spec.ts`, run together with the probes and removed with `rm`.
  - **AC-1** failed at its criterion: `Expected "Bl"`, `Received "B"`.
  - **AC-2 chip off** failed at its criterion: `Expected "6 books match."`, `Received "Emma is not a favourite."`.
  - **AC-2 another chip** failed at its criterion: Read `inactive`.
  - **AC-4** failed at its criterion: Sort `inactive`.
  - **AC-3** passed, as a guard should.
  - Every Given step before those assertions passed.
- **The spec itself:** 16 passed and 5 skipped (`TZ=Europe/Madrid npx playwright test e2e/favourites-chip.spec.ts`, against the current build). `prettier`, `tsc -b` and `oxlint` are clean on it.
- **Red run again after the split:** the new file un-skipped as `e2e/stuck-unstar-red.probe.spec.ts`, then removed with `rm`. The helpers moved without a textual change, but the probe rule voids red results after any helper change, so it was re-run. Same result: AC-1 "B", AC-2 "Emma is not a favourite.", Read `inactive`, Sort `inactive`, and AC-3 passed. Both specs together: 16 passed and 5 skipped.
- **Tree:** `git status` lists no `*.probe.*` file and no throwaway copy. What remains: `frontend/e2e/favourites-chip.spec.ts` (modified, imports only), `favourites-chip-stuck-unstar.spec.ts` and `favourites-shelf.ts` (new), and this checklist (new).

## Next Steps (task-by-task activation)

1. Commit the red phase: `test: add red-phase acceptance tests for clearing a stuck pending unstar (epic 16 retro item 107)`.
2. Run `bmad-build-auto` for this spec:
   - Un-skip the leaves and watch AC-1, both AC-2 leaves and AC-4 fail.
   - Fix `CatalogPage.tsx`.
   - Delete `favourites-chip.spec.ts:763`.
   - Watch all five pass.
3. Run `npm run check` (AC-5).
4. Run `bmad-code-review` in a new session, then `bmad-testarch-automate` for the follow-ups above.

## Implementation Guidance

- **`pages/CatalogPage.tsx`:**
  - Add a `dropPendingUnstar()` that sets `pendingUnstar.current = null`. Call it first in `search`, `changeFilters`, the New book `onSaved`, and a wrapped `favourite.press`.
  - In the unstar effect, move focus only if `document.activeElement` is `body` or no longer visible (`checkVisibility()`). Always speak the combined line.
  - The `!favouritesOn` branch becomes unreachable. Remove it, or make it a silent `pendingUnstar.current = null`.
- **No change** to `useFavourite.ts`'s failure and slot rules, `sendIntent`, `FilterChips.tsx`, tokens or copy.
