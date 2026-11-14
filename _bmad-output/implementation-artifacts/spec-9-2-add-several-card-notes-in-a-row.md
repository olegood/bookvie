---
title: 'Story 9.2: Add several card notes in a row'
type: 'feature'
created: '2026-11-14'
baseline_revision: '08def0ec92e8ef0ba7e7d0f66ba80059924a6e8b'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Every successful card note save closes the panel, so catching several lines while reading means reopening the panel and retyping the page each time (FR-17, UX-DR60 to UX-DR62).

**Approach:** In add mode, `CardNotePanel` gets a remembered **Add another** native checkbox (stored by a new `lib/cardNoteAddAnother.ts` in `localStorage`). With it on, a successful save keeps the panel open: Note empties, Page stays, errors clear, focus returns to Note, "Card note saved." is announced again, and a plain-text count "N note(s) saved" shows on the checkbox's line. A held Cmd/Ctrl+Enter saves one note. Off, or in edit mode, a save closes as before.

## Boundaries & Constraints

**Always:**
- Only `lib/cardNoteAddAnother.ts` touches `localStorage['bookvie.cardNoteAddAnother']`, inside try/catch: the stored on value reads as on; empty, any other value, or a throwing read reads as off. The panel writes the choice on every change; a throwing write still toggles the box for this opening, with no message.
- The choice is read when the panel opens (each opening mounts a new panel). Edit mode renders no checkbox and no count and always closes on a save, whatever is stored.
- With Add another on, a save from Save note or Cmd/Ctrl+Enter takes the same `save()` branch: on `ok` the panel stays mounted and modal, `text` becomes `''`, `page` is unchanged, `errors` is `{}` and the couldn't-save line hides, busy ends, focus moves to Note, then `announce('status', CARD_NOTE_SAVED)`.
- The count is plain text (no live region, no role), `meta`/`ink-tertiary`, right-aligned on the checkbox's row, rendered only after the first save of this opening; "1 note saved", "2 notes saved". A refusal or couldn't-save leaves it unchanged.
- Cmd/Ctrl+Enter with `event.repeat` sends nothing (one note per press); plain and Shift+Enter in Note keep inserting a new line.
- Cancel and Esc after saves close the panel as today (label stays Cancel, no confirm, nothing more announced, focus on the opener).
- Checkbox styling per DESIGN.md Checkbox: native box, 16×16, `accent-color: var(--color-accent)`, label to its right in `body-sm`/`ink` with an 8px (`--space-2`) gap, whole label clickable, focus ring from `base.css`'s `:focus-visible`. Existing tokens only.

