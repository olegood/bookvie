---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-11'
storyId: '6.1'
storyKey: '6-1-see-when-this-book-will-be-finished'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-61-see-when-this-book-will-be-finished'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-6-1-see-when-this-book-will-be-finished.md'
generatedTestFiles:
  - 'backend/tests/test_pace_calculator.py'
  - 'frontend/e2e/pace-calculator.spec.ts'
  - 'frontend/src/lib/pace.test.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 6 intro and gate; Story 6.1; Story 6.2 for scope; FR-15; Conventions for every story)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-6: server computes Measured pace and pages left, client owns the calculator arithmetic, max(1, ceil(...)); AD-20: Clock, browser today, pinned Europe/Madrid; Capability map FR-15 row)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Pace calculator; Measured pace; Book detail actions; Flow 5)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Pace calculator component: 80px field, surface-inset row, body result, no error styling; Book detail right-column blocks)'
  - '_bmad-output/test-artifacts/test-design-qa.md (PAC-API-001 P1, PAC-E2E-001 P2, PAC-UNIT-002 P2, R-07, R-10)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (epic-6 backlog; 6-1 backlog; every retro action item done)'
  - '_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md (format and conventions)'
  - '_bmad-output/test-artifacts/atdd-checklist-1-6-open-bookvie-to-an-empty-shelf.md (dynamic-import unit scaffold)'
  - 'backend/bookvie/domain/pace.py (measured_pace, days_left), domain/progress.py (current_reading), views/models.py (BookDetailView, HomeMainBook.days_left), views/shelf.py (book_detail)'
  - 'backend/tests/test_reentry.py (pace seeds), test_views.py, builder.py, helpers.py (api_client, TODAY)'
  - 'frontend/src/pages/BookDetailPage.tsx (right-column blocks), lib/today.ts, lib/relativeDay.ts and .test.ts'
  - 'frontend/e2e/reentry.spec.ts (EMMA pace seed), home.ts (serverAtFakeToday, FAKE_TODAY, DUNE, sizeOf), fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the book view, when it is computed, then the server supplies the Book-scope pages left: the pages left in its current (active or paused) Reading, or all its pages when it has never been started, plus Measured pace when there is one (FR-15, AD-6)' }
  - { id: AC-2, idSource: generated, text: 'Given Book detail, when it renders, then a "How long until…?" block shows a "pages/day" field (80px) prefilled with Measured pace rounded to one decimal, or empty when there is none, and an output element for the result (UX-DR51)' }
  - { id: AC-3, idSource: generated, text: 'Given a positive number in the field, when I type, then the result updates on every keystroke: days = ceil(pages left ÷ pages/day), finish date = today + days, using the same rounding as the server''s days left (AD-6); and it reads as a duration plus a date, in days below 60 days, in months below 24 months, and in years from 24 months on; and below 60 days the date is a day and month ("About 12 days · 10 November"), with the year added only when it isn''t this year; months and years show month and year ("About 9 months · July 2027")' }
  - { id: AC-4, idSource: generated, text: 'Given zero, a negative number, non-numeric text or an empty field, when I type, then no result and no message are shown, with no error styling' }
  - { id: AC-5, idSource: generated, text: 'Given a Book with nothing left to read (finished, no unfinished Reading), when the block renders, then it reads "Nothing left to read."' }
  - { id: AC-6, idSource: generated, text: 'Given fake-Clock unit tests, when the duration formatter runs at its edges (59/60 days, 23/24 months, a pace above the pages left, a day-and-month date that crosses into next year), then each case formats as specified' }
---

# ATDD Checklist - Epic 6, Story 6.1: See when this book will be finished

**Date:** 2026-11-11
**Author:** Oleg
**Primary test levels:** API (pytest: the app through `TestClient`), E2E (Playwright against the real `bookvie`), and Unit (`node --test` on a pure `src/lib` module)

---

## Story Summary

As Oleg, I want to type a pages-per-day pace on a Book's page and see when I'd finish it, so that I can judge whether a Book fits before a deadline.

The server already computes Measured pace (`domain/pace.measured_pace`, Story 3.4) and uses it for Home's "~N days left". Neither Measured pace nor a Book's pages left reaches Book detail yet.

