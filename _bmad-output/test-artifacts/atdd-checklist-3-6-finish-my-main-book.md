---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-06'
storyId: '3.6'
storyKey: '3-6-finish-my-main-book'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-36-finish-my-main-book'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-6-finish-my-main-book.md'
generatedTestFiles:
  - 'backend/tests/test_finish_reading.py'
  - 'frontend/e2e/finish-reading.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3; Story 3.6; Conventions for every story)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Finish, Refusal codes, No optimistic updates, Finish dialog)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Finish dialog, Page field, Book detail actions, Couldn''t save)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Finish dialog, Book detail → Readings)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/mockups/key-book-detail.html (Readings row: finish text, stars aria-label "5 stars")'
  - '_bmad-output/test-artifacts/test-design-qa.md (FIN-API-001, FIN-API-003, FIN-API-004, R-01, R-07)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-6 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-5-see-my-reading-on-home-s-shelf.md and 3-2 (format, the TR8 / TR9 split)'
  - 'backend/bookvie/intents/update_page.py, start_reading.py, edit_book.py, contract.py; backend/bookvie/domain/model.py, book_fields.py; backend/bookvie/views/shelf.py, models.py'
  - 'backend/tests/builder.py, helpers.py, test_update_page.py'
  - 'frontend/src/components/PageField.tsx, MainBookCard.tsx; frontend/src/pages/BookDetailPage.tsx; frontend/src/lib/bookDetail.ts'
  - 'frontend/e2e/fixtures.ts, home.ts, intents.ts, update-page.spec.ts, start-reading.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given update-page returned reachedLastPage, or I press Mark finished on the Main book''s Book detail, when the Finish dialog opens, then it is a modal headed "Finished X" with Finished on prefilled with today, "Purpose fulfilled?" (yes · partly · not yet, none preselected, the Purpose quoted above) only when the Reading has a Purpose, and a Rating radio group ("No rating" by default, then "1 star"…"5 stars", stars changing shape when selected), plus Done and Cancel (UX-DR41), and focus starts in Finished on' }
  - { id: AC-2, idSource: generated, text: 'Given the Finish dialog, when I press Done, then finish-reading stores finishDate (local date), finishedPages = the Book''s Pages value at the time of finishing, purposeFulfilled and rating (null when skipped), and clears mainBookId, in one commit (FR-14, FIN-API-001), and the Book counts as read, so the meter increases' }
  - { id: AC-3, idSource: generated, text: 'Given a Finished on date in the future, or before the Reading''s start date, when I press Done, then nothing is saved, and the field shows "Finished on can''t be in the future." or "Finished on can''t be before 12 March 2026, when this reading started." (FIN-API-003)' }
  - { id: AC-4, idSource: generated, text: 'Given the Finish dialog opened from the page field, when I press Cancel or Esc, then nothing changes, the Reading stays active at the last page, focus returns to the page field, and pressing Update again with the same page reopens the dialog, and Home''s gauge shows 100% with "~N days left" hidden (Story 3.4)' }
  - { id: AC-5, idSource: generated, text: 'Given I press Done, when the request is in flight, then Done has aria-disabled="true" and further presses send nothing until the response arrives' }
  - { id: AC-6, idSource: generated, text: 'Given a finished Main book, when Done succeeds, then the app goes to Home, the Main book card switches to "No Main book.", and focus is on the "No Main book." heading (Story 4.1 amends this when an Up next exists), and Book detail''s Readings block lists the Reading with its start, finish, stars and Purpose fulfilled' }
  - { id: AC-7, idSource: generated, text: 'Given update-page and finish-reading, when they are tested together, then only finish-reading ever sets finishDate (AD-19)' }
  - { id: AC-8, idSource: generated, text: 'Given a Reading that is already finished (for example, finished in another tab), when finish-reading is sent for it again, then it is refused with 409 reading_already_finished and nothing changes (AD-9)' }
  - { id: AC-9, idSource: generated, text: 'The standard intent ACs (TR8) hold for finish-reading, and a couldn''t-save keeps the dialog open with every answer kept' }
