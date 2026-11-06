---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-06'
storyId: '3.7'
storyKey: '3-7-see-the-finish-on-the-shelf'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-37-see-the-finish-on-the-shelf'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-3-7-see-the-finish-on-the-shelf.md'
generatedTestFiles:
  - 'frontend/e2e/finish-moment.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 3; Story 3.7; NFR6; AR12)'
  - '_bmad-output/implementation-artifacts/epic-3-context.md (Tone, No optimistic updates, Finish moment)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (State Patterns → Finish moment, Finish moment re-read; Motion; Highlight ring)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Bookcase header line, Highlight ring, Finish fill, Spine → Main book never finished)'
  - '_bmad-output/test-artifacts/test-design-qa.md (FIN-E2E-001, R-11)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml (3-7 backlog)'
  - '_bmad-output/test-artifacts/atdd-checklist-3-6-finish-my-main-book.md (format, hand-off state)'
  - 'frontend/src/pages/HomePage.tsx, Bookcase.tsx, Bookcase.module.css; frontend/src/components/FinishDialog.tsx; frontend/src/lib/catalog.ts, announce.ts'
  - 'frontend/e2e/fixtures.ts, home.ts, bookcase.ts, intents.ts, finish-reading.spec.ts, home-slice.spec.ts, bookcase.spec.ts, bookcase-details.spec.ts, update-page.spec.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given Done succeeds for the Main book in this tab, when Home renders, then the slice first scrolls the finished spine into view if needed, then fills it from its current fill to full, bottom to top, over about 600 ms ease-out with the highlight ring, and it stays solid (UX-DR42), and the bookcase header shows "Finished X.", the meter updates, and once focus has settled the status region reads "Finished X. 25 of 73 finished."' }
  - { id: AC-2, idSource: generated, text: 'Given the finish moment has played, when I reload, revisit Home, or look at another tab or browser that only received refreshed views, then the fill never plays again and the header line is gone (AD-7, NFR6)' }
  - { id: AC-3, idSource: generated, text: 'Given a finished re-read, when Done succeeds, then only the highlight ring plays (the spine is already full color), the header reads "Finished X again.", and the meter count doesn''t change' }
  - { id: AC-4, idSource: generated, text: 'Given prefers-reduced-motion: reduce, when the finish moment happens, then the fill and ring are instant and the scroll uses behavior: ''auto''' }
  - { id: AC-5, idSource: generated, text: 'Given the finish moment, when it plays, then there is no sound, no confetti, no praise and no exclamation mark' }
---

# ATDD Checklist - Epic 3, Story 3.7: See the finish on the shelf

**Date:** 2026-11-06
**Author:** Oleg
**Primary test level:** E2E (Playwright against the real `bookvie`)

---

## Story Summary

As Oleg, I want the finished Book's spine to fill with its color, once, so that finishing feels like something on my shelf changed, without fuss.

What exists today:
- Story 3.6's **Done** navigates to `/` with router state `{finished: true}`. Home focuses the "No Main book." heading once, then clears the state from the history entry (`clearHandOffState`), so a reload, Back or Forward doesn't repeat it.
- After the refetch, the finished Book renders as a `.read` spine (full color) at once. There is no motion, no header line and no `status` line.
- The Main spine's fill is a `height` transition of 600 ms `ease-out` (Story 3.5), turned off under reduced motion.
- Catalog's highlight ring after an add is an accent `box-shadow` (`.spine.highlight`) that fades over a `box-shadow` transition.

**What 3.7 adds:**
- **The finish moment** on Home's slice, only in the tab that received the successful `finish-reading`: scroll into view if needed, fill from the current fill to full, the ring.
- **The header line** "Finished *X*." (or "Finished *X* again."), shown once.
- **The status line** "Finished *X*. N of M finished.", after focus has settled.

**Not in 3.7:**
- Finishing a non-Main Reading from Book detail (no moment, "Finished *X*." in status): Story 4.5.
- "No Main book." with Up next suggested, and focus on its button: Story 4.1.

**Story source:** `epics.md` → Story 3.7. There is no spec file yet: `sprint-status.yaml` has `3-7-see-the-finish-on-the-shelf: backlog`.
- When `spec-3-7-…md` is written, link this checklist under its Dev Notes (`### ATDD Artifacts`).
- The spec should adopt the copy and the observation rules under "Contract the Scaffolds Pin", or change the scaffolds along with them.

