---
title: 'Story 17.2: Choose a month or year by its bar'
type: 'feature'
created: '2026-11-27'
status: 'done'
baseline_revision: '50de623ecc24fb51664cd7270632130e51f2315c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-17-2-choose-a-month-or-year-by-its-bar.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, Stats address → Who writes), reconciled before the next epic: the spine says lib/stats parses the address into { range, from, to, period }; after Story 17.2, parseStatsAddress returns StatsSelection and parsePeriod reads period separately, and StatsPage combines them.
    evidence: |-
      Spine Check, build-auto review of Story 17.2; frontend/src/lib/stats.ts (parseStatsAddress, parsePeriod), frontend/src/pages/StatsPage.tsx. Already open as deferred-work.md's Story 17.1 entry ("Record the shape that ships after Story 17.2"); no duplicate entry added.
    location: >-
      frontend/src/lib/stats.ts
    severity: low
  - summary: >-
      Spine drift (AD-6, Stats finished list), reconciled before the next epic: the spine says the heading's and the announcement's count is the bucket's books, but the heading has no count ("Finished in March 2026", as EXPERIENCE.md and the AC say); only the announcement carries the bucket's books.
    evidence: |-
      Spine Check, build-auto review of Story 17.2; frontend/src/lib/stats.ts (periodHeading, periodLine). The code follows EXPERIENCE.md and epics.md; only the spine's wording is stale.
    location: >-
      frontend/src/lib/stats.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Stats lists the Books finished in a range (Story 17.1), but a tall bar doesn't say which Books made it tall. The chart is `aria-hidden` decoration, and the address holds only the range, so a chosen month can't survive Back from a Book.

**Approach:** Each bar with finishes becomes a toggle button in a `group` that is one roving Tab stop. Pressing a bar narrows the finished list to that period under "Finished in March 2026", adds `period` to the address by a same-page replace, and announces the bar's books. Pressing it again, or **Show the whole range**, widens the list. A range change releases the bar, and a `period` that isn't a bar with finishes in the settled view is dropped quietly.

## Boundaries & Constraints

