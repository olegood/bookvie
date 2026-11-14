# Epic 9 Context: Add card notes faster

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the Card note panel quicker when Oleg catches several lines while he reads. Cmd+Enter (or Ctrl+Enter) saves a note from the keyboard. A remembered **Add another** checkbox keeps the panel open after each save, keeps the page, and shows a running count of the notes saved in this opening. With Add another off, card note behavior stays exactly as it is now.

## Stories

- Story 9.1: Save a card note with Cmd+Enter
- Story 9.2: Add several card notes in a row

## Requirements & Constraints

- **Keyboard save:** Cmd+Enter or Ctrl+Enter with focus in Note or Page does exactly what **Save note** does, in add and edit mode. It runs the same validation, field messages, `aria-invalid`, `alert` announcement and focus on the first invalid field, and a couldn't-save is handled the same way. Plain Enter in Note still inserts a newline and sends nothing. Plain Enter in Page already submits.
- **One request per save:** while a save is out, more key presses, a held key, **Save note**, **Cancel** and Esc are all ignored, and exactly one request is sent. **Save note** (and **Delete** in edit mode) stay focusable with `aria-disabled="true"`, described "Saving the card note." The label doesn't change.
- **Add another (add mode only):** a checkbox, off by default. Its state is remembered per browser as soon as it changes. Storage that is empty, holds junk or throws reads as off. A failed write still toggles the box for this opening and shows no message. The choice is never exported, and a restore neither brings nor replaces it.
- **After a successful save with Add another on:** the panel stays open as the modal. Note empties. Page keeps exactly what was typed ("212–213" stays "212–213"). Field errors and the couldn't-save line clear. Focus returns to Note. `status` announces "Card note saved." after every save, and the repeat is announced again. The counts behind the panel ("See card notes · N", Book detail's Card notes block) update as after any save.
- **Running count:** "1 note saved", "2 notes saved", and so on, shown from the first save of an opening. It is plain text, not a live region, and empty each time the panel opens. A failed save doesn't change it.
- **Cancel/Esc after saves:** the label stays **Cancel**. The panel closes, the saved notes stay, only the unsent text is dropped, and nothing more is announced. Focus returns to the opener. No confirm.
- **Off, or edit mode:** a save closes the panel and returns focus to the opener, as today. In edit mode a save always closes, even when the stored choice is on.
- **Failures** (422 or couldn't-save) never close the panel, and every value is kept, whether Add another is on or off.
- **Gate:** per-epic quality gates (P0 100%, P1 ≥ 95%, every error code has an API test, `check:api` clean, coverage ≥ 90% on `domain/` and ≥ 80% on `intents/` + `store/`). The existing card note e2e specs must pass unchanged with Add another off.
- **Test risks to cover:** double submit (pressed twice or held) gives one note. Use Playwright `ControlOrMeta+Enter`, plus one explicit `Control+Enter` test (the CI runner presses Ctrl). Same-path errors for an empty Note or an out-of-range page. Lifecycle after two saves (still modal, Note empty and focused, Page unchanged, re-announced, "2 notes saved"). Esc with three saved and a fourth half typed. The remembered choice survives a reload, junk or throwing storage reads as off, and the key is absent from an export. Edit mode has no checkbox.

## Technical Decisions

- **One submit path:** the keyboard save calls `form.requestSubmit()`, so validation, the in-flight guard and the busy state are shared with **Save note**. Story 9.1 lands this path, and 9.2 builds on it.
- **`aria-keyshortcuts="Meta+Enter Control+Enter"`** on **Save note**, and no on-screen hint. A modifier with Enter isn't a character-key shortcut, so it fits the app's "no character-key shortcuts" rule.
- **The Add another preference is a UI preference** in browser `localStorage` under `bookvie.cardNoteAddAnother`. Only `frontend/src/lib/cardNoteAddAnother.ts` reads and writes it, inside try/catch, and it defaults to off. It follows the same pattern as `lib/catalogView` and `lib/catalogSort`. It is not server state: it never goes in `library.json` or `local-state.json`, and no backend or API change is needed.
- `components/CardNotePanel` owns the keyboard save and Add another. Today a successful save always ends in close/unmount through the card note flow hook, so the stay-open path is new.
- Live regions are emptied before each save and refilled after about 100 ms. That is what makes a repeated "Card note saved." announce again.
- Any new design tokens get copied into `frontend/src/styles/tokens.css` by the story that first uses them. That file must match DESIGN.md character for character and is never run through a formatter.

## UX & Interaction Patterns

- **Checkbox component** (new): the native checkbox, 16px, tinted with `accent` via CSS `accent-color`. Its label sits to the right in `body-sm`/`ink`, spaced by `spacing.2`, and the whole label is clickable. The focus ring is on the box. There is no custom drawing. Dark theme: the token swap gives the `accent` dark twin, and `color-scheme: dark` gives the dark unchecked box. Forced colors are left to the system.
- **Panel layout (add mode):** Note, then Page, then a row with the **Add another** checkbox on the left and the count right-aligned in `meta`/`ink-tertiary`, then **Save note** and **Cancel**. Edit mode has no checkbox and no count row.
- **Focus after a save:** with Add another on, focus goes to Note (now empty). Otherwise, and on Cancel, it goes to the opener (**Add card note** or the note's Edit).
- **Flow variant:** Oleg checks Add another, types a quote, sets Page to "212–213" and presses Cmd+Enter. The panel stays open with "1 note saved". He types a second quote and presses Cmd+Enter ("2 notes saved"), then Esc. Both notes are kept. If the second save fails, "Couldn't save. Your data wasn't changed." shows above the buttons, the quote stays in Note, and the count stays at "1 note saved".

## Cross-Story Dependencies

- 9.2 depends on 9.1's `requestSubmit()` path. A save from Cmd+Enter or from **Save note** must take the same Add another branch.
- Both stories extend the Card note panel and flow from Epic 5. The Epic 5 card note e2e specs are the regression baseline and must not be edited.
- Supported browser is desktop Chrome only. Ignore Safari- and Firefox-only behavior.
