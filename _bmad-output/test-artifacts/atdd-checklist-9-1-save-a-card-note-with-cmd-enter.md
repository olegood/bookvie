---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-11-14'
storyId: '9.1'
storyKey: '9-1-save-a-card-note-with-cmd-enter'
storyFile: '_bmad-output/planning-artifacts/epics.md#story-91-save-a-card-note-with-cmdenter'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-9-1-save-a-card-note-with-cmd-enter.md'
generatedTestFiles:
  - 'frontend/e2e/card-note-keyboard-save.spec.ts'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md (Epic 9, Story 9.1)'
  - '_bmad-output/planning-artifacts/card-note-entry-plan-2026-11-14.md (D1, §4 story cut, §5 tests)'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bookvie-2026-10-28/EXPERIENCE.md (Card note panel lines 247–266: While a save is out, Keyboard save; Keyboard line 372)'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad-output/implementation-artifacts/deferred-work.md (epic gate: no unresolved spine drift)'
  - '_bmad-output/test-artifacts/atdd-checklist-8-3-give-books-without-a-cover-a-typeset-cover.md (format)'
  - '_bmad/tea/config.yaml'
  - 'frontend/src/components/CardNotePanel.tsx, Button.tsx (disabledReason), src/lib/cardNotes.ts (SAVING_CARD_NOTE)'
  - 'backend/bookvie/intents/add_card_note.py (text trimmed at its ends only)'
  - 'frontend/e2e/add-card-note.spec.ts, edit-card-note.spec.ts (openers, seeds, in-flight pattern), intents.ts (ADD_CARD_NOTE, EDIT_CARD_NOTE, requestsTo, intentOf), home.ts (mainAt, mainBookCard, storedBook, libraryBytes, DUNE), fixtures.ts'
  - 'knowledge: data-factories, component-tdd, test-quality, test-healing-patterns, selector-resilience, timing-debugging, playwright-cli, fixture-architecture, network-first, test-levels-framework, test-priorities-matrix, ci-burn-in'
acceptanceCriteria:
  - { id: AC-1, idSource: generated, text: 'Given the Card note panel in add or edit mode, when I press Cmd+Enter or Ctrl+Enter with focus in Note or in Page, then the panel does exactly what Save note does: it sends add-card-note (or edit-card-note) with both values as typed, and on success it closes, focus returns to the opener and the status region reads "Card note saved."; and the keys submit the form through the same path as Save note (requestSubmit()), so there is one save path to test' }
  - { id: AC-2, idSource: generated, text: 'Given focus in Note, when I press Enter without Cmd or Ctrl, then a new line is inserted and nothing is sent' }
  - { id: AC-3, idSource: generated, text: 'Given an empty Note, or a Page outside 1 to the Book''s page count, when I press Cmd+Enter, then nothing is saved, and the same field messages, aria-invalid, alert announcement and focus on the first invalid field appear as with Save note; and a couldn''t-save keeps the panel open with both values kept and the line above the buttons, as with Save note' }
  - { id: AC-4, idSource: generated, text: 'Given a save is out, when I press Cmd+Enter again, hold it down, press Save note, Cancel or Esc, then exactly one request is sent and the panel stays open until the result is in; and Save note (and Delete in edit mode) stay focusable with aria-disabled="true", described "Saving the card note."' }
  - { id: AC-5, idSource: generated, text: 'Given the Card note panel, when it renders, then Save note carries aria-keyshortcuts="Meta+Enter Control+Enter", and there is no on-screen hint' }
---

# ATDD Checklist: Story 9.1 Save a card note with Cmd+Enter

## Preflight

