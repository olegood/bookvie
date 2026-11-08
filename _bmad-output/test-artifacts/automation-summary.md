---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-08'
storyId: '4.3'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-4-3-pause-my-main-book.md (Boundaries, I/O matrix, Code Map, Review Triage Log, Review Findings, Auto Run Result residual risks)
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Flow 10, Pause and resume)
  - _bmad-output/test-artifacts/test-design-qa.md (RDG-E2E-002, RDG-API-002, RDG-E2E-003, XUI-E2E-001)
  - _bmad-output/test-artifacts/atdd-checklist-4-2-see-every-paused-book-in-waiting-for-you.md (the Waiting helpers to move for 4.3)
  - _bmad/tea/config.yaml
  - frontend/src/components/MoreActionsMenu.tsx, MainBookCard.tsx, frontend/src/lib/usePauseFlow.tsx, frontend/src/pages/HomePage.tsx, BookDetailPage.tsx, frontend/src/components/Button.tsx
  - frontend/e2e/pause.spec.ts, waiting-for-you.spec.ts, finish-reading.spec.ts, stale-hand-offs.spec.ts, home.ts, intents.ts
  - backend/tests/test_pause.py, test_reading_state_machine.py
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

# Automation Summary: Story 4.3, Pause my Main book

This file used to hold the Story 4.2 summary, which is in git history (`70e3e71`).

**Execution mode:** BMad-Integrated. Inputs: the story spec (matrix, Code Map, triage log, review findings, residual risks), EXPERIENCE.md's Flow 10, and the QA test design. Story 4.3 has no ATDD checklist (it was built without an ATDD pass), so the checklist-ticking fact has nothing to tick.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. There were five small e2e targets, all in one spec, written inline.
**Total tests added:** 5 Playwright tests.
**Browser exploration:** skipped. The spec pins the roles and names, so I worked from the source and from one throwaway probe spec (deleted).

## Coverage Plan by Test Level and Priority

Scope: **selective**. Story 4.3 shipped with broad coverage:
- **API:** 12 tests in `test_pause.py` cover every matrix row, the 503 faults and `check_invariants`. The code review made AC5 (`pausedAt` kept after a resume and a finish) run on later fake-clock days.
- **Unit:** the `pause` rule in `test_reading_state_machine.py` (RDG-UNIT-002), plus `pause.test.ts` and `books.test.ts`.
- **E2E:** 15 tests in `pause.spec.ts`: the menu's keyboard and presses, both paths from both pages, Cancel and Esc, focus then `status`, 503 on all three paths, the region release after a failure, double presses, and axe on the menu and dialog.

Gaps found against the ACs, Flow 10, the test design and the spec's residual risks:

| # | Gap | Evidence | Level | Priority |
|---|---|---|---|---|
| G1 | **Flow 10 end to end (RDG-E2E-002):** Pause via "⋯", the Up next moves to Waiting for you, Resume it there with its Purpose prefilled and no trade-off, and the paused Book comes back as Up next with its page. | The test design's RDG-E2E-002 had no test. The 4.2 summary left it to 4.3, and no 4.3 test resumes from Waiting after a pause. | E2E | P1 |
| G2 | **A real stale-tab refusal (409 `not_main_book`)** on Book detail, not a routed 503. | Every failure test routed a 503. The spec's follow-up risk names "the region-release fix after a refusal refetch, which no test exercises". | E2E | P1 |
| G3 | **The busy state:** Book detail's Pause is `aria-disabled` with "Pausing the book." while the request is out. | It's in the Code Map. The double-click tests can't see it, because the in-flight ref swallows the second press before `busy` renders. | E2E | P2 |
| G4 | **axe on the visible couldn't-save lines** below "⋯" and below Pause. Both are restyled out of their visually-hidden state, in both themes. | Review finding (rejected as low for the review, but cheap here). axe ran only on the menu and the dialog. | E2E | P2 |
| G5 | **The "⋯" layout:** 32×32, on the eyebrow's line and to its right, inside the card, clear of the title. | A residual risk in the Auto Run Result ("overhangs the title margin by about 8px; not visually checked"). | E2E | P2 |

**Not selected:**
- **Safari and Firefox mouse clicks on the menu.** WebKit and Firefox aren't installed (`~/Library/Caches/ms-playwright` has Chromium only), so this stays deferred. The code review changed the blur logic (`pressing`), which should remove the race. It is still unverified.
- **A failure after the page unmounts.** Deferred, low. Cover it with the app's other unmount-after-request cases.
- **Re-pause, gone, and the faults from the UI.** These are API-level matrix rows, already covered in `test_pause.py`. In the UI they reuse the same refusal path G2 exercises.

## Tests Added

The five tests are in a new `Story 4.3 Pause my Main book (automate)` block at the end of `frontend/e2e/pause.spec.ts`:

1. **`[P1] RDG-E2E-002 Flow 10: …`** (G1, `:480`). The seed follows the flow: The Left Hand of Darkness is Main at p.212, and Dune is Up next, paused at p.120 with a Purpose.
   - Pause via "⋯" shows "Dune moves to Waiting for you."
   - The empty card's **Resume** is focused, the Up next pane is hidden, and "Waiting for you (1)" lists Dune at "p.120 of 412".
   - Resuming Dune opens "Resume Dune?" with its Purpose prefilled and no trade-off lines.
   - Dune is then Main at "29%, page 120 of 412", the paused Book is back in the Up next pane, and nothing waits.
   - **Stored state:** the paused Reading is kept at p.212 with `pausedAt` today. Dune keeps its single Reading and its 20 October `pausedAt`.
