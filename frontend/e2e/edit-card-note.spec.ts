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
// The follow-ups: a 422 under Page, a range prefill saved unchanged, Cancel
// and Esc in the edit panel, an edit that moves the note out of the block, the
// last note deleted, a stale tab's card_note_not_found, and axe on the edit
// panel and the stacked Confirm dialog.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, libraryBytes, storedBook } from './home.ts'
import { DELETE_CARD_NOTE, EDIT_CARD_NOTE, intentOf, requestsTo } from './intents.ts'
import { settled } from './library.ts'

const SAVED = 'Card note saved.'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const NOTE_GONE = "This card note isn't there anymore."
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

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

/** A note's Edit: named "Edit p.96", so it never matches the Book's own Edit. */
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

  test('[P0] AC-1 a note\'s Edit opens "Edit card note" prefilled with Delete at the left, and Save note runs edit-card-note', async ({
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

  test('[P0] AC-2 Delete stacks "Delete this card note?" over the panel; Cancel or Esc returns to Delete; confirming closes both and focuses the next note\'s Edit', async ({
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

  test("[P1] AC-3 a routed 503 keeps the Edit card note panel, then the Confirm dialog, open with Couldn't save inside, above its buttons", async ({
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

  test('[P1] AC-1 a refused Page shows its message under Page, and nothing is saved', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const before = libraryBytes(server)
    const spice = noteItem(cardNotesBlock(page, 4), 'The spice must flow.')
    await expect(editOf(spice)).toHaveAccessibleName('Edit p.96')
    await editOf(spice).click()
    const panel = editPanel(page)
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    // Opening focus is in Note.
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toBeFocused()

    // Dune has 412 pages, so 413 is out of range (400 would be in range).
    await pageField.fill('413')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(panel.getByText('Page must be between 1 and 412.', { exact: true })).toBeVisible()
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toBeFocused()
    await expect(panel).toBeVisible()
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P1] AC-1 a range prefills Page as "42–45" and saves back unchanged', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, EDIT_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const text = 'A beginning is the time for taking the most delicate care.'
    const beginning = noteItem(cardNotesBlock(page, 4), text)
    await expect(editOf(beginning)).toHaveAccessibleName('Edit pp.42–45')
    await editOf(beginning).click()
    const panel = editPanel(page)
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('42–45')

    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(cardNotesBlock(page, 4), text))).toBeFocused()
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({ bookId: DUNE_ID, cardNoteId: BEGINNING_ID, text, page: '42–45' })
    const stored = (storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).find(
      (note) => note.id === BEGINNING_ID,
    )
    expect([stored?.pageStart, stored?.pageEnd]).toEqual([42, 45])
  })

  test("[P1] AC-1 Cancel and Esc in the edit panel send nothing and return focus to the note's Edit", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, EDIT_CARD_NOTE)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const spice = noteItem(cardNotesBlock(page, 4), 'The spice must flow.')
    const panel = editPanel(page)

    await editOf(spice).click()
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Not kept.')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(editOf(spice)).toBeFocused()

    await editOf(spice).click()
    // The panel opens on the stored note again, not the cancelled text.
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('The spice must flow.')
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(editOf(spice)).toBeFocused()
    expect(sent).toHaveLength(0)
    await expect(page.getByRole('status')).toHaveText('')
  })

  test('[P1] AC-1 an edit that moves the note past the three shown focuses the block heading', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('400')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    const block = cardNotesBlock(page, 4)
    await expect(block.getByRole('heading', { name: 'Card notes (4)', exact: true })).toBeFocused()
    // p.300 moved in; p.400 is fourth, out of the block.
    await expect(block.getByText('The spice must flow.', { exact: true })).toHaveCount(0)
    await expect(noteItem(block, 'The mystery of life isn’t a problem to solve.')).toBeVisible()
  })

  test('[P1] AC-2 deleting the only note leaves "No card notes yet." with focus on the heading', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [{ ...DUNE, cardNotes: [{ id: SPICE_ID, text: 'The spice must flow.', pageStart: 96 }] }],
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 1), 'The spice must flow.')).click()
    await editPanel(page).getByRole('button', { name: 'Delete', exact: true }).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete card note', exact: true }).click()

    await expect(confirmDialog(page)).toBeHidden()
    await expect(editPanel(page)).toBeHidden()
    const block = page.getByRole('main').getByRole('region', { name: 'Card notes', exact: true })
    await expect(block.getByText('No card notes yet.', { exact: true })).toBeVisible()
    await expect(block.getByRole('heading', { name: 'Card notes', exact: true })).toBeFocused()
    // Nothing is announced after a delete.
    await expect(page.getByRole('status')).toHaveText('')
    expect(storedBook(server, DUNE_ID).cardNotes).toEqual([])
  })

  test('[P1] AC-2 deleting the last note with none after it focuses the block heading', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        {
          ...DUNE,
          cardNotes: [
            { id: FEAR_ID, text: 'Fear is the mind-killer.', pageStart: 12 },
            { id: SPICE_ID, text: 'The spice must flow.', pageStart: 96 },
          ],
        },
      ],
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 2), 'The spice must flow.')).click()
    await editPanel(page).getByRole('button', { name: 'Delete', exact: true }).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete card note', exact: true }).click()

    const block = cardNotesBlock(page, 1)
    await expect(block.getByRole('heading', { name: 'Card notes (1)', exact: true })).toBeFocused()
  })

  test('[P1] AC-2 while delete-card-note is out, both Confirm buttons are aria-disabled and Esc is ignored', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const sent = requestsTo(page, DELETE_CARD_NOTE)
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${DELETE_CARD_NOTE}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    await panel.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = confirmDialog(page)
    const confirm = dialog.getByRole('button', { name: 'Delete card note', exact: true })
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })

    const first = page.waitForRequest((request) => new URL(request.url()).pathname === DELETE_CARD_NOTE)
    await confirm.click()
    await first
    await expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await expect(cancel).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(panel).toBeVisible()
    // Playwright waits on aria-disabled; force the presses a user can still make.
    await confirm.click({ force: true })
    await cancel.click({ force: true })
    await expect(dialog).toBeVisible()
    release()

    await expect(dialog).toBeHidden()
    await expect(panel).toBeHidden()
    await expect(cardNotesBlock(page, 3)).toBeVisible()
    expect(sent).toHaveLength(1)
  })

  test('[P1] AC-1 while edit-card-note is out, Delete is aria-disabled and opens nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${EDIT_CARD_NOTE}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const remove = panel.getByRole('button', { name: 'Delete', exact: true })

    const sent = page.waitForRequest((request) => new URL(request.url()).pathname === EDIT_CARD_NOTE)
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await sent
    await expect(remove).toHaveAttribute('aria-disabled', 'true')
    // Playwright waits on aria-disabled; force the press a user can still make.
    await remove.click({ force: true })
    await expect(confirmDialog(page)).toHaveCount(0)
    release()

    await expect(panel).toBeHidden()
    await expect(confirmDialog(page)).toHaveCount(0)
  })

  test("[P1] AC-2 a delete whose refetch fails never focuses the deleted note's Edit", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = cardNotesBlock(page, 4)
    const spiceEdit = editOf(noteItem(block, 'The spice must flow.'))
    await spiceEdit.click()
    await editPanel(page).getByRole('button', { name: 'Delete', exact: true }).click()
    // The delete commits, but the refetch after it fails: the stale block, p.96 included, stays on screen.
    await page.route('**/api/views/book**', (route) => route.fulfill({ status: 500, body: '' }))
    await confirmDialog(page).getByRole('button', { name: 'Delete card note', exact: true }).click()

    await expect(editPanel(page)).toBeHidden()
    await expect(spiceEdit).not.toBeFocused()
    await expect(block.getByRole('heading', { level: 2 })).toBeFocused()
    expect((storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).map((note) => note.id)).not.toContain(
      SPICE_ID,
    )
  })

  test('[P1] AC-2 deleting the last shown note focuses the Edit of the note that moves in', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    await editPanel(page).getByRole('button', { name: 'Delete', exact: true }).click()
    await confirmDialog(page).getByRole('button', { name: 'Delete card note', exact: true }).click()

    const block = cardNotesBlock(page, 3)
    await expect(editOf(noteItem(block, 'The mystery of life isn’t a problem to solve.'))).toBeFocused()
  })

  test("[P1] AC-5 a stale tab's card_note_not_found shows inside the panel, then inside the Confirm dialog", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const panel = editPanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await note.fill('Kept.')

    // Another tab deletes the note while the panel is open.
    const deleted = await page.request.post(`${server.url}${DELETE_CARD_NOTE}`, {
      multipart: { intent: JSON.stringify({ bookId: DUNE_ID, cardNoteId: SPICE_ID }) },
    })
    expect(deleted.status()).toBe(200)
    const before = libraryBytes(server)

    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(panel.getByText(NOTE_GONE, { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveText(NOTE_GONE)
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(page.getByRole('status')).toHaveText('')

    await panel.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = confirmDialog(page)
    await dialog.getByRole('button', { name: 'Delete card note', exact: true }).click()
    await expect(dialog.getByText(NOTE_GONE, { exact: true })).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)

    // Cancel, then Cancel: the note's Edit is gone, so focus goes to the block heading.
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(cardNotesBlock(page, 3).getByRole('heading', { name: 'Card notes (3)', exact: true })).toBeFocused()
  })

  test('[P2] The edit panel and the stacked Confirm dialog pass axe in both themes', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
      const panel = editPanel(page)
      await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toBeFocused()
      await settled(panel)
      expect(await axe(`${colorScheme} edit panel`)).toEqual([])

      await panel.getByRole('button', { name: 'Delete', exact: true }).click()
      const dialog = confirmDialog(page)
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
      await settled(dialog)
      expect(await axe(`${colorScheme} confirm`)).toEqual([])
    }
  })
})
