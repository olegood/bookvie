---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-05'
storyId: '3.3'
storyKey: '3-3-catch-up-with-one-page-update'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-33-catch-up-with-one-page-update'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-3-catch-up-with-one-page-update.md'
generatedTestFiles:
  - 'backend/tests/test_update_page.py'
  - 'frontend/e2e/update-page.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3; Story 3.3; Conventions for every story: TR8, TR9)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Page update, refusal codes, Finish, Server owns numbers, Time, No optimistic updates)'
  - '_bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md (AD-9 envelope and not_main_book, AD-19 Reading fields and finishing, module map FR-10)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Page field, Gauge, Re-entry line, Validation messages, Couldn''t save, Live regions)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Page field, Text field invalid state)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-home.html (page field markup: spinbutton, aria-describedby "of 330", Update)'
  - '_bmad-output/test-artifacts/test-design-qa.md (PRG-API-001, PRG-API-002, PRG-E2E-001, R-01, R-07, R-17)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-3 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md (format, conventions, shared helpers)'
  - 'backend/bookvie/intents/start_reading.py, edit_purpose.py, contract.py, intent_model.py; backend/bookvie/http/api.py; backend/bookvie/views/models.py'
  - 'backend/tests/builder.py, helpers.py, test_start_reading.py, test_reading_state_machine.py'
  - 'frontend/src/components/MainBookCard.tsx, Gauge.tsx; frontend/src/pages/HomePage.tsx; frontend/src/lib/gauge.ts, announce.ts'
  - 'frontend/e2e/fixtures.ts, home.ts, intents.ts, home.spec.ts, start-reading.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Main book card, when it renders, it holds the page field: label "Page", a number input prefilled with the last saved page, "of 330" linked by aria-describedby, and Update pushed right; focus isn''t placed in the field automatically (UX-DR36)' }
  - { id: AC-2, idSource: generated, text: 'Given a page from 0 to the page count, including a lower page than before, pressing Update or Enter makes update-page save currentPage and set lastProgressUpdate to now; the gauge, percentage and re-entry line update together after the views refetch, and the status region reads "Page 212 of 330, 64%." (FR-10)' }
  - { id: AC-3, idSource: generated, text: 'Given an out-of-range or non-numeric page, pressing Update saves nothing, the field keeps the typed value with aria-invalid="true", and "Page must be between 0 and 330." appears under it and in the alert region; a page that isn''t a whole number (such as 212.5) counts as non-numeric: the input uses step="1", and the server refuses anything but an integer with the same message' }
  - { id: AC-4, idSource: generated, text: 'Given the Book''s last page, pressing Update saves the page, the Reading stays unfinished, and the response carries reachedLastPage: true (PRG-API-002); until Story 3.6 adds the Finish dialog, the client ignores reachedLastPage' }
  - { id: AC-5, idSource: generated, text: 'Given a page update from a tab that still shows X as Main after another tab changed the Main book, update-page sent for X is refused with 409 not_main_book, nothing changes, and the refreshed views show the current state (AD-9)' }
  - { id: AC-6, idSource: generated, text: 'Given a fresh app open with a Main book, a Playwright test catches up in at most 2 interactions (click the field and type, then press Update) and finishes in under 30 seconds (PRG-E2E-001, NFR4, R-17)' }
  - { id: AC-7, idSource: generated, text: 'Given the server answers couldnt_save, pressing Update keeps the typed page in the field, the gauge doesn''t move, and "Couldn''t save. Your data wasn''t changed." appears below (TR9)' }
  - { id: AC-8, idSource: generated, text: 'The standard intent ACs (TR8) hold for update-page' }
---

# ATDD Checklist - Epic 3, Story 3.3: Catch up with one page update

**Date:** 2026-11-05
**Author:** Oleg
**Primary test levels:** E2E (Playwright against the real `bookvie`) and API (pytest against the app through `TestClient`)

---

## Story Summary

As Oleg, I want to type the page I've reached and press Update, so that catching up after a few days takes seconds.

Today the Main book card (Story 3.1) shows the cover, the title, the author and the gauge. Nothing in the app can change a page: `currentPage` moves only through seeds.

