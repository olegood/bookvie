---
title: 'The Start and Pause dialogs wait for a fresh home view'
type: 'bugfix'
created: '2026-11-12'
status: 'done'
baseline_revision: 'fd4cca1ca41bad1581de95eb03b4e25892a81f64'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: [oversized]
deferred:
  - summary: >-
      Spine drift (AD-7, AD-19): AD-7's "Dialogs read fresh views" bullet and known gap, and the Deferred section's "Stale confirmation guard" trigger, still say the Start and Pause dialogs read the cached home view.
    evidence: |-
      The Start dialog now waits for useFreshHomeView, and Pause fetches the home view on the press (useFetchFreshHomeView); the spine was not edited (spine edits wait for the per-epic reconciliation).
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md AD-7
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Start dialog's "This pauses *Y* at p.N (P%)." line and its displacement line (`upNext.id`, `upNext.paused`), and the Pause flow's choice between its Confirm dialog and an immediate pause, read `useHomeView()`. That returns the cached home view at once, which can predate another tab's change of the Main book or Up next when the dialog opens away from Home (Book detail, Catalog). So the Start dialog can first render naming the wrong Book, and Pause can skip a Confirm it owes, show one it doesn't, or name the wrong Up next. Sources: the two `deferred-work.md` entries "The Start dialog's "This pauses *Y* at p.N (P%)." line reads `useHomeView()`…" (Epic 3 item 22 review) and "The Start dialog's displacement line (`upNext.id`, `upNext.paused`) and the Pause Confirm dialog read the home view as cached…" (Epic 4 item 38).

**Approach:** Follow Epic 3 retro item 22 (`spec-epic-3-retro-item-22-stale-client-hand-offs.md`, `useFreshBookView`). The Start dialog waits for a home view fetched after it mounts, as it already does for the `book` view, and shows nothing until both are in. Pause's press fetches the home view before it decides, and decides from that copy.

## Boundaries & Constraints

