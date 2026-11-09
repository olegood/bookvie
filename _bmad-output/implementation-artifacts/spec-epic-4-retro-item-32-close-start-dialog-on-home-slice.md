---
title: 'Close the Start dialog after a confirmed start from Home''s slice'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Start dialog opened from a spine popover on Home's slice never closes after a confirmed start. `useSpinePopover` clears `startingId` only on Cancel; confirming calls `navigate('/')`, but Home stays mounted, so the dialog stays open with `busy` true and both buttons `aria-disabled`, and only Esc gets out. A Side read started at its last page from the slice also stacks that dead dialog under the Finish dialog.

Source: Epic 4 retro F-R1 (`epic-4-retro-2026-11-09.md`), sprint item `epic-4-retro-item-32-close-the-start-dialog-on-a-confirmed-st`.

**Approach:** Tie the open Start dialog to the history entry it opened on, as `HomePage` does: a confirmed start navigates to a new entry, which closes it. Add e2e on Home's slice for Start, Resume, and a Side read started at its last page.

</frozen-after-approval>

## Implementation Notes

- `frontend/src/lib/useSpinePopover.ts`: the open Start dialog is now `{ bookId, key }`, the history entry it opened on, cleared during render when `location.key` changes (the pattern `HomePage` uses). `startingId` is derived from it, so `Bookcase` is unchanged.
- `frontend/e2e/home-slice.spec.ts`: a new `Epic 4 retro item 32` block covers Start (with and without a Main book), Resume, a Side read resumed at its last page (only the Finish dialog remains), and Cancel and Esc returning focus to the slice spine.
- The first three tests failed before the hook change: the dialog stayed open, and the Side-read case found 2 dialogs.

## Review Triage Log

Blind Hunter, one pass.

- medium, patched: no slice start with no Main book, where the empty card swaps to the Main card. Added.
- medium, patched: Cancel and Esc were tested only on `/catalog`, and `cancelStart` changed. Added for the slice.
- low, patched: the Side-read test didn't assert the stored outcome or the Finish description. Added.
- low, patched: the tests sat in Story 3.5's ATDD block, which trace reads. Moved to their own block.
- low, rejected: Back after a confirmed slice start. `starting` is already null by then, so nothing can reopen, and the hand-off's Back and Forward are covered by `start-reading.spec.ts:577`.
- low, rejected: Back during the in-flight save unmounts the dialog. It takes a Back inside the save's short window, `HomePage` and leaving Catalog behave the same, and a guard isn't a simple fix.
- low, rejected: no failed-confirm test on the slice. A failure doesn't navigate, so the key doesn't change, and `StartDialog`'s failure paths don't depend on the page hosting it.
- low, rejected: a never-started Side read at its last page. It is the same dialog and hand-off as the Resume route tested here; item 36 covers the "Which page?" routes.
- low, rejected: an open popover survives Back to another `/` entry. It was already so, and this item is about the dialog.
- low, rejected: a shared hook for the history-entry pattern. Three short copies don't justify a new abstraction here.
- false: the spec was unfinished and the sprint item open. Both were still to come in this workflow's finalize step.
