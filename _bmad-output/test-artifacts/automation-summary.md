---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: '5.4'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-5-4-go-through-a-book-s-notes-as-a-pile.md (Boundaries, I/O matrix, Review Triage Log, Review Findings)
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/test-artifacts/atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md
  - _bmad-output/test-artifacts/test-design-qa.md (CRD-E2E-002, CRD-E2E-003, BKP-API-001)
  - _bmad-output/implementation-artifacts/deferred-work.md (code review of spec-5-4, 2026-11-10)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts, backend/tests/conftest.py
  - frontend/e2e/card-notes-pile.spec.ts; frontend/src/lib/cardNotes.test.ts; backend/tests/test_full_data_round_trip.py
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

# Automation Summary: Story 5.4 Go through a book's notes as a pile

This file used to hold the summary for Story 5.3, which is in git history (`7e0e843`).

## Preflight

- **Stack:** `fullstack` (auto-detected). Frontend: Playwright (`frontend/playwright.config.ts`) plus `node --test` unit tests. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-integrated. Story 5.4 is `done` in `sprint-status.yaml` after bmad-code-review (`54f3210`).
- **Flags:** `tea_use_playwright_utils: false`, so the traditional fixture and network patterns apply (the project's `e2e/fixtures.ts`). `tea_use_pactjs_utils: false`, and there is no contract testing. `tea_browser_automation: auto`.
- **Knowledge:** I read test-quality in full and skimmed the headings of the other core fragments: test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, fixture-architecture, network-first and playwright-cli.
- **Existing 5.4 coverage:**
  - **API:** `test_full_data_round_trip.py` (AC-7, BKP-API-001) is active and green.
  - **E2E:** `card-notes-pile.spec.ts` has 19 leaves:
    - AC-1 to AC-6;
    - the build's eleven follow-ups: openers per group, Tab trap with arrow keys, re-picking Shuffled, the dark theme, chip height, the close fallback, the block clamp, axe, the block opener during a no-match search, and the two cancelled-count leaves;
    - the code review's two leaves: the scoped opener during a no-match search, and the shell status left alone.
  - **Unit:** `cardNotes.test.ts` → "the pile" covers `openInPileName` (single page and range), `pilePosition`, `pileAnnouncement` (no period), `pileStart` and `shuffled` (permutation, deterministic, input untouched, empty and one note).

## Coverage Plan

**Browser exploration:** skipped. `playwright-cli` isn't installed, and the 19 leaves already drive every pile surface. The targets come from the code, the ATDD checklist's open follow-ups and the code review's deferral.

**Source and API analysis:** there is no backend or contract change in 5.4 (spec, Never). AC-7 already pins the round trip, so there are no API or backend targets.

**Gaps and targets (selective scope: only what the ATDD checklist and the code review left open, with no duplicate coverage):**

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| G1 | The return scroll after close: `behavior: 'smooth'` by default and `'auto'` under `prefers-reduced-motion: reduce`, with `block: 'nearest'` | E2E | P2 | ATDD follow-up "AC-6, reduced motion". The code review deferred it because AC-6's retrying `toBeInViewport` passes either way. A spy on `Element.prototype.scrollIntoView`, installed before `goto`, records the options deterministically. |
| G2 | A long list: a 30-note Book; close at "30 of 30" focuses p.30's Edit, scrolled into view from the top of the page | E2E | P2 | ATDD follow-up "A long list (a 30-note Book) scrolls to the note". AC-6's four-note list barely scrolls. |
| G3 | Forced colors: the checked segment's bottom bar is `Highlight` and a disabled end's text is `GrayText`, both compared with the browser's own resolved system colors | E2E | P2 | ATDD follow-up "AC-1, forced colors", deferred by the code review. The CSS has a `forced-colors` block that nothing exercises. |
| G4 | The pile's look: the dialog's `radius-lg` and `shadow-overlay`, the card's stacked edge (two `line` offsets), and a disabled end in `ink-tertiary` with the same size as when enabled | E2E | P2 | ATDD follow-ups "AC-1, the stacked edge and the dialog radius and shadow" and "AC-2, the disabled ends' look". AC-1 checks only the background and the scrim. |
| G5 | A search on the scoped page: "spice" on `/card-notes?book=<Dune>`, then the p.96 chip, opens "3 of 4" in Page order, and Next reaches p.300 (no match) | E2E | P2 | ATDD follow-up "AC-4, a search on a scoped page". AC-4 covers the unscoped page and the block only. |
| G6 | Closing a Shuffled pile focuses the Edit of the note shown, not the note at that index in page order | E2E | P2 | Raised by the code review's blind hunter (rejected as a code defect, since the code is correct by construction) and left untested. A seeded `Math.random` makes it deterministic. |

**Not automated:**
- **AC-6, "the opener vanished" on a refetch while the pile is open:** the pile is modal and read-only, so nothing in the app can drop a note while it is open. `usePileFlow` already falls through to the `h1`, then `#main`. This line will be retired with that reason.
- **Arrow keys within the radio group:** already covered by the Tab-trap leaf (`ArrowRight` checks Shuffled).

## Execution

- **Mode:** `tea_execution_mode: auto`, with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API) and 3B-backend:** not launched. There are no targets: 5.4 changed no backend code or contract, and AC-7 is already active.
  - **3B-e2e:** G1 to G6.
