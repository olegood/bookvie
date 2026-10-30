---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-10-30'
storyId: '1.7'
storyKey: '1-7-accept-a-new-book-only-when-it-is-complete'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-17-accept-a-new-book-only-when-it-is-complete'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md'
generatedTestFiles:
  - 'backend/tests/test_add_book.py'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Story 1.7, Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md (Clock, uniqueness invariants)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-3, AD-9, AD-11, AD-18, AD-19, AD-20)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Agent Label Contract, validation table)'
  - '_bmad-output/test-artifacts/test-design-qa.md (CAT-API-001..004, Appendix A)'
  - 'backend/pyproject.toml, backend/tests/conftest.py, backend/tests/builder.py, backend/tests/test_contract.py, backend/tests/test_store.py (FaultyFs), backend/tests/test_views.py'
  - 'backend/bookvie/intents/contract.py, intents/commit.py, http/api.py, http/app.py, domain/model.py, views/models.py, views/shelf.py'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'A valid multipart POST /api/intents/add-book (JSON part "intent") saves the Book with a server UUID, createdAt, ownership "owned", edition defaulting to 1, coverFile null, its PRD fields and empty readings[] and cardNotes[]; the response is 200 { "ok": true, "ids": { "bookId": "<uuid>" } }' }
  - { id: AC-2, idSource: generated, text: 'spineColorCurated is the next of Sage, Slate, Clay, Ochre, Plum, Teal, Moss, Stone in creation order; spineColorUser is the entered #RRGGBB or null; the resolved spineColor (user, else curated) is stored, not computed on read (AD-11)' }
  - { id: AC-3, idSource: generated, text: 'Input breaking any Agent Label Contract validation rule gets 422 invalid_fields listing every failing field with the table''s exact message, and nothing is saved (CAT-API-001); text is trimmed first, so only spaces counts as empty' }
  - { id: AC-4, idSource: generated, text: 'Author(s) such as "Ursula K. Le Guin; Brian Attebery" is stored as a list of trimmed names, empty entries dropped, at least one required' }
  - { id: AC-5, idSource: generated, text: 'Tags such as "sci-fi, Classics, classics , " are trimmed, empty entries dropped and duplicates merged ignoring case, keeping the first spelling (["sci-fi", "Classics"])' }
  - { id: AC-6, idSource: generated, text: 'Finished on creates one finished Reading with startDate null, finishDate that local date and finishedPages the Book''s pages (CAT-API-004); with Finished on empty the Book has no Readings' }
  - { id: AC-7, idSource: generated, text: 'The catalog view shows each Book with title, authors, pages, read status (finished if any Reading is finished), createdAt and resolved spine color, and lists the library''s existing tags for the Tags suggestions' }
  - { id: AC-8, idSource: generated, text: 'Standard intent ACs (TR8) for add-book: a fault at write, fsync or rename leaves library.json byte-identical with 503 couldnt_save; check_invariants() holds after every success; every new error code has an API test' }
---

# ATDD Checklist - Epic 1, Story 1.7: Accept a new book only when it is complete

**Date:** 2026-10-30
**Author:** Oleg
**Primary test level:** API (pytest + FastAPI `TestClient` against `create_app` and a real `Store` on `tmp_path`)

---

## Story Summary

As Oleg, I want bookvie to save a new Book only when every required field is valid, so that my catalog never holds half-entered books and the cataloging skill always gets a precise answer.

The story adds the server side of adding a book: the `add-book` intent with full field validation and normalizing, the curated spine-color rotation, the Finished on back-fill, and the extra fields the catalog view needs. Story 1.8 builds the New book panel on top of it.

**Story source:** there is no story spec file yet (`sprint-status.yaml` lists `1-7-accept-a-new-book-only-when-it-is-complete` as `backlog`). The criteria come from `epics.md` → Story 1.7. When `spec-1-7-…md` is written, add an `### ATDD Artifacts` link to this checklist under its Dev Notes.

