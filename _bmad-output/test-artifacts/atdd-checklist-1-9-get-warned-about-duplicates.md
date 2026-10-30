---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-30'
storyId: '1.9'
storyKey: '1-9-get-warned-about-duplicates'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-19-get-warned-about-duplicates'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md'
generatedTestFiles:
  - 'backend/tests/test_duplicate_book.py'
  - 'frontend/e2e/duplicate-dialog.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.9, Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md (Duplicates, Response envelope, Duplicate dialog)'
  - '_bmad-output/implementation-artifacts/spec-1-8-add-a-book-with-the-new-book-panel.md (region host, review notes naming 1.9)'
  - '_bmad-output/planning-artifacts/prds/prd-bookvie-2026-10-28/prd.md (FR-3)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-8, AD-9, AD-10)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Duplicate dialog, Agent Label Contract, Focus after close, copy table)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Duplicate dialog)'
  - '_bmad-output/test-artifacts/test-design-qa.md (R-08; CAT-UNIT-001, CAT-UNIT-002, CAT-API-009, CAT-E2E-003)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md, atdd-checklist-1-8-add-a-book-with-the-new-book-panel.md'
  - 'backend/bookvie/intents/add_book.py, intents/contract.py, domain/book_fields.py, http/api.py'
  - 'backend/tests/test_add_book.py, test_contract.py, builder.py, conftest.py, test_layers.py'
  - 'frontend/e2e/fixtures.ts, e2e/new-book-panel.spec.ts, e2e/catalog-list.spec.ts'
  - 'frontend/src/pages/NewBookPanel.tsx, components/SidePanel.tsx, api/books.ts, api/envelope.ts, api/intents.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'The domain/ matching functions, unit-tested: ISBNs match after removing hyphens and spaces and converting ISBN-10 to ISBN-13 ("0-441-17271-7" matches "9780441172719"); titles match ignoring case and extra whitespace; authors match as sets of semicolon-separated names, ignoring case and surrounding spaces, with at least one shared name required (R-08)' }
  - { id: AC-2, idSource: generated, text: 'With an existing Book of the same normalized ISBN, add-book without confirmDuplicate gets 409 duplicate_book listing the matching Books (title, authors, ISBN), and nothing is saved (CAT-API-009)' }
  - { id: AC-3, idSource: generated, text: 'When the new or the existing Book has no ISBN, the titles match and at least one author is shared, add-book is refused with duplicate_book; two Books with different ISBNs never match on title and author alone' }
  - { id: AC-4, idSource: generated, text: 'After a duplicate_book refusal, the same intent resent with confirmDuplicate: true saves the Book as normal' }
  - { id: AC-5, idSource: generated, text: 'A payload that both has invalid fields and matches an existing Book gets 422 invalid_fields: field validation runs first, and the duplicate check runs only on a valid payload' }
  - { id: AC-6, idSource: generated, text: 'A refusal in the New book panel opens an alertdialog named "Possible duplicate" over the panel, its description naming up to three matching Books and "and N more"; the panel behind is inert, so only Don''t add and Add anyway are exposed, with no warning color and no "Open existing" (UX-DR15)' }
  - { id: AC-7, idSource: generated, text: 'Pressing Don''t add (default focus) closes the dialog, saves nothing, keeps every typed field and returns focus to Title (CAT-E2E-003)' }
  - { id: AC-8, idSource: generated, text: 'Pressing Add anyway resends the intent with confirmDuplicate: true, and the outcome is the same as a normal "Added Title." save' }
  - { id: AC-9, idSource: generated, text: 'The standard intent ACs (TR8) hold for add-book with the duplicate check' }
---

# ATDD Checklist - Epic 1, Story 1.9: Get warned about duplicates

**Date:** 2026-10-30
**Author:** Oleg
**Primary test levels:** UNIT and API (pytest, `TestClient` against `create_app` and a real `Store` on `tmp_path`) for the rules; E2E (Playwright against a real seeded `bookvie`) for the Duplicate dialog

---

## Story Summary

As Oleg, I want bookvie to warn me before it adds a Book I already have, so that a second copy or a skill's repeated entry doesn't clutter my catalog.

