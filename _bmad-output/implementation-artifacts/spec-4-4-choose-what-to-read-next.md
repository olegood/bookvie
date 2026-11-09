---
title: 'Story 4.4: Choose what to read next'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '3074afae4f1860820996acd142a067ba6f5199d3'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md'
warnings:
  - oversized
deferred:
  - summary: >-
      Spine drift (Capability → Architecture Map, Structural Seed): the FR-7 row and the intents/ module list should name set_up_next.
    evidence: |-
      Story 4.4 adds backend/bookvie/intents/set_up_next.py and POST /intents/set-up-next; the ATDD checklist's
      "Spine drift to expect" names this row. Logged in deferred-work.md, reconciled before the next epic.
    location: >-
      backend/bookvie/intents/set_up_next.py
    severity: low
  - summary: >-
      Spine drift (AD-9, AD-2): the no-op should name the store.UNCHANGED mechanism, and AD-2 should allow a no-write apply.
    evidence: |-
      Store._apply_locked skips the commit when the change returns UNCHANGED (new files removed again), covered by
      tests/test_store_commits.py::test_apply_unchanged_writes_nothing. Logged in deferred-work.md.
    location: >-
      backend/bookvie/store/store.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** Up next only moves as a side effect of starting (4.1) or pausing (4.3). The user can't pick the Book they mean to read next (FR-7, UX-DR28).

**Approach:** Add a `set-up-next` intent that only moves `upNextBookId`, so 4.1's displacement rule falls out of the existing views. Offer **Set as Up next** as a secondary action on Book detail, and as the primary action in the spine popover of a never-read Book, with the hint "Replaces the current Up next." when an Up next exists.

## Boundaries & Constraints

