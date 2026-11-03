---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-03'
workflowType: 'testarch-trace'
traceTarget: 'epic 1'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; Epic 1 scope)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; Epic 1 gate :265; stories 1.1-1.14)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-6 … 1-14 (story ACs)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '06014dc27bc21d78edf1e47a503c5fca4099056b'
tempCoverageMatrixPath: '/private/tmp/claude-501/-Users-Oleg-Anastassov-github-bookvie/eec043fc-b3ca-43e1-ac62-a6752d44fb78/scratchpad/tea-trace-coverage-matrix-epic-1.json'
---

# Traceability Matrix & Gate Decision: Epic 1, Catalog the home library

**Target:** Epic 1, stories 1.1-1.14 (gate type: epic)
**Date:** 2026-11-03
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `06014dc`. It is `7b768a0` plus two guard tests that this trace found missing; see FND-UNIT-003.
**Gate thresholds:** TR7 (`epics.md:154`): P0 = 100%, P1 ≥ 95%. TR7's P1 target is stricter than this workflow's default of 90%, so it is the target applied. Overall coverage must be ≥ 80%.
**Machine-readable:** `epic-1-e2e-trace-summary.json` and `epic-1-gate-decision.json`, both in this folder. The story 1.9 trace in `../traceability-matrix.md` is unchanged.
**Live verification results:** none on file. **Waiver register:** none on file.

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (15/15), P1 coverage is 100% (17/17; TR7 target 95%), and overall coverage is 100% (36/36; minimum 80%).

### TR7 criteria

| TR7 clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 15/15 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 17/17 FULL | ✅ MET |
| Every error code has an API test | All 7 `ErrorCode` values (`backend/bookvie/intents/contract.py:32`): `invalid_fields` `backend/tests/test_add_book.py:120`; `couldnt_save` `backend/tests/test_contract.py:250`; `duplicate_book` `backend/tests/test_duplicate_book.py:102`; `book_not_found` `backend/tests/test_delete_book.py:131`, `backend/tests/test_edit_book.py:770`; `pages_below_current_page` `backend/tests/test_edit_book.py:132`; `pages_below_card_note` `backend/tests/test_edit_book.py:168`; `cover_too_large` `backend/tests/test_cover.py:619` | ✅ MET |
| `check:api` clean | Passed in the run below (139 frontend unit tests, `tsc -b`, oxlint) | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (319/319), intents+store 98.67% (742/752) | ✅ MET |

### Run evidence

The machine was busy (load average 11.1 on 14 cores, above half the core count), so the run followed `docs/ci.md` → Machine load, with Playwright capped at 4 workers:

| Commit | Command | Result |
|---|---|---|
| `7b768a0` | `caffeinate -i sh -c 'npm run check:py && npm run check:api && npm run build && (cd frontend && TZ=Europe/Madrid npx playwright test --workers=4) && npm run check:smoke'` | exit 0: pytest 756 passed (98% total coverage); coverage gates ok; 139 frontend unit tests passed; Playwright 162 passed (51 s); `smoke: ok` |
| `06014dc` | `npx playwright test e2e/guard.spec.ts e2e/server-fixture.spec.ts --workers=2`, plus oxlint and `tsc -p tsconfig.node.json` on both files | 26 passed (these specs, with the 3 new tests); lint and types clean |

Between the two commits, only those two spec files changed.

---

## Oracle and scope

**Oracle.** TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, and the Epic 1 gate names scenario IDs (FND-*, CAT-E2E-001..005). So the priority-bearing oracle is the set of scenarios Epic 1 delivers: every FND and CAT row, plus the Epic 1 save surfaces of XUI-E2E-001 (TR9). The story-level ACs come in through the ATDD checklists, which were reconciled line by line (see "Story ACs" below). Stories 1.1-1.5 have no ATDD checklist; their ACs are the FND scenarios.

**Out of scope, and why:**

