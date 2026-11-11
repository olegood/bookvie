---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-11'
storyId: '6.3'
storyKey: '6-3-see-what-i-finished-in-any-period'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-63-see-what-i-finished-in-any-period'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-3-see-what-i-finished-in-any-period.md'
generatedTestFiles:
  - 'backend/tests/test_stats.py'
  - 'frontend/e2e/stats.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 6 intro and gate; Story 6.3; Story 6.4 for the bucket boundary)'
  - '_bmad-output/implementation-artifacts/epic-6-context.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Nav, Stats range picker, Monthly bars, Finished on, Stats empty states, Structure, Live regions, Flow 7)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Top nav, Theme toggle segmented treatment, Stats range picker, Page title, Gauge figure)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6 Stats view, AD-11, AD-20, FR-16 map row: views/stats)'
  - '_bmad-output/test-artifacts/test-design-qa.md (STA-UNIT-001, STA-API-001, STA-E2E-001; R-07, R-10)'
  - '_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md (format)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/http/api.py (view routes), views/models.py, views/shelf.py; backend/tests/builder.py, helpers.py, test_library_pages_left.py'
  - 'frontend/src/components/AppShell.tsx (nav), ViewToggle.tsx and ThemeToggle.tsx (segmented: role=group, aria-pressed), src/lib/announce.ts'
  - 'frontend/e2e/card-notes.spec.ts (new nav item and page h1 pattern), home.ts (serverAtFakeToday, FAKE_NOW, FAKE_TODAY), fixtures.ts, catalog-pace-calculator.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the top nav, when Epic 6 ships, then a Stats item completes the order Home · Catalog · Stats · Card notes · Backup, leading to a page whose h1 is "Stats"' }
  - { id: AC-2, idSource: generated, text: 'Given the Stats page, when it opens, then a segmented range picker offers This month · This year · Last year · All time · Custom, with This year as the default; and Custom reveals "From" and "To" date fields, swapping the two silently when To is before From (UX-DR52)' }
  - { id: AC-3, idSource: generated, text: 'Given a range, when the browser requests GET /api/views/stats?from=YYYY-MM-DD&to=YYYY-MM-DD (both inclusive local dates; both omitted for All time), then the response is { books, pages, bucket: "month" | "year", buckets: [{ period, books, pages }] } (AD-6); and the browser resolves the presets: This month = the 1st..today, This year = 1 January..today, Last year = the full previous year' }
  - { id: AC-4, idSource: generated, text: 'Given a range, when the stats view is computed for it, then the server returns the count of finished Readings and the sum of their finishedPages, counting each finish by its local finishDate, back-filled Readings in their Finished on period, and re-reads again (FR-16, AD-11); and "All time" starts at the earliest finished Reading, back-fills included' }
  - { id: AC-5, idSource: generated, text: 'Given the result, when it renders, then two big numbers show books finished and pages finished, and the status region reads "2 books, 610 pages." when the range changes; an empty range shows 0 and 0 with "No books finished in this range."; and All time with no finished Readings returns 0 and 0 with no buckets, and the page reads "No books finished yet."' }
  - { id: AC-6, idSource: generated, text: 'Given a Book whose Pages is edited after it was finished, when Stats render, then the totals are unchanged, because they use the stored finishedPages' }
  - { id: AC-7, idSource: generated, text: 'Given fake-Clock boundary tests, when finishes fall on the first and last day of a month and year, on 1 January, and around a timezone offset, then each is counted in the right period' }
---

# ATDD Checklist: Story 6.3 See what I finished in any period

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Story:** `epics.md` Story 6.3 has 7 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-7 in source order (registry above).
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `frontend/package.json`, so the Traditional Patterns fragments load. Contract testing doesn't apply (no Pact artifacts). `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:** no `views/stats`, no `/api/views/stats` route, no Stats page and no nav item. Four specs pin the current four-item nav (`app-shell.spec.ts:122`, `backup.spec.ts:74`, `card-notes.spec.ts:112`, `home.spec.ts:56`); the build must update them when Stats joins the nav.
- **Boundary with Story 6.4:** 6.3 owns the response shape, totals, presets, the page, the numbers and the empty states. 6.4 owns how `bucket` is chosen (month up to 24 months, else year), the bucket contents, and the chart. The 6.3 leaves pin that `bucket` and `buckets` are present and well-formed, and that All time with nothing finished has no buckets. They don't pin bucket contents.

