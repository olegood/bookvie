---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-10'
storyId: '5.2'
storyKey: '5-2-edit-or-delete-a-card-note'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-52-edit-or-delete-a-card-note'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-2-edit-or-delete-a-card-note.md'
generatedTestFiles:
  - 'backend/tests/test_edit_card_note.py'
  - 'frontend/e2e/edit-card-note.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 5 intro and gate; Story 5.2; Stories 5.1, 5.3 and 5.4 for scope; Conventions for every story: TR8, TR9)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-3 intents; AD-9 envelope, 409 targeting refusals, no-op; AD-18 cardNotes; AD-19 Targeting; Capability map FR-17 to FR-19)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card note panel → Edit mode; Confirm dialog; One level of stacking; Couldn''t save; Focus after close: Card note panel, Confirm Delete card note; Book detail → Card notes block)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Card note panel: edit mode adds Delete button-secondary at the left)'
  - '_bmad-output/planning-artifacts/implementation-readiness.md (row 9a: the Delete-note Confirm stack is allowed)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CRD-API-001, R-09, XUI-E2E-001)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (5-1 done; 5-2 backlog)'
  - '_bmad-output/implementation-artifacts/deferred-work.md (5.1 spine drift entries; cardNoteId kept for 5.2)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md (format and conventions)'
  - 'backend/bookvie/intents/add_card_note.py, delete_book.py, edit_book.py (_check_pages_floors), contract.py (ErrorCode, OkResponse)'
  - 'backend/tests/test_add_card_note.py, helpers.py, builder.py (card_note, from_partial)'
  - 'frontend/e2e/add-card-note.spec.ts, delete-book.spec.ts, fixtures.ts, home.ts, intents.ts; frontend/src/components/CardNotePanel.tsx; frontend/src/pages/BookDetailPage.tsx (CardNotesBlock)'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Card note shown on Book detail, when I press its Edit, then the panel opens as "Edit card note", prefilled, with Delete added at the left; and Save note runs edit-card-note with the same parsing and validation as Story 5.1' }
  - { id: AC-2, idSource: generated, text: 'Given the edit panel, when I press Delete, then an alertdialog asks "Delete this card note?" with Delete card note and Cancel (Cancel has default focus), stacked over the Edit card note panel (one of the two allowed stacks); and Cancel or Esc closes only the Confirm dialog and returns to the panel with focus on Delete; and confirming runs delete-card-note, closes both the dialog and the panel, and focus moves to the next note''s Edit, else the block heading' }
  - { id: AC-3, idSource: generated, text: 'Given a server that answers couldnt_save (a routed 503 in e2e), when I press Save note in the Edit card note panel, or Delete card note in the Confirm dialog, then the panel or dialog stays open with every value kept, and "Couldn''t save. Your data wasn''t changed." appears in an alert line inside it, above its buttons, and nothing changes (TR9)' }
  - { id: AC-4, idSource: generated, text: 'Given the Card note on page 270 is the Book''s highest Card note page, when it is deleted, then the Pages-below rule from Story 1.11 allows lowering Pages to the highest remaining Card note page, where a range counts by its pageEnd when present, else its pageStart' }
  - { id: AC-5, idSource: generated, text: 'The standard intent ACs (TR8) hold for edit-card-note and delete-card-note' }
---

# ATDD Checklist - Epic 5, Story 5.2: Edit or delete a card note

