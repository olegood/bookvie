---
title: 'Clear a stuck pending unstar, so it never moves focus or speaks later'
type: 'bugfix'
created: '2026-11-26'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-16-2-show-only-my-favourites.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** This is Epic 16 retro item 107 (E16-R1; sprint item `epic-16-retro-item-107-clear-a-stuck-pending-unstar`). Epic 16 counts as accepted only once it lands.

With the Favourites chip on, an unstar hands its line to `pages/CatalogPage`. `onSaved` sets `pendingUnstar`, and a layout effect focuses the next shown Book and speaks "*Title* is not a favourite. N books match." once the refetched view no longer shows the Book. `sendIntent` resolves `ok` even when the refetch after a committed save fails (`api/intents.ts:49`). In that case the Book stays in `shown` and `pendingUnstar` stays set with nothing to clear it. Any later change that drops the Book from `shown` then fires the effect.

The retro's probe (Chromium) showed two cases:
- Typing "Bl" in Search titles left "B" in the box. Focus jumped to the Bleak House tile after the first key, so the "l" went to the tile link.
- Unstarring a second Book overwrote the first pending unstar.

The 16.2 automate leaf `favourites-chip.spec.ts:791` pins the chip-off half of this state as intended behavior. The chip-on half, which steals focus, is neither handled nor tested.

**Approach:** A pending unstar belongs to the press that made it, and only until the person does something else. Drop it whenever the person acts on the Catalog before the refetched view hides the Book: a Search titles change, any filter change (Clear filters included), the next star press, or a New book save. Whatever the person did speaks its own line. Separately, when the effect does run, it moves focus only if the refetched render took focus away. It never moves focus off a control the person is on.

## Boundaries & Constraints

**Always:**
- **Where it is dropped:** in `search`, in `changeFilters` (so the chip, every other chip and both Clear filters drop it), in the New book `onSaved`, and at every star press that goes through Catalog's flow (tile, row and the Catalog bookcase's popover). It is dropped before that handler's own work.
- **Silent drop:** dropping a pending unstar announces nothing. The action that dropped it speaks as it does today: a filter change speaks its count, a search speaks its count after the pause, and a star press speaks its own result.
- **Focus guard:** when the effect runs, it moves focus only if `document.activeElement` is `body` or an element the render hid (`!checkVisibility()`, for the pressed tile or row star). Otherwise it leaves focus where it is and still speaks the combined line.
- **The normal flow is unchanged:** a save whose refetch renders behaves exactly as Story 16.2's AC-6 and AC-7 say. Focus goes to the next shown Book, else the previous, else Search titles, with one combined line.
- **The waiting period stays silent:** an unstar whose refetch failed says nothing while it waits, as the first half of `:791` pins today.
- Format only the files you change, with the project's pinned tools.

