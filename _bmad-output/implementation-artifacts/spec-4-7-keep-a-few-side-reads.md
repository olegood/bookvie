---
title: 'Story 4.7: Keep a few side reads'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: '9b8d2d787de81d4751b9e0616b28e4fa84048b1b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Side reads exist only as a stored pointer list (`sideReadBookIds`, at most 3). Nothing can mark or unmark one, Home doesn't show them, spines don't name them, and `start-reading` for a Side read fails with 500 `main_not_side_read` because it never takes the Book out of the list (deferred-work.md:377). FR-8, UX-DR38, UX-DR45.

**Approach:** Add the `mark-side-read` and `unmark-side-read` intents and expose Side reads in the views. Extend `start-reading` with a "Which page?" `page` that is required for a Side read, and make it drop the Book from the Side reads in the same commit. On the client, add **Mark as Side read** / **Remove from side** to Book detail, an "On the side" pane on Home, ", on the side" in spine names, and the "Which page?" field in the Start dialog. Add the new intents to the property test.

## Boundaries & Constraints

**Always:**
- **`mark-side-read` `{bookId}`** checks inside the commit, in this order:
  1. 409 `book_not_found`.
  2. 409 `main_cannot_be_side_read` ("Your Main book can't be a Side read.").
  3. When the Book is already a Side read: a 200 no-op that commits nothing (`UNCHANGED`, as set-up-next does).
  4. At 3 Side reads: 409 `side_reads_full` ("You already have 3 side reads. Remove one first.").
  5. Otherwise it appends the id to `sideReadBookIds` and changes nothing else (no Reading, status, `mainBookId` or `upNextBookId`).
- **`unmark-side-read` `{bookId}`:** 409 `book_not_found`. When the Book isn't a Side read it is a 200 no-op that commits nothing. Otherwise it removes the id and keeps the others in order.
- **`start-reading`** takes an optional nullable `page` (any JSON value, as update-page takes it).
  - When the Book is a Side read and `page` is missing or null: 422 `invalid_fields` on `page`, "Which page? is required.".
  - Whenever `page` is sent and isn't a JSON integer from 0 to `pages`: 422 on `page`, "Page must be between 0 and N." (reuse `update_page.page_message`).
  - Both are checked after `book_not_found` and `already_main`.
  - A valid page becomes the resumed or new Reading's `currentPage`. A value below the paused page is fine.
  - The Book leaves `sideReadBookIds` in the same commit.
  - The answer carries `reachedLastPage: true` when `page == pages`.
  - Everything else about `start-reading` is unchanged.
- **Views:**
  - `ShelfBook.sideRead: bool`.
  - `BookDetailView.sideRead: bool` and `sideReadsFull: bool`. The second is true when there are 3 Side reads and this Book isn't one of them.
  - `HomeView.sideReads: HomeSideRead[]` (`id`, `title`, `authors`), in `sideReadBookIds` order.
- **Book detail:**
  - **Mark as Side read** or **Remove from side** goes right after **Mark finished**, for every Book that isn't Main.
  - It applies at once, with no dialog, through the Set as Up next one-click flow:
    - the `couldn't save` alert line goes directly below the button, with focus kept on it;
    - on success, after the refetched view shows the change, focus moves to the primary button (the `h1` when there is none), then the `status` region reads "*X* is on the side." or "*X* is off the side.".
  - When `sideReadsFull` is true, **Mark as Side read** stays focusable with `aria-disabled="true"`, a visible hint "Up to 3 side reads." linked through `aria-describedby`, and a click does nothing.
- **Spine names** add ", on the side" after the status for a Side read. A Side read gets no marker of its own: `spineMarker` is unchanged.
- **Home "On the side" pane:**
  - Placed after Waiting for you, and hidden when there are no Side reads.
  - Its h2 is "On the side". Each row has a serif title link to Book detail, the author line, and a compact **Start reading** button whose accessible name is "Start reading *Title*". The button opens the Start dialog and gets focus back on cancel.
  - It shows whether or not there is a Main book.
  - A Side read that is also Up next or Waiting shows in both panes.
