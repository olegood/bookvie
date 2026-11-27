---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-27'
storyId: '17.2'
storyKey: '17-2-choose-a-month-or-year-by-its-bar'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-172-choose-a-month-or-year-by-its-bar'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-17-2-choose-a-month-or-year-by-its-bar.md'
generatedTestFiles:
  - 'frontend/e2e/stats-bars-select.spec.ts'
  - 'frontend/e2e/stats.ts (BARS, FEB_APR, FEB_APR_BARS, FEB_APR_ROWS, MARCH_ROWS, APRIL_ROWS, barChart, chartBars, bar, showWholeRange, focusablesIn, Focusable, barLook, BarLook)'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 17 intro, gate, out of scope; Story 17.2; Story 17.1 for the boundary)'
  - '_bmad-output/implementation-artifacts/epic-17-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Stats → Choosing a bar, Show the whole range, Announcements, Address; Flow 16; State rows) and DESIGN.md (components.monthly-bar, components.highlight-ring, components.focus-ring, Monthly bars states, forced colors)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (17-1 done, 17-2 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-17-1-see-the-books-finished-in-a-range.md (format and precedent)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/components/StatsBars.tsx, StatsBars.module.css, RangePicker.tsx; pages/StatsPage.tsx; lib/stats.ts; lib/relativeDay.ts (useNow)'
  - 'frontend/e2e/stats.ts, stats.spec.ts, stats-bars.spec.ts, stats-finished.spec.ts, stats-finished-automate.spec.ts, fixtures.ts, home.ts, library.ts, dev-mode.ts, catalog-tiles-automate.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Custom 1 February – 15 April 2026 with finishes in February, March and April and none in a month between, when the chart renders, then it is a group named "Finished by month", no longer aria-hidden; each bar with at least one finish is a toggle button with aria-pressed="false", named from its bucket ("March 2026, 3 books, 912 pages", numbers grouped as "1,204 pages"); a bar with no finishes is drawn as before, isn''t a button, can''t be focused, and its value and period text are aria-hidden; the hidden table still lists every period; over 24 months the group is "Finished by year" and a bar is named "2024, 1 book, 304 pages" (AR78, UX-DR109).' }
  - { id: AC-2, idSource: generated, text: 'Given that chart and nothing focused in it yet, when I Tab into it, then focus lands on the latest bar with finishes and the chart is one Tab stop (roving tabindex); Left and Right move to the previous and next bar with finishes, skipping empty ones, without wrapping; Home and End go to the first and last; Up and Down do nothing; Tab out and back lands on the last focused bar while it is still in the chart, else the selected bar, else the latest bar with finishes (UX-DR109).' }
  - { id: AC-3, idSource: generated, text: 'Given no bar selected, when I press the March bar with Enter, Space or a click anywhere in its column, then it reads aria-pressed="true", the heading reads "Finished in March 2026", and the list holds only the finishes whose finishDate starts with 2026-03, as many as the bar''s books; the two big numbers still show the whole range, focus stays on the bar, and status announces "Finished in March 2026: 3 books." ("Finished in 2024: 1 book."), the bucket''s books; the address gains period=2026-03 (period=2024) by a same-page replace (AR75, AR76, UX-DR108, UX-DR112).' }
  - { id: AC-4, idSource: generated, text: 'Given March selected, when I press April, then April is selected and March released, the list shows April''s finishes, and at most one bar is ever pressed; when I press the selected bar again, then it is released, the list widens to the range under the range''s heading, focus stays on the bar, status announces the range line, and period leaves the address.' }
  - { id: AC-5, idSource: generated, text: 'Given a bar selected, when the list renders, then Show the whole range shows as a link-styled button in meta, {spacing.4} after the heading''s text, as a sibling of the h2 (whose name stays "Finished in March 2026"), and it isn''t there while no bar is selected; when I press it, then the list widens, focus moves to the bar that was selected, now unpressed and the chart''s Tab stop, status announces the range line, and period leaves the address (UX-DR111).' }
  - { id: AC-6, idSource: generated, text: 'Given March selected, when the chart renders in light and dark, then March''s track has the highlight ring and its value and period labels are ink at weight 600; the other bars with finishes keep ink-secondary labels at full contrast and only their fill drops to 0.35 opacity; with no bar selected every bar is drawn as before Epic 17; the focus ring on the selected bar sits 6px out, outside the highlight ring; hover changes only the cursor; selecting and dimming have no transition; under forced colors the dimming is dropped and the selected bar shows a 2px Highlight outline at offset 0 (UX-DR110).' }
  - { id: AC-7, idSource: generated, text: 'Given a bar selected, when I choose another preset or commit another Custom range, including one that turns a month chart into a year chart, then the bar is released, period leaves the address, the last focused bar is forgotten, the list shows the new range, and status announces the range line (AR76, AR78).' }
  - { id: AC-8, idSource: generated, text: 'Given Custom 1 February – 15 April 2026 with March selected, when I open a row''s Book and press Back, then Stats comes back with the same range, March selected and the same three rows, the h1 focused, announcing nothing; Tab into the chart lands on March; pressing Back once more leaves Stats in one step (UX-DR113).' }
  - { id: AC-9, idSource: generated, text: 'Given an address with a period that isn''t a bar with finishes in the shown range (a month outside it, a month with no finishes, period=2026 on a month chart, period=2026-03 on a year chart, or text that isn''t a period), when Stats opens on it, then no bar is selected, the list shows the whole range, there is no message and no announcement, and the address is replaced without period; the period is never sent to the server (AR76, UX-DR113).' }
  - { id: AC-10, idSource: generated, text: 'Given a range change whose new view is still loading, when keepPreviousData shows the previous range''s view, then no bar is a button and the list isn''t narrowed until the new view has settled (AR75).' }
  - { id: AC-11, idSource: generated, text: 'Given March selected, with the only finish in March, and focus on the March bar, when another context removes that finish and Stats regains focus and refetches (or a refetch fails and keeps its copy, which counts as settled), then once the settled view has no bucket with books for 2026-03, the bar is released, the list widens and the address is replaced, with no message and no announcement; focus moves to the chart''s Tab stop, else the h1 (AR76).' }
  - { id: AC-12, idSource: generated, text: 'Given This month with a bar selected and a tab left open past midnight into the next day of the same month, when the preset''s dates move to the new local day, then that isn''t a range change: the bar stays selected while it is still a bar with finishes (AR76).' }
  - { id: AC-13, idSource: generated, text: 'Given the existing Stats e2e specs, when they run, then they pass, except the stats-bars.spec.ts leaves the Epic 17 gate names for Story 17.2, which find the chart by another locator and keep what they assert; copy.test.mjs and the axe checks on Stats pass with a bar selected, in both themes.' }
