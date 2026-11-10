---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: '5.2'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-5-2-edit-or-delete-a-card-note.md (Boundaries, I/O matrix, Review Triage Log, code review findings)
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/test-artifacts/atdd-checklist-5-2-edit-or-delete-a-card-note.md
  - _bmad-output/test-artifacts/test-design-qa.md (CRD-API-001, XUI-E2E-001, R-09)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts, backend/tests/conftest.py
  - backend/tests/test_edit_card_note.py, test_add_card_note.py, helpers.py; frontend/e2e/edit-card-note.spec.ts, add-card-note.spec.ts; frontend/src/lib/cardNotes.test.ts, src/api/books.test.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 5.2 Edit or delete a card note

This file used to hold the summary for Story 5.1, which is in git history (`94c51b3`).

## Preflight

- **Stack:** `fullstack` (auto-detected). Frontend: Playwright (`frontend/playwright.config.ts`) plus `node --test` unit tests. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-integrated. Story 5.2 is `done` in `sprint-status.yaml` after bmad-code-review (`8fd62d7`, with spec corrections in `a91c5f3`).
- **Flags:** `tea_use_playwright_utils: false`, so the traditional fixture and network patterns apply (the project's `e2e/fixtures.ts`, `page.route`). `tea_use_pactjs_utils: false`, and there is no contract testing. `tea_browser_automation: auto`.
- **Knowledge loaded:** test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, test-quality, fixture-architecture, network-first, playwright-cli.
- **Existing 5.2 coverage:**
  - **API:** `test_edit_card_note.py` covers AC-4, AC-5 (TR8 and `card_note_not_found`), every page form and refusal, the edit in place and the delete of one note.
  - **E2E:** `edit-card-note.spec.ts` has 15 leaves: AC-1 to AC-3, a refused Page, the range prefill, Cancel and Esc, a move out of the first three, the last note and the only note deleted, the in-flight states of the save and the delete, a delete whose refetch fails, a stale tab, and axe.
  - **Unit:** `cardNotes.test.ts` covers `pageField`, `editNoteName` and `noteAfterDelete`; `books.test.ts` covers the two clients.

## Coverage Plan

**Browser exploration:** skipped. `playwright-cli` isn't installed, and the 15 e2e leaves already drive every 5.2 surface: the note's Edit, the edit panel and the stacked Confirm. The targets come from the code and the ATDD checklist.

**Source and API analysis:**
- `edit-card-note` and `delete-card-note` (`backend/bookvie/intents/`, `http/api.py`) are covered for TR8, the refusal order with a gone note, parsing, the edit in place and the delete of one note.
- R-09 is covered only by a delete lowering the floor.

**Gaps and targets (selective scope: only the gaps the ATDD checklist and both reviews left open; no duplicate coverage):**

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| G1 | While the Confirm is open, Tab and Shift+Tab stay inside it (Delete card note ↔ Cancel). After Cancel, Tab cycles inside the panel again. | E2E | P2 | ATDD AC-2 follow-up. The stack is the story's only new modal behaviour, and both reviews flagged it as untested. |
| G2 | Refusal order: a gone Book with a gone note id and bad fields → `book_not_found`, from both intents | API | P2 | ATDD AC-5 follow-up. The AC-5 leaf sends a gone Book only with a real note id and valid fields. |
| G3 | R-09: editing the highest note down, or turning a range into a single page, lowers `edit-book`'s Pages floor to the new highest note page | API | P2 | Raised by both reviews. The floor is the second way FR-17 changes Pages, and only a delete pins it today. |
| G4 | `deleteCardNote` passes a 409 `card_note_not_found` through as a `refusal` | Unit | P3 | Matches `editCardNote`'s existing case; it is the one new client without a refusal case. |

**Not automated:**
- XUI-E2E-001's "shared couldn't-save sweep": there is no shared sweep in `frontend/e2e`. AC-3 already pins the 503 line in both surfaces.
- An e2e that deletes a note and then lowers Pages in the Edit book panel: the floor is server-side (G3 and AC-4), and 1.11's e2e pins the panel's refusal.

## Execution

- **Mode:** `tea_execution_mode: auto`, with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** zero tests. The repo has no Playwright API layer; its API tests run in pytest through `TestClient`. G2 and G3 went to 3B-backend.
  - **3B-backend:** G2 and G3.
  - **3B-e2e:** G1 and G4.
- **Fixtures:** none needed. The workers reuse the spec's own helpers, `tests/helpers.py` and `e2e/fixtures.ts`.

## Tests Added

**API** (`backend/tests/test_edit_card_note.py`): 3 tests.
- `[P2]` `test_refusal_order_p2_a_gone_book_is_refused_before_its_note_and_fields` (:326):
  - `edit-card-note` with a gone Book, a gone note and bad fields gets 409 `book_not_found` with no `fields`.
  - `delete-card-note` with a gone Book and a gone note gets the same.
  - The file stays byte-identical.
- `[P2]` `test_r09_p2_editing_the_highest_note_down_lowers_the_pages_floor` (:368): editing p.270 to "20" moves the floor to 20. Pages 20 saves; 19 gets 409 `pages_below_card_note` with "Pages can't be less than 20, where a card note is." and the file unchanged.
- `[P2]` `test_r09_p2_editing_a_range_to_a_single_page_counts_its_new_page` (:384): editing pp.200–230 to "200" stores (200, null), and the floor becomes 200.

**E2E** (`frontend/e2e/edit-card-note.spec.ts`): 1 test.
- `[P2]` "AC-2 Tab stays inside the stacked Confirm, then inside the panel once it closes" (:548):
  - **In the Confirm:** Tab and Shift+Tab alternate between Delete card note and Cancel, and never reach Note, Page, Delete, Save note or the panel's Cancel.
  - **After the Confirm's Cancel:** focus is on the panel's Delete, and both directions cycle through Note, Page, Delete, Save note and Cancel, with wrap.
  - It passed `--repeat-each=5`.

**Unit** (`frontend/src/api/books.test.ts`): 1 test.
- `[P3]` `deleteCardNote` passes a 409 `card_note_not_found` through as a `refusal` (:616).

**Totals:** 5 tests (4 P2, 1 P3). `edit-card-note.spec.ts` now has 16 tests and `test_edit_card_note.py` has 9.

**Defects found:** none. Every new test passed against the code as reviewed.

## Validation

- **`TZ=Europe/Madrid npm run check`: exit 0.**
  - pytest: 1310 passed. The coverage gates hold: domain 100.00%, intents+store 98.06%.
  - Unit: 260 passed.
  - e2e: 447 passed.
  - ruff, Prettier, oxlint, `tsc` and the `api:gen` byte check are all clean.
- **Quality checklist:**
  - No hard waits; the e2e waits on focus and visibility.
  - No conditionals.
  - Explicit assertions in the test bodies.
  - Every assertion can fail.
  - Seeded through `LibraryBuilder` and `seededServer`.
  - Parallel-safe, since each test has its own data folder.
  - No `.only` or skips.
- **No CLI sessions were opened.** The workers' JSON outputs are in this session's scratchpad, not in the repo.

## ATDD Checklist

`atdd-checklist-5-2-edit-or-delete-a-card-note.md`:
- 28 lines ticked, with evidence from this run and the build and review runs.
- 1 line retired: XUI-E2E-001's shared couldn't-save sweep. No such sweep exists, and AC-3 pins both surfaces.
- **Remaining `[ ]`: 0.**

## Assumptions and Risks

- The "last note shown" follow-up was written as "the third of three → 'Card notes (2)'". The tests prove the same rule with "last of two → 'Card notes (1)'" (:379) and "the only note" (:357); the rule doesn't depend on the count.
- `waiting-for-you.spec.ts` AC-6 failed once during the build, and it passed in every run since. Watch it at the next CI burn-in.

## Next

5.2's pipeline is complete: ATDD, build, code review, automate. Next is Story 5.3 (`bmad-testarch-atdd`), which is not the end of an epic.