## Generation Mode

**AI generation.** The Stats page doesn't exist yet, so there is nothing to record. The criteria and UX docs name every control and line of copy (the presets, "From", "To", "Stats", the status line and the two empty messages). The locators follow the project's existing segmented controls: a `group` with an accessible name, holding `aria-pressed` buttons (`ViewToggle.tsx`, `ThemeToggle.tsx`).

## Test Strategy

There is one red leaf per criterion: 7 in all, 2 API and 5 E2E. Each leaf's first assertion is the newly promised value. Secondary branches are recorded under Green-phase follow-ups, not as extra red leaves.

| AC | Level | Priority | File | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|---|
| AC-1 | E2E | P1 | `frontend/e2e/stats.spec.ts` | **The banner nav's links read Home · Catalog · Stats · Card notes · Backup.** Then Stats leads to `/stats`, whose `h1` "Stats" is focused, with the title "Stats — bookvie" and `aria-current="page"`. | Nav, routing and focus exist only in the browser (the `card-notes.spec.ts:103` pattern) |
| AC-2 | E2E | P1 | `stats.spec.ts` | **The group "Range" holds the 5 presets in order, This year `aria-pressed="true"`.** Then Custom shows the date fields "From" and "To". With From 2026-10-20 and To 2026-10-01, the fields swap to 01 and 20, with no `alert` and no `aria-invalid`. | A UI control and its behaviour |
| AC-3 | E2E | P0 | `stats.spec.ts` | **On first load (This year, today 2026-10-28) the browser requests `/api/views/stats?from=2026-01-01&to=2026-10-28`.** Then This month asks for `2026-10-01..2026-10-28`, Last year for `2025-01-01..2025-12-31`, and All time with no query. The response keys are exactly `books, pages, bucket, buckets`, and `bucket` is `month` or `year`. | Preset resolution is the browser's (AD-6). Network-first: each `waitForRequest` is registered before the click |
| AC-4 | API | P0 | `backend/tests/test_stats.py` | **`books` is 3 for 2026-01-01..2026-10-28.** Then `pages` is 912 (a finish in range, a back-fill in range, and a re-read finished in range, but not its 2025 back-fill). All time (no query) gives 5 books and 1,312 pages, with the 2019 back-fill and both Kindred finishes. Unfinished and Side read Readings add nothing. | The server owns the numbers (AD-6, AD-11) |
| AC-5 | E2E | P1 | `stats.spec.ts` | **After This month, the `status` region reads "2 books, 610 pages."** Then the numbers 2 and 610 are shown with the captions "books finished" and "pages finished". Last year shows 0 and 0 with "No books finished in this range.". Back on This year, it reads "3 books, 1,010 pages." | The page's rendering, live region and copy |
| AC-6 | API | P1 | `test_stats.py` | **After `edit-book` raises Emma's Pages from 400 to 450, `pages` for September 2026 is still 400.** | The transition goes through the real intent, and AD-11's stored `finishedPages` is the server's |
| AC-7 | E2E | P0 | `stats.spec.ts` | **With the browser at 2027-01-01 00:30 Madrid (23:30 UTC on 31 December) and the server at fake today 2027-01-01, This year requests `from=2027-01-01&to=2027-01-01`.** Then it shows 1 book (finished 1 January 2027), and Last year shows 1 book (finished 31 December 2026). | The timezone offset only bites in the browser's own date arithmetic (R-07): a `toISOString()` slip would ask for 2026 |

**Red today:** there is no `/api/views/stats` route, no `/stats` page and no Stats nav link. The API leaves fail at their first value (`KeyError` on a 404 body). The E2E leaves fail at their first assertion (the nav list, the missing group, a request that never comes, the status text), or at the unasserted setup click before it, as in 6.2's AC-3.