**What 3.3 adds:**
- **One intent:** `update-page`.
- **One new refusal code:** `not_main_book` (409).
- **The page field** in the Main book card: "Page", the number input, "of *M*", **Update**, Enter, the inline message and the `status` line.

**Not in 3.3:**
- the re-entry line ("Last updated…", "~N days left"): Story 3.4;
- the Main spine's fill: Story 3.5;
- the Finish dialog that `reachedLastPage` will open: Story 3.6;
- the card's "⋯" menu and card notes: Epic 4 and later.

**Story source:** `epics.md` → Story 3.3. There is no spec file yet: `sprint-status.yaml` has `3-3-catch-up-with-one-page-update: backlog`.
- When `spec-3-3-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.2.

**Generation mode:** AI generation from the criteria, the architecture and UX docs, the `key-home.html` mockup and the code. There was no browser recording, because the page field doesn't exist yet. Every locator is a role and name that the criteria, EXPERIENCE.md or the mockup pins (the mockup's field is a `spinbutton` named "Page").

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.2. One seed (The Left Hand of Darkness, Main at p.150 of 330) is shared by both halves.

### Before the leaves: what today's code already does

- **`OkResponse.reached_last_page` already exists** (`intents/contract.py`), so the envelope needs no change. `response_model_exclude_none=True` drops it when it is `None`.
- **The invariants already guard this story:** `reading_page_in_range` and `main_has_unfinished_reading`. A page past the count that slips through validation fails the commit with 500, not 200.
- **The Main book always has a current Reading** (invariant), so `update-page` on the Main book never has to create one.
- **The home view already supplies `currentPage`, `pages` and `percent`** (`HomeMainBook`), and the gauge already renders them. A save only needs a refetch.
- **`announce('status' | 'alert', …)`** (`lib/announce.ts`) empties a region and sets it after about 100 ms, as Live regions require.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-8, one per Given/When/Then block in source order. The closing "And the standard intent ACs" line is AC-8. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | The page field: "Page", prefilled, "of 330" as description, **Update** to the right, `step="1"`, not auto-focused | E2E | P1 | `[P1] AC-1` |
| AC-2 | Enter (or **Update**) saves: `currentPage`, `lastProgressUpdate` = now; the gauge follows; `status` "Page 212 of 330, 64%." | E2E | P0 | `[P0] AC-2` |
| AC-3 | 331 or 212.5: not saved, value kept, `aria-invalid`, "Page must be between 0 and 330." below and in `alert` | E2E | P1 | `[P1] AC-3` |
| AC-4 | The last page: saved, still unfinished, `reachedLastPage: true` | API | P0 | `test_ac4_p0_…` |
| AC-5 | `update-page` for a Book that isn't Main: 409 `not_main_book`, nothing changes | API | P1 | `test_ac5_p1_…` |
| AC-6 | A fresh open catches up in 2 interactions and under 30 s | E2E | P0 | `[P0] AC-6` |
| AC-7 | Couldn't save: typed page kept, gauge unmoved, the line below | E2E | P1 | `[P1] AC-7` |
| AC-8 | TR8 for `update-page` (faults, invariants with a lower page and 0, `book_not_found`, contract) | API | P0 | `test_ac8_p0_…` |

**Priorities:**
- **P0:**
  - AC-2 and AC-6: the story's purpose and the epic's gate (PRG-E2E-001, NFR4).
  - AC-4: R-01. A page update must never finish a Reading.
  - AC-8: R-01 and R-02. One commit or none, and the invariants after every success.
- **P1:** the rest. They cover the field's shape, validation, the stale tab and couldn't-save (R-12).

**Level split (no duplicate coverage):**
- **API:** what only the server can prove, or proves much more cheaply: the last page's flag and unfinished Reading, the new refusal, fault injection, invariants and the contract.
- **E2E:** the field, focus, the `status` and `alert` lines, the gauge after the refetch, speed, and the stored result of a save, read from the data dir's `library.json` after the UI says it's done.
- **Criteria with a half at the other level** have one red leaf each, at the level named in the table. The other half is a green-phase follow-up below:
  - AC-3's server half: integer-only, same message.
  - AC-4's client half: `reachedLastPage` is ignored.
  - AC-5's client half: the refreshed views.

---

## Story Integration Metadata

- **Story ID:** `3.3`
- **Story Key:** `3-3-catch-up-with-one-page-update`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.3)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-3-catch-up-with-one-page-update.md`
- **Generated Test Files:** `backend/tests/test_update_page.py`, `frontend/e2e/update-page.spec.ts`

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 8 in all.
- **The backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **The E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 8 fail as listed below. Every seed started cleanly.