**Stack:** detected `fullstack` (`backend/pyproject.toml` + `frontend/playwright.config.ts`). The story adds no UI, so every scaffold is backend API level.

**Generation mode:** AI generation from the story, the architecture spine, the validation table and the existing code. No browser recording, since there is no UI. Execution was sequential with a single author, as in Story 1.6.

---

## Acceptance Criteria

The story's criteria have no ids, so they are numbered AC-1 to AC-8 in source order; the closing "standard intent ACs (TR8)" line is AC-8. Full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Valid add-book saves the Book with defaults; 200 `{ok, ids: {bookId}}` | API | P0 | `test_ac1_p0_…` |
| AC-2 | Curated color rotation; user color; resolved color stored | API | P0 | `test_ac2_p0_…` |
| AC-3 | 422 `invalid_fields` lists every failing field with the exact message; trimmed; nothing saved | API | P0 | `test_ac3_p0_…` |
| AC-4 | Authors split on `;`, trimmed, empties dropped, ≥ 1 required | API | P1 | `test_ac4_p1_…` |
| AC-5 | Tags trimmed, empties dropped, merged ignoring case, first spelling kept | API | P1 | `test_ac5_p1_…` |
| AC-6 | Finished on → one back-filled finished Reading; empty → none | API | P0 | `test_ac6_p0_…` |
| AC-7 | Catalog view: authors, pages, read status, `createdAt`, spine color; library tags | API | P1 | `test_ac7_p1_…` |
| AC-8 | TR8: seam fault → 503, file byte-identical; invariants hold after success | API | P0 | `test_ac8_p0_…` |

Priorities: P0 is anything that writes or refuses library data. This covers R-05 (half-entered books), R-09 (FR-1 consequences) and R-01 (data loss), plus the response the cataloging skill reads. AC-4, AC-5 and AC-7 are P1: they normalize or display data, and a bug there is visible and recoverable.

---

## Story Integration Metadata

- **Story ID:** `1.7`
- **Story Key:** `1-7-accept-a-new-book-only-when-it-is-complete`
- **Story File:** none yet; criteria from `_bmad-output/planning-artifacts/epics.md` (Story 1.7)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-7-accept-a-new-book-only-when-it-is-complete.md`
- **Generated Test Files:** `backend/tests/test_add_book.py`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 8 leaves in all. Each has `@pytest.mark.skip(reason=RED)`, where `RED` is "ATDD red phase: un-skip when Story 1.7 implements POST /api/intents/add-book". Each name carries `ac<n>_p<#>`.

### API Tests (8 tests): `backend/tests/test_add_book.py`

Every test reads the committed state back from `library.json` on disk. It does not trust the response.