**Seeds:**
- **API (AC-4, AC-6):** `LibraryBuilder`.
  - Emma 400 (1 to 20 September 2026).
  - Dune 412, back-filled 15 March 2026.
  - Kindred 100, back-filled 1 June 2025, then re-read 1 to 10 October 2026.
  - Good Omens 300, back-filled 14 August 2019.
  - Hyperion 482, a Side read active at p.210.
  - Neuromancer 271, paused at p.80.
- **E2E (AC-2, AC-3, AC-5), at fake today 2026-10-28:**
  - Beloved 324, finished 12 October 2026.
  - Kindred 286, finished 20 October 2026.
  - Emma 400, finished 20 September 2026.
  - So This month is 2 books and 610 pages (Flow 7), This year 3 and 1,010, and Last year is empty.
- **E2E (AC-7):** `startSeededServer` with `fakeToday: '2027-01-01'`, and `page.clock` set to `2027-01-01T00:30:00+01:00`. Two Books: one finished 2026-12-31, one 2027-01-01.

**Names the leaves pin (the contract for the build):**
- Nav link **Stats**, route `/stats`, `h1` **Stats**, title **Stats — bookvie**.
- Range picker: `role="group"` named **Range**, with `aria-pressed` buttons **This month**, **This year**, **Last year**, **All time**, **Custom** (the `ViewToggle` pattern).
- Custom: date fields labelled **From** and **To** (`type="date"`, values `YYYY-MM-DD`).
- Numbers: the figures with the captions **books finished** and **pages finished**. Figures use `en-GB` grouping ("1,010"), like `CatalogList.tsx:17`.
- Copy: **"N books, M pages."** in the page's one `status` region, plus **No books finished in this range.** and **No books finished yet.**.
- API: `GET /api/views/stats` with `from` and `to` as `YYYY-MM-DD`, returning `{ books, pages, bucket, buckets }`.

**Open for the build (not pinned):**
- What a bad date or only one of `from`/`to` returns. No criterion says, so the build decides, and every error code it adds needs an API test (the epic gate).
- The `status` text for a range with nothing finished.
- The `period` format of a bucket (Story 6.4).

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **AC-5, All time with nothing finished:** the API returns `{ books: 0, pages: 0, buckets: [] }`, and the page reads "No books finished yet.". (done: backend/tests/test_stats.py:244 `test_ac5_p1_all_time_with_nothing_finished_is_zero_month_and_no_buckets`; frontend/e2e/stats.spec.ts:337)
- [x] **AC-5, singular:** "1 book, N pages." (the copy is the build's decision; pin what it decides). (done: frontend/e2e/stats.spec.ts:359; frontend/src/lib/stats.test.ts `uses the singular for 1`)
- ~~**AC-4, All time start:** the first bucket is the earliest finish's period, back-fills included (with Story 6.4's period format).~~ **Retired:** `buckets` is always `[]` in 6.3 (spec-6-3, Boundaries), and the bucket contents and their `period` format are Story 6.4's; its ATDD carries this.
- [x] **AC-4, a Book read and finished twice in one range** counts 2 books. (done: backend/tests/test_stats.py:194 `test_ac4_p1_a_book_finished_twice_in_one_range_counts_twice`)
- [x] **AC-7, server month and year edges (API):** finishes on 2026-03-31 and 2026-04-01 split across a March range, 2025-12-31 and 2026-01-01 across a year range, and finishes on the DST Sundays 2026-03-29 and 2026-10-25 each count in their own month. (done: backend/tests/test_stats.py:159 `test_ac7_p0_a_finish_on_an_edge_counts_in_its_own_month_and_year`, 6 cases)
- [x] **AC-2, Custom drives the request:** after the swap, the request is `from=<earlier>&to=<later>`. (done: frontend/e2e/stats.spec.ts:375)
- [x] **AC-2, Custom's starting values** (the build's decision, for example the current preset's range). (done: the pressed preset's range, empty after All time: frontend/e2e/stats.spec.ts:375 (This year), frontend/e2e/stats.spec.ts:626 (This month, Last year), frontend/e2e/stats.spec.ts:528 (All time))
- [x] **AC-3, invalid query:** whatever the build decides for a bad date or a half range, with an API test for each error code. (done: 422 `invalid_fields` naming the field, backend/tests/test_stats.py:314 `test_p1_a_bad_query_is_422_invalid_fields_naming_the_field`, 7 cases including a datetime and a Unix timestamp)
- [x] **AC-1, focus and title on a direct load of `/stats`** (not only through the nav). (done: frontend/e2e/stats.spec.ts:419)
- [x] **Existing specs:** update the nav lists in `app-shell.spec.ts:122`, `backup.spec.ts:74`, `card-notes.spec.ts:112` and `home.spec.ts:56` to the five items. (done: frontend/e2e/app-shell.spec.ts:122, backup.spec.ts:74, card-notes.spec.ts:112, home.spec.ts:56)
- [x] **axe** on Stats (a result, and the empty range) in both themes. (done: frontend/e2e/stats.spec.ts:433)

