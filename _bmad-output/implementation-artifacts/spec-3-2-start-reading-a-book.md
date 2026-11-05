---
title: 'Story 3.2: Start reading a book'
type: 'feature'
created: '2026-11-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ff1334f601853297acb32e20b4cef52e5b84e897'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-2-start-reading-a-book.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Readings exist only in seeds. Nothing in the app starts, resumes or re-reads a Book, and the Purpose can't be set or changed, so Home's Main book card (3.1) is unreachable through the UI.

**Approach:** Add the `start-reading` and `edit-purpose` intents and the `already_main` refusal. Add a modal Start dialog ("Start *X*?" / "Resume *X*?", the "This pauses *Y* at p.N (P%)." line, Purpose) opened from Book detail's primary and the spine popover, and inline Edit Purpose in Book detail's Current reading block. Names, routes and behaviours follow the ATDD checklist's "Contract the Scaffolds Pin"; the 11 red leaves are activated, not rewritten.

## Boundaries & Constraints

**Always:**
- One commit per intent: `start-reading` pauses the current Main book's Reading (`pausedAt` = today, page kept), resumes the Book's current Reading (keeps id/page/`startDate`/`pausedAt`, `lastProgressUpdate` = now, `purpose` = sent) or appends a new one (today, page 0, now, rest null), and sets `mainBookId`. Time only through the injected `Clock`.
- One Purpose trim rule in `domain/` (strip; empty → `None`) shared by both intents. `edit-purpose` changes only `purpose` (not `lastProgressUpdate`).
- The trade-off line's numbers come from the home view's `mainBook` (`title`, `currentPage`, `percent`); the client never divides (AD-6). *X* and *Y* in the serif book-title face.
- TR8 for both intents; TR9 on both save surfaces: on `couldnt_save` the dialog/field stays open with the typed Purpose and the `alert` line reads "Couldn't save. Your data wasn't changed." (dialog: above its buttons; Edit Purpose: directly below the field). Confirm is `aria-disabled` while in flight.
- Confirmed → navigate to `/`, focus the Main book card's title link. Cancel/Esc → nothing sent, focus returns to the opener (popover opener: the spine, since the popover closed).
- WCAG 2.2 AA; axe on the open Start dialog in both themes.

**Never:**
- No `upNextBookId` changes or assertions, no displacement lines, no "Which page?", no Pause, no Finish dialog, no Home panes or empty-card suggestion (Epic 4 / 3.6).
- No new stored fields; no `library.json` shape change. No optimistic updates. No error codes beyond `already_main` and `reading_already_finished`.

**Decisions (defaults, user-visible but low-stakes):**
- `already_main` message: "This book is already your Main book." A stale-tab refusal shows that message in the dialog's `alert` line and keeps it open; the views refetch.
- Popover: **Resume** (primary, `button-primary`, first focus) for a `waiting` Book; a link-styled button "Start reading" (first focus) for a Book with no Reading that was never finished; nothing for a finished Book without a Reading. It sits before "Open book →".
- Edit Purpose: a link-styled `button` "Edit Purpose" beside the Purpose line (shown with or without a Purpose); the field is labelled "Purpose", prefilled; after Save/Cancel focus returns to **Edit Purpose**. Saving empty clears the line.
- `edit-purpose` for a Book with no current Reading (unreachable from the UI): 409 `reading_already_finished` (already planned in AD-9), message "This reading is already finished.", with its API test.

## I/O & Edge-Case Matrix

| Scenario | State | Expected |
|---|---|---|
| Fresh start | Dune never started, no Main | new Reading appended; Dune Main |
| Re-read | Dune finished only | 2nd Reading appended; 1st byte-identical |
| Resume | Dune paused p.120 | same Reading id/page/`pausedAt`; `lastProgressUpdate` = now; Purpose = sent |
| Start with Main *Y* | F451 Main p.120/187 | dialog "This pauses Fahrenheit 451 at p.120 (64%)."; F451 `pausedAt` = today, p.120; Dune Main |
| Main itself | start for Main | 409 `already_main`, bytes unchanged |
| Deleted Book | either intent | 409 `book_not_found` |
| Purpose | `"  x  "` / `"   "` / null | `"x"` / null / null |
| Fault | write/fsync/replace | 503 `couldnt_save`, bytes unchanged |
| Book detail primary | main / waiting / other (finished incl.) | none / **Resume** / **Start reading** |