**Skipped as committed:**
- `pytest tests/test_update_page.py` gives 3 skipped.
- `playwright test e2e/update-page.spec.ts` gives 5 skipped.
- The whole backend suite passes (933 passed, 3 skipped).
- Ruff (on the new file and `helpers.py`), oxlint and `tsc -b` are clean.

**One deviation from the workflow's E2E rule** ("the criterion assertion is the first operation that can fail"), kept to match Stories 1.6 to 3.2:
- The leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.
- In AC-1, AC-3 and AC-7, the first assertion is the page field's visibility. That field is the criterion's subject.
- **AC-2 and AC-6** start with the catch-up itself (fill, then Enter or **Update**). Today they fail on the setup `fill` (a 15 s action timeout), not on an assertion. Once AC-1 is green, they fail on their own `status` assertion.

### API Tests (3 tests): `backend/tests/test_update_page.py`

**Seed (`_left_hand_main_and_dune_paused`):**
- The Left Hand of Darkness (Ursula K. Le Guin, 330 pages) is the Main book at p.150, or at `page`. It was started 2026-10-01, has a Purpose, and `lastProgressUpdate` is 2026-10-25T21:00 CET.
- Dune (412 pages) is paused at p.120 (`pausedAt` 2026-10-20).
- `api_client` pins today to `TODAY` (2026-10-30). `NOW` is `FakeClock(TODAY).now()`, local noon.

**`[P0] AC-4`: `test_ac4_p0_update_page_at_the_last_page_saves_it_keeps_the_reading_unfinished_and_says_so`**

The seed has the Main book at p.300. The leaf sends page 330, then checks, in order:
1. **`reachedLastPage` is `True`** (the first assertion).
2. The status is 200, and the body is exactly `{ok: true, reachedLastPage: true}`.
3. The Reading equals what it was, except `currentPage` 330 and `lastProgressUpdate` = now. `finishDate` and `finishedPages` stay `null`.
4. `mainBookId` is unchanged, Dune is byte-for-byte the same, and the invariants hold.

*Red today: `assert None is True`. The POST gets Starlette's 405 `{detail}`.*

**`[P1] AC-5`: `test_ac5_p1_update_page_for_a_book_that_isnt_main_is_refused_with_not_main_book`**

The leaf sends page 150 for Dune: a stale tab still shows Dune as Main. It then checks, in order:
1. **The status is 409** (the first assertion).
2. `kind` is `refusal`, `code` is `not_main_book`, and there is a message.
3. `library.json` is byte-identical.
4. `not_main_book` is in the OpenAPI `ErrorCode` enum (AD-8).

*Red today: `assert 405 == 409`.*

**`[P0] AC-8`: `test_ac8_p0_update_page_keeps_the_standard_intent_guarantees`**

The leaf checks, in order:
1. **A write fault gives 503** (the first assertion), then the whole `couldnt_save` body and byte-identical storage. The same follows for `fsync` and `replace`.
2. **Success:** pages 212, 100 (lower than before) and 0 each give exactly `{ok: true}`. After each:
   - the Reading equals the seeded one except `currentPage` and `lastProgressUpdate` = now;
   - `mainBookId` and Dune are unchanged;
   - the invariants hold.
3. **A deleted Book:** 409 `book_not_found`, and nothing changes.
4. **The contract:** the path is in the OpenAPI schema.

*Red today: `assert 405 == 503` (write).*

### E2E Tests (5 tests): `frontend/e2e/update-page.spec.ts`

**Seed:** `MAIN_AT_150` is `mainAt(150, …)` from `e2e/home.ts`: The Left Hand of Darkness, Main at p.150 of 330 (45%), with a Purpose. Its `lastProgressUpdate` is 2026-10-25T21:00 CET, three days before `FAKE_TODAY`.

