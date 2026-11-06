---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-06'
storyId: '3.7'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-3-7-see-the-finish-on-the-shelf.md (incl. I/O matrix and Review Triage Log)
  - _bmad-output/test-artifacts/atdd-checklist-3-7-see-the-finish-on-the-shelf.md (Green-Phase Follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (3.7 automate entry)
  - _bmad/tea/config.yaml
  - frontend/src/pages/Bookcase.tsx, Bookcase.module.css, HomePage.tsx
  - frontend/src/components/FinishDialog.tsx, frontend/src/lib/catalog.ts (+ catalog.test.ts)
  - frontend/src/styles/base.css
  - frontend/e2e/finish-moment.spec.ts, home-slice.spec.ts, bookcase-details.spec.ts, finish-reading.spec.ts
  - knowledge/test-levels-framework.md
  - knowledge/test-priorities-matrix.md
  - knowledge/data-factories.md
  - knowledge/selective-testing.md
  - knowledge/ci-burn-in.md
  - knowledge/test-quality.md
  - knowledge/fixture-architecture.md
  - knowledge/network-first.md
  - knowledge/playwright-cli.md
---

# Automation Summary: Story 3.7, See the finish on the shelf

The Story 3.6 summary that used to live in this file is in git history (`ab2d1ed`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (I/O matrix, triage log), the ATDD checklist's green-phase follow-ups, and the deferred-work entry that sent them here.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`). Story 3.7 is client only, so every target is in the frontend.
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. Two small e2e targets, written inline.
**Total tests added:** 2 Playwright tests. Results are under Validation.
**Browser exploration:** skipped. The roles and names are pinned by the ATDD leaves; I worked from source and mutation probes.

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 3.7 shipped with:

- E2E: `finish-moment.spec.ts`, 7 tests (the 5 ATDD leaves plus two review patches: the fill starts from Home's percentage, and a Start on the same Home drops the line).
- Unit: `catalog.test.ts` covers `finishLine` and `finishStatus` (first finish, re-read, no "!").

The deferred-work entry listed 8 ATDD follow-ups. To pick among them I ran mutation probes on the moment's code against the 7 leaves:

| Mutant | 7 leaves |
|---|---|
| M1 the fill never reaches `done` (spine stays Main-style) | killed (4 failed) |
| M2 focus on "No Main book." delayed 1.5 s | **survives** |
| M3 the fill starts at once instead of on `scrollend` | **survives** |
| M4 reduced motion still runs the fill phases | survives |
| M5 the scroll is always `behavior: 'auto'` | **survives** |
| M6 no `scrollIntoView` at all | killed (3 failed) |
| M7 forced-colors ring `dashed` → `solid` (no test in the repo mentions it) | **survives** |

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **The order below the fold is unpinned.** The spec says to scroll first (`smooth` by default), start the fill only once the scroll ends, and focus "No Main book." without scrolling the spine back out of view. | M2, M3 and M5 survive. AC-1's `toBeInViewport` is retried, so a brief moment in view passes it, and no leaf reads the scroll's `behavior` outside reduced motion. Story 4.1 will move this focus to Up next, which is exactly where M2 could come back. | E2E | P2 (AC-1) |
| G2 | **The forced-colors highlight ring has no test anywhere.** Story 1.10's review chose a dashed `Highlight` outline so the ring differs from the focus outline. The moment reuses `.highlight`. | M7 survives. `grep dashed frontend/e2e` finds nothing. | E2E | P3 (AC-1, a11y) |

**Not selected:**
- M4 (reduced motion runs the fill phases). Under reduced motion the fill has no transition, so the spine sits filled to the top for up to 1 s before it becomes the read spine. The two look almost the same, and AC-4 already pins "nothing moves". The cost of a test would be pixel sampling.
- Dark theme. The ring and the fill use the same tokens and classes as Catalog and the Main fill, and `home-slice.spec.ts` covers those.
- A second `browser.newContext()`. AC-2's tab B already proves another page that only refetched plays nothing. The moment doesn't use storage, so a separate context exercises no extra code.
- Back and Forward. The hand-off is cleared from the entry by 3.6's `clearHandOffState`, and `finish-reading.spec.ts` covers Back and Forward for the same gate (`finished && noMain`). AC-2's reload kills a mutant that skips the clear.
- A 503, then a retry. `FinishedState` is built only on `ok`, and 3.6 covers the dialog keeping its answers after a couldn't-save.
- The re-read from Book detail's Mark finished. Both openers share `FinishDialog`, and `reread` comes from `book.readings` either way.
- Tone checks under reduced motion and on a re-read. The copy comes from the unit-tested helpers, and AC-3 pins the re-read line exactly.
- Pixel-sampling "from its current fill". The AC-2 leaf and the cached-view leaf already read the fill's first keyframe.
- Malformed router state (`finishMoment` parsing). The review rejected this (BH8): it needs history tampering.

## Tests Added

In a new `Story 3.7 See the finish on the shelf (automate)` block in `frontend/e2e/finish-moment.spec.ts`:

1. **`[P2] AC-1 below the fold the spine is scrolled to smoothly, the fill starts only once the scroll has stopped, and focusing "No Main book." never scrolls it back out of view`** (G1). Setup: `MAIN_AT_300_LAST_ROW` at 1280×480. An extra init script records `window.scrollY` when the finished spine's `height` transition starts. After the finish from the page field, the test asserts:
   - exactly one scroll call on the spine, `{block: 'nearest', behavior: 'smooth'}`;
   - the ring comes on and goes, and the spine is solid in its color;
   - the page is scrolled (`scrollY > 0`), and the fill started within 1 px of where the scroll came to rest;
   - "No Main book." has focus, and the spine is still in view at the same `scrollY`.
2. **`[P3] AC-1 under forced colors the ring is the dashed Highlight outline for the moment, then goes, and the spine ends solid`** (G2). Setup: `MAIN_AT_300` with `forcedColors: 'active'`. After the finish, the spine's `outline-style` is `dashed`, then `none` within 4 s. The spine ends in its own color, and "No Main book." has focus.

## Files Created/Updated

- `frontend/e2e/finish-moment.spec.ts`: 2 tests added (automate block).
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- `npm run check` passes: pytest 1025 passed, coverage gates domain 100% and intents+store 97.72%, `check:api` clean, e2e 283 → 285 passed, smoke ok.
- Mutation check against the new tests:
  - G1 kills M2, failing at `expect(settled).toBeGreaterThan(0)`: the late focus scrolled the page back to the top.
  - G1 kills M3, failing at the fill's `scrollY` check: the fill started part-way down.
  - G1 kills M5 at the scroll-call assertion.
  - G2 kills M7.
  - Every mutant was reverted after its run, and `git status frontend/src` is clean.
- Burn-in: both new tests passed `--repeat-each=10 --retries=0` with parallel workers, 20 of 20.
- No CLI browser sessions were opened. The probe script and logs stayed in the session scratchpad, outside the repo.

## Assumptions and Risks

- G1 relies on Chromium animating `behavior: 'smooth'` in headless runs. It does today: M3 fails because `scrollY` was mid-scroll at the fill's start. If a browser ever scrolls instantly, G1's order check would pass trivially. It would not fail.
- **Comment drift, not a test gap:** the `@media (prefers-reduced-motion)` block in `Bookcase.module.css` says "Catalog's add highlight keeps its fade". It doesn't: `base.css` already sets every `transition-duration` to `0s !important` under reduced motion. That is also why the `.sliceShelf` scoping made no difference to any test. Worth a one-line comment fix whenever someone next edits that CSS.
- The deferred-work entry for these follow-ups is still open. G1 and G2 close the focus/scroll item and the forced-colors part. "Not selected" above records why I dropped each of the others.

## Next Recommended Workflow

`bmad-testarch-trace` at the Epic 3 gate: 3.7 was the last story in Epic 3. Or `bmad-testarch-test-review` on `finish-moment.spec.ts`, now 9 tests, which carries its own motion recorder.
