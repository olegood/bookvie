// Story 9.1 Save a card note with Cmd+Enter: test automation after the story
// was done, beside the ATDD leaves in card-note-keyboard-save.spec.ts. The
// other two field and key pairs (Ctrl+Enter in Note, Cmd+Enter in Page), add
// mode from Book detail, and focus landing on the opener before "Card note
// saved." is read. Edit mode's refused Page and couldn't-save through
// Ctrl+Enter. Add mode's in-flight guard against every second press, and a
// refused held save, after which the next Cmd+Enter sends one more request.
// The keys while the Delete Confirm dialog is open, which sits outside the
// form. And Save note being the only control that names the keys.
//
// As in the ATDD leaves, the keys are pressed by name (`Meta+Enter`,
// `Control+Enter`), never as `ControlOrMeta+Enter`, so both run on every
// machine. A held key auto-repeating after a refusal is not tested here: it
// re-sends the request, a known defect deferred to Story 9.2.

import type { Locator, Page } from '@playwright/test'
import {
  addCardNote,
  cardNotePanel,
  cardNotesBlock,
  COULDNT_SAVE,
  countSubmits,
  DUNE_WITH_NOTES,
  editOf,
  editPanel,
  noteItem,
  SAVED,
  SAVING,
  SPICE_ID,
  submitsSoFar,
} from './card-note-keys.ts'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND_ID, libraryBytes, mainAt, storedBook } from './home.ts'
import { ADD_CARD_NOTE, DELETE_CARD_NOTE, EDIT_CARD_NOTE, intentOf, requestsTo } from './intents.ts'

const KEYS = 'Meta+Enter Control+Enter'

/**
 * Records, each time the `status` region gets text, that text and the
 * accessible name of the focused element at that moment: focus must land
 * before the line is set. As `add-card-note.spec.ts` has it.
 */
async function watchStatus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]')
    if (region === null) throw new Error('no status region')
    const seen: { text: string; focused: string }[] = []
    ;(window as unknown as { statusSeen: typeof seen }).statusSeen = seen
    new MutationObserver(() => {
      const text = region.textContent ?? ''
      if (text === '') return
      const active = document.activeElement
      seen.push({ text, focused: active?.getAttribute('aria-label') ?? active?.textContent ?? '' })
    }).observe(region, { childList: true, characterData: true, subtree: true })
  })
}

async function statusSeen(page: Page): Promise<{ text: string; focused: string }[]> {
  return page.evaluate(() => (window as unknown as { statusSeen: { text: string; focused: string }[] }).statusSeen)
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box
}

/** The text of every control in `scope` that carries `aria-keyshortcuts`. */
function keyshortcutOwners(scope: Locator): Promise<string[]> {
  return scope.evaluate((root) =>
    Array.from(root.querySelectorAll('[aria-keyshortcuts]')).map((element) => element.textContent ?? ''),
  )
}

/** Holds every request to `path` until `release()`, then lets it through to the server. */
async function holdRequests(page: Page, path: string): Promise<() => void> {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(`**${path}`, async (route) => {
    await held
    await route.continue()
  })
  return release
}

/** The Delete card note Confirm dialog, stacked over the edit panel. */
function confirmDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
}

