---
title: Finished Books behind the Stats numbers — plan
status: agreed
created: 2026-11-27
source: party-mode session (Mary, John, Sally, Winston, Amelia, Murat) with Oleg
idea: GitHub issue olegood/bookvie#8, "Finished Books behind the Stats numbers"; Oleg, 2026-11-27 → "I would like to see the exact books I read in any period (custom period as well)"
---

# Finished Books behind the Stats numbers — plan

Let the Stats page show **which** Books were finished, not only how many. Under the chart, a list shows every Book finished in the chosen range: This month, This year, Last year, All time or Custom. Clicking a bar narrows the list to that month or year. The range and the selected bar are kept in the URL, so Back from a Book's page returns to the same list.

## 1. What already exists

- **Any period, Custom included, already works** (Amelia). The range picker has This month · This year · Last year · All time · Custom, with From and To fields (`pages/StatsPage.tsx`, `lib/stats.ts`). The only thing missing is the list of Books behind the number.
- **The range isn't in the URL** (Amelia). `StatsPage.tsx` keeps it in component state ("Not persisted: every visit starts on This year"). The issue's `?period=2026-03` alone wouldn't restore anything on Back, because the page would come back on This year.
- **The server counts, the client draws** (AD-6). `views/stats.py` walks every finished Reading in the range, counts each by its `finishDate` (re-reads count again) with its stored `finishedPages`, and fills one bucket per month (or per year, past 24 months). Side read marks change nothing.
- **`get_stats` returns the same `StatsView`** (`agent/read_tools.py:84`, AD-21). A new field on the view reaches the agent too (Winston).
- **The chart is decorative** (`components/StatsBars.tsx`). It is `aria-hidden`, and a visually hidden table (period, books, pages) carries the same buckets for assistive tech. Bars are as tall as their pages, not their books.
- **A Reading stores a `rating`** (1–5, optional). Book detail's Readings and the Finish dialog show it as sage stars, which aren't the gold favourite star (EXPERIENCE.md → Favourite star).
- **Tiles already draw a cover or a typeset cover** from `coverFile` and the spine colour (Epic 8).

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **The list shows finished Readings only.** Side reads aren't in it, as they aren't in the counts. | Oleg's call (Murat: "the list should add up to the bar's number"). Mary's "Also read on the side" group is filed, not withdrawn. |
| D2 | **One row per finish.** A Book finished twice in the range has two rows, one for each date. The number of rows always equals the books count of the range (or of the selected bar). | Murat: it matches how the counts work; "two dates in one row is a lie by compression". Rows are sorted by date, so the two rarely sit together. |
| D3 | **Each row:** the cover (or the typeset cover, at thumbnail size), the title, the author as the catalog writes it (first author, "and N others"), the pages that finish added (`finishedPages`), the finish date, and the Reading's **rating** as sage stars. An unrated finish shows no stars and no "No rating" text. The whole row links to the Book's page. | Oleg's call to add the rating (Sally: "a memory, not a receipt"; John: scope creep). The pages explain a tall bar with few Books (the issue's extra). |
| D4 | **Newest first.** Finishes on the same day sort by title. The server sorts them. | The issue. Server-side keeps AD-6: the client doesn't order or count. |
| D5 | **The finishes come with the range, in `StatsView`.** A new `finishes` list, one entry per finished Reading in the range: `bookId`, `title`, `firstAuthor`, `authorCount`, `coverFile`, `spineColor`, `finishDate`, `finishedPages`, `rating`. No new endpoint and no paging. All time sends every finish. | Winston: the view already walks those Readings. A few hundred rows are small. Selecting a bar costs no round trip. |
| D6 | **`get_stats` returns `finishes` too**, and its description says so. No new agent tool. | Mary: "What did I read last spring?" becomes a question Oleg can ask. |
| D7 | **The list sits under the chart**, as a list (`ol`), not a table. Its heading names what it shows: "Finished this month", "Finished this year", "Finished last year", "Finished, all time", "Finished 1 February – 15 April 2026" for Custom, and "Finished in March 2026" or "Finished in 2024" for a selected bar. | The issue: a popup is cramped for a long year. Amelia: `stats-bars.spec.ts` finds the chart's table as "the only table in `main`". |
| D8 | **An empty range shows no list**, only today's "No books finished in this range." or "No books finished yet." | Nothing to list. The empty lines stay as they are. |
| D9 | **Bars become buttons (Story 17.2).** Each bar with at least one finish is a button named, for example, "March 2026, 3 books, 912 pages", with `aria-pressed`. The chart is one Tab stop: arrow keys move between the bars that have finishes, and Home and End go to the first and last. A bar with no finishes is drawn as today but isn't a button and can't be focused. | The issue's notes. Sally: Tab shouldn't stop on 24 bars. |
| D10 | **Selecting narrows, selecting again widens.** A selected bar is highlighted and the others are dimmed. The list shows only that period's finishes. Pressing the selected bar again, or a "Show the whole range" button next to the list's heading, goes back to the whole range. Focus stays where it was. | The issue. |
| D11 | **Announcements.** Selecting a bar announces "Finished in March 2026: 3 books." in the `status` region. Going back to the whole range announces the range's line ("12 books, 4,310 pages."), as a range change does today. | The issue: announce the list's heading politely. |
| D12 | **The URL keeps the range and the bar.** `/stats?range=thisMonth\|thisYear\|lastYear\|allTime\|custom`, plus `from` and `to` for Custom, plus `period=YYYY-MM` or `YYYY` for a selected bar. A preset is stored by name, so "This year" next January means the new year. Every change *replaces* the history entry, so Back from Stats leaves Stats in one step, and Back from a Book returns to the same range and bar. | Oleg's call (Sally and Winston). Winston: the URL is this visit's address, not memory across visits. |
| D13 | **A plain `/stats` still opens on This year** with no bar, as today. Nothing is remembered in localStorage. | The "not persisted" decision stands (Winston). |
| D14 | **A bad URL falls back quietly.** An unknown `range`, or a Custom without two valid dates, opens This year. A `period` that isn't a bar with finishes in the shown range, or is the wrong kind (`YYYY` on a month chart), is ignored. No error message. | Murat: a hand-edited or stale link must never break the page. |
| D15 | **Changing the range clears the selected bar.** | The issue. A bar from the old range may not exist in the new one, or may be a month where the chart now shows years. |
| D16 | **The hidden table stays.** It is still the overview of every period, empty ones included. The bar buttons are the way to choose one. | Murat accepts the overlap. Sally: without the table, empty months vanish for a screen reader. |
| D17 | **Epic 17, two stories, an FR-16 amendment.** 17.1 the list for the range (with the range in the URL), 17.2 clickable bars (with the bar in the URL). | Oleg's call (John's split, a fourth time). FR-16 is "Stats for any period"; the list is part of it, not a new requirement. |

