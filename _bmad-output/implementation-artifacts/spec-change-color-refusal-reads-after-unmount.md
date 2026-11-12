---
title: 'A refusal that removes Change color still reads in alert'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_commit: '7847c2d02e9c5265006692fee38a437fcf551148'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `ChangeColor`'s unmount cleanup runs `if (failed.current) clearAnnouncements()`. When a pick is refused because the Book was deleted elsewhere, `pick` sets `failed.current` and calls `announce('alert', …)`, which waits 100 ms; the refetch that `sendIntent` already ran then renders the Book gone, the Spine popover closes (or Book detail shows the Book missing), and the cleanup cancels the pending refusal before a screen reader hears it. Same shape as the Edit Purpose race fixed by Epic 4 retro item 42.

**Approach:** Fix it the way item 42 fixed Edit Purpose: remember whether the last failure was a refusal, and let the unmount cleanup clear announcements only for a couldn't-save line. When the block is already gone before the intent resolves, announce a non-ok result in `alert`, as `EditPurpose.tsx` does. A new pick still clears everything first, as today.

Source: `deferred-work.md` entry "`ChangeColor`'s unmount cleanup has the same shape as the Edit Purpose race" (from `spec-epic-4-retro-item-42-refusal-reads-after-edit-purpose-unmounts.md`).

## Boundaries & Constraints

**Always:** A couldn't-save line already shown still goes when the popover closes or the page is left (the existing AC-5 leaf in `spine-popover.spec.ts` keeps passing). A new pick still clears the line and pending announcements before sending. Of the lines already pending at unmount, only a refusal survives; a pick that resolves after the block is gone announces any non-ok result, as `EditPurpose.tsx` does.

**Never:** No change to `announce.ts`, `sendIntent`, or the server. No new test tooling (component test harness).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Refusal removes the popover | Spine popover open on Catalog; the Book is deleted elsewhere; user picks a swatch | 409 `book_not_found`; the popover closes; `alert` reads "This book isn't in your catalog anymore." | Library unchanged |
| Refusal on Book detail | Book detail open; the Book is deleted elsewhere; user picks a swatch | The block goes (Book missing); `alert` reads the same refusal | Library unchanged |
| Couldn't-save then close | 503 on pick, then Esc | `alert` empties on close (unchanged) | — |
| Close, then couldn't-save | Pick in flight, Esc, then 503 | `alert` reads the couldn't-save line | — |

</intent-contract>

## Code Map

- `frontend/src/components/ChangeColor.tsx:40-49` -- mount effect whose cleanup cleared announcements when `failed.current` (now `couldntSave.current`); the cause.
- `frontend/src/components/ChangeColor.tsx:57-82` -- `pick`: resets the flag, clears announcements, sends, then on non-ok sets it and `announce('alert', …)`; the `!mounted.current` branch.
- `frontend/src/components/EditPurpose.tsx:32-33,59-75,112` -- precedent: `refused` ref set from `result.kind === 'refusal'`, cleanup clears only when `!refused.current`.
- `frontend/src/api/intents.ts:40` -- `sendIntent` resolves after the refetch, before observers render (TanStack `setTimeout(0)`), so the unmount lands inside the 100 ms announce delay.
- `frontend/src/lib/announce.ts:84-100` -- `clearAnnouncements` cancels the pending message; `ANNOUNCE_DELAY_MS = 100`.
- `backend/bookvie/intents/contract.py:184` -- `BOOK_NOT_FOUND_MESSAGE = "This book isn't in your catalog anymore."`.
- `frontend/e2e/spine-popover.spec.ts` -- popover + Book detail tests; helpers `spine`, `popover`, `swatch`, `changeColor`; existing AC-5 couldn't-save-clears leaf at ~:525.
- `frontend/e2e/intents.ts:10` -- `DELETE_BOOK`; `add-card-note.spec.ts:517` shows deleting elsewhere via `page.request.post`.

## Tasks & Acceptance