The story adds FR-3 on both sides of `add-book`. On the server, `domain/` gets the ISBN, title and author matching rules, and `add-book` refuses a match with 409 `duplicate_book` unless the intent carries `confirmDuplicate: true` (AD-10). In the browser, the New book panel shows the refusal as the "Possible duplicate" alertdialog, with **Don't add** and **Add anyway**. The edit-mode variant (Don't save / Save anyway, and checking only when Title, Author(s) or ISBN changed) belongs to Story 1.11.

**Story source:** there is no story spec file yet (`sprint-status.yaml` lists `1-9-get-warned-about-duplicates` as `backlog`). The criteria come from `epics.md` → Story 1.9. When `spec-1-9-…md` is written, add an `### ATDD Artifacts` link to this checklist under its Dev Notes.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`).

**Generation mode:** AI generation from the story, FR-3, AD-10, EXPERIENCE.md, DESIGN.md and the existing code. There was no browser recording, because the dialog doesn't exist yet. Execution was sequential with a single author, as in Stories 1.6 to 1.8.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-9 in source order. The closing "standard intent ACs (TR8)" line is AC-9. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | ISBN-10→13 and hyphen/space removal; title case and whitespace; author sets with one shared name | UNIT | P0 | `test_ac1_p0_…` |
| AC-2 | Same normalized ISBN → 409 `duplicate_book` listing matches; nothing saved | API | P0 | `test_ac2_p0_…` |
| AC-3 | No ISBN on either side + same title + shared author → refused; different ISBNs never match | API | P0 | `test_ac3_p0_…` |
| AC-4 | Resent with `confirmDuplicate: true` → saved | API | P0 | `test_ac4_p0_…` |
| AC-5 | Invalid and matching → 422 `invalid_fields`; validation first | API | P1 | `test_ac5_p1_…` |
| AC-6 | alertdialog "Possible duplicate", up to 3 + "and N more", panel inert, two buttons only, no warning color | E2E | P0 | `[P0] AC-6` |
| AC-7 | Don't add (default focus): closes, nothing saved, fields kept, focus on Title | E2E | P0 | `[P0] AC-7` |
| AC-8 | Add anyway: resend with the flag; "Added *Title*." as normal | E2E | P0 | `[P0] AC-8` |
| AC-9 | TR8 for add-book with the duplicate check; the new code is in the contract | API | P0 | `test_ac9_p0_…` |

Priorities: P0 covers every rule that decides whether a Book is written, which is R-08 (duplicate detection misfires, DATA). It also covers every outcome the unattended cataloging skill reads (R-05): the dialog's role and name, and which button saves. AC-5 is P1. It is about ordering: if it breaks, the user gets a duplicate warning for a payload that would have been refused anyway, which is visible and recoverable.

Level split (no duplicate coverage): the rules are proven at UNIT (AC-1) and API (AC-2 to AC-5). The E2E tests use the real server's refusal, but they assert only what needs the browser: the dialog's role, name, description, stacking, focus, and the resend.

---

## Story Integration Metadata

- **Story ID:** `1.9`
- **Story Key:** `1-9-get-warned-about-duplicates`
- **Story File:** none yet; criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.9)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-9-get-warned-about-duplicates.md`
- **Generated Test Files:** `backend/tests/test_duplicate_book.py`, `frontend/e2e/duplicate-dialog.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 9 in all. Backend leaves carry `@pytest.mark.skip(reason=RED)`, where `RED` is "ATDD red phase: un-skip when Story 1.9 implements the duplicate check", and their names carry `ac<n>_p<#>`. E2E leaves are `test.skip(...)`, and their titles carry `[P#] AC-n`.

### Unit + API Tests (6 tests): `backend/tests/test_duplicate_book.py`

