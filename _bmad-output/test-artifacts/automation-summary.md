---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: '4.4, 4.5, 4.6, 4.7 (Epic 4 retro item 36)'
inputDocuments:
  - _bmad-output/implementation-artifacts/epic-4-retro-2026-11-09.md (PL-1, PL-5, PL-7, F-R5, F-R7; action 36)
  - _bmad-output/implementation-artifacts/spec-4-4-choose-what-to-read-next.md, spec-4-5-mark-any-book-finished-from-its-page.md, spec-4-6-see-each-book-s-state-on-the-shelf-and-its-page.md, spec-4-7-keep-a-few-side-reads.md (Review Triage Logs, residual risks)
  - _bmad-output/implementation-artifacts/deferred-work.md (the entries "For retro item 36")
  - _bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md
  - _bmad/tea/config.yaml
  - frontend/src/pages/HomePage.tsx, frontend/src/components/StartDialog.tsx, SpinePopover.tsx, frontend/src/api/views.ts, intents.ts, queryClient.ts
  - frontend/e2e/side-reads.spec.ts, set-up-next.spec.ts, home-slice.spec.ts, up-next.spec.ts, finish-any-book.spec.ts, book-states.spec.ts, stale-hand-offs.spec.ts
  - backend/tests/test_reading_state_machine.py, backend/bookvie/intents/edit_book.py, add_book.py
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

# Automation Summary: Stories 4.4 to 4.7 (Epic 4 retro item 36)

This file used to hold the Story 4.3 summary, which is in git history (`5e2632d`).