- `[P0] AC-1` primary: status 200. Then the body is exactly `{"ok": true, "ids": {"bookId": <id>}}`, the id is a UUID v4, `createdAt` is an aware timestamp on the fake today, and the stored Book equals the expected document. That document has `ownership: "owned"`, `edition: 1` (omitted in the request), `subtitle` and `isbn` as entered, `year: null`, `tags: []`, `coverFile: null`, the `spineColor*` fields with Sage, and empty `readings`/`cardNotes`.
- `[P0] AC-2` primary: after 9 adds to an empty library, the stored `spineColorCurated` values are Sage … Stone, then Sage again. Then the resolved `spineColor` equals the curated one. A 10th Book with `spineColor: "#1A2B3C"` stores it as `spineColorUser` and as `spineColor`, and still takes the next curated color (Slate).
- `[P0] AC-3` primary: status 422 for one payload that breaks every rule at once: a spaces-only title, empty pages, a spaces-only author, edition `0`, empty language, spaces-only publisher, empty type, ISBN `12345`, year `65`, Finished on tomorrow, and spine color `red`. Then the code is `invalid_fields`, the `field → message` map equals the table's eleven exact messages, and `library.json` is byte-identical. Last, a payload on the edge of every rule gets 200. It has pages `1`, edition `1`, ISBN `0 8044 2957 X`, year `2027` (next year), Finished on today and spine color `#a1B2c3`.
- `[P1] AC-4` primary: `"Ursula K. Le Guin; Brian Attebery"` is stored as `["Ursula K. Le Guin", "Brian Attebery"]`. Then `" ; Ursula K. Le Guin ;; "` is stored as `["Ursula K. Le Guin"]`, and `" ; ;"` gets 422 with only `authors: "Author(s) is required."`.
- `[P1] AC-5` primary: `"sci-fi, Classics, classics , "` is stored as `["sci-fi", "Classics"]`. Then `" , "` is stored as `[]`.
- `[P0] AC-6` primary: Finished on `2026-03-14` gives exactly one Reading. That Reading has `startDate: null`, `finishDate: "2026-03-14"`, `finishedPages: 387` and a UUID v4 id. `mainBookId` stays null. An empty Finished on gives no Readings.
- `[P1] AC-7` primary: in a library seeded with SPQR (tag `history`), the added Book appears in `GET /api/views/catalog` with `pages: 387`. Then the view row's `id` matches the stored Book, and so do its `authors` list, `finished: true` (from the back-fill), `createdAt` and `spineColor`. The view's `tags` are exactly `Classics`, `history` and `sci-fi`, each listed once.
- `[P0] AC-8` primary: with `FaultyFs("write")`, the response is 503 with the `couldnt_save` envelope and `library.json` is byte-identical. The same holds for `fsync` and `replace` (the rename), each in its own data folder. Then two successful adds (one back-filled, one tagged) give a file that passes `Library.model_validate_json` and `check_invariants()`.

### E2E Tests (0 tests)

N/A. The story adds no UI. Story 1.8's New book panel and its label-contract e2e (CAT-E2E-002) drive this endpoint through the browser.

### Component Tests (0 tests)

N/A. The story adds no UI.

---

## Data Factories Created

None new. `VALID` in the test file holds only the required fields, with realistic values (*The Dispossessed*, 387 pages). Each test overrides only the fields it is about through `_add(client, **fields)`. Seeded state uses the existing `LibraryBuilder` (TC-1).

## Fixtures Created

None shared. The test file has its own `data_dir` fixture (an empty library written by `LibraryBuilder`), which follows `test_contract.py`. Helpers: `_client(data_dir, fs=None)`, `_add`, `_library_bytes`, `_stored_books`, `_stored_book` and `_field_messages`. It reuses `FaultyFs` from `tests/test_store.py` and `CURATED` from `tests/builder.py`.

## Infrastructure Changes Made

None. The `bookvie.domain.clock` import is inside `_client`, so the file collects and its tests skip before the Clock exists.

## Mock Requirements

None. The fault injection goes through the store's real filesystem seam (`FaultyFs`). Time comes from the injected `FakeClock`.

## Contract the Scaffolds Pin (names the implementation must use)