**What 6.1 adds:**
- **The book view's numbers:** `pagesLeft` (Book scope) and `measuredPace` on `GET /api/views/book`.
- **The "How long until…?" block** on Book detail: a "pages/day" field (80px) prefilled with Measured pace, and an `output` for the result.
- **The client arithmetic and formatter:** days = max(1, ceil(pages left ÷ pages/day)), finish date = today + days, and the duration-plus-date line.
- **The silent invalid input** and **"Nothing left to read."**

**Not in 6.1:**
- the library-scope pages left, and the collapsed calculator on Catalog (6.2);
- Stats (6.3, 6.4).

**Story source:** `epics.md` → Story 6.1. There is no spec file yet: `sprint-status.yaml` has `6-1-see-when-this-book-will-be-finished: backlog`.
- When `spec-6-1-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Epic boundary:** this is Epic 6's first story. The gate is clear: every "spine drift" entry in `deferred-work.md` has a `resolved:` line, and all 51 retro action items (Epics 1 to 5) are `done`.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 5.4.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the block doesn't exist yet. Every locator is a role plus a name, or exact text, that the criteria, EXPERIENCE.md or this checklist pins.

**Execution:** `tea_execution_mode: auto` would resolve to subagents. The run was **sequential** with one author, as in Stories 1.6 to 5.4, so the seeds stay consistent across the three files.

### Decisions taken with Oleg (2026-11-11)

- **Days to months:** months = round(days ÷ 30.4375); from 24 months, years = round(months ÷ 12). This matches both Flow 5 examples (270 days → 9 months, 477 days → 16 months). The boundaries are 60 days → "About 2 months", 715 days → 23 months and 716 days → "About 2 years". The build adds the rule to EXPERIENCE.md → Pace calculator.
- **Copy:** the prefill drops a trailing ".0" (pace 20 → "20", 17.33 → "17.3"), and a 1-day result reads "About 1 day". With these rules, months start at 2 and years at 2, so "1 month" and "1 year" can't occur.

### Before the leaves: what today's code already does

- **Measured pace exists** as an exact `Fraction` (`domain/pace.measured_pace`). `days_left` uses the same `max(1, ceil(...))` rule the client must copy (AD-6).
- **`current_reading(book)`** gives the single unfinished Reading, active or paused. With none, a Book's pages left is all its pages if it has no Reading at all, else 0.
- **The e2e fake clock** (`serverAtFakeToday`) already fixes the browser at 10:00 on 2026-10-28 in Europe/Madrid, so the browser's "today" is fixed.
- **`EMMA`** (400 pages, 1 to 20 September) is the same pace-20 seed as `reentry.spec.ts`.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-6, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Book view supplies Book-scope `pagesLeft` and `measuredPace` | API | P1 | `test_ac1_p1_…` |
| AC-2 | "How long until…?" block, 80px "pages/day" field prefilled, `output` | E2E | P1 | `[P1] AC-2` |
| AC-3 | Result on every keystroke; days, months, years; the date's form | E2E | P1 | `[P1] AC-3` |
| AC-4 | 0, negative, non-numeric, empty: no result, no message, no error styling | E2E | P2 | `[P2] AC-4` |
| AC-5 | Nothing left to read → "Nothing left to read." | E2E | P2 | `[P2] AC-5` |
| AC-6 | Formatter edges with a fixed today: 59/60 days, 23/24 months, pace > pages left, next year | Unit | P1 | `[P1] AC-6` |

**Priorities:**
- **P1:**
  - AC-1 is PAC-API-001 (P1). R-10 (pace numbers wrong) depends on it.
  - AC-6 is PAC-UNIT-002 (P2 in test-design-qa). This checklist raises it, because the Epic 6 gate names "fake-Clock boundary tests for pace".
  - AC-2 and AC-3 are PAC-E2E-001 (P2), raised because they are the story's one journey (UJ-5 at Book scope).
- **P2:** AC-4 and AC-5 are the quiet branches of PAC-E2E-001.

**Level split (no duplicate coverage):**
- **API** proves what only the server decides: pages left for every Reading state, and Measured pace, exact and `null` when there is none.
- **Unit** proves the arithmetic and the formatter at the edges, with "today" passed in: the 59/60-day and 23/24-month boundaries, the 1-day minimum, the year on a next-year date, decimal paces, and calendar-day addition across DST.
- **E2E** proves the wiring:
  - the block, the field, its width and its prefill;
  - that the result follows each keystroke, and that the browser's today is used;
  - silence on invalid input;
  - the nothing-left line.
  It checks one case per duration unit, not the edges.

**Secondary branches (green-phase follow-ups, not separate red leaves):**
- AC-2 with no Measured pace (empty field, empty output) and a fractional pace ("17.3").
- AC-4's rules as unit cases.
- AC-5 for a Main book at its last page.

The full list is under "Green-phase follow-ups" below.

---

## Story Integration Metadata

- **Story ID:** `6.1`
- **Story Key:** `6-1-see-when-this-book-will-be-finished`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 6.1)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-6-1-see-when-this-book-will-be-finished.md`
- **Generated Test Files:** `backend/tests/test_pace_calculator.py`, `frontend/e2e/pace-calculator.spec.ts`, `frontend/src/lib/pace.test.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 6 in all.
- **The backend leaf** has `@pytest.mark.skip(reason=RED)`, and its name carries `ac1_p1`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.
- **The unit leaf** uses `it.skip(...)`, and its title carries `[P1] AC-6`. It loads `./pace.ts` with `await import(MODULE)` inside the test, so `tsc` and the runner pass before the module exists. Switch to a static import at green.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 6 fail on their first assertion, as listed below. Every setup step ran cleanly first: the seeds and the server start.

**Skipped as committed:**
- `pytest tests/test_pace_calculator.py` gives 1 skipped.
- `playwright test e2e/pace-calculator.spec.ts` gives 4 skipped.
- `node --test src/lib/pace.test.ts` gives 1 skipped.
- `ruff format` and `ruff check` are clean on the new file, Prettier has formatted both frontend files, and `oxlint` and `tsc -b` pass.

### API Tests (1 test): `backend/tests/test_pace_calculator.py`

**`[P1] AC-1`: `test_ac1_p1_the_book_view_supplies_book_scope_pages_left_and_measured_pace`**

**Seed:** Measured pace is 20 (Emma, 400 pages from 1 to 20 September, the only finished Reading with a start date).
- Neuromancer 271, paused at p.80.
- The Left Hand of Darkness 330, Main at p.120.
- Dune 412, never started.
- Emma 400, finished.
- Kindred 100, back-filled and then re-read, paused at p.30.
- Good Omens 300, back-filled only.
- Hyperion 482, a Side read at p.210.

**Steps:**
1. **Neuromancer's `pagesLeft` is 191** (the first assertion: a paused Reading).
2. `pagesLeft` for the other Books: Main 210, never started 412, finished 0, the re-read 70, back-filled 0, the Side read 272.
3. `measuredPace` is 20 on every Book's view.
4. A separate library (100 pages over 3 days) gives `measuredPace` ≈ 33.333, not rounded on the server.
5. A library with no finished Reading gives `measuredPace: null`, and `pagesLeft` is still 412.

*Red today: `KeyError: 'pagesLeft'`.*

### E2E Tests (4 tests): `frontend/e2e/pace-calculator.spec.ts`

**Seeds** (`serverAtFakeToday`: server and browser on 2026-10-28):
- `PACED`: `DUNE` (412 pages, never started) and `EMMA` (Measured pace 20).
- `NO_PACE`: `DUNE` alone.

**`[P1] AC-2` the block** (`PACED`, Dune's Book detail)
1. **A `region` named "How long until…?" is visible** (the first assertion).
2. The textbox "pages/day" reads "20" and is 80px wide.
3. The `output` reads "About 21 days · 18 November" from the prefill.

*Red today: no region "How long until…?".*

**`[P1] AC-3` every keystroke** (`NO_PACE`, so the field starts empty)
1. **The field is editable** (the first assertion: the criterion's input).
2. Press "3": "About 5 months · March 2027" (138 days).
3. Press "0": "About 14 days · 11 November" (this year, so no year).
4. Fill "12.5": "About 33 days · 30 November" (ceil of 32.96).
5. Fill "1": "About 14 months · December 2027" (412 days).

*Red today: no textbox "pages/day".*

**`[P2] AC-4` silence** (`NO_PACE`)
1. **The field is editable** (the first assertion).
2. Fill "30" for a result, and record the field's border color.
3. Fill "0": the `output` is empty.
4. For "-5", "abc" and "": the `output` is empty, the field has no `aria-invalid="true"`, and the border color is unchanged.
5. The block has no `alert`, and holds only "How long until…?" and "pages/day".

*Red today: no textbox "pages/day".*

**`[P2] AC-5` nothing left** (`PACED`, Emma's Book detail)
1. **The block reads "Nothing left to read."** (the first assertion).
2. There is no "About …" line.

*Red today: no region "How long until…?".*

### Unit Tests (1 test): `frontend/src/lib/pace.test.ts`

**`[P1] AC-6` the formatter's edges** (today = 2026-10-28, 10:00 local)
1. **`paceResult(59, '1', today)` is "About 59 days · 26 December"** (the first assertion), and 60 days gives "About 2 months · December 2026".
2. 715 days gives "About 23 months · October 2028", 716 gives "About 2 years · October 2028", and 1000 gives "About 3 years · July 2029".
3. 10 pages at "30" gives "About 1 day · 29 October".
4. From 20 December 2026, 20 days gives "About 20 days · 9 January 2027".
5. Decimal and even paces: 412 at "12.5" gives 33 days; 400 at "20" gives 20 days, 17 November.
6. In Europe/Madrid, from 23:30 on 20 March 2027, 10 days gives "30 March": calendar days across the spring change, not 24-hour steps.

*Red today: `ERR_MODULE_NOT_FOUND` for `./pace.ts`.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1) or the e2e seed partials, with fixed literal ids where a test compares them.

## Fixtures and Helpers Created or Changed

- **None changed.** `EMMA` is copied from `reentry.spec.ts` (same id and dates). If 6.2 needs it too, move it to `e2e/home.ts` in the green phase.

## Mock Requirements

None. The calculator makes no request.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, exact text, or the `output` element the criterion names.

---

## Contract the Scaffolds Pin (names the implementation must use)

**Book view** `GET /api/views/book?id=…`, `BookDetailView` gains:
- **`pagesLeft: int`**:
  - with a current (unfinished) Reading, active or paused: `pages − currentPage`, never below 0;
  - with no Reading at all: `pages`;
  - with only finished Readings: 0.
- **`measuredPace: number | null`**: `float(measured_pace(library))`, not rounded; `null` when there is none.

**`frontend/src/lib/pace.ts`:**
- **`paceResult(pagesLeft: number, typed: string, today: Date): string | null`**, the calculator's line.
- **It returns `null`** when `typed` isn't a positive finite number. That covers 0, negatives, an empty string, and non-numeric text.
- **days** = max(1, ceil(pagesLeft ÷ pace)). **finish** = today's local date + days, added by calendar day.
- **Under 60 days:** "About N days · D Month", with the year added when it isn't today's year, and "About 1 day" at 1.
- **From 60 days:** months = round(days ÷ 30.4375), giving "About N months · Month YYYY".
- **From 24 months:** years = round(months ÷ 12), giving "About N years · Month YYYY".
- **English month names** are fixed, as in `lib/today.ts`.
- **A prefill helper**, for example `pacePrefill(measuredPace: number | null): string`, rounds to one decimal and drops ".0"; it gives "" with no pace. The name is free: no scaffold imports it.

**The block on Book detail:**
- **A `region` named by its `h2` "How long until…?"** (same `block` / `blockLabel` pattern as the other right-column blocks), after Readings and before Change color (DESIGN.md → Book detail).
- **A textbox labelled "pages/day"**: `type="text"` with `inputmode="decimal"`, not `type="number"`, so any text can be typed (AC-4). It is 80px wide, on a `surface-inset` row (DESIGN.md → Pace calculator).
- **An `output`** with the line, empty when there is no result.
- **When `pagesLeft` is 0**, the block reads "Nothing left to read.".
- **"Today"** is the browser's (`useNow`), never the server's (AD-20).

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/src/api/generated/schema.d.ts` | Regenerate with `npm --prefix frontend run api:gen` (`check:api` compares it byte for byte). |
| `backend/tests/test_contract.py` | Re-run it. If it pins `BookDetailView`'s properties, it gains `pagesLeft` and `measuredPace`. |
| `backend/tests/test_views.py`, `test_book_states.py`, `test_reading_state_machine.py`, `test_side_reads.py`, `test_start_reading.py`, `test_finish_reading.py`, `test_waiting_for_you.py`, `test_add_card_note.py` | They read `/api/views/book`. None is known to compare the whole body, but re-run them. |
| `frontend/e2e/book-detail.spec.ts`, `book-states.spec.ts`, `card-notes*.spec.ts` | Any leaf that pins Book detail's right column, its block order, or a whole-region text sees the new block. Re-run them. |

