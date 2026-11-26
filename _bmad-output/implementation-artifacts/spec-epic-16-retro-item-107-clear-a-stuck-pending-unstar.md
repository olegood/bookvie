---
title: 'Clear a stuck pending unstar, so it never moves focus or speaks later'
type: 'bugfix'
created: '2026-11-26'
status: 'done'
baseline_revision: 'f18834625115130afd589da247547fb976823071'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-retro-2026-11-26.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-16-2-show-only-my-favourites.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the spine's catalog filter chips item says CatalogPage moves focus to the next shown Book after an unstar with Favourites on, unconditionally, and names no rule for dropping a pending unstar.
    evidence: |-
      Spine Check, build-auto review of epic 16 retro item 107. CatalogPage now drops a pending unstar silently on a search, a filter change, a star press or a New book save, moves focus only when the render took it away (`focusTakenAway`), and no longer speaks the plain star line when the chip goes off first. The code follows the spec; the spec forbids spine edits.
    location: >-
      frontend/src/pages/CatalogPage.tsx; ARCHITECTURE-SPINE.md AD-6 (catalog filter chips item)
    severity: low
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

### 2026-11-26 — Review pass
- verdicts: 24 findings — high 0, medium 2, low 17, false 5, maybe-false 0
- findings:
  - `[low]` `[patch]` Blind: the comment above the unstar layout effect ends a line in a dangling "If" left from the removed chip-off sentence. Removed it (one group with the next row and Verification "Other" 1).
  - `[low]` `[patch]` Blind: that comment says the layout effect always runs before useSpinePopover's passive fallback, while `focusTakenAway`'s docstring says the fallback can put focus on `main` first. Reworded so both agree: the fallback may already have moved focus to `main`, which the guard counts as taken away.
  - `[false]` `[reject]` Blind: the guard misses the fallback's other target, the shelf list. Disproved: `fallbackTarget()` picks the shelf list only when it has a `tabindex`, and neither shelf `ul` in `Bookcase.tsx:355-376` ever sets one, so the fallback is always `#main`.
  - `[low]` `[reject]` Blind: the `#main` clause departs from the Boundaries' guard text, and a person who used the skip link (focus on `main`) would have focus moved by a late refetch. Real, but it needs a stuck unstar, then the skip link, then an unpressed refetch. Telling a skip-link focus from a fallback focus would add another guard. The clause follows the Approach ("never moves focus off a control the person is on"; `main` has `tabindex=-1`, so it isn't one) and the Always rule that the normal flow stays unchanged: without it, `favourites-chip.spec.ts:685` (AC-7) failed 1 run in 15, and with it 45 out of 45 passed (one group with Edge 2, Edge 3, Verification "Other" 2 and Intent 2).
  - `[low]` `[reject]` Blind: the spec's Tasks and AC-5 say to rewrite `:791` in place, but the leaf was deleted and replaced in the new file, and the spec wasn't updated. The ATDD step (commit `f188346`, before this build) made that split to keep `favourites-chip.spec.ts` under 1000 lines, and the replacement keeps every assertion. The only fix is to edit this build's spec, which is rejected by rule (one group with Edge 4 and Intent 3).
  - `[false]` `[reject]` Blind: the `:791` replacement may have dropped the old leaf's `tileLinks` count of 6 and Emma's `aria-pressed="false"` check. Disproved: `favourites-chip-stuck-unstar.spec.ts:110` and `:113` keep both.
  - `[low]` `[reject]` Blind: no leaf covers the New book save drop or Clear filters. The New book save sets `NO_FILTERS`, so Emma stays shown and every later action that could hide her drops the pending unstar itself; removing that drop has no effect anyone can observe (Verification layer, same finding). Clear filters goes through `changeFilters`, whose drop the "another chip" leaf proves. Unlikely to regress unseen, and the leaves would add setup for little (one group with Edge 5).
  - `[medium]` `[patch]` Blind: the star-press drop is tested only from a tile. Grouped with Verification 1: no leaf fails if the drop in the wrapped `press` is removed. Fixed by adding a leaf for a failed star press while an unstar waits.
  - `[false]` `[reject]` Blind: the focus guard's new branches have no direct tests. Disproved: the hidden-element branch is the normal AC-6 flow (`favourites-chip.spec.ts:370`, the pressed tile star hides), the `#main` branch is AC-7's last-spine case (`:685`, which failed 1 in 15 without it), and AC-4 covers the case where focus stays.
  - `[low]` `[reject]` Blind: having `starFlow` and the wrapped `favourite` both in scope invites passing the wrong one to a view. No caller does, all three views get `favourite` (`CatalogPage.tsx` Bookcase, CatalogList and CatalogTiles props), and the new failed-press leaf would catch a swap. A cosmetic rename isn't worth it.
  - `[false]` `[reject]` Blind: Sort and the view toggle don't drop the pending unstar. That is correct: neither changes `shown`, so neither can fire the effect, and the matrix's "Late refetch, focus elsewhere" row needs moving to Sort not to drop it (AC-4) (one group with Intent 4).
  - `[low]` `[reject]` Edge: a search, filter change or star press made while the unstar's save is still in flight finds nothing to drop, and the later `onSaved` sets the pending unstar anyway. Traced: if the refetch then hides the Book, the guard keeps focus on the control the person is on, and one combined line, still true, replaces a waiting search count. The effect clears the pending unstar in that same run, so nothing is left over. The person would have to act within a localhost save's round trip, and the fix needs a press-sequence ref guard.
  - `[low]` `[reject]` Edge: the `#main` clause moves focus off `main` reached through the skip link. Same group as Blind 4.
  - `[low]` `[reject]` Edge (claim): the guard also counts `null` and `#main`, beyond the spec's text. Same group as Blind 4.
  - `[low]` `[reject]` Edge (claim): `:791` was deleted, not rewritten. Same group as Blind 5.
  - `[low]` `[reject]` Edge (claim): no leaf covers the New book save, Clear filters or popover-star drops. Same group as Blind 7; the popover star shares the one wrapped `press` that the new leaf pins.
  - `[medium]` `[patch]` Verification 1 (gap, pre-verified): removing `dropPendingUnstar()` from the wrapped `press` fails no test, because every press in the leaves succeeds and `onSaved` overwrites the pending unstar. Added a leaf in which a star press fails while an unstar waits, then a refetch hides the waiting Book: no "not a favourite" line, and focus stays on the pressed star.
  - `[low]` `[patch]` Verification "Other" 1: the dangling "If". Same group as Blind 1.
  - `[low]` `[reject]` Verification "Other" 2: the `#main` clause isn't in the spec's guard text. Same group as Blind 4.
  - `[low]` `[reject]` Intent: the tests run only on Tiles; List-row and popover star presses go untested. All three views get the same wrapped `favourite` object, so no view has its own drop path to break. Leaves for each view would repeat the same assertion.
  - `[low]` `[reject]` Intent: the guard takes the Approach's broader reading (`#main`, `null`), not the Boundaries' narrow list. Same group as Blind 4.
  - `[low]` `[reject]` Intent: `:791` is deleted and replaced rather than rewritten in place. Same group as Blind 5.
  - `[false]` `[reject]` Intent: Sort and the view switch might be expected to drop the pending unstar. Same group as Blind 11.
  - `[low]` `[defer]` Spine: spine drift (AD-6). The catalog filter chips item describes the old focus move with no conditions and no drop rule. The code follows the spec, and the spec forbids spine edits. Added to `deferred` and `deferred-work.md`.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline"). Commits name `(epic 16 retro item 107)`.
