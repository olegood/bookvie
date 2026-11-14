// Story 9.1 Save a card note with Cmd+Enter. Cmd+Enter and Ctrl+Enter in the
// Card note panel's Note or Page field do exactly what Save note does, in add
// mode (Home) and edit mode (Book detail): the same request with both values
// as typed, the same close, focus and "Card note saved.", the same 422 and
// couldn't-save, and the same in-flight guard. They submit the form, so the
// one save path stays the form's `submit`. Plain Enter in Note is still a new
// line. Save note carries `aria-keyshortcuts`, and there is no on-screen hint.
//
// The keys are pressed by name (`Meta+Enter`, `Control+Enter`), not as
// `ControlOrMeta+Enter`: the story promises both keys on every platform, and
// `ControlOrMeta` would test only one of them on each machine.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND_ID, libraryBytes, mainAt, mainBookCard, storedBook } from './home.ts'
import { ADD_CARD_NOTE, EDIT_CARD_NOTE, intentOf, requestsTo } from './intents.ts'

const SAVED = 'Card note saved.'
const SAVING = 'Saving the card note.'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."

const FEAR_ID = 'a1e0c0de-0000-4000-8000-000000000012'
const BEGINNING_ID = 'a1e0c0de-0000-4000-8000-000000000042'
const SPICE_ID = 'a1e0c0de-0000-4000-8000-000000000096'
const MYSTERY_ID = 'a1e0c0de-0000-4000-8000-000000000300'

/** Dune with four Card notes, seeded out of page order, with fixed ids. */
const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { id: MYSTERY_ID, text: 'The mystery of life isn’t a problem to solve.', pageStart: 300 },
    { id: FEAR_ID, text: 'Fear is the mind-killer.', pageStart: 12 },
    { id: SPICE_ID, text: 'The spice must flow.', pageStart: 96 },
    {
      id: BEGINNING_ID,
      text: 'A beginning is the time for taking the most delicate care.',
      pageStart: 42,
      pageEnd: 45,
    },
  ],
}

/** The Card note panel in add mode: a modal `dialog` named by its heading. */
function cardNotePanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Card note', exact: true })
}

/** The Card note panel in edit mode. */
function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit card note', exact: true })
}

/** The Main book card's **Add card note**. */
function addCardNote(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'Add card note', exact: true })
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

/** The block's note whose text is `text`. */
function noteItem(block: Locator, text: string): Locator {
  return block.getByRole('listitem').filter({ has: block.page().getByText(text, { exact: true }) })
}

/** A note's Edit: named "Edit p.96", so it never matches the Book's own Edit. */
function editOf(item: Locator): Locator {
  return item.getByRole('button', { name: /^Edit\b/ })
}

/**
 * Counts every `submit` event from page load on. `requestSubmit()` fires one,
 * as a press of Save note does; a key handler that calls the save directly, or
 * `form.submit()`, fires none. Added before `goto`.
 */
async function countSubmits(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = window as unknown as { submits: number }
    counter.submits = 0
    document.addEventListener('submit', () => (counter.submits += 1), true)
  })
}

async function submitsSoFar(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { submits: number }).submits)
}

/** A key that names a shortcut, as an on-screen hint would. */
const KEY_HINT = /⌘|↵|⏎|\b(Cmd|Command|Ctrl|Control|Meta|Enter|Return)\b/i