- **Route:** `POST /api/intents/add-book`, `multipart/form-data` with a part named `intent` whose content is JSON (`application/json`).
- **Intent body:** the form's raw strings, with camelCase keys `title`, `subtitle`, `pages`, `authors`, `edition`, `language`, `publisher`, `type`, `isbn`, `year`, `finishedOn`, `tags` and `spineColor`. Optional keys may be omitted, and an omitted `edition` means 1. Strings, not numbers, so that the server writes every message itself: an `int` field would turn `"abc"` into Pydantic's message through the `RequestValidationError` handler, not the table's.
- **Type values:** exactly `paperback`, `hardcover` and `ebook` (lowercase, as in `BookType`).
- **Error fields:** `field` is the camelCase key above (`finishedOn`, `spineColor`, …), one entry per failing field, and `message` is the validation table's exact copy.
- **Success:** `OkResponse.ids` becomes an object, `{"bookId": "<uuid>"}`. This is AD-9's `ids?: {<name>: <uuid>}`; today it is `list[str]`.
- **Clock (AD-20, deferred from Story 1.4):** `bookvie.domain.clock.FakeClock(today: date)`, and `create_app(..., clock=...)` passing it to the intents. `createdAt` comes from the clock's `now` (aware, on `today`). The Year and Finished on rules use its `today`.
- **Storage:** `isbn` and `subtitle` are stored as entered, after trimming, and null when empty. `spineColorCurated` is the hex value from `CURATED` (Sage `#749076` …). The rotation follows the number of Books created, so the n-th add gets `CURATED[n % 8]` on a library that started empty.
- **Catalog view:** `ShelfBook` gains `authors: list[str]`, `pages: int` and `createdAt`, and `CatalogView` gains `tags: list[str]` (each distinct tag once). `firstAuthor`/`authorCount` may stay.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, watch it fail, implement, and watch it pass.

### Prerequisite: the Clock (deferred-work, Story 1.4)
- [ ] `domain/clock.py`: a `Clock` protocol with `now()` and `today()`, `SystemClock`, and `FakeClock(today)`
- [ ] `create_app(..., clock=SystemClock())` keeps the clock on `app.state`; `cli` passes `FakeClock` for `--fake-today` (only with `--no-browser`)
- [ ] `TZ=Europe/Madrid` for `check:py`; a test that `domain/` reads time only through `Clock` (see the deferred item for the full list)

### AC-1 save
- [ ] `intents/add_book.py`: an `AddBookIntent` Pydantic model of optional strings (`extra="forbid"`, camelCase aliases)
- [ ] `POST /api/intents/add-book` in `http/api.py`, reading the `intent` form part, parsing it as JSON and going through `commit()`
- [ ] Build the `Book`: `uuid4`, `clock.now()`, `owned`, edition default 1, `coverFile: null`, empty lists
- [ ] Change `OkResponse.ids` to `dict[str, str] | None`, and update `test_contract.py` (`ids=["x"]` → `{"probe": "x"}`) and the generated TS types (`check:api`)
- [ ] Activate AC-1: `cd backend && uv run pytest tests/test_add_book.py -k ac1`

### AC-2 spine colors
- [ ] The curated palette lives in `domain/` (in Sage … Stone order); add-book assigns `palette[len(books) % 8]`
- [ ] `spineColorUser` is the trimmed entry or null; resolve `spineColor` once, at creation
- [ ] Activate AC-2

### AC-3 validation
- [ ] Trim every text field first; collect **every** failure in form order, then raise `invalid_fields(...)` once
- [ ] Rules and copy exactly as in EXPERIENCE.md → Agent Label Contract (required: "*Label* is required."; Pages, Edition, Year, ISBN, Finished on, Spine color)
- [ ] Activate AC-3

### AC-4 / AC-5 normalizing
- [ ] Authors: split on `;`, trim, drop empties; none left → "Author(s) is required."
- [ ] Tags: split on `,`, trim, drop empties, merge duplicates by `casefold()`, keep the first spelling
- [ ] Activate AC-4, then AC-5

### AC-6 back-fill
- [ ] Finished on → `Reading(start_date=None, finish_date=<date>, finished_pages=pages, …)`; empty → `readings: []`
- [ ] Activate AC-6

### AC-7 catalog view
- [ ] `ShelfBook.authors`, `pages`, `created_at`; `CatalogView.tags` (each distinct tag once)
- [ ] Update `test_views.py`'s exact-dict expectations and the generated TS types
- [ ] Activate AC-7

