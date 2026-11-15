---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-14'
storyId: '9.2'
storyKey: '9-2-add-several-card-notes-in-a-row'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-92-add-several-card-notes-in-a-row'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-9-2-add-several-card-notes-in-a-row.md'
generatedTestFiles:
  - 'frontend/e2e/card-note-add-another.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 9, Story 9.2)'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - '_bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md (D2–D8, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card note panel lines 250–266, Focus after close lines 418–419, Flow 6 variant line 579, Backup page line 142)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/DESIGN.md (components.checkbox, card-note.saved-count, Checkbox line 641, Card note panel line 664, Forced colors line 557)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/implementation-artifacts/deferred-work.md (code review of spec-9-1, lines 1002–1012)'
  - '_bmad-output/test-artifacts/atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md (format, key choice)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/components/CardNotePanel.tsx, CardNotePanel.module.css, src/lib/catalogView.ts (+ .test.ts), src/lib/announce.ts, src/styles/tokens.css, src/styles/base.css'
  - 'frontend/e2e/card-note-keys.ts, card-note-keyboard-save.spec.ts, add-card-note.spec.ts, catalog-sort.spec.ts (throwing storage), catalog-filter.spec.ts (APP_STORAGE_KEYS), stats.ts (afterAnnounceDelay), home.ts, intents.ts, library.ts, fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Card note panel in add mode, when it renders, then an Add another checkbox sits under Page, above the buttons: the native checkbox, 16px, tinted with accent through accent-color, its label "Add another" in body-sm/ink and clickable, with the focus ring on the box (UX-DR60); and in edit mode there is no checkbox and no count' }
  - { id: AC-2, idSource: generated, text: 'Given I check or uncheck Add another, when the box changes, then the choice is stored at once in localStorage under bookvie.cardNoteAddAnother by lib/cardNoteAddAnother (try/catch), and the next opening, also after a reload, shows the same state; and storage that is empty, holds anything else, or throws reads as off and the panel still works; a write that fails still toggles the box for this opening, with no message; and the choice is not in an export, and a restore neither brings nor replaces it (AR27)' }
  - { id: AC-3, idSource: generated, text: 'Given Add another is on, when a save succeeds, from Save note or from Cmd+Enter, then the panel stays open as the modal, Note empties, Page keeps exactly what was typed ("212–213" stays "212–213"), field errors and the couldn''t-save line clear, and focus returns to Note; and the status region reads "Card note saved." after every save, announced again on the second save; and the counts behind the panel ("See card notes · N", Book detail''s Card notes block) update as after any save (UX-DR61)' }
  - { id: AC-4, idSource: generated, text: 'Given Add another is on, when the first save of this opening succeeds, then the second, then a line on the checkbox''s line, right-aligned in meta/ink-tertiary, reads "1 note saved", then "2 notes saved"; and the line is plain text, not a live region, and it is empty each time the panel opens (UX-DR62)' }
  - { id: AC-5, idSource: generated, text: 'Given three notes saved in this opening and a fourth half typed, when I press Cancel or Esc, then the panel closes, the three notes exist and the fourth doesn''t, focus returns to the opener, and nothing more is announced; and the button is labelled Cancel throughout' }
  - { id: AC-6, idSource: generated, text: 'Given Add another is on, when a save is refused (422) or can''t be written, then the panel stays open with both values kept and the message shown as before, and the count doesn''t change' }
  - { id: AC-7, idSource: generated, text: 'Given Add another is off, or the panel is in edit mode while the stored choice is on, when a save succeeds, then the panel closes and focus returns to the opener, as before this story; and the existing card note e2e specs pass unchanged' }
  - { id: AC-8, idSource: generated, text: 'Given the dark theme or forced-colors: active, when the checkbox renders, then it shows the dark unchecked box and the accent dark twin in the dark theme, and the system colors under forced colors, with no custom drawing' }
---

