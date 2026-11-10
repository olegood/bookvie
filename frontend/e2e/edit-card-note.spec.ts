// Story 5.2 Edit or delete a card note. A note's Edit on Book detail opens the
// Card note panel as "Edit card note", prefilled, with Delete at the left, and
// Save note sends `edit-card-note`. Delete stacks the "Delete this card note?"
// Confirm dialog over the panel; Cancel or Esc returns to the panel with focus
// on Delete, and Delete card note closes both and moves focus to the next
// note's Edit. A routed 503 keeps the panel or the dialog open with the
// couldn't-save line inside it. What both intents store and refuse (TR8,
// card_note_not_found, the Pages floor after a delete) is proven at API level
// in backend/tests/test_edit_card_note.py.
//
// RED PHASE: neither intent nor the Edit buttons exist yet, so every leaf is
// `test.skip`. Activate one at a time by changing `test.skip(` to `test(`.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, libraryBytes, storedBook } from './home.ts'
import { intentOf, requestsTo } from './intents.ts'

// Move both to e2e/intents.ts with the implementation, beside ADD_CARD_NOTE.
const EDIT_CARD_NOTE = '/api/intents/edit-card-note'
const DELETE_CARD_NOTE = '/api/intents/delete-card-note'

const SAVED = 'Card note saved.'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."

const FEAR_ID = 'a1e0c0de-0000-4000-8000-000000000012'
const BEGINNING_ID = 'a1e0c0de-0000-4000-8000-000000000042'
const SPICE_ID = 'a1e0c0de-0000-4000-8000-000000000096'
const MYSTERY_ID = 'a1e0c0de-0000-4000-8000-000000000300'
const SPICE_CREATED_AT = '2026-10-20T21:15:00+02:00'

/** Dune with four Card notes, seeded out of page order, with fixed ids. */
const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { id: MYSTERY_ID, text: 'The mystery of life isn’t a problem to solve.', pageStart: 300 },
    { id: FEAR_ID, text: 'Fear is the mind-killer.', pageStart: 12 },
    { id: SPICE_ID, text: 'The spice must flow.', pageStart: 96, createdAt: SPICE_CREATED_AT },
    {
      id: BEGINNING_ID,
      text: 'A beginning is the time for taking the most delicate care.',
      pageStart: 42,
      pageEnd: 45,
    },
  ],
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

/** The block's note whose text is `text`. */
function noteItem(block: Locator, text: string): Locator {
  return block.getByRole('listitem').filter({ has: block.page().getByText(text, { exact: true }) })
}

/**
 * A note's Edit. Its accessible name starts with "Edit"; whether it adds the
 * note's page ("Edit p.96") to tell the notes apart is the build's choice.
 */
function editOf(item: Locator): Locator {
  return item.getByRole('button', { name: /^Edit\b/ })
}

/** The Card note panel in edit mode: a modal `dialog` named by its heading. */
function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit card note', exact: true })
}

/** The Delete card note Confirm dialog, stacked over the panel. */
function confirmDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Delete this card note?', exact: true })
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box
}

/** A 503 `couldnt_save` for every POST to `path`. */
async function failWith503(page: Page, path: string): Promise<void> {
  await page.route(`**${path}`, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
    }),
  )
}

