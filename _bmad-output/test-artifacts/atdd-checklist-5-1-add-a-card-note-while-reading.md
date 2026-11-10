---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-10'
storyId: '5.1'
storyKey: '5-1-add-a-card-note-while-reading'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-51-add-a-card-note-while-reading'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md'
generatedTestFiles:
  - 'backend/tests/test_add_card_note.py'
  - 'frontend/e2e/add-card-note.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 5 intro and gate; Story 5.1; Stories 5.2 to 5.4 for scope; Conventions for every story: TR8)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-18: cardNotes[] shape, unique note ids, note pages within the page count; AD-9 envelope; Capability map FR-17 to FR-19: intents/*_card_note)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card note panel; Book detail actions and Card notes block; Main book card; Validation messages (other forms); Couldn''t save; Focus after close; Flow 6)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Card note panel: 360px index card; Card notes list: page ref in meta)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CRD-API-001 P1, CRD-E2E-001 P1, XUI-E2E-001, R-09)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-5 backlog; 5-1 backlog; epic 4 retro items done)'
  - '_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md (format and conventions)'
  - 'backend/bookvie/domain/model.py (CardNote), domain/invariants.py (card_note_pages_in_range, unique_card_note_ids), intents/contract.py, intents/set_up_next.py, views/models.py (BookDetailView)'
  - 'backend/tests/test_set_up_next.py, helpers.py (FaultyFs, RecordingFs, api_client, stored_book), builder.py (card_note)'
  - 'frontend/e2e/set-up-next.spec.ts, fixtures.ts (seededServer), home.ts (mainAt, mainBookCard, storedBook), intents.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Main book card or any Book detail, when I press Add card note, then a small modal styled as an index card (360px) opens, headed "Card note", with Note (multi-line, required) and Page, plus Save note and Cancel (UX-DR47), with focus starting in Note; and Page is prefilled with the Book''s current page (at least 1), or empty when the Book has no Reading' }
  - { id: AC-2, idSource: generated, text: 'Given a Page value of "42", "42–45", "42-45", "42 – 45", "p.42" or "pp. 42–45", when I press Save note, then add-card-note parses it on the server into pageStart and pageEnd ("42–42" is stored as 42 with pageEnd: null) and stores { id, text, pageStart, pageEnd, createdAt } on that Book (AD-18, FR-17)' }
  - { id: AC-3, idSource: generated, text: 'Given a page outside 1 to the Book''s page count, a reversed range, or more than one range, when I press Save note, then nothing is saved, and the field shows "Page must be between 1 and 330.", "The first page must come before the last." or "Use one page or one range." with aria-invalid, the message also announced in the alert region (CRD-API-001); and a Note that is empty or only whitespace is refused with "Note is required."' }
  - { id: AC-4, idSource: generated, text: 'Given a successful save, when the panel closes, then I stay on the page I was on, the status region reads "Card note saved.", and focus returns to Add card note' }
  - { id: AC-5, idSource: generated, text: 'Given Book detail, when the Book has Card notes, then a "Card notes (N)" block shows the first three notes in page order, each as a card with its text and "p.42" or "pp.42–45" below in meta / ink-tertiary; and with no notes it reads "No card notes yet." (UX-DR49)' }
  - { id: AC-6, idSource: generated, text: 'The standard intent ACs (TR8) hold for add-card-note, and a couldn''t-save keeps the panel open with the text kept' }
---

# ATDD Checklist - Epic 5, Story 5.1: Add a card note while reading

