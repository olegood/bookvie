---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-27'
storyId: '17.2'
storyKey: '17-2-choose-a-month-or-year-by-its-bar'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-17-2-choose-a-month-or-year-by-its-bar.md (ACs, I/O matrix, Review Findings, Review Triage Log, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-17-2-choose-a-month-or-year-by-its-bar.md (Green-phase follow-ups, Implementation checklist)
  - _bmad/tea/config.yaml
  - _bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.link, components.focus-ring, components.monthly-bar, Stats finished list → Heading)
  - frontend/src/components/StatsBars.tsx, StatsBars.module.css, StatsFinishedList.tsx, StatsFinishedList.module.css; frontend/src/styles/base.css (.linkButton)
  - frontend/e2e/stats-bars-select.spec.ts, stats.ts, library.ts, home.ts, dev-mode.ts; frontend/src/lib/stats.test.ts; frontend/scripts/copy.test.mjs
  - resources/knowledge: test-levels-framework.md, test-priorities-matrix.md, data-factories.md, selective-testing.md, ci-burn-in.md, test-quality.md, fixture-architecture.md, network-first.md, playwright-cli.md (core and Traditional Patterns; no Playwright Utils)
---

# Automation Summary: Story 17.2, choose a month or year by its bar

## Preflight

- **Done at HEAD.** At HEAD (`874db5d`, the code review's commit), `sprint-status.yaml` has `17-2-choose-a-month-or-year-by-its-bar: done`. The working tree was clean.
- **Stack:** `fullstack` (auto). Playwright (Chromium only) and pytest are in place.
- **Mode:** BMad-Integrated. Inputs: the ATDD checklist's ten green-phase follow-ups.
  - Three were already covered by tests the build and review added: the `lib/stats` unit cases (`stats.test.ts:318–370`), both AC-11 halves (`stats-bars-select.spec.ts:725`, `:769`), and the first half of AC-7 (`:616`).
  - AC-13's line needs no new test: `copy.test.mjs` passes, and the bar keys are on the chart (`StatsBars.tsx:99`, `:134`).
  - The rest had no test.
- **No backend target:** `period` is never sent to the server (AC-9), and the view's shape didn't change.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns), no Pact, `tea_browser_automation: auto`. I didn't explore with `playwright-cli`, because every locator already ships in `stats.ts`.
- **Execution mode:** sequential in this session, as in 17.1. All eight leaves go in one new file.

## Coverage plan

| Target | Level | Priority | Result |
|---|---|---|---|
| AC-2 Tab back into the chart falls to the selected bar once the last focused bar has left it (a refetch removes February) | E2E | P2 | `stats-bars-select-automate.spec.ts:42` |
| AC-2 Up and Down on a bar have their default held back, so the page doesn't scroll; Down from the `h1` is the control that does scroll | E2E | P2 | `:93` |
| AC-3 Space presses a bar from rest; a click in the middle of a track presses that bar | E2E | P2 | `:147` |
| AC-5 Show the whole range sits `--space-4` after the heading's last glyph, on its baseline, styled as `components.link` | E2E | P2 | `:188` |
| AC-6 an unselected focused bar has `components.focus-ring` (2px offset); the selected one in dark has `ACCENT_DARK` at 6px | E2E | P2 | `:238` |
| AC-7 a Custom range wider than 24 months turns the chart into years and releases the bar | E2E | P1 | `:280` |
| AC-9 a valid `period` survives a reload (`h1` unfocused, silent) and Back/Forward (`h1` focused, silent) | E2E | P1 | `:310` |
| AC-12 This year past New Year drops a 2026 `period` quietly and keeps `range=thisYear` | E2E | P3 | `:360` |
| AC-1/3/5/9 strings, parse, validation, `statsSearch` | Unit | P1 | already covered: `stats.test.ts:318`, `:324`, `:343`, `:352`, `:362` |
| AC-11 failed refetch, `h1` fallback | E2E | P1 | already covered: `stats-bars-select.spec.ts:725`, `:769` |
| AC-6 forced-colors focus ring | — | — | retired: the review rejected it (Review Triage Log, "Verification Gap (other)") |

## Files

- **Created:** `frontend/e2e/stats-bars-select-automate.spec.ts` (8 leaves).
- **Updated:**
  - `_bmad-output/test-artifacts/atdd-checklist-17-2-choose-a-month-or-year-by-its-bar.md`: every green-phase follow-up and implementation line resolved with its evidence, and one line retired. `grep -cF '[ ]'` gives **0**.
  - this summary.
- **Production code:** none touched.

## Helpers

None was added to an `e2e/*.ts` module, and the new spec has no local helper function. It reuses `firstLineRect`, `designComponentValue`, `ACCENT`, `ACCENT_DARK` and `bookId` (library.ts), `NEW_YEAR_NOW`, `barLook`, `bar`, `barChart`, `chartBars`, `showWholeRange`, `statsRequestFor` and the rest from stats.ts.

Three reads are written inline in their one leaf, because no exported helper does them:
- The 160px track's center, for the click in AC-3. `barLook` finds the track the same way but doesn't return its box.
- A baseline probe, for AC-5: a zero-height inline-block at the end of the `h2` and of the button. No e2e helper reads a baseline (`grep -n baseline e2e/*.ts` finds none).
- A window `keydown` recorder, for AC-2: it notes whether Up and Down had their default held back.

## Validation

- `npx playwright test e2e/stats-bars-select-automate.spec.ts`: 8 passed. `--repeat-each=5`: 40 passed.
- `prettier --write`, `oxlint` and `tsc -b` on the new file: clean. `node --test scripts/copy.test.mjs`: 2 passed.
- Full `npm run check`, 2026-11-27: format, lint, `tsc`, unit 457 passed (0 skipped), pytest 2538 passed. The first `check:e2e` failed on one leaf outside this story, `search-boxes-automate.spec.ts:195` (Story 14.4): Card notes showed 0 of its 5 box links within 10s. That leaf passed 10 of 10 alone (`--repeat-each=10`), and a second `npm run check:e2e` passed **979** (971 + these 8, none skipped), with `check:smoke` ok. I read it as a flake under full-suite load; it isn't this story's, so it got no `deferred-work.md` entry.
- **No production mutation probes:** automate edits tests only. Two leaves carry their own control instead: AC-2's Up/Down leaf shows Down does scroll from the `h1`, and AC-2's fallback leaf tells the selected bar (March) apart from the latest (April). None of the eight exposed a defect.

## Assumptions and risks

- AC-12's New Year leaf pins my reading: at New Year, This year's `period=2026-10` isn't a bar of 2027, so the general rule (a `period` that isn't a bar with finishes in the settled view is dropped quietly) applies. Nothing in epics.md says otherwise. The follow-up's "a change of year, not of range" shows as no range-line announcement and an unchanged `range=thisYear`.
- AC-5's gap is compared with `--space-4` to the nearest pixel (`toBeCloseTo(…, 0)`), and the baselines to within half a pixel.
- No defect found, so no `deferred-work.md` entry.

## Next

Story 17.2 closes Epic 17. Next comes the Epic 17 retrospective (`bmad-retrospective`), then its before-next-epic items: the trace and gate, and the spine reconciliation for the open "spine drift" entries (AGENTS.md → Epic boundaries).