---

# ATDD Checklist: Story 17.2 Choose a month or year by its bar

## Preflight

- **Branch:** `velvet-lantern` at `bace257`, clean at the start. This run stays on that branch.
- **Stack:** `fullstack`, auto-detected (Playwright in `frontend/playwright.config.ts`, Chromium only; pytest in `backend/`). Story 17.2 is frontend only: `period` is never sent to the server (AC-9), and the view's shape doesn't change. So every leaf is e2e; no pytest leaf.
- **Story:** `epics.md` Story 17.2 has 13 Given/When/Then criteria with no ids. They are numbered AC-1 to AC-13 in source order (registry above). Each "And" line, and each second When/Then pair (AC-4, AC-5), belongs to the criterion above it. No spec file exists for 17.2 yet; as in 17.1, the story file is the `epics.md` anchor.
- **Epic gate:** 17.2 is Epic 17's second and last story, so the spine-drift stop for an epic's first story doesn't apply. `sprint-status.yaml` has 17-1 `done` and 17-2 `backlog`. After 17.2 come automate, the Epic 17 retro and its before-next-epic items (AGENTS.md → Epic boundaries).
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`, `tea_execution_mode: auto`.
- **What exists today (from 17.1):**
  - `StatsBars` draws an `aria-hidden` `div` of columns (value, a 160px track with its fill, period lines), followed by the visually hidden table. No group, no buttons.
  - `StatsPage` reads `range`, `from` and `to` from the address and writes the whole search on each change, so any `period` is dropped at the first press. On arrival, `addressNeedsFallback` checks only those three keys, so an address with `period` is left as typed.
  - `useStatsView` already reports `fetching`, and `lib/page`'s same-page marker and `samePageState` are in place.
  - `useNow` refreshes on window `focus` and `visibilitychange`, so a refocus past midnight moves This month's `to` (AC-12's setup).

## Generation Mode

**AI generation, sequential, in this session.** As in 17.1, the run already held every name, string and helper the leaves need, so no 4A or 4B subagent was launched. Selectors come from EXPERIENCE.md's names (the group, the bar names, Show the whole range) and the shipped components, not from a recording: the bar buttons don't exist yet.

**No unit leaves.** A skipped `lib/stats.test.ts` case that imports a function `lib/stats` doesn't export yet (the bar name, the period heading, the period parse) would break `tsc -b` (the 15.2, 16.2 and 17.1 precedent). Those cases are green-phase work for the build (see below).

## Test Strategy

The seed is `BARS` (stats.ts), at fake today 2026-10-28. Custom 1 February – 15 April 2026 (`FEB_APR`) is 6 books and 2,152 pages: February has 1 book and 286 pages, March 3 books and 1,335 pages, April 2 books and 531 pages. This year (8 books, 2,565 pages) adds June and October, and its January, May, July, August and September are empty. All time (9 books, 2,869 pages) adds Solaris in January 2024, so its chart is by year: 2024, an empty 2025, and 2026.

| AC | Level | Priority | Leaf | First assertion (the criterion) |
|---|---|---|---|---|
| AC-1 | E2E | P0 | `frontend/e2e/stats-bars-select.spec.ts:70` | the `group` "Finished by month" is visible |
| AC-2 | E2E | P0 | `:131` | Shift+Tab from the first row lands on the April bar, the latest with finishes |
| AC-3 | E2E | P0 | `:196` | (poll, `pressOnceThen`) a click on March reads `aria-pressed="true"` |
| AC-4 | E2E | P1 | `:260` | (poll, `pressOnceThen`) arriving with March selected, pressing April gives `['true', 'false']` for April and March |
| AC-5 | E2E | P1 | `:299` | with March selected, Show the whole range is visible |
| AC-6 | E2E | P1 | `:337` | (poll) March's track box-shadow is the highlight ring, `page` 2px then `accent` 4px |
| AC-7 | E2E | P1 | `:438` | after This year is pressed with March selected, the month group has 5 buttons with `pressed: false` |
| AC-8 | E2E | P0 | `:480` | (poll, `pressOnceThen`) pressing March writes `FEB_APR&period=2026-03`, the journey's first step; then after Back, `[address, March aria-pressed, row names]` |
| AC-9 | E2E | P1 | `:527` | (poll) `FEB_APR&period=2026-06` is replaced by `FEB_APR` |
| AC-10 | E2E | P1 | `:576` | with This year's view held, the month group (the shown view's chart) is visible |
| AC-11 | E2E | P1 | `:614` | (poll) after a refetch that empties February, the address drops `period=2026-02` |
| AC-12 | E2E | P2 | `:667` | after the refocus on 29 October, the October bar still reads `aria-pressed="true"` |
| AC-13 | E2E | P2 | `:694` | arriving on `FEB_APR&period=2026-03`, March reads `aria-pressed="true"` (for axe to check) |

**State transitions.**
- AC-4, AC-7, AC-11 and AC-12 start from a selected bar. They arrive on an address that carries `period`, as unasserted setup, so the first operation that can fail is the transition's own assertion.
- AC-7 and AC-11 put focus in the chart with keyboard presses only: Shift+Tab from the first row link, which goes through Show the whole range. A missing bar can't fail there.
- AC-10's "no bar is a button" alone passes today, so its first assertion is that the shown view's chart is the `group` (absent today), and the zero-button count follows it.

**AC-13** "the existing specs pass" and "copy.test.mjs passes" are `npm run check`'s job. The leaf covers the axe half with a bar selected. The gate's leaves are listed below.

## What each leaf covers after its first assertion

- **AC-1.** Three buttons named `FEB_APR_BARS` ("March 2026, 3 books, 1,335 pages", which shows the grouping), each `aria-pressed="false"`. The group isn't `aria-hidden`, and the table lists February to April. This year: 5 buttons named Feb, Mar, Apr, Jun and Oct, and nothing else in the chart is focusable (`focusablesIn` gives 5 entries). No "0", "Jan", "2026", "May", "Jul", "Aug" or "Sep" text in the chart is outside an `aria-hidden` element, and the table has 10 rows. All time: the "Finished by year" group, with "2024, 1 book, 304 pages" and "2026, 8 books, 2,565 pages".
- **AC-2.** Exactly one `tabIndex` 0 in the chart, and April carries `tabindex="0"`. Left, Left, then Left again at February (no wrap). End goes to April, Right at April stays, Home goes to February, Right to March, and Up and Down do nothing. Moving presses nothing. Tab out and Shift+Tab back return to March. This year: Shift+Tab lands on October; Left goes to June (skipping September to July), Left to April (skipping May), Home to February (skipping January).
- **AC-3.** "Finished in March 2026" over 3 rows (`MARCH_ROWS`, in the view's order). The figures stay 6 and 2,152, focus is on March, and `status` reads "Finished in March 2026: 3 books.". The address becomes `FEB_APR&period=2026-03` with the history length unchanged, the `h1` not focused and `scrollY` unchanged. Enter presses April (2 rows) and Space releases it (6 rows). February's labels "286", "Feb" and "2026" are inside the button, and a click 2px from its top presses it while one 2px from its bottom releases it. All time: 2024 gives "Finished in 2024", "Finished in 2024: 1 book.", `/stats?range=allTime&period=2024`, and Solaris alone.
- **AC-4.** "Finished in April 2026" over `APRIL_ROWS`, one pressed bar, and `period=2026-04`. Pressing April again releases it: `FEB_APR`'s heading and 6 rows, focus on April, `status` "6 books, 2,152 pages.", the address `FEB_APR`, and nothing pressed.
- **AC-5.** The `h2`'s accessible name is "Finished in March 2026" and it holds no button. The button's font size is `--font-meta-size`, read from the root. Pressing it gives `FEB_APR`'s heading and 6 rows, focus on March (unpressed, the only `tabindex="0"`), `status` "6 books, 2,152 pages.", the address `FEB_APR`, and the button gone.
- **AC-6.** March's labels "1,335" and "Mar" are `INK` at weight 600 and opacity 1, and its fill's opacity is 1. February's three labels are `INK_SECONDARY` at `--font-meta-weight` and opacity 1. Its track has no shadow, and its fill opacity is `components.monthly-bar.dimmed-fill-opacity` (0.35, read from DESIGN.md). The track and both fills transition in `0s`, and the cursor is `pointer`. Hovering February changes nothing but the cursor. With keyboard focus on March, its track's outline is 2px solid `ACCENT` at `components.monthly-bar.selected-focus-offset` (6px), and the ring is still there. Dark: the ring is `page-dark` and `ACCENT_DARK`, March's labels `INK_DARK`, February's `INK_SECONDARY_DARK`, still dimmed. Forced colors, focus elsewhere: February's fill opacity is 1, and March's track outline is 2px solid `Highlight` at 0px (`systemColor`). After Show the whole range, the three bars have no shadow, fill opacity 1, and `ink-secondary` labels at the meta weight.
- **AC-7.** No bar pressed, the address `/stats?range=thisYear`, "Finished this year" over 8 rows, and `status` "8 books, 2,565 pages.". February was the last focused bar and is still in This year's chart, yet Shift+Tab lands on October, so it was forgotten. June selected, then All time: the year group's 2 bars are unpressed, the address is `/stats?range=allTime`, there are 9 rows, and `status` reads "9 books, 2,869 pages.".
- **AC-8.** The journey starts from Home by the nav, then Custom, From and To. March is pressed, DDIA's row opens `/book/<bookId(1)>`, and Back follows. Then "Finished in March 2026", the `h1` focused, and `status` empty. Shift+Tab from Show the whole range lands on March, the selected bar. Back once more lands on Home.
- **AC-9.** 3 unpressed bars, `FEB_APR`'s heading and 6 rows, no Show the whole range, the `h1` not focused, and `status` and `alert` empty. The same quiet drop for `thisYear&period=2026-05` (a month with no finishes), `FEB_APR&period=2026` (a year on a month chart), `allTime&period=2026-03` (a month on a year chart) and `FEB_APR&period=spring`. A valid `period=2026-03` is kept (3 rows). Every stats request's query has only `from` and `to`.
- **AC-10.** While the view is held: no button in the group, `FEB_APR`'s heading and all 6 rows (not March's 3, not This year's 8), and the figure 2,152. Once released: "Finished this year", 5 bars and 8 rows.
- **AC-11.** The routed refetch takes Kindred's 10 February finish out (`books − 1`, `pages − 286`, February's bucket 0/0). After it: the figure 1,866, 2 bars with none pressed, `FEB_APR`'s heading over 5 rows, focus on April (the chart's Tab stop, since February is gone), and `status` and `alert` empty.
- **AC-12.** "Finished in October 2026", the address `/stats?range=thisMonth&period=2026-10` unchanged, and `status` empty.
- **AC-13.** axe, light and dark, with "Finished in March 2026" shown, and the 3 March rows.

## Existing tests this story changes (for the build)

The gate's list for Story 17.2 (Epic 17 intro, checked in this run):

- `frontend/e2e/stats-bars.spec.ts:77–81`: `chartColumns` finds the columns as `[aria-hidden="true"] > div`. It needs another locator, for example the group's direct children, and keeps reading the same value, track and period of every column, empty ones included.
- `stats-bars.spec.ts:182`: the "900" value found under `[aria-hidden="true"]`, which needs the chart's group.
- `stats-bars.spec.ts:236`: with nothing finished on All time, `main` has no `[aria-hidden="true"]` element. It should become: no chart group (and no table, as `:235` asserts). Note that the finished list's rows also hide parts of themselves: the probe saw 12 `aria-hidden` elements in `main` with `FEB_APR`'s list shown. With nothing finished there is no list, so `:236` holds today.

**Not in the gate's list, but 17.2 breaks it (spec question 3):** `frontend/e2e/stats-finished.spec.ts:531–535`, 17.1's AC-16. It opens `/stats?range=thisYear&period=2026-03` and expects all 9 rows ("No period is read or written"). After 17.2, March 2026 is a bar with finishes in `FINISHED`'s This year (DDIA, 14 Mar), so the list narrows to 1 row and `:533` fails. That part pinned 17.1's boundary and stops applying once 17.2 lands. The build has to change it, and the review should record that the gate's list missed it (Epic 15 retro item 104 and Epic 16 retro item 110 ask for the list to be complete).

This run changed none of these: each would fail today if updated, so the build updates them with the feature.

## Spec questions for the build and review

1. **AC-1's "none in a month between".** Custom 1 February – 15 April has only three months, and AC-1 gives all three finishes, so the range has no empty month to show. The leaf checks Custom's three bars as AC-1 names them, and checks the empty bars (not a button, not focusable, text `aria-hidden`) on This year, which has five empty months. The wording should probably say the empty month is in another range, or drop the clause.
2. **AC-11's bar.** AC-11 says "March selected, with the only finish in March". `BARS` has three finishes in March (AC-3 and AC-8 need them), so the leaf uses February, whose only finish is Kindred's 10 February. It is the same rule with a different bar.
3. **The gate list's gap:** `stats-finished.spec.ts:531–535` (above).
4. **Where the rings are drawn.** DESIGN.md puts the highlight ring on the selected bar's track and draws the focus ring around the track (Monthly bars, "Bar focus"). The leaves read the box-shadow and the outline on the track, which `barLook` finds as the first element in the bar that is 160px tall. The forced-colors `Highlight` outline is read on the track too. If the build draws them on the button instead, that is a spec question, not a leaf to loosen.
5. **Tab into the chart.** Chromium keeps Tab inside a date field (it moves between the segments), so the leaves enter the chart with Shift+Tab from the element after it: the first row link, or Show the whole range when it shows. A roving Tab stop is the same stop from either side.
6. **The bar's name.** The leaves read the name with `toHaveAccessibleName`, so `aria-label` and content both work. `focusablesIn`'s label is only a debugging aid, and no leaf compares it.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] AC-1, AC-3, AC-5: `lib/stats.test.ts` cases for the bar name ("March 2026, 3 books, 1,335 pages", "1 book", "1 page", a year), the period heading ("Finished in March 2026", "Finished in 2024"), the announcement ("Finished in March 2026: 3 books.", "1 book."), parsing and validating `period` (`YYYY-MM` on a month chart, `YYYY` on a year chart, a bucket with `books > 0`, anything else dropped), and `statsSearch` writing `period` last.
- [ ] AC-2: Tab out and back falls to the selected bar when the last focused bar has left the chart (AC-8 covers the selected bar on a fresh body), and Up and Down don't scroll the page.
- [ ] AC-3: Space presses a bar from rest (the leaf uses Space to release), and a click on the track itself.
- [ ] AC-5: the button sits `{spacing.4}` after the heading's text, on its baseline, styled as a `link` (DESIGN.md Stats finished list → Heading).
- [ ] AC-6: the focus ring in dark (`ACCENT_DARK`), the focus ring on an unselected bar at the plain `components.focus-ring` offset (2px), and under forced colors the focus ring in the system color at 6px.
- [ ] AC-7: committing another Custom range releases the bar, including a Custom wider than 24 months that turns the month chart into a year chart.
- [ ] AC-9: a valid `period` survives a reload and Back/Forward, and the h1 focus rules (AC-8) hold for an arrival with a `period`.
- [ ] AC-11: a failed refetch keeps its copy and counts as settled, so the bar stays selected while the copy still has it; when the emptied bar was the chart's only bar with finishes, focus goes to the `h1`.
- [ ] AC-12: the same at a New Year (`NEW_YEAR_NOW`) on This year is a change of year, not of range; not required by AC-12, so only if cheap.
- [ ] AC-13: `copy.test.mjs` passes with the new strings ("Show the whole range", "Finished in …", the bar names). The bar keys are handled on the chart by `event.key` name, not on `window`.

## Helper probes

- **Helpers reused:** `test`, `expect` (fixtures.ts); `serverAtFakeToday`, `stopAndRemove` (home.ts); `ACCENT`, `ACCENT_DARK`, `bookId`, `designColor`, `designComponentValue`, `INK`, `INK_DARK`, `INK_SECONDARY`, `INK_SECONDARY_DARK`, `pressOnceThen`, `rgbOf` (library.ts); `systemColor` (dev-mode.ts, in place of `catalog-tiles-automate.spec.ts`'s spec-local copy); and from stats.ts: `address`, `afterAnnounceDelay`, `AXE_TAGS`, `dateField`, `figure`, `finishedHeading`, `finishedLink`, `finishedLinks`, `historyLength`, `labelsOf`, `nav`, `preset`, `recordStatsRequests`, `STATS_API`, `statsRequestFor`, and the private `done` reading builder. None of these was changed, so none was probed.
- **Helpers added:**
  - `BARS`, `FEB_APR`, `FEB_APR_BARS`, `FEB_APR_ROWS`, `MARCH_ROWS`, `APRIL_ROWS` (stats.ts): the seed and its expected names. `FINISHED` (17.1) has only one finish in March and no April finish inside 15 April, so it can't give Flow 16's three March rows. `FEB_APR_ROWS` has the same name as a spec-local constant in `stats-finished.spec.ts`, which that spec doesn't import, so they don't clash.
  - `barChart`, `chartBars`, `bar`, `showWholeRange` (stats.ts): locators for the new group, its buttons, one bar by the start of its name, and the new button. No locator found any of them.
  - `focusablesIn`, `Focusable` (stats.ts): every focusable element in a container with its `tabIndex`, for "one Tab stop" and "an empty bar can't be focused". No existing helper lists Tab stops.
  - `barLook`, `BarLook` (stats.ts): a bar's track ring, outline and transition, its fill's opacity, and each label's color, weight and opacity, with opacities multiplied up to the bar. `stats-bars.spec.ts`'s `chartColumns` is spec-local, depends on the `aria-hidden` locator the gate replaces, and reads neither the box-shadow, outline, opacity, weight nor cursor. `barLook` finds the track by its 160px height, not by child position.
  - `highlightRing` (stats-bars-select.spec.ts, spec-local): the computed box-shadow string for a `page` and an `accent` color.
- **Shipped numbers:**
  - `BARS`'s totals: `FEB_APR` 6 books and 2,152 pages, This year 8 and 2,565, All time 9 and 2,869, and the table's periods (February to April; 10 months; 2024, 2025, 2026). All measured on the running app in the probe, which saw each `figure` and the table rows.
  - The track's 160px (DESIGN.md Monthly bars; `.track` in `StatsBars.module.css`): measured 160 on `FEB_APR`'s shipped chart (1280 × 900, light, `deviceScaleFactor` 1). Asserted as measured, as `barLook`'s track test.
  - `meta` size and weight: the leaves read `--font-meta-size` and `--font-meta-weight` from the root at run time, so no number is retyped. The probe saw 13px and 400, and the shipped labels at `rgb(95, 99, 92)` (`INK_SECONDARY`) and weight 400.
  - 0.35 and 6px are `components.monthly-bar` values for new UI, read with `designComponentValue`, not retyped. The highlight ring is `components.highlight-ring.ring`, built from `designColor('page')` / `designColor('page-dark')` and `ACCENT` / `ACCENT_DARK`.
- **Widths:** every outline width asserted is 2px, a whole pixel. No fractional border or outline width, so E10-R1 doesn't apply.
- **Storage keys:** no new localStorage key. The bar lives only in the address. `APP_STORAGE_KEYS` unchanged.
- **e2e probes** (Chromium Desktop Chrome, `deviceScaleFactor` 1, light, 1280 × 900; `npx playwright test e2e/stats-bars-select.probe.spec.ts`; removed with `rm`): 2 passed on the second run.
  - `barLook` on a `setContent` bar: a 160px track with `box-shadow: 0 0 0 2px #F6F4EF, 0 0 0 4px #557059` returned exactly `highlightRing(rgbOf(designColor('page')), ACCENT)`. It also returned the outline 2px solid `ACCENT` at 6px, transition `0s`, fill opacity 0.35, cursor `pointer`, and the three labels with their exact colors and weights (600, 400, 400).
  - `barLook` rejections: a 159px track threw "no 160px track", and opacity 0.5 on the bar multiplied to 0.5 on every label and 0.175 on the fill.
  - `barLook` on the shipped chart: March's column returned the labels "1,335" and "Mar", shadow `none`, fill opacity 1 and transition `0s`. February's returned "286", "Feb" and "2026" in `INK_SECONDARY` at weight 400.
  - `focusablesIn` on a `setContent` group: it returned the two buttons, the `tabindex="-1"` span and the link with their `tabIndex` (0, −1, −1, 0), and left out the disabled button and the plain `div`. It returned `[]` for the shipped `aria-hidden` chart and 6 entries for `FEB_APR`'s list.
  - The first probe run failed twice and caught one helper bug: `focusablesIn`'s text fallback kept raw white space. It now collapses white space. The other failure was the probe's own `[aria-hidden="true"]` locator, which matched 12 elements in `main` (the rows hide parts too) and now takes `.first()`. After the fix, both probes passed.
  - AC-12's setup on the app: on This month, a clock moved to 00:30 on 29 October and a window `focus` sent `from=2026-10-01&to=2026-10-29`, and the server answered 200.
  - `systemColor(page, 'Highlight')` under emulated forced colors returned `rgba(5, 0, 73, 0.8)`. The leaf compares the outline with that value as read in the same mode.
