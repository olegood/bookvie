---
title: 'Make the carried search wait for fresh data, and put the count in the faded box''s name'
type: 'bugfix'
created: '2026-11-24'
status: 'done'
baseline_revision: '9c879f49f134454dfca34e4463f6ceb2b9456805'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-retro-2026-11-24.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Spine drift (AD-7), reconciled before the next epic: the Carried Card notes search's "Announcement" and "When the text is kept" still say the carried line fires once the view is `ready` and the text is dropped while the view has no groups; the code now waits for a settled view (ready and not fetching) for both, and typing or opening a panel first drops the carried line.
    evidence: |-
      Spine Check, build-auto review of item 98; ARCHITECTURE-SPINE.md lines 137 and 140; CardNotesPage.tsx noGroups and carriedLine, views.ts fetching. Item 99 records the announcement rule; this entry also covers the noGroups half.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:137
    severity: low
  - summary: >-
      Spine drift (AD-6), reconciled before the next epic: the client presentation list's search item says a carried search's one announcement reads the view once it is `ready`; it now reads it once settled (ready and not fetching).
    evidence: |-
      Spine Check, build-auto review of item 98; ARCHITECTURE-SPINE.md line 118.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-bookvie-2026-10-29/ARCHITECTURE-SPINE.md:118
    severity: low
---

<intent-contract>

## Intent

**Problem:** Epic 14 retro item 98 (E14-R1, E14-R2, E14-S3; sprint item `epic-14-retro-item-98-fresh-carried-search-and-faded-box-name`). (R1) A carried search announces its count once, from the cached view as soon as it is `ready`. After an edit in the box, Back announces the shelf's stale count, and nothing corrects it when the refetch lands. (R2) `noGroups` reads the same cache, so a stale empty open box (cached `groups: []`) clears the carried text for good before the refetch shows the Book's notes. (S3) A faded box shows "4 card notes" but is named "*Refactoring*, no match", which leaves its visible count out of its name (WCAG 2.5.3).

**Approach:** The card-notes view reports whether it is still fetching. The carried announcement and `noGroups` act only on a settled view: ready and not fetching. Stale cached data still renders at once, and only these two one-shot decisions wait. A faded box is named "*Title*, N card notes, no match". The planning text, the tests that pin the old name, and the axe leaf's known name gap follow.

## Boundaries & Constraints

**Always:** Keep the stale-while-refetching render (no loading flash on Back). The announcement still fires once per entry, after the `h1` has focus, with the view's own line (shelf sentence in Boxes, "N notes match." in List or the open box). A typed search before the carried announcement fires replaces it: the typed path speaks, and the carried line is dropped. Format only the files you change, with the project's pinned tools.

**Never:** No `refetchOnMount`/`staleTime` change for the card-notes query, and no change to `toViewState` or other views. Don't move logic out of `CardNotesPage.tsx` into hooks (E14-A1 is still an open question). No spine edit (item 99 owns the rule). No README edit. No change to the List's or the open box's own announcement wording. Never run the git commands banned by AGENTS.md "Story pipeline" (Epic 8 retro item 64).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit, then Back | "habit" on the shelf (17 in 4), open Atomic Habits, edit a matching note so it no longer matches, Back | Field "habit"; `status` announces "16 card notes in 4 Books contain “habit”." once, never the cached 17 | Shelf GET delayed in the test, so the stale window is wide |
| Stale empty box | Main book B has 0 notes; Home → "See card notes" (caches B empty) → Home, add a "habit" note to B → shelf, type "habit", open B's box | Field keeps "habit", B's note shows with `<mark>`, "1 note matches." once | B's scoped GET delayed in the test |
| Fresh empty box | A box whose refetched view has no groups | Text cleared, "No card notes yet." (unchanged) | — |
| Faded box name | Box with 4 notes, 0 matches | "Refactoring, 4 card notes, no match"; "Walden, 1 card note, no match" | — |

</intent-contract>

## Code Map

