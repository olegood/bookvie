---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-16'
workflowType: 'testarch-trace'
traceTarget: 'epic 10'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :167; Epic 10 gate "per-epic quality gates (TR7), and the existing catalog and home-slice e2e specs pass unchanged with the toggle not pressed" :2335; Story 10.1 :2337-2389)'
  - '_bmad-output/test-artifacts/test-design-qa.md (ORG-E2E-001 :276, the Catalog sort surface; it has no FR-20 reversal scenario of its own)'
  - '_bmad-output/implementation-artifacts/epic-10-retro-2026-11-16.md (action 69)'
  - '_bmad-output/test-artifacts/atdd-checklist-10-1-reverse-the-catalog-order.md (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '21c056d'
---

# Traceability Matrix & Gate Decision: Epic 10, Reverse the catalog order

**Target:** Epic 10, Story 10.1 (gate type: epic). This is Epic 10 retro action 69 (`epic-10-retro-2026-11-16.md`).
**Date:** 2026-11-16
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `21c056d`.
- That commit is the last story commit `34cd03a` plus the retro (`21c056d`, docs only).
- This trace changed no product code and added no test.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:167`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 10 gate:** TR7, plus "the existing catalog and home-slice e2e specs pass unchanged with the toggle not pressed" (`epics.md:2335`).

**Machine-readable:** `epic-10-e2e-trace-summary.json` and `epic-10-gate-decision.json`, both in this folder.

**Live verification results:** none on file. The retro's hand run (seven observed steps, all as specified) is recorded in `epic-10-retro-2026-11-16.md`, "Behavior verification", not as a live results file, so it isn't counted here.

**Waiver register:** none on file.

**Tests added by this trace:** none. Every item is FULL on the existing tests (matrix below). The one test gap the retro found, a unit leaf for Date added reversed with a `createdAt` tie, is below the oracle's grain (AC-4 names Author and Title ties, and both are pinned) and is already retro action 70, owned by dev.

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (3/3).
- P1 coverage is 100% (6/6), against the TR7 target of 95%.
- Overall coverage is 100% (10/10), against the minimum of 80%.
- The existing catalog and home-slice e2e specs pass with the toggle not pressed (Epic 10 gate), with only the declared UX-DR64 Tab-stop exception.
- Every error code has an API test. Epic 10 added no error code and changed no backend file.
- `check:api` is clean and the coverage gates hold.

### TR7 criteria and the Epic 10 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 3/3 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 6/6 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below | ✅ MET |
| `check:api` clean | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 10); 368 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) | ✅ MET |
| Existing catalog and home-slice e2e specs pass unchanged with the toggle not pressed (Epic 10 gate) | `git diff a725453^..HEAD` touches none of `home-slice.spec.ts`, `catalog-list.spec.ts`, `catalog-tiles*.spec.ts`, `catalog-tile-marks*.spec.ts`, `catalog-typeset-covers*.spec.ts`, `catalog-empty.spec.ts`, `catalog-pace-calculator.spec.ts`, `bookcase.spec.ts`, `spine-popover.spec.ts`. It touches three older specs: `catalog-sort.spec.ts` (`:98-104`) and `bookcase-details.spec.ts` (`:72-86`) gain the toggle's Tab stop between Sort and Bookcase, which UX-DR64 requires and the spec names as the known exception; `catalog-filter.spec.ts:29-36` gains `bookvie.catalogSortReversed` in its `APP_STORAGE_KEYS` list. No older assertion was loosened or removed. None of these specs presses the toggle or stores the reversal, and each Playwright context starts with empty storage, so they run in the natural direction. All green in the run below. | ✅ MET |

### Run evidence

**Commit:** `21c056d`, clean working tree.

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0 (npm's own status, written to the log after the run), on the first run.

| Check | Outcome |
|---|---|
| pytest | 1573 passed |
| Coverage gates | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) |
| `check:api` | contract up to date, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 10); 368 passed, 0 failed |
| Playwright | 724 passed (2.3 m), none flaky, retried or skipped. That is the same count as the retro's run: this trace added no test. |
| Smoke | isolated install served `/` and a deep link: ok |

---

## Oracle and scope

**Oracle.** TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios. That document predates Epic 10: its only sort scenario is ORG-E2E-001 (P2, "Sort keys reorder bookcase; filter chips hide; no-match + Clear filters"), and it has no reversal scenario. So the priority-bearing oracle is:

- each Story 10.1 AC from `epics.md`, at the priority of the ATDD test that owns it (the `[P0]`…`[P3]` marker in the test title and the ATDD checklist): 9 ACs;
- ORG-E2E-001 (P2) on the reversed Catalog: the reversal reorders the bookcase, and the filter chips and search keep working.

That makes 10 items. An AC's priority is the highest marker among its tests, so AC-6 and AC-8 are P1 though some of their automate leaves are P2, and AC-9 is P1 because its axe leaf is P1.

**Out of scope, and why:**

- **XUI-E2E-001 and XUI-E2E-003** (couldn't save; no optimistic UI under a delayed response). The toggle sends no request: the reversal lives in `localStorage` only, and the automate leaf at `catalog-sort-direction-automate.spec.ts:77` pins that no request carries it. The only failure path is storage that throws, which AC-7 owns.
- **XUI-E2E-002** (two contexts). Epic 10 adds no view and no intent. A second tab reads the stored reversal on its next load. The one two-tab effect, a press in a stale tab writing its own key back, is retro finding E10-B3 (accepted, low) and is listed under Open risks.
- **XUI-E2E-004** (tone) has no epic owner. Epic 10's copy is pinned by its exact strings ("A–Z", "Z–A", "Newest first", "Oldest first", "Fewest first", "Most first").
- **XUI-E2E-005** (empty states). Epic 10 adds no empty state; AC-2 pins that an empty Catalog shows neither the select nor the toggle.
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser").

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 3              | 3             | 100%       | ✅ PASS |
| P1        | 6              | 6             | 100%       | ✅ PASS |
| P2        | 1              | 1             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **10**         | **10**        | **100%**   | **✅ PASS** |

**Tests mapped:** every Epic 10 test, plus the Epic 10 edits to three older specs.

- **Backend:** none. Epic 10 changed no backend code, route or intent.
- **Unit (frontend):** the Epic 10 cases in `lib/catalog.test.ts` (`:161`, `:168`, `:174`) and `lib/catalogSort.test.ts` (the "catalog sort direction" block, `:70` to `:115`, 6 cases).
- **e2e (the two Epic 10 specs):** `catalog-sort-direction.spec.ts` (10 tests) and `catalog-sort-direction-automate.spec.ts` (10 tests). Their helper module is `sort-direction.ts`.
- **e2e (Epic 10 edits to older specs):** `catalog-sort.spec.ts:98-104` and `bookcase-details.spec.ts:72-86` (the toggle's Tab stop), `catalog-filter.spec.ts:29-36` (`APP_STORAGE_KEYS`).

**By level:** the Epic 10 test cases number 29.

| Level | Tests (Epic 10) | Criteria covered |
|---|---|---|
| e2e | 20 (`catalog-sort-direction`: 10; `catalog-sort-direction-automate`: 10) | 10 |
| API | 0 | 0 |
| Unit | 9 (`catalog.test.ts`: 3; `catalogSort.test.ts`: 6) | 4 (AC-3, AC-4, AC-6, AC-7) |

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `frontend/e2e/` unless shown in full. `atdd` = `catalog-sort-direction.spec.ts`, `auto` = `catalog-sort-direction-automate.spec.ts`.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 10.1 · AC-1 | With only `bookvie.catalogSort = "dateAdded"` stored, newest first and "↑ Newest first"; with nothing stored, Author A–Z and "↑ A–Z" (AR28) | `atdd:60` (both cases: order, accessible name, text with the arrow, checked option, stored key unchanged) | FULL |
| 10.1 · AC-3 | For each of the four keys a press (click, Enter or Space) reverses the bookcase, the list and the tiles; the text and arrow change; a second press restores; the controls to its right don't move | `atdd:145` (all four keys with click, Enter and Space; exact reversed order with the id tie that a plain array reverse would get wrong; text and arrow; the Bookcase button's box unchanged; List rows and Tiles reversed); `auto:227` (List press keeps focus); `auto:193` (search and chips kept across a press); unit `catalog.test.ts:161`, `:168` | FULL |
| 10.1 · AC-5 | Choosing another key while reversed gives its natural order and label, and stores not reversed, so a reload stays natural | `atdd:238` (Author Z–A → Pages: "↑ Fewest first", fewest first, reversal key gone, key `pages`, still natural after a reload; then Author reversed → Title resets again) | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 10.1 · AC-2 | One compound field: same height and border, the shared edge drawn once, `surface-inset`, `ink-secondary` arrow then `body-sm`/`ink` text, min width of the key's wider label; an empty Catalog shows neither | `atdd:84` (42px, same top, adjoining within 0.5px, no left border, select right border, three solid `input-border` sides, `--text-field-border` pinned at 1.5px on both halves, corners, arrow color and position, text color and 14px, empty Catalog); `auto:247` (width kept on a press for Author, Title and Date added, 12px padding, 4px arrow gap); `atdd:145` (Pages width kept) | FULL |
| 10.1 · AC-4 | Reversed, ties keep title A–Z, then the earlier-added Book first; only the key's own order flips (AR28) | `atdd:218` (Author Z–A with same-author ties in title A–Z; Title Z–A with same-title ties earlier-added first); unit `catalog.test.ts:174` (Author and Pages title ties, `createdAt` ties under Author, Title and Pages, id ties under all four keys) | FULL |
| 10.1 · AC-6 | The reversal survives a reload and Home's slice packs its rows in the reversed order before choosing them; `bookvie.catalogSortReversed` holds it, `bookvie.catalogSort` keeps its format, and neither is exported or touched by a restore | `atdd:270` (180 Books, Pages reversed survives a reload, both stored values, Home's slice equal to the reversed packing and different from the natural one, via the nav and a fresh load); `atdd:319` (a reversal made with nothing stored survives a reload); `auto:134` (one-row slice, fresh load and in-app press); `auto:77` (never in a request or the export; a restore keeps both the reversed and the natural value); unit `catalogSort.test.ts:82`, `:115` | FULL |
| 10.1 · AC-7 | Throwing storage, a junk reversal, or a key that isn't one of the four opens the key's natural direction (Author for a bad key) and the Catalog still sorts; a failed write still reverses for this visit, with no message | `atdd:338` (`yes`, empty, JSON and `1` read natural; `shelves` with `true` reads Author A–Z; throwing get/set/remove: Author A–Z, a press reverses, `alert` and `status` empty, no page error); `auto:165` (Home falls back to Author A–Z with throwing storage); unit `catalogSort.test.ts:89`, `:98`, `:105` | FULL |
| 10.1 · AC-8 | A plain `button` with no `aria-pressed`, named by its visible text with the arrow `aria-hidden`, in a `role="group"` labelled by "Sort"; the next Tab stop after the select; focus kept on a press; `status` silent; the bookcase arrow keys follow the reversed order (UX-DR64) | `atdd:400` (tag, `type`, no `aria-pressed`/`aria-label`/`aria-labelledby`, `aria-hidden` arrow, the group's label, Tab and Shift+Tab, Enter and Space keep focus, no status text, arrows Home and End in the reversed order); `auto:321` (Tab stop kept across a press); `auto:284` (a new Book under Date added reversed is last, focused, in view and ringed); `catalog-sort.spec.ts:103`, `bookcase-details.spec.ts:86` (the Tab stop in the older specs) | FULL |
| 10.1 · AC-9 | Focused half drawn above the other, no hover change; light, dark and forced colors (`ButtonFace`/`ButtonText`, shared edge visible) | `atdd:459` (`raisedHalf` for each focused half, accent edge, 2px accent ring at 2px offset, no hover change, dark twins, forced colors on background, text, three borders and arrow, the shared edge solid and not transparent); `auto:377` (dark focus: select border and halo, the toggle's ring); `auto:350` (axe, natural and reversed, both themes) | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| ORG-E2E-001 (reversed Catalog) | Sort keys reorder the bookcase; filter chips hide; no-match and Clear filters | `atdd:145` (every key reversed, bookcase, List and Tiles); `auto:193` (search and the chips narrow the reversed shelf in the reversed order, and a press keeps the search text and the chips); the natural-direction filter surfaces stay pinned by `catalog-filter.spec.ts`, unchanged except `APP_STORAGE_KEYS` | FULL |

### Error codes

TR7 requires an API test for every error code.

- `ErrorCode` (`backend/bookvie/intents/contract.py:38`) is unchanged. Epic 10 added no code, intent, route or refusal, and changed no backend file (`git diff a725453^..HEAD -- backend/` is empty).
- The codes were confirmed in the Epic 1-9 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to ORG-E2E-001 or to the reversal. Epic 10 closes no risk and opens none.

### Coverage heuristics

- **Endpoints.** Epic 10 added no route. Gaps: 0.
- **Auth/authz negative paths.** No new route or intent. Status: not applicable.
- **Error paths.** The reversal's only failure source is storage: junk values, a bad key, and throwing get, set and remove are pinned (`atdd:338`, `auto:165`; unit `catalogSort.test.ts:89`, `:98`, `:105`). Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The empty Catalog, the focus, hover, dark and forced-colors states are pinned (matrix above).

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

## ATDD checklists

The checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-10-1-reverse-the-catalog-order.md` | 0 | 0 | |

