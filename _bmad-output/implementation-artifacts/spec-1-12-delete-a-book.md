---
title: 'Story 1.12: Delete a book'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_commit: 'a4e25367639b620bdd5128195b7aaeb2e1013db3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Book can't be removed, so an accidental duplicate (Flow 8's "Add anyway" failure path) stays in the catalog forever.

**Approach:** Add the `delete-book` intent, a **Delete** action on Book detail, and a reusable Confirm dialog that names the consequence and the Book's role before anything is removed. Turn on the 5 ATDD scaffolds (`backend/tests/test_delete_book.py`, `frontend/e2e/delete-book.spec.ts`). The criteria are epics.md → Story 1.12, AC-1…AC-5 in the checklist.

## Boundaries & Constraints

**Always:** Every name, code, message and effect in the checklist's "Contract the Scaffolds Pin". One `commit()` removes the Book (Readings and Card notes are nested) and clears every pointer naming it; nothing is promoted. `book_not_found` is checked inside the commit. Un-skip the scaffolds without weakening them; extend `test_contract.py` for the new route.

Decisions: The role line is computed server-side on the `book` view: Main → "It is your Main book."; else Up next → "It is Up next." (Up next wins over a paused Reading); else an unfinished paused Reading → "It is waiting for you at p.*N*." (*N* = its `currentPage`); a Side read gets no line. While the request is in flight, **Delete book** and **Cancel** are `aria-disabled` and Esc is ignored. On success the app replaces the Book detail history entry with Catalog (`/`), focuses **Search titles** (or the empty state's **New book**), then `status` announces "Deleted *X*." after focus settles. Between the commit and that navigation Book detail renders nothing, never the not-found page. Book detail's action stack is **Edit**, then **Delete** (`button-secondary`).

**Never:** No cover-file deletion (1.13 adds it with covers). No Delete card note, Restore or Pause dialogs (later epics), but the Confirm dialog's props must not assume Delete book. No CRUD/DELETE HTTP verbs. No optimistic updates. No planning-doc edits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Delete Main | Main = X | 200 `{ok:true}`, X gone, `mainBookId` null, Up next unchanged | N/A |
| Delete Up next + Side read | X is both | both pointers cleared, other Side reads keep order | N/A |
| Delete last Book | one Book | `books: []`; Catalog empty state, **New book** focused | N/A |
| Gone id | deleted / never existed | 409 `book_not_found`, file byte-identical | UI: views refetch, Book detail shows not-found |
| Malformed intent | missing `bookId`, extra key, `null`, non-JSON | 422 `invalid_fields` on `intent` | file unchanged |
| Fault | write / fsync / replace fails | 503 `couldnt_save`, file byte-identical | dialog stays open, alert line above buttons |

</frozen-after-approval>

## Code Map

- `backend/bookvie/intents/book_form.py:84` -- `parse_form_intent[T: BookFormIntent]`; loosen the bound to `BaseModel` and reuse it for `DeleteBookIntent` (same camelCase/`extra="forbid"`/`strict` config, the `_no_null` rule).
- `backend/bookvie/intents/edit_book.py` -- pattern for an intent module (`change(library)` raising `book_not_found()`, then `commit(store, change)`). `intents/__init__.py` exports.
- `backend/bookvie/http/api.py:96` -- `edit_book_intent` route; mirror it for `/intents/delete-book` returning `OkResponse(ok=True)`.
- `backend/bookvie/domain/model.py` -- `Library.main_book_id`, `up_next_book_id`, `side_read_book_ids`; `Reading.paused_at`, `finished`, `current_page`.
- `backend/bookvie/views/{models,shelf}.py:51,59` -- `BookDetailView` / `book_detail`; add `role: Literal["main","upNext","waiting"] | None` and `waitingPage: int | None` (set only for `waiting`).
- `backend/tests/test_contract.py` -- operations whose envelope is checked; add delete-book. `tests/test_views.py` -- book view tests.
- `frontend/src/api/books.ts` -- `editBookForm`/`useEditBook` pattern → `deleteBookForm(bookId)`, `deleteBook`, `useDeleteBook`; `books.test.ts`.
- `frontend/src/components/DuplicateDialog.tsx` -- native `<dialog>` lifecycle (showModal, `adoptRegions`/`releaseRegions`, `clearAnnouncements`, default focus, Tab cycle, `onCancel`/`onClose` handling). Extract it into one hook (e.g. `src/lib/useAlertDialog.ts`) used by both dialogs; Duplicate dialog behavior must not change. Its region slot sits after the buttons; the Confirm dialog's sits above them.
- `frontend/src/pages/BookDetailPage.tsx` -- `BookDetail` action stack and `BookDetailPage` status switch (the not-found suppression lives here). `src/lib/bookDetail.ts` -- add `roleLine(view)` + test.
- `frontend/src/pages/CatalogPage.tsx` -- `searchRef`, the **New book** button, the `added` focus-then-announce effect pattern. `PageHeading` focuses the `h1` on every location key; CatalogPage's own effect runs after it, so it wins. Read the delete hand-off from router location state, once per location key.
- `frontend/e2e/delete-book.spec.ts`, `e2e/book-detail.spec.ts` (AC-12 in-flight pattern), `e2e/fixtures.ts` (`seededServer`).

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/delete_book.py` (+ `book_form.py` bound, `__init__.py`) -- `DeleteBookIntent(book_id)`, `parse_delete_book_intent`, `delete_book(store, intent)` per the matrix.
- [x] `backend/bookvie/http/api.py` -- the route.
- [x] `backend/bookvie/views/{models,shelf}.py` -- `role` / `waitingPage` per the Decisions.
- [x] `backend/tests/test_delete_book.py`, `test_contract.py`, `test_views.py` -- un-skip both leaves; add the malformed-intent 422 and Up next + Side read cases; view tests for each role, Up next beating paused, Side read → `null`.
- [x] `frontend/src/api/books.ts` (+ test) -- delete-book client; `npm run check:api` regenerates `src/api/generated/`.
- [x] `frontend/src/lib/useAlertDialog.ts`, `components/DuplicateDialog.tsx`, `components/ConfirmDialog.tsx` (+ `.module.css`, sharing the Duplicate dialog's look) -- heading, body lines, confirm label, `busy`, `onConfirm`/`onCancel`; Cancel takes focus; region slot above the buttons.
- [x] `frontend/src/lib/bookDetail.ts` (+ test), `pages/BookDetailPage.tsx`, `pages/CatalogPage.tsx` -- **Delete**, the dialog, the hand-off; on `couldnt_save` (or any refusal) set the server message in `alert` and keep the dialog open; closing returns focus to **Delete**.
- [x] `frontend/e2e/delete-book.spec.ts` -- un-skip all 3; add the AC-3 UI follow-up (Search titles focused, Book gone, "Deleted X." in `status`; last Book → **New book** focused) and the in-flight `aria-disabled` check. Re-run `duplicate-dialog.spec.ts`, `book-detail.spec.ts`.
- [x] `_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md` -- tick the implementation checklist; link this spec.

**Acceptance Criteria:**
- Given `npm run check`, when it runs, then it exits 0 with all 5 Story 1.12 scaffolds active and every earlier test passing.
- Given a deleted Book's Book detail, when the delete succeeds, then the not-found page never renders and Back from Catalog does not return to it.

### Review Findings

Code review 2026-10-31, range `53bb451..f7c39cc`. Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor (none failed).

- [x] [Review][Patch] Cancel after a couldn't-save leaves the alert text in the page's `alert` region; Cancel within `ANNOUNCE_DELAY_MS` announces it on Book detail after the dialog has closed — add `clearAnnouncements()` to `cancelConfirm` [frontend/src/pages/BookDetailPage.tsx:71]
- [x] [Review][Patch] A views refetch that fails while `deleting` renders `FailedBook` ("Couldn't load") between the commit and navigation, contradicting "Book detail renders nothing" — return `null` for any non-ready status while `deleting` [frontend/src/pages/BookDetailPage.tsx:201]
- [x] [Review][Patch] The busy dialog's "reopen after a native close" branch is never reached by a test (the AC-4 in-flight Esc is cancelled before any native close) — add a `dialog.close()` via `page.evaluate` while held, assert visible + Cancel focused, then the alert after release [frontend/e2e/delete-book.spec.ts:280]
- [x] [Review][Patch] No test pins "a paused Side read gets the waiting line" (triage #12) — add a paused, unfinished Side read to the role view test and assert `("waiting", <page>)` [backend/tests/test_views.py:127]
- [x] [Review][Patch] `BookDetailView.role` docstring says "A Side read has no role here", which is wrong for a paused Side read — say being a Side read alone gives no role [backend/bookvie/views/models.py:75]
- [x] [Review][Patch] The sessionStorage hand-off helpers (`readHandled`, `deleteHandled`, `markDeleteHandled`) have no unit tests — cover trim to `HANDLED_KEEP`, a repeated key moving last, a corrupt/non-array value, and storage that throws (stub `sessionStorage` on `globalThis`) [frontend/src/lib/bookDetail.ts:148]
- [x] [Review][Patch] The ATDD checklist is stale: "No `spec-1-12-*.md` exists yet (…`backlog`…)" and Next Steps 1 "Write the story spec"; Test Execution Evidence records no green run [_bmad-output/test-artifacts/atdd-checklist-1-12-delete-a-book.md:47]
- [x] [Review][Patch] The `Role` literal is declared twice; a role added in `shelf.py` only fails at runtime in pydantic, one added in `models.py` only is silently never produced — define it once in `models.py` and import it [backend/bookvie/views/shelf.py:61]

**Rejected:**

- false — Spec `done` vs sprint `review`: the expected state between build and code review; this review's status sync settles it.
- false — `waiting_page` set without `waiting` (no validator): `_role` is the only producer and always pairs them; no path to a mismatch was shown.
- false — README not updated for 1.12: README updates land in a separate post-completion commit (239e409 pattern).
- false — Native close before `busy` re-renders leaves a closed, mounted dialog: React flushes discrete-event updates synchronously, so `busy` is rendered before any later Esc or close event is dispatched.
- false — Paused Side read gets "waiting" vs the spec's literal "a Side read gets no line": settled by triage #12 (epics.md:1464/1693, EXPERIENCE.md); the fix would edit the frozen spec.
- false — `sessionStorage` breaks AD-15: AD-15 governs state kept out of the export and where UI preferences live; a session-scoped focus/announce dedupe is neither domain data nor a preference and never reaches the export.
- reject (spec edit) — Empty Implementation Notes / Spec Change Log: the fix is to edit the spec under review.
- low — Unticked ATDD follow-ups hide partial coverage: already rejected as triage #5; splitting boxes is bookkeeping, not a defect anyone meets.
- low — No test pins Delete after Edit / `button-secondary`: the code is correct (Acceptance Auditor confirmed); a regression is unlikely and the guard is new test code.
- low — Hand-off key evicted after 20 later deletes re-announces on Back: needs 20+ deletes in one tab session; the fix is a redesign.
- low — Without sessionStorage the hand-off re-fires per remount: storage is unavailable only in unusual browser settings; clearing state with a replace navigation changes `location.key`, re-triggering PageHeading's `h1` focus, so the fix is not a direct correction.
- low — "Once per history entry" claim weaker than stated: same root as the two rows above.
- low — On success the dialog unmounts before `navigate()`, focus on `body` for one tick: nothing renders (as specified), Catalog focuses Search titles immediately after; no one can act in that gap.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Route | Evidence |
|---|--------|---------|---------|-------|----------|
| 1 | blind, verification-gap (other), edge ×2 | `CatalogPage` delete hand-off re-fires when Catalog remounts on the same entry (Back after opening another Book, reload) | medium | patch | `handledDelete` is a per-mount `useRef`; `/` and `/book/:id` are sibling routes (`main.tsx:32-33`), so Catalog unmounts; `location.state` persists in history across Back and reload. |
| 2 | edge | Busy `ConfirmDialog` reopened by `showModal()` after a native close focuses Delete book, not Cancel | low | patch | `showModal()` runs dialog focusing steps (first focusable = Delete book); one `focus()` call corrects it. |
| 3 | blind | `test_book_detail_function_matches_the_route` never calls the route | low | patch | Test body only calls `book_detail()`; rename. |
| 4 | blind | sprint-status says `in-progress` while spec is `in-review` | false | reject | Step 5 syncs sprint-status; mid-review mismatch is the workflow's normal order. |
| 5 | blind | ATDD follow-up boxes left unticked | low | reject | Spec task asked to tick the implementation checklist (done); the unticked follow-ups are only partly covered, so ticking them would be wrong, and adding axe/inert/Flow 8 tests goes beyond a direct correction. |
| 6 | blind, edge | 409 path: dialog unmounts mid-await, alert announced over not-found, focus may drop to body on a first-load entry | low | reject | Matrix wants not-found on gone id (e2e covers it); React ignores setState after unmount; the announcement is the server's accurate message; reaching it needs a concurrent delete from another tab. |
| 7 | blind, edge ×2 | Network failure after commit → `couldnt_save` alert / not-found though the Book was deleted; blank page in flight | low | reject | Localhost server; a lost response after a committed write is rare, and the fix needs new reconciliation branches. Success path unmounts the page, so `deleting` never needs resetting. |
| 8 | blind | `{"bookId": ""}` gets 409 not 422; `_no_null` is redundant | false | reject | An empty string is well-formed and names no Book, so `book_not_found` is correct per the matrix; `_no_null` is the rule the spec requires reusing. |
| 9 | blind | 422 message mentions "the form's fields" | low | reject | Developer-facing copy reused as the spec directs; changing it ripples through the other intents' pinned tests. |
| 10 | blind | `useAlertDialog` has no unit tests | false | reject | The unit runner has no DOM; the hook is exercised end-to-end by `duplicate-dialog.spec.ts` and `delete-book.spec.ts`, which run in `npm run check`. |
| 11 | blind | `ConfirmDialog.module.css` copies the Duplicate dialog's rules | low | reject | Both use the same design tokens, so a token change reaches both; no divergence path named beyond hand edits. |
| 12 | blind, edge | A paused Side read gets "waiting for you" | false | reject | epics.md:1464 puts every paused Reading outside Up next in Waiting for you, and :1693 lets Side read combine with paused; the spec's "Side read gets no line" means Side read alone. |
| 13 | blind | Client tests don't check refetch; cover cleanup unrecorded | false | reject | `sendIntent`'s refetch-before-resolve is tested in `intents.test.ts:31-55`; cover removal on delete is already in epics.md:901 (Story 1.13). |
| 14 | blind | AC-3 MutationObserver ignores in-place text changes | false | reject | `NotFoundPage` is a different component from `BookDetail`, so it always arrives as added nodes. |
| 15 | edge | Back pressed while delete is in flight → `navigate('/', {replace})` overwrites the new entry | low | reject | The modal dialog leaves only the browser's Back button, and a localhost delete takes milliseconds; a guard needs mount tracking. |
| 16 | edge | `deleting` flag not keyed to `bookId` | low | reject | The route can only change during a delete through the Back race in #15. |
| 17 | edge | Dialog doesn't stay open on a `book_not_found` refusal | false | reject | The matrix's gone-id row requires not-found, which wins over the dialog. |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest tests/test_delete_book.py tests/test_contract.py tests/test_views.py` -- expected: all pass, none skipped.
- `npm --prefix frontend run check:api` -- expected: no diff afterwards; `tsc -b`, oxlint and unit tests pass.
- `npm run build && TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/delete-book.spec.ts e2e/duplicate-dialog.spec.ts e2e/book-detail.spec.ts` -- expected: all pass.
- `npm run check` -- expected: exit 0.
