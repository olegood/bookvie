---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-10'
storyId: '5.3'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-5-3-find-a-note-across-all-my-books.md (Boundaries, I/O matrix, Review Triage Log, Review Findings)
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/test-artifacts/atdd-checklist-5-3-find-a-note-across-all-my-books.md
  - _bmad-output/test-artifacts/test-design-qa.md (CRD-E2E-002, R-17 timing smoke)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts, backend/tests/conftest.py
  - backend/tests/test_card_notes_view.py, test_home_view.py; frontend/e2e/card-notes.spec.ts; frontend/src/lib/cardNotes.test.ts
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

# Automation Summary: Story 5.3 Find a note across all my books

This file used to hold the summary for Story 5.2, which is in git history (`1c5e4ee`).

## Preflight

- **Stack:** `fullstack` (auto-detected). Frontend: Playwright (`frontend/playwright.config.ts`) plus `node --test` unit tests. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-integrated. Story 5.3 is `done` in `sprint-status.yaml` after bmad-code-review (`27b88bf`).
- **Flags:** `tea_use_playwright_utils: false`, so the traditional fixture and network patterns apply (the project's `e2e/fixtures.ts`). `tea_use_pactjs_utils: false`, and there is no contract testing. `tea_browser_automation: auto`.
- **Knowledge loaded:** test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, test-quality, fixture-architecture, network-first, playwright-cli.
- **Existing 5.3 coverage:**
  - **API:** `test_card_notes_view.py` has 6 tests: AC-2's order and grouping, the Book-id tie-break, the scoped view, the scoped view without notes, the 404 and OpenAPI. `test_home_view.py` covers `cardNoteCount` at 0 and 3.
  - **E2E:** `card-notes.spec.ts` has 19 leaves covering AC-1 to AC-6 and their follow-ups, including axe in both themes.
  - **Unit:** `cardNotes.test.ts` covers `noteMatches`, `highlightParts` (including the "İ" guard) and the copy helpers.

## Coverage Plan

**Browser exploration:** skipped. `playwright-cli` isn't installed, and the 19 e2e leaves already drive every 5.3 surface. The targets come from the code, the ATDD checklist and the code review's deferral.

**Source and API analysis:** `GET /api/views/card-notes` (`backend/bookvie/views/card_notes.py`, `http/api.py`) is covered for its order, scope, 404 and OpenAPI. `HomeMainBook.cardNoteCount` is covered from a seeded file only, never across an intent.

**Gaps and targets (selective scope: only the gaps the ATDD checklist and the code review left open; no duplicate coverage):**

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| G1 | The `<mark>` in the dark theme (non-transparent background, 1px underline in the accent color), and in forced colors (the system `Mark` pair, still distinct from the note's background) | E2E | P2 | ATDD AC-3 follow-up "in both themes. Forced colors keep the mark visible." The AC-3 leaf checks the light theme only. |
| G2 | A query of spaces only filters nothing and announces nothing, even after the pause (I/O matrix row "Blank") | E2E | P2 | The unit tests cover `noteMatches`, but not `useSearchCount`'s blank-query cancel. Playwright's clock makes "nothing after the pause" deterministic. |
| G3 | `cardNoteCount` follows the intents: `add-card-note` raises it, `delete-card-note` lowers it | API | P2 | ATDD AC-4 follow-up "0, and N after an add or a delete". Today it is checked only from seeded files. |
| G4 | Typing a search and opening Edit within the pause announces no "N notes match." over the open panel, on the page and in Book detail's block | E2E | P2 | Deferred by the code review as timing-sensitive. Playwright's clock removes the timing, so it can be automated now. |

**Not automated:**
- **R-17 timing smoke** (report only, no target): there is no timing harness in the repo. This run measures the view once on a 500-Book / 3,000-note library and reports the numbers here, without committing a test.
- **CRD-E2E-002's "open in pile"**: that is Story 5.4.
- **A Book deleted while its scoped page is open:** the page refetches the same view, and the unknown-id leaf already pins the 404 → not-found path.

## Execution

- **Mode:** `tea_execution_mode: auto`, with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** zero tests. The repo has no Playwright API layer; its API tests run in pytest through `TestClient`, so G3 went to 3B-backend.
  - **3B-backend:** G3.
  - **3B-e2e:** G1, G2 and G4.
- **Fixtures:** none added to `e2e/fixtures.ts`. The spec gained two local helpers: `pausedClock(page)`, which installs Playwright's clock paused before `goto` so no timer fires until `runFor`, and `duneDetail(server)`.

## Tests Added

**API** (`backend/tests/test_home_view.py`): 1 test.
- `[P2]` `test_the_home_view_card_note_count_follows_add_and_delete` (:77): 2 seeded notes give `cardNoteCount` 2; `add-card-note` makes it 3; `delete-card-note` makes it 2.

**E2E** (`frontend/e2e/card-notes.spec.ts`, describe "Story 5.3 automate"): 5 tests.
- `[P2]` "AC-3 in the dark theme a match keeps its non-transparent background and a 1px underline in the accent color" (:638): the mark's background and underline color equal the dark theme's `--color-accent-soft` and `--color-accent`, resolved by the browser, not hardcoded.
- `[P2]` "AC-3 in forced colors a match keeps a system highlight background that differs from its note" (:677): the mark is painted with the system `Mark`/`MarkText` pair, and the note's background (Canvas) differs.
- `[P2]` "AC-3 a query of spaces only filters nothing, shows no no-match line, and announces nothing after the pause" (:710): with a positive control in the same leaf ("ice" then announces "2 notes match.").
- `[P2]` "AC-3 opening a note's Edit on the Card notes page while typing pauses drops the pending count" (:737) and "AC-6 … in Book detail's block …" (:766): each has a positive control, and each fails when its `cancel()` is removed (mutation checked, then restored).
- All five passed `--repeat-each=5`.

**Totals:** 6 tests (all P2). `card-notes.spec.ts` now has 24 tests and `test_home_view.py` has 3.

**Defects found:** none. Every new test passed against the code as reviewed.

## Validation

- **`TZ=Europe/Madrid npm run check`: exit 0.**
  - pytest: 1319 passed, backend coverage 98%.
  - Unit: 274 passed.
  - e2e: 471 passed.
  - ruff, Prettier, oxlint, `tsc` and the `api:gen` byte check are all clean.
- **Mutation checks:** G3 fails with `cardNoteCount` pinned to a constant; G4's two leaves each fail with their own cancel removed. Production files were restored (`git diff -- backend/bookvie frontend/src` empty).
- **Quality checklist:**
  - No hard waits; the timed leaves drive the clock with `runFor`.
  - No conditionals.
  - Explicit assertions in the test bodies.
  - Every assertion can fail, and the silence assertions each have a positive control.
  - Seeded through `LibraryBuilder` and `seededServer`.
  - Parallel-safe, since each test has its own data folder.
  - No `.only` or skips.
- **R-17 timing smoke (report only, not committed):** a 500-Book / 3,000-note library built with `LibraryBuilder`, 20 requests each through `TestClient` after one warm-up:

  | View | Median | Max | Body |
  |---|---|---|---|
  | `card-notes` (all Books) | 6.1 ms | 16.5 ms | 506 kB |
  | `card-notes?book=` (one Book) | 1.1 ms | 1.4 ms | 1.1 kB |
  | `home` | 3.2 ms | 3.3 ms | 196 kB |
  | `book` | 1.1 ms | 1.3 ms | 1.4 kB |

  There is no target (test-design Q2). The unscoped view's body grows with every note; at this size it is the largest view.
- **No CLI sessions were opened.** The workers' JSON outputs and the timing script are in this session's scratchpad, not in the repo.

## ATDD Checklist

`atdd-checklist-5-3-find-a-note-across-all-my-books.md`:
- 38 lines ticked, with evidence from this run and the build and review runs.
- No lines retired. The timing smoke line is ticked as measured (report only).
- **Remaining `[ ]`: 0.**

## Deferred Work

- The code review's deferral (no test for the count cancel before Edit) is resolved by G4, with a `resolved:` line in `deferred-work.md`.

## Assumptions and Risks

- Forced colors are checked under Chromium's emulation, which resolves `Mark` to yellow and Canvas to white. Other engines may resolve them differently; the leaf compares against the browser's own resolved values.
- The timed leaves depend on `page.clock` controlling `setTimeout` in the page. If the clock is ever installed globally in a fixture, `pausedClock` must stay before `goto`.

## Next

5.3's pipeline is complete: ATDD, build, code review, automate. Next is Story 5.4 (`bmad-testarch-atdd`). It is the last story of Epic 5, so after it comes the Epic 5 retrospective.

