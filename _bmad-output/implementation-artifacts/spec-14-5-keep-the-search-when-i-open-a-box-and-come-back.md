---
title: 'Story 14.5: Keep the search when I open a box and come back'
type: 'feature'
created: '2026-11-24'
baseline_revision: 'e8cc5f995c2538d091c7284717ec5f8f94e7af01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-14-5-keep-the-search-when-i-open-a-box-and-come-back.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-6, AD-7), reconciled before the next epic: the Capability → Architecture Map still lists the carried search as "Epic 14, planned", and neither the Structural Seed's `lib/` line nor AD-7 names `lib/carriedSearch.ts`.
    evidence: |-
      Spine Check, build-auto review of Story 14.5: ARCHITECTURE-SPINE.md lines 549 and 568. Story 14.5 built the carried search (`frontend/src/lib/carriedSearch.ts`, `CardNotesPage`'s route component keyed by `location.key`). The code is right; the spine is out of date.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md
    severity: low
  - summary: >-
      The Epic 14 gate ("the existing Card notes e2e specs pass unchanged in List view") and epic-14-context.md ("with no edit to their files") don't allow for 14.5's AC-3, which carries the search when the chip is removed, in List view too.
    evidence: |-
      epics.md line 3416; `frontend/e2e/card-notes.spec.ts`'s Story 5.3 chip leaf now expects "spice" carried, as the ATDD checklist planned. No code is wrong. Narrow the gate's wording at the Epic 14 retro or its trace and gate.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Epic 14 gate)
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Card notes search lives in a body keyed by `bookId`. Opening a box, pressing Back or removing the "In *X*" chip drops the text, so Oleg retypes it in every box (FR-19, UX-DR90, UX-DR91). Meanwhile the nav link on the shelf keeps it, because a REPLACE on the same scope keeps the body.

**Approach:** Move the text into the route component `CardNotesPage`, decided in render by a new `lib/carriedSearch.ts` (AD-7, AR65). The text is kept only on a PUSH carrying the page's marker (a box link, the chip), or on a POP landing on the `openedFrom` of the entry just left (Back from a box). Every other key change starts empty. Key the body by `location.key`, scroll to the top on each key, and announce a carried search once after the `h1` has focus.

## Boundaries & Constraints