Out of scope:
- Side reads in the list (D1).
- The favourite star on a row, and "purpose fulfilled". Only the rating was asked for.
- New presets such as Last month or Last 12 months. Custom covers them.
- Paging, sorting or filtering the list, and exporting it.
- A tooltip or popover on a bar.

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 0 | Spine | Before Epic 17's first story: confirm `deferred-work.md` has no unresolved "spine drift" entries from Epic 16 (AGENTS.md → Architecture spine). | — |
| 1 | EXPERIENCE.md | Stats: the finished list (D1–D4, D7, D8), clickable bars with their names, keyboard and pressed state (D9, D10), the announcements (D11), the URL (D12–D15) and the hidden table (D16). Update the "Monthly bars" and "Stats range picker" rows and Flow 7. Name every heading and string. | `bmad-ux` (update) |
| 2 | DESIGN.md | The list row: thumbnail size, the typeset cover at that size, type for title, author, pages and date, and the sage rating stars at row size. The selected bar and the dimmed ones, in both themes. Reuse tokens; add none unless a guard needs it. | `bmad-ux` (update) |
| 3 | PRD | Amend **FR-16: Stats for any period**: the Books behind the numbers, one per finish, newest first, narrowed by a period's bar; range and period in the address. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | AD-6: `StatsView.finishes` and its order (D4, D5); the Stats URL state as an exception to "page state isn't kept" (D12–D14). AD-21: `get_stats` returns `finishes` (D6). Capability map row for FR-16. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 17: See the Books behind the numbers**, covering the FR-16 amendment, with the two stories below. Add it to the Epic List and the FR coverage map. Per Epic 16 retro item 110, the gate names each guard and existing leaf that changes (section 5). | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Add Epic 17 and Stories 17.1 and 17.2. | `bmad-sprint-planning` |
| 7 | Stories 17.1, 17.2 | Each: ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate` (AGENTS.md → Story pipeline). Then the Epic 17 retro, since 17.2 closes the epic. | per story |

## 4. Story cut (Epic 17)

**17.1 See the Books finished in a range.** D1–D8, D12 (range only), D13, D14 (range only):

- `views/models.py`: `StatsFinish` and `StatsView.finishes`. `views/stats.py`: build and sort them from the finishes it already collects.
- `npm --prefix frontend run api:gen` (AD-8). Frontend and e2e fixtures gain `finishes`.
- Agent: `get_stats` returns `finishes`, and its description says so.
- `pages/StatsPage.tsx`: the range is read from and written to the URL (`useSearchParams`, replace). A new list component under the chart with the D3 row and the D7 heading.
- `lib/stats.ts`: the URL ↔ range parsing with its quiet fallbacks, and the list headings.

**17.2 Choose a month or year by its bar.** D9–D11, D12 (period), D14 (period), D15, D16:

- `components/StatsBars.tsx`: bars with finishes become buttons with names and `aria-pressed`; one Tab stop with arrow keys, Home and End; selected and dimmed styles. The chart is no longer `aria-hidden`; the hidden table stays.
- `pages/StatsPage.tsx`: the selected period in the URL; the list narrowed to it (filtering by period, not counting: the heading's count is the bucket's `books`); "Show the whole range"; the announcement.

## 5. Tests

Murat's risks, for the ATDD:

- **The list adds up** (P0): for every preset and a Custom range starting mid-month, the rows equal the books count, and with a bar selected they equal that bar's books. A Book finished twice in the range has two rows. A back-filled finish (no start date) is listed. A side read isn't.
- **Back restores it** (P0): choose Custom 1 Feb – 15 Apr, select March, open a Book, press Back: the same range, bar and list. Back from Stats then leaves Stats in one step.
- **Bars as buttons** (P0): names like "March 2026, 3 books, 912 pages", `aria-pressed`, one Tab stop, arrows skip bars with no finishes, Home and End. Pressing the selected bar again, or "Show the whole range", widens the list.
- **Order and rows** (P1): newest first, ties by title; cover or typeset cover; the rating as stars, none when unrated; each row links to its Book.
- **Bad URLs** (P1): an unknown range, a half Custom, a bad date, a period outside the range and a year period on a month chart all open quietly as D14 says.
- **Range change clears the bar** (P1), including a change from a month chart to a year chart.
- **Announcements** (P1): selecting a bar announces "Finished in March 2026: 3 books."; a plain `/stats` load announces nothing, as today.
- **Agent** (P1): `get_stats` returns `finishes` equal to the route's.
- **Year buckets** (P1): a range over 24 months lists by year, and selecting a year bar shows that year's finishes inside the range.

Existing leaves that change (grepped on 2026-11-27; the epic's gate should name them, Epic 15 retro item 104 and Epic 16 retro item 110):

- **17.1:** `backend/tests/test_stats.py:253` (the empty view gains `"finishes": []`); `backend/tests/test_agent_read.py`'s `get_stats` description check (`DESCRIPTIONS["get_stats"]`); `frontend/src/api/generated/schema.d.ts` regenerated.
- **17.2:** `frontend/e2e/stats-bars.spec.ts:77–81`, `:182` and `:236`, which find the chart by `[aria-hidden="true"]`.
- **Guards:** no stored field, colour or token is added. New copy strings (the headings, "Show the whole range", the announcement) go through `frontend/scripts/copy.test.mjs`'s copy rules; run it in each story.
