---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-10-30'
workflowType: 'testarch-trace'
traceTarget: 'story 1.9'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.9; Conventions for every story → TR8)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md'
  - '_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design-qa.md (R-08; CAT-UNIT-001/002, CAT-API-009, CAT-E2E-003)'
  - '_bmad-output/test-artifacts/automation-summary.md'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md#story-19-get-warned-about-duplicates'
  - '_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md'
  - '_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md'
  - '_bmad-output/test-artifacts/test-design-qa.md'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: '40c734188535753ac4b58187067f9d8c9ef7ce7f'
tempCoverageMatrixPath: '/private/tmp/claude-501/-Users-Oleg-Anastassov-github-bookvie/c73a334d-bffb-43dc-841d-ff9273ca7812/scratchpad/tea-trace-coverage-matrix-2026-10-30T18-42-50-013440Z.json'
---

# Traceability Matrix & Gate Decision - Story 1.9: Get warned about duplicates

**Target:** Story 1.9: Get warned about duplicates (gate type: story)
**Date:** 2026-10-30
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `40c7341` (`40c734188535753ac4b58187067f9d8c9ef7ce7f`)
**Coverage Oracle:** acceptance_criteria (AC-1 … AC-9, numbered in the ATDD checklist from epics.md → Story 1.9)
**Oracle Confidence:** high — formal, story-level Given/When/Then criteria, with the priorities set in the ATDD checklist against R-08 and R-05
**Oracle Sources:** epics.md (Story 1.9), atdd-checklist-1-9, spec-1-9, test-design-qa.md
**External pointers:** not used · **Live verification results:** none on file · **Waiver register:** none on file

---

Note: This workflow does not generate tests. If gaps exist, run `/bmad-testarch-atdd` or `/bmad-testarch-automate` to create coverage.

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status  |
| --------- | -------------- | ------------- | ---------- | ------- |
| P0        | 8              | 8             | 100%       | ✅ PASS |
| P1        | 1              | 1             | 100%       | ✅ PASS |
| P2        | 0              | 0             | 100%       | ✅ N/A  |
| P3        | 0              | 0             | 100%       | ✅ N/A  |
| **Total** | **9**          | **9**         | **100%**   | **✅ PASS** |

**Legend:** ✅ PASS (meets the bar) · ⚠️ WARN (below target) · ❌ FAIL (below minimum)

---

### Detailed Mapping

Levels: **UNIT** = pure `domain/` / contract functions (pytest) and `node --test` units; **API** = `TestClient` against `create_app` with a real `Store` on `tmp_path`; **E2E** = Playwright against a real seeded `bookvie`.

#### AC-1: ISBN, title and author matching rules (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:71` — UNIT — ISBN-10→13 ("0-441-17271-7" ≡ "9780441172719"), hyphens, spaces, `X`/`x` check digit; titles by case and whitespace runs ("Dune" ≠ "Dune Messiah"); authors need one shared name, no reordering, empty list never matches
  - `backend/tests/test_duplicate_book.py:338` — UNIT — a 979 ISBN never equals a 978 / converted ISBN-10 with the same stem
  - `backend/tests/test_duplicate_book.py:348` — UNIT — tabs/newlines count as whitespace; non-ASCII case folding; NFD ≡ NFC; inner whitespace in author names
  - `backend/tests/test_duplicate_book.py:359` — UNIT — typographic quotes/dashes and NFKC forms fold; folding never merges different words
  - `backend/tests/test_duplicate_book.py:309` — UNIT — title alone or shared author alone is not a duplicate (`find_duplicates`)
  - `backend/tests/test_duplicate_book.py:411` — API — repeated author names count as one name; an unshared repeated name stays unshared
  - `backend/tests/test_duplicate_book.py:131` — API — the semicolon-separated string "Brian Attebery; ursula k. le guin " matches as a set
- **Why FULL:** every clause (hyphens, spaces, 10→13, case, extra whitespace, `;`-separated set, ≥1 shared name) is asserted, plus the negative cases.

#### AC-2: Same normalized ISBN → 409 `duplicate_book` listing matches, nothing saved (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:101` — API — exact body (`kind`, `code`, one-match `message`, `duplicates` with `title`/`authors`/`isbn`), the non-matching Book not listed, no `fields`, `library.json` byte-identical
  - `backend/tests/test_duplicate_book.py:240` — API — 2, 3, 4 matches: all listed in catalog order, message names three then "and N more"
  - `backend/tests/test_duplicate_book.py:378` — API — 10 matches all listed, message "…, and 7 more."
  - `backend/tests/test_duplicate_book.py:396` — API — a Book matching on both rules is listed once
  - `backend/tests/test_duplicate_book.py:269` — API — `isbn: null` kept on the wire
  - `backend/tests/test_duplicate_book.py:257` — UNIT — multi-author wording joins names with "; "
  - `frontend/src/api/envelope.test.ts:53` — UNIT — client reads the `duplicates` list, `isbn: null` included

