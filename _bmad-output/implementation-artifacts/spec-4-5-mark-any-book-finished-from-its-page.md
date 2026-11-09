---
title: 'Story 4.5: Mark any book finished from its page'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '38fb7fc7bfe9822ed9b9f7fb24a9aea7979e499e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      Spine drift (AD-7, AD-19, FR-14 map row): the spine describes only the Main finish carried to Home; it should name the non-Main finish that stays on Book detail, and finish-reading's back-fill and Up next / Side-read clearing.
    evidence: |-
      ARCHITECTURE-SPINE.md AD-7's rule (finish moment as router state to Home) and AD-19's "Finishing" bullet predate Story 4.5;
      backend/bookvie/intents/finish_reading.py now back-fills a Reading for a Book with no Readings and clears upNextBookId and
      sideReadBookIds, and FinishDialog's onFinishedHere keeps a non-Main finish on Book detail. Logged in deferred-work.md.
    location: >-
      backend/bookvie/intents/finish_reading.py
    severity: low
---

<intent-contract>

## Intent

**Problem:** Book detail offers **Mark finished** only for the Main book. A paused Book, an Up next or a Book never read in bookvie can't be closed out, and `finish-reading` refuses a Book with no Reading (FR-14, UX-DR41).

**Approach:** Extend `finish-reading`'s non-Main paths. If the Book has no Reading, create a back-filled one. In the same commit, clear the finished Book from `upNextBookId` and `sideReadBookIds`. Offer **Mark finished** on Book detail for any Book that is Main, paused or never finished. A non-Main finish reuses the Finish dialog but keeps the user on Book detail.

## Boundaries & Constraints

**Always:**
- `finish-reading` checks inside the commit, in this order:
  1. The Book is gone: 409 `book_not_found`.
  2. The Book has Readings but none unfinished: 409 `reading_already_finished`, whether or not it is Up next.
  3. Otherwise the same 422 field checks as before. `finishedOn` before the Reading's `startDate` gets Story 3.6's message. A back-fill has no start date and no Purpose, so a non-null `purposeFulfilled` is the existing "needs a Purpose" field error.
- **The finish itself:**
  - A Book with no Reading gets a new Reading built like `book_form.backfill_reading`:
    - `startDate: null`, `currentPage` = `finishedPages` = pages, the sent `finishDate`;
    - `purposeFulfilled: null`, the sent `rating`;
    - every other field null.
  - Otherwise the current Reading is finished exactly as today.
  - Then `mainBookId` is cleared only if it names this Book, `upNextBookId` is cleared if it names this Book, and the Book is removed from `sideReadBookIds`.
  - Nothing else changes. Waiting for you drops the Book because its Reading is no longer paused.
- Standard intent ACs on the non-Main paths (paused and back-fill):
  - a write, fsync or rename fault leaves `library.json` byte-identical and returns 503 `couldnt_save`;
  - `check_invariants()` holds after every success.
- **Book detail:** **Mark finished** appears when `role === 'main'`, when `currentReading !== null`, or when `!finished`. It sits in its current slot, after **Pause**. A finished Book with no Reading in progress doesn't get it, even when it is Up next.
- **Finish dialog:** unchanged, including when the Purpose question shows and how refusals and 503s render. When the view it opened with has a `role` other than `main`:
  - a successful **Done** calls the opener's `onFinishedHere(title)` instead of navigating Home;
  - no finish moment and no `FinishedState`.
- **After a non-Main finish on Book detail:**
  - the dialog closes and the page stays at `/book/:id`;
  - once it has unmounted, focus goes to `main h1`, then the `status` region reads "Finished *X*.";
  - the Readings block lists the finished Reading.

**Never:** markers or state strings on spines or Book detail (4.6), Side-read intents or the On the side pane (4.7). Mark finished in the spine popover or on Home. No change to the Main book's finish (navigation to Home, the finish moment, 3.6's focus rules). No hand edits to `tokens.css` or `schema.d.ts`, and no spine edits (defer drift).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paused Up next | Main Dune; Up next Neuromancer paused p.50 | Reading finished; `mainBookId` Dune; `upNextBookId` null | N/A |
| Waiting Book | paused, not Up next | finished; not in Home `waiting`; pointers unchanged | N/A |
| No Reading | Emma, no Readings, Up next; Finished on 2019-08-14 | one back-filled Reading; shelf `finished: true`; `upNextBookId` null | N/A |
| Side read | paused Book in `sideReadBookIds` | finished; removed from `sideReadBookIds` | N/A |
| Finished, no Reading in progress | all Readings finished (Up next or not) | nothing changes | 409 `reading_already_finished` |
| Before start | paused Reading started 2026-10-01; 2026-09-30 | nothing changes | 422 `finishedOn` "Finished on can't be before 1 October 2026, when this reading started." |
| Back-fill + answer | no Reading; `purposeFulfilled: "yes"` | nothing changes | 422 `purposeFulfilled` |
| Fault | write/fsync/rename fails (paused, back-fill) | byte-identical | 503 `couldnt_save`; dialog alert line |