**`[P1] AC-1` the page field** (`seededServer`)
1. **The `spinbutton` "Page" is visible in the Main book card** (the first assertion).
2. The `h1` "Home" has focus, not the field (UX-DR36).
3. The value is `150`, `type="number"` and `step="1"`.
4. The accessible description is exactly "of 330", and "of 330" is visible in the card. There is no `aria-invalid="true"`.
5. **Update** is visible, and its left edge is at or right of the field's right edge.

*Red today: no `spinbutton` "Page".*

**`[P0] AC-2` Enter saves** (`--fake-today 2026-10-28`)
1. Fill `212`, then press Enter in the field.
2. **`status` reads "Page 212 of 330, 64%."** (the first assertion).
3. The gauge's `aria-valuetext` is "64%, page 212 of 330", "p.212 of 330" is visible, and the field holds `212`.
4. Exactly one `update-page` was sent, with the intent `{bookId, page: 212}` (a JSON number).
5. `library.json`: `currentPage` 212, `lastProgressUpdate` = the server's now, `finishDate` `null`.

*Red today: the `fill` times out (no such field).*

**`[P1] AC-3` an invalid page** (`seededServer`)
1. **The field is visible** (the first assertion).
2. For `331`, then `212.5`, press **Update**. Each time:
   - `alert` reads "Page must be between 0 and 330.";
   - the field has `aria-invalid="true"` and keeps the typed value;
   - the message is visible in the card at or below the field's bottom, and it is part of the field's accessible description;
   - the gauge still reads "45%, page 150 of 330", and `library.json` is byte-identical.

*Red today: no field.*

**`[P0] AC-6` the catch-up** (`seededServer`; PRG-E2E-001)
1. The timer starts, then `goto(server.url)` opens the app.
2. Interaction 1: fill `212` (click the field and type). Interaction 2: **Update**.
3. **`status` reads "Page 212 of 330, 64%."** (the first assertion).
4. Less than 30 000 ms elapsed. The gauge reads "64%, page 212 of 330", one request was sent, and `library.json` holds 212.

*Red today: the `fill` times out.*

**`[P1] AC-7` couldn't save** (`update-page` routed to a 503 `couldnt_save`)
1. **The field is visible** (the first assertion).
2. Fill `212`, then press **Update**. `alert` reads "Couldn't save. Your data wasn't changed.".
3. The field holds `212`, the gauge still reads "45%, page 150 of 330", and `status` is empty.
4. The line is visible in the card at or below the field's bottom, and `library.json` is byte-identical.

*Red today: no field.*

---

## Data Factories Created

None new. Everything goes through `LibraryBuilder` (TC-1), with fixed literal ids where a test compares them.
- **In API tests,** seeds use `LibraryBuilder.book()`, `.reading()` and `.main()` directly.
- **In E2E,** seeds go through `seededServer`, or `serverAtFakeToday` when a test compares stored timestamps.

## Fixtures and Helpers Created or Changed

- **`backend/tests/helpers.py`:** `UPDATE_PAGE`.
- **`frontend/e2e/intents.ts`:** `UPDATE_PAGE`.
- No other fixture changes. The spec reuses `e2e/home.ts` (`mainAt`, `mainBookCard`, `serverAtFakeToday`, `SERVER_NOW`, `storedBook`, `libraryBytes`) and `requestsTo` and `intentOf`.

## Mock Requirements

