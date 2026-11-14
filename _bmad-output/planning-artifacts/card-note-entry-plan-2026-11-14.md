---
title: Faster card note entry — plan
status: agreed
created: 2026-11-14
source: party-mode session (Sally, John, Amelia, Murat) with Oleg
idea: docs/ideas.md → "Faster card note entry"
---

# Faster card note entry — plan

Make the Card note panel quicker when Oleg adds several notes in a row: **Cmd+Enter** (or Ctrl+Enter) saves from the Note field, and an **Add another** checkbox keeps the panel open after a save, ready for the next note. Oleg's use is catching lines while he reads, not copying out a chapter's highlights afterwards.

## 1. What already exists

- `frontend/src/components/CardNotePanel.tsx`: a modal `dialog` with Note (`textarea`, focused on open) and Page (prefilled by the opener), then **Save note** and **Cancel**. On an `ok` result `save()` calls `onSaved()`, and `useCardNoteFlow.close(true)` unmounts the panel, refocuses the opener and announces "Card note saved." There is no "stay open" path.
- Enter in **Page** already submits the form natively. Only the Note `textarea` takes Enter as a newline.
- `inFlight` already ignores a second press while a request is out, and Esc is ignored in flight.
- EXPERIENCE.md → Keyboard: "No character-key shortcuts." A modifier with Enter isn't a character key, so it is allowed. The Pile already sets `aria-keyshortcuts` for its keys.
- `frontend/src/lib/catalogView.ts` is the pattern for a remembered UI preference: a `bookvie.*` localStorage key, read and written inside try/catch, with a default when storage throws or holds junk. The spine already says UI preferences live in localStorage per browser (AD-15 area, the `local-state.json` rule).
- Live regions: both regions are emptied before every save and new text is set after about 100 ms, so a repeated "Card note saved." is announced again.
- DESIGN.md has no plain checkbox component yet (checkboxes appear only in the Language ▾ and Tag ▾ lists).

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Cmd+Enter and Ctrl+Enter** in the Note field save, exactly like **Save note**. They go through `form.requestSubmit()`, so validation, the in-flight guard and the busy state are the same path. They work in add and edit mode. **Save note** carries `aria-keyshortcuts="Meta+Enter Control+Enter"`. No on-screen hint. | Desktop Chrome only, but not only macOS; the CI runner presses Ctrl. One path means one behavior to test. |
| D2 | **Add another** is a **checkbox**, under Page and above the buttons, in **add mode only**. Edit mode doesn't show it. | Oleg's call, over a "Save and add another" button. Edit is one note at a time. |
| D3 | The checkbox is **remembered between visits** in localStorage (`bookvie.cardNoteAddAnother`), like the catalog view. Storage that throws, is empty or holds junk reads as **off**. It is never exported. | Oleg's call. Side information, not library data. |
| D4 | **After a save with Add another on:** the panel stays open; Note empties; **Page keeps exactly what was typed** ("212–213" stays "212–213"); field errors and the couldn't-save line clear; focus returns to Note; `status` announces "Card note saved." The opener's counts ("See card notes · N", the Card notes block) update behind the panel. | Oleg's call on Page: the next line is usually on the same spread. |
| D5 | **A running count** shows on the card after the first save in this opening: "1 note saved", "2 notes saved". It's plain text, **not a live region**, and it starts empty each time the panel opens. | Shows momentum, and that earlier notes are kept, without announcing the same event twice. |
| D6 | **Cancel stays Cancel.** Cancel or Esc closes the panel, drops only the unsent text, and focus returns to the opener as today. Nothing more is announced; each save was already announced. No confirm for a half-typed note. | Oleg's call: a label that changes mid-task leads to wrong clicks. The count line already says the saved notes are kept. |
| D7 | **With Add another off,** a save behaves exactly as today: the panel closes, focus returns to the opener, "Card note saved." | No change for the single-note case. |
| D8 | **Failures are unchanged:** a 422 or couldn't-save keeps the panel open with every value kept, Add another or not. | One rule for failures. |