### AC-8 TR8
- [ ] Nothing new beyond `commit()`, which already maps seam faults to 503
- [ ] Activate AC-8 last; it passes once AC-1 does, and guards the multipart route from bypassing `commit()`

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] AC-3 table, one row per rule (CAT-API-002): Pages `"abc"`, `"12.5"`, `"-3"` → "Pages must be a whole number, 1 or more."; Edition the same; Year `"19650"`, `"2028"` (after next year) → "Year must be a year, like 1965."; ISBN with 11 digits, an `X` not in last place, or 13 digits ending in `X`; Spine color `#12345`, `#GGHHII` and `123456`; every required field missing (key absent) as well as empty
- [ ] AC-3: the order of `fields` follows the form order (Title … Spine color), so the alert names fields in reading order
- [ ] AC-3: an unknown key in `intent` (e.g. `ownership`) is refused as `invalid_fields`; a missing `intent` part, or one that isn't JSON, is 422 `invalid_fields` with field `intent`, not FastAPI's `{detail}`
- [ ] AC-3: Finished on not a date (`2026-02-30`, `30/10/2026`). The validation table has no separate message for this; decide the copy (see Notes)
- [ ] AC-3: Type `novel` (or `Paperback` capitalised) is refused with a `type` field error; the table has no copy for it (see Notes)
- [ ] AC-2: rotation after a delete (Story 1.12) — decide whether the count or a stored counter drives it, then pin it
- [ ] AC-6: Finished on with Clock `today` on the DST days (29 Mar, 25 Oct 2026) stays that local date
- [ ] AC-7: `tags` when two Books spell a tag differently (`Classics` / `classics`): one entry or two? Pin when decided
- [ ] AC-8: `close` and `create_temp` faults (already covered generically in `test_contract.py`); a `check_invariants()` failure on add-book is 500 and commits nothing
- [ ] Deferred-work item from Story 1.4 review: uniqueness invariants (unique Book IDs, …) are "needed before Story 1.7 creates IDs". Add them with this story, and a test that two adds never share an id
- [ ] Property test (Hypothesis): any accepted add-book leaves a library that `check_invariants()` accepts and that round-trips through `serialize`

---

## Running Tests

```bash
# Story 1.7 scaffolds (all skipped until activated)
cd backend && uv run pytest tests/test_add_book.py -v

# One criterion
cd backend && uv run pytest tests/test_add_book.py -k ac3

# Whole Python check with the coverage gate
npm run check:py
```

---

## Red-Green-Refactor Workflow

**RED (done):** 8 scaffolds, all skipped, each asserting the expected behaviour.

**GREEN (dev):** land the Clock first, then take one criterion, un-skip its test, see it fail on its primary assertion, implement the minimum, and see it pass. Run `npm run check` before each commit.

**REFACTOR:** with everything green, move the parsing and validation helpers (trim, split, ISBN digits) into `domain/` so `edit-book` (Story 1.11) and duplicate detection (Story 1.9) reuse them.

---

## Next Steps

1. Write the story spec (`spec-1-7-accept-a-new-book-only-when-it-is-complete.md`), settle the open points in Notes, and link this checklist from its Dev Notes.
2. Implement the Clock prerequisite, then Story 1.7, with `bmad-build` (or dev-story), activating tests one criterion at a time.
3. After implementation, run `bmad-testarch-automate` for the green-phase follow-ups above.

---

## Knowledge Base References Applied