**Never:**
- No backend, API, export or restore change; the key is never sent to the server.
- No custom drawing of the checkbox (`appearance`, `background-image`, `box-shadow`, `forced-color-adjust` stay default). No new design token, no edit to `tokens.css`.
- No edit to the Epic 5 card note specs or 9.1's keyboard-save specs; they must pass unchanged.
- No Safari- or Firefox-only workaround (AGENTS.md "Supported browser").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| On, save ok | box on, Note "Ice.", Page "212–213" | Panel open + modal, Note `''` focused, Page "212–213", status "Card note saved.", count "1 note saved", See card notes · 1 | none |
| On, 422 | Page "400" of 330 | Panel open, both values kept, Page invalid + focused, alert summary, count unchanged | as Save note |
| On, 503 | couldn't-save | Line above the buttons, values kept, count unchanged; retry clears the line and field error | as Save note |
| Held key | Cmd+Enter held after a save returns | No more requests, no error | `event.repeat` ignored |
| Off / edit mode | stored on, edit mode; or box off in add mode | Save closes, focus to opener (or the note's Edit), status "Card note saved." | none |
| Storage | empty, `'sometimes'`, `''`, throws | Box off, panel works | try/catch in lib |

</intent-contract>

## Code Map

- `frontend/src/components/CardNotePanel.tsx` -- the panel. `save()` (`:103`) calls `onSaved()` on `ok` (`:111-113`): add the stay-open branch there. `saveFromKeys` (`:136`): add the `event.repeat` check. Fields at `:198-231`, the regions slot `:232`, actions `:233`. Add the checkbox row between Page and the regions slot (add mode only). Update the doc comment and the `onSaved` prop comment (it is not called on a stay-open save).
- `frontend/src/components/CardNotePanel.module.css` -- add the row (flex, `justify-content: space-between`, `align-items: center`), the label (inline-flex, gap `--space-2`, `body-sm`, `ink`), the box (16×16, `margin: 0`, `accent-color`), and the count (`meta`, `ink-tertiary`).
- `frontend/src/lib/catalogView.ts` / `catalogView.test.ts` -- the pattern for the new module and its unit test (`node:test`, a fake `window.localStorage`). Read only.
- `frontend/src/lib/cardNoteAddAnother.ts` (new) -- `readAddAnother(): boolean`, `writeAddAnother(on: boolean): void`, key `bookvie.cardNoteAddAnother`, values `'on'`/`'off'`.
- `frontend/src/lib/useCardNoteFlow.tsx` -- `useCardNoteFlow` closes and announces on `onSaved` (`:44-54`); unchanged in behavior, update its header comment to mention the stay-open case. `useCardNoteEditFlow` unchanged.
- `frontend/src/lib/announce.ts` -- `announce` empties both regions then sets text after 100 ms, which re-announces a repeated "Card note saved.". Read only.
- `frontend/src/lib/cardNotes.ts` -- `CARD_NOTE_SAVED`. Read only.
- `frontend/src/styles/base.css:6` -- `:focus-visible` outline (accent, 2px) already gives the box its ring. `tokens.css` already has `color-scheme` per theme and every token needed. Read only.
- `frontend/e2e/card-note-add-another.spec.ts` -- 8 ATDD red leaves (`test.skip`, AC-1 `:57` … AC-8 `:443`); helper module `card-note-add-another.ts`. Un-skip; edit a leaf only for a proven test bug, and say so.
- `frontend/e2e/add-card-note.spec.ts`, `edit-card-note.spec.ts`, `card-notes.spec.ts`, `card-note-keyboard-save*.spec.ts` -- regression baseline. Read only.
- Deferred-work intake:
  - `deferred-work.md:1004-1005` (a held Cmd+Enter repeats and would save duplicates) -- task: ignore `event.repeat` in `saveFromKeys`; AC "held key" below; leaf AC-3.
  - `deferred-work.md:1007-1008` (epic context says `ControlOrMeta+Enter`) -- closed by the 9.2 ATDD, which presses `Meta+Enter` and `Control+Enter` by name (checklist Preflight); resolve it in Finalize.
  - `deferred-work.md:1010-1011` (Spine drift: the spine lists Add another and `lib/cardNoteAddAnother` before they exist) -- this story builds them; resolve it in Finalize once they exist.

## Tasks & Acceptance

**Execution:**
- `frontend/src/lib/cardNoteAddAnother.ts` -- create `readAddAnother` / `writeAddAnother` on `catalogView`'s pattern -- one owner of the key.
- `frontend/src/lib/cardNoteAddAnother.test.ts` -- unit tests: `'on'` reads on; `null`, `'off'`, junk and `''` read off; throwing `getItem` reads off; throwing `setItem` doesn't throw; writes go under `bookvie.cardNoteAddAnother`.
- `frontend/src/components/CardNotePanel.tsx` -- state `addAnother` (`useState(() => !note && readAddAnother())`) and `savedCount` (0); the checkbox row in add mode (label wrapping the input and a text span, `onChange` sets state and calls `writeAddAnother`); the count span when `savedCount > 0`; the stay-open branch in `save()` on `ok` when `!note && addAnother`; the `event.repeat` guard in `saveFromKeys`; doc comments.
- `frontend/src/components/CardNotePanel.module.css` -- the row, label, box and count styles above.
- `frontend/src/lib/useCardNoteFlow.tsx` -- header comment only.
- `frontend/e2e/card-note-add-another.spec.ts` -- remove `test.skip(` from the 8 leaves in the checklist's order (AC-1, AC-8, AC-2, AC-7, AC-3, AC-4, AC-6, AC-5).

**Acceptance Criteria:**
- Given the panel in add mode, then the native **Add another** checkbox sits under Page and above the buttons, 16px, `accent-color` accent, label "Add another" in `body-sm`/`ink` and clickable, focus ring on the box; in edit mode there is no checkbox and no count.
- Given I toggle Add another, then `bookvie.cardNoteAddAnother` is written at once and the next opening and a reload show the same state; empty, junk or throwing storage reads off and a failing write still toggles the box, with no message; nothing reaches the export or restore.
- Given Add another on, when a save succeeds from Save note or Cmd/Ctrl+Enter, then the panel stays the open modal, Note is empty and focused, Page unchanged, errors and the couldn't-save line cleared, `status` re-announces "Card note saved.", the count reads "1 note saved" then "2 notes saved", and "See card notes · N" updates behind the panel.
- Given a held Cmd+Enter whose repeats arrive after a save returned, then exactly one note is saved per press and no error shows.
- Given three saved and a fourth half typed, when I press Esc or Cancel, then the panel closes, three notes exist, focus is on the opener, and nothing more is announced.
- Given Add another on, when a save is refused or can't be written, then the panel stays open with both values and the message, and the count is unchanged.
- Given Add another off, or edit mode with the stored choice on, when a save succeeds, then the panel closes and focus returns to the opener as before; the existing card note e2e specs pass unchanged.
- Given the dark theme or forced colors, then the box shows the accent dark twin and the dark unchecked box, or the system colors, with no custom drawing.

## Spec Change Log

- Test bug in leaf AC-5 (`card-note-add-another.spec.ts`), fixed in the leaf: it pressed the next Cmd+Enter (and later Cancel) within `ANNOUNCE_DELAY_MS` of the previous save, so the panel's `clearAnnouncements()` at the start of `save()` and in `dismiss()` (Epic 5 behavior, by `announce.ts`'s design) cancelled the still-pending "Card note saved." and the recorder saw `[SAVED]` instead of `[SAVED, '', SAVED, '', SAVED]`. The leaf now waits for `status` to read "Card note saved." after each save before the next action, as AC-3 already does. No assertion was weakened.

