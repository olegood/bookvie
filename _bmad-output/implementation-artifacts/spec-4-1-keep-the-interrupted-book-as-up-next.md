---
title: 'Story 4.1: Keep the interrupted book as Up next'
type: 'feature'
created: '2026-11-07'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '37d9911b712783aae74a5d93ebd7401b94359bf4'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-4-1-keep-the-interrupted-book-as-up-next.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Starting another Book pauses the Main book but leaves it nowhere: `upNextBookId` is never set, Home's side column is empty, and starting a seeded Up next Book fails with 500 (`main_not_up_next`). A paused Up next also opens "Start *X*?" and its empty Purpose overwrites the stored one.

**Approach:** Extend `start-reading` so the interrupted Main book becomes Up next in the same commit (FR-7). Add `upNext` to the home view and the paused Reading to Book detail for an Up next Book. The Start dialog states the displacement. Home shows the Up next pane, or the empty Main book card's Up next suggestion (UX-DR34, UX-DR38, UX-DR39).

## Boundaries & Constraints

**Always:**
- One commit or none: the pointer moves, the pause and the start/resume land together. Use the standard intent guarantees (TR8): fault → 503 `couldnt_save` with `library.json` byte-identical, `check_invariants()` after success, 409 `book_not_found`. Add no new error code.
- Pointer rule: if Main *Y* (≠ *X*) exists, then `upNextBookId` = *Y*. With no Main book, `upNextBookId` stays the same, except that it becomes `null` when it was *X*. A displaced *Z* only stops being `upNextBookId`; its Readings stay byte-identical.
- "Paused" for Up next means the Book has a current (unfinished) Reading. A finished Book with no Reading in progress counts as "never started" (it "returns to the catalog.", and its button reads **Start reading**).
- The server decides roles and pausedness. The client derives **Start reading** or **Resume** from one source (`lib/startReading.ts`).
- Use the names under "Contract the Scaffolds Pin" in the ATDD checklist. Use only existing tokens; never edit `tokens.css` or `schema.d.ts` by hand.

**Never:** Waiting for you pane (4.2), Pause (4.3), Set as Up next (4.4), non-Main finish (4.5), spine names/markers/legend and the Book detail secondary actions (4.6), Side reads and "Which page?" (4.7). Never show a paused-at date, and add no stale-dialog warning across tabs (A2).

## I/O & Edge-Case Matrix

| Scenario | State before | `start-reading` *X* result |
|---|---|---|
| Interrupt | Main *Y*, no Up next | Main *X*; *Y* paused (`pausedAt` today), Up next *Y* |
| Displace paused *Z* | Main *Y*, Up next *Z* paused | Main *X*, Up next *Y*; *Z* untouched → Waiting for you |
| Displace never-started *Z* | Main *Y*, Up next *Z* no Reading | Main *X*, Up next *Y*; *Z* back in catalog |
| Start Up next, Main exists | Main *Y*, Up next *X* | Main *X*, Up next *Y* |
| Resume Up next, no Main | Up next *X* paused | Main *X* (same Reading, Purpose prefilled), Up next `null` |
| No Main, other Up next | Up next *Z* ≠ *X* | Main *X*, Up next *Z* unchanged; no displacement line |
| Fault / gone | write/fsync/replace fault; deleted *X* | 503 `couldnt_save` / 409 `book_not_found`, file byte-identical |

</frozen-after-approval>

## Code Map