- `frontend/src/api/views.ts:153` `useCardNotesView` -- returns `CardNotesViewState`; add `fetching` (the query's `isFetching`, which TanStack's optimistic result already reports `true` on a mount that will refetch). `toViewState` (`:63`) stays as it is.
- `frontend/src/pages/CardNotesPage.tsx:187-189` -- `noGroups` → also `!view.fetching`.
- `frontend/src/pages/CardNotesPage.tsx:259-273` -- `carriedLine` needs ready, not fetching and groups; the `search` handler (`:230`) marks a typed search so a pending carried line is dropped. Update the component doc (`:145-155`, "once the view is ready" → settled).
- `frontend/src/lib/carriedSearch.ts:45-50,61` -- doc: `noGroups` means a settled empty view (no logic change).
- `frontend/src/lib/cardNotes.ts:207-217` `cardNoteBoxName` -- `matches === 0` → `${title}, ${cardNoteCount(count)}, no match`; doc example.
- `frontend/src/lib/cardNotes.test.ts:349-361` -- the no-match assertion, plus a singular case.
- `frontend/src/components/CardNoteBox.tsx:57` -- comment: drop the deferral sentence.
- `frontend/e2e/search-boxes.spec.ts:50,195,212-218,380`; `frontend/e2e/search-boxes-automate.spec.ts:39-46,83,129,275` -- names; `FADED_BOX_GAPS` keeps only `color-contrast`, and the AC-1 axe leaf's title and comment say one gap.
- `frontend/e2e/carried-search-automate.spec.ts` -- the two new leaves; reuse `searchTheShelf`, `announced`, `recordStatus`, `chip`, `notes`, `boxOfBook`, `isShelfView`, `seeCardNotes`, `noteField`/`pageField`, `mainNav`. Grep the e2e exports before writing a helper (Epic 11 item 78).
- `_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:364,368,485` -- the name; the count after Back is the notes as they are now.
- `_bmad-output/planning-artifacts/epics.md:355` (UX-DR90 names), `:3587` (14.4 AC-2 names); `_bmad-output/implementation-artifacts/epic-14-context.md:22`.
- `_bmad-output/implementation-artifacts/deferred-work.md:1793-1796` -- the faded-name entry: add `resolved:`.

## Tasks & Acceptance

**Execution:**
- `frontend/src/api/views.ts` -- add `fetching: boolean` to the card-notes view state -- one source for "settled".
- `frontend/src/pages/CardNotesPage.tsx` -- gate `noGroups` and `carriedLine` on not fetching; drop the carried line once the user types -- fixes R1, R2.
- `frontend/src/lib/carriedSearch.ts` -- doc only.
- `frontend/src/lib/cardNotes.ts`, `cardNotes.test.ts`, `components/CardNoteBox.tsx` -- the new faded name -- fixes S3.
- `frontend/e2e/search-boxes.spec.ts`, `search-boxes-automate.spec.ts` -- the new name; drop the axe name gap.
- `frontend/e2e/carried-search-automate.spec.ts` -- the leaves "edit then Back announces the fresh count" and "a stale empty view doesn't clear a carried search". Each must fail on the baseline code: check that by reverting the `CardNotesPage.tsx` gate by hand, then restoring it.
- EXPERIENCE.md, epics.md, epic-14-context.md, deferred-work.md -- the wording above, and the `resolved:` line.

**Acceptance Criteria:**
- Given a carried search and a refetch in flight, when the page mounts, then nothing is announced until the refetch settles, and the announcement uses the refetched notes.
- Given a carried search and a cached empty scoped view, when the box mounts and the refetch returns notes, then the field still holds the text.
- Given a shelf search, when a box has no match, then its name is "*Title*, N card notes, no match", and axe on the searched shelf reports no `label-content-name-mismatch`.
- `npm run check` passes.

### Review Findings

Code review, 2026-11-24 (`bmad-code-review`, new session; diff `9c879f4..c371563`; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check; none failed).

