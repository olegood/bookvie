---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-31'
storyId: '1.12'
storyKey: '1-12-delete-a-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-112-delete-a-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md'
generatedTestFiles:
  - 'backend/tests/test_delete_book.py'
  - 'frontend/e2e/delete-book.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.12, Conventions for every story → TR8, TR9)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md (Standard intent ACs, Focus after close)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Confirm dialog, Book detail actions, Couldn''t save, Focus after close, Live regions)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Confirm dialog, Book detail action stack)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-API-007, CAT-E2E-006)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-11-open-and-edit-a-book.md'
  - 'backend/bookvie/intents/edit_book.py, intents/book_form.py, intents/contract.py, http/api.py, domain/invariants.py, domain/model.py'
  - 'backend/tests/builder.py, test_add_book.py, test_edit_book.py, test_store.py (FaultyFs)'
  - 'frontend/e2e/fixtures.ts, book-detail.spec.ts, bookcase.ts, catalog-empty.spec.ts'
  - 'frontend/src/pages/BookDetailPage.tsx, pages/CatalogPage.tsx, components/DuplicateDialog.tsx, lib/announce.ts'
  - 'frontend/playwright.config.ts, _bmad/tea/config.yaml'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Book detail, when I press Delete, an alertdialog asks "Delete X? Its readings and card notes are deleted too.", with Delete book and Cancel, and Cancel has default focus; and when the Book is Main, Up next or Waiting for you (seeded in the test), the dialog adds "It is your Main book.", "It is Up next." or "It is waiting for you at p.120."' }
  - { id: AC-2, idSource: generated, text: 'Given the Confirm dialog, when I press Cancel or Esc, nothing changes and focus returns to Delete (CAT-E2E-006)' }
  - { id: AC-3, idSource: generated, text: 'Given the Confirm dialog, when I press Delete book, delete-book removes the Book with its Readings and Card notes, and clears mainBookId, upNextBookId and sideReadBookIds entries pointing at it, all in the same commit; and a vacated Main book or Up next stays empty, with nothing promoted (CAT-API-007); and the app goes to Catalog with focus on Search titles, or on the empty state''s New book when the deleted Book was the last one' }
  - { id: AC-4, idSource: generated, text: 'Given the Confirm dialog and a server that answers couldnt_save (a routed 503 in e2e), when I press Delete book, the dialog stays open, "Couldn''t save. Your data wasn''t changed." appears in an alert line inside the dialog above its buttons, and the Book is unchanged (TR9)' }
  - { id: AC-5, idSource: generated, text: 'The standard intent ACs (TR8) hold for delete-book' }
---

# ATDD Checklist - Epic 1, Story 1.12: Delete a book

**Date:** 2026-10-31
**Author:** Oleg
**Primary test levels:** API (pytest, `TestClient` against `create_app` with a real `Store` on `tmp_path`) for `delete-book`; E2E (Playwright against a real seeded `bookvie`) for the Confirm dialog on Book detail

---

## Story Summary

As Oleg, I want to delete a Book after an explicit confirmation, so that an accidental duplicate can be removed without risking anything else.

The server half is a new intent, `delete-book`. It removes the Book (its Readings and Card notes are nested in it), and in the same commit it clears every pointer naming the Book. Nothing is promoted into a vacated Main book or Up next. The client half adds **Delete** to Book detail's action stack (after **Edit**, DESIGN.md) and the Confirm dialog. Deleting the cover file belongs to Story 1.13, when covers arrive (see Notes).

**Story source:** `epics.md` → Story 1.12. No `spec-1-12-*.md` exists yet (the story is `backlog` in `sprint-status.yaml`). The scaffolds take their names from the criteria, EXPERIENCE.md and the 1.11 code.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). `tea_use_playwright_utils` is false, so the specs use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 1.11.

