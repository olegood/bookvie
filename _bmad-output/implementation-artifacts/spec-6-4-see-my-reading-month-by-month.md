---
title: 'Story 6.4: See my reading month by month'
type: 'feature'
created: '2026-11-11'
baseline_revision: '44955bf2b11f6500b4222b6559d2b3efa3adb86c'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-6-4-see-my-reading-month-by-month.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the spine doesn't record the stats buckets' rules (`period` as `YYYY-MM` or `YYYY`, oldest first, one per calendar month or year from `from` to `to` with empty ones as 0/0, `[]` only for All time with nothing finished), or the Stats bars' client presentation (fill height = pages over the range's largest, the `aria-hidden` chart plus visually hidden table, the bar labels) in AD-6's list of client calculations.
    evidence: |-
      backend/bookvie/views/stats.py `_period`, `_periods`; backend/bookvie/views/models.py StatsBucket and StatsView.buckets docstrings; frontend/src/lib/stats.ts `barShare`, `barLines`, `periodName`; frontend/src/components/StatsBars.tsx. AD-6 only says "All time with no finished Reading returns 0 books, 0 pages and no buckets", and its list of client calculations names the gauge's ticks but not the bar heights (spine check, build-auto review of 6.4).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-6
    severity: low
---

<intent-contract>

## Intent

**Problem:** Stats shows only two totals. Nothing shows when the reading happened inside the range (FR-16, UX-DR52). The stats view always sends `buckets: []`.

**Approach:** The stats view fills `buckets`: one per calendar month the range touches, or one per year past 24 months. The Stats page draws one bar per bucket below the two numbers, and puts the same data in a visually hidden table (Period, Books, Pages).

## Boundaries & Constraints

**Always:**
- **The server fills the buckets (AD-6, AD-11):**
  - `period` is `YYYY-MM` for a month bucket and `YYYY` for a year bucket.
  - The buckets are oldest first. There is one for every calendar month (or year) from `from` to `to`, and empty ones are `{ books: 0, pages: 0 }`.
  - For All time, the buckets run from the earliest finish's period to the latest's. With no finishes, `buckets` is `[]`.
  - Each bucket counts only the finishes inside the range, by `finishDate`, and adds each one's stored `finishedPages` (`None` is 0). So a range from 15 March counts March from the 15th, and a 900-page Book finished 2 December is 900 pages in December.
  - The buckets add up to `books` and `pages`. `bucket` keeps 6.3's 24-month rule.
- **The chart (DESIGN.md `components.monthly-bar`):**
  - It goes below the two numbers, and has one column per bucket.
  - Each column has a vertical track in `accent-soft` with an `accent` fill. The fill's height is `pages ÷ the largest pages in the range`, and a 0-page bucket has no fill.
  - The pages value sits above the bar and the period below it, both in `meta`. The value uses `formatCount` and is shown for 0 too.
  - The chart is `aria-hidden="true"`.
  - Under `forced-colors: active`, the track gets a `CanvasText` border and the fill is `Highlight`, as in Gauge.
- **The period labels (client, `lib/stats.ts`):**
  - In the table, a month reads "January 2026" and a year reads "2026".
  - Under a bar, a month reads "Jan". The first bar and each January bar add the year on a second line. A year reads "2026".
- **The table:** one `table` in `main`, with class `visuallyHidden` and a `caption` "Books and pages finished by month" (or "by year"). Its column headers are Period, Books and Pages (`th scope="col"`), then one row per bucket, with each period as a row header and the counts through `formatCount`.
- **The two numbers sit in a group named "Totals"** (`role="group"`, `aria-label="Totals"`), so their text can be told apart from the bar values.
- **No `buckets`, no chart and no table:** All time with nothing finished. An empty range shows zero-height bars with "0" values, a table of zeros, and 6.3's "No books finished in this range.".
- **Instant updates:** the bars take no transition or animation, so a new range redraws at once, with or without reduced motion.

