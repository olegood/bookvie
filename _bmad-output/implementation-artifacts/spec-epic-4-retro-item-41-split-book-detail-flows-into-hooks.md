---
title: 'Split Book detail action flows into hooks and share the one-click request plumbing'
type: 'refactor'
created: '2026-11-10'
status: 'done'
baseline_commit: 'b39e929cbf93a99eacd56d9735fb4e4e6abed8cc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `frontend/src/pages/BookDetailPage.tsx` grew from 359 to 615 lines in Epic 4, and is now the largest frontend file. Its `BookDetail` component holds the delete, Start, Set as Up next, Side read and Pause flows side by side, each with its own refs, counter `useState` and focus-and-announce effect. Epic 5 adds Add card note to the same stack (retro F-A1). `usePauseFlow` and `useOneClickFlow` duplicate their request plumbing: `inFlight`, `mounted`, the `adoptRegions` slot and the late-failure announce. And `useOneClickFlow` lives in `useSetUpNextFlow.ts` (F-A2, action 41).

**Approach:** a behavior-preserving extraction, like Epic 3's item 26:
- Each Book detail flow becomes its own hook in `frontend/src/lib/`, so Add card note can be one more hook.
- One small shared hook holds the request plumbing both flows use.
- `useOneClickFlow` moves to `lib/useOneClickFlow.ts` with neutral names. The `useSetUpNextFlow` wrapper goes, and callers pass `useSetUpNext()`.

## Boundaries & Constraints

**Always:**
- **No behavior change.** These stay byte-for-byte the same:
  - rendered markup, class names, aria attributes and copy;
  - focus targets and the order of announcements.
- **Effect order holds.** Each hook call sits where the code it replaces was, so the order of effects in `BookDetail` is unchanged: delete refocus, Start refocus, the set-up-next flow and its settle effect, the side-read flow and its settle effect, the pause flow and its settle effect.
- **Dialogs render where they do now.** The Start, Pause and Delete dialogs keep their JSX positions; the hooks return them as nodes.
- **Hook files follow `lib/useAlertDialog.ts`:**
  - a prose header comment, an `Options` type and a typed return;
  - `.tsx` only when the hook renders.
- **The existing tests pass unchanged.**
- **Format** only the changed files with the pinned Prettier, from inside `frontend/`.

**Never:**
- New features, or changes to copy, CSS or any e2e spec.
- Changes to `usePauseFlow`'s public options or return, which Home's card uses.
- A re-export shim for `useSetUpNextFlow.ts`.
- Moving the delete flow onto the shared plumbing. Its `inFlight` must stay set after a successful delete while the page navigates away, so it keeps its own.

</frozen-after-approval>

## Code Map

- **`frontend/src/pages/BookDetailPage.tsx`:**
  - `BookDetail` (l.117-462) is the flow code that moves:
    - delete: l.127-138, `openConfirm`, `cancelConfirm` and `confirmDelete` at l.285-311, and the `ConfirmDialog` at l.448-459;
    - Start: l.140-156 and the `StartDialog` at l.446;
    - Set as Up next: l.158-198;
    - Side read: l.200-242;
    - Pause: l.246-283.
  - What stays in `BookDetail`: `editing`, `onSaved`, the ids, `canFinish`, the JSX, and `primaryOrHeading`, which hooks receive as a function that reads the Start button ref.
  - The page component (l.522-615) keeps the Finish and delete hosting. It isn't split: it is short, and Finish must outlive `BookDetail`.
  - The doc comment at l.464-521 names `lib/useSetUpNextFlow.ts` and `useOneClickFlow`, so update those names.
- **`frontend/src/lib/useSetUpNextFlow.ts`:**
  - `useOneClickFlow` (l.53-124) moves to the new file; `useSetUpNextFlow` (l.47-50) is deleted.
  - Duplicated plumbing: `inFlight` and `mounted` (l.58-68), the `adoptRegions` layout effect (l.83-87), and the guarded send with the late `alert` when unmounted (l.89-100, 118-121).