**Generation mode:** AI generation from the criteria, the UX docs and the existing code. No browser recording was done because the Confirm dialog doesn't exist yet. Every locator comes from a role and name that the criteria pin. Execution was **sequential** with a single author, as in Stories 1.6 to 1.11. The context was already loaded, and one author keeps the helpers consistent with `test_edit_book.py` and `book-detail.spec.ts`.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-5 in source order (one per Given/When/Then block, as in earlier stories). The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | **Delete** → `alertdialog` "Delete *X*? Its readings and card notes are deleted too." + role line; **Delete book** · **Cancel**; Cancel focused | E2E | P0 | `[P0] AC-1` |
| AC-2 | Cancel or Esc: nothing changes, focus back on **Delete** (CAT-E2E-006) | E2E | P1 | `[P1] AC-2` |
| AC-3 | `delete-book` removes the Book, Readings, Card notes; clears all pointers in one commit; nothing promoted (CAT-API-007); then Catalog + focus | API | P0 | `test_ac3_p0_…` |
| AC-4 | Routed 503: the dialog stays open, the `alert` line sits inside it above the buttons, and the Book is unchanged (TR9) | E2E | P1 | `[P1] AC-4` |
| AC-5 | TR8 for `delete-book`: fault → 503 + byte-identical, invariants hold, `book_not_found` | API | P0 | `test_ac5_p0_…` |

Priorities: P0 is R-01 (pointer integrity, AD-18) and R-03 (one commit or none): AC-3 and AC-5. AC-1 is P0 because the confirmation is the story's safety promise ("no action silently deletes data") and the skill-facing surface (R-05). AC-2 and AC-4 are P1. Their failure is visible and recoverable, and AC-4 reuses the couldn't-save path that Stories 1.8 and 1.11 already test.

**Level split (no duplicate coverage):** what deletion does to the library is proven at API, because pointers aren't visible in the UI until Epics 3 and 4. E2E covers the dialog (copy, roles, focus, Esc, the in-dialog alert). AC-3's last clause (go to Catalog, focus on **Search titles** or **New book**) is a UI fact. It is the first green-phase follow-up below, because AC-3's one red leaf is the data guarantee.

---

## Story Integration Metadata

- **Story ID:** `1.12`
- **Story Key:** `1-12-delete-a-book`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 1.12).
- **Story Spec:** [`spec-1-12-delete-a-book.md`](../implementation-artifacts/spec-1-12-delete-a-book.md)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md`
- **Generated Test Files:** `backend/tests/test_delete_book.py`, `frontend/e2e/delete-book.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 5 in all. Backend leaves carry `@pytest.mark.skip(reason=RED)`, and their names carry `ac<n>_p<k>`. E2E leaves are `test.skip(...)`, and their titles carry `[P#] AC-n`.

### API Tests (2 tests): `backend/tests/test_delete_book.py`

- `[P0] AC-3` primary: Dune (Main, Reading at p.120 plus a finished Reading, two Card notes) is deleted, and **Dune's id is no longer among the Books**. Then the response is 200 `{ok: true}`, and none of Dune's Book, Reading or Card note ids appear anywhere in `library.json`. The pointers are `(None, Neuromancer, [Accelerate, Piranesi])`: Main stays empty, and Up next is not promoted. The other Books keep their order, and the invariants hold. Deleting Up next empties it, and The Dispossessed (paused, Waiting for you) is not promoted. Deleting a Side read drops only its entry. Deleting the last two Books leaves `books: []`.
- `[P0] AC-5` primary: an injected fault at `write` gives **503**. Then the exact `couldnt_save` envelope and a byte-identical file (no Book removed, no pointer cleared) for `write`, `fsync` and `replace`. A successful delete of a Main book keeps `check_invariants()`. Deleting the same Book again, or an id that never existed, gives 409 `book_not_found` with a byte-identical file. `book_not_found` is in `ErrorCode`.

### E2E Tests (3 tests): `frontend/e2e/delete-book.spec.ts`

