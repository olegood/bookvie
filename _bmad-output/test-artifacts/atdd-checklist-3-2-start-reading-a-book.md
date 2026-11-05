---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-05'
storyId: '3.2'
storyKey: '3-2-start-reading-a-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-32-start-reading-a-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md'
generatedTestFiles:
  - 'backend/tests/test_start_reading.py'
  - 'frontend/e2e/start-reading.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3 intro and gate; Story 3.2; Conventions for every story: TR8, TR9)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Start/resume, Reading fields, refusal codes, Time)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-9 refusal codes, AD-19 Reading fields and starting, module map)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book states; Spine popover; Book detail; Start dialog; Couldn''t save; Focus after close)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Start dialog; Spine popover right column; Book detail action stack and Current reading)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-book-detail.html (Edit Purpose)'
  - '_bmad-output/test-artifacts/test-design-qa.md (RDG-API-001, RDG-API-005, RDG-E2E-003, R-01, R-12)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-2 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-1-see-my-main-book-on-home.md (format, conventions, helpers to share)'
  - 'backend/bookvie/domain/model.py, domain/progress.py, domain/clock.py, domain/invariants.py, intents/contract.py, intents/set_spine_color.py, intents/delete_book.py, intents/commit.py, views/models.py, views/shelf.py, http/api.py'
  - 'backend/tests/builder.py, backend/tests/helpers.py, backend/tests/test_set_spine_color.py, backend/tests/test_home_view.py'
  - 'frontend/src/pages/BookDetailPage.tsx, frontend/src/components/SpinePopover.tsx, ConfirmDialog.tsx, MainBookCard.tsx, frontend/src/api/intents.ts'
  - 'frontend/e2e/fixtures.ts, home.spec.ts, intents.ts, library.ts, bookcase.ts, spine-popover.spec.ts, book-detail.spec.ts, frontend/playwright.config.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Book detail for a Book with no active or paused Reading that isn''t Main, pressing Start reading (the page''s single button-primary) opens a modal Start dialog with the heading "Start X?" (X in serif), an optional one-line "Purpose (optional)" field, Start reading and Cancel; the dialog is shown even when there is no Main book, because it carries the Purpose field (FR-5, FR-9, UX-DR39); focus starts in Purpose (optional) (Story 4.7 starts it in "Which page?" when that field is shown)' }
  - { id: AC-2, idSource: generated, text: 'Given the Start dialog, pressing Start reading makes start-reading set the Book as mainBookId and create a Reading with startDate = today, currentPage 0, the Purpose (trimmed, null when empty) and lastProgressUpdate = now; the app goes to Home with focus on the Main book title link' }
  - { id: AC-3, idSource: generated, text: 'Given a Book with a finished Reading and no unfinished one, starting it creates a new Reading for the re-read, and earlier Readings are unchanged' }
  - { id: AC-4, idSource: generated, text: 'Given the Main book, start-reading sent for it is refused with 409 already_main and nothing changes (AD-9)' }
  - { id: AC-5, idSource: generated, text: 'Given a paused Reading (seeded, or paused by an earlier start), pressing Resume on its Book detail shows the dialog "Resume X?" with the existing Purpose prefilled, and confirming resumes the same Reading at its page, sets lastProgressUpdate to now and makes the Book Main (AD-19)' }
  - { id: AC-6, idSource: generated, text: 'Given a Main book Y at p.120 of 187, the Start dialog for another Book shows "This pauses Y at p.120 (64%)."; confirming pauses Y''s Reading at its page, records pausedAt = today, and starts or resumes X, all in one intent and one commit (FR-5); interim until Story 4.1, which also makes Y Up next (FR-7): tests here assert only Y''s currentPage and pausedAt, never upNextBookId' }
  - { id: AC-7, idSource: generated, text: 'Given the Start dialog, pressing Cancel or Esc changes nothing and returns focus to the opener (RDG-E2E-003)' }
  - { id: AC-8, idSource: generated, text: 'Given a spine popover whose Book''s row in the EXPERIENCE.md Book states table shows Start reading or Resume, it offers a "Start reading" link (or Resume as its primary for a paused Book), which closes the popover and opens the Start dialog; a finished Book with no Reading in progress gets no start action in the popover; its re-read starts from Book detail' }
  - { id: AC-9, idSource: generated, text: 'Given Book detail with an active or paused Reading, using Edit Purpose turns the Purpose line into a one-line field with Save and Cancel, where Enter saves and Esc cancels, and edit-purpose stores it (UX-DR44)' }
  - { id: AC-10, idSource: generated, text: 'Given the Edit Purpose field and a server that answers couldnt_save (a routed 503 in e2e), pressing Save keeps the field open with the typed Purpose, and "Couldn''t save. Your data wasn''t changed." appears in an alert line directly below it (TR9)' }
  - { id: AC-11, idSource: generated, text: 'The standard intent ACs (TR8) hold for start-reading and edit-purpose, and a couldn''t-save keeps the dialog open with the Purpose kept' }