## Review Triage Log

### 2026-11-14 — Review pass
- verdicts: 22 findings — high 0, medium 0, low 19, false 3, maybe-false 0
- findings:
  - `[false]` `[reject]` Blind Hunter: the three intake entries in `deferred-work.md` have no `resolved:` line — Finalize adds them, as the Code Map says; the diff was staged before Finalize.
  - `[low]` `[reject]` Blind Hunter: plain Enter on the focused Add another box submits the form — probed in Chromium: it sends one `add-card-note` and closes the panel. This is native implicit submission, the same as Enter in Page, and it saves exactly what Save note would; a key guard on the box adds a branch for an unlikely, harmless press.
  - `[low]` `[reject]` Blind Hunter: `save()` reads the `addAnother` value from the render it started in, so toggling the box mid-save takes the old branch — real, but a local save resolves in milliseconds; a ref or a disabled box adds state for a case nobody meets.
  - `[low]` `[reject]` Blind Hunter: AC-5's added waits hide that a save, Esc or Cancel within 100 ms of a save drops its "Card note saved." — real, from `announce.ts`'s clear-then-set design (read only here); a person can't act inside 100 ms of the response. Keeping a pending status through `dismiss()` changes the announce contract. The leaf edit is a test-timing fix, recorded in the Spec Change Log.
  - `[low]` `[reject]` Blind Hunter: no e2e test makes `setItem` throw — the lib's try/catch is unit-tested and the panel sets state before writing; the throwing-storage e2e leaf is an ATDD green-phase follow-up owned by `bmad-testarch-automate`.
  - `[low]` `[reject]` Blind Hunter: "Add another" and the count's plural are inline JSX, not in `lib/cardNotes.ts` — both are pinned by e2e (AC-1, AC-4); moving them is a refactor with no defect.
  - `[low]` `[reject]` Blind Hunter: no held Control+Enter test — the guard reads `event.repeat` regardless of modifier; listed as an automate follow-up in the ATDD checklist.
  - `[low]` `[reject]` Blind Hunter: the count isn't linked to the box with `aria-describedby` — optional per the ATDD checklist ("Open for the build"); the story requires only that it isn't a live region.
  - `[false]` `[reject]` Blind Hunter: `useCardNoteFlow`'s header overstates "nothing here runs until Cancel or Esc closes it" — accurate: on a stay-open save `onSaved` isn't called, and the close path runs only on Cancel/Esc, announcing nothing, as the comment says.
  - `[low]` `[reject]` Edge Case Hunter: stale `addAnother` during an in-flight toggle — same root cause as the Blind Hunter row; rejected for the same reason.
  - `[low]` `[reject]` Edge Case Hunter: Esc or Cancel within 100 ms of a stay-open save drops its announcement — same root cause as the AC-5 row; rejected there.
  - `[low]` `[reject]` Edge Case Hunter: a second save within 100 ms drops the first's announcement — same root cause; rejected there.
  - `[low]` `[reject]` Edge Case Hunter: Enter on the focused box may submit (unverified) — same as the Blind Hunter row; probed, native submission, rejected there.
  - `[low]` `[reject]` Edge Case Hunter (claim): AC-5's added waits hide the clear-announcements race — same root cause as the AC-5 row; rejected there.
  - `[low]` `[patch]` Verification Gap: the stay-open branch's `setErrors({})` is unobserved (AC-6's 503 step clears errors first; deleting it left 8 leaves green) — added leaf "[P1] AC-3 with Add another on, a save right after a refusal clears the field error it left" (Page 400 refused, then 212 and Meta+Enter: Note empty, "1 note saved", Page not `aria-invalid`, no description, Page "212"). It fails with `setErrors({})` deleted and passes with it.
  - `[low]` `[reject]` Verification Gap (other): a fast close or save drops the last announcement — same root cause as the AC-5 row; rejected there.
  - `[low]` `[reject]` Intent Alignment: no stay-open test opens the panel from Book detail — the panel and its stay-open branch are shared; an ATDD follow-up for automate.
  - `[low]` `[reject]` Intent Alignment: throwing storage is tested only at unit level — same as the Blind Hunter row; automate follow-up.
  - `[low]` `[reject]` Intent Alignment: nothing asserts the key stays out of export and restore — the key never reaches the server (no API or backend change); an automate follow-up in the ATDD checklist.
  - `[low]` `[reject]` Intent Alignment: an ATDD leaf (AC-5) was edited — same root cause as the AC-5 row; the edit is recorded in the Spec Change Log as a test-timing fix.
  - `[false]` `[reject]` Intent Alignment: the `event.repeat` guard is beyond 9.2's scope and touches edit mode and the off path — it is this story's deferred-work intake (`deferred-work.md:1004-1005`, "9.2 must ignore `event.repeat`"); on those paths repeats were already dropped by the in-flight guard or sent only refused requests, and the Epic 5 and 9.1 specs pass unchanged.
  - `[low]` `[reject]` Intent Alignment: the visual criteria are checked through computed CSS, not pixels — the criteria are about native drawing and tokens, which computed CSS observes; no harm named.