**Always:**
- `set-up-next` request: `{"bookId"}` in the `intent` form part. Checks inside the commit, in order: 409 `book_not_found`; 409 `main_cannot_be_up_next` (new `ErrorCode`, message "Your Main book can't be Up next."); the Book already Up next → 200 `{"ok": true}` with no write at all (AD-9). Otherwise set `upNextBookId` = the Book and nothing else (no Reading, `mainBookId` or `sideReadBookIds` change). A displaced *Z* keeps its Readings, so a paused *Z* shows in Waiting for you and any other *Z* is back in the catalog.
- Standard intent ACs: a write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`; `check_invariants()` holds after every success; a malformed `intent` is 422 `invalid_fields`; OpenAPI documents 409/422/500/503, no 413.
- Book detail: a `button` "Set as Up next" when `role` is neither `main` nor `upNext`, placed directly after the primary (**Start reading** / **Resume**) and before **Pause**, **Mark finished**, **Edit**. It sends at once (no dialog), `aria-disabled` with a reason while in flight, and ignores a second press. On success, once the refetched view shows the Book as Up next, focus moves to the primary (the `h1` if none), then `status` reads "*X* is Up next.".
- Spine popover: for a Book with `role === null` and not finished (never read, no Reading), a `button-primary` "Set as Up next" comes before the link-styled "Start reading" and takes the popover's initial focus. When any shelf Book has `role === 'upNext'`, the hint "Replaces the current Up next." sits under the button and is its `aria-describedby`. On success the popover closes with focus back on its spine, then `status` reads "*X* is Up next.".
- A failure (503 or a refusal) shows "Couldn't save. …" / the refusal message in an `alert` line directly below the button that was pressed, keeps focus on it, and changes nothing. In the popover, the popover stays open. On Book detail, if the refetch has removed the button (a stale tab's refusal), focus goes to the primary (else the `h1`) and the line stays in the slot below where the button was.

**Never:** markers or ", Up next" in spine names (4.6), non-Main finish (4.5), Side-read intents or the On the side pane (4.7). No change to `start-reading`, `pause` or `popoverStart`'s Start/Resume rules. No hand edits to `tokens.css` or `schema.d.ts`, no spine edits (defer drift).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unstarted target, no Up next | Main Dune; Emma never started | `upNextBookId` = Emma; Emma's Readings unchanged | N/A |
| Displace paused Z | Up next Neuromancer paused | Neuromancer in `waiting`, its Book unchanged | N/A |
| Displace unstarted Z | Up next Emma never started | Emma's shelf role `null` | N/A |
| Paused target | Book in Waiting for you | leaves `waiting`; Home Up next `paused: true` (Resume) | N/A |
| Finished target | finished, no unfinished Reading | Up next `paused: false` (Start reading); start appends a re-read | N/A |
| Side read target | Book in `sideReadBookIds` | Up next; `sideReadBookIds` unchanged | N/A |
| Already Up next | target = `upNextBookId` | 200, file untouched even under a write fault | N/A |
| Main book | target = `mainBookId` | nothing changes | 409 `main_cannot_be_up_next` |
| Gone | deleted id | nothing changes | 409 `book_not_found` |
| Fault | write/fsync/rename fails | byte-identical | 503 `couldnt_save`; UI alert line |

</intent-contract>

## Code Map

- `backend/bookvie/store/store.py:398` `Store.apply` / `_apply_locked:424`: add a module-level sentinel `UNCHANGED`. When `change` returns it, undo any `new_files`, skip the commit and return the current library. Export it from `bookvie/store/__init__.py`, widen `intents/commit.py`'s `Change` type, and document it in both docstrings.
- `backend/bookvie/intents/contract.py:38,213`: `ErrorCode.MAIN_CANNOT_BE_UP_NEXT`, `MAIN_CANNOT_BE_UP_NEXT_MESSAGE`, `main_cannot_be_up_next()` shaped like `not_main_book()`.
- `backend/bookvie/intents/set_up_next.py` (new): mirror `intents/pause.py` (`SetUpNextIntent`, `parse_set_up_next_intent`, `set_up_next(store, intent)` with no clock); the change returns `UNCHANGED` for the current Up next. `intents/__init__.py`: export the three names and `main_cannot_be_up_next`.
- `backend/bookvie/http/api.py:524`: `POST /intents/set-up-next` shaped like `pause_intent`, without the clock. Then run `npm --prefix frontend run api:gen`.
- `backend/tests/helpers.py:49` `SET_UP_NEXT`; `test_set_up_next.py` imports it (drop its local copy and the `RED` skips). `test_intent_routes.py:41`: `"set-up-next": {"bookId": DUNE_ID}`, no `_ready` step. `test_contract.py:340,368`: add the route to both lists, plus `main_cannot_be_up_next` to the expected `ErrorCode` enum.
- `backend/tests/test_reading_state_machine.py:212`: a `set_up_next` rule after `pause_main`: expected `book_not_found`, then `main_cannot_be_up_next`. For the current Up next, bytes identical and accepted. Otherwise `self.up_next = book_id` and `_books` is unchanged. Update the docstring (refusals list, Up next model, and drop set-up-next from "Later intents").
- `frontend/src/api/books.ts:118`: `setUpNextForm`, `setUpNext(client, id)` via `sendIntent(client, 'set-up-next', …)`, `useSetUpNext()`; export from `api/index.ts`; a unit test in `books.test.ts` like `pause`'s at `:349`.
- `frontend/src/lib/setUpNext.ts` (+ `setUpNext.test.ts`, new): `upNextStatus(title)` → "X is Up next.", `REPLACES_UP_NEXT`, `SETTING_UP_NEXT = 'Setting the book as Up next.'`, `detailOffersSetUpNext(role)` and `popoverOffersSetUpNext(book)` (`role === null && !finished`).
- `frontend/src/lib/useSetUpNextFlow.ts` (new): `{ request(book: {id,title}), busy, failed, regionSlot }` with an `inFlight` guard, `mounted` ref, and a `useLayoutEffect` adopting the live regions into the slot while `failed` (the pattern in `lib/usePauseFlow.tsx:116-120`, `announce.ts` `adoptRegions`/`releaseRegions`). Options: `opener` ref, `fallback()` for a removed opener, `onSet(title)` called on `ok`.
- `frontend/src/pages/BookDetailPage.tsx:220`: the button + its slot (class `styles.regions`, `data-show-alert`) after the primary. `onSet` stores a pending line; an effect (like the pause one at `:171`) consumes it on the next render: when `book.role === 'upNext'` it focuses `startButton` (else `main h1`), then announces; any other role drops it. Update the docblock at `:323`.
- `frontend/src/components/SpinePopover.tsx`: new prop `hasUpNext: boolean`; the button, the hint `<p id>` and a regions slot (copy `BookDetailPage.module.css:49-` rules into `SpinePopover.module.css`); initial focus `setUpNext ?? start ?? link` at `:93`; on `ok` call `onClose(true)` then `announce('status', …)`. Update the docblock. `frontend/src/pages/Bookcase.tsx:345`: pass `hasUpNext={books.some((b) => b.role === 'upNext')}`.
- `frontend/e2e/intents.ts`: export `SET_UP_NEXT`; `e2e/set-up-next.spec.ts` imports it and its leaves become `test(`.
- `frontend/e2e/spine-popover.spec.ts`, `book-detail.spec.ts`, `pause.spec.ts`, `finish-reading.spec.ts`: re-run; fix any leaf that pins the never-read popover's first focus or the Book detail action stack.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/store/store.py`, `store/__init__.py`, `intents/commit.py` -- the `UNCHANGED` sentinel -- AD-9's no-write no-op, decided under the store lock.
- [x] `backend/bookvie/intents/contract.py`, `intents/set_up_next.py`, `intents/__init__.py`, `http/api.py` -- the intent, refusal and route; regenerate `schema.d.ts` -- FR-7.
- [x] `backend/tests/test_set_up_next.py`, `helpers.py`, `test_intent_routes.py`, `test_contract.py`, `test_reading_state_machine.py` -- activate the 5 ATDD leaves, register the route, add the state-machine rule, and a store unit test that `UNCHANGED` writes nothing -- TR8, RDG-UNIT-002.
- [x] `frontend/src/api/books.ts` (+ test), `api/index.ts`, `lib/setUpNext.ts` (+ test), `lib/useSetUpNextFlow.ts` -- client call, copy and flow.
- [x] `frontend/src/pages/BookDetailPage.tsx` (+ css if needed), `components/SpinePopover.tsx` (+ css), `pages/Bookcase.tsx` -- the two surfaces.
- [x] `frontend/e2e/set-up-next.spec.ts`, `e2e/intents.ts` -- activate the 4 leaves; add: the popover with no Up next (no hint, no description, same focus/status); not offered on the Main book's or the Up next Book's Book detail; the popover 503 (line below the button, focus kept, popover open); a double press on Book detail sends one request (delayed route); axe on Book detail with the button and on the popover with the hint, both themes.
- [x] `README.md` -- Status line gains Set as Up next; add the 4.4 spec and ATDD links after 4.3's.

**Acceptance Criteria:**
- Given a Book that isn't Main and isn't Up next, when I press **Set as Up next** on Book detail, then it becomes Up next, focus lands on the primary button, and only then `status` reads "*X* is Up next.".
- Given a never-read Book's spine popover, when I press **Set as Up next**, then the popover closes, focus is on its spine, and then `status` reads "*X* is Up next."; the hint "Replaces the current Up next." (its accessible description) shows only when an Up next exists.
- Given a routed 503, when I press **Set as Up next**, then "Couldn't save. Your data wasn't changed." shows directly below it, focus stays on it, and `library.json` is unchanged.
- Given the Main book or the current Up next, when I open its Book detail, then **Set as Up next** isn't offered.
- Given a paused Book in Waiting for you, when I set it as Up next, then Home shows it in Up next with **Resume** and Waiting for you no longer lists it.

## Spec Change Log

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 23 findings — high 0, medium 2, low 17, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` VG: no test drives a stale-tab refusal whose refetch removes Set as Up next (fallback focus, line kept in the slot), on Book detail or in the popover — added two e2e leaves to `set-up-next.spec.ts`: the Book made Main through the API, then the press; they assert `main_cannot_be_up_next`'s line, focus on `main h1` (Book detail) or "Open book →" (popover, which stays open), the line's position, an empty `status` and an unchanged `library.json`.
  - `[low]` `[reject]` EC: `failed` stays true until the next press, so the regions stay adopted in the slot — a later alert from a surface that doesn't adopt the regions would need to fail next; `adoptRegions` stacks for the ones that do, and the fix adds a guard.
  - `[low]` `[reject]` EC: success focus pulls the user back if they moved focus during the request — the request is one local round trip, and the fix adds a guard.
  - `[low]` `[reject]` EC: a success after the popover closes mid-request isn't announced — the app's convention announces only failures after unmount (4.3 triage; `PageField.tsx`, `EditPurpose.tsx`); the refetched views show the change.
  - `[low]` `[reject]` EC: the double-press test asserts one request right after the forced click — the assertion after `release()` (once `status` has the line) also checks one request, and a second one would have been issued by then.
  - `[low]` `[reject]` BH: `failed` never clears, and Book detail's two slots can both claim the regions — same as the EC row; `adoptRegions` is a stack, so the later adopter holds them and release restores the earlier.
  - `[low]` `[patch]` BH: the fallback-focus effect has no dependency array, so after a refusal removed the button it pulled focus to the fallback on every later render while focus was on `body` — a `fellBack` ref now moves focus at most once per failure, reset on the next press.
  - `[low]` `[reject]` EC/BH: a success after unmount isn't announced (duplicate of the EC row) — same convention.
  - `[low]` `[reject]` BH: sibling actions (Start reading, Edit, Delete, Open book) stay usable during the request — the spec pins only the second press; one local round trip.
  - `[false]` `[reject]` BH: the pending line on Book detail can go stale if the refetch doesn't change the role — it is said only when the view later shows the Book as Up next, which is then true; any other role drops it.
  - `[medium]` `[patch]` BH: no test for the stale-tab refusal path — same fix as the VG row.
  - `[low]` `[patch]` BH: the pending effect repeats `primaryOrHeading`'s lookup inline — it now calls `primaryOrHeading()`.
  - `[low]` `[reject]` BH: the alert-line CSS is copied into `SpinePopover.module.css` — no named harm; earlier panes copy it too (4.2, 4.3 triage).
  - `[low]` `[reject]` BH: axe doesn't run with the failure line showing — the line reuses the existing alert styles in ink; the spec scoped axe to the button and the hint (as 4.3 did).
  - `[low]` `[reject]` BH: the double-press assertion checks nothing (duplicate of the EC row) — covered by the later assertion.
  - `[low]` `[patch]` BH: README's Status line still said "Stories 4.1-4.3 done" and "27 of 41" — now "4.1-4.4" and "28 of 41".
  - `[low]` `[reject]` BH: the spec's tasks are unticked and its Code Map names files the diff doesn't touch — a spec edit; the boxes are ticked at finalization.
  - `[low]` `[reject]` BH: `no_op` in the store test is unannotated, and a refusal raised before `UNCHANGED` removing `new_files` is untested — no type checker runs over tests; a raise goes through the existing `except BaseException: undo()` path this story didn't change.
  - `[false]` `[reject]` IA: the popover offers Set as Up next more narrowly than the epic's wording — EXPERIENCE.md's Book states table (row "Never read, no Reading") and Spine popover section ("at most one, state-aware") pin it to that row; Design Notes record it.
  - `[low]` `[reject]` IA: displacement is tested only at API level — Home's panes render the same `waiting`/`upNext` view data that 4.1's and 4.2's e2e tests cover.
  - `[low]` `[reject]` IA: the finished and Side-read targets are tested only at API level — the On the side pane is Story 4.7, and **Start reading** for a non-paused Up next comes from `upNextStart`, unit-tested in `startReading.test.ts`.
  - `[false]` `[reject]` IA: the `h1` fallback can't be reached — the stale-tab refusal on Book detail reaches it (a Book now Main has no primary), and the new e2e leaf asserts it.
  - `[false]` `[reject]` IA: sprint status still `backlog` — finalization sets `4-4-choose-what-to-read-next: done`.

## Design Notes

- **No-op mechanism:** `Store.apply`'s lock isn't reentrant, so the "already Up next" check can't sit outside `commit()` without a race. A returned `UNCHANGED` sentinel keeps every check inside the one locked change and lets the store skip the write. Only `set-up-next` uses it; other intents keep committing as before. The client still invalidates views on the no-op (harmless, and a stale tab catches up).
- **Popover scope:** only the "Never read, no Reading" Book-states row has Set as Up next as the popover primary. A finished Book with no role sets it from Book detail; a paused Book's popover keeps **Resume** alone.
- **Focus timing on Book detail:** `sendIntent` resolves after the views refetched, so the render carrying `onSet`'s state change already has the fresh `book`. The primary normally exists both before and after (its label doesn't change), but the button itself unmounts, so focus is moved in the effect, before the announcement.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, including `test_set_up_next.py` (5) and the state machine.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/set-up-next.spec.ts e2e/spine-popover.spec.ts e2e/book-detail.spec.ts e2e/pause.spec.ts e2e/finish-reading.spec.ts e2e/home.spec.ts e2e/up-next.spec.ts e2e/waiting-for-you.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0 (formatters, oxlint, tsc, `schema.d.ts` in sync, coverage gates).

## Auto Run Result

Status: done

**Summary:** Story 4.4 adds the `set-up-next` intent. It moves only `upNextBookId`, so a displaced paused Up next lands in Waiting for you and any other one returns to the catalog. The Main book is refused with 409 `main_cannot_be_up_next`, and the current Up next is a 200 no-op that writes nothing: the change returns the new `store.UNCHANGED` sentinel, decided under the store lock. Book detail offers **Set as Up next** as a secondary action after the primary. A never-read Book's spine popover offers it as its primary, with the hint "Replaces the current Up next." when an Up next exists. After success, focus lands on the primary (or the spine), then `status` reads "*X* is Up next.". A failure shows its line directly below the button with focus kept, and a stale tab's refusal moves focus to the fallback.

**Files changed:**
- `backend/bookvie/store/store.py`, `store/__init__.py`, `intents/commit.py`: the `UNCHANGED` sentinel and its no-write path.
- `backend/bookvie/intents/set_up_next.py` (new), `intents/contract.py`, `intents/__init__.py`, `http/api.py`: the intent, the refusal and the route.
- `backend/tests/test_set_up_next.py` (5 ATDD leaves active), `test_reading_state_machine.py` (`choose_up_next` rule), `test_contract.py`, `test_intent_routes.py`, `helpers.py` (`SET_UP_NEXT`, `seeded_store`).
- `backend/tests/test_store.py` split: commit tests moved to the new `test_store_commits.py` (the TEA hook's 1000-line limit), with `test_apply_unchanged_writes_nothing`.
- `frontend/src/api/books.ts` (+ test), `api/index.ts`, `api/generated/schema.d.ts` (regenerated).
- `frontend/src/lib/setUpNext.ts` (+ test, new): copy and where it is offered. `lib/useSetUpNextFlow.ts` (new): the flow.
- `frontend/src/pages/BookDetailPage.tsx` (+ css), `components/SpinePopover.tsx` (+ css), `pages/Bookcase.tsx` (`hasUpNext`).
- `frontend/e2e/set-up-next.spec.ts` (4 ATDD leaves active, 7 more), `e2e/intents.ts`, `spine-popover.spec.ts` and `start-reading.spec.ts` (the never-read popover's first focus is now Set as Up next).
- `README.md`: Status line and the 4.4 spec and ATDD links. `deferred-work.md`: two spine drift entries.

**Review:**
- 23 findings. Patched: 1 medium entry (the stale-tab refusal tests, raised by two layers) and 3 low (fallback focus once per failure, `primaryOrHeading()` reuse, README counts).
- Deferred: 2 spine drift entries (the FR-7 map row and seed list; AD-9/AD-2's no-write mechanism), from the ATDD checklist's expected drift, logged in `deferred-work.md`.
- Rejected: everything else, with the reasons in the triage log above.

**Follow-up review recommended:** false. Patched at entry verdict: high 0, medium 1, low 3.

**Verification:** `TZ=Europe/Madrid npm run check` exited 0 after implementation and again after the patches: ruff and formatters clean, pytest 1096 passed with the coverage gates met, Prettier, oxlint (only the two older `usePauseFlow.tsx` warnings), tsc and `schema.d.ts` in sync, node unit tests pass, e2e 353 passed (11 in `set-up-next.spec.ts`), smoke ok. Every I/O matrix row has a covering test that ran and passed.

**Residual risks:**
- The e2e suite runs Chromium only; the popover's press handling in Safari and Firefox is the open 4.3 deferral.
- Book detail's pending line waits for the Book's role to change after the refetch; a refetch that fails leaves it pending until the view next shows the Book as Up next.
