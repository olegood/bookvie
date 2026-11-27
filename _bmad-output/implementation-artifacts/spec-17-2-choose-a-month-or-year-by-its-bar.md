---
title: 'Story 17.2: Choose a month or year by its bar'
type: 'feature'
created: '2026-11-27'
status: 'blocked'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-17-2-choose-a-month-or-year-by-its-bar.md'
warnings: ['oversized']
deferred: []
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
- Given March selected, when axe runs on Stats in light and dark, then it finds no violation (AC-13). **Blocked:** see Auto Run Result.

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

Status: blocked
Blocking condition: intent gap

**What blocks the build.** Three of Story 17.2's criteria can't all hold as the design docs write them:
- **AC-1** (EXPERIENCE.md → Choosing a bar): a bar's accessible name is exactly "March 2026, 3 books, 1,335 pages".
- **AC-3 and AC-6** (DESIGN.md → Monthly bars): the whole column is the button, so the visible value "1,335" and the period "Mar" (plus "2026" on the first bar and on each January) sit inside it. The ATDD leaves read them there with `barLook`.
- **AC-13**: axe passes on Stats with a bar selected. The project's `AXE_TAGS` include `wcag21a`, which runs `label-content-name-mismatch` (WCAG 2.5.3, the rule that blocked Story 17.1). DESIGN.md's own 17.1 rule says "a name must hold the visible text in one run".

**Evidence (probe in this run).** I ran axe-core in Chromium, with this project's `AXE_TAGS`, on a `group` holding one bar button: `aria-label="March 2026, 3 books, 1,335 pages"`, with "1,335", a 160px track and "Mar" inside. axe reported `label-content-name-mismatch`, and so did the same button with its inner labels `aria-hidden`. axe compares the text shown on screen, so hiding the labels from assistive tech doesn't change the result. A first bar ("286", "Feb", "2026" against "February 2026, 1 book, 286 pages") fails too. The visible tokens ("1,335 Mar") are not a run in the name, because "Mar" isn't "March" and the value comes first on screen. The probe script lived in the scratchpad and was deleted. No repo file was changed apart from this spec.

**Question for Oleg: which way should the bar go?**
- **A. Keep the design and exempt this one check (my recommendation).** The name stays "March 2026, 3 books, 1,335 pages". AC-13's axe run excludes `label-content-name-mismatch` for the chart's buttons only (`.exclude` on the group, or `disableRules` with a comment), and DESIGN.md → Monthly bars records why: the labels are an abbreviated month and a number, the name spells them out, and the hidden table gives the same numbers. Changes: one line in AC-13's leaf, DESIGN.md, and epics.md's AC-13 wording. The cost is that a speech user who says "click Mar" may not match, while "click March" and "click 1,335" do.
- **B. Make the visible text a run in the name.** For example, name each bar from its labels in screen order, such as "1,335 pages, Mar 2026, 3 books". This would need the year in every name, and the first bar's "286 Feb 2026" breaks the pattern, so the name would have to follow each column's lines exactly. It changes EXPERIENCE.md's name, AC-1, `FEB_APR_BARS` and the AC-1 and AC-3 leaves, and the names read less naturally.
- **C. Take the labels out of the button.** The button becomes a transparent overlay over the column with only the track inside, and the value and period are `aria-hidden` siblings. axe passes, but AC-3's `barLook` (labels inside the button) and the "whole column" wording change, and the 2.5.3 substance is the same as A without saying so.

**To resume:** record the choice in this spec's Spec Change Log and in the design docs it touches, set `status: ready-for-dev`, and run `bmad-build-auto` with this spec's path. The rest of the plan above doesn't depend on the choice, apart from the AC-13 line.

**Setup done in this run:** this worktree had no `node_modules` or backend venv. I ran `npm ci` (its postinstall ran `npm --prefix frontend ci` and installed Playwright's Chromium) and `uv sync` in `backend/`. Both are git-ignored, and `git status` stayed clean.
