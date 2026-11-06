---
title: 'Story 3.6: Finish my Main book'
type: 'feature'
created: '2026-11-06'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0132f9610f623b273e69e4a87588e0486f53517a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-6-finish-my-main-book.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Reading can reach its last page but never be finished: there is no `finish-reading` intent, `update-page`'s `reachedLastPage` is ignored, and Book detail's Readings rows show no rating or Purpose answer.

**Approach:** Add `finish-reading` (one commit: finish the current Reading, clear Main), a modal Finish dialog opened from the page field on `reachedLastPage` and from **Mark finished** on the Main book's Book detail, the way home after Done, and stars plus Purpose fulfilled in the Readings rows. Names follow the ATDD checklist's "Contract the Scaffolds Pin"; the 9 red leaves are activated, not rewritten.

## Boundaries & Constraints

**Always:**
- Intent part `{bookId, finishedOn, purposeFulfilled: "yes"|"partly"|"notYet"|null, rating: 1..5|null}`, all keys required, success exactly `{ok: true}`. The current Reading gets `finishDate`, `finishedPages` = the Book's `pages` now, the two answers; every other field kept. If the Book is Main, `mainBookId` → null. One commit.
- Refusal order inside the commit: 409 `book_not_found`; 409 `reading_already_finished` (no unfinished Reading); 422 `invalid_fields` on `finishedOn` (format, future, before start) with `book_fields`' messages and label "Finished on"; then 422 on `purposeFulfilled` when sent for a Reading with no Purpose ("Purpose fulfilled needs a Purpose on this reading."). Wrong-typed `rating`/`purposeFulfilled` → 422 on that field (or `intent` when malformed). Today is the server Clock's local date.
- Finish dialog: native modal `dialog` (`useAlertDialog`, `role: 'dialog'`) named "Finished *X*", *X* serif, 440px. **Finished on** `TextField type="date"` prefilled with local today, focused on open. Purpose quoted (`ink-secondary`) above a native radio `radiogroup` "Purpose fulfilled?" (yes · partly · not yet, none checked, segmented look) only when the Reading has a Purpose. `radiogroup` "Rating": "No rating" (checked), "1 star"…"5 stars"; selected and lower stars filled `accent`, others outline `input-border` (shape change). **Done** (`button-primary`) and **Cancel**.
- Done: `aria-disabled` via `Button disabledReason` while in flight; presses and Esc ignored. Field refusal → message under its field (`aria-invalid`/`aria-describedby`), dialog stays. `couldnt_save` and 409s → the alert line inside the dialog above the buttons, every answer kept. Success → navigate `/` with router state; Home focuses the "No Main book." `h2` (`tabIndex={-1}`), as `StartedState` does for the title link.
- PageField: on `ok` with `reachedLastPage`, open the dialog. Cancel/Esc closes it, sends nothing, focuses the page field; the next Update with the same page reopens it.
- Book detail: **Mark finished** (`button-secondary`) only for the Main book, after the primary and before Edit; Cancel/Esc returns focus to it.
- Readings row (newest first): "Started … · Finished …" text; when rated, a `role="img"` star display named "N star(s)"; when answered, "Purpose fulfilled: yes|partly|not yet". `BookReading` view gains `rating` and `purposeFulfilled`.
- WCAG 2.2 AA in both themes; forced colors keep stars distinct.

**Never:**
- No finish fill, ring, "Finished *X*." line or finish `status` announcement (Story 3.7). No Mark finished for non-Main Books, no back-fill (Story 4.5). No `upNextBookId` handling or assertion (Story 4.1).
- No stored-shape change, no new error code, no optimistic update. `update-page` never sets `finishDate`.

**Decisions:** Row copy "Purpose fulfilled: partly" (ATDD proposal); `notYet` reads "not yet". `purposeFulfilled` without a Purpose is refused, not silently dropped.

## I/O & Edge-Case Matrix

| Scenario | State / Input | Expected |
|---|---|---|
| Mark finished mid-book | Main at p.212 | finished; `finishedPages` 330; Main null |
| Skipped answers | no Purpose, both null | stored nulls |
| Boundaries | `finishedOn` = today / = start date | accepted |
| Future / before start | 2026-10-31 / 2026-03-11 | 422 `finishedOn`, bytes unchanged |
| Re-read | earlier finished Reading | only current Reading finished; history untouched |
| Stale tab | already finished | 409 `reading_already_finished` |
| Gone Book + bad date | `GONE_ID`, future | 409 `book_not_found` first |
| Fault | write/fsync/replace | 503 `couldnt_save`, nothing lands |

</frozen-after-approval>

## Code Map