- **Render-before-read:** every one-shot read follows a web-first wait on shipped UI (the `figure`, the row count, the `h1`) or on the criterion itself.
  - `focusablesIn` runs after `chartBars` `toHaveCount` or a `toBeFocused`.
  - `barLook` runs inside a poll, or after one on the same chart.
  - `labelsOf` runs after `finishedLinks` `toHaveCount(n)` or inside a poll.
  - `historyLength` and `scrollY` run after the shipped row count.
  - Fixed while writing: AC-3's 2024 rows and AC-13's March rows read `labelsOf` after a heading check alone. Both now wait on `toHaveCount` first.

## TDD Red Phase

13 skipped leaves in `frontend/e2e/stats-bars-select.spec.ts` (`test.skip`), each with a `// RED:` reason.

**Red today.** This run came after the probes above last passed. It used a throwaway un-skipped copy with the same line numbers, `stats-bars-select.redcopy.spec.ts`, run with `--timeout=20000` and removed with `rm`. All 13 failed, each at its criterion assertion:

| AC | Fails at | Because |
|---|---|---|
| AC-1 | `stats-bars-select.spec.ts:81` | no "Finished by month" group |
| AC-2 | `:146` | no April bar to hold focus |
| AC-3 | `:210` | the poll got `null`: no March bar to press |
| AC-4 | `:277` | the poll got `null`: no April bar |
| AC-5 | `:309` | no Show the whole range |
| AC-6 | `:356` | the poll timed out: no bar with a 160px track to read |
| AC-7 | `:455` | no group, so 0 unpressed buttons, not 5 |
| AC-8 | `:495` | the poll got `null`: no March bar to press |
| AC-9 | `:539` | the address keeps `&period=2026-06` |
| AC-10 | `:597` | no group while the view is held |
| AC-11 | `:650` | the address keeps `&period=2026-02` after the refetch |
| AC-12 | `:683` | no October bar |
| AC-13 | `:702` | no March bar |