- `backend/bookvie/intents/start_reading.py` -- `change()`: compute the new `up_next_book_id` before `_pause_main`/`main_book_id` move; update the docstring ("untouched (Story 4.1)").
- `backend/bookvie/views/models.py` -- add `HomeUpNext` (`id`, `title`, `authors`, `cover_file`, `has_cover`, `paused`), `HomeView.up_next: HomeUpNext | None`; `CurrentReading.status` gains `"upNext"`.
- `backend/bookvie/views/shelf.py` -- `home()` fills `up_next` (`None` if no pointer, missing Book, or it equals Main). `_role_reading`: for `upNext`, return the current Reading. `_current_reading` maps the status. `_waiting_page` stays `waiting`-only, so `ShelfBook.waiting_page` and `roleLine` don't change.
- `frontend/src/lib/startReading.ts` (+ `.test.ts`) -- `paused()` must know about Up next. `detailPrimary` uses `currentReading !== null` for `upNext`. `popoverStart` uses `ShelfBook.currentPage !== null` for `upNext`. Rewrite the "until Epic 4" comments.
- `frontend/src/lib/bookDetail.ts` `currentReadingStatus` -- `upNext` → "Up next, paused at page N" (the EXPERIENCE.md Book-states string).
- `frontend/src/components/StartDialog.tsx` -- pass `home.data.upNext`. Add the displacement line after the pause line only when `pauses` exists and `upNext` exists with `upNext.id !== book.id`. Put *Z* in `styles.bookTitle`. `aria-describedby` names both lines.
- `frontend/src/components/UpNextPane.tsx` (+ `.module.css`, new) -- a `section` region "Up next" with a section-label heading. The row has a 44×64 thumbnail (`Cover` gains a `size="thumb"` variant), a serif title `Link` (2-line clamp), the author, and a compact secondary `Button` named "{label} {title}". Empty: "Nothing up next." + `Link` to `/catalog`. It hosts its own `StartDialog`; Cancel focuses the button.
- `frontend/src/components/Cover.tsx`/`.module.css` -- add the thumbnail size; keep the 200×300 default.
- `frontend/src/components/MainBookCard.tsx` -- the empty card takes `upNext`. When set, it replaces the Catalog link with thumbnail, serif title text, author, and a `variant="primary"` button with the same name scheme that opens `StartDialog`. Expose `suggestRef` for focus.
- `frontend/src/pages/HomePage.tsx` -- render `UpNextPane` in `.side` only when `mainBook !== null`. Finish hand-off focus goes to `suggestRef` when it is set, else to `emptyHeading` (and the same for `finishRefocus`). Update the docblock.
- Do not change: `ShelfBook.role` precedence, `_slice_priority`, `roleLine`, spine names (`lib/catalog.ts`).
- Tests that must change (checklist table): `test_reading_state_machine.py` (model the Up next pointer), the `test_start_reading.py`/`test_finish_reading.py` docstrings plus the `up_next` axis in `test_start_reading_across_the_state_matrix`, `test_views.py` role asserts for `upNext`, `start-reading.spec.ts` AC-6, `stale-hand-offs.spec.ts` F-R2, `finish-reading.spec.ts` AC-6 (add the Up next case).
- Deferred-work intake: `deferred-work.md:249` (spec-3-1, Book detail Current reading for a paused Up next) → task views + AC-3 UI. `deferred-work.md:253` (spec-3-2, start-reading for Up next → 500; Start vs Resume from one source) → tasks intent + `startReading.ts`. Its Side-read half (`main_not_side_read`) is not in this story: Story 4.7 owns starting a Side read ("Which page?"), and no UI reaches it before then.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/start_reading.py` -- apply the pointer rule in `change` -- AC-1, AC-3, AC-7.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- `HomeUpNext`, `HomeView.upNext`, `CurrentReading` for a paused Up next; then `npm --prefix frontend run api:gen` -- the dialog, pane and card read them.
- [x] `backend/tests/test_up_next.py` -- un-skip AC-1, AC-3, AC-7; add a home-view `upNext` test (null, paused true/false, fields) -- checklist follow-up.
- [x] `backend/tests/test_reading_state_machine.py`, `test_start_reading.py`, `test_finish_reading.py`, `test_views.py` -- model and assert Up next, add the Up next matrix rows, and assert that finishing Main leaves Up next alone.
- [x] `frontend/src/lib/startReading.ts`, `bookDetail.ts` (+ unit tests) -- one source for the Up next start action; status line.
- [x] `frontend/src/components/StartDialog.tsx` -- displacement line.
- [x] `frontend/src/components/Cover.tsx`, `UpNextPane.tsx`, `MainBookCard.tsx`, `pages/HomePage.tsx` -- pane, card suggestion, finish focus.
- [x] `frontend/e2e/up-next.spec.ts` -- un-skip AC-2, AC-4, AC-5, AC-6. Add "returns to the catalog.", Book detail **Resume** for a paused Up next, pane **Start reading**, and axe on the pane and the card.
- [x] `frontend/e2e/start-reading.spec.ts`, `stale-hand-offs.spec.ts`, `finish-reading.spec.ts` -- update as the checklist table says.
- [x] `README.md` -- Status line: an interrupted Book becomes Up next and Home shows it. Add the spec and ATDD checklist links after 3.7's.

**Acceptance Criteria:**
- Given Main *Y* and Up next *Z* ≠ *X*, when the Start dialog opens for *X*, then "*Z* moves to Waiting for you." (paused *Z*) or "*Z* returns to the catalog." (never-started *Z*) follows "This pauses *Y* at p.N (P%).", and confirming does exactly that.
- Given *X* is Up next, when its Start dialog opens from any opener, then it reads "Resume *X*?" with the Purpose prefilled (paused) or "Start *X*?", with no displacement line.
- Given a Main book, when Home opens, then the side column has a region "Up next" with the row (thumbnail, title link, author, a button "Resume *X*"/"Start reading *X*" that opens the Start dialog), or "Nothing up next." with a Catalog link.
- Given no Main book and an Up next, when Home opens, then there is no Up next pane and the empty card shows "No Main book." with the suggestion. Given the Main book is finished, when Home shows the result, then focus is on the suggestion's button, or on "No Main book." when there is no Up next.
- Given two browser contexts, when one starts a Book and the other regains focus, then the other shows the new state with no warning, and the last write wins.

### Review Findings

Code review 2026-11-07 (diff `37d9911..c80a3c9`). Layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check.

- [x] [Review][Patch] No test renders the Up next thumbnail for a Book with a stored cover. Every Up next fixture has no cover, so the pane and card `img` "Cover of *X*" at 44×64 and the home view's `upNext.coverFile`/`hasCover: true` are untested (medium, verification-gap) [frontend/e2e/up-next.spec.ts; backend/tests/test_up_next.py]
- [x] [Review][Patch] Triage Log row 1's fix (Home hosts the pane's Start dialog) has no regression test. Open the pane's dialog, empty the Main book in a second context, refocus, then assert the dialog, its Purpose and its alert line survive and Cancel falls back to the suggestion button (medium, blind-hunter) [frontend/e2e/up-next.spec.ts]
- [x] [Review][Patch] The start matrix never asserts that a displaced Up next (Emma, `up_next="other"` with a Main book) stays byte-identical, as the pointer rule requires (low, blind-hunter+edge-case-hunter) [backend/tests/test_start_reading.py:316]
- [x] [Review][Patch] The AC-2 Purpose prefill ("any opener") is asserted only for Book detail and the spine popover, not for the pane or the empty card openers, though `LEFT_HAND_PAUSED` carries a Purpose (low, acceptance-auditor) [frontend/e2e/up-next.spec.ts]
- [x] [Review][Patch] Header comment says "None of these leaves reads `upNextBookId`: Story 4.1 decides…", but AC-6 now asserts the 4.1 outcome (low, acceptance-auditor) [frontend/e2e/start-reading.spec.ts:10]
- [x] [Review][Patch] Docblock line "order, up to 3 rows chosen by the view's `slicePriority`. "Last export" sits at the" is left unwrapped (89 columns, the block wraps near 78); Triage Log row 9 marked it patched (low, blind-hunter) [frontend/src/pages/HomePage.tsx:73]
- [x] [Review][Defer] Book detail's Delete Confirm for a paused Up next reads "It is Up next." and no longer gives the page, where Epic 3's interrupted (`waiting`) Book read "It is waiting for you at p.120." [frontend/src/lib/bookDetail.ts:170] — deferred: `roleLine` is frozen by this spec's Code Map ("Do not change"), and Story 4.6 owns the role lines.

**Rejected:**
- Paused Up next spine reads "not read yet" (blind-hunter): already deferred to Story 4.6 (Triage Log row 5).
- Code Map says `UpNextPane` hosts its own `StartDialog`, and the Spec Change Log is empty (blind-hunter, edge-case-hunter, acceptance-auditor): real, but the fix edits the spec under review.
- The state machine never reaches a never-started Up next, and it pins "a finish leaves Up next alone" ahead of Story 4.5 (blind-hunter, edge-case-hunter): low. 4.5's change will turn this test red where it should, and seeding a never-started pointer is more than a direct correction.
- Empty authors render an empty `<p>` in the pane and the card (blind-hunter, edge-case-hunter ×2): false. Authors are required (`backend/bookvie/domain/book_fields.py:144`).
- The pane's author line truncates with no way to read the rest (blind-hunter): low. The title links to Book detail, which shows the full authors.
- `onStartUpNext` is optional in `MainBookCard` (blind-hunter): low. The only caller (`HomePage.tsx:270`) passes it.
- `test_up_next.py` home-view test chains stages on one builder (blind-hunter): low, test style with no named failure.
- `HomePage` resets `startingUpNext` during render and gates the JSX on the key too (blind-hunter): low. It mirrors the existing `finishing` pattern (lines 124 and 292) and is harmless.
- The Start dialog treats an already-Main opener as Resume, which gets 409 `already_main` (blind-hunter): low. Only a stale opener reaches it, and the dialog's error path handles the 409.
- The spec-3-2 deferred entry's `resolved:` line covers only half (blind-hunter): false. The open Side-read half is split into its own entry (`deferred-work.md:377`).
- No test covers the displacement `aria-describedby` (blind-hunter): false. `up-next.spec.ts:123` and `:302` assert `toHaveAccessibleDescription`.
- Cancel focus can land on an opener that now names another Book after a refetch (edge-case-hunter): low. Main and Up next must both change while the dialog is open, and the fix adds opener-tracking state.
- Three spine-check findings (AD-19, AD-7, map row AD-6): spine drift, already logged in `deferred-work.md` by the implementation and reconciled before Epic 5.

## Spec Change Log

## Review Triage Log

Pass 1 (2026-11-07). Layers: blind-hunter (BH), edge-case-hunter (EC), verification-gap (VG), spine-check (SC).

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | EC1, BH2 | The pane's Start dialog unmounts with the pane when a refetch empties the Main book | medium | `HomePage` renders `UpNextPane` only while `mainBook !== null`, and the pane hosts its `StartDialog`, so a finish or delete in another tab followed by a focus refetch drops the dialog, its Purpose and its alert line. Home already hosts the card's dialog for this reason. | patch (host it in `HomePage`, reusing `startingUpNext`) |
| 2 | VG1, BH8 | Cancelling the Finish dialog on an emptied card has no test for focus going to the Up next suggestion | medium | Pre-verified gap: the `finish-reading.spec.ts` AC-8 Home case seeds no Up next. BH's other half (the fallback when a refetch removed the suggestion) is low with a guard-sized test, so it is rejected. | patch (test) |
| 3 | VG2, BH7 | The Start dialog's `aria-describedby` for the displacement line has no test | medium | Pre-verified gap: only `toContainText` is used, and no test checks `toHaveAccessibleDescription`. | patch (test) |
| 4 | VG-other, BH4 | The `test_views.py` tail says "never-started Up next" but makes a finished Book Up next and never checks the role | low | Confirmed in the diff: both asserts read `current(finished) is None`. Direct correction. | patch (test) |
| 5 | BH1 | A paused Up next spine's name reads "not read yet" | medium | `lib/catalog.ts` `spineStatus` covers only `main`/`waiting`, so an interrupted Book (Reading in progress) is named "not read yet", where Epic 3 said "waiting for you, page N". The frozen intent's Never puts spine names in Story 4.6. | defer (4.6) |
| 6 | SC1 | AD-19's Starting bullet doesn't state the FR-7 Up next pointer move | low | The code follows the spec; the spine is out of date. | defer (spine drift) |
| 7 | SC2 | AD-7's known gap and Deferred "stale confirmation guard" don't mention the displacement line's cached home view | low | The code follows the spec's Design Notes; the spine is out of date. | defer (spine drift) |
| 8 | SC3 | The FR-5–FR-9 map row doesn't list `views/shelf` home `upNext`, the pane, or AD-6 | low | The code is right; the spine row is out of date. | defer (spine drift) |
| 9 | BH11 | `start_reading.py` docstring paragraph broken mid-sentence; a `HomePage.tsx` docblock line left unwrapped | low | Confirmed in the diff ("409 ``book_not_found`` when the" alone on a line). Direct correction. | patch |
| 10 | BH12 | "Choose a book in the Catalog" duplicated in `UpNextPane` and `MainBookCard` | low | Confirmed. Two empty states can drift; the fix is a shared constant (direct). | patch |
| 11 | BH3 | `popoverStart` offers Start reading for a finished Up next, with no backing | false | EXPERIENCE.md Book states row "Finished, Up next" gives the popover primary as **Start reading**. | reject |
| 12 | BH5 | The CSS hard-codes 44/64/30/20 22px instead of tokens | false | `tokens.css` has no thumbnail or pane tokens and must not be edited; the values are DESIGN.md's literals (`section-pane` padding 20px 22px, 44×64, 30px). The constraint forbids new tokens, not literals. | reject |
| 13 | BH6 | The thumbnail's alt repeats the title | false | EXPERIENCE.md → No-cover placeholder ("title is still given in text beside it") and the ATDD contract pin `img` "Cover of *X*" / "No cover" in the pane and card. | reject |
| 14 | BH9 | Spec `in-review` vs sprint-status `in-progress` | false | Step 05 syncs sprint-status to `review`; the workflow is mid-run. | reject |
| 15 | BH10 | New backend tests' AC labels mismatch | false | The ATDD checklist's follow-ups file the no-Main case under AC-2 and the home view's `upNext` API test under AC-7. | reject |

## Design Notes

- **Card button name:** "Resume *X*", the same as the pane's. EXPERIENCE.md → Names allows it, and the AC-5 scaffold pins it. The card's title is text, not a link (DESIGN.md).
- **Book detail status for a paused Up next:** "Up next, paused at page 120 · started …". This reuses the Book-states string. Story 4.6 owns the rest of the role lines.
- **Dialog data:** *Y* and *Z* come from the home view (fresh on open via the existing invalidation). The cached-home-view gap is known (epic context) and not closed here.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, `test_up_next.py` 4+ passed, none skipped.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/up-next.spec.ts e2e/start-reading.spec.ts e2e/stale-hand-offs.spec.ts e2e/finish-reading.spec.ts e2e/home.spec.ts` -- expected: all pass.
- `npm run check` -- expected: clean (format, lint, `tsc -b`, `schema.d.ts` in sync, coverage gates).