---

# ATDD Checklist - Epic 3, Story 3.2: Start reading a book

**Date:** 2026-11-05
**Author:** Oleg
**Primary test levels:** E2E (Playwright against the real `bookvie`) and API (pytest against the app through `TestClient`)

---

## Story Summary

As Oleg, I want to start a Book as my Main book through a short confirmation where I can write why I'm reading it, so that exactly one Book is tracked and I start it on purpose.

Today no Reading can be started from the app: Readings exist only in seeds. Book detail's action stack is **Edit** and **Delete**, the spine popover has no primary action, and the Current reading block (Story 3.1) shows the Purpose read-only.

**What 3.2 adds:**
- **Two intents:** `start-reading` (start, resume, re-read, and pause the previous Main book in the same commit) and `edit-purpose`.
- **One new refusal code:** `already_main` (409).
- **The Start dialog:** "Start *X*?" or "Resume *X*?", the trade-off line "This pauses *Y* at p.N (P%).", the Purpose field, the confirm button and **Cancel**.
- **Openers:** Book detail's primary (**Start reading** or **Resume**) and the spine popover's "Start reading" link or **Resume** primary.
- **Edit Purpose** in Book detail's Current reading block.

**Not in 3.2:** Up next and its displacement lines (Story 4.1 and Epic 4), "Which page?" for Side reads (Story 4.7), Pause (Epic 4), the Finish dialog (3.6), the Home panes and the empty card's Up next suggestion (Epic 4).

