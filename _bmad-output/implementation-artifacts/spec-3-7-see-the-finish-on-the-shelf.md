---
title: 'Story 3.7: See the finish on the shelf'
type: 'feature'
created: '2026-11-06'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6d53e90e2e61ba7357a0e38b603c104bf411645a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-3-7-see-the-finish-on-the-shelf.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After **Done** (Story 3.6) the finished Book simply appears as a solid `.read` spine on Home's slice: nothing marks the moment, the bookcase header says nothing, and `status` stays silent.

**Approach:** Client only. The tab that received the successful `finish-reading` carries the moment in its router hand-off state. Home plays it once on the slice (scroll if needed, fill from the old percentage to full, highlight ring), shows "Finished *X*." in the bookcase header for that visit, and announces "Finished *X*. N of M finished." after focus settles. Names and observation rules follow the ATDD checklist's "Contract the Scaffolds Pin"; the 5 red leaves in `e2e/finish-moment.spec.ts` are activated, not rewritten.

## Boundaries & Constraints

**Always:**
- Hand-off: `FinishedState` becomes `{finished: true, bookId, title, reread, fromPercent}`, set by `FinishDialog` from the Book view it opened with. `reread` = some Reading already had a `finishDate`; `fromPercent` = `currentReading.percent`. Home consumes it once per history entry (existing `handledFinish` + `clearHandOffState`), so reload, Back/Forward, a revisit or another tab never sees it. Never derive the moment from a view change (AD-7).
- The moment plays only when the refetched home view shows that Book finished and in the slice; at most once per Home mount (a resize repack or refetch never replays it).
- Order: after the spine is in the DOM and focus has moved to "No Main book.", call `scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'})` on the spine. When it was not fully in the viewport and motion is allowed, start the fill on `scrollend` (fallback ~800 ms). Otherwise start at once.
- Fill (first finish only): render the spine with the Main-style body at `fromPercent` for one frame, then at 100%, so the existing `.fill` `height` transition (600 ms ease-out) runs. On `transitionend` (or instantly under reduced motion) it becomes the solid `.read` spine. The `aria-label` stays the view's ("…, finished") throughout.
- Ring: `.highlight` on the spine during the moment, then removed so the existing `box-shadow` 600 ms fade runs. Re-read: ring only, no fill.
- Reduced motion: `.spine` box-shadow transition off (`transition: none` in the existing `@media` block); fill and ring instant.
- Header line in the Bookcase header after the heading, `body-sm`/`ink-secondary`: "Finished *X*." or "Finished *X* again.". It is state of this Home visit: it survives refetches, and a new mount drops it.
- Status: `announce('status', "Finished X. N of M finished.")` (re-read: "Finished X again. N of M finished.") right after Home focuses "No Main book.", using the refetched view's meter.
- Copy helpers `finishLine(title, reread)` and `finishStatus(title, reread, meter)` in `lib/catalog.ts`, unit-tested. No "!", no praise, no sound, no canvas.

**Never:** No server, API or view change. No moment for non-Main finishes or Book detail (Story 4.5). No Up next focus (Story 4.1). No new keyframes: reuse the `.fill` and `.highlight` transitions.

**Decisions:** Default scroll is `smooth` (AC only pins `auto` under reduced motion). Re-read status copy is the ATDD proposal. Ring hold before fading: 600 ms (Catalog uses 2000 ms; the AC-1 leaf requires the ring gone within 4 s).

## I/O & Edge-Case Matrix

| Scenario | State | Expected |
|---|---|---|
| First finish, spine below fold | 1280×480, LAST_ROW | one scroll call, then 600 ms ease-out fill, ring, header line, status "…1 of 121 finished." |
| Spine already visible | MAIN_AT_300 | scroll call is a no-op `nearest`; fill and ring |
| Re-read | REREAD_AT_300 | ring only; "…again."; meter 1 of 2 unchanged |
| Reduced motion | `reduce` | scroll `behavior: 'auto'`, no motion with duration > 0, ring on with `transition-duration: 0s` |
| Reload / revisit / other tab | after the moment | no motion, no scroll, no header line, no "Finished" status |

</frozen-after-approval>

## Code Map

