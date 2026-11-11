---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-11'
storyId: '6.2'
storyKey: '6-2-see-when-my-whole-unread-library-will-be-finished'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-62-see-when-my-whole-unread-library-will-be-finished'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md'
generatedTestFiles:
  - 'backend/tests/test_library_pages_left.py'
  - 'frontend/e2e/catalog-pace-calculator.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 6 intro and gate; Story 6.2; Conventions for every story)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Pace calculator, Catalog row, Library meter, Flow 5)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Catalog layout: meter, then the collapsed link; Pace calculator component; Library meter)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-catalog.html (meter and "How long until…?" button with aria-expanded, in both views)'
  - '_bmad-output/test-artifacts/test-design-qa.md (PAC-API-001 P1, PAC-E2E-001 P2, R-10)'
  - '_bmad-output/test-artifacts/atdd-checklist-6-1-see-when-this-book-will-be-finished.md (format; Book-scope contract)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (6-1 done, 6-2 backlog)'
  - '_bmad/tea/config.yaml'
  - 'backend/bookvie/views/shelf.py (catalog, book_detail), views/models.py (CatalogView, LibraryMeter, BookDetailView), domain/progress.py (pages_left), domain/pace.py, domain/invariants.py (Side reads)'
  - 'backend/tests/test_pace_calculator.py, builder.py, helpers.py'
  - 'frontend/src/pages/CatalogPage.tsx, Bookcase.tsx (MeterBar), CatalogList.tsx; components/PaceCalculator.tsx; lib/pace.ts'
  - 'frontend/e2e/pace-calculator.spec.ts, catalog-list.spec.ts (List view via localStorage), home.ts (serverAtFakeToday, mainAt, DUNE, sizeOf), fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the catalog view, when it is computed, then the server supplies the library-scope pages left: all pages of owned Books that have never been started, plus the pages left in every active or paused Reading, including re-reads; and finished Books without an unfinished Reading aren''t counted, and Side read marks change nothing (FR-15)' }
  - { id: AC-2, idSource: generated, text: 'Given Catalog, when it renders, then a link "How long until…?" sits below the library meter, collapsed by default, and activating it expands the calculator inline with aria-expanded (UX-DR51)' }
  - { id: AC-3, idSource: generated, text: 'Given the expanded calculator, when I type 30 with 8,100 pages left, then it reads "About 9 months · <month year>", using the same field, prefill, arithmetic, formatting and invalid-input rules as Story 6.1 (UJ-5)' }
  - { id: AC-4, idSource: generated, text: 'Given an API test with seeded Readings in every state, when library-scope pages left is computed, then it matches the rule exactly, with no double counting of a Book that has both a finished and an unfinished Reading' }
---

# ATDD Checklist - Epic 6, Story 6.2: See when my whole unread library will be finished

**Date:** 2026-11-11
**Author:** Oleg
**Primary test levels:** API (pytest: the app through `TestClient`) and E2E (Playwright against the real `bookvie`). No new unit leaf: the arithmetic and formatter are Story 6.1's `lib/pace.ts`.

---

## Story Summary

As Oleg, I want the same calculator for my whole library on Catalog, so that the unread shelves get an end date.

**What 6.2 adds:**
- **The catalog view's numbers:** `pagesLeft` (library scope) and `measuredPace` on `GET /api/views/catalog`.
- **The collapsed link** "How long until…?" below Catalog's library meter, a button with `aria-expanded` that expands Story 6.1's `PaceCalculator` inline.

**Not in 6.2:** Stats (6.3, 6.4). The calculator's arithmetic, copy and invalid-input rules are unchanged from 6.1.

