---
title: 'Bound edit-book Finished on by the current Reading start'
type: 'bugfix'
created: '2026-11-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Edit book's **Finished on** (`backend/bookvie/intents/edit_book.py`) only looks at the latest *finished* Reading, never at the Book's current unfinished Reading. Two things go through as a result:
- **(a)** On a Book whose only Reading is active or paused, a date on or after that Reading's start appends a back-filled finish inside the current reading. The Main book then reads as finished and re-reading, the meter counts it, and the real finish later plays as "Finished *X* again." with the meter unchanged.
- **(b)** On a re-read, the earlier finish can be moved past the re-read's start, so the two Readings overlap.

Source: Epic 3 retro F-R1 (`epic-3-retro-2026-11-06.md`), sprint item `epic-3-retro-item-21-before-epic-4-edit-book-finished-on-must`.

**Approach:** Keep EXPERIENCE.md's rule that filling Finished on beside an active or paused Reading "adds a past Reading and leaves the current one untouched". Enforce the word *past*: when the Book has an unfinished Reading with a `startDate`, any Finished on that would be stored (a new back-fill, or a changed latest finish) must be on or before that start. Otherwise the edit is a 422 `invalid_fields` on `finishedOn` with "Finished on can't be after *1 October 2026*, when the current reading started.", and nothing is saved. A finish on the start day itself is allowed, because finish-reading followed by a same-day re-read produces exactly that.

</frozen-after-approval>

## Implementation Notes

- The retro text suggested refusing a back-fill on a Book with an unfinished Reading. EXPERIENCE.md:128 explicitly allows that ("adds a past Reading"), so the fix bounds the date instead. With a valid back-fill, the Book is genuinely a re-read, and "Finished *X* again." is correct.
- The copy mirrors the existing `finished_before_start_message` and uses `long_date`. It is decided here, not asked.
- Files changed:
  - `backend/bookvie/intents/edit_book.py`: `_finished_on_failure` and the new `_after_current_start`.
  - `backend/bookvie/domain/book_fields.py`: `finished_after_current_start_message`.
  - `backend/tests/test_edit_book.py`: 3 tests. 2 of them fail without the fix.
  - `EXPERIENCE.md`: the Finished on row and the validation table.
- Verification: `check:py` passed (1028 tests), and `check:api` passed (199 tests, 0 failures).

## Review Triage Log

Blind Hunter, pass 1. Floor N = 4; it reported 10 findings.

- **The start-day back-fill still makes the next finish a re-read: `false`.** A finish on the current Reading's start day is exactly the state that finish-reading followed by a same-day re-read produces. The Book then really has an earlier finish, so "again" is correct for that state. The intent records this choice.
- **FinishDialog's `reread` derivation was left alone: `false`.** It is correct for every state the server now accepts.
- **The latest finish can be moved before another finished Reading's finish or start: `low`, deferred.** This is pre-existing story 1.11 behaviour, not caused by this change.
- **An unfinished Reading with a null start passes unchecked: `low`, rejected.** No intent creates one (start-reading always sets today), so only a restored, hand-edited file reaches it.
- **Reducing an existing overlap is refused unless the date is on or before the start: `false`.** That is intended. An unchanged date still saves, and a test covers it.
- **`epics.md` 1.11 ACs were not updated: `low`, deferred** to the Epic 3 spine reconciliation (retro action 4).
- **EXPERIENCE.md wording was narrower than the code: `low`, patched.** The wording now covers both a new and a changed date. A concrete sample date is the table's existing style (l.234).
- **The spec lacks ACs and a Verification section: `false`.** The oneshot route deletes those sections.
- **Test gaps: `low`, patched.** Added the error code assertion, a check that moving the date earlier still saves, and a check that the overlap stays unchanged.
- **The changed-date check lives in two places: `low`, rejected.** It is a one-line comparison, and a shared helper adds more than it removes.