- `frontend/src/components/FinishDialog.tsx:13,97` -- `FinishedState` type and the `navigate('/', {state})` on ok; `book.readings[].finishDate`, `book.currentReading.percent` give `reread`/`fromPercent`.
- `frontend/src/pages/HomePage.tsx` -- `wantsFinished` (validate the new fields), `clearHandOffState` (keep), the finish effect (L~122: focus the heading, then announce, then capture `{bookId, title, reread, fromPercent}` into visit state). `HomeSlice` passes `finishing` to `Bookcase`.
- `frontend/src/pages/Bookcase.tsx` -- `SliceProps` gains `finishing?: {id, title, reread, fromPercent} | null`. `spineButton` (classes, `--percent`, `.body/.fill` render) gets a "finishing" phase. Header renders the line. Reuse `buttons` ref map; the effect waits until `rows` contains the id. Catalog mode is unchanged.
- `frontend/src/pages/Bookcase.module.css:157-222,291-298` -- `.fill` transition, `.highlight`; add the header-line class and the reduced-motion `.spine` rule. The forced-colors `.highlight` dashed outline is kept.
- `frontend/src/lib/catalog.ts` (+ `catalog.test.ts`) -- the copy helpers beside `spineName`.
- `frontend/e2e/finish-moment.spec.ts` -- the 5 `test.skip` leaves to un-skip; `recordMotion` treats `box-shadow`/`outline` as the ring, anything else on the spine as the fill.
- Do not touch: `useAlertDialog`, `announce.ts`, `CatalogPage` highlight, backend.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/catalog.ts`, `catalog.test.ts` -- `finishLine`, `finishStatus` with first/re-read cases.
- [x] `frontend/src/components/FinishDialog.tsx` -- richer `FinishedState`.
- [x] `frontend/src/pages/HomePage.tsx` -- consume once, announce after focus, hold visit state, pass to slice.
- [x] `frontend/src/pages/Bookcase.tsx`, `Bookcase.module.css` -- header line, scroll → fill → solid, ring, reduced motion.
- [x] `frontend/e2e/finish-moment.spec.ts` -- un-skip AC-1, AC-4, AC-3, AC-2, AC-5 in that order, each failing first.
- [x] `README.md` -- Epic 3 status line, if it lists stories.

**Acceptance Criteria:**
- Given the 5 ATDD leaves, when un-skipped, then `npx playwright test e2e/finish-moment.spec.ts` passes, and `finish-reading.spec.ts`, `home-slice.spec.ts`, `update-page.spec.ts` stay green.
- Given the whole suite, when `npm run check` runs, then it passes, including axe and coverage gates.

## Implementation Notes

- **"Fill to 100%" means the whole spine.** From Home's page field the Finish dialog opens after the save to the last page, so `fromPercent` is 100: a fill from 100% of the body to 100% of the body would not move. During the moment the spine gets `.finishing` (the body's `overflow` visible, the label strip above the fill), and `--percent` goes from `fromPercent%` (one frame, Main-style) to the spine's own height in px, so the same `.fill` `height` transition (600 ms ease-out) rises to the whole spine and the 2px edge line leaves past its top. On `transitionend` (fallback 1 s) it swaps to `.read`.
- **Where the moment lives.** `HomePage` takes it from the hand-off during render (only when the view shows the Book finished), keyed by the history entry: it survives refetches and is dropped by a new mount or another entry. `Bookcase` starts a phase per moment object, so a refetch or repack never replays it; the scroll runs one frame after the spine is in a row, i.e. after Home's focus on "No Main book.". The ring holds 600 ms after the spine is solid (re-read or reduced motion: 600 ms from the start), then fades.
- **Reduced motion.** The `@media (prefers-reduced-motion: reduce)` block moved below the ring rules (its `.spine:not(.highlight)` rule must come after the fade's to win); it turns off the `.fill` and `.spine` transitions. Under it, and for a re-read, the fill phases are skipped.
- **Scaffold fidelity fix (AC-2).** Tab B's synthetic `visibilitychange` was dispatched on `document` without `bubbles`, so it never reached the views' listener on `window` (a real one bubbles). The leaf now dispatches it with `{ bubbles: true }`; nothing else in the 5 leaves changed.
- **Matrix audit (orchestrator).** The "Spine already visible" row had no assertion of the ring or of the no-op `nearest` scroll; AC-5 (`MAIN_AT_300`) now asserts a fill motion, exactly one `block: 'nearest'` scroll call on the spine, and a ring motion. `finish-moment.spec.ts --repeat-each=3`: 15 passed.
- **Red phase.** The leaves were implemented against and passed on first un-skip; their red failures on the pre-3.7 code are the ones recorded in the ATDD checklist.

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH), Edge Case Hunter (EC), Verification Gap (VG), Spine Check (SC).

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC1+BH4 | `phase` survives `finishing` going null; the spine stays Main-style and may start later | low | `spineButton` reads `phase` without checking `finishing`; a navigation to a new `/` entry before `begin` leaves `fill: 'from'`. Direct correction. | patch |
| BH11 | Bookcase doc comment omits "again." and the ring-only paths | low | Comment text vs `finishLine` and `instant`. | patch |
| VG1 | The fill's starting point (`fromPercent`) is never asserted | gap (pre-verified) | No test reads the first fill height; Book-detail path starts at 91%. | patch |
| VG2 | No test that a same-mount refetch or repack in tab A does not replay | gap (pre-verified) | AC-2 covers reload, revisit and tab B only. | patch |
| VG-other | AC-1 comment "filled from 91%" is stale | low | AC-1 finishes from the page field, where `fromPercent` is 100. | patch |
| SC1 | AD-7 describes the moment as "a single ~600ms spine fill"; re-read ring-only, reduced motion and the scroll are not reflected | low | The behaviour is the epic's AC (UX-DR42); the spine text is out of date, not the code. Fix edits the architecture spine. | defer |
| SC2 | `reread` is classified on the client (AD-6 list) | low | It only selects copy and whether the fill plays, from server-supplied `finishDate`s; the fix adds a view field. | reject |
| EC2+BH5 | Finished spine may be outside the 3 slice rows | low | Only with a backdated Finished on and 3 rows of later finishes (`_slice_priority` newest first); then the moment plays on the repack that shows it. Fix adds a branch. | reject |
| EC3+BH6 | `scrollend` only on `window`; nested scroller | false | Home has no scroll container (`base.css`); the window scrolls. Without `scrollend` the 800 ms fallback starts the fill. | reject |
| EC4 | `measured` missing at the first moment render | false | Heights are measured in a layout effect before paint; `to` starts at least a frame later. | reject |
| EC5 | `transitionend` from another descendant | false | Only `.fill` transitions `height` inside a spine. | reject |
| EC6+BH2 | Status skipped when the moment lands after focus | false | `noMain` and `shownFinished` read the same `view.data`; the moment is set during that render, before the focus effect. | reject |
| EC7 | Empty title gives "Finished ." | false | Titles are required non-empty by `book_fields`. | reject |
| EC8 | Leaves edited despite "activated, not rewritten" | false | Both edits (bubbling event, added AC-5 asserts) are recorded in Implementation Notes; no expectation was weakened. | reject |
| BH1 | README "19 of 41 stories" stale | low | Pre-existing since 3.1; already in deferred-work.md. | reject |
| BH3 | Header line stays after another tab starts a new Main | low | Multi-tab only; the line is still true for this visit. | reject |
| BH7 | A title with "!" breaks the tone check | low | The title is user data; the rule is about app copy. | reject |
| BH8 | `finishMoment` parsing untested | low | Happy path covered by every leaf; malformed router state needs history tampering. | reject |
| BH9 | `reread`/`fromPercent` frozen at dialog open | low | Needs another tab to change the Reading while the dialog is open. | reject |
| BH10 | Last fill frame vs solid spine unchecked (border swap) | low | Cosmetic 1-frame border change; overflow clipping is by design. | reject |
| BH12 | Diff omits spec and sprint-status | false | Excluded from the review diff on purpose. | reject |

## Verification

**Commands:**
- `cd frontend && npx playwright test e2e/finish-moment.spec.ts e2e/finish-reading.spec.ts e2e/home-slice.spec.ts` -- all pass, 0 skipped from 3.7
- `npm run check` -- green
