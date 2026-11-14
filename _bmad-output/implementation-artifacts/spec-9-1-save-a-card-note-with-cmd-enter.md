---
title: 'Story 9.1: Save a card note with Cmd+Enter'
type: 'feature'
created: '2026-11-14'
baseline_revision: '48370cf8f9b50274c5deb9a79f1b85d98f0b9359'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Saving a Card note needs a reach for the mouse (or a Tab to **Save note**): Cmd+Enter and Ctrl+Enter do nothing in the panel, and only plain Enter in Page saves (FR-17, UX-DR59).

**Approach:** In `CardNotePanel`, Cmd+Enter or Ctrl+Enter with focus in Note or Page calls the form's `requestSubmit()`, so it takes exactly **Save note**'s path (the same `submit` handler, `save()`, its `inFlight` guard and busy state). **Save note** gets `aria-keyshortcuts="Meta+Enter Control+Enter"`. Nothing else changes.

## Boundaries & Constraints

**Always:**
- Both `Meta+Enter` and `Control+Enter` save, on every platform, in add and edit mode, from Note or from Page.
- The key handler calls `preventDefault()` (so no new line goes into Note) and then `form.requestSubmit()`. It never calls `save()` directly and never uses `form.submit()`: one `submit` event per press is what the tests count.
- While a save is out, the existing `inFlight` guard turns more presses (repeated, held, Save note, Cancel, Esc, Delete) into nothing, and **Save note** and **Delete** stay focusable with `aria-disabled="true"` described "Saving the card note." (already built in Story 5.1/5.2; keep it).
- Plain Enter and Shift+Enter in Note still insert a new line and send nothing. Plain Enter in Page still saves through implicit submission.
- `aria-keyshortcuts="Meta+Enter Control+Enter"` sits on **Save note** only, in both modes. No visible text names a key.

**Never:**
- No backend or API change, no new design token, no Add another (that is Story 9.2).
- No edit to the Epic 5 card note e2e specs (`add-card-note.spec.ts`, `edit-card-note.spec.ts`, `card-notes.spec.ts`); they must pass unchanged.
- No handling for keys on the panel's buttons or inside the Delete Confirm dialog (a sibling outside the form): the criteria name Note and Page only.
- No Safari- or Firefox-only workaround (AGENTS.md "Supported browser").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add, Cmd+Enter in Note | Note "Ice.", Page "212–213" | One `add-card-note` with both values as typed; panel closes, focus on **Add card note**, `status` "Card note saved." | none |
| Edit, Ctrl+Enter in Page | changed text | One `edit-card-note`; panel closes, focus on that note's Edit, `status` "Card note saved." | none |
| Plain/Shift Enter in Note | "Line one⏎Line two⇧⏎Line three" then Cmd+Enter | Only the final press sends; text keeps both newlines | none |
| Refused field | Page "400" of 330, or empty Note | Save note's 422 path: message, `aria-invalid`, `alert`, focus on first invalid field; panel open | as Save note |
| Couldn't save | 503 | Line above the buttons, both values kept, panel open | as Save note |
| In flight | second Ctrl+Enter, held Cmd+Enter, Save note, Cancel, Delete, Esc | Exactly one request, panel open until the result, no Confirm dialog | `inFlight` guard |
| IME composing | `event.isComposing` true | Nothing happens | ignored |

</intent-contract>

## Code Map

