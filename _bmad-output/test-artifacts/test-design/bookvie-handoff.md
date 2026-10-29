---
title: 'TEA Test Design → BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design-qa.md
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-10-29'
projectName: 'bookvie'
---

# TEA → BMAD Integration Handoff

## Purpose

Bridges the system-level test design with `bmad-create-epics-and-stories`, so that the risks, testability work and critical test scenarios become epic gates and story acceptance criteria.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
|---|---|---|
| Test Design: Architecture | `_bmad-output/test-artifacts/test-design-architecture.md` | Testability blockers (TC-1..6) → foundation story ACs; risk register |
| Test Design: QA | `_bmad-output/test-artifacts/test-design-qa.md` | Coverage matrix (88 scenarios) → story ACs; quality gates |
| Risk Assessment | embedded in both | Epic risk classification, story priority |
| Coverage Strategy | `test-design-qa.md` → Test Coverage Plan | Story test requirements |

## Epic-Level Integration Guidance

### Recommended foundation epic / first story

Put the test harness in the **first** epic, alongside the server skeleton, so every later story can write its tests as it goes:

- `LibraryBuilder` fixture + pre-start seeding (TC-1)
- `--fake-today` Clock flag (accepted only with `--no-browser`) + pinned TZ (TC-2)
- fs seam in `store/` (TC-3)
- Worker-scoped Playwright server fixture (TC-4)
- e2e isolation: per-worker data dirs under `$TMPDIR/bookvie-e2e/<run-id>/worker-<n>/`, a path guard that refuses everything else (always `~/bookvie-data`), and an isolated smoke install (TC-5)
- One `check` command (R-16)
- Host/Origin guard + 127.0.0.1 bind (R-04)

### Risk References (epic-level quality gates)

| Epic (suggested) | Risks it must close | Gate |
|---|---|---|
| Foundation: server, store, CLI, harness | R-03, R-04, R-06, R-13, R-15, R-16 | FND-* P0 green; `~/bookvie-data` untouched by `check` |
| Catalog & entry (FR-1–4, FR-20/21) | R-05, R-08, R-09, R-14 | Label-contract suite (CAT-E2E-001..005) green |
| Main book, pausing, Up next, Side reads (FR-5–9) | R-01, R-11 | RDG-UNIT-002 property test green; state matrix complete |
| Progress, bookcase, finish (FR-10/11/14/24) | R-01, R-07, R-10, R-17 | PRG-E2E-001 (≤ 2 interactions) green |
| Pace & stats (FR-15/16) | R-07, R-10 | Fake-Clock boundary tests green |
| Card notes (FR-17–19) | R-09 | CRD-API-001 green |
| Backup & restore (FR-22/23) | R-02, R-14 | Byte-identical round trip + all refusal/fault tests green |

### Quality Gates (every epic)

- P0 = 100%, P1 ≥ 95%
- No new untested refusal code: every AD-9 `code` added by the epic has an API test
- `check:api` clean
- Coverage ≥ 90% line `domain/`, ≥ 80% `intents/` + `store/`

## Story-Level Integration Guidance

### P0/P1 Test Scenarios → Story Acceptance Criteria

These should appear as testable ACs in the matching stories:

- **Every intent story:** "Given a failure at write / fsync / rename, the original `library.json` is unchanged and the response is 503 `couldnt_save`" (FND-API-001), and "after the intent, `check_invariants()` holds" (FND-UNIT-002).
- **add-book / edit-book:** all-fields 422 (CAT-API-001); duplicate 409 + `confirmDuplicate` (CAT-API-009); Pages-below refusals (CAT-API-006); Finished on → back-filled Reading (CAT-API-004).
- **New book panel (UI):** every label in the Agent Label Contract is reachable with `exact: true` (CAT-E2E-001); "Added *Title*." status, then a Search titles match (CAT-E2E-002); Duplicate dialog behaviour (CAT-E2E-003); couldn't-save keeps every value (CAT-E2E-005).
- **delete-book:** pointers cleared in the same commit (CAT-API-007); confirmation required (CAT-E2E-006).
- **start-reading / pause / set-up-next:** each EXPERIENCE "Book states" row has a Given/When/Then (RDG-API-001..003); Cancel changes nothing (RDG-E2E-003).
- **update-page:** at the last page, `reachedLastPage` is returned and the Reading stays unfinished (PRG-API-002); catch-up takes ≤ 2 interactions (PRG-E2E-001).
- **finish-reading:** stored `finishDate` / `finishedPages`; non-Main finish leaves Main unchanged (FIN-API-001/002); date rules (FIN-API-003).
- **export / restore:** byte-identical round trip (BKP-API-001); each refusal leaves data unchanged (BKP-API-003); malicious archives refused (BKP-API-004); fault during apply leaves data intact (BKP-API-005).
- **Server skeleton:** Host/Origin guard matrix (FND-API-004); 127.0.0.1 only (FND-API-005); newer `schemaVersion` refused at startup (FND-API-010).

