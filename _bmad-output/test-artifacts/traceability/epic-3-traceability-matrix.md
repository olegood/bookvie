---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-06'
workflowType: 'testarch-trace'
traceTarget: 'epic 3'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; the PRG, FIN and PAC-UNIT-001 rows, and the Epic 3 parts of RDG-E2E-003, XUI-E2E-001 and XUI-E2E-005)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; TR9 :156; Epic 3 gate :1094; stories 3.1-3.7 :1096-1400)'
  - '_bmad-output/implementation-artifacts/epic-3-retro-2026-11-06.md (F-R1..F-R4 follow-ups, retro items 21 and 22)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-1 … 3-7 (story ACs, read but not reconciled; see F-T1)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '15a48f535aba9065a5c35ac2eb5e91931a07be65'
---

# Traceability Matrix & Gate Decision: Epic 3, Read a book with visible progress

**Target:** Epic 3, stories 3.1-3.7 (gate type: epic). This is Epic 3 retro action item 20 (`epic-3-retro-2026-11-06.md`, F-S4).
**Date:** 2026-11-06
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `15a48f5`. It includes the retro fixes for items 21 (edit-book Finished on bound), 22 (stale client hand-offs) and 27 (e2e builds the SPA). No code or tests were changed by this trace.
**Gate thresholds:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%, which is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%. The Epic 3 gate (`epics.md:1094`) adds: PRG-E2E-001 (≤ 2 interactions) green, and the fake-Clock tests for re-entry and finish dates green. It closes R-07, R-10 and R-17 (R-01 is closed together with Epic 4).
**Machine-readable:** `epic-3-e2e-trace-summary.json` and `epic-3-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file.

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (3/3).
- P1 coverage is 100% (8/8), against the TR7 target of 95%.
- Overall coverage is 100% (17/17), against the minimum of 80%.
- PRG-E2E-001 and every fake-Clock re-entry and finish-date test named in the Epic 3 gate are green in the run below.
- R-07, R-10 and R-17 are closed for Epic 3's share.

### TR7 and Epic 3 gate criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 3/3 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 8/8 FULL | ✅ MET |
| PRG-E2E-001 (≤ 2 interactions) green | `update-page.spec.ts:175` passed (1.0 s), along with `:115` | ✅ MET |
| Fake-Clock tests for re-entry and finish dates green | See "Epic 3 gate clauses" below; all passed | ✅ MET |
| Every new error code has an API test | `already_main`, `reading_already_finished`, `not_main_book` (gate clauses below) | ✅ MET |
| `check:api` clean | 199 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (367/367), intents+store 97.73% (1378/1410) | ✅ MET |
| Closes R-07, R-10, R-17 | "Risks closed" below | ✅ MET (Epic 3's share) |

### Run evidence

The load average was about 35 on 14 cores, which is above half the core count. So the run followed `docs/ci.md` → Machine load and capped Playwright at 4 workers.

**Commit:** `15a48f5`

**Command:**

```sh
caffeinate -i sh -c 'npm run check:py && npm run check:api && npm run build && (cd frontend && TZ=Europe/Madrid npx playwright test --workers=4 --reporter=list) && npm run check:smoke'
```

**Result:** exit 0.

| Check | Outcome |
|---|---|
| pytest | 1028 passed |
| Coverage gates | ok |
| `check:api` | 199 passed, 0 failed |
| Build | ok |
| Playwright | 289 passed (1.4 m), none flaky, retried or skipped |
| Smoke | `smoke: ok` |

The Playwright global setup also rebuilt the SPA (retro item 27).

---

## Oracle and scope

**Oracle.** The oracle is the same as for Epics 1 and 2. TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, and the Epic 3 gate names scenario IDs, so the priority-bearing oracle is the set of scenarios Epic 3 delivers:

- every PRG row;
- the FIN rows for finishing the Main book;
- PAC-UNIT-001 (Measured pace, story 3.4 AC-1);
- the Epic 3 surfaces of three shared rows: RDG-E2E-003 (the Start dialog's Cancel, cited by story 3.2), XUI-E2E-001 (TR9 couldn't-save on the page field, Start, Finish and Edit Purpose) and XUI-E2E-005 (the Home empty and "No Main book." states).

The story ACs are mapped one by one in "Story ACs" below. That table does not change the counts.

**Out of scope, and why:**

- **FIN-API-001's "Up next suggested"** is Story 4.1. Epic 3 tests deliberately never assert `upNextBookId` (`epics.md`, Story 3.2 AC-6). The rest of FIN-API-001 is traced here.
- **FIN-API-002** (finishing a non-Main Book) is Story 4.5 (`epics.md:1602`).
- **PAC-API-001**'s library scope and **PAC-E2E-001 / PAC-UNIT-002** (the calculator) belong to Epic 6. The Book-scope pages left feeds days left, which is traced under PRG-UNIT-001.
- **RDG-API-001..003** and **RDG-UNIT-002** are the Epic 4 gate (`epics.md:1407`). The property test already drives the four Epic 3 intents (`test_reading_state_machine.py:395`). It is cited below as supporting evidence, not counted.
- **RDG-E2E-003's Pause half** is Epic 4.
- **XUI-E2E-001's card note, pause and delete surfaces** belong to Epics 1, 4 and 5. Delete was traced in Epic 1.
- **XUI-E2E-002 and XUI-E2E-003** are R-11, which the Epic 4 gate closes.
- **XUI-E2E-004** (tone) has no epic owner. Story 3.7 AC-5 is traced directly below.
- **STA-*** and the **timing smoke** belong to Epic 6.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 3              | 3             | 100%       | ✅ PASS |
| P1        | 8              | 8             | 100%       | ✅ PASS |
| P2        | 5              | 5             | 100%       | ✅ PASS |
| P3        | 1              | 1             | 100%       | ✅ PASS |
| **Total** | **17**         | **17**        | **100%**   | **✅ PASS** |

**Tests mapped:** 211 unique tests in 28 files. Together they include every test in the Epic 3 files:

- **Backend:** `test_start_reading.py`, `test_update_page.py`, `test_finish_reading.py`, `test_reentry.py`, `test_home_slice.py`, `test_home_view.py`, `test_progress.py`, `test_purpose.py`, `test_ordering.py`, `test_reading_state_machine.py`, plus the Epic 3 tests in `test_views.py` and `test_edit_book.py`.
- **e2e:** `home`, `start-reading`, `update-page`, `reentry`, `home-slice`, `finish-reading`, `finish-moment` and `stale-hand-offs`.
- **Frontend unit:** the Epic 3 tests in `frontend/src/lib/{gauge,pageField,slice,startReading,today,relativeDay}.test.ts` and `frontend/src/api/{books,views}.test.ts`.

**By level:**

| Level | Tests | Criteria covered |
|---|---|---|
| e2e | 102 | 9 |
| API | 65 | 6 |
| Unit | 44 (9 backend, 35 frontend) | 2 |

Parametrized and table-driven tests run many more cases. For example, `test_start_reading_across_the_state_matrix` runs 8 cases, and the shared page-field cases run in both Python and TypeScript.

**Skipped, fixme or pending:** none. The one `skipif`, on `test_update_page.py:280`, applies only when the frontend checkout is missing. It ran.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full. "Fake Clock" marks tests that run with today pinned: `api_client` pins `TODAY` through `FakeClock` (`helpers.py:172`), and the e2e servers use `--fake-today` together with `page.clock`.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| PRG-API-002 | `update-page` at the last page is saved and returns `reachedLastPage`; the Reading stays unfinished | `test_update_page.py:101`; only `finish-reading` ever sets `finishDate` `test_finish_reading.py:224`; in the browser, 100% and the Finish dialog with the Reading still unfinished `update-page.spec.ts:255`. Supporting: the property test never sees `update-page` finish a Reading (`test_reading_state_machine.py:239`, `:395`) | FULL |
| PRG-E2E-001 | UJ-2: open → page → Update in ≤ 2 interactions; gauge, "p.N of M", "~N days left" after refetch | ≤ 2 interactions and < 30 s, one intent, gauge `update-page.spec.ts:175`. Fake Clock: "p.212 of 330" and the re-entry line moving from "Last updated 3 days ago · ~9 days left" to "Last updated today · ~6 days left" after the refetch, plus `lastProgressUpdate` = server now `update-page.spec.ts:115` | FULL |
| FIN-API-001 | Finish Main → `finishDate` + `finishedPages` stored; no Main (Up next is Epic 4) | Fake Clock: `finishDate`, `finishedPages` = Pages, answers, `mainBookId` cleared, meter 1 of 2 `test_finish_reading.py:126`; TR8 (one commit, faults, invariants) `:309`; a re-read finishes only its current Reading `:371`; a paused Book finishes and the Main book stays `:403` | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| PRG-API-001 | `update-page` bounds, lower page allowed, `lastProgressUpdate` set | Fake Clock: a lower page and 0 are saved, each with `lastProgressUpdate` = now and nothing else changed `test_update_page.py:158`; out of range and non-integer `:218`; malformed part `:236`; `not_main_book` before the range `:254`; `book_not_found` before `not_main_book` `:266`; client and server agree on the shared cases `:281`, `frontend/src/lib/pageField.test.ts:37`; e2e lower page `update-page.spec.ts:278` | FULL |
| PRG-API-003 | Home view: slice rows (Main, Up next, recent finishes, ≤ 3), marker priority, meter | Priority Main → Up next → finishes `test_home_slice.py:42`; ties `:116`, `:128`; Up next equal to Main `:138`; missing Book `:146`; latest finish by date `:154`; roles and percent per spine `test_views.py:394`; meter `test_views.py:58`, `test_finish_reading.py:160`; client row choice from the server priority `frontend/src/lib/slice.test.ts:25`-`:85`; e2e `home-slice.spec.ts:201` | FULL |
| PRG-UNIT-001 | Percentage; days left = ceil(left ÷ pace), min 1, hidden rules | Floor percent `test_progress.py:7`, served `test_home_view.py:28` and `home.spec.ts:296` (329 → 99%, 330 → 100%); `days_left` ceil, minimum 1, null without pace, with pace 0 or with no pages left `test_reentry.py:138`, exact division `:268`; gauge copy and ticks `frontend/src/lib/gauge.test.ts:6`, `:11` | FULL |
| PRG-E2E-003 | Last page → Finish dialog; Cancel → active at 100%; same-page Update reopens | `update-page.spec.ts:255`; `finish-reading.spec.ts:168` (Esc and Cancel, focus back on the page field, same page reopens, 100% with days left hidden) | FULL |
| FIN-API-003 | Finished on: default today, not future, not before start; no Reading → back-filled | Fake Clock: future and before-start refused, nothing saved `test_finish_reading.py:187`; today and the start date accepted `:359`; not a date `:522`; default today in the dialog `finish-reading.spec.ts:110`; future in the browser `:347`. Back-fill through edit-book (story 1.11, traced in Epic 1) is now bounded by the current Reading's start (retro item 21): `test_edit_book.py:311`, `:344`, `:376` | FULL |
| PAC-UNIT-001 | Measured pace: inclusive days, same-day = 1, back-filled excluded, none when none | `test_reentry.py:95` (inclusive days across DST, same day = 1, back-filled excluded, none, 0), skips a Reading finished before it started `:193`, missing `finishedPages` = 0 `:208`, the Main book's earlier finish counts `:247` | FULL |
| RDG-E2E-003 (Start half) | Cancel on the Start confirmation changes nothing | Cancel and Esc, nothing changes, focus returns to the opener `start-reading.spec.ts:233`; from the spine popover, focus returns to the spine `:593` | FULL |
| XUI-E2E-001 (Epic 3 surfaces, TR9) | Couldn't save → exact alert, input kept | Page field `update-page.spec.ts:195`; Start dialog `start-reading.spec.ts:402`; Finish dialog with every answer kept `finish-reading.spec.ts:307`; Edit Purpose `start-reading.spec.ts:346` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| PRG-E2E-002 | "Last updated N days ago" with fake today; muted styling | Fake Clock: `reentry.spec.ts:75` (muted ink in both themes, never a warning), past midnight `:163`, over a year `:188`, no update `:199`; calendar-day counting over month, leap and DST edges `frontend/src/lib/relativeDay.test.ts:13`, `:37` | FULL |
| PRG-E2E-004 | Spine accessible names carry status | "Main book, 64%" and "waiting for you, page 120" `home.spec.ts:236`; "finished, re-reading, 12%" `home-slice.spec.ts:298` | FULL |
| FIN-API-004 | Purpose fulfilled only with a Purpose; rating 1-5; both skippable | `test_finish_reading.py:447`, `:475`, `:497`, `:543`; skipped answers stored as null `:126`; no Purpose question without a Purpose `finish-reading.spec.ts:382`, and from a fresh view (retro F-R2) `stale-hand-offs.spec.ts:34`; No rating again `finish-reading.spec.ts:413` | FULL |
| FIN-E2E-001 | Finish moment: status copy, plays once, no replay on reload or in another tab | `finish-moment.spec.ts:233` (status "Finished X. 1 of 121 finished."), `:268` (no replay after a reload, a revisit or in another tab), `:340` (re-read), `:397` (no "!", no praise); never replayed after a finish under another Main (retro F-R3) `stale-hand-offs.spec.ts:83` | FULL |
| XUI-E2E-005 (Epic 3 surfaces) | Empty states: first run, no Main | Empty library on Home `home.spec.ts:75`; "No Main book." `:217`; after a finish `finish-reading.spec.ts:241` | FULL |

#### P3

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| FIN-E2E-002 | Reduced motion → instant fill | `finish-moment.spec.ts:366` (scroll `auto`, fill and ring instant); the Main fill after an update `home-slice.spec.ts:363`, `:545` | FULL |

### Epic 3 gate clauses

| Clause | Evidence | Status |
|---|---|---|
| PRG-E2E-001 (≤ 2 interactions) green | `update-page.spec.ts:175`, `:115` | ✅ MET (passed) |
| Fake-Clock tests for re-entry dates green | `test_reentry.py` (7), `reentry.spec.ts` (8), `relativeDay.test.ts` (3), `today.test.ts` (2), `home.spec.ts:429` | ✅ MET (passed) |
| Fake-Clock tests for finish dates green | `test_finish_reading.py:126`, `:187`, `:359`, `:522`; `test_edit_book.py:311`, `:344`; `finish-reading.spec.ts:110`, `:347` | ✅ MET (passed) |
| Every new error code has an API test | The 3 new `ErrorCode` values (`backend/bookvie/intents/contract.py:48-50`): `already_main` `test_start_reading.py:141`, `:311`; `reading_already_finished` `test_finish_reading.py:271`, `:422`, `test_start_reading.py:354`; `not_main_book` `test_update_page.py:132`, `:254`. All three are in the OpenAPI enum (`test_contract.py:305`-`:307`) | ✅ MET |
| An intent naming a deleted Book gets 409 `book_not_found` | `test_update_page.py:266`; the TR8 tests `test_start_reading.py:165`, `test_finish_reading.py:309`; browser `update-page.spec.ts:363`, `finish-reading.spec.ts:556` | ✅ MET |

### Risks closed

| Risk | Score | Scenarios (test-design) | Evidence | Status |
|---|---|---|---|---|
| R-07 Date/time errors | 4 | FIN-API-003, PRG-API-001, PRG-E2E-001/002 (Epic 3 share); PAC-UNIT-001 | All FULL above, all on a fake Clock; TZ pinned to Europe/Madrid; DST and month edges `test_reentry.py:95`, `relativeDay.test.ts:37`. STA-UNIT-001 completes R-07 in Epic 6 (`epics.md:1857`) | ✅ Closed for Epic 3's share |
| R-10 Pace/stats numbers wrong | 4 | PRG-UNIT-001, PRG-API-003, PAC-UNIT-001 | All FULL above. The pace edge rules found in review (finished before start, missing `finishedPages`) are pinned at `test_reentry.py:193`, `:208` | ✅ Closed for Epic 3's share (Epic 6 adds PAC-API-001, STA-*) |
| R-17 Catch-up speed / size | 2 | PRG-E2E-001; timing smoke | PRG-E2E-001 FULL. The timing smoke is report-only and belongs to Epic 6 | ✅ Closed |

### Coverage heuristics

- **Endpoints.** All five Epic 3 routes have API tests:
  - `POST /api/intents/start-reading`: `test_start_reading.py`.
  - `POST /api/intents/edit-purpose`: `test_start_reading.py:338`, `:354`.
  - `POST /api/intents/update-page`: `test_update_page.py`.
  - `POST /api/intents/finish-reading`: `test_finish_reading.py`.
  - The `home` view: `test_home_view.py`, `test_home_slice.py`, `test_reentry.py`, `test_views.py:342`-`:453`.

  The four intents are also in the shared intent-route table (`test_intent_routes.py:38`) and the OpenAPI operations list (`test_contract.py:339`). Gaps: 0.
- **Auth/authz negative paths.** Each new intent route is in the foreign-caller matrix for intent routes (`test_intent_routes.py`). Status: present.
- **Error paths.** Covered:
  - 409 for `already_main`, `not_main_book` and `reading_already_finished`;
  - 422 `invalid_fields` for page, Finished on, rating and answer, with the failing fields named in form order;
  - 503 `couldnt_save` for every fault step (TR8);
  - stale-tab refusals in the browser (`update-page.spec.ts:331`, `:363`; `start-reading.spec.ts:510`; `finish-reading.spec.ts:504`, `:556`).

  Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The loading, failed first load, empty, "No Main book.", invalid, in-flight and couldn't-save states are all pinned (story ACs below).

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

This table maps each epics.md AC for stories 3.1-3.7 to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 3.1 · 1 | Home first in nav; `/` is Home, the launch page | `home.spec.ts:52` |
| 3.1 · 2 | Empty library: date header (fake today), bare planks, New book → Catalog panel | `home.spec.ts:75`, `:370`; `frontend/src/lib/today.test.ts:6` |
| 3.1 · 3 | No Main book: Last export muted at the header's right end | `home.spec.ts:100`, `:339`; `test_views.py:342` |
| 3.1 · 4 | Axe, both themes, empty and with a Main book | `home.spec.ts:135` |
| 3.1 · 5 | Layout and Main book card (cover, eyebrow, serif title link, author, edition) | `home.spec.ts:155`, `:326`; `test_views.py:349` |
| 3.1 · 6 | Gauge: server 64%, "p.212 of 330", ticks, progressbar ARIA | `home.spec.ts:275`, `:296`, `:312`; `test_home_view.py:28`; `gauge.test.ts:6`, `:11` |
| 3.1 · 7 | Page 0 → 0%, "p.0 of 330" | `home.spec.ts:194`; `test_views.py:381` |
| 3.1 · 8 | "No Main book." + "Choose a book in the Catalog" | `home.spec.ts:217` |
| 3.1 · 9 | Book detail Current reading block; spine names | `home.spec.ts:236`, `:394`; `test_views.py:453` |
| 3.2 · 1 | Start dialog: "Start *X*?", Purpose focused, shown with no Main | `start-reading.spec.ts:85`, `:450`, `:473`, `:542`, `:710` |
| 3.2 · 2 | Confirm: Main, new Reading (today, 0, Purpose, now), Home with focus on title | `start-reading.spec.ts:115`, `:437`, `:568`; `test_start_reading.py:271` |
| 3.2 · 3 | Re-read creates a new Reading, earlier ones unchanged | `test_start_reading.py:91`; `start-reading.spec.ts:450` |
| 3.2 · 4 | Start for the Main book → 409 `already_main` | `test_start_reading.py:141`, `:311`; `start-reading.spec.ts:510` |
| 3.2 · 5 | Resume: "Resume *X*?", Purpose prefilled, same Reading at its page | `start-reading.spec.ts:152`; `test_start_reading.py:271`; from a fresh view (retro F-R2) `stale-hand-offs.spec.ts:58` |
| 3.2 · 6 | "This pauses *Y* at p.120 (64%)."; one intent pauses Y with `pausedAt` | `start-reading.spec.ts:192`, `:481`; `test_start_reading.py:271` |
| 3.2 · 7 | Cancel or Esc changes nothing, focus to opener | RDG-E2E-003 row |
| 3.2 · 8 | Spine popover offers Start reading or Resume; none for a finished Book | `start-reading.spec.ts:266`; `frontend/src/lib/startReading.test.ts:6`-`:25` |
| 3.2 · 9 | Edit Purpose field, Enter saves, Esc cancels | `start-reading.spec.ts:310`, `:621`, `:650`, `:671`; `test_start_reading.py:338` |
| 3.2 · 10 | Edit Purpose couldn't-save: field open, alert below | `start-reading.spec.ts:346`; refusal that unmounts the field reaches `alert` (retro F-R4) `stale-hand-offs.spec.ts:113` |
| 3.2 · 11 | TR8 for start-reading and edit-purpose; couldn't-save keeps the dialog | `test_start_reading.py:165`, `:324`; `start-reading.spec.ts:402` |
| 3.3 · 1 | Page field: label, prefill, "of 330" description, Update, no autofocus | `update-page.spec.ts:81` |
| 3.3 · 2 | Update or Enter saves; views refetch; status "Page 212 of 330, 64%." | `update-page.spec.ts:115`, `:278`; `test_update_page.py:158` |
| 3.3 · 3 | Out of range or fractional → kept, `aria-invalid`, message under it and in alert; server refuses non-integers | `update-page.spec.ts:145`, `:303`, `:391`; `test_update_page.py:218`, `:236`, `:281`; `pageField.test.ts:7`-`:42` |
| 3.3 · 4 | Last page saved, unfinished, `reachedLastPage` | PRG-API-002 row |
| 3.3 · 5 | Stale tab → 409 `not_main_book`, views refresh | `test_update_page.py:132`; `update-page.spec.ts:331` |
| 3.3 · 6 | ≤ 2 interactions, < 30 s | PRG-E2E-001 row |
| 3.3 · 7 | Couldn't save keeps the page, gauge still | `update-page.spec.ts:195`, in flight `:425` |
| 3.3 · 8 | TR8 for update-page | `test_update_page.py:158`, `:266`; `update-page.spec.ts:363` |
| 3.4 · 1 | Measured pace on a fake Clock | PAC-UNIT-001 row |
| 3.4 · 2 | Days left = ceil(left ÷ pace), min 1, omitted rules | `test_reentry.py:138`, `:226`, `:268` |
| 3.4 · 3 | Re-entry line: up to three muted facts, never a warning | `reentry.spec.ts:75`, `:188`, `:199`; `relativeDay.test.ts:13`, `:62` |
| 3.4 · 4 | Last export in the line with a Main book, header without | `reentry.spec.ts:124`, `:218` |
| 3.4 · 5 | Last page: 100%, days left hidden | `reentry.spec.ts:149` |
| 3.4 · 6 | Past midnight: Last updated and Home date recompute on focus | `reentry.spec.ts:163`, `:240`; `home.spec.ts:429` |
| 3.5 · 1 | Server slice priority; client packs rows, up to 3 | PRG-API-003 row |
| 3.5 · 2 | Row order, resize, no filters, list name, keyboard model on displayed rows | `home-slice.spec.ts:201`, `:388`, `:407`, `:467`, `:508`, `:520` |
| 3.5 · 3 | Main fill to 64% with the 2px edge and marker | `home-slice.spec.ts:274`, `:433`, `:450`, `:487`, `:565` |
| 3.5 · 4 | Re-read Main stays full color, "finished, re-reading, 12%" | `home-slice.spec.ts:298`; `test_views.py:422` |
| 3.5 · 5 | Slice header: BOOKCASE, meter, See all in Catalog; legend | `home-slice.spec.ts:328` |
| 3.5 · 6 | Fill moves with the gauge, instant under reduced motion | `home-slice.spec.ts:363`, `:545` |
| 3.6 · 1 | Finish dialog: heading, Finished on today and focused, Purpose question only with a Purpose, Rating | `finish-reading.spec.ts:110`, `:382`, `:469`; fresh view (retro F-R2) `stale-hand-offs.spec.ts:34` |
| 3.6 · 2 | Done stores the finish, clears Main, meter up | FIN-API-001 row |
| 3.6 · 3 | Future or before start refused with exact copy | FIN-API-003 row |
| 3.6 · 4 | Cancel after the last page: active at 100%, focus to the page field, reopen | PRG-E2E-003 row; `finish-reading.spec.ts:448` |
| 3.6 · 5 | Done `aria-disabled` in flight | `finish-reading.spec.ts:209` |
| 3.6 · 6 | Home, "No Main book." focused; Readings block lists the Reading | `finish-reading.spec.ts:241`, `:588`, `:616`; `test_finish_reading.py:602` |
| 3.6 · 7 | Only `finish-reading` sets `finishDate` | `test_finish_reading.py:224` |
| 3.6 · 8 | Already finished → 409 `reading_already_finished` | `test_finish_reading.py:271`, `:422`; `finish-reading.spec.ts:504`, `:556` |
| 3.6 · 9 | TR8 for finish-reading; couldn't-save keeps every answer | `test_finish_reading.py:309`, `:577`, `:595`; `finish-reading.spec.ts:307` |
| 3.7 · 1 | Scroll, ~600 ms fill with ring, "Finished *X*.", meter, status | `finish-moment.spec.ts:233`, `:443`, `:508`, `:558` |
| 3.7 · 2 | Never plays again (reload, revisit, other tab) | `finish-moment.spec.ts:268`, `:468`; `stale-hand-offs.spec.ts:83` |
| 3.7 · 3 | Re-read: ring only, "Finished *X* again.", meter unchanged | `finish-moment.spec.ts:340` |
| 3.7 · 4 | Reduced motion: instant fill and ring, scroll `auto` | `finish-moment.spec.ts:366` |
| 3.7 · 5 | No sound, confetti, praise or "!" | `finish-moment.spec.ts:397` |

**F-T1. ATDD checklists are stale again (low; this is Epic 3 retro open question 2, recurring from F-S6 and the Epic 2 trace's F-T1).** Checklists 3-1..3-4 have 109 unticked lines. Checklists 3-5..3-7 have no checkboxes at all. The work they describe shipped, and every AC above has a passing test. This trace did not reconcile the checklists line by line. The retro left the ticking rule open.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is already in `deferred-work.md` or in the retro.

- **The Start dialog's trade-off line can read from a stale cached `home` view when opened from Book detail** (low; item 22 triage, deferred). Fresh `book` views now fix the dialog's own answers (`stale-hand-offs.spec.ts:34`, `:58`), but the "This pauses *Y*…" line still reads the cached home view.
- **Edit-book can move the latest finish before another finished Reading's finish or start** (low; item 21 triage, pre-existing story 1.11 behaviour).
- **Flaky specs** (Epic 3 retro item 29). None flaked in this run (289/289 on the first try), but the item stays open: a single run doesn't show that flakiness is fixed.

---

## Next actions

1. **LOW:** decide on F-T1, the ticking rule for ATDD checklists (Epic 3 retro open question 2). Then reconcile or retire the 109 lines in checklists 3-1..3-4.
2. **LOW:** a fresh `home` view in the Start dialog, so the trade-off line can't be stale.
3. **LOW:** run `/bmad-testarch-test-review` on the Epic 3 suites.
4. Mark sprint item `epic-3-retro-item-20-…` done.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). PRG-E2E-001 and the fake-Clock re-entry and finish-date tests are green.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-3-traceability-matrix.md

✅ GATE: PASS - Epic 3 meets TR7
```
