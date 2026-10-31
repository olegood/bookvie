---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-31'
storyId: '1.11'
storyKey: '1-11-open-and-edit-a-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-111-open-and-edit-a-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md'
generatedTestFiles:
  - 'backend/tests/test_edit_book.py'
  - 'frontend/e2e/book-detail.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.11, Conventions for every story → TR8)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md (Book fields, Back-fill, Duplicates, Agent Label Contract, New/Edit book panel)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-3, AD-6, AD-7, AD-9, AD-10, AD-11, Targeting)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Book detail, New book panel, Duplicate dialog edit mode, Focus after close, Agent Label Contract, validation table)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Book detail, New book panel, Typography)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-API-002/004/005/006, FIN-API-003, CAT-E2E-003/005/007, R-09)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-10-see-the-library-as-a-bookcase.md'
  - 'backend/bookvie/intents/add_book.py, intents/contract.py, intents/commit.py, http/api.py, domain/model.py, domain/book_fields.py, domain/duplicates.py, domain/invariants.py'
  - 'backend/tests/builder.py, conftest.py, test_add_book.py, test_duplicate_book.py, test_store.py (FaultyFs)'
  - 'frontend/e2e/fixtures.ts, new-book-panel.spec.ts, duplicate-dialog.spec.ts, catalog-list.spec.ts'
  - 'frontend/src/main.tsx, pages/CatalogList.tsx, pages/NewBookPanel.tsx, components/DuplicateDialog.tsx, lib/catalogView.ts, styles/tokens.css'
  - 'frontend/playwright.config.ts, _bmad/tea/config.yaml'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given a Book, when I activate its title in the List view, its Book detail page opens: a surface card whose h1 is the title (serif), with subtitle, author, a metadata grid (Pages, Edition only when it isn''t 1, Language, Publisher, Type, ISBN, Year), Tags as non-interactive chips, and a Readings block (UX-DR43); a back-filled Reading shows as "Finished 14 Aug 2019" with no start date; and document.title is "Title — bookvie"' }
  - { id: AC-2, idSource: generated, text: 'Given Book detail, when I press Edit, the panel opens as a dialog named "Edit book", prefilled, with Save changes as its submit; on success it closes, the status region reads "Saved Title.", and focus returns to Edit' }
  - { id: AC-3, idSource: generated, text: 'Given edit-book, when it is sent, it applies the same field validation as add-book (422 invalid_fields); it runs the duplicate check only when the title, an author or the ISBN changed, with the same 409 / confirmDuplicate flow; and the duplicate check compares against every Book except the one being edited, so an API test that changes only an ISBN''s hyphenation never gets duplicate_book' }
  - { id: AC-4, idSource: generated, text: 'Given a duplicate_book refusal for edit-book, when the response arrives, the same Possible duplicate alertdialog opens over the Edit book panel, with Don''t save (default focus) and Save anyway; Don''t save closes it with nothing saved and returns to the panel unchanged, with focus on Save changes; Save anyway resends edit-book with confirmDuplicate: true, with the same outcome as a normal "Saved Title." save' }
  - { id: AC-5, idSource: generated, text: 'Given any edit-book refusal that carries fields (422 invalid_fields, or a 409 such as pages_below_current_page), when the response arrives, the Edit book panel shows it exactly like the New book panel: each named field has aria-invalid="true" and a linked message, the alert region holds the summary, and focus moves to the first invalid field (AD-9)' }
  - { id: AC-6, idSource: generated, text: 'Given a Book whose unfinished Reading is at page 300 (seeded with LibraryBuilder), when I save Pages = 250, it is refused with 409 pages_below_current_page and the field message "Pages can''t be less than 300, the page you''re on." (CAT-API-006); and finished Readings keep their finishedPages when Pages changes' }
  - { id: AC-7, idSource: generated, text: 'Given a Book with a Card note on page 270, when I save Pages = 260, it is refused with "Pages can''t be less than 270, where a card note is."; and for a range the highest Card note page is its pageEnd when present, else its pageStart (a note on pp.268–272 refuses Pages = 270)' }
  - { id: AC-8, idSource: generated, text: 'Given a Book with finished Readings, when the edit panel opens, Finished on shows the most recent finish date, and changing it changes that Reading''s finishDate (not in the future); and clearing it is refused with "A finish date can''t be removed here."' }
  - { id: AC-9, idSource: generated, text: 'Given the most recent finished Reading has a startDate, when Finished on is changed to a date before it, nothing is saved, and the response is 422 with "Finished on can''t be before 12 March 2026, when this reading started." on Finished on (the same message as FIN-API-003)' }
  - { id: AC-10, idSource: generated, text: 'Given a Book with no finished Reading, when I fill Finished on and save, a back-filled Reading is added; and on a Book with an active or paused Reading, the current Reading is left untouched' }
  - { id: AC-11, idSource: generated, text: 'Given an edit that changes Spine color, when it is saved, spineColor is resolved again, and edits that don''t touch a color input leave it unchanged (AD-11)' }
  - { id: AC-12, idSource: generated, text: 'The standard intent ACs (TR8) hold for edit-book, and the panel''s couldn''t-save behavior matches Story 1.8' }
