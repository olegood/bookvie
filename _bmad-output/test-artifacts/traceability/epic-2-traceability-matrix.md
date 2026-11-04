---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-04'
workflowType: 'testarch-trace'
traceTarget: 'epic 2'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; BKP-* and the Epic 2 parts of FND-API-006 / XUI-E2E-001)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; TR9 :156; Epic 2 gate :961; stories 2.1-2.3 :963-1078)'
  - '_bmad-output/test-artifacts/atdd-checklist-2-1 … 2-3 (story ACs, read but not reconciled; see F-T1)'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '6454384693f0aa36422f0cd4224c6a89bbfa98a2'
---

# Traceability Matrix & Gate Decision: Epic 2, Keep the library safe

**Target:** Epic 2, stories 2.1-2.3 (gate type: epic)
**Date:** 2026-11-04
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `6454384`. No code or tests were changed by this trace.
**Gate thresholds:** TR7 (`epics.md:154`): P0 = 100%, P1 ≥ 95% (stricter than the workflow default of 90%, so it applies). Overall coverage must be ≥ 80%. The Epic 2 gate (`epics.md:961`) adds BKP-API-001 and BKP-API-003..005 green by name.
**Machine-readable:** `epic-2-e2e-trace-summary.json` and `epic-2-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file.

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (4/4), P1 coverage is 100% (6/6; TR7 target 95%), and overall coverage is 100% (11/11; minimum 80%). Every Epic 2 gate test named in `epics.md:961` is green in the run below.

### TR7 and Epic 2 gate criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 4/4 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 6/6 FULL | ✅ MET |
| BKP-API-001 byte-identical round trip green | `test_restore.py:322` passed | ✅ MET |
| BKP-API-003..005 refusal and fault tests green | `test_restore_refusals.py:219`, `:279`, `:304`, `:461` and the rows below, all passed | ✅ MET |
| Every error code has an API test | The 4 new `ErrorCode` values (`backend/bookvie/intents/contract.py:46-49`): `couldnt_export` `test_export.py:307`, `:392`; `restore_invalid` `test_restore_refusals.py:219`; `restore_newer_version` `test_restore_refusals.py:279`; `restore_unsafe` `test_restore_refusals.py:304`. All four are in the OpenAPI enum (`test_contract.py:291`, `:313`). The 7 Epic 1 codes keep their tests (Epic 1 trace). | ✅ MET |
| `check:api` clean | Passed in the run below | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (319/319), intents+store 97.44% (1178/1209) | ✅ MET |

### Run evidence

The load average was 19.9 on 14 cores, above half the core count, so the run followed `docs/ci.md` → Machine load, with Playwright capped at 4 workers:

| Commit | Command | Result |
|---|---|---|
| `6454384` | `caffeinate -i sh -c 'npm run check:py && npm run check:api && npm run build && (cd frontend && TZ=Europe/Madrid npx playwright test --workers=4) && npm run check:smoke'` | exit 0: pytest 865 passed (98% total coverage); coverage gates ok; 152 frontend unit tests passed; Playwright 187 passed (56.6 s), none flaky or skipped; `smoke: ok` |

No test in the traced files was skipped: the three `skipif(root)` tests ran, since the run was not as root.

---

## Oracle and scope

**Oracle.** As for Epic 1: TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, and the Epic 2 gate names scenario IDs. So the priority-bearing oracle is the scenarios Epic 2 delivers: every BKP row, the export clause of FND-API-006 (left out of the Epic 1 trace for this epic), and the Epic 2 save surface of XUI-E2E-001 (TR9: the restore's `couldnt_save`). The story ACs are mapped one by one in "Story ACs" below; that table does not change the counts.

**Out of scope, and why:**

- FR-22's "Last export on Home" belongs to Epic 3 (`epics.md:251`). BKP-E2E-003 is traced against the Backup page.
- BKP-E2E-001 says "Home matches". Home ships in Epic 3; at this commit the launch page `/` is the Catalog, and that is what is checked.
- BKP-API-006's "one fixture export per released `schemaVersion`" (`test-design-qa.md:370`) starts with v2. Only v1 is released, so the migration test uses a test-local v1→v2 step (`test_restore.py:263`).
- FND-API-006's intent half and the rest of XUI-E2E-001 were traced in Epic 1 or belong to Epics 3-5.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 4              | 4             | 100%       | ✅ PASS |
| P1        | 6              | 6             | 100%       | ✅ PASS |
| P2        | 0              | 0             | 100%       | ✅ N/A |
| P3        | 1              | 1             | 100%       | ✅ PASS |
| **Total** | **11**         | **11**        | **100%**   | **✅ PASS** |

Unique tests mapped: 94 test functions in 13 files, which include every test in the Epic 2 files (`test_export.py`, `test_restore.py`, `test_restore_refusals.py`, `test_restore_unpack_faults.py`, `backup.spec.ts`, `restore.spec.ts`, `restore-refusals.spec.ts`, `frontend/src/api/export.test.ts`). By level: API 61 (7 criteria), e2e 22 (4), unit 11 (1). Parametrized and table-driven tests run many more cases (for example 17 damaged files, 12 hostile archives, 10 apply faults). No mapped test is skipped, fixme or pending. Rejected evidence: none; every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| BKP-API-001 | Export → restore on the rich fixture → byte-identical `library.json` + covers | `test_restore.py:322`; base: FND-UNIT-001 (Epic 1); re-restoring the same export skips every identical cover `test_restore.py:709` | FULL |
| BKP-API-003 | Restore refusals (not zip, truncated, no `library.json`, bad schema, invariant violation, missing/undecodable cover, newer version) → data unchanged | 17 damaged cases in one test, each checked byte for byte against the data folder and its parent `test_restore_refusals.py:219`; newer `:279`, `:711`; a failing migration step `test_restore.py:294`; an entry that can't be unpacked is invalid, not unsafe `test_restore_unpack_faults.py:81`; single cases `test_restore.py:474`, `:519`, `:530`, `:542`, `:552`, `:564` | FULL |
| BKP-API-004 | Malicious archives (`../`, absolute, extra entry, symlink, duplicate name, > 5,000 entries, > 1 GB extracted incl. understated headers) → refused, nothing outside `.staging/` | 12 hostile cases plus understated headers, with a recording filesystem proving no write outside `.staging/` `test_restore_refusals.py:304`; limits allowed at the boundary `:491`; unsafe beats broken or newer `:527`; staging never passes the cap `:562`; over-count stages nothing `:602`; oversized central directory refused before parsing `:625`; garbage still invalid `:654`; body over the cap refused without the lock `:668`; case-only name clash with an existing cover `:690`; inflating past the declared size `:733` | FULL |
| BKP-API-005 | Fault during restore apply → current data intact; `.staging/` emptied at startup | 10 faults (5 steps × cover copy / commit), old library intact and referencing only existing covers `test_restore_refusals.py:461`; unpack and listing faults `:754`, `:774`, `test_restore_unpack_faults.py:125`; failed commit removes new covers `test_restore.py:601`; later cover write fault `:749`; unreadable same-named cover `:780`; undeletable staging leftover `:812`; startup sweep `test_store.py:231`, `test_restore.py:431`, real process `test_cli.py:718`; a losing launch sweeps nothing `test_cli.py:447` | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| FND-API-006 (export clause) | Export sees a consistent snapshot (AD-4) | The zip is built inside one acquisition of the store lock, released before the first header `test_export.py:203`; an unexpected build error releases the lock `:500`; restore holds one lock, and an intent sent during a slow restore waits, then applies to the restored library `test_restore.py:213`, `:674`. The intent half (`test_store.py:629`, `:651`) was traced in Epic 1. | FULL (see note) |
| BKP-API-002 | Export holds only `library.json` + `covers/`; `local-state.json` excluded; timestamp recorded | `test_export.py:203` (exact name list, `local-state.json` and `.staging/` left out, empty `covers/` entry), `:378`, `:431`; recorded only on a complete download, not on abort or HEAD `:258`; record failure still downloads `:409`; served and recorded in any browser `:484`; unreadable record `:539` | FULL |
| BKP-API-006 | Older-version export migrated then applied | `test_restore.py:263` (through `store/migrations/`), `:294` (failing step refused) | FULL |
| BKP-E2E-001 | Flow 8: Restore → confirm → "Restored." → Home matches | `restore.spec.ts:104` (status "Restored.", URL `/`, `h1` focused, shelf shows the restored titles only, `local-state.json` and preferences kept); dialog `:60`, `:77` | FULL (see note) |
| BKP-E2E-002 | Wrong file → exact refusal copy, nothing changed | `restore-refusals.spec.ts:56` (newer, unsafe, not-an-export: exact copy, URL stays, shelf unchanged); `restore.spec.ts:251`; ink and Axe in both themes `restore-refusals.spec.ts:96` | FULL |
| XUI-E2E-001 (restore surface, TR9) | Couldn't save on restore → exact line, nothing changed | routed 503 `couldnt_save` → exact "Couldn't save. Your data wasn't changed." line, shelf unchanged `restore-refusals.spec.ts:56` (lines 82-94) | FULL |

#### P3

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| BKP-E2E-003 | "Last export: N days ago" / "No export yet" | `backup.spec.ts:82`, `:191` ("Last export: today" in a second browser); refresh logic `frontend/src/api/export.test.ts:87`, `:95`, `:102` | FULL |

**FND-API-006 note.** No test runs an intent while an export is being built. Consistency follows from two tested facts: the whole zip is built inside one acquisition of the store lock (`test_export.py:203`, log `lock acquired`, `lock released`, `http.response.start`, one acquisition), and every intent commits under that same lock (`test_store.py:629`). The restore side does have the direct test (`test_restore.py:674`). This is FULL by composition; a direct export test is optional (next action 4).

**BKP-E2E-001 note.** The archive comes from `GET /api/export` through `page.request` (`frontend/e2e/restore.ts:49`), not from pressing **Export all data**, and the target already holds a Book rather than being a fresh folder. That matches Flow 8 as the scenario states it. The stricter "export in the browser → restore into a fresh folder → same shelf" is already deferred (`deferred-work.md:197-198`).

### Coverage heuristics

- **Endpoints:** both Epic 2 routes have API tests: `GET /api/export` (`test_export.py`), `POST /api/intents/restore` (`test_restore.py`, `test_restore_refusals.py`, plus the shared intent-route table `test_intent_routes.py:38`), and the Backup view behind the page (`frontend/src/api/export.test.ts`). Gaps: 0.
- **Auth/authz negative paths:** `/api/export` refuses a request without exactly one `X-Bookvie-Export: 1`, including cross-site, and records nothing (`test_export.py:465`, six cases; `test_guard.py:182`, `:197` path variants). `restore` is in the foreign-caller matrix for every intent route (`test_intent_routes.py:174`). Status: present.
- **Error paths:** 503 `couldnt_export` before any header; 422 for each refusal code; 503 `couldnt_save` for every apply fault; post-commit cleanup faults still succeed and are logged (`test_restore.py:431`). Status: present.
- **UI journeys and states:** not applicable (formal oracle). Busy states ("Exporting…", "Restoring…", fast path never busy, one request on double press), the failed first load and every failure line are pinned (story ACs below).

### Gap analysis

Critical (P0): 0 · High (P1): 0 · Medium (P2): 0 · Low (P3): 0 · Partial: 0 · Unit-only: 0.

---

## Story ACs

Each epics.md AC for stories 2.1-2.3, mapped to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 2.1 · 1 | Backup is the last nav item; page `h1` "Backup" | `backup.spec.ts:65` |
| 2.1 · 2 | Export and Restore cards, button styles, Last export line | `backup.spec.ts:82`, `:167`, `:179`, Axe `:304` |
| 2.1 · 3 | One zip of exactly `library.json` + `covers/`, named `bookvie-export-<YYYY-MM-DD>.zip`; built under the lock into a spooled file | `test_export.py:203`, `:344` (name, 64 KB chunks), `:364`; `backup.spec.ts:191`; `frontend/src/api/export.test.ts:19`, `:25`, `:32`, `:53` |
| 2.1 · 4 | Over ~300 ms: "Exporting…", disabled, 60% opacity, no spinner | `backup.spec.ts:106`, `:140` (one export on double click), `:223` (fast never busy) |
| 2.1 · 5 | Recorded in `local-state.json` only after the last byte; abort and HEAD record nothing; "Last export: today" in every browser | `test_export.py:258`, `:409`, `:484`; `backup.spec.ts:191` |
| 2.1 · 6 | Failure before any header → 503 `couldnt_export`; page line; Last export kept | `test_export.py:307`, `:392`, `:500`; `backup.spec.ts:246`, failed first load `:281`; `export.test.ts:39`-`:71` |
| 2.2 · 1 | Confirm `alertdialog`, copy, Cancel focused | `restore.spec.ts:60`, `:176` |
| 2.2 · 2 | Cancel or Esc changes nothing, focus back on Restore from file… | `restore.spec.ts:77`, `:198` |
| 2.2 · 3 | Staging emptied, unpacked, fully validated, AD-12 order, one lock | `test_restore.py:213`; validation rows of BKP-API-003; the 20 MB cover cap does not apply to restored covers `:580`; a same-named cover with other bytes is kept and logged `:629` |
| 2.2 · 4 | "Restored.", go to `/`, focus `h1`; Last export and preferences kept | `restore.spec.ts:104` |
| 2.2 · 5 | Older `schemaVersion` migrated through the startup chain | `test_restore.py:263`, `:294` |
| 2.2 · 6 | Byte-identical round trip | `test_restore.py:322` |
| 2.2 · 7 | Over ~300 ms: "Restoring…", disabled | `restore.spec.ts:143`, `:213`, `:236` |
| 2.2 · 8 | Startup deletes staging leftovers; staging emptied after every restore | `test_store.py:231`; `test_cli.py:718`; `test_restore.py:348` |
| 2.2 · 9 | No covers → succeeds, missing `covers/` treated as empty | `test_restore.py:387`, `:408` |
| 2.2 · 10 | Post-commit cleanup fault → still success, logged, swept at startup | `test_restore.py:431` (API only; browser half deferred, `deferred-work.md:197`) |
| 2.3 · 1 | Damaged or invalid → 422 `restore_invalid`, exact copy, byte-identical | BKP-API-003 row |
| 2.3 · 2 | Newer → 422 `restore_newer_version`, exact copy, nothing changes | `test_restore_refusals.py:279`, `:711`; `restore-refusals.spec.ts:56` |
| 2.3 · 3 | Hostile → 422 `restore_unsafe`, `restore_invalid`'s copy, nothing outside `.staging/` | BKP-API-004 row; `restore-refusals.spec.ts:56` |
| 2.3 · 4 | Fault copying covers or at commit → 503 `couldnt_save`, old library intact | BKP-API-005 row |
| 2.3 · UI (checklist AC-5) | Every refusal is one ink line under Restore, focus returns | `restore-refusals.spec.ts:56`, `:96` |

**F-T1. ATDD checklists are stale again (low; F-S6 recurring).** The Epic 2 checklists have 105 unticked lines: 2-1 has 31 (none ticked), 2-2 has 38 (10 ticked), 2-3 has 36 (10 ticked). The work they describe shipped: every AC above has a passing test. This trace did not reconcile them line by line, as the Epic 1 trace did. Epic 1 retro item 1 fixed the backlog but set no rule that keeps it from coming back.

---

## Open risks (not coverage gaps)

These don't change the gate. Each is already in `deferred-work.md`.

- **Upload-cap refusal in a real browser (unverified, would be medium; `deferred-work.md:209-210`).** The 422 `restore_unsafe` for a body over the cap is sent before the upload is read. Only `TestClient` proves it (`test_restore_refusals.py:668`). A real browser may show "Couldn't save" instead of the refusal line. The same pattern on the 20 MB cover cap was checked in Chromium and did not reproduce (`deferred-work.md:104`, `cover.spec.ts`), so this is likely fine, but it is not proven for restore.
- **Post-commit cleanup fault in the browser (story 2.2 AC-10, `deferred-work.md:197`).** The API returns success (`test_restore.py:431`), and the UI shows "Restored." on any success (`restore.spec.ts:104`). No e2e injects the fault, because the e2e server has no fault seam.
- **Spine drift (AD-1, AD-4, AD-9, AD-12, AD-14, AD-15; `deferred-work.md:172`, `:188`, `:206`).** These are documentation items, not test gaps.

---

## Next actions

1. **LOW:** decide on F-T1: reconcile the 105 Epic 2 checklist lines (tick with `path:line` or retire), and decide whether dev-story should tick them as it goes so this stops recurring. A good Epic 2 retro topic.
2. **LOW:** settle the upload-cap browser risk with an e2e against the real uvicorn server that lowers the cap and checks the ink line.
3. **LOW:** run `/bmad-testarch-test-review` on the Epic 2 suites.
4. **OPTIONAL:** a direct FND-API-006 export test (an intent racing a slow export build).
5. Run `/bmad-retrospective` for Epic 2; `sprint-status.yaml` still shows `epic-2: in-progress`.

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

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-2-traceability-matrix.md

✅ GATE: PASS - Epic 2 meets TR7
```