- [x] [Review][Patch] No leaf opens a panel while a carried line waits, so `silence()` can regress unnoticed: putting `count.cancel()` back at any of its four sites passes every test [frontend/e2e/carried-search-automate.spec.ts:223]
- [x] [Review][Patch] `epic-14-context.md` still says the text is dropped "while the view has no groups", not while it is settled with no groups [_bmad-output/implementation-artifacts/epic-14-context.md:37]
- [x] [Review][Patch] EXPERIENCE.md says neither that the announcement into an open box waits for the refetched notes nor that typing or opening a panel first drops it [_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md:367]
- [x] [Review][Patch] The header comment of `carried-search-automate.spec.ts` says item 98 adds two leaves; it adds three [frontend/e2e/carried-search-automate.spec.ts:7]
- [x] [Review][Patch] The faded-name entry's `resolved:` line leaves out the `card-note-boxes-plan` D11 note [_bmad-output/implementation-artifacts/deferred-work.md:1796]
- [x] [Review][Defer] The accepted residual risks live only in this spec: a failed refetch counts as settled, so it announces the cached count, or clears a carried search from a stale empty box (R2 again, on error); the typed path can read a stale copy when a refetch outlasts the 500 ms pause [frontend/src/pages/CardNotesPage.tsx:191] — deferred: accepted by design (Design Notes); recorded in `deferred-work.md` so the retro sees it
- [x] [Review][Defer] Spine drift (AD-6 line 118, AD-7 lines 137 and 140): settled, not `ready`, and the drop of a pending carried line [ARCHITECTURE-SPINE.md:137] — deferred: already recorded by the build's review in `deferred-work.md` (spine drift, reconciled before the next epic; item 99)

- Full check after the patches, 2026-11-24: `npm run check` exit 0 (pytest 2508 passed, unit 416 passed, e2e 876 passed, smoke ok). The new Edit leaf failed with `count.cancel()` put back at `openEdit` by hand ("3 notes match." spoken over the panel), then passed with `silence()` restored.

