---
title: 'Start/Finish dialogs on fresh views, finished hand-off never replays, Edit Purpose speaks after unmount'
type: 'bugfix'
created: '2026-11-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three Epic 3 client paths act on state that another tab or a restore has already changed. Source: Epic 3 retro F-R2, F-R3 and F-R4 (`epic-3-retro-2026-11-06.md`), sprint item `epic-3-retro-item-22-…`.
- **(F-R2) Stale dialogs.** StartDialog and FinishDialog fix their answers at open from the `book` view, which may be a stale cached copy: react-query returns inactive cached data at once. So the Finish dialog can ask "Purpose fulfilled?" for a Reading with no Purpose (a 422 the user can't clear). The Start dialog can say "Start *X*?" with an empty Purpose while the server resumes the Reading and nulls its Purpose.
- **(F-R3) Hand-off replay.** Home consumes the `{finished: true}` hand-off only when there is no Main book. A finish that lands on Home while another Book is Main leaves the hand-off in that history entry, and a later reload with no Main replays the moment and the focus move (against AD-7 and 3.7 AC-2).
- **(F-R4) Silent Edit Purpose refusal.** Edit Purpose drops a refusal that unmounts it (for example 409 `reading_already_finished`), with no message.

**Approach:**
- **Fresh views.** Both dialogs wait for a `book` fetch made after they mount (react-query `isFetchedAfterMount`) before they render or fix anything. They then fix their answers from that fresh view: Start or Resume, the Purpose prefill, whether the Purpose question is asked, and whether the finish is a re-read. The Start dialog therefore follows the server rather than the opener's label when the two disagree. Decision (Oleg, 2026-11-06, option A): this holds even when the fresh view says the Book is already Main. The dialog then reads "Resume *X*?" and `already_main` refuses it, and the 3.2 leaf at `start-reading.spec.ts:510` is updated to match.
- **Hand-off.** Home drops a finished hand-off from the history entry, without focus or moment, once its view shows that Book finished while another Book is Main. A later refetch in the same visit doesn't revive it.
- **Edit Purpose.** When a refusal unmounts Edit Purpose, its message goes to `alert`, as PageField already does.
- **Tests.** One e2e leaf per path, each red before the fix.

</frozen-after-approval>

## Implementation Notes

- Implemented:
  - `useFreshBookView` (`api/views.ts`, uses `isFetchedAfterMount`), used by `FinishDialog` and `StartDialog`.
  - The Home `dropped` hand-off (`pages/HomePage.tsx`).
  - EditPurpose's unmounted `alert` (`components/EditPurpose.tsx`).
  - New `e2e/stale-hand-offs.spec.ts`: 4 leaves, red before the fix and green after.
- Stop: the full e2e run passed 288 and failed 1, `start-reading.spec.ts:510` (3.2 automate, AC-4). That leaf pins the old rule that the dialog keeps the opener's label. Book detail offers **Start reading**, another tab makes Dune Main, and the leaf expects "Start Dune?" and then `already_main`. With fresh views the dialog reads "Resume Dune?" (the fresh view has Dune's current Reading), so the leaf's locator times out. The outcome is otherwise the same: `already_main` is shown in the dialog and nothing changes. Oleg chose option A and the leaf was updated. With that single gap resolved, the run went back to the oneshot route.

## Code Map

- `frontend/src/api/views.ts`: `useFreshBookView`.
- `frontend/src/components/StartDialog.tsx`: `StartDialog`, `atOpen`.
- `frontend/src/components/FinishDialog.tsx`: the default export.
- `frontend/src/pages/HomePage.tsx`: `dropped`, `keepsHandOff`.
- `frontend/src/components/EditPurpose.tsx`: `save`.
- `frontend/e2e/stale-hand-offs.spec.ts`: the new leaves.
- `frontend/e2e/start-reading.spec.ts`: the leaf "[P1] AC-4 a stale tab that still offers Start reading gets already_main in the dialog, which stays open", updated to "Resume Dune?".
- Final verification, after the review patches:
  - `npm run build` succeeded.
  - `check:api` passed (199 tests, 0 failures).
  - The full Playwright suite passed: 289 tests with `--workers=4`, including the 4 new leaves.

## Review Triage Log

Blind Hunter, pass 1. Floor N = 5; it reported 12 findings.

- **A failed post-mount fetch still opens from the stale cache: `medium`, patched.** `isFetchedAfterMount` counts errors, and `toViewState` returns `ready` whenever data exists. The hook now returns `failed` when the latest fetch errored.
- **The guarantee rests on the implicit `staleTime: 0` and `refetchOnMount`: `low`, patched.** The hook now passes `refetchOnMount: 'always'`.
- **No unit test for `useFreshBookView`: `low`, rejected.** The e2e leaves cover the paths that matter, and the hook is three lines.
- **The trade-off line can come from a stale cached `home` view when opened from Book detail: `medium`, deferred.** This predates the change, and the fix would be a fresh home view in StartDialog.
- **FinishDialog's lazy initialiser is dead: `low`, patched.** It is now `null`.
- **No busy feedback during the open-time fetch, and a silent cancel when it fails: `low`, rejected.** The server is local (a fetch takes milliseconds), and the silent cancel is the pre-existing "gone" path.
- **A hand-off for a Book deleted under another Main is never dropped: `low`, patched.** The drop now also applies when the handed Book is absent.
- **Edit Purpose announces after unmount even when the user navigated away: `false`.** That matches PageField (`PageField.tsx:124-127`), and a save result reaching the shell's `alert` is the intended behaviour.
- **e2e coverage gaps (re-read copy, in-visit refetch, alert clearing): `low`, rejected.** The re-read copy comes from the same fresh view the Purpose leaf proves. The drop is per history key, so a refetch can't revive it.
- **The spec artifact was stale: `false`.** It is finalized here; the sprint item is marked separately when Oleg confirms.
- **Barrel order: `low`, patched.**

