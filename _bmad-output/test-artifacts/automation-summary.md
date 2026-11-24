---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-24'
storyId: '14.5'
storyKey: '14-5-keep-the-search-when-i-open-a-box-and-come-back'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-14-5-keep-the-search-when-i-open-a-box-and-come-back.md (I/O matrix, Review Findings, Auto Run Result)
  - _bmad-output/test-artifacts/atdd-checklist-14-5-keep-the-search-when-i-open-a-box-and-come-back.md (Green-phase follow-ups)
  - _bmad/tea/config.yaml
  - frontend/src/lib/carriedSearch.ts, carriedSearch.test.ts, useSearchCount.ts; frontend/src/pages/CardNotesPage.tsx; frontend/src/api/queryClient.ts, views.ts
  - frontend/e2e/carried-search.spec.ts, search-boxes-automate.spec.ts (openPaused, axe), card-note-boxes.ts, card-note-add-another.ts, back-to-top.ts, home.ts, pile.ts, dev-mode.ts, stats.ts, card-notes.spec.ts
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

# Automation Summary: Story 14.5 Keep the search when I open a box and come back

## Preflight

- **Done at HEAD:** `git show HEAD:…/sprint-status.yaml` reads `14-5-keep-the-search-when-i-open-a-box-and-come-back: done` (review commit `d311fea`). The working tree was clean.
- **Stack:** `fullstack` (auto). The story is frontend only: the search carried between Card notes entries. No server or API change, so no backend or API target.
- **Mode:** BMad-Integrated. The spec, the ATDD checklist's 12 green-phase follow-ups and the review's one deferral ("Keying the body by `location.key` is not verified by any test") are the inputs.
- **Framework:** Playwright (Chromium only), `node --test` for unit leaves. `tea_use_playwright_utils: false` → Traditional Patterns. No Pact. `tea_browser_automation: auto` → `playwright-cli.md`.

## Coverage Plan