- `[P0] AC-1` primary: `isbns_match("0-441-17271-7", "9780441172719") is True`. Then `normalize_isbn` gives 13 digits for an ISBN-10 with hyphens, an ISBN-13 with hyphens, an ISBN-10 with spaces and an `X` check digit (`9780804429573`), and a lower-case `x`. A spaced ISBN-13 matches a bare ISBN-10, and two different ISBNs don't match. `titles_match` ignores case, surrounding spaces and runs of spaces, and "Dune" does not match "Dune Messiah". `authors_match` holds for one shared name ignoring case and spaces. It fails with no shared name ("Ursula Le Guin" against "Ursula K. Le Guin"), for a reordered name ("Le Guin, Ursula K."), and for an empty list.
- `[P0] AC-2` primary: status 409. The library holds *Dune* (ISBN-13) and *Neuromancer*. The new Book has another title, the author written as "Herbert, Frank", and the ISBN-10, so only the ISBN matches. Then the body is exactly `{error: {kind: "refusal", code: "duplicate_book", message: "Possible duplicate: Dune by Frank Herbert is already in your catalog.", duplicates: [{title: "Dune", authors: ["Frank Herbert"], isbn: "9780441172719"}]}}`. *Neuromancer* isn't listed, there is no `fields`, and `library.json` is byte-identical.
- `[P0] AC-3` primary: status 409 when neither Book has an ISBN. The title is " the  DISPOSSESSED " and the authors are "Brian Attebery; ursula k. le guin ". Then the code is `duplicate_book`, and it is 409 when only the existing Book has an ISBN, and when only the new one has. Last, when both have different ISBNs, it is 200 and the Book is saved.
- `[P0] AC-4` primary: status 200 for the resend with `confirmDuplicate: true`. The first send is setup and is not asserted. Then the library holds two *Dune*s, the saved one has the sent pages, no `confirmDuplicate` key is stored, and `check_invariants()` holds.
- `[P1] AC-5` primary: status 422 for an empty Pages plus a matching ISBN. Then the code is `invalid_fields`, `fields` lists only Pages, there is no `duplicates`, and nothing is saved. Last, the same payload with Pages filled is 409.
- `[P0] AC-9` primary: status 503 for a confirmed duplicate add with a fault at write, fsync and replace. Then the message is "Couldn't save. Your data wasn't changed." and `library.json` is byte-identical. A confirmed add without a fault keeps `check_invariants()`. Last, OpenAPI lists `duplicate_book` in `ErrorCode` and a `duplicates` property on `ErrorBody`.

### E2E Tests (3 tests): `frontend/e2e/duplicate-dialog.spec.ts`

- `[P0] AC-6` primary: `alertdialog` "Possible duplicate" is visible after **Add book**. The library holds five Books with Dune's ISBN-13, in the order *Dune*, *(Ace)*, *(Book Club)*, *(Anniversary)*, *(Deluxe)*, plus *Neuromancer*. The new Book is typed with the ISBN-10. Then: the accessible description names *(Ace)* and *(Book Club)* and contains "and 2 more", and doesn't name *(Anniversary)*, *(Deluxe)* or *Neuromancer*. The dialog matches `:modal`, and the panel is still visible. The dialog's buttons are exactly **Don't add** and **Add anyway**, and there is no **Open existing**. Title can't take focus, and three Tabs stay inside the dialog. The heading is ink, there is no `svg` or `img`, and the server still holds the same six Books.
- `[P0] AC-7` primary: the dialog is hidden after Enter on its default focus. Then: the element focused when the dialog opened read "Don't add". The panel is visible with Title focused. All eight typed values (including Subtitle, ISBN and Tags) and Type are kept. `status` is empty, and the server holds only *Dune* and *Neuromancer*.
- `[P0] AC-8` primary: `status` reads "Added Dune." after **Add anyway**. The library holds *Dune* by Frank Herbert with no ISBN, and the title and author match. Then: the dialog and the panel are hidden. Exactly two add-book POSTs were sent. The first intent has no `confirmDuplicate`, and the second is the first plus `confirmDuplicate: true`. The focused element in the table reads "Dune", `alert` is empty, and the server holds two *Dune*s and *Neuromancer*.

---

## Data Factories Created

None new. Seeded state goes through the existing `LibraryBuilder` (TC-1): `_seed(data_dir, *books)` in pytest and `seededServer({books})` in Playwright. Each test names only the Book fields it is about (title, authors, isbn). Literals are named (`DUNE_ISBN13`, `DUNE_ISBN10`, `DUNE`, `NEUROMANCER`, `INK`). The ISBN-10 to ISBN-13 pairs were computed independently, with the 978 prefix and the mod-10 check digit.

## Fixtures Created