# ATDD Checklist: Story 9.2 Add several card notes in a row

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 9.2 has 8 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-8 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`. 9.2 isn't the epic's first story, so there is no epic gate to check.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotePanel.tsx`: on an `ok` result, `save()` always calls `onSaved()`, and the opener's flow unmounts the panel, refocuses the opener and announces "Card note saved.". There's no stay-open path, no checkbox, and no `lib/cardNoteAddAnother.ts`.
  - Story 9.1's `saveFromKeys` calls `requestSubmit()` on every Cmd/Ctrl+Enter, `event.repeat` included. `deferred-work.md` (code review of spec-9-1) says 9.2 must make a held key save one note, because the panel now stays open after a save.
  - `lib/catalogView.ts` and `lib/catalogSort.ts` are the pattern for a remembered preference. `announce.ts` empties both regions and sets the text about 100 ms later (`ANNOUNCE_DELAY_MS`), and the panel adopts the regions while it is open (`regionSlot`).
  - The Page input is 140px wide (`.pageField input`). The panel content is 312px wide (360px minus 2 × 24px padding), which is the width of Note.
  - **No backend change and no API leaf.** The preference never reaches the server, and `add-card-note` and its refusals are proven at API level (`test_add_card_note.py`).
- **Deferred 9.1 item applied:** the keys are pressed by name (`Meta+Enter`, `Control+Enter`), not `ControlOrMeta+Enter`, as in 9.1's checklist.

## Generation Mode

**AI generation**, run sequentially in this session, as for 9.1. Recording isn't needed: the panel already ships, and its roles and names are in `card-note-keys.ts`. Every criterion is about what the browser shows or does after a click, a key press or a reload, so all 8 leaves are E2E.

## Test Strategy

**Seeds:** `mainAt(212)` (The Left Hand of Darkness, 330 pages, Main at p.212, no notes) for add mode on Home. `mainAt(212, { others: [DUNE_WITH_NOTES] })` where a leaf also needs edit mode on Dune's Book detail (AC-1, AC-7).