- **Start dialog** when the opened `book` view has `sideRead`:
  - It has a required "Which page?" number field (110px; reuse the `PageField` input attributes), prefilled with `currentReading.currentPage` when there is a current Reading, else empty. Focus starts there.
  - Client checks use `parsePage`. Empty gives "Which page? is required." and a bad value gives `pageRangeMessage(pages)`. On either, nothing is sent, the field gets `aria-invalid="true"` and the message, and the message is announced in `alert`. A server 422 on `page` is shown the same way.
  - On ok with `reachedLastPage`, the usual post-start navigation happens and Home then opens the Finish dialog for the new Main book, as update-page's `reachedLastPage` does.
- The standard intent ACs (TR8) apply to both new intents. Every new error code gets an API test. Tests seed state with `LibraryBuilder` / the e2e partial (`sideReadBookIds`).

**Never:**
- No marker, color or legend item for Side reads, and no change to the spine popover's actions.
- No hand edits to `tokens.css`. `schema.d.ts` changes only through `npm --prefix frontend run api:gen`.
- No spine (architecture) edits. Record drift in deferred-work.md.
- No change to `finish-reading` or `delete-book`: they already drop the Book from the Side reads.

## I/O & Edge-Case Matrix

| Scenario | State | Result |
|---|---|---|
| Mark | non-Main Book, 0–2 Side reads | 200; id appended; nothing else changes |
| Mark again | already a Side read | 200, no write |
| Mark Main | Book is Main | 409 `main_cannot_be_side_read`, bytes unchanged |
| Mark 4th | 3 Side reads | 409 `side_reads_full`, bytes unchanged |
| Unmark | Side read / not one | 200 removed / 200 no write |
| Start Side read, no page | `page` missing or null | 422 `invalid_fields` on `page`, "Which page? is required." |
| Start Side read, page 400 of 330 | | 422 "Page must be between 0 and 330." |
| Start paused Side read at p.120 with page 50 | | 200; Reading resumed at p.50; leaves Side reads |
| Start Side read with page = pages | | 200 `reachedLastPage: true`; Finish dialog opens on Home |
| Side read + Up next | | in On the side and Up next panes; marker `upNext` only; name ends ", on the side" |

</intent-contract>

## Code Map

- `backend/bookvie/intents/contract.py`: add `MAIN_CANNOT_BE_SIDE_READ` and `SIDE_READS_FULL` to `ErrorCode`, plus factory functions modeled on `main_cannot_be_up_next` (`:232`). Export them in `intents/__init__.py`.
- `backend/bookvie/intents/side_reads.py` (new): `MarkSideReadIntent`, `UnmarkSideReadIntent` and their parsers and functions, modeled on `set_up_next.py` (the `UNCHANGED` no-op). The cap is `domain.invariants.MAX_SIDE_READS`.
- `backend/bookvie/intents/start_reading.py:39`:
  - Add `page: JsonValue = None` to the intent, in `nullable`.
  - Validate it inside `change` after `already_main`. The field label is "Which page?" (`{"page": "Which page?"}`), and `page_message` / `_valid_page` come from `update_page.py`.
  - Set `current_page` on the resumed or new Reading, and filter `side_read_book_ids`.
  - Return `bool` (reached the last page), and update the docblock.
- `backend/bookvie/http/api.py`:
  - `:445` start-reading: describe `page` in the route description, and return `reached_last_page` the way update-page does at `:502`.
  - Add routes `/intents/mark-side-read` and `/intents/unmark-side-read`, modeled on set-up-next (`:547`).