- **test-quality.md:** each skip has its reason in the marker; explicit assertions in test bodies; one concern per leaf; no hard waits or conditionals (AC-8's loop runs the same path every time); named literals (`TODAY`, `VALID`, `CURATED`).
- **data-factories.md:** a required-fields-only base payload with per-test overrides; seeded state through `LibraryBuilder`; hardcoded values only where the assertion is about that exact value (the table's messages, rule edges).
- **test-levels-framework.md / test-priorities-matrix.md:** all business rules at API level, nothing duplicated at E2E (Story 1.8 owns the browser path); P0 for data-writing and refusal paths, P1 for normalizing and display.
- **component-tdd.md:** red-green-refactor per criterion.
- **test-healing-patterns.md:** ids are read from the stored state, never hardcoded; timestamps are checked by property (aware, on today), not by exact value.
- **selector-resilience.md, timing-debugging.md, network-first.md, fixture-architecture.md, playwright-cli.md, ci-burn-in.md:** loaded for the fullstack stack; not applicable without a UI. The existing fixture layer is reused unchanged.

---

## Test Execution Evidence

### Scaffold run (all skipped)

`cd backend && uv run pytest tests/test_add_book.py -q` → **8 skipped**. `ruff check` is clean.

### RED verification (temporary un-skipped copies, deleted afterwards)

With the skips removed, all 8 fail first on the missing `bookvie.domain.clock` (the prerequisite). A second copy, with the skips removed *and* the clock injection taken out, shows each criterion's own first failure:

| ID | Result against today's code | First failure |
|---|---|---|
| AC-1 | fail | `405 == 200` (no route) |
| AC-2 | fail | stored curated colors `[] == [Sage … Stone, Sage]` |
| AC-3 | fail | `405 == 422` |
| AC-4 | fail | stored authors `[] == [["Ursula K. Le Guin", "Brian Attebery"]]` |
| AC-5 | fail | stored tags `[] == [["sci-fi", "Classics"]]` |
| AC-6 | fail | `0 == 1` Readings |
| AC-7 | fail | view `pages` `[] == [387]` (no Book yet; once add-book lands, `[None] == [387]`) |
| AC-8 | fail | `405 == 503` on the `write` fault |

---

## Notes

- **Prerequisite outside the story text:** AD-20's Clock is still deferred from Story 1.4, and deferred-work.md says it "must ship before any intent that reads 'today' (Story 1.7's Finished on)". The scaffolds assume `FakeClock(today)` and `create_app(clock=...)`. If the Clock lands with a different name, update `_client` only.
- **Contract change:** AD-9 says `ids` is an object (`{"bookId": …}`), but Story 1.5 shipped `OkResponse.ids: list[str]`. AC-1 needs the object. `test_contract.py::test_success_commits_and_returns_ok` and the generated TS types change with it.
- **Breaking view tests:** `test_views.py` compares whole `ShelfBook` dicts, so adding `authors`/`pages`/`createdAt` will fail it until it is updated. That is expected, not a regression.
- **Open (alert copy):** `invalid_fields()` builds "Not saved. N fields need attention: title, pages." from the field *keys*. EXPERIENCE.md's alert reads "… Pages, Language." (the *labels*). Decide in the spec whether the server message uses labels (better for the skill) or Story 1.8 builds the alert text itself. The scaffolds don't assert the top-level message.
- **Open (copy gaps in the validation table):** there is no message for an invalid Type value or a Finished on that isn't a date. AC-3's primary sends an empty Type ("Type is required.") and a future date, so it stays within the table's copy. Add the missing rows to EXPERIENCE.md, which is the contract, before the follow-ups pin them.
- **Open (Edition empty vs omitted):** the scaffolds treat an omitted Edition as 1 and Edition `0` as invalid. Whether an *empty* Edition string is "Edition is required." or defaults to 1 is left to the spec, since the panel prefills 1.
- **Interpretation (ISBN storage):** stored as entered (trimmed), since normalization belongs to duplicate detection (Story 1.9, `domain/`). Change AC-1's expected `isbn` if the spec decides to store digits only.
- **book_not_found (TR8):** does not apply to add-book, which names no existing Book. No new error code is introduced, so "every new error code has an API test" holds trivially; Story 1.9 adds `duplicate_book`.
- **Deviation from the workflow template:** pytest, not Playwright, since the story is backend-only. A leaf is a `@pytest.mark.skip(reason=…)` function whose name carries `ac<n>_p<#>`, the dialect of the existing backend suite (flat functions with `# ---` sections, no classes).