---

# ATDD Checklist - Epic 1, Story 1.11: Open and edit a book

**Date:** 2026-10-31
**Author:** Oleg
**Primary test levels:** API (pytest, `TestClient` against `create_app` with a real `Store` on `tmp_path` and a `FakeClock`) for the `edit-book` rules; E2E (Playwright against a real seeded `bookvie`) for Book detail and the Edit book panel

---

## Story Summary

As Oleg, I want a page for each Book where I can see and correct its details, so that mistakes from cataloging and back-filled finish dates can be fixed.

The story has two halves. The server half adds a new intent, `edit-book`. It reuses add-book's field parsing and duplicate rules, and it adds the edit-only rules: the Pages floors (current page and highest Card note page), Finished on in edit mode (change the latest finish, never clear it, not before that Reading's start, back-fill when there is none), and spine color re-resolution (AD-11). The client half adds the Book detail route (linked from List view titles) and the New book panel in edit mode, with the Duplicate dialog's Don't save · Save anyway. The rest of Book detail is not in this story: the action stack beyond **Edit**, Current reading, Card notes, the Pace calculator and Change color arrive with Stories 1.12, 1.14 and Epics 3 to 6. Covers (and **Remove cover**) arrive with Story 1.13.

**Story source:** [`spec-1-11-open-and-edit-a-book.md`](../implementation-artifacts/spec-1-11-open-and-edit-a-book.md). The criteria come from `epics.md` → Story 1.11.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false (the package isn't installed), so the specs use the project's own `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.10.

**Generation mode:** AI generation from the story, EXPERIENCE.md, DESIGN.md, the architecture and the existing code. There was no browser recording, because neither Book detail nor the edit panel exists yet. Every locator comes from the role and name that the criteria and the Agent Label Contract pin. Execution was sequential with a single author, as in Stories 1.6 to 1.10: the context was already loaded, and one author keeps the helpers consistent with `test_add_book.py` and `duplicate-dialog.spec.ts`.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-12 in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | List view title → Book detail: serif `h1`, subtitle, author, metadata grid (Edition only ≠ 1), plain tag chips, Readings with "Finished 14 Aug 2019"; `document.title` | E2E | P0 | `[P0] AC-1` |
| AC-2 | **Edit** → `dialog` "Edit book", prefilled, **Save changes**; success closes, "Saved *Title*.", focus on **Edit** | E2E | P0 | `[P0] AC-2` |
| AC-3 | Same validation (422); duplicate check only on title/author/ISBN change; self excluded (ISBN hyphenation) | API | P0 | `test_ac3_p0_…` |
| AC-4 | Possible duplicate over Edit book: **Don't save** (default) · **Save anyway** (`confirmDuplicate`) | E2E | P0 | `[P0] AC-4` |
| AC-5 | Refusals with `fields` (422, or a 409 like `pages_below_current_page`) shown as in New book: `aria-invalid`, message, alert, focus | E2E | P1 | `[P1] AC-5` |
| AC-6 | Pages below the current page → 409 `pages_below_current_page` + message; `finishedPages` kept | API | P0 | `test_ac6_p0_…` |
| AC-7 | Pages below the highest Card note page refused; a range counts by `pageEnd` | API | P0 | `test_ac7_p0_…` |
| AC-8 | Finished on changes the most recent `finishDate`; clearing refused; not in the future | API | P0 | `test_ac8_p0_…` |
| AC-9 | Finished on before the Reading's `startDate` → 422 with the FIN-API-003 message | API | P1 | `test_ac9_p1_…` |
| AC-10 | Finished on with no finished Reading back-fills one; an active Reading is untouched | API | P0 | `test_ac10_p0_…` |
| AC-11 | Changing Spine color re-resolves `spineColor`; other edits leave it alone (AD-11) | API | P1 | `test_ac11_p1_…` |
| AC-12 | TR8 for `edit-book` (503 byte-identical, invariants, `book_not_found`, new codes in the contract) | API | P0 | `test_ac12_p0_…` |

Priorities: P0 covers R-09, the edit consequences: AC-3, AC-6, AC-7, AC-8 and AC-10 protect data a correction could damage. It also covers TR8 (AC-12) and the surface the cataloging skill and assistive tech operate (R-05): opening a Book (AC-1), the Edit panel's names and outcome (AC-2), and the Duplicate dialog in edit mode (AC-4). P1 is for rules with an obvious, recoverable failure (AC-9 refuses a date; AC-11 is a color) and for the panel's error display (AC-5), which reuses the New book panel's tested code path.

Level split (no duplicate coverage): every `edit-book` rule is proven at API. The E2E tests use the real server's refusals only to drive the panel, and they check what the browser shows: roles, names, values, focus and live regions. AC-8's "the panel shows the most recent finish date" is a UI fact, so it is asserted in the AC-2 E2E leaf (the prefill), and the AC-8 API leaf proves what the save changes.

---

## Story Integration Metadata

- **Story ID:** `1.11`
- **Story Key:** `1-11-open-and-edit-a-book`
- **Story File:** [`spec-1-11-open-and-edit-a-book.md`](../implementation-artifacts/spec-1-11-open-and-edit-a-book.md); criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.11)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md`
- **Generated Test Files:** `backend/tests/test_edit_book.py`, `frontend/e2e/book-detail.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 12 in all. Backend leaves carry `@pytest.mark.skip(reason=RED)`, where `RED` is "ATDD red phase: un-skip when Story 1.11 builds edit-book", and their names carry `ac<n>_p<k>`. E2E leaves are `test.skip(...)`, and their titles carry `[P#] AC-n`.

### API Tests (8 tests): `backend/tests/test_edit_book.py`

- `[P0] AC-3` primary: changing only Dune's ISBN hyphenation (`9780441172719` → `978-0-441-17271-9`) is 200 `{ok: true}`, stored as typed. Then Pages "abc" and Language "  " give 422 `invalid_fields` with both messages, and nothing is saved. Neuromancer retitled "Dune" by Frank Herbert gives 409 `duplicate_book` listing Dune, and nothing is saved. `confirmDuplicate: true` saves. With two Dunes now in the catalog, a Pages-only edit of the second saves (no check).
- `[P0] AC-6` primary: Pages 250 on the Main Book with its Reading at page 300 is **409**. Then the code is `pages_below_current_page`, the kind `refusal`, `fields` is exactly `pages`: "Pages can't be less than 300, the page you're on.", and the file is byte-identical. Pages 300 saves, and the earlier finished Reading keeps `finishedPages` 412.
- `[P0] AC-7` primary: Pages 260 with Card notes on pp.270 and 12 is **409**. Then the field message is "Pages can't be less than 270, where a card note is.", the code is `pages_below_card_note`, and nothing is saved. A note on pp.268–272 refuses 270 ("…272…") and allows 272.
- `[P0] AC-8` primary: with a back-fill (2019-08-14) and a later finish (2025-06-01), Finished on "2025-06-03" sets the **later Reading's `finishDate` to 2025-06-03**. Then the response is 200, the back-fill is unchanged, and there are still two Readings. Cleared gives 422 "A finish date can't be removed here."; tomorrow (fake today 2026-10-30) gives 422 "Finished on can't be in the future."; both are byte-identical.
- `[P1] AC-9` primary: Finished on 2026-03-11 for a Reading started 2026-03-12 is **422**. Then `finishedOn`: "Finished on can't be before 12 March 2026, when this reading started.", the code is `invalid_fields`, and the file is byte-identical. The start day itself saves.
- `[P0] AC-10` primary: on the Main Book with a Reading at p.120, Finished on 2024-05-01 adds **exactly one finished Reading `(startDate None, 2024-05-01, finishedPages 412)`**. Then 200; the unfinished Reading is equal to what was seeded, and `mainBookId` is unchanged. A never-started Book gets one back-fill with its page count.
- `[P1] AC-11` primary: Spine color "#1A2B3C" on a Book with a cover color stores **`spineColor` "#1A2B3C"**. Then 200; `spineColorUser` is "#1A2B3C", and the cover and curated colors are unchanged. Emptying it re-resolves to the cover color. A subtitle-only edit of a Book whose stored `spineColor` (#123456) differs from what resolution would give leaves it at #123456.
- `[P0] AC-12` primary: an injected fault at `write` gives **503**. Then the exact `couldnt_save` envelope and a byte-identical file, for `write`, `fsync` and `replace`. A successful edit (subtitle + back-fill on a Main Book) keeps `check_invariants()`. An unknown `bookId` gives 409 `book_not_found`, byte-identical. `ErrorCode` in OpenAPI contains `book_not_found`, `pages_below_current_page` and `pages_below_card_note`.

### E2E Tests (4 tests): `frontend/e2e/book-detail.spec.ts`

- `[P0] AC-1` primary: in List view, "Dune" is a **`link`** in the table. Then, after clicking it: `h1` "Dune", focused, in `ui-serif`; `document.title` "Dune — bookvie"; an ancestor below `main` has the `surface` background. Subtitle "A Novel" and "Frank Herbert" are shown. `term`s are exactly Pages, Language, Publisher, Type, ISBN, Year, with `definition`s 412, English, Chilton Books, Hardcover, the ISBN and 1965. "sci-fi" and "classics" are visible, with no button or link of that name. A `region` "Readings" holds "Finished 14 Aug 2019" and no text matching /start/i. Back, then Neuromancer (Edition 3): terms include Edition, with the value 3.
- `[P0] AC-2` primary: **Edit** opens a **`dialog` "Edit book"**. Then Title is focused, and every field is prefilled as stored: Author(s) "Frank Herbert; Brian Herbert", Type `hardcover`, Finished on **2024-02-10** (the later of two finishes), Tags "sci-fi, classics", Spine color empty. **Save changes** is there and **Add book** is not. A Subtitle change, then **Save changes**: `status` "Saved Dune.", the panel hidden, **Edit** focused, the new subtitle shown, and `h1` still "Dune".
- `[P0] AC-4` primary: retitling *Dune Messiah* to "Dune" opens **`alertdialog` "Possible duplicate"**. Then its buttons are exactly **Don't save**, **Save anyway**, and **Don't save** is focused. **Don't save** hides it; the panel is still open with Title "Dune"; **Save changes** is focused; the catalog is unchanged. Then **Save changes**, then **Save anyway**: "Saved Dune.", the panel hidden, **Edit** focused, the sent intents' `confirmDuplicate` is `[undefined, true]`, and the catalog has two Dunes.
- `[P1] AC-5` primary: Pages 250 on the Main Book at page 300 gives **Pages `aria-invalid="true"`**. Then the accessible description is "Pages can't be less than 300, the page you're on.", Pages is focused, the response code is `pages_below_current_page`, the `alert` holds the response's `message`, and the panel is open. Then Pages 412 and Title empty: Title is invalid with "Title is required.", the alert reads "Not saved. 1 field needs attention: Title.", Title is focused, and Pages is no longer invalid.

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): the `library_builder` fixture in pytest and `seededServer({…})` in Playwright, with `id` and `mainBookId` given explicitly when a Main book is needed. Literals are named: `DUNE` and `DUNE_FORM` (the Book as seeded and as the panel prefills it), `NEUROMANCER` and `NEUROMANCER_FORM`, `DUNE_ISBN13` and `DUNE_ISBN13_HYPHENATED`, `DUNE_ID`, and `SURFACE`.

## Fixtures Created

None. The backend file reuses `_client` (with `FakeClock(TODAY = 2026-10-30)`), `_library_bytes`, `_stored_book(s)` and `_field_messages` from `test_add_book.py`, and `FaultyFs` from `test_store.py`, as `test_duplicate_book.py` does. It adds `_edit(client, book_id, form, **changes)` and `_readings`. The E2E file has spec-local helpers in the 1.8 to 1.10 style: `editPanel`, `duplicateDialog`, `titleLink`, `openBook` (Catalog in List view → title link), `openEdit`, `catalogTitles`, `editBookRequests` and `intentOf`.

## Mock Requirements

None. Every test runs against a real server or a real `Store`. Nothing is routed. The routed 503 for the panel's couldn't-save case is a green-phase follow-up (AC-12 below).

## Contract the Scaffolds Pin (names the implementation must use)

- **Intent:** `POST /api/intents/edit-book`, `multipart/form-data` with a JSON part `intent` holding `bookId` plus every Edit book field as the panel's string, under add-book's camelCase keys (`title`, `subtitle`, `pages`, `authors`, `edition`, `language`, `publisher`, `type`, `isbn`, `year`, `finishedOn`, `tags`, `spineColor`), plus optional `confirmDuplicate: true`. Success is exactly `{ok: true}` (no `ids`: nothing is minted; a back-filled Reading's id is not returned).
- **Codes:** 409 `pages_below_current_page` and 409 `pages_below_card_note` (kind `refusal`, `fields: [{field: "pages", …}]`); 409 `book_not_found`; 422 `invalid_fields` for every Finished on rule. All three new codes are in `ErrorCode`.
- **Messages:** "Pages can't be less than *N*, the page you're on."; "Pages can't be less than *N*, where a card note is."; "A finish date can't be removed here."; "Finished on can't be before *12 March 2026*, when this reading started." (day, full month name, year).
- **Stored effects:** ISBN stored as typed. Finished on edits the finished Reading with the latest `finishDate` in place. A back-fill appends a Reading with `startDate: null` and `finishedPages` = Pages. Spine color: `spineColorUser` = the field or null, then `spineColor` re-resolved; with no color input change, `spineColor` is untouched.
- **Duplicate check on edit:** runs only when title, authors or ISBN differ from the stored Book, and compares against every other Book.
- **Book detail:** reached from a `link` named exactly the title in the List view table. `h1` = title, focused on arrival, `ui-serif`; `document.title` "*Title* — bookvie"; the card has the `surface` background. The metadata grid is a description list: `term`s "Pages", "Edition" (only when ≠ 1), "Language", "Publisher", "Type", "ISBN", "Year", in that order, with values as `definition`s (Pages formatted like the List view; Type as its label "Hardcover"). Rows whose value is empty (ISBN, Year) may be left out; see Notes. Tags: text chips, no `button` or `link`. Readings: a `region` named "Readings" (a `section` labelled by its heading). A back-filled Reading reads "Finished 14 Aug 2019".
- **Edit panel:** **Edit** is a `button` named exactly "Edit" on Book detail. The panel is a `dialog` named exactly "Edit book", with the New book fields (Agent Label Contract) prefilled. Author(s) are joined with "; ", Tags with ", ", Type is the select value, Finished on is the latest finish, and Spine color is `spineColorUser` or empty. The submit is **Save changes**, with no **Add book**. On success: `announce('status', 'Saved <Title>.')`, the panel closes, and focus goes to **Edit**.
- **Duplicate dialog in edit mode:** the same `alertdialog` "Possible duplicate", with buttons exactly **Don't save**, **Save anyway**. **Don't save** returns focus to **Save changes**. The first send carries no `confirmDuplicate` key, and the resend carries `true`, as `addBook` does.
- **Field refusals:** a 409 with `fields` is rendered through the same path as a 422: `aria-invalid`, the message as the accessible description, the alert holding the response's top-level `message`, and focus on the first invalid field.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`, then watch it fail, implement, and watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_book.py -k ac6`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/book-detail.spec.ts -g "AC-2 "`.

### AC-3 the intent (do first: every other API leaf posts to it)
- [x] `intents/edit_book.py`: `EditBookIntent` = `AddBookIntent`'s fields + `book_id` (required); parse with `parse_book_fields` against `clock.today()`; refuse with `book_not_found` inside the commit when the id is gone
- [x] Duplicate check inside the commit, only when title, authors or ISBN differ from the stored Book; run `find_duplicates` over every Book except this one; `confirmDuplicate` as in add-book
- [x] `http/api.py`: `POST /api/intents/edit-book` → `OkResponse(ok=True)`; regenerate the TS types (`npm run check:api`)
- [x] Activate AC-3, then AC-12 (TR8: FaultyFs, invariants, `book_not_found`, codes in `ErrorCode`)

### AC-6 / AC-7 Pages floors
- [x] `ErrorCode.PAGES_BELOW_CURRENT_PAGE`, `PAGES_BELOW_CARD_NOTE`, `BOOK_NOT_FOUND`; a 409 helper that carries one `FieldError` on `pages`
- [x] Current page: the unfinished Reading (active or paused) of this Book. Card note page: `max(pageEnd or pageStart)`. Check after field validation, and only when Pages is valid
- [x] Never touch `finishedPages` on Pages change
- [x] Activate AC-6, then AC-7

### AC-8 / AC-9 / AC-10 Finished on in edit
- [x] The latest finished Reading by `finishDate`: empty Finished on refused ("A finish date can't be removed here."); a changed date sets that Reading's `finishDate`; not before its `startDate` ("Finished on can't be before 12 March 2026, when this reading started.", the same formatter Finish dialog / FIN-API-003 will use); not in the future (already in `parse_book_fields`)
- [x] No finished Reading and a date given: append a back-filled Reading exactly as add-book does; leave the unfinished Reading and `mainBookId` alone
- [x] Same date as stored: no change
- [x] Activate AC-8, AC-9, AC-10

### AC-11 spine color
- [x] Re-resolve `spineColor` only when `spineColor` (the user input) differs from `spineColorUser`; then `resolve_spine_color(user, fromCover, curated)`
- [x] Activate AC-11

### AC-1 Book detail
- [x] A Book detail view. AD-6 allows `GET /api/views/book?id=…` or similar; the E2E leaves don't pin the URL. It returns what the page shows: fields, tags and Readings (start, finish)
- [x] Route (e.g. `/books/:bookId`) in `main.tsx`; `pages/BookDetail.tsx`: `surface` card, `h1` in `book-title-lg`, subtitle, author, a `dl` metadata grid, tag chips, a `section` "Readings" labelled by its heading; `usePageTitle` (or the existing `lib/page.ts`) for "*Title* — bookvie" and focus on `h1`
- [x] `CatalogList.tsx`: the title cell becomes a `Link` to Book detail (the comment there already says so). The add-flow focus target becomes that link. Re-run `new-book-panel.spec.ts` AC-5 (`row.locator(':focus')` must still read "Dune") and `duplicate-dialog.spec.ts` AC-8
- [x] Format a Reading as "Finished 14 Aug 2019" (en-GB short month), with "Started …" only when `startDate` is set
- [x] Activate AC-1

### AC-2 / AC-4 / AC-5 the Edit book panel
- [x] Generalize `NewBookPanel` with a `mode: 'new' | 'edit'` (or a `book` prop): dialog name, prefill, **Save changes**, `useEditBook` in `api/books.ts` (mirroring `addBook`, with `bookId` first), and `onSaved` → `announce('status', 'Saved <Title>.')` after the views refetch (AD-7), with focus on **Edit**
- [x] `DuplicateDialog`: labels by mode (**Don't add** · **Add anyway** / **Don't save** · **Save anyway**); in edit mode **Don't save** returns focus to **Save changes**, not Title
- [x] Map a 409 with `fields` through the same field-error path as 422
- [x] Activate AC-2, AC-4, AC-5

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] AC-12 (E2E, TR9): a routed 503 on **Save changes** keeps the Edit book panel open with every edited value, the `alert` and the in-panel line read "Couldn't save. Your data wasn't changed." in ink, and **Save changes** is `aria-disabled` while in flight (mirror `new-book-panel.spec.ts` AC-7 and AC-12)
- [x] AC-1: a Book with no subtitle, ISBN or Year (no empty rows or dangling labels); several authors on the author line; an unknown Book id in the URL lands on the not-found page; a Reading with a start date reads "Started … · Finished …"; Back returns to Catalog in List view with the search kept (dropped: not in the spec, see the 1.11 review); axe AA in both themes
- [x] AC-2: **Cancel**, **Close** and Esc discard edits and return focus to **Edit**; the live regions are emptied on open and at each press; Tags suggestions work in edit mode; a swatch press fills Spine color
- [x] AC-3: whitespace-only or case-only changes to title or authors. Decide whether "changed" compares raw strings or normalized keys (see Notes)
- [x] AC-3: an ISBN-10 ↔ ISBN-13 rewrite of the same number
- [x] AC-4: Esc on the dialog acts as **Don't save**; Tab cycles the two buttons; axe on the open dialog
- [x] AC-6: a *paused* Reading (not Main) at p.300 refuses the same way; Pages below both floors at once. Decide which message wins, or list both (see Notes)
- [x] AC-8: the same date resent is a no-op success; when two finished Readings share the latest date, the later one in list order is edited
- [x] AC-10: on a paused Book (Waiting for you) the back-fill leaves `pausedAt` and Up next alone
- [x] AC-11: a swatch in edit mode; a Book with a cover color and a user color, cleared back to the cover color (done at API; repeat in E2E only if the panel logic grows)
- [x] CAT-E2E-007 (Flow 9): back-fill via Edit on Book detail, then the spine in Bookcase view shows the color and the meter counts it

---

## Running Tests

```bash
# Story 1.11 scaffolds (all skipped until activated)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_book.py
npm --prefix frontend run e2e -- e2e/book-detail.spec.ts

# One criterion, after un-skipping it
cd backend && TZ=Europe/Madrid uv run pytest tests/test_edit_book.py -k ac6
npm run build && npm --prefix frontend run e2e -- e2e/book-detail.spec.ts -g "AC-4 "

# Everything
npm run check
```

---

## Red-Green-Refactor Workflow

**RED (done):** 12 scaffolds, all skipped. All 12 fail when un-skipped (see Test Execution Evidence).

**GREEN (dev):** server first: AC-3 (the intent exists) and AC-12 (TR8), then the Pages floors (AC-6, AC-7), Finished on (AC-8, AC-9, AC-10) and color (AC-11). Then the client: Book detail and the title link (AC-1), because every other E2E leaf enters through it, then the panel in edit mode (AC-2), the dialog (AC-4) and field refusals (AC-5). Run `npm run check` before each commit.

**REFACTOR:** with everything green, move the shared parse/duplicate/back-fill steps of `add_book` and `edit_book` into one place in `intents/`. Then keep the panel's mode differences (name, prefill, submit label, dialog labels, focus after close) in one small table rather than in conditionals throughout `NewBookPanel`.

---

## Next Steps

1. ~~Write the story spec~~ (done: `spec-1-11-open-and-edit-a-book.md`).
2. ~~Implement Story 1.11~~ (done: all 12 scaffolds active).
3. Run `bmad-testarch-automate` for the green-phase follow-ups above that are still unticked.

---

## Knowledge Base References Applied

- **test-levels-framework.md / test-priorities-matrix.md:** every `edit-book` rule is at API, where a fake clock and byte comparisons are cheap. E2E covers only what needs a browser: routing, roles, focus, prefill and live regions. P0 is R-09 (edit consequences), TR8 and the skill-facing surface.
- **test-quality.md:** one criterion per leaf, and no conditionals. Exact values (messages, dates, colors, codes, byte-identical files), and assertions sit in the test bodies.
- **data-factories.md:** `LibraryBuilder` with only the fields that matter; `DUNE`/`DUNE_FORM` keep the stored Book and its prefilled form side by side.
- **selector-resilience.md:** roles and exact accessible names (`link` by title, `heading` level 1, `dialog` "Edit book", `alertdialog` "Possible duplicate", `region` "Readings", `term`/`definition`, Agent Label Contract fields). No test ids or CSS classes.
- **network-first.md / timing-debugging.md:** the one response the AC-5 leaf reads is awaited through `waitForResponse`, registered before the click. Every other wait is a web-first assertion. There is no `waitForTimeout` and no routing.
- **fixture-architecture.md:** reuses `seededServer`, so every test gets its own seeded server with cleanup.
- **component-tdd.md:** red-green-refactor per criterion, with accessibility (names, focus, live regions) alongside behaviour.
- **test-healing-patterns.md:** the refused alert text is read from the server's response, not hard-coded, so copy changes in `contract.py` don't break the UI test. Readings are found by `finishDate`, not by list position.
- **playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack. No recording was possible (no UI yet), and the CI pipeline is unchanged.

---

## Test Execution Evidence

### Scaffold run (all skipped)

- `TZ=Europe/Madrid uv run pytest tests/test_edit_book.py` → **8 skipped**; `ruff check` clean. (`ruff format` isn't enforced in this repo, and 21 existing test files differ from it too.)
- `npx playwright test e2e/book-detail.spec.ts` → **4 skipped**; `tsc -b` and `oxlint` clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

| ID | Result | First failure |
|---|---|---|
| AC-1 | fail | `getByRole('table').getByRole('link', { name: 'Dune' })` not found (`toBeVisible`) |
| AC-2 | fail | setup: the List view title link "Dune" not found (`click` timeout); AC-1 brings it |
| AC-3 | fail | `assert 405 == 200` (no `edit-book` route) |
| AC-4 | fail | setup: the title link "Dune Messiah" not found (`click` timeout) |
| AC-5 | fail | setup: the title link "Dune" not found (`click` timeout) |
| AC-6 | fail | `assert 405 == 409` |
| AC-7 | fail | `assert 405 == 409` |
| AC-8 | fail | `assert '2025-06-01' == '2025-06-03'` (the latest finish unchanged) |
| AC-9 | fail | `assert 405 == 422` |
| AC-10 | fail | `assert [] == [(None, '2024-05-01', 412)]` (no back-fill added) |
| AC-11 | fail | `assert '#336699' == '#1A2B3C'` (spine color unchanged) |
| AC-12 | fail | `write: assert 405 == 503` |

Every API seed passed `check_invariants()` when it was written, so the failures come from the missing intent, not from the data.

---

## Notes and Open Points

- **The E2E leaves enter through AC-1.** Book detail's URL isn't specified anywhere (EXPERIENCE.md only says it is a page), so the scaffolds don't pin one. They reach Book detail the way the criterion says: the List view title link. As a result, AC-2, AC-4 and AC-5 fail in setup until AC-1's link exists, and then at their own first assertion. Once the spec fixes the route (e.g. `/books/:bookId`), `openBook` may go there directly to save time. Keep AC-1 going through the link.
- **"Changed" for the duplicate check.** FR-3 says the check runs "only if title, an author or ISBN changed". The scaffolds pin only clear cases: hyphenation-only ISBN changes are *changed* (the check runs, and self-exclusion is what keeps it quiet), and an edit of Pages alone is *unchanged*. The spec must decide how whitespace-only and case-only edits count: compare after `parse_book_fields` trimming, or by the duplicate key. Trimmed raw values are the natural reading. Comparing by the key would let "dune" → "Dune" skip the check, which is harmless.
- **The Card note code.** The story gives the message but no code for the Card note floor. The scaffolds pin `pages_below_card_note`, by analogy with AD-9's `pages_below_current_page`. If the spec picks another name, rename it in AC-7 and AC-12.
- **Both Pages floors at once.** When Pages is below both the current page and a Card note page, one 409 carries one `pages` field message. The spec should say which floor wins. The higher floor gives the user the number they actually need.
- **Finished on prefill vs. the form's "unchanged".** The panel prefills Finished on, so every save sends it. The server must treat "same as the latest `finishDate`" as no change, and "empty" as a refusal only when a finished Reading exists. On a Book with no finished Reading, empty means "still not read". The AC-3, AC-6 and AC-11 scaffolds send the prefilled value (or empty when there is no finish) to stay valid under that rule.
- **Empty metadata rows.** DESIGN.md lists ISBN and Year in the grid, and both are optional. AC-1 seeds both, so the scaffold stays neutral. For Neuromancer (no ISBN or Year) it checks only that Edition comes second. Leaving empty rows out is the cleaner choice, and it is listed as a follow-up.
- **The 409 alert text.** For a 409 with `fields`, the story says "the alert region holds the summary" but gives no copy, and the server owns all copy (AD-9). AC-5 asserts the alert equals the response's `message`, whatever `contract.py` chooses. "Not saved. 1 field needs attention: Pages." would match the 422 summary.
- **AC-12's UI half.** TR8 is one criterion with one leaf, so its red leaf is the API guarantee. The panel's couldn't-save behaviour (TR9, "matches Story 1.8") is the first green-phase follow-up. Write it while AC-2 goes green, because it shares that leaf's setup.
- **The List view's focus target after an add.** Today the title `td` is focusable and takes focus after an add. When it becomes a link, the link should take that role. `new-book-panel.spec.ts` AC-5 reads `row.locator(':focus')` → "Dune", so it keeps passing if the link is focused.