**Stack:** `fullstack`. `tea_use_playwright_utils` is false, so the scaffold uses the project's `fixtures.ts` and plain Playwright, as in Stories 1.6 to 3.6.

**Generation mode:** AI generation from the criteria, the UX docs and the code. There was no browser recording, because the moment doesn't exist yet. Locators are roles and names: the `region` "Bookcase", the slice `list`, the spine `button` "*X* by …, finished", the `progressbar` "Books finished", the `status` region, and the `heading` "No Main book.".

**Execution:** **sequential** with one author, as in Stories 1.6 to 3.6.

---

## Acceptance Criteria

The criteria have no ids, so they are numbered AC-1 to AC-5, one per Given/When/Then block in source order. The full text is in the frontmatter.

| ID | Criterion (short) | Level | Priority | Scaffold |
|---|---|---|---|---|
| AC-1 | Done for the Main book: scroll into view, ~600 ms ease-out fill with the ring, stays solid, header line, meter, status line after focus | E2E | P1 | `[P1] AC-1` |
| AC-2 | Never replays: reload, revisit, another tab that only refetched; the header line is gone | E2E | P1 | `[P1] AC-2` |
| AC-3 | Re-read: only the ring, "Finished *X* again.", the meter count unchanged | E2E | P2 | `[P2] AC-3` |
| AC-4 | Reduced motion: instant fill and ring, scroll `behavior: 'auto'` | E2E | P2 | `[P2] AC-4` |
| AC-5 | No sound, no confetti, no praise, no exclamation mark | E2E | P2 | `[P2] AC-5` |

**Priorities:** `test-design-qa.md` lists the moment as FIN-E2E-001 at P2 (R-11, score 4, and the tone NFR).
- **Raised to P1:** AC-1 and AC-2. AC-1 is the story's whole user-visible promise. AC-2 is the part of FIN-E2E-001 that R-11 is about (a moment caused by a refetch instead of by this tab's response), and NFR6 says the moment never replays.
- **P2:** AC-3, AC-4 and AC-5, as in the test design.

**Level split:** E2E only. The moment is decided and drawn by the client from this tab's `finish-reading` response (epic-3-context → No optimistic updates). The server's `finish-reading`, the meter and the slice priority are unchanged and already proven by Stories 3.5 and 3.6 at API level. There is no pure function in the criteria worth a unit leaf; the copy helpers can get `node --test` cases in the green phase if the spec adds them to `src/lib/`.

---

## Story Integration Metadata