- **Stack:** `fullstack`, auto-detected. Playwright (`frontend/playwright.config.ts`, 1.64.1) and pytest (`backend/tests/conftest.py`) are both in place.
- **Story:** `epics.md` Story 9.1 has 5 Given/When/Then criteria with no ids, so they are numbered AC-1 to AC-5 in source order (registry above). Each "And" line belongs to the criterion above it. `sprint-status.yaml` reads `backlog`.
- **Epic gate:** 9.1 is Epic 9's first story. Epic 8's retrospective is `done`, all 66 action items are `done`, and `deferred-work.md` has no "spine drift" entry without a `resolved:` line (the one text match, `:825`, only points at the resolved AD-6 entry above it). The gate is clear.
- **Config:** `tea_use_playwright_utils: false` (Traditional Patterns fragments). No Pact. `tea_browser_automation: auto` loads `playwright-cli.md`.
- **What exists today:**
  - `CardNotePanel.tsx` is a `<form onSubmit={submit} noValidate>` in a modal `dialog`. `submit` calls `save()`, which an `inFlight` ref guards. While it's out, `Save note` and `Delete` carry `disabledReason={SAVING_CARD_NOTE}` ("Saving the card note.": `aria-disabled="true"` plus that description), and `dismiss` ignores Cancel and Esc.
  - Nothing listens for keys: there is no `onKeyDown` and no `aria-keyshortcuts`. Plain Enter in the Page `input` already submits (implicit submission). Plain Enter in the Note `textarea` is a new line.
  - `add-card-note` trims only the text's outer whitespace (`add_card_note.py:66`), so a note's inner newlines are stored.
  - **No backend change and no API leaf.** Both intents and what they refuse are already proven at API level (`test_add_card_note.py`, `test_edit_card_note.py`).

## Generation Mode

**AI generation**, run sequentially in this session, as for 8.1 to 8.3. Recording isn't needed: the panel ships already, and the openers, roles and names are in `add-card-note.spec.ts` and `edit-card-note.spec.ts`. All 5 criteria are about what the browser does on a key press, so all 5 leaves are E2E.

## Test Strategy

**Seeds:** `mainAt(212)` (The Left Hand of Darkness, 330 pages, Main at p.212, no notes) for add mode on Home, and Dune with four notes with fixed ids (as `edit-card-note.spec.ts`) for edit mode on Book detail.

**The keys.** The leaves press `Meta+Enter` and `Control+Enter` by name, not `ControlOrMeta+Enter`. The criteria promise both keys on every platform, and `ControlOrMeta` would test only one of them on each machine (Meta on the Mac, Control on Linux CI). That covers the plan's "plus one explicit `Control+Enter` test".

**The one save path.** A `submit` listener on `document`, added by `addInitScript` before `goto`, counts every `submit` event. `requestSubmit()` fires `submit`, but a handler that calls `save()` directly doesn't, and neither does `form.submit()`. So "one `submit` per key press" pins the same path as **Save note** without reading the component.

| AC | Level | Priority | Leaf (first assertion in bold) | Why this level |
|---|---|---|---|---|
| AC-1 | E2E | P0 | Add mode on Home: type in Note, set Page to "212–213", press `Meta+Enter` in Note. **`status` reads "Card note saved."** Then: the panel is hidden, focus is on **Add card note**, exactly one `add-card-note` was sent with `{ bookId, text, page: '212–213' }` as typed, one `submit` event fired, and the note is stored at pp.212–213. Then edit mode on Book detail: Edit p.96, change the text, focus Page, press `Control+Enter`. `status` reads "Card note saved." again, the panel is hidden, focus is on the edited note's Edit, one `edit-card-note` was sent with both values as typed, and one more `submit` fired. | Key handling and focus only meet in the browser |
| AC-2 | E2E | P1 | Type "Line one", press Enter, type "Line two", press Shift+Enter, type "Line three", then press `Meta+Enter`. **The texts sent to `add-card-note` are exactly `['Line one\nLine two\nLine three']`.** This one assertion shows that neither Enter sent anything (that would add an earlier entry and close the panel) and that both put a new line in the value. Then: the stored note keeps both newlines. | A "keep as is" criterion: plain Enter already makes a new line, so the leaf ends with the new key to be red today (as 8.3 AC-5) |
| AC-3 | E2E | P1 | Note "Ice.", Page "400", `Meta+Enter` in Note. **`alert` reads "Not saved. 1 field needs attention: Page."** Then: Page has `aria-invalid="true"`, the description "Page must be between 1 and 330." and focus; Note isn't invalid; the panel is open with both values, and the library bytes don't change. Then an empty Note with Page "42" and `Control+Enter` in Page: Note is invalid with "Note is required." and has focus. Then a routed 503 and `Meta+Enter`: the couldn't-save line is in the panel above **Save note**, both values are kept, and `status` is empty. | The same 422 and 503 paths as Save note, reached by keys |
| AC-4 | E2E | P1 | Edit mode, the save held by a route. Change the text, press `Control+Enter` in Note. **Save note has `aria-disabled="true"`.** Then: Save note and Delete are both described "Saving the card note." and both take focus. With the save still out: `Control+Enter` again, `Meta+Enter` held (Enter down three times, so two are repeats), Save note forced, Cancel, Delete forced, Esc. The panel is still open with the new text, and no Confirm dialog opened. Release: `status` reads "Card note saved.", the panel closes, exactly one `edit-card-note` was sent, and the note holds the new text. | In-flight timing |
| AC-5 | E2E | P2 | Add mode on Home. **Save note has `aria-keyshortcuts` "Meta+Enter Control+Enter".** Then: the panel's visible text names no key (no ⌘, Cmd, Ctrl, Control, Meta, Enter or ↵). The same in edit mode on Book detail. | One attribute, in both modes |