- **Why drop on action rather than on the failed refetch:** the retro's open question had two options. Having the failed refetch clear the pending unstar and speak the plain line needs `sendIntent` to report a failed refetch, and that changes 16.1's shared flow for every intent. Dropping on the person's next action stays inside `CatalogPage`, which AR70 makes the owner of this line. The cost: an unstar whose refetch failed is never spoken with the chip on. The star still shows on until a refetch, and that view then speaks or shows the truth.
- **Why the focus guard:** with the drops in place, the only way the effect still runs late is a refetch nobody pressed for, such as a window-focus refetch. At that moment focus is wherever the person left it. The guard moves focus only when the render took it away (the pressed star hid, or the popover closed and left focus on `body`). That keeps AC-6 and AC-7 intact.
- **Lesson carried from the retro:** the 16.2 triage rejected this state twice as "needs the server to fail in milliseconds". That rarity covers only how the state starts. Once started, it lasted until a later refetch, and the automate step reached it with one 503. When this spec's review rejects something as rare, it should also say what happens after the trigger.

## Auto Run Result

Status: in-review

**Summary.** `pages/CatalogPage` now drops a pending unstar, silently, whenever the person acts on the Catalog before the refetched view hides the Book: a Search titles change, any filter change (every chip and both Clear filters, through `changeFilters`), a New book save, and every star press through Catalog's flow (a wrapped `favourite.press`, so tile, row and the Bookcase popover all get it; `useFavourite` is untouched). The unstar layout effect moves focus only when `focusTakenAway()` is true (focus on `body`, `#main` or an element the render hid), and it always speaks the combined line. The `!favouritesOn` branch, which spoke the plain star line, is gone.