**Story source:** `epics.md` → Story 6.2. There is no spec file yet: `sprint-status.yaml` has `6-2-see-when-my-whole-unread-library-will-be-finished: backlog`.
- When `spec-6-2-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** not the first or last story of Epic 6; no gate applies.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 6.1.

**Generation mode:** AI generation from the criteria, the UX docs, the mockup and the code. No browser recording: the link doesn't exist yet. Every locator is a role plus an exact name the criteria, EXPERIENCE.md or the mockup pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run was **sequential** with one author, as in Stories 1.6 to 6.1, so the seeds stay consistent across the two files.

### Before the leaves: what today's code already does

- **Book-scope pages left exists** (`domain/progress.pages_left`, Story 6.1): an unfinished Reading gives `pages − currentPage` (never below 0); no Reading gives all pages; only finished Readings give 0. The library rule in AC-1 is exactly the sum of it over every Book, which also rules out double counting (one current Reading per Book).
- **Every Book is owned:** `Book.ownership` is `Literal["owned"]`, so "owned Books" filters nothing today.
- **Side reads** are a list of Book ids (`sideReadBookIds`) and don't touch Readings, so the mark can't change the sum.
- **The library meter** is drawn inside the Bookcase's header (`Bookcase.tsx` → `MeterBar`), so List view has no meter today. The mockup puts the meter and the link on one row above the bookcase, in both views.
- **`PaceCalculator`** takes `pagesLeft` and `measuredPace` and is reusable as is.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-4, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Catalog view supplies library-scope `pagesLeft` (and `measuredPace`); finished not counted; Side read marks change nothing | API | P1 | `test_ac1_p1_…` |
| AC-2 | Collapsed "How long until…?" link below the meter; activating it expands the calculator inline with `aria-expanded` | E2E | P1 | `[P1] AC-2` |
| AC-3 | Typing 30 with 8,100 pages left reads "About 9 months · July 2027"; 6.1's rules | E2E | P1 | `[P1] AC-3` |
| AC-4 | Every Reading state matches the rule exactly; no double counting | API | P1 | `test_ac4_p1_…` |

**Priorities:**
- **P1:** AC-1 and AC-4 are PAC-API-001 (P1, R-10). AC-2 and AC-3 are PAC-E2E-001 (P2), raised as in 6.1 because they are the story's one journey (UJ-5, Flow 5).

**Level split (no duplicate coverage):**
- **API** proves what only the server decides: the library sum over every Reading state, Side read marks, Measured pace on the catalog view.
- **E2E** proves the wiring: the collapsed link, its place after the meter, `aria-expanded`, the inline calculator with its prefill, and Flow 5's numbers in the browser.
- **Unit:** none new. `paceResult` is unchanged; Flow 5's two lines were checked against it while writing the leaves (8100 at "30" and at "17").

---

## Story Integration Metadata

- **Story ID:** `6.2`
- **Story Key:** `6-2-see-when-my-whole-unread-library-will-be-finished`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 6.2)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-2-see-when-my-whole-unread-library-will-be-finished.md`
- **Generated Test Files:** `backend/tests/test_library_pages_left.py`, `frontend/e2e/catalog-pace-calculator.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 4 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and their names carry `ac1_p1` and `ac4_p1`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P1] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 4 fail, as listed below. The seeds and the server start ran cleanly first. A separate throwaway probe confirmed that the E2E seed's meter reads "1 of 11 finished" today.

**Skipped as committed:**
- `pytest tests/test_library_pages_left.py` gave 2 skipped.
- `playwright test e2e/catalog-pace-calculator.spec.ts` gave 2 skipped.

**Since then (green):** the build (7d41a10) turned every leaf on. It also re-seeded AC-4 with Piranesi as a paused Up next (200, total 1665, below), because the story's AC and FR-15 count every paused Reading, Up next included (spec Design Notes), and it added a never-started Up next library (412) to AC-4. `bmad-testarch-automate` (2026-11-11) added the automate leaves. See `automation-summary.md`.
- `ruff format` and `ruff check` are clean on the new file, Prettier left the spec unchanged, and `oxlint` and `tsc -b` pass.

### API Tests (2 tests): `backend/tests/test_library_pages_left.py`

**`[P1] AC-1`: `test_ac1_p1_the_catalog_view_supplies_library_scope_pages_left_and_measured_pace`**

**Seed:** Dune 412, never started; Emma 400, finished 1 to 20 September (Measured pace 20); Hyperion 482, a Side read waiting at p.210.

**Steps:**
1. **`pagesLeft` is 684** (the first assertion: 412 + 272, the finished Emma adds nothing).
2. `measuredPace` is 20.
3. The same library without the Side read mark: still 684.
4. Dune alone: `measuredPace: null`, `pagesLeft` 412.
5. Only a finished Emma: `pagesLeft` 0.

*Red today: `KeyError: 'pagesLeft'`.*

**`[P1] AC-4`: `test_ac4_p1_library_pages_left_matches_the_rule_for_every_reading_state`**

**Seed** (Measured pace 20 from Emma):

| Book | State | Pages left |
|---|---|---|
| Dune 412 | never started | 412 |
| The Left Hand of Darkness 330 | Main, active at p.120 | 210 |
| Neuromancer 271 | paused at p.80 | 191 |
| Emma 400 | finished | 0 |
| Good Omens 300 | back-filled only | 0 |
| Kindred 100 | back-filled, then re-read and paused at p.30 | 70 (not 170) |
| The Hobbit 310 | back-filled, then a re-read paused at p.0 | 310 (not 620) |
| Hyperion 482 | Side read waiting at p.210 | 272 |
| Piranesi 245 | Up next, paused at p.45 | 200 |

**Steps:**
1. **`pagesLeft` is 1665** (the first assertion).
2. Each Book's own view gives the `pagesLeft` in the table: the library scope is the sum of the Book scopes.

*Red today: `KeyError: 'pagesLeft'`.*

### E2E Tests (2 tests): `frontend/e2e/catalog-pace-calculator.spec.ts`

**Seed `FLOW_5`** (`serverAtFakeToday`: server and browser on 2026-10-28): 8,100 pages left at a Measured pace of 17.
- The Left Hand of Darkness, Main at p.120 of 330 (210); Dune, never started (412); Neuromancer, paused at p.80 of 271 (191).
- Seven never started: 1276 + 1463 + 1225 + 1079 + 1023 + 880 + 341 = 7287.
- Fahrenheit 451, 170 pages read from 1 to 10 September: pace 17, nothing left.

**`[P1] AC-2` the collapsed link** (Catalog, Bookcase view, the default)
1. **A button "How long until…?" is visible in `main`** (the first assertion).
2. It has `aria-expanded="false"`; there is no "pages/day" textbox and no `output`.
3. The meter ("1 of 11 finished") comes before the button in document order.
4. Clicking it: `aria-expanded="true"`, the textbox is visible, 80px wide, prefilled "17", and the `output` reads "About 16 months · February 2028" (Flow 5, step 2). The shell's region is still the only `status`.
5. Clicking again collapses it: `aria-expanded="false"`, no textbox.

*Red today: no button "How long until…?".*

**`[P1] AC-3` typing 30** (Catalog)
1. Setup: click the button and fill "30" (the criterion's Given and When).
2. **The `output` reads "About 9 months · July 2027"** (the first assertion: 270 days, round(8.87) = 9, 25 July 2027).
3. The field's accessible description is the same line.
4. "0" and "": the `output` is empty, no `aria-invalid="true"`, no `alert` in `main`.
5. After a reload: collapsed again; expanded, the field reads "17" and the result "About 16 months · February 2028".

*Red today: `locator.click` times out, no button "How long until…?".* The expand click is the criterion's Given, so on today's code it fails before the first assertion; 6.1's AC-3 leaf has the same shape.

---

## Data Factories Created

None new. The API leaves use `LibraryBuilder` (TC-1); the E2E seed is a `mainAt` partial with literal page counts.

## Fixtures and Helpers Created or Changed

None. The spec has local `toggle`, `paceField`, `result` and `meter` locators.

## Mock Requirements

None. The calculator makes no request.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or the `output` element the criteria name.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Catalog view** `GET /api/views/catalog`, `CatalogView` gains:
- **`pagesLeft: int`**: the sum of `pages_left(book)` over every Book in the library. Side read marks, Up next and the Main pointer play no part.
- **`measuredPace: number | null`**: `float(measured_pace(library))`, not rounded; `null` when there is none. Same value as the book view's.

**Catalog page:**
- **A `button` named "How long until…?"** in `main`, styled as a `link` (DESIGN.md → Pace calculator), with `aria-expanded` `"false"` until activated. It comes after the library meter (`progressbar` "Books finished") in document order.
- **Expanded,** it shows Story 6.1's `PaceCalculator` (`pagesLeft` and `measuredPace` from the catalog view): the "pages/day" textbox (80px) and the `output`. Activating the button again collapses it.
- **Collapsed on every visit:** the expanded state isn't remembered across a reload.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen` (`check:api` compares it byte for byte). |
| `backend/tests/test_contract.py` | Re-run it. If it pins `CatalogView`'s properties, it gains `pagesLeft` and `measuredPace`. |
| `backend/tests/test_bookcase_view.py`, `test_add_book.py`, `test_book_states.py` | They read `/api/views/catalog`. None is known to compare the whole body, but re-run them. |
| `frontend/e2e/bookcase.spec.ts`, `catalog-list.spec.ts`, `catalog-empty.spec.ts`, `new-book-panel.spec.ts`, `home-slice.spec.ts` | Any leaf that pins Catalog's toolbar, the Bookcase header's contents or the meter's place sees the new button (and a moved meter, if the build moves it). Home's slice keeps its meter in the Bookcase header. Re-run them. |

