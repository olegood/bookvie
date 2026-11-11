# Epic 6 Context: Know how long and how much

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give Oleg two kinds of answer about his reading. The first is a forward look: a pages-per-day calculator, prefilled with Measured pace, that shows when one Book or the whole unread library would be finished. The second is a look back: a Stats page that shows Books and pages finished for any period, with monthly (or yearly) bars. The epic matters because it turns stored progress and finishes into numbers Oleg can plan with, and it retires the date/time and pace/stats correctness risks (R-07, R-10). It does that through fake-Clock boundary tests on pace, ranges, month edges and local dates.

## Stories

- Story 6.1: See when this book will be finished
- Story 6.2: See when my whole unread library will be finished
- Story 6.3: See what I finished in any period
- Story 6.4: See my reading month by month

## Requirements & Constraints

- **Pages left, Book scope:** the pages left in the Book's current (active or paused) Reading, or all its pages when it has never been started. A Book with nothing left (finished, no unfinished Reading) reads "Nothing left to read."
- **Pages left, library scope:** all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, re-reads included. Finished Books without an unfinished Reading are not counted. A Book with both a finished and an unfinished Reading must never be counted twice. Side read marks change nothing. Donation doesn't exist yet, and every Book is `owned`.
- **Calculator input:** the field is prefilled with Measured pace rounded to one decimal, or empty when there is none. The result updates on every keystroke. Zero, negative, non-numeric or empty input shows no result, no message and no error styling.
- **Stats:** the count of finished Readings and the sum of their stored `finishedPages` for the range. Each finish counts by its local `finishDate`. A back-filled Reading counts in its Finished on period. Re-reads count again. A Side read mark never adds anything. All of a Reading's pages land in its finish period, with no smoothing: a 900-page Book finished on 2 December is 900 pages in December. "All time" starts at the earliest finished Reading, back-fills included.
- **Stored values:** Stats use the stored `finishedPages`. Editing a Book's Pages after a finish must not change Stats.
- **Tone:** no streaks, no praise, no exclamation marks, no red failure states.
- **Accessibility:** WCAG 2.2 AA in both themes.
- **Epic gate:** fake-Clock boundary tests for pace, ranges, month edges and local dates are green. The per-epic quality gates also apply: P0 = 100%, P1 ≥ 95%, every error code has an API test, `check:api` is clean, coverage is ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.

## Technical Decisions

- **The server owns the numbers; the client owns presentation.** The server computes pages left (Book and library scope), Measured pace, and the stats totals and buckets. The client never recomputes them. The client owns only the calculator's arithmetic and the copy and date formatting.
- **Calculator arithmetic:** days = max(1, ceil(pages left ÷ pages/day)), and finish date = client today + days. This uses the same rounding and minimum as the server's days left. With nothing left, or a pace ≤ 0, show no days.
- **Duration format:** days below 60 days, months below 24 months, years from 24 months on. Below 60 days the date is a day and month ("About 12 days · 10 November"), with the year added only when it isn't this year. Months and years show month and year ("About 9 months · July 2027").
- **Measured pace** lives only in `domain/pace`, behind the injected `Clock`. It is Σ max(finishedPages − startPage, 0) ÷ Σ inclusive days, over finished Readings that have a start date. Back-fills are excluded.
- **Stats view:** `GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD`, with both dates inclusive local dates. Omit both for All time.
  - The response is `{ books, pages, bucket: "month" | "year", buckets: [{ period, books, pages }] }`.
  - `bucket` is `year` when the range exceeds 24 months.
  - Month buckets count only finishes inside the range, so a range starting 15 March counts March from the 15th.
  - All time with no finishes returns 0, 0 and no buckets.
  - The browser resolves the presets to dates: This month = the 1st..today, This year = 1 January..today, Last year = the full previous year.
- **Where the code goes:** stats go in a new `views/stats`. Pages left and Measured pace are added to the existing book and catalog views. Pydantic models are the contract, and TS types are regenerated (`npm --prefix frontend run api:gen`) and checked by `check:api`. Never hand-edit `schema.d.ts`.
- **Views and data:** views don't carry the server's date. View queries are keyed `['view', name, params]`. There are no optimistic updates, and all views refetch after any intent and on window focus.
- **Time:** `domain/` never reads the system clock. Local dates are `YYYY-MM-DD`. Tests pin `TZ=Europe/Madrid`. In e2e, the Playwright fixture sets `page.clock` to the same date it passes as `--fake-today`, and sets `timezoneId: 'Europe/Madrid'`. DST tests use the last Sundays of March and October.
- **Tests:** pytest with a fake `Clock` for `domain/` and the views. Playwright e2e drives the UI by exact accessible names, with no `data-testid`.

## UX & Interaction Patterns

- **Pace calculator, Book detail:** a "How long until…?" block in the right column, after Readings and before Change color. It holds a "pages/day" number field (80px) and an `output` element for the result, inline on `surface-inset`, with no error styling.
- **Pace calculator, Catalog:** the link "How long until…?" sits below the library meter, collapsed by default. Activating it expands the same calculator inline, with `aria-expanded`. Example: 30 pages/day with 8,100 pages left reads "About 9 months · July 2027".
- **Top nav:** a **Stats** item completes the order Home · Catalog · Stats · Card notes · Backup. The page's `h1` is "Stats", and `document.title` follows the "Stats — bookvie" pattern. Focus moves to the `h1` on route change.
- **Range picker:** a segmented control with This month · This year · Last year · All time · Custom. The default is This year. Custom reveals "From" and "To" date fields, and To-before-From swaps them silently.
- **Totals:** two big numbers, books finished and pages finished, in `gauge-figure` with `meta` captions. On a range change the polite `status` region reads "2 books, 610 pages.", set after the usual short tick. An empty range shows 0 and 0 with "No books finished in this range." All time with no finishes shows "No books finished yet." and no bars.
- **Bars:** one vertical bar per bucket, with height proportional to pages finished. The value sits above in `meta` and the period below. The fill is `accent` on an `accent-soft` track. The same data is exposed to assistive tech as a table (period, books, pages). Updates are instant, with no animation under reduced motion.

## Cross-Story Dependencies

- Story 6.2 reuses Story 6.1's calculator: the same field, prefill, arithmetic, duration formatter and invalid-input rules.
- Story 6.4 extends Story 6.3's stats view and page with the bucket logic and the chart. Both stories share the view's response shape.
- Both calculators depend on Measured pace and the days-left rounding from Epic 3 (`domain/pace`). They also depend on Reading status, `startPage` and the current Reading from Epics 3 and 4. Stats depend on the stored `finishDate`/`finishedPages` values written by finishes and back-fills (Epics 1, 3 and 4).
- Epic 7's Catalog toolbar shares the Catalog layout with the collapsed calculator link, which sits below the library meter.