**Files changed:**
- `frontend/src/pages/CatalogPage.tsx`: `dropPendingUnstar`, the wrapped star flow, `focusTakenAway`, the guarded focus move, and the removed chip-off branch.
- `frontend/e2e/favourites-chip-stuck-unstar.spec.ts`: un-skipped the 5 ATDD leaves (comments only, no assertion or title changes), and added "same star again" (matrix row) and "a star press whose save fails" (review patch).
- `frontend/e2e/favourites-chip.spec.ts`: deleted the old `:791` leaf. As the ATDD checklist planned, its rewrite is the AC-2 chip-off leaf in the new file, which keeps all its assertions.
- `_bmad-output/implementation-artifacts/deferred-work.md`: one spine drift (AD-6) entry.

**Deviation from the spec's Boundaries text.** The focus guard also counts `#main` (and a `null` active element) as focus taken away. With only `body` or a hidden element, `favourites-chip.spec.ts:685` (16.2 AC-7, unstar from the only spine's popover) failed 1 run in 15. Sometimes useSpinePopover's passive fallback moves focus to `#main` before the layout effect runs, so the guard saw a visible element and kept focus there. Without the guard the test passed 30 out of 30, and with the `#main` clause 45 out of 45. This keeps the Always rule that the normal flow is unchanged, and the Approach's "never moves focus off a control the person is on" (`main` has `tabindex=-1`).

**Review findings.** 24 findings: medium 2, low 17, false 5.
- **Patched (low 3, medium 2, in 2 groups):**
  - Fixed the comment above the unstar effect: removed the dangling "If" and made its ordering claim agree with `focusTakenAway`.
  - Added a leaf for a failed star press while an unstar waits. Before it, removing the drop from `press` failed no test; the agent's probe confirmed the leaf fails without the drop.
- **Deferred (1):** spine drift (AD-6).
- **Rejected:** each with its reason in the Review Triage Log. In short:
  - The `#main` clause and the skip link: rare, and a fix needs another guard.
  - `:791` moved rather than rewritten: the ATDD step's choice, and the fix would edit the spec.
  - New book and Clear filters leaves: nothing observable to catch.
  - The race with a save still in flight: one true line, nothing left pending, and a fix needs a sequence guard.
  - List and popover star leaves: all three views share one wrapped flow.
  - Naming of `starFlow`: cosmetic.
  - Rejected as false: shelf-list fallback, dropped assertions, untested guard branches, Sort and view toggle.

**Follow-up review recommended:** false. One medium entry and one low entry were patched, and none was high.

**Verification:**
- `npm run check` from the repo root: exit 0 after the patches (check:api, check:py, 930 e2e passed, smoke).
- Before the patches, one full run failed AC-7 `:685`. That failure led to the `#main` clause, and the next full run passed (929).
- `favourites-chip-stuck-unstar.spec.ts`, `favourites-chip.spec.ts` and `favourite-star.spec.ts` with `--repeat-each=3`: 105 passed.
- Matrix audit: every row has a passing leaf. Normal unstar: `favourites-chip.spec.ts:370`. Waiting: `stuckUnstarOfEmma`'s assertions. The other rows: the stuck-unstar leaves for search, chip off, another chip, second star, same star again, and late refetch.

**Helpers:** none added. The new leaves reuse the ATDD's spec-local helpers and `routeCouldntSave` from `favourite.ts`.

**Residual risks:**
- The New book save and Clear filters drops have no leaf of their own.
- List-row and popover star presses while an unstar waits are untested; they share the tile's wrapped `press`.
- `bmad-testarch-automate` can cover these.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").

### Review Findings

Code review, 2026-11-26, a new session (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check). 15 entries after grouping repeats: medium 1, low 9, false 5.