### Data-TestId Requirements

**None.** The Agent Label Contract (AD-17) and ARIA roles are the selector strategy. Adding `data-testid` would create a second, unofficial interface. Stories that add UI beyond the contract should give controls accessible names per EXPERIENCE → Accessibility Floor.

## Risk-to-Story Mapping

| Risk ID | Category | P×I | Recommended Story/Epic | Test Level |
|---|---|---|---|---|
| R-01 | DATA | 2×3 = 6 | Main book epic: `start-reading`, `pause`, `set-up-next`, `finish-reading`, `delete-book` | UNIT (property) + API + E2E journeys |
| R-02 | DATA | 2×3 = 6 | Backup epic: export, restore | API + E2E |
| R-03 | DATA | 2×3 = 6 | Foundation: store commit; Catalog: cover upload | API (fault injection) |
| R-04 | SEC | 2×3 = 6 | Foundation: server skeleton / HTTP guard | API |
| R-05 | BUS | 2×3 = 6 | Catalog: New book panel, Duplicate dialog, Search titles | E2E |
| R-06 | OPS | 2×3 = 6 | Foundation: test harness | UNIT + SMOKE |
| R-07 | TECH | 2×2 = 4 | Progress, Finish, Stats | UNIT (fake Clock) + E2E |
| R-08 | DATA | 2×2 = 4 | Catalog: duplicate detection | UNIT + API + E2E |
| R-09 | DATA | 2×2 = 4 | Catalog: edit-book; Card notes | API |
| R-10 | TECH | 2×2 = 4 | Progress, Pace, Stats views | UNIT + API |
| R-11 | TECH | 2×2 = 4 | Frontend data layer | E2E (two contexts) |
| R-12 | BUS | 2×2 = 4 | Every UI save surface | E2E (routed 503) |
| R-13 | OPS | 1×3 = 3 | Foundation: CLI + lock | API (subprocess) |
| R-14 | SEC | 1×3 = 3 | Backup: restore; Catalog: cover upload | API |
| R-15 | DATA | 1×3 = 3 | Foundation: store load + migrations | API |
| R-16 | OPS | 2×2 = 4 | Foundation: `check` command | — |
| R-17 | PERF | 1×2 = 2 | Progress: Main book card | E2E |
| R-18 | TECH | 1×2 = 2 | Foundation: API types | Static |

## Recommended BMAD → TEA Workflow Sequence

1. **TEA Test Design** (`TD`): done; produced this handoff
2. **BMAD Create Epics & Stories** (`CE`): consumes this handoff and embeds the ACs above
3. **BMAD Sprint Planning** (`SP`): readiness check
4. **TEA Test Framework** (`TF`): optional; scaffolds the harness listed under the foundation epic
5. **TEA ATDD** (`AT`): optional per story, run explicitly
6. **BMAD Build** (`BD`): implementation, test-first
7. **TEA Automate** (`TA`) / **Trace** (`TR`): coverage expansion and gate

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
|---|---|---|
| Test Design | Epic/Story Creation | All six high risks have a mitigation strategy ✅ |
| Epic/Story Creation | ATDD / Build | Foundation epic contains TC-1..5; P0 scenarios appear as story ACs |
| ATDD | Implementation | Failing acceptance tests exist for P0/P1 scenarios of the story (if ATDD used) |
| Implementation | Test Automation | All acceptance tests pass |
| Test Automation | Release | Trace shows ≥ 80% of P0/P1 requirements covered; P0 = 100% |
