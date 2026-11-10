---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: '5.1'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-5-1-add-a-card-note-while-reading.md (Boundaries, I/O matrix, Review Triage Log, code review findings)
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md
  - _bmad-output/test-artifacts/test-design-qa.md (CRD-API-001, CRD-E2E-001, XUI-E2E-001, R-09)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts, backend/tests/conftest.py
  - backend/tests/test_add_card_note.py, test_note_pages.py; frontend/e2e/add-card-note.spec.ts; frontend/src/lib/cardNotes.test.ts, src/api/books.test.ts
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

# Automation Summary: Story 5.1 Add a card note while reading

This file used to hold the summary for Stories 4.4 to 4.7 (Epic 4 retro item 36), which is in git history (`a773997`).

## Preflight

- **Execution mode:** BMad-Integrated. Inputs: the 5.1 spec (with its build and code review logs), the Epic 5 context and the 5.1 ATDD checklist.
- **Detected stack:** fullstack (`backend/pyproject.toml` + `frontend/playwright.config.ts`). The frameworks are pytest (`backend/tests/conftest.py`) and Playwright, both in place.
- **Playwright Utils mandate:** off (`tea_use_playwright_utils: false`, and the package isn't installed).
- **Pact.js Utils mandate:** not applicable (the repo has no contract testing).
- **Browser automation:** `auto`, so `playwright-cli.md` is loaded.
- **Knowledge fragments:** the six core fragments, the two traditional Playwright fragments (`fixture-architecture`, `network-first`) and `playwright-cli`.

## Coverage Plan by Test Level and Priority

**Browser exploration:** skipped. `playwright-cli` isn't installed, and the spec and checklist pin every role and name.

**What 5.1 already proves.** The ATDD leaves plus the build and code review follow-ups cover:
- **API (`test_add_card_note.py`, `test_note_pages.py`):** every Page form and refusal, the stored shape, trimming, TR8, and the view order with a tie.
- **E2E (`add-card-note.spec.ts`, 10 leaves):**
  - the panel from both openers and the three prefills (212, 88 and 1, plus empty);
  - Save on Home and on Book detail;
  - 422 on Page, on Note and on both;
  - a routed 503 with Esc and Cancel ignored in flight;
  - Esc, and the Tab cycle.

**Scope: selective.** The plan covers the checklist's open green-phase follow-ups and two API edges. It adds no duplicate coverage.

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| 1 | CRD-E2E-001 as one journey: add from Home, then open Book detail and see the note in "Card notes (1)" with its ref | E2E | P1 | Flow 6, end to end; the checklist's one-journey follow-up |
| 2 | Adding on Book detail updates "Card notes (N)", and a lower page moves into the first three | E2E | P1 | AC-5 after a write: the view refetch drives the block |
| 3 | R-09: a note added at p.270 makes `edit-book` refuse Pages 260 with `pages_below_card_note` | API | P1 | Closes R-09 with a note the app wrote, not a seeded one |
| 4 | A gone Book with bad fields gets 409 `book_not_found`, not 422 | API | P2 | Pins the refusal order (the Book is checked first) |
| 5 | Wrong JSON types (`page` as the integer 42, `text` null, an unknown key) get 422 on `intent`, and nothing is written | API | P2 | `page` is a string by contract; strict parsing |
| 6 | Fixing a refused field and saving again clears `aria-invalid` and saves | E2E | P2 | AC-3 follow-up: the error is not sticky |
| 7 | A second Save note press while the save is out sends nothing | E2E | P2 | XUI-E2E-003 follow-up |
| 8 | Stale tab on Home: the Main book is deleted elsewhere, so Save gets 409, the message shows inside the panel, and both values are kept | E2E | P2 | Checklist stale-tab follow-up; the panel survives the emptied card |
| 9 | axe on the open panel and on Book detail's block, light and dark | E2E | P2 | Checklist a11y follow-up, modeled on `book-detail.spec.ts:529` |

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported, agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** zero tests. The repo has no Playwright API layer, since API tests run in pytest through `TestClient`.
  - **3B-backend:** rows 3 to 5.
  - **3B-e2e:** rows 1, 2 and 6 to 9.
- **Fixtures:** none needed. Both workers reuse the spec's helpers and `tests/helpers.py`.

## Tests Added

**API** (`backend/tests/test_add_card_note.py`): 3 tests, 5 cases.
- `[P1]` `test_r09_p1_a_note_added_through_the_intent_sets_the_pages_floor_for_edit_book`: a note added at "p.270" makes Pages 260 fail with 409 `pages_below_card_note`, bytes unchanged. Pages 270 saves.
- `[P2]` `test_refusal_order_p2_a_gone_book_is_409_book_not_found_before_its_fields_are_checked`
- `[P2]` `test_strict_parsing_p2_wrong_json_types_are_422_on_intent_and_save_nothing`, parametrized: `page` 42, `text` null, an unknown key.

**E2E** (`frontend/e2e/add-card-note.spec.ts`): 6 tests.
- `[P1]` A note added on Home shows on that Book's detail in "Card notes (1)" with its page ref (CRD-E2E-001).
- `[P1]` Adding on Book detail updates "Card notes (N)", and a lower page moves into the first three.
- `[P2]` Fixing a refused field and saving again clears its `aria-invalid`, and the next save goes through.
- `[P2]` A second Save note press while the save is out sends nothing (XUI-E2E-003).
- `[P2]` Stale tab: Save on Home after the Main book was deleted elsewhere shows the 409 inside the panel, with the values kept.
- `[P2]` The open panel and Book detail's block pass axe in both themes.

**Totals:** 9 tests (3 P1, 6 P2). With the spec's earlier leaves, `add-card-note.spec.ts` has 15 tests and `test_add_card_note.py` has 7.

## Defect Found and Fixed

**The stale-tab leaf found a real bug.** The panel lost its typed values and its alert line when a refetch emptied the Main book card.
- **Cause:** the code review's patch rendered `{cardNotePanel}` inside each branch of `MainBookCard`. Its position differed between the branches, so React remounted the panel when the card flipped to "No Main book.".
- **Fix:** `frontend/src/components/MainBookCard.tsx` now renders the card and the panel as siblings in a fragment, which puts the panel at the same place in both branches.
- **Proof:** the leaf fails against the committed component and passes with the fix.

**Two test-side corrections:**
- The second-press leaf uses `click({ force: true })`, because Playwright waits on `aria-disabled`, as in `set-up-next.spec.ts:345`.
- The stale-tab leaf seeds a second Book. Deleting the only Book empties the library, and Home then shows the empty-shelf page with no Main book card.

## Files Created/Updated

- `backend/tests/test_add_card_note.py`: 3 tests, plus imports and an `_edit` helper.
- `frontend/e2e/add-card-note.spec.ts`: 6 tests, plus imports (`AxeBuilder`, `DELETE_BOOK`, `settled`) and the `BOOK_GONE` and `AXE_TAGS` constants.
- `frontend/src/components/MainBookCard.tsx`: the fix above.
- `_bmad-output/test-artifacts/atdd-checklist-5-1-add-a-card-note-while-reading.md`: every line resolved.

## Validation

- `npm run check` exits 0, with 1,279 backend tests and 431 e2e tests passing.
- Burn-in: `add-card-note.spec.ts` with `--repeat-each=3` gives 45 of 45.
- **Test quality:** there are no skips, `only` or hard waits, and each title carries one `[P#]` tag. Network-first: the routes are registered before the triggering click, and the held route is released after the assertions.
- No browser sessions were opened (`playwright-cli` isn't installed). The worker temp files are in `/tmp/tea-automate-*-2026-11-10T14-27-28-351Z.json`.

## ATDD Checklist

All 31 open lines of `atdd-checklist-5-1-add-a-card-note-while-reading.md` are ticked, each with its evidence. `grep -cF '[ ]'` now gives **0**.

The Book-detail half of the stale-tab line is recorded as rejected in the 5.1 code review: the panel unmounts with the not-found page, and the Book is gone.

## Assumptions and Risks

- **Book detail stale tab:** a 409 unmounts the panel along with the page. This was rejected in the code review as rare, since the note can't be kept for a deleted Book.
- **Last Book deleted elsewhere:** the panel also unmounts when Home switches to its empty-shelf page. That is the same class of rare stale-tab case, and the alert is still announced.
- **The axe leaf** covers the block with seeded notes only, not the empty "No card notes yet." state. The empty state is plain text inside the same section.

## Next Recommended Workflow

5.1's pipeline is complete (ATDD, build, code review, automate). Next is Story 5.2 (`bmad-testarch-atdd`), which is not the end of an epic.