test.describe('Story 9.1 Save a card note with Cmd+Enter (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-1 Ctrl+Enter in Note and Cmd+Enter in Page on Home each send one add-card-note with both values as typed', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await countSubmits(page)
    await page.goto(`${server.url}/`)

    // Ctrl+Enter, with focus in Note.
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    await note.fill('Light is the left hand of darkness.')
    await pageField.fill('212–213')
    await note.press('Control+Enter')

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe('/')
    expect(added).toHaveLength(1)
    expect(intentOf(added[0])).toEqual({
      bookId: LEFT_HAND_ID,
      text: 'Light is the left hand of darkness.',
      page: '212–213',
    })
    expect(await submitsSoFar(page)).toBe(1)

    // Cmd+Enter, with focus in Page.
    await addCardNote(page).click()
    await note.fill('Darkness is the right hand of light.')
    await pageField.fill('p. 214')
    await pageField.press('Meta+Enter')

    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    expect(added).toHaveLength(2)
    expect(intentOf(added[1])).toEqual({
      bookId: LEFT_HAND_ID,
      text: 'Darkness is the right hand of light.',
      page: 'p. 214',
    })
    // The same page load: one more submit for one more press.
    expect(await submitsSoFar(page)).toBe(2)
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart, pageEnd }) => ({ text, pageStart, pageEnd }))).toEqual([
      { text: 'Light is the left hand of darkness.', pageStart: 212, pageEnd: 213 },
      { text: 'Darkness is the right hand of light.', pageStart: 214, pageEnd: null },
    ])
  })

  test("[P1] AC-1 Cmd+Enter in add mode from Book detail saves and returns focus to Book detail's Add card note", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    const added = requestsTo(page, ADD_CARD_NOTE)
    await countSubmits(page)
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    const main = page.getByRole('main')
    const opener = main.getByRole('button', { name: 'Add card note', exact: true })
    await expect(main.getByRole('region', { name: 'Card notes', exact: true })).toContainText('No card notes yet.')
    await watchStatus(page)

    await opener.click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    await note.fill('The spice must flow.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('96')
    await note.press('Meta+Enter')

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(opener).toBeFocused()
    expect(new URL(page.url()).pathname).toBe(`/book/${DUNE_ID}`)
    expect(await statusSeen(page)).toEqual([{ text: SAVED, focused: 'Add card note' }])
    expect(added).toHaveLength(1)
    expect(intentOf(added[0])).toEqual({ bookId: DUNE_ID, text: 'The spice must flow.', page: '96' })
    expect(await submitsSoFar(page)).toBe(1)
    const block = cardNotesBlock(page, 1)
    await expect(block.getByRole('listitem')).toHaveCount(1)
    await expect(block.getByText('p.96', { exact: true })).toBeVisible()
  })

  test('[P1] AC-1 on a keyboard save, focus is on Add card note before the status line reads "Card note saved."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    await expect(addCardNote(page)).toBeVisible()
    await watchStatus(page)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await note.fill('Ice.')
    await note.press('Meta+Enter')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    expect(await statusSeen(page)).toEqual([{ text: SAVED, focused: 'Add card note' }])

    // And again with Ctrl+Enter in Page.
    await addCardNote(page).click()
    await note.fill('Snow.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).press('Control+Enter')
    await expect(panel).toBeHidden()
    await expect
      .poll(() => statusSeen(page))
      .toEqual([
        { text: SAVED, focused: 'Add card note' },
        { text: SAVED, focused: 'Add card note' },
      ])
  })

  test('[P1] AC-3 in edit mode, Ctrl+Enter with a refused Page shows its message, aria-invalid, alert and focus, and saves nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const edited = requestsTo(page, EDIT_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const before = libraryBytes(server)

    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    await expect(note).toBeFocused()
    await note.fill('He who controls the spice.')
    // Dune has 412 pages.
    await pageField.fill('500')
    await note.press('Control+Enter')

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAccessibleDescription('Page must be between 1 and 412.')
    await expect(pageField).toBeFocused()
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('He who controls the spice.')
    await expect(pageField).toHaveValue('500')
    expect(edited).toHaveLength(1)
    expect(intentOf(edited[0])).toEqual({
      bookId: DUNE_ID,
      cardNoteId: SPICE_ID,
      text: 'He who controls the spice.',
      page: '500',
    })
    expect(libraryBytes(server)).toBe(before)
  })

  test("[P1] AC-3 in edit mode, Ctrl+Enter that couldn't save shows the line above the buttons, keeps both values, and Delete stays at the left", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.route(`**${EDIT_CARD_NOTE}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const before = libraryBytes(server)

    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    await note.fill('Kept.')
    await pageField.fill('97–98')
    await pageField.press('Control+Enter')

    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const lineBox = await boxOf(line)
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual((await boxOf(save)).y)
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual((await boxOf(del)).y)
    // Delete is still at the left of the buttons.
    expect((await boxOf(del)).x).toBeLessThan((await boxOf(save)).x)
    expect((await boxOf(del)).x).toBeLessThan((await boxOf(cancel)).x)
    await expect(save).not.toHaveAttribute('aria-disabled', 'true')
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(pageField).toHaveValue('97–98')
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P1] AC-4 in add mode, while a Cmd+Enter save is out, a second press, a held key, Save note, Cancel and Esc send nothing more', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    const release = await holdRequests(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await note.fill('Once.')
    await note.press('Meta+Enter')

    await expect(save).toHaveAttribute('aria-disabled', 'true')
    await expect(save).toHaveAccessibleDescription(SAVING)
    await expect.poll(() => sent.length).toBe(1)

    // Every way to save or leave again, while the first save is out.
    await note.press('Meta+Enter')
    await note.focus()
    await page.keyboard.down('Control')
    // A held key: the second and third downs are auto-repeats.
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.up('Enter')
    await page.keyboard.up('Control')
    // Playwright waits on aria-disabled; force the press a user can still make.
    await save.click({ force: true })
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.keyboard.press('Escape')

    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Once.')
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(sent).toHaveLength(1)
    release()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(sent).toHaveLength(1)
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart }) => ({ text, pageStart }))).toEqual([{ text: 'Once.', pageStart: 212 }])
  })

  test('[P2] AC-4 a held Cmd+Enter save that comes back refused leaves the panel open with the field error; the next Cmd+Enter sends one more request', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    const release = await holdRequests(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await note.fill('Ice.')
    // The Left Hand of Darkness has 330 pages.
    await pageField.fill('400')
    await note.press('Meta+Enter')
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    release()

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAccessibleDescription('Page must be between 1 and 330.')
    await expect(pageField).toBeFocused()
    await expect(panel).toBeVisible()
    await expect(save).not.toHaveAttribute('aria-disabled', 'true')
    expect(sent).toHaveLength(1)

    // Fixed, and one more Cmd+Enter: exactly one more request, which saves.
    await pageField.fill('212')
    await pageField.press('Meta+Enter')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    expect(sent.map((request) => intentOf(request).page)).toEqual(['400', '212'])
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart }) => ({ text, pageStart }))).toEqual([{ text: 'Ice.', pageStart: 212 }])
  })

  test('[P2] AC-4 Cmd+Enter and Ctrl+Enter inside the Delete Confirm dialog neither save the panel nor confirm the delete', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const edited = requestsTo(page, EDIT_CARD_NOTE)
    const deleted = requestsTo(page, DELETE_CARD_NOTE)
    await countSubmits(page)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const before = libraryBytes(server)

    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    // A changed Note, so a save from the dialog would show in the request and the file.
    await note.fill('Changed.')
    await del.click()

    const dialog = confirmDialog(page)
    const confirm = dialog.getByRole('button', { name: 'Delete card note', exact: true })
    const dialogCancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    await expect(dialogCancel).toBeFocused()

    for (const target of [dialogCancel, confirm]) {
      await target.focus()
      await expect(target).toBeFocused()
      for (const keys of ['Meta+Enter', 'Control+Enter']) {
        await page.keyboard.press(keys)
        await expect(dialog).toBeVisible()
        await expect(panel).toBeVisible()
        await expect(target).toBeFocused()
      }
    }

    // Back to the panel: nothing was sent, and the Note is as typed.
    await dialogCancel.click()
    await expect(dialog).toBeHidden()
    await expect(del).toBeFocused()
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Changed.')
    expect(await submitsSoFar(page)).toBe(0)
    expect(edited).toEqual([])
    expect(deleted).toEqual([])
    await expect(cardNotesBlock(page, 4)).toBeAttached()
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P2] AC-5 only Save note carries aria-keyshortcuts: Cancel in both modes and Delete in edit mode have none', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    await expect(save).toHaveAttribute('aria-keyshortcuts', KEYS)
    await expect(cancel).not.toHaveAttribute('aria-keyshortcuts')
    expect(await keyshortcutOwners(panel)).toEqual(['Save note'])
    await cancel.click()
    await expect(panel).toBeHidden()

    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const edit = editPanel(page)
    const editSave = edit.getByRole('button', { name: 'Save note', exact: true })
    await expect(editSave).toHaveAttribute('aria-keyshortcuts', KEYS)
    await expect(edit.getByRole('button', { name: 'Cancel', exact: true })).not.toHaveAttribute('aria-keyshortcuts')
    await expect(edit.getByRole('button', { name: 'Delete', exact: true })).not.toHaveAttribute('aria-keyshortcuts')
    expect(await keyshortcutOwners(edit)).toEqual(['Save note'])
  })
})