- `frontend/src/components/CardNotePanel.tsx` -- the panel. `<form onSubmit={submit} noValidate>` at `:183`; `submit` (`:127`) calls `save()` (`:100`), guarded by `inFlight` (`:76`); `dismiss` (`:80`) ignores Cancel/Esc in flight; `reason = busy ? SAVING_CARD_NOTE` (`:178`) feeds `disabledReason` on Delete (`:224`) and **Save note** (`:228`). `noteField` (`:77`) and `pageField` (`:78`) refs identify the two fields. Add the key handler here and the attribute on **Save note**; update the component's doc comment to mention the keyboard save.
- `frontend/src/components/Button.tsx` -- spreads `...rest` onto the `<button>`, so `aria-keyshortcuts` passes through with no change. Read only.
- `frontend/src/components/TextField.tsx` -- Page field; forwards `ref`. Read only (a form-level `onKeyDown` avoids changing it).
- `frontend/src/lib/cardNotes.ts` -- `SAVING_CARD_NOTE` ("Saving the card note."). Read only.
- `frontend/e2e/card-note-keyboard-save.spec.ts` -- the 5 ATDD red leaves (`test.skip`, AC-1 `:98`, AC-2 `:159`, AC-3 `:186`, AC-4 `:251`, AC-5 `:312`). Un-skip them; edit a leaf only for a proven test bug, and say so.
- `frontend/e2e/add-card-note.spec.ts`, `edit-card-note.spec.ts`, `card-notes.spec.ts` -- the regression baseline. Read only.
- `README.md` -- not touched by stories any more (Oleg, 2026-11-14): no Status line, no per-story links.
- Deferred-work intake: none name story 9.1 (and no entry names Epic 9 as a whole).
- Spine gate: Epic 8's "spine drift" entries all carry `resolved:` (Epic 8 retro item 61); the gate is clear.

## Tasks & Acceptance

**Execution:**
- `frontend/src/components/CardNotePanel.tsx` -- add an `onKeyDown` on the `<form>`: when `event.key === 'Enter'`, `event.metaKey || event.ctrlKey`, not `event.nativeEvent.isComposing`, and `event.target` is `noteField.current` or `pageField.current`, call `event.preventDefault()` then `event.currentTarget.requestSubmit()`. Add `aria-keyshortcuts="Meta+Enter Control+Enter"` to the **Save note** `Button`. Extend the doc comment with one sentence on the keyboard save. -- one save path through `requestSubmit()`, which the in-flight guard already covers.
- `frontend/e2e/card-note-keyboard-save.spec.ts` -- remove `test.skip(` from the five leaves (keep titles), in the checklist's order AC-5, AC-1, AC-2, AC-3, AC-4. -- activate the red phase.
- `README.md` -- no change. Oleg's instruction during the build (2026-11-14): the Status line is removed, and stories no longer add their spec or ATDD links to the documents list.

**Acceptance Criteria:**
- Given the Card note panel in add or edit mode, when I press Cmd+Enter or Ctrl+Enter with focus in Note or Page, then it sends `add-card-note` (or `edit-card-note`) with both values as typed, closes on success, returns focus to the opener and `status` reads "Card note saved.", with exactly one form `submit` event per press.
- Given focus in Note, when I press Enter or Shift+Enter, then a new line is inserted and nothing is sent.
- Given an empty Note or a Page outside 1 to the page count, when I press Cmd+Enter, then Save note's field messages, `aria-invalid`, `alert` and focus appear and nothing is saved; and a couldn't-save keeps the panel open with both values and the line above the buttons.
- Given a save is out, when I press Cmd+Enter again, hold it, or press Save note, Cancel, Delete or Esc, then exactly one request is sent, the panel stays open until the result, and Save note and Delete stay focusable with `aria-disabled="true"` described "Saving the card note."
- Given the panel renders in either mode, then Save note carries `aria-keyshortcuts="Meta+Enter Control+Enter"` and no visible text names a key.
- Given Add another doesn't exist yet, when the Epic 5 card note e2e specs run, then they pass unchanged.

### Review Findings

Code review (`bmad-code-review`, new session, 2026-11-14) of `48370cf..7a70f01`; layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor, Spine Check.

