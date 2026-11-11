---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-11'
storyId: '6.4'
storyKey: '6-4-see-my-reading-month-by-month'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-64-see-my-reading-month-by-month'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-4-see-my-reading-month-by-month.md'
generatedTestFiles:
  - 'backend/tests/test_stats.py'
  - 'frontend/e2e/stats.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 6 intro and gate; Story 6.4; Story 6.3 for the response shape)'
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
  - '_bmad-output/implementation-artifacts/spec-6-3-see-what-i-finished-in-any-period.md (Boundaries: buckets left to 6.4; All time spans the earliest finish to the latest)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Stats range picker, Monthly bars, Stats empty states, Motion, Flow 7)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.monthly-bar, Monthly bars, accent / accent-soft contrast)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 Stats view, AD-11, AD-20, FR-16 map row)'
  - '_bmad-output/test-artifacts/test-design-qa.md (STA-UNIT-001, STA-API-001, STA-E2E-001; R-07, R-10)'
  - '_bmad-output/test-artifacts/atdd-checklist-6-3-see-what-i-finished-in-any-period.md (format, and its note on figure locators)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/stats.py, views/models.py (StatsBucket, StatsView); backend/tests/test_stats.py, builder.py, helpers.py'
  - 'frontend/src/pages/StatsPage.tsx, StatsPage.module.css, src/lib/stats.ts, src/lib/stats.test.ts; frontend/e2e/stats.spec.ts, home.ts, fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a range up to 24 months, when the stats view is computed, then it returns bucket: "month" and one bucket per month in the range (period, books, pages), counting only finishes inside the range, so a range starting 15 March counts March from the 15th (AD-6); and a range over 24 months returns bucket: "year" and one bucket per year' }
  - { id: AC-2, idSource: generated, text: 'Given the buckets, when the chart renders, then each bar''s height is proportional to pages finished, with its value above in meta and the period below, in the accent fill on the accent-soft track (UX-DR52); and the same data is exposed to assistive tech as a table (period, books, pages)' }
  - { id: AC-3, idSource: generated, text: 'Given a 900-page Book finished on 2 December, when the year''s bars render, then all 900 pages are in December, with no smoothing across months' }
  - { id: AC-4, idSource: generated, text: 'Given a change of range, when I pick a preset or edit Custom, then the numbers and bars update instantly (no animation under reduced motion)' }
---

# ATDD Checklist: Story 6.4 See my reading month by month

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Story:** `epics.md` Story 6.4 has 4 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-4 in source order (registry above).
- **Config:** `tea_use_playwright_utils: false`, so the Traditional Patterns fragments load. Contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today (from 6.3):** `views/stats.py` chooses `bucket` by AD-6's 24-month rule (calendar months touched; All time from the earliest finish to the latest; `month` with no finishes) and always sends `buckets: []`. `StatsBucket { period: str, books, pages }` is in `views/models.py` with no fixed `period` format. `StatsPage.tsx` shows the range picker, the two numbers and the empty lines, with no chart and no table.
- **Boundary with Story 6.3:** 6.3 owns the totals, presets, page, numbers and empty states, and those leaves stay as they are. 6.4 owns the bucket contents, the `period` format and the chart.

## Generation Mode

**AI generation**, run sequentially in this session, without subagents. There are four criteria, and both test files already exist with their helpers and seeds (`FLOW_7`, `_finished`, `_stats`). The chart doesn't exist yet, so there is nothing to record. The criteria name the table's columns (period, books, pages). The E2E leaves locate the table by role and read its Books and Pages columns. They leave the period's display format open.

## Test Strategy

There is one red leaf per criterion: 4 in all, 2 API and 2 E2E. Each leaf's first assertion is the newly promised value. Secondary branches are recorded under Green-phase follow-ups, not as extra red leaves.

| AC | Level | Priority | File | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|---|
| AC-1 | API | P0 | `backend/tests/test_stats.py` | **For 2026-03-15..2026-05-31 the periods are `2026-03, 2026-04, 2026-05`.** Then March is Emma alone (1, 400), without Dune's 10 March back-fill, April is (0, 0), and May is Kindred (1, 286). Then 2024-03-01..2026-03-15 (25 months) is `year` with `2024` (0, 0), since Good Omens' February 2024 is outside, `2025` (0, 0) and `2026` (2, 712). | The server owns the buckets (AD-6) |
| AC-2 | E2E | P1 | `frontend/e2e/stats.spec.ts` | **`main`'s table has the column headers Period · Books · Pages.** Then This year (fake today 2026-10-28, `FLOW_7`) has 10 rows, January to October: eight `0 / 0`, then `1 / 400` and `2 / 610`. The 10 periods are distinct and non-empty. The bar values 400 and 610 are on screen. | The table and the labels exist only in the browser |
| AC-3 | API | P1 | `test_stats.py` | **The `2025-12` bucket of 2025 has `pages == 900`.** Then it has 1 book, every other month has 0, and the periods are `2025-01` to `2025-12`. The book is The Tome, 900 pages, read 20 October to 2 December 2025. | "No smoothing" is about which bucket the server puts the pages in |
| AC-4 | E2E | P2 | `stats.spec.ts` | **With reduced motion emulated, after This year → This month the table's Books/Pages rows are just `2 / 610`.** Then the status reads "2 books, 610 pages.", and `document.getAnimations()` is empty. | Instant updates and reduced motion are browser behaviour |

