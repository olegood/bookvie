---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-11'
workflowType: 'testarch-trace'
traceTarget: 'epic 6'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; the PAC-API-001, PAC-UNIT-002, PAC-E2E-001 and STA-* rows, and the Stats and pace surfaces of XUI-E2E-002 and XUI-E2E-005)'
  - '_bmad-output/test-artifacts/test-design-architecture.md (R-07 :110, R-10 :113)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; Epic 6 gate :1857; stories 6.1-6.4 :1859-1992)'
  - '_bmad-output/implementation-artifacts/epic-6-retro-2026-11-11.md (action 54)'
  - '_bmad-output/test-artifacts/atdd-checklist-6-1, 6-2, 6-3 and 6-4 (story ACs; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'e6157b9'
---

# Traceability Matrix & Gate Decision: Epic 6, Know how long and how much

**Target:** Epic 6, stories 6.1-6.4 (gate type: epic). This is Epic 6 retro action 54 (`epic-6-retro-2026-11-11.md`).
**Date:** 2026-11-11
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `e6157b9` plus this trace's one test addition (below). That commit includes the retro fixes for item 52 (spine reconciliation) and item 53 (the `add-card-note.spec.ts` flake). This trace changed no product code.
**Gate thresholds:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%. TR7 also requires an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`. The Epic 6 gate (`epics.md:1857`) adds: the fake-Clock boundary tests for pace, ranges, month edges and local dates green. It closes R-07 and R-10 (with Epic 3). Action 54 also asks to confirm those boundary tests row by row, and that the stats view's 422 `invalid_fields` has an API test.
**Machine-readable:** `epic-6-e2e-trace-summary.json` and `epic-6-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file.

### Test this trace added

Mapping XUI-E2E-002 ("intent in A visible in B after focus; refusals also invalidate") to the Epic 6 surfaces turned up one gap. Story 6.3 added a new view, `stats`. It does refetch on focus (the global `refetchOnWindowFocus: true`, `frontend/src/api/queryClient.ts:30`), and `stats.spec.ts:416` shows a focus refetch rendering new numbers. But that test fakes the server's answer with `route.fulfill`, and the past-midnight test (`:364`) refetches because the query key changes. No test showed a real intent from another context reaching the Stats page. This is the gap the Epic 5 trace closed for the `card-notes` view.

The trace closed it the same way:

- **`stats.spec.ts:511`**, `[P1] XUI-E2E-002 a Book finished in another context shows in the numbers once Stats regains focus, with no announcement`. Stats shows This year as 3 books, 1,010 pages (Flow 7). A second browser context finishes Piranesi (245 pages, never started) through `finish-reading`, so a back-filled Reading lands today. The first context regains focus, and the figures read 4 and 1,255. The `status` and `alert` regions stay empty.
- **Mutation check:** with `refetchOnWindowFocus: false` set on `useStatsView` (`frontend/src/api/views.ts`) and the SPA rebuilt, the test fails on the "4" figure. It passes again with the change reverted and the SPA rebuilt.
- **Burn-in:** 10 of 10 passed (`--repeat-each=10 --retries=0`).

The pace surfaces need no new test. The book view's focus refetch was proven in Epic 4 and the catalog view's in Epic 1, and both pace calculators are shown following their view's refetch (`pace-calculator.spec.ts:265`, `catalog-pace-calculator.spec.ts:264`).

---

## Gate Decision: PASS

**Rationale:**
- No `test-design-qa.md` scenario that Epic 6 delivers is P0, so P0 coverage is 100% of 0 (n/a). Every story-level `[P0]` test is green and mapped below.
- P1 coverage is 100% (3/3), against the TR7 target of 95%.
- Overall coverage is 100% (8/8), against the minimum of 80%.
- The fake-Clock boundary tests for pace, ranges, month edges and local dates are green, and hold row by row.
- Every error code has an API test. Epic 6 added no code; the stats view's 422 `invalid_fields` is tested for all three refusals.
- R-07 and R-10 are closed.