**Rejected:**
- `false` — Acceptance Auditor: `silence()` goes beyond the "typed search" Always rule. Nothing forbids it; it keeps the announcement once and never over a panel, and the build's triage recorded it.
- `false` — Acceptance Auditor: the "Fresh empty box" row has no leaf. `carried-search.spec.ts:285` empties a box on a refetched (settled) view, and the chip then lands with an empty field.
- `low` — Acceptance Auditor: item 98's `action_items` entry in `sprint-status.yaml` still reads `open`. It is no `development_status` story, and the review's status facts write the spec frontmatter only.
- `low` — Blind Hunter: the spec contradicts itself on the number of leaves, its Spec Change Log is empty, and its ACs omit the typing drop. Each fix edits the spec under review.
- `false` — Blind Hunter: UX-DR90, EXPERIENCE.md:362 and D10 still quote "14 card notes in 4 Books". They describe an illustrative library (*Deep Work* "5 of 27"), not the e2e fixture; Story 14.4's AC-2 carries the fixture's 17.
- `low` — Blind Hunter: the stale-window assertions race the fixed 1,500 ms hold. They are in-page checks well inside the hold, and they passed the full suite; a test-released hold adds plumbing.
- `low` — Blind Hunter: `search-boxes.spec.ts:219` rebuilds the plural inline. The unit test pins both numbers with literals.
- `low` — Blind Hunter: no unit test for `fetching`. The edit-then-Back leaf fails if the mount doesn't report fetching (it would announce 17).
- `low` — Edge Case Hunter: a hung refetch never announces. A local fetch that never resolves isn't an everyday case, and a timeout adds state.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 28 findings — high 0, medium 2, low 24, false 2, maybe-false 0
- findings:
  - `[low]` `[defer]` Spine Check: AD-7 "Announcement" (line 140) still says once `ready` — spine drift, deferred (spine policy; item 99 owns the rule).
  - `[low]` `[defer]` Spine Check: AD-7 "When the text is kept" (line 137) doesn't say a refetching empty view keeps the text — spine drift, deferred with the entry above.
  - `[low]` `[defer]` Spine Check: AD-6 client presentation list (line 118) says once `ready` — spine drift, deferred.
  - `[low]` `[patch]` Verification Gap: no leaf types during the held refetch, so the drop of the carried line is unprotected — added "typing before a carried search is announced drops it"; it fails with HABITS_LINE twice when the `search` guard is removed by hand.
  - `[low]` `[reject]` Verification Gap: a failed refetch is untested — accepted behavior in Design Notes (the cached copy is all there is), and a local server erroring during Back is rare; the leaf would add a route-failure harness for no behavior change.
  - `[false]` `[reject]` Intent Alignment: no leaf compares F1/F2/F3 — item 98's own "New leaves" bullet names the two leaves; the open question's "a leaf for each" is those leaves, and Design Notes record the choice.
  - `[low]` `[reject]` Intent Alignment: List, chip and non-empty stale open box paths untested — they run the same `settled` gate as the tested Boxes path; extra leaves would repeat it.
  - `[low]` `[patch]` Intent Alignment: stale-first not shown in leaf 1 — grouped with Blind Hunter 3; patched.
  - `[low]` `[patch]` Intent Alignment: the typing-drop rule is untested — grouped with Verification Gap 1; patched.
  - `[low]` `[reject]` Intent Alignment: "fresh" means not fetching, so a failed refetch still announces the cached copy — matches item 98's "fresh (not fetching)"; documented in Design Notes.
  - `[false]` `[reject]` Intent Alignment: changes outside item 98's Changes list — `views.ts` carries the flag the fix needs, `CardNoteBox.tsx` held the deferral comment, `epic-14-context.md` repeats the name; none is scope creep.
  - `[medium]` `[patch]` Blind Hunter: a pending carried line fires over an Edit, Add, pile or chip press made during the refetch — `silence()` (cancel the count and drop the carried line) replaces `count.cancel()` at all four sites.
  - `[low]` `[patch]` Blind Hunter: the typed path can still read stale groups, so EXPERIENCE.md's "never an older copy" overclaims — the sentence is narrowed to the announcement; gating the typed path is rejected (only when a refetch outlasts the 500 ms pause, pre-existing, adds a branch).
  - `[low]` `[patch]` Blind Hunter: leaf 1 never shows the cached 17 — it now asserts HABIT_LINE visible while the GET is held, then 16.
  - `[low]` `[patch]` Blind Hunter: leaf 2 never shows the cached empty view — it now asserts "No card notes yet." while Emma's GET is held.
  - `[low]` `[patch]` Blind Hunter: no test for the typing drop — grouped with Verification Gap 1.
  - `[low]` `[reject]` Blind Hunter: no unit test for `fetching` — leaf 1 fails if the first render didn't report fetching (it would announce 17), so the optimistic claim is pinned end to end.
  - `[low]` `[reject]` Blind Hunter: failed refetch path untested — as Verification Gap 2.
  - `[low]` `[patch]` Blind Hunter: planning text for the freshness rule — `epic-14-context.md:39` now says settled; UX-DR91 and EXPERIENCE "Into a box" already say "once focus has settled", true as written.
  - `[low]` `[patch]` Blind Hunter: `card-note-boxes-plan` D11 still prescribes "no match" — the cell notes it is superseded by item 98. `review-rubric-epic14.md` and the mockup are dated records; not edited.
  - `[low]` `[patch]` Blind Hunter: `fetching` doc doesn't say background refetches count — the `CardNotesViewState` doc now says so.
  - `[low]` `[reject]` Blind Hunter: no axe run on the all-faded or singular faded state — the name is one branch, pinned by unit tests in both numbers; the axe leaf covers the rule on a faded box.
  - `[medium]` `[patch]` Edge Case Hunter: panels opened during the refetch — same root cause as Blind Hunter 1; patched there.
  - `[low]` `[reject]` Edge Case Hunter: the typed path speaks a stale count — needs a refetch longer than the 500 ms pause on a local server; pre-existing, and the fix adds a branch.
  - `[low]` `[reject]` Edge Case Hunter: a hanging refetch never announces — a local fetch that never resolves is not an everyday case; a timeout adds state.
  - `[low]` `[reject]` Edge Case Hunter: a focus or post-intent refetch delays the carried line — harmless delay; now documented on `fetching`.
  - `[low]` `[reject]` Edge Case Hunter: AC-1 vs a failed refetch — documented accepted behavior (Design Notes).
  - `[low]` `[reject]` Edge Case Hunter: Approach vs the typed path — the Approach gates only the two one-shot decisions; EXPERIENCE.md narrowed as above.