</intent-contract>

## Code Map

- `backend/bookvie/intents/finish_reading.py:113` `finish_reading.change`:
  - When `current_reading(book)` is `None` and `book.readings` is empty, validate against a back-fill candidate (`start_date=None`, `purpose=None`). Reuse `intents/book_form.py:89` `backfill_reading` (id `str(uuid.uuid4())`) for the stored Reading, setting `rating` from the intent.
  - After `replace_book`, clear `up_next_book_id` and filter `side_read_book_ids`.
  - Update the module docstring: no-Reading back-fill, the pointers cleared, and the refusal wording ("has Readings but none unfinished").
- `backend/tests/test_finish_any_book.py` (new): FIN-API-002 and every matrix row, seeded with `tests/builder.py` `LibraryBuilder` (`.up_next`, `.side_read`, `.reading`).
  - Asserts the stored document through `stored_book`, `library_bytes` and `assert_invariants`.
  - Asserts Home's `waiting` and the shelf's `finished` through the view routes.
  - Covers the fault rows with `FaultyFs` steps, as `test_finish_reading.py:303` does.
- `backend/tests/test_finish_reading.py:415`:
  - fix the comment that says the UI only offers Main;
  - `:394` still holds (a Main finish leaves another Up next alone);
  - check any test that expects `reading_already_finished` for a Book with no Readings.
- `backend/tests/test_reading_state_machine.py:337` `finish` rule:
  - A Book with no Readings now expects success. Model it as one new Reading with `startDate` null, `currentPage` and `finishedPages` = pages, `purpose` null, `lastProgressUpdate` and `pausedAt` null, plus the sent answers. Compare it ignoring its id.
  - `purposeFulfilled` sent with no Purpose is `invalid_fields`.
  - After a success, `upNextBookId` is None if it was this Book, and `sideReadBookIds` loses it.
  - Update the docstring ("a finish leaves it alone" → clears it when it names the finished Book).
- `frontend/src/lib/markFinished.ts` (+ `markFinished.test.ts`, new):
  - `detailOffersFinish(book: Pick<BookDetailView,'role'|'currentReading'|'finished'>)`;
  - `finishedStatus(title)` → "Finished *X*.".
- `frontend/src/components/FinishDialog.tsx`:
  - New optional prop `onFinishedHere?: (title: string) => void`.
  - In `confirm`'s `ok` branch, when `book.role !== 'main'` and the prop is set, call it instead of `navigate('/')`.
  - Update the docblock at `:292`.
- `frontend/src/pages/BookDetailPage.tsx`:
  - `canFinish` at `:178` becomes `detailOffersFinish(book)`; `canPause` stays Main only.
  - `BookDetailPage` (`:418`): pass `onFinishedHere` to the hosted `FinishDialog`. It sets `finishingId` to null and records the line plus a counter. An effect (like `finishRefocus` at `:432`) focuses `main h1`, then `announce('status', line)`.
  - Update the docblock (`:381`, `:390`).
- `frontend/e2e/finish-reading.spec.ts:158`: Dune there has no Reading, so it now offers **Mark finished**. Change that leaf to assert no **Mark finished** on a finished Book with no Reading in progress.
- `frontend/e2e/finish-any-book.spec.ts` (new): reuse `e2e/library.ts` seeding, `e2e/intents.ts` and the helpers in `finish-reading.spec.ts`. Copy them locally if they aren't exported.
- `README.md`: Status line gains "mark any book finished"; "Stories 4.1-4.5 done", "29 of 41"; add the 4.5 spec link after 4.4's.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookvie/intents/finish_reading.py` -- back-fill, Up next and Side-read clearing, docstring -- FR-14, FIN-API-002.
- [x] `backend/tests/test_finish_any_book.py`, `test_finish_reading.py`, `test_reading_state_machine.py` -- every matrix row, faults on both non-Main paths, the updated model -- TR8, RDG-UNIT-002.
- [x] `frontend/src/lib/markFinished.ts` (+ test) -- offer rule and status copy.
- [x] `frontend/src/components/FinishDialog.tsx`, `frontend/src/pages/BookDetailPage.tsx` -- offer, stay on page, focus, then announce.
- [x] `frontend/e2e/finish-any-book.spec.ts`, `finish-reading.spec.ts` -- the ACs below, plus:
  - a paused Book before its start (message under the field, dialog open);
  - a routed 503 on a non-Main finish (the alert line in the dialog, `library.json` unchanged);
  - the finished Book offers no **Mark finished**.
