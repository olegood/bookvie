---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-15'
workflowType: 'testarch-trace'
traceTarget: 'epic 9'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/planning-artifacts/epics.md (TR7 :164; Epic 9 gate "per-epic quality gates (TR7), and the existing card note e2e specs pass unchanged with Add another off" :2239; stories 9.1-9.2 :2241-2322)'
  - '_bmad-output/test-artifacts/test-design-qa.md (the Card note panel surfaces of XUI-E2E-001 :251 and XUI-E2E-003 :277; it has no FR-17 keyboard or Add another scenario of its own)'
  - '_bmad-output/implementation-artifacts/epic-9-retro-2026-11-15.md (action 67)'
  - '_bmad-output/test-artifacts/atdd-checklist-9-1 and 9-2 (story ACs and their priority markers; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'e2726bf'
---

# Traceability Matrix & Gate Decision: Epic 9, Add card notes faster

**Target:** Epic 9, stories 9.1-9.2 (gate type: epic). This is Epic 9 retro action 67 (`epic-9-retro-2026-11-15.md`).
**Date:** 2026-11-15
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `e2726bf` plus this trace's one test addition (below).
- That commit is the last story commit `f633bf4` plus three commits outside the stories: `38d1a61` (`docs/ideas.md`), `07a09c5` (Prettier on `base.css`) and the retro (`e2726bf`). `9818c7b` (the dropdown arrow) sits between the 9.2 review and its automate commit.
- This trace changed no product code.