**Always:**
- The client never sorts or counts finishes. Narrowing keeps the shown view's `finishes` whose `finishDate` starts with the period, in the view's order. The announced count is the bucket's `books`.
- A `period` is valid only when it equals the `period` of a bucket with `books > 0` in the shown, settled view (`stats.current && !stats.fetching`, or a failed refetch's kept copy). While `keepPreviousData` holds the previous range's view, no bar is a button and the list isn't narrowed.
- Every address write replaces the whole search (`range…` then `&period=…` last), carries `lib/page`'s same-page marker, and is built once per user action. `period` is never sent to the server.
- A range change by the person clears `period` and forgets the last focused bar. A preset's dates moving to a new local day isn't a range change.
- `StatsPage` owns every announcement. `StatsBars` and `StatsFinishedList` never announce. Arrival, a fallback, and a release after a refetch announce nothing.
- Bar keys are handled on the chart by `event.key` name, never on `window`. Every new `:hover` rule has a `:focus-visible` twin (`copy.test.mjs`).
- Styling follows DESIGN.md → Monthly bars and `components.monthly-bar`, with literal values in the CSS module. `tokens.css` and `schema.d.ts` are never edited.
- Existing tests change only at `stats-bars.spec.ts:77–81`, `:182` and `:236` (the gate's list), and at `stats-finished.spec.ts:531–535`, which the gate missed (ATDD checklist, spec question 3). Each keeps what it asserts.
- Subagents and every step: no `git stash`, `git checkout -- <path>`, `git restore` (except `--staged`), `git reset`, `git clean` or branch switch.

**Never:** a tooltip or popover on a bar; sorting, paging or filtering the list beyond the period; new presets; side reads; `localStorage`; a server or schema change; README edits; spine edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Press a bar | `FEB_APR`, press March | pressed, heading "Finished in March 2026", 3 rows, figures unchanged, status "Finished in March 2026: 3 books.", address `…&period=2026-03` by replace | — |
| Press again / Show the whole range | March selected | released, range heading and 6 rows, status the range line, `period` gone; focus on March | — |
| Range change | March selected, press This year | no bar pressed, `?range=thisYear`, range line announced, last focused bar forgotten | — |
| Bad period on arrival | `2026-06` outside, `2026-05` empty, `2026` on a month chart, `2026-03` on a year chart, `spring` | no bar selected, whole list, address replaced without `period`, silent | no message |
| Held view | range change still loading | the held chart is the group with no buttons; the list is whole | — |
| Refetch empties the bar | `period=2026-02`, refetch drops its only finish | released, list widens, address replaced, silent; focus to the chart's Tab stop, else the `h1` | failed refetch: kept copy counts as settled |
| Midnight | This month, `period=2026-10`, the clock moves to 29 October | still selected, address unchanged, silent | — |

</intent-contract>

## Code Map

- `frontend/src/components/StatsBars.tsx` -- today an `aria-hidden` `div.chart` of columns (value, 160px `.track` with `.fill`, period `barLines`), then the visually hidden table (keep it unchanged). Becomes `role="group"` `aria-label="Finished by month|year"`. Each bucket with `books > 0` is a `<button type="button" aria-pressed>` spanning the whole column (value, track, period inside it, since `barLook` reads the labels and track inside the button). Empty columns stay plain with `aria-hidden`. Roving tabindex: the last focused bar if still in the chart, else the selected, else the latest bar with finishes. Keys Left/Right (skip empty, no wrap), Home/End, Enter/Space native. New props: `selected: string | null`, `interactive: boolean` (false while the view is held), `onToggle(period)`, a ref or handle so the page can focus the Tab stop, and a reset key so a range change forgets the last focused bar.
- `frontend/src/components/StatsBars.module.css:1-69` -- add the button reset (`cursor: pointer`, no transition), `.selected .track { box-shadow: 0 0 0 2px var(--color-page), 0 0 0 4px var(--color-accent) }` (`components.highlight-ring`), the selected labels `--color-ink` at 600, `.dimmed .fill { opacity: .35 }`, the track focus ring on `button:focus-visible .track` (2px solid accent, offset 2px; 6px on the selected bar), and forced colors: no dimming, the selected track a 2px `Highlight` outline at 0, the focus ring in the system color at 6px. Find the global ring in `src/styles/` (`grep -rn focus-visible src/styles`).
- `frontend/src/lib/stats.ts` -- add `barName(bucket)` ("March 2026, 3 books, 1,335 pages", via `periodName`, `formatCount`), `periodHeading(period)` ("Finished in March 2026" / "Finished in 2024"), `periodLine(bucket)` ("Finished in March 2026: 3 books."), `parsePeriod(params)` (`YYYY-MM` or `YYYY`, else null), `validPeriod(period, view)` (a bucket with books > 0 and the right shape for `view.bucket`), `statsSearch(selection, period?)` writing `period` last. `addressNeedsFallback` stays range-only; the period drop is the page's job once the view settles. Unit cases go in `lib/stats.test.ts` (new cases only).
- `frontend/src/pages/StatsPage.tsx` -- read `period` from `params` each render. `write(selection, period)`. A settled-view effect drops an invalid `period` by replace (silent), and if focus was on the released bar, moves it to the chart's Tab stop, else the `h1`. The press handler writes and announces `periodLine` (or the range line on release). `choose`/`commitCustom` write without `period` and bump the bar reset key. Keep the 17.1 `announced` rule for range lines. Pass `heading` = `periodHeading(period)` when a valid period is shown, and the narrowed finishes.
- `frontend/src/components/StatsFinishedList.tsx` (+ module CSS) -- an optional `onShowWholeRange` that renders **Show the whole range** as a sibling of the `h2` (a heading row wrapping both, `{spacing.4}` gap, baseline aligned, link style in `meta`). It never announces.
- `frontend/src/lib/page.ts` -- `samePageState()`, reused unchanged. `frontend/src/api/views.ts:286` -- `useStatsView` already returns `fetching`.
- `frontend/e2e/stats-bars-select.spec.ts` -- 13 red leaves to un-skip. Helpers are already in `frontend/e2e/stats.ts:407-600` (`BARS`, `FEB_APR*`, `barChart`, `chartBars`, `bar`, `showWholeRange`, `focusablesIn`, `barLook`).
- `frontend/e2e/stats-bars.spec.ts:77-81` (`chartColumns` via `[aria-hidden="true"] > div` → the group's direct children), `:182` (the "900" value → inside the group), `:236` (no `aria-hidden` element → no chart group).
- `frontend/e2e/stats-finished.spec.ts:531-535` -- 17.1's "no period is read" check. After 17.2 the list narrows to March (1 row), so it is updated to assert the 17.2 behavior on that address and keep the Last year press check.
- Deferred-work intake: `deferred-work.md:1905` ("Spine drift (AD-6, Stats address → Who writes) … which is Story 17.2's") is not in this story: spine drift is reconciled before the next epic, and stories don't edit the spine. The retro's reconciliation should record the shape that ships here.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/stats.ts`, `lib/stats.test.ts` -- bar name, period heading and line, period parse and validation, `statsSearch` with `period` -- AC-1, AC-3, AC-9.
- `frontend/src/components/StatsBars.tsx`, `.module.css` -- the group, the toggle buttons, the roving Tab stop and keys, the selected, dimmed, focus and forced-colors looks -- AC-1, AC-2, AC-6, AC-10.
- `frontend/src/components/StatsFinishedList.tsx`, `.module.css` -- Show the whole range beside the heading -- AC-5.
- `frontend/src/pages/StatsPage.tsx` -- period read, write, validate on a settled view, release, announcements and focus -- AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12.
- `frontend/e2e/stats-bars.spec.ts:77-81,182,236`, `frontend/e2e/stats-finished.spec.ts:531-535`, un-skip `stats-bars-select.spec.ts` -- AC-13.

**Acceptance Criteria:** AC-1 to AC-13 of epics.md Story 17.2, numbered as the ATDD checklist's registry, each pinned by its leaf in `stats-bars-select.spec.ts`. Among them:
- Given Custom 1 February – 15 April 2026, when the chart renders, then it is the `group` "Finished by month" with three toggle buttons named "February 2026, 1 book, 286 pages", "March 2026, 3 books, 1,335 pages" and "April 2026, 2 books, 531 pages".
- Given March selected, when axe runs on Stats in light and dark, then it finds no violation, with `label-content-name-mismatch` excluded for the chart's bar buttons only (AC-13; option A, Spec Change Log).

### Review Findings

Code review, 2026-11-27 (new session; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check; none failed). 0 decision-needed, 4 patch, 2 defer, 14 rejected.

- [x] [Review][Patch] The modifier-key pass-through on the chart (Edge Case 3's fix) is unasserted: removing the guard would swallow Cmd+Left (Back) again and every test would pass [frontend/e2e/stats-bars-select.spec.ts:149] — fixed: the AC-2 leaf presses Shift+ArrowLeft and Shift+End and focus stays on March; mutation probe (guard removed) fails it
- [x] [Review][Patch] A range with buckets but no books keeps its chart `aria-hidden` with no group (Blind (2)'s fix), unasserted: `stats-bars.spec.ts:242` checks only All time with no buckets, where `StatsBars` returns null [frontend/e2e/stats-bars-select.spec.ts:130] — fixed: new leaf "AC-1 a range with months but no finishes keeps its chart aria-hidden, with no group and no bars" (NOTHING_FINISHED); mutation probe (group always) fails it
- [x] [Review][Patch] The rewritten 17.1 leaf is still titled "Story 17.1 leaves period alone" while it now asserts that `period=2026-03` narrows the list [frontend/e2e/stats-finished.spec.ts:512] — fixed: retitled "AC-16 axe finds nothing with the list shown, in both themes, and a range press drops period"
- [x] [Review][Patch] The AC-11 `h1` leaf never checks its setup (two Shift+Tab presses onto the October bar), so a change in focus order would fail at the `h1` assertion and blame the focus move [frontend/e2e/stats-bars-select.spec.ts:731] — fixed: asserts the October bar is focused before the route is installed
- [x] [Review][Defer] The axe exclusion cites UX-DR109's exception, which covers "the name starts with the label", not WCAG 2.5.3's visible-label-in-name rule that axe checks [epics.md:4144] — deferred: a planning-doc wording fix outside this story; Oleg's option A stands
- [x] [Review][Defer] Existing tests changed outside the gate's list (`stats.spec.ts:299`, `stats-finished.spec.ts:526`, `:531–535`), while epics.md's existing-specs criterion and the epic context's Guards still forbid it [frontend/e2e/stats.spec.ts:299] — deferred: for the Epic 17 retro (Epic 15 item 104, Epic 16 item 110); the changes follow from option A and are recorded in the Spec Change Log

- 2026-11-27, after the last patch: `npm run check` exit 0 — pytest 2538 passed, unit 457 passed (0 skipped), e2e 971 passed, smoke ok.

- Follow-up risk: the lostBar focus effect through a held view; covered by frontend/e2e/stats-bars-focus.spec.ts:204; added, epic 17 retro item 112. It fails with the `selectionKey(shownSelection) === committedKey` clause removed from `interactive`. Clearing the marker before the `settled || failed` check is an equivalent mutant: all 81 Stats leaves pass, and Oleg accepted it (code review of item 112, 2026-11-28).

**Rejected:**
- `low` Edge Case 1 / Blind: a held view of another range renders a labelled group whose columns are all `aria-hidden`. — The I/O matrix's "Held view" row asks for exactly that ("the held chart is the group with no buttons"), and AC-10's leaf asserts it; the fix would edit this spec.
- `false` Edge Case 2: pressing Custom after All time leaves the bar selected and the list narrowed under a Custom picker. — epic-17-context: "pressing Custom with empty fields writes nothing… the address, view and list keep the last committed range"; the bar is part of that committed address.
- `low` Edge Case 3 / Acceptance Auditor 3 / Blind: `/stats?period=2026-03` with no `range` keeps March and isn't rewritten as `range=thisYear&period=…`. — Only a hand-typed address does that, March is a valid bar of the This year it shows, and the next write replaces the whole search; the fix adds an arrival branch.
- `low` Edge Case 4: `stats-bars.spec.ts:242` no longer counts every `aria-hidden` element on an empty All time. — The Code Map prescribes that rewrite (":236 no aria-hidden element → no chart group"); the zero-books chart's `aria-hidden` is now pinned by the second patch above.
- `low` Acceptance Auditor 2: under forced colors a selected bar with keyboard focus shows the 6px focus ring in place of its offset-0 selection outline. — Forced colors don't occur in Oleg's desktop Chrome on macOS outside DevTools emulation, `aria-pressed` still carries the state, and two outlines on one track need another drawing technique, not a direct correction.
- `false` Blind: forced colors move the focus ring to 6px on every focused bar, against DESIGN.md. — The Code Map specifies "the focus ring in the system color at 6px" under forced colors, and DESIGN.md's 6px-on-selected rule is for the normal look.
- `low` Blind: the `lostBar` focus effect could pull focus to the chart on a later settled render. — `lostBar` is set only when a focused bar's button is removed, cleared on the first settled render, and acts only when focus sits on `body`, which is the lost-focus case it exists for; no reachable path was shown where focus falls to `body` for another reason in between.
- `low` Blind: `chartColumns`' `div:has(+ table) > *` locator is structural. — It reads the one chart Stats renders today, in both its forms; the harm needs a future wrapper or a second table.
- `low` Acceptance Auditor 1: two axe calls changed outside the Always list. — They follow from Oleg's option A (Spec Change Log); recorded for the retro in the second defer above.
- `low` Blind: the triage tally "low 17, false 13" doesn't match its rows. — The fix edits this spec's build record.
- `low` Blind: Auto Run Result's "Files changed" omits `deferred-work.md` and `sprint-status.yaml`. — The fix edits this spec's build record.
- `false` Spine Check: AD-6 parse shape. — Spine drift, already open in deferred-work.md (Story 17.1 entry); no new entry.
- `false` Spine Check: AD-6 heading count. — Spine drift, already deferred by the build-auto review; no new entry.
- `false` Acceptance Auditor note: a selection shows on an unsettled view. — The auditor itself discounts it: Design Notes, AC-8 and AC-12 call for it; only the drop waits for a settled view.

## Spec Change Log

- 2026-11-27, Oleg's decision on the step-2 block (option A). The bar names stay as EXPERIENCE.md writes them ("March 2026, 3 books, 1,335 pages"), the labels stay inside the button, and AC-13's axe run excludes `label-content-name-mismatch` for the chart's bar buttons alone (UX-DR109 already calls the name an accepted exception). Changed: DESIGN.md → Monthly bars (Name and labels); epics.md Story 17.2's AC-13; `epic-17-context.md` Guards; the AC-13 leaf in `stats-bars-select.spec.ts`. KEEP: every other axe rule, and every other part of the page, stays in the check.
- 2026-11-27, step 3 (build). Option A reaches two more axe calls: a bar button exists whenever Stats shows finishes, not only when one is selected, so `stats.spec.ts:299` (Story 6.3) and `stats-finished.spec.ts:526` (Story 17.1 AC-16) failed `label-content-name-mismatch` (8 nodes) too. All three axe calls now go through one helper, `statsAxeViolations` (`frontend/e2e/stats.ts`). It runs every `AXE_TAGS` rule with that one rule disabled, then that rule alone on everything except the bar buttons, as `catalog-pace-calculator.spec.ts:287–296` does. Neither call was in the gate's list, like `stats-finished.spec.ts:531–535`. The review records both.

## Review Triage Log

### 2026-11-27 — Review pass
- verdicts: 34 findings — high 0, medium 4, low 17, false 13, maybe-false 0
- findings:
  - `low` `reject` Intent alignment (A): two existing axe calls outside the Always list changed (`stats.spec.ts:299`, `stats-finished.spec.ts:526`). — They follow from Oleg's option A: a bar button exists whenever Stats shows finishes. Recorded in the Spec Change Log; the fix would edit this spec.
  - `false` `reject` Intent alignment (B): the axe contract now has an exception. — Oleg's option A (Spec Change Log), written into DESIGN.md, epics.md AC-13 and the epic context.
  - `low` `reject` Intent alignment (C): a selection shows on a current view while a same-range refetch runs. — Deliberate: AC-8 needs Back to show March at once. The settled rule governs the drop, which waits for the settled view.
  - `false` `reject` Intent alignment (D): focus moves after a release only when a lost bar held it. — epics.md AC-11 says "focus, which the released bar held, moves…": conditional is the intent's reading.
  - `false` `reject` Intent alignment (E): the failed-refetch rule is tested only through the UI. — The UI is the outermost surface the intent names; the new leaf covers it.
  - `low` `patch` Intent alignment (F): the same-range Custom re-commit keeps `period`, untested. — Grouped with Verification Gap 2: see there.
  - `low` `reject` Intent alignment (G): StatsBars' roving stop and focus loss are tested only by e2e. — e2e AC-2, AC-5, AC-11 and the new leaves cover them at the surface the ACs name.
  - `medium` `patch` Spine Check (AD-6, arrival): the arrival fallback for an unknown range or a half Custom kept a well-formed `period`, against "This year with no `period`". — Fixed: `period` is kept only when `range` parsed as given (`params.get('range') === committed.preset`); new leaf "AC-9 an arrival that falls back to This year drops period; a reversed Custom keeps it".
  - `medium` `patch` Spine Check (AD-6, focus after a release): focus moved only when the selected bar held it, not when any bar that stopped being a button did. — Grouped with Edge Case 2: a post-render effect now moves focus to the chart's Tab stop, else the `h1`, whenever a focused bar's button left, once the view is settled, and clears `lostBar`.
  - `low` `defer` Spine Check (AD-6, Who writes): the spine's `{ range, from, to, period }` parse shape. — Spine drift; already open in deferred-work.md from Story 17.1, noted in `deferred`, no duplicate entry.
  - `low` `defer` Spine Check (AD-6, finished list): the spine implies the heading carries the bucket's count. — Spine drift; new deferred-work.md entry.
  - `low` `reject` Blind (1): under forced colors a selected and focused bar shows only the focus outline. — Forced colors exist only on Windows, and bookvie runs in desktop Chrome on Oleg's Mac (AGENTS.md → Supported browser). `aria-pressed` still carries the selection, and the fix needs another drawing technique, not a direct correction.
  - `low` `patch` Blind (2): an empty range's chart was an empty labelled `group`. — Fixed: with no bucket with books, the chart renders as before Epic 17 (`aria-hidden`, no role). `stats-bars.spec.ts`'s `chartColumns` now finds the element before the hidden table, so it still reads the all-zero chart.
  - `false` `reject` Blind (3): narrowing by `finishDate` prefix may disagree with the bucket. — The server buckets each finish by that same local date (Story 17.1 AC-1/2), and the epic specifies narrowing by prefix. The quoted comments describe `lib/stats` and the list component, which still neither filter nor count.
  - `false` `reject` Blind (4): a bar could filter to zero rows. — A bar is a button only when its bucket has books, and the bucket's books equal its finishes with that prefix (17.1's row-count rule).
  - `low` `reject` Blind (5): the Auto Run Result still reads as blocked. — The fix edits this spec; Finalize rewrites the section.
  - `low` `reject` Blind (6): the Spec Change Log doesn't list the 17.1 period-assertion rewrite. — The fix edits this spec; the Code Map and the ATDD checklist (spec question 3) record that rewrite.
  - `low` `reject` Blind (7): the rewritten 17.1 leaf checks only the row count. — Story 17.2's own leaves pin the heading and address (AC-3, AC-9); that leaf's remaining job is the Last year press.
  - `low` `patch` Blind (8): the added failed-refetch leaf's two `afterAnnounceDelay` calls had no comment. — Commented as `stats.spec.ts` does.
  - `low` `reject` Blind (9): nothing proves the axe exclusion is narrow. — The second run enables the rule explicitly with `withRules` on everything but the bar buttons, and the selector names the group the component renders.
  - `false` `reject` Blind (10): screen readers hear the bar numbers and the table. — EXPERIENCE.md keeps the table as the overview of every period, empty ones included.
  - `false` `reject` Blind (11): design values are literals. — The spec's Always asks for literals in the CSS module, and AC-6 reads 0.35 and 6px from DESIGN.md.
  - `low` `patch` Blind (12): `statsAxeViolations` was out of order in three import lists. — Moved.
  - `low` `patch` Verification Gap 1: the "else the `h1`" half of AC-11 had no test. — New leaf "AC-11 a refetch that empties the only bar with finishes moves focus to the h1".
  - `low` `patch` Verification Gap 2: the `commitCustom` same-range guard was untested. — A leaf was added, but `fill` with an unchanged value fires no `onChange`, so its first half was hollow, and no UI path commits the same ordered range again. The leaf now pins the reachable half: "AC-7 committing another Custom range releases the bar". The guard stays as a defensive no-op.
  - `low` `patch` Verification Gap 3: keeping `period` through a reversed-Custom fallback was untested. — Covered by the new AC-9 fallback leaf (reversed Custom keeps March).
  - `low` `reject` Verification Gap (other): the forced-colors focus ring and the track's `box-sizing` are unasserted. — Outside epics.md's forced-colors criterion, and forced colors don't exist on macOS Chrome.
  - `medium` `patch` Edge Case 1: at midnight on This month, the new query key held the view as a placeholder, so the bars stopped being buttons and March showed unselected until the refetch landed. — Fixed: `interactive` also holds for a held view of the same selection (`selectionKey(shownSelection) === committedKey`); `settled` still needs the committed range's own view with no fetch running.
  - `medium` `patch` Edge Case 2: a focused bar whose button unmounts without a drop leaves focus on `body` and a stale `lostBar`. — Same fix as the AD-6 focus finding.
  - `low` `patch` Edge Case 3: Arrow, Home and End with a modifier were swallowed, blocking Cmd+Left (Back). — `onKeyDown` returns early on Alt, Meta, Ctrl or Shift.
  - `low` `reject` Edge Case 4: forced colors, selected and focused. — Same as Blind (1).
  - `low` `reject` Edge Case 5: a repeated `period` keeps the first value and leaves the extra in the address. — Only a hand-typed address does that, and the next write replaces the whole search; the fix adds a guard.
  - `false` `reject` Edge Case 6 (claim): the midnight row holds only after the refetch. — Fixed by Edge Case 1's patch; the claim no longer holds.
  - `false` `reject` Edge Case 7 (claim): two edited existing tests are missing from the Always list. — Same as Intent alignment (A).

## Design Notes

- **Settled view.** `settled = stats.status === 'ready' && stats.current && !stats.fetching`, or `stats.status === 'failed'` with kept data. Only then is `period` checked against the view. While unsettled, the address's period still drives the selected bar if the shown view has it, so Back (AC-8) shows March at once.
- **Release after a refetch.** Remember whether `document.activeElement` was the released bar before the replace. After the render, focus the chart's Tab stop through the `StatsBars` handle, or the `h1` when no bar has finishes.
- **Forgetting the last focused bar.** `StatsBars` keeps `lastFocused` in state. The page passes `resetKey={selectionKey(committed)}`, and a change clears it. A preset's dates moving to a new day leave the key unchanged (AC-12).

## Verification

**Commands:**
- `cd frontend && npx playwright test e2e/stats.spec.ts e2e/stats-bars.spec.ts e2e/stats-finished.spec.ts e2e/stats-finished-automate.spec.ts e2e/stats-bars-select.spec.ts` -- all pass, none skipped.
- `npm --prefix frontend run test` (unit) -- `lib/stats.test.ts` passes.
- `npm run check` -- passes.

## Auto Run Result

Status: in-review

**What was built.** On Stats, each month's or year's bar with finishes is now a toggle button in a group named "Finished by month" or "Finished by year", and the chart is one roving Tab stop (Left, Right, Home and End skip empty bars and don't wrap). Pressing a bar narrows the finished list to that period under "Finished in March 2026", announces "Finished in March 2026: 3 books.", and adds `period` to the address by a same-page replace, so Back from a Book returns to the same bar. Pressing it again, or **Show the whole range** beside the heading, widens the list. A range change releases the bar. A `period` that isn't a bar with finishes in the settled view is dropped quietly, on arrival or after a refetch, and focus moves to the chart's Tab stop, else the `h1`, when a bar that held it disappears.

**History of this run.** The first run halted at step 2: the bar names, the labels inside the button and AC-13's axe pass couldn't all hold (axe `label-content-name-mismatch`, probed in Chromium). Oleg chose option A: keep the names and exclude that one rule for the bar buttons only (Spec Change Log). The run resumed at step 3 with a new implementation subagent.

**Files changed:**
- `frontend/src/lib/stats.ts`: `parsePeriod`, `validPeriod`, `barName`, `periodHeading`, `periodLine`; `statsSearch` writes `period` last.
- `frontend/src/components/StatsBars.tsx` and `.module.css`: the group, the toggle buttons, the roving Tab stop and keys, the focus-loss report, and the selected, dimmed, focus and forced-colors looks. With no bucket with books, the chart stays `aria-hidden` as before.
- `frontend/src/components/StatsFinishedList.tsx` and `.module.css`: **Show the whole range** as a sibling of the `h2`.
- `frontend/src/pages/StatsPage.tsx`: `period` read, written, validated against a settled view and dropped; the press and widen announcements; focus after a release; the arrival fallback drops `period` only when the range fell back.
- `frontend/src/lib/stats.test.ts`: new cases.
- `frontend/e2e/stats-bars-select.spec.ts`: the 13 ATDD leaves un-skipped, plus four leaves from this run: a failed refetch keeps the selection (matrix audit), the arrival fallback drops or keeps `period`, committing another Custom range releases the bar, and a refetch emptying the only bar focuses the `h1`.
- `frontend/e2e/stats.ts`: `statsAxeViolations`, the one place the bar buttons' axe exception lives.
- `frontend/e2e/stats-bars.spec.ts` (`chartColumns`, `:182`, `:236`), `stats-finished.spec.ts` (`:526` axe, `:531–535` period), `stats.spec.ts` (`:299` axe): the gate's leaves and the option A consequences.
- Design docs (option A): DESIGN.md → Monthly bars (Name and labels), epics.md AC-13, `epic-17-context.md` Guards.

**Review.** 34 findings: medium 4, low 17, false 13, none high.
- **Patched (12 rows, 9 fixes):** 4 medium and 8 low (in triage-log rows).
  - Medium: the midnight hold keeps the bar selected; focus moves on when any focused bar loses its button; the arrival fallback for a bad range drops `period` (AD-6).
  - Low: modified arrow keys pass through; an empty range's chart stays `aria-hidden`; three new leaves (the `h1` fallback, the fallback `period`, another Custom range); a comment; import order.
- **Deferred (2):** spine drift, AD-6's parse shape (already open from Story 17.1) and AD-6's heading count wording (new deferred-work.md entry).
- **Rejected (20):** each with its reason in the Review Triage Log. The main groups:
  - Oleg's option A and its consequences (the axe exception, two older axe calls changed).
  - Forced colors only on Windows (the selected-and-focused outline, the unasserted forced-colors focus ring).
  - Fixes that would edit this spec (the stale block, the change-log wording).
  - Behaviour per the intent or the design (the selection during a same-range refetch, conditional focus, the hidden table, literal CSS values, prefix narrowing).
- **Follow-up review recommended: true.** Patched counts by entry verdict: high 0, medium 3 entries (the midnight hold, focus after a lost bar, the arrival fallback), low 6. The unverified risk is the new post-render focus effect in `StatsPage.tsx`: it reads a ref on every render and moves focus whenever a focused bar's button left. It is tested for the release cases (AC-11, its `h1` leaf), but not for a bar that leaves while the view is held at midnight with focus on it.

**Verification.**
- `npm run check` passed after the patches: format, lint and `tsc`; unit 457 passed, 0 skipped; pytest 2538 passed; e2e 970 passed; smoke ok.
- Before the patches, the same check passed with e2e 966.
- The Stats specs (`stats`, `stats-bars`, `stats-finished`, `stats-finished-automate`, `stats-bars-select`) all ran in that check, none skipped.
- Matrix audit, every row covered by a leaf that ran and passed:
  - press: AC-3; press again and Show the whole range: AC-4 and AC-5;
  - range change: AC-7 and its Custom leaf;
  - bad period on arrival: AC-9 and its fallback leaf;
  - held view: AC-10;
  - refetch empties the bar: AC-11 and its `h1` leaf; the failed refetch: its new leaf;
  - midnight: AC-12.

**Helpers:** one added, `statsAxeViolations` (`frontend/e2e/stats.ts`). No existing export runs axe with a per-element rule exception; it follows `catalog-pace-calculator.spec.ts:287–296`'s pattern and is shared by the three Stats axe calls.

**Residual risks:**
- Forced colors: a selected bar with keyboard focus shows the focus ring in place of its selection outline. That happens only on Windows.
- The `commitCustom` same-range guard has no reachable UI trigger, so it is untested.
- Existing tests changed outside the gate's list: `stats.spec.ts:299`, `stats-finished.spec.ts:526` and `:531–535`. The retro should note that the gate's list missed them (Epic 15 retro item 104, Epic 16 retro item 110).
- Story 17.2 closes Epic 17. After the code review come `bmad-testarch-automate`, the Epic 17 retro and its before-next-epic items, among them the spine reconciliation.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