### TR7 and Epic 6 gate criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | No P0 scenario in Epic 6's share of `test-design-qa.md` (matrix below) | ✅ MET (n/a) |
| P1 ≥ 95% | 3/3 FULL | ✅ MET |
| Fake-Clock boundary tests for pace, ranges, month edges and local dates green | "Fake-Clock boundary tests, row by row" below | ✅ MET |
| Every error code has an API test, including the stats view's 422 `invalid_fields` | "Error codes" below | ✅ MET |
| `check:api` clean | contract, Prettier, `tsc -b`, oxlint; 308 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (408/408 lines), intents+store 98.06% (1619/1651) | ✅ MET |
| Closes R-07, R-10 (with Epic 3) | "Risks closed" below | ✅ MET |

### Run evidence

**Commit:** `e6157b9`, with this trace's test addition in the working tree (`stats.spec.ts`).

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0.

| Check | Outcome |
|---|---|
| pytest | 1390 passed |
| Coverage gates | domain 100.00% (408/408), intents+store 98.06% (1619/1651): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint; 308 passed, 0 failed |
| Playwright | 558 passed (1.7 m), none flaky, retried or skipped. That is the retro's 557 plus this trace's test |
| Smoke | isolated install served `/` and a deep link: ok |

The trace's first `npm run check`, on the same code, failed 1 of 558 e2e: `card-notes-pile.spec.ts:590` (Story 5.4, not an Epic 6 test) timed out waiting for the Card notes search field, and the page never got past its `h1`. Its pytest, coverage and `check:api` results matched the run above. That failure is a new flake. It is recorded in `deferred-work.md` and not fixed here, since this trace changes no Epic 5 test (see "Open risks"). The run above is the one this gate relies on.

---

## Oracle and scope

**Oracle.** The oracle is the same as for Epics 1-5. TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, so the priority-bearing oracle is the set of scenarios Epic 6 delivers:

- the PAC rows Epic 3 left: PAC-API-001, PAC-UNIT-002 and PAC-E2E-001;
- every STA row: STA-UNIT-001, STA-API-001 and STA-E2E-001;
- the Stats and pace surfaces of the shared XUI rows:
  - XUI-E2E-002 (two contexts);
  - XUI-E2E-005 (empty states).

The story ACs are mapped one by one in "Story ACs" below. That table does not change the counts.

**Out of scope, and why:**

