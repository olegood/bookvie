---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-14'
storyId: '9.2'
storyKey: '9-2-add-several-card-notes-in-a-row'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-9-2-add-several-card-notes-in-a-row.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md
  - _bmad-output/implementation-artifacts/epic-9-context.md
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/card-note-add-another.spec.ts; frontend/e2e/card-note-add-another.ts; frontend/e2e/card-note-keys.ts
  - frontend/src/components/CardNotePanel.tsx; frontend/src/lib/cardNoteAddAnother.ts (+ .test.ts)
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

# Automation Summary: Add several card notes in a row (story 9.2)

The previous version of this file held the summary for story 9.1. It's in git history (`53f67b5`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 9.2 is `done` after `bmad-code-review` (`7a0f288`). Spec, ATDD checklist and epic context are present.
- **Config:** `tea_use_playwright_utils: false`, and `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 12 open green-phase follow-ups. The code review deferred nothing.

## Coverage Plan

Browser exploration skipped: `playwright-cli` isn't installed. Targets come from the spec, the ATDD checklist and `CardNotePanel.tsx`.

**Level:** E2E, in a new `frontend/e2e/card-note-add-another-automate.spec.ts` (the `*-automate.spec.ts` convention), reusing `card-note-add-another.ts` and `card-note-keys.ts`. Storage, focus, the modal `dialog`, live regions and axe only show in a real browser; the one pure piece, `lib/cardNoteAddAnother`, already has its unit tests (`cardNoteAddAnother.test.ts`, from the build), so follow-up 1 is ticked, not re-written. The 10 ATDD and review leaves stay as they are.

| # | Target (ATDD follow-up) | Priority | Why |
|---|---|---|---|
| 1 | AC-2 unit tests for `lib/cardNoteAddAnother` | — | Already delivered by the build (`cardNoteAddAnother.test.ts`, 5 tests); tick only. |
| 2 | AC-2 throwing storage: box reads off, a click still toggles it, no message, a save with it on stays open | P1 | The Always rule's failure branch; tested only at unit level. |
| 3 | AC-2 export and restore (AR27): the export holds no `cardNoteAddAnother`; a restore leaves the stored choice as it was, on and off | P2 | A browser preference must not travel with the library. |
| 4 | AC-3 an empty-Note refusal, then a success: Note's error clears | P2 | The review's leaf proves `setErrors({})` with Page; this is the Note field. |
| 5 | AC-3 add mode from Book detail with the box on: "Card notes (N)" updates behind the panel, Note keeps focus | P1 | The panel is shared, but the opener and the counts differ. |
| 6 | AC-3 focus lands on Note before the `status` line, on each stay-open save | P1 | The focus-then-announce order (Design Notes). |
| 7 | AC-3 `Control+Enter` and a held `Control+Enter`: one note per press | P1 | The repeat guard is modifier-blind; only Meta is held in the ATDD leaf. |
| 8 | AC-1 the label gap: the text starts 8px (`--space-2`) right of the box | P2 | DESIGN.md Checkbox. |
| 9 | AC-1 axe on the open add panel with the box on and a count shown, both themes | P1 | New control and text inside the modal. |
| 10 | AC-5 the Tab cycle with a count shown still stays inside the panel | P2 | The checkbox adds a tab stop. |
| 11 | AC-6 a gone Book (409) with the box on: the panel stays open, the line shows, the count is unchanged | P2 | The third failure kind. |
| 12 | AC-7 edit mode from the Card notes page with the stored choice on: no checkbox; a save closes | P2 | The other edit opener. |

**Scope:** selective. The checklist's follow-ups, nothing more.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. No endpoint changed.
  - **3B-backend:** not launched. No backend target.
  - **3B-e2e:** targets 2–12. For its fail-proofs it made temporary edits to `frontend/src` and reverted each one by hand (two scripted reverts didn't match and were redone by hand). Afterwards `git diff --stat -- frontend/src backend` is empty. No banned git command was run.
- **New file:** `frontend/e2e/card-note-add-another-automate.spec.ts` (483 lines, 11 leaves).
- **Shared helpers:** 4 exports added to `frontend/e2e/card-note-add-another.ts`, none of the existing ones changed: `textGapAfterBox` (a `Range` over the label text minus the box's right edge), `watchFocusAtStatus` / `focusAtStatus` (the focused element's name each time `status` gets text), and `zipEntries` (a stored/deflated zip reader over the central directory; the e2e suite had none, since zip contents are otherwise tested at API level). Each was probed in a throwaway `*.probe.spec.ts` against `setContent` fixtures and the shipping app, and refused a wrong value; the probe file was then removed. No new fixture or factory.
- **Review of the worker's output:** read in full, and no changes were needed. Its JSON is in this session's scratch directory, not committed. One red proof was re-run independently: removing the `event.repeat` guard fails `:282` at `:313` (Note `aria-invalid` from the repeat's empty-Note 422). The guard was then edited back by hand and the app rebuilt.

## Tests Added

All in `frontend/e2e/card-note-add-another-automate.spec.ts`, describe "Story 9.2 Add several card notes in a row (automate)":

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 75 | AC-2 with storage that throws, Add another reads off, a click still toggles it, no message shows, and a save with it on stays open | P1 | try/catch removed from `readAddAnother` (panel never renders); separately from `writeAddAnother` (a page error) |
| 113 | AC-2 the stored choice never reaches the server or the export, and a restore leaves it as it was, on and off | P2 | `BackupPage` removing the key after a restore; the add form sending a `cardNoteAddAnother` part |
| 177 | AC-3 with Add another on, an empty Note is refused, then filling it and saving clears its error | P2 | the stay-open `setErrors({})` removed |
| 213 | AC-3 add mode from Book detail with Add another on: "Card notes (N)" updates behind the open modal panel after each save, Note keeps focus | P1 | the stay-open `noteField.current?.focus()` removed |
| 253 | AC-3 on each stay-open save, focus is on Note when "Card note saved." is set | P1 | focus deferred 200 ms, after the announce |
| 282 | AC-3 with Add another on, Ctrl+Enter saves one note, and a held Ctrl+Enter saves exactly one more | P1 | the `event.repeat` guard removed (re-run in this session) |
| 323 | AC-1 the "Add another" text starts 8px right of the box | P2 | `.addAnother` gap `--space-2` → `--space-3` |
| 335 | AC-1 the open add panel with Add another on and a count shown passes axe in both themes | P1 | `.savedCount` in `--color-line` (contrast) |
| 365 | AC-5 with a count shown, Tab and Shift+Tab cycle inside the panel through Add another | P2 | `tabIndex={-1}` on the checkbox |
| 404 | AC-6 with Add another on, a save for a Book deleted meanwhile (409) keeps the panel open with its line, and the count stays | P2 | the count bumped before the result is checked |
| 448 | AC-7 edit mode from the Card notes page, with the stored choice on, has no checkbox and no count, and a save closes it | P2 | the row rendered in edit mode; separately, the edit-mode guards removed |

Priority coverage: P0 0, P1 5, P2 6. The story's P0 path is the ATDD AC-3 leaf.

## Validation

- Worker: the new file `--repeat-each=3`, 33 passed; with the ATDD spec, 21 passed; Prettier, `tsc -b` and oxlint clean.
- `npm run check` (repo root, this session): **exit 1**, at `check:api`'s `format:check`: `src/styles/base.css` isn't Prettier-formatted. That file isn't part of this run: it passed Prettier at `7a0f288` (the story's review commit) and was left unformatted by `9818c7b fix: align the dropdown arrow with the field's text inset`, which another session committed to master while this step ran. pytest had passed before it: 1573 passed, coverage gates ok (domain 100%, intents+store 98.08%).
- The layers after the format step, run by hand in this session, all passed: Prettier lists only `base.css`; `api-contract` up to date; `tsc -b` and oxlint clean; node tests 359 passed; `check:e2e` (build + Playwright) **703 passed** (692 before this run, plus 11); smoke ok.
- Quality scan of the new files: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. Loops run fixed lists (two themes, the Tab order). Locators go by role and name; geometry only for the 8px gap.
- No CLI browser sessions were opened (`playwright-cli` isn't installed). Temp artifacts are in the session scratch directory, not the repo.
- Production code untouched: `git diff --stat -- frontend/src backend` is empty.

## Playwright Utils deviations

None. `tea_use_playwright_utils` is false and the package isn't installed; the leaves use the repo's own fixtures (`seededServer`, `requestsTo`, `page.request`). No `page.route` was needed: the 409 comes from the real server after a real `delete-book`.

## ATDD Checklist

`atdd-checklist-9-2-add-several-card-notes-in-a-row.md`: all 12 green-phase follow-ups are ticked, each with its `file:line`. The unit line points at the build's `cardNoteAddAnother.test.ts`; the 422-then-success line also cites the review's Page leaf (`card-note-add-another.spec.ts:433`). Remaining `[ ]`: **0**.

## Assumptions and Risks

- **The export half of `:113` can't be broken from the frontend.** The server drops unknown intent parts, so no frontend mutation gets the key into the zip; only a backend change could. The request scan catches the key name in any request, but not the bare value "on" sent under an unrelated part name.
- **Book detail has no code of its own on the stay-open path.** `:213` is red only through the shared branch; it guards the opener and the "Card notes (N)" count, not a separate implementation.
- **The axe leaf's dark pass** was not shown red on its own: the contrast mutation fails the light pass first.
- **A concurrent session committed to the shared checkout during this step** (`9818c7b`, `38d1a61`), against AGENTS.md items 56 and 64. One early AC-7 timeout with trace-file ENOENT in the worker's first run is likely from that; every run since passed.

## Next

Story 9.2 closes Epic 9. Next: the Epic 9 retrospective (`bmad-retrospective`), then its before-next-epic items, the Epic 9 trace and gate and the spine reconciliation, before Epic 10's first story. Before that, master needs `src/styles/base.css` formatted (`9818c7b`) for `npm run check` to pass.
