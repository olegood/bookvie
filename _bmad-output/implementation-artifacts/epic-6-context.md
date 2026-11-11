# Epic 6 Context: Know how long and how much

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give Oleg two kinds of answer about his reading. The first is a forward look: a pages-per-day calculator, prefilled with Measured pace, that shows when one Book or the whole unread library would be finished. The second is a look back: a Stats page that shows Books and pages finished for any period, with monthly (or yearly) bars. The epic turns stored progress and finishes into numbers Oleg can plan with, and it retires the date/time and pace/stats correctness risks (R-07, R-10) through fake-Clock boundary tests on pace, ranges, month edges and local dates.

## Stories

- Story 6.1: See when this book will be finished
- Story 6.2: See when my whole unread library will be finished
- Story 6.3: See what I finished in any period
- Story 6.4: See my reading month by month

## Requirements & Constraints

- **Pages left, Book scope:** the pages left in the Book's current (active or paused) Reading, or all its pages when it has never been started. Nothing left (finished with no unfinished Reading, or an unfinished Reading at its last page) reads "Nothing left to read."
- **Pages left, library scope:** all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, re-reads included. Finished Books without an unfinished Reading are not counted, a Book with both a finished and an unfinished Reading is never counted twice, and Side read marks change nothing. Every Book is `owned` (donation doesn't exist yet).
- **Calculator input:** prefilled with Measured pace rounded to one decimal, dropping a trailing ".0" (20 → "20"), or empty when there is none. The result updates on every keystroke. Zero, negative, non-numeric or empty input shows no result, no message and no error styling.
- **Stats:** the count of finished Readings and the sum of their stored `finishedPages` in the range. Each finish counts by its local `finishDate`; a back-filled Reading counts in its Finished on period; re-reads count again; Side read marks never add anything. All of a Reading's pages land in its finish period (a 900-page Book finished 2 December is 900 pages in December). "All time" starts at the earliest finished Reading, back-fills included. Editing a Book's Pages after a finish never changes Stats.
- **Tone:** no streaks, no praise, no exclamation marks, no red failure states.
- **Accessibility:** WCAG 2.2 AA in both themes.
- **Epic gate:** fake-Clock boundary tests for pace, ranges, month edges and local dates green, plus the per-epic quality gates (P0 = 100%, P1 ≥ 95%, every error code has an API test, `check:api` clean, coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`).

## Technical Decisions

- **The server owns the numbers; the client owns presentation.** The server computes pages left (both scopes), Measured pace, and the stats totals and buckets; the client never recomputes them. The client owns the calculator arithmetic, preset-to-date resolution, copy and date formatting, using its own "today".
- **Calculator arithmetic:** days = max(1, ceil(pages left ÷ pages/day)), the same rounding and minimum as the server's days left; finish date = client today + days. Duration unit: days below 60 days, months = round(days ÷ 30.4375) below 24 months, years = round(months ÷ 12) beyond. 1 day reads "About 1 day". Below 60 days the date is day and month ("About 12 days · 10 November"), adding the year only when it isn't this year; months and years show month and year ("About 9 months · July 2027").
- **Measured pace** lives only in `domain/pace`, behind the injected `Clock`: Σ max(finishedPages − startPage, 0) ÷ Σ inclusive days, over finished Readings with a start date (re-reads included). It excludes back-fills and Readings finished before they started, and counts a missing `finishedPages` as 0.
- **Stats view:** `GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`, both inclusive local dates, both omitted for All time. Response `{ books, pages, bucket: "month" | "year", buckets: [{ period, books, pages }] }`. `bucket` is `year` for ranges over 24 months. Buckets count only finishes inside the range (a range from 15 March counts March from the 15th). All time with no finishes returns 0, 0 and no buckets. Browser presets: This month = the 1st..today, This year = 1 January..today, Last year = the full previous year.
- **Where the code goes:** stats in a new `views/stats`; pages left and Measured pace added to the existing book and catalog views. Pydantic models are the contract; regenerate TS types with `npm --prefix frontend run api:gen` (checked by `check:api`) and never hand-edit `schema.d.ts`.
- **Views and data:** views don't carry the server's date. Query keys are `['view', name, params]`; no optimistic updates; all views refetch after any intent and on window focus.
- **Time:** `domain/` never reads the system clock. Tests pin `TZ=Europe/Madrid`; the Playwright fixture sets `page.clock` to the same date it passes as `--fake-today` and `timezoneId: 'Europe/Madrid'`. DST tests use the last Sundays of March and October.
- **Tests:** pytest with a fake `Clock` for `domain/` and views; Playwright e2e by exact accessible names, no `data-testid`.

## UX & Interaction Patterns

- **Pace calculator:** "pages/day" Text field, 80px, `type="text"` with `inputmode="decimal"`, and an `output` in `body` for the result, inline on `surface-inset`. The `output` is not a live region; the field is described by it via `aria-describedby`. "Nothing left to read." in `body-sm`/`ink-secondary` replaces the row.
- **Book detail:** a "How long until…?" block in the right column, after Readings and before Change color, always shown.
- **Catalog:** a `link` "How long until…?" below the library meter (before the bookcase or list), collapsed by default; activating it expands the calculator inline with `aria-expanded`. Example: 30 pages/day with 8,100 pages left reads "About 9 months · July 2027".
- **Top nav and page:** **Stats** completes Home · Catalog · Stats · Card notes · Backup. The page `h1` is "Stats" in `page-title`, `document.title` is "Stats — bookvie", and focus moves to the `h1` on route change.
- **Range picker:** segmented presets This month · This year · Last year · All time · Custom, default This year, using the shared segmented-control selected treatment (`accent-soft` fill, weight 600, 2px `accent` bottom bar). Custom reveals "From" and "To" date fields; To before From swaps silently.
- **Totals:** two big numbers, books finished and pages finished, in `gauge-figure` with `meta` captions. On a range change the page's one polite `status` region reads "2 books, 610 pages." (emptied first, set after the short ~100 ms tick). An empty range shows 0 and 0 with "No books finished in this range."; All time with nothing finished shows "No books finished yet." and no bars.
- **Bars:** one vertical bar per bucket, height proportional to pages finished, value above in `meta`, period below; `accent` fill on an `accent-soft` track. Same data exposed to assistive tech as a table (period, books, pages). Updates are instant, with no animation under reduced motion.

## Cross-Story Dependencies

- Story 6.2 reuses Story 6.1's calculator: field, prefill, arithmetic, duration formatter and invalid-input rules.
- Story 6.4 extends Story 6.3's stats view and page with bucket logic and the chart; both share the response shape.
- Both calculators depend on Measured pace and days-left rounding from Epic 3 (`domain/pace`) and on Reading status, `startPage` and the current Reading from Epics 3 and 4. Stats depend on stored `finishDate`/`finishedPages` written by finishes and back-fills (Epics 1, 3, 4).
- Epic 7's Catalog toolbar shares the Catalog layout with the collapsed calculator link.