## Design Notes

- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate` (AGENTS.md "Story pipeline").
- The stay-open branch stays inside `CardNotePanel` (the epic context says the panel owns Add another), so `useCardNoteFlow`'s close/refocus/announce order is untouched for the off path. The panel announces only on the stay-open path; the flow hook still announces on close.
- Focus before announce, as the flow hook does: `noteField.current?.focus()` then `announce('status', CARD_NOTE_SAVED)`. `addNote` resolves `ok` after the views refetch, so the counts behind the modal are current by then.
- The label wraps the input and a `<span>Add another</span>`, so a click anywhere on the label toggles the box and the accessible name is "Add another". The span carries the `body-sm`/`ink` text the leaves read.

```tsx
if (result.kind === 'ok') {
  if (note || !addAnother) return onSaved()
  setText(''); setErrors({}); setShowAlert(false); setBusy(false)
  setSavedCount((count) => count + 1)
  noteField.current?.focus()
  announce('status', CARD_NOTE_SAVED)
  return
}
```

## Verification

**Commands:**
- `cd frontend && node --test src/lib/cardNoteAddAnother.test.ts` -- expected: all pass.
- `npm run build` (repo root) -- the e2e suite serves the built SPA, so build before running leaves.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/card-note-add-another.spec.ts` -- expected: 8 passed.
- `cd frontend && TZ=Europe/Madrid npx playwright test e2e/add-card-note.spec.ts e2e/edit-card-note.spec.ts e2e/card-notes.spec.ts e2e/card-note-keyboard-save.spec.ts e2e/card-note-keyboard-save-automate.spec.ts` -- expected: all pass, files unchanged.
- `npm run check` (repo root) -- expected: exit 0.