- [x] [Review][Patch] The Cancel leaf's title names Cmd+Enter and Ctrl+Enter but presses only `Meta+Enter`, so Ctrl+Enter on a focused button is never exercised (Verification Gap + Edge Case Hunter + Blind Hunter + Acceptance Auditor) [frontend/e2e/card-note-keyboard-save.spec.ts:242]
- [x] [Review][Patch] The doc comment's keyboard-save sentence sits in the add-mode paragraph and doesn't say it works in edit mode too (Blind Hunter) [frontend/src/components/CardNotePanel.tsx:52]
- [x] [Review][Defer] A held Cmd+Enter auto-repeats after a 422 or couldn't-save returns and re-sends the request; in 9.1 only refused requests repeat, but Story 9.2's stay-open panel would save duplicates. The risk sat only in this spec's prose (Edge Case Hunter + Blind Hunter) [frontend/src/components/CardNotePanel.tsx:136] — deferred: for Story 9.2, which must guard repeats
- [x] [Review][Defer] `epic-9-context.md` Test risks still tells 9.2 to press `ControlOrMeta+Enter`, which 9.1's ATDD rejected (one key per machine) (Blind Hunter) [_bmad-output/implementation-artifacts/epic-9-context.md:25] — deferred: the fix edits another story's context
- [x] [Review][Defer] Spine drift (Capability → Architecture Map FR-17 to FR-19 row, Structural Seed `lib/`, AD-15): the spine already lists Add another and `lib/cardNoteAddAnother` as built (Spine Check) [ARCHITECTURE-SPINE.md:402] — deferred: pre-existing (`450510a`), spine drift, reconciled before the next epic

- Full check after the patches (2026-11-14, this review session): `npm run check` exit 0 — pytest 1573 passed, unit 354 passed, e2e 673 passed, smoke ok.

**Rejected:**
- `low` The spec's Verification says "5 passed" while 7 leaves run (Edge Case Hunter + Blind Hunter + Acceptance Auditor) — the fix edits the spec under review.
- `low` Design Notes says held-key repeats send nothing, which contradicts Residual risks (Edge Case Hunter + Blind Hunter) — the fix edits the spec under review; the real hazard is deferred above.
- `low` Build triage rows say "the fix edits this spec" but the spec wasn't edited (Blind Hunter) — that row wording is the skill's reject reason, not a promise; the fix would edit the spec anyway.
- `low` Tasks say "README.md -- no change" and "remove `test.skip(`" only, while the diff deletes the Status line and adds two leaves (Acceptance Auditor) — the fix edits the spec; both deviations are recorded in Code Map and Auto Run Result.
- `low` The Code Map's line numbers are stale (Acceptance Auditor + Blind Hunter) — the fix edits the spec; the symbols still locate the code.
- `false` The target guard is tested on Cancel only, not on Save note or Delete (Blind Hunter) — the handler returns for every non-field target, so buttons keep native behavior by design (spec Never: "No handling for keys on the panel's buttons"); the Cancel leaf already fails if the guard is deleted.
- `low` The ATDD checklist isn't updated for the two added leaves and its follow-ups aren't done (Blind Hunter) — those are its "Green-phase follow-ups", owned by `bmad-testarch-automate`; stale line numbers there harm nothing.
- `low` The README Status-line deletion is bundled into the story's `feat:` commit (Blind Hunter) — Oleg directed it during the build and it is already committed; rewriting history isn't worth it.
- `false` The IME leaf doesn't prove the composing event reached the React handler (Blind Hunter) — the dispatched event bubbles from Note through the same form `onKeyDown` as a real key; without the `isComposing` check the handler calls `preventDefault()`, so `notPrevented` would be false and the leaf fails.
- `low` Only two of the four key/field pairs are tested (Acceptance Auditor) — the handler is symmetric; the other pairs are listed as automate follow-ups in the ATDD checklist.
- `false` The tests press `Meta+Enter` and `Control+Enter` by name instead of `ControlOrMeta+Enter` (Acceptance Auditor) — deliberate (ATDD Test Strategy): both keys are promised on every platform.

## Spec Change Log

## Review Triage Log

