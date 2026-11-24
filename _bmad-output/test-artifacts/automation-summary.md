---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-24'
storyId: '14.4'
storyKey: '14-4-search-the-boxes'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-14-4-search-the-boxes.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-14-4-search-the-boxes.md (Green-phase follow-ups)
  - _bmad-output/implementation-artifacts/deferred-work.md (Story 14.4's WCAG 2.5.3 entry)
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (Colors → Contrast; Components → Card note box) and EXPERIENCE.md (Card notes shelf; Accessibility Floor)
  - _bmad/tea/config.yaml
  - frontend/src/lib/cardNotes.ts, cardNotes.test.ts, useSearchCount.ts; frontend/src/pages/CardNotesPage.tsx; frontend/src/components/CardNoteBox.module.css
  - frontend/e2e/search-boxes.spec.ts, search-boxes-view-switch.spec.ts, card-note-boxes.ts, card-note-boxes-automate.spec.ts, card-note-boxes-dark-theme.spec.ts, open-box.spec.ts, card-notes.spec.ts (openPaused), card-note-add-another.ts, stats.ts, bookcase.ts, library.ts, fixtures.ts
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

# Automation Summary: Story 14.4 Search the boxes

## Preflight

- **Stack:** `fullstack` (auto). The story is frontend only: the search on the Card notes shelf in Boxes view. Every new target is an e2e leaf.
- **Gate:** `sprint-status.yaml` at HEAD (`c494ed3`) says `14-4-search-the-boxes: done`, and the tree was clean at the start.
- **Mode:** BMad-integrated. The inputs were the ATDD checklist's 9 open green-phase follow-ups and the spec's I/O matrix and Review Findings.
- **Generation:** sequential, in this session. The leaves reuse the ATDD module's seed and helpers (`HABIT_SHELF`, `boxFrames`, `pillLook` in `card-note-boxes.ts`), so a worker would need this session's reading anyway.
- **Knowledge:** the six core fragments, plus Traditional Patterns (`fixture-architecture.md`, `network-first.md`) and `playwright-cli.md`. `@seontechnologies/playwright-utils` isn't in `package.json`, so the Playwright Utils branch didn't open. There is no Pact artifact. No browser session was opened for exploration: the ATDD run had already probed the shelf, and the leaves read it through `boxFrames` and `pillLook`, which that run probed. One throwaway probe spec listed axe's violations (below) and was deleted.

## Coverage plan

The 7 ATDD leaves (`search-boxes.spec.ts`) cover AC-1 to AC-7, and the review's `search-boxes-view-switch.spec.ts` covers a view press during the pause. Of the 9 follow-ups, the unit one was already met by the build (`cardNotes.test.ts:327`, `:349`, `:364`, read and run green here). This run adds one e2e leaf for each of the other 8 (9 tests, since the window-width leaf runs at two widths), in `frontend/e2e/search-boxes-automate.spec.ts`:

| Follow-up | Priority | Level | Leaf |
|---|---|---|---|
| AC-1/AC-2 unit | P1 | Unit | Already there: `cardNotes.test.ts:327` (`boxMatches`, `boxMatchPill`), `:349` (the four name forms), `:364` (`shelfCountLine`: plural, singular, plural notes in one Book, none, trimming, spaces only). |
| AC-1 axe | P1 | E2E | `:83` "habit" on the shelf, light and dark: every rule but two gives `[]`; `color-contrast` and `label-content-name-mismatch` may fail only on Refactoring's faded box (see Findings). |
| AC-1 regex characters | P1 | E2E | `:111` "." matches all 41 notes (every pill "N of N"); "s." matches only Walden's "woods." (a regex would match "s " too); "(habit", "[a-z]" and "habit)*" match nothing, fade every box, and raise no alert. |
| AC-2 pause | P2 | E2E | `:141` paused clock: "hab", 400 ms, "it", 400 ms: the count line follows, `status` is silent; past the pause it reads "17 card notes in 4 Books contain “habit”." exactly once. |
| AC-4 blank field | P2 | E2E | `:163` paused clock: "habit" emptied inside the pause, and "   ", announce nothing; a "zettel" control proves the clock drives the pause. |
| AC-2 window widths | P2 | E2E | `:198` at 1024px (4 columns) and 1440px (5), "habit" and "zettel" leave every slot and the column count unchanged. |
| AC-5 dark | P2 | E2E | `:218` in dark, the "habit" lift and fade match light's, Refactoring's one inner wrapper fades, and every front keeps the dark shadow, unscaled. |
| AC-7 pill dark | P2 | E2E | `:244` in dark, the pills on Atomic Habits and Walden keep `#E3EBE2`, `spine-label` text at 600, 22px, and the 6px `#557059` dot. |
| AC-6 open a faded box | P1 | E2E | `:269` a click on faded Refactoring opens `/card-notes?book=…13`: the `h1` focused, "In Refactoring", its notes. The field's text on arrival is Story 14.5's, so it isn't asserted. |

## Findings

- **axe flags the faded box's name.** `label-content-name-mismatch` (WCAG 2.5.3, Label in Name) fails on every faded box, in light and dark: the link is named "*Refactoring*, no match" while it shows "4 card notes". This is the gap the build's review already deferred to the Epic 14 retro (`deferred-work.md`, Story 14.4 build: "During a search, a faded box shows "4 card notes" but is named "*Refactoring*, no match""), since the name is the string AC-2 and EXPERIENCE.md prescribe. The axe leaf names both allowed rules in `FADED_BOX_GAPS` and fails if either reaches any other node. If the retro changes the name, the leaf still passes; drop `label-content-name-mismatch` from `FADED_BOX_GAPS` then, so the fix stays pinned. No product code was changed.
- **The 14.2 automate leaf** (`card-note-boxes-automate.spec.ts:232`, "AC-10 deleting the search text…") now checks 14.4's behavior under 14.2's describe, as the review noted. It was left in place: its title still describes what it checks, and its "Story 14.4" comment says why. Moving it would change history for no gain in coverage.

## Mutation checks

The new leaves passed on the first run, so each kind was checked against a broken build. Each edit was made by hand, rebuilt, run, then reverted from a saved copy and compared with it (`cmp`). No git command changed the tree.

- `useSearchCount`'s `typed` no longer restarts the pause on each keystroke: the pause leaf failed (it heard "…contain “hab”.").
- `typed` no longer cancels for a blank query: the blank-field leaf failed (it heard the "habit" sentence).
- `noteMatches` used `new RegExp(q)`: the regex leaf failed on "s.".
- Boxes view dropped boxes without a match: both window-width leaves failed (the slots moved).
- A dark-only `.pill { background: #333333 }`: the dark pill leaf failed.

The faded-click, dark lift/fade and axe leaves weren't mutation-checked. The axe leaf did fail for real on its first run (the finding above).

## Files

- **Created:** `frontend/e2e/search-boxes-automate.spec.ts`: 8 leaves (9 tests). It imports the seed and measuring helpers from `card-note-boxes.ts`. Its module-local helpers are `resting` and `openPaused`, copied from `search-boxes.spec.ts` and `search-boxes-view-switch.spec.ts` as the repo's specs already do. Its literals are `LIFT`, `FADE`, `BOX_FRONT_SHADOW_DARK` (as in `card-note-boxes-dark-theme.spec.ts`) and `FADED_BOX_GAPS`.
- **Changed (source):** none.
- **Updated:** the ATDD checklist. All 9 green-phase follow-ups are ticked with their evidence; the axe line records the second allowed rule. Remaining `[ ]`: **0** (`grep -cF '[ ]'`).

## Validation

- **Story leaves:** `TZ=Europe/Madrid npx playwright test e2e/search-boxes-automate.spec.ts --repeat-each=3` gave 27 passed.
- **Full check, after the new leaves (2026-11-24):** `npm run check` exited 0. pytest 2508 passed, unit 414 passed, e2e 856 passed (the review's 847, plus 9), smoke passed. oxlint, `tsc -b` and Prettier were clean.
- **Quality checklist:**
  - No hard waits. Each one-shot `boxFrames` read comes after a web-first poll of `resting`; the pause leaves step a paused clock.
  - No conditionals: the `for` loops run fixed lists (themes, queries, widths, pills).
  - Every leaf seeds its own server, so they are parallel-safe.
  - One subject per leaf.
  - No skips or focus.
  - Exact values throughout: computed colors, shadows, slots, lifts and opacities, `status` texts, and axe violation lists compared with `[]`.
- **No CLI browser sessions** were opened, and `git status` showed only this run's files.

## Assumptions and risks

- The window-width leaf assumes 4 columns at 1024px and 5 at 1440px, as the checklist says. A change to the grid's column rule fails `columnsOf` first, which names the cause.
- The pause leaves step Playwright's clock and pause it only after the boxes show (the Epic 6 trace flake). `INSIDE_THE_PAUSE_MS` (400) depends on `SEARCH_PAUSE_MS` staying above it.
- The axe leaf allows two rules on the faded box only. Whether a faded box fails `color-contrast` at all depends on axe's handling of opacity; the leaf doesn't require it to.

## Next

Story 14.4's pipeline is complete. Story 14.5 (`keep-the-search-when-i-open-a-box-and-come-back`) is the next story of Epic 14. Start it with `bmad-testarch-atdd`.