Backend (`backend/bookvie`):
- new `intents/finish_reading.py` -- model on `edit_purpose.py` (refusal order) and `update_page.py:36-57` (`IntentModel`, `nullable`, `JsonValue` for answers, `parse_form_intent`, `commit` + `model_copy` + `library.replace_book`). Use `current_reading` (`domain/progress.py:21`), `book_fields._date`/`parse_finished_on` (L178/L187), `FINISHED_ON_FUTURE_MESSAGE`, `finished_before_start_message`, `LABELS`; `invalid_fields` / `reading_already_finished` from `intents/contract.py`. Types `PurposeFulfilled`, `Rating` from `domain/model.py:22-23`.
- `http/api.py:480-497` -- add `/intents/finish-reading` beside update-page.
- `intents/update_page.py` -- docstring: only `finish-reading` sets `finishDate`.
- `views/models.py:97` `BookReading` + `views/shelf.py:223` -- add `rating`, `purpose_fulfilled`.
- `backend/tests/test_reading_state_machine.py` -- add a `finish` rule (RDG-UNIT-002).

Frontend (`frontend/src`):
- `api/books.ts` -- `finishReading` + `useFinishReading()` like `useUpdatePage` (L163-178); export from `api/index.ts`. `npm run api:gen` after the backend.
- new `components/FinishDialog.tsx` + `.module.css` -- pattern of `StartDialog.tsx` (inFlight/busy L39-45, regionSlot alert L117, navigate state L70). Props: `bookId`, `onCancel`. Reads the Book view for title, start, Purpose.
- `components/PageField.tsx:115` -- open the dialog on `reachedLastPage`.
- `components/MainBookCard.tsx:39-40` -- `tabIndex={-1}`, ref for the empty heading.
- `pages/HomePage.tsx:19-78` -- a `FinishedState` handled like `StartedState`, focusing the empty heading.
- `pages/BookDetailPage.tsx:140-150, 183-195` -- Mark finished + refocus; rows render stars and answer.
- `lib/bookDetail.ts:107-124` -- `readingLines` returns `rating`, `purposeFulfilled` text; unit tests.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/finish_reading.py`, `http/api.py`, `intents/update_page.py` -- the intent and route; un-skip AC-9, AC-2, AC-3, AC-8, AC-7 in `tests/test_finish_reading.py`; add Matrix boundaries, malformed answers, and `purposeFulfilled` without a Purpose.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- `BookReading` answers + test; run `npm --prefix frontend run api:gen`.
- [x] `backend/tests/test_reading_state_machine.py` -- `finish` rule.
- [x] `frontend/src/api/books.ts`, `api/index.ts`, `lib/bookDetail.ts` (+ tests) -- client call and row text.
- [x] `frontend/src/components/FinishDialog.tsx`, `.module.css` -- the dialog.
- [x] `frontend/src/components/PageField.tsx`, `MainBookCard.tsx`, `pages/HomePage.tsx`, `pages/BookDetailPage.tsx` (+ css) -- wiring, focus, rows.
- [x] `frontend/e2e/finish-reading.spec.ts` -- un-skip AC-1, AC-4, AC-5, AC-6; add the dialog's couldn't-save (answers kept), a future date shown under the field, no Purpose → no group, Esc from Mark finished refocuses it, axe on the open dialog.
- [x] `README.md` -- Epic 3 status line.

**Acceptance Criteria:**
- Given the ATDD leaves, when activated, then `pytest tests/test_finish_reading.py` and `e2e/finish-reading.spec.ts` pass.
- Given the whole suite, when `npm run check` runs, then it passes, including coverage gates, `check:api` and axe.

## Implementation Notes

- Field refusals are collected in form order (Finished on, Purpose fulfilled, Rating) into one 422. New copy: "Purpose fulfilled must be yes, partly or not yet.", "Rating must be 1 to 5 stars, or no rating."; labels "Purpose fulfilled", "Rating". `update_page.py`'s docstring already stated AD-19; unchanged.
- The API also finishes a paused non-Main Book (Main untouched); only the UI limits Mark finished to Main. Pinned by a test, ahead of Story 4.5.
- `FinishDialog` keeps the Book view it opened with, so a 409 shows inside the dialog instead of closing it. In `PageField` it renders outside the page `<form>` (no nested forms).
- After Done from Home, the refetched view unmounts the card (and the dialog) before `navigate('/')`; React Router's navigate still works after unmount. Covered by AC-5/AC-6.
- Existing tests changed: AC-5's second click is `click({ force: true })` (Playwright refuses `aria-disabled` targets; pattern from `duplicate-dialog.spec.ts`). Story 3.3's last-page leaf in `update-page.spec.ts` now expects the Finish dialog and no longer asserts the "Page 330 of 330, 100%." status: opening the dialog empties the live regions (`useAlertDialog`).
- `lib/today.ts` gains `localIsoDate`; `lib/bookDetail.ts` gains `starsLabel`, `purposeFulfilledLine`.
- Verified by the orchestrator: `pytest tests/test_finish_reading.py tests/test_reading_state_machine.py` 39 passed; `finish-reading.spec.ts` + `update-page.spec.ts` 22 passed. The implementer reported `npm run check` green (one flaky 3.5 slice-resize leaf passed on rerun).

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| VG-defect+BH2+EC1+EC2 | On Home a 409 (finished/deleted in another tab) unmounts the Finish dialog: the refetch empties the card, unmounting `PageField` and the dialog; the alert line and answers vanish, focus drops | medium | `MainBookCard.tsx:40,67` renders `PageField` only with a Main book; `sendIntent` refetches before resolving. Contradicts "409s → the alert line inside the dialog, every answer kept". | patch |
| BH3 | Success path: `navigate('/')` runs after the dialog unmounted on Home | low | Same root cause; works today (Router's navigate survives unmount) but rests on it. Fixed by hosting the dialog on HomePage. | patch (with above) |
| VG1+BH8 | No test of the dialog's 409 path from either opener (alert kept, Cancel → `main` on Book detail) | gap (pre-verified) | Only a 503 leaf exists, from Book detail. | patch |
| VG2 | No "focuses once" test for the finished hand-off (reload, Back, Forward) | gap (pre-verified) | `start-reading.spec.ts:566` has the start equivalent; none for finish. | patch |
| VG3 | No test that Mark finished is absent for non-Main Books | gap (pre-verified) | Every Mark finished locator uses the Main book. | patch |
| BH11 | State-machine docstring omits the `purposeFulfilled`-without-Purpose `invalid_fields` | low | Docstring lists only page and Finished on; direct correction. The "generators never send invalid answers" half is covered by example tests. | patch |
| BH1 | README "19 of 41 stories" count stale | low | Pre-existing since 3.1; already in deferred-work.md (3.5 triage). | reject |
| BH4+EC3 | `{finished: true}` lingers when the refetch already shows another Main | low | Needs a start in another tab between Done and the refetch; mirrors the existing started hand-off; fix reshapes the guard. | reject |
| BH5 | Client prefills today from the browser clock, server checks its Clock | false | Local-first: browser and server share the machine clock and TZ; a stale prefill is in the past, which is accepted. | reject |
| BH6 | Star SVG and CSS duplicated in two components | low | No named harm beyond drift; extraction is more than a direct fix. | reject |
| BH7 | Stars named "4 stars" without "Rating" context | false | The ATDD contract and `key-book-detail.html` pin `aria-label="4 stars"`; the fix edits the contract. | reject |
| BH9 | Finishing mid-book leaves `currentPage` at 300 | false | Contract pins "every other Reading field kept"; AC-2 asserts `{**before, …}`; percent is not shown for finished Readings. | reject |
| BH10 | Diff omits `schema.d.ts`, sprint-status, spec | false | Excluded from the review diff on purpose; `check:api` covers the contract. | reject |
| BH12 | No API test that Home shows `mainBook: null` after a finish | false | AC-2 asserts `home["mainBook"] is None` and the meter. | reject |
| EC4 | Stale cached Purpose (cleared in another tab) makes every Done a 422 | low | Needs Edit Purpose to clear it in another tab while the dialog is open; Cancel recovers; fix adds a branch. | reject |
| EC5 | Spec task lists `update_page.py` though unchanged | false | Implementation Notes record the docstring already stated AD-19; the fix would edit the spec. | reject |
| SC | Spine check | false | No AD conflicts (AD-3/6/7/8/9/11/17/18/19/20 checked). | — |

Patches applied: the Finish dialog is hosted on `HomePage` (`PageField` signals `onReachedLastPage`, exposes `fieldRef`), so a 409 keeps the dialog, its alert line and its answers while the card empties; Cancel focuses the page field, else "No Main book.", else `main`. New e2e leaves: the 409 from both openers, the finished hand-off focusing once (reload, Back, Forward), Mark finished absent for a non-Main Book. State-machine docstring updated. Orchestrator check of the patch found that a kept-but-hidden `finishing` entry reopened the dialog on Back to the Home entry after Done; fixed by dropping it when `location.key` moves on, with a leaf ("Back after a finish from Home does not reopen the Finish dialog") that fails without the fix and passes with it.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- all pass, 0 skipped from 3.6
- `npm run check:api` -- clean
- `npm run check` -- green, including e2e and coverage gates
