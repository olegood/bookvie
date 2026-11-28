---
title: 'Rescue focus from any Stats control a dropped period removes, and pin the held-view paths'
type: 'bugfix'
created: '2026-11-28'
status: 'done'
baseline_commit: '3791c4bf99afe71969351a649c724214424f6395'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-retro-2026-11-27.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-17-2-choose-a-month-or-year-by-its-bar.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** This is Epic 17 retro item 112 (E17-R1, E17-R2, E17-V1, E17-V2, E17-V3; sprint item `epic-17-retro-item-112-rescue-focus-from-any-removed-stats-control`). It is due before Epic 18.

Story 17.2's focus rescue (AC-11) watches only the bar buttons. `lostBar` is set only from `StatsBars`' ref cleanup. When a refetch empties the selected bar, the settled drop (`StatsPage.tsx:215-220`) also removes Show the whole range and the narrowed rows of `StatsFinishedList`. Focus on either then falls to `body` (E17-R1).

The status region also keeps "Finished in March 2026: 3 books." after that silent drop, though the list has widened (E17-R2).

Some held-view paths have no test (E17-V1):
- No leaf focuses a bar through the midnight hold. Removing the `|| selectionKey(shownSelection) === committedKey` clause (`:204`), or clearing `lostBar` before the `settled` check (`:224-230`), passes every test. This is the follow-up risk the 17.2 build flagged.
- With a bar focused, a failed new-day fetch drops the held data (`api/views.ts:65-76`). The chart unmounts, focus falls to `body`, and a later recovery then moves focus with no action from the person (E17-V2).

Finally, the arrival rule for keeping `period` (`:86-93`) is inline with one e2e leaf, and the nav link is never pressed from an address with `period` (E17-V3).

**Approach:**
- Extend the rescue from bars to every Stats control the drop removes. `StatsFinishedList` reports a focused Show the whole range or row link while it leaves, as `StatsBars` does, and the page's one rescue effect moves that focus to the chart's Tab stop, else the `h1`.
- On a failed fetch, the rescue runs at once: focus goes to the `h1`, and the lost marker is cleared, so recovery never moves focus (Oleg, 2026-11-27).
- A drop after a period was shown clears the status region only.
- Extract the arrival rule as `arrivalSearch` in `lib/stats`.
- Pin every path with an e2e leaf.

## Boundaries & Constraints

**Always:**
- **One rescue path:** the existing effect, with `lostBar` generalized (for example `lostFocus: boolean`), handles bars, Show the whole range and rows alike. It acts when the view is `settled`, or at once when `stats.status === 'failed'`. It clears the marker first, and it moves focus only when `document.activeElement` is `body` or `null`. The target is `chart.current?.focusStop()`, else the page's `h1`.
- **A whole-range row too (Oleg, 2026-11-28, option a):** a focused row link that any settled refetch removes is rescued the same way, with or without a selected bar. `StatsFinishedList` reports every row it removes while that row has focus.
- **Failed fetch with a focused bar (settled for this spec):** focus moves to the `h1` at once, and the marker is cleared, so the later recovery never moves focus. The alert shows "Couldn't load…" as today.
- **Status clear:** on a settled drop of `period` in a body where `selected` was non-null in an earlier render (the person saw the period), clear the `status` region only, and cancel a status line still waiting for its tick. The `alert` region and its pending text are untouched. An arrival drop (a bad or empty `period` in the address) clears nothing and says nothing (AC-9 unchanged). Add a status-only clear to `lib/announce.ts`, since `clearAnnouncements` empties both regions.
- **`arrivalSearch(params): string | null`** in `lib/stats.ts`: returns exactly what `StatsPage.tsx:89-93` computes today. `StatsPage` calls it, and its behavior is unchanged.
- **Unchanged:** a person's own press, Show the whole range (which focuses the bar first), AC-1 to AC-13 of Story 17.2 and all of Story 17.1's behavior. No new copy, token, storage key or UI.
- Format only the files you change, with the project's pinned tools.

