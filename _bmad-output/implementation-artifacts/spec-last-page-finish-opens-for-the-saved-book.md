---
title: 'A last-page save opens Finish only for the saved Book while it is Main'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: '5802ca0f4597d94f72c34ca90aafccc130c46b2c'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Spine drift (AD-7, AD-19), reconciled before the next epic: AD-7 records the last-page start hand-off rule but not the save path's rule (the Finish dialog opens for the saved Book only when the view rendered after the save shows it as Main), and AD-19's Finishing bullet says the client opens the Finish dialog unconditionally.
    evidence: |-
      Spine Check layer; frontend/src/pages/HomePage.tsx (lastPageSave, openFinish); ARCHITECTURE-SPINE.md AD-7 "Last-page start" bullet and AD-19 Finishing bullet.
    location: >-
      frontend/src/pages/HomePage.tsx
    severity: low
  - summary: >-
      The page-field last-page Finish has no other-dialog guard: a Start or Pause dialog opened while the save is in flight can be stacked under the Finish dialog. Predates this change (the old openFinish also set finishing unconditionally); item 36's start path has the guard.
    evidence: |-
      HomePage.tsx: the item-36 block checks otherDialog (starting/finishing/pauseFlow.dialog); the lastPageSave block and the baseline openFinish do not. Found by reading, not reproduced.
    location: >-
      frontend/src/pages/HomePage.tsx (lastPageSave)
    severity: low
---

<intent-contract>

## Intent

**Problem:** When a page save on the Main book card answers `reachedLastPage`, Home opens the Finish dialog without checking the Book against the view the save's refetch rendered. If another tab changes the Main book between the save landing and the refetch, Finish still opens. The probe (The Left Hand of Darkness Main at p.300 of 330, Dune unstarted; the save of 330 lands, then another tab starts Dune before the answer reaches the page) opened "Finished The Left Hand of Darkness" over a card showing Dune, with Dune's percent as the dialog's `fromPercent`. The deferred entry said the dialog opens for the view's `mainId`. In the probe, though, `openFinish` came from the render the save was sent in, so it opened for the saved Book. Either way the dialog opens for a Book that is no longer Main.

**Approach:** The page field hands Home the saved Book's id with the line. As in item 36, Home opens the Finish dialog for that id only when the view it renders after the save shows that Book as Main. Otherwise it opens nothing.

Source: `deferred-work.md`, "Deferred from: spec-epic-4-retro-item-36-last-page-finish-for-the-started-book", the entry starting "The other last-page path has the same shape as F-R5". Precedent: `spec-epic-4-retro-item-36-last-page-finish-for-the-started-book.md`.

## Boundaries & Constraints

**Always:** Decide from the view Home renders after the save resolves. `sendIntent` resolves after the views have refetched, so that render reads the refetched cache. Open at most once per save, on the history entry the save was made on. The dialog's Book is always the saved Book.

**Never:** Wait for a later refetch to open it. Unlike item 36's start, the save's own refetch has already run, so a later view is not the save's answer. Never add an at-last-page check here: a failed refetch keeps the pre-save view (the saved Book still Main, at its old page), and Finish opens there today, which must stay so. Don't change PageField's save or announce behaviour, the item-36 start hand-off, or the server.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Normal last-page save | The view after the save shows the saved Book as Main | Finish dialog for it, described "Page M of M, 100%." | none |
| Main changed elsewhere | Another tab makes another Book Main before the save's refetch | No dialog; the card shows the new Main book | none |
| Main cleared elsewhere | The refetch shows no Main book | PageField unmounts and calls nothing (unchanged); no dialog | none |
| Refetch fails | The save lands, `GET /api/views/home` fails | The view still shows the saved Book as Main: Finish opens (unchanged) | none |

</intent-contract>

## Code Map