---

# ATDD Checklist - Epic 3, Story 3.6: Finish my Main book

**Date:** 2026-11-06
**Author:** Oleg
**Primary test levels:** API (pytest, the intent through `TestClient`) and E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want to record finishing a Book, with the date, whether its Purpose was fulfilled and a rating, so that every finished Book counts and I see whether reading it did what I wanted.

What exists today:
- `update-page` already answers `reachedLastPage: true` at the last page. `PageField.tsx` ignores it "until Story 3.6".
- `reading_already_finished` is already in the error enum (`edit-purpose` uses it), with the message "This reading is already finished."
- Edit book already owns the Finished on copy: `FINISHED_ON_FUTURE_MESSAGE` and `finished_before_start_message()` ("12 March 2026" through `long_date`).
- Book detail's Readings block lists "Started … · Finished …" only. `BookReading` in the view has no rating or Purpose fulfilled.

**What 3.6 adds:**
- **`finish-reading`**: the intent, its route and its contract.
- **The Finish dialog**, from the page field's `reachedLastPage` and from **Mark finished** on the Main book's Book detail.
- **The way home** after Done: Home, "No Main book." focused.
- **The Readings row's stars and Purpose fulfilled** (the view, then the row).

**Not in 3.6:**
- The finish fill, the ring, "Finished *X*." in the header and the status line: Story 3.7.
- Finishing a non-Main Reading, and a back-fill from a Book with no Reading: Story 4.5. Removing the Book from Up next or Waiting for you is part of that too.
- "No Main book." with Up next suggested: Story 4.1. No test reads `upNextBookId`.

**Story source:** `epics.md` → Story 3.6. There is no spec file yet: `sprint-status.yaml` has `3-6-finish-my-main-book: backlog`.
- When `spec-3-6-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the names under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffolds use the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.5.

**Generation mode:** AI generation from the criteria, the UX docs, the `key-book-detail.html` mockup and the code. There was no browser recording, because the dialog doesn't exist yet. Locators are roles and names: the `dialog` "Finished *X*", the `radiogroup`s "Purpose fulfilled?" and "Rating", the `region` "Readings", and the `heading` "No Main book.".

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.5.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-9, one per Given/When/Then block in source order. The closing "And the standard intent ACs" line is AC-9. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | The dialog from the last page or Mark finished: modal, Finished on today and focused, the Purpose question, Rating, Done, Cancel | E2E | P1 | `[P1] AC-1` |
| AC-2 | Done stores `finishDate`, `finishedPages` = Pages, the answers (null when skipped), clears Main, meter +1 | API | P0 | `test_ac2_p0_…` |
| AC-3 | Finished on in the future or before the start: refused on `finishedOn`, nothing saved | API | P1 | `test_ac3_p1_…` |
| AC-4 | Esc or Cancel after the last page: nothing changes, focus back to the page field, Update reopens, 100% with no days left | E2E | P1 | `[P1] AC-4` |
| AC-5 | Done in flight: `aria-disabled`, further presses send nothing | E2E | P2 | `[P2] AC-5` |
| AC-6 | Done succeeds: Home, "No Main book." focused; the Readings row has start, finish, stars, Purpose fulfilled | E2E | P1 | `[P1] AC-6` |
| AC-7 | Only `finish-reading` ever sets `finishDate` (AD-19) | API | P0 | `test_ac7_p0_…` |
| AC-8 | Already finished in another tab: 409 `reading_already_finished`, nothing changes | API | P1 | `test_ac8_p1_…` |
| AC-9 | TR8 for `finish-reading` (faults, invariants, `book_not_found`, contract) | API | P0 | `test_ac9_p0_…` |

**Priorities** (from `test-design-qa.md`):
- **P0:**
  - AC-2 is FIN-API-001 (R-01, score 6, the epic's top risk).
  - AC-7 is AD-19: a finish must never come from anywhere else. It is checked on a re-read, so the history is in play too.
  - AC-9 is R-01 and R-02: one commit or none, and the invariants after every success.
- **P1:**
  - AC-3 is FIN-API-003 (R-07, dates).
  - AC-8 is AD-9's stale-tab refusal.
  - AC-1, AC-4 and AC-6 are the dialog, its way out and its way home. These are the user-visible half of FR-14.
- **P2:** AC-5. The busy pattern already exists in the Start dialog and Confirm dialog.

**Level split (no duplicate coverage):**
- **API:** what is stored, the refusals and their exact copy, AD-19, and TR8. The server owns every message (AD-9).
- **E2E:**
  - the dialog's roles, names, focus and prefill;
  - Cancel and Esc after the last page;
  - the busy state;
  - navigation and focus after Done;
  - the Readings row on Book detail.

**AC-3's display half** ("the field shows…") is the API's `fields` message shown under Finished on. The leaf asserts the exact message at API level. Showing it in the dialog is a green-phase follow-up below.

**AC-9's dialog half** ("a couldn't-save keeps the dialog open with every answer kept") is TR9 on the Finish dialog. As in Story 3.2, AC-9 has one red leaf, at API level, for TR8. The dialog's couldn't-save is the first green-phase follow-up.

---

## Story Integration Metadata

- **Story ID:** `3.6`
- **Story Key:** `3-6-finish-my-main-book`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.6)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-6-finish-my-main-book.md`
- **Generated Test Files:** `backend/tests/test_finish_reading.py`, `frontend/e2e/finish-reading.spec.ts`
- **Shared constants added:** `FINISH_READING` in `backend/tests/helpers.py` and `frontend/e2e/intents.ts`