**Execution mode:** BMad-Integrated. Inputs: the four story specs (their Review Triage Logs, including retro item 43's second passes, and residual risks), the Epic 4 retro, the `deferred-work.md` entries addressed to item 36, and 4.4's ATDD checklist. 4.5, 4.6 and 4.7 have no ATDD checklist.
**Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`).
**Playwright Utils mandate:** off (`tea_use_playwright_utils: false`).
**Pact.js Utils mandate:** not applicable (the repo has no contract testing).
**Subagent execution:** SEQUENTIAL. The targets were small and spread over three files, so they were written inline.
**Total tests added:** 13 Playwright tests and 2 Hypothesis rules.
**Browser exploration:** skipped. The specs pin roles and names. Two throwaway probe specs ran: `e2e/zz-probe-f-r5.spec.ts` (F-R5) and `e2e/zz-probe-inflight.spec.ts` (the popover's refetch). Both are deleted.

## F-R5 probe result: real, and it finishes the wrong Book

Seed: Dune Main at p.100; The Left Hand of Darkness paused at p.120 and a Side read. From Home's On the side pane, start The Left Hand of Darkness at "Which page?" 330 (its last page) while `GET /api/views/home` answers 503.

- `start-reading` commits: The Left Hand of Darkness is Main at p.330, Dune is paused.
- The home refetch fails. `retry: false`, and a failed background refetch keeps the last data (`views.ts`), so Home still shows Dune as Main.
- Home opens **"Finished Dune"**, described by The Left Hand of Darkness's line "Page 330 of 330, 100%.".
- **Done sends `finish-reading` for Dune.** Since 4.5 any Book with an unfinished Reading can be finished, so the server accepts it: Dune's paused Reading is finished at 412 pages, and The Left Hand of Darkness stays Main, unfinished.

The cause is the one F-R5 named: `StartedState` carries no Book id (`StartDialog.tsx:25`), and Home opens Finish for whatever `mainId` the view shows (`HomePage.tsx:165-170`). The finish hand-off just below it compares `handed.id`; this one doesn't. In the probe's first run, the route was removed before Home rendered, and Finish opened for the right Book, so the outcome depends on timing.

## Coverage Plan by Test Level and Priority

Scope: **selective**, aimed at what the retro (F-R7, PL-5) and the reviews deferred to item 36. Most of 4.4's checklist is already proven by the `(ATDD)`, `(automate)` and retro item 43 blocks of `set-up-next.spec.ts` and by `test_set_up_next.py`; those lines are ticked with that evidence, not re-tested.

| # | Target | Evidence | Level | Priority |
|---|---|---|---|---|
| T1 | **F-R5:** a last-page start whose home refetch fails never opens Finish for another Book. | The probe above. | E2E | P0 |
| T2 | **"Which page?" and `reachedLastPage` from every other route:** Book detail, the Catalog spine popover, Home's Up next pane, the empty card's suggestion, a Waiting row. Each: the field is focused and prefilled, and a last-page start opens "Finished *X*" on Home for that Book. | F-R7; 4.7 residual risk. Only the On the side pane (`side-reads.spec.ts:494`) and Home's slice (`home-slice.spec.ts`, not repeated) are covered. Book detail and Catalog navigate to a remounted Home. | E2E | P1 |
| T3 | **The last-page hand-off is used once:** after Cancel, a reload, Back then Forward don't reopen Finish. | `deferred-work.md` (`lastPageOpened`, `clearHandOffState` untested). | E2E | P1 |
| T4 | **AC-2 in the browser:** a stale tab presses Set as Up next for the current Up next; 200, the `status` line, and nothing written. | 4.4 checklist l.366; deferred entry. | E2E | P1 |
| T5 | **Property test gains `edit-book` and `add-book`** (RDG-UNIT-002): pages floors, a Finished on back-fill that takes a Book out of the Side reads, and a new Book joining the slots. | F-R7 ("fix now (action 36)"). | Unit/API | P1 |
| T6 | **The spine popover's in-flight state** for Set as Up next: the hint frozen, `aria-disabled` with its reason, a second press sends nothing. | Deferred from 4.4's second review. | E2E | P2 |
| T7 | **Refetch on focus (AD-7) for set-up-next:** a set-up-next in another context shows in Home's panes and on Book detail after focus, with no warning. | 4.4 checklist l.367; deferred entry. | E2E | P2 |
| T8 | **Tick 4.4's ATDD checklist** (22 open lines) against the tests above and the existing ones. | PL-7. | n/a | n/a |

**Not selected:**
- **The shared e2e helpers** (`watchStatus`, `routeCouldntSave`, …, copied across five specs). Deferred in `deferred-work.md` as wider than one story; a move now would churn five specs inside a test-only item.
- **4.5 and 4.6 beyond what their reviews added.** 4.5's matrix rows are in `test_finish_any_book.py` and `finish-any-book.spec.ts` (plus item 43's stale-finish leaf); 4.6's Book states table is a parameterized leaf per row in `book-states.spec.ts`, with forced colors. Nothing in their logs is left for item 36.
- **Safari and Firefox.** Only Chromium is installed.

**Decision (Oleg, 2026-11-10):** fix F-R5 now through `bmad-build`, and run T1–T8 as planned.

## Tests Added

**T1, the F-R5 fix** (commit `295e74d`, spec `spec-epic-4-retro-item-36-last-page-finish-for-the-started-book.md`):
- `frontend/e2e/side-reads.spec.ts`, "[P0] F-R5 a last-page start whose home refetch fails opens Finish only for the started Book, once Home shows it". It fails on the old code at the "no Finish dialog" line, and passed 30 of 30 at `--workers=6`.

**T2 and T3**, a new block in `frontend/e2e/side-reads.spec.ts`, "Epic 4 retro item 36: "Which page?" and the last page from every route":
- One leaf per route: Book detail, the Catalog's spine popover, Home's Up next pane, the empty Main book card's suggestion, and a Waiting for you row. Each checks that "Which page?" is focused and prefilled with the paused page. A start at p.330 lands on `/`, opens "Finished The Left Hand of Darkness" described "Page 330 of 330, 100%.", makes it Main and takes it off the side.
- "[P1] a last-page start opens Finish once: a reload, Back and Forward never reopen it". Finish is cancelled first, and the Reading stays unfinished throughout.

**T4, T6, T7 and two more 4.4 checklist lines**, a new block in `frontend/e2e/set-up-next.spec.ts`, "Epic 4 retro item 36: Set as Up next, automate":
- **`:555` AC-2 in the browser:** a stale tab presses Set as Up next for the current Up next. It gets a 200, "Fahrenheit 451 is Up next.", focus on Start reading, and identical bytes.
- **`:583` the popover in flight, with no earlier Up next:** the answer is held after the server commits, and a refetch shows the Book as Up next. Throughout, the button stays `aria-disabled`, it is described only by "Setting the book as Up next.", no hint appears, and a forced second press sends nothing.
- **`:629` the same with an Up next:** the hint shown at the press stays, beside the busy reason.
- **`:664` AC-4 on Home:** a displaced paused Up next joins Waiting for you in `pausedAt` order. A displaced never-started one is in neither pane.
- **`:694` AC-8:** a finished Book set as Up next shows Start reading in the pane, and "Start Fahrenheit 451?" has an empty Purpose.
- **`:720` refetch on focus (AD-7):** two contexts. The other context's Home moves the Book from Waiting for you to Up next, and its Book detail drops Set as Up next, with no alert or dialog.

**T5**, `backend/tests/test_reading_state_machine.py` (RDG-UNIT-002):
- An `add` rule (up to two Books, maybe with a Finished on).
- An `edit_details` rule (`edit-book` with the panel prefilled: a new Pages, and maybe a new Finished on).
- The model predicts each refusal (`book_not_found`; `invalid_fields` for a future date, a date before the latest finished Reading's start, or a new date after the current Reading's start; `pages_below_current_page`) and the exact change: only Pages and the latest finished date, or an appended back-fill. A back-fill on a Book with no Readings leaves the Side reads, and no pointer moves.
- The page ledger follows each back-fill. Slots 5 and 6 name the added Books.
- A 2,000-example run reached every outcome: `add` accepted 1,805 times and refused 43 times; `edit_details` accepted 1,669 times, with 452 `invalid_fields`, 88 `pages_below_current_page` and 1,448 `book_not_found`. Nothing failed, which agrees with the retro reviewer's own fuzz.

## Files Created/Updated

- `frontend/src/components/StartDialog.tsx`, `frontend/src/pages/HomePage.tsx`: the F-R5 fix (commit `295e74d`).
- `frontend/e2e/side-reads.spec.ts`: the F-R5 leaf (in `295e74d`) and the every-route block.
- `frontend/e2e/set-up-next.spec.ts`: the item 36 block.
- `backend/tests/test_reading_state_machine.py`: `add-book` and `edit-book` rules, and the docstring.
- `_bmad-output/test-artifacts/atdd-checklist-4-4-choose-what-to-read-next.md`: 22 lines ticked.
- `_bmad-output/implementation-artifacts/deferred-work.md`: `resolved:` lines on the four item 36 entries.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: item 36 `done`.

## Validation

- `npm run check:py`: 1167 passed (the state machine is still 2 tests), and ruff is clean. Coverage gates: domain 100%, intents+store 97.95%.
- `npm run check:api`: 237 passed, with Prettier, oxlint, `tsc -b` and the schema check clean.
- `npm --prefix frontend run e2e`: 416 passed, up from 404 (12 new; the F-R5 leaf was already in the 404).
- **Burn-in:** the 12 new e2e tests passed `--repeat-each=10 --retries=0 --workers=4`, 120 of 120. The F-R5 leaf passed 30 of 30 at `--workers=6`.
- **Mutation check:** with `showHint` reduced to `hasUpNext` (no `hintAtPress`), `:583` fails at its criterion line, the accessible description. The source was restored from a scratchpad backup, and `git status` showed it clean.
- No CLI browser sessions were opened.

## ATDD Checklist

`atdd-checklist-4-4-choose-what-to-read-next.md`: 22 of 22 open lines ticked, with evidence (test file and line, or test name). Remaining `[ ]` count: **0**. 4.5, 4.6 and 4.7 have no checklist.

## Assumptions and Risks

- **A focus refetch in e2e needs a bubbling `visibilitychange`.** TanStack's listener is on `window`. A non-bubbling event on `document` refetched nothing, and an early F-R5 run passed only by accident. In the popover leaves, even a bubbling event sometimes didn't show the new state in time, about half the runs at `--workers=4`; a probe showed the refetch does go out. So those leaves send the event again until the spine reads ", Up next" (`expect(...).toPass()`), which waits on a condition, not the clock.
- **The window that `hintAtPress` guards is forced by holding the intent's answer after the server commits** (`route.fetch()`, then a held `route.fulfill`). In the app, that window is the time between the refetch rendering and the flow handling the result.
- **The AC-8 Side-read line is ticked from a seeded state** (`side-reads.spec.ts:306`) plus the API proof that `set-up-next` keeps `sideReadBookIds` (`test_ac8_p1_…`), not from a press in the browser.
- **The F-R5 review deferred one finding:** the page field's last-page save (`openFinish`) has the same wrong-Book shape (`deferred-work.md`).

## Next Recommended Workflow

Item 37: the Epic 4 trace and gate (`bmad-testarch-trace`) against TR7. Then item 38 (spine reconciliation) and item 41 (BookDetailPage hooks) before Epic 5.