**Turning Add another on.** The stored value isn't pinned (see Open for the build), so the leaves turn the box on with `check()` as an unasserted setup action, as Step 3 allows. So AC-3 to AC-7 fail red at that setup click, not at their criterion assertion. The precedent is 8.1 AC-10 and 7.1 AC-4. Their seeds, openers and panels all load first.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P1 | Add mode on Home. **The `Add another` checkbox is visible.** Then: unchecked; an `HTMLInputElement` of type `checkbox`; 16×16; `accent-color` accent; `appearance: auto`; `color-scheme: light`. Its label text is 14px (`body-sm`) in `ink`. The box sits below Page and above Save note. No count shows. A click on the label toggles the box on, and another toggles it off. Tab from Page focuses the box, which shows the `accent` 2px solid outline. Then edit mode on Book detail: no checkbox, no count, no "Add another" text. | Native control, geometry and focus ring only show in the browser |
| AC-2 | E2E | P1 | Add mode on Home with empty storage. **The box isn't checked.** Then: the key is absent. `check()` writes the key at once, before any save or close. The next opening shows the box checked, and so does an opening after a reload. `uncheck()` changes the stored value, and after a reload the box is off. Then `'sometimes'`, `'{"on":tru'` and `''` in the key each read as off after a reload. | Storage and reload are browser state |
| AC-3 | E2E | P0 | Add mode on Home, box on, Note and Page "212–213", **Save note**. **Note's value is `''`.** Then: `status` reads "Card note saved."; the panel is visible and `:modal`; Note has focus; Page still reads "212–213"; the box is still on; "See card notes, 1 note" behind the panel; one `add-card-note` with both values as typed. Second note with `Meta+Enter`: Note empties again; the status texts are exactly `[SAVED, '', SAVED]` (announced again); still modal, Note focused, Page "212–213"; "See card notes, 2 notes"; both stored at pp.212–213. Then **a held Cmd+Enter**: Meta and Enter down, the save returns (Note empty), two more Enter downs (repeats), release. No `aria-invalid` on Note, `alert` empty, Esc closes the panel, and exactly 3 `add-card-note` were sent. | The transition this story adds; the held key comes from the 9.1 review (`deferred-work.md:1005`) |
| AC-4 | E2E | P1 | Box on, `Meta+Enter`. **The count reads "1 note saved".** `Control+Enter`: "2 notes saved". It is 13px (`meta`) in `ink-tertiary`. Its box overlaps the checkbox's vertical range (the same line), and its right edge is within 1px of Note's right edge (right-aligned). Neither it nor an ancestor is a live region. Cancel and reopen: the box is still on and no count shows. The next save reads "1 note saved" again. | Text, position and ARIA in the rendered panel |
| AC-5 | E2E | P1 | Box on, three saves with `Meta+Enter`, the Cancel button labelled "Cancel" after each one, status texts `[SAVED, '', SAVED, '', SAVED]`, then a fourth half typed and **Esc**. **The panel is hidden.** Then: focus is on **Add card note**; "See card notes, 3 notes"; the stored texts are exactly the three; 3 requests; after the announce delay, the only non-empty status texts are the three SAVED. Then the same with **Cancel**: one more save, a half-typed fifth, Cancel. The panel is hidden, focus is on the opener, 4 notes, and nothing more is announced. | Close, focus and announcement order |
| AC-6 | E2E | P1 | Box on, one save ("1 note saved"). Then Note "Kept twice." with Page "400" and `Meta+Enter`. **`alert` reads "Not saved. 1 field needs attention: Page."** (the wait that the result is in). Then the count still reads "1 note saved"; the panel is open with both values kept; Page is `aria-invalid` with "Page must be between 1 and 330.", and it has focus; the library bytes are unchanged. Then a routed 503: the couldn't-save line, both values kept, the count still 1, the bytes unchanged. Then unroute and retry: Note empties, "2 notes saved", the line is gone, Page is no longer invalid and keeps "212". Two notes are stored, and 4 requests were sent. | The same 422 and 503 paths, now with the panel kept open; also the "field errors and couldn't-save line clear" half of AC-3 |
| AC-7 | E2E | P1 | Turn the stored choice on in add mode on Home, then Cancel. On Dune's Book detail, Edit p.96, change the text, **Save note**. **The edit panel is hidden.** Then: "Card note saved."; focus is on the edited note's Edit; one `edit-card-note`; the note is stored. Then on Home, add mode: the box is still checked; uncheck it; `Meta+Enter`. The panel is hidden, "Card note saved.", focus is on Add card note, and "See card notes, 1 note". | Edit mode ignores the stored choice; off is today's path |
| AC-8 | E2E | P2 | Dark theme (`prefers-color-scheme: dark`). **The box's `accent-color` is the accent dark twin `rgb(147, 181, 151)`.** Then: `color-scheme: dark` (the dark unchecked box), `appearance: auto`, and the label in `ink` dark. Under `forced-colors: active`: `forced-color-adjust: auto`, `appearance: auto`, no `background-image`, no `box-shadow`. | Theme media only in the browser |

**Primary branch per criterion.** AC-3 is the transition (a save that stays open), first from Save note, then from Cmd+Enter. AC-5 is Esc, the plan's test risk, with Cancel in the same leaf. AC-6 is the 422, since the plan names it first, with the 503 and the retry following. AC-7's new branch is edit mode with the stored choice on. The off branch is today's path, so it comes second.

**What the leaves pin (the contract for the build):**
- A native `<input type="checkbox">` named "Add another", in add mode only, between Page and the buttons. Its label wraps it or is linked to it, so a click on the label text toggles it.
- The choice is written to `localStorage['bookvie.cardNoteAddAnother']` on change, and it is read on each opening. Junk and `''` read as off.
- With it on, after an `ok` the panel stays mounted and modal. Note is `''` and focused, Page is unchanged, the regions are cleared, and "Card note saved." is set again. The count text is "N note(s) saved", outside every live region. The Main book card's "See card notes" link updates behind the panel (it resolves while the modal is open; probed).
- One note per key press: a held Cmd+Enter that repeats after a save returned sends nothing (`event.repeat`).
- Cancel and Esc after saves close the panel, add no announcement, and focus the opener. Edit mode with the choice on closes on save.

**Open for the build (not pinned):**
- **The stored value** (`'true'`, `'on'`, `'1'`…), and whether "off" writes a value or removes the key. The leaves only need "the on value" to differ from the off state and from junk.
- **The ARIA for the count** beyond "not a live region": `aria-describedby` from the checkbox is optional.
- **Where the stay-open branch lives:** in `CardNotePanel` (the epic context says it owns Add another), or through a new `onSaved` contract with `useCardNoteFlow`. Either way, the status and focus order has to hold.
- **The checkbox's margins and the 8px label gap** (`spacing.2`) are only partly pinned (see the follow-ups).

## Existing leaves this story changes (for the build)

None expected. `add-card-note.spec.ts`, `edit-card-note.spec.ts`, `card-notes.spec.ts`, `card-note-keyboard-save.spec.ts` and `card-note-keyboard-save-automate.spec.ts` all run with empty storage, so Add another is off. AC-7 requires them to pass unchanged. Things to watch:
- `add-card-note.spec.ts:360` "Tab and Shift+Tab cycle inside the panel" checks only the wrap (Note, Shift+Tab, Cancel, Tab, Note), so the new stop between Page and Save note doesn't affect it.
- `catalog-filter.spec.ts` `APP_STORAGE_KEYS` lists the app's only localStorage keys. It doesn't open the card note panel, so the new key never appears there. Update the comment only if a leaf there starts to fail.
- The axe passes over the open panel (`add-card-note.spec.ts:543`) will see the checkbox in both themes.

## Green-phase follow-ups (secondary branches, not red leaves)

- [x] **Unit, AC-2 `lib/cardNoteAddAnother.ts`:** as `catalogView.test.ts`: reads the stored on value, `null`/junk/`''` read as off, a throwing `getItem` reads as off, a throwing `setItem` doesn't throw, and the value is stored under `bookvie.cardNoteAddAnother`. (done: frontend/src/lib/cardNoteAddAnother.test.ts (5 tests, from the build))
- [x] **E2E, AC-2 throwing storage:** `Storage.prototype.getItem`/`setItem` throw (as `catalog-sort.spec.ts:228`). The box reads off, a click still toggles it for this opening, no message or `alert` appears, and a save with it on still stays open. (done: frontend/e2e/card-note-add-another-automate.spec.ts:75)
- [x] **E2E, AC-2 export and restore (AR27):** the export zip (`GET /api/export`) contains no `cardNoteAddAnother`. A restore from a file leaves the stored choice as it was, both on and off. (done: frontend/e2e/card-note-add-another-automate.spec.ts:113)
- [x] **E2E, AC-3 a 422 then a success clears the field error:** an empty Note gives "Note is required."; after filling it and saving, Note has no `aria-invalid` or description. AC-6 already covers Page and the couldn't-save line. (done: frontend/e2e/card-note-add-another-automate.spec.ts:177; Page variant card-note-add-another.spec.ts:433)
- [x] **E2E, AC-3 on Book detail:** add mode from Book detail with the box on. "Card notes (N)" updates behind the panel, and Note keeps focus. (done: frontend/e2e/card-note-add-another-automate.spec.ts:213)
- [x] **E2E, AC-3 focus lands before the `status` line** on each stay-open save (as `add-card-note.spec.ts` `watchStatus`, with focus on Note). (done: frontend/e2e/card-note-add-another-automate.spec.ts:253)
- [x] **E2E, AC-3 `Control+Enter` and a held `Control+Enter`** give one note per press, like Meta. (done: frontend/e2e/card-note-add-another-automate.spec.ts:282)
- [x] **E2E, AC-1 the label gap:** the label text starts 8px (`spacing.2`) right of the box (measure the text with a `Range`, since the label may wrap the box; probe the helper first). (done: frontend/e2e/card-note-add-another-automate.spec.ts:323)
- [x] **E2E, AC-1 axe** on the open add panel with the box on and a count shown, in both themes. (done: frontend/e2e/card-note-add-another-automate.spec.ts:335)
- [x] **E2E, AC-5 the Tab cycle with a count shown** still cycles inside the panel. (done: frontend/e2e/card-note-add-another-automate.spec.ts:365)
- [x] **E2E, AC-6 a gone Book (409) with the box on:** the panel stays open, the line shows, and the count is unchanged. (done: frontend/e2e/card-note-add-another-automate.spec.ts:404)
- [x] **E2E, AC-7 edit mode on Book detail from "See card notes" / the Card notes page:** no checkbox; a save closes. (done: frontend/e2e/card-note-add-another-automate.spec.ts:448)

## Helper probes

Run in `frontend/e2e/card-note-add-another.probe.spec.ts` (Chromium, the default 1280×720 viewport, `deviceScaleFactor` 1, `colorScheme: 'light'`, no forced colors, the same as every leaf that calls these helpers; AC-8 calls none of them) with `TZ=Europe/Madrid npx playwright test e2e/card-note-add-another.probe.spec.ts`. All 3 passed, and the file was then removed with `rm`.

- **`storedChoice`** (`card-note-add-another.ts`), on the shipping Home. It read `null` with nothing stored (expected `null`). After `setItem(KEY, 'probe-value')` it read `'probe-value'`, and it refused `'other'`. After `removeItem` it read `null` again, although another `bookvie.*` key was set.
- **`recordStatus` / `statusTexts`**, on the shipping panel. One Save note gave `[SAVED]` (expected `[SAVED]`), which refuses `[SAVED, '', SAVED]`. A second save from a reopened panel gave `[SAVED, '', SAVED]` (expected): the region is emptied before the repeat, and the recorder follows it into and out of the panel.
- **`isModal`**: `true` on the shipping open panel and on a `setContent` `<dialog>` opened with `showModal()`. It refused (`false`) a `<dialog>` opened with `show()`.
- **`boxOf`**: a `setContent` box at left 10, top 20, 30×40 gave `{ x: 10, y: 20, width: 30, height: 40 }`. It refused width 31, and it threw "not rendered" on a `display: none` element.
- **`inLiveRegion`**: `true` on the shipping `status` region (inside the open panel) and on a span inside `aria-live="polite"`. It refused (`false`) the panel heading, the Main book card's Add card note, and a plain `div`.
- **`ANY_COUNT`**: it matched "2 notes saved" and "1 note saved", and refused "Card note saved." (the `status` text inside the panel) and "notes saved".
- **`seeCardNotes`** (a locator, not a measuring helper, checked because AC-3 reads it behind the modal): with the shipping panel open, "See card notes, 2 notes" resolves (`toBeAttached`), and "…, 1 note" doesn't.
- **Reused unchanged, so not probed:** `afterAnnounceDelay` (`stats.ts`), `requestsTo`, `intentOf` (`intents.ts`), `storedBook`, `libraryBytes`, `mainAt`, `mainBookCard` (`home.ts`), `rgbOf` (`library.ts`), and the 9.1 locators in `card-note-keys.ts`. `addAnother`, `savedCount`, `noteField` and `pageField` are role and text locators.
- **Render-before-read**, checked over all 8 leaves. Each one-shot read runs after a web-first wait on what it reads:
  - AC-1's `instanceof` read and the three `boxOf` calls run after `toBeVisible` on the box, inside the drawn panel.
  - AC-2's `storedChoice` reads run after `not.toBeChecked` (the panel is drawn) and after the `expect.poll` on the key.
  - AC-3 and AC-5 start `recordStatus` after `toBeVisible` on "See card notes" (Home is drawn and the shell's regions exist). `statusTexts` is read through `expect.poll`, or after `toBeHidden` plus `afterAnnounceDelay`.
  - `isModal` runs after Note reads `''` and `toBeVisible` on the panel (AC-3).
  - AC-4's `boxOf` and `inLiveRegion` run after the count `toHaveText('2 notes saved')`. AC-4's and AC-2's absence reads (`not.toContainText(ANY_COUNT)`, `not.toBeChecked`) run after Note `toBeFocused` (the reopened panel is drawn).
  - AC-1's edit-mode absence reads (`checkbox` count 0, no count) run after Note `toBeFocused` in the edit panel.
  - AC-3's held-key absence reads (`aria-invalid`, empty `alert`) run after Note reads `''` and `afterAnnounceDelay`, and the request count after Esc closes the panel.
  - `storedBook` and `libraryBytes` read the server's file, not the page.
  - No leaf needed a fix.

## TDD Red Phase

8 skipped leaves in `frontend/e2e/card-note-add-another.spec.ts`, inside the `Story 9.2 Add several card notes in a row (ATDD)` describe. Each is a `test.skip(` carrying exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `card-note-add-another.spec.ts:57` add mode shows the native Add another checkbox under Page, tinted accent, its label clickable, the focus ring on the box; edit mode has no checkbox and no count | P1 |
| AC-2 | `card-note-add-another.spec.ts:114` the Add another choice is stored at once, survives the next opening and a reload, and junk in storage reads as off | P1 |
| AC-3 | `card-note-add-another.spec.ts:160` with Add another on, a save from Save note or Cmd+Enter keeps the modal panel open, empties Note, keeps Page, refocuses Note and announces again | P0 |
| AC-4 | `card-note-add-another.spec.ts:233` with Add another on, a plain-text count on the checkbox line reads "1 note saved", then "2 notes saved", and starts empty at each opening | P1 |
| AC-5 | `card-note-add-another.spec.ts:277` with three saved and a fourth half typed, Esc or Cancel closes the panel, keeps the three, drops the fourth, refocuses the opener and announces nothing more | P1 |
| AC-6 | `card-note-add-another.spec.ts:332` with Add another on, a refused or couldn't-save save keeps the panel open with both values and the message, and the count doesn't change | P1 |
| AC-7 | `card-note-add-another.spec.ts:401` an edit save closes the panel even while the stored choice is on, and with Add another off an add save closes it as before | P1 |
| AC-8 | `card-note-add-another.spec.ts:443` the checkbox takes the accent dark twin and the dark unchecked box in the dark theme, and the system colors under forced colors, with no custom drawing | P2 |

**Red today.** This run came after all three probes passed, on the file as it is now (after Prettier). The leaves were un-skipped in a throwaway copy, `card-note-add-another.red.spec.ts`, and run with a 30 s timeout. The copy was then removed with `rm`.
- **AC-1** fails at its first assertion (`:68`): the `Add another` checkbox isn't found.
- **AC-2** fails at its first assertion (`:126`): `not.toBeChecked` finds no checkbox.
- **AC-3** fails at its setup `check()` (`:173`), before its first assertion (`:179`, Note `''`): there is no checkbox.
- **AC-4** fails at its setup `check()` (`:244`), before `:248`.
- **AC-5** fails at its setup `check()` (`:291`), before `:304`.
- **AC-6** fails at its setup `check()` (`:344`), before `:355`.
- **AC-7** fails at its setup `check()` (`:412`), before `:423`.
- **AC-8** fails at its first assertion (`:455`): `toHaveCSS('accent-color', …)` finds no checkbox.

The seeds, openers and panels loaded in every leaf: each failure waits on the checkbox inside the open `Card note` dialog. AC-3 to AC-7 can't reach their criterion assertion until the checkbox exists, because the stored value isn't pinned (Test Strategy). The build should check that each of them goes red at its first assertion once the checkbox lands and before the stay-open path does. `git status` afterwards lists only this checklist, the spec and its helper module, with no `*.probe.*` file and no throwaway copy.

**Skipped as committed:** `TZ=Europe/Madrid npx playwright test e2e/card-note-add-another.spec.ts` gives 8 skipped. Prettier, `tsc -b` and oxlint are clean.

## Data Factories, Fixtures and Mocks

- **No new shared factory or fixture.** The leaves use `seededServer` (`fixtures.ts`), `mainAt`, `storedBook` and `libraryBytes` (`home.ts`), `requestsTo`, `intentOf`, `ADD_CARD_NOTE` and `EDIT_CARD_NOTE` (`intents.ts`), `afterAnnounceDelay` (`stats.ts`), and the 9.1 module `card-note-keys.ts` (`DUNE_WITH_NOTES`, the panel locators, `SAVED`, `COULDNT_SAVE`).
- **New helper module `frontend/e2e/card-note-add-another.ts`** for 9.2's specs and the automate leaves to come: `STORAGE_KEY`, the light and dark tokens, `ANY_COUNT`, `addAnother`, `savedCount`, `seeCardNotes`, `noteField`, `pageField`, `storedChoice`, `recordStatus`/`statusTexts`, `isModal`, `boxOf` and `inLiveRegion`.
- **Mocks:** `page.route` fulfils a 503 `couldnt_save` for `add-card-note` (AC-6), with the same body as 9.1.
- **No `data-testid`, no class names:** checkbox, dialogs, fields, buttons and links by role and name, and the count by its text.

## Next Steps (Task-by-Task Activation)

During the build (`bmad-build-auto`), for each task:
1. Remove `test.skip(` from the leaf for the current criterion (keep the title).
2. Run `TZ=Europe/Madrid npx playwright test e2e/card-note-add-another.spec.ts` from `frontend/`.
3. Check that the leaf fails first, then passes once the task is built.
4. If an activated leaf still fails, fix the implementation (a feature bug) or the leaf (a test bug), and say which in the spec.

Suggested order: AC-1, AC-8 and AC-2 (the checkbox, its style and `lib/cardNoteAddAnother`). Then AC-7 (edit mode ignores the choice; off is unchanged). Then AC-3 (the stay-open path and `event.repeat`), AC-4 (the count), AC-6 and AC-5. Re-run the existing card note specs after AC-3.

## Completion

- **Phase:** red. 8 skipped leaves in `frontend/e2e/card-note-add-another.spec.ts`, each confirmed red after the helper probes passed. AC-1, AC-2 and AC-8 fail at their first assertion. AC-3 to AC-7 fail at the setup click on the missing checkbox.
- **Checklist:** this file. **Story key:** `9-2-add-several-card-notes-in-a-row`. **Story:** `epics.md` Story 9.2.
- **Assumptions to confirm:** the count is right-aligned with Note's right edge (the panel's content edge), not with the 140px Page input. A held Cmd+Enter gives one note per press, from the 9.1 review's deferred item.
- **Next:** `bmad-build-auto` for Story 9.2, then `bmad-code-review` in a new session, then `bmad-testarch-automate`.