- [x] [Review][Patch] The `#main` clause of `focusTakenAway` has no deterministic leaf: only `favourites-chip.spec.ts:685` (AC-7) reaches it, when useSpinePopover's fallback wins a race (1 run in 15 by the build's record), so deleting the clause would pass the checks most runs and ship an intermittent AC-7 focus regression. Add a leaf: a stuck unstar of Emma, focus on `#main`, a refetch hides her, focus goes to the Austerlitz tile and the combined line is spoken once (Verification Gap, pre-verified; Blind Hunter) [frontend/e2e/favourites-chip-stuck-unstar.spec.ts:245]
- [x] [Review][Patch] The failed-press leaf's comment says that without the drop the next refetch would "move focus". It wouldn't: focus is on the visible Bleak House star, so `focusTakenAway()` is false. Only the `unstarLines` assertion guards the drop; say so (Edge Case Hunter, Blind Hunter) [frontend/e2e/favourites-chip-stuck-unstar.spec.ts:245]
- [x] [Review][Patch] The item 107 entry in `deferred-work.md` doesn't say that the Story 16.2 entry's `resolved:` line above it now cites a deleted leaf (`favourites-chip.spec.ts:791`) and a deleted branch (`!favouritesOn`); and its "with no conditions" overstates the spine, which does condition the move on the unstar hiding the Book (Blind Hunter, Acceptance Auditor, Spine Check) [_bmad-output/implementation-artifacts/deferred-work.md:1886]
- [x] [Review][Defer] Spine drift (AD-6), reconciled before the next epic: the catalog filter chips item names no focus guard and no drop rule [frontend/src/pages/CatalogPage.tsx] — deferred: already recorded by the build at `deferred-work.md:1886` and in this spec's `deferred`; not duplicated (Spine Check)

**Rejected:**
- `false` Blind: the Auto Run Result contradicts itself ("low 3, medium 2, in 2 groups" vs "one medium entry and one low entry"). Both count the same two groups: Blind 8 + Verification 1 (medium) and Blind 1 + Blind 2 + Verification "Other" 1 (low).
- `false` Blind: the failed-press leaf would pass if the wrapped `press` dropped the pending unstar and then swallowed the press. It awaits the `set-favourite` 503 response, which a swallowed press never sends.
- `false` Blind: the `!favouritesOn` branch removed outright leaves a stale pending unstar on a future chip-off path. No path turns the chip off without `changeFilters` today: the render-time `setFilters` (`CatalogPage.tsx:191`) only prunes language, tag and publisher keys, and the New book save drops first. The Code Map allowed removal.
- `false` Blind: the describe block's "(ATDD)" label is out of date. Every ATDD-born spec keeps it after the build (`bookcase.spec.ts:39`, `card-note-boxes.spec.ts:70` and others).
- `false` Auditor/Blind: the Spec Change Log should record the `#main`/`null` guard and the `:791` move. Real gaps between text and code, but the only fix edits the spec under review (rejected by rule); the Auto Run Result's "Deviation" note and the build's triage log already record both.
- `low` Blind: `document.getElementById('main')` duplicates useSpinePopover's fallback id. A rename would also break the new `#main` leaf's locator, so it wouldn't go unseen; a shared constant adds surface for little.
- `low` Blind/Auditor: no leaf for Clear filters or a New book save while an unstar waits. Clear filters is `changeFilters(NO_FILTERS)` (`CatalogPage.tsx:367`), whose drop the other-chip leaf pins; the New book drop has nothing observable. Left to `bmad-testarch-automate`.
- `low` Blind/Auditor: a search or filter change made while the unstar's save is still in flight finds nothing to drop. After that trigger: the effect speaks "Emma is not a favourite. N books match." where N is the search's own count, focus stays in the box (the guard), and nothing is left pending. Needs an action within a localhost round trip; a fix needs a sequence guard.
- `low` Auditor: the star-press drop is tested only from a tile. All three views get the one wrapped `favourite` object.
- `low` Edge: Bookcase view, focus on the waiting Book's spine (popover closed), then a late refetch hides it. Bookcase's hidden-spine effect (`Bookcase.tsx:194-201`) moves focus to the nearest visible spine (previous on a tie) first, so the guard keeps it there rather than on the next shown Book. After the trigger, focus is on a neighbouring spine by Bookcase's own rule, one line is spoken and nothing stays pending. It needs a failed refetch, the spine focused and an unprompted refetch; a fix needs a pre-render record of focus.
- `low` Edge: the commit message says a stuck unstar "never steals focus or speaks later", but AC-4 speaks it after a late refetch. The commit can't change, and the spec's AC-4 states the actual rule.

**Patches applied (2026-11-26):** the `#main` leaf (`favourites-chip-stuck-unstar.spec.ts`, "AC-4 … while focus is on main"; a probe that deleted the clause made it fail at its `toBeFocused`, and with the clause back it passed 5 of 5), the failed-press leaf's comment, and the item 107 entry in `deferred-work.md`.

**Full check after the last patch:** 2026-11-26, `npm run check` from the repo root, exit 0: pytest 2534 passed, unit 432 passed, e2e 931 passed, smoke ok.