One. AC-7 routes `**/api/intents/update-page` to a 503 `couldnt_save` body (TR9's "routed 503"), as `start-reading.spec.ts` AC-10 does for `edit-purpose`. Every other leaf runs against the real `bookvie`.

## Required data-testid Attributes

None. Every locator is a role plus an exact accessible name, or exact text.

---

## Contract the Scaffolds Pin (names the implementation must use)

**`update-page`** (`POST /api/intents/update-page`):
- `multipart/form-data` with a JSON part named `intent`: `{"bookId": "...", "page": <integer>}`, parsed like `start-reading`'s.
- **Success:** exactly `{ok: true}`, or `{ok: true, reachedLastPage: true}` when `page` equals the Book's page count.
- **The change:** the Main book's current Reading gets `currentPage` = `page` and `lastProgressUpdate` = now, in one commit. Nothing else changes:
  - not `startDate`, `pausedAt`, `purpose` or `finishDate`;
  - not `mainBookId`;
  - not any other Book.
- **A lower page than before** and 0 are allowed. The last page never sets `finishDate` or `finishedPages`: only `finish-reading` does (Story 3.6).
- **Refusals:**
  - 409 `book_not_found` for a deleted Book.
  - 409 `not_main_book` for a Book that isn't `mainBookId`.
  - 422 `invalid_fields` for a page outside 0 to the page count, or any `page` value that isn't a JSON integer (212.5, "212", `true`, `null`). It has one field, `page`, with the message "Page must be between 0 and *N*." (the green-phase follow-up pins this).
  - 422 `invalid_fields` on `intent` for a malformed part (a missing `bookId` or `page`, or an extra key).
- **The model:** `page` can't be a strict `int` in `IntentModel`, or 212.5 becomes the generic malformed-intent message on `intent`. Accept the raw JSON value, then validate it into the `page` field error. Refuse `bool` explicitly: in Python it is an `int`.

**The page field** (in the Main book card, `region` "Main book"):
- **A visible label "Page"** and an `<input type="number" step="1">` (role `spinbutton`, name "Page"), prefilled with the home view's `currentPage`.
- **"of *M*"** in its own element, referenced by the field's `aria-describedby`. While invalid, the message element is added to `aria-describedby`.
- **Update:** a `button-primary` named "Update", after the field and pushed right (DESIGN.md → Page field). Enter in the field does the same.
- **No `autoFocus`.** Home's route focus stays on the `h1` (or, after a confirmed start, on the title link).
- **Client-side check before sending:** an empty, fractional, negative or too-large value isn't sent. The field gets `aria-invalid="true"`, and the message "Page must be between 0 and *M*." goes under the field and into `alert`. A server 422 on `page` is shown the same way.
- **Success:**
  - invalidate the views;
  - once the refetched home view has rendered, `status` reads "Page *N* of *M*, *P*%.", with *P* from the server's `percent`;
  - the field shows the saved page, and any invalid state is cleared.
- **Couldn't save:** the field keeps the typed value, the gauge stays (no optimistic update), and "Couldn't save. Your data wasn't changed." goes one line below the field and into `alert`.
- **`reachedLastPage`** is ignored until Story 3.6.

## Existing tests that must change with the implementation

| File | What changes |
|---|---|
| `frontend/e2e/home.spec.ts` AC-4 (axe on Home with a Main book, both themes) | No code change expected. It now covers the page field, so a contrast or labelling miss in the field fails it. |
| `frontend/e2e/home.spec.ts` AC-5 and AC-6 | If any assertion pins the card's full text or its focusable elements, add the field and **Update**. |
| `backend/tests/test_contract.py` | Regenerate `schema.d.ts` with `npm run check:api` once `update-page` and `not_main_book` exist. |
| `backend/tests/test_reading_state_machine.py` (RDG-UNIT-002) | Add an `update_page` rule: a random page within range on the Main book, or on a non-Main book (expect `not_main_book`). This keeps the property test covering every Reading intent. |

## Assumptions for the spec to confirm

- **`not_main_book`'s message:** nothing pins its copy. A suggestion is "This book isn't your Main book anymore." The scaffold checks only that there is one.
- **The order of refusals:** `book_not_found`, then `not_main_book`, then the page range. The range needs the Main book's page count, and a stale tab's page may belong to the old Book. The scaffolds don't pin the order beyond the two 409 leaves.
- **The 422's top-level message** is the usual `fields_summary` ("Not saved. 1 field needs attention: Page."). The UI shows the `page` field's message, never the summary. This needs `"page": "Page"` in the labels map that `fields_summary` uses.
- **The `status` line waits for the refetch** (epic context, "No optimistic updates"). AC-2 asserts the gauge after `status`, so an announcement that ran ahead of the refetch would still be caught by a stale gauge.
- **A stale tab's refusal (AC-5, UI half):** the views refetch. The card then shows the current Main book (or "No Main book."), and the field resets to its page. The suggestion is to show the refusal's message under the field and in `alert`, like any failure, and keep focus on the field.
- **`min="0"` and `max`:** not pinned. If they are set, the form must use `noValidate`, so the browser's own bubble never replaces the inline message.

## Open items that bear on this story

- **AC-2's "re-entry line updates together"** can't be checked until Story 3.4 adds the line. Its follow-up below is to assert "Last updated today" right after a save, once 3.4 lands.
- **R-01 (reading-state transitions):** PRG-API-002 is AC-4. `update-page` must never finish a Reading.
- **RDG-UNIT-002:** see the state-machine row above.
- **No deferred-work item names Story 3.3.**

---

## Implementation Checklist

Activate one test at a time: delete its `@pytest.mark.skip(reason=RED)` line, or change `test.skip(` to `test(`. Watch it fail, implement, then watch it pass.
- **Backend:** `cd backend && TZ=Europe/Madrid uv run pytest tests/test_update_page.py`
- **E2E:** `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/update-page.spec.ts -g "AC-1"`

### AC-4, AC-5, AC-8: the intent
- [ ] `intents/contract.py`: `ErrorCode.NOT_MAIN_BOOK` and a `not_main_book()` 409 refusal.
- [ ] `intents/update_page.py`: `UpdatePageIntent` (`book_id`, `page`), its parser, and `update_page(store, clock, intent) -> bool` (reached the last page). In one `commit`:
  - refuse a deleted Book (`book_not_found`) and a Book that isn't Main (`not_main_book`);
  - validate the page against the Book's count, refusing with 422 on `page`;
  - set `currentPage` and `lastProgressUpdate`.
- [ ] `http/api.py`: the route, answering `OkResponse(ok=True, reached_last_page=True or None)`. Then run `npm run check:api`.
- [ ] Activate AC-4, AC-5 and AC-8.

### AC-1, AC-2, AC-6: the page field
- [ ] `useUpdatePage` in `api/`, through `sendIntent`.
- [ ] A `PageField` component in `MainBookCard`, after the gauge: the label, the input, "of *M*", **Update**, and Enter submitting the form.
- [ ] On success: invalidate the views. Once the refetched view has rendered, announce "Page *N* of *M*, *P*%.".
- [ ] Activate AC-1, AC-2 and AC-6.

### AC-3, AC-7: invalid and couldn't save
- [ ] Client validation: a whole number from 0 to *M*. The message goes inline and to `alert`, with `aria-invalid` and `aria-describedby`. A server 422 on `page` maps the same way.
- [ ] Couldn't save: keep the value, move nothing, and put the line below the field and in `alert`.
- [ ] Activate AC-3 and AC-7.

### Green-phase follow-ups (secondary branches, not separate red leaves)
- [ ] **AC-3, the server half (API):** each of 331, -1, 212.5, `"212"`, `true` and `null` as `page` gives 422 `invalid_fields` with `field_messages == {"page": "Page must be between 0 and 330."}`, and storage is byte-identical. A missing `page` key is the malformed-intent 422 on `intent`.
- [ ] **AC-4, the client half (E2E):** **Update** with 330 shows "Page 330 of 330, 100%." in `status`. The gauge reads 100%, no dialog opens, and the Reading is unfinished in `library.json`.
- [ ] **AC-5, the client half (E2E):** two tabs. Tab B starts Dune while tab A still shows The Left Hand of Darkness. Tab A's **Update** gets `not_main_book`, then tab A's card shows Dune as the Main book, and `library.json` is unchanged by tab A.
- [ ] **AC-2 with Update** (AC-6 covers the click) and **with a lower page** (200 from 212): `status` reads "Page 200 of 330, 60%.".
- [ ] **AC-2, the re-entry line,** once Story 3.4 lands: "Last updated today" right after the save, from "3 days ago".
- [ ] **AC-2, the same page twice:** both are sent and both announce, because the regions are emptied first.
- [ ] **AC-3, recovery:** after an invalid value, a valid save clears `aria-invalid`, the message and its `aria-describedby` link. An empty field is refused the same way.
- [ ] **AC-7, in flight:** **Update** is `aria-disabled` while the request is out, and a second press sends nothing (as `start-reading.spec.ts`'s AC-11 does).
- [ ] **PRG-API-001** (bounds, lower page allowed, `lastProgressUpdate` set): tick it in the trace once AC-8 and the AC-3 server follow-up are green.
- [ ] **PRG-E2E-001:** tick it once AC-6 is green. Its "~N days left after refetch" half waits for Story 3.4.
- [ ] **axe on Home with an invalid page field,** in both themes.