## Auto Run Result

Status: in-review

**Summary:** The Card note panel's add mode has an **Add another** native checkbox under Page, remembered per browser by `lib/cardNoteAddAnother` (`bookvie.cardNoteAddAnother`, `'on'`/`'off'`, try/catch, off by default). With it on, a successful save from Save note or Cmd/Ctrl+Enter keeps the panel open as the modal: Note empties, Page stays, errors and the couldn't-save line clear, focus returns to Note, `status` re-announces "Card note saved.", and a plain-text "N note(s) saved" shows right-aligned on the checkbox's row. A held Cmd/Ctrl+Enter saves one note (`event.repeat` ignored). Off, or in edit mode, a save closes as before.

**Files changed:**
- `frontend/src/lib/cardNoteAddAnother.ts` -- new: `readAddAnother` / `writeAddAnother`.
- `frontend/src/lib/cardNoteAddAnother.test.ts` -- new: 5 unit tests (on, off/junk, throwing storage, key and values, round trip).
- `frontend/src/components/CardNotePanel.tsx` -- the checkbox row and count (add mode), the stay-open branch in `save()`, the `event.repeat` guard, doc comments.
- `frontend/src/components/CardNotePanel.module.css` -- row, label, box (16px, `accent-color`) and count styles, existing tokens only.
- `frontend/src/lib/useCardNoteFlow.tsx` -- header comment.
- `frontend/e2e/card-note-add-another.spec.ts` -- the 8 ATDD leaves un-skipped; AC-5 waits for each save's announcement (test bug, Spec Change Log); 1 leaf added in review (refusal then success clears the field error).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- `resolved:` on the three intake entries (`:1004-1011`).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `9-2-add-several-card-notes-in-a-row` review.

**Review findings:** 22 findings (0 high, 0 medium, 19 low, 3 false). 1 patch applied (test-only, low). 0 deferred. 21 rejected, each with its reason in the Review Triage Log. Patched entries by verdict: high 0, medium 0, low 1.

**Follow-up review recommendation:** false. Only one low entry was patched.

**Verification (2026-11-14, after the patch):**
- `npm run check` -- exit 0: pytest 1573 passed, unit 359 passed, e2e 691 passed, smoke ok.
- Before the patch: the 8 ATDD leaves plus the Epic 5 and 9.1 card note specs, 80 passed; those regression spec files are unchanged since `08def0e`.
- Mutation checks: removing the `event.repeat` guard fails AC-3 (held key); removing the stay-open `setErrors({})` fails the added AC-3 leaf. Both edited back by hand.
- Probe (Chromium): plain Enter on the focused Add another box submits the form (native implicit submission); kept as is.
- Matrix audit: on/save ok (AC-3, AC-4), 422 and 503 (AC-6, and the added leaf), held key (AC-3), off and edit mode (AC-7), storage empty/junk (AC-2) and throwing (unit tests) each have a test that ran and passed.

**Residual risks:**
- A save, Esc or Cancel within 100 ms of a save's response drops that save's "Card note saved." (`announce.ts` clears a pending message). Not reachable at human speed.
- Throwing storage, Book detail add mode, export/restore and a held Control+Enter are covered by code and unit tests only; they are the ATDD checklist's follow-ups for `bmad-testarch-automate`.

Next: run `bmad-code-review` in a new session (AGENTS.md "Story pipeline").