#### AC-3: No ISBN on one side → title + shared author refuses; different ISBNs never match (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:131` — API — neither has an ISBN → 409; only existing has → 409; only new has → 409; both differ → 200 and saved
  - `backend/tests/test_duplicate_book.py:309` — UNIT — title alone / author alone don't match
  - `backend/tests/test_duplicate_book.py:396` — API — overlap of both rules, listed once
  - `frontend/e2e/duplicate-dialog.spec.ts:372` — E2E — after Don't add, editing the ISBN to another edition saves with no dialog (the different-ISBN rule seen from the panel)

#### AC-4: Resend with `confirmDuplicate: true` saves as normal (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:155` — API — 200, two *Dune*s stored, sent pages saved, no `confirmDuplicate` key stored, `check_invariants()` holds
  - `backend/tests/test_duplicate_book.py:296` — API — `confirmDuplicate: false` still checks; `true` with no match saves normally
  - `backend/tests/test_duplicate_book.py:281` — API — `"true"`, `null`, `1` are malformed intents (422 on `intent`), nothing saved
  - `frontend/src/api/books.test.ts:30` — UNIT — client adds the flag only when asked, after the form keys

#### AC-5: Invalid and matching → 422 `invalid_fields`; validation runs first (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:173` — API — empty Pages + matching ISBN → 422 `invalid_fields` naming only Pages, no `duplicates`, nothing saved; same payload made valid → 409

#### AC-6: "Possible duplicate" alertdialog over an inert panel (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `frontend/e2e/duplicate-dialog.spec.ts:78` — E2E — role/name, exact client-rendered description with three named matches and ", and 2 more.", `:modal`, panel visible but Title can't take focus, Tab stays inside, buttons exactly Don't add / Add anyway, no Open existing, ink heading, no `svg`/`img`, nothing saved
  - `frontend/e2e/duplicate-dialog.spec.ts:203` — E2E — Esc acts as Don't add; live regions sit inside the dialog while open and return to the panel after; ISBN suffix hidden when the match has none
  - `frontend/e2e/duplicate-dialog.spec.ts:284` — E2E ×2 — description wording for two matches + multi-author ("; "), and for four matches (", and 1 more.")
  - `frontend/e2e/duplicate-dialog.spec.ts:404` — E2E — Tab and Shift+Tab wrap in both directions
  - `frontend/e2e/duplicate-dialog.spec.ts:429` — E2E — axe clean (WCAG 2.2 AA tags) in light and dark; dark-theme ink
  - `frontend/src/lib/announce.test.ts:131`, `frontend/src/lib/announce.test.ts:148` — UNIT — region stack follows the topmost modal and releases by owner
  - `frontend/src/api/envelope.test.ts:87` — UNIT — a malformed `duplicates` reads as `couldnt_save`

#### AC-7: Don't add (default focus) closes, saves nothing, keeps fields, focuses Title (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `frontend/e2e/duplicate-dialog.spec.ts:141` — E2E — focus on open is Don't add; Enter closes; panel open with Title focused; all eight typed values and Type kept; no alert while open; status/alert empty; server holds only the seeded Books
  - `frontend/e2e/duplicate-dialog.spec.ts:203` — E2E — Esc path, same outcome
  - `frontend/e2e/duplicate-dialog.spec.ts:232` — E2E — the refusal clears field errors from an earlier 422
  - `frontend/e2e/duplicate-dialog.spec.ts:372` — E2E — after Don't add the form still submits normally

#### AC-8: Add anyway resends with the flag; outcome as a normal "Added *Title*." save (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `frontend/e2e/duplicate-dialog.spec.ts:173` — E2E — status "Added Dune.", dialog and panel closed, exactly two POSTs (first without the flag, second = first + `confirmDuplicate: true`), new row's title focused, no alert, catalog holds two *Dune*s
  - `frontend/e2e/duplicate-dialog.spec.ts:294` — E2E — 503 on the resend: dialog not reopened, panel keeps every value, couldn't-save line shown, nothing saved
  - `frontend/e2e/duplicate-dialog.spec.ts:334` — E2E — in-flight guard: Add book and `requestSubmit()` send nothing while the resend is held
  - `frontend/src/api/books.test.ts:30` — UNIT — the confirm option merges into the intent JSON
- **Note:** the highlight ring isn't asserted on this path. It is set in the same `onAdded` handler as the row focus the test does assert (`CatalogPage.tsx:84`), and 1.8's `new-book-panel.spec.ts:279` covers the ring itself. Advisory only.