- `backend/bookvie/views/models.py` and `views/shelf.py`: add the `side_read` fields in `_shelf_book` and `book_detail`, and `_side_reads(library)` for `home`.
- `backend/tests/helpers.py:50`: add the `MARK_SIDE_READ` and `UNMARK_SIDE_READ` URLs.
- `backend/tests/test_side_reads.py` (new): one test per matrix row through the API (bytes unchanged on refusals), the start-reading page cases, and TR8 (write/fsync/replace faults → 503, `book_not_found`, malformed intent 422, invariants after success, OpenAPI envelope + codes) for both intents, as `test_set_up_next.py:236` does. Also the views: `sideRead` and `sideReadsFull` on detail, and the order of `sideReads` on home.
- `backend/tests/test_reading_state_machine.py`:
  - Model `self.side_reads`.
  - Seed one Side read (the paused Book).
  - Add `mark_side` and `unmark_side` rules with the expected refusals.
  - `start`: send `page` (draw from `_pages` or `None`; required for a Side read). Set the ledger to the sent page and drop the Book from `self.side_reads`.
  - `finish` and `delete` drop the Book from `self.side_reads`.
  - Replace `assert library.side_read_book_ids == []` (`:482`) with the model, and assert that each shelf book's `sideRead` and Home's `sideReads` match it.
  - Update the docstring ("Later intents…" line).
- `frontend/src/api/generated/schema.d.ts`: regenerate only.
- `frontend/src/api/books.ts:135-190`:
  - Add `markSideRead`, `unmarkSideRead` and their `use…` hooks, modeled on `setUpNext`, and re-export them in `api/index.ts`. Tests go in `books.test.ts`.
  - `startReading` gains an optional `page: number`.
- `frontend/src/lib/sideRead.ts` (new, + test): `sideReadStatus(title, on)`, `SIDE_READS_FULL_HINT`, busy reasons and `detailOffersSideRead(role)`. The copy follows `lib/setUpNext.ts`.
- `frontend/src/lib/useSetUpNextFlow.ts:38`: make the sender a parameter (or extract a shared one-click hook) so the side-read buttons reuse its focus, alert-slot and in-flight logic. Keep set-up-next's behavior identical.
- `frontend/src/pages/BookDetailPage.tsx`: wire the flow at `:142-176` (wait for `book.sideRead` to flip, as the role wait does). Add the button and its region slot after Mark finished in the stack (`:259-294`), and update the docblock (`:411`).
- `frontend/src/lib/catalog.ts:25-80` (+ `catalog.test.ts`): `NamedSpine.sideRead` and ", on the side" in `spineName`. Map it in `pages/Bookcase.tsx:262`.
- `frontend/src/components/SidePane.tsx` (new), modeled on `WaitingPane.tsx`. Render it in `pages/HomePage.tsx:346-349` after WaitingPane, using the pane open handler (`openStartFromPane` / `startRefocus`, `:230-251`).
- `frontend/src/components/StartDialog.tsx:40-155`:
  - The "Which page?" field when `opened.sideRead`. It gets initial focus through `useAlertDialog({initialFocus})`.
  - Validation, and mapping `result.fields` for `page`.
  - Send the page.
  - On `reachedLastPage`, put a flag in the `StartedState` navigation state. `HomePage` reads it and opens the Finish dialog (`openFinish`, `:213-218`) for the Main book.
  - Reuse `lib/pageField.ts` (`parsePage`, `pageRangeMessage`).
