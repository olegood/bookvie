---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-11-11'
workflowType: 'testarch-trace'
traceTarget: 'epic 5'
gateType: 'epic'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/test-artifacts/test-design-qa.md (P0-P3 scenario tables; the CRD rows, BKP-API-001''s full-data re-run, CAT-API-006''s card-note share, and the card-note surfaces of XUI-E2E-001, XUI-E2E-002, XUI-E2E-003 and XUI-E2E-005)'
  - '_bmad-output/test-artifacts/test-design-architecture.md (R-09 :112)'
  - '_bmad-output/planning-artifacts/epics.md (TR7 :154; Epic 5 gate :1703; stories 5.1-5.4 :1705-1851)'
  - '_bmad-output/implementation-artifacts/epic-5-retro-2026-11-10.md (action 50)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-1, 5-2, 5-3, 5-4 and pile-arrow-key-navigation (story ACs; see "ATDD checklists")'
externalPointerStatus: 'not_used'
collectionStatus: 'COLLECTED'
sourceSha: 'c177b6d'
---

# Traceability Matrix & Gate Decision: Epic 5, Keep what a book gave you

**Target:** Epic 5, stories 5.1-5.4 and the standalone pile arrow-keys spec (gate type: epic). This is Epic 5 retro action 50 (`epic-5-retro-2026-11-10.md`).
**Date:** 2026-11-11
**Evaluator:** Oleg (TEA Agent)
**Commit under trace:** `c177b6d` plus this trace's one test addition (below). That commit includes the retro fixes for items 44-49 and item 51's flake fix. This trace changed no product code.
**Gate thresholds:** TR7 (`epics.md:154`) requires P0 = 100% and P1 ≥ 95%. That is stricter than the workflow default of 90%, so TR7 applies. Overall coverage must be ≥ 80%. TR7 also requires an API test for every error code, `check:api` clean, and coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`. The Epic 5 gate (`epics.md:1703`) adds: CRD-API-001 green. It closes R-09 (with Story 1.11). Action 50 also asks to confirm CRD-API-001 and the BKP-API-001 full-data re-run row by row.
**Machine-readable:** `epic-5-e2e-trace-summary.json` and `epic-5-gate-decision.json`, both in this folder.
**Live verification results:** none on file. **Waiver register:** none on file.

### Test this trace added

Mapping XUI-E2E-002 ("intent in A visible in B after focus; refusals also invalidate") to the card-note surfaces turned up one gap. The refusal half was covered: a stale tab's 409 on add, edit or delete refetches the view behind the panel (`add-card-note.spec.ts:495`, `edit-card-note.spec.ts:508`). The focus half wasn't. Story 5.3 added a new view, `card-notes`, and no test showed that it refetches when the window regains focus after another context changes a note. The Epic 4 tests prove this for the Home view and the book view only.

The trace closed the gap rather than leaving it open:

- **`card-notes.spec.ts:796`**, `[P1] XUI-E2E-002 a note added in another context shows on the Card notes page once it regains focus, with no warning`. A second browser context adds Emma's first note through `add-card-note`. The first context regains focus, and its Card notes page grows an "Emma" group in title order, holding the note with its "p.12" ref and no alert.
- **Mutation check:** with `refetchOnWindowFocus: false` set on `useCardNotesView` (`frontend/src/api/views.ts`), the test fails on the group headings. It passes again with the change reverted.
- **Burn-in:** 10 of 10 passed (`--repeat-each=10 --retries=0`).

---

## Gate Decision: PASS

**Rationale:**
- P0 coverage is 100% (2/2).
- P1 coverage is 100% (4/4), against the TR7 target of 95%.
- Overall coverage is 100% (10/10), against the minimum of 80%.
- CRD-API-001 is green, and holds row by row.
- The BKP-API-001 full-data re-run holds row by row.
- Every error code, including Epic 5's new `card_note_not_found`, has an API test.
- R-09 is closed.

### TR7 and Epic 5 gate criteria

| Clause | Evidence | Status |
|---|---|---|
| P0 = 100% | 2/2 FULL (matrix below) | ✅ MET |
| P1 ≥ 95% | 4/4 FULL | ✅ MET |
| CRD-API-001 green | "CRD-API-001, row by row" below | ✅ MET |
| BKP-API-001 re-run with full data | "BKP-API-001 full-data re-run, row by row" below | ✅ MET |
| Every error code has an API test, including `card_note_not_found` | "Error codes" below | ✅ MET |
| `check:api` clean | contract, Prettier, `tsc -b`, oxlint; 285 passed, 0 failed | ✅ MET |
| Coverage ≥ 90% `domain/`, ≥ 80% `intents/`+`store/` | `coverage_gate.py`: domain 100.00% (403/403 lines), intents+store 98.06% (1619/1651) | ✅ MET |
| Closes R-09 (with Story 1.11) | "Risks closed" below | ✅ MET |

### Run evidence

**Commit:** `c177b6d`, with this trace's test addition in the working tree (`card-notes.spec.ts`).

**Command:** `npm run check` (`check:py`, `check:api`, `check:e2e`, `check:smoke`, run one after the other).

**Result:** exit code 0.

| Check | Outcome |
|---|---|
| pytest | 1342 passed |
| Coverage gates | domain 100.00% (403/403), intents+store 98.06% (1619/1651): ok |
| `check:api` | contract, Prettier, `tsc -b`, oxlint; 285 passed, 0 failed |
| Playwright | 508 passed (1.5 m), none flaky, retried or skipped. That is the retro's 507 plus this trace's test |
| Smoke | isolated install served `/` and a deep link: ok |

An earlier `npm run check` in this session failed at `tsc -b`, because it started while the new test was half-written (its `ADD_CARD_NOTE` import was missing). Its pytest and coverage-gate results matched the run above. The run above is the one this gate relies on.

---

## Oracle and scope

**Oracle.** The oracle is the same as for Epics 1-4. TR7 states its P0/P1 percentages against the `test-design-qa.md` scenarios, and the Epic 5 gate names a scenario ID. So the priority-bearing oracle is the set of scenarios Epic 5 delivers:

- every CRD row: CRD-API-001, CRD-E2E-001, CRD-E2E-002 and CRD-E2E-003;
- the BKP-API-001 re-run with full data (Story 5.4 AC-7);
- CAT-API-006's card-note share, the Pages floor at the highest Card note page (Story 5.2 AC-4, R-09);
- the card-note surfaces of the shared XUI rows:
  - XUI-E2E-001 (couldn't save on a card note);
  - XUI-E2E-002 (two contexts);
  - XUI-E2E-003 (no optimistic UI);
  - XUI-E2E-005 (empty states: "No card notes yet.").

The story ACs are mapped one by one in "Story ACs" below. That table does not change the counts.

**Out of scope, and why:**

- **CAT-API-007** (deleting a Book takes its Card notes) was traced in Epic 1 (`test_delete_book.py:65`, `:179`). Epic 5 didn't change delete-book.
- **CAT-API-006's current-page share** was traced in Epic 1. **CAT-E2E-007** was traced in two parts: its Edit path in Epic 1 (`book-detail.spec.ts:409`), and its Mark finished path in Epic 4 (Story 4.5 AC-4, `finish-any-book.spec.ts:190`). They are R-09's other scenarios.
- **XUI-E2E-004** (tone) has no epic owner. Epic 5's copy is pinned by its exact strings.
- **ORG-*** belongs to Epic 7, and **PAC-*** and **STA-*** to Epic 6.

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status |
| --------- | -------------- | ------------- | ---------- | ------ |
| P0        | 2              | 2             | 100%       | ✅ PASS |
| P1        | 4              | 4             | 100%       | ✅ PASS |
| P2        | 4              | 4             | 100%       | ✅ PASS |
| P3        | 0              | 0             | n/a        | n/a |
| **Total** | **10**         | **10**        | **100%**   | **✅ PASS** |

**Tests mapped:** every test in the Epic 5 files, plus the Epic 5 tests in shared files:

- **Backend:** `test_add_card_note.py`, `test_edit_card_note.py`, `test_card_notes_view.py`, `test_full_data_round_trip.py` and `test_note_pages.py`, plus the Epic 5 tests in:
  - `test_edit_book.py:170` (the Pages floor at a Card note page);
  - `test_intent_routes.py` (the three card-note routes in the foreign-caller and body matrix);
  - `test_contract.py:309` (`card_note_not_found` in the OpenAPI enum);
  - `test_invariants.py` and `test_restore.py` (item 49's Card note invariants).
- **Unit (frontend):** `frontend/src/lib/cardNotes.test.ts`.
- **e2e:** `add-card-note`, `edit-card-note`, `card-notes`, `card-notes-pile` and `card-notes-pile-keys`.

**By level:** the 11 Epic 5 files hold 157 tests. Shared-file tests are mapped but not counted.

| Level | Tests (Epic 5 files) | Criteria covered |
|---|---|---|
| e2e | 92 (5 specs) | 7 |
| API | 23 (4 backend files) | 3 |
| Unit | 42 (`test_note_pages.py`: 3; `cardNotes.test.ts`: 39) | 2 |

Parametrized tests run many more cases. For example, the 7 page forms and 11 Page refusals (`backend/tests/helpers.py:60`, `:77`) each run through both add and edit, and the shared route matrix runs 3 card-note routes × its bodies and callers.

**Skipped, fixme or pending:** none.

**Rejected evidence:** none. Every mapped test was read against its criterion.

### Detailed Mapping

Paths are relative to `backend/tests/` or `frontend/e2e/` unless shown in full.

#### P0

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| BKP-API-001 (full-data re-run) | Export → restore on a library with every Epic 3-5 state → byte-identical `library.json` and covers | `test_full_data_round_trip.py:181`; row by row below. Epic 2's original round trip `test_restore.py` (ac6) stays green | FULL |
| CAT-API-006 (card-note share) | Pages below the highest Card note page → 409 `pages_below_card_note`; a range counts by its `pageEnd` | Refused below the highest note, a range by its end `test_edit_book.py:170`; deleting the highest note lets Pages go down to the highest remaining, a range by `pageEnd`, one below still refused `test_edit_card_note.py:76`; editing the highest note down lowers the floor `:368`; a range edited to one page counts its new page `:384`; a note added through the intent sets the floor `test_add_card_note.py:248` | FULL |

#### P1

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| CRD-API-001 | Card note CRUD; text required; page or range in bounds, low → high, one page or one range | Row by row below | FULL |
| CRD-E2E-001 | Flow 6: add a card note from Home → it shows in Book detail | `add-card-note.spec.ts:371`; the panel and save on Home `:88`, `:122` | FULL |
| XUI-E2E-001 (card-note surfaces) | Couldn't save → exact alert, input kept | Add card note panel `add-card-note.spec.ts:274`; Edit card note panel, then the stacked Confirm dialog `edit-card-note.spec.ts:209` | FULL |
| XUI-E2E-002 (card-note surfaces) | Two contexts: an intent in A shows in B after focus; refusals also invalidate | A note added elsewhere shows after focus `card-notes.spec.ts:796` (this trace). Refusals that refetch: the Main book deleted elsewhere `add-card-note.spec.ts:495`; the note deleted elsewhere, in the panel and in the Confirm dialog `edit-card-note.spec.ts:508`; a delete whose refetch fails never focuses the deleted note's Edit `:472`. The Card notes count on Home follows an add without a reload `card-notes.spec.ts:427` | FULL |

#### P2

| ID | Requirement | Tests | Coverage |
|---|---|---|---|
| CRD-E2E-002 | Card notes search: across Books or scoped, grouped, highlighted, opens in the pile | Across Books, grouped, `<mark>`, "N notes match." `card-notes.spec.ts:123`, `:409`, `:711`; scoped by the Main book card and Book detail `:169`; the scope chip `:206`, `:497`, `:529`; Book detail's block search `:244`, `:554`; highlight in dark and forced colors `:639`, `:678`; a search result opens the pile `card-notes-pile.spec.ts:253`, `:835`. API: `test_card_notes_view.py:32`, `:115`, `:154`. Unit: `cardNotes.test.ts` (`noteMatches`, `highlightParts`, `blockNotes`) | FULL |
| CRD-E2E-003 | Pile: page order, seeded shuffle, next and previous, jump | Page order, Next and Previous, no wrap `card-notes-pile.spec.ts:145`; Shuffled with a seeded `Math.random`, and back to Page order `:194`, `:425`, `:856`; jump to a note from its page-ref chip `:284` or a search result `:253`; Home and End `card-notes-pile-keys.spec.ts:111`; arrow keys `:73`, `:144`, `:295`. Unit: `shuffled` with an injected random source `cardNotes.test.ts:245`-`:271` | FULL |
| XUI-E2E-003 (card-note surfaces) | No optimistic UI under a delayed response | A second Save note press sends nothing `add-card-note.spec.ts:466`; while `delete-card-note` is out, both Confirm buttons are `aria-disabled` and Esc is ignored `edit-card-note.spec.ts:403`; while `edit-card-note` is out, Delete opens nothing `:443` | FULL |
| XUI-E2E-005 (card-note surfaces) | Empty states | "No card notes yet." on Book detail `add-card-note.spec.ts:158`; after deleting the only note `edit-card-note.spec.ts:357`; on the empty Card notes page `card-notes.spec.ts:309`; on the empty scoped view, with Add card note `:450`, `:472`; no search field and no pile without notes `:244`, `card-notes-pile.spec.ts:544`. API: `test_card_notes_view.py:138` | FULL |

### CRD-API-001, row by row

| Part of the scenario | add-card-note | edit-card-note | delete-card-note |
|---|---|---|---|
| Create, update, delete; only the named note changes | Stores `{id, text, pageStart, pageEnd, createdAt}` on that Book, ids distinct, nothing else changes `test_add_card_note.py:80` | Changes the note in place and nothing else `test_edit_card_note.py:258` | Removes only that note `test_edit_card_note.py:299` |
| Text required | Empty and whitespace-only → 422 "Note is required." `test_add_card_note.py:160`; outer whitespace trimmed, inner newlines kept `:80` | Same refusals `test_edit_card_note.py:228` | n/a |
| One page or one range, every form | 7 forms ("42", "42–45", "42-45", "42 – 45", "p.42", "pp. 42–45", "42–42" → 42 with `pageEnd: null`) `test_add_card_note.py:80` | Same 7 forms `test_edit_card_note.py:214` | n/a |
| In bounds | "0", "331", "42–400" → "Page must be between 1 and 330." `test_add_card_note.py:160` | Same `test_edit_card_note.py:228` | n/a |
| Low → high | "45–42" → "The first page must come before the last." | Same | n/a |
| One range only | "42–45, 50–52", "42, 50", "abc", "p.", "42 to" → "Use one page or one range." | Same | n/a |
| Both fields wrong | Note first, then Page, each named `test_add_card_note.py:160` | Same `test_edit_card_note.py:228` | n/a |
| Nothing saved on a refusal | `library.json` byte-identical after every refusal | Same | Same |
| TR8: faults, gone Book, malformed intent, contract | `test_add_card_note.py:203`; refusal order `:280`; strict JSON types `:306` | `test_edit_card_note.py:116`; refusal order `:326` | `test_edit_card_note.py:116`, `:326` |
| Parser unit | `test_note_pages.py:17`, `:46`, `:87` (shared by both intents) | | |
| Guard and bodies | `test_intent_routes.py` (all three routes) | | |
| Restore refuses what no intent can produce (item 49) | `test_invariants.py`, `test_restore.py` | | |

### BKP-API-001 full-data re-run, row by row

All rows are `test_full_data_round_trip.py:181`, seeded by `_seed_full` with `LibraryBuilder` (TC-1).

| Story 5.4 AC-7 clause | What the fixture holds or the test asserts | Status |
|---|---|---|
| Card notes | 9 notes in 5 Books: a range, two notes on p.96 a day apart, multi-line and non-ASCII text, a Spanish note, a note on a finished Book's last page | ✅ |
| A paused Reading | The Left Hand of Darkness, paused at p.60 and not Up next (Waiting for you) | ✅ |
| An Up next Book | Neuromancer, Up next and paused at p.80 | ✅ |
| Side reads | Three: The Dispossessed, Cien años de soledad and Emma | ✅ |
| Seeded with `LibraryBuilder` | `_seed_full` | ✅ |
| `library.json` byte-identical | `library_bytes(fresh) == library_bytes(source)` after the restore into an empty library | ✅ |
| Every cover byte-identical | A JPEG (Dune) and a transparent PNG (Piranesi): `covers_in(fresh) == covers` and `== covers_in(source)` | ✅ |
| Extra: it reads back | Home's Main book is Dune with `cardNoteCount` 5; the card-notes view holds all 9 notes | ✅ |
| Extra: idempotent | Restoring the same export again changes neither `library.json` nor the covers | ✅ |

### Error codes

TR7 requires an API test for every error code. `ErrorCode` (`backend/bookvie/intents/contract.py`) has 18 values, and Epic 5 added one, `card_note_not_found`. Its tests:

- edit and delete of a note that is gone while its Book is still there → 409 `card_note_not_found`, checked before the fields, nothing changes: `test_edit_card_note.py:116` (assertions at `:159`, `:169`);
- a note id from another Book is gone for this Book too: `:116`;
- a gone Book wins over a gone note: 409 `book_not_found` `:326`;
- documented in the OpenAPI enum: `test_contract.py:309`;
- in the browser: `edit-card-note.spec.ts:508`.

Epic 5's other refusals reuse existing codes, each tested on the card-note routes:

- `invalid_fields` (422): `test_add_card_note.py:160`, `test_edit_card_note.py:228`;
- `book_not_found` (409): `test_add_card_note.py:203`, `:280`;
- `couldnt_save` (503): `:203`, `test_edit_card_note.py:116`;
- `pages_below_card_note` (409): `test_edit_card_note.py:76`.

The 17 earlier codes were confirmed in the Epic 1-4 traces and are still green in the run above.

### Risks closed

| Risk | Score | Scenarios (test-design) | Evidence | Status |
|---|---|---|---|---|
| R-09 FR-1 edit consequences | 4 | CAT-API-002/004/005/006, CRD-API-001, CAT-E2E-007 | CRD-API-001 and CAT-API-006's card-note share are FULL above. CAT-API-002/004/005 and CAT-API-006's current-page share were FULL in Epic 1. CAT-E2E-007 was FULL across Epic 1 (Edit path) and Epic 4 (Mark finished path). The planned mitigation, "intent tests per consequence" (`test-design-architecture.md:112`), is in place for every Card note consequence: add, edit and delete each move the Pages floor, and each is tested | ✅ Closed |

### Coverage heuristics

- **Endpoints.** All four new Epic 5 routes have API tests:
  - `add-card-note`: `test_add_card_note.py`;
  - `edit-card-note` and `delete-card-note`: `test_edit_card_note.py`;
  - `GET /api/views/card-notes[?book=]`: `test_card_notes_view.py`, including its 404 `:154` and its OpenAPI entry `:170`.

  Home's new `cardNoteCount` is asserted in `test_full_data_round_trip.py:181` and in the browser (`card-notes.spec.ts:169`, `:427`). Gaps: 0.
- **Auth/authz negative paths.** All three card-note intent routes are in the foreign-caller matrix (`test_intent_routes.py`), and its completeness check keeps the table in step with the OpenAPI paths. Status: present.
- **Error paths.** Covered:
  - 422 `invalid_fields` for every Page refusal and an empty Note;
  - 409 `card_note_not_found`, `book_not_found` and `pages_below_card_note`;
  - 503 `couldnt_save` for every fault step on every card-note route (TR8);
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

This table maps each epics.md AC for stories 5.1-5.4, and the pile arrow-keys spec, to its evidence. Every AC has at least one passing test.

| Story · AC | Requirement (short) | Tests |
|---|---|---|
| 5.1 · 1 | Add card note opens the 360px index card; focus in Note; Page prefilled with the current page (at least 1), else empty | `add-card-note.spec.ts:88`, `:193`, `:342`, `:354`; `cardNotes.test.ts` (`notePrefill`) |
| 5.1 · 2 | Every Page form parsed on the server into `pageStart`/`pageEnd`; the AD-18 shape | CRD-API-001 rows; `test_add_card_note.py:80` |
| 5.1 · 3 | Bad Page or empty Note: nothing saved, the field's message with `aria-invalid`, announced in `alert` | `add-card-note.spec.ts:226`, `:429`; `test_add_card_note.py:160` |
| 5.1 · 4 | After a save: stay on the page, "Card note saved.", focus back on Add card note | `add-card-note.spec.ts:122`, `:193`, `:321` |
| 5.1 · 5 | Book detail's "Card notes (N)" shows the first three in page order; "No card notes yet." | `add-card-note.spec.ts:158`, `:396`; `test_add_card_note.py:126` |
| 5.1 · 6 | TR8 for add-card-note; couldn't save keeps the panel and the text | `test_add_card_note.py:203`; `add-card-note.spec.ts:274`, `:466`, `:495` |
| 5.2 · 1 | Edit opens "Edit card note" prefilled, with Delete; same parsing and validation | `edit-card-note.spec.ts:97`, `:263`, `:289`, `:312`, `:338`, `:443`; `test_edit_card_note.py:214`, `:228` |
| 5.2 · 2 | Delete stacks "Delete this card note?"; Cancel or Esc back to Delete; confirm closes both, focus to the next Edit, else the heading | `edit-card-note.spec.ts:154`, `:357`, `:379`, `:403`, `:472`, `:494`, `:548` |
| 5.2 · 3 | Couldn't save in the panel or the Confirm dialog | `edit-card-note.spec.ts:209` |
| 5.2 · 4 | Deleting the highest note lets Pages go down to the highest remaining, a range by `pageEnd` | CAT-API-006 row; `test_edit_card_note.py:76` |
| 5.2 · 5 | TR8 for edit-card-note and delete-card-note | `test_edit_card_note.py:116`, `:326`; `edit-card-note.spec.ts:508` |
| 5.3 · 1 | Top nav adds Card notes between Catalog and Backup; `h1` "Card notes" | `card-notes.spec.ts:103`, `:529` |
| 5.3 · 2 | Unscoped page: every note grouped under its serif Book title, page order, page ref and Edit; "No card notes yet." | `card-notes.spec.ts:309`, `:350`, `:482`; `test_card_notes_view.py:32`, `:96` |
| 5.3 · 3 | Search: case-insensitive, grouped, `<mark>`, "N notes match." after ~500 ms; no-match line; Esc clears | `card-notes.spec.ts:123`, `:387`, `:409`, `:639`, `:678`, `:711`, `:738` |
| 5.3 · 4 | "See card notes · 7" on the Main book card and "See all card notes" open the scoped view | `card-notes.spec.ts:169`, `:427` |
| 5.3 · 5 | Scoped view: only that Book, removable "In X" chip, scoped search, widen on clear; empty with Add card note | `card-notes.spec.ts:206`, `:450`, `:472`, `:497`, `:514`, `:521`; `test_card_notes_view.py:115`, `:138`, `:154` |
| 5.3 · 6 | Book detail's block search shows every match, not only three; absent without notes | `card-notes.spec.ts:244`, `:554`, `:767` |
| 5.4 · 1 | "Go through as a pile" opens "Card notes pile, X": one note, Close, Previous · N of M · Next, Order group | `card-notes-pile.spec.ts:99`, `:371`, `:391`, `:446`, `:544`, `:566`, `:590`, `:742`, `:780` |
| 5.4 · 2 | Next and Previous announce the note; ends `aria-disabled`, no wrap; one note disables both | `card-notes-pile.spec.ts:145` |
| 5.4 · 3 | Shuffled reshuffles once, "N of M" follows; Page order restores | `card-notes-pile.spec.ts:194`, `:425`; `cardNotes.test.ts:245` |
| 5.4 · 4 | A search result opens the pile in Page order at that note | `card-notes-pile.spec.ts:253`, `:611`, `:633`, `:835` |
| 5.4 · 5 | A note's page-ref chip "Open p.42 in the pile" opens the pile at that note; Edit stays separate | `card-notes-pile.spec.ts:284`, `:457` |
| 5.4 · 6 | Close or Esc returns to the list at the last viewed note, focus on its Edit, with the Book detail fallback; no search or editing | `card-notes-pile.spec.ts:319`, `:470`, `:682`, `:711`, `:856` |
| 5.4 · 7 | Export → restore with full data is byte-identical | BKP-API-001 rows above |
| Pile keys · 1-8 | Left and Right, Home and End, no wrap, radios keep their own arrows, modifiers ignored, `preventDefault`, `aria-keyshortcuts`, Shuffled order | `card-notes-pile-keys.spec.ts:73`, `:111`, `:144`, `:186`, `:223`, `:254`, `:278`, `:295`, `:383`, `:410`, `:455` |

### ATDD checklists

Each checklist's open (`[ ]`) lines, counted before and after this trace with `grep -cF '[ ]'`:

| Checklist | `[ ]` before | `[ ]` after | Note |
|---|---|---|---|
| `atdd-checklist-5-1-add-a-card-note-while-reading.md` | 0 | 0 | |
| `atdd-checklist-5-2-edit-or-delete-a-card-note.md` | 0 | 0 | |
| `atdd-checklist-5-3-find-a-note-across-all-my-books.md` | 0 | 0 | |
| `atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md` | 0 | 0 | |
| `atdd-checklist-pile-arrow-key-navigation.md` | 0 | 0 | |

Every line was ticked or retired by the stories' automate runs. No line is left open, so there is no checklist gap.

---

## Open risks (not coverage gaps)

These don't change the gate. Each one is already in `deferred-work.md` or in the retro.

- **Two untested layout details from item 48** (low): the Card notes page keeps a long note unclamped, and each card's Edit is pinned to the bottom of its cell in Book detail's grid. Both are in `deferred-work.md` (item 48's review).
- **bmad-code-review offers "Start the next story" after a pipeline spec reaches `done`** (low, process). This is in `deferred-work.md` (item 46's review).
- **Spine drift from item 49** (AD-18's Card note invariants) is in `deferred-work.md`. It is reconciled before Epic 6's first story, as AGENTS.md "Architecture spine" orders.
- **E5-R3**, decomposed accents split by the highlight, is accepted as cosmetic (retro open question 3).
- **Flaky specs.** None flaked in this run (508 of 508 passed on the first try). Item 51 fixed the one known flake: the Waiting for you one-shot row read, now verified by a 1740-run burn-in.

---

## Next actions

1. **Before Epic 6's first story:** reconcile item 49's "spine drift" entry (AD-18) and add its `resolved:` line.
2. **LOW:** add the two `[P2]` layout tests from item 48's review.
3. **LOW:** run `/bmad-testarch-test-review` on the Epic 5 suites.
4. Mark sprint item `epic-5-retro-item-50-…` done.

---

## Gate decision summary

```text
🚨 GATE DECISION: PASS

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (TR7 target: 95%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale:
P0 coverage is 100%, P1 coverage is 100% (TR7 target: 95%; workflow default 90%), and overall coverage is 100% (minimum: 80%). CRD-API-001 is green row by row, the BKP-API-001 full-data re-run is byte-identical row by row, and every error code, including card_note_not_found, has an API test. R-09 is closed.

⚠️ Critical Gaps: 0 (P0 criteria below FULL coverage)

📂 Full Report: _bmad-output/test-artifacts/traceability/epic-5-traceability-matrix.md

✅ GATE: PASS - Epic 5 meets TR7
```