**Story source:** `epics.md` → Story 3.2. There is no spec file yet: `sprint-status.yaml` has `3-2-start-reading-a-book: backlog`.
- When `spec-3-2-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.1.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, the mockup and the code. There was no browser recording: the Start dialog, the new openers and Edit Purpose don't exist yet. Every locator is a role and name the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.1. One author keeps the seeds (Dune, The Left Hand of Darkness, Fahrenheit 451 at p.120 of 187) consistent across both halves.

### Before the leaves: what today's code already does

- **The model already has every Reading field** (`domain/model.py::Reading`), and `LibraryBuilder.reading()` seeds them.
- **`reading_status()` and `current_reading()` exist** (`domain/progress.py`), so "paused" needs no new storage: a Book's unfinished Reading is paused whenever the Book isn't Main (AD-19).
- **The invariants already guard this story:** `main_has_unfinished_reading`, `one_unfinished_reading` and `reading_page_in_range` (`domain/invariants.py`). A `start-reading` that forgets to create a Reading fails the commit with 500.
- **`--fake-today` and `startSeededServer({ fakeToday })` exist** (Story 3.1). `FakeClock.now()` is local noon on the fake today, so a stored `lastProgressUpdate` is deterministic.
- **`ConfirmDialog` is an `alertdialog`** with focus on **Cancel**. The Start dialog is a different component: a modal `dialog` with focus in the Purpose field.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-11, one per Given/When/Then block in source order (the closing "And the standard intent ACs" line is AC-11). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Book detail **Start reading** opens the modal Start dialog: "Start *X*?", Purpose (optional) focused, Start reading, Cancel; shown with no Main book | E2E | P0 | `[P0] AC-1` |
| AC-2 | Confirm: Book becomes Main; new Reading (today, page 0, trimmed Purpose, now); Home with focus on the title link | E2E | P0 | `[P0] AC-2` |
| AC-3 | Starting a finished Book adds a re-read; earlier Readings unchanged | API | P0 | `test_ac3_p0_…` |
| AC-4 | `start-reading` for the Main book: 409 `already_main`, nothing changes | API | P1 | `test_ac4_p1_…` |
| AC-5 | **Resume**: "Resume *X*?" with the Purpose prefilled; same Reading at its page, `lastProgressUpdate` = now, Main | E2E | P1 | `[P1] AC-5` |
| AC-6 | With a Main book *Y*: "This pauses *Y* at p.120 (64%)."; one intent pauses *Y* (`pausedAt` = today) and starts *X* | E2E | P1 | `[P1] AC-6` |
| AC-7 | Cancel or Esc: nothing changes, focus returns to the opener | E2E | P1 | `[P1] AC-7` |
| AC-8 | Spine popover: "Start reading" link, or **Resume** primary for a paused Book, opens the dialog; a finished Book gets none | E2E | P1 | `[P1] AC-8` |
| AC-9 | Edit Purpose: one-line field, Save and Cancel, Enter saves (trimmed), Esc cancels | E2E | P1 | `[P1] AC-9` |
| AC-10 | Edit Purpose couldn't-save: field open, Purpose kept, `alert` line directly below | E2E | P1 | `[P1] AC-10` |
| AC-11 | TR8 for `start-reading` and `edit-purpose` (faults, invariants, `book_not_found`, contract) | API | P0 | `test_ac11_p0_…` |

**Priorities:**
- **P0:** AC-1 and AC-2 (the story's purpose: start on purpose, exactly one Main book), AC-3 (R-01: a re-read must never touch history), and AC-11 (R-01, R-02: one commit or none, invariants after every success).
- **P1:** the rest. They are the other entries, the refusal, Cancel (R-12) and Edit Purpose.

**Level split (no duplicate coverage):**
- **API:** what only the server can prove, or proves much more cheaply: the re-read's history, the refusal, fault injection, invariants and the contract.
- **E2E:** the dialog, focus, the openers, Edit Purpose, and the stored result of each journey, read from the data dir's `library.json` after the UI says it's done.
- **AC-11's dialog half** ("a couldn't-save keeps the dialog open with the Purpose kept") is TR9 on the Start dialog. AC-11 has one red leaf, at API level, for TR8. The dialog's couldn't-save is the first green-phase follow-up below.

---

## Story Integration Metadata

- **Story ID:** `3.2`
- **Story Key:** `3-2-start-reading-a-book`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.2)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md`
- **Generated Test Files:** `backend/tests/test_start_reading.py`, `frontend/e2e/start-reading.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 11 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code (in a temporary copy, since deleted). All 11 fail as listed below. Every seed (a paused Dune, a finished Neuromancer, Fahrenheit 451 as Main, `--fake-today`) started cleanly.

**Skipped as committed:**
- `pytest tests/test_start_reading.py` gives 3 skipped.
- `playwright test e2e/start-reading.spec.ts` gives 8 skipped.
- The whole backend suite passes (886 passed, 3 skipped).
- `home.spec.ts` still passes (17 of 17) after its helpers moved to `e2e/home.ts`.
- Ruff (on the new file), oxlint and `tsc -b` are clean.

**One deviation from the workflow's E2E rule** ("the criterion assertion is the first operation that can fail"), kept to match Stories 1.6 to 3.1:
- The leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.
- Where the criterion names its opener (AC-1, AC-5, AC-7 to AC-10), the first assertion is that opener's visibility.
- **AC-2 and AC-6** need the dialog before their criterion assertion, so today they fail on the setup click "Start reading" (a 15s action timeout), not on an assertion. Once AC-1 is green, they fail on their own assertions.

### API Tests (3 tests): `backend/tests/test_start_reading.py`

**Seeds:**
- `_fahrenheit_main_and_dune`: Fahrenheit 451 (Ray Bradbury, 187 pages) as the Main book at p.120 with a Purpose, and Dune (412 pages) never started.
- `api_client` pins today to `TODAY` (2026-10-30); `NOW` is `FakeClock(TODAY).now()`, local noon.

**`[P0] AC-3`: `test_ac3_p0_starting_a_finished_book_creates_a_new_reading_and_keeps_the_earlier_ones`**

**Seed:** Dune with one finished Reading (1 March to 10 April 2026, 412 pages, Purpose, `yes`, 4 stars), no Main book.

The leaf sends `start-reading` with Purpose `"  For the ecology of Arrakis  "`, then checks, in order:
1. **Dune has 2 Readings** (the first assertion).
2. The response is 200 `{ok: true}`.
3. The first Reading is byte-for-byte what it was.
4. The new one has a new id, `startDate` = today, `currentPage` 0, the trimmed Purpose, `lastProgressUpdate` = now, and every other field `null`.
5. `mainBookId` is Dune, and the invariants hold.

*Red today: `assert 1 == 2`.*

**`[P1] AC-4`: `test_ac4_p1_start_reading_for_the_main_book_is_refused_with_already_main`**

The leaf sends `start-reading` for Fahrenheit 451, the Main book, then checks, in order:
1. **The status is 409** (the first assertion).
2. `kind` is `refusal`, `code` is `already_main`, and there is a message.
3. `library.json` is byte-identical.
4. `already_main` is in the OpenAPI `ErrorCode` enum (AD-8).

*Red today: `assert 405 == 409`.*

**`[P0] AC-11`: `test_ac11_p0_start_reading_and_edit_purpose_keep_the_standard_intent_guarantees`**

The leaf checks, in order:
1. **A write fault on `start-reading` gives 503** (the first assertion), then the whole `couldnt_save` body and byte-identical storage. The same follows for `fsync` and `replace`, and for `edit-purpose`. The seed has a Main book, so the faulted commit is the one that would also pause it: one commit or none.
2. **Success:** starting Dune gives 200 `{ok: true}`. `mainBookId` is Dune, Fahrenheit 451's Reading is at p.120 with `pausedAt` = today and no `finishDate`, and Dune's new Reading has `purpose: null` (sent `null`). The invariants hold.
3. **`edit-purpose`:** `"  Why Arrakis  "` is stored as `"Why Arrakis"` on the active Reading, `"   "` as `null`, and a paused Reading's Purpose can be edited too. The invariants hold after each.
4. **A deleted Book:** both intents give 409 `book_not_found`, and nothing changes.
5. **The contract:** both paths are in the OpenAPI schema.

*Red today: `assert 405 == 503` (write).*

### E2E Tests (8 tests): `frontend/e2e/start-reading.spec.ts`

**Shared seeds** (from `e2e/home.ts`, plus the spec's own):
- **Dune** (Frank Herbert, 412 pages, `DUNE_ID`). `DUNE_PAUSED` adds one Reading at p.120 (fixed id), started 1 October, paused 20 October, Purpose "Reread for the ecology of Arrakis".
- **The Left Hand of Darkness** (330 pages, `LEFT_HAND_ID`). `mainAt(page, …)` makes it Main.
- **Fahrenheit 451** (Ray Bradbury, 187 pages, fixed id), Main at p.120 in AC-6.
- **Neuromancer** (William Gibson, 271 pages), finished, no Reading in progress (AC-8).

**`[P0] AC-1` Start reading on Book detail opens the modal Start dialog** (Dune, no Main book)
1. **Book detail has a "Start reading" button in `main`** (the first assertion).
2. It is the only "Start reading" or "Resume" button there.
3. The click opens the `dialog` "Start Dune?", shown modal (`:modal` or `aria-modal="true"`).
4. "Dune" in the heading has a `font-family` starting with `ui-serif`.
5. The textbox "Purpose (optional)" is focused, empty, an `input`, and not `required`.
6. The buttons "Start reading" and "Cancel" are in the dialog; there is no "This pauses" line.

*Red today: no "Start reading" button.*

**`[P0] AC-2` confirming makes the Book Main and goes to Home** (`--fake-today 2026-10-28`; Dune and The Left Hand of Darkness, no Readings)
1. Start reading → Purpose `"  To finally see what Arrakis is about  "` → Start reading.
2. **The link "Dune" in the Main book card is focused** (the first assertion).
3. The URL is `/`.
4. `library.json`: `mainBookId` is Dune. Dune has one Reading: `startDate` 2026-10-28, `currentPage` 0, the trimmed Purpose, `lastProgressUpdate` = 2026-10-28T12:00:00+01:00, the rest `null`. The Left Hand of Darkness still has no Reading.

*Red today: the click on "Start reading" times out (no such button).*

**`[P1] AC-5` Resume on a paused Book** (`--fake-today`; `DUNE_PAUSED`, no Main book)
1. **Book detail has a "Resume" button** (the first assertion), and no "Start reading".
2. The click opens "Resume Dune?". "Purpose (optional)" holds "Reread for the ecology of Arrakis" and is focused.
3. The dialog's **Resume** → the "Dune" link in the Main book card is focused, and its gauge reads "29%, page 120 of 412".
4. `library.json`: Dune is Main and still has one Reading: the same id, `startDate`, page 120 and Purpose, `pausedAt` still 2026-10-20 (never cleared, AD-19), no `finishDate`, and `lastProgressUpdate` = the server's now.

*Red today: no "Resume" button.*

**`[P1] AC-6` with a Main book, the dialog states the pause** (`--fake-today`; Fahrenheit 451 Main at p.120 of 187; Dune never started)
1. Book detail for Dune → Start reading.
2. **The dialog contains "This pauses Fahrenheit 451 at p.120 (64%)."** (the first assertion). 120 of 187 is 64.17…%, the server's floor.
3. Start reading → the "Dune" link on Home is focused.
4. Exactly one `start-reading` request was sent.
5. `library.json`: Dune is Main. Fahrenheit 451's Reading has the same id, p.120, its Purpose, `pausedAt` 2026-10-28 and no `finishDate`. Dune has one Reading at page 0, from today, with `purpose: null`.
6. `upNextBookId` is never read.

*Red today: the click on "Start reading" times out.*

**`[P1] AC-7` Cancel or Esc changes nothing** (The Left Hand of Darkness Main at p.212; Dune never started)
1. **Book detail for Dune has "Start reading"** (the first assertion).
2. Open, type a Purpose, **Cancel** → the dialog is gone and "Start reading" is focused.
3. Open again → Purpose focused → type → Esc → gone, "Start reading" focused.
4. No `start-reading` request was sent; `library.json` is byte-identical; Home still shows The Left Hand of Darkness as Main.

*Red today: no "Start reading" button.*

**`[P1] AC-8` the spine popover's start actions** (on `/catalog`: Dune never started; The Left Hand of Darkness paused at p.120; Neuromancer finished)
1. Dune's popover: **its "Start reading" button is visible** (the first assertion). Clicking it closes the popover and opens "Start Dune?" with Purpose focused. Cancel.
2. The Left Hand of Darkness's popover: the primary **Resume** has focus on open. Clicking it closes the popover and opens "Resume The Left Hand of Darkness?". Esc.
3. Neuromancer's popover: no "Start reading" or "Resume" text at all.

*Red today: no "Start reading" in Dune's popover.*

**`[P1] AC-9` Edit Purpose** (The Left Hand of Darkness Main at p.212, Purpose "To see how Le Guin builds a world")
1. **The Current reading region has an "Edit Purpose" button** (the first assertion).
2. Click → the textbox "Purpose" (an `input`) holds the Purpose; "Save" and "Cancel" are in the region.
3. Type `"  To see how Le Guin builds a world without war  "`, Enter → the field is gone, the region shows the trimmed text, one `edit-purpose` was sent, and `library.json` holds it trimmed.
4. Edit Purpose again → type → Esc → the field is gone, the saved Purpose still shows, no second request, and `library.json` is byte-identical.

*Red today: no "Edit Purpose".*

**`[P1] AC-10` Edit Purpose couldn't-save** (`DUNE_PAUSED`; `edit-purpose` routed to a 503 `couldnt_save`)
1. **"Edit Purpose" is visible** (the first assertion).
2. Type "For the ecology, and the politics", **Save** → the `alert` reads "Couldn't save. Your data wasn't changed.".
3. The field is still open with the typed value.
4. The alert's top is at or below the field's bottom, within 32px: directly below it.
5. `library.json` is byte-identical.

*Red today: no "Edit Purpose".*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1), with fixed literal ids where a test compares them.
- **In API tests,** seeds use `LibraryBuilder.book()` and `.reading()` directly.
- **In E2E,** seeds go through `seededServer`, or `serverAtFakeToday` when a test compares stored dates.

## Fixtures and Helpers Created or Changed

- **New `frontend/e2e/home.ts`**, as the 3.1 checklist planned once Stories 3.2 to 3.7 reuse its helpers:
  - moved from `home.spec.ts`, unchanged: `FAKE_TODAY`, `FAKE_NOW`, `LEFT_HAND_ID`, `LEFT_HAND`, `DUNE_ID`, `DUNE`, `mainAt`, `mainBookCard`, `serverAtFakeToday`, `stopAndRemove`;
  - new: `SERVER_NOW` (what `FakeClock` calls now: local noon on the fake today), `storedLibrary`, `storedBook` and `libraryBytes` (read `library.json` from the server's data dir).
- **`frontend/e2e/home.spec.ts`** imports those from `home.ts`. No test changed.
- **`frontend/e2e/intents.ts`:** `START_READING` and `EDIT_PURPOSE`.
- **`backend/tests/helpers.py`:** `START_READING` and `EDIT_PURPOSE`.

## Mock Requirements

One. AC-10 routes `**/api/intents/edit-purpose` to a 503 `couldnt_save` body (TR9's "routed 503"), as `book-detail.spec.ts` AC-12 does for `edit-book`. Every other leaf runs against the real `bookvie`.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text. The roles and names are listed in the contract below.

---

## Contract the Scaffolds Pin (names the implementation must use)

**`start-reading`** (`POST /api/intents/start-reading`):
- `multipart/form-data` with a JSON part named `intent`: `{"bookId": "...", "purpose": "..." | null}`, parsed like `set-spine-color`'s.
- `purpose` is required and nullable. The server trims it; empty after trimming is `null`. Story 4.7 adds the Side read's page.
- Success is exactly `{ok: true}`.
- **No current Reading** (never started, or every Reading finished): a new Reading with a new id, `startDate` = today, `currentPage` 0, the Purpose, `lastProgressUpdate` = now, and `pausedAt`, `finishDate`, `finishedPages`, `purposeFulfilled` and `rating` all `null`. It is appended to `readings`.
- **A paused current Reading:** the same Reading resumes. Its page, `startDate` and `pausedAt` stay; `lastProgressUpdate` = now; its `purpose` becomes the sent Purpose (the dialog prefilled it).
- **A Main book exists (another Book):** in the same commit its current Reading gets `pausedAt` = today and keeps its page. Nothing else about it changes in 3.2 (no `upNextBookId`; Story 4.1).
- `mainBookId` = the Book.
- **Refusals:** 409 `already_main` for the Main book; 409 `book_not_found` for a deleted Book; 422 `invalid_fields` on `intent` for a malformed part.

**`edit-purpose`** (`POST /api/intents/edit-purpose`):
- The same part shape: `{"bookId": "...", "purpose": "..." | null}`. Trimmed; empty is `null`.
- It sets the `purpose` of the Book's current Reading, active or paused, and nothing else. `lastProgressUpdate` doesn't change: a Purpose isn't progress.
- Success is exactly `{ok: true}`. 409 `book_not_found` for a deleted Book.

**The Start dialog:**
- **A modal `dialog`**, named by its heading: "Start *X*?" (no current Reading) or "Resume *X*?" (a paused one). *X* is in the serif face, for example an `<i>` or `<span>` in `book-title` style, whose `font-family` starts with `ui-serif`.
- **The trade-off line,** only with a Main book: "This pauses *Y* at p.*N* (*P*%)." *P* is the server's floor percentage for *Y*.
  - The home view (`mainBook.percent`) or the Book detail view must supply it, so the dialog never divides. Book detail has no Main book data today; see "Assumptions".
- **"Purpose (optional)":** a one-line `input`, the dialog's accessible label exactly "Purpose (optional)", not `required`. It is focused on open, and prefilled with the current Purpose on Resume.
- **The buttons:** **Start reading** or **Resume** (`button-primary`), then **Cancel**.
- **Confirmed:** the app goes to `/` with focus on the Main book card's title link (EXPERIENCE.md → Focus after close).
- **Cancel or Esc:** nothing is sent, and focus returns to the opener.

**Openers:**
- **Book detail:** the single `button-primary` at the top of the action stack, "Start reading" (no current Reading, not Main; a finished Book included) or "Resume" (a paused Reading). None for the Main book.
- **The spine popover:**
  - "Start reading" for a Book with no Reading in progress that has never been finished. It is styled as a `link` (DESIGN.md → Spine popover right column, before "Open book →"), but it is a `button`, because it opens a dialog.
  - **Resume** as the primary for a paused Book.
  - Both close the popover, then open the Start dialog.
  - Neither appears for a finished Book with no Reading in progress.
- **The Main book card's empty-state suggestion** and the Home panes are Epic 4.

**Edit Purpose:**
- **A `button` named "Edit Purpose"** in the Current reading region, styled as a `link` (it edits in place; it doesn't navigate).
- It turns the Purpose line into an `input` labelled "Purpose", prefilled, with **Save** and **Cancel** beside it. Enter saves and Esc cancels.
- **On save,** the field closes and the line shows the stored Purpose.
- **On couldn't save,** the field stays open with the typed value, and the `alert` region shows "Couldn't save. Your data wasn't changed." directly below it.
- Shown for an active or paused Reading, whether or not it has a Purpose yet.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `spine-popover.spec.ts` AC-2 (`openBook` focused on open, Shift+Tab from the first control) | Dune, never started, now has "Start reading" before "Open book →". Focus starts on the first actionable control (EXPERIENCE.md → Spine popover), so it starts on "Start reading". Rewrite the first-control expectations. |
| `spine-popover.spec.ts` AC-3 ("No primary action until Stories 3.2 and 4.4: the only buttons are × and the swatches") | Dune gains one button, "Start reading": `1 + SWATCH_NAMES.length` becomes `2 + …`. Neuromancer (finished) keeps none. |
| `SpinePopover.tsx` comment "Focus starts on 'Open book →' (no primary action until Stories 3.2 and 4.4)" | Update with the code. |
| `book-detail.spec.ts` (action stack Edit, Delete) | If any test pins the stack's buttons or their order, add the primary on top: "Start reading" or "Resume" (none for the Main book). |
| `backend/tests/test_contract.py` | Regenerate `schema.d.ts` with `npm run check:api` once the intents and `already_main` exist. |

## Assumptions for the spec to confirm

- **`already_main`'s message:** nothing pins its copy. A suggestion is "This book is already your Main book." The scaffold checks only that there is one.
- **The popover's "Start reading" and Book detail's "Edit Purpose" are buttons styled as links,** not `<a>`s. They open a dialog or a field rather than navigating. If the spec keeps them as `link`s, change `getByRole('button', …)` to `getByRole('link', …)` in AC-8, AC-9 and AC-10.
- **The popover's primary is named "Resume" exactly,** without the title. Pane rows add the title ("Resume The Left Hand of Darkness"); the popover is already named by the title.
- **The Edit Purpose field's label is "Purpose",** the Purpose line's own label. The Start dialog's label is "Purpose (optional)".
- **The Edit Purpose field is prefilled** with the current Purpose. The criteria say "the Purpose line becomes a one-line field".
- **The trade-off line's numbers come from the server.** Book detail must learn the Main book's title, page and percent. Either the Book detail view gains a `mainBook` summary, or the dialog reads the home view, which already has `mainBook`. The suggestion is the home view: it already holds exactly those fields.
- **Resume replaces the Purpose with what the dialog sends.** The dialog prefills it, so an untouched field resends the same Purpose. Clearing the field and resuming clears the Purpose.
- **`edit-purpose` on a Book without a current Reading:** the UI never sends it. The suggestion is 409 `reading_already_finished` (AD-9), with its API test in the story that first needs it. 3.2's scaffolds don't pin it.
- **The Start dialog's couldn't-save** shows the `alert` line inside the dialog above its buttons and keeps it open, as Confirm dialogs do (EXPERIENCE.md → Couldn't save).

## Open items that bear on this story

- **R-01 (reading-state transitions) is the epic's top risk.** RDG-API-001 asks for `start-reading` across the whole state matrix. The 3.2 rows are: never started, finished, paused, the Main book, and each with a Main book present. AC-3, AC-6 and AC-11 cover four of them. The matrix test is a green-phase follow-up.
- **RDG-UNIT-002** (property-based intent sequences, invariants hold) needs `start-reading` to exist. It should land with 3.2 or 3.3, before the epic gate.
- **No deferred-work item names Story 3.2.**

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_start_reading.py`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/start-reading.spec.ts -g "AC-1"`

### AC-3, AC-4, AC-11: the intents
- [ ] `intents/contract.py`: `ErrorCode.ALREADY_MAIN` and an `already_main()` 409 refusal.
- [ ] `intents/start_reading.py`: `StartReadingIntent` (`book_id`, `purpose`, nullable), its parser, and `start_reading(store, clock, intent)`. In one `commit`:
  - refuse a deleted Book (`book_not_found`) and the Main book (`already_main`);
  - pause the current Main book's Reading (`pausedAt` = today);
  - resume the Book's current Reading or append a new one;
  - set `mainBookId`.
- [ ] One trim rule for the Purpose (stripped; empty is `None`), shared by both intents, in `domain/`.
- [ ] `intents/edit_purpose.py`: `EditPurposeIntent`, its parser, and `edit_purpose(store, intent)`.
- [ ] `http/api.py`: the two routes, as `set-spine-color`'s. `npm run check:api`.
- [ ] Activate AC-3, AC-4, AC-11.

### AC-1, AC-2, AC-5, AC-6, AC-7: the Start dialog
- [ ] `useStartReading` and `useEditPurpose` in `api/`, through `sendIntent`.
- [ ] A `StartDialog` component: a modal `<dialog>`, the heading, the trade-off line, the Purpose field, the buttons, focus on open, Esc and Cancel back to the opener.
- [ ] The trade-off line's data from the server (see "Assumptions").
- [ ] `BookDetailPage`: the primary action, **Start reading** or **Resume** from `role` and the current Reading (none for `main`).
- [ ] On success: navigate to `/`, then focus the Main book card's title link once Home has rendered the new Main book.
- [ ] Activate AC-1, AC-2, AC-5, AC-6, AC-7.

### AC-8: the spine popover
- [ ] `SpinePopover`: the "Start reading" link-styled button, or the **Resume** primary, from `ShelfBook.role` and `finished`. It closes the popover, then opens the `StartDialog`.
- [ ] Update `spine-popover.spec.ts` AC-2 and AC-3 (table above).
- [ ] Activate AC-8.

### AC-9, AC-10: Edit Purpose
- [ ] The Current reading block: the "Edit Purpose" link-styled button, and the inline field with Save and Cancel (Enter, Esc). It is shown with or without a Purpose.
- [ ] Couldn't save: keep the field and value, and show the `alert` line under it.
- [ ] Activate AC-9 and AC-10.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-11, the dialog's couldn't-save (TR9):** route `start-reading` to a 503. The dialog stays open with the Purpose kept, the `alert` line is above its buttons, and the confirm button is `aria-disabled` in flight (as `book-detail.spec.ts` AC-12 does).
- [ ] **AC-2, an empty or blank Purpose** is stored as `null`, through the dialog.
- [ ] **AC-1, a finished Book's Book detail** shows **Start reading** and its dialog reads "Start *X*?", not "Resume". The re-read through the UI keeps the earlier Reading in the Readings block.
- [ ] **AC-1, the Main book's Book detail** has neither **Start reading** nor **Resume**.
- [ ] **AC-6, *Y* in serif** in the trade-off line, and no trade-off line when *X* is resumed with no Main book.
- [ ] **AC-6, resuming *X* while *Y* is Main:** *Y* pauses and *X*'s paused Reading resumes, in one commit (API).
- [ ] **AC-6, after the start, *Y* reads "waiting for you, page 120"** on its spine and "Waiting for you, page 120" on its Book detail (3.1's names).
- [ ] **AC-4 from the UI:** a stale tab that still shows **Start reading** for a Book another tab made Main gets `already_main`. The views refetch and the dialog closes, or shows the message. Decide in the spec.
- [ ] **AC-7, Cancel from the popover's entry:** where focus goes once the popover has closed (the spine is the suggestion).
- [ ] **AC-9, an empty Purpose saved** clears the line. A Reading without a Purpose still shows **Edit Purpose** (3.1 hides the Purpose line when it is `null`). Focus after Save or Cancel returns to **Edit Purpose**.
- [ ] **AC-9 on a paused Book** (the API leaf covers the storage).
- [ ] **AC-3, RDG-API-001's matrix:** never started, finished, paused, Main, each with and without a Main book present. Pointers, Reading count and statuses after each.
- [ ] **RDG-API-005** (Purpose set on start, editable, nullable): tick it in the trace once AC-2, AC-9 and AC-11 are green.
- [ ] **RDG-E2E-003** (Cancel changes nothing): tick its Start-dialog half once AC-7 is green. Pause's half is Epic 4.
- [ ] **axe on the open Start dialog,** in both themes.