**Never:**
- Don't change `useStatsView`, `toViewState` or `keepPreviousData`.
- Don't move focus off a control the person is on: never off anything but `body` or `null`.
- Don't edit an existing leaf's assertions or titles. New leaves only.
- No edits to the spine or `README.md`. Spine drift goes to `deferred-work.md` (AGENTS.md → Architecture spine).
- Only desktop Chrome is in scope (AGENTS.md → Supported browser).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Show the whole range loses its bar | Feb–Apr, February selected (1 finish), focus on Show the whole range; a refetch empties February | Address loses `period`; focus on the chart's Tab stop (April); status empty | — |
| A narrowed row goes | Same, focus on February's one row link | As above: focus on April | — |
| Last bar goes, from a row | This month, October selected (only bar), focus on its row; the refetch empties it | Focus on the `h1` | — |
| Whole-range row goes | Feb–Apr, no bar selected, focus on Kindred's row; a refetch removes that finish | Focus on the chart's Tab stop (April), else the `h1`; nothing spoken | — |
| Drop after a press | Feb–Apr; press February ("Finished in February 2026: 1 book." spoken); a refetch empties February | Status region empty after the drop; focus on April | — |
| Midnight, bar focused | This month, October selected and focused; a window-focus fetch for the new day succeeds | October stays pressed and focused; address unchanged; status empty | — |
| Midnight fetch fails | As above, but the new-day fetch 503s | Alert "Couldn't load…"; focus on the `h1` at once | A later successful refetch leaves focus on the `h1` |
| Nav from a period | `?range=thisYear&period=2026-03`; press the Stats nav link | Plain `/stats`, no history growth, no pressed bar, `h1` focused, nothing spoken | — |

</frozen-after-approval>

## Code Map

- `frontend/src/pages/StatsPage.tsx`:
  - `:86-98` the arrival rule, which `arrivalSearch` replaces;
  - `:204-207` `interactive`, `selected` and `settled`;
  - `:210-230` `lostBar`, the drop and the rescue effect;
  - `:313-321` the `StatsBars` and `StatsFinishedList` props.
  - `tryAgain` (`:192-196`) moves focus to `main` before the retry; leave it.
- `frontend/src/components/StatsBars.tsx:62-80`: the per-period ref callback whose cleanup reports a focused button "before the node leaves the document". Copy that pattern into `StatsFinishedList` (an `onFocusLost?: () => void` prop on the Show the whole range button and each row `Link`). The callbacks must be stable, so a re-render doesn't detach and re-attach them.
- `frontend/src/components/StatsFinishedList.tsx`: Show the whole range (`:32-36`), `FinishRow`'s `Link` (`:52`), and `return null` with no finishes (`:27`).
- `frontend/src/lib/announce.ts:84-111`: `clearAnnouncements` and `announce`. A status-only clear has to know which region the pending timer is for, so track its kind. Add unit cases in `announce.test.ts`.
- `frontend/src/lib/stats.ts:148-180` (`parseStatsAddress`, `statsSearch`, `addressNeedsFallback`), `:260` (`parsePeriod`); `stats.test.ts:171-230` has the `address(...)` helper to reuse.
- `frontend/src/components/AppShell.tsx:20-27`: `StatsNavLink` (`replace` when already on `/stats`).
- `frontend/e2e/stats-bars-select.spec.ts`:
  - `:673-768` the AC-11 leaves: their refetch route and `window` `focus` event are the setup to copy;
  - `:769` the failed refetch;
  - `:802-826` AC-12 midnight (`page.clock.setFixedTime`, `statsRequestFor`).
  - All of them must pass unchanged.
- `frontend/e2e/stats-bars-select-automate.spec.ts:360-387`: the New Year hold. It stays unchanged.
- `frontend/e2e/stats.ts`: `AXE_TAGS`, `statsAxeViolations` and `afterAnnounceDelay`. If the new leaves go in a new file, move each helper both files need into `stats.ts`, never copy it (Epic 11 retro item 78).

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/stats.ts`, `stats.test.ts` -- add `arrivalSearch` and cases for: no range keys (`null`), a canonical address (`null`), a bad range with `period` (This year, no `period`), a reversed Custom with `period` (in order, `period` kept), a half Custom, and a duplicate `range` -- unit-pin E17-V3.
- [x] `frontend/src/lib/announce.ts`, `announce.test.ts` -- add the status-only clear. Cases: it empties `status` and keeps `alert`; it cancels a pending status line; it keeps a pending alert -- E17-R2.
- [x] `frontend/src/components/StatsFinishedList.tsx` -- `onFocusLost` reported from the Show the whole range button and each row link, through stable ref callbacks -- E17-R1.
- [x] `frontend/src/pages/StatsPage.tsx` -- call `arrivalSearch`. Generalize `lostBar` and wire it to both components. Run the rescue on `settled` or `failed`. Clear status on a drop after a shown period -- E17-R1, R2, V2.
- [x] `frontend/e2e/stats-bars-select.spec.ts` (or a new `stats-bars-focus.spec.ts`, see Code Map) -- one leaf per matrix row -- E17-R1, V1, V2, V3.
- [x] `_bmad-output/implementation-artifacts/spec-17-2-choose-a-month-or-year-by-its-bar.md` -- set `followup_review_recommended: false`, and add a `### Review Findings` line `Follow-up risk: the lostBar focus effect through a held view; covered by <file:line>; added, epic 17 retro item 112`. This spec's code review writes it when it marks this spec `done` (the "follow-up risk" fact in `_bmad/custom/bmad-code-review.toml`).