test.describe('Story 5.2 Edit or delete a card note', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-1 a note\'s Edit opens "Edit card note" prefilled with Delete at the left, and Save note runs edit-card-note', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, EDIT_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const spice = noteItem(cardNotesBlock(page, 4), 'The spice must flow.')

    // The criterion's opener: the note's own Edit in the block.
    await expect(editOf(spice)).toBeVisible()
    await editOf(spice).click()

    const panel = editPanel(page)
    await expect(panel).toBeVisible()
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    await expect(note).toHaveValue('The spice must flow.')
    await expect(pageField).toHaveValue('96')
    // Delete is added at the left of the buttons (DESIGN.md → Card note panel).
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await expect(del).toBeVisible()
    expect((await boxOf(del)).x).toBeLessThan((await boxOf(cancel)).x)
    expect((await boxOf(del)).x).toBeLessThan((await boxOf(save)).x)

    await note.fill('He who controls the spice controls the universe.')
    await pageField.fill('pp. 97–98')
    await save.click()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    // Focus returns to the opener: the edited note's Edit.
    const edited = noteItem(cardNotesBlock(page, 4), 'He who controls the spice controls the universe.')
    await expect(editOf(edited)).toBeFocused()
    await expect(edited.getByText('pp.97–98', { exact: true })).toBeVisible()
    // Page goes as typed; the server parses it as for add-card-note.
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({
      bookId: DUNE_ID,
      cardNoteId: SPICE_ID,
      text: 'He who controls the spice controls the universe.',
      page: 'pp. 97–98',
    })
    // The same note changes in place: its id and createdAt are kept.
    const notes = storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]
    expect(notes).toHaveLength(4)
    expect(notes.find((stored) => stored.id === SPICE_ID)).toEqual({
      id: SPICE_ID,
      text: 'He who controls the spice controls the universe.',
      pageStart: 97,
      pageEnd: 98,
      createdAt: SPICE_CREATED_AT,
    })
  })

  test.skip('[P0] AC-2 Delete stacks "Delete this card note?" over the panel; Cancel or Esc returns to Delete; confirming closes both and focuses the next note\'s Edit', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, DELETE_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    // The block shows p.12, pp.42–45 and p.96; the middle one is deleted.
    const beginning = noteItem(cardNotesBlock(page, 4), 'A beginning is the time for taking the most delicate care.')

    // The criterion's opener: the note's own Edit, then the panel's Delete.
    await expect(editOf(beginning)).toBeVisible()
    await editOf(beginning).click()
    const panel = editPanel(page)
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    await del.click()

    // The Confirm dialog, stacked over the still-open panel; Cancel has focus.
    const dialog = confirmDialog(page)
    await expect(dialog).toBeVisible()
    await expect(panel).toBeVisible()
    const confirmCancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    await expect(dialog.getByRole('button', { name: 'Delete card note', exact: true })).toBeVisible()
    await expect(confirmCancel).toBeFocused()

    // Cancel closes only the dialog: the panel stays, focus on Delete.
    await confirmCancel.click()
    await expect(dialog).toBeHidden()
    await expect(panel).toBeVisible()
    await expect(del).toBeFocused()

    // Esc does the same.
    await del.click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(panel).toBeVisible()
    await expect(del).toBeFocused()
    expect(sent).toHaveLength(0)

    // Confirming deletes the note and closes both.
    await del.click()
    await dialog.getByRole('button', { name: 'Delete card note', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(panel).toBeHidden()
    const block = cardNotesBlock(page, 3)
    await expect(block).toBeVisible()
    // Focus moves to the next note's Edit: p.96, now second.
    await expect(editOf(noteItem(block, 'The spice must flow.'))).toBeFocused()
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({ bookId: DUNE_ID, cardNoteId: BEGINNING_ID })
    const ids = (storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).map((stored) => stored.id)
    expect(ids.sort()).toEqual([FEAR_ID, SPICE_ID, MYSTERY_ID].sort())
  })

  test.skip("[P1] AC-3 a routed 503 keeps the Edit card note panel, then the Confirm dialog, open with Couldn't save inside, above its buttons", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await failWith503(page, EDIT_CARD_NOTE)
    await failWith503(page, DELETE_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const before = libraryBytes(server)
    const spice = noteItem(cardNotesBlock(page, 4), 'The spice must flow.')

    // The criterion's opener: the note's own Edit.
    await expect(editOf(spice)).toBeVisible()
    await editOf(spice).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    const del = panel.getByRole('button', { name: 'Delete', exact: true })
    await note.fill('Kept.')
    await pageField.fill('97–98')

    // Save note: the panel stays, values kept, the line inside above the buttons.
    await save.click()
    const panelLine = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(panelLine).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const panelLineBox = await boxOf(panelLine)
    expect(panelLineBox.y + panelLineBox.height).toBeLessThanOrEqual((await boxOf(save)).y)
    expect(panelLineBox.y + panelLineBox.height).toBeLessThanOrEqual((await boxOf(del)).y)
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(pageField).toHaveValue('97–98')
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)

    // Delete card note: the dialog stays, over the panel, with the line inside above its buttons.
    await del.click()
    const dialog = confirmDialog(page)
    const confirm = dialog.getByRole('button', { name: 'Delete card note', exact: true })
    await confirm.click()
    const dialogLine = dialog.getByText(COULDNT_SAVE, { exact: true })
    await expect(dialogLine).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const dialogLineBox = await boxOf(dialogLine)
    expect(dialogLineBox.y + dialogLineBox.height).toBeLessThanOrEqual((await boxOf(confirm)).y)
    await expect(dialog).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(pageField).toHaveValue('97–98')
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })
})
