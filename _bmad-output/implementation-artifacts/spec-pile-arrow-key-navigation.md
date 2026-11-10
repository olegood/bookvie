---
title: 'Step through the Card notes pile with the arrow keys'
type: 'feature'
created: '2026-11-10'
status: 'draft'
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md'
  - '_bmad-output/implementation-artifacts/spec-5-4-go-through-a-book-s-notes-as-a-pile.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In the Card notes pile (story 5.4), the only way to step from note to note is the **Previous** and **Next** buttons. Focus opens on Next, so Enter or Space works until you reach the end. But once focus is on Close or the Order group, you have to Tab back to a button first. That breaks the flip-flip-flip rhythm of going through a pile.

**Approach:** Let the arrow keys and Home/End step through the notes from anywhere in the pile, except inside the Order radio group. There, the arrow keys already pick the order, and taking them over would switch the order and step at the same time. Each key does exactly what its button does: it calls the same move, with the same announcement and the same no-wrap ends. Focus doesn't move. There's no visible hint. Previous and Next expose their shortcut through `aria-keyshortcuts`.

## Boundaries & Constraints

**Always:** Keys reuse the buttons' move: same polite `status` text "Note N of M, *ref*: *text*", same no-wrap ends. The Tab focus trap from `useAlertDialog` keeps working. Esc closes as before.

**Never:** A visible keyboard hint. Wrap-around. Moving focus when a key steps. Changing what the arrow keys do on the Order radios. Changes to `useAlertDialog.ts`, `usePileFlow.tsx`, the backend or the API.

**Decisions (Oleg, 2026-11-10):**
- No visible hint (DESIGN.md is unchanged).
- Home and End are in scope: they jump to the first and last note.
- A standalone spec, not a sprint change proposal (no correct-course).

</frozen-after-approval>

## UX: EXPERIENCE.md § Pile

Add this bullet after **Ends**:

> - **Keyboard:** Left and Right do what Previous and Next do; Home and End go to the first and last note. They work wherever focus is in the pile except on the Order radios, where the arrow keys keep picking the order, and Home and End do nothing. A key held with Alt, Ctrl, Meta or Shift is left to the browser. Focus stays where it is; the move is announced like a button press ("Note 3 of 7, p.42: *text*"). At an end the key does nothing: no wrap and no announcement. Previous and Next carry `aria-keyshortcuts` ("ArrowLeft", "ArrowRight"). There is no on-screen hint.

The existing **Ends** bullet ("there is no wrap") now covers the keys too and needs no edit.

## Acceptance Criteria

- **AC-1 Arrows step.** With the pile open and focus on Next, Close or Previous, Right shows the next note and Left the previous one. The pile's `status` reads "Note N of M, *ref*: *text*", exactly as for a button press. "N of M" follows the move, and focus stays on the element that had it.
- **AC-2 Home and End jump.** Home shows the first note of the current order and End the last, with the same announcement. Pressing Home on the first note, or End on the last, changes nothing and announces nothing.
- **AC-3 No wrap.** Right on the last note and Left on the first change nothing and announce nothing. The buttons' `aria-disabled` is unchanged. In a one-note pile, all four keys do nothing.
- **AC-4 Order radios keep their keys.** With focus on an Order radio, Left/Right move the checked option as today: the order switches, the pile restarts at "1 of M", and the note doesn't step a second time. Home/End there do nothing to the note.
- **AC-5 Modifiers pass through.** Alt, Ctrl, Meta or Shift held with any of the four keys doesn't step the pile, and the event isn't `preventDefault`-ed.
- **AC-6 Handled keys don't scroll.** Each of the four keys, when the pile handles it, is `preventDefault`-ed, including at an end. Neither the dialog nor the page behind it scrolls.
- **AC-7 Shortcuts exposed.** Previous has `aria-keyshortcuts="ArrowLeft"` and Next has `aria-keyshortcuts="ArrowRight"`. axe still finds nothing on the open pile, in light and dark.
- **AC-8 Shuffled order.** In Shuffled, the keys follow the shuffled sequence. End reaches "M of M" of the shuffle, and closing from there focuses that note's Edit (story 5.4 AC-6 unchanged).

## Implementation Notes

- **`frontend/src/components/CardNotesPile.tsx`:**
  - Pass the dialog an `onKeyDown` that first calls `dialogProps.onKeyDown` (the Tab trap), then handles the pile's keys.
  - Return early if `event.altKey || event.ctrlKey || event.metaKey || event.shiftKey`, or if `event.target` is an `input[type=radio]`.
  - Map ArrowLeft → `index - 1`, ArrowRight → `index + 1`, Home → `0`, End → `total - 1`. For a mapped key, call `event.preventDefault()`. Call `move(to)` only when `to !== index` and `sequence[to]` exists.
  - Add the two `aria-keyshortcuts` attributes. `Button` already passes extra props through to the `<button>` (`...rest`).
  - Update the component's doc comment.
- **Spec:** the EXPERIENCE.md bullet above. DESIGN.md is unchanged.
- **Tests:** AC-1 to AC-8 live in `frontend/e2e/card-notes-pile-keys.spec.ts`, a separate file because the 5.4 spec would pass the 1000-line limit. They reuse 5.4's seeded pile of 7 notes and of 1 note from `e2e/pile.ts`.
- **ATDD artifacts:** `_bmad-output/test-artifacts/atdd-checklist-pile-arrow-key-navigation.md`. The 8 skipped red leaves are in `frontend/e2e/card-notes-pile-keys.spec.ts`. Shared pile seeds and helpers moved to `frontend/e2e/pile.ts`.
- **Pipeline:** ATDD → `bmad-build-auto` → `bmad-code-review` → `bmad-testarch-automate`, as for any story. There's no `story_key` in `sprint-status.yaml`.