## TDD Red Phase (historical)

**Since then (green):** the build (f2cf63f) turned on all 7 leaves and added the follow-ups above. The code review (f8691aa) and the automate run of 2026-11-11 added more; see `automation-summary.md`.

There is one skipped leaf per criterion, 7 in all:
- **API (2):** in `backend/tests/test_stats.py`, each marked `@pytest.mark.skip(reason=RED)`.
- **E2E (5):** in `frontend/e2e/stats.spec.ts`, each a `test.skip(`, and each title carries exactly one `[P*] AC-n`.

| AC | Leaf | Priority | First assertion | Red today (un-skipped in a throwaway copy, since deleted) |
|---|---|---|---|---|
| AC-1 | `stats.spec.ts:127` the top nav adds Stats between Catalog and Card notes, leading to a page whose h1 is "Stats" | P1 | the nav links read Home · Catalog · Stats · Card notes · Backup | 4 links, no Stats |
| AC-2 | `stats.spec.ts:149` the range picker offers five presets with This year pressed, and Custom swaps a To before From silently | P1 | group "Range"'s buttons read the 5 presets | 0 buttons |
| AC-3 | `stats.spec.ts:185` the browser resolves each preset to GET /api/views/stats with from and to, and none for All time | P0 | the first request's query is `{ from: '2026-01-01', to: '2026-10-28' }` | `waitForRequest` times out: no request |
| AC-4 | `test_stats.py:83` `test_ac4_p0_stats_count_finished_readings_and_their_finished_pages_in_the_range` | P0 | `books == 3` for 2026-01-01..2026-10-28 | `KeyError: 'books'` (404 body) |
| AC-5 | `stats.spec.ts:221` the range shows books and pages finished as two big numbers, announced as "2 books, 610 pages." | P1 | after This month, `status` reads "2 books, 610 pages." | the unasserted setup click on This month times out (no page), as 6.2's AC-3 did |
| AC-6 | `test_stats.py:122` `test_ac6_p1_editing_pages_after_a_finish_leaves_the_stats_unchanged` | P1 | after `edit-book` sets Pages to 450, September's `pages == 400` | `KeyError: 'pages'`. A probe confirmed that today's `edit-book` stores 450 and keeps `finishedPages` 400 |
| AC-7 | `stats.spec.ts:252` at 00:30 on 1 January in Madrid, This year asks for 2027-01-01 alone and Last year for all of 2026 | P0 | the first request's query is `{ from: '2027-01-01', to: '2027-01-01' }` | `waitForRequest` times out |

Every seed loaded and every server started cleanly, so no leaf fails for a seed error.

**Skipped as committed** (re-run in this session):
- `pytest tests/test_stats.py` gives 2 skipped.
- `playwright test e2e/stats.spec.ts` gives 5 skipped.
- `ruff format --check` and `ruff check` are clean. Prettier `--check` and `tsc -b` are clean. oxlint exits 0, with 2 warnings that predate this run, both in `src/lib/usePauseFlow.tsx`.