test.describe('Story 9.1 Save a card note with Cmd+Enter (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 Cmd+Enter in Note and Ctrl+Enter in Page save exactly like Save note, in add and edit mode, through the form submit', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    const added = requestsTo(page, ADD_CARD_NOTE)
    const edited = requestsTo(page, EDIT_CARD_NOTE)
    await countSubmits(page)
    await page.goto(`${server.url}/`)

    // Add mode, from the Main book card.
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await note.fill('Light is the left hand of darkness.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('212–213')
    await note.press('Meta+Enter')

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe('/')
    // Both values as typed; the server parses Page.
    expect(added).toHaveLength(1)
    expect(intentOf(added[0])).toEqual({
      bookId: LEFT_HAND_ID,
      text: 'Light is the left hand of darkness.',
      page: '212–213',
    })
    // The form's own submit, as Save note: one event for one press.
    expect(await submitsSoFar(page)).toBe(1)
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart, pageEnd }) => ({ text, pageStart, pageEnd }))).toEqual([
      { text: 'Light is the left hand of darkness.', pageStart: 212, pageEnd: 213 },
    ])

    // Edit mode, from a note's Edit on Book detail, with Ctrl+Enter in Page.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const edit = editPanel(page)
    await edit.getByRole('textbox', { name: 'Note', exact: true }).fill('He who controls the spice.')
    const pageField = edit.getByRole('textbox', { name: 'Page', exact: true })
    await pageField.fill('pp. 97–98')
    await pageField.press('Control+Enter')

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(edit).toBeHidden()
    await expect(editOf(noteItem(cardNotesBlock(page, 4), 'He who controls the spice.'))).toBeFocused()
    expect(edited).toHaveLength(1)
    expect(intentOf(edited[0])).toEqual({
      bookId: DUNE_ID,
      cardNoteId: SPICE_ID,
      text: 'He who controls the spice.',
      page: 'pp. 97–98',
    })
    // A new page load: the counter starts again at 0.
    expect(await submitsSoFar(page)).toBe(1)
    const spice = (storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).find(({ id }) => id === SPICE_ID)
    expect(spice).toMatchObject({ text: 'He who controls the spice.', pageStart: 97, pageEnd: 98 })
  })

  test('[P1] AC-2 plain Enter and Shift+Enter in Note make new lines and send nothing; Cmd+Enter then saves all three lines', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    await page.keyboard.type('Line one')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Line two')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Line three')
    await page.keyboard.press('Meta+Enter')

    // One request, after the last key: an Enter that sent would add an entry before it.
    await expect.poll(() => sent.map((request) => intentOf(request).text)).toEqual(['Line one\nLine two\nLine three'])
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text }) => text)).toEqual(['Line one\nLine two\nLine three'])
  })

  test('[P2] I/O matrix: Cmd+Enter while an input method is composing sends nothing; the next Cmd+Enter saves', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await countSubmits(page)
    const sent = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    await page.keyboard.type('Ice.')
    // Playwright can't drive an IME, so the composing key press is dispatched.
    const notPrevented = await note.evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          metaKey: true,
          isComposing: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    )

    expect(notPrevented).toBe(true)
    await expect(panel).toBeVisible()
    expect(await submitsSoFar(page)).toBe(0)
    await expect(note).toHaveValue('Ice.')

    await page.keyboard.press('Meta+Enter')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    expect(await submitsSoFar(page)).toBe(1)
    expect(sent.map((request) => intentOf(request).text)).toEqual(['Ice.'])
  })

  test('[P2] I/O matrix: Cmd+Enter or Ctrl+Enter with focus on Cancel sends nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await countSubmits(page)
    const sent = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    await page.keyboard.type('Ice.')
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    await cancel.focus()
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Meta+Enter')

    // Chromium doesn't activate a focused button on Meta+Enter (probed): the panel stays open.
    await expect(panel).toBeVisible()
    await expect(cancel).toBeFocused()
    expect(await submitsSoFar(page)).toBe(0)

    await page.keyboard.press('Control+Enter')
    await expect(panel).toBeVisible()
    await expect(cancel).toBeFocused()
    expect(await submitsSoFar(page)).toBe(0)
    expect(sent).toEqual([])
  })

  test("[P1] AC-3 Cmd+Enter with a refused field shows Save note's messages, aria-invalid, alert and focus; a couldn't-save keeps the panel open", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await expect(note).toBeFocused()
    const before = libraryBytes(server)

    // A Page outside 1 to 330, with focus in Note.
    await note.fill('Ice.')
    await pageField.fill('400')
    await note.press('Meta+Enter')

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAccessibleDescription('Page must be between 1 and 330.')
    await expect(pageField).toBeFocused()
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Ice.')
    await expect(pageField).toHaveValue('400')
    expect(libraryBytes(server)).toBe(before)

    // An empty Note, with focus in Page and Ctrl+Enter: Note takes the message and focus.
    await note.fill('  ')
    await pageField.fill('42')
    await pageField.press('Control+Enter')
    await expect(note).toHaveAccessibleDescription('Note is required.')
    await expect(note).toHaveAttribute('aria-invalid', 'true')
    await expect(note).toBeFocused()
    await expect(pageField).not.toHaveAttribute('aria-invalid', 'true')
    expect(libraryBytes(server)).toBe(before)

    // Couldn't save: the line sits in the panel above the buttons, both values kept.
    await page.route(`**${ADD_CARD_NOTE}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    await note.fill('Kept.')
    await pageField.fill('212–213')
    await note.press('Meta+Enter')
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    const lineBox = await line.boundingBox()
    const saveBox = await save.boundingBox()
    if (lineBox === null || saveBox === null) throw new Error('not rendered')
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(saveBox.y)
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(pageField).toHaveValue('212–213')
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P1] AC-4 while a save is out, a second Ctrl+Enter, a held Cmd+Enter, Save note, Cancel, Delete and Esc send nothing more and keep the panel open', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, EDIT_CARD_NOTE)
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${EDIT_CARD_NOTE}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    await note.fill('Once.')
    await note.press('Control+Enter')

    await expect(save).toHaveAttribute('aria-disabled', 'true')
    await expect(save).toHaveAccessibleDescription(SAVING)
    await expect(del).toHaveAttribute('aria-disabled', 'true')
    await expect(del).toHaveAccessibleDescription(SAVING)

    // Every way to save or leave again, while the first save is out.
    await note.press('Control+Enter')
    await note.focus()
    await page.keyboard.down('Meta')
    // A held key: the second and third downs are auto-repeats.
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.up('Enter')
    await page.keyboard.up('Meta')
    // Playwright waits on aria-disabled; force the presses a user can still make.
    await save.click({ force: true })
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await del.click({ force: true })
    await page.keyboard.press('Escape')

    // Both stay focusable while aria-disabled.
    await save.focus()
    await expect(save).toBeFocused()
    await del.focus()
    await expect(del).toBeFocused()
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Once.')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    release()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(1)
    const notes = storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]
    expect(notes).toHaveLength(4)
    expect(notes.find(({ id }) => id === SPICE_ID)).toMatchObject({ text: 'Once.', pageStart: 96 })
  })

  test('[P2] AC-5 Save note carries aria-keyshortcuts "Meta+Enter Control+Enter" in add and edit mode, with no on-screen hint', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const save = panel.getByRole('button', { name: 'Save note', exact: true })

    await expect(save).toHaveAttribute('aria-keyshortcuts', 'Meta+Enter Control+Enter')
    await expect(panel).not.toContainText(KEY_HINT)
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()

    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const edit = editPanel(page)
    const editSave = edit.getByRole('button', { name: 'Save note', exact: true })
    await expect(editSave).toHaveAttribute('aria-keyshortcuts', 'Meta+Enter Control+Enter')
    await expect(edit).not.toContainText(KEY_HINT)
  })
})