**Never:**
- The client never counts, sums or re-buckets. It only formats periods and computes bar heights.
- No new error code and no new route. `http/` never imports `domain/`.
- Don't hand-edit `schema.d.ts` or `tokens.css`, and don't edit ARCHITECTURE-SPINE.md.
- No chart library and no `data-testid`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Range from the 15th | ATDD AC-1 seed, 2026-03-15..2026-05-31 | `2026-03` (1, 400), `2026-04` (0, 0), `2026-05` (1, 286) | No error expected |
| Over 24 months | 2024-03-01..2026-03-15 | `year`: `2024` (0,0), `2025` (0,0), `2026` (2, 712) | No error expected |
| 900 pages in December | The Tome, 2025-10-20..2025-12-02 | 2025's 12 buckets, `2025-12` = (1, 900), the others 0 | No error expected |
| Empty library, ranges | 24 months / 25 months / one day | 24 empty month buckets / 3 year buckets / 1 bucket | No error expected |
| All time | finishes 2024-01-15 and 2026-01-02 | `year`: 2024, 2025, 2026 | No error expected |
| All time, nothing | no finishes | `buckets: []`, no chart, no table | No error expected |
| Edges | finishes 2026-03-29, 03-31, 04-01, 10-25 | March 2, April 1, October 1 | No error expected |
| This year in the browser | FLOW_7, today 2026-10-28 | 10 rows January to October, September 400, October 610 | No error expected |

</intent-contract>

## Code Map

- `backend/bookvie/views/stats.py` -- `stats()`, `months_spanned`, `MONTH_BUCKET_LIMIT`. The bucket loop goes here. Its `finishes` list is already filtered to the range.
- `backend/bookvie/views/models.py:295-314` -- `StatsBucket` (docstring "Story 6.4 fills them") and `StatsView.buckets` ("always empty until Story 6.4"). Rewrite both docstrings with the `period` format. They reach the OpenAPI, so regenerate `schema.d.ts`.
- `backend/tests/test_stats.py:340,377` -- the two RED leaves (`RED` constant, `@pytest.mark.skip(reason=RED)`). `:276` `test_p1_the_bucket_is_year_past_24_calendar_months` asserts `buckets == []`. Helpers `_finished(b, book, start, finish, pages)` and `_stats(client, from, to)`.
- `frontend/src/pages/StatsPage.tsx` -- `shown.view.buckets` is available. Add the chart and table after the totals. `StatsPage.module.css` -- `.totals`, `.figure`, `.caption`.
- `frontend/src/components/Gauge.module.css` -- the track, fill and forced-colors pattern to copy.
- `frontend/src/styles/base.css:26` -- the global `.visuallyHidden` class. `:38` is the global reduced-motion rule.
- `frontend/src/lib/stats.ts` and `stats.test.ts` (`node --test`) -- `formatCount`. Add the period labels and the bar height here.
- `frontend/e2e/stats.spec.ts:139` `figure()` -- scope it to `getByRole('group', { name: 'Totals' })`. `:683`, `:709` -- the two `test.skip(` leaves. `:433` -- the axe test, with FLOW_7 This year and an empty range, which will now include bars.
- `README.md:8` -- the Stats sentence ends "…All time or in a custom range." Lines 214-215 hold the 6.3 links.
- Deferred-work intake: none name story 6.4.

## Tasks & Acceptance

