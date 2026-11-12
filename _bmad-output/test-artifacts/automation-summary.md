---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-12'
storyId: '7.2'
storyKey: '7-2-filter-my-catalog'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-7-2-filter-my-catalog.md (Intent, Always rules, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-7-2-filter-my-catalog.md
  - _bmad-output/implementation-artifacts/epic-7-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build-auto and code review of spec-7-2, 2026-11-12)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-filter.spec.ts; frontend/e2e/bookcase.ts; frontend/e2e/bookcase-details.spec.ts (Tab order, axe); frontend/src/lib/catalogFilter.test.ts; backend/tests/test_bookcase_view.py
  - frontend/src/pages/CatalogPage.tsx, Bookcase.tsx, CatalogList.tsx; frontend/src/components/FilterChips.tsx; frontend/src/lib/catalogFilter.ts
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

# Automation Summary: Filter my catalog (story 7.2)

The previous version of this file held the summary for story 7.1. It's in git history (`985ac50`).

## Preflight

- **Stack:** `fullstack`, auto-detected.
  - Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test` for `src/lib`.
  - Backend: pytest (`backend/tests/conftest.py`).
  - Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 7.2 is `done` after `bmad-code-review` (`0383cbc`). The spec, the ATDD checklist and the epic context are all present.
- **Config:**
  - `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`).
  - There are no Pact artifacts, so no contract fragments load.
  - `tea_browser_automation: auto` loads `playwright-cli.md`, but `playwright-cli` isn't on PATH. Browser exploration is skipped; targets come from the code and the docs.
- **What exists for 7.2:**
  - **Unit:** `catalogFilter.test.ts` covers OR, AND, an empty group, Read and Unread both on, a re-read as Read, case-insensitive Language and Tag matching, no tags, `filterValues` (case merge with the first spelling, collator order, numbers by value, no mutation), `filtersOn`, `toggleValue` and `liveFilters`.
  - **API:** `test_bookcase_view.py:61` checks that `books[]` carries `type`, `language` and `tags` as stored. `check:api` compares the regenerated `schema.d.ts`.
  - **E2E:** `catalog-filter.spec.ts` has the 8 ATDD leaves plus 6 P1 leaves:
    - the search-only no-match;
    - Esc returning focus;
    - Esc after clicks that move no focus (Safari);
    - Tab out closing the list;
    - the List-view no-match;
    - clicking a label's text, and clicking outside.

    `bookcase-details.spec.ts:72` covers the Tab order through the chips. Its axe test runs Catalog with the chips rendered, but none pressed.

## Coverage Plan

Scope: **selective**. The rules are fully covered at unit level, and the ATDD and review leaves cover every criterion end to end. This run closes the ATDD checklist's remaining green-phase follow-ups and the two test gaps the code review deferred. Every target is E2E because each one meets the rendered bookcase, real focus, the shell's status region, storage or the add flow, which no unit can reach. There is no new backend target: the view fields already have their pytest.

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| 1 | Filters hiding every spine while a spine has real focus move focus to Search titles | E2E | P1 | AC-6's "or to Search titles when none remain". Deferred by the code review |
| 2 | After Clear filters, the bookcase Tab stop stays on the neighbor it moved to | E2E | P2 | ATDD follow-up "AC-6 restore" (EXPERIENCE.md "Keep a moved stop") |
| 3 | Toggling a chip off and back on with the same result announces "N books match." again | E2E | P2 | ATDD follow-up "AC-3 repeated count": the region must be emptied so a repeated text is read again |
| 4 | "Classic" and "classic" on different Books give one Tag checkbox with the library-first spelling, and checking it shows both Books | E2E | P2 | ATDD follow-up "AC-2 Tag case". Deferred by the code review |
| 5 | A reload of Catalog starts with no filters, and no filter key is written to `localStorage` | E2E | P2 | ATDD follow-up "AC-7 reload" (AD-1: no browser storage of domain state) |
| 6 | A filter doesn't change the remembered sort, and a sort change keeps the filters | E2E | P2 | ATDD follow-up "AC-7 sort kept": the 7.1 and 7.2 boundary |
| 7 | Adding a Book the filters keep visible still clears them | E2E | P2 | ATDD follow-up "AC-8 matching add" (the spec chose "an add always clears filters") |
| 8 | With Search titles text and a filter both hiding the new Book, an add clears both | E2E | P2 | ATDD follow-up "AC-8 with a search" |
| 9 | With a chip on and the Language list open, axe finds nothing in both themes, and the pressed chip uses the dark `accent-soft` and `accent` | E2E | P2 | ATDD follow-up "AC-1 dark theme and axe" |

**Already covered (ticked in the ATDD checklist, not re-tested):**
- the API fields (`test_bookcase_view.py:61`);
- the unit rules (`catalogFilter.test.ts`);
- "1 book matches." (AC-3, `catalog-filter.spec.ts:240`);
- the List-view no-match (the List-view AC-5 leaf);
- search plus filters (the search-only no-match leaf);
- the keyboard open, Esc and Tab (the Esc and Tab-out leaves).

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There is no new endpoint; the view fields already have their pytest.
  - **3B-backend:** not launched. There is no backend target.
  - **3B-e2e:** targets 1–9. For its fail-proofs it changed only `frontend/src`, and restored each change. Afterwards `git diff --stat -- frontend/src backend` is empty.
- **Fixtures:** none added. The worker added spec-local helpers:
  - `sortSelect`, `storageKeys` and `addSwingTime`;
  - `recordStatus`, a copy of `card-notes.spec.ts`'s that also keeps the empty texts;
  - `TAG_CASE_SHELF`, `APP_STORAGE_KEYS` and the dark accent constants.
- **Review of the worker's output:** read in full. No changes were needed. Its output JSON reports `success: true` with `test_count: 10`. It is in this session's scratch directory, not `/tmp`, and isn't committed.

## Tests Added

All 10 are in `frontend/e2e/catalog-filter.spec.ts`. Target 1 has two leaves, because what is reachable depends on whether a click moves focus.

| Line | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| 548 | AC-6 filters that hide every spine leave focus on the control that hid them, and after Clear filters Tab lands on the moved stop | P1 | 1 | The real-focus effect in `Bookcase.tsx` loses its "the focused element is a hidden spine" guard |
| 582 | AC-6 a chip click that moves no focus, as in macOS Safari, and hides the focused spine and every other one moves focus to Search titles | P1 | 1 | The fallback `searchRef.current` becomes `null` |
| 604 | AC-6 Clear filters keeps the bookcase's Tab stop where it moved | P2 | 2 | The "Keep a moved stop" `setStopId(stop)` is removed |
| 630 | AC-3 each filter change announces its count again, even word for word the same | P2 | 3 | `announce()` skips `clearAnnouncements()` |
| 655 | AC-2 Tag ▾ lists a tag spelled in two cases once, in the library-first spelling, and it matches both Books | P2 | 4 | The Tag values are built from `sorted` instead of `books` |
| 677 | AC-7 a reload of Catalog starts with no filter on, and no filter is kept in storage | P2 | 5 | The filters are written to `sessionStorage` (or read back on load) |
| 705 | AC-7 a filter leaves the remembered sort alone, and a sort change keeps the filters | P2 | 6 | `chooseSort` clears the filters, or `changeFilters` writes the sort |
| 729 | AC-8 an add clears the filters even when they would keep the new Book visible | P2 | 7 | `onSaved` no longer clears the filters |
| 752 | AC-8 an add with Search titles text and a filter both hiding the new Book clears both | P2 | 8 | `onSaved` drops `setQuery('')` or `setFilters` |
| 773 | AC-1 with a chip on and the Language list open, axe finds nothing in both themes, and the dark chip uses the dark accent tokens | P2 | 9 | The pressed fill or border is hard-coded to light values, or `.option` ink is hard-coded (axe color-contrast in dark) |

Every mutation was reverted.

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** each target maps to an ATDD follow-up or a code-review deferral that no test pinned before.
- **Duplicates:** none. Each "already covered" item above was ticked from its existing test, not re-tested.
- **Quality:**
  - no `waitForTimeout`, `.only` or `.skip`, and no flow conditionals;
  - each assertion constrains a value (exact spine names, status text sequences, storage keys, CSS colors, axe violations);
  - every leaf seeds its own server through `seededServer`;
  - `catalog-filter.spec.ts` is 800 lines, under the 1000-line limit.
- **Browser sessions:** `playwright-cli` isn't installed, so no CLI sessions were opened.
- **Temp artifacts:** the worker JSON stays in the session scratch directory and isn't committed.

Runs:
- Worker: the spec 24 of 24. The 10 new leaves 50 of 50 with `--repeat-each=5 --retries=0`. Prettier, `tsc -b` and oxlint are clean.
- `TZ=Europe/Madrid npm run check`, after the worker finished: exit 0. That covers pytest (1,392 passed), the node unit tests, 596 e2e passed (586 before this run) and the smoke check.

## ATDD Checklist

`atdd-checklist-7-2-filter-my-catalog.md` now has 0 `[ ]` lines:
- **Ticked with evidence:** the 15 green-phase follow-ups and the 16 task lines, each with its test or source line.
- **Red phase:** the section is now marked historical, with a "Since then (green)" note.

`deferred-work.md`: the code review's 7.2 "test gaps for the automate step" entry has a `resolved:` line. The 7.2 spine drift entries stay open for the Epic 7 spine reconciliation.

## Playwright Utils deviations

`tea_use_playwright_utils` is true, but `@seontechnologies/playwright-utils` isn't installed, so the mandate doesn't apply. The new leaves use the spec's vanilla patterns:
- `frontend/e2e/catalog-filter.spec.ts:20`: `test` comes from `./fixtures.ts`, not `support/merged-fixtures`, which doesn't exist.
- No network intercepts: every leaf runs against the real seeded server.
- `expect.poll` is used instead of `recurse`, as in the rest of the suite.

Recommended utilities that weren't wired: none needed. bookvie has no auth, and the e2e servers are per-test local processes.

## Assumptions and Risks

- **Safari is modelled, not run.** Only Chromium is installed. Two leaves use a dispatched click, which moves no focus, to model a macOS Safari mouse click: `:582` here, and the code review's `:471`. Real Safari might move focus to `main` (which has tabindex -1) on mousedown instead. In that case `:582`'s Search-titles fallback would not trigger in real use. Behaviour in real Safari and Firefox is still unverified.
- **Target 1's AC wording versus what's reachable:** in Chromium a chip click always takes focus, so "focus moves to Search titles when none remain" can't happen through the UI there. `:548` pins what users get instead: focus stays where they are.
- **Target 9's dark values** are DESIGN.md's `accent-soft` and `accent` for dark, read from the tokens. A token change needs this leaf updated.

## Next

Story 7.2's pipeline is complete: ATDD, build, code review, then automate. It closes Epic 7, the last epic in `epics.md`. Next come the Epic 7 retrospective (`bmad-retrospective`), the epic's trace and gate (`bmad-testarch-trace`), and the AD-6 and Structural Seed spine reconciliation for 7.1 and 7.2 (AGENTS.md "Epic boundaries").