## Assumptions for the spec to confirm

- **`pagesLeft` 0 with an unfinished Reading** (a Main book at its last page, not yet finished) also reads "Nothing left to read.". The spine says "with nothing left to read … it shows no days". This is a green follow-up.
- **The field is hidden** when there is nothing left to read. AC-5 checks only the line and that there is no "About …" result.
- **The prefill gives a result at once.** Flow 5, step 2, shows the result as soon as the calculator opens.
- **Whitespace around a number** (" 30 ") counts as 30, and a comma decimal ("12,5") is non-numeric. Neither is pinned yet.
- **Placement:** after Readings and before Change color, as DESIGN.md → Book detail lists the blocks. The scaffolds don't pin the order.

## Open items that bear on this story

- **PAC-API-001** covers Book scope here. 6.2 adds library scope; tick the trace when both are green.
- **PAC-E2E-001** covers Book scope here, and 6.2 covers Catalog.
- **PAC-UNIT-002** ("client rounding matches server on shared fixtures"): AC-6 pins the client's `max(1, ceil(...))`, and `test_reentry.py` pins the server's `days_left`. A shared fixture file is a follow-up.
- **R-07 and R-10** are partly closed by AC-6 and AC-1. The Epic 6 gate also needs the Stats boundaries (6.3).
- **Spine drift to expect:** the Capability map's FR-15 row names `views/` (pages left, Measured pace) and client arithmetic, which matches. The spine doesn't name the months rule decided above; if the spine-check review raises it, defer it as "spine drift" (AD-6), as AGENTS.md says.

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` / `it.skip(` to `test(` / `it(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_pace_calculator.py`
- **Unit:** `cd frontend && TZ=Europe/Madrid node --test src/lib/pace.test.ts`
- **E2E:** `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/pace-calculator.spec.ts -g "AC-2"` (the e2e entry builds the SPA, Epic 3 retro item 27)

### AC-1: the book view
- [ ] `views/models.py`: `BookDetailView.pages_left: int` and `measured_pace: float | None`, with docstrings. Fill them in `views/shelf.py` `book_detail` from `current_reading` and `measured_pace`.
- [ ] Run `npm --prefix frontend run api:gen`, and re-run `test_contract.py`.
- [ ] Activate AC-1.

### AC-6: the formatter
- [ ] `frontend/src/lib/pace.ts`: `paceResult` and the prefill helper, per the contract above.
- [ ] Switch `pace.test.ts` to a static import, and activate AC-6.
- [ ] EXPERIENCE.md → Pace calculator: add the months and years rule, and "About 1 day" (the decisions above).

### AC-2 to AC-5: the block
- [ ] A `PaceCalculator` component: the "pages/day" field, its prefill, and the `output` showing `paceResult(pagesLeft, typed, useNow())`. With `pagesLeft` 0, it shows "Nothing left to read." instead.
- [ ] Book detail's right column: the "How long until…?" `region` with that component.
- [ ] Activate AC-2, AC-3, AC-4 and AC-5.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-2, no pace:** with `NO_PACE`, the field is empty and the `output` is empty.
- [ ] **AC-2, a fractional pace:** a library whose pace is 17.33… prefills "17.3".
- [ ] **AC-4 as unit cases:** `paceResult` returns `null` for "0", "-5", "abc", "" and "   ".
- [ ] **AC-5 at the last page:** a Main book at p.330 of 330 reads "Nothing left to read." (assumption above).
- [ ] **AC-3 across midnight:** a tab left open past midnight recomputes the date when the window regains focus (`useNow`, as Story 3.4's re-entry line).
- [ ] **PAC-UNIT-002:** a shared fixture file of (pages left, pace) → days, read by both `test_reentry.py` and `pace.test.ts`.
- [ ] **AC-3, years in the browser:** one e2e case of at least 24 months, for example 412 pages at "0.5" → 824 days → "About 2 years · January 2029".
- [ ] **axe** on Book detail with the block, in both themes.