- **PAC-UNIT-001** (Measured pace) was traced in Epic 3 (`test_reentry.py`). Epic 6 reads `domain/pace` without changing it.
- **XUI-E2E-001 and XUI-E2E-003** (couldn't save, no optimistic UI) need an intent. Epic 6 added none: it only adds views and client presentation. Its couldn't-load states are mapped under the story ACs.
- **XUI-E2E-004** (tone) has no epic owner. Epic 6's copy is pinned by its exact strings.
- **ORG-*** belongs to Epic 7.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 0              | 0             | n/a        | n/a |
| P1        | 3              | 3             | 100%       | ✅ PASS |
| P2        | 4              | 4             | 100%       | ✅ PASS |
| P3        | 1              | 1             | 100%       | ✅ PASS |
| **Total** | **8**          | **8**         | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 6 files:

- **Backend:** `test_pace_calculator.py`, `test_library_pages_left.py` and `test_stats.py`.
- **Unit (frontend):** `frontend/src/lib/pace.test.ts` and `stats.test.ts`, with the shared table `frontend/src/lib/pace.cases.json`.
- **e2e:** `pace-calculator`, `catalog-pace-calculator`, `stats` and `stats-bars`.

**By level:** the 9 Epic 6 files hold 99 tests.

| Level | Tests (Epic 6 files) | Criteria covered |
|---|---|---|
| e2e | 50 (4 specs) | 4 |
| API | 26 (3 backend files) | 3 |
| Unit | 23 (`pace.test.ts`: 5; `stats.test.ts`: 18) | 2 |

Parametrized tests run many more cases. For example, `test_stats.py:159` runs 6 edge dates, `:321` runs 7 bad queries, and `test_pace_calculator.py:121` runs every case in `pace.cases.json`.

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full.

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| PAC-API-001 | Pages left, Book scope and library scope rules | Book scope in every state (active, paused, never started, finished, a paused re-read after a back-fill, back-filled only, a Side read) and `measuredPace` on every Book's view `test_pace_calculator.py:53`. Library scope: the catalog view's `pagesLeft` and `measuredPace` `test_library_pages_left.py:57`; the rule for every Reading state with no double counting of a Book that has a finished and an unfinished Reading `:119`; a Book with Pages edited below its page adds 0 `:184` | FULL |
| STA-UNIT-001 | Stats: pages in finish period; month/DST edges; back-filled by date; re-reads count; Side reads never | Finishes counted by `finishDate` with their `finishedPages`, back-fills in their period, a re-read again, a paused Reading and a Side read add nothing `test_stats.py:84`; the stored `finishedPages` after a Pages edit `:122`; month, year and DST edges `:159`, `:410`, `:423`; a Book finished twice `:194`; a missing `finishedPages` as 0 `:209`; a Side read's earlier finish still counts `:223`; a re-read in its own bucket, a Side read adds nothing `:442`. Row by row below | FULL |
| XUI-E2E-002 (Stats and pace surfaces) | Two contexts: an intent in A shows in B after focus | A Book finished in another context shows on Stats after focus `stats.spec.ts:511` (this trace). A focus refetch updates the numbers and announces nothing `:416`; a past-midnight focus asks for the new day `:364`; the Book detail calculator after the past-midnight focus `pace-calculator.spec.ts:245`. The calculators follow their view's refetch, keeping the typed pace: Book detail `:265`, Catalog after an add `catalog-pace-calculator.spec.ts:264`; a finish on Book detail turns the result into "Nothing left to read." with no reload `pace-calculator.spec.ts:208` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| PAC-E2E-001 | Calculator prefilled with pace; live update; 0, negative or NaN → no result, no error | Book detail: the prefilled field and `output` `pace-calculator.spec.ts:70`; every keystroke `:92`; no result, message or error styling for 0, negative, non-numeric or empty `:126`; empty without a Measured pace `:178`; a fractional pace prefills one decimal `:229`. Catalog: the same calculator behind "How long until…?" `catalog-pace-calculator.spec.ts:96`, `:138`, `:170`, `:209`. Unit: `pace.test.ts:61`, `:71`, `:94` | FULL |
| PAC-UNIT-002 | Client calculator rounding matches the server on shared fixtures | `pace.cases.json`, read by `pace.test.ts:80` and `test_pace_calculator.py:121`. Its cases include 21 @ 0.7, 21 @ 1.4 and 42 @ 1.4, exact as fractions but a day over with a naive float ceil | FULL |
| STA-API-001 | Stats view: presets, custom range, per-month bars, All time start, empty range | The response shape and a range's month buckets `test_stats.py:344`; All time from the earliest finish to the latest `:293`, `:466`, `:484`; All time with nothing finished `:244`; a single-day range `:178`, `:498`; `year` past 24 months `:268`, `:511`; the buckets add up to the totals `:534`; 422s `:321`. The presets are resolved in the browser: `stats.test.ts:23`-`:49` and `stats.spec.ts:102` | FULL |
| XUI-E2E-005 (Stats and pace surfaces) | Empty states | "No books finished in this range." `stats.spec.ts:138`; "No books finished yet." with 0 and 0 `:196`; no bars and no table `stats-bars.spec.ts:221`; "Nothing left to read." on Book detail `pace-calculator.spec.ts:162`, `:193` and on Catalog `catalog-pace-calculator.spec.ts:196`; an empty library has no meter and no link `:225`. API: `test_stats.py:244` | FULL |

#### P3

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| STA-E2E-001 | Stats presets render and switch; empty message | The nav item and `h1` `stats.spec.ts:44`, `:278`; five presets, This year pressed `:66`; each preset's request `:102`; switching updates the numbers and the announcement `:138`, `:218`; Custom `:234`, `:387`, `:436`, `:485`; the bars follow a new range `stats-bars.spec.ts:134`, `:242`; axe in both themes `stats.spec.ts:292` | FULL |

### Fake-Clock boundary tests, row by row

The Epic 6 gate's clause. The server's stats view takes explicit dates and reads no clock, so its edges are date edges. "Today" enters only in the browser (the presets, the pace calculator's finish date) and in `--fake-today`. Every e2e row runs with `TZ=Europe/Madrid`, the browser clock set by `page.clock` and `timezoneId: 'Europe/Madrid'` (AD-20).

| Area | Edge | Test | Status |
|---|---|---|---|
| Pace | 59 days in days, 60 in months | `pace.test.ts:30` (injected today) | ✅ |
| Pace | 715 days is 23 months, 716 is 2 years | `pace.test.ts:30` | ✅ |
| Pace | A pace above the pages left is still 1 day | `pace.test.ts:30` | ✅ |
| Pace | A day-and-month date in next year gains the year | `pace.test.ts:30` (from 20 December) | ✅ |
| Pace | Today + days by calendar day across the spring DST change | `pace.test.ts:30` (`TZ=Europe/Madrid`, 20 → 30 March 2027) | ✅ |
| Pace | Client and server round the days alike | `pace.test.ts:80`, `test_pace_calculator.py:121` (`pace.cases.json`) | ✅ |
| Pace | A tab left open past midnight moves the finish date | `pace-calculator.spec.ts:245` | ✅ |
| Ranges | A single-day range | `test_stats.py:178`, `:498` | ✅ |
| Ranges | Exactly 24 months stays `month`, 25 becomes `year` | `test_stats.py:268`, `:511` | ✅ |
| Ranges | A range starting mid-month counts that month from its start | `test_stats.py:344` | ✅ |
| Month edges | 31 March and 1 April, 31 December and 1 January, each in its own month and year | `test_stats.py:159` | ✅ |
| Month edges | The DST Sundays (29 March, 25 October) | `test_stats.py:159`, `:410`, `:423` | ✅ |
| Month edges | A 900-page Book finished on 2 December is all December | `test_stats.py:380`, `stats-bars.spec.ts:166` | ✅ |
| Local dates | Presets resolve from the local date, never UTC: 00:30 on New Year in Madrid | `stats.test.ts:32`; `stats.spec.ts:169` (server at 2027-01-01, browser 23:30 UTC on 31 December) | ✅ |
| Local dates | 1 January at noon, 31 December late, the 1st of a month | `stats.test.ts:39`, `:43`, `:49` | ✅ |
| Local dates | A Stats tab left open past midnight asks for the new day | `stats.spec.ts:364` | ✅ |
| Local dates | A query that isn't a `YYYY-MM-DD` date (a datetime, a timestamp, 13th month) | `test_stats.py:321` | ✅ |

### Error codes

TR7 requires an API test for every error code. `ErrorCode` (`backend/bookvie/intents/contract.py`) still has 18 values: Epic 6 added none. Its one new refusal reuses `invalid_fields` on a view, `GET /api/views/stats` (story 6.3):

- a half range, on the missing field (`from` alone, `to` alone);
- a value that isn't a `YYYY-MM-DD` date (13th month, "someday", a datetime, a Unix timestamp);
- a `to` before `from`, on `to`.

All seven are `test_stats.py:321`: each answers 422, kind `refusal`, code `invalid_fields`, with exactly that field. The app never sends these: Custom's pre-check holds them back (`stats.spec.ts:234`, `:387`; `stats.test.ts:55`, `:61`).

The 18 codes were confirmed in the Epic 1-5 traces and are still green in the run above.

### Risks closed

| Risk | Score | Scenarios (test-design) | Evidence | Status |
|---|---|---|---|---|
| R-07 Date/time errors | 4 | PAC-UNIT-001, STA-UNIT-001, FIN-API-003, PRG-API-001, PRG-E2E-001/002 | Epic 3 closed its share (FIN-API-003, PRG-API-001, PRG-E2E-001/002, PAC-UNIT-001; `epic-3-traceability-matrix.md:194`) and named STA-UNIT-001 as Epic 6's. STA-UNIT-001 is FULL above, and the boundary rows hold, all under a pinned `TZ` and a fake today | ✅ Closed |
| R-10 Pace/stats numbers wrong | 4 | PRG-UNIT-001, PRG-API-003, PAC-*, STA-* | Epic 3 closed PRG-UNIT-001, PRG-API-003 and PAC-UNIT-001 (`epic-3-traceability-matrix.md:195`). PAC-API-001, PAC-UNIT-002, PAC-E2E-001 and every STA row are FULL above. The planned mitigation, "domain unit tests; client/server rounding parity" (`test-design-architecture.md:113`), is in place: `pace.cases.json` keeps the two sides' rounding in step | ✅ Closed |

### Coverage heuristics

- **Endpoints.** The one new route, `GET /api/views/stats`, has API tests (`test_stats.py`). The `book` and `catalog` views' new `pagesLeft` and `measuredPace` are asserted in `test_pace_calculator.py:53` and `test_library_pages_left.py:57`. Gaps: 0.
- **Auth/authz negative paths.** Epic 6 added no intent route. The stats view is a GET under the same request guard as every view. Status: present.
- **Error paths.** The stats view's 422s (above); its couldn't-load states in the browser (`stats.spec.ts:314`, `:336`, `:453`). Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The empty, loading-failed, refetch and focus states are pinned (story ACs below).

### Gap analysis

| Category | Count |
|---|---|
| Critical (P0) | 0 |
| High (P1) | 0 |
| Medium (P2) | 0 |
| Low (P3) | 0 |
| Partial | 0 |
| Unit-only | 0 |

---

## Story ACs

This table maps each epics.md AC for stories 6.1-6.4 to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 6.1 · 1 | The book view supplies Book-scope pages left and Measured pace | `test_pace_calculator.py:53` |
| 6.1 · 2 | Book detail's "How long until…?": an 80px "pages/day" field prefilled to one decimal, or empty, and an `output` | `pace-calculator.spec.ts:70`, `:178`, `:229`; `pace.test.ts:94` |
| 6.1 · 3 | The result follows every keystroke: days, months or years, plus a date | `pace-calculator.spec.ts:92`; `pace.test.ts:30`, `:71` |
| 6.1 · 4 | Zero, negative, non-numeric or empty: no result, no message, no error styling | `pace-calculator.spec.ts:126`; `pace.test.ts:61` |
| 6.1 · 5 | Nothing left to read: "Nothing left to read." | `pace-calculator.spec.ts:162`, `:193`, `:208` |
| 6.1 · 6 | Fake-Clock formatter edges | `pace.test.ts:30`; PAC-UNIT-002 `:80` |
| 6.2 · 1 | The catalog view supplies library-scope pages left; finished Books without an unfinished Reading aren't counted; Side reads change nothing | `test_library_pages_left.py:57`, `:119` |
| 6.2 · 2 | "How long until…?" on the meter's row, collapsed, expanding inline with `aria-expanded` | `catalog-pace-calculator.spec.ts:96`, `:170`, `:296`, `:330`, `:237` |
| 6.2 · 3 | 30 pages a day with 8,100 left reads "About 9 months · July 2027" | `catalog-pace-calculator.spec.ts:138` |
| 6.2 · 4 | API test with Readings in every state; no double counting | `test_library_pages_left.py:119`, `:184` |
| 6.3 · 1 | Top nav Home · Catalog · Stats · Card notes · Backup; `h1` "Stats" | `stats.spec.ts:44`, `:278` |
| 6.3 · 2 | Five presets, This year default; Custom's From and To swap silently | `stats.spec.ts:66`, `:234`, `:387`, `:436`, `:485`; `stats.test.ts:55` |
| 6.3 · 3 | `GET /api/views/stats` with inclusive local dates; the presets resolved in the browser | `stats.spec.ts:102`; `stats.test.ts:24`; `test_stats.py:344`, `:321` |
| 6.3 · 4 | Counted by local `finishDate` with `finishedPages`; back-fills by period; re-reads again; All time from the earliest finish | `test_stats.py:84`, `:194`, `:209`, `:223`, `:293` |
| 6.3 · 5 | Two big numbers and "2 books, 610 pages."; the empty-range and All time empty lines | `stats.spec.ts:138`, `:196`, `:218`, `:416`; `test_stats.py:244` |
| 6.3 · 6 | Pages edited after a finish leaves the totals unchanged | `test_stats.py:122` |
| 6.3 · 7 | Fake-Clock boundaries: first and last days of a month and year, 1 January, a timezone offset | `test_stats.py:159`, `:178`; `stats.spec.ts:169`; `stats.test.ts:32` |
| 6.4 · 1 | `month` buckets up to 24 months, counting only finishes inside the range; `year` beyond | `test_stats.py:344`, `:268`, `:511`, `:466`, `:484`, `:534`; `stats-bars.spec.ts:272` |
| 6.4 · 2 | Bars proportional to pages, value above, period below, accent on accent-soft; the same data as a table | `stats-bars.spec.ts:108`, `:196`, `:296`, `:314`, `:367`; `stats.test.ts:98`-`:134` |
| 6.4 · 3 | A 900-page Book finished on 2 December is all December | `test_stats.py:380`; `stats-bars.spec.ts:166` |
| 6.4 · 4 | A new range updates numbers and bars at once, with no animation under reduced motion | `stats-bars.spec.ts:134`, `:242` |

### ATDD checklists

Each checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-6-1-see-when-this-book-will-be-finished.md` | 0 | 0 | |
| `atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md` | 0 | 0 | |
| `atdd-checklist-6-3-see-what-i-finished-in-any-period.md` | 0 | 0 | |
| `atdd-checklist-6-4-see-my-reading-month-by-month.md` | 0 | 0 | |

Every line was ticked or retired by the stories' automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is already in `deferred-work.md` or in the retro.

- **E6-R1, Home's days left and the Book detail calculator disagree for some paces** (medium). This is retro action 55, due before story 7.1. Both sides follow the rounding table, but Home divides by the exact Measured pace and the calculator by its one-decimal prefill. `pace.cases.json` holds typed paces only, so it can't show the gap. Action 55 adds the comparing tests.
- **The cataloging skill's duplicate pre-check copies the server's rule with no shared check** (low). It is in `deferred-work.md` (item 52's review).
- **The view-model docstrings never reach the OpenAPI** (low). It is in `deferred-work.md` (6.4's code review) and raised for Epic 7 planning (retro open question 3).
- **Flaky specs.** One new flake: `card-notes-pile.spec.ts:590` (Story 5.4) failed once in this trace's first run, when the Card notes page never rendered its first load under the test's paused clock, and passed in the re-run. It is recorded in `deferred-work.md` for a burn-in and a probe, as items 51 and 53 did. It is an Epic 5 test, so it doesn't change Epic 6's gate. Item 53 fixed the one known flake, the one-shot read of Book detail's action stack, now verified by a 1080-run burn-in.

---

## Next actions

1. **Before story 7.1:** retro actions 55 (align the calculator with Home) and 56 (non-story work in its own worktree).
2. **MEDIUM:** burn in and probe the new `card-notes-pile.spec.ts:590` flake (`deferred-work.md`), then fix it or close the entry with the run.
3. **LOW:** run `/bmad-testarch-test-review` on the Epic 6 suites.
4. Mark sprint item `epic-6-retro-item-54-…` done.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: n/a, no P0 scenario (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
No Epic 6 scenario is P0, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). The fake-Clock boundary tests for pace, ranges, month edges and local dates are green row by row, and every error code, including the stats view's 422 invalid_fields, has an API test. R-07 and R-10 are closed.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-6-traceability-matrix.md

✅ GATE: PASS - Epic 6 meets TR7
```