## Implementation checklist (for `bmad-build-auto`)

- [ ] `lib/stats`: the bar name, the period heading, the selection announcement; `period` in the parsed address and in `statsSearch`; validating a period against the shown view's buckets with `books > 0`; unit cases. (AC-1, AC-3, AC-9)
- [ ] `components/StatsBars`: a `group` named "Finished by month" or "Finished by year", not `aria-hidden`. Each bucket with books is a toggle `button` with `aria-pressed`, spanning the whole column. Empty columns are plain and `aria-hidden`. The roving `tabindex` covers the last focused, selected and latest bar; the keys (Left, Right, Home and End, handled by name on the chart) don't wrap and skip empty bars. The table is unchanged. (AC-1, AC-2)
- [ ] `StatsBars.module.css`: the selected track's highlight ring, its labels in `ink` at 600, the other bars' fill at 0.35, the track focus ring (6px on the selected bar), `cursor: pointer`, no transition, and under forced colors no dimming plus a 2px `Highlight` outline at 0. (AC-6)
- [ ] `StatsPage`: `period` from the address and checked against a settled view (`fetching`). It is written by a same-page replace, cleared by the person's range change, kept when a preset's dates move to a new day, and dropped quietly on arrival or after a refetch, with focus moved to the chart's Tab stop or the `h1`. It is never sent to the server. The page announces the selection and the range line on widening, and nothing on arrival. (AC-3, AC-4, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12)
- [ ] `components/StatsFinishedList`: the period heading, the narrowed rows (`finishDate` starting with the period), and Show the whole range as a sibling of the `h2`, moving focus back to the bar. (AC-3, AC-5)
- [ ] The gate's `stats-bars.spec.ts` leaves (`:77–81`, `:182`, `:236`) and the unlisted `stats-finished.spec.ts:531–535` (above). (AC-13)
- [ ] Un-skip the 13 leaves and run `npm run check`.

## Suite

- `npx playwright test e2e/stats.spec.ts e2e/stats-bars.spec.ts e2e/stats-finished.spec.ts e2e/stats-finished-automate.spec.ts e2e/stats-bars-select.spec.ts`: 47 passed, 13 skipped.
- `npx tsc -b` clean, and oxlint on the two e2e files clean. Prettier: both changed files pass. The full `npm run check` wasn't run.
- `git status` after the run: only `frontend/e2e/stats.ts` (modified), `frontend/e2e/stats-bars-select.spec.ts` (new) and this checklist. No `*.probe.*` file or throwaway copy remains.