- BKP-*, PRG-*, FIN-*, RDG-*, PAC-*, STA-*, CRD-* and ORG-* belong to Epics 2-7.
- FND-API-006's clause "export sees a consistent snapshot" belongs to story 2.1. Only the serialization half is traced here.
- CAT-E2E-007's "Mark finished" path belongs to Epics 3/4. Only the Edit path is traced.
- XUI-E2E-001's page field, card note, finish, start and pause surfaces belong to Epics 3-5.
- XUI-E2E-002 and XUI-E2E-003 are R-11, closed by the Epic 4 gate. No e2e at this commit holds a delayed response to assert no optimistic UI; `frontend/src/api/intents.test.ts:98` shows only that views are invalidated, not patched.
- XUI-E2E-004 (tone, P3) has no epic owner in `epics.md`.
- XUI-E2E-005 (empty states, P2) belongs to Epics 3/4, beyond the first-run case `frontend/e2e/catalog-empty.spec.ts:72`.
- PRG-E2E-004 (spine names carry status, P2) is an Epic 3 row. The Epic 1 statuses are pinned at `frontend/e2e/bookcase.spec.ts:141`.
- Timing smoke (P2) is report-only (Q2).

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 15             | 15            | 100%       | ✅ PASS |
| P1        | 17             | 17            | 100%       | ✅ PASS |
| P2        | 4              | 4             | 100%       | ✅ PASS |
| P3        | 0              | 0             | 100%       | ✅ N/A |
| **Total** | **36**         | **36**        | **100%**   | **✅ PASS** |

