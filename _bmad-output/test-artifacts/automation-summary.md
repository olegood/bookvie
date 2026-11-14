---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-11-14'
storyId: '9.1'
storyKey: '9-1-save-a-card-note-with-cmd-enter'
inputDocuments:
  - _bmad-output/implementation-artifacts/spec-9-1-save-a-card-note-with-cmd-enter.md (Intent, Always/Never rules, I/O matrix, ACs, Review Findings)
  - _bmad-output/test-artifacts/atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md
  - _bmad-output/implementation-artifacts/epic-9-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md (code review of spec-9-1, 2026-11-14)
  - _bmad/tea/config.yaml
  - frontend/playwright.config.ts
  - frontend/e2e/card-note-keyboard-save.spec.ts; frontend/e2e/add-card-note.spec.ts; frontend/e2e/edit-card-note.spec.ts
  - frontend/src/components/CardNotePanel.tsx
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

# Automation Summary: Save a card note with Cmd+Enter (story 9.1)

The previous version of this file held the summary for story 8.3. It's in git history (`3566aa9`).

## Preflight

- **Stack:** `fullstack`, auto-detected. Frontend: Playwright (`frontend/playwright.config.ts`); backend: pytest. Both frameworks are in place.
- **Mode:** BMad-Integrated. Story 9.1 is `done` after `bmad-code-review` (`566f030`). Spec, ATDD checklist and epic context are present.
- **Config:** `tea_use_playwright_utils: true` but `@seontechnologies/playwright-utils` isn't in `package.json`, so the Traditional Patterns fragments load (`fixture-architecture`, `network-first`). No Pact artifacts, so no contract fragments. `tea_browser_automation: auto` adds `playwright-cli`.
- **Inputs to cover:** the ATDD checklist's 7 open green-phase follow-ups. The code review's deferred items are for Story 9.2 (held-key repeat guard, `ControlOrMeta` test advice) and the spine, not for this run.

## Coverage Plan

Browser exploration skipped: `playwright-cli` isn't installed. Targets come from the spec, the ATDD checklist and `CardNotePanel.tsx`.

**Level:** E2E only, in a new `frontend/e2e/card-note-keyboard-save-automate.spec.ts` (the `*-automate.spec.ts` convention of Epic 8). The behavior is keyboard focus, native form submission and the modal `dialog`, which only a real browser shows; the frontend has no component-test runner, and `saveFromKeys` is not a pure function worth a unit test. The 7 ATDD leaves stay as they are: no duplicate of a case they already prove.

| # | Target (ATDD follow-up) | Priority | Why |
|---|---|---|---|
| 1 | AC-1 the other two field/key pairs (Control+Enter in Note, Meta+Enter in Page), and add mode from Book detail returning focus to that Add card note | P1 | The "Always" rule promises both keys from both fields; the ATDD leaf covers two of four pairs. |
| 2 | AC-1 focus lands before the `status` line on a keyboard save | P1 | The announce order (focus, then status) is an Epic 5 invariant; the key path must keep it. |
| 3 | AC-3 in edit mode: a refused Page and a 503 through Control+Enter, line above the buttons, Delete still at the left | P1 | AC-3 is tested in add mode only. |
| 4 | AC-4 in add mode: Meta+Enter with the save held, then the same presses (no Delete), gives one `add-card-note` | P1 | AC-4 is tested in edit mode only; a duplicate add would store two notes. |
| 5 | AC-4 a refusal after a held save: the 422 leaves the panel open with the field error, Save note is no longer `aria-disabled`, and the next Meta+Enter sends one more request | P2 | Shows the in-flight guard releases after a refusal. (The held *key* repeating after a refusal is deferred to Story 9.2, not tested here.) |
| 6 | AC-4 keys while the Delete Confirm dialog is open: Meta+Enter and Control+Enter there neither save the panel nor confirm the delete | P2 | The dialog is a sibling outside the form; spec "Never" says keys there get no handling. |
| 7 | AC-5 only Save note carries `aria-keyshortcuts`, not Cancel or Delete, in both modes | P2 | The spec puts it on Save note only. Axe in both themes is covered by re-running the existing axe leaves in `add-card-note.spec.ts` and `edit-card-note.spec.ts`. |