**Gate thresholds:**
- **Coverage:** TR7 (`epics.md:164`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%.
- **Other TR7 clauses:** an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`.
- **Epic 9 gate:** TR7, plus "the existing card note e2e specs pass unchanged with Add another off" (`epics.md:2239`).

**Machine-readable:** `epic-9-e2e-trace-summary.json` and `epic-9-gate-decision.json`, both in this folder.

**Live verification results:** none on file. The retro's hand run (7 observed steps, all as specified) is recorded in `epic-9-retro-2026-11-15.md`, "Behavior verification", not as a live results file, so it isn't counted here.

**Waiver register:** none on file.

### Test this trace added

Mapping XUI-E2E-003 ("no optimistic UI under delayed response") to the Epic 9 surface turned up one gap.

- **What was already proven:** with Add another off, or in edit mode, a held save keeps the panel open with Note as typed and sends one request (`card-note-keyboard-save.spec.ts:263`, `card-note-keyboard-save-automate.spec.ts:296`), and the Epic 5 card note surfaces (`add-card-note.spec.ts:466`, `edit-card-note.spec.ts:403`, `:443`).
- **What Add another adds on top of it:** a success that doesn't close the panel. Note empties, the count moves, "Card note saved." is announced and "See card notes · N" updates, all inside the open panel.
- **The gap:** every Add another leaf let the add-card-note response through at once. No test held it and looked at the panel before the response.

The trace closed it the way the Epic 5 to 8 traces did:

- **`card-note-add-another-automate.spec.ts:324`**, `[P2] XUI-E2E-003 with Add another on, a held stay-open save shows nothing early: Note, the count, the status and "See card notes" change only once the response is in`.
  - **Setup:** Home with the Main book, Add another checked, the add-card-note route held until released.
  - **First save (Cmd+Enter), held:** Save note is `aria-disabled`, one request is out, and after the announce delay Note still reads "Held once.", Page "212–213", there is no count, `status` doesn't read "Card note saved.", the link still reads "See card notes · 0" and the library holds no note.
  - **Released:** Note empties, the count reads "1 note saved", `status` reads "Card note saved.", the link reads 1 and Save note is enabled again.
  - **Second save (Save note), held, then released:** the count stays "1 note saved" and the library holds one note until the response; then "2 notes saved", the link reads 2, the panel is open and Note has focus.
- **Mutation checks:** both fail the test, and both pass again once the file is restored.
  - Counting before the response (`setSavedCount` moved above the `await` in `CardNotePanel.tsx` `save`): fails at `:354`, the "no count yet" assertion.
  - Emptying Note before the response: fails at `:352`, Note's value.
  - The SPA is rebuilt by the e2e global setup on each run. Each mutation was reverted by copying back a saved copy and diffing it, not with `git checkout` (Epic 8 retro item 64).
- **Burn-in:** 10 of 10 passed (`--repeat-each=10 --retries=0`).

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (2/2).
- P1 coverage is 100% (10/10), against the TR7 target of 95%.
- Overall coverage is 100% (15/15), against the minimum of 80%.
- The existing card note e2e specs are unchanged in the epic's range and pass (Epic 9 gate).
- Every error code has an API test. Epic 9 added no error code.
- `check:api` is clean and the coverage gates hold.

### TR7 criteria and the Epic 9 gate

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 2/2 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 10/10 FULL | ✅ MET |
| Every error code has an API test | "Error codes" below | ✅ MET |
| `check:api` clean | contract, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 9); 359 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (466/466 lines), intents+store 98.08% (1633/1665) | ✅ MET |
| Existing card note e2e specs unchanged, with Add another off (Epic 9 gate) | `git diff 48370cf^..HEAD` touches none of `add-card-note.spec.ts`, `edit-card-note.spec.ts`, `card-notes.spec.ts`, `card-notes-pile.spec.ts`, `card-notes-pile-keys.spec.ts`, nor any other older spec that opens the panel (`home`, `book-states`, `side-reads`, `delete-book`, `backup`, `restore`, `stats`, `app-shell`); the only older spec it touches is `catalog-filter.spec.ts:30`, one storage-key list. None of the five sets `bookvie.cardNoteAddAnother`, and each Playwright context starts with empty storage, so they run with Add another off. All green in the run below. | ✅ MET |

### Run evidence

**Commit:** `e2726bf`, with this trace's test addition in the working tree (`card-note-add-another-automate.spec.ts`).

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0 (npm's own status, written to the log after the run), on the first run.

- After the run, the new test's title marker went from `[P1]` to `[P2]`, the priority `test-design-qa.md` gives XUI-E2E-003. That changed only the title string. `prettier --check` on the file and the whole spec (12 passed) were re-run after it.

| Check | Outcome |
|---|---|
| pytest | 1573 passed |
| Coverage gates | domain 100.00% (466/466), intents+store 98.08% (1633/1665): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint (0 errors; the 2 warnings in `usePauseFlow.tsx` predate Epic 9); 359 passed, 0 failed |
| Playwright | 704 passed (2.2 m), none flaky, retried or skipped. That is the retro's 703 plus this trace's test. |
| Smoke | isolated install served `/` and a deep link: ok |

---

## Oracle and scope

**Oracle.** TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios. That document predates Epic 9: the keyboard save and Add another came after it, and it has no scenario for either. So the priority-bearing oracle is:

- each Epic 9 story AC from `epics.md`, at the priority of the ATDD test that owns it (the `[P0]`…`[P3]` marker in the test title and the ATDD checklist). Story 9.1 has 5 ACs and 9.2 has 8: 13 in all;
- the Card note panel surfaces of the shared XUI rows, where Add another changes what the panel does:
  - XUI-E2E-001 (P1, couldn't save → exact alert, input kept; R-12);
  - XUI-E2E-003 (P2, no optimistic UI under a delayed response; R-11).

That makes 15 items. An AC's priority is the highest marker among its tests, so 9.1 · AC-5 (`aria-keyshortcuts`) and 9.2 · AC-8 (dark theme, forced colors) are P2 because only P2 tests own them.

**Out of scope, and why:**

- **XUI-E2E-002** (two contexts). Epic 9 adds no view and no intent: the panel sends the same `add-card-note` and `edit-card-note` as before, and the Epic 5 trace mapped their cross-context refetch. The one cross-context case Add another opens, a Book deleted while the panel stays open, is pinned (`card-note-add-another-automate.spec.ts:468`, 409).
- **XUI-E2E-004** (tone) has no epic owner. Epic 9's copy is pinned by its exact strings ("Add another", "1 note saved", "2 notes saved", "Card note saved.").
- **XUI-E2E-005** (empty states). Epic 9 adds no empty state; the count is empty at each opening, which is 9.2 · AC-4.
- **Safari and Firefox.** The e2e suite runs Chromium only, which covers the one supported browser (AGENTS.md "Supported browser"). The `aria-keyshortcuts` value names both Meta and Control, and both are pressed by name in Chromium.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 2              | 2             | 100%       | ✅ PASS |
| P1        | 10             | 10            | 100%       | ✅ PASS |
| P2        | 3              | 3             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **15**         | **15**        | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 9 files, plus the one Epic 9 edit to an older spec.

- **Backend:** none. Epic 9 changed no backend code, route or intent.
- **Unit (frontend):** `lib/cardNoteAddAnother.test.ts` (5 cases).
- **e2e (the four Epic 9 specs):** `card-note-keyboard-save`, `card-note-keyboard-save-automate`, `card-note-add-another`, `card-note-add-another-automate` (including this trace's test). Their helpers are `card-note-keys.ts` and `card-note-add-another.ts`.
- **e2e (Epic 9 edit to an older spec):** `catalog-filter.spec.ts:30`, whose `APP_STORAGE_KEYS` gained `bookvie.cardNoteAddAnother` (9.2 review, patch 2).

**By level:** the 5 Epic 9 files hold 43 tests.

| Level | Tests (Epic 9 files) | Criteria covered |
|---|---|---|
| e2e | 38 (`card-note-keyboard-save`: 7; `card-note-keyboard-save-automate`: 9; `card-note-add-another`: 10; `card-note-add-another-automate`: 12, including this trace's) | 15 |
| API | 0 | 0 |
| Unit | 5 (`cardNoteAddAnother.test.ts`) | 1 |

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `frontend/e2e/` unless shown in full. `keys` = `card-note-keyboard-save.spec.ts`, `keys-auto` = `card-note-keyboard-save-automate.spec.ts`, `another` = `card-note-add-another.spec.ts`, `another-auto` = `card-note-add-another-automate.spec.ts`.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 9.1 · AC-1 | Cmd+Enter or Ctrl+Enter in Note or Page, in add or edit mode, does exactly what Save note does: sends `add-card-note` or `edit-card-note` with both values as typed, closes, returns focus to the opener and announces "Card note saved."; the keys go through `requestSubmit()` | `keys:40` (both keys, both fields, both modes, counted `submit` events); `keys-auto:96` (Home, both values as typed), `:150` (Book detail opener), `:185` (focus before the status) | FULL |
| 9.2 · AC-3 | With Add another on, a save from Save note or Cmd+Enter keeps the modal panel open, empties Note, keeps Page as typed, clears errors, refocuses Note, announces again, and the counts behind the panel update | `another:160` (both paths, "212–213" kept, `status` sequence, "See card notes · N", stored notes, held Cmd+Enter), `:233` (Save note enabled again), `:433` (a field error clears after a refusal); `another-auto:178` (empty Note refused, then saved), `:214` (Book detail "Card notes (N)"), `:254` (focus on Note at each status), `:283` (Ctrl+Enter pressed and held) | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 9.1 · AC-2 | Plain Enter in Note inserts a new line and sends nothing | `keys:101` (Enter and Shift+Enter, then Cmd+Enter saves three lines); `keys:128` (composing input method sends nothing), `:167` (keys on Cancel send nothing) | FULL |
| 9.1 · AC-3 | Cmd+Enter with an empty Note or an out-of-range Page shows Save note's messages, `aria-invalid`, alert and focus; a couldn't-save keeps the panel open with both values and the line above the buttons | `keys:198`; `keys-auto:216` (edit mode, refused Page), `:253` (edit mode, couldn't save, Delete stays left) | FULL |
| 9.1 · AC-4 | While a save is out, another Cmd+Enter, a held key, Save note, Cancel or Esc send nothing more and the panel stays open; Save note and Delete stay focusable with `aria-disabled`, described "Saving the card note." | `keys:263` (edit mode); `keys-auto:296` (add mode), `:345` (held key after a refusal), `:384` (keys inside the Delete Confirm dialog) | FULL |
| 9.2 · AC-1 | Add mode: the native Add another checkbox under Page, 16px, `accent-color`, label `body-sm`/`ink` and clickable, ring on the box; edit mode has no checkbox and no count | `another:57`; `another-auto:387` (8px label gap), `:399` (axe in both themes), `:512` (edit from the Card notes page) | FULL |
| 9.2 · AC-2 | The choice is stored at once under `bookvie.cardNoteAddAnother` (try/catch) and survives the next opening and a reload; empty, junk or throwing storage reads off; a failed write still toggles the box; not in an export, and a restore neither brings nor replaces it | `another:114`; `another-auto:76` (throwing storage), `:114` (not sent, not exported, kept across a restore); unit `cardNoteAddAnother.test.ts:16`, `:21`, `:28`, `:38`, `:49`; `catalog-filter.spec.ts:30` (the key is one of the app's own) | FULL |
| 9.2 · AC-4 | A plain-text count on the checkbox line, right-aligned `meta`/`ink-tertiary`: "1 note saved", then "2 notes saved"; not a live region; empty at each opening | `another:262` | FULL |
| 9.2 · AC-5 | With three saved and a fourth half typed, Cancel or Esc closes the panel, keeps the three, drops the fourth, refocuses the opener and announces nothing more; the button reads Cancel throughout | `another:306`; `another-auto:429` (Tab cycle with a count shown) | FULL |
| 9.2 · AC-6 | With Add another on, a refused (422) or couldn't-save save keeps the panel open with both values and the message, and the count doesn't change | `another:364`; `another-auto:468` (Book deleted meanwhile, 409) | FULL |
| 9.2 · AC-7 | With Add another off, or in edit mode while the stored choice is on, a save closes the panel and returns focus as before; the existing card note specs pass unchanged | `another:461`; `another-auto:512`; the unchanged Epic 5 specs (Epic 9 gate row above) | FULL |
| XUI-E2E-001 (Card note panel with Add another on) | Couldn't save → exact alert, input kept | `another:364` (exact `alert` text for 422 and 503, both values kept, count unchanged); `another-auto:468` (409 line); `keys:198`, `keys-auto:253` (keyboard path) | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| 9.1 · AC-5 | Save note carries `aria-keyshortcuts="Meta+Enter Control+Enter"`, with no on-screen hint | `keys:324` (both modes); `keys-auto:432` (only Save note carries it) | FULL |
| 9.2 · AC-8 | Dark theme: the dark unchecked box and the `accent` dark twin; forced colors: system colors, no custom drawing | `another:503`; `another-auto:399` (axe in the dark theme) | FULL |
| XUI-E2E-003 (Card note panel with Add another on) | No optimistic UI under a delayed response | `another-auto:324` (this trace); `keys:263`, `keys-auto:296` (Add another off) | FULL |

### Error codes

TR7 requires an API test for every error code.

- `ErrorCode` (`backend/bookvie/intents/contract.py`) still has 18 values. Epic 9 added none, and no intent, route or refusal. It changed no backend file.
- The client's handling of the codes the panel meets (422 `validation`, 409 Book gone, 503 couldn't save) is pinned with Add another on (`another:364`, `another-auto:468`).
- The 18 codes were confirmed in the Epic 1-8 traces and are still green in the run above.

### Risks

`test-design-qa.md` links no risk to the keyboard save or Add another. XUI-E2E-001 is R-12 (data-safety UX) and XUI-E2E-003 is R-11 (stale views), both closed by earlier gates; this trace's test extends R-11's evidence to the stay-open panel. Epic 9 closes no risk and opens none.

### Coverage heuristics

- **Endpoints.** Epic 9 added no route. Gaps: 0.
- **Auth/authz negative paths.** No new route or intent. Status: not applicable.
- **Error paths.** No new refusal. The panel's failure states are pinned with Add another on: 422 (`another:364`, `another-auto:178`), 503 (`another:364`), 409 (`another-auto:468`), and throwing storage (`another-auto:76`; unit `:28`). Status: present.
- **UI journeys and states.** Not applicable (formal oracle). The in-flight, refused, couldn't-save, gone-Book, count, dark and forced-colors states are pinned (matrix above).

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

Each checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md` | 0 | 0 | |
| `atdd-checklist-9-2-add-several-card-notes-in-a-row.md` | 0 | 0 | |

Every line was ticked or retired by the stories' automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is in the retro, the 9.2 spec or `deferred-work.md`.

- **Typing in the 15 to 25 ms of an in-flight stay-open save is wiped** when the response empties Note (low). The 9.2 review measured and rejected it (`spec-9-2-*.md`, Rejected). This trace's test pins the other half: nothing changes before the response.
- **A save, Esc or Cancel within 100 ms drops the pending "Card note saved."** (low). 9.2 review, rejected.
- **`APP_STORAGE_KEYS` in `catalog-filter.spec.ts` is hand-kept** (low, retro E9-A1, watch). The next preference key needs the same edit.
- **`CardNotePanel.tsx` is 318 lines** and takes every card note change (retro, watch).
- **No test for the drawn `select` chevron** from `9818c7b` (outside the stories). In `deferred-work.md`, from `spec-align-select-arrow.md`.
- **Flaky specs.** None in this trace's run or the retro's (703 passed).

---

## Next actions

1. Retro action 68: the `bmad-build` shared-checkout guard and format check.
2. **LOW:** run `/bmad-testarch-test-review` on the Epic 9 suites. `card-note-add-another-automate.spec.ts` (about 550 lines) is the largest, under the 1000-line limit in `test-quality.md`.
3. Sprint item `epic-9-retro-item-67-…` is marked done with this trace.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (2/2) (Required: 100%) → MET
- P1 Coverage: 100% (10/10) (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (15/15) (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). The existing card note e2e specs are unchanged and pass with Add another off. Epic 9 added no error code; every existing code keeps its API test. check:api is clean and the coverage gates hold. This trace added one e2e test (card-note-add-another-automate.spec.ts:324) for XUI-E2E-003 on the stay-open panel.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-9-traceability-matrix.md

✅ GATE: PASS - Epic 9 meets TR7 and its gate
```