- `[P0] AC-1` primary: on Piranesi's Book detail, **Delete** opens **the `alertdialog`**. Its accessible name starts with "Delete Piranesi?", its text reads "Delete Piranesi? Its readings and card notes are deleted too.", and it has no "It is …" line. It has exactly two buttons, **Delete book** and **Cancel**, and **Cancel** is focused. Then, for each seeded role: Dune → "It is your Main book.", Neuromancer → "It is Up next.", The Dispossessed → "It is waiting for you at p.120.", with Cancel focused each time.
- `[P1] AC-2` primary: **Cancel** puts **focus on Delete**, and the dialog is hidden. Esc does the same. No `delete-book` request was sent, Dune's `h1` is still shown, and the catalog still holds all four Books.
- `[P1] AC-4` primary: with `delete-book` routed to a 503, **Delete book** puts **"Couldn't save. Your data wasn't changed." in the dialog's `alert`**. Then the dialog is still visible, the alert line's bottom edge is above **Delete book**, Piranesi is still in the catalog, the URL is still its Book detail, and `status` is empty.

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): `library_builder` / `LibraryBuilder()` in pytest and `seededServer({…})` in Playwright, with explicit `id`, `mainBookId` and `upNextBookId` where roles are needed. `ROLES_LIBRARY` in the spec seeds one Book per role (Main, Up next, Waiting for you) and one with none.

## Fixtures Created

None. The backend file reuses `_client`, `_library_bytes` and `_stored_books` from `test_add_book.py`, and `FaultyFs` from `test_store.py`. It adds `_delete`, `_library`, `_book_ids`, `_pointers` and `_assert_invariants`. The E2E file has spec-local helpers in the 1.11 style: `confirmDialog`, `deleteButton`, `openBook` (straight to `/book/:id`, which exists since 1.11), `catalogTitles` and `deleteBookRequests`.

## Mock Requirements

One route: AC-4 fulfils `POST /api/intents/delete-book` with the real `couldnt_save` envelope (TR9 says "a routed 503 in e2e"). Everything else runs against a real server or a real `Store`.

## Contract the Scaffolds Pin (names the implementation must use)