---

## Contract the Scaffolds Pin

- **`POST /api/intents/finish-reading`:** `multipart/form-data` with a JSON part named `intent`.
  - The part holds `{"bookId": …, "finishedOn": "YYYY-MM-DD", "purposeFulfilled": "yes" | "partly" | "notYet" | null, "rating": 1..5 | null}`.
  - All four keys are sent; the two answers are nullable. The key `finishedOn` matches Edit book's.
  - Success is exactly `{ok: true}`.
- **One commit.** The Book's current (unfinished) Reading gets:
  - `finishDate` = `finishedOn`;
  - `finishedPages` = the Book's `pages`, even when Mark finished is pressed at p.212;
  - `purposeFulfilled` and `rating` as sent.

  Every other Reading field (`currentPage`, `lastProgressUpdate`, `purpose`, `startDate`) is **kept**. When the Book is the Main book, `mainBookId` becomes `null`.
- **Refusals, checked inside the commit in this order:**
  1. 409 `book_not_found`;
  2. 409 `reading_already_finished` when the Book has no unfinished Reading. The Book isn't Main any more in that case, so this check must come before any "is it Main" check.
  3. 422 `invalid_fields` with one `finishedOn` field, and the message "Not saved. 1 field needs attention: Finished on.":
     - "Finished on can't be in the future.";
     - "Finished on can't be before 12 March 2026, when this reading started." (reuse `book_fields`).
- **The Finish dialog** is a modal `dialog` named "Finished *X*", with *X* in serif. Inside it:
  - **Finished on:** an `input type="date"` labelled "Finished on", prefilled with the local today and focused on open.
  - **The Purpose** (text) above a `radiogroup` "Purpose fulfilled?" with three radios (yes, partly, not yet, matched case-insensitively), none checked.
  - **Rating:** a `radiogroup` with radios "No rating" (checked), "1 star", "2 stars" … "5 stars".
  - Buttons **Done** and **Cancel**.