## Design Notes

- **Pipeline:** `bmad-build-auto` → `bmad-code-review` (AGENTS.md "Story pipeline"; Epic 14 retro item 98 names these two steps for this retro-item spec, with no ATDD or automate step).
- **The test for "fresh"** (the retro's open question): `!isFetching` on the same query, not `refetchOnMount: 'always'` with `isFetchedAfterMount`. With the default `staleTime` 0, every mount with cached data already refetches. And `isFetchedAfterMount` on `CardNotesPage`, which stays mounted across entries, would track the query key, not the history entry. A failed refetch keeps the cached data and ends fetching, so the view counts as settled then: the cached copy is all there is.
- **Typing before the carried line fires:** the typed path announces after its own pause. Without the drop, the late carried line would speak a second count.

## Verification

**Commands:**
- `cd frontend && node --test 'src/**/*.test.ts'` -- expected: unit tests pass (frontend has no `test` script; `check:api` runs these).
- `cd frontend && npx playwright test e2e/carried-search-automate.spec.ts e2e/carried-search.spec.ts e2e/search-boxes.spec.ts e2e/search-boxes-automate.spec.ts` -- expected: pass.
- `npm run check` -- expected: exit 0.

## Auto Run Result

Status: in-review

- **Change:** the card-notes view reports `fetching`; the carried announcement and `noGroups` act only on a settled view (ready and not fetching), so Back after an edit announces the refetched count and a stale empty open box no longer clears a carried search. Typing, or opening Edit, Add, the pile or the chip, drops a pending carried line. A faded box is named "*Title*, N card notes, no match".
- **Files:** `frontend/src/api/views.ts` (`fetching`); `frontend/src/pages/CardNotesPage.tsx` (the gate, `silence()`); `frontend/src/lib/carriedSearch.ts` (doc); `frontend/src/lib/cardNotes.ts` and `cardNotes.test.ts` (the name); `frontend/src/components/CardNoteBox.tsx` (comment); `frontend/e2e/search-boxes.spec.ts`, `search-boxes-automate.spec.ts` (names; axe name gap dropped, `label-content-name-mismatch` run explicitly since it is experimental and the tag set never ran it); `frontend/e2e/carried-search-automate.spec.ts` (three new leaves); EXPERIENCE.md, `epics.md` (UX-DR90, 14.4 AC-2), `epic-14-context.md`, `card-note-boxes-plan-2026-11-23.md` (D11 note), `deferred-work.md` (faded-name `resolved:`, two spine-drift entries).
- **Review:** 28 findings; 10 rows patched (2 medium, 8 low, in 8 fixes), 3 deferred as spine drift (AD-6, AD-7), 15 rejected with reasons in the triage log.
- **Follow-up review recommended:** false (no high, one medium entry patched).
- **Verification:** `npm run check` exit 0 after the patches (875 e2e passed, check:py and smoke passed). A first run made while the implementation subagent ran Playwright failed 6 unrelated specs with ENOENT on shared `test-results/` artifacts; the clean re-run passed. The implementation reports the two named leaves failed with the `CardNotesPage.tsx` gate reverted by hand, and the typing leaf failed with its guard removed.
- **Residual risks:** a failed refetch counts as settled and announces the cached copy; the typed path can read a stale copy if a refetch outlasts the 500 ms pause; EXPERIENCE.md lines around 362 and UX-DR90 still quote "14 card notes in 4 Books" (should be 17), not in this item.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