**Primary branch per criterion.** AC-1 is the add-mode Note press (the transition), with edit mode via Page in the same leaf. AC-3 is the out-of-range Page from Note, the first branch the criterion names after the empty Note, since both go through the same 422 path; the empty Note and the 503 follow in the same leaf. AC-4 runs in edit mode, the only mode that has Delete. The Save note half was already proven for add mode in 5.1 (`add-card-note.spec.ts`, "A second Save note press while the save is out sends nothing").

**What the leaves pin (the contract for the build):**
- `Meta+Enter` and `Control+Enter`, in Note or Page, in add or edit mode, fire the form's `submit` once per press. So they go through `requestSubmit()` (with or without a submitter), not a direct `save()` call. Everything after that is Save note's existing path.
- Neither key inserts a new line in Note: AC-4's Note still reads "Once." after three key presses, so the handler must `preventDefault()`. Plain Enter and Shift+Enter still insert one.
- While a save is out, `Save note` and `Delete` are `aria-disabled="true"`, described "Saving the card note.", and focusable. Repeated, held or forced presses, Cancel, Delete and Esc send nothing and keep the panel open. No Confirm dialog opens.
- `Save note` has `aria-keyshortcuts="Meta+Enter Control+Enter"` in both modes. No visible text in the panel names a key.

**Open for the build (not pinned):**
- **Where the listener lives:** the form's `onKeyDown`, or each field's. A form-level listener also catches the keys on the panel's buttons. The criteria name only Note and Page, and nothing pins the buttons either way.
- **`event.repeat`:** the in-flight guard already turns a held key into one request, so ignoring repeats is optional.
- **Extra modifiers** (Cmd+Shift+Enter, Ctrl+Alt+Enter) aren't specified.
- **IME composition:** Cmd+Enter while an input method is composing (`event.isComposing`). Not specified, and Oleg types in English. Low.
- **What today's Chromium does** (probed on the shipping app, 2026-11-14): `Meta+Enter` and `Control+Enter` do nothing in Note or Page (no request, no new line). Plain Enter in Note adds a new line, and plain Enter in Page saves (implicit submission). So every branch in the leaves is red today, the Page branches included.

## Existing leaves this story changes (for the build)

None expected. The leaves in `add-card-note.spec.ts`, `edit-card-note.spec.ts` and `card-notes.spec.ts` use **Save note**, Cancel and Esc, and none of them reads `aria-keyshortcuts` or key presses other than plain Enter, Tab and Esc. The axe passes over the open panel (`add-card-note.spec.ts`, `edit-card-note.spec.ts`) will see the new attribute, which is valid on a `button`. Re-run them.

## Green-phase follow-ups (secondary branches, not red leaves)