**Acceptance Criteria:**
- **AC-1:** Given each matrix row, when its leaf runs in Chromium, then the stated focus, address, status and alert hold.
- **AC-2:** Given the midnight-focused leaf, when the `:204` same-selection clause is removed, or `lostBar` is cleared before the `settled` check, then that leaf fails. Each edit is checked and reverted by hand, with no git command (AGENTS.md "Story pipeline").
- **AC-3:** Given the midnight-fetch-fails leaf, when the later refetch succeeds, then focus is still on the `h1`, and only the person's own action moves it.
- **AC-4:** Given the whole suite, when `npm run check` runs, then it passes, and every existing Stats leaf (`stats.spec.ts`, `stats-bars.spec.ts`, `stats-finished.spec.ts`, `stats-bars-select*.spec.ts`) passes unchanged.

### Review Findings

Code review of `cf537cf`, 2026-11-28, in a new session (bmad-code-review). Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check. 24 findings (Blind 13, Auditor 5, Spine 5, Edge 1, Verification Gap none), grouped into 2 decision-needed, 1 patch and 1 defer; 17 rejected.

Probes this session (each an edit to `StatsPage.tsx` reverted by hand, a rebuild, then a Chromium run; `git status` clean after):
- With the `selectionKey(shownSelection) === committedKey` clause removed from `interactive`, `stats-bars-focus.spec.ts:204` (the midnight-focused leaf) fails and the other 7 pass.
- With `lostFocus` cleared before the `settled || failed` check, all 81 Stats leaves pass. No reachable path tells the two apart. Back and Forward get a fresh `StatsBody` (keyed by `useNavigatedHere`'s key, `StatsPage.tsx:51`), so a bar a Back leaves takes its marker with it. A range change or a Custom date runs with focus on the picker or a field.

- [x] [Review][Decision] AC-2's second mutation can't fail a leaf — resolved (Oleg, 2026-11-28): accepted as an equivalent mutant; AC-2 stays as frozen, and probe 2 above is the record. The marker cleared before the `settled || failed` check is an equivalent mutant (probe above). AC-2 as frozen says a leaf fails. Oleg either accepts the equivalent mutant (recorded here, AC-2 unchanged) or renegotiates AC-2.
- [x] [Review][Decision] The ATDD step was skipped — resolved (Oleg, 2026-11-28): waived for this spec; no retro entry. Design Notes' Pipeline line and AGENTS.md "Story pipeline" ("Don't skip or merge a step") name a separate `bmad-testarch-atdd` step. This build ran `bmad-build` with its own red-first leaves and no ATDD session. "Approve and continue" covers the switch to `bmad-build`, not dropping ATDD. Oleg either waives the step for this spec or sends it to the retro.
- [x] [Review][Patch] Two "nothing spoken" leaves never check the alert region (matrix rows "Whole-range row goes" and "Nav from a period") [frontend/e2e/stats-bars-focus.spec.ts:175, :310] — fixed: both leaves now also assert `page.getByRole('alert')` is empty after the announce delay
- [x] [Review][Defer] Spine drift (AD-7, "App info is an ordinary view", the update notice): `clearStatus` on a drop after a shown period cancels a pending update notice, or empties a set one, in the status region. The spine names only "another message is still waiting" as a case where the notice isn't spoken [frontend/src/lib/announce.ts:98] — deferred: spine drift, reconciled before the next epic. `announce()` already did the same through `clearAnnouncements` before this change.

- 2026-11-28, after the last patch: `npm run check` exit 0. pytest 2538 passed, unit 466, e2e 987, smoke ok.
- Follow-up risk (spec-17-2): the lostBar focus effect through a held view; covered by frontend/e2e/stats-bars-focus.spec.ts:204; existing, failed with the same-selection clause removed (probe 1). spec-17-2's `followup_review_recommended` is now `false`.

Rejected:
- `false` Blind 2: the spec-17-2 record would claim the whole risk is covered. The record isn't written yet, and this review writes it with both halves (the clause is covered; clearing order is an equivalent mutant).
- `low` Blind 4: the Intent and AC-2 line numbers predate the change. The fix edits this spec. The probes above name the code by symbol.
- `low` Blind 5: the title and Intent say "a dropped period" while option a widened it to any settled refetch. The fix edits this spec, and the Always list records option a.
- `low` Blind 6: no new leaf checks that the rescue leaves focus on a control the person moved to. A row reports only when it holds focus as it leaves, and the rescue runs in the same commit (settled or failed), so nothing can focus in between. The guard is shared with the bar path.
- `false` Blind 8: the failed-fetch leaf doesn't pin "at once". It asserts the `h1` (`:272`) before it un-routes the server (`:275`), so a rescue that waited for the recovery would fail it. Verification Gap traced the same.
- `false` Blind 9: `arrivalSearch` has no case for a canonical range with a malformed `period`. `addressNeedsFallback` reads only the range keys, and the e2e arrival leaf covers `period=spring` (`stats-bars-select.spec.ts:567`).
- `low` Blind 10: the last-row leaf inlines its own route stub. It's test duplication with no named harm, and the fix is a new helper.
- `false` Blind 11: the describe title lacks a separator and the header repeats itself. Every Stats spec titles its describe this way ("Story 17.2 Choose a month…"), and the two comments say different things (where the file came from, what it pins).
- `false` Blind 12: a stale `lostFocus` if the list unmounts while Stats stays mounted. Today the list unmounts only on an empty settled view (rescued), on a failure (rescued at once), or with the body itself.
- `low` Blind 13: the Try-again deferral has no owner. No `deferred-work.md` entry names one; the retro reads the file.
- `low` Edge 1: a refetch that reorders kept rows moves the focused `li` with `insertBefore`, and Chromium drops focus with no ref cleanup. It needs another context to change a finish date while focus sits on a row, and the fix adds a `focusout` guard.
- `false` Auditor 3: the spec-17-2 task is open. By design: this review writes it.
- `false` Auditor 4: a row reports from its `li`, not the `Link`. Implementation Notes give the reason (`Link`'s `mergeRefs` drops a returned cleanup), and the `li` holds only the link.
- `false` Spine 1–3: AD-6 drift for the wider rescue, the failed-fetch rescue and the status clear. Already in `deferred-work.md` from the build's review; no duplicate entry.
- `false` Spine 5: deferred entry 2 says "focusing the h1", but a failed refetch with its kept copy would focus the chart stop. A failed refetch that keeps its copy isn't `failed` (`settled` counts it). When `stats.status === 'failed'`, `shown` is null and the chart is unmounted, so the target is the `h1`.

## Implementation Notes

- 2026-11-28, build. Red first: the unit cases failed on the missing exports, and six of the eight new e2e leaves failed against the unchanged code (the midnight-focused and nav-link leaves pinned behavior that already held). All eight pass after the change.
- The new leaves are a new `describe` at the end of `stats-bars-select.spec.ts`, so no helper moved. Its local helpers (`removeFebruaryFinish`, `refetchOnFocus`, `nextStatsResponse`, `H1`) are used by this file only.
- `lostBar` is now `lostFocus: boolean`, set through one stable `loseFocus` callback passed to both components.
- A row reports through a stable ref on its `li`, which checks `node.contains(document.activeElement)`, not through the `Link`. react-router's `Link` merges refs with `mergeRefs`, which builds a new callback on every render and drops a returned cleanup. A ref on the `Link` never reported the removal (probed: the three row leaves stayed red), and its detach and re-attach on each render would report false losses.
- `clearStatus` in `lib/announce.ts` tracks the pending message's kind (`pendingKind`). It cancels only a pending status line.
- AC-2 probes, each an edit reverted by hand and then a rebuild:
  - With the `:204` same-selection clause removed, the midnight-focused leaf fails: October isn't a button during the hold.
  - With the marker cleared before the `settled || failed` check, every Stats leaf still passes (81). This is an equivalent mutant on every path a person can reach. With the same-selection clause in place, no control leaves in a render that is neither settled nor failed: a range change's hold removes bars and Show the whole range only while focus is on the picker or a date field, and a failed fetch now runs the rescue in the same commit. The midnight leaf can catch it only together with the first mutation.
- 2026-11-28, after the build: the TEA stop hook flagged `stats-bars-select.spec.ts` at 1,135 lines (H5, limit 1000). The eight new leaves moved, unchanged, to `frontend/e2e/stats-bars-focus.spec.ts` with their four local helpers. They use no local constant of the old file, so no helper moved to `stats.ts`. The build had added the `Page` and `COULDNT_LOAD` imports to `stats-bars-select.spec.ts`; these are gone, so that file is byte for byte its baseline again. Both files pass, 26 leaves.

## Spec Change Log

## Review Triage Log

### 2026-11-28 — Review pass (bmad-build step-04)
- verdicts: 24 findings — high 0, medium 0, low 15, false 9, maybe-false 0
- findings:
  - `[low]` `[reject]` Blind 1 + Verification "Other" 1 + Edge 5: AC-2's second mutation (the marker cleared before the `settled || failed` check) fails no leaf. Confirmed by the build's probe and traced by two layers: with the same-selection clause in place, no render removes a focused control while the view is neither settled nor failed, so the mutant is equivalent and no leaf can catch it. The only fix is to amend AC-2 in this spec, which is rejected by rule. Raised to Oleg in the completion summary.
  - `[low]` `[reject]` Blind 2: the Pipeline line names ATDD and `bmad-build-auto`, but this build ran in `bmad-build` with no ATDD session. That was Oleg's explicit choice ("approve and continue", 2026-11-28), recorded in Design Notes. The fix is a spec edit, so it is rejected, and raised to Oleg.
  - `[low]` `[reject]` Blind 3 + Edge 3: the `refFor` callback map in `StatsFinishedList` keeps one entry for every reading shown in the body. That is bounded by the library's finishes and gone on a remount (`StatsBars`' map keyed by period grows the same way across ranges). It's unlikely to matter, and pruning needs extra cleanup logic.
  - `[false]` `[reject]` Blind 4: `shownPeriod` is never reset, so a drop could cancel a new range's count line. Disproved: every range change writes the address without `period` (`write(next)`), so `hasPeriod` is false and no drop runs after one. Back and Forward remount the body.
  - `[low]` `[reject]` Blind 5: the failed-fetch rescue is tested only from a bar. Show the whole range and the rows report through the same `loseFocus` into the same effect, so a leaf for each would repeat the bar leaf's assertion. The guard is never reached with a live control on the failed path, because the rescue runs in the same commit as the loss.
  - `[false]` `[reject]` Blind 6: the drop leaf can't show that the alert survives. Unreachable in e2e: a failed refetch keeps its copy with the bar, so it never drops; a later success clears the alert through the failed effect's cleanup before any drop. `announce.test.ts` pins `clearStatus` keeping the alert.
  - `[low]` `[patch]` Blind 7 + Edge 4: `removeFebruaryFinish` hard-codes Kindred's 286 pages and zeroes the February bucket. Derived from the removed finish instead. The repeated inline route code in the existing AC-11 leaves stays (no existing leaf is edited).
  - `[low]` `[patch]` Blind 8: the midnight held-view leaf calls `release()` only on the happy path, so an early failure leaves the route pending into teardown. `release()` is now also called in `finally`.
  - `[low]` `[reject]` Blind 9: `StatsBars`' `onFocusLost(period)` argument is unused now. It's harmless, and narrowing the prop edits `StatsBars`, which this spec doesn't change.
  - `[low]` `[patch]` Blind 10: `onFocusLost`'s doc comment says it fires only on a refetch's removal. It also fires when the list unmounts with focus inside it (a followed row link). The comment was reworded. A person's own Show the whole range press focuses the bar first, so the button holds no focus when it leaves.
  - `[low]` `[reject]` Blind 11: the Code Map's line numbers predate the change. The fix is a spec edit.
  - `[low]` `[reject]` Verification "Other" 2 + Edge 1: `clearStatus` can empty an update notice that was set, or cancel one still waiting, in the same region. `announce()` already empties both regions and cancels any pending line on every Stats line, so this adds no new kind of loss. A notice that was set has already been spoken. The window for cancelling a pending one is the 100 ms before its tick.
  - `[false]` `[reject]` Edge 2: an arrival with a valid `period` sets `shownPeriod`, so a later drop clears a line Stats never spoke. That is the spec's rule ("where `selected` was non-null in an earlier render (the person saw the period)"), and the region is empty after an arrival anyway (`clearAnnouncements` on `navigated`).
  - `[low]` `[defer]` Verification "Other" 3: focus on Try again falls to `body` when a window-focus refetch recovers and the button unmounts. Pre-existing (Story 6.3's failure block) and not a control a dropped period removes. Added to `deferred-work.md`.
  - `[false]` `[reject]` Verification "Other" 4: the spec-17-2 task is unchecked. By design: this spec's code review writes it when it marks this spec `done`.
  - `[false]` `[reject]` Edge (note): the working tree no longer matches the reviewed diff. Known: the TEA hook's H5 split, recorded in Implementation Notes. The leaves moved unchanged.
  - `[low]` `[defer]` Spine 1: spine drift (AD-6). The Stats address "The period" bullet rescues focus only from bars. The code also rescues Show the whole range, narrowed rows and a whole-range row any settled refetch removes.
  - `[low]` `[defer]` Spine 2: spine drift (AD-6). The rescue now also runs at once on a failed fetch, clearing the marker so a recovery never moves focus (Oleg, E17-V2). The spine says only settled.
  - `[low]` `[defer]` Spine 3: spine drift (AD-6). The "Announcements" bullet doesn't say that a drop after a shown period empties the status region (and its pending line) and leaves the alert.
  - `[false]` `[reject]` Spine "nothing to report": `arrivalSearch` matches the spine's "lib/stats builds the whole search"; `StatsBars` and `StatsFinishedList` still never announce; AD-7's same-page replace and nav reset hold. (Recorded so every layer row is here.)
  - `[false]` `[reject]` Verification gap layer: no gaps. Each changed behavior has a leaf or unit case that fails if it is removed (its trace is in the review record).
  - `[false]` `[reject]` Verification gap layer: removing the `shownPeriod` guard is nearly unobservable, since the region is already empty on an arrival drop. Agreed, nothing to fix: the guard only keeps an arrival drop from clearing.
  - `[false]` `[reject]` Edge (claim): a reader would take the held-view clearing order as pinned. Same group as Blind 1; Implementation Notes say it isn't.
  - `[low]` `[reject]` Blind (floor note): the first half of AC-2 holds (the midnight leaf fails without the `:204` clause, the build's probe). Recorded with Blind 1's group for the record.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline"). Commits name `(epic 17 retro item 112)`.
- Spec size: about 2,700 tokens, over the 1,600 target; Oleg kept the full spec on 2026-11-28, as the retro settled (one spec, the fix and every leaf).
- Spec written and built with bmad-build at the user's request, 2026-11-28 (Oleg chose "approve and continue"). No separate ATDD session ran. The build writes the new leaves and unit cases first and runs them red against the unchanged code, then implements. `bmad-code-review` still runs in a new session.
- **Why one marker, not one per component:** the rescue's target and its guard are the same whichever control left, and two markers would race in one effect. The components only report; the page decides.
- **Why the failed fetch rescues at once:** there's no settled view to wait for, and waiting would let a recovery seconds later move focus with no action from the person, which is the E17-V2 bug. Clearing the marker at that point is what keeps the recovery from moving focus.

## Verification

**Commands:**
- `cd frontend && node --test src/lib/stats.test.ts src/lib/announce.test.ts` -- expected: the new `stats` and `announce` cases pass.
- `cd frontend && npx playwright test e2e/stats` -- expected: all Stats leaves pass, the new ones included.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

- Built with `bmad-build` (Oleg's "approve and continue", 2026-11-28), with no separate ATDD session. The leaves were written and run red first. Waiting for `bmad-code-review` in a new session.
- Verification: `npm run check` exit 0 (unit 466, pytest 2538, e2e 987, smoke ok) after the review patches.
- Review: 24 findings. 3 patched (the fixture derives Kindred's pages, the held leaf releases in `finally`, the `onFocusLost` comment), 4 deferred (three spine drift, AD-6; Try again's focus, pre-existing), the rest rejected.
- Residual risks for the code review:
  - AC-2's second mutation (clearing the marker before the `settled || failed` check) is an equivalent mutant that fails no leaf (Implementation Notes). AC-2 needs Oleg to accept that, or amend it.
  - The Pipeline line names ATDD and `bmad-build-auto`, but this build ran neither. The review decides whether that is acceptable for this spec.
  - The spec-17-2 task (`followup_review_recommended: false` with its covering leaf) is left for this spec's code review. The midnight-focused leaf is `frontend/e2e/stats-bars-focus.spec.ts`, "This month past midnight keeps a focused bar pressed and focused through the held view".
