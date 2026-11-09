---
title: 'A back-fill through Edit book drops a never-started Book from the Side reads'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** For a never-started Book that is a Side read, a back-fill through Edit book's **Finished on** finishes the Book but leaves it in On the side, while 4.5's finish clears it. FR-8 and EXPERIENCE rule 4 say a finished Side read leaves automatically.

Source: Epic 4 retro F-R4 (`epic-4-retro-2026-11-09.md`), sprint item `epic-4-retro-item-34-a-back-fill-through-edit-book-s-finished`.

**Approach:** When `edit-book` appends a back-fill to a Book with no Readings, remove the Book from `sideReadBookIds` in the same commit. `upNextBookId` stays, since the retro records "Finished, Up next" as a legal row. A Book with an active or paused Reading stays on the side: EXPERIENCE's Finished on row says that back-fill "adds a past Reading and leaves the current one untouched", so the Book isn't finished.

</frozen-after-approval>

## Implementation Notes

- `backend/bookvie/intents/edit_book.py`: after replacing the Book, a date on a Book with no Readings removes it from `sideReadBookIds` in the same commit. This mirrors `finish_reading`'s `backfill` test (`not book.readings`).
- `backend/tests/test_edit_book.py`: the never-started Side read leaves and keeps Up next (failed before the fix); guards for a paused Reading, a finished Side read, and a never-started Side read edited with no date.
- Scope decision: FR-8 applies when the Book is finished. A back-fill beside a paused Reading adds a past Reading and the Book is still being read, so it stays on the side.

## Review Triage Log

Blind Hunter, one pass.

- medium, patched: nothing tested the `finished_on` half of the guard. Added a never-started Side read edited with no date; removing that half now fails it (checked by mutation).
- medium, deferred: spine drift on AD-19's edit and Finishing bullets. Recorded in `deferred-work.md` for retro item 38.
- low, patched: the guard differs from `_readings`' back-fill branch without saying why. Added a comment.
- low, patched: the docstring said "active or paused", but an active Reading means Main, which can't be a Side read (`domain/invariants.py:60`). Now "paused". The frozen Approach keeps the looser wording, which is still true.
- low, patched: `test_a_refused_back_fill_leaves_the_side_read_in_place` was refused before the new code and proved nothing about it. Removed.
- low, rejected: a shared `Library.remove_side_read`. It would touch four other intents for a one-line filter, outside this item.
- false: the spec was unfinished and the sprint item open. Both were still to come in this workflow's finalize step.