**Date:** 2026-11-10
**Author:** Oleg
**Primary test levels:** API (pytest: the app through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to jot down a quote or thought with the page it came from, from Home or any Book's page, so that I keep what a book gave me without leaving what I was doing.

The document already has room for notes: each Book has `cardNotes[]` (AD-18), and the invariants check note ids and pages. Nothing writes a note or shows one yet.

**What 5.1 adds:**
- **The `add-card-note` intent:** `{"bookId", "text", "page"}`, with Page sent as typed. The server parses it into `pageStart` and `pageEnd`, and stores `{id, text, pageStart, pageEnd, createdAt}` on that Book.
- **Its refusals:** 422 `invalid_fields` on `page` (out of range, reversed, more than one range, not a page, empty) and on `text` (empty or whitespace).
- **The Card note panel:** a 360px index-card modal headed "Card note", opened by **Add card note** on the Main book card and on every Book detail.
- **The outcome:** the panel closes, the user stays put, focus goes back to **Add card note**, then `status` reads "Card note saved.".
- **Book detail's "Card notes (N)" block:** the first three notes in page order, or "No card notes yet.".

**Not in 5.1:**
- Edit and Delete on a note (5.2);
- the Card notes page, **See card notes · N**, "See all card notes" and search (5.3);
- the pile, and page refs as buttons (5.4).

**Story source:** `epics.md` → Story 5.1. There is no spec file yet: `sprint-status.yaml` has `5-1-add-a-card-note-while-reading: backlog`.
- When `spec-5-1-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is Epic 5's first story. The gate is clear: no "spine drift" entry from an Epic 4 spec is unresolved in `deferred-work.md`, and every Epic 4 retro action item is `done`.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 4.7.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the panel doesn't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run used **sequential** with one author, as in Stories 1.6 to 4.7, so the seeds stay consistent across both halves.

### Decisions taken with Oleg (2026-11-10)

- **An empty Page is refused** with "Page is required." on `page`, because `pageStart` isn't nullable (AD-18). The build adds the row to EXPERIENCE.md → Validation messages (other forms): Card note panel | Page | Not empty | "Page is required.".
- **Page text that isn't one page or one range** ("abc", "p.", "42 to") is refused with "Use one page or one range.".

### Before the leaves: what today's code already does

- **The model and its rules exist.** `CardNote` (`id`, `text`, `page_start`, `page_end`, `created_at`) is on `Book.card_notes`. `check_invariants()` already enforces `card_note_pages_in_range` (1 ≤ start ≤ end ≤ Pages) and `unique_card_note_ids`. The intent's own page checks must run first, so a bad page is a 422, not a 500.
- **`LibraryBuilder.card_note` and the e2e seed's `cardNotes`** already work, so the leaves seed notes directly (TC-1).
- **Edit book already refuses Pages below the highest note** (`pages_below_card_note`, Story 1.11), so notes added here are covered by that rule with no change.
- **The Page field's text is a string.** `update-page` takes `page` as a JSON integer. `add-card-note` takes it as the raw string, because only the server parses ranges and "p." / "pp." prefixes.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order, with the trailing TR8 line as AC-6. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | **Add card note** opens the "Card note" index card; focus in Note; Page prefilled | E2E | P0 | `[P0] AC-1` |
| AC-2 | Every Page form parsed on the server into `pageStart` / `pageEnd`; the AD-18 shape stored | API | P0 | `test_ac2_p0_…` |
| AC-3 | Out of range, reversed, more than one range, empty Note: refused with the exact copy | API | P0 | `test_ac3_p0_…` |
| AC-4 | After Save note: still on the page, focus to **Add card note**, then "Card note saved." | E2E | P0 | `[P0] AC-4` |
| AC-5 | Book detail: "Card notes (N)", first three in page order with "p.42" / "pp.42–45"; "No card notes yet." | E2E | P1 | `[P1] AC-5` |
| AC-6 | TR8: faults, `book_not_found`, 422, invariants, contract (the panel half is a follow-up) | API | P0 | `test_ac6_p0_…` |

**Priorities:**
- **P0:**
  - AC-2 and AC-3 are CRD-API-001 (P1 in test-design-qa). This checklist raises them, because the Epic 5 gate names CRD-API-001, and R-09 (FR-1 edit consequences) depends on stored note pages being right.
  - AC-6 is TR8, P0 in every intent story so far.
  - AC-1 and AC-4 are Flow 6 (CRD-E2E-001), the only way the user adds a note.
- **P1:** AC-5 is the read-back of what was saved. Its full journey (add from Home, see it on Book detail) is CRD-E2E-001's second half.

**Level split (no duplicate coverage):**
- **API** proves what only the server decides:
  - Page parsing, every accepted form;
  - the stored shape, `createdAt`, the minted id;
  - every refusal and its copy;
  - TR8.
- **E2E** proves:
  - the opener on the Main book card, and the panel's heading, fields, width and focus;
  - Page as typed in the request;
  - the `status` line, that focus lands before it, and staying on Home;
  - the Book detail block: count, order, page refs and their color.

**Secondary branches (green-phase follow-ups, not separate red leaves):**
- AC-3's `aria-invalid`, `aria-describedby` and `alert` in the panel.
- AC-6's couldn't-save in the panel (TR9, XUI-E2E-001).
- AC-1 from Book detail, and AC-1's empty Page for a Book with no Reading.

The full list is under "Green-phase follow-ups" below.

---

## Story Integration Metadata

- **Story ID:** `5.1`
- **Story Key:** `5-1-add-a-card-note-while-reading`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 5.1)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md`
- **Generated Test Files:** `backend/tests/test_add_card_note.py`, `frontend/e2e/add-card-note.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 6 fail on their first assertion, as listed below. Every setup step ran cleanly first: the seeds and the server start.

**Skipped as committed:**
- `pytest tests/test_add_card_note.py` gives 3 skipped.
- `playwright test e2e/add-card-note.spec.ts` gives 3 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted the spec, and `oxlint` and `tsc -b` pass.

### API Tests (3 tests): `backend/tests/test_add_card_note.py`

**`[P0] AC-2`: `test_ac2_p0_add_card_note_parses_every_page_form_and_stores_the_note_on_that_book`**

**Seed:** The Left Hand of Darkness, 330 pages, never started (a note needs no Reading). Dune is Main at p.150.
1. **`add-card-note` once per form: "42", "42–45", "42-45", "42 – 45", "p.42", "pp. 42–45", "42–42". The stored notes' `(pageStart, pageEnd)` are `(42, null)`, `(42, 45)`, `(42, 45)`, `(42, 45)`, `(42, null)`, `(42, 45)`, `(42, null)`** (the first assertion).
2. Each answer is 200 `{"ok": true, "ids": {"cardNoteId": …}}`. The stored ids are those ids, in order, and distinct.
3. Each note has exactly `id`, `text`, `pageStart`, `pageEnd` and `createdAt`. The text is as sent, and `createdAt` is the fake clock's now.
4. Nothing else on the Book changed, Dune is unchanged, and the invariants hold.

*Red today: `assert [] == [(42, None), …]`. There is no route (405).*

**`[P0] AC-3`: `test_ac3_p0_add_card_note_refuses_a_bad_page_or_an_empty_note_and_saves_nothing`**

**Seed:** The Left Hand of Darkness, 330 pages.
1. **Page "400" → the `page` field reads "Page must be between 1 and 330."** (the first assertion; Flow 6's failure path).
2. It is 422 `refusal` / `invalid_fields`, the message is "Not saved. 1 field needs attention: Page.", and the file is byte-identical.
3. **Each Page refusal**, with its copy on `page` and the file unchanged:
   - "Page must be between 1 and 330.": "0", "331", "42–400";
   - "The first page must come before the last.": "45–42";
   - "Use one page or one range.": "42–45, 50–52", "42, 50", "abc", "p.", "42 to";
   - "Page is required.": "", "   ".
4. **Note "" or whitespace only** → "Note is required." on `text`.
5. **Both at once:** the fields are `["text", "page"]`, and the message is "Not saved. 2 fields need attention: Note, Page.".

*Red today: `assert {} == {'page': 'Page must be between 1 and 330.'}`.*

**`[P0] AC-6`: `test_ac6_p0_add_card_note_meets_the_standard_intent_acs`**

**Seed:** The Left Hand of Darkness with one note at p.233.
1. **A `write` fault answers 503** (the first assertion), then `fsync` and `replace`. Each body is `COULDNT_SAVE_BODY`, and the file is byte-identical.
2. A Book that is gone gets 409 `book_not_found`. A malformed `intent` gets 422 `invalid_fields`. Neither changes the file.
3. A success leaves the invariants holding, and the earlier note is kept (2 notes).
4. The OpenAPI document gives `/api/intents/add-card-note` the `ErrorResponse` ref for 409, 422, 500 and 503, with no 413.

*Red today: `assert 405 == 503` (write).*

### E2E Tests (3 tests): `frontend/e2e/add-card-note.spec.ts`

**Seeds** (the spec's own, plus `mainAt`, `DUNE` and `LEFT_HAND_ID` from `e2e/home.ts`):
- `mainAt(212)`: The Left Hand of Darkness (330 pages) as the Main book at p.212.
- `DUNE_WITH_NOTES`: Dune with four notes, seeded out of page order: p.300, p.12, p.96 and pp.42–45.
- `NEUROMANCER`: never started, no notes.

**`[P0] AC-1` the panel** (`mainAt(212)`; Home)
1. **The Main book card has the button "Add card note"** (the first assertion: the criterion's opener).
2. Click → a `dialog` named "Card note" is visible.
3. The textbox "Note" has focus and is a `textarea`. The textbox "Page" reads "212". **Save note** and **Cancel** are there. The panel is 360px wide.
4. Type a note, then **Cancel**: the panel closes, **Add card note** has focus, and no note was stored.

*Red today: no button "Add card note".*

**`[P0] AC-4` Save note on Home** (`mainAt(212)`)
1. **The Main book card has the button "Add card note"** (the first assertion: the opener).
2. Fill Note "Light is the left hand of darkness." and Page "212–213", then **Save note**.
3. `status` reads "Card note saved.". The panel is hidden, **Add card note** has focus, and the path is still `/`. The status watcher saw exactly that line, set while **Add card note** had focus.
4. Exactly one `add-card-note` was sent, with `{bookId, text, page: "212–213"}`. The stored note is p.212–213 with that text.

*Red today: no button "Add card note".*

**`[P1] AC-5` the Book detail block** (`DUNE_WITH_NOTES`, `NEUROMANCER`)
1. **Dune's Book detail has a `region` named "Card notes (4)"** (the first assertion).
2. It has 3 list items, in order: "Fear is the mind-killer." / "p.12", "A beginning is…" / "pp.42–45", "The spice must flow." / "p.96". Each ref is below its text, in `ink-tertiary`. The p.300 note isn't shown.
3. Neuromancer's Book detail reads "No card notes yet.".

*Red today: no region "Card notes (4)".*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

- **None changed.** The spec has its own copies of `watchStatus`, `statusSeen`, `topOf` and `bottomOf`, the same as `set-up-next.spec.ts` and `pause.spec.ts`. The 4.4 checklist already asked for a shared `e2e/announce.ts`. This is the fourth copy, so move them in the green phase.
- **`ADD_CARD_NOTE`** is local to both files. Add it to `e2e/intents.ts` and `backend/tests/helpers.py` with the implementation, then import it in both files.

## Mock Requirements

None in the red leaves. The panel's couldn't-save follow-up uses `page.route` 503 (TR9).

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**The intent** `POST /api/intents/add-card-note`:
- **The request** is multipart, with a JSON part `intent` = `{"bookId": "<id>", "text": "<note>", "page": "<Page as typed>"}`.
- **A success** answers `{"ok": true, "ids": {"cardNoteId": "<uuid>"}}`. In one commit it appends `{id, text, pageStart, pageEnd, createdAt}` to that Book's `cardNotes`, with `createdAt` = the clock's now. Nothing else changes.
- **Page parsing:**
  - an optional "p." or "pp." prefix, with optional spaces;
  - one whole number, or two joined by "-" or "–", with optional spaces around the dash;
  - "42–42" is stored as `pageStart: 42`, `pageEnd: null`.
- **The checks, in order, inside the commit:**
  1. a missing Book: 409 `book_not_found`;
  2. then 422 `invalid_fields`, with fields `text` (label "Note") before `page` (label "Page"):
     - `text`: empty or whitespace only → "Note is required.";
     - `page`, empty or whitespace only → "Page is required.";
     - `page`, not one page or one range → "Use one page or one range.";
     - `page`, a reversed range → "The first page must come before the last.";
     - `page`, a page below 1 or above Pages → "Page must be between 1 and N.".
- **A malformed `intent`** gets 422 `invalid_fields` on `intent`, through `parse_form_intent`.
- **No new error code.**
- **OpenAPI** documents 409, 422, 500 and 503 with `ErrorResponse`, and no 413.

**Book detail view:** `BookDetailView` gains `cardNotes`, the Book's notes in page order. The client shows the first three, and N is their count.

**The Card note panel:**
- **A modal `dialog` named "Card note"**, 360px wide.
- **A multi-line textbox "Note"** (a `textarea`), which has focus on open.
- **A textbox "Page"**, prefilled with the current Reading's `currentPage` (at least 1), or empty with no current Reading.
- **Buttons "Save note" and "Cancel".** Cancel and a save both return focus to the opener.

**The openers:** a `button` named exactly "Add card note" on the Main book card (`region` "Main book"), and on Book detail in the secondary actions after **Mark as Side read** / **Remove from side** and before **Edit** (EXPERIENCE.md → Book detail actions).

**The outcome:** the panel closes and the user stays on the page. Focus goes to **Add card note**, and only then does `status` read "Card note saved.".

**The block:** a `region` named by its heading "Card notes (N)". The first three notes are `listitem`s in page order, each with its text and, below it, "p.42" or "pp.42–45" in meta / `ink-tertiary`. With no notes, the block reads "No card notes yet.".

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `backend/tests/test_intent_routes.py` | Add `"add-card-note": {"bookId": DUNE_ID, "text": "…", "page": "1"}` to `INTENT_ROUTES`. |
| `backend/tests/test_contract.py` | Add `/api/intents/add-card-note` to the envelope `operations` (around line 344) and to the coverless list (around line 373). There is no new `ErrorCode`. |
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen` (`check:api` compares it byte for byte). |
| `backend/tests/test_views.py`, `test_book_states.py`, `test_edit_book.py` and the other readers of `/api/views/book/{id}` | None of them is known to compare the whole Book detail body, but re-run them: any that does gains `cardNotes`. |
| `frontend/e2e/home.spec.ts`, `home-slice.spec.ts` | Any leaf that pins the Main book card's actions or layout sees **Add card note**. Re-run them. |
| `frontend/e2e/book-detail.spec.ts`, `set-up-next.spec.ts`, `pause.spec.ts`, `side-reads.spec.ts`, `finish-any-book.spec.ts` | Any leaf that pins Book detail's action stack, a button's position, or the right column sees **Add card note** and the Card notes block. Re-run them. |

## Assumptions for the spec to confirm

- **The Note text is stored as sent.** The criteria don't say to trim it. Trimming the outer whitespace would also be reasonable; if the spec chooses that, AC-2 needs a case.
- **Page order** is `pageStart`, then `createdAt` for equal starts. The criteria say only "page order". AC-5's seed has no ties.
- **The block's heading with no notes.** EXPERIENCE.md says the block reads "No card notes yet."; whether the heading then reads "Card notes (0)" or "Card notes" isn't fixed. AC-5 checks only the empty line.
- **Prefill at page 0:** "at least 1" means a current Reading at p.0 prefills "1". That is a green follow-up.
- **A paused Reading** (Waiting for you, or a paused Up next) counts as the Book's current page for the prefill. EXPERIENCE.md's "current page" reads that way.
- **The Main book card's "See card notes · N"** is 5.3, so the card's note count isn't checked here.
- **The panel's 503 placement:** EXPERIENCE.md → Couldn't save says a panel stays open with every typed value kept, and shows the line "one line below the action". For the New book panel that line sits above the buttons. Use the same slot here, inside the panel and above **Save note**, to match 5.2's dialog wording.

## Open items that bear on this story

- **CRD-API-001** (P1 in test-design-qa) is covered by AC-2, AC-3 and AC-6. Tick it in the trace once green. 5.2 adds edit and delete.
- **CRD-E2E-001** (Flow 6: add from Home, see it on Book detail) is split between AC-1, AC-4 and AC-5. The one-journey version is a green follow-up.
- **XUI-E2E-001** (couldn't-save on every save surface) gains the Card note panel through the AC-6 follow-up.
- **R-09** closes with Story 1.11 and Epic 5 (the epic gate): `pages_below_card_note` now has notes made by the app.
- **Spine drift to expect:** the Capability map's FR-17 row names `intents/*_card_note` and `views/card_notes`. 5.1 adds `intents/add_card_note` and a `cardNotes` field on the Book detail view, not a `views/card_notes` view; that view is 5.3's. Defer any wording mismatch as "spine drift" in the story, as AGENTS.md says.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_add_card_note.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/add-card-note.spec.ts -g "AC-1"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-2, AC-3, AC-6: the intent
- [x] `domain/`: a pure Page parser, `parse_note_pages(text, pages)`, returning `(start, end | None)` or the refusal message. Give it unit cases for every form and refusal in this checklist. (done: backend/bookvie/domain/note_pages.py; backend/tests/test_note_pages.py (every form and refusal))
- [x] `intents/add_card_note.py`: `AddCardNoteIntent` (`book_id`, `text`, `page` as strings), `parse_add_card_note_intent`, and `add_card_note(store, clock, intent) -> str`. Check `book_not_found`, then the fields (`text`, then `page`). Append the note and return its id. (done: backend/bookvie/intents/add_card_note.py; backend/tests/test_add_card_note.py:test_refusal_order_p2_a_gone_book_is_409_book_not_found_before_its_fields_are_checked, test_ac3_p0_…)
- [x] `http/api.py`: `POST /intents/add-card-note`, answering `ids: {cardNoteId}` and exported from `intents/__init__.py`. Then run `npm --prefix frontend run api:gen`. (done: backend/bookvie/http/api.py add_card_note_intent; backend/tests/test_add_card_note.py:test_ac6_p0_add_card_note_meets_the_standard_intent_acs (OpenAPI); schema.d.ts regenerated (check:api))
- [x] EXPERIENCE.md → Validation messages (other forms): add "Card note panel | Page | Not empty | "Page is required."" (decision above). (done: EXPERIENCE.md → Validation messages (other forms), "Card note panel | Page | Not empty")
- [x] Update `test_intent_routes.py` and `test_contract.py` (table above). (done: backend/tests/test_intent_routes.py INTENT_ROUTES, backend/tests/test_contract.py)
- [x] Activate AC-2, AC-3 and AC-6. (done: backend/tests/test_add_card_note.py: test_ac2_p0_…, test_ac3_p0_…, test_ac6_p0_… (no skips))

### AC-1, AC-4: the panel from the Main book card
- [x] A `useAddCardNote` mutation in `api/`, and a `CardNotePanel` component: a modal dialog, an index card 360px wide, with Note (`textarea`), Page, **Save note** and **Cancel**. Field errors come from the 422 `fields`, with `aria-invalid`, `aria-describedby` and the `alert` region. On a 503 the panel stays open with the values kept. (done: frontend/src/components/CardNotePanel.tsx, frontend/src/api/books.ts useAddCardNote; frontend/e2e/add-card-note.spec.ts:224 [P1] AC-3, :272 [P1] AC-6)
- [x] **Add card note** on `MainBookCard`. Prefill Page from the current Reading's page (at least 1). On save, wait for the refetch, close the panel, focus the opener, then announce "Card note saved.". (done: frontend/src/components/MainBookCard.tsx, frontend/src/lib/useCardNoteFlow.tsx; frontend/e2e/add-card-note.spec.ts:120 [P0] AC-4)
- [x] Activate AC-1 and AC-4. (done: frontend/e2e/add-card-note.spec.ts:88 [P0] AC-1, :120 [P0] AC-4 (no skips))

### AC-5: Book detail
- [x] `views/models.py`: `BookDetailView.card_notes` (id, text, pageStart, pageEnd, createdAt) in page order, filled in `views/shelf.py`. (done: backend/bookvie/views/shelf.py book_detail; backend/tests/test_add_card_note.py:test_ac5_book_detail_lists_card_notes_by_page_then_created_at)
- [x] Book detail's right column: the "Card notes (N)" `region` with the first three notes as list items, each with its text and a page ref ("p.42" / "pp.42–45", meta / `ink-tertiary`) below; "No card notes yet." with none. (done: frontend/src/pages/BookDetailPage.tsx CardNotesBlock; frontend/e2e/add-card-note.spec.ts:156 [P1] AC-5)
- [x] **Add card note** in Book detail's secondary actions, after the Side read action and before **Edit**. It is always shown. Prefill Page from the current Reading (empty with none). (done: frontend/src/pages/BookDetailPage.tsx; frontend/e2e/book-states.spec.ts and side-reads.spec.ts (action-stack order); frontend/e2e/add-card-note.spec.ts:191, :340)
- [x] Activate AC-5. (done: frontend/e2e/add-card-note.spec.ts:156 [P1] AC-5 (no skip))

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-1 from Book detail:** **Add card note** is in the action stack before **Edit**. For a Book with no Reading, Page is empty. For a paused Book, it holds the paused page. Focus goes back to that button after a save. (done: frontend/e2e/add-card-note.spec.ts:191 [P1] AC-1 from Book detail (empty Page, refocus), :340 [P1] paused Book prefill 88; book-states.spec.ts (before Edit))
- [x] **AC-1, prefill at p.0:** a current Reading at page 0 prefills "1". (done: frontend/e2e/add-card-note.spec.ts:319 [P2] Esc leaf (mainAt(0) prefills "1"); frontend/src/lib/cardNotes.test.ts notePrefill)
- [x] **AC-3 in the panel:** Page "400" on a 330-page Book shows "Page must be between 1 and 330." under Page with `aria-invalid="true"` and `aria-describedby`. The same line is in the `alert` region, the panel stays open with both values kept, and nothing is saved. Do the same for an empty Note ("Note is required."). Fixing the value and saving clears the error. (done: frontend/e2e/add-card-note.spec.ts:224 [P1] AC-3 (Page, Note, both), :427 [P2] fixing a refused field clears aria-invalid and saves)
- [x] **AC-6 in the panel** (TR9, XUI-E2E-001): a routed 503 on `add-card-note`. "Couldn't save. Your data wasn't changed." is in an `alert` line inside the panel, the panel stays open, Note and Page keep their text, `status` is empty, and the file is byte-identical. (done: frontend/e2e/add-card-note.spec.ts:272 [P1] AC-6 routed 503)
- [x] **CRD-E2E-001, one journey:** add a note from Home, open Book detail, and see it in the block with the new count. (done: frontend/e2e/add-card-note.spec.ts:369 [P1] a note added on Home shows on Book detail in "Card notes (1)")
- [x] **AC-5, count and order after an add:** adding a note on Book detail updates "Card notes (N)". A new note with a lower page moves into the first three. (done: frontend/e2e/add-card-note.spec.ts:394 [P1] adding on Book detail updates "Card notes (N)", lower page moves in)
- [x] **AC-5, ties:** two notes with the same `pageStart` are shown in `createdAt` order (assumption above). (done: backend/tests/test_add_card_note.py:test_ac5_book_detail_lists_card_notes_by_page_then_created_at (the view orders ties by createdAt; the block renders the view order))
- [x] **Esc closes the panel** like **Cancel**, with focus back on the opener (Interaction Primitives). (done: frontend/e2e/add-card-note.spec.ts:319 [P2] Esc closes the panel like Cancel)
- [x] **A delayed response** (XUI-E2E-003): while the request is in flight, **Save note** has `aria-disabled="true"`, and a second press sends nothing. (done: frontend/e2e/add-card-note.spec.ts:464 [P2] a second Save note press sends nothing; :272 aria-disabled while held)
- [x] **A stale tab:** the Book was deleted in another tab, so **Save note** gets 409 `book_not_found`. The message is shown in the panel where focus can reach it. (done: frontend/e2e/add-card-note.spec.ts:493 [P2] stale tab on Home (the message inside the panel, values kept). Book detail's stale tab unmounts the panel with the page: rejected in the 5.1 code review (spec Review Findings → Rejected))
- [x] **Edit book's Pages floor:** a note made here at p.270 refuses lowering Pages below 270 (`pages_below_card_note`, Story 1.11). (done: backend/tests/test_add_card_note.py:test_r09_p1_a_note_added_through_the_intent_sets_the_pages_floor_for_edit_book)
- [x] **axe** on the open panel and on Book detail's block, in both themes. (done: frontend/e2e/add-card-note.spec.ts:535 [P2] axe on the open panel and the block, both themes)