**Always:**
- While the fresh view loads, nothing new is shown: no spinner and no busy text (EXPERIENCE.md "Local-first": no loading indicator; item 22 kept the dialog unrendered until its fresh view). The server is local, so this takes milliseconds.
- Start dialog: once open, a later home refetch still updates its two lines, as today. A failed fresh home fetch cancels the dialog silently, as a failed fresh `book` fetch already does (item 22's "gone" path).
- Pause: presses while the check is out are ignored, like presses while a request is out. With the fresh view, Up next present and not this Book → Confirm dialog (its heading takes the fresh Main book's page and percent when the fresh Main book is this Book); otherwise → immediate `pause`. A fresh view whose Main book isn't this Book sends `pause` at once, so the server's `not_main` refusal takes the existing stale-tab refusal path. A failed check shows the couldn't-save line below the opener with focus kept there, as an immediate-path failure does (nothing is sent; EXPERIENCE.md "A save that fails is never silent").
- The fresh copy goes into the shared `['view','home']` cache, so Home shows it too.

**Never:**
- No change to the server, the views' shapes, the copy, or `useDetailSetUpNext`'s hint.
- Don't fix Start-dialog answers from the cached home view, and don't add a loading indicator.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start, Main changed elsewhere | Book detail cached home with Main *A*; another context made *B* Main | Dialog first renders "This pauses *B* …" (and *A*'s displacement line), never *A*'s line | — |
| Start, Up next changed elsewhere | Home cached, then Catalog; another context set Up next *Z* | Dialog's first render has "*Z* … ." displacement line | — |
| Pause, Up next set elsewhere | Book detail, no Up next cached; another context set Up next *Z* | Confirm dialog naming *Z*; nothing sent until Pause | — |
| Pause, Up next removed elsewhere | Book detail, Up next *Z* cached; another context deleted *Z* | Pause applies at once, no dialog | — |
| Pause, check fails | home fetch returns 500 | Couldn't-save line below Pause, focus on Pause, nothing sent | `alert` |

</intent-contract>

## Code Map

- `frontend/src/api/views.ts` -- `useFreshBookView` (the precedent: `refetchOnMount: 'always'`, `isFetchedAfterMount`, error → no stale data); `viewKey`, `fetchView`, `toViewState`.
- `frontend/src/api/index.ts` -- the barrel; views exports near `useFreshBookView`.
- `frontend/src/components/StartDialog.tsx` -- default export `StartDialog`: `const home = useHomeView()`, `gone`, passes `home.data.mainBook`/`upNext`.
- `frontend/src/lib/usePauseFlow.tsx` -- `request()` reads `home.data.upNext` synchronously; `send`, `Failure`, `useIntentRequest` (`isInFlight`).
- `frontend/src/api/envelope.ts` -- `COULDNT_SAVE_MESSAGE`.
- `frontend/src/lib/useDetailSetUpNext.ts:65` -- also calls `useHomeView()`, so the home view stays active on Book detail; read-only here.
- `frontend/e2e/stale-hand-offs.spec.ts` -- item 22's leaves; style reference. `frontend/e2e/set-up-next.spec.ts:719` -- a second `browser.newContext()` pattern. `frontend/e2e/pause.spec.ts` -- `pauseDialog`, `detailButton`, fixtures (`LEFT_HAND_MAIN` at p.212 of 330, `DUNE_PAUSED` at p.120, `FAHRENHEIT`).
- Note: StartDialog's `useHomeView()` refetches on mount, so the Start dialog corrects itself after a moment; the bug is its first render. The e2e leaves therefore record the dialog's first rendered text with a `MutationObserver` installed before the press.

## Tasks & Acceptance

**Execution:**
- `frontend/src/api/views.ts` -- add `useFreshHomeView()` (the `useFreshBookView` pattern on `viewKey('home')`) and `useFetchFreshHomeView()` returning `() => Promise<HomeView | null>` that fetches into the home cache via `queryClient.fetchQuery` with `staleTime: 0`, resolving `null` on failure -- the two shapes the dialog (render) and the flow (press) need.
- `frontend/src/api/index.ts` -- export both.
- `frontend/src/components/StartDialog.tsx` -- use `useFreshHomeView()`; update the doc comments.
- `frontend/src/lib/usePauseFlow.tsx` -- drop `useHomeView`; `request()` awaits the fresh view under an in-flight guard, ignores the result if unmounted, then applies the rules in Always; update the header comment.
- `frontend/e2e/stale-home-view.spec.ts` -- new: the five matrix rows, each changing state from a second browser context (`browser.newContext()`, through its UI where practical) before the dialog opens or Pause is pressed; the check-failure row routes `/api/views/home` to 500 only after the page has loaded.

**Acceptance Criteria:**
- Given the matrix rows, when each leaf runs, then it passes after the change, and the first four fail before it.
- Given the existing suite, when it runs, then `stale-hand-offs.spec.ts`, `pause.spec.ts`, `start-reading.spec.ts`, `side-reads.spec.ts` and `up-next.spec.ts` stay green.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 21 findings — high 0, medium 0, low 17, false 4, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind) `useFreshHomeView` turns any later failed home refetch into `failed`, so an open Start dialog cancels and loses a typed Purpose — real, but the only realistic trigger is bookvie having stopped, and then the `book` refetch fails too and `useFreshBookView` (item 22) already closes the dialog the same way; the extra case (home fails, book succeeds) is not met in everyday use and the fix adds state.
  - `[low]` `[reject]` (blind) No test double-presses Pause while the home check is out — the guard is one ref, and `pause.spec.ts`'s double-click leaf exercises it; a held-route leaf adds a test for a case users can't easily hit.
  - `[low]` `[patch]` (blind) The Confirm heading's fresh page and percent is untested (every leaf keeps p.212) — the "Up next set elsewhere" leaf now also moves the page in the second context and asserts the fresh heading.
  - `[false]` `[reject]` (blind) The "no longer Main, send anyway" branch is untested — `pause.spec.ts`'s stale-tab refusal leaf (`NOT_MAIN`, :591) now runs through this branch and passed in the full suite.
  - `[low]` `[patch]` (blind) The Start dialog's cancel on a failed fresh home fetch is untested — new leaf in `stale-home-view.spec.ts` (grouped with the verification-gap row below).
  - `[low]` `[reject]` (blind) No unit tests for the two hooks — item 22 rejected the same for `useFreshBookView`; the e2e leaves cover the paths that matter.
  - `[low]` `[reject]` (blind) The Start leaves' 300 ms home delay is a timing guess — it only makes the leaves red on the old code; the fixed code waits for both views, so it cannot make them fail falsely.
  - `[low]` `[reject]` (blind) `useFetchFreshHomeView` swallows every error — `fetchView` throws only on a failed or unreadable response, all of which mean "couldn't load"; nothing is sent, and the user sees the couldn't-save line.
  - `[low]` `[reject]` (blind) `fetchQuery` joins a home fetch already in flight, which may predate the press — a few milliseconds' window, as `useFreshBookView` already accepts; not met in everyday use.
  - `[low]` `[reject]` (blind) `usePauseFlow` keeps its own `mounted` and `checking` refs beside `useIntentRequest` — cosmetic; folding them in widens `useIntentRequest`'s API for one caller.
  - `[low]` `[patch]` (blind) The Pause leaves can't show the heading came from the fresh view — same root cause as the heading row above; same patch.
  - `[low]` `[reject]` (edge) Later failed home refetch cancels the open dialog — same as the first row.
  - `[low]` `[reject]` (edge) No busy state while the Pause check is out — deliberate (Always: EXPERIENCE.md "Local-first", no loading indicator; item 22's precedent); the check takes milliseconds.
  - `[false]` `[reject]` (edge) Sending `pause` for a Book no longer Main could pause the wrong Book — `pause` targets the sent `bookId`, and the server refuses a non-Main Book with 409 `not_main_book` (`backend/bookvie/intents/pause.py:62`).
  - `[low]` `[patch]` (verification-gap) Start dialog's silent cancel on a failed fresh home fetch untested — added the leaf (route 500, no dialog, focus on Start reading; a press after unrouting opens the dialog).
  - `[low]` `[patch]` (verification-gap) Pause Confirm heading's fresh page and percent untested — patched as above.
  - `[low]` `[reject]` (verification-gap, other) Later failed home refetch cancels the dialog — same as the first row.
  - `[low]` `[reject]` (verification-gap, other) The check guard's coverage is timing-dependent — same as the second row.
  - `[false]` `[reject]` (intent-alignment) Surfaces untested by the new leaves (Home's "⋯" Pause, Start from Home's panes, finalize not yet done) — Home's paths go through the same hooks and stay covered by `pause.spec.ts` and `start-reading.spec.ts` in the full suite; finalize is this run's next step.
  - `[low]` `[defer]` (spine-check) Spine drift (AD-7, AD-19): AD-7's "Dialogs read fresh views" bullet and its known gap, and the Deferred section's "Stale confirmation guard" trigger, still say the Start and Pause dialogs read the cached home view — deferred to the spine reconciliation per AGENTS.md "Architecture spine"; recorded in `deferred-work.md`.
  - `[low]` `[patch]` (spine-check) `usePauseFlow`'s header comment names the refusal `not_main`, but the code is `not_main_book` — comment corrected.

## Verification

**Commands:**
- `cd frontend && npx prettier --write <changed files>` -- formats only the changed files.
- `npm --prefix frontend run check:api` -- passes.
- `cd frontend && npx playwright test e2e/stale-home-view.spec.ts` -- all leaves pass (and the first four fail with the source change stashed).
- `cd frontend && npx playwright test --workers=4` -- full suite passes.
- `npm run check` (repo root) -- passes.

## Auto Run Result

Status: done

**Summary.** The Start dialog now waits for a home view fetched after it opens (`useFreshHomeView`, the `useFreshBookView` pattern), so its "This pauses *Y*…" and displacement lines never first render from a cached copy another tab has outdated. Pause's press fetches the home view (`useFetchFreshHomeView`, into the shared home cache) and decides from it: Confirm when an Up next is displaced (heading from the fresh page and percent), an immediate pause otherwise, and the server's `not_main_book` refusal when the Book isn't Main any more. A failed check sends nothing and shows the couldn't-save line below Pause. Nothing is shown while the fresh view loads (item 22's precedent; EXPERIENCE.md "Local-first").

**Files changed:**
- `frontend/src/api/views.ts` -- `useFreshHomeView`, `useFetchFreshHomeView`.
- `frontend/src/api/index.ts` -- exports them.
- `frontend/src/components/StartDialog.tsx` -- waits for the fresh home view; doc comments.
- `frontend/src/lib/usePauseFlow.tsx` -- the press-time check (`decide`), its guard, the failure line; header comment.
- `frontend/e2e/stale-home-view.spec.ts` -- new, 6 leaves; state changed through a second browser context's UI.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- `resolved:` on both source entries; one new spine drift entry.

**Review.** 21 findings: 5 rows patched (3 entries, all `low`: two new or tightened e2e leaves, one comment), 1 deferred (spine drift, AD-7 and AD-19, also in `deferred-work.md`), 15 rejected with reasons in the Review Triage Log (4 `false`, 11 `low`). Follow-up review recommended: false (patched: high 0, medium 0, low 3).

**Verification.**
- Before the review patches, the implementer swapped in the baseline `StartDialog.tsx` and `usePauseFlow.tsx`: the first five leaves all failed, then passed on the new code.
- `npx playwright test --workers=4`: 603 passed.
- `npm run check` (root): exit 0. That covers ruff, 1532 backend tests, `check:api` (format, `tsc -b`, oxlint, 342 unit tests), the e2e suite (603 passed) and the smoke test.

**Residual risks.**
- A later failed home refetch closes an open Start dialog, as `useFreshBookView` already does for the `book` view. Rejected as low.
- `fetchQuery` reuses a home fetch already in flight, which can be a few milliseconds older than the press.