- [ ] **E2E, AC-1 the other two field and key pairs:** `Control+Enter` in Note and `Meta+Enter` in Page. Also add mode from Book detail, where focus returns to that Add card note.
- [ ] **E2E, AC-1 focus lands before the `status` line** on a keyboard save, as `add-card-note.spec.ts` `watchStatus` proves for Save note.
- [ ] **E2E, AC-3 in edit mode:** a refused Page and a 503 through `Control+Enter`, with the line above the buttons and Delete still at the left.
- [ ] **E2E, AC-4 in add mode:** `Meta+Enter` with the save held, then the same presses, gives one `add-card-note`.
- [ ] **E2E, AC-4 a refusal after a held key:** a 422 for the held save leaves the panel open with the field error. Save note is no longer `aria-disabled`, and the next `Meta+Enter` sends one more request.
- [ ] **E2E, AC-4 the keys while the Delete Confirm dialog is open:** `Meta+Enter` there neither saves the panel nor confirms the delete (the dialog is the panel's sibling, outside the form).
- [ ] **E2E, AC-5 only Save note carries `aria-keyshortcuts`:** not Cancel or Delete. Axe on the open panel in both themes stays clean (covered by re-running the existing axe leaves).

## Helper probes

Run in `frontend/e2e/card-note-keys.probe.spec.ts` (Chromium, the default 1280×720 viewport, `deviceScaleFactor` 1, `colorScheme: 'light'`, no forced colors, the same as every leaf) with `TZ=Europe/Madrid npx playwright test e2e/card-note-keys.probe.spec.ts`. All 3 passed, and the file was then removed with `rm`.

- **`countSubmits` / `submitsSoFar`** (`card-note-keyboard-save.spec.ts`), on the shipping panel from `mainAt(212)`. It read **0** with the panel open and nothing submitted, and **1** after one **Save note** click with "Card note saved." shown (expected 0, then 1). It refused `form.submit()` on a fixture form: still 1. It counted `requestSubmit()` on a fixture form: 2.
- **`KEY_HINT`** (`card-note-keyboard-save.spec.ts`). On the shipping add panel (no hint) it matched nothing, as expected. In `setContent` fixtures it matched each of "⌘↵", "⌘ Enter", "Ctrl+Enter", "Cmd+Return" and "Press Control and Enter". It refused "Save note Cancel Entered Controlled".
- **Reused unchanged, so not probed:** `requestsTo`, `intentOf` (`intents.ts`), `storedBook`, `libraryBytes`, `mainAt`, `mainBookCard` (`home.ts`). The locator helpers `cardNotePanel`, `editPanel`, `cardNotesBlock`, `noteItem`, `editOf` and `addCardNote` are copied as they are from `add-card-note.spec.ts` and `edit-card-note.spec.ts`. They are role locators, not measuring helpers.
- **Render-before-read**, checked over all 5 leaves. Each one-shot read runs after a web-first wait on what it reads:
  - `submitsSoFar` and `page.url()` run after `status` reads "Card note saved." and focus is on the opener (AC-1).
  - The couldn't-save line's `boundingBox` runs after `toBeVisible` on the line (AC-3).
  - `not.toContainText(KEY_HINT)` runs after `toHaveAttribute('aria-keyshortcuts', …)` on Save note proves the panel is drawn (AC-5).
  - AC-4's absence read (`alertdialog` count 0) runs after `toBeVisible` on the panel.
  - AC-2 and AC-3 wait for the opening focus on Note (shipping behavior) before the first key press.
  - `storedBook` and `libraryBytes` read the server's file, not the page.
  - No leaf needed a fix.

## TDD Red Phase

5 skipped leaves in `frontend/e2e/card-note-keyboard-save.spec.ts`, inside the `Story 9.1 Save a card note with Cmd+Enter (ATDD)` describe. Each is a `test.skip(` carrying exactly one `[P*] AC-n`.

| AC | Leaf | Priority |
|---|---|---|
| AC-1 | `card-note-keyboard-save.spec.ts:98` Cmd+Enter in Note and Ctrl+Enter in Page save exactly like Save note, in add and edit mode, through the form submit | P0 |
| AC-2 | `card-note-keyboard-save.spec.ts:159` plain Enter and Shift+Enter in Note make new lines and send nothing; Cmd+Enter then saves all three lines | P1 |
| AC-3 | `card-note-keyboard-save.spec.ts:186` Cmd+Enter with a refused field shows Save note's messages, aria-invalid, alert and focus; a couldn't-save keeps the panel open | P1 |
| AC-4 | `card-note-keyboard-save.spec.ts:251` while a save is out, a second Ctrl+Enter, a held Cmd+Enter, Save note, Cancel, Delete and Esc send nothing more and keep the panel open | P1 |
| AC-5 | `card-note-keyboard-save.spec.ts:312` Save note carries aria-keyshortcuts "Meta+Enter Control+Enter" in add and edit mode, with no on-screen hint | P2 |

**Red today.** This run came after both probes passed, on the file as committed (after Prettier). Each leaf was un-skipped in a throwaway copy `card-note-keyboard-save.red.spec.ts` and run with a 30 s timeout, and the copy was then removed with `rm`:
- **AC-1** fails at its first assertion (`:116`): `status` is `""`, not "Card note saved.".
- **AC-2** fails at its first assertion (`:179`): the texts sent are `[]`.
- **AC-3** fails at its first assertion (`:206`): `alert` is `""`.
- **AC-4** fails at its first assertion (`:273`): Save note has no `aria-disabled`.
- **AC-5** fails at its first assertion (`:323`): Save note has no `aria-keyshortcuts`.

No leaf failed in setup: both seeds loaded, and every opener and the opening focus worked. `git status` afterwards lists only this checklist and the spec, with no `*.probe.*` file and no throwaway copy.

**Skipped as committed:** `TZ=Europe/Madrid npx playwright test e2e/card-note-keyboard-save.spec.ts` gives 5 skipped. Prettier, `tsc -b` and oxlint are clean.

## Data Factories, Fixtures and Mocks

- **No new shared factory or fixture.** The leaves use `seededServer` (`fixtures.ts`), `mainAt`, `DUNE`, `storedBook` and `libraryBytes` (`home.ts`), and `requestsTo`, `intentOf`, `ADD_CARD_NOTE` and `EDIT_CARD_NOTE` (`intents.ts`).
- **Local to the spec:** `DUNE_WITH_NOTES` (as in `edit-card-note.spec.ts`, fixed ids), the panel and block locators, `countSubmits`/`submitsSoFar`, and `KEY_HINT`.
- **Mocks:** `page.route` holds the `edit-card-note` request (AC-4) and fulfils a 503 `couldnt_save` for `add-card-note` (AC-3), as the 5.1 and 5.2 specs do.
- **No `data-testid`, no class names:** dialogs, fields and buttons by role and name.

## Next Steps (Task-by-Task Activation)

During the build (`bmad-build-auto`), for each task:
1. Remove `test.skip(` from the leaf for the current criterion (keep the title).
2. Run `TZ=Europe/Madrid npx playwright test e2e/card-note-keyboard-save.spec.ts` from `frontend/`.
3. Check that the leaf fails first, then passes once the task is built.
4. If an activated leaf still fails, fix the implementation (a feature bug) or the leaf (a test bug), and say which in the spec.

Suggested order: AC-5 (the attribute), then AC-1 (the key handler with `requestSubmit()`), then AC-2, AC-3 and AC-4, which should go green with no further code once AC-1's handler calls `preventDefault()`.

## Completion

- **Phase:** red. 5 skipped leaves in `frontend/e2e/card-note-keyboard-save.spec.ts`, each confirmed red at its first assertion after the helper probes passed.
- **Checklist:** this file. **Story key:** `9-1-save-a-card-note-with-cmd-enter`. **Story:** `epics.md` Story 9.1.
- **Assumption to confirm:** both keys work on every platform (Meta and Control both save, on the Mac and elsewhere), as the criteria and EXPERIENCE.md say. The leaves press both by name.
- **Next:** `bmad-build-auto` for Story 9.1, then `bmad-code-review` in a new session, then `bmad-testarch-automate`.