- [x] `README.md` -- status line, counts, spec link.

**Acceptance Criteria:**
- **Paused Up next with a Purpose:**
  - Given this Book with Main Dune, when I press **Mark finished** on its Book detail, then the Finish dialog shows the Purpose question.
  - When I then press **Done**, I stay on Book detail with focus on its `h1`, and only then `status` reads "Finished *X*.".
  - Home still shows Dune as Main, with no Up next and no Waiting for you row for *X*.
- **Waiting Book:** Given a paused Book in Waiting for you, when I finish it from Book detail, then Waiting for you no longer lists it and the Main book is unchanged.
- **Never-read Up next:**
  - Given an Up next Book with no Reading, when I mark it finished on 14 August 2019, then the dialog asks no Purpose question.
  - Its Readings block lists a finish on 14 August 2019, its spine on the Catalog bookcase is drawn as read, and Home has no Up next.
- **Finished Book:** Given a finished Book with no Reading in progress (Up next or not), when I open its Book detail, then **Mark finished** isn't offered.

## Spec Change Log

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 21 findings — high 0, medium 2, low 13, false 6, maybe-false 0
- findings:
  - `[low]` `[reject]` (edge-case) The Book becomes Main in another tab after the dialog opens: the server finishes it as Main while this tab stays on Book detail with no finish moment — real but needs a cross-tab race inside an open dialog; accepted as last-write-wins (AD-3, Design Notes), and the refetched views are already in; the fix adds a branch on post-refetch state that can't distinguish the cases (the role is null after either finish).
  - `[false]` `[reject]` (edge-case) With a missing/failed view after the refetch there is no `main h1`, so focus is lost — `FailedBook` and `NotFoundPage` both render a `PageHeading` h1, so `main h1` always resolves; a missing view after a successful finish also needs a concurrent delete.
  - `[false]` `[reject]` (intent) Side-read removal goes beyond the story's ACs — epic-4-context states "A Side read that becomes Main or is finished leaves the Side reads" and lists Side-read removal among each intent's consequences in one commit; it is in the intent.
  - `[low]` `[reject]` (intent) "No finish moment plays" is only true by construction — the e2e asserts the URL stays on Book detail, and the moment exists only as router state on navigation to Home, which the non-Main path never makes; a dedicated assertion adds little.
  - `[low]` `[reject]` (intent) "Its spine takes its color" is checked through the catalog's `finished` flag and the spine's accessible name, not visually — the read-spine drawing from `finished` is Story 1.10/3.7 code covered by their bookcase tests.
  - `[false]` `[reject]` (intent) No new `book_not_found` test on the non-Main paths — the check runs first, before the back-fill branch, unchanged; the state machine's delete-then-finish sequences and test_finish_reading cover it.
  - `[medium]` `[patch]` (intent) The stale-hand-offs reorder leaves "paused elsewhere before the dialog opens" untested — grouped with the verification-gap finding below; patched by the new leaf.
  - `[medium]` `[patch]` (verification-gap) F-R3 was reordered so the Book is Main at open; nothing pins Done staying on Book detail when the Book stopped being Main before the click — added a leaf to `e2e/stale-hand-offs.spec.ts` in the original order asserting the URL, `h1` focus, "Finished The Left Hand of Darkness.", stored `mainBookId` = Dune and the finish date.
  - `[low]` `[patch]` (blind) The finish-reading route docstring (and so `schema.d.ts`) still described only the Main finish — reworded in `http/api.py` and regenerated `schema.d.ts` with `api:gen`.
  - `[low]` `[reject]` (blind) The state machine's Side-read assertion compares empty lists, because no rule adds Side reads — true today; Story 4.7 adds the side-read intents to this machine (epic-4-context), when the assertion starts to bite; removing it now only to re-add it is churn.
  - `[false]` `[reject]` (blind) README says 4.5 is done but `sprint-status.yaml` is unchanged — finalization sets 4.5 to done in the same commit.
  - `[false]` `[reject]` (blind) The spec is missing from the diff and there's no ATDD checklist — the spec is committed with the story (excluded from the review diff by design), and no ATDD scaffold was generated for 4.5, so there is no checklist to link.
  - `[low]` `[patch]` (blind) The `finishRefocus` comment said the opener goes when the Book isn't Main any more — reworded: it is gone when a refetch says the Book is finished (no Reading in progress) or gone.
  - `[false]` `[reject]` (blind) An opener that omits `onFinishedHere` sends a non-Main finish Home — the documented default ("Without it, every finish goes Home"); the other openers (Home's Main card, the last-page save) are Main-only, and their stale-tab cases are 3.6/retro-22 behavior covered by `stale-hand-offs.spec.ts`.
  - `[low]` `[reject]` (blind) The reverse stale-tab case is untested — same race as the first edge-case row, rejected there.
  - `[low]` `[reject]` (blind) No e2e back-fills a plain catalog Book with no role, or a Side read — same client path as the Up next back-fill e2e (the dialog doesn't look at the role beyond `main`); the API tests and `detailOffersFinish` unit tests cover the variants.
  - `[low]` `[reject]` (blind) No API back-fill test with both a Main book and an Up next left untouched — the state machine asserts `mainBookId` and `upNextBookId` after every finish from random states, including back-fills of the seeded never-started Dune.
  - `[low]` `[reject]` (blind) The focus-before-status check runs in one e2e only — one code path (`BookDetailPage`'s effect) serves every non-Main finish; the other tests check both end states.
  - `[low]` `[patch]` (blind) The back-fill candidate is built already finished — added a comment in `finish_reading.py` that the checks read only its null `start_date` and `purpose` and its finish fields are overwritten.
  - `[low]` `[reject]` (blind) `book-detail.spec.ts` swaps End for `setSelectionRange` — the test is about the tag suggestions, not caret keys; End's macOS behavior depends on page height, which made the leaf platform-flaky.
  - `[low]` `[defer]` (blind) No spine drift logged for the non-Main finish — real: AD-7 and AD-19's "Finishing" describe only the Main finish; logged as spine drift in `deferred-work.md` and the frontmatter `deferred` list.

### 2026-11-10 — Code review pass (epic 4 retro item 43)
- scope: `4e38808^..4e38808`, full mode, five layers (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor, spine-check), none failed; verification-gap found no gaps. Each finding was checked against master at `0298555`, since 9 of the diff's 18 files have changed since; none was already fixed.
- verdicts: 18 findings — high 0, medium 0, low 9, false 9, maybe-false 0
- findings:
  - [x] [Review][Patch] `[low]` The stale-tab leaf for a Book paused elsewhere doesn't assert the pointer it exercises (BH): the other tab's start makes the Book Up next, so its finish must clear `upNextBookId`. [frontend/e2e/stale-hand-offs.spec.ts:178]
  - [x] [Review][Patch] `[low]` `EMMA_ID` sits between a doc comment and the constant it describes (BH), so the comment attaches to the wrong declaration. [frontend/e2e/finish-reading.spec.ts:59]
  - [x] [Review][Defer] `[low]` The drift entry names the "FR-14 map row" without saying what changes, and omits AD-18 (SC, BH) [ARCHITECTURE-SPINE.md:364] — deferred: spine drift, reconciled before the next epic (item 38).
- rejected:
  - `[false]` SC: AD-7 has no matching spine edit — already logged as spine drift, as AGENTS.md requires.
  - `[false]` SC: AD-19's "Finishing" has no matching spine edit — already logged in the same entry.
  - `[false]` SC: the spec states drift with no spine edit — that is the per-epic policy working as intended.
  - `[false]` BH: Measured pace counts paused time as reading days — the PRD addendum records this as an accepted decision (`addendum.md:57`).
  - `[false]` BH: the routed 503's `library.json` assertion can't fail — another write from the page would change it; the real fault path is proven at API level, and the assertion is the convention in six specs.
  - `[false]` BH: nothing shows the in-memory library survives a failed commit — `test_store_commits.py:63` and `:108` assert `store.library is old` under faults, and every intent commits through that path.
  - `[false]` BH: `detailOffersFinish`'s `role === 'main'` clause is dead — it spells out the spec's rule and has no bad outcome.
  - `[false]` BH: the story reached `done` without the pipeline — that rule entered AGENTS.md later (`0bebca6`, item 40), and item 43 is this review.
  - `[false]` BH: a back-fill silently defaults to today — Finished on is a visible field, focused when the dialog opens, and the user presses Done.
  - `[low]` AA: Home's Finish dialog can still play the moment for a non-Main finish — needs a cross-tab pause during a last-page save; the moment is still for a Book really finished, and `FinishDialog.tsx:317` documents the opener rule.
  - `[low]` EC: a route change during the request focuses another Book's `h1` and announces there — one local round trip plus browser Back; the fix adds a guard.
  - `[low]` BH: the same route-change race — duplicate of the EC row.
  - `[low]` BH: the focus-before-status check can't catch a reversed order, because `announce` waits 100 ms — true of the shared `watchStatus` helper; a real check needs spying on both calls, and the code path is two adjacent lines.
  - `[low]` BH: the spec's Code Map, Verification and Change Log omit files the diff changed — the fix edits this spec.

## Design Notes

- **Who decides "non-Main":** the dialog uses the `book` view fetched when it opened, which is already fixed for the Purpose question. If another tab made the Book Main meanwhile, the server finishes it as Main (it clears `mainBookId`) while this tab stays on Book detail. That is acceptable last-write-wins (AD-3): the refetched views are already in.
- **Back-fill validation:** build the candidate before the field checks, so the start-date and Purpose checks run unchanged against a Reading whose `start_date` and `purpose` are null.

## Verification

**Commands:**
- `cd backend && TZ=Europe/Madrid uv run pytest` -- expected: all pass, including `test_finish_any_book.py` and the state machine.
- `TZ=Europe/Madrid npm --prefix frontend run e2e -- e2e/finish-any-book.spec.ts e2e/finish-reading.spec.ts e2e/finish-moment.spec.ts e2e/book-detail.spec.ts e2e/home.spec.ts e2e/up-next.spec.ts e2e/waiting-for-you.spec.ts` -- expected: all pass.
- `TZ=Europe/Madrid npm run check` -- expected: exit 0.

## Auto Run Result

Status: done

**Summary:** Story 4.5 extends `finish-reading` to every non-Main path. A Book with no Readings gets a back-filled Reading (no start date, no Purpose, `currentPage` = `finishedPages` = pages, the sent date and rating). A Book whose Readings are all finished is still refused with 409 `reading_already_finished`, Up next or not. In the same commit the finished Book leaves Up next and the Side reads; `mainBookId` is cleared only when it names the Book. Book detail offers **Mark finished** for the Main book, any Book with a Reading in progress, and any Book never finished. For a Book that wasn't Main when the Finish dialog opened, Done keeps the user on Book detail: focus goes to the `h1`, then `status` reads "Finished *X*.", with no finish moment.

**Files changed:**
- `backend/bookvie/intents/finish_reading.py`: back-fill, Up next and Side-read clearing, docstring. `http/api.py`: route docstring; `frontend/src/api/generated/schema.d.ts` regenerated.
- `backend/tests/test_finish_any_book.py` (new, 16 tests incl. faults on both paths), `test_reading_state_machine.py` (finish rule models the back-fill and pointer clearing), `test_finish_reading.py` (comments).
- `frontend/src/lib/markFinished.ts` (+ test, new): `detailOffersFinish`, `finishedStatus`.
- `frontend/src/components/FinishDialog.tsx`: `onFinishedHere` for a non-Main finish. `frontend/src/pages/BookDetailPage.tsx`: the offer, then focus and announcement after a non-Main finish.
- `frontend/e2e/finish-any-book.spec.ts` (new, 6 tests); `finish-reading.spec.ts` (AC-1's no-offer check uses a finished Book); `stale-hand-offs.spec.ts` (F-R3 reordered, plus a leaf for the original order); `book-detail.spec.ts` (Tags caret set directly, macOS End).
- `README.md`: Status line, counts, 4.5 spec link. `deferred-work.md`: one spine drift entry. `sprint-status.yaml`: 4.5 done.

**Review:**
- 21 findings. Patched: 1 medium entry (the stale-tab order left untested, raised by two layers) and 3 low (route docstring + schema, stale `finishRefocus` comment, back-fill candidate comment).
- Deferred: 1 spine drift entry (AD-7, AD-19 and the FR-14 row don't describe the non-Main finish).
- Rejected: everything else, with the reasons in the triage log above.

**Follow-up review recommended:** false. Patched at entry verdict: high 0, medium 1, low 3.

**Verification:** `TZ=Europe/Madrid npm run check` exited 0 after implementation and again after the patches: ruff and formatters clean, pytest 1112 passed with the coverage gates met (domain 100%, intents+store 97.85%), Prettier, oxlint, tsc and `schema.d.ts` in sync, node unit tests pass, e2e 360 passed. Every I/O matrix row has a covering test that ran and passed.

**Residual risks:**
- A Book made Main in another tab after its Finish dialog opened is finished as Main while this tab stays on Book detail (no finish moment anywhere); accepted last-write-wins.
- Book detail for a never-read Book is now slightly taller than a 720px viewport; harmless, but it is why the Tags e2e no longer uses End.
