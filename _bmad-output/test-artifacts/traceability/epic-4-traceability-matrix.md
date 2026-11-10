---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-10'
workflowType: 'testarch-trace'
traceTarget: 'epic 4'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; the RDG rows, FIN-API-001''s Up next share, FIN-API-002, and the Epic 4 parts of RDG-E2E-003, XUI-E2E-001, XUI-E2E-002, XUI-E2E-003 and XUI-E2E-005)'
  - '_bmad-output/test-artifacts/test-design-architecture.md (R-01 :99, :203; R-11 :114)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; TR9 :156; Epic 4 gate :1407; stories 4.1-4.7 :1409-1698)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states :59-82)'
  - '_bmad-output/implementation-artifacts/epic-4-retro-2026-11-09.md (action 37)'
  - '_bmad-output/test-artifacts/atdd-checklist-4-1, 4-2, 4-4 (story ACs; reconciled, see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'a773997'
---

# Traceability Matrix & Gate Decision: Epic 4, Switch books without losing your place

**Target:** Epic 4, stories 4.1-4.7 (gate type: epic). This is Epic 4 retro action item 37 (`epic-4-retro-2026-11-09.md`).
**Date:** 2026-11-10
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `a773997` plus this trace's three test additions (below). That commit includes the retro fixes for items 32-36, 42 and 43, and item 36's automation for stories 4.4-4.7. This trace changed no product code.
**Gate thresholds:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%, which is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%. The Epic 4 gate (`epics.md:1407`) adds: RDG-UNIT-002 green, and every EXPERIENCE.md Book-states row has a Given/When/Then API test (RDG-API-001..003). It closes R-01 and R-11.
**Machine-readable:** `epic-4-e2e-trace-summary.json` and `epic-4-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file.

### Tests this trace added

Confirming RDG-API-001..003 row by row turned up gaps in two places, so the trace closed them rather than leaving them open:

1. **A row × intent matrix** (`backend/tests/test_book_states.py:197`, `test_p0_every_book_state_row_under_start_reading_pause_and_set_up_next`). Story 4.6's existing test (`:129`) pins what each row *reads as*. Four row × intent pairs had no API test of their own; the property test reached them only at random:
   - `pause` on "Finished, re-reading as Main";
   - `set-up-next` on "Finished, re-read paused";
   - `set-up-next` on "Never read, paused, Up next" (a no-op);
   - `set-up-next` on "Finished, re-reading as Main" (a refusal).

   The new test sends `start-reading`, `pause` and `set-up-next` from each of the 10 rows and checks the outcome the row calls for: refusals with the file byte-identical, the resumed Reading kept or a new one at 0, `pausedAt` = today, the no-op writing nothing, and the invariants. This is R-01's planned mitigation, "API matrix of lifecycle intent × EXPERIENCE 'Book states' row" (`test-design-architecture.md:203`). A mutation check (the Main-book refusal removed from `set_up_next.py`) fails exactly its two Main rows.
2. **The shared intent-route matrix** (`backend/tests/test_intent_routes.py:34`) was missing Story 4.7's `mark-side-read` and `unmark-side-read`, so neither ran against the foreign-caller guard (403), unparseable bodies or a missing intent part. Both were added.
3. **A completeness check** (`test_intent_routes.py:125`, `test_the_table_lists_every_intent_route`) compares that table with the OpenAPI paths under `/api/intents/`. It caught one more route the table had missed since Epic 3: `finish-reading`, which was added too. The check fails on `a773997` and passes now.

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (6/6).
- P1 coverage is 100% (8/8), against the TR7 target of 95%.
- Overall coverage is 100% (17/17), against the minimum of 80%.
- RDG-UNIT-002 is green in CI (60 examples) and in a 600-example run.
- Every EXPERIENCE.md Book-states row has Given/When/Then API tests: one for what the row reads as, one for each lifecycle intent sent from it.
- Every new Epic 4 error code has an API test.
- R-01 and R-11 are closed.

### TR7 and Epic 4 gate criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 6/6 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 8/8 FULL | ✅ MET |
| RDG-UNIT-002 green | `test_reading_state_machine.py:830` in the run below (60 examples × 25 steps); a separate 600-example run passed (see "Epic 4 gate clauses") | ✅ MET |
| Every Book-states row has a Given/When/Then API test (RDG-API-001..003) | "Book states, row by row" below: 10 rows × 4 checks, plus the Side-read row | ✅ MET |
| Every new error code has an API test | `not_main_book` (pause), `main_cannot_be_up_next`, `main_cannot_be_side_read`, `side_reads_full` (gate clauses below) | ✅ MET |
| `check:api` clean | 237 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (375/375 lines), intents+store 97.95% (1531/1563) | ✅ MET |
| Closes R-01, R-11 | "Risks closed" below | ✅ MET |

### Run evidence

**Commit:** `a773997` with this trace's test additions in the working tree (`test_book_states.py`, `test_intent_routes.py`).

**Commands**, run one after the other:

```sh
npm run check:py
npm run check:api
npm --prefix frontend run e2e
```

**Result:** every exit code was 0.

| Check | Outcome |
|---|---|
| pytest | 1208 passed (1167 at item 36, plus the 41 new cases: 10 row × intent cases, 30 for the 3 routes added to the shared route matrix, and the completeness check) |
| Coverage gates | domain 100.00% (375/375), intents+store 97.95% (1531/1563): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint; 237 passed, 0 failed |
| Playwright | 416 passed (1.3 m, 7 workers), none flaky, retried or skipped |
| RDG-UNIT-002 at 600 examples | passed (48 s) |

The Playwright global setup rebuilt the SPA (Epic 3 retro item 27).

---

## Oracle and scope

**Oracle.** The oracle is the same as for Epics 1-3. TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, and the Epic 4 gate names scenario IDs. So the priority-bearing oracle is the set of scenarios Epic 4 delivers:

- every RDG row;
- FIN-API-001's "Up next suggested" (Epic 3 traced the rest of it) and FIN-API-002;
- the Epic 4 surfaces of shared rows:
  - RDG-E2E-003's Pause half;
  - XUI-E2E-001 for pause, set-up-next, side reads, Resume from a row and the non-Main finish;
  - XUI-E2E-002 and XUI-E2E-003 (R-11);
  - XUI-E2E-005 for no Up next, and Waiting for you with 0, 1 or many rows.

The story ACs are mapped one by one in "Story ACs" below. That table does not change the counts.

**Out of scope, and why:**

- **PRG-E2E-003** (last page → Finish dialog) was traced in Epic 3. Its Side-read route, "Which page?" at the last page, is Story 4.7 AC-4 and is mapped below.
- **FIN-E2E-001** (the finish moment) was traced in Epic 3. A non-Main finish plays no moment (Story 4.5), which is mapped below.
- **XUI-E2E-001's card note and delete surfaces** belong to Epics 5 and 1.
- **XUI-E2E-004** (tone) has no epic owner. Epic 4's copy is pinned by its exact strings.
- **PAC-*** and **STA-*** belong to Epic 6. The item 35 fix (Measured pace counts only tracked pages) is cited under RDG-API-004 as supporting evidence.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 6              | 6             | 100%       | ✅ PASS |
| P1        | 8              | 8             | 100%       | ✅ PASS |
| P2        | 3              | 3             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **17**         | **17**        | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 4 files, plus the Epic 4 tests in shared files:

- **Backend:** `test_up_next.py`, `test_waiting_for_you.py`, `test_pause.py`, `test_set_up_next.py`, `test_finish_any_book.py`, `test_book_states.py`, `test_side_reads.py`, `test_reading_state_machine.py`, `test_edit_book_back_fill.py`, plus the Epic 4 tests in:
  - `test_start_reading.py` (state matrix, item 35);
  - `test_finish_reading.py:395`;
  - `test_progress.py:24`;
  - `test_invariants.py:45`-`:100`;
  - `test_reentry.py:321`, `:366`;
  - `test_views.py:166`, `:412`;
  - `test_intent_routes.py`;
  - `test_contract.py:305`-`:308`.
- **e2e:** `up-next`, `waiting-for-you`, `pause`, `set-up-next`, `finish-any-book`, `book-states` and `side-reads`, plus the Epic 4 leaves of `finish-reading` (`:302`, `:694`) and `stale-hand-offs` (`:151`).

**By level:** The 16 Epic 4 files hold 208 tests. Shared-file tests are mapped but not counted.

| Level | Tests (Epic 4 files) | Criteria covered |
|---|---|---|
| e2e | 115 (7 specs) | 10 |
| API | 91 (9 backend files) | 5 |
| Unit | 2 (the property test and its seed check) | 2 |

 Parametrized tests run many more cases, for example:

- the start-reading state matrix: 18 cases;
- the Book-states tests: 10 rows each;
- the shared intent-route matrix: 15 routes × 9 bodies or callers.

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| RDG-API-001 | `start-reading` × state matrix → pointers, Reading count, statuses; every EXPERIENCE state row | State matrix (never, finished, re-read paused × with or without Main × Up next none, the Book or another): 18 cases `test_start_reading.py:276`. The interrupted Main becomes Up next in the same commit `test_up_next.py:91`. Starting the Up next takes it out of Up next `:122`. No Main leaves Up next in place `:250`. `already_main` `test_start_reading.py:135`, `:329`. Side reads at a page, at the last page and below it `test_side_reads.py:262`, `:288`, `:308`. Every Book-states row `test_book_states.py:197` (start-reading part) | FULL |
| RDG-API-002 | `pause` with or without Up next → displacement rules; `pausedAt` = today | No Up next `test_pause.py:110`; a paused Up next displaced to Waiting `:139`; an unstarted one to the catalog `:160`; re-pause overwrites `pausedAt` `:180`; `not_main_book` `:194`, `:208`; `book_not_found` `:220`; faults `:231`; `pausedAt` kept through resume and finish `:246`; an Epic 3 library `:270`; a displaced Side read stays on the side `test_set_up_next.py:144` (same displacement code). Every Book-states row, including the re-read Main `test_book_states.py:197` (pause part) | FULL |
| RDG-UNIT-001 | `reading_status()` finished, active or paused; `pausedAt` ignored while active | `test_progress.py:24` (finished; active while Main whatever `pausedAt` says; paused with or without `pausedAt`) | FULL |
| RDG-UNIT-002 | Property: random intent sequences → invariants hold; ≤ 1 unfinished Reading; Waiting = paused − Up next | `test_reading_state_machine.py:830`. Its rules are start (with "Which page?"), pause, set-up-next, mark and unmark side, edit purpose, update page, finish, add, edit details, delete and days passing (`:244`-`:745`). The invariants are checked after every step (`:751`, `:760`, `:771`), and the seed covers every starting state (`:833`). It ran at 60 examples × 25 steps in CI and 600 × 25 here | FULL |
| FIN-API-001 (Up next share) | Finish Main → no Main; Up next suggested | `upNextBookId` left alone, so Home suggests it `test_finish_reading.py:395`; in the browser, Done lands on the card's Up next suggestion `finish-reading.spec.ts:302`, only once `:694` | FULL |
| FIN-API-002 | Finish non-Main → Main unchanged; removed from Up next and Waiting | A paused Up next `test_finish_any_book.py:111`; a Waiting Book `:139`; a paused Side read `:164`; a never-read Up next back-filled `:188`; a never-read Side read `:217`; refusals `:233`, `:251`, `:266`, `:285`; faults `:306`; browser `finish-any-book.spec.ts:116`, `:164`, `:190` | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| RDG-API-003 | `set-up-next` displacement; Main can't be Up next | No-op that commits nothing `test_set_up_next.py:73`; paused Z → Waiting, unstarted Z → catalog `:101`; a Side read stays on the side `:144`; `main_cannot_be_up_next` `:169`; a finished Book and a Side read `:192`; TR8 `:258`. Every Book-states row `test_book_states.py:197` (set-up-next part) | FULL |
| RDG-API-004 | Side reads: max 3, no side effects, "Which page?", leave on Main or finish | Mark changes nothing else `test_side_reads.py:86`; again is a no-op `:108`; `main_cannot_be_side_read` `:128`; `side_reads_full` `:145`; unmark `:168`, `:187`; "Which page?" required and in range `:213`, `:234`, `:253`; start leaves the side `:262`, `:288`; views `:337`, `:381`; TR8 `:405`. Finish leaves the side `test_finish_any_book.py:164`, `:217`; an edit-book back-fill does too (item 34) `test_edit_book_back_fill.py:51`-`:103`. Invariants `test_invariants.py:52`-`:100`; guard and bodies `test_intent_routes.py` (this trace). Supporting: a Side read's start page stays out of Measured pace (item 35) `test_reentry.py:321`, `:366` | FULL |
| RDG-API-006 | Waiting order: oldest `pausedAt` first, no cap, Up next excluded | `test_waiting_for_you.py:63` (order, fixed ties, Up next excluded); an Epic 3 pause listed `:133`; no `pausedAt` first, then title key and id `:183`; empty `:197`; title key `test_ordering.py:18`-`:27`; many rows in the browser `waiting-for-you.spec.ts:156` | FULL |
| RDG-E2E-001 | UJ-3: trade-off and displacement copy → confirm → Home state | "Z moves to Waiting for you." `up-next.spec.ts:81`; "returns to the catalog." `:277`; "stays on the side." `:314`; no line with no Main `:351`; a stale open dialog `:653` | FULL |
| RDG-E2E-002 | Flow 10: Pause via ⋯ → Resume from Waiting, Purpose prefilled | `pause.spec.ts:512` | FULL |
| RDG-E2E-003 (Pause half) | Cancel on the Pause confirmation changes nothing | Esc and Cancel send nothing `pause.spec.ts:248`; Cancel returns to Pause `:295`; a row's Cancel `waiting-for-you.spec.ts:278`, `:554`; the pane's Cancel `up-next.spec.ts:404` | FULL |
| XUI-E2E-001 (Epic 4 surfaces) | Couldn't save → exact alert, input kept | Pause below "⋯" `pause.spec.ts:398`, on Book detail `:446`, in the Confirm dialog `:467`; Set as Up next `set-up-next.spec.ts:157`, popover `:300`; Mark and Remove from side `side-reads.spec.ts:195`; Resume from a row `waiting-for-you.spec.ts:452`; non-Main finish `finish-any-book.spec.ts:267` | FULL |
| XUI-E2E-002 | Two contexts: an intent in A shows in B after focus; refusals also invalidate | Start `up-next.spec.ts:216`, `:653`; resume from a row `waiting-for-you.spec.ts:398`; set-up-next `set-up-next.spec.ts:720`. Refusals that refetch: pause `pause.spec.ts:573`, `:608`; set-up-next `set-up-next.spec.ts:381`, `:409`, `:555`; deleted elsewhere `:499`, `:525`; side read `side-reads.spec.ts:411`; finish `stale-hand-offs.spec.ts:151`. A failed refetch never finishes the wrong Book (F-R5) `side-reads.spec.ts:534` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| RDG-API-005 | Purpose set on start, editable, nullable | Trimmed on start `test_start_reading.py:276`; null on start `test_book_states.py:197`; edit keeps everything else `test_start_reading.py:356`; empty → null `test_purpose.py:21`; prefilled on Resume `pause.spec.ts:512`, `waiting-for-you.spec.ts:193` | FULL |
| XUI-E2E-003 | No optimistic UI under a delayed response | Pause in flight `pause.spec.ts:630`, double clicks `:370`, `:383`; Set as Up next in flight `set-up-next.spec.ts:325`, in the popover with a refetch landing meanwhile `:583`, `:629` | FULL |
| XUI-E2E-005 (Epic 4 surfaces) | Empty states: no Up next; Waiting 0, 1, many | "Nothing up next." `up-next.spec.ts:130`; no Main with an Up next `:181`; Waiting hidden `waiting-for-you.spec.ts:131`, `:343`; "(1)" `:365`; many `:156`; On the side hidden when empty `side-reads.spec.ts:256` | FULL |

### Book states, row by row (RDG-API-001..003)

Each EXPERIENCE.md row (`EXPERIENCE.md:69`-`:80`) and its API tests. Every row has all four.

- **"Reads as"** is `test_book_states.py:129`, which seeds the row and reads the catalog, home and book views.
- **The other three columns** are `test_book_states.py:197`, which sends that intent from the row.
- **The browser half** (spine name, marker, popover primary, Home pane, Book detail stack) is `book-states.spec.ts:231`, one leaf per row.

| Row | Reads as | start-reading | pause | set-up-next |
|---|---|---|---|---|
| Never read, no Reading | ✅ | Main, new Reading at 0 | 409 `not_main_book` | Up next |
| Never read, Up next | ✅ | Main, leaves Up next | 409 `not_main_book` | 200 no-op |
| Never read, Main | ✅ | 409 `already_main` | paused, Up next | 409 `main_cannot_be_up_next` |
| Never read, paused | ✅ | resumes at p.120 | 409 `not_main_book` | Up next (paused) |
| Never read, paused, Up next | ✅ | resumes, leaves Up next | 409 `not_main_book` | 200 no-op |
| Finished, no Reading | ✅ | re-read at 0 | 409 `not_main_book` | Up next |
| Finished, Up next | ✅ | re-read, leaves Up next | 409 `not_main_book` | 200 no-op |
| Finished, re-reading as Main | ✅ | 409 `already_main` | paused, Up next | 409 `main_cannot_be_up_next` |
| Finished, re-read paused | ✅ | resumes at p.40 | 409 `not_main_book` | Up next (paused) |
| Finished, re-read paused, Up next | ✅ | resumes, leaves Up next | 409 `not_main_book` | 200 no-op |
| Any of the above, plus Side read | `test_side_reads.py:337`, `:381`; `book-states.spec.ts:231` (Side-read leaves); `side-reads.spec.ts:306` | "Which page?" `test_side_reads.py:213`-`:308` | the Side read keeps its place `test_set_up_next.py:144` | stays on the side `test_set_up_next.py:192` |

Supporting evidence: the 18-case state matrix (`test_start_reading.py:276`) and the property test also drive these intents from every row, at random.

### Epic 4 gate clauses

| Clause | Evidence | Status |
|---|---|---|
| RDG-UNIT-002 green | `test_reading_state_machine.py:830` passed in `check:py`. A 600-example run (25 steps each) from a scratch runner, `run_state_machine_as_test(ReadingPlan, settings(max_examples=600, …))`, passed in 48 s with no failure. That is R-01's "≥ 500 examples" bar (`test-design-architecture.md:203`) | ✅ MET |
| Every Book-states row has a Given/When/Then API test | Table above | ✅ MET |
| Every new error code has an API test | Epic 4's 4 new `ErrorCode` uses (`backend/bookvie/intents/contract.py:52-55`): `not_main_book` for pause `test_pause.py:194`, `:208`; `main_cannot_be_up_next` `test_set_up_next.py:169`; `main_cannot_be_side_read` `test_side_reads.py:128`; `side_reads_full` `:145`. All four are in the OpenAPI enum (`test_contract.py:305`-`:308`). The 422 "Which page?" field errors are `test_side_reads.py:213`, `:234` | ✅ MET |
| An intent naming a deleted Book gets 409 `book_not_found` | pause `test_pause.py:220`; set-up-next `test_set_up_next.py:258`; mark and unmark `test_side_reads.py:405`; non-Main finish `test_finish_any_book.py:306`; browser `set-up-next.spec.ts:499`, `:525` | ✅ MET |

### Risks closed

| Risk | Score | Scenarios (test-design) | Evidence | Status |
|---|---|---|---|---|
| R-01 Reading-state transitions | 6 | FND-UNIT-002, RDG-UNIT-001/002, RDG-API-001..003, FIN-API-001/002, PRG-API-002 | All FULL above or in Epics 1 and 3 (FND-UNIT-002, PRG-API-002). Both planned mitigations are in place: the API matrix of lifecycle intent × Book-states row (`test_book_states.py:197`), and Hypothesis random sequences at ≥ 500 examples. Retro fixes 34 and 35 (Side-read back-fill, start page) are in the property model | ✅ Closed |
| R-11 Stale views across tabs | 4 | XUI-E2E-002/003, FIN-E2E-001 | XUI-E2E-002 and -003 FULL above; FIN-E2E-001 FULL in Epic 3. The residual (a stale confirmation applies to the current state, A2) is accepted and pinned: `up-next.spec.ts:653`. F-R5, where a failed refetch could open Finish for the wrong Book, was fixed in item 36 (`side-reads.spec.ts:534`) | ✅ Closed (residual accepted, A2) |

### Coverage heuristics

- **Endpoints.** All four new Epic 4 intent routes have API tests:
  - `pause`: `test_pause.py`;
  - `set-up-next`: `test_set_up_next.py`;
  - `mark-side-read` and `unmark-side-read`: `test_side_reads.py`.

  `start-reading` and `finish-reading` were extended and are tested in `test_up_next.py`, `test_side_reads.py` and `test_finish_any_book.py`. The home, catalog and book views carry the new fields (`test_up_next.py:273`, `test_waiting_for_you.py:63`, `test_side_reads.py:337`, `test_views.py:166`, `:412`). Gaps: 0.
- **Auth/authz negative paths.** Every intent route is in the foreign-caller matrix (`test_intent_routes.py`). Before this trace, `mark-side-read`, `unmark-side-read` and `finish-reading` weren't. They are now, and `test_intent_routes.py:125` keeps the table complete. Status: present.
- **Error paths.** Covered:
  - 409 for each new code and `book_not_found`;
  - 422 `invalid_fields` on "Which page?" and malformed intents;
  - 503 `couldnt_save` for every fault step on every new route (TR8);
  - stale-tab refusals in the browser (XUI-E2E-002 row).

  Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The empty, in-flight, couldn't-save, stale and focus states are pinned (story ACs below).

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

This table maps each epics.md AC for stories 4.1-4.7 to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 4.1 · 1 | Start pauses Y and makes it Up next in one commit | `test_up_next.py:91`; `test_start_reading.py:276` |
| 4.1 · 2 | Displacement line for Z, and confirming moves Z as stated | RDG-E2E-001 row |
| 4.1 · 3 | Starting the Up next takes it out of Up next, no line | `test_up_next.py:122`; `up-next.spec.ts:371` |
| 4.1 · 4 | Up next pane: thumbnail, title link, author, Start reading or Resume; "Nothing up next." | `up-next.spec.ts:130`, `:404`, `:441`, `:476`, `:510`, `:548`, `:621` |
| 4.1 · 5 | No Main: the card suggests the Up next; the 3.6 focus amendment | `up-next.spec.ts:181`, `:429`; `finish-reading.spec.ts:302`, `:694` |
| 4.1 · 6 | Two contexts: refetch on focus, last write wins, no warning | `up-next.spec.ts:216`, `:653` |
| 4.1 · 7 | TR8 for the extended start-reading | `test_up_next.py:188`, `:273` |
| 4.2 · 1 | Waiting order by `pausedAt`, fixed ties, no cap | RDG-API-006 row |
| 4.2 · 2 | Pane rows: title link, mini bar, "p.120 of 330", Resume; never the paused-at date | `waiting-for-you.spec.ts:83`, `:365`, `:435`, `:486`, `:526` |
| 4.2 · 3 | Hidden with nothing waiting | `waiting-for-you.spec.ts:131`, `:343` |
| 4.2 · 4 | An Epic 3 paused Reading is listed, invariants hold | `test_waiting_for_you.py:133`; `waiting-for-you.spec.ts:398` |
| 4.2 · 5 | Many rows: all shown, the page scrolls | `waiting-for-you.spec.ts:156` |
| 4.2 · 6 | Resume from a row: "Resume X?", Purpose, trade-off lines, Main at its page | `waiting-for-you.spec.ts:193`, `:278`, `:310`, `:452` |
| 4.2 · 7 | A paused Up next only in Up next, count excludes it | `waiting-for-you.spec.ts:250`, `:554`; `test_waiting_for_you.py:63` |
| 4.3 · 1 | "⋯" menu: Pause, Open book, arrows, Esc and outside click | `pause.spec.ts:132`, `:166`, `:210`, `:684` |
| 4.3 · 2 | Pause with no Up next: one commit, status line | `pause.spec.ts:219`, `:355`; `test_pause.py:110` |
| 4.3 · 3 | Confirm dialog with the Z line; Cancel or Esc changes nothing | `pause.spec.ts:248`, `:295`, `:331`; `test_pause.py:139`, `:160` |
| 4.3 · 4 | Not Main → 409 `not_main_book` | `test_pause.py:194`, `:208`; `pause.spec.ts:573`, `:608` |
| 4.3 · 5 | Focus after pause: Resume on Home or Book detail | `pause.spec.ts:219`, `:295`, `:355` |
| 4.3 · 6 | The menu closes before the dialog opens | `pause.spec.ts:248` |
| 4.3 · 7 | `pausedAt` survives resume and finish | `test_pause.py:246`, `:180` |
| 4.3 · 8 | Couldn't save in the dialog, below "⋯", below Pause; TR8 | XUI-E2E-001 row; `pause.spec.ts:419`, `:661`; `test_pause.py:220`, `:231` |
| 4.4 · 1 | Set as Up next from Book detail or the popover; status; focus | `set-up-next.spec.ts:125`, `:255`; `test_set_up_next.py:101` |
| 4.4 · 2 | The current Up next again: 200, nothing committed | `test_set_up_next.py:73`; `set-up-next.spec.ts:555` |
| 4.4 · 3 | Couldn't save below the button, focus kept | `set-up-next.spec.ts:157`, `:300`, `:381`, `:409`, `:469` |
| 4.4 · 4 | Z moves to Waiting, stays on the side, or returns to the catalog | `test_set_up_next.py:101`, `:144`; `set-up-next.spec.ts:664` |
| 4.4 · 5 | Hint "Replaces the current Up next." | `set-up-next.spec.ts:181`, `:446`, `:461`, `:629` |
| 4.4 · 6 | Not offered on the Main book; 409 `main_cannot_be_up_next` | `set-up-next.spec.ts:282`; `test_set_up_next.py:169` |
| 4.4 · 7 | A Waiting Book set as Up next leaves Waiting, shows Resume | `set-up-next.spec.ts:218`; `test_set_up_next.py:192` |
| 4.4 · 8 | A finished Book or a Side read becomes Up next; TR8 | `test_set_up_next.py:192`, `:258`; `set-up-next.spec.ts:694` |
| 4.5 · 1 | Mark finished opens the Finish dialog; offered only where it applies | `finish-any-book.spec.ts:116`, `:223` |
| 4.5 · 2 | A finished Book with no Reading in progress → 409 `reading_already_finished` | `test_finish_any_book.py:266` |
| 4.5 · 3 | Done finishes it, Main unchanged, out of Up next and Waiting; stay on Book detail | FIN-API-002 row; `finish-any-book.spec.ts:116`, `:164`; `stale-hand-offs.spec.ts:151` |
| 4.5 · 4 | Never read: back-filled Reading; clears Up next in the same commit | `test_finish_any_book.py:188`; `finish-any-book.spec.ts:190` |
| 4.5 · 5 | Before its start → refused with Story 3.6's message; TR8 | `test_finish_any_book.py:285`, `:306`; `finish-any-book.spec.ts:242`, `:267` |
| 4.6 · 1 | One marker per spine by priority; legend names all five | `book-states.spec.ts:276`, `:321` |
| 4.6 · 2 | Every Book-states row: name, popover primary, Home pane; API and e2e per row | "Book states, row by row" above; `book-states.spec.ts:231` |
| 4.6 · 3 | Book detail primary and secondary stack, in order; Edit Purpose not in it | `book-states.spec.ts:231` (stack per row); `set-up-next.spec.ts:282`; `side-reads.spec.ts:170` |
| 4.6 · 4 | Property test: invariants, ≤ 1 Main, no page lost except by the user | RDG-UNIT-002 row |
| 4.7 · 1 | Mark and Remove from side: nothing else changes; status; focus | `side-reads.spec.ts:126`, `:170`; `test_side_reads.py:86`, `:168` |
| 4.7 · 2 | Couldn't save below the button | `side-reads.spec.ts:195` |
| 4.7 · 3 | Three Side reads: `aria-disabled`, "Up to 3 side reads."; 409 `side_reads_full`, `main_cannot_be_side_read` | `side-reads.spec.ts:222`; `test_side_reads.py:128`, `:145` |
| 4.7 · 4 | On the side pane; ", on the side" with no marker | `side-reads.spec.ts:256`, `:299`; `book-states.spec.ts:231` |
| 4.7 · 5 | "Which page?" from every route: prefilled, focused, leaves the side, last page → Finish, lower page accepted | `side-reads.spec.ts:332`, `:439`, `:494`, `:534`, `:638` (5 routes), `:663`; `test_side_reads.py:262`, `:288` |
| 4.7 · 6 | A Side read that is Up next or waiting: both panes, one marker | `side-reads.spec.ts:306` |
| 4.7 · 7 | "Which page?" empty, fractional or out of range: field and alert; server 422 | `side-reads.spec.ts:332`, `:386`, `:466`; `test_side_reads.py:213`, `:234` |
| 4.7 · 8 | Finished from Book detail → leaves the side; TR8; the property test includes Side reads | `side-reads.spec.ts:494`; `test_finish_any_book.py:164`, `:217`; `test_side_reads.py:405`; `test_reading_state_machine.py:420`, `:439` |

### ATDD checklists

Epic 3's F-T1 left the ticking rule open. Since then, the trace ticks or retires the open lines of the epic's checklists, and records the count of open (`[ ]`) lines before and after. Stories 4.3 and 4.5-4.7 have no checklist, since ATDD wasn't backfilled (retro item 43).

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md` | 1 | 0 | RDG-E2E-001 ticked: `up-next.spec.ts:81`, `:277`, `:314` passed in the run above |
| `atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md` | 0 | 0 | |
| `atdd-checklist-4-4-choose-what-to-read-next.md` | 0 | 0 | Ticked by item 36 |