**Never:**
- Don't change `sendIntent`, `useIntentRequest` or `useFavourite`'s failure and slot rules (Story 16.1). A failed save behaves exactly as AC-8 says.
- No new copy, token, storage key or UI.
- Don't change the assertions or titles of any existing test, except `favourites-chip.spec.ts:791`, which this spec rewrites (see Tasks).
- No edits to the spine or `README.md`.
- Only desktop Chrome is in scope (AGENTS.md → Supported browser).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Normal unstar | Chip on, unstar Emma, refetch renders | Next shown Book focused; "Emma is not a favourite. N books match." once (unchanged) | — |
| Waiting | Chip on, unstar Emma, the refetch 503s once | Emma shown and starred, focus on her star, nothing spoken | — |
| Search while waiting | Waiting, then type "Bl" in Search titles | Box holds "Bl", focus stays in it; only the search count is spoken after the pause; no "not a favourite" line, then or after any later refetch | — |
| Chip off while waiting | Waiting, then press Favourites | Chip off, focus on it; "6 books match." (the chip's own count); no "not a favourite" line, then or after the next refetch | — |
| Other filter while waiting | Waiting, then press Unread or Clear filters | That action's count only; focus as that action leaves it | — |
| Second star while waiting | Waiting on Emma, unstar Bleak House, refetch renders | Both gone; focus on the next shown Book after Bleak House; "Bleak House is not a favourite. N books match." once; nothing more for Emma | — |
| Same star again while waiting | Waiting on Emma, press Emma's star again (it still shows starred), refetch renders | As a normal unstar of Emma | — |
| Late refetch, focus elsewhere | Waiting, person Tabs to Sort; a window-focus refetch hides Emma | Focus stays on Sort; "Emma is not a favourite. N books match." once | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CatalogPage.tsx`:
  - `:199-210`: `pendingUnstar`, `unstarSaved`, and the `useFavourite({ onSaved })` that sets them.
  - `:260-288`: the unstar layout effect. Its `!favouritesOn` branch exists only for the waiting state; it becomes unreachable once every path that turns the chip off drops the pending first. Remove it and drop `favouritesOn` from the deps, or keep it as a pure no-op guard (`pendingUnstar.current = null; return`) that speaks nothing.
  - `:317-326`: `search`.
  - `:329-335`: `changeFilters`.
  - `:349-355`: the New book `onSaved`, which calls `setFilters(NO_FILTERS)` directly, not through `changeFilters`.
  - The `favourite` flow passed to Bookcase, CatalogList and CatalogTiles.
- `frontend/src/lib/useFavourite.ts:101-103`: `press`. Catalog can drop the pending unstar by wrapping its flow's `press` before it passes the flow on (no hook change), or through a new optional `onPress` in `FavouriteOptions`. Prefer the wrap: it keeps 16.1's hook untouched.
- `frontend/src/pages/Bookcase.tsx`: on Catalog it uses the flow it is given, so a wrapped `press` covers the popover star. Home's own flow is out of scope (no chip, no pending unstar).
- `frontend/e2e/favourites-chip.spec.ts:791-840`: the automate leaf that pins today's chip-off line; rewrite it. `:398-540` (AC-6 to AC-8) and `:674-790` (the automate fallbacks and bookvie-stopped leaf) must pass unchanged.
- `frontend/e2e/favourite.ts`, `catalog-filter.ts`, `stats.ts` (`afterAnnounceDelay`): reuse their helpers (`favouriteStar`, `favouritesChip`, `tiles`, `tileNames`, the status recorder). Don't copy one into the spec (Epic 11 retro item 78).

## Tasks & Acceptance

**Execution:**
- `frontend/src/pages/CatalogPage.tsx`:
  - Add one `dropPendingUnstar()` that sets `pendingUnstar.current = null`. Call it from `search`, `changeFilters`, the New book `onSaved`, and a wrapped `favourite.press`, before each handler's own work.
  - Add the focus guard to the effect.
  - Remove or neutralize the `!favouritesOn` branch.
- `frontend/e2e/favourites-chip.spec.ts:791`: rewrite the leaf. The setup stays: chip on, unstar Emma, one 503 on the catalog refetch, silence while waiting. Then the chip-off press speaks "6 books match." and no "Emma is not a favourite." line, and focus stays on the chip. The next successful refetch speaks nothing more, and focus is still on the chip. Retitle it to say that.
- `frontend/e2e/favourites-chip.spec.ts`: add leaves for the matrix rows:
  - Search while waiting: type "Bl" with `pressSequentially`, then assert the box value "Bl", focus in the box, no "not a favourite" line, and none after a later `focus` refetch.
  - Second star while waiting.
  - Late refetch with focus elsewhere: focus on Sort, then a `focus` event refetch. Focus stays, and the line is spoken once.

  Same seed (`FAVOURITES_SHELF`) and the same 503 route as `:791`.
- `_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md`: nothing. Item 107's status moves to `done` in `sprint-status.yaml` only through `sprint_status.py update --set-action-status` after the code review marks this spec `done`.

**Acceptance Criteria:**
- **AC-1:** Given a pending unstar whose refetch failed, when the person types in Search titles, then every typed character stays in the box, focus stays in it, and no "*Title* is not a favourite." line is spoken, then or after any later refetch.
- **AC-2:** Given a pending unstar whose refetch failed, when the person changes any filter (Favourites, another chip, Clear filters) or saves a New book, then only that action's own line is spoken, and the pending unstar never speaks or moves focus afterwards.
- **AC-3:** Given a pending unstar whose refetch failed, when the person presses another Book's star or the same star again, then the new press is the only pending unstar, and its refetched render behaves as Story 16.2's AC-6 and AC-7.
- **AC-4:** Given a pending unstar, when a refetch finally hides the Book while focus is on a visible control other than the hidden star, then focus stays on that control, and the combined line is spoken once.
- **AC-5:** Given the whole suite, when `npm run check` runs, then it passes. `favourites-chip.spec.ts` AC-1 to AC-9, its other automate leaves and `favourite-star.spec.ts` pass unchanged, and `:791` is the only existing leaf rewritten.

## Spec Change Log

## Review Triage Log

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline"). Commits name `(epic 16 retro item 107)`.
- **Why drop on action rather than on the failed refetch:** the retro's open question had two options. Having the failed refetch clear the pending unstar and speak the plain line needs `sendIntent` to report a failed refetch, and that changes 16.1's shared flow for every intent. Dropping on the person's next action stays inside `CatalogPage`, which AR70 makes the owner of this line. The cost: an unstar whose refetch failed is never spoken with the chip on. The star still shows on until a refetch, and that view then speaks or shows the truth.
- **Why the focus guard:** with the drops in place, the only way the effect still runs late is a refetch nobody pressed for, such as a window-focus refetch. At that moment focus is wherever the person left it. The guard moves focus only when the render took it away (the pressed star hid, or the popover closed and left focus on `body`). That keeps AC-6 and AC-7 intact.
- **Lesson carried from the retro:** the 16.2 triage rejected this state twice as "needs the server to fail in milliseconds". That rarity covers only how the state starts. Once started, it lasted until a later refetch, and the automate step reached it with one 503. When this spec's review rejects something as rare, it should also say what happens after the trigger.
