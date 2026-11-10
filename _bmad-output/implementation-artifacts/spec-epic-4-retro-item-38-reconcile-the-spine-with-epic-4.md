---
title: 'Reconcile the architecture spine with as-built Epic 4'
type: 'chore'
created: '2026-11-10'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 4's stories and retro fixes deferred 19 "spine drift" entries to `deferred-work.md` (lines 387-522), and none edited the spine (Epic 4 retro F-S2, sprint item `epic-4-retro-item-38-…`). They name these gaps:
- **AD-19:** it lacks:
  - FR-7's pointer moves on start and on the standalone `pause`;
  - `start-reading`'s `page` ("Which page?"), with the Book leaving `sideReadBookIds`;
  - the non-Main finish (back-fill, clearing Up next and the Side-read entry);
  - edit-book's back-fill dropping a never-started Side read (item 34);
  - `startPage` (item 35).
- **AD-18:** its pointer rules cover delete only, not finish. The page invariant must exclude `startPage`. The document is `schemaVersion` 2.
- **AD-20:** Measured pace now counts only tracked pages (item 35).
- **AD-3, AD-9, AD-2 and AD-12:** they don't allow the no-op success (`UNCHANGED`, no commit) or the "Which page?" pre-check.
- **AD-7:** it lacks the non-Main finish staying on Book detail. Its known gap should name the Start dialog's and Pause dialog's displacement lines.
- **AD-6:** it lacks home `upNext.paused`.
- **The Structural Seed:** it lacks `pause`, `set_up_next` and `side_reads`, and isn't one module per intent.
- **The Capability Map:**
  - the "FR-5 to FR-9" row lacks `side_reads`, `views/shelf`, the panes and AD-6;
  - the FR-14 row lacks AD-18;
  - the preface still cites `intents/pause` as unbuilt.

No spine check ran on 4.4, 4.5 or 4.7 (F-S3).

**Approach:**
- Edit `ARCHITECTURE-SPINE.md` so each AD states what the code does and cites the story or retro item that decided it.
- Compare the 4.4, 4.5 and 4.7 diffs and the retro fixes since with the spine, and fold in any further drift. One is known: item 36's last-page hand-off opens Finish only for the started Book.
- Close each of the 19 entries with a `resolved:` line. Entries that correct an earlier one resolve with it.
- Close `deferred-work.md:413` (Safari/Firefox "⋯") as not needed: Oleg uses Chrome, which the Chromium e2e run covers (retro open question 3).
- Leave item 35's resume-pages entry open, since it isn't drift.
- No code changes. Oleg reviews the spine diff before it's final, because the retro says spine edits are applied by a human.

</frozen-after-approval>

## Implementation Notes

- **Count:** there were 20 open drift entries, not 19. The Intent's listing missed the item 43 correction at `deferred-work.md:526`, which was cut off. All 20 are closed.
- **Spine** (`ARCHITECTURE-SPINE.md`, `updated` 2026-11-10). Each AD was checked against the code (`intents/start_reading.py`, `pause.py`, `set_up_next.py`, `side_reads.py`, `finish_reading.py`, `edit_book.py`, `store/store.py` `_apply_locked`, `domain/pace.py`, `domain/model.py`, `domain/invariants.py`, `views/shelf.py`, `StartDialog.tsx`):
  - **AD-2:** the `UNCHANGED` no-write outcome.
  - **AD-3:** the no-op success, and two sanctioned pre-checks ("Which page?" added; its empty case is pinned by tests, not by the case table).
  - **AD-6:** the Waiting set and order, and `upNext.paused`.
  - **AD-7:**
    - the non-Main finish stays on Book detail;
    - a new "Last-page start" bullet (item 36);
    - the known gap names the Start and Pause dialogs' cached lines.
  - **AD-9:**
    - "Which page?" as a 422 field;
    - the three no-ops via `store.UNCHANGED`;
    - "exceptions" for the pre-checks.
  - **AD-12:** a no-op's new files are deleted again.
  - **AD-18:** FR-14 in Binds; the page invariant names `currentPage`, and `startPage` is unbounded; the pointer moves for delete, finish, the edit-book back-fill and start.
  - **AD-19:**
    - `startPage`;
    - Starting split into the previous Main book, the displaced Up next, `page` and Purpose;
    - a new "Pausing and Up next" bullet;
    - the item 34 back-fill;
    - Finishing for any Book, with the back-fill, the pointer clearing and `reachedLastPage` for any `page`.
  - **AD-20:** pace over tracked pages.
  - **Seed:** `pause`, `set_up_next`, and `side_reads` as the one two-intent module.
  - **Map:** the preface examples, the "FR-5 to FR-9" row (`side_reads`, `views/shelf` fields, the panes, AD-6/7/9), and the FR-14 row (AD-18).
  - **Deferred:** the stale confirmation guard also names a wrong Up next.
