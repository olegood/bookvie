---
title: 'A last-page start opens Finish only for the Book it started'
type: 'bugfix'
created: '2026-11-10'
status: 'done'
route: 'oneshot'
baseline_commit: '0ee4fee5a126c942f36304016772b2d2a05e0c01'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Side read started at its last page hands Home `reachedLastPage` with no Book id, and Home opens the Finish dialog for whatever Book its view shows as Main. If Home's refetch after the start fails, the view still shows the old Main book: the probe (Dune Main at p.100, The Left Hand of Darkness paused and a Side read, started at p.330 while `GET /api/views/home` answers 503) opened "Finished Dune" described "Page 330 of 330, 100%.", and Done finished Dune's paused Reading. The same happens if another tab changes Main before Home renders.

**Approach:** The start's hand-off carries the started Book's id, and Home opens the Finish dialog only once its view shows that Book as Main, never for another Book.

Source: Epic 4 retro F-R5 and action 36; `deferred-work.md:529`. Oleg chose to fix it in item 36 through `bmad-build` (2026-11-10).

</frozen-after-approval>

## Implementation Notes

- `frontend/src/components/StartDialog.tsx`: `StartedState` gains `bookId`, set only with `reachedLastPage`.
- `frontend/src/pages/HomePage.tsx`: `reachedLastPage()` reads the Book's id with the line, and Home opens Finish for that id only when `mainId` equals it, still once per history entry. A hand-off without a `bookId` opens nothing.
- With a failed refetch, Finish opens on the next successful refetch (focus or visibility), while Home is still on that history entry. If another Book is Main by then, it never opens. The start's hand-off is already cleared from the history entry, so a reload never reopens it.
- Unchanged: after the start, focus goes to the title link of whatever Main book the view shows, so a stale view focuses the old Main book's link. That predates this change, and nothing is written from it.
- `frontend/e2e/side-reads.spec.ts`: "[P0] F-R5 …" is the probe's scenario. On the baseline it fails at the criterion (`toHaveCount(0)` on dialogs, the Finish dialog for Dune is open); with the fix it passed 5 of 5 with `--repeat-each=5`.
- The throwaway probe `frontend/e2e/zz-probe-f-r5.spec.ts` is deleted.
- After review: the late open (on a later refetch) also needs the Book still at its last page and no other dialog of this entry open (Start, Finish, Pause), else the hand-off is dropped. `StartedState` is a union, so `reachedLastPage` can't be sent without `bookId`.
- Surprise: the first version of the "other dialog" check read `starting`, which still holds the closed Start dialog's entry in the render right after the start (Home resets it during that render), so it dropped every hand-off. `side-reads.spec.ts:494` caught it. The check now compares each dialog's entry key with `location.key`, as the dialogs' own render does.
- Surprise: the leaf's `visibilitychange` must bubble. TanStack's focus listener is on `window`; a non-bubbling event on `document` refetched nothing, and the first passes came from some other refetch (it failed in the full run). With `{ bubbles: true }` it passed 30 of 30 at `--workers=6`.

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 11 findings — high 0, medium 1, low 6, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` (blind) The late Finish can open beside a Start or Pause dialog opened meanwhile — real: the open can now come on a later refetch; patched, the hand-off is dropped when another dialog of this entry is open.
  - `[low]` `[patch]` (blind) A late open trusts the start's line though another tab may have moved the page — patched: the view's Main book must still be at its last page.
  - `[low]` `[patch]` (blind) `StartedState` allows `reachedLastPage` without `bookId` — patched to a union.
  - `[low]` `[patch]` (blind) A hand-off without `bookId` now opens nothing, undocumented — patched in `reachedLastPage()`'s doc comment.
  - `[low]` `[defer]` (blind) `openFinish` (the page field's last-page save) has the same shape — predates this change; logged in `deferred-work.md`.
  - `[low]` `[reject]` (blind) The other-tab case has no own leaf — it is the same `mainId !== bookId` branch the failed-refetch leaf drives.
  - `[low]` `[reject]` (blind) Focus inside the late Finish dialog isn't pinned — the dialog's own initial focus and Cancel return are tested in its stories; the late open mounts the same component.
  - `[false]` `[reject]` (blind) Nothing tells the user the refetch failed — by design: a failed background refetch keeps the last data and reports nothing (`views.ts:1-3`), app-wide.
  - `[false]` `[reject]` (blind) The negative dialog assertion can pass before the stale render — Home sets `finishing` during the render that removes the Start dialog, so once that dialog is hidden the decision has rendered; the baseline fails at that line.
  - `[false]` `[reject]` (blind) Use a shared helper for `visibilitychange` — none exists; other specs dispatch it inline (`finish-moment.spec.ts:318`).
  - `[false]` `[reject]` (blind) HomePage's doc should say a stale view focuses the old Main book's link — that focus predates this change and is noted in Implementation Notes; the doc describes the normal path.