**Date:** 2026-11-10
**Author:** Oleg
**Primary test levels:** API (pytest: the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to fix or remove a Card note, so that my notes stay accurate.

5.1 shipped `add-card-note`, the Card note panel and Book detail's "Card notes (N)" block. The block's notes have no Edit yet, and nothing changes or removes a note.

**What 5.2 adds:**
- **The `edit-card-note` intent:** `{"bookId", "cardNoteId", "text", "page"}`, with the same Page parsing and the same refusals as `add-card-note`. It changes the note in place, keeping its `id` and `createdAt`.
- **The `delete-card-note` intent:** `{"bookId", "cardNoteId"}`. It removes that one note.
- **A new 409 `card_note_not_found`** for a note that is gone while its Book is still there.
- **Each note in the block gets an Edit**, which opens the Card note panel in edit mode: "Edit card note", prefilled, with **Delete** at the left.
- **The Delete card note Confirm dialog**, stacked over the panel.
- **The couldn't-save line** inside the panel and inside the dialog.

**Not in 5.2:**
- the Card notes page and its Edit on each note (5.3). EXPERIENCE.md says the Card notes list opens the same edit mode, so 5.3 reuses this panel;
- the pile, and page refs as buttons (5.4).

**Story source:** `epics.md` → Story 5.2. There is no spec file yet: `sprint-status.yaml` has `5-2-edit-or-delete-a-card-note: backlog`.
- When `spec-5-2-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is not the epic's first or last story. 5.1 is `done`, so the pipeline continues with `bmad-build-auto`.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 5.1.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the Edit buttons and the edit panel don't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins. The one exception is a note's Edit, matched as `/^Edit\b/` inside its list item (see the assumptions below).

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run used **sequential** with one author, as in Stories 1.6 to 5.1, so the seeds stay consistent across both halves.

### Decisions taken with Oleg (2026-11-10)

- **A gone note is a new 409 `card_note_not_found`** (kind `refusal`), for both intents. This follows AD-9 Targeting: a target that is gone is refused, never applied. The checks run in this order: `book_not_found`, then `card_note_not_found`, then the fields. A note id that belongs to another Book counts as gone. TR8 requires an API test for the new code, and AC-5 has one.
- **An unchanged edit commits as normal.** It is a 200 that rewrites the same document, as `edit-book` does. There is no AD-9 no-op.

### Before the leaves: what today's code already does

- **`edit-book`'s Pages floor already counts a range by its `pageEnd`** (`_check_pages_floors` in `intents/edit_book.py`). So AC-4 needs only a working `delete-card-note`, and no change to `edit-book`.
- **The add parser and its copy are reusable:** `parse_note_pages`, `CARD_NOTE_LABELS` and `NOTE_REQUIRED_MESSAGE` in `intents/add_card_note.py`. Edit should share them, not copy them.
- **`CardNotePanel`** has one mode: it calls `useAddCardNote`, the heading is "Card note", and the fields start empty except for Page. Edit mode needs a heading prop, initial Note text, a Delete slot at the left, and a save function chosen by mode.
- **`useAlertDialog`** already serves the Delete book and Pause Confirm dialogs, with their couldn't-save line inside, above the buttons. The stacked dialog must keep the panel open beneath it, and Esc must close only the top one.
- **`CardNotesBlock` renders the notes but has no focus target:** no Edit, and a heading without `tabIndex={-1}`.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-5, one per Given/When/Then block in source order, with the trailing TR8 line as AC-5. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | A note's Edit opens "Edit card note", prefilled, with Delete at the left; Save note runs `edit-card-note` | E2E | P0 | `[P0] AC-1` |
| AC-2 | Delete stacks "Delete this card note?"; Cancel or Esc goes back to Delete; confirming closes both and focuses the next Edit | E2E | P0 | `[P0] AC-2` |
| AC-3 | A routed 503 keeps the panel, then the dialog, open with "Couldn't save." inside, above the buttons | E2E | P1 | `[P1] AC-3` |
| AC-4 | Deleting the p.270 note lets Pages go down to the highest remaining note page (a range counts by `pageEnd`) | API | P1 | `test_ac4_p1_…` |
| AC-5 | TR8 for both intents, plus `card_note_not_found` | API | P0 | `test_ac5_p0_…` |

**Priorities:**
- **P0:**
  - AC-1 and AC-2 are the only ways to change or remove a note. Delete loses data, and the stacked dialog is a focus trap that is easy to get wrong.
  - AC-5 is TR8, P0 in every intent story so far. It also carries the new error code.
- **P1:**
  - AC-3 is TR9 / XUI-E2E-001, P1 in 5.1 too.
  - AC-4 is R-09 (FR-1 edit consequences). It is P1 because today's `edit-book` already computes the floor from whatever notes remain; only the delete is new.

**Level split (no duplicate coverage):**
- **API** proves what only the server decides:
  - the floor after a delete;
  - TR8 for both intents: faults, `book_not_found`, `card_note_not_found`, a malformed intent, the invariants, OpenAPI;
  - that a success touches only the named note.
- **E2E** proves:
  - the opener in the block, and the panel's heading, prefill and Delete position;
  - the request bodies as sent;
  - the stack, its default focus, Cancel and Esc, and focus after a delete;
  - the couldn't-save line's place, and that values are kept.

**Secondary branches (green-phase follow-ups, not separate red leaves):**
- `edit-card-note`'s parsing and refusals, one by one (the CRD-API-001 half of AC-1);
- focus on the block heading when the deleted note was the last one shown;
- the Book detail stale-tab cases.

The full list is under "Green-phase follow-ups" below.

---

## Story Integration Metadata

- **Story ID:** `5.2`
- **Story Key:** `5-2-edit-or-delete-a-card-note`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 5.2)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-5-2-edit-or-delete-a-card-note.md`
- **Generated Test Files:** `backend/tests/test_edit_card_note.py`, `frontend/e2e/edit-card-note.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 5 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 5 fail on their criterion assertion, as listed below. Every setup step ran cleanly first: the seeds, the server start and Book detail's block.

**Skipped as committed:**
- `pytest tests/test_edit_card_note.py` gives 2 skipped.
- `playwright test e2e/edit-card-note.spec.ts` gives 3 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `oxlint` and `tsc -b` pass.

### API Tests (2 tests): `backend/tests/test_edit_card_note.py`

**`[P1] AC-4`: `test_ac4_p1_deleting_the_highest_card_note_lets_pages_go_down_to_the_highest_remaining`**

**Seed:** Dune, 412 pages, with notes at p.19, pp.200–230 and p.270. The floor is 270 before the delete.
1. `delete-card-note` for the p.270 note. Its answer is left opaque: this is the transition.
2. **`edit-book` with Pages "230" answers 200** (the first assertion). The stored Pages is 230, and the two other notes are kept.
3. Pages "229" is 409 `pages_below_card_note`, with "Pages can't be less than 230, where a card note is." on `pages`, and the file is byte-identical. The range counts by its `pageEnd`.

*Red today: `assert 409 == 200`. There is no route, so the floor is still 270.*

**`[P0] AC-5`: `test_ac5_p0_edit_and_delete_card_note_meet_the_standard_intent_acs`**

**Seed:** Dune with two notes (p.19, p.96), and Neuromancer with one note.
1. **An `edit-card-note` `write` fault answers 503** (the first assertion). Then a `write`, `fsync` and `replace` fault for each intent: each body is `COULDNT_SAVE_BODY`, and the file is byte-identical.
2. A gone Book gets 409 `book_not_found` from both intents, and nothing changes.
3. **The new code:** a gone note id gets 409 `card_note_not_found` (kind `refusal`) with a message and no `fields`, from both intents. This is checked before the fields: the edit sends an empty Note and Page "400". Neuromancer's note id, sent for Dune, gets the same refusal. Nothing changes.
4. A malformed `intent` gets 422 `invalid_fields` on both routes.
5. **Successes** answer exactly `{"ok": true}`, and the invariants hold after each. After the edit and the delete of p.96, only the p.19 note is left.
6. **OpenAPI:** both routes document 409, 422, 500 and 503 with `ErrorResponse`, and no 413. `card_note_not_found` is in the `ErrorCode` enum.

*Red today: `assert 405 == 503` (write).*

### E2E Tests (3 tests): `frontend/e2e/edit-card-note.spec.ts`

**Seed** (the spec's own, plus `DUNE` from `e2e/home.ts`):
- `DUNE_WITH_NOTES`: Dune with four notes, seeded out of page order, with fixed ids: p.300, p.12, p.96 and pp.42–45.
- The p.96 note also has a fixed `createdAt`.
- The block shows p.12, pp.42–45 and p.96.

**`[P0] AC-1` edit and Save note** (line 98)
1. **The p.96 note in the "Card notes (4)" block has a button whose name starts with "Edit"** (the first assertion: the criterion's opener).
2. Click → a `dialog` named "Edit card note". Note reads "The spice must flow." and Page reads "96". **Delete** sits left of **Cancel** and **Save note**.
3. Fill a new Note and Page "pp. 97–98", then **Save note**.
4. `status` reads "Card note saved.", and the panel is hidden. The edited note's Edit has focus, and it shows "pp.97–98".
5. **The request:** one `edit-card-note` with `{bookId, cardNoteId, text, page: "pp. 97–98"}`.
6. **The stored note:** the same id and `createdAt`, the new text, and pages 97–98. There are still 4 notes.

*Red today: no Edit in the note.*

**`[P0] AC-2` the Delete stack** (line 155)
1. **The pp.42–45 note has its Edit** (the first assertion). Open it, then press **Delete**.
2. An `alertdialog` "Delete this card note?" shows over the still-visible panel. It has **Delete card note** and **Cancel**, and **Cancel** has focus.
3. **Cancel** → the dialog is hidden, the panel stays, and **Delete** has focus. **Esc** does the same. Nothing was sent.
4. **Delete card note** → both close, and the block reads "Card notes (3)". Focus is on the p.96 note's Edit, the next note.
5. One `delete-card-note` was sent, with `{bookId, cardNoteId}`. The three other ids are stored.

*Red today: no Edit in the note.*

**`[P1] AC-3` couldn't save, panel then dialog** (line 210; both routes fulfilled with 503)
1. **The p.96 note has its Edit** (the first assertion).
2. Change Note and Page, then **Save note**. "Couldn't save. Your data wasn't changed." shows inside the panel, above **Save note** and **Delete**, and in `alert`. The panel stays open with both values kept. `status` is empty, and the file is byte-identical.
3. **Delete**, then **Delete card note**. The same line shows inside the dialog, above **Delete card note**. The dialog and the panel stay open, the values are kept, `status` is empty, and the file is byte-identical.

*Red today: no Edit in the note.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

- **None changed.**
- **`EDIT_CARD_NOTE` and `DELETE_CARD_NOTE`** are local to both files. Add them to `e2e/intents.ts` and `backend/tests/helpers.py` with the implementation, then import them in both files.

## Mock Requirements

AC-3 fulfills both routes with 503 `couldnt_save` through `page.route` (TR9). The other leaves use none.

## Required data-testid Attributes

None. Every locator is a role plus an accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The intent** `POST /api/intents/edit-card-note`:
- **The request** is multipart, with a JSON part `intent` = `{"bookId": "<id>", "cardNoteId": "<id>", "text": "<note>", "page": "<Page as typed>"}`.
- **A success** answers `{"ok": true}` (no `ids`: nothing is minted). In one commit it replaces that note's `text`, `pageStart` and `pageEnd`. Its `id` and `createdAt` are kept, and nothing else changes. The text is trimmed as `add-card-note` trims it.
- **The checks, in order, inside the commit:**
  1. a missing Book: 409 `book_not_found`;
  2. no note with that id on that Book: 409 `card_note_not_found`;
  3. 422 `invalid_fields` exactly as `add-card-note` does: `text` (Note) before `page` (Page), with the same parser and copy.
- **A malformed `intent`** gets 422 `invalid_fields` on `intent`.

**The intent** `POST /api/intents/delete-card-note`:
- **The request** is `{"bookId": "<id>", "cardNoteId": "<id>"}`.
- **A success** answers `{"ok": true}`. In one commit it removes that note from the Book's `cardNotes`, and nothing else changes.
- **The checks:** `book_not_found`, then `card_note_not_found`.

**For both intents:**
- **A new `ErrorCode.CARD_NOTE_NOT_FOUND = "card_note_not_found"`** (409, kind `refusal`, no `fields`). The copy is the spec's to choose, in the voice of "This book isn't in your catalog anymore." Suggested: "This card note isn't there anymore.".
- **OpenAPI** documents 409, 422, 500 and 503 with `ErrorResponse`, and no 413.

**The block:** each note in "Card notes (N)" is a `listitem` that holds a `button` whose accessible name starts with "Edit".

**The edit panel:**
- **The same Card note panel**, as a modal `dialog` named "Edit card note".
- **Prefilled:** Note holds the note's text. Page holds "96" for one page, or "42–45" with an en dash for a range, which the parser reads back unchanged.
- **The buttons:** **Delete** (`button-secondary`) at the left, then **Cancel** and **Save note**.
- **After a save:** the panel closes, focus goes to that note's Edit, then `status` reads "Card note saved.".

**The Confirm dialog:**
- **An `alertdialog` named "Delete this card note?"**, with **Delete card note** and **Cancel**. **Cancel** has focus on open.
- **It is stacked** over the edit panel, which stays open beneath it.
- **Cancel or Esc** close only the dialog, and focus goes to the panel's **Delete**.
- **Delete card note** closes both. Focus goes to the next note's Edit in the block, else to the block's heading "Card notes (N)", which needs `tabIndex={-1}`.

**Couldn't save:** the line "Couldn't save. Your data wasn't changed." goes inside the panel or the dialog, above its buttons, and in `alert`. The surface stays open with every value kept, and `status` stays empty.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `backend/tests/test_intent_routes.py` | Add `edit-card-note` and `delete-card-note` to `INTENT_ROUTES`. |
| `backend/tests/test_contract.py` | Add both paths to the envelope `operations` and the coverless list, and `card_note_not_found` to the `ErrorCode` list in `test_openapi_error_enums` (around line 289). |
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen`. |
| `frontend/e2e/add-card-note.spec.ts` | `[P1] AC-5` counts 3 list items in the block. Each now holds an Edit, so re-run it; it still holds. Any axe leaf on the block sees the new buttons. |
| `frontend/e2e/library.ts` (`openEdit`), `book-detail.spec.ts`, `finish-any-book.spec.ts`, `start-reading.spec.ts` | They find Book detail's own **Edit** with `getByRole('main').getByRole('button', { name: 'Edit', exact: true })`. If a note's Edit is named exactly "Edit", that locator matches more than one button on any Book with notes. Naming the note's button "Edit p.19" avoids this; otherwise those locators need scoping. |

## Assumptions for the spec to confirm

- **A note's Edit has an accessible name that starts with "Edit"**: "Edit p.96" is recommended, so it differs from the Book's own **Edit** and from the other notes' buttons (WCAG 2.4.6 / 2.4.9). The scaffolds match `/^Edit\b/` inside the note's list item, so either choice passes.
- **The edit panel's opening focus** is in Note, as in add mode. It isn't asserted, because the criterion doesn't say.
- **"Card note saved."** is the outcome line after an edit. EXPERIENCE.md → Card note panel says Save note announces it, with no mode named.
- **A delete announces nothing new.** The criteria and EXPERIENCE.md name no line. If the spec adds one ("Card note deleted."), AC-2 needs a follow-up.
- **"The next note"** means the next one in the block's order after the delete. If the deleted note was the third shown and a fourth exists, the fourth moves in and is "next".
- **The Page prefill for a range** is "42–45" with an en dash, not "pp.42–45".
- **A stale edit panel** (the note was deleted in another tab) shows the `card_note_not_found` message inside the panel, with the values kept, as 5.1's stale tab does for `book_not_found`.

## Open items that bear on this story

- **CRD-API-001** ("Card note CRUD") is complete once AC-5 and the edit refusal follow-up are green. Tick it in the trace.
- **XUI-E2E-001** gains the edit panel and the Delete card note dialog through AC-3.
- **R-09:** AC-4 shows the floor following deletes.
- **Spine drift to expect:**
  - AD-9's 409 targeting list doesn't name `card_note_not_found`.
  - The Structural Seed's `intents/` line doesn't list `edit_card_note` / `delete_card_note`.

  Defer both as "spine drift" in the story, as AGENTS.md says.
- **5.1's deferred `cardNoteId` entry** names "Story 5.2's edit" as an expected reader of `ids.cardNoteId`. The edit reads note ids from Book detail's `cardNotes`, not from the add response. Say so when that drift entry is reconciled.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_card_note.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/edit-card-note.spec.ts -g "AC-1"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-4, AC-5: the intents
- [ ] `intents/contract.py`: `ErrorCode.CARD_NOTE_NOT_FOUND` and a `card_note_not_found()` refusal (409) with its copy.
- [ ] `intents/edit_card_note.py`: `EditCardNoteIntent` (`book_id`, `card_note_id`, `text`, `page`), `parse_edit_card_note_intent`, and `edit_card_note(store, intent)`. Share the field checks with `add_card_note` instead of copying them. Check `book_not_found`, then `card_note_not_found`, then the fields.
- [ ] `intents/delete_card_note.py`: `DeleteCardNoteIntent` (`book_id`, `card_note_id`) and `delete_card_note(store, intent)`.
- [ ] `http/api.py`: `POST /intents/edit-card-note` and `POST /intents/delete-card-note`, each answering `OkResponse(ok=True)`. Export them from `intents/__init__.py`, then run `npm --prefix frontend run api:gen`.
- [ ] Update `test_intent_routes.py` and `test_contract.py` (table above). Move `EDIT_CARD_NOTE` / `DELETE_CARD_NOTE` into `tests/helpers.py`.
- [ ] Activate AC-4 and AC-5.

### AC-1: the edit panel
- [ ] `api/`: `useEditCardNote` and `useDeleteCardNote` mutations.
- [ ] `CardNotePanel`: an edit mode with the heading "Edit card note", Note and Page prefilled from the note (`pageRef` without the "p." / "pp." prefix), and **Delete** at the left. Save note sends `edit-card-note`.
- [ ] `CardNotesBlock`: an Edit button on each note (name "Edit p.96" recommended). It opens the panel, and after a save the focus returns to it before "Card note saved." is announced (reuse `useCardNoteFlow`).
- [ ] Activate AC-1.

### AC-2: the Delete stack
- [ ] The "Delete this card note?" `alertdialog`, opened from the panel's **Delete**. It stacks over the panel, which stays open, and **Cancel** has default focus. Cancel or Esc close only the dialog, and focus goes back to **Delete**.
- [ ] **Delete card note** sends `delete-card-note`. After the refetch, close both, then focus the next note's Edit, else the block heading (`tabIndex={-1}`).
- [ ] Activate AC-2.

### AC-3: couldn't save
- [ ] On a 503, the panel shows its existing couldn't-save line above the buttons. The dialog uses `useAlertDialog`'s in-dialog line, as Delete book does. Neither closes, and the values are kept.
- [ ] Activate AC-3.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-1, CRD-API-001:** `edit-card-note` parses every Page form in 5.1's `PAGE_FORMS` and refuses every case in `PAGE_REFUSALS`, an empty Note, and both at once ("Not saved. 2 fields need attention: Note, Page."). On a refusal the file is byte-identical. Reuse 5.1's tables by importing them.
- [ ] **AC-1, the edit in place:** the note keeps its position in `cardNotes` and its `id` and `createdAt`; the other notes and the Book are unchanged; the outer whitespace is trimmed.
- [ ] **AC-1, a refusal in the panel:** Page "400" shows "Page must be between 1 and 412." under Page with `aria-invalid`, nothing is saved, and the panel stays open.
- [ ] **AC-1, a range prefill:** editing the pp.42–45 note prefills Page "42–45". Saving it unchanged sends "42–45" and stores the same pages.
- [ ] **AC-1, Cancel and Esc** in the edit panel send nothing, and focus returns to that note's Edit.
- [ ] **AC-1, a re-ordering edit:** moving a note from p.96 to p.400 takes it out of the first three. Focus then needs a target: the block heading, as after a delete. Confirm this with the spec.
- [ ] **AC-2, the last note shown:** deleting the third shown note when only three exist moves focus to the "Card notes (2)" heading. Deleting the only note leaves "No card notes yet." with focus on the heading.
- [ ] **AC-2, `delete-card-note` server side:** only that note goes; the other notes, the Book and the other Books are unchanged; the invariants hold.
- [ ] **AC-2, the Tab cycle** stays inside the Confirm dialog while it is open, and inside the panel once it closes.
- [ ] **AC-2, in flight:** **Delete card note** is `aria-disabled` while the request is out, a second press sends nothing, and Esc is ignored.
- [ ] **AC-5, a stale tab:** the note was deleted in another tab, so Save note or Delete card note gets `card_note_not_found`. The message shows inside the panel or the dialog, and nothing on screen claims a change.
- [ ] **AC-5, refusal order:** a gone Book with a gone note and bad fields is `book_not_found`; a gone note with bad fields is `card_note_not_found` (covered in the AC-5 leaf; add a P2 split if it grows).
- [ ] **XUI-E2E-001:** add the edit panel and the Delete card note dialog to any shared couldn't-save sweep.
- [ ] **axe** on the open edit panel and on the stacked Confirm dialog, in both themes.