Unique tests mapped: 149, in 28 files. By level: API 88 (23 criteria), unit 38 (11), e2e 21 (8), other 2 (`check:smoke`, `check:api`). No mapped test is skipped, fixme or pending. Rejected evidence: none; every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/`, `frontend/e2e/` or `frontend/src/`, as the column header says.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| FND-API-001 | Fault at temp-write/fsync/rename → `library.json` byte-identical, 503 `couldnt_save` | store seam `test_store.py:481`; HTTP `test_contract.py:250`; per intent `test_add_book.py:249`, `test_edit_book.py:346`, `test_delete_book.py:131`, `test_set_spine_color.py:72`, `test_duplicate_book.py:195`, `test_cover.py:502`, `test_cover.py:554`, `test_cover.py:572` | FULL |
| FND-API-002 | Cover written, then commit fails → doc unchanged; new cover unreferenced and cleaned up | `test_cover.py:365` (new file removed at once), `test_cover.py:398`, `test_cover.py:425` (startup sweep), `test_cover.py:721`, `test_store.py:230` | FULL |
| FND-API-004 | Host/Origin guard matrix → 403, no state change (`Origin: null`, `--dev`) | `test_guard.py:76`, `:100`, `:113`, `:126`, `:136`, `:151` (`Origin: null`), `:186`, `:257`; on real routes `test_intent_routes.py:155`, `:171`, `:185` | FULL |
| FND-API-005 | Binds 127.0.0.1 only | `test_instance.py:136`, `:241`, `:520`; `test_cli.py:234` | FULL |
| FND-API-010 | Newer `schemaVersion` or invalid JSON → refused, file untouched | `test_store.py:278`, `:299`, `:303`, `:309`, `:316`; `test_cli.py:626`, `:648` (exit 1, bytes unchanged, no server) | FULL |
| FND-UNIT-001 | `serialize()` determinism | `test_store.py:41`, `:45`, `:205` | FULL |
| FND-UNIT-002 | `check_invariants()`, one test per rule | `test_invariants.py:28`, `:45`, `:52`, `:71`, `:94`, `:109`, `:127`, `:145`, `:178`, `:198`, `:204`, `:211` | FULL |
| FND-UNIT-003 | e2e guard: only `$TMPDIR/bookvie-e2e`; refuses `~/bookvie-data`, inside it, symlinks into it, missing `--data-dir` | `guard.spec.ts:22`, `:26`, `:42`, `:48`, `:57`, `:84`, `:90`, `:97`; missing dir `guard.spec.ts:54`, `server-fixture.spec.ts:31`; spawn-order `server-fixture.spec.ts:25` | FULL (see note) |
| CAT-API-004 | Finished on → back-filled Reading; with an active/paused Reading, adds a past one | `test_add_book.py:199`; `test_edit_book.py:277`, `:651` | FULL |
| CAT-API-006 | Pages below current page / highest card-note page → 409; finished Readings keep `finishedPages` | `test_edit_book.py:132`, `:168`, `:520`, `:577` | FULL |
| CAT-API-007 | Delete Book → Readings and Card notes gone; pointers cleared in one commit | `test_delete_book.py:65`, `:179` | FULL |
| CAT-E2E-001 | Label contract: every EXPERIENCE.md label and role, `exact: true`; Title ≠ Subtitle | panel `new-book-panel.spec.ts:120`; edit mode `book-detail.spec.ts:123`, `:183`; Duplicate dialog `duplicate-dialog.spec.ts:41`; Remove cover / From cover `cover.spec.ts:278`; Search titles `catalog-list.spec.ts:74` | FULL (see note) |
| CAT-E2E-002 | UJ-1 agent flow | `new-book-panel.spec.ts:239`; `catalog-list.spec.ts:130`; Bookcase view `bookcase.spec.ts:390` | FULL |
| CAT-E2E-003 | Duplicate alertdialog, inert panel; Don't add keeps fields; Add anyway saves | `duplicate-dialog.spec.ts:41`, `:104`, `:136` | FULL |
| CAT-E2E-005 | Couldn't save on Add book → exact alert, panel open, values kept | `new-book-panel.spec.ts:324` | FULL |

**FND-UNIT-003 note.** At `7b768a0`, this row was PARTIAL, which made P0 93% and the gate FAIL. `safeDataDir` refused an empty dir (checked by hand: it resolves to the working directory), and `startServer` always passes `--data-dir` (`frontend/e2e/fixtures.ts:66-69`), but no test pinned either fact. Oleg chose to add the tests and re-gate. `06014dc` adds `refuses an empty data dir` / `refuses a blank data dir` (`frontend/e2e/guard.spec.ts:54`) and `a server with no data dir is refused before anything is spawned` (`frontend/e2e/server-fixture.spec.ts:31`). On the Python side, `backend/tests/conftest.py:1-7` points `HOME` at a temp folder, so a defaulted `--data-dir` can't reach the real library either.

**CAT-E2E-001 note (F-S3, still open).** `CONTRACT_FIELDS` (`frontend/e2e/new-book-panel.spec.ts:31-45`) is a copy of the table, not parsed from it. It was compared with EXPERIENCE.md → Agent Label Contract at this commit, and every field, role and required flag matches. A label renamed in the doc alone would still not fail the suite. That is a maintenance risk, not a gap today; it is open question 2 in the retro.

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| FND-API-003 | Cover replace: new immutable name; old file deleted only after commit | `test_cover.py:331`, `:803` | FULL |
| FND-API-006 | Concurrent intents serialized, none lost (Epic 1 part) | `test_store.py:629`, `:651`; two adds racing over HTTP `test_duplicate_book.py:450` | FULL |
| FND-API-007 | AD-9 envelope on every refusal; 422 lists every field | `test_contract.py:113`, `:142`, `:160`, `:195`, `:221`, `:233`, `:305`; `test_add_book.py:120`; `test_intent_routes.py:96`, `:111` | FULL |
| FND-API-008 | Live lock → open URL + exit; dead PID → takeover; SIGTERM waits, removes lock | `test_cli.py:287`, `:320`, `:574`; `test_instance.py:283`, `:424` | FULL |
| FND-API-011 | Migration writes `library.vN.bak.json` first | `test_migrations.py:83`, `:122` | FULL |
| FND-SMOKE-001 | Build → isolated install → start → `/` + SPA fallback | `scripts/smoke.mjs:123` (`check:smoke`; ok in the run above) | FULL |
| FND-CHK-001 | `check:api` clean | `frontend/scripts/api-contract.mjs` (`check:api`; clean in the run above) | FULL |
| CAT-API-001 | Missing required fields → 422 listing all, nothing saved | `test_add_book.py:120`, `:374` | FULL |
| CAT-API-002 | Field rules (Pages, Edition, Year, ISBN, Spine color, Finished on) | table `test_add_book.py:329` (every named field, plus Type), `:362`, `:385` | FULL |
| CAT-API-005 | Edit Finished on changes the latest finish; clearing refused | `test_edit_book.py:211`, `:498`, `:615` | FULL |
| CAT-API-008 | Cover: non-image refused, > 20 MB refused, ≤ 1200 px, from-cover color computed once | `test_cover.py:227`, `:599`, `:619`, `:656`, `:295`, `:460`; `test_cover_color.py:34` | FULL |
| CAT-API-009 | Duplicate 409 + `confirmDuplicate`; edit checks only when title/author/ISBN change | `test_duplicate_book.py:102`, `:156`; `test_edit_book.py:78` (ends with a pages-only edit of a known duplicate that saves) | FULL |
| CAT-UNIT-001 | ISBN normalization (hyphens, spaces, 10→13, X) | `test_duplicate_book.py:72` (domain `normalize_isbn`), `:341` | FULL |
| CAT-UNIT-002 | Duplicate match rules | `test_duplicate_book.py:72`, `:312`, `:351`, `:362`, `:414` | FULL |
| CAT-E2E-004 | Validation alert, `aria-invalid`, described-by, focus first invalid; live regions emptied per press | `new-book-panel.spec.ts:286`, `:239` (emptied at the press, line 262); `book-detail.spec.ts:225`; `lib/announce.test.ts:35` | FULL |
| CAT-E2E-006 | Delete needs confirmation; Cancel changes nothing | `delete-book.spec.ts:82`, `:119` | FULL |
| XUI-E2E-001 | Couldn't save keeps input (Epic 1 surfaces, TR9) | add `new-book-panel.spec.ts:324`; edit `book-detail.spec.ts:321`; delete `delete-book.spec.ts:142`; color `spine-popover.spec.ts:291`; Add anyway `duplicate-dialog.spec.ts:256` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| FND-API-009 | Port held by another process → message names port and `--port` | `test_cli.py:353`, `:379` | FULL |
| CAT-API-003 | Defaults: edition 1, owned, deterministic curated color, `createdAt` | `test_add_book.py:64`, `:101`, `:523` | FULL |
| CAT-UNIT-003 | Spine color resolution user > from-cover > curated; re-resolve only on input change | `test_edit_book.py:311`; `test_set_spine_color.py:152`; `test_cover.py:803`, `:853` (API level establishes it in full) | FULL |
| CAT-E2E-007 | Back-fill via Edit (Epic 1 part) | `book-detail.spec.ts:409` | FULL |

### Coverage heuristics

- **Endpoints:** every Epic 1 route has API tests. That covers the four intents (`add-book`, `edit-book`, `delete-book`, `set-spine-color`), the views (`/api/views/catalog`, `/api/views/book`, including its 404), `/api/health` and `/media/covers/*`. Gaps: 0.
- **Auth/authz negative paths:** the guard's refusals cover bad Host, foreign Origin, `Origin: null`, cross-site `Sec-Fetch-Site` and dev Origin without `--dev`, on the real routes too (`test_intent_routes.py:155-185`). Status: present.
- **Error paths:** fault → 503 on every intent; 422/409/413 refusals; a malformed body enveloped (`test_intent_routes.py:96`); a 500 on unexpected errors. Status: present.
- **UI journeys and states:** not applicable (formal oracle). The Epic 1 empty, loading, failed and couldn't-save states are all pinned (`catalog-empty.spec.ts:16`, `:37`, `:72`; `book-detail.spec.ts:383`; XUI-E2E-001 row).

### Gap analysis

Critical (P0): 0 · High (P1): 0 · Medium (P2): 0 · Low (P3): 0 · Partial: 0 · Unit-only: 0.

---

## Story ACs: ATDD checklist reconciliation (F-S6)

The nine Epic 1 ATDD checklists had 113 unticked Implementation Checklist lines (1-6: 39, 1-7: 35, 1-8: 35, 1-9: 1, 1-10: 2, 1-14: 1). Each line was checked statically at `7b768a0`. It was either ticked with a `path:line` pointer to the code or test that establishes it, or retired with a reason. All 185 new pointers were checked to resolve to a real line. No checklist has an unticked line left.

| Checklist | Ticked | Retired |
|---|---|---|
| 1-6 Open bookvie to an empty shelf | 36 | 3 |
| 1-7 Accept a new book only when it is complete | 33 | 2 |
| 1-8 Add a book with the New book panel | 32 | 3 |
| 1-9 Get warned about duplicates | 0 | 1 |
| 1-10 See the library as a bookcase | 0 | 2 |
| 1-14 Change a book's color from the shelf | 0 | 1 |
| **Total** | **101** | **12** |

1-11, 1-12 and 1-13 were already fully ticked.

**Retired lines.** None of them is a P0/P1 scenario, and none changes the gate.

- **Deferred to the first Epic 3 story that shows relative days** (F-S5, `deferred-work.md:20`):
  - 1-6 AC-12, the `page.clock` recompute e2e;
  - 1-6 AC-12, recompute on focus/visibilitychange (`useNow` exists but nothing uses it);
  - 1-8 AC-10, the 500 ms announce pause measured with `page.clock`.
- **New deferred entries from this trace:**
  - 1-6 AC-14, the on-load animation guard (`deferred-work.md:163`);
  - 1-7 AC-2, rotation after a delete, which goes with the F-R4 fix (`deferred-work.md:160`);
  - 1-8 AC-5, an add through the panel with every optional field (`deferred-work.md:166`).
- **Already deferred:**
  - 1-7, the Hypothesis property test (`deferred-work.md:60`);
  - 1-10 AC-3, the 1.5px outline (`deferred-work.md:96`);
  - 1-14 AC-1, popover checks on Home's slice (`deferred-work.md:122`).
- **Superseded or not applicable:**
  - 1-8 AC-6, one UI test per validation row: the server owns the messages, each rule is pinned at `test_add_book.py:329`, and the UI path at `new-book-panel.spec.ts:303`;
  - 1-9 AC-9, `book_not_found` on `add-book`: add names no existing Book, and edit pins it;
  - 1-10 AC-6, a 500-spine render-time budget: NFR7 sets a scale, not a time, and the scale is pinned at `bookcase.spec.ts:220`.

**Ticked with a stated remainder.** These lines were ticked because the substance is done; each pointer names what is missing. Examples: 1-8's `page.clock` prerequisite (TZ and `timezoneId` done), 1-6 AC-7 (refetch on `focus` tested, not `visibilitychange`), and 1-6 AC-9 (focus halo untested).

---

## Next actions

1. **LOW:** run `/bmad-testarch-test-review` on the Epic 1 suites.
2. **LOW:** decide F-S3: drive CAT-E2E-001 from the EXPERIENCE.md table, or reword R-05 to accept a test-owned copy.
3. **Epic 2 trace:** BKP-API-001/003/004/005 plus FND-API-006's export clause.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%).

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-1-traceability-matrix.md

✅ GATE: PASS - Epic 1 meets TR7
```
