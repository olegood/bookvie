---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-12'
workflowType: 'testarch-trace'
traceTarget: 'epic 7'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (ORG-E2E-001 :276 P2, ORG-E2E-002 :291 P3; the Catalog sort and filter surfaces of XUI-E2E-002 :252 and XUI-E2E-005 :278)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; Epic 7 gate "per-epic quality gates (TR7)"; stories 7.1-7.2 :1999-2060)'
  - '_bmad-output/implementation-artifacts/epic-7-retro-2026-11-12.md (action 58)'
  - '_bmad-output/test-artifacts/atdd-checklist-7-1 and 7-2 (story ACs; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '13f9ebe'
---

# Traceability Matrix & Gate Decision: Epic 7, Organize the catalog

**Target:** Epic 7, stories 7.1-7.2 (gate type: epic). This is Epic 7 retro action 58 (`epic-7-retro-2026-11-12.md`).
**Date:** 2026-11-12
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `13f9ebe` plus this trace's one test addition (below). That commit is the last story commit `b45cae8` plus the retro (`15f3dc9`) and the spine reconciliation (`13f9ebe`, item 57), both docs only. This trace changed no product code.
**Gate thresholds:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%. TR7 also requires an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`. The Epic 7 gate is TR7 alone (`epics.md`, Epic 7 **Gate**).
**Machine-readable:** `epic-7-e2e-trace-summary.json` and `epic-7-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file. (The retro's live behavior check is recorded in `epic-7-retro-2026-11-12.md`, not as a live results file, so it isn't counted here.)

### Test this trace added

Mapping XUI-E2E-002 ("intent in A visible in B after focus; refusals also invalidate") to the Epic 7 surfaces turned up one gap. The catalog view's focus refetch was proven in Epic 1, but Epic 7 adds client state on top of it: the filters must re-apply to the view's fresh data, and a checked Language or Tag value that no Book has any more must stop counting (`liveFilters`; epic context "sort and filter must be re-applied to fresh data, not stored as a derived copy"). No test brought a real intent from another context to a filtered Catalog: `liveFilters` was unit-tested only (`catalogFilter.test.ts:115`), and the 7.2 review rejected a stale-value e2e as costly (`spec-7-2…md`, Review Triage Log).

The trace closed it the way the Epic 5 and 6 traces did:

- **`catalog-filter.spec.ts:802`**, `[P1] XUI-E2E-002 Books deleted in another context leave the filtered shelf once Catalog regains focus, and a checked value no Book has any more stops counting`. Catalog has English and Polish checked: Bleak House, Dubliners, Emma, Flights. A second browser context deletes Emma and Flights (the only Polish Book) through `delete-book`. The first context regains focus: the shelf reads Bleak House, Dubliners; the chip reads "Language: 1"; the list offers English, French, German with English still checked; Clear filters stays; the `alert` region is empty.
- **Mutation checks**, each with the SPA rebuilt:
  - `CatalogPage.tsx` using the raw filters instead of `liveFilters`: fails on "Language: 1" (received "Language: 2").
  - `refetchOnWindowFocus: false` on the catalog view's query (`frontend/src/api/views.ts`): fails on the shelf (Emma and Flights still shown).
  - Both pass again with the code restored and the SPA rebuilt.
- **Burn-in:** 10 of 10 passed (`--repeat-each=10 --retries=0`).

---

## Gate Decision: PASS

**Rationale:**
- No `test-design-qa.md` scenario that Epic 7 delivers is P0, so P0 coverage is 100% of 0 (n/a). Every story-level `[P0]` test (`catalog-sort.spec.ts:106`, `catalog-filter.spec.ts:276`) is green and mapped below.
- P1 coverage is 100% (1/1), against the TR7 target of 95%.
- Overall coverage is 100% (4/4), against the minimum of 80%.
- Every error code has an API test. Epic 7 added no error code, no intent and no refusal.
- `check:api` is clean and the coverage gates hold.

### TR7 criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | No P0 scenario in Epic 7's share of `test-design-qa.md` (matrix below) | ✅ MET (n/a) |
| P1 ≥ 95% | 1/1 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below | ✅ MET |
| `check:api` clean | contract, Prettier, `tsc -b`, oxlint; 341 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (408/408 lines), intents+store 98.06% (1619/1651) | ✅ MET |

### Run evidence

**Commit:** `13f9ebe`, with this trace's test addition in the working tree (`catalog-filter.spec.ts`).

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0, on the first run.

| Check | Outcome |
|---|---|
| pytest | 1392 passed |
| Coverage gates | domain 100.00% (408/408), intents+store 98.06% (1619/1651): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint; 341 passed, 0 failed |
| Playwright | 597 passed (1.8 m), none flaky, retried or skipped. That is the retro's 596 plus this trace's test |
| Smoke | isolated install served `/` and a deep link: ok |

---

## Oracle and scope

**Oracle.** The oracle is the same as for Epics 1-6. TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, so the priority-bearing oracle is the set of scenarios Epic 7 delivers:

- ORG-E2E-001 (P2): sort keys reorder the bookcase; filter chips hide; no-match and Clear filters;
- ORG-E2E-002 (P3): the Main book's cover or placeholder on Home. It carries the ORG prefix but is FR-21, built in story 3.1. No earlier trace mapped it (the Epic 1-6 matrices never name it), so it is traced here under its prefix rather than left untraced;
- the Catalog sort and filter surfaces of the shared XUI rows:
  - XUI-E2E-002 (two contexts);
  - XUI-E2E-005 (empty states).

The story ACs are mapped one by one in "Story ACs" below. That table does not change the counts.

**Out of scope, and why:**

- **XUI-E2E-001 and XUI-E2E-003** (couldn't save, no optimistic UI) need an intent. Epic 7 added none: it adds three `ShelfBook` fields and client presentation only.
- **XUI-E2E-004** (tone) has no epic owner. Epic 7's copy is pinned by its exact strings ("N books match.", "No books match these filters.").
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (Epic 4 retro, `deferred-work.md:419`; Epic 7 retro action 59). `catalog-filter.spec.ts:471` and `:582` model a macOS Safari click in Chromium; real WebKit was not run.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 0              | 0             | n/a        | n/a |
| P1        | 1              | 1             | 100%       | ✅ PASS |
| P2        | 2              | 2             | 100%       | ✅ PASS |
| P3        | 1              | 1             | 100%       | ✅ PASS |
| **Total** | **4**          | **4**         | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 7 files, plus the Epic 3 Home cover tests for ORG-E2E-002:

- **Backend:** `test_bookcase_view.py` (`test_story_7_2_catalog_books_carry_type_language_and_tags`) and `test_views.py` (`test_seeded_library`, whose home and catalog payloads gained the three fields).
- **Unit (frontend):** `frontend/src/lib/catalogSort.test.ts`, `catalogFilter.test.ts`, and the `sortBooks` block of `catalog.test.ts`.
- **e2e:** `catalog-sort` and `catalog-filter`, plus the Epic 7 edits to `home-slice`, `catalog-empty`, `bookcase-details` and `spine-popover`.

**By level:** the 7 Epic 7 files hold 72 tests.

| Level | Tests (Epic 7 files) | Criteria covered |
|---|---|---|
| e2e | 37 (`catalog-sort`: 12; `catalog-filter`: 25, including this trace's) | 4 |
| API | 2 (1 new test; 1 parametrized test extended) | 1 |
| Unit | 33 (`catalogSort.test.ts`: 5; `catalogFilter.test.ts`: 16; `catalog.test.ts` `sortBooks`: 12) | 1 |

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full.

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| XUI-E2E-002 (Catalog sort and filter surfaces) | Two contexts: an intent in A shows in B after focus | Books deleted in another context leave the filtered shelf on focus, and a checked value no Book has stops counting `catalog-filter.spec.ts:802` (this trace). The sort follows a refetch through the same sorted array: an add under Date added lands first `catalog-sort.spec.ts:354`; Home's slice follows a sort chosen moments ago with no reload `:207`. Unit: `liveFilters` drops stale keys `catalogFilter.test.ts:119`, `:125` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| ORG-E2E-001 | Sort keys reorder the bookcase; filter chips hide; no-match + Clear filters | Sort: the select and its options `catalog-sort.spec.ts:84`; each key reorders spines and List rows, with the tie-breaks and the keyboard order `:106`; remembered and used by Home `:140`, `:243`; junk or throwing storage `:174`, `:184`, `:277`; search kept `:160`, `:314`. Filters: the chips and their selected styling `catalog-filter.spec.ts:218`; the Language and Tag lists `:259`, `:655`; OR within, AND across and with search, hidden not dimmed, both views, "N books match." `:276`, `:630`; Clear filters `:308`, `:604`; no match `:340`, `:437`, `:507`; focus `:363`, `:548`, `:582`; scope `:385`, `:677`, `:705`; an add clears them `:412`, `:729`, `:752`; the lists close on Esc, Tab and an outside click `:453`, `:471`, `:493`, `:527`; axe in both themes `:773`. Unit: `catalog.test.ts:31`-`:167`, `catalogFilter.test.ts:35`-`:130`, `catalogSort.test.ts:15`-`:48`. API: the fields the filters read `test_bookcase_view.py` `test_story_7_2_…`, `test_views.py` `test_seeded_library` | FULL |
| XUI-E2E-005 (Catalog sort and filter surfaces) | Empty states | An empty library shows no Sort select and no chip `catalog-empty.spec.ts:84`, `:88`; filters matching nothing show "No books match these filters." with Clear filters in the bookcase `catalog-filter.spec.ts:340` and the List `:507`; a search that alone matches nothing keeps its own line while a filter is on `:437`; filters hiding every spine `:548`, `:582` | FULL |

#### P3

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| ORG-E2E-002 | Main book cover or placeholder on Home | The Main book card shows the cover `home.spec.ts:155`; without a cover, the no-cover placeholder, not focusable `:326` (story 3.1) | FULL |

### Error codes

TR7 requires an API test for every error code. `ErrorCode` (`backend/bookvie/intents/contract.py`) still has 18 values: Epic 7 added none, and no new intent, view or refusal. Its only server change copies three stored fields into `ShelfBook` (`views/shelf.py:73-75`). The 18 codes were confirmed in the Epic 1-6 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to ORG-E2E-001 or ORG-E2E-002. XUI-E2E-002 is R-11 (stale views across tabs), closed by the Epic 4 gate; this trace's test extends its evidence to the filtered Catalog. Epic 7 closes no risk and opens none.

### Coverage heuristics

- **Endpoints.** Epic 7 added no route. The catalog and home views' new `type`, `language` and `tags` are asserted in `test_bookcase_view.py` and `test_views.py`, and the generated types are checked by `check:api`. Gaps: 0.
- **Auth/authz negative paths.** No new route or intent. Status: not applicable.
- **Error paths.** No new refusal. The client's storage faults are pinned (`catalog-sort.spec.ts:184`, `:277`; `catalogSort.test.ts:39`). Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The empty, no-match, refetch and focus states are pinned (story ACs below).

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

This table maps each epics.md AC for stories 7.1-7.2 to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 7.1 · 1 | A native `select` labeled "Sort": Author (default), Title, Date added, Pages | `catalog-sort.spec.ts:84`; `catalogSort.test.ts:16` |
| 7.1 · 2 | Each key's order and the tie-breaks; spines and List rows reorder; the keyboard follows | `catalog-sort.spec.ts:106`, `:288`; `catalog.test.ts:31`-`:167` |
| 7.1 · 3 | Remembered in `localStorage` (try/catch, default Author); Home's slice uses the same order | `catalog-sort.spec.ts:140`, `:174`, `:184`, `:207`, `:243`, `:277`; `catalogSort.test.ts:23`-`:48` |
| 7.1 · 4 | Search titles still applies after a sort change | `catalog-sort.spec.ts:160`, `:314` |
| 7.2 · 1 | Chips in labeled groups, `aria-pressed`, accent-soft fill, 2px accent border, check glyph | `catalog-filter.spec.ts:218`, `:773` |
| 7.2 · 2 | Language ▾ and Tag ▾ list the library's values alphabetically; "Language: 2" | `catalog-filter.spec.ts:259`, `:655`, `:453`, `:471`, `:493`, `:527`; `catalogFilter.test.ts:76`, `:84` |
| 7.2 · 3 | OR within, AND across and with Search titles; hidden not dimmed; "N books match." | `catalog-filter.spec.ts:276`, `:630`; `catalogFilter.test.ts:43`-`:70` |
| 7.2 · 4 | "Clear filters" at the row's end turns every filter off | `catalog-filter.spec.ts:308`, `:604` |
| 7.2 · 5 | Nothing matches: "No books match these filters." with "Clear filters" | `catalog-filter.spec.ts:340`, `:437`, `:507` |
| 7.2 · 6 | The focused spine filtered out: focus to its nearest neighbor in sort order, or to Search titles | `catalog-filter.spec.ts:363`, `:548`, `:582` |
| Epic context | Filters reset on leaving; never on Home's slice or the meter; an add clears them; re-applied to fresh data | `catalog-filter.spec.ts:385`, `:677`, `:705`, `:412`, `:729`, `:752`, `:802` |

### ATDD checklists

Each checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-7-1-sort-my-catalog.md` | 0 | 0 | |
| `atdd-checklist-7-2-filter-my-catalog.md` | 0 | 0 | |

Every line was ticked or retired by the stories' automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro or `deferred-work.md`.

- **E7-R1, a blank or padded Language or Tag value gives an unnamed or duplicated checkbox** (low). Retro action 60. It needs a restored or hand-edited file; the add and edit intents refuse such values.
- **Safari-specific closing behavior is unverified in WebKit** (low). Out of scope by the browser decision; retro action 59 writes that down.
- **Identical spine names for two editions** (low, Story 1.10). Recorded in `deferred-work.md` by the retro.
- **The view-model docstrings never reach the OpenAPI** (low). In `deferred-work.md` (6.4's code review); Epic 7's three `ShelfBook` fields add three more.
- **Flaky specs.** None in Epic 7. This trace's run and the retro's run (596 passed) both had no flaky, retried or failed test, and the session logs show none during the stories (retro PL-4).

---

## Next actions

1. Retro actions 59 (write down the browser decision) and 60 (blank Language and Tag values).
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 7 suites. `catalog-filter.spec.ts` is now 843 lines, under the 1000-line limit in `test-quality.md` but the largest Epic 7 file.
3. Sprint item `epic-7-retro-item-58-…` is marked done with this trace.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: n/a, no P0 scenario (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
No Epic 7 scenario is P0, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). Epic 7 added no error code; every existing code keeps its API test. check:api is clean and the coverage gates hold. This trace added one e2e test (catalog-filter.spec.ts:802) for XUI-E2E-002 on the filtered Catalog.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-7-traceability-matrix.md

✅ GATE: PASS - Epic 7 meets TR7
```