</frozen-after-approval>

## Code Map

Backend:
- `backend/bookvie/intents/set_spine_color.py`, `intent_model.py` (`IntentModel`, `nullable`, `parse_form_intent`), `commit.py` -- the pattern to copy for both new intents. `add_book.py:51-52` mints ids with `uuid.uuid4()`.
- `backend/bookvie/intents/contract.py:38` `ErrorCode` -- add `ALREADY_MAIN`, `READING_ALREADY_FINISHED`; add `already_main()`, `reading_already_finished()` beside `book_not_found()` (:180).
- `backend/bookvie/domain/progress.py` -- `current_reading`, `reading_status` (reuse). Add `normalize_purpose` here or in a small `domain/purpose.py`.
- `backend/bookvie/domain/clock.py` -- `clock.today()`, `clock.now()`. `app.state.clock` in routes (`http/api.py:362`).
- `backend/bookvie/http/api.py:410-431` -- copy the `set-spine-color` route for `start-reading` (store+clock) and `edit-purpose` (store).
- `backend/bookvie/views/shelf.py` -- unchanged (`_role_reading`, `book_detail` already give `role`/`currentReading.purpose`).
- `backend/tests/test_start_reading.py` -- 3 red leaves; `tests/helpers.py` has `START_READING`, `EDIT_PURPOSE`.