Every line was ticked by the story's automate run (`34cd03a`). No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro, the 10.1 spec or `deferred-work.md`.

- **No unit leaf for a `createdAt` tie under Date added reversed** (low, retro E10-B2). AC-4's Author and Title ties are pinned; this is a finer-grained guard. Retro action 70.
- **A press in a stale second tab writes that tab's key back** (low, retro E10-B3, accepted).
- **Under forced colors the select's three outer borders may differ in color from the toggle's `ButtonText`** (low, cosmetic, 10.1 review rejected). AC-9 pins the shared edge.
- **Two spine drift entries** (AD-6 and the Seed and map row; AD-15) are open in `deferred-work.md:1023` and `:1029`. Retro action 72.
- **Flaky specs.** None in this trace's run or the retro's (724 passed in both).

---

## Next actions

1. Retro actions 70 to 73, all due before Epic 11.
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 10 suites. `catalog-sort-direction.spec.ts` (about 520 lines) is the larger, under the 1000-line limit in `test-quality.md`.
3. Sprint item `epic-10-retro-item-69-run-the-epic-10-trace-and-gate` is marked done with this trace.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (3/3) (Required: 100%) → MET
- P1 Coverage: 100% (6/6) (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (10/10) (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). The existing catalog and home-slice e2e specs pass with the toggle not pressed, with only the declared UX-DR64 Tab-stop edits. Epic 10 added no error code; every existing code keeps its API test. check:api is clean and the coverage gates hold.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-10-traceability-matrix.md

✅ GATE: PASS - Epic 10 meets TR7 and its gate
```