**Execution:**
- `frontend/e2e/spine-popover.spec.ts` -- add leaves: a pick refused because the Book was deleted elsewhere still reads the refusal in `alert`, once from the Spine popover (popover closes) and once from Book detail (block goes) -- pins the race; must fail on the baseline.
- `frontend/src/components/ChangeColor.tsx` -- replace `failed` with a ref recording whether the last failure was a couldn't-save, so the unmount cleanup clears announcements only for a couldn't-save line; in the `!mounted.current` branch announce a non-ok result in `alert` (match `EditPurpose.tsx:102-105`) -- the fix.

**Acceptance Criteria:**
- Given the new leaves, when run against the baseline `ChangeColor.tsx`, then at least one fails with an empty `alert`; with the fix they pass repeatedly (`--repeat-each`).
- Given the whole check, when `npm run check` runs from the repo root, then it passes.

## Spec Change Log

### 2026-11-12 — Book detail unmounts before the intent resolves
- Trigger: the Book detail leaf failed even with the cleanup fix. The refetched `missing` view unmounts `ChangeColor` before `sendIntent` resolves, so `pick` took `if (!mounted.current) return` and never announced. The first version of this spec's Never rule forbade touching that path, and the leaf was parked as `test.fixme`.
- Amended (coordinator decision, 2026-11-12): dropped that Never rule; the Approach and the ChangeColor task now announce a non-ok result from the unmounted branch, as `EditPurpose.tsx:102-105` does. The leaf is a plain `test` again.
- Known-bad state avoided: a refusal on Book detail is silent, and a `test.fixme` left in the repo.
- KEEP: the `couldntSave` ref and the cleanup that clears only a couldn't-save line; the Spine popover leaf (failed 3 of 3 on the baseline, passes with the fix).

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 17, false 5, maybe-false 0
- findings:
  - `[low]` `[patch]` (spine-check) No spine findings (AD-3, AD-7, AD-9 checked); the Always rule "only refusal results survive an unmount" contradicts the unmounted branch announcing any non-ok result — the branch follows the coordinator's decision to match `EditPurpose.tsx:102-105`; the Always wording and matrix were brought in line, and a leaf pins the behavior.
  - `[low]` `[patch]` (edge) Couldn't-save announced after the popover was closed mid-flight — intended by the coordinator's decision (as Edit Purpose); pinned by the new leaf "a pick that couldn't be saved after the popover was closed still reads in alert".
  - `[low]` `[reject]` (edge) An older instance's late result can cancel a newer pick's pending announcement — needs two instances and a pick in flight across a close and reopen; Edit Purpose has the same shape; the fix would add ownership tracking.
  - `[low]` `[reject]` (edge) A refusal while mounted (e.g. 422 invalid color) then Esc leaves the refusal in `alert` — the swatches only send valid colors, and a `book_not_found` refusal removes the block itself; reaching it needs a forged request.
  - `[low]` `[patch]` (edge) Spec claim "only refusal results survive an unmount" vs the branch — same as the spine-check row; wording amended.
  - `[low]` `[patch]` (edge) Close-during-flight now announces, uncovered by AC-5 — covered by the new leaf.
  - `[low]` `[patch]` (verification-gap) No test for a couldn't-save that resolves after Esc — added the held-route leaf; it passes 10 of 10.
  - `[low]` `[patch]` (verification-gap, other) Same contradiction with the Always rule — wording amended.
  - `[low]` `[patch]` (blind) Unmounted branch breaks the Always rule — same as above.
  - `[low]` `[patch]` (blind) No test for couldn't-save after Esc — same leaf.
  - `[low]` `[reject]` (blind) A refusal's alert can outlive a normal close — same as the 422 row above: unreachable from the UI.
  - `[low]` `[patch]` (blind) The unmounted-branch comment overclaims — reworded to say a pick that didn't save says why, as Edit Purpose does.
  - `[low]` `[reject]` (blind) No check that the message is announced once, nor where focus lands after the spine goes — `announce` empties the regions first, so a double call reads the same text once; focus after a deleted spine predates this change.
  - `[low]` `[reject]` (blind) `deleteElsewhere` duplicates an inline call found in five specs — test-only, matches the existing per-spec pattern; a shared helper is a wider refactor.
  - `[low]` `[reject]` (blind) `BOOK_GONE` is redeclared per spec — same per-spec pattern as `COULDNT_SAVE`.
  - `[low]` `[reject]` (blind) The leaves don't assert exactly one request — `libraryBytes` pins no change, and the in-flight leaf already pins single sends.
  - `[false]` `[reject]` (blind) The spec is half-finished — it was mid-run; finalized in this step. The Book detail leaf's baseline failure is recorded below (3 of 3).
  - `[low]` `[reject]` (blind) Import order and long titles without an AC number — cosmetic; these leaves pin a retro item, not a story AC.
  - `[false]` `[reject]` (intent) Reading B (Edit Purpose's end state) vs item 42 alone — the coordinator chose B explicitly.
  - `[false]` `[reject]` (intent) The Book detail leaf exercises the unmounted branch, not the cleanup — true and intended; the popover leaf exercises the cleanup (failed 3 of 3 on the baseline).
  - `[false]` `[reject]` (intent) No T1-style couldn't-save guard leaf — the existing AC-5 leaf (`spine-popover.spec.ts:533`) already pins that a couldn't-save line goes on close.
  - `[false]` `[reject]` (intent) The race is probabilistic from e2e — for ChangeColor `failed` is a ref set synchronously, so the popover leaf failed 3 of 3 on the baseline; noted, not a defect.

## Design Notes

The refusal stays an announcement only: the block that would show the line is gone, which matches Oleg's 2026-11-09 decision on 4.4's deleted-Book refusal (cited in item 42's spec).

## Verification

**Commands:**
- `cd frontend && npx playwright test e2e/spine-popover.spec.ts --repeat-each=10 --retries=0` -- expected: all pass with the fix; the new leaves fail on the baseline.
- `npm run check` (repo root) -- expected: passes.

## Auto Run Result

Status: done

**Summary.** A refusal from Change color now reaches `alert` when its refetch removes the block. The unmount cleanup clears announcements only when the last failure was a couldn't-save (`couldntSave` ref), so a pending refusal survives the Spine popover closing. When the block is already gone before the intent resolves (Book detail's `missing` view), `pick` announces a non-ok result from its unmounted branch, as `EditPurpose.tsx` does (coordinator decision, see Spec Change Log).

**Files changed.**
- `frontend/src/components/ChangeColor.tsx`: `failed` became `couldntSave`, and the cleanup skips refusals. The unmounted branch announces a non-ok result.
- `frontend/e2e/spine-popover.spec.ts`: three leaves were added: a refusal after the Book is deleted elsewhere (popover, then Book detail), and a couldn't-save that resolves after Esc.
- `_bmad-output/implementation-artifacts/deferred-work.md`: a `resolved:` line on the source entry.

**Review.** 22 findings: 10 patched (all low), 12 rejected (7 low, 5 false), 0 deferred. Patches: the Always wording and matrix row were brought in line with the unmounted branch, the comment was reworded, and the couldn't-save-after-Esc leaf was added. The rejected findings and their reasons are in the Review Triage Log. Follow-up review recommended: false (patched counts: high 0, medium 0, low 10).

**Verification.**
- Baseline `ChangeColor.tsx` with the new leaves: both refusal leaves failed 3 of 3 (`--repeat-each=3 --retries=0`, 6 failed).
- With the fix: the three new leaves passed 30 of 30 (`--repeat-each=10 --retries=0`), and `spine-popover.spec.ts` plus `stale-hand-offs.spec.ts` passed.
- `npm run check`: ruff clean, pytest 1532 passed, node unit tests 342 of 342, Playwright 608 passed, smoke ok.
- An earlier `npm run check` run failed 15 e2e tests with trace ENOENT errors. Concurrent Playwright runs had cleared `test-results/`; the rerun alone was clean.

**Residual risk.** A couldn't-save that resolves after the user closed the popover is now announced. This is intended and matches Edit Purpose.