Frontend (`frontend/src`):
- `lib/useAlertDialog.ts:47-87` -- modal lifecycle (showModal, regions adoption, `onCancel`→`onDismiss`). It hard-codes `role: 'alertdialog'` (:72) and `keepFocusInside` (:31-45) cycles only buttons: add a `role` option and include inputs in the cycle, keeping ConfirmDialog/DuplicateDialog unchanged.
- `components/ConfirmDialog.tsx:32-88` + `.module.css` -- busy handling, `regionSlot`/`data-show-alert` alert placement, button order; `components/Button.tsx` (`variant`, `disabledReason`).
- `api/books.ts:95-128` -- `xxxForm`/`xxx`/`useXxx` hook pattern over `sendIntent` (`api/intents.ts:40-55`, never throws, invalidates views); re-export from `api/index.ts`. `api/envelope.ts:16-29` `IntentResult`, `COULDNT_SAVE_MESSAGE`.
- `api/views.ts:70,104` -- `useHomeView`, `useBookView(id)`: the new `StartDialog({bookId, onDone, onCancel})` reads both (title, `currentReading.purpose`, mode from `role`; `mainBook` for the trade-off line).
- `pages/BookDetailPage.tsx:67-106` (owner-side inFlight/refocus/announce pattern), `:119-124` action stack (add the primary first; update the comment at :208-209), `:147-161` Current reading block (Edit Purpose).
- `components/SpinePopover.tsx:36-37,82-86,157-162` -- first-focus comment/effect, actions; `Bookcase.tsx:134-141` `closePopover` focuses the spine. The popover closes, then Bookcase (or the page) renders `StartDialog` and returns focus to the spine on cancel.
- `components/MainBookCard.tsx:38-42` title `Link` (needs a ref); `pages/HomePage.tsx`; `pages/CatalogPage.tsx:30-49,132-145` router-state precedent (`{newBook:true}`, `clearNewBookState`, effect guarded by `location.key` that wins over `PageHeading`'s h1 focus). Use `navigate('/', {state:{started:true}})`.
- No link-styled button class exists (link look is base `a` in `styles/base.css`; `.open` in `SpinePopover.module.css:138`): add one shared class.

E2E (`frontend/e2e`): `start-reading.spec.ts` (8 leaves), `home.ts`, `intents.ts`. `spine-popover.spec.ts` AC-2 :152-172/:500-501 (first focus), AC-3 :199,:213-215 (button count/title), :418-419/:585-586 (button-name slices), :453-456 (Tab order) -- adjust only where the new Start/Resume control changes them.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/domain/` -- `normalize_purpose` + unit tests.
- [x] `backend/bookvie/intents/contract.py`, `intents/start_reading.py`, `intents/edit_purpose.py`, `http/api.py` -- the intents, `already_main`, routes; regenerate `schema.d.ts` (`npm --prefix frontend run api:gen`).
- [x] `backend/tests/test_start_reading.py` -- activate AC-3/4/11; add RDG-API-001 matrix (never started, finished, paused, Main; with/without a Main book) and resume-while-*Y*-Main.
- [x] `frontend/src/api/` -- `useStartReading`, `useEditPurpose`.
- [x] `frontend/src/lib/useAlertDialog.ts`, new `components/StartDialog.tsx(+.module.css)` -- the dialog.
- [x] `frontend/src/pages/BookDetailPage.tsx`, `components/SpinePopover.tsx`, `Bookcase.tsx` -- openers; Edit Purpose.
- [x] `frontend/src/pages/HomePage.tsx`, `components/MainBookCard.tsx` -- focus the title link after a confirmed start.
- [x] `frontend/e2e/start-reading.spec.ts`, `spine-popover.spec.ts` -- activate the 8 leaves; fix the pinned popover tests; add the checklist's green follow-ups (dialog couldn't-save + `aria-disabled`, blank Purpose → null, finished-Book re-read via UI, no primary for Main, no trade-off line without Main, *Y* "waiting for you, page 120" after, stale-tab `already_main`, popover Cancel → spine, Edit Purpose empty/focus/paused, axe on the dialog).
- [x] `README.md` -- Epic 3 status line (start/resume from Book detail or the shelf).

**Acceptance Criteria:**
- Given the ATDD leaves, when activated, then `pytest tests/test_start_reading.py` and `e2e/start-reading.spec.ts` pass.
- Given the whole suite, when `npm run check` runs, then it passes, including coverage gates and `check:api`.

### Review Findings

Code review pass 2 (2026-11-05). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Acceptance Auditor (AA), Spine Check (SC). Diff `ff1334f..2f9649f`, without `_bmad-output/`.

- [x] [Review][Patch] README status still says "17 of 41 stories done" though 3.1 is `done` (18 of 41) [README.md:8]
- [x] [Review][Patch] A long unbroken Purpose (a URL, say) overflows Book detail's Current reading block: the value `<span>` has no `overflow-wrap`/`min-width: 0` [frontend/src/components/EditPurpose.module.css:15]
- [x] [Review][Patch] Esc cancels Edit Purpose only while focus is in the field; on Save or Cancel it does nothing (move the handler to the form) [frontend/src/components/EditPurpose.tsx:130]
- [x] [Review][Patch] Module docstring still says "Three ATDD tests" after the green-phase tests were added [backend/tests/test_start_reading.py:3]
- [x] [Review][Patch] No e2e pins the Bookcase fallback: a popover-opened Start dialog whose Book is deleted elsewhere should close (`gone` → `onCancel`) and focus the shelf or `main`, not `body` [frontend/src/pages/Bookcase.tsx] — the new leaf failed: the `book` view went missing first, focus returned to the still-rendered spine, then the catalog refetch removed it and focus fell to `body`; fixed with a second fallback effect on the shelf's `ids`
- [x] [Review][Defer] Up next / Side-read start: 500 on `main_not_up_next`/`main_not_side_read`; Book detail's "Start reading" (from `role`) vs the dialog's Resume (from `currentReading`) and the server's resume; `upNextBookId`-untouched docstring reads as safe [backend/bookvie/intents/start_reading.py, frontend/src/lib/startReading.ts, frontend/src/components/StartDialog.tsx:37] — deferred: already recorded from pass 1 (SC1, BH1/BH2); unreachable until Story 4.1
- [x] [Review][Defer] ARCHITECTURE-SPINE.md drift: Structural Seed misses `start_reading`/`edit_purpose`/`domain/purpose` (and still says `reading_status` planned); IDs convention vs `start-reading` returning no `ids` [docs ARCHITECTURE-SPINE.md] — deferred: already recorded from pass 1 (SC2, SC3); spine-doc edit
- [x] [Review][Defer] README's "Test automation summary (currently story 2.3)" pointer is stale; the summary is at story 3.1 [README.md:180] — deferred: pre-existing, not caused by this change

Rejected:
- EC: home view failing mid-flight unmounts the dialog — low, unlikely on localhost; same as pass 1 EC4/BH5b, fix adds guards.
- EC: `started` state stays in history when Home arrives failed or without a Main — low, unlikely; fix adds a branch.
- EC+BH: focus-trap selector `button, input` misses textarea/select/links and disabled controls — false: no modal holds those, and `Button` uses `aria-disabled`, not `disabled` (pass 1 BH6).
- EC+BH: Purpose has no length cap / control characters — false: EXPERIENCE.md says no length limit; the field is one-line and HTML collapses whitespace (pass 1 EC7/BH8).
- BH: a failed home view closes the Start dialog silently — low, unlikely; pass 1 BH13, fix adds a loading/failed state.
- BH: "This reading is already finished." is wrong for a never-started Book — fix edits the spec's frozen Decision; unreachable from the UI.
- BH: resumed Reading keeps a stale `pausedAt` — fix edits the spec (Always: "keeps id/page/`startDate`/`pausedAt`"); AD-19 status comes from `mainBookId`.
- BH: Purpose field editable in flight — false: after couldn't-save the field shows what the user typed, which is what the spec keeps and a retry sends.
- BH: `clearStartedState` uses `history.replaceState` and React Router's `usr` — low, no named harm; mirrors `clearNewBookState`.
- BH: `OpenStartDialog.confirm` lacks a mounted guard — low, unlikely (pass 1 EC4/BH5b); a deleted Book returns `book_not_found`, never ok.
- BH: no test that `upNextBookId` stays untouched — low: Up next is unreachable in 3.2 (see the deferral).
- BH: no `edit-purpose` test on the active Main — false: AC-11 leaf stores `"Why Arrakis"` on Dune's active Reading.
- BH: `_pause_main` early return untested — false: `main_has_unfinished_reading` makes it unreachable.
- BH: no test that `edit-purpose` on `book_not_found` leaves bytes unchanged — false: `test_start_reading.py:214-220` loops both paths and compares `library_bytes`.
- BH: no long-Purpose wrapping test — folded into the overflow patch.
- AA: popover Resume styled via `variant="primary"`, not a literal `button-primary` class — false: that is how the project's `Button` spells `button-primary`.
- AA: dialog mode from `currentReading` vs Code Map's "mode from `role`" — grouped into the Up next deferral (Implementation Notes record the rule).

## Implementation Notes

- `normalize_purpose` lives in `domain/purpose.py`; both intents store the Purpose through it.
- `StartDialog({bookId, onCancel})` navigates to `/` with `{started: true}` itself on success, so there is no `onDone`; both openers only handle Cancel. It freezes Start vs Resume and the Purpose prefill from the `book` view as the opener showed it (Book detail's cached view; the first load for the popover), so a refetch after another tab made the Book Main doesn't flip the heading.
- Start/Resume rules are in `lib/startReading.ts` (`detailPrimary`, `popoverStart`). Only `waiting` is paused (**Resume**); an Up next Book gets **Start reading** on both surfaces until Epic 4 says whether it has a paused Reading (the views carry no Reading for `upNext`).
- Edit Purpose (`components/EditPurpose.tsx`) adopts the live regions into a slot directly below its field only after a failure, so the `alert` line shows there.
- `test_intent_routes.py` gained `start-reading`/`edit-purpose` in `INTENT_ROUTES`; `edit-purpose`'s foreign-caller control starts Dune first (`_ready`).
- Existing tests changed: `spine-popover.spec.ts` (Neuromancer's popover now focuses "Start reading"; AC-3 comment), `home.spec.ts` AC-9 (the bare paused Book shows **Edit Purpose** but no Purpose line), `test_contract.py` (enum and documented operations).

- Verified by the orchestrator against the diff since `baseline_commit`: `npm run check` green (pytest with coverage gates, `check:api`, e2e 221 passed, smoke ok); after the `upNext` narrowing, `check:api` re-run green (node 170/0). Blank-line PEP 8 fixes in `http/api.py` and `contract.py`. Matrix audit: all 9 rows covered by passing tests.
- Review pass 1 patches applied: popover gives Up next no start action (frozen decision); Bookcase Cancel falls back to `#main` when the spine is gone; e2e leaves for the Start dialog Tab cycle, the `{started}` hand-off after reload/Back/Forward, and focus after a stale-tab Cancel; test blank lines and a rename. Re-verified with `npm run check`, all green: 931 pytest, e2e 223, smoke ok. Deferred: Up next/Side-read start (Story 4.1) and spine drift (deferred-work.md).

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| SC1+EC1 | `start-reading` for an Up next or Side-read Book makes it Main while it stays Up next/side: `main_not_up_next`/`main_not_side_read` fail → 500 | medium | Real, but unreachable in 3.2: no intent sets Up next or Side read (Epic 4), only seeds. The intent excludes it (Never: no `upNextBookId` changes; Story 4.1 decides). | defer |
| BH1+BH2+EC2+VG-other | Up next Book with a paused Reading: views give `currentReading` null, so the dialog says "Start" while the server resumes and overwrites the Purpose with the empty field; opener label and dialog mode come from different sources | medium | Same unreachable Up next state as SC1; `_role_reading` returns `("upNext", None)` (3.1 deferral). | defer (with SC1) |
| BH3 | `popoverStart` returns Start reading for a finished Up next Book, against the frozen popover decision | low | Orchestrator's own narrowing added the `upNext` line; frozen text says nothing for a finished Book without a Reading. Direct deletion. | patch |
| VG1 | Tab/Shift+Tab inside the Start dialog untested though the trap now includes inputs | gap (pre-verified) | No Tab presses in `start-reading.spec.ts`. | patch |
| VG2 | `{started:true}` hand-off untested after reload/Back/Forward | gap (pre-verified) | Only `newBook` has that test (`home.spec.ts:370`). | patch |
| VG3 | Stale-tab Cancel never asserts focus (the `#main` fallback) | gap (pre-verified) | AC-4 stale-tab leaf checks only dialog count. | patch |
| EC5+BH5a | Popover-opened dialog cancelled after the spine left the shelf: focus falls to `body` | low | `buttons.current.get(id)` is undefined after a refetch removes it; one-line fallback. | patch |
| BH10 | Three blank lines before the activated AC-3/4/11 `def`s | low | Direct fix. | patch |
| BH11d | `test_start_reading_with_a_malformed_intent_is_422` also covers `edit-purpose` | low | Direct rename. | patch |
| SC2 | Convention "server-minted UUIDs returned in success `ids`": `start-reading` mints a Reading id, returns none | low | No consumer needs a Reading id (intents address `bookId`); spine wording drift. | defer |
| SC3 | Structural Seed lists for `intents/` and `domain/` miss `start_reading`, `edit_purpose`, `domain/purpose` | low | Spine-doc drift, as 3.1's SC2. | defer |
| EC3 | Network failure after commit, then a retry gets `already_main` and the dialog stays open | low | Unlikely on localhost; the fix adds a branch. | reject |
| EC4+BH5b | Book deleted in another tab while `start-reading` is in flight: dialog unmounts, alert may not be read | low | Unlikely; React ignores state on unmounted; Book detail shows not found. Fix adds guards. | reject |
| EC6 | Edit Purpose refused (stale tab) keeps the field open | low | The refusal message shows in the alert line; Cancel closes. Unlikely; fix adds a branch. | reject |
| EC7+BH8 | Purpose has no length cap | false | EXPERIENCE.md → Book detail: "The field is optional with no length limit". | reject |
| BH4 | Sprint status `in-progress` vs spec `in-review` | false | Mid-run; step-05 syncs the sprint entry to review. | reject |
| BH6 | `keepFocusInside` selector misses textarea/select/links, disabled/hidden inputs | false | No modal holds any of those; hypothetical. | reject |
| BH7 | `clearStartedState` duplicates `clearNewBookState`; `StartedState` type lives in a component | low | No named harm today; fix is a refactor. | reject |
| BH9 | Edit Purpose alert not linked by `aria-describedby`; Save commits an unchanged value | low | The `alert` role announces it; an unchanged commit is harmless. | reject |
| BH11a | No `edit-purpose` test on the active Main Reading | false | AC-11 leaf stores `"Why Arrakis"` on the active Reading. | reject |
| BH11b | `_pause_main` early return untested | false | `main_has_unfinished_reading` invariant makes it unreachable. | reject |
| BH11c | Resumed Reading keeping `pausedAt` not tested as `main` | low | `reading_status` ignores `pausedAt` (AD-19); AC-5 e2e sees Dune as the Main book card after resume. | reject |
| BH12 | `_ready` only in the foreign-caller route test | false | No other test loops over `INTENT_ROUTES` expecting success. | reject |
| BH13 | Start dialog renders nothing until the home view loads; a failed home view cancels silently | low | Local server, sub-second; fix adds a loading state. | reject |

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- all pass, 0 skipped from 3.2
- `npm run check:api` -- clean
- `npm run check` -- green, incl. e2e and coverage gates