- **Fixtures:** none added to `e2e/fixtures.ts`. The spec gained four local helpers:
  - `seededRandom(page)`: the AC-3 leaf's mulberry32 seed, as a helper.
  - `recordScrolls(page)`: an init-script spy on `Element.prototype.scrollIntoView` that still scrolls.
  - `shadowLayers(shadow)`: splits a computed `box-shadow` into its layers.
  - `DUNE_EDIT_BY_TEXT`: maps each Dune note's text to its Edit button name.
- **Review of the worker's output:** I renamed one title, because the forced-colors leaf belongs to AC-1 (the checklist's "AC-1, forced colors"), not AC-3.

## Tests Added

**E2E** (`frontend/e2e/card-notes-pile.spec.ts`, describe "Story 5.4 automate"): 6 tests, all P2.
- "AC-6 closing scrolls the focused Edit into view smoothly, and instantly under reduced motion" (:774), for G1. The recorded options are `{ block: 'nearest', behavior: 'smooth' }`, then `'auto'` after `emulateMedia({ reducedMotion: 'reduce' })`.
- "AC-6 in a list of 30 notes, closing at "30 of 30" focuses p.30's Edit and brings it into the viewport" (:803), for G2. Before the pile opens, the leaf asserts that p.30's Edit is out of view.
- "AC-1 in forced colors the checked Order segment is underlined in Highlight and a disabled end reads GrayText" (:834), for G3. The system colors are resolved on a probe in the dialog, not hardcoded.
- "AC-1 in the light theme the pile has the dialog radius and overlay shadow, the note a stacked edge in `line`, and a disabled end keeps its shape in `ink-tertiary`" (:872), for G4. The tokens are resolved on a probe.
- "AC-4 on the scoped Card notes page a search result opens the pile in Page order at that note, holding every note" (:927), for G5.
- "AC-6 closing a Shuffled pile focuses the Edit of the note last shown in the shuffle, not page order's" (:948), for G6. A guard asserts that the seeded shuffle moved the note at "2 of 4".

**Totals:** 6 tests. `card-notes-pile.spec.ts` now has 25 tests.

**Defects found:** none. Every new test passed against the code as reviewed, and no production file changed.

## Validation

- **`TZ=Europe/Madrid npm run check`: exit 0.**
  - pytest: 1320 passed, backend coverage 98%.
  - Unit: 281 passed.
  - e2e: 496 passed.
  - ruff, Prettier, oxlint, `tsc` and the `api:gen` byte check are all clean.
- **Stability:** the new block passed `--repeat-each=5`, 30 of 30 runs.
- **Mutation checks:** each leaf below fails with its production rule broken. Every file was restored afterwards (`git diff -- frontend/src` is empty).
  - G1: the ternary in `scrollBehavior()` inverted.
  - G3: the forced-colors block removed (the worker's check), then only the `GrayText` rule removed (my check).
  - G6: `close` reporting `notes[index]` instead of `sequence[index]`.
- **Quality checklist:**
  - No hard waits, and no conditionals.
  - Explicit assertions in the test bodies, and every assertion can fail.
  - G2 and G6 each carry a precondition assertion, so their final check means something.
  - Seeded through `seededServer`, and parallel-safe.
  - No `.only` or skips.
- **No CLI sessions were opened.** The worker's JSON output is in this session's scratchpad, not in the repo.

## ATDD Checklist

`atdd-checklist-5-4-go-through-a-book-s-notes-as-a-pile.md`:
- 28 lines ticked, with evidence from this run and from the build and review runs.
- 1 line retired: "AC-6, the opener vanished". The pile is modal and read-only, and `usePileFlow` already has the fallback chain.
- `pileName` is ticked with a note that it was removed at the build review.
- **Remaining `[ ]`: 0.**

## Deferred Work

- The code review's media-test deferral (reduced-motion scroll and forced colors) is resolved by G1 and G3, with a `resolved:` line in `deferred-work.md`.
- The UX-doc reconciliation entry (EXPERIENCE.md and DESIGN.md → Pile) stays open for the Epic 5 retrospective.

## Assumptions and Risks

- Forced colors are checked under Chromium's emulation (`Highlight` resolves to `rgba(5, 0, 73, 0.8)`, `GrayText` to `rgb(96, 0, 0)`). The leaf compares against the browser's own resolved values, so another engine would still be judged against itself.
- G6 depends on the seed-42 mulberry32 order. If the shuffle's call pattern changes, the guard (`shown` is not BEGINNING) fails loudly rather than passing vacuously.
- G1's spy wraps `Element.prototype.scrollIntoView`. If the app ever scrolls a different element, such as a wrapper, the `focused` filter finds no call and the leaf fails.

## Next

5.4's pipeline is complete: ATDD, build, code review and automate. It closed Epic 5. Next is the **Epic 5 retrospective** (`bmad-retrospective`), then the epic's trace and gate and the spine reconciliation, before Epic 6's first story.