Existing coverage: `carried-search.spec.ts` (6 leaves: AC-1 to AC-4, AC-6, and the review's `noGroups` leaf) and `carriedSearch.test.ts` (1 unit leaf, AC-5). New leaves go in `frontend/e2e/carried-search-automate.spec.ts`, plus one unit leaf in `carriedSearch.test.ts`. Selective scope: the checklist's follow-ups and the review's deferral, nothing the ATDD leaves already prove.

| # | Target | Level | Priority | Source |
|---|---|---|---|---|
| 1 | A box opened by Enter carries the text; Walden announces the singular "1 note matches." | E2E | P1 | follow-ups AC-1 singular, AC-1 keyboard |
| 2 | Back with a text that matches nothing: every box faded, "No card notes contain “…”." announced once | E2E | P1 | AC-2 no match |
| 3 | List view: the chip carries "habit" into the List's grouped results, "17 notes match." once with the `h1` focused | E2E | P1 | AC-2 List view |
| 4 | The chip carries the text when the open box was entered by a box, and by Home's "See card notes" | E2E | P1 | AC-3 other ways in |
| 5 | Empty: a box opened with an empty field, Home's "See card notes" and Book detail's "See all card notes" after text was typed on the shelf, the nav link from the open box | E2E | P1 | AC-4 remaining ways |
| 6 | Fresh body on the nav-link REPLACE: scroll to the top, a pending count never announced, the view refetched | E2E | P0 | AC-5 fresh body; review deferral (body keyed by `location.key`) |
| 7 | Fresh body on a same-scope POP (`history.go(-2)` between two shelf entries): an open pile is gone | E2E | P1 | AC-5 fresh body |
| 8 | The chip draws every box in its search state from its first frame | E2E | P1 | AC-6 by the chip |
| 9 | A carried arrival under reduced motion and in dark is drawn the same, from the first frame | E2E | P2 | reduced motion and dark |
| 10 | The open box arriving with a carried search passes axe, light and dark | E2E | P2 | axe |
| 11 | A coalesced `navigate(-2)` counts from the handled location | Unit | P1 | AC-5 coalesced moves |

Not automated: **AC-4 bfcache** ("a bfcache restore keeps the page as left"). The e2e server sends no headers that make the page bfcache-eligible on demand and Playwright can't force a bfcache restore, so this is retired in the checklist.

## Generation

Run in sequence in this session, as for 14.1 to 14.4: no worker subagent was launched, and the server doesn't change, so there's no API or backend target.

**Files:**
- `frontend/e2e/carried-search-automate.spec.ts` (new): 10 leaves, targets 1 to 10 above.
- `frontend/e2e/carried-search.ts` (new): the helpers and constants `carried-search.spec.ts` kept locally (`LIFT`, `FADE`, `HABIT_LINE`, `HABITS_LINE`, `H1`, `searchedState`, `HABIT_STATE`, `HABITS_STATE`, `AT_REST`, `chip`, `notes`, `announced`, `searchTheShelf`). They moved here unchanged, so the second spec imports them and doesn't keep a copy.
- `frontend/e2e/carried-search.spec.ts`: imports from `carried-search.ts` instead of its local copies. The leaves are unchanged.
- `frontend/src/lib/carriedSearch.test.ts`: one unit leaf (target 11), in its own `describe`, reusing the file's `mount` harness.

| Leaf | Level | Priority | What it proves |
|---|---|---|---|
| `carried-search-automate.spec.ts:77` | E2E | P1 | Enter on Walden's focused box: field "habit", 1 note, 1 `<mark>`, "1 note matches." once with the `h1` focused |
| `:98` | E2E | P1 | "zqx" on the open box, then Back: every box faded, "No card notes contain “zqx”." shown and announced once with the `h1` focused |
| `:122` | E2E | P1 | The chip after a box-entered open box carries "habits" (`HABITS_STATE`, announced once); Back from there to the box starts empty. The chip after Home's "See card notes" carries "habit" (`HABIT_STATE`, announced once with the `h1` focused) |
| `:166` | E2E | P1 | Empty with nothing announced: a box opened with an empty field; Home's "See card notes" and Book detail's "See all card notes" after "habit" was typed on the shelf; the nav link from an open box carrying "habit" |
| `:225` | E2E | P0 | Fresh body on the nav link's REPLACE under a paused clock: with "habit" typed 400ms earlier, the click sends the shelf view's GET again, the field is empty, `scrollY` is 0, the `h1` is focused, and after 1s nothing is announced |
| `:255` | E2E | P1 | The chip draws the shelf in its search state from its first frame: Refactoring at 0.38 and Atomic Habits at −6 in every sampled frame |
| `:279` | E2E | P2 | The same through Back, under `reducedMotion: 'reduce'` and in dark |
| `:299` | E2E | P2 | The open box with a carried "habit" passes axe (`AXE_TAGS`) in light and dark, with no rule disabled |
| `:321` | E2E | P1 | List view: the chip carries "habit": 4 groups, 17 notes, List pressed, "17 notes match." once with the `h1` focused |
| `:350` | E2E | P1 | Fresh body on a POP within the same scope: shelf, Home, shelf again, pile opened, `history.go(-2)`. The pile is gone and the `h1` is focused |
| `carriedSearch.test.ts:195` | Unit | P1 | `navigate(-2)` from the chip's shelf to the first shelf, skipping a box whose `openedFrom` names it, starts empty; `navigate(2)` also starts empty; the same trip one step at a time brings "habits" out |

**Mutation checks** (each was an edit reverted the same way, with no git command; afterwards `git diff --stat src/pages/` was empty):
- Body keyed by `bookId ?? ''` in place of `location.key`: `:225` failed at the refetch wait, and `:350` failed with the pile still open.
- The same mutation with `:225`'s refetch wait skipped for that run only: the leaf still failed, on "nothing announced" (`:251`, the waiting count of "habit" was announced). So the pending-count check catches the mutation on its own as well.
- The `scrollY` 0 check in `:225` did **not** fail under the mutation. Focusing the `h1` (`PageHeading`) already scrolls the shelf to the top, so the layout effect's scroll can't be told apart from it on a REPLACE. The check stays as a true statement of the behavior, but it isn't evidence for the layout effect. AC-2 and AC-3's Back leaves are where that scroll is tested.

## Validation

- `node --test src/lib/carriedSearch.test.ts`: 2 passed.
- `TZ=Europe/Madrid npx playwright test e2e/carried-search-automate.spec.ts e2e/carried-search.spec.ts`: 16 passed on the first run (10 new, plus the 6 ATDD leaves after the helper move).
- `npm run check:api` (Prettier, oxlint, `tsc -b`, unit): exit 0, unit 416 passed.
- `npm run check`: exit 0. check:api passed (unit 416), check:py passed (2508), check:e2e passed (872, up from 862 by the 10 new leaves, none flaky), check:smoke passed.

Checklist (`checklist.md`): framework ready, every target mapped to a leaf, priorities tagged in the titles, no hard waits (the paused clock's `runFor` advances fake time only), selectors by role and text. The one CSS selector comes from the shared `boxOfBook` helper. No CLI browser session was opened, so none was left behind. Probes and backups went to the session scratchpad, not the repo.

## ATDD checklist

`atdd-checklist-14-5-keep-the-search-when-i-open-a-box-and-come-back.md`: 11 green-phase follow-ups ticked with the leaf that proves each. "AC-4 bfcache" is retired: Playwright can't force a bfcache restore. The stale line 83 ("covered by AC-4's nav-link branch", the review's deferral) now points at the fresh-body leaves. `grep -cF '[ ]'` → **0**.

## Assumptions and risks

- `:225` pauses the clock only after `scrollToY`, which waits on animation frames, which the paused clock would also stop.
- `:350` uses `history.go(-2)` from the page, standing in for Back's long-press menu, since Playwright has no two-step Back. It waits for `history.state.idx` 0 before asserting.
- The "no placeholder data" part of AC-5 is shown only indirectly, by the refetch on mount. `useCardNotesView` sets no `placeholderData` (`views.ts`), so there is no previous-key data to show.
- Residual risk from the build stands: a stale cached scoped view with no groups drops a carried search before the refetch (rejected as rare in the review).

## Next

Story 14.5 is Epic 14's last story. Next: the Epic 14 retrospective (`bmad-retrospective`), then its before-next-epic items: the trace and gate (`bmad-testarch-trace`) and the spine reconciliation of Epic 14's "spine drift" entries (AGENTS.md → Epic boundaries).