### 2026-11-14 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 18, false 4, maybe-false 0
- findings:
  - `[low]` `[reject]` Edge Case Hunter: a held Cmd+Enter keeps auto-repeating after a 422 or couldn't-save returns, so each repeat sends one more request — real, but in 9.1 a refusal stores nothing and a success closes the panel, so only refused requests repeat; the fix adds a guard (`event.repeat`) for a case unlikely in everyday use. Story 9.2 (stay open after a save) must handle held keys; its plan already names "double submit (pressed twice or held) gives one note".
  - `[low]` `[reject]` Edge Case Hunter: Cmd+Shift+Enter, Ctrl+Alt+Enter and Cmd+Ctrl+Enter also save, though `aria-keyshortcuts` names two chords — saving on an extra modifier harms nothing, and the ATDD checklist leaves extra modifiers unspecified.
  - `[low]` `[patch]` Edge Case Hunter: the added IME leaf maps to no listed AC — retitled "[P2] I/O matrix: …" (no AC id); it covers the matrix's IME row.
  - `[low]` `[reject]` Edge Case Hunter (claim): the spec's Tasks say only "remove `test.skip(`" while the diff adds a leaf — the fix edits this spec; the added leaves are recorded under Auto Run Result.
  - `[low]` `[reject]` Edge Case Hunter (claim): the spec says "README.md -- no change" while the diff deletes the Status line — Oleg asked for the deletion during the build (recorded in the spec's Code Map and Tasks); the fix edits this spec.
  - `[low]` `[reject]` Blind Hunter: the README edit goes against the spec and the out-of-story tree rule — Oleg directed it in this session, for this tree; the skill-config side went to its own worktree as AGENTS.md asks.
  - `[low]` `[reject]` Blind Hunter: the unplanned IME leaf isn't recorded in the spec — the fix edits this spec; recorded under Auto Run Result.
  - `[low]` `[patch]` Blind Hunter: the IME leaf is labelled AC-1 though no AC covers composing — same root cause as the Edge Case Hunter row above; retitled.
  - `[low]` `[patch]` Blind Hunter: nothing tests the target guard (Cmd+Enter on Cancel) — same root cause as the Verification Gap row below; leaf added.
  - `[low]` `[reject]` Blind Hunter: extra modifier chords save — same as the Edge Case Hunter row; rejected for the same reason.
  - `[false]` `[reject]` Blind Hunter: the spec and sprint-status are missing from the diff — the spec is the claims file and is excluded from the review diff by design; sprint-status was updated after the diff was written (in-progress, then review in Finalize).
  - `[low]` `[reject]` Blind Hunter: the spec's Code Map line numbers are stale after the diff — the fix edits this spec, and the Code Map also names the symbols.
  - `[false]` `[reject]` Blind Hunter: `epic-9-context.md` names a regeneration tool that doesn't exist — `compile-epic-context.md` is the build skill's context compiler (step-01), which wrote the file.
  - `[low]` `[reject]` Blind Hunter: the epic context's Gate copies backend/API criteria that don't apply to Epic 9 — it copies TR7 as `epics.md` states it for every epic; those criteria pass unchanged with no backend change, and the trace and gate judge applicability.
  - `[low]` `[patch]` Blind Hunter: the IME leaf doesn't check that Note is unchanged after the composing press — added `toHaveValue('Ice.')`.
  - `[low]` `[patch]` Verification Gap: the target guard `event.target !== noteField.current && …` has no test; deleting it left 62 leaves green — added "[P2] I/O matrix: Cmd+Enter or Ctrl+Enter with focus on Cancel sends nothing" (Meta+Enter on a focused Cancel: panel open, Cancel focused, 0 submits, no request; probed in Chromium). It fails with the guard deleted (1 submit) and passes with it.
  - `[false]` `[reject]` Verification Gap (other): removing `preventDefault()` changes nothing observable — in Chromium Meta/Ctrl+Enter inserts no newline and doesn't submit implicitly, so there is no bad outcome; the call stays as a defence.
  - `[low]` `[reject]` Verification Gap (other): the spec's Verification says "5 passed" but 7 leaves now run — the fix edits this spec; the run counts are under Auto Run Result.
  - `[false]` `[reject]` Intent Alignment: the tests press `Meta+Enter` and `Control+Enter` by name, not `ControlOrMeta+Enter` as the epic context suggests — deliberate (ATDD checklist, Test Strategy): both keys are promised on every platform, and `ControlOrMeta` would test one per machine.
  - `[low]` `[reject]` Intent Alignment: IME handling goes beyond the story text — it is in the spec's I/O matrix and costs one condition; no harm.
  - `[low]` `[reject]` Intent Alignment: held-key protection lives in `save()`, not the key handler — same root cause as the first Edge Case Hunter row; rejected there.
  - `[low]` `[reject]` Intent Alignment: the README edit is outside the story's ACs — Oleg's instruction during the build.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- The listener is on the form (React's `onKeyDown` bubbles from both fields), but it acts only when the target is Note or Page, so keys on the buttons keep their native behavior. `TextField` needs no new prop.
- `requestSubmit()` with no submitter is enough: `submit` ignores the submitter, and the guard lives in `save()`. A held key's repeats each fire `submit`; `save()` returns at `inFlight.current`, so they send nothing. Ignoring `event.repeat` is not needed.

```tsx
const saveFromKeys = (event: KeyboardEvent<HTMLFormElement>) => {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) return
  if (event.target !== noteField.current && event.target !== pageField.current) return
  event.preventDefault()
  event.currentTarget.requestSubmit()
}
```

## Verification

**Commands:**
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/card-note-keyboard-save.spec.ts` -- expected: 5 passed.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/add-card-note.spec.ts e2e/edit-card-note.spec.ts e2e/card-notes.spec.ts` -- expected: all pass, files unchanged.
- `npm run check` (repo root) -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:** Cmd+Enter or Ctrl+Enter in the Card note panel's Note or Page field now saves through the form's `requestSubmit()`, so it takes exactly Save note's path (validation, 422 and couldn't-save handling, the in-flight guard), in add and edit mode. Save note carries `aria-keyshortcuts="Meta+Enter Control+Enter"`; there is no on-screen hint. Keys while an IME is composing, and keys with focus outside Note and Page, do nothing.

**Files changed:**
- `frontend/src/components/CardNotePanel.tsx` -- `saveFromKeys` on the form's `onKeyDown`, `aria-keyshortcuts` on Save note, doc comment.
- `frontend/e2e/card-note-keyboard-save.spec.ts` -- the 5 ATDD leaves un-skipped; 2 leaves added for the I/O matrix (IME composing; Cmd+Enter on a focused Cancel).
- `README.md` -- the Status line removed at Oleg's instruction during the build (2026-11-14). Stories no longer add README links; the skill configs were changed to match in a separate worktree branch (`chore/drop-readme-story-rules`).
- `_bmad-output/implementation-artifacts/epic-9-context.md` -- compiled Epic 9 context.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `epic-9` in-progress, `9-1-save-a-card-note-with-cmd-enter` review.

**Review findings:** 22 findings (0 high, 0 medium, 18 low, 4 false). 3 patch entries applied (5 rows), all test-only: the IME leaf retitled to its matrix row, the IME leaf given a Note-value check, and a leaf added for the target guard. 0 deferred. The other 17 rows were rejected, each with its reason in the Review Triage Log. Patched entries by verdict: high 0, medium 0, low 3.

**Follow-up review recommendation:** false. Only low entries were patched.

**Verification (2026-11-14, after the patches):**
- `TZ=Europe/Madrid npx playwright test e2e/card-note-keyboard-save.spec.ts e2e/add-card-note.spec.ts e2e/edit-card-note.spec.ts e2e/card-notes.spec.ts` -- 63 passed (7 keyboard-save leaves and the Epic 5 baseline, whose spec files are unchanged since `48370cf`).
- `npm run check` -- exit 0: pytest 1573 passed, e2e 673 passed, smoke ok.
- Mutation checks: deleting the `isComposing` condition fails the IME leaf; deleting the target guard fails the Cancel leaf (1 submit). Both were edited back by hand.
- Matrix audit: every I/O matrix row has a leaf that ran and passed (AC-1: add/Note and edit/Page; AC-2: plain/Shift Enter; AC-3: refused field and couldn't-save; AC-4: in flight; the IME leaf).

**Residual risks:**
- A held Cmd+Enter auto-repeats after a refusal and re-sends the refused request (rejected as low for 9.1). Story 9.2 keeps the panel open after a save, so there a held key could save duplicates. 9.2 must guard repeats; its plan already lists "pressed twice or held gives one note".
- Real IME composition is covered only by a dispatched `isComposing` event, since Playwright can't drive an IME.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