- **F-S3:** I compared the source changes from `37d9911^..HEAD` (`backend/bookvie`, `frontend/src`) with the spine. One drift had no entry: item 36's last-page hand-off, which opens Finish only for the started Book. It is folded into AD-7 and AD-19. After review, it is also recorded as a drift entry, resolved in the same pass, so the record stays complete. The new `frontend/src/lib/` modules (`pause`, `setUpNext`, `sideRead`, `markFinished`, `usePauseFlow`, `useSetUpNextFlow`) and the new components are presentation with no AD of their own, so the seed's `lib/` line, which lists only AD-bound modules, is unchanged.
- **`deferred-work.md`:** 20 `resolved:` lines, plus one on the Safari/Firefox "⋯" entry (not needed). Item 35's resume-pages entry is not drift and stays open.
- **No code changes.**
- **Verification:** `npm run check:py` passed 1208 tests, with coverage gates ok. `npm run check:api` passed 237 of 237.

## Review Triage Log

### 2026-11-10: Blind Hunter, pass 1

Floor N = 8 (about 62 kB). It reported 12 findings.

- **`[medium]` `[patch]` AD-18's pointer list read as complete but left out start, pause, set-up-next and the Side-read intents.** Its lead-in ("that changes their Book") was wrong for set-up-next. Patched: a lead-in that names every intent, citing AD-19.
- **`[low]` `[patch]`+`[defer]` AD-3 claimed tests keep "Which page? is required." in step.** They don't: each side hard-codes it, and the e2e never reaches the server. Patched: AD-3 states it as a known gap, and the resolved text is corrected. The fix is a shared case, which changes code, so it is deferred as its own open entry.
- **`[low]` `[patch]`+`[defer]` AD-7's known gap said "open in `deferred-work.md`", but the entries it named were drift entries this change closes.** Patched: a new open entry covers the Start and Pause dialogs reading `upNext` from the cached home view, and the two resolved texts point at it.
- **`[low]` `[patch]` "`startPage` is deliberately not bounded" was wrong:** `Field(ge=0)`. It now says not bounded by the page count.
- **`[low]` `[patch]` The v1→v2 migration wasn't recorded.** AD-19 now says the step sets `startPage` to 0 on every v1 Reading (`store/migrations/__init__.py` `_add_start_page`).
- **`[low]` `[patch]` AD-3 still said "one commit", and AD-12 "always".** They now say "at most one commit" and "unless the change is a no-op".
- **`[low]` `[patch]` Item 36's drift had no entry.** It is added and resolved in this pass.
- **`[low]` `[patch]` AD-6 lacked the server's role precedence and waiting page** (`views/shelf.py` `_role_reading`). Added.
- **`[low]` `[patch]` AD-3 and AD-19 didn't say the client asks "Which page?" only for a Side read.** Added.
- **`[low]` `[patch]` The displaced-Up-next cases read as exclusive:** a paused Side read is in both panes. Reworded.
- **`[low]` `[reject]` The work was marked resolved before Oleg's review.** Nothing is committed, and the spec stays `in-progress` until Oleg approves the spine diff. The gate reads the committed file.
- **`[low]` `[reject]` Old entries and the Intent cite line numbers that moved.** Those are evidence at the time they were written. Existing entries aren't rewritten, and the Intent is frozen.