None. The backend file reuses `ADD_BOOK`, `VALID`, `_client`, `_library_bytes` and `_stored_books` from `tests/test_add_book.py`, and `FaultyFs` from `tests/test_store.py`, the same way `test_add_book.py` imports from `test_store.py`. Its `_send(client, **intent)` takes any JSON value, so it can send the boolean `confirmDuplicate`. The E2E file has spec-local helpers in the 1.8 style: `newBookPanel`, `duplicateDialog`, `openNewBook`, `fillFields`, `catalogTitles`, and `intentOf` (reads the JSON `intent` part of a multipart request).

## Mock Requirements

None. Every test, E2E included, gets its refusal from the real duplicate check on a seeded library. AC-8 only *observes* requests (`page.on('request')`) and never routes them.

## Contract the Scaffolds Pin (names the implementation must use)

- **Domain:** `bookvie/domain/duplicates.py` with `normalize_isbn(raw: str) -> str` (13 digits; an ISBN-10 becomes `978` + its first nine digits + the ISBN-13 check digit), `isbns_match(a, b)`, `titles_match(a, b)` (casefold, trim, collapse runs of whitespace) and `authors_match(a: list[str], b: list[str])` (the stored lists; casefold and trim each name; true when at least one is shared). `domain/` imports no other layer (`test_layers.py`).
- **Refusal:** HTTP 409, `kind: "refusal"`, `code: "duplicate_book"` (a new `ErrorCode`), and `error.duplicates`, a new optional `ErrorBody` field. It is a list of `{title, authors, isbn}` with exactly those keys, one per matching Book in catalog order, and `isbn` is as stored or `null`. There is no `fields`. For one match, the message is "Possible duplicate: *Title* by *Authors* is already in your catalog." (the EXPERIENCE.md copy table).
- **Confirm flag:** `confirmDuplicate`, a JSON boolean inside the `intent` part (`AddBookIntent.confirm_duplicate: bool`, camelCase alias). It is never stored.
- **Order:** `parse_book_fields` runs first. The duplicate check runs on the parsed fields only, and inside the same request, before `commit`.
- **Dialog:** an element with `role="alertdialog"`, whose accessible name "Possible duplicate" comes from its heading, and whose accessible description (`aria-describedby`) names up to three matches, then "and N more". It is opened modally over the panel (the test checks `:modal`, that Title can't take focus, and that Tab stays inside), for example a nested native `<dialog role="alertdialog">` opened with `showModal()`. **Don't add** comes first and has default focus, then **Add anyway**. Neither carries warning color or an icon.
- **Resend:** **Add anyway** sends the same intent object plus `confirmDuplicate: true`. The success path is 1.8's own: close, refetch, focus the new row's title, highlight, `announce('status', 'Added <Title>.')`.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`, then watch it fail, implement, and watch it pass. Backend: `cd backend && TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py -k ac2`. E2E: `npm run build && npm --prefix frontend run e2e -- e2e/duplicate-dialog.spec.ts -g "AC-6 "`.

### AC-1 matching rules
- [x] `domain/duplicates.py`: `normalize_isbn`, `isbns_match`, `titles_match`, `authors_match` (and a `find_duplicates(books, fields)` helper that keeps the catalog order)
- [x] Activate AC-1

### AC-2 / AC-3 / AC-9 the refusal
- [x] `ErrorCode.DUPLICATE_BOOK`; `ErrorBody.duplicates: list[DuplicateMatch] | None` (`title`, `authors`, `isbn`); a `duplicate_book(matches)` constructor in `contract.py` that builds the message
- [x] `add_book`: after `parse_book_fields`, find matches against `store.library.books`. Match on ISBN when both Books have one, otherwise on title plus a shared author. Raise 409 unless `confirm_duplicate`
- [x] Update `test_contract.py::test_openapi_error_enums` to the new enum (`["invalid_fields", "couldnt_save", "duplicate_book"]`), then `npm run check:api` to regenerate the TS types
- [x] Activate AC-2, AC-3, then AC-9

### AC-4 / AC-5 confirm and order
- [x] `AddBookIntent.confirm_duplicate: bool = False` (strict, camelCase alias `confirmDuplicate`)
- [x] Activate AC-4, then AC-5

### AC-6 the Duplicate dialog
- [x] `envelope.ts`: carry `duplicates` on a `refusal` result (validated like `fields`), so `NewBookPanel` can tell `duplicate_book` apart
- [x] `components/ConfirmDialog` (or `DuplicateDialog`): `role="alertdialog"`, `aria-labelledby` its heading, `aria-describedby` a description the client renders from `duplicates` (the server `message` is the fallback when no matches arrive), opened modally over the panel. Its CSS is `{components.dialog}`, 440px, centered, with buttons right-aligned
- [x] Live regions: the 1.8 region host assumes one modal (`adoptRegions`/`releaseRegions`). Make it a stack, so the regions follow the topmost dialog and go back to the panel when it closes
- [x] Activate AC-6

### AC-7 / AC-8 the buttons
- [x] **Don't add**: close the dialog, keep the form state, focus Title (EXPERIENCE.md → Focus after close)
- [x] **Add anyway**: resend `addBook(fields, { confirmDuplicate: true })` through the same in-flight guard, then the normal success path
- [x] Activate AC-7, then AC-8

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] AC-1: ISBN-13s beginning with 979 never equal a converted ISBN-10; tabs and newlines inside titles count as whitespace; non-ASCII case folding ("ÉMILE ZOLA" against "Émile Zola"); typographic quotes, dashes and NFKC compatibility forms fold (code review of 1.9)
- [ ] AC-1: a Book whose authors repeat a name
- [x] AC-2: 1, 2, 3 and 4 matches (the list holds all of them, while the message names three, then "and N more"); a multi-author match's wording ("by Ursula K. Le Guin; Brian Attebery"); the exact multi-match message
- [ ] AC-2: 10 matches
- [x] AC-3: the title alone (no shared author) or a shared author alone (another title) is not a duplicate
- [ ] AC-3: a match on both rules at once is listed once
- [x] AC-4: `confirmDuplicate: false` still checks; `"confirmDuplicate": "true"` (a string) or `null` is a malformed intent (422 on `intent`); `confirmDuplicate: true` on a Book with no match saves as normal
- [x] AC-6: Esc in the dialog acts as **Don't add** and doesn't close the panel; the live regions are inside the topmost dialog while it is open; the description shows each match's ISBN only when it has one; the description's wording for 2 matches, a multi-author match and 4 matches
- [ ] AC-6: axe in both themes with the dialog open; the dark theme's ink
- [x] AC-7: a duplicate refusal clears the field errors of an earlier refusal
- [ ] AC-7: after **Don't add**, editing the ISBN so it no longer matches and pressing **Add book** saves without a dialog
- [x] AC-8: a `couldnt_save` on the resend (routed 503) keeps the panel open with every value, and the dialog is not reopened
- [ ] AC-8: **Add anyway** is guarded against a double press
- [ ] AC-9: `book_not_found` doesn't apply to `add-book` (it names no existing Book), so there is no test for it. Story 1.11's `edit-book` takes the duplicate check together with that rule
- [x] Unit (`src/**/*.test.ts`): `toIntentResult` with a `duplicates` list, including a malformed list counting as `couldnt_save`

---

## Running Tests

```bash
# Story 1.9 scaffolds (all skipped until activated)
cd backend && TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py
npm --prefix frontend run e2e -- e2e/duplicate-dialog.spec.ts

# One criterion, after un-skipping it
cd backend && TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py -k ac3
npm run build && npm --prefix frontend run e2e -- e2e/duplicate-dialog.spec.ts -g "AC-7 "

# Everything
npm run check
```

---

## Red-Green-Refactor Workflow

**RED (done):** 9 scaffolds, all skipped, each asserting the expected behaviour.

**GREEN (dev):** take one criterion, un-skip its test, see it fail, implement the minimum, and see it pass. Start with the server, AC-1 to AC-5 and AC-9, because the dialog tests depend on the real refusal. Then do AC-6 to AC-8. Run `npm run check` before each commit.

**REFACTOR:** with everything green, make the dialog and the region stack generic. Story 1.11's edit-mode Duplicate dialog (Don't save / Save anyway) and Story 5.2's Delete card note Confirm dialog reuse them.

---

## Next Steps

1. Write the story spec (`spec-1-9-get-warned-about-duplicates.md`), settle the open points in Notes, and link this checklist from its Dev Notes.
2. Implement Story 1.9 with `bmad-build` (or dev-story), activating tests one criterion at a time.
3. After implementation, run `bmad-testarch-automate` for the green-phase follow-ups above.

---

## Knowledge Base References Applied

- **test-levels-framework.md / test-priorities-matrix.md:** pure rules sit at UNIT (`domain/` has no I/O), the intent's refusal and ordering at API, and only browser-only behaviour at E2E. The E2E tests never re-prove a matching rule. P0 is anything that decides a write (R-08), plus what the skill reads (R-05).
- **test-quality.md:** one concern per leaf, and no conditionals. The AC-3 and AC-9 branches run the same path every time, with the branch name as the assertion message. Assertions sit in test bodies, and every value is exact (status, code, full body, title sets).
- **data-factories.md:** `LibraryBuilder` with only the fields that matter, and named literals for the ISBNs and Books.
- **selector-resilience.md:** roles and exact accessible names from the Agent Label Contract (`alertdialog` "Possible duplicate", **Don't add**, **Add anyway**). No test ids or CSS classes.
- **network-first.md / timing-debugging.md:** the request listener is attached before navigation. Every wait is a web-first assertion or `waitFor`. There is no `waitForTimeout` and no request routing.
- **fixture-architecture.md:** reuses `seededServer`, so every test gets its own seeded server with cleanup.
- **component-tdd.md:** red-green-refactor per criterion, with accessibility checks (role, name, description, focus, inert) alongside behaviour.
- **test-healing-patterns.md:** no hard-coded ids. Rows and matches are found by title, and requests are found by method and path.
- **playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack. No recording was needed (there is no UI yet), and the CI pipeline is unchanged.

---

## Test Execution Evidence

### Scaffold run (all skipped)

- `TZ=Europe/Madrid uv run pytest tests/test_duplicate_book.py` → **6 skipped**; `ruff check` clean.
- `npx playwright test e2e/duplicate-dialog.spec.ts` → **3 skipped**; `tsc -b` and `oxlint e2e` clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

With the skips removed, all 9 fail against today's code:

| ID | Result | First failure |
|---|---|---|
| AC-1 | fail | `ModuleNotFoundError: bookvie.domain.duplicates` |
| AC-2 | fail | `assert 200 == 409` (the duplicate is saved) |
| AC-3 | fail | `assert 200 == 409` |
| AC-4 | fail | `assert 422 == 200` (`confirmDuplicate` is an unknown key, so the intent is malformed) |
| AC-5 | fail | `assert 200 == 409` on the corrected payload (see Notes) |
| AC-9 | fail | `write: assert 422 == 503` (the flag is refused before the commit) |
| AC-6 | fail | `alertdialog "Possible duplicate"` not found (`toBeVisible`) |
| AC-7 | fail | `alertdialog` `waitFor` timeout (the add saved instead) |
| AC-8 | fail | **Add anyway** not found (`click` timeout) |

---

## Notes and Open Points

- **AC-5 is partly green today.** Its primary assertion (422 `invalid_fields` naming only Pages) already passes, because no duplicate check exists to run first. The leaf fails red only on its last check, where the same payload made valid must be 409. That check is the "only on a valid payload" half of the criterion. Once the check exists, the 422 assertion guards the order against regression.
- **Which three are named.** The scaffolds pin the first three matches in catalog (creation) order. The spec may choose another order, for example ISBN matches first. If it does, change the seeded order in AC-6, not the assertions.
- **Multi-match message copy.** Only the one-match message is pinned (AC-2). Settle the wording for two or three matches and for "and N more" in the spec. One option is "Possible duplicate: *A* by *X*, *B* by *Y* and *C* by *Z* are already in your catalog, and 2 more." AC-6 asserts only the names and "and 2 more" in the description.
- **ISBN in the description.** DESIGN.md says the dialog names each match by "serif title, author, ISBN if present". The server message is plain text, so the dialog either renders `duplicates` itself (with the serif title) or shows `message`. Either way, the accessible description must hold the names. The serif is a green-phase check.
- **Stacked live regions.** Spec 1.8's review (finding 7) noted that `adoptRegions`/`releaseRegions` assume a single modal. With the alertdialog over the panel, the regions must follow the topmost dialog, or they become inert. AC-7 and AC-8 read `status` and `alert` after the dialog closes. The follow-up for AC-6 checks them while it is open.
- **Existing contract test.** `test_contract.py::test_openapi_error_enums` pins the exact `ErrorCode` enum, and it fails as soon as `duplicate_book` is added. Updating it is part of the implementation, not a regression.
