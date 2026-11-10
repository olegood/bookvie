---
title: 'A refusal that removes Edit Purpose always reads in alert'
type: 'bugfix'
created: '2026-11-10'
status: 'done'
route: 'oneshot'
baseline_commit: '3ee2751564a92ebafde4ec3dacfdc82f76f74f88'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `stale-hand-offs.spec.ts` "F-R4 a refusal that removes Edit Purpose still reads in alert" fails about 1 run in 5 with an empty `alert` (8 of 40 at `3ee2751`). It is a product bug, not a test bug: when another tab has finished the Reading, the user's Save is refused and the refusal sometimes never reaches `alert`.

**Cause:** `sendIntent` resolves before the refetched view renders, because TanStack Query notifies observers on a `setTimeout(0)`. So `save` can see the component still mounted, call `setFailed(true)` and `announce('alert', …)`, which waits 100 ms. If React commits `failed` first and then the refetch removes the block, the unmount runs the `failed` layout effect's cleanup, whose `clearAnnouncements()` cancels the pending message.

**Approach:** Clear the failure line only when the user closes the field or saves again, and let an unmount only give the regions back. A refusal already on its way then reaches `alert` however the commits are ordered.

Source: Epic 4 retro PL-6, sprint item `epic-4-retro-item-42-find-and-fix-the-cause-of-the-1-in-8-fai`, `deferred-work.md:456`.

</frozen-after-approval>

## Implementation Notes

- `frontend/src/components/EditPurpose.tsx`: the `failed` effect's cleanup clears announcements unless the last failure was a refusal (`refused` ref). Cancel, Esc and a new Save reset the ref first, so they still clear the line.
- Deviation from the Approach above, after review: a couldn't-save line is still cleared on unmount, so it doesn't outlive the field when the user navigates away. Only a refusal survives an unmount, because only a refusal can have removed the block through its refetch.
- `frontend/e2e/start-reading.spec.ts`: two leaves pin that a couldn't-save line goes on Cancel and on leaving the page.
- Evidence: the F-R4 test failed 8 of 40 at `3ee2751` (`--repeat-each=40 --retries=0`) and passed 120 of 120 with the fix. The test itself needed no change: it was right.
- The race can't be forced deterministically from e2e, because the commit order depends on TanStack Query's `setTimeout(0)` notification. A regression shows as F-R4 failing about 1 run in 5.
- Unchanged and out of scope: `ChangeColor.tsx:44` has the same shape of cleanup (logged in `deferred-work.md`).

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 6 findings — high 0, medium 0, low 4, false 2, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) A settled couldn't-save line outlived the field on navigation, since the first version of the fix dropped the unmount clear — confirmed; the cleanup now clears unless the failure was a refusal, with an e2e leaf.
  - `[false]` `[reject]` (blind) `clearFailure` reads a stale `failed` after the `await` — that version is gone; it now resets a ref and doesn't read `failed`.
  - `[low]` `[reject]` (blind) Nothing deterministically pins the race — true, and e2e can't force the commit order. F-R4 catches a regression about 1 run in 5, and a component test harness would be new tooling.
  - `[low]` `[reject]` (blind) Re-Save and Esc aren't tested clearing the line — both go through `clearFailure` and the same cleanup as Cancel, which is tested.
  - `[false]` `[reject]` (blind) The spec and tracking are unfinished — they were mid-run; finalized in this step.
  - `[low]` `[reject]` (blind) The refusal is invisible to sighted users once the block is gone — it predates this change, and it matches Oleg's decision on 4.4's deleted-Book refusal (2026-11-09): the removed block shows what happened, and the refusal stays an announcement.