- **Intent:** `POST /api/intents/delete-book`, `multipart/form-data` with a JSON part `intent` = `{"bookId": "<id>"}`, parsed like `edit-book` (`extra="forbid"`, strict). Success is exactly `{ok: true}`.
- **Effect:** in one `commit()`: remove the Book from `books` (other Books keep their order), set `mainBookId`/`upNextBookId` to `null` when they name it, and drop it from `sideReadBookIds` (others keep their order). Never fill a vacated pointer.
- **Codes:** 409 `book_not_found` (checked inside the commit), 503 `couldnt_save`. No new `ErrorCode`.
- **Book detail:** a `button` named exactly "Delete" inside `main`, last in the action stack after **Edit**.
- **Confirm dialog:** the only `alertdialog` on the page, with its accessible name starting "Delete *Title*?" (the heading states the consequence). Its text is "Delete *Title*? Its readings and card notes are deleted too." and then, only when it applies, one of "It is your Main book." / "It is Up next." / "It is waiting for you at p.*N*." (*N* = the paused Reading's `currentPage`). It has exactly two buttons, **Delete book** and **Cancel**, and **Cancel** takes focus on open. Esc acts as **Cancel**. Close returns focus to **Delete**.
- **Couldn't save:** the dialog adopts the live regions while open (as `DuplicateDialog` does, `adoptRegions`), so the `alert` is inside it, rendered above the buttons. The dialog stays open.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_delete_book.py -k ac3`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/delete-book.spec.ts -g "AC-1 "`.

### AC-3 / AC-5 the intent (do first)
- [x] `intents/delete_book.py`: `DeleteBookIntent(bookId)` and its parser (422 on a malformed `intent`, as `parse_form_intent` does)
- [x] `change(library)`: `book_not_found` when the id is gone; remove the Book; null `main_book_id` / `up_next_book_id` when they match; filter `side_read_book_ids`; one `commit(store, change)`
- [x] `http/api.py`: `POST /api/intents/delete-book` → `OkResponse(ok=True)`; regenerate the TS types (`npm run check:api`)
- [x] Activate AC-3, then AC-5

### AC-1 / AC-2 the Confirm dialog
- [x] `api/books.ts`: `useDeleteBook` (mirroring `useEditBook`), refetching the views on success (AD-7)
- [x] A `ConfirmDialog` component: native `<dialog>` with `showModal()`, `role="alertdialog"`, `aria-labelledby` the heading, `aria-describedby` the consequence; **Cancel** focused on open; Esc → Cancel; it adopts the live regions (the same lifecycle as `DuplicateDialog`). Restore, Delete card note and Pause reuse it later
- [x] The role line from the Book detail view: whether the Book is Main or Up next, and the paused page (extend `BookDetailView` if it doesn't carry these yet)
- [x] `BookDetailPage.tsx`: **Delete** after **Edit**; closing returns focus to **Delete**
- [x] Activate AC-1, then AC-2

### AC-4 couldn't save
- [x] On 503, the `alert` line inside the dialog above the buttons, in ink; the dialog stays open; **Delete book** is `aria-disabled` while in flight
- [x] Activate AC-4

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **AC-3 (E2E, write while AC-3 goes green):** **Delete book** → URL `/`, Catalog `h1`, **Search titles** focused, the Book is gone from the shelf/list. When the last Book is deleted, the empty shelf shows and `main`'s **New book** is focused. Check that the views refetch (no stale Book detail) and that a status line, if one is added, follows focus
- [ ] AC-1: a Book that is both Up next and paused shows "It is Up next." only (Up next wins over Waiting for you). A Side read gets no role line (the criteria name none). Long titles wrap in the heading. axe AA on the open dialog in both themes
- [ ] AC-2: Tab cycles **Delete book** ↔ **Cancel** inside the dialog; the page behind is inert; live regions are emptied on open
- [x] AC-3 (API): deleting a Book that is both Up next and a Side read (allowed by the invariants) clears both pointers; a malformed `intent` (missing `bookId`, extra key, `null`) → 422 on `intent`
- [x] AC-4: after a 503, a second **Delete book** that succeeds goes to Catalog (retry works); `aria-disabled` in flight (mirror `book-detail.spec.ts` AC-12)
- [ ] Flow 8's failure path: Add anyway → Book detail of the copy → Delete → the original stays (EXPERIENCE.md, Flow 8)

---

## Running Tests

```bash
# Story 1.12 scaffolds (all skipped until activated)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_delete_book.py
npm --prefix frontend run e2e -- e2e/delete-book.spec.ts

# One criterion, after un-skipping it
cd backend && TZ=Europe/Madrid uv run pytest tests/test_delete_book.py -k ac5
npm run build && npm --prefix frontend run e2e -- e2e/delete-book.spec.ts -g "AC-4 "

# Everything
npm run check
```

---

## Red-Green-Refactor Workflow

**RED (done):** 5 scaffolds, all skipped. Each one fails when un-skipped (see Test Execution Evidence).

**GREEN (dev):** server first: AC-3, then AC-5. Then the client: the Confirm dialog (AC-1, AC-2), couldn't-save (AC-4), and the AC-3 navigation follow-up. Run `npm run check` before each commit.

**REFACTOR:** pull the native-dialog lifecycle (showModal, adopt/release regions, default focus, Esc) out of `DuplicateDialog` and the new Confirm dialog into one hook, because Restore, Delete card note and Pause will each add another `alertdialog`.

---

## Next Steps

1. Write the story spec (`bmad-build`, or the story-creation step), and record this checklist under its ATDD artifacts.
2. Implement Story 1.12, activating the scaffolds in the order above.
3. Run `bmad-testarch-automate` for the green-phase follow-ups that are still unticked.

---

## Knowledge Base References Applied

- **test-levels-framework.md / test-priorities-matrix.md:** pointer and commit rules at API, where byte comparisons and fault injection are cheap; the dialog at E2E. P0 = R-01, R-03, and the confirmation itself.
- **test-quality.md:** one criterion per leaf, no conditionals in the assertions. Exact values: ids, pointer tuples, copy, codes, byte-identical files.
- **data-factories.md:** `LibraryBuilder` with only the fields that matter; one `ROLES_LIBRARY` holds each role once.
- **selector-resilience.md:** roles and exact names (`button` "Delete" in `main`, `alertdialog`, `button` "Delete book"/"Cancel", `alert`, `heading` level 1). No test ids or CSS.
- **network-first.md / timing-debugging.md:** the route and the `waitForResponse` are registered before the click. Every other wait is a web-first assertion, with no `waitForTimeout`.
- **fixture-architecture.md:** reuses `seededServer`, so each test gets its own seeded server with cleanup.
- **component-tdd.md:** red-green-refactor per criterion, with focus and live regions checked alongside behaviour.
- **test-healing-patterns.md:** the AC-1 role loop labels each assertion with the title, so a failure names its role. The catalog is read through the API instead of from shelf layout.
- **playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack. No recording was possible (there is no UI yet), and CI is unchanged.

---

## Test Execution Evidence

### Scaffold run (all skipped)

- `TZ=Europe/Madrid uv run pytest tests/test_delete_book.py` → **2 skipped**; `ruff check` clean.
- `npx playwright test e2e/delete-book.spec.ts` → **3 skipped**; `tsc -b` and `oxlint` clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

| ID | Result | First failure |
|---|---|---|
| AC-1 | fail | `getByRole('main').getByRole('button', { name: 'Delete', exact: true })` not found (`click` timeout) |
| AC-2 | fail | the same: no **Delete** button |
| AC-3 | fail | `assert '<dune id>' not in [<dune id>, …]` (the Book is still stored: no route, 405) |
| AC-4 | fail | the same: no **Delete** button |
| AC-5 | fail | `write: assert 405 == 503` |

Every seed was valid: the API seeds passed `check_invariants()` in `LibraryBuilder.write`, and every E2E server started and served Book detail. The failures come from the missing feature, not from the data.

---

## Notes and Open Points

- **The dialog's accessible name.** The criteria give the copy, not the name. The scaffold pins only that the name *starts* with "Delete *Title*?" (the heading, as DESIGN.md says "Heading states the consequence"). The full sentence and the role line are checked as text, so the spec can put them in the heading or in the description.
- **"Waiting for you" vs Up next.** Up next is usually a paused Book too. The seed gives Neuromancer (Up next) a paused Reading, and the scaffold expects only "It is Up next." The spec should say that Up next wins. The AC-1 leaf would also catch a dialog that shows both lines, as soon as the follow-up asserts that "waiting" is absent.
- **Side reads.** The criteria give no role line for a Side read. The API leaf proves that the pointer is cleared, and the UI is left unpinned (a follow-up).
- **Covers.** Story 1.13 adds covers. When it does, delete-book must also remove `covers/<file>` after the commit (AD-12 ordering: commit, then delete the file; an orphan sweep catches a crash in between). Add that case to `test_delete_book.py` in 1.13, not here.
- **Status after delete.** The criteria name a focus target but no `status` text. EXPERIENCE.md's live-region list doesn't name "deleted" either. The scaffolds don't pin one. If the spec adds "Deleted *X*.", set it after focus settles.
- **AC-3's UI clause has no red leaf.** It follows the one-leaf-per-criterion rule, as AC-12's UI half did in 1.11. Write it as the first follow-up, together with the AC-3 implementation.