## Assumptions for the spec to confirm

- **Where the meter and link sit.** DESIGN.md → Catalog and the mockup put the meter and the link on one row between the toolbar and the bookcase or list, in both views. Today the meter is inside the Bookcase header, and List view has none. The scaffolds pin only "meter, then button" in Bookcase view; moving the meter out (for Catalog only, not Home) is the build's call.
- **List view** shows the link too (the mockup does). A green follow-up below.
- **The empty library** (no Books) shows no link, as it shows no meter. A green follow-up.
- **With nothing left to read** in the whole library, the expanded calculator reads "Nothing left to read." (6.1's component already does this).
- **Focus stays on the button** when it expands; the field isn't focused automatically. Not pinned.
- **Up next and Waiting for you** count as their Readings say (never started: all pages; paused: the rest); nothing is special about the pointers.

## Open items that bear on this story

- **PAC-API-001** is complete once AC-1 and AC-4 are green (6.1 covered Book scope). **PAC-E2E-001** is complete with AC-2 and AC-3 (6.1 covered Book detail).
- **R-10** (pace numbers wrong): library scope closes the PAC-* part; the Stats parts come in 6.3 and 6.4.
- **Spine drift to expect:** the Capability map's FR-15 row names `views/` for pages left in both scopes, which matches. If the spine-check review raises the meter's placement, defer it as "spine drift" per AGENTS.md.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_library_pages_left.py`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/catalog-pace-calculator.spec.ts -g "AC-2"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-1 and AC-4: the catalog view
- [x] `views/models.py`: `CatalogView.pages_left: int` and `measured_pace: float | None`, with docstrings. Fill them in `views/shelf.py` `catalog` from `pages_left` summed over every Book, and `measured_pace`. (done: backend/bookvie/views/models.py:158,164 and views/shelf.py:95-96; backend/tests/test_library_pages_left.py:57 `test_ac1_p1_…`)
- [x] Run `npm --prefix frontend run api:gen`, and re-run `test_contract.py`. (done: `schema.d.ts` regenerated in 7d41a10 (`pagesLeft`, `measuredPace` at l.761-763); `npm run check` (check:api byte compare, full pytest incl. `test_contract.py`) exit 0 on 2026-11-11)
- [x] Activate AC-1 and AC-4. (done: backend/tests/test_library_pages_left.py:57 and :119, active and passing)

### AC-2 and AC-3: the link on Catalog
- [x] A collapsed "How long until…?" button (`link` style, `aria-expanded`) after the library meter on Catalog, expanding `PaceCalculator` inline with the catalog view's `pagesLeft` and `measuredPace`. (done: frontend/src/pages/CatalogPage.tsx:78 `LibraryPace`; frontend/e2e/catalog-pace-calculator.spec.ts:96 `[P1] AC-2`)
- [x] Activate AC-2 and AC-3. (done: frontend/e2e/catalog-pace-calculator.spec.ts:96 and :138, active and passing)

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [x] **List view:** with `bookvie.catalogView` = "list", the meter and the button are there and the calculator expands the same way. (done: frontend/e2e/catalog-pace-calculator.spec.ts:170 `[P2] List view has the same meter and link…`, which also asserts the field comes before the table)
- [x] **Nothing left to read:** a library whose Books are all finished expands to "Nothing left to read.". (done: frontend/e2e/catalog-pace-calculator.spec.ts:196 `[P2] a library with only finished Books…`)
- [x] **No Measured pace:** the expanded field and `output` are empty. (done: frontend/e2e/catalog-pace-calculator.spec.ts:209 `[P2] without a Measured pace…`)
- [x] **Empty library:** no button (with no meter). (done: frontend/e2e/catalog-pace-calculator.spec.ts:225 `[P2] an empty library has no meter and no link`)
- [x] **Keyboard:** Enter and Space on the focused button toggle `aria-expanded`; focus stays on it. (done: frontend/e2e/catalog-pace-calculator.spec.ts:296 `[P2] the link works from the keyboard…`, which also pins the expanded Tab order link → field → first spine)
- [x] **Live update:** finishing or adding a Book refetches the catalog view and the expanded result follows the new `pagesLeft`, keeping the typed pace. (done: frontend/e2e/catalog-pace-calculator.spec.ts:264 `[P1] an add on Catalog refetches the view…` (adding a Book; finishing has no control on Catalog))
- [x] **Pages edited below the current page:** that Book adds 0, never a negative number, to the library sum. (done: backend/tests/test_library_pages_left.py:184 `test_p2_a_book_with_pages_edited_below_its_page_adds_0_to_library_pages_left`, on the views directly: the store refuses the state (409 `pages_below_current_page`, invariant `reading_page_in_range`), so the clamp is defensive)
- ~~**PAC-UNIT-002:** add 8100 at "30" (270 days) and at "17" (477 days) to `frontend/src/lib/pace.cases.json`.~~ **Retired:** `pace.cases.json` is a days-only table (its `about`: every case under 60 days; `pace.test.ts:80` checks the "About N days" prefix), and 270 and 477 days read in months. The exact 8,100 lines are pinned in the browser by frontend/e2e/catalog-pace-calculator.spec.ts:96 `[P1] AC-2` ("About 16 months · February 2028") and :138 `[P1] AC-3` ("About 9 months · July 2027")
- [x] **axe** on Catalog with the calculator expanded, in both themes. (done: frontend/e2e/catalog-pace-calculator.spec.ts:237 `[P2] axe finds nothing on Catalog with the calculator expanded, in both views and both themes`)