- **`frontend/src/lib/usePauseFlow.tsx`:** the same plumbing at l.71-83, 116-120 and 122-136. Keep its `fallbackRef`, `failure` state machine, dialog and API.
- **`frontend/src/components/SpinePopover.tsx:17`, `:68-80`:** uses `useSetUpNextFlow` with `onSet`.
- **`frontend/src/pages/HomePage.tsx:20`, `:212`:** uses `usePauseFlow`. Unchanged.
- **`frontend/src/api/books.ts:150`, `:172`:** `useSetUpNext`, `useMarkSideRead` and `useUnmarkSideRead` each return `(bookId) => Promise<IntentResult>`.
- **`frontend/src/lib/announce.ts`:** `adoptRegions`, `releaseRegions`, `announce` and `clearAnnouncements`.
- **`frontend/src/lib/useAlertDialog.ts`:** the convention for hook files.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/useIntentRequest.ts` (new). Two pieces:
  - `useIntentRequest()` returns:
    - `isInFlight()`;
    - `run(start, send)`, which sets in flight, clears announcements and calls `start()`. It awaits `send()` and clears in flight. When the owner has unmounted, it announces a failure in `alert` and resolves `null`; otherwise it resolves the result.
  - `useAlertSlot(failed)` returns the slot ref callback, and adopts the live regions into the slot while `failed` holds.
- [x] `frontend/src/lib/useOneClickFlow.ts` (new; delete `useSetUpNextFlow.ts`) -- `useOneClickFlow` built on those two. Rename to neutral names: `OneClickBook`, `OneClickFlow`, and `onDone` in place of `onSet`. Rewrite the header comment generically, naming Set as Up next and Side read as its uses. -- F-A2.
- [x] `frontend/src/lib/usePauseFlow.tsx` -- use `useIntentRequest` and `useAlertSlot`; nothing else changes.
- [x] `frontend/src/components/SpinePopover.tsx` -- `useOneClickFlow({ …, send: useSetUpNext(), onDone })`.
- [x] New hooks in `frontend/src/lib/`. Each moves its block verbatim, with its comments:
  - `useDeleteFlow.tsx`: confirm state, `inFlight`, refocus; returns the Delete button ref, `open`, and the dialog node.
  - `useStartFlow.tsx`: returns the Start button ref, `open`, and the dialog node.
  - `useDetailSetUpNext.ts`: the button ref, the hint state and id, the flow, and the settle effect.
  - `useDetailSideRead.ts`: the button ref, senders, reason, flow, and settle effect.
  - `useDetailPause.ts`: `usePauseFlow` plus the settle effect.
- [x] `frontend/src/pages/BookDetailPage.tsx` -- `BookDetail` calls the five hooks in the order above and keeps its JSX. Update the doc comment's file and hook names.

**Acceptance Criteria:**
- Given the refactor, when `npm run check:api` and the full e2e suite run, then both pass with no test edited.
- Given `BookDetailPage.tsx`, when its `BookDetail` is read, then it holds no flow's refs, counters or settle effects, only the hook calls and the markup.
- Given `frontend/src/lib/`, when searched, then `inFlight`, `mounted` and the `adoptRegions` slot effect appear once (in `useIntentRequest.ts`) for the one-click and pause flows, and `useSetUpNextFlow` exists nowhere.
- Given the Book detail specs (`set-up-next`, `side-reads`, `pause`, `delete-book`, `start-reading`, `finish-any-book`), when run with `--repeat-each=5 --retries=0`, then all pass.

## Design Notes

`run` keeps each flow's order: in flight, then `clearAnnouncements()`, then the owner's own state, then the await. The one-click flow also resets `fellBack` inside `start`. The ordering against React's state batching is the same as today.

```ts
const result = await run(() => { fellBack.current = false; setFailed(false); setBusy(true) }, () => sendIntent(book.id))
if (result === null) return // unmounted: run already announced a failure
```

## Verification

**Commands:**
- `cd frontend && npx prettier --write <changed files>`, then `npm run check:api` -- expected: green (types, oxlint, unit tests).
- `npm run check:py` -- expected: green (unchanged).
- `npm --prefix frontend run e2e` -- expected: every test passes; report any flake.
- `cd frontend && npx playwright test e2e/set-up-next.spec.ts e2e/side-reads.spec.ts e2e/pause.spec.ts e2e/delete-book.spec.ts e2e/start-reading.spec.ts e2e/finish-any-book.spec.ts --repeat-each=5 --retries=0 --workers=6` -- expected: all pass.

## Implementation Notes

- **The three settle effects** in `useDetailSetUpNext` and `useDetailSideRead` carry `// oxlint-disable-next-line react-hooks/exhaustive-deps`. Their focus target is now a `fallback` function passed in, which the rule flags. Before, it was a local the rule didn't track. Adding the function to the deps would re-run the effect on every render, so the suppression keeps the triggers as they were. `useDetailPause` lists its stable ref (`startButton`) in its deps instead, and needs no suppression.
- **Click logic moved into the hooks:** `press` in `useDetailSetUpNext` (it records the hint at the moment of the press) and in `useDetailSideRead`. The hook returns are destructured where the page uses them.
- **Verification (after the review patches):**
  - `npm run check:api`: 237/237;
  - `npm run check:py`: 1208 passed, with coverage gates domain 100% and intents+store 97.95%;
  - `npm --prefix frontend run e2e`: 416/416;
  - the six Book detail specs with `--repeat-each=5 --retries=0 --workers=6`: 535/535, no flakes.
  - No test was edited.