**Red today** (each leaf was un-skipped in a throwaway copy, run, and the copy deleted):
- AC-1 fails at its first assertion: `assert [] == ['2026-03', '2026-04', '2026-05']`.
- AC-3 fails at its first assertion: `KeyError: '2025-12'`.
- AC-2 fails at its first assertion: `toHaveText` on the column headers times out, because there is no table.
- AC-4: the unasserted setup (both responses awaited, the click on This month) passes. It fails at its first assertion: the `booksAndPages` poll times out, getting `[]`.

Every seed loaded and every server started cleanly, so no leaf fails for a seed error.

**Seeds:**
- **API AC-1 (`LibraryBuilder`):**
  - Dune 412, back-filled 10 March 2026.
  - Emma 400, 1 to 20 March 2026.
  - Kindred 286, 20 April to 2 May 2026.
  - Beloved 324, back-filled 1 June 2026.
  - Good Omens 300, back-filled 14 February 2024 and re-read back-filled 5 January 2026.
- **API AC-3:** The Tome 900, 20 October to 2 December 2025.
- **E2E (AC-2, AC-4):** `FLOW_7` at fake today 2026-10-28: Beloved 324 (12 October), Kindred 286 (20 October), Emma 400 (20 September).

**Names the leaves pin (the contract for the build):**
- `period` is `YYYY-MM` for a month bucket and `YYYY` for a year bucket.
- Buckets are oldest first, one for every calendar month (or year) the range touches, empty ones included as `{ books: 0, pages: 0 }`.
- Each bucket counts only finishes inside `from..to`. A Reading's whole `finishedPages` lands in its `finishDate`'s bucket.
- The chart's data is the one `table` in `main`, with column headers **Period**, **Books** and **Pages**. Each row has the period first, then books, then pages, as plain counts (en-GB grouping, like the figures).
- Each bar's pages value is shown on screen as text. The table may be visually hidden: the leaves find on-screen text with `filter({ visible: true })`.
- Under `prefers-reduced-motion: reduce`, nothing on Stats animates after a range change (`document.getAnimations()` is empty).