#### AC-9: Standard intent ACs (TR8) hold for add-book with the duplicate check (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `backend/tests/test_duplicate_book.py:194` — API — confirmed duplicate add with a fault at write, fsync and replace: 503, "Couldn't save. Your data wasn't changed.", file byte-identical; `check_invariants()` after a success; OpenAPI lists `duplicate_book` and `ErrorBody.duplicates`
  - `backend/tests/test_duplicate_book.py:101` — API — the API test for the new `duplicate_book` code (TR8 "every new error code has an API test")
  - `backend/tests/test_contract.py:290` — API — pins the `ErrorCode` enum, `duplicate_book` included
  - `backend/tests/test_duplicate_book.py:447` — API — two simultaneous identical adds: the check runs under the store lock, one saved and one refused (AD-4)
- **N/A clause:** TR8's `book_not_found` doesn't apply, since `add-book` names no existing Book. The ATDD checklist records this, and Story 1.11's `edit-book` takes it on.

#### Considered and rejected

None. Every test that names a criterion asserts part of what that criterion states (`rejected_evidence: []`).

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found.

#### High Priority Gaps (PR BLOCKER) ⚠️

0 gaps found.

#### Medium Priority Gaps (Nightly) ⚠️

0 gaps found.

#### Low Priority Gaps (Optional) ℹ️

0 gaps found.

Partial / unit-only / integration-only: none.

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- Endpoints without direct API tests: 0. `POST /api/intents/add-book` is exercised at API level (refusal, confirm, malformed flag, faults) and through the panel at E2E. `GET /api/views/catalog` is read back by every E2E test.

#### Auth/Authz Negative-Path Gaps

- Not applicable: bookvie is a single-user local app with no auth surface in this story. 0 gaps.

#### Happy-Path-Only Criteria

- 0. Error paths covered: 422 invalid fields before the check (AC-5), 422 malformed flag (AC-4), 503 at write/fsync/replace (AC-9), 503 on the Add anyway resend (AC-8), malformed `duplicates` on the client (AC-6), concurrent adds (AC-9), double press during the resend (AC-8).

UI journey / UI state heuristics: `not_applicable` (formal oracle, not inferred journeys).

---

### Quality Assessment

#### Tests with Issues

**BLOCKER:** none · **WARNING:** none · **INFO:**

- `frontend/e2e/duplicate-dialog.spec.ts:78` runs about 60 lines and many assertions in one leaf. That is deliberate (one AC per red leaf) and it stays readable, but it is the longest test in the file.
- `frontend/e2e/duplicate-dialog.spec.ts:173` and `:294` attach request listeners or routes before `goto`, which follows network-first. No `waitForTimeout` in the file.

#### Tests Passing Quality Gates

**37/37 mapped test declarations (100%)** are active, deterministic and have explicit assertions. None are skipped, fixme or pending.

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC-4 (API) and AC-8 (E2E): the server proves the flag is honoured, the browser proves the client sends it on the resend only. Different concerns.
- AC-3 different-ISBN rule (API `:131`) and E2E `:372`: the E2E test checks the panel recovers after Don't add. It doesn't re-prove the rule.
- AC-2 server copy (API `:240`) and AC-6 description (E2E `:78`, `:284`): two different strings by design, since spec Decisions say the client renders the description from `duplicates`.

#### Unacceptable Duplication ⚠️

None. The E2E tests never re-prove a matching rule (the level split in the ATDD checklist).

---

### Coverage by Test Level

| Test Level | Test declarations | Criteria Covered | Notes |
| ---------- | ----------------- | ---------------- | ----- |
| E2E        | 12                | 4 (AC-3, 6, 7, 8) | 12 runs; `:284` is a loop of two |
| API        | 14                | 6 (AC-1–5, 9)     | `:240` and `:281` parametrized ×3 (18 runs) |
| Component  | 0                 | 0                 | — |
| Unit       | 11                | 6 (AC-1, 2, 4, 6, 8) | 6 pytest + 5 `node --test` |
| Live       | 0                 | 0                 | no results file |
| **Total**  | **37**            | **9/9**           | 6 files |

---

### Traceability Recommendations

#### Immediate Actions (Before PR Merge)

None. Story 1.9 is already on `master` and the gate passes.

#### Short-term Actions (This Milestone)

1. **LOW:** run `/bmad-testarch-test-review` on `test_duplicate_book.py` and `duplicate-dialog.spec.ts` to assess test quality.

#### Long-term Actions (Backlog)

1. **Advisory:** if the highlight ring ever moves off the shared `onAdded` path, add a ring assertion to the AC-8 resend test.
2. **Advisory:** "no warning color" is asserted on the heading only. A button-color assertion would close the claim completely; axe and the design tokens cover it today.
3. **Carry forward to 1.11:** the edit-mode dialog and `book_not_found` should reuse these tests' patterns.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

Run locally at `40c7341` on 2026-10-30, during this trace:

| Suite | Command | Result |
| ----- | ------- | ------ |
| Backend (1.9 + contract) | `cd backend && TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py tests/test_contract.py` | **48 passed**, 0 skipped (23 from `test_duplicate_book.py`) |
| Frontend unit | `node --test src/api/envelope.test.ts src/api/books.test.ts src/lib/announce.test.ts` | **34 passed**, 0 failed |
| E2E | `npm run build && npm --prefix frontend run e2e -- e2e/duplicate-dialog.spec.ts` | **12 passed** (13.3s) |

- **P0 tests:** all passing ✅ · **P1 tests:** all passing ✅
- **Flakiness:** not burn-in tested in this run. Every test passed on the first attempt, with no retries.

#### Coverage Summary (from Phase 1)

- P0: 8/8 (100%) ✅ · P1: 1/1 (100%) ✅ · Overall: 9/9 (100%) ✅

#### Non-Functional Requirements

Not assessed by this workflow. Accessibility evidence for the dialog: axe in both themes (`duplicate-dialog.spec.ts:429`). Reliability evidence: fault injection and concurrency (`test_duplicate_book.py:194`, `:447`).

---

### Decision Criteria Evaluation

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P0 coverage | 100% | 100% | ✅ MET |
| P1 coverage | ≥90% (PASS), ≥80% (min) | 100% | ✅ MET |
| Overall coverage | ≥80% | 100% | ✅ MET |
| Critical gaps | 0 | 0 | ✅ |
| Live-only requirements | 0 (else capped at CONCERNS) | 0 | ✅ |
| Skipped / fixme / pending | — | 0 | ✅ |

---

### GATE DECISION: PASS ✅

### Rationale

P0 coverage is 100%, P1 coverage is 100% (target: 90%), and overall coverage is 100% (minimum: 80%).

All nine Story 1.9 criteria are FULL. The ATDD red leaves were turned on without being weakened, and they are backed up by the green-phase and automate follow-ups. Every deferral recorded in `deferred-work.md` for 1.9 is marked resolved. The rules sit at UNIT/API and the dialog at E2E, without re-proving the rules. The oracle is formal (high confidence), and no live evidence or waiver affects the decision.

### Waiver Register Review

No register at `_bmad-output/test-artifacts/gate-waivers.md`, so this section doesn't apply.

---

### Gate Recommendations

#### For PASS Decision ✅

1. Story 1.9 is cleared. No test work is required before closing.
2. Optional: `/bmad-testarch-test-review` for a quality read on the two 1.9 files.
3. `npm run check` stays the regression guard, and CI runs the same suites.

### Next Steps

- Continue with Story 1.10 (bookcase view).
- Story 1.11 (edit-book) brings the edit-mode Duplicate dialog and `book_not_found`. Trace it the same way when it's done.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    story_id: '1.9'
    date: '2026-10-30'
    coverage: { overall: 100%, p0: 100%, p1: 100%, p2: n/a, p3: n/a }
    gaps: { critical: 0, high: 0, medium: 0, low: 0 }
    quality: { passing_tests: 37, total_tests: 37, blocker_issues: 0, warning_issues: 0 }
  gate_decision:
    decision: 'PASS'
    gate_type: 'story'
    decision_mode: 'deterministic'
    source_sha: '40c734188535753ac4b58187067f9d8c9ef7ce7f'
    criteria: { p0_coverage: 100%, p1_coverage: 100%, overall_coverage: 100%, critical_gaps: 0 }
    evidence:
      traceability: '_bmad-output/test-artifacts/traceability-matrix.md'
      summary: '_bmad-output/test-artifacts/e2e-trace-summary.json'
      gate: '_bmad-output/test-artifacts/gate-decision.json'
```

---

## Related Artifacts

- **Story spec:** `_bmad-output/implementation-artifacts/spec-1-9-get-warned-about-duplicates.md`
- **ATDD checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md`
- **Test design:** `_bmad-output/test-artifacts/test-design-qa.md`
- **Automation summary:** `_bmad-output/test-artifacts/automation-summary.md`
- **Tests:** `backend/tests/test_duplicate_book.py`, `frontend/e2e/duplicate-dialog.spec.ts`, `frontend/src/api/envelope.test.ts`, `frontend/src/api/books.test.ts`, `frontend/src/lib/announce.test.ts`, `backend/tests/test_contract.py`

---

## Sign-Off

- **Phase 1 (traceability):** overall 100% ✅ · P0 100% ✅
- **Phase 2 (gate):** **PASS ✅**
- **Generated:** 2026-10-30 · **Workflow:** testarch-trace (BMAD TEA)

---

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (target: 90%), and overall coverage is 100% (minimum: 80%).

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📝 Recommended Actions:
- LOW: Run /bmad-testarch-test-review to assess test quality

📂 Full Report: _bmad-output/test-artifacts/traceability-matrix.md

✅ GATE: PASS - Release approved, coverage meets standards
```