**Always:**
- `lib/carriedSearch.ts` exports `useCarriedSearch({ noGroups }): readonly [text, setText]` (reads `useLocation()` and `useNavigationType()` itself) and `carryState(openedFrom?)`. It keeps `{ key, state, text }` in one `useState` and updates it during render when `location.key` differs (`HomePage`'s hand-off pattern). Its source must not contain the words `useEffect`, `useLayoutEffect`, `useInsertionEffect` or `useRef`, not even in comments: the unit leaf greps for them.
- `carryState(k)` has at most 2 keys (the marker and `openedFrom: k`), and `carryState()` has 1. Router state never holds the text. The marker is ignored on mount, and any REPLACE starts empty.
- `noGroups` is true only while the entry's view is `ready` with no groups, never while it loads. The stored text is cleared then, not just hidden.
- `CardNotesPage` reads `noGroups` from `useCardNotesView(bookId)` (the same cached query the body uses) and renders `<CardNotesBody key={location.key} …>` with `query` and `onQueryChange` props in place of its `useState('')`.
- On each body mount (that is, each key), a layout effect scrolls to the top with `window.scrollTo({ top: 0, behavior: 'auto' })`, before `PageHeading`'s passive focus effect. If the browser's own Back scroll restoration lands later, scroll again once the view is ready.
- A body that mounts with non-blank text announces it once, after the view is `ready` with groups, by an effect that cancels on cleanup. It reads the same line as the typed path: "N notes match." on the open box and in List, and `shelfCountLine` in Boxes.
- `CardNoteBox` takes a `linkState` prop, which the page builds as `carryState(location.key)` and passes to `<Link state>`. The chip calls `navigate(cardNotesPath(), { state: carryState() })`.

**Never:**
- No server, API, schema, storage or agent-tool change. No new localStorage key. The text never goes in the URL or in `history.state`.
- No change to the shelf's typed search (14.4), the copy, the remembered view, the List or the box visuals. The transitions stay, and boxes that mount with text are drawn in their final state because CSS doesn't transition a first style.
- No edit to `carried-search.spec.ts` beyond removing each `test.skip` and its red-phase comment. No change to `boxStates`, `boxTrack`, `boxFrames` or `strictRoot`.
- No banned git command (AGENTS.md "Story pipeline", Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Into a box | "habit" on the shelf, click Atomic Habits | field "habit", 3 notes in `<mark>`, h1 focused, top, "3 notes match." once | — |
| Into a faded box | "habit", click Refactoring | "No card notes contain “habit”.", pile link, "0 notes match." once | — |
| Back | box text changed to "habits" | shelf with "habits", lifted/faded at once, shelf sentence once, top | — |
| Back, cleared | box field emptied | shelf empty, at rest, nothing announced | — |
| Chip | open box with "habit" (any way in) | `/card-notes` pushed with "habit"; Back to box starts empty | — |
| Other ways | nav link, Forward, reload, typed URL, Back from another route, a plain link | empty, nothing announced | — |
| No groups | carried into a Book whose view is ready with 0 groups | text dropped | — |

</intent-contract>

## Code Map

- `frontend/src/pages/CardNotesPage.tsx:160-166` -- the route component, keyed by `bookId` today: add `useCarriedSearch`, the `noGroups` read and the `location.key` key. `:176` `useState('')` → props. `:191-197` `useSearchCount` stays as the typed path; reuse its line function for the carried announcement. `:303-306` chip → `carryState()`. `:347-353` pass `linkState`. Doc comment `:129-153`: replace "The search lives in this page's state, never in the URL." and "A new scope … starts with an empty search" with the carried-search rules.
- `frontend/src/pages/HomePage.tsx:154-155,162-203` -- the render-phase `{ key, … }` state pattern to copy.
- `frontend/src/components/CardNoteBox.tsx:42` -- `<Link to=… >`: add `state={linkState}`.
- `frontend/src/components/PageHeading.tsx` -- focuses the `h1` in a passive effect on each `location.key` after the first client navigation. It is unchanged, and the body's layout effect runs before it.
- `frontend/src/lib/announce.ts` -- `announce('status', text)` sets the text after 100ms. `clearAnnouncements` cancels it.
- `frontend/src/api/views.ts:152` -- `useCardNotesView` has no `placeholderData`, so a fresh body gets no placeholder data.
- `frontend/src/lib/carriedSearch.test.ts` -- the red unit leaf. Switch `load()` to a static import of `./carriedSearch.ts`, drop the stand-in and `test.skip`, and adjust the header's red-phase paragraph.
- `frontend/e2e/carried-search.spec.ts` -- 5 red e2e leaves (AC-1, 2, 3, 4, 6).
- `frontend/e2e/card-notes.spec.ts:497` -- "removing the chip while searching starts the wider view with an empty search": rewrite it to expect "spice" carried (in List view under the fixture: field "spice", Dune's one matching note).
- `frontend/e2e/search-boxes-automate.spec.ts:269-285` -- a faded box opened with "habit" now shows "No card notes contain “habit”." and "Go through as a pile" instead of `RF note 01`. Update the last lines and the comment.
- Deferred-work intake:
  - `deferred-work.md:1766`: spine drift (AD-6), the strip still listed as planned. Not in this story: spine drift is reconciled before the next epic.
  - `deferred-work.md:1781`: spine drift (AD-6), the shelf search still listed as planned. Not in this story, for the same reason.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/carriedSearch.ts` (new) -- `useCarriedSearch`, `carryState` -- AC-5.
- `frontend/src/lib/carriedSearch.test.ts` -- static import, un-skip -- AC-5.
- `frontend/src/components/CardNoteBox.tsx` -- `linkState` prop on the Link -- AC-1.
- `frontend/src/pages/CardNotesPage.tsx` -- the route holds the text, the body is keyed by `location.key` and takes `query`/`onQueryChange`, scroll to top, a one-time carried announcement, the chip's state, the box link state, and the doc comment -- AC-1 to AC-4, AC-6.
- `frontend/e2e/carried-search.spec.ts` -- remove each `test.skip` and red-phase comment.
- `frontend/e2e/card-notes.spec.ts`, `frontend/e2e/search-boxes-automate.spec.ts` -- the two planned leaf edits.

**Acceptance Criteria:**
- Given the 5 leaves of `carried-search.spec.ts` and the unit leaf in `carriedSearch.test.ts`, when they run un-skipped, then all pass.
- Given the Card notes, boxes, search-boxes, open-box, back-to-top and app-shell e2e specs, when the full suite runs, then they pass with only the two planned edits.
- Given `npm run check`, when it runs, then it exits 0.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 16, false 6, maybe-false 0
- findings:
  - `[low]` `[defer]` (spine) Spine drift (AD-6): the Capability → Architecture Map's FR-17 to FR-19 row still lists the carried search as planned. — Deferred to `deferred-work.md`; the spine is reconciled before the next epic.
  - `[low]` `[defer]` (spine) Spine drift (AD-7, Structural Seed): `lib/carriedSearch.ts` isn't named in the spine. — Same entry as above.
  - `[low]` `[patch]` (intent) AC-5's "dropped while the view has no groups" and the fresh body are tested only on the hook, with `noGroups` fed in directly. — Grouped with the Verification Gap row: a new e2e leaf covers the page's `noGroups` wiring. The fresh pile, panels and pending count are in the ATDD checklist's green follow-ups for `bmad-testarch-automate`, the next pipeline step.
  - `[low]` `[reject]` (intent) Some ways in aren't exercised in e2e: the chip after a box or "See card notes", a box opened with an empty field, "See card notes" or "See all card notes" arriving, the nav link from the open box, and List view after Back. — Each one takes a path the unit leaf runs (a PUSH with or without the marker, a REPLACE, a POP onto `openedFrom`). The ATDD checklist lists them as green follow-ups for `bmad-testarch-automate`.
  - `[low]` `[defer]` (intent) Rewriting `card-notes.spec.ts`'s Story 5.3 chip leaf conflicts with the Epic 14 gate's "pass unchanged in List view". — AC-3 requires the new behavior, and the ATDD checklist planned the edit. Deferred as a wording fix to `epics.md` and the epic context.
  - `[low]` `[patch]` (verification-gap) The page's own `noGroups` wiring has no test. — Added a leaf to `carried-search.spec.ts`: "woods" is carried into Walden (1 note), the note is deleted, and removing the chip shows the shelf with an empty field and nothing announced. It was checked against a mutation (`noGroups: false`), which made it fail with "woods".
  - `[low]` `[defer]` (blind) The deviation from "List is unchanged" and "no edit to existing specs" isn't recorded. — Same root cause as the intent row above; same deferral.
  - `[false]` `[reject]` (blind) `sprint-status.yaml` still reads `backlog`. — Finalize sets `review` and commits it with this build.
  - `[false]` `[reject]` (blind) The `epic-14-context.md` rewrite is outside the story's scope. — step-01 has to recompile it when a planning file is newer (EXPERIENCE.md changed in 14.4), so the workflow requires it.
  - `[low]` `[reject]` (blind) The rewrite drops facts (gate thresholds, column counts, SC 1.4.3). — The file is a generated cache, scoped down on purpose. The facts remain in `epics.md`, DESIGN.md and the test design.
  - `[low]` `[reject]` (blind) A stale cached scoped view with 0 groups drops a carried search before the refetch shows notes. — Real but rare. It needs a Book's open box to have been visited while it had no notes, notes added elsewhere within the cache time, and then a search carried in from the shelf. Fixing it needs fetch state exposed through `toViewState` (new surface). Listed under residual risks.
  - `[low]` `[reject]` (blind) Scroll to top relies on timing, and the mount and ready scrolls are redundant on a cached view. — With a loading view on Back the page is short, so the browser's restoration clamps near the top, and the ready scroll runs at commit. The redundant scroll is harmless. A related real race (a first load's queued frame undoing a later scroll) was found by `npm run check` and fixed: the re-scroll now runs only after a client-side POP.
  - `[low]` `[reject]` (blind) A carried announcement can land on the next page if Oleg leaves within about 100 ms. — The typed path already behaves this way. Leaving that fast is unlikely, and calling `clearAnnouncements` on unmount would wipe other pages' messages.
  - `[false]` `[reject]` (blind) Typing before the carried timer fires gives two announcements. — The timer is 0 ms after the view is ready, and the field doesn't exist until then, so no keystroke can come in between.
  - `[low]` `[patch]` (blind) Red-phase leftovers in `carriedSearch.test.ts`. — The `CarriedSearch` doc and header were reworded. `load()` and `existsSync` stay as the ATDD wrote them, and no assertion changed.
  - `[false]` `[reject]` (blind) A new router-state object for every box on every render. — It is a 2-key object per box, with no measurable cost and no named harm.
  - `[false]` `[reject]` (blind) `setText` isn't stable. — The body re-renders with the route anyway, and no effect or memo depends on the setter.
  - `[false]` `[reject]` (blind) `carries` should be a type guard. — The behavior is the same; it's a style preference.
  - `[low]` `[patch]` (blind) No e2e for the matrix's "No groups" row or for a plain link. — "No groups" is grouped with the Verification Gap patch. A plain link is a push without the marker (unit leaf), and its e2e is in the automate follow-ups.
  - `[low]` `[reject]` (edge) A stale cached empty view drops the carried text. — Same as the blind row above.
  - `[low]` `[reject]` (edge) A pending typed or carried announcement lands on the next entry. — Same as the blind row above.
  - `[low]` `[reject]` (edge) A POP to a view that fails or is missing never reaches `ready`, so the re-scroll never runs. — Those pages are a line or two tall, so restoration can't leave them scrolled. Rare.

### Review Findings

Code review, 2026-11-24, in a new session (`bmad-code-review`), on `git diff e8cc5f9..900b325`. The five layers were Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor and Spine Check. They raised 23 findings, which grouped into 18 entries: 0 `decision-needed`, 3 `patch`, 2 `defer` and 13 rejected. The Edge Case Hunter found nothing (`[]`). The Acceptance Auditor found no behavioral AC violation; its findings were about the spec's own wording. The spec has no manual AC: every AC is a test run or `npm run check`.

- [x] [Review][Patch] The review-added `noGroups` leaf carries no AC id although it covers AC-5's "No groups" matrix row, and it lacks the blank line every other leaf in the file has before it [frontend/e2e/carried-search.spec.ts:297] (blind, `low`)
- [x] [Review][Patch] The rewrapped chip paragraph of `CardNotesPage`'s doc comment runs to 82 columns while the rest of the block wraps at about 78 [frontend/src/pages/CardNotesPage.tsx:158] (blind, `low`)
- [x] [Review][Patch] The build's spine-drift entry says it "closes the chain of 14.2, 14.3 and 14.4 entries above". Drift entries are closed only by the reconciliation pass's `resolved:` lines (AGENTS.md "Architecture spine"), so the wording could make the retro or the next-epic gate skip those entries [_bmad-output/implementation-artifacts/deferred-work.md:1799] (blind, `low`)
- [x] [Review][Defer] Keying the body by `location.key` is not verified by any test: the only same-`bookId` key change, the nav link on the shelf (a REPLACE), now empties the field through `useCarriedSearch`, so AC-4's nav-link branch passes with `key={bookId ?? ''}` too. A fresh pile or panel, a dropped pending count and the scroll to the top after that REPLACE are unpinned. The ATDD checklist's line 83 ("covered by AC-4's nav-link branch") is out of date [frontend/src/pages/CardNotesPage.tsx:191] — deferred: the checklist's green follow-up "E2E, AC-5 fresh body" plans this leaf for `bmad-testarch-automate`, the next step; it should also scroll the shelf down before the click and assert `scrollY` 0 after it. (verification-gap, `low`)
- [x] [Review][Defer] Spine drift (AD-7): "Where the text lives" says each key scrolls to the top before the `h1` takes focus, but doesn't record the second scroll after a client-side POP (when the view is ready, and on the next frame) that the spec's Always rule asks for [ARCHITECTURE-SPINE.md:135] — deferred: spine drift, reconciled before the next epic. (spine)

Full check after the patches, 2026-11-24, in this review session: `npm run check` exit 0 — pytest 2508 passed, unit 415 passed, e2e 862 passed, smoke ok.

**Rejected:**
- (blind + auditor, `low`) The spec's AC and Verification still count 5 leaves in `carried-search.spec.ts`; there are 6. The fix edits this spec; the Auto Run Result and the Review Triage Log name the sixth leaf.
- (auditor + blind, `low`) The sixth leaf breaks the Never rule "no edit to `carried-search.spec.ts` beyond removing each `test.skip`", and the Spec Change Log is empty. The rule keeps the ATDD leaves from being weakened, and adding a leaf weakens none; the fix edits this spec, and the Review Triage Log records the patch.
- (blind, `low`) The Auto Run Result's counts (15 rejected, 3 patched) don't add up against its own Review Triage Log. The fix edits this spec, and the triage log rows stand on their own.
- (auditor + blind, `low`) The recompiled `epic-14-context.md` still says the existing Card notes specs pass "with no edit to their files". Already deferred by the build's 14.5 entry in `deferred-work.md`, which names both `epics.md` and the context.
- (blind, `low`) The recompile dropped the gate thresholds and the shelf's column counts from `epic-14-context.md`. The file is a generated cache; the facts stay in `epics.md`, DESIGN.md and the test design, which the trace and gate read. The build's triage rejected the same finding.
- (blind, `low`) `carriedSearch.test.ts` keeps the ATDD's `load()`, `existsSync` and loosely typed `CarriedSearch`. No assertion is weaker for it, and the runtime key checks catch a shape change; no named harm.
- (blind, `low`) A reload's scroll may land at the top or at the browser's restored position, depending on timing. It wasn't shown to happen, and with the view loading the page is short at mount; at most cosmetic.
- (blind, `false`) Back from another route into List view now goes to the top instead of the browser's restored position. AD-7 and the epic context say every key change scrolls to the top, so this is the specified behavior, not an unrecorded change.
- (blind, `low`) The scroll fix depends on timing instead of `history.scrollRestoration = 'manual'` or `<ScrollRestoration>`. The spec's Always rule chose the ready-time re-scroll; a global switch would change Back on every other page (Catalog, Book detail).
- (blind, `low`) `carriedLine` recomputes the count line on every render. It runs one `shelfCountLine` per keystroke, the same work as the typed path; no measurable cost.
- (blind, `low`) A stale cached view with 0 groups drops a carried search for good. The build's triage already rejected this as rare and as needing new surface (fetch state through `toViewState`); it is listed under residual risks.
- (auditor, `false`) The POP-only re-scroll and its extra frame go beyond the spec. The Always rule says "if the browser's own Back scroll restoration lands later, scroll again once the view is ready", which is what the code does.
- (spine) Spine drift (AD-6, AD-7) on the Structural Seed's `lib/` line (549) and the Capability → Architecture Map row (568): already deferred by the build's 14.5 entry in `deferred-work.md`.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- **The decision, in outline:**
  ```ts
  const [held, setHeld] = useState(() => ({ key: location.key, state: location.state, text: '' }))
  let now = held
  if (held.key !== location.key) {
    const kept = (type === 'PUSH' && carries(location.state)) || (type === 'POP' && openedFrom(held.state) === location.key)
    now = { key: location.key, state: location.state, text: kept ? held.text : '' }
  }
  if (noGroups && now.text !== '') now = { ...now, text: '' }
  if (now !== held) setHeld(now)
  ```
  "The entry just left" is the handled location, so a coalesced move counts from it.
- **The announcement waits for focus:** `PageHeading` focuses in a passive effect when it mounts, and the body's effect runs after its children's effects. `announce` adds its own 100ms tick.

## Verification

**Commands:**
- `cd frontend && node --test src/lib/carriedSearch.test.ts` -- expected: pass.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/carried-search.spec.ts` -- expected: 5 passed.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/card-notes.spec.ts e2e/search-boxes.spec.ts e2e/search-boxes-automate.spec.ts e2e/search-boxes-view-switch.spec.ts e2e/card-note-boxes.spec.ts e2e/open-box.spec.ts` -- expected: pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary.** The Card notes search now goes along with Oleg:
- Text typed on the shelf goes into the box he opens: only its matches, in `<mark>`, the `h1` focused, the page at the top, and "3 notes match." announced once.
- Back from the box, or removing its "In *X*" chip, brings the box's latest text out to the shelf. The boxes are drawn in their search state at once, and the shelf sentence is announced once.
- Every other way in starts empty: the nav link, any other link, Forward, a reload, a typed URL, or Back from another page.
- The text lives only in the `CardNotesPage` route component's state, never in the URL, `history.state` or storage.
- The decision is made during render by `lib/carriedSearch.ts`. The page's body is keyed by `location.key`, and the text is dropped while the view is ready with no groups.

**Files changed:**
- `frontend/src/lib/carriedSearch.ts` (new): `useCarriedSearch({ noGroups })` and `carryState(openedFrom?)`. The router state holds only the `carriesSearch` marker and `openedFrom`.
- `frontend/src/lib/carriedSearch.test.ts`: a static import and the unit leaf un-skipped. The red-phase doc is reworded (a review patch).
- `frontend/src/components/CardNoteBox.tsx`: a `linkState` prop on the box's `<Link state>`.
- `frontend/src/pages/CardNotesPage.tsx`:
  - The route component holds the text and keys the body by `location.key`.
  - Each entry scrolls to the top. After a client-side POP it scrolls again when the view is ready and on the next frame.
  - A body that mounts with text announces it once.
  - The chip pushes `carryState()`, and each box link gets `carryState(location.key)`.
  - The doc comment is updated.
- `frontend/e2e/carried-search.spec.ts`: the 5 ATDD leaves un-skipped. A sixth leaf (a review patch) covers the page's `noGroups` wiring: the search is dropped after deleting the box's only note.
- `frontend/e2e/card-notes.spec.ts`: the planned edit. The Story 5.3 chip leaf now expects "spice" carried into the wider view.
- `frontend/e2e/search-boxes-automate.spec.ts`: the planned edit. A faded box opened with "habit" shows "No card notes contain “habit”." and "Go through as a pile".
- `_bmad-output/implementation-artifacts/epic-14-context.md`: recompiled by step-01, because EXPERIENCE.md was newer than the cached file.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the two deferrals below.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: `14-5-keep-the-search-when-i-open-a-box-and-come-back` set to `review`.

**Review findings.** There were 22 findings: low 16, false 6.
- **Patched, all low:**
  - The `noGroups` coverage: the Verification Gap finding and three related coverage rows led to one new e2e leaf. It was checked against a mutation.
  - The red-phase doc leftovers in the unit test.
- **Found by `npm run check`, not by a reviewer:** a first-load race. The ready-time re-scroll's queued frame undid a scroll made right after the content showed, which failed `card-note-boxes-automate.spec.ts:265` (the axe check with Back to top shown). The re-scroll now runs only after a client-side POP (`useNavigatedHere`, `useNavigationType`), which is the only case where the browser restores a scroll position.
- **Deferred, low:**
  - Spine drift (AD-6, AD-7): the carried search is still listed as planned, and `lib/carriedSearch.ts` isn't named.
  - The Epic 14 gate's "pass unchanged in List view" wording doesn't allow for 14.5's AC-3.
- **Rejected:** 15, each with its reason in the Review Triage Log.
  - The ways in left to automate.
  - The context recompile, and the facts it drops.
  - The stale cached empty view (twice).
  - Scroll timing.
  - An announcement landing on the next entry (twice).
  - A POP to a failed or missing view.
  - The 6 false findings: sprint status, the rewrite's scope, typing before the timer, the per-box state object, the unstable setter, and the type guard.

**Follow-up review recommendation:** false. Patched: high 0, medium 0, low 3 entries.

**Verification:**
- `node --test src/lib/carriedSearch.test.ts`: 1 passed.
- Focused e2e after the build (`carried-search`, `card-notes`, `search-boxes`, `-automate`, `-view-switch`, `card-note-boxes`, `open-box`): 61 passed.
- First `npm run check`: exit 1, with 858 passed and 3 failed.
  - 2 failures were trace-file `ENOENT` errors, because the implementation subagent's Playwright run shared `test-results` at the same time.
  - 1 was the real first-load scroll race described above.
- After the fixes, `carried-search.spec.ts` (6 leaves) and the axe leaf passed 21 of 21 with `--repeat-each=3`.
- Final `npm run check`: exit 0. check:api passed (unit tests 415 passed), check:py passed (2508 passed), check:e2e passed (862 passed) and check:smoke passed.

**Residual risks:**
- A Book whose open box was cached while it had no notes, with notes then added elsewhere within the cache time, drops a search carried into it before the refetch (rejected as rare; it would need fetch state through `toViewState`).
- The Back re-scroll is timing-based: once when the view is ready, and once on the next frame. It held over repeats and the full suite.
- The implementation subagent saw one unexplained `toHaveCount` failure of the new leaf, right after a rebuild. It didn't reproduce in 3 runs, 5 repeats or the full suite.
- The ATDD checklist's green-phase follow-ups are left for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