- **Story ID:** `3.7`
- **Story Key:** `3-7-see-the-finish-on-the-shelf`
- **Story File:** `_bmad-output/planning-artifacts/epics.md` (Story 3.7)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-3-7-see-the-finish-on-the-shelf.md`
- **Generated Test Files:** `frontend/e2e/finish-moment.spec.ts`
- **Shared helpers added:** none. The spec imports `home.ts` and `bookcase.ts` as they are.

---

## Contract the Scaffolds Pin

- **The header line** is text in Home's `region` "Bookcase", exactly "Finished The Left Hand of Darkness." (or "… again." for a re-read). *X* may be in a nested element; the line's text content is what is matched.
- **The status line** is exactly "Finished *X*. N of M finished.", with N and M from the refetched meter.
  - **For a re-read, "Finished *X* again. 1 of 2 finished." is this checklist's proposal.** The UX docs give only the header line for a re-read. The spec may change it, along with the scaffold.
- **The finished spine** is the slice's `button` named "The Left Hand of Darkness by Ursula K. Le Guin, finished". When it ends, its computed `background-color` is its spine color.
- **How motion is observed** (`recordMotion`, an init script):
  - every CSS transition or animation that starts on a spine `button` or inside it is recorded with its animated properties, its duration in ms and its easing;
  - the ring is an accent `box-shadow` (or `outline`) on the spine, its slot or inside it. Any other animated property on the spine counts as **the fill**;
  - every `scrollIntoView` call is recorded with the element's `aria-label` and the options.

  The fill can be a transition or a keyframe animation; either is seen. A ring drawn by a pseudo-element's `opacity` would be counted as a fill, so keep the ring a `box-shadow`, as on Catalog.
- **"About 600 ms"** is 500 to 700 ms, with easing `ease-out`.
- **"Never replays"** is checked two animation frames after the finished spine is shown: nothing on the spine has started moving or been scrolled to, and the header line is absent.
- **Reduced motion:** the spine is scrolled to with `behavior: 'auto'` (other options are free), nothing on the spine runs with a duration above 0, and the ring is on with `transition-duration: 0s`.

---

## Red-Phase Test Scaffolds Created

There is one skipped leaf per criterion, 5 in all. Each uses `test.skip(...)`, and each title carries exactly one `[P#] AC-n`.

**Red check:** each leaf was un-skipped once on the current code, in a temporary copy that has since been deleted. All 5 fail at their criterion assertion:
- AC-1, AC-2, AC-3 and AC-5: the header line, "element(s) not found".
- AC-4: the poll for the spine's `scrollIntoView` call receives `[]`.

**Recorder check:** a temporary probe (deleted) moved the Main spine from p.300 to p.310 with today's code. The recorder saw `{properties: ["height"], duration: 600, easing: "ease-out"}` on that spine, so it does see a real fill.

**Skipped as committed:**
- `playwright test e2e/finish-moment.spec.ts` gives 5 skipped.
- `tsc -b` (which includes `e2e/`) and `oxlint` are clean.

**Deviations kept to match Stories 1.6 to 3.6:**
- The leaves are plain `test.skip` bodies, not wrapped in `expect((async () => …)()).resolves`.
- AC-2 must play the moment before it can check that it never replays, so its red failure is the setup wait for the header line in tab A.

### E2E Tests (5 tests): `frontend/e2e/finish-moment.spec.ts`

Every leaf starts `bookvie --fake-today 2026-10-28` with the browser clock on the same day, light theme, `reducedMotion: 'no-preference'` (AC-4 overrides it), and the recorder installed on the context.

Seeds:
- `MAIN_AT_300`: The Left Hand of Darkness at p.300 of 330 in `#4F7096`, with a Purpose, plus Dune. 0 of 2 finished.
- `MAIN_AT_300_LAST_ROW`: the same Main book among 120 Books by "Author". Le Guin sorts last, so with no Main book its row is the slice's third, below the fold of a 1280×480 window. 0 of 121 finished.
- `REREAD_AT_300`: finished 2026-04-20 with 5 stars, now Main again at p.300. 1 of 2 finished.

**`[P1] AC-1`: the moment** (`MAIN_AT_300_LAST_ROW`, 1280×480)
1. Type 330, Update, Done.
2. **"Finished The Left Hand of Darkness." is visible in the bookcase** (the first assertion).
3. The finished spine is in the viewport.
4. A fill motion of 500 to 700 ms, `ease-out`, ran on it.
5. The ring appears, then is gone within 4 s; the spine's background is its color.
6. The meter's `aria-valuenow` is 1 and the bookcase reads "1 of 121 finished".
7. "No Main book." has focus, and `status` is "Finished The Left Hand of Darkness. 1 of 121 finished."

*Red today: `toBeVisible`, "element(s) not found" for the header line.*

**`[P1] AC-2`: never again** (`MAIN_AT_300`)
1. Tab B opens Home while the Book is still Main.
2. Tab A finishes from Book detail; its header line shows and a fill motion runs (setup).
3. Reload A: **nothing on the finished spine moved** (the first criterion assertion). There is no header line and no ring, and the meter is 1.
4. Catalog, then Home through the nav: nothing moved, no header line.
5. Tab B: `visibilitychange` refetches. It shows "No Main book." and the finished spine, with nothing moved, nothing scrolled to, no header line, no ring, and no "Finished" in its `status`.

*Red today: `toBeVisible`, "element(s) not found" for tab A's header line.*

**`[P2] AC-3`: a re-read** (`REREAD_AT_300`)
1. Setup: the meter is 1. Type 330, Update, Done.
2. **"Finished The Left Hand of Darkness again." is visible** (the first assertion).
3. The ring appears. No fill motion ran, and the spine's background is its color.
4. The meter is still 1 of 2. "No Main book." has focus, and `status` is "Finished The Left Hand of Darkness again. 1 of 2 finished."

*Red today: `toBeVisible`, "element(s) not found" for the "again" line.*

**`[P2] AC-4`: reduced motion** (`MAIN_AT_300_LAST_ROW`, 1280×480, `reducedMotion: 'reduce'`)
1. Type 330, Update, Done.
2. **The finished spine was scrolled to exactly once, with `behavior: 'auto'`** (the first assertion).
3. It is in the viewport. Nothing on it ran with a duration above 0.
4. The ring is on, with `transition-duration: 0s`. The background is its color, and the header line is shown.

*Red today: the poll receives `[]` (no `scrollIntoView` on the spine).*

**`[P2] AC-5`: tone** (`MAIN_AT_300`)
1. An init script counts `HTMLMediaElement.play` calls and `AudioContext`s.
2. Type 330, Update, Done.
3. **The header line's text is exactly "Finished The Left Hand of Darkness."** (the first assertion).
4. `status` is "Finished The Left Hand of Darkness. 1 of 2 finished." Once the ring has faded:
   - no "!" in the page's text or in `status`;
   - no sound;
   - no `canvas`, `audio` or `video` element;
   - no praise words in the bookcase.

*Red today: `toHaveText`, "element(s) not found" for the header line.*

---

## Green-Phase Follow-ups (automation, not red leaves)

- **AC-1, "from its current fill":** sample the spine's pixels (as `home-slice.spec.ts` does) at the start of the fill. The fill begins at about 91%, not 0%. Then check it is full at the end, with no `spine-edge` line left.
- **AC-1, the order:** the scroll happens before the fill starts (the `scrollIntoView` record precedes the first fill motion), and only when needed. With the spine already in view (`MAIN_AT_300`), there is no scroll at all, or a no-op `block: 'nearest'`.
- **AC-1, without reduced motion:** the scroll is smooth. The UX docs only pin `auto` under reduced motion; the spec should say what the default is.
- **AC-1, focus and scroll together:** focusing "No Main book." must not scroll the finished spine back out of view (`focus({preventScroll: true})`, or the scroll after the focus).
- **AC-1, dark theme:** the ring and the fill in dark, and under forced colors (as `home-slice.spec.ts` AC-3 does for the Main fill).
- **AC-2, another browser:** a second `browser.newContext()` (not only a second tab), which shares no `sessionStorage` or `localStorage`.
- **AC-2, Back and Forward:** after the moment, Back to Book detail and Forward to Home play nothing (the hand-off state is already cleared by 3.6).
- **AC-2, a couldn't-save, then a retry:** a 503 on the first Done keeps the dialog (3.6). The moment plays once, after the second Done succeeds.
- **AC-2, the header line on the next visit:** "it is gone on the next visit to Home". Check it survives a refetch (window focus) while Home stays open, and only a new visit drops it.
- **AC-3, the re-read from Book detail's Mark finished:** the same header line and status.
- **AC-5:** the same tone checks under reduced motion and in the re-read.
- **Status timing:** `status` is set only after the "No Main book." heading has focus and the refetched views have rendered (epic-3-context → Success announcements wait). It must not read an old meter.
- **Story 4.1 note:** when Up next lands, focus moves to its button instead. The status line still follows focus.

---

## Implementation Guidance

**Client only.** There is no server change.
- **The signal:** extend 3.6's router state from `{finished: true}` to carry what the moment needs. For example `{finished: true, bookId, title, reread}`, where `reread` is whether the Book was already finished before this Done (from the Book view the dialog already holds).
  - Home consumes it once per history entry, as `handledFinish` and `clearHandOffState` do now. A reload, revisit, Back or Forward, or another tab then never sees it.
  - Do **not** derive the moment from a view change (AD-7): another tab only gets the refetch.
- **The slice:** pass a `finishing: {id, reread}` prop to `Bookcase` in slice mode. After the rows are packed and the spine is in the DOM:
  1. `scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'})`;
  2. render the spine as a filling Main spine at its old percentage for one frame, then at 100%, so the existing `height` transition (600 ms `ease-out`) runs. Swap to the solid `.read` look when it ends;
  3. add `.highlight`, and drop it so the existing `box-shadow` transition fades it.
  - A re-read skips step 2.
  - Under reduced motion, the existing `@media` rules already make both instant.
- **The header line:** "Finished *X*." or "Finished *X* again." in `body-sm` / `ink-secondary` in the bookcase header. It is local state of this Home visit, gone on the next visit.
- **The status line:** `announce('status', …)` after the "No Main book." heading has focus and the refetched home view has rendered, with that view's meter (`${finished} of ${total} finished`).
- **Copy:** add the two lines to `lib/copy.ts` (or beside `spineName`), with `node --test` cases. No "!" anywhere.

---

## Next Steps

1. Write `spec-3-7-…md` and link this checklist under its Dev Notes (`### ATDD Artifacts`).
2. Implement task by task, un-skipping the matching leaf. Each should fail first as listed, then pass: AC-1, AC-4, AC-3, AC-2, AC-5.
3. Run `bmad-testarch-automate` for the follow-ups above once 3.7 is green.