No line is left open, so no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is already in `deferred-work.md` or in the retro.

- **The page field's last-page save can open Finish for another Book** (low). `openFinish` has the same shape that item 36 fixed for "Which page?" (F-R5). It was deferred by item 36.
- **The unresolved Epic 4 review deferrals in `deferred-work.md`** (4.4-4.7 second passes, items 34, 35 and 42). Each is a product or copy question, not a missing test.
- **Spine drift** from Epic 4 and items 34/35 is reconciled by item 38, before Epic 5.
- **Flaky specs.** None flaked in this run (416 of 416 passed on the first try). One run doesn't prove flakiness is gone.

---

## Next actions

1. **Item 38:** reconcile the spine with Epic 4, closing the "spine drift" entries with `resolved:` lines.
2. **LOW:** decide on `openFinish` (the page field's last-page Finish for the started Book only).
3. **LOW:** run `/bmad-testarch-test-review` on the Epic 4 suites.
4. Mark sprint item `epic-4-retro-item-37-…` done.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). RDG-UNIT-002 is green (60 examples in CI, 600 here), every Book-states row has Given/When/Then API tests for its state and for start-reading, pause and set-up-next, and every new error code has an API test. R-01 and R-11 are closed.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-4-traceability-matrix.md

✅ GATE: PASS - Epic 4 meets TR7
```