**Scope:** selective. The 7 checklist follow-ups, nothing more: the story is one key handler, and the deferred held-key guard belongs to Story 9.2.

## Execution

- **Mode:** `tea_execution_mode: auto` with the capability probe on. Subagents are supported and agent teams aren't, so the mode resolved to **subagent**.
- **Workers:**
  - **3A (API):** not launched. No endpoint changed.
  - **3B-backend:** not launched. No backend target.
  - **3B-e2e:** targets 1–7. For its fail-proofs it made temporary edits to `frontend/src` and reverted each one by hand. Afterwards `git diff --stat -- frontend/src backend` is empty. The worker also ran a read-only `git stash list` once, which the item-64 rule bans in any form. It changed nothing: the stash is empty.
- **New file:** the leaves went into `frontend/e2e/card-note-keyboard-save-automate.spec.ts` (458 lines), beside the ATDD spec (now 347 lines, was 405), following the `*-automate.spec.ts` convention.
- **Shared helpers:** the helpers both files use moved out of `card-note-keyboard-save.spec.ts` into `frontend/e2e/card-note-keys.ts` (79 lines), as Epic 8 did with `typeset-covers.ts`. Moved: the three status lines, the four note ids, `DUNE_WITH_NOTES`, `cardNotePanel`, `editPanel`, `addCardNote`, `cardNotesBlock`, `noteItem`, `editOf`, `countSubmits` and `submitsSoFar`. The move is pure: the ATDD spec's diff is only its imports and the removed definitions, with no leaf body touched. `KEY_HINT` stays in the ATDD spec, its only user. The automate spec keeps local copies of `watchStatus`/`statusSeen`, because `add-card-note.spec.ts` is read-only for this story. It also adds `boxOf`, `keyshortcutOwners`, `holdRequests` and `confirmDialog`. No new fixture or factory.
- **Review of the worker's output:** read in full, and no changes were needed. Its JSON is in this session's scratch directory, not committed. One red proof was re-run independently: changing `!(event.metaKey || event.ctrlKey)` to `!event.metaKey` fails `:96`. The mutation was then edited back.

## Tests Added

All in `frontend/e2e/card-note-keyboard-save-automate.spec.ts`, describe "Story 9.1 Save a card note with Cmd+Enter (automate)":

| Line | Leaf | Priority | Proven red by |
|------|------|----------|---------------|
| 96 | AC-1 Ctrl+Enter in Note and Cmd+Enter in Page on Home each send one `add-card-note` with both values as typed | P1 | `!event.metaKey` in place of `!(event.metaKey \|\| event.ctrlKey)`; also the target guard narrowed to Note |
| 150 | AC-1 Cmd+Enter in add mode from Book detail returns focus to Book detail's Add card note | P1 | the opener's focus moved to `#main` first and the opener only after a 300 ms delay |
| 185 | AC-1 on a keyboard save, focus is on Add card note before "Card note saved." (Meta and Ctrl) | P1 | the same late-focus change |
| 216 | AC-3 edit mode, Ctrl+Enter with a refused Page: message, `aria-invalid`, alert, focus, nothing saved | P1 | `pageField.current?.focus()` changed to `.blur()` |
| 253 | AC-3 edit mode, Ctrl+Enter couldn't save: line above the buttons, both values kept, Delete at the left | P1 | Delete moved after Cancel; also `setBusy(false)` removed |
| 296 | AC-4 add mode, while a Cmd+Enter save is out: second press, held key, Save note, Cancel, Esc send nothing more | P1 | `if (inFlight.current) return` removed |
| 345 | AC-4 a held save that comes back 422 leaves the field error; Save note is no longer `aria-disabled`; the next Cmd+Enter sends one more request | P2 | `setBusy(false)` removed; separately, `inFlight.current = false` moved into the success branch |
| 384 | AC-4 Cmd+Enter and Ctrl+Enter inside the Delete Confirm dialog neither save nor confirm | P2 | ConfirmDialog moved inside the `<form>` with the field-target guard removed |
| 432 | AC-5 only Save note carries `aria-keyshortcuts` (Cancel in both modes, Delete in edit mode have none) | P2 | `aria-keyshortcuts="Escape"` added to Cancel |