## Review Triage Log

### 2026-11-10: pass 1

Layers: Blind Hunter (floor N = 7, 12 findings), Edge Case Hunter (3), Verification Gap (2), Spine Check (none; it checked AD-3, AD-7, AD-9, AD-18 and AD-19).

- **`[false]` `[reject]` `useIntentRequest.run` has no `try/finally`, so a rejecting `send` leaves `inFlight` set** (Edge Case Hunter, Blind Hunter). Neither sender rejects:
  - `sendIntent` (`api/intents.ts:40`) catches fetch and parse failures as couldn't-save;
  - `invalidateQueries` doesn't throw by default.
  - The code is also the same as it was before.
- **`[false]` `[reject]` `useDeleteFlow` sticks busy if `onDelete` rejects** (Edge Case Hunter). The page's `onDelete` awaits `useDeleteBook`, which goes through `sendIntent`, so it never rejects. Unchanged from before.
- **`[low]` `[patch]` New `exhaustive-deps` suppressions contradict "moved verbatim"** (Edge Case Hunter, Blind Hunter).
  - `useDetailPause`: dropped. The stable `startButton` ref goes in its deps, which changes no trigger.
  - The other two are kept, with the reason in the Implementation Notes: their fix is a ref wrapper, which adds code.
- **`[low]` `[patch]` `useSetUpNext()` called inside the `useOneClickFlow` argument** (Blind Hunter), in `SpinePopover` and `useDetailSetUpNext`. It's now bound to `sendSetUpNext` first, as `useDetailSideRead` already does. The hook order is the same.
- **`[low]` `[patch]` `useDetailPause` said "Pause: the Main book only." twice in a row** (Blind Hunter). The second copy is cut. The other overlaps between header and body are the verbatim move the spec asked for. Rejected.
- **`[low]` `[patch]` The page doc comment had 104- and 109-column lines, mixed forms for naming the hooks, and no mention of `useStartFlow` or `useDeleteFlow`** (Blind Hunter). Rewrapped, given one form, and both hooks named.
- **`[false]` `[reject]` The `dialog` docs are inconsistent: `false` vs "else nothing", and `null`** (Blind Hunter). Both docs describe what renders: `false` renders nothing, and `usePauseFlow` returns `null`. The type is `ReactNode` either way.
- **`[low]` `[reject]` `useDetailPause`'s `resume` option is misnamed** (Blind Hunter). Its doc says what it holds: the primary, which is **Resume** once the Book is paused. That is the only time the hook reads it. Renaming it is cosmetic.
- **`[false]` `[reject]` `BookDetailPage.tsx` may have unused React imports** (Blind Hunter). `BookDetailPage` uses `useCallback`, `useEffect` and `useRef`, at l.350-391. `tsc -b` and oxlint are green.
- **`[false]` `[reject]` The shared plumbing's late-alert path is untested** (Blind Hunter). `set-up-next.spec.ts` pins a failure after the popover unmounts, which exercises `run` returning `null` (per Verification Gap's survey).
- **`[false]` `[reject]` The comment above `useAlertSlot` is stale** (Blind Hunter). It stays accurate: the next press's `setFailed(false)` releases the regions.
- **`[low]` `[reject]` The callback names `onSet` and `onSideReadSet` aren't neutral** (Blind Hunter). They are local to flows that are specific to Set as Up next and Side read, and they keep their original names. The neutral rename applies to `useOneClickFlow`'s API, which is done.
- **`[low]` `[reject]` `onDelete`'s navigation contract is undocumented in `Options`** (Blind Hunter). The hook's header states it: "on success the page has already moved to Catalog, so the request stays in flight". Unchanged from before.
- **`[low]` `[defer]` The Side read in-flight reason and the ignored double press are untested on Book detail** (Verification Gap). The e2e specs are frozen for this refactor. Deferred.
- **`[low]` `[defer]` The Book detail hint kept during a set-up-next request is untested** (Verification Gap). Covered only for the popover. Deferred.