2. **`[P1] a Book paused in another tab: …`** (G2, `:541`). Another tab pauses the Book with a direct `pause` request; then Pause on the stale Book detail is pressed.
   - One request goes out, and `alert` reads "This book isn't your Main book anymore."
   - The refetch swaps Pause for **Resume**, and no live region is left inside `main`.
   - The library is unchanged from the other tab's state.
3. **`[P2] while a pause from Book detail is in flight, …`** (G3, `:569`). The pause route is held open.
   - Pause is `aria-disabled="true"`, described as "Pausing the book.", and a forced second press sends nothing.
   - On release, focus lands on **Resume** and the `status` line follows.
4. **`[P2] axe finds nothing on the visible couldn't-save line …`** (G4, `:600`). A routed 503, Home then Book detail, light then dark. There are no violations.
5. **`[P2] the "⋯" button sits at the right end of the MAIN BOOK row, …`** (G5, `:623`). It checks the bounding boxes against the eyebrow, the card and the title link.

## Files Created/Updated

- `frontend/e2e/pause.spec.ts`: the automate block, 5 tests.
- `frontend/e2e/home.ts`: now exports `waitingPane`, `waitingHeading` and `rowTitles`, moved from `waiting-for-you.spec.ts` as the 4.2 checklist planned.
- `frontend/e2e/waiting-for-you.spec.ts`: imports the moved helpers, and its own copies are gone. Behaviour is unchanged.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the defect found in G2 (below).
- `_bmad-output/test-artifacts/automation-summary.md`: this summary.

## Validation

- **`TZ=Europe/Madrid npm run check` passes:**
  - ruff is clean, and pytest gives 1079 passed.
  - `check:api` is clean (Prettier, oxlint, `tsc -b`, `schema.d.ts` in sync).
  - e2e goes from 336 to 341 passed, and smoke is ok.
- **Mutation check.** Each mutant was reverted after its run, and `git status` shows only the test files.
  - **M1** (`disabledReason` removed from Book detail's Pause) is killed by test 3.
  - **M2** (`holdsRegions = failed`, the pre-EC1 code) **survives test 2.** On a refusal, `sendIntent` refetches before it returns, so the Pause slot has already unmounted when `failed` is set and the regions are never adopted. M2 stays covered by the review's test at `:381` (a 503, then a finish), which kills it.
- **Burn-in:** the 5 new tests passed `--repeat-each=10 --retries=0 --workers=4`, 50 of 50.
- No CLI browser sessions were opened. The mutation backups stayed in the session scratchpad, and the probe spec was deleted.

## Defect Found

**After a stale-tab refusal on Book detail, the refusal is invisible and focus is lost.**
- **Seen in:** a probe of test 2's state. `document.activeElement` is `BODY`, and the only copy of "This book isn't your Main book anymore." is the shell's visually hidden 1×1 `alert` region.
- **Why:** the refusal's refetch makes the Book Up next, so Pause and its slot unmount before `send()` sets `failed` and focuses the opener (`usePauseFlow.tsx:105-106`, where `opener.current` is null).
- **Spec it breaks:** "on the immediate path the `alert` line shows directly below Pause … with focus kept on that button". A screen reader still hears the alert. A sighted user sees Pause turn into Resume with no message.
- **Home:** the same is likely there, because the card empties and "⋯" goes.
- **Status:** test 2 asserts only what holds today (the announcement and the swap), not the focus or visibility. Recorded in `deferred-work.md`.
- **Fixed (follow-up, 2026-11-08):** focus now moves to the Resume the refetch shows, and the line shows below it, on Book detail and on Home. Test 2 now asserts that, and a Home twin was added. Both fail on the old code. `deferred-work.md` has a `resolved:` line.

## ATDD Checklist

Not applicable: Story 4.3 has no `atdd-checklist-4-3-*.md`. Remaining `[ ]` count: n/a.

## Assumptions and Risks

- **Test 2 makes the other tab's change with `page.request`,** as `finish-reading.spec.ts:545` does. No focus or visibility change happens, so React Query doesn't refetch before the press.
- **Test 3 holds the route with a promise,** with no timers. The forced click is needed because Playwright waits on `aria-disabled`, while a real user can still press the button.
- **Test 5 pins a 32×32 button.** If DESIGN.md changes the icon-button size, update the expected size.
- **WebKit and Firefox stay unverified for the menu** until a browser install or a manual check.

## Next Recommended Workflow

Story 4.3 isn't the last story of Epic 4 (4.4 to 4.7 are `backlog`), so there is no retrospective or gate yet. The next steps are:
1. Fix the G2 defect, as a small follow-up or inside Story 4.4.
2. Optionally, run `npx playwright install webkit firefox` and run `pause.spec.ts` against them, to close the Safari/Firefox deferral.
3. Start the next story, 4.4 (`bmad-build`).