Priority coverage: P0 0, P1 6, P2 3. The story's P0 path is the ATDD AC-1 leaf.

## Validation

- `TZ=Europe/Madrid npx playwright test e2e/card-note-keyboard-save.spec.ts e2e/card-note-keyboard-save-automate.spec.ts --repeat-each=2`: 32 passed (this session). The worker also ran the new file 3 times over: 27 passed.
- Prettier check: clean on the three e2e files. `tsc -b` and oxlint: clean (worker, and in the full check below).
- `npm run check` (repo root, this session), exit 0:
  - ruff, Prettier, oxlint, `tsc -b`, `check:api`: clean;
  - pytest: 1573 passed, coverage gates ok (domain 100%, intents+store 98.08%);
  - node tests: 354 passed;
  - Playwright: 682 passed (673 before this run, plus 9), including the axe leaves `add-card-note.spec.ts:543` and `edit-card-note.spec.ts:599`;
  - smoke ok.
- Quality scan of the new files: no `waitForTimeout`, `.only`, `.skip`, `Math.random`, `console.log` or `data-testid`. The only loop is the Confirm-dialog leaf's fixed two targets × two keys, which runs the same path every time. Locators go by role and name; geometry is used only for the "above the buttons" and "Delete at the left" checks.
- No CLI browser sessions were opened (`playwright-cli` isn't installed). Temp artifacts are in the session scratch directory, not the repo.
- Production code untouched: `git diff --stat -- frontend/src backend` is empty.

## Playwright Utils deviations

None. `@seontechnologies/playwright-utils` isn't installed, so the mandate doesn't apply, and the leaves use the repo's own fixtures (`seededServer`, `requestsTo`) with `page.route` set up before `goto`. Wiring the package (a `merged-fixtures` module, `interceptNetworkCall`) would be a project-wide change, not a story change.

## ATDD Checklist

`atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md`: all 7 open green-phase follow-ups are ticked, each with its `file:line`. The AC-5 axe half points at the existing axe leaves (`add-card-note.spec.ts:543`, `edit-card-note.spec.ts:599`), green in the full check. Remaining `[ ]`: **0**.

## Assumptions and Risks

- **A held key auto-repeating after a refusal is not tested.** It re-sends the request, a known defect deferred to Story 9.2 (`deferred-work.md`, "code review of spec-9-1"). Leaf `:345` covers a held *save* (the request held in flight), which is what the checklist line meant.
- **Focus-before-status (`:185`, and the `statusSeen` check in `:150`) is mostly guaranteed by the platform.** `announce` sets its text after a 100 ms tick, and Chromium already returns focus to the opener when the modal closes, so swapping focus and announce, or only delaying the focus, keeps it green. The leaves catch a regression that focuses somewhere else first.
- **Chromium doesn't activate a focused button on Meta+Enter or Control+Enter** (Cancel, the Confirm dialog's Cancel, and Delete card note). Leaf `:384` depends on that. Other browsers are out of scope (AGENTS.md "Supported browser").
- **Real IME composition** is still covered only by the ATDD leaf's dispatched `isComposing` event.

## Next

Story 9.1 is `done` and doesn't close Epic 9: Story 9.2 "Add several card notes in a row" is next. Its pipeline starts with `bmad-testarch-atdd`. Its ATDD should pick up the two Story 9.2 entries in `deferred-work.md`: guard the held-key repeat, and press both keys by name rather than `ControlOrMeta+Enter`.