- `frontend/e2e/intents.ts:8-17`: URL constants. `frontend/e2e/side-reads.spec.ts` (new) covers each epic AC: mark and remove (status line, focus to the primary), the routed 503 for each button (alert below it, focus kept, nothing stored), aria-disabled plus the hint at 3, the On the side pane (hidden when empty, row contents, opens Start), the spine name and marker for Side read + Up next and Side read + waiting, and the Start dialog's "Which page?" (prefill, focus, empty and out-of-range messages with `aria-invalid` and an alert, a page below the paused one accepted, the last page opening Finish, leaving On the side), plus a Side read finished from Book detail leaving the pane. Model it on `set-up-next.spec.ts` (`routeCouldntSave` `:97`) and `start-reading.spec.ts`.
- `frontend/e2e/book-states.spec.ts:2`: drop "(the Side-read rows are Story 4.7's)" and add one ", on the side" row.
- `README.md`: Status line (Side reads; Stories 4.1-4.6 → keep the count, since review moves it) and add the 4.7 spec link after 4.6's (`:200`).
- `_bmad-output/implementation-artifacts/deferred-work.md:377`: add a `resolved:` line naming this spec.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/contract.py`, `side_reads.py`, `__init__.py` -- the two intents and the two codes -- FR-8, AD-9.
- [x] `backend/bookvie/intents/start_reading.py`, `http/api.py` -- `page`, leaving the Side reads, `reachedLastPage`, and the routes -- FR-8, FR-10, deferred :377.
- [x] `backend/bookvie/views/models.py`, `views/shelf.py` -- the `sideRead`, `sideReadsFull` and `sideReads` fields.
- [x] `backend/tests/test_side_reads.py`, `helpers.py` -- the matrix, the page cases, TR8 and the views.
- [x] `backend/tests/test_reading_state_machine.py` -- the Side-read rules, the model and the page ledger -- RDG-UNIT-002.
- [x] `frontend/src/api/*` (regenerate the schema, then books.ts and index.ts) -- clients.
- [x] `frontend/src/lib/sideRead.ts`, `useSetUpNextFlow.ts`, `pages/BookDetailPage.tsx` -- the one-click buttons, the hint, focus and the status line -- UX-DR45.
- [x] `frontend/src/lib/catalog.ts`, `pages/Bookcase.tsx` -- ", on the side".
- [x] `frontend/src/components/SidePane.tsx`, `pages/HomePage.tsx` -- On the side -- UX-DR38.
- [x] `frontend/src/components/StartDialog.tsx`, `pages/HomePage.tsx` -- "Which page?" and Finish at the last page.
- [x] `frontend/e2e/side-reads.spec.ts`, `intents.ts`, `book-states.spec.ts` -- the e2e ACs.
- [x] `README.md`, `deferred-work.md` -- the status line, the spec link, the `resolved:` line.

**Acceptance Criteria:**
- Given a non-Main Book on Book detail, when I press **Mark as Side read**, then it is stored in `sideReadBookIds` with nothing else changed, focus moves to the primary button (or the `h1`), and `status` reads "*X* is on the side."; **Remove from side** reverses it and reads "*X* is off the side.".
- Given a routed 503 on either button, when I press it, then "Couldn't save. Your data wasn't changed." shows in an `alert` line directly below it, focus stays on it, and the stored library is unchanged.
- Given 3 Side reads, when I view a fourth Book's detail, then **Mark as Side read** has `aria-disabled="true"` and the hint "Up to 3 side reads.", and pressing it sends nothing.
- Given a Side read, when I start it from any route, then the Start dialog focuses a "Which page?" field prefilled with its paused page (empty without one), rejects empty and out-of-range values with `aria-invalid` and an alert, and on confirm tracks from that page and removes it from On the side.
- Given a random sequence of the reading intents including mark and unmark, when it runs against `domain/`, then the invariants, the page ledger and the views' Side-read fields hold after every step.

## Spec Change Log

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 23 findings — high 0, medium 1, low 19, false 3, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind) A dialog opened before another tab marked the Book a Side read gets a `page` 422 with no field to fill — multi-tab is last-write-wins by design (epic context); the generic alert still shows, and the fix adds a branch for a rare case.
  - `[false]` `[reject]` (blind) The last-page Finish dialog reopens on Back or reload — `HomePage`'s `clearHandOffState` replaces the history entry's `usr` with null once the start is handled, so no `reachedLastPage` state survives.
  - `[low]` `[reject]` (blind) Stale-tab `side_reads_full` / `main_cannot_be_side_read` refusals aren't tested in the browser — they take `useOneClickFlow`'s refusal path, shared with and already exercised by Set as Up next; both codes are API-tested.
  - `[low]` `[patch]` (blind) An e2e title promised the `h1` fallback but asserted Start reading — every non-Main Book has a primary, so the fallback is unreachable for this toggle; the title was corrected and the assertions kept.
  - `[low]` `[reject]` (blind) "Which page?" untested from the spine popover, Up next pane and Waiting rows — every route mounts the one `StartDialog`, which keys the field on the fetched `book` view's `sideRead`; Book detail and On the side cover it end to end.
  - `[low]` `[patch]` (blind) The property test never checks Book detail's `sideRead`/`sideReadsFull` — `views_agree_with_the_pointers` now asserts both for every Book against the model, and `mark_side` uses `MAX_SIDE_READS`.
  - `[low]` `[patch]` (blind) Spine drift unrecorded — a "spine drift" entry (FR-5 to FR-9 map row, AD-18, AD-6, start-reading's `page`) was added to deferred-work.md.
  - `[low]` `[patch]` (blind) `start_reading.py` imported the private `_valid_page` — renamed to the public `valid_page`.
  - `[low]` `[reject]` (blind) The cap 3 is written out in copy and docs — the copy is fixed text from AD-9 / EXPERIENCE.md, and the server check uses `MAX_SIDE_READS`.
  - `[low]` `[patch]` (blind) A start-reading test asserted only 409 for the already-Main case — it now asserts `already_main`. The resume-at-last-page and Up-next-plus-Side-read starts are covered by the property test's start rule (`reached` and pointer assertions).
  - `[false]` `[reject]` (blind) `purposeForm` lets `edit-purpose` send `page` — `editPurpose` calls `purposeForm(bookId, purpose)` with no page, so the body is unchanged.
  - `[low]` `[patch]` (blind) Unparseable text in the number field reads as empty, so "Which page? is required." shows — `confirm` now checks `validity.badInput` and shows the range message.
  - `[low]` `[reject]` (blind) `SidePane` shares `WaitingPane.module.css` — the module's header documents the sharing, as UpNext/Waiting already keep rules in step; no named harm.
  - `[false]` `[reject]` (blind) `SidePane` is wired to `openStart` rather than `openStartFromPane` — `openStart` is the per-row handler Waiting rows use (focus returns to the pressed button); `openStartFromPane` exists for the Up next pane's single ref.
  - `[low]` `[reject]` (blind) The spec's task checkboxes and logs were stale — the fix edits this spec; they are filled in at finalization.
  - `[low]` `[reject]` (blind) No unit tests for `useOneClickFlow`, the focus effect or `reachedLastPageLine` — the e2e suite covers each path, and `set-up-next.spec.ts` passes unchanged after the refactor.
  - `[low]` `[reject]` (edge-case) Same as the first row: a dialog without the field after another tab marks the Book — grouped with it.
  - `[low]` `[patch]` (edge-case) Same as the badInput row — grouped with it.
  - `[medium]` `[patch]` (verification-gap) The last-page Finish dialog's description wasn't asserted — `side-reads.spec.ts` now checks "Page 330 of 330, 100%.".
  - `[low]` `[reject]` (intent-alignment) "By any route" rests on the shared component, not tests — same as the any-route row.
  - `[low]` `[reject]` (intent-alignment) Prefill for a paused Up next Side read isn't tested e2e — `currentReading` for a paused Up next is pinned by `test_book_states.py` (4.6), and the prefill reads only it.
  - `[low]` `[reject]` (intent-alignment) Scope beyond the epic (a page for any Book, the mark no-op, the pane's Start reading label) — these are the spec's Design Notes; changing them edits this spec.
  - `[low]` `[reject]` (intent-alignment) Side-read combinations come from random rules, not targeted generators — the seed has a paused Side read, and `mark_side` over five slots reaches Up next, paused and finished Side reads.

### 2026-11-10 — Code review pass (epic 4 retro item 43)
- scope: `e0306af^..e0306af`, full mode, whole diff (3,671 lines, over the chunking threshold; Oleg chose not to split), five layers (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check), none failed. Each finding was checked against master at `40d12e3`, since 13 of the diff's 41 files have changed since.
- verdicts: 30 findings — high 0, medium 0, low 18, false 3, maybe-false 0, already fixed on master 9
- findings:
  - [x] [Review][Patch] `[low]` An invalid "Which page?" leaves focus on the pressed button (BH): `showPageInvalid` never focuses the field, while `PageField.tsx:157` does on a refusal, so a keyboard user has to tab back. [frontend/src/components/StartDialog.tsx:93]
  - [x] [Review][Patch] `[low]` No test types text the number field can't parse (VG): removing the `badInput` check fails nothing, so the first pass's fix can regress. [frontend/e2e/side-reads.spec.ts:331]
  - [x] [Review][Patch] `[low]` No test covers a stale-tab refusal that removes Mark as Side read (VG): only a 503 reaches this site, and the button survives that, so its slot placement and fallback never run. [frontend/e2e/side-reads.spec.ts:194]
  - [x] [Review][Patch] `[low]` The matrix row "Side read + Up next" has no API test of both panes (AA): item 33's test checks `upNext.sideRead` only, not Home's `sideReads` or the shelf's `role`. [backend/tests/test_side_reads.py:381]
  - [x] [Review][Patch] `[low]` `PAGE_REQUIRED` is exported but nothing imports it (BH). [frontend/src/components/StartDialog.tsx:30]
  - [x] [Review][Defer] `[low]` The empty "Which page?" check is a client pre-check AD-3 and AD-9 don't sanction (SC) [frontend/src/components/StartDialog.tsx:109] — deferred: spine drift, reconciled before the next epic (item 38).
  - [x] [Review][Defer] `[low]` AD-19 doesn't state what `start-reading` now does with `page` or a Side read (SC, two findings) [backend/bookvie/intents/start_reading.py] — deferred: spine drift, item 38.
  - [x] [Review][Defer] `[low]` `side_reads.py` holds two intents against the Structural Seed's "one module per intent" (SC) [backend/bookvie/intents/side_reads.py] — deferred: spine drift, item 38.
  - [x] [Review][Defer] `[low]` The 4.7 drift entry lists view fields AD-8 leaves to the models and misses the AD-19 disagreements (SC) [deferred-work.md:462] — deferred: correction for item 38.
  - [x] [Review][Defer] `[low]` The last-page hand-off carries no Book id, so a failed refetch or another tab could open Finish for the wrong Book (EC, BH) [frontend/src/pages/HomePage.tsx:165] — deferred: this is retro F-R5, to be settled by item 36's probe.
  - [x] [Review][Defer] `[low]` The last-page path is tested only from the On the side pane and Home's slice, and nothing pins that Finish doesn't reopen on Back (BH) [frontend/e2e/side-reads.spec.ts:440] — deferred: to item 36, which covers `reachedLastPage` on every route.
  - [x] [Review][Defer] `[low]` `useOneClickFlow` keeps Set as Up next's names and file (BH) [frontend/src/lib/useSetUpNextFlow.ts:53] — deferred: to item 41 (retro F-A2).
- already fixed on master:
  - EC, BH: "Which page?" inflates Measured pace — fixed by `12a8fe4` (item 35); `domain/pace.py:35` subtracts `start_page`.
  - AA, EC, BH: Edit book's back-fill leaves a finished Book on the side — fixed by `a262134` (item 34); `edit_book.py:224`.
  - EC, BH: the displacement line is untrue for a Side read — fixed by `225a6e9` (item 33); `lib/pause.ts:20`.
  - EC, BH: the Start dialog stays open after a confirmed start on Home's slice — fixed by `a0f2551` (item 32); `useSpinePopover.ts:64`, with e2e in `home-slice.spec.ts`.
- rejected:
  - `[false]` AA: the README count moved, though the spec said to keep it — the count is right at master (31 of 41), so nothing is wrong.
  - `[false]` AA: the client hardcodes 100 in the last-page line — it is shown only when the page equals the Book's pages, so it is always 100.
  - `[false]` BH: the story reached `done` without the pipeline — that rule entered AGENTS.md later (`0bebca6`, item 40), and item 43 is this review.
  - `[low]` EC: a dialog opened before another tab marked the Book shows an alert naming a missing field — same as the first pass's `[reject]`; multi-tab is last-write-wins, and reopening the dialog fixes it.
  - `[low]` BH: the same stale-tab dead end — duplicate of the EC row.
  - `[low]` EC: Book detail's pending side-read line never expires when the refetch fails — needs a failed local refetch and a later flip; the fix adds a guard (same as 4.4's pending line).
  - `[low]` BH: the Code Map and a ticked task name `pages/Bookcase.tsx`, which the diff doesn't touch — the fix edits this spec.

## Design Notes

- **`page` on a non-Side read** is honored when sent (validated the same way). A tab that opened the dialog while the Book was a Side read, before another tab unmarked it, still has its typed page applied rather than refused. The client sends `page` only when it shows the field.
- **Mark when already marked** is a 200 no-op, checked before the cap, so a stale "Mark" on one of 3 Side reads doesn't claim the list is full. This mirrors set-up-next for the current Up next.
- The On the side button always reads **Start reading** (DESIGN.md section pane), even for a paused Side read. The dialog heading still says Resume from the shared `detailPrimary`.
- The `page` field's label is "Which page?", so the 422 summary names it the way the dialog does.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_side_reads.py tests/test_start_reading.py tests/test_reading_state_machine.py tests/test_book_states.py` -- expected: all pass.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/side-reads.spec.ts e2e/book-states.spec.ts e2e/start-reading.spec.ts e2e/set-up-next.spec.ts e2e/home.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: done

**Summary:** Side reads work end to end. `mark-side-read` / `unmark-side-read` intents (409 `main_cannot_be_side_read`, `side_reads_full`, no-op 200s); `start-reading` takes the "Which page?" `page` (required for a Side read), leaves the Side reads and returns `reachedLastPage` (closes deferred-work :377's 500); views carry `sideRead`, `sideReadsFull`, `sideReads`. Book detail gets **Mark as Side read** / **Remove from side** (aria-disabled with "Up to 3 side reads." at 3), Home an On the side pane, spines ", on the side", and the Start dialog the "Which page?" field with Finish opening at the last page.

**Files:** backend `intents/side_reads.py` (new), `start_reading.py`, `update_page.py` (`valid_page`), `contract.py`, `__init__.py`, `http/api.py`, `views/models.py`, `views/shelf.py`, `domain/__init__.py`; tests `test_side_reads.py` (new), `test_reading_state_machine.py`, `helpers.py`, fixture updates in `test_contract.py`, `test_views.py`, `test_edit_book.py`. Frontend `api/books.ts`, `index.ts`, `views.ts`, regenerated `schema.d.ts`; `lib/sideRead.ts` (new), `useSetUpNextFlow.ts` (`useOneClickFlow`), `catalog.ts`; `components/SidePane.tsx` (new), `StartDialog.tsx`, `Button.tsx` (`reasonClassName`), CSS modules; `pages/BookDetailPage.tsx`, `HomePage.tsx`; e2e `side-reads.spec.ts` (new), `book-states.spec.ts`, `intents.ts`; README, deferred-work.md.

**Review:** 23 findings. Patched 8 rows (7 fixes): medium 1 (Finish description assertion), low 7 (test title, detail fields in the property test, spine-drift entry, `valid_page`, `already_main` assertion, badInput message). Deferred: none (spine drift recorded in deferred-work.md). Rejected: 12 low and 3 false, each with its reason in the triage log.

**Follow-up review:** not recommended — one medium and no high were patched; the medium was a missing assertion, now in place.

**Verification:** `uv run pytest tests/test_side_reads.py tests/test_start_reading.py tests/test_reading_state_machine.py tests/test_book_states.py` 57 passed; e2e side-reads, book-states, start-reading, set-up-next, home 75 passed; `npm run check` exit 0 — all re-run after the patches.

**Residual risks:** a dialog opened before another tab marks the Book a Side read can't complete until reopened (multi-tab last-write-wins). "Which page?" from the spine popover, Up next and Waiting routes is covered by the shared component, not by its own e2e. This story closes Epic 4: test automation, the retrospective, trace and gate, and the spine reconciliation come before Epic 5.