## 3. Changes, in order

Each step is its own skill run, in a fresh context. Docs and planning commits go straight to master.

| Step | Artifact | Change | Skill |
|---|---|---|---|
| 1 | EXPERIENCE.md | **Card note panel** section: Cmd+Enter / Ctrl+Enter (D1), Add another (D2–D6), what carries over and what clears. Keyboard section: note the modifier+Enter save next to "Enter in the page field". Focus after close: after a save with Add another on, focus stays in the panel on Note. Flow 6: a short variant with two notes in a row. | `bmad-ux` (update) |
| 2 | DESIGN.md | A plain **Checkbox** component (box, label, focus ring, light, dark and forced colors) and its place in the **Card note panel** row; the count line's type and color. Any new tokens are copied into `frontend/src/styles/tokens.css` by the story that first uses them. | `bmad-ux` (update) |
| 3 | PRD (`prds/prd-bookvie-2026-10-28/prd.md`) | **FR-17** gains consequences: a keyboard save from the note text, and adding several notes in a row without closing, with the choice remembered per browser and not part of the library. Bump `updated:`. | `bmad-prd` (update) |
| 4 | Architecture spine | One-line note, not a new AD: the localStorage UI preferences list gains the card note Add another choice (`lib/cardNoteAddAnother`), and the FR-17 row of the capability map names it. | `bmad-architecture` (update) |
| 5 | Epics (`epics.md`) | New **Epic 9: Add card notes faster**, covering the FR-17 amendment, with the two stories below. Add it to the Epic List and the FR coverage map. | `bmad-create-epics-and-stories` |
| 6 | Sprint status | Close Epic 8 (`epic-8: in-progress` though its retro is done), then add Epic 9 and its stories. | `bmad-sprint-planning` |
| 7 | Each story | ATDD → `bmad-build-auto` → `bmad-code-review` (new session) → `bmad-testarch-automate`, per AGENTS.md → Story pipeline. | per story |
| 8 | `docs/ideas.md` | Status → `planned`, linking Epic 9 and this plan. Done with this plan. | — |

## 4. Story cut (Epic 9)

**9.1 Save a card note with Cmd+Enter.** D1 in add and edit mode: Cmd+Enter and Ctrl+Enter in Note submit through `requestSubmit()`; `aria-keyshortcuts` on Save note; plain Enter still makes a newline; a held key or a second press while in flight sends one request; a 422 behaves as with the button. Lands the submit path that 9.2 builds on.

**9.2 Add several card notes in a row.** D2–D8: the Add another checkbox (add mode only) and `lib/cardNoteAddAnother.ts`; stay open, clear Note, keep Page, refocus Note, announce; the running count; Cancel and Esc after saves; the opener's counts updating behind the panel; the Checkbox component and any tokens from DESIGN.md.

## 5. Tests

Murat's risks, to be covered by each story's ATDD:

- **Double submit** (9.1): Cmd+Enter pressed twice, or held, while the request is out gives exactly one note.
- **Same path** (9.1): Cmd+Enter with an empty Note or an out-of-range page shows the same errors and focus as **Save note**. Use Playwright's `ControlOrMeta+Enter`, plus one explicit `Control+Enter` test.
- **Lifecycle** (9.2): after a save with Add another on, the panel is still the open modal, Note is empty and focused, Page is unchanged, "Card note saved." is announced again on the second save, and the count reads "2 notes saved".
- **Esc after saves** (9.2): with three notes saved and a fourth half typed, Esc closes the panel, the three notes exist, the fourth doesn't, and focus is on the opener.
- **Remembered choice** (9.2): the checkbox state survives a reload; storage that throws or holds junk reads as off and the panel still works; the key is not in an export.
- **Edit mode** (9.2): no checkbox; a save closes as today.
- **Off is unchanged** (9.2): with the checkbox off, the existing card note e2e specs pass untouched.