- `frontend/src/components/PageField.tsx:31,146` -- `onReachedLastPage?: (savedLine) => void`. It is called from `save()`'s closure after `sendPage` resolves (that is, after the refetch). It already has `bookId`.
- `frontend/src/components/MainBookCard.tsx:80,183` -- passes `onReachedLastPage` through. Its type mirrors PageField's.
- `frontend/src/pages/HomePage.tsx:248-253` -- `openFinish` sets `finishing` from the `mainId` captured by `useCallback` in the render the save was sent in. `:220-234` is item 36's render-phase decision (the pattern to follow). `:165-167` `finishing` is keyed by history entry. `:116-120` is the doc comment for the page-field Finish.
- `frontend/e2e/stale-hand-offs.spec.ts` -- `elsewhere()` sends an intent as another tab would. The new leaf goes in its describe.
- Read-only: `frontend/src/api/intents.ts:49` -- `sendIntent` awaits `invalidateQueries` (the refetch) before resolving.

## Tasks & Acceptance

**Execution:**
- `frontend/src/components/PageField.tsx` -- call `onReachedLastPage(bookId, savedLine)` with the saved Book's id, and update the prop doc and the component doc.
- `frontend/src/components/MainBookCard.tsx` -- widen the prop type to `(bookId: string, savedLine: string) => void`.
- `frontend/src/pages/HomePage.tsx` -- `openFinish(bookId, savedLine)` stores a pending `{bookId, key, savedLine}`. During render, Home takes it once: if its key is the current entry and `mainId` equals its `bookId`, set `finishing` for that Book. Otherwise drop it. Update the doc comment.
- `frontend/e2e/stale-hand-offs.spec.ts` -- new leaf: route `update-page`, `route.fetch()`, then `elsewhere` starts Dune, then fulfill. Assert the card shows Dune, Update is no longer `aria-disabled`, there is no dialog, Main is Dune in storage, and The Left Hand of Darkness is at 330 and not finished.

**Acceptance Criteria:**
- Given The Left Hand of Darkness is Main at p.300 of 330, when a save of 330 lands and another tab makes Dune Main before the page gets the answer, then once the card shows Dune and the save has settled, no dialog is open. The leaf fails on the baseline (a "Finished The Left Hand of Darkness" dialog is open).
- Given a normal last-page save, when it lands, then the Finish dialog opens for the saved Book as before. Existing `update-page.spec.ts` and `finish-reading.spec.ts` leaves stay green.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 14, false 8, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine-check) AD-7 has no rule for the save path's hand-off — spine drift; logged in `deferred-work.md`, spine not edited (AGENTS.md).
  - `[low]` `[defer]` (spine-check) AD-19's Finishing bullet says the client opens Finish unconditionally — spine drift, same entry.
  - `[false]` `[reject]` (intent) The intent's premise (Finish opens for the view's `mainId`) differs from the old code (it opened for the saved Book via the closure) — the spec's Problem records the probe's actual behaviour; either way the dialog opened for a Book no longer Main, which the fix closes.
  - `[false]` `[reject]` (intent) A Main change after the response but before the refetch isn't tested on its own — `sendIntent` resolves only after the refetch, and the decision reads that view, so it is the same `mainId !== bookId` branch the leaf drives.
  - `[low]` `[patch]` (intent) The failed-refetch row has no test — grouped with the verification-gap finding; leaf added.
  - `[false]` `[reject]` (intent) No evidence the leaf fails on the old code — it was run on the baseline build: it failed at `toHaveCount(0)` with "Finished The Left Hand of Darkness" open.
  - `[low]` `[defer]` (intent) Item 36's other-dialog guard isn't followed — grouped with the blind and edge findings; predates this change; deferred.
  - `[low]` `[reject]` (blind) No at-last-page check, so a page lowered elsewhere in the window still opens Finish — a two-tab race inside one save's round trip; the guard would break the spec's failed-refetch row (the stale view shows the old page), so it needs more than a direct correction.
  - `[low]` `[defer]` (blind) No other-dialog guard — predates this change (the old `openFinish` set `finishing` unconditionally); deferred.
  - `[false]` `[reject]` (blind) The save is dropped when the view isn't ready — a failed background refetch keeps the last data (`views.ts:1-3`); the card the save came from means the view is ready.
  - `[false]` `[reject]` (blind) The render may see the pre-refetch view — `useQuery` reads the cache during render; the leaf passes 5/5 and would fail (dialog open) if the view were stale, as on the baseline.
  - `[low]` `[reject]` (blind) Failed refetch plus Main changed elsewhere opens Finish for a non-Main Book — two failures at once; unchanged from before; a guard would need a fresh-view check.
  - `[false]` `[reject]` (blind) Only the negative case is tested — the positive case is `update-page.spec.ts` AC-4 and `finish-reading.spec.ts`, run and green (35 passed).
  - `[low]` `[reject]` (blind) No leaf for "page changed elsewhere" or "Main cleared elsewhere" — the first is rejected above; the cleared path is unchanged code (`PageField` unmounts and calls nothing).
  - `[false]` `[reject]` (blind) `toHaveCount(0)` can pass before the dialog would appear — `setBusy(false)` and `onReachedLastPage` run in one continuation, and Home sets `finishing` during the render that consumes the save, so the commit that drops `aria-disabled` already has the dialog; the baseline fails at that line.
  - `[low]` `[patch]` (blind) The leaf relies silently on 330 being the last page — patched: the route handler asserts `reachedLastPage: true` in the response.
  - `[false]` `[reject]` (blind) No unit test for the callback contract — the frontend has no component test harness; `tsc -b` checks the signature and the e2e leaves cover the behaviour.
  - `[low]` `[patch]` (blind) PageField's doc paragraph reads ambiguously after the inserted parenthetical — patched: split into separate sentences.
  - `[low]` `[reject]` (edge) Saved Book still Main but its page lowered elsewhere — same as the blind at-last-page finding.
  - `[low]` `[reject]` (edge) Saved Book finished and re-read elsewhere within the window — needs two other-tab intents inside one save's round trip; same guard as above.
  - `[low]` `[defer]` (edge) Start or Pause dialog opened while the save is in flight stacks under Finish — same deferred entry as the blind other-dialog finding.
  - `[low]` `[patch]` (verification-gap) A last-page save whose home refetch fails isn't tested to still open Finish — patched: a leaf routes `/api/views/home` to 503 and asserts the dialog and its description.