- **Mark finished** is a `button` in Book detail's `main` for the Main book.
- **After Done:** the app is at `/`, the Main book card's `h2` "No Main book." has focus, and the dialog is gone.
- **The Readings row** is a `listitem` in the `region` "Readings". It holds:
  - "Started 1 Oct 2026 · Finished 28 Oct 2026";
  - a `role="img"` named "4 stars" (as in `key-book-detail.html`'s `aria-label="5 stars"`);
  - the text "Purpose fulfilled: partly".

  **"Purpose fulfilled: partly" is this checklist's proposal.** The UX docs list the column but give no copy. The spec may change it, along with the scaffold.

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 9 in all.
- **Backend leaves** have `@pytest.mark.skip(reason=RED)`, and each name carries `ac<n>_p<n>`.
- **E2E leaves** use `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted.
- **Backend:** all 5 fail at their criterion assertion. The route doesn't exist, so the POST answers 405.
- **E2E:** all 4 fail. Every seed started cleanly, and AC-4's setup ("Last updated 3 days ago · ~2 days left") passed before the failure.

**Skipped as committed:**
- `pytest tests/test_finish_reading.py` gives 5 skipped.
- `playwright test e2e/finish-reading.spec.ts` gives 4 skipped.
- The whole backend suite passes (986 passed, 5 skipped).
- `ruff check` and `ruff format` are clean on the new file. `tsc -b` (which includes `e2e/`) and `oxlint` are clean.

**Deviations kept to match Stories 1.6 to 3.5:**
- The E2E leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.
- AC-4, AC-5 and AC-6 must open the dialog before their criterion assertion, so their red failure is "dialog not found" (or "Mark finished" not found). AC-4 waits for the dialog before pressing Esc, so that Esc can't race the dialog's opening once it is green.

### API Tests (5 tests): `backend/tests/test_finish_reading.py`

The seed (`_left_hand_main_and_dune`): The Left Hand of Darkness (330 pages) as the Main book, started 2026-10-01 with a Purpose. Dune is never read. `TODAY` is 2026-10-30.

**`[P0] AC-2`: `test_ac2_p0_finish_reading_stores_the_finish_and_the_answers_and_clears_the_main_book`**

The first case is at p.212, with partly and 4:
1. **The stored `finishDate` is `2026-10-30`** (the first assertion).
2. The answer is exactly `{ok: true}`. The Reading equals its old self plus `finishedPages: 330`, `purposeFulfilled: "partly"` and `rating: 4`.
3. `mainBookId` is null, Dune is unchanged, and the invariants hold.
4. `GET /api/views/home` shows the meter `{finished: 1, total: 2}` and `mainBook: null`.

The second case is at p.330 with no Purpose, both answers skipped, and `2026-10-29`: it stores that date and two nulls.

*Red today: `AssertionError: assert None == '2026-10-30'`.*

**`[P1] AC-3`: `test_ac3_p1_finished_on_in_the_future_or_before_the_start_is_refused_and_nothing_is_saved`**

The Reading starts on 2026-03-12, so the message's date matches the criterion's.
1. **`2026-10-31` gives `fields == [{finishedOn: "Finished on can't be in the future."}]`** (the first assertion).
2. Then the status is 422 `invalid_fields` with the summary, and the bytes are unchanged.
3. `2026-03-11` gives "…before 12 March 2026, when this reading started.", and the bytes are unchanged.

*Red today: `assert None == [...]` (405 Method Not Allowed).*

**`[P0] AC-7`: `test_ac7_p0_only_finish_reading_ever_sets_finish_date`**

Seed: a re-read, finished 2026-04-20 with 5 stars, and now the Main book at p.300.
1. `update-page` to 330, then `finish-reading`. Both are opaque setup.
2. **The current Reading's `finishDate` is `2026-10-30`** (the first assertion).
3. After `update-page` alone, both `finishDate`s were as before (`2026-04-20` and `null`) at p.330.
4. The first Reading is byte-for-byte untouched.
5. A stale `update-page` afterwards gives 409 `not_main_book` and the finish is unchanged. The invariants hold.

*Red today: `assert None == '2026-10-30'`.*

**`[P1] AC-8`: `test_ac8_p1_finish_reading_for_a_reading_already_finished_is_refused`**

Seed: The Left Hand of Darkness finished 2026-10-29 in another tab (no Main book).
1. **The status is 409** (the first assertion).
2. The whole body is `reading_already_finished`, "This reading is already finished.".
3. The bytes are unchanged.

*Red today: `assert 405 == 409`.*

**`[P0] AC-9`: `test_ac9_p0_finish_reading_keeps_the_standard_intent_guarantees`**

1. **A write fault gives 503** (the first assertion), then the whole `couldnt_save` body and byte-identical storage. The same follows for `fsync` and `replace`. Neither the finish nor the cleared Main book lands.
2. A success keeps the invariants.
3. `GONE_ID` with a future date gives `book_not_found` (it comes before the 422), and the bytes are unchanged.
4. The path is in the OpenAPI document, and `reading_already_finished` is in `ErrorCode`.

*Red today: `AssertionError: write; assert 405 == 503`.*

### E2E Tests (4 tests): `frontend/e2e/finish-reading.spec.ts`

Every leaf starts `bookvie --fake-today 2026-10-28` with the browser clock on the same day. Seed `MAIN_AT_300`: The Left Hand of Darkness at p.300 of 330, started 1 Oct, with a Purpose, plus Dune.

**`[P1] AC-1`: the dialog**

1. Type 330 and press Update.
2. **The `dialog` "Finished The Left Hand of Darkness" is visible** (the first operation that can fail).
3. It is modal, with a serif title. Finished on is a date field, focused, with the value `2026-10-28`.
4. The Purpose is shown. "Purpose fulfilled?" has 3 radios, none checked.
5. "Rating" has 6 radios in order, with "No rating" checked. Done and Cancel are there.
6. Cancel, then Book detail's **Mark finished** opens the same dialog, focused and prefilled.

*Red today: `toBeVisible`, "element(s) not found" for the dialog.*

**`[P1] AC-4`: Esc and Cancel after the last page**

Seed `PACED_MAIN_AT_300` (plus Emma, 20 pages a day).

1. Setup, which passes today: "Last updated 3 days ago · ~2 days left · No export yet".
2. Type 330, press Update, wait for the dialog, press Esc.
3. **The page field has focus.**
4. The dialog is hidden and no `finish-reading` was sent. The stored Reading is at p.330 with no `finishDate`, and the Book is still Main.
5. The gauge reads "100%, page 330 of 330" and the re-entry line is "Last updated today · No export yet".
6. Update again reopens the dialog. Cancel closes it, the field has focus again, and nothing is sent.

*Red today: `toBeVisible`, "element(s) not found" for the dialog, after the page saved.*

**`[P2] AC-5`: Done in flight**

`finish-reading` is held by `page.route` until released.

1. Mark finished, then Done.
2. **Done has `aria-disabled="true"`.**
3. A click and an Enter on Done leave exactly 1 request.
4. Release: Home shows "No Main book.", still 1 request, and the Reading is finished on `2026-10-28`.

*Red today: `locator.click` times out on "Mark finished".*

**`[P1] AC-6`: Done goes home, and the Readings row**

1. Type 330, press Update, check partly and "4 stars", press Done.
2. **The "No Main book." heading has focus.**
3. The URL is `/` and the dialog is hidden.
4. One intent was sent: `{bookId, finishedOn: "2026-10-28", purposeFulfilled: "partly", rating: 4}`. The stored Reading matches it.
5. On Book detail, the Readings region has 1 row with "Started 1 Oct 2026 · Finished 28 Oct 2026", an image "4 stars", and "Purpose fulfilled: partly".

*Red today: `locator.check` times out on the "partly" radio in the dialog.*

---

## Green-Phase Follow-ups (automation, not red leaves)

- **AC-9, the dialog's couldn't-save (TR9):** route `finish-reading` to a 503.
  - The dialog stays open with Finished on, the Purpose answer and the rating all kept.
  - The `alert` line "Couldn't save. Your data wasn't changed." is inside the dialog, above its buttons.
  - Nothing moves on Home.
- **AC-3, the display:** a future date typed into Finished on, then Done:
  - the message is under the field, linked by `aria-describedby`, with `aria-invalid`;
  - the dialog stays open and nothing is sent twice.

  The same for a date before the start.
- **AC-3, the boundaries:** today itself and the start date itself are accepted. The start date is a same-day finish, which counts 1 day in Measured pace.
- **FIN-API-004:**
  - `purposeFulfilled` sent for a Reading with no Purpose: decide whether that is refused or ignored, and pin it;
  - `rating` 0, 6, `"4"` or `4.5`: 422 on `rating`;
  - a malformed `intent` part (a missing key, an extra key, `bookId: null`): 422 on `intent`;
  - `finishedOn` that isn't a date (`"28/10/2026"`, `""`, `null`): 422 on `finishedOn`.
- **AC-1, the other branches:**
  - a Reading with no Purpose shows no "Purpose fulfilled?" group, and no quoted Purpose;
  - selected stars change shape, not only color: compare the selected and unselected star glyph or path, not only `fill`;
  - arrow keys move within each radio group;
  - axe on the open dialog in both themes (WCAG 2.2 AA).
- **AC-2, the view:** `GET /api/views/book` carries each Reading's `rating` and `purposeFulfilled` (and `finishedPages` if the spec wants it). Regenerate the contract (`npm run api:gen`), then run `check:api`.
- **AC-4:** Esc from Mark finished on Book detail returns focus to **Mark finished** (EXPERIENCE.md → Focus after close).
- **AC-6:** the meter on Home's slice reads "1 of 2 finished" after the refetch. The Readings row for a re-read lists two rows, newest first.
- **Cross-tab:** the Finish dialog open in tab A while tab B finishes the Book. Done in A shows the 409 copy and the views refetch (the browser half of AC-8).
- **R-01 matrix (RDG-UNIT-002):** add `finish-reading` to the property-based intent sequences once it exists.

---

## Implementation Guidance

**Server:**
- `intents/finish_reading.py`, modelled on `update_page.py`:
  - `FinishReadingIntent(book_id, finished_on, purpose_fulfilled, rating)`, with the two answers in `nullable`;
  - `parse_form_intent`;
  - one `commit` that applies the checks in the pinned order.
- Reuse `book_fields`' Finished on parsing and messages (`FINISHED_ON_FUTURE_MESSAGE`, `finished_before_start_message`) with the `finishedOn` label "Finished on".
- Register `POST /intents/finish-reading` in `http/api.py` next to `update-page`, then regenerate the OpenAPI contract.
- `views/models.BookReading`: add `rating` and `purpose_fulfilled`, and map them in `book_detail()`.
- Update `update_page.py`'s docstring, which already promises "only `finish-reading` sets `finishDate`".

**Client:**
- **`FinishDialog`**, beside `StartDialog`:
  - a modal `dialog` at 440px with a serif title;
  - a `type="date"` Finished on, autofocused;
  - a segmented radio group for Purpose fulfilled, only when the Reading has a Purpose, with the Purpose quoted above it;
  - star radios with "No rating" first, filled `accent` versus outline `input-border`;
  - Done and Cancel.
- **Done:**
  - `aria-disabled` while in flight; presses are ignored;
  - on success: invalidate the views, navigate to `/`, then focus the "No Main book." `h2` (it needs `tabIndex={-1}`);
  - on refusal: a field message, or the alert line for `couldnt_save` and the 409s.
- **`PageField`:** on `reachedLastPage`, open the dialog. Cancel or Esc closes it and focuses the field. The next Update with the same page reopens it.
- **Book detail:** add **Mark finished** (`button-secondary`) for the Main book, in the action-stack order (EXPERIENCE.md → Book detail actions).
- **Readings row:** start/finish text, a `role="img"` star display with `aria-label` "N stars" (none when unrated), and "Purpose fulfilled: …" (none when null).

---

## Next Steps

1. Write `spec-3-6-…md` and link this checklist under its Dev Notes (`### ATDD Artifacts`).
2. Implement task by task, un-skipping the matching leaf. Each should fail first as listed, then pass:
   - server: AC-9, AC-2, AC-3, AC-8, AC-7;
   - client: AC-1, AC-4, AC-5, AC-6.
3. Run `bmad-testarch-automate` for the follow-ups above once 3.6 is green.
