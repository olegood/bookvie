---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-12'
storyId: '7.1'
storyKey: '7-1-sort-my-catalog'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-7-1-sort-my-catalog.md (Intent, I/O matrix, ACs, Review Triage Log, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-7-1-sort-my-catalog.md
  - _bmad-output/implementation-artifacts/epic-7-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md (build-auto and code review of spec-7-1, 2026-11-12)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/catalog-sort.spec.ts; frontend/e2e/home-slice.spec.ts and home.ts (slice oracle); frontend/e2e/bookcase.spec.ts and bookcase.ts (add highlight); frontend/e2e/catalog-list.spec.ts (status observer); frontend/src/lib/catalog.test.ts; frontend/src/lib/catalogSort.test.ts
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

# Automation Summary: Sort my catalog (story 7.1)

The previous version of this file held the summary for story 6.4. It's in git history (`1f5c49a`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`) and `node --test` for `src/lib`. Backend: pytest (`backend/tests/conftest.py`). Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 7.1 is `done` after `bmad-code-review` (`8898a44`), with its spec, ATDD checklist and epic context.
- **Config:** `tea_use_playwright_utils: true`, but `@seontechnologies/playwright-utils` isn't in `package.json`, so that gate stays closed and the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists for 7.1:**
  - Unit: `catalog.test.ts` covers each key, each tie-break step, mixed offsets, code-unit ids, the empty author, numbers by value and no mutation. `catalogSort.test.ts` covers storage read, junk, throwing and the key written.
  - E2E: `catalog-sort.spec.ts` has the four ATDD leaves (AC-1 to AC-4) and three `[P1] AC-3` leaves: junk storage, throwing storage, and Home reached by the nav link. `catalog-empty.spec.ts` AC-8 checks there is no Sort on an empty library. `bookcase-details.spec.ts` checks the Tab order and runs axe on Catalog in both themes with the select present.

## Coverage Plan

Scope: **selective**. The comparator and storage are fully pinned at unit level, and the ATDD leaves cover the four criteria end to end. This run adds the browser-only branches that the ATDD checklist and both reviews left as follow-ups. Every new leaf is E2E because each one meets the rendered bookcase, Home's packer or the shell's status region, which no unit can reach. There is no backend target: story 7.1 changes no API (AD-6).

| # | Target | Level | Priority | Why |
|---|---|---|---|---|
| 1 | Home with a Main book across several rows: under Pages, the slice packs the 180-Book shelf in Pages order, the Main book's row comes first and differs from its Author-order row | E2E | P1 | The epic's claim that "the slice is built from the sorted shelf" and the spec's residual risk. Reuses the `expectedSlice` oracle, now shared from `home.ts` |
| 2 | Home with storage that throws: the slice is in Author order | E2E | P2 | The Storage rule on Home's own read of the sort (code review rejected an unverified claim here) |
| 3 | The bookcase's Tab stop stays on the last-focused Book after a sort change | E2E | P2 | Pins the roving-stop behaviour the ATDD checklist left open and the code review judged correct |
| 4 | List view: after Search titles, a sort change keeps the filter and announces nothing | E2E | P2 | The spec's "a sort change alone announces nothing", untested until now |
| 5 | After an add under Date added, the new spine is first, focused and ringed | E2E | P2 | EXPERIENCE.md → Highlight after add, at the new Book's place in the current sort |

**Not automated:**
- **Backup restore keeps the stored sort:** retired. Only `catalogView.ts`, `catalogSort.ts` and `theme.ts` touch `localStorage` in `frontend/src`, and the restore path is server-side, so nothing in a restore can reach the key.
- **Axe with the Sort select:** already covered by `bookcase-details.spec.ts`'s Catalog axe test in both themes, which now renders the select.
- **A sort chosen in another tab reaching a mounted page:** rejected by both reviews (rare, needs a `storage` listener); nothing to pin.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. There is no new endpoint and no API target.
  - **3B-backend:** not launched. There is no backend target (AD-6: the sort is client presentation).
  - **3B-e2e:** targets 1–5. For its fail-proofs it changed only `HomePage.tsx`, `CatalogPage.tsx` and `catalog.ts`, and restored each one. Afterwards `git diff --stat -- frontend/src backend` is empty.
- **Shared helpers moved (orchestrator, before dispatch):** `slice`, `sliceSpines`, `sliceSpine`, `sliceRows`, `rowCapacity` and the `expectedSlice` oracle moved from `home-slice.spec.ts` into `frontend/e2e/home.ts` as exports, so target 1 reuses the same UX-DR31 oracle. No leaf changed in the move: `home-slice.spec.ts` and `catalog-sort.spec.ts` ran 34 of 34 together.
- **Fixtures:** none added. The worker added two spec-local helpers: `storedSort(page, key)` and `throwingStorageAfter(page, key)`.
- **Review of the worker's output:** read in full. No changes were needed. Its output JSON reports `success: true`. It is in this session's scratch directory, not `/tmp`, and isn't committed.

## Tests Added

| File | Test | Priority | Target | Fails when (worker's fail-proof) |
|---|---|---|---|---|
| `frontend/e2e/catalog-sort.spec.ts:243` | AC-3 Home packs a several-row slice in the remembered Pages order, the Main book's row first | P1 | 1 | `HomeSlice` sorts by Author whatever the stored key (`sliceRows` differs from the Pages oracle) |
| `frontend/e2e/catalog-sort.spec.ts:277` | AC-3 Home with storage that throws shows the slice in Author order | P2 | 2 | Home reads `localStorage` outside try/catch (Home crashes; no slice) |
| `frontend/e2e/catalog-sort.spec.ts:288` | AC-2 the bookcase Tab stop stays on the last-focused Book across a sort change | P2 | 3 | `<Bookcase key={sortKey}>` resets the roving stop (Beloved not focused) |
| `frontend/e2e/catalog-sort.spec.ts:314` | AC-4 in List view a sort change keeps Search titles' text and filter and announces nothing | P2 | 4 | `chooseSort` also announces "Sorted." (an extra status text) |
| `frontend/e2e/catalog-sort.spec.ts:354` | AC-2 under Date added a Book just added is the first spine, focused, in view and ringed | P2 | 5 | Date added sorts oldest first (first spine is "Book 001") |

Every mutation was reverted.

## Validation

Checked against `checklist.md`:
- **Framework:** ready.
- **Coverage mapping:** each target maps to a spec rule or an ATDD follow-up that no test pinned before.
- **Duplicates:** none. The existing Home leaves use a one-row slice, so they can't tell packing order from display order; target 1 can. The existing throwing-storage leaf covers Catalog only; target 2 covers Home's own read.
- **Quality:**
  - no `waitForTimeout`, conditionals, `.only` or `.skip`;
  - each assertion constrains a value (exact spine names, oracle rows, status texts);
  - target 4 uses a later search's announcement as a fence, so a late sort announcement can't slip past the observer;
  - every leaf seeds its own server through `seededServer`;
  - `catalog-sort.spec.ts` is 387 lines.
- **Browser sessions:** no CLI sessions were opened or left running.

Runs:
- Worker: the five new leaves 25 of 25 with `--repeat-each=5 --retries=0`. `catalog-sort` and `home-slice` together 34 of 34.
- `TZ=Europe/Madrid npm run check`, after the worker finished: exit 0. That covers Prettier, ruff, oxlint, `tsc -b`, the `api:gen` byte compare, pytest (1,391 passed, coverage 98%), the node unit tests (325 passed), 572 e2e passed (567 before this run) and the smoke check.

## ATDD Checklist

`atdd-checklist-7-1-sort-my-catalog.md` now has 0 `[ ]` lines:
- **Ticked with evidence:** the 13 implementation lines and 7 of the 9 green-phase follow-ups. The unit and Catalog storage follow-ups were built by the build and code review; targets 1–5 closed the rest.
- **Retired (2):** the Sort select's look (axe is covered by `bookcase-details.spec.ts:408`; the CSS mirrors the Text field's tokens) and Backup restore (no client storage code runs in a restore).
- **Red phase:** the section is now marked historical, with a "Since then (green)" note.

`deferred-work.md` needs no `resolved:` line. Its 7.1 entries are spine drift, which the Epic 7 reconciliation closes.

## Playwright Utils deviations

`tea_use_playwright_utils` is true, but `@seontechnologies/playwright-utils` isn't installed, so the mandate doesn't apply. The new leaves use the spec's vanilla patterns:
- `frontend/e2e/catalog-sort.spec.ts:20`: `test` comes from `./fixtures.ts`, not `support/merged-fixtures`, which doesn't exist.
- No network intercepts: every leaf runs against the real seeded server.

Recommended utilities that weren't wired: none needed. bookvie has no auth, and the e2e servers are per-test local processes.

## Assumptions and Risks

- **Target 3 pins current behaviour:** the Tab stop stays on the last-focused Book after a sort change. EXPERIENCE.md is silent on this, and the code review judged it the standard roving-tabindex pattern. If Story 7.2 decides otherwise for filters, update this leaf with it.
- **Target 5 was fail-proofed on position only**, not on focus or the ring. `bookcase.spec.ts` AC-9 guards those under Author.
- **Target 1 depends on the 1280px width** fitting at least 10 spines per row, as `home-slice.spec.ts` does; it asserts that up front.

## Next

Story 7.1's pipeline is complete: ATDD, build, code review, then automate. Story 7.2 (Filter my catalog) is next, starting with its ATDD (`bmad-testarch-atdd`), per AGENTS.md "Story pipeline".