## Verification

**Commands:**
- `npm run build && cd frontend && TZ=Europe/Madrid npx playwright test e2e/stale-hand-offs.spec.ts e2e/update-page.spec.ts e2e/finish-reading.spec.ts --retries=0` -- expected: all pass. The new leaf also passes with `--repeat-each=5`.
- `npm run check` (repo root) -- expected: exit 0.

## Auto Run Result

Status: done

**Summary:** When a page save answers `reachedLastPage`, the page field now hands Home the saved Book's id. Home opens the Finish dialog for that Book only in the render after the save resolves, only on the same history entry, and only while that view shows the Book as Main. Otherwise nothing opens. On the baseline, `openFinish`'s closure opened "Finished The Left Hand of Darkness" over a card already showing Dune, with Dune's percent as `fromPercent`.

**Files changed:**
- `frontend/src/components/PageField.tsx`: calls `onReachedLastPage(bookId, savedLine)`, and its docs are updated.
- `frontend/src/components/MainBookCard.tsx`: the prop type is widened.
- `frontend/src/pages/HomePage.tsx`: `openFinish` stores a pending `lastPageSave`, and Home takes it once during render, gated on the history entry and `mainId`. The doc comment is updated.
- `frontend/e2e/stale-hand-offs.spec.ts`: two new leaves. In the first, another tab changes Main while the save's answer is held, and no dialog opens. In the second, the home refetch fails and Finish still opens for the saved Book.

**Review:** 22 findings (high 0, medium 0, low 14, false 8). 3 patched, all low: the failed-refetch leaf, a `reachedLastPage` assertion in the race leaf, and the PageField doc wording. 2 deferred to `deferred-work.md`: the AD-7/AD-19 spine drift, and the other-dialog guard, which predates this change. 17 rejected, with reasons in the Review Triage Log.

**Follow-up review recommended:** false. Patched entries: high 0, medium 0, low 3.

**Verification:**
- Baseline build: the race leaf failed at `toHaveCount(0)`, because the "Finished The Left Hand of Darkness" dialog was open.
- With the fix:
  - `stale-hand-offs`, `update-page` and `finish-reading`: 36 passed.
  - Both new leaves with `--repeat-each=5`: 10 of 10 passed.
  - `npm run check`: exit 0, with pytest 1532 passed, node tests 342 passed, e2e 605 passed, and smoke ok.

**Residual risks:**
- A page lowered elsewhere inside one save's round trip still opens Finish. This was rejected: the guard would break the failed-refetch row.
- The other-dialog stacking is deferred.