**Open for the build (not pinned):**
- How a period reads on screen and in the table, for example "Oct" under a bar and "October 2026" in the table.
- Whether an empty month shows a "0" value label.
- The table's accessible name, and whether the chart itself is `aria-hidden`.
- How the bar heights are computed. AC-2's proportionality is a follow-up below, pinned once the build decides.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **AC-2, proportional heights:** a bar's height is `pages ÷ the range's largest pages`, measured on the rendered bars (bounding boxes) or as a unit test of the client's height function. A 0-page bar has no fill.
- [ ] **AC-2, design tokens:** the fill is `accent` on an `accent-soft` track, and the labels are `meta`. Check the computed colours in both themes, and the `forced-colors` rule that the other fills use (DESIGN.md, forced colours).
- [ ] **AC-2, period below each bar:** pin the format the build chooses.
- [ ] **AC-2, empty states:** an empty range shows empty bars, with a table of zero rows (EXPERIENCE.md "Stats, empty range"). All time with nothing finished shows no bars and no table.
- [ ] **AC-1, All time's buckets:** they run from the earliest finish's period (back-fills included) to the latest, and use `year` past 24 months (6.3's span rule).
- [ ] **AC-1, 24 and 25 months:** 2024-01-01..2025-12-31 gives 24 month buckets, and 2024-01-01..2026-01-01 gives 3 year buckets, with the first and last years partial.
- [ ] **AC-1, edges:** a finish on 2026-03-31 or 2026-04-01, or on a DST Sunday (2026-03-29, 2026-10-25), lands in its own month's bucket. A single-day range gives one bucket.
- [ ] **AC-1, re-reads and side reads:** a re-read counts again in its own bucket, and a Side read mark adds nothing.
- [ ] **AC-3, E2E:** the year's chart shows 900 above December and nothing above November (needs a seed in a year the presets reach, for example Last year at fake today 2026-10-28).
- [ ] **AC-4, Custom:** editing Custom's dates updates the table and bars with no animation. Without reduced motion, any transition the build adds is allowed.
- [ ] **axe** on Stats with bars, in both themes. Extend the existing 6.3 axe test.
- [ ] **Unit (STA-UNIT-001):** if the bucket logic gets its own function in `views/stats`, test it directly with `stats(library, start, end)`, as `test_ac4_p1_a_finish_without_finished_pages_counts_as_zero_pages` does.

## Existing tests the build must update

- `backend/tests/test_stats.py:276` (`test_p1_the_bucket_is_year_past_24_calendar_months`) asserts `buckets == []` for each range. Its library is empty, so once the buckets fill, each range gets one empty bucket per month or year it touches: 24, then 3, then 1, then 24. Only All time with nothing finished keeps `buckets: []`.
- `frontend/e2e/stats.spec.ts:139` `figure()` finds a big number by its exact text anywhere in `main`. The table's cells and the bar labels repeat those numbers, so `figure(page, '610')` (lines 291, 498 and 639) and the other figure calls would hit more than one element. Scope `figure()` to the two-number block. The 6.3 checklist already flagged this.
- `stats.spec.ts:348`: All time with nothing finished still expects `buckets: []`. That is right, and stays as it is.
- Re-run `test_contract.py` and `npm --prefix frontend run api:gen` if `StatsBucket`'s docstring or fields change (`check:api` compares `schema.d.ts` byte for byte).

## TDD Red Phase (Current)

There is one skipped leaf per criterion, 4 in all:
- **API (2):** in `backend/tests/test_stats.py`, each marked `@pytest.mark.skip(reason=RED)`.
- **E2E (2):** in `frontend/e2e/stats.spec.ts`, each a `test.skip(`, and each title carries exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `test_stats.py:340` `test_ac1_p0_a_range_gets_one_bucket_per_month_counting_only_finishes_inside_it` | P0 |
| AC-2 | `stats.spec.ts:683` each bar shows its pages, and the same buckets are a table of period, books and pages | P1 |
| AC-3 | `test_stats.py:377` `test_ac3_p1_a_900_page_book_finished_on_2_december_is_900_pages_in_december` | P1 |
| AC-4 | `stats.spec.ts:709` a new range updates the numbers and bars at once, with no animation under reduced motion | P2 |

**Skipped as committed** (re-run in this session):
- `TZ=Europe/Madrid uv run pytest tests/test_stats.py` gives 26 passed and 2 skipped.
- `TZ=Europe/Madrid npx playwright test e2e/stats.spec.ts` gives 18 passed and 2 skipped.
- `ruff format` and `ruff check` are clean on `test_stats.py`.
- Prettier `format:check` and `tsc -b` are clean, and oxlint reports nothing for `stats.spec.ts`.

## Data Factories, Fixtures and Mocks

- **No new factory or fixture.** The API leaves use `LibraryBuilder`, `_finished` and `_stats`. The E2E leaves reuse `FLOW_7`, `serverAtFakeToday`, `statsRequest` and `preset`.
- **New E2E helpers:**
  - `chartTable`, the one `table` in `main`.
  - `tableRows`, the cell text of every row.
  - `booksAndPages`, the rows without the period column.
  - `shownText`, exact text in `main` that is on screen.
- **No mocks:** every leaf runs against the real server.
- **No `data-testid`:** the leaves locate elements by role, header text and on-screen text.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_stats.py`
- **E2E:** run `npm run build` first, then `cd frontend && TZ=Europe/Madrid npx playwright test e2e/stats.spec.ts -g "Story 6.4"`.

### AC-1 and AC-3: the buckets
- [ ] In `views/stats.py`, fill `buckets` with one entry per calendar month (or year, past 24 months) from `from` to `to`, or from the earliest finish to the latest for All time. Each `{ period, books, pages }` counts only finishes in range by `finishDate`, with the stored `finishedPages`.
- [ ] Update `StatsBucket`'s and `StatsView.buckets`' docstrings with the `period` format. Then run `npm --prefix frontend run api:gen`.
- [ ] Update `test_stats.py:276`, as described above.
- [ ] Activate AC-1 and AC-3.

### AC-2 and AC-4: the chart
- [ ] On `StatsPage`, below the numbers: one bar per bucket, height proportional to pages, the value above in `meta`, and the period below. Use the `accent` fill on the `accent-soft` track (`components.monthly-bar`).
- [ ] Add the same buckets as a table with the headers Period, Books and Pages, visually hidden or visible.
- [ ] Use no transition under `prefers-reduced-motion: reduce`.
- [ ] Scope `figure()` in `stats.spec.ts` to the two numbers.
- [ ] Activate AC-2 and AC-4.

## Completion

- **Test files:** `backend/tests/test_stats.py` (2 new skipped leaves) and `frontend/e2e/stats.spec.ts` (2 new skipped leaves, in a `Story 6.4` describe).
- **Checklist:** this file. **Story key:** `6-4-see-my-reading-month-by-month`. **Story:** `epics.md` Story 6.4 (no spec file yet; `sprint-status.yaml` still reads `backlog`).
- **Next:** `bmad-build-auto` for story 6.4 (AGENTS.md "Story pipeline"). Its build turns these leaves on. Then come `bmad-code-review` in a new session and `bmad-testarch-automate`. 6.4 is Epic 6's last story, so after that come the epic retrospective and its before-next-epic items, including the spine reconciliation.