**Validation notes:**
- **The API worker's `criterion_registry`** lists only its two rows (AC-4 and AC-6), not the whole registry. Its leaves map to the persisted ids exactly, so nothing is lost; the frontmatter `acceptanceCriteria` is the full registry.
- **The E2E figures** are located by exact text in `main` ("2", "610", "1,010", "0", "1"). That's sound for 6.3. Story 6.4's chart may add bar values with the same text, so its build should scope these locators to the numbers block.

## Playwright Utils deviations

`tea_use_playwright_utils` is true, but `@seontechnologies/playwright-utils` isn't in `frontend/package.json`, so no `support/merged-fixtures` was created. The spec uses the house patterns, as 6.1 and 6.2 do:
- `frontend/e2e/stats.spec.ts:19`: `{ expect, startSeededServer, test }` come from `./fixtures.ts`.
- `frontend/e2e/stats.spec.ts:118`: `page.waitForRequest` (registered before each trigger) and `request.response()` stand in for `interceptNetworkCall`.

## Data Factories, Fixtures and Mocks

- **No new factory or fixture.** The API leaves use `LibraryBuilder` and `api_client`, and AC-6 sends `EDIT_BOOK` with a full Edit book form. The E2E seeds are local constants, `FLOW_7` and `NEW_YEAR`, and AC-7 calls `startSeededServer` with `fakeToday: '2027-01-01'`.
- **No mocks:** every leaf runs against the real server.
- **No `data-testid`:** every locator is a role plus an exact name, a label, or exact text.

## Next Steps (Task-by-Task Activation)

Activate one leaf at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_stats.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/stats.spec.ts -g "AC-1"` (the e2e entry builds the SPA)

### AC-3, AC-4 and AC-6: the stats view
- [x] `views/stats` (FR-16 map row) and `views/models.py` `StatsView { books, pages, bucket, buckets: [{ period, books, pages }] }`. It counts finished Readings by `finishDate` in `from..to` (inclusive), and sums the stored `finishedPages`. (done: backend/bookvie/views/stats.py:23, views/models.py:303; backend/tests/test_stats.py:84)
- [x] `GET /api/views/stats` with optional `from`/`to` in `http/api.py`. Decide and test what a bad date or a half range returns. (done: backend/bookvie/http/api.py:393; backend/tests/test_stats.py:314)
- [x] Run `npm --prefix frontend run api:gen`, and re-run `test_contract.py`. (done: `schema.d.ts` regenerated in f2cf63f and f8691aa; backend/tests/test_contract.py:338 and :372 list the route; `npm run check` byte compare exit 0 on 2026-11-11)
- [x] Activate AC-4 and AC-6. (done: backend/tests/test_stats.py:84 and :122, active and passing)

### AC-1, AC-2, AC-3, AC-5 and AC-7: the page
- [x] The nav item **Stats** between Catalog and Card notes, the `/stats` route, `h1` "Stats" and `document.title`. Update the four nav lists named under Preflight. (done: frontend/src/components/AppShell.tsx:45, main.tsx:39; frontend/e2e/stats.spec.ts:185 and :419)
- [x] The range picker (`group` "Range", the `ViewToggle` pattern), with presets resolved from the browser's local today. Custom has "From" and "To", swapped silently. (done: frontend/src/components/RangePicker.tsx; frontend/e2e/stats.spec.ts:207, :243, :310)
- [x] The two figures with captions, the status line "N books, M pages." and the empty-range message. (done: frontend/e2e/stats.spec.ts:279 and :337)
- [x] Activate AC-1, AC-2, AC-3, AC-5 and AC-7. (done: frontend/e2e/stats.spec.ts:185, :207, :243, :279, :310, active and passing)

## Completion

- **Test files:** `backend/tests/test_stats.py` (2 skipped) and `frontend/e2e/stats.spec.ts` (5 skipped).
- **Checklist:** this file. **Story key:** `6-3-see-what-i-finished-in-any-period`. **Story:** `epics.md` Story 6.3.
- **Next:** `bmad-build-auto` for story 6.3 (AGENTS.md "Story pipeline"). Its build turns these leaves on, then come `bmad-code-review` in a new session and `bmad-testarch-automate`.