**Execution:**
- `backend/bookvie/views/stats.py` -- build `buckets` as the rules above say, with a small helper per bucket kind (the period key of a date, and the periods from start to end).
- `backend/bookvie/views/models.py` -- the `StatsBucket` and `buckets` docstrings: the `period` format, oldest first, empty ones included, `[]` only for All time with no finishes.
- `backend/tests/test_stats.py` -- remove both skips and the `RED` constant. Change `:276` to assert the bucket counts (24, 3, 1, 24) and that every bucket is zero. Add tests for: the edges and DST Sundays, a re-read counting again in its own bucket, a Side read adding nothing, All time's year buckets from the earliest to the latest, a single-day range, the 2024-01-01..2026-01-01 case (`2024`, `2025`, `2026`), and that the buckets add up to `books` and `pages`. Fix the module docstring's "The buckets' contents are Story 6.4's" line.
- `frontend/src/api/generated/schema.d.ts` -- run `npm --prefix frontend run api:gen`.
- `frontend/src/lib/stats.ts`, `stats.test.ts` -- add `periodName(period)` ("January 2026" / "2026"), `barLines(period, first: boolean): string[]` ("Jan", or ["Jan", "2026"] for the first bar and each January; ["2026"] for a year), and `barShare(pages, max)` (0..1, 0 when max is 0). Unit-test each: December, January, a year, max 0 and proportionality.
- `frontend/src/components/StatsBars.tsx` and `.module.css` (new) -- the `aria-hidden` chart and the hidden table. Takes `bucket` and `buckets`. Renders nothing when `buckets` is empty.
- `frontend/src/pages/StatsPage.tsx`, `.module.css` -- wrap the totals in the "Totals" group and render `StatsBars` after the empty message.
- `frontend/e2e/stats.spec.ts` -- scope `figure()` to the Totals group. Change both 6.4 `test.skip(` to `test(`. Add:
  - a `[P2]` leaf for Last year at fake today 2026-10-28 with a 900-page Book finished 2025-12-02: 900 is shown, and the table's December row is 1 / 900 and November's 0 / 0;
  - a `[P2]` leaf checking that the bar heights are proportional (September's fill ≈ 400/610 of October's, January's 0);
  - a `[P2]` leaf for All time with nothing finished: no table;
  - a `[P2]` leaf checking that a Custom edit updates the table.
  - The existing axe test now covers the bars.
- `README.md` -- on the Status line, after the Stats sentence, add that a bar for each month (or year, over 24 months) shows when the reading happened. After line 215, add the Story 6.4 spec and ATDD checklist links. Leave the "N of M stories done" count alone.

**Acceptance Criteria:**
- Given the stats view for a range, when it is computed, then the buckets are as the I/O matrix says (ATDD AC-1 and AC-3 pass).
- Given Stats with buckets, when it renders, then there is one bar per bucket with the pages above and the period below, the heights are proportional, and the table has the columns Period, Books and Pages (ATDD AC-2).
- Given reduced motion, when the range changes, then the table and bars show the new range and nothing animates (ATDD AC-4).
- Given Stats with bars in either theme, when axe scans it, then there are no violations.

## Spec Change Log

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 25 findings — high 0, medium 0, low 17, false 7, maybe-false 1
- findings:
  - `[low]` `[defer]` Spine drift (AD-6): the client's bar height, the decorative chart plus hidden table and the bar labels aren't in AD-6's list of client calculations (Spine Check) — deferred to deferred-work.md as spine drift (AGENTS.md).
  - `[low]` `[defer]` Spine drift (AD-6): the bucket rules (`period` format, oldest first, empty buckets as 0/0, `[]` only for All time with nothing finished) aren't in the spine (Spine Check) — same deferred entry.
  - `[low]` `[patch]` The AC-3 e2e check `shownText('900').first()` also matches the Totals figure, so it doesn't prove the December bar shows 900 (Intent Alignment) — the leaf now checks the Totals figure, "900" inside the chart, December's fill at full track height and November's at none.
  - `[low]` `[reject]` The AC-4 leaves read the table, not the visible bars (Intent Alignment) — `StatsBars` draws the chart and the table from the same `buckets` prop in one render, so the table changing means the bars changed. The new heights, labels and forced-colors leaves read the bars themselves.
  - `[low]` `[reject]` The accent and accent-soft colours, the `meta` type and the label positions aren't asserted (Intent Alignment) — they are CSS reading the DESIGN.md tokens. axe checks contrast in both themes, and pinning computed token values adds tests that restate the stylesheet.
  - `[false]` `[reject]` The "Totals" group is an addition the intent doesn't call for (Intent Alignment) — the spec requires it, so the figures can be told apart from the bar values. It is a labelled `group`, and axe passes in both themes.
  - `[low]` `[patch]` Year bars and the "by year" caption are never rendered in a test (Intent Alignment) — same as the Verification Gap row below: a new `[P2]` leaf covers All time over 24 months.
  - `[maybe-false]` `[reject]` All time's buckets end at the latest finish, not today (Intent Alignment) — epics and EXPERIENCE.md only say All time starts at the earliest finish. 6.3 fixed the span this way, and its review logged the same point. If it were wrong it would only change trailing empty bars, which is low.
  - `[low]` `[reject]` A Custom range or an old back-fill spanning many years gives more columns than the chart fits, so labels overlap (Edge Case Hunter) — the chart is `aria-hidden` and the table carries the data. Decades of finishes are unlikely in a personal library, and capping, grouping or scrolling adds a mechanism.
  - `[low]` `[reject]` A negative `finishedPages` shows a negative label with no fill (Edge Case Hunter) — every intent writes `finishedPages` from a Book's `pages` (`ge=1`) or as `None`, so only a hand-edited file could hold one. A guard adds a branch for a state no path writes.
  - `[low]` `[patch]` The period labels under the bars, including the first bar's year, are never checked in the browser (Verification Gap) — the heights leaf now reads each column's period lines: January `['Jan', '2026']` and September `['Sep']`.
  - `[low]` `[patch]` The year-bucket chart and its "by year" caption aren't rendered in any test (Verification Gap) — new `[P2]` leaf `AC-1 All time over 24 months shows one bar and one row per year` (seed `YEARS_APART`): caption, rows 2024 1/412, 2025 0/0 and 2026 1/400, and the year labels.
  - `[low]` `[patch]` The forced-colors rule for the bars isn't checked (Verification Gap) — new `[P2]` leaf under `forcedColors: 'active'`: October's fill has a non-transparent background and the track has a border.
  - `[low]` `[reject]` Field docstrings don't reach the OpenAPI, though the spec's Code Map says so (Blind Hunter) — `_View` doesn't set `use_attribute_docstrings`, as for every other view model. Turning it on changes the whole schema, and the other fix is to edit this build's spec (rejected by rule). The docstrings still document the model for developers.
  - `[low]` `[reject]` Year buckets have no upper limit (Blind Hunter) — the same root as the Edge Case Hunter's overlap row.
  - `[low]` `[reject]` 24 month columns overlap at phone width (Blind Hunter) — bookvie's layouts are desktop-first (narrowest 1024px), and the chart is `aria-hidden`, with the table carrying the data. A responsive chart is a new mechanism.
  - `[low]` `[reject]` The e2e chart locators (`[aria-hidden="true"] > div`, child positions) depend on the DOM structure (Blind Hunter) — the chart is the only `aria-hidden` element in Stats' `main` today, and the spec rules out `data-testid`. A structural change fails these leaves loudly rather than passing falsely.
  - `[low]` `[patch]` The AC-3 e2e check doesn't prove the bar shows 900 (Blind Hunter) — same fix as the Intent Alignment row.
  - `[low]` `[reject]` `StatsBars.module.css` hard-codes 4px, 160px and 32px (Blind Hunter) — DESIGN.md's `monthly-bar` gives no radius or size, `--radius-cover` names covers, and Gauge hard-codes its track the same way.
  - `[false]` `[reject]` Dead branches in `stats()` (Blind Hunter) — the `is not None` filter and `continue` narrow `finish_date` for the type checker. The 6.3 review logged the same point.
  - `[false]` `[reject]` The DST Sunday tests are server-only (Blind Hunter) — the server compares stored local dates with no clock, so DST can only bite in the browser's today, which 6.3's unit tests and AC-7 pin.
  - `[low]` `[reject]` An orphan code snippet in the spec's Design Notes (Blind Hunter) — the fix edits this build's spec (rejected by rule).
  - `[low]` `[reject]` The spec's README line references are off by one (Blind Hunter) — the fix edits this build's spec (rejected by rule).
  - `[false]` `[reject]` `StatsPage.module.css` wasn't changed, so the chart sits flush against the totals (Blind Hunter) — `.page` is a flex column with `gap: var(--space-5)`, so the chart is spaced. The hidden table is absolutely positioned and takes no gap.
  - `[false]` `[reject]` Untested: January as the first bar, a malformed period, and the `period` pattern in the contract (Blind Hunter) — `barLines('2026-01', true)` is unit-tested. The server only builds periods with `_period` and `_periods`, so `2026-13` can't reach the client.

## Design Notes

- **Why a hidden table and an `aria-hidden` chart:** EXPERIENCE.md asks for the data "exposed as a table to assistive tech". A visible chart plus a table would read everything twice, so the chart is decorative and the table carries the data.
- **Why "Totals":** the bar values repeat the big numbers ("610"), so the e2e `figure()` needs a named scope. A labelled group is the accessible way to get one, without a `data-testid`.
- **Narrow screens:** up to 24 columns share the width (`flex: 1; min-width: 0`), and labels don't wrap. The chart never scrolls sideways: a scroll region inside an `aria-hidden` chart would need focus, and axe refuses that.

```py
key = (lambda d: f"{d.year:04d}") if by_year else (lambda d: f"{d.year:04d}-{d.month:02d}")
```

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_stats.py tests/test_contract.py` -- expected: pass.
- `cd frontend && npm run build && TZ=Europe/Madrid npx playwright test e2e/stats.spec.ts` -- expected: pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:**
- **Server:** the stats view fills `buckets`. There is one per calendar month the range touches, or one per year past 24 months. `period` is `YYYY-MM` or `YYYY`, oldest first, and empty buckets are 0 and 0. All time runs from the earliest finish to the latest, and is `[]` when nothing is finished. Each finish counts in its `finishDate`'s bucket with its stored `finishedPages`.
- **Page:** below the two numbers, Stats draws one bar per bucket. Each bar has an `accent` fill on an `accent-soft` track, with the height in proportion to the range's largest. The pages value sits above in `meta` and the period below ("Jan", with the year on the first bar and each January). The chart is `aria-hidden`, and the same buckets are a visually hidden table with the columns Period, Books and Pages. The two numbers are now in a group named "Totals". The bars have no transition.

**Files changed:**
- `backend/bookvie/views/stats.py`: `_period` and `_periods`, and the bucket loop in `stats()`.
- `backend/bookvie/views/models.py`: the `StatsBucket` and `StatsView.buckets` docstrings.
- `backend/tests/test_stats.py`: ATDD AC-1 and AC-3 are on. The 24-month test now counts the buckets. New tests cover the edges and DST Sundays, a re-read and a Side read, All time's year and month buckets, a single day, 25 months from 1 January, and the buckets adding up to the totals.
- `frontend/src/api/generated/schema.d.ts`: regenerated (the `StatsBucket` description).
- `frontend/src/lib/stats.ts` and `stats.test.ts`: `periodName`, `barLines` and `barShare`, with unit tests.
- `frontend/src/components/StatsBars.tsx` and `.module.css` (new): the chart and the hidden table.
- `frontend/src/pages/StatsPage.tsx`: the "Totals" group, and `StatsBars`.
- `frontend/e2e/stats.spec.ts`:
  - `figure()` is scoped to Totals, and ATDD AC-2 and AC-4 are on.
  - New `[P2]` leaves: Last year's 900 pages in December, the bar heights and period labels, All time with nothing finished, a Custom edit, All time over 24 months as year bars, and forced colours.
- `README.md`: the Status line and the 6.4 links. `deferred-work.md`: one spine drift entry. `sprint-status.yaml`: 6.4 → review.

**Review:** 25 findings: high 0, medium 0, low 17, false 7, maybe-false 1.
- **Patched:** 4 entries, all low. They are e2e additions: the December bar's own 900, the period labels, year bars with the "by year" caption, and forced colours.
- **Deferred:** 1 entry, spine drift on AD-6 (the bucket rules and the bars' client presentation).
- **Rejected:** 15, each with its reason in the Review Triage Log above.

**Follow-up review recommended:** false. The patched entries were 0 high, 0 medium and 4 low.

**Verification:**
- `TZ=Europe/Madrid uv run pytest tests/test_stats.py tests/test_contract.py`: 75 passed, before and after the patches.
- `npm run build`, then the Stats e2e: 24 passed before the patches. After them, the subagent ran the Story 6.4 describe alone, 8 of 8.
- `TZ=Europe/Madrid npm run check`: exit 0 before the patches (553 e2e), and exit 0 after them (555 e2e).

**Residual risks:**
- With many columns (24 months at narrow widths, or many years), the nowrap labels can overlap. This is only cosmetic, because the chart is `aria-hidden` and the table carries the data.
- The chart leaves in e2e find the columns by DOM structure (`[aria-hidden="true"] > div`).
- The 160px track and 32px maximum bar width are the build's own choice. DESIGN.md doesn't size them.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
