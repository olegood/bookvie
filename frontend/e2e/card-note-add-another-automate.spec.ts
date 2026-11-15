// Story 9.2 Add several card notes in a row: test automation after the story
// was done, beside the ATDD and review leaves in card-note-add-another.spec.ts.
// The ATDD checklist's green-phase follow-ups: storage that throws, the
// choice kept out of export and restore (AR27), an empty-Note refusal then a
// save, add mode from Book detail, focus on Note before each "Card note
// saved.", Ctrl+Enter pressed and held, the 8px label gap, axe in both
// themes, the Tab cycle with a count shown, a gone Book (409), and edit mode
// from the Card notes page with the stored choice on.
//
// As in the ATDD leaves, the keys are pressed by name (`Meta+Enter`,
// `Control+Enter`), and Add another is turned on by clicking it.

import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import {
  addCardNote,
  cardNotePanel,
  cardNotesBlock,
  DUNE_WITH_NOTES,
  editOf,
  editPanel,
  noteItem,
  SAVED,
  SPICE_ID,
} from './card-note-keys.ts'
import {
  addAnother,
  ANY_COUNT,
  focusAtStatus,
  isModal,
  noteField,
  pageField,
  savedCount,
  STORAGE_KEY,
  storedChoice,
  textGapAfterBox,
  watchFocusAtStatus,
  zipEntries,
} from './card-note-add-another.ts'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND_ID, libraryBytes, mainAt, mainBookCard, storedBook } from './home.ts'
import { ADD_CARD_NOTE, DELETE_BOOK, EDIT_CARD_NOTE, intentOf, requestsTo } from './intents.ts'
import { settled } from './library.ts'
import { exportOf, restoreButton, restoreFrom } from './restore.ts'
import { afterAnnounceDelay, AXE_TAGS } from './stats.ts'

const BOOK_GONE = "This book isn't in your catalog anymore."
const RESTORED = 'Restored.'

/** Collects every uncaught page error from now on. */
function pageErrors(page: Page): Error[] {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  return errors
}

/** Throws on every Storage read and write, after storing Add another as on while storage still worked. */
async function throwingStorageAfterOn(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, 'on')
    const fail = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    Storage.prototype.getItem = fail
    Storage.prototype.setItem = fail
  }, STORAGE_KEY)
}

test.describe('Story 9.2 Add several card notes in a row (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-2 with storage that throws, Add another reads off, a click still toggles it, no message shows, and a save with it on stays open', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const errors = pageErrors(page)
    await throwingStorageAfterOn(page)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    const box = addAnother(panel)
    await expect(note).toBeFocused()
    // "on" was stored, but the read throws: off.
    await expect(box).not.toBeChecked()

    // The write throws, yet the box toggles for this opening, silently.
    await box.click()
    await expect(box).toBeChecked()
    await box.click()
    await expect(box).not.toBeChecked()
    await box.click()
    await expect(box).toBeChecked()
    await expect(page.getByRole('alert')).toHaveText('')

    await note.fill('Saved without storage.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeVisible()
    await expect(note).toBeFocused()
    await expect(page.getByRole('alert')).toHaveText('')
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toHaveLength(1)
    expect(errors.map(String)).toEqual([])
  })

  test('[P2] AC-2 the stored choice never reaches the server or the export, and a restore leaves it as it was, on and off', async ({
    page,
    seededServer,
  }) => {
    const source = await seededServer({ books: [DUNE] })
    const target = await seededServer(mainAt(212))
    const sent: string[] = []
    page.on('request', (request) => {
      sent.push(
        [request.url(), JSON.stringify(request.headers()), (request.postDataBuffer() ?? '').toString()].join('\n'),
      )
    })
    await page.goto(`${target.url}/`)

    // On, with a note saved through it.
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await addAnother(panel).check()
    await expect.poll(() => storedChoice(page)).toBe('on')
    await noteField(panel).fill('Exported, the choice not.')
    await noteField(panel).press('Meta+Enter')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()

    // The export holds the note but nothing of the choice.
    await page.goto(`${target.url}/backup`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export all data', exact: true }).click()
    const entries = zipEntries(readFileSync(await (await download).path()))
    const texts = [...entries].map(([name, data]) => `${name}\n${data.toString('utf8')}`)
    expect(texts.some((text) => text.includes('Exported, the choice not.'))).toBe(true)
    expect(texts.filter((text) => /cardNoteAddAnother|addAnother/i.test(text))).toEqual([])
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.filter((request) => /cardNoteAddAnother|addAnother/i.test(request))).toEqual([])

    // A restore of another library keeps the choice on…
    const archive = await exportOf(page, source)
    await expect(restoreButton(page)).toBeEnabled()
    await restoreFrom(page, archive)
    await expect(page.getByRole('status')).toHaveText(RESTORED)
    await expect(page).toHaveURL(`${target.url}/`)
    expect(await storedChoice(page)).toBe('on')
    await page.goto(`${target.url}/book/${DUNE_ID}`)
    await page.getByRole('main').getByRole('button', { name: 'Add card note', exact: true }).click()
    await expect(noteField(panel)).toBeFocused()
    await expect(addAnother(panel)).toBeChecked()

    // …and off.
    await addAnother(panel).uncheck()
    await expect.poll(() => storedChoice(page)).toBe('off')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await page.goto(`${target.url}/backup`)
    await expect(restoreButton(page)).toBeEnabled()
    await restoreFrom(page, archive)
    await expect(page.getByRole('status')).toHaveText(RESTORED)
    expect(await storedChoice(page)).toBe('off')
    await page.goto(`${target.url}/book/${DUNE_ID}`)
    await page.getByRole('main').getByRole('button', { name: 'Add card note', exact: true }).click()
    await expect(noteField(panel)).toBeFocused()
    await expect(addAnother(panel)).not.toBeChecked()
  })

  test('[P2] AC-3 with Add another on, an empty Note is refused, then filling it and saving clears its error', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    const before = libraryBytes(server)
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Note.')
    await expect(note).toHaveAttribute('aria-invalid', 'true')
    await expect(note).toHaveAccessibleDescription('Note is required.')
    await expect(note).toBeFocused()
    await expect(panel).toBeVisible()
    await expect(panel).not.toContainText(ANY_COUNT)
    expect(libraryBytes(server)).toBe(before)

    await note.fill('Written this time.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(note).toHaveAccessibleDescription('')
    await expect(note).toBeFocused()
    await expect(pageField(panel)).toHaveValue('212')
    expect(added).toHaveLength(2)
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toHaveLength(1)
  })

  test('[P1] AC-3 add mode from Book detail with Add another on: "Card notes (N)" updates behind the open modal panel after each save, Note keeps focus', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await expect(cardNotesBlock(page, 4)).toBeVisible()
    const opener = page.getByRole('main').getByRole('button', { name: 'Add card note', exact: true })

    await opener.click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    await note.fill('A world without spice.')
    await pageField(panel).fill('5')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(note).toHaveValue('')
    await expect(cardNotesBlock(page, 5)).toBeAttached()
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(note).toBeFocused()
    await expect(panel).toBeVisible()
    expect(await isModal(panel)).toBe(true)
    await expect(pageField(panel)).toHaveValue('5')

    await note.fill('Deep desert.')
    await note.press('Meta+Enter')
    await expect(note).toHaveValue('')
    await expect(cardNotesBlock(page, 6)).toBeAttached()
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    await expect(note).toBeFocused()
    expect(await isModal(panel)).toBe(true)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(opener).toBeFocused()
    await expect(noteItem(cardNotesBlock(page, 6), 'A world without spice.')).toBeVisible()
    expect(storedBook(server, DUNE_ID).cardNotes).toHaveLength(6)
  })

  test('[P1] AC-3 on each stay-open save, focus is on Note when "Card note saved." is set', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    await expect(addCardNote(page)).toBeVisible()
    await watchFocusAtStatus(page)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    // From Save note (focus starts on the button), then from Page (focus starts there).
    await note.fill('From the button.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await note.fill('From Page.')
    await pageField(panel).press('Control+Enter')
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    await expect.poll(() => focusAtStatus(page)).toHaveLength(2)

    expect(await focusAtStatus(page)).toEqual([
      { text: SAVED, focused: 'Note' },
      { text: SAVED, focused: 'Note' },
    ])
  })

  test('[P1] AC-3 with Add another on, Ctrl+Enter saves one note, and a held Ctrl+Enter saves exactly one more', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    await note.fill('One press.')
    await note.press('Control+Enter')
    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(page.getByRole('status')).toHaveText(SAVED)

    // Held: the repeats come after the save has returned (Note empty again).
    await note.fill('One held press.')
    await note.focus()
    await page.keyboard.down('Control')
    await page.keyboard.down('Enter')
    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.up('Enter')
    await page.keyboard.up('Control')
    await afterAnnounceDelay(page)

    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    expect(added).toHaveLength(2)
    expect(added.map((request) => intentOf(request).text)).toEqual(['One press.', 'One held press.'])
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toHaveLength(2)
  })

  test('[P2] AC-1 the "Add another" text starts 8px right of the box', async ({ page, seededServer }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const box = addAnother(cardNotePanel(page))
    await expect(box).toBeVisible()
    await settled(cardNotePanel(page))

    expect(Math.abs((await textGapAfterBox(box)) - 8)).toBeLessThanOrEqual(1)
  })

  test('[P1] AC-1 the open add panel with Add another on and a count shown passes axe in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      await addCardNote(page).click()
      const panel = cardNotePanel(page)
      const box = addAnother(panel)
      await expect(noteField(panel)).toBeFocused()
      if (!(await box.isChecked())) await box.check()
      await noteField(panel).fill(`Seen by axe, ${colorScheme}.`)
      await noteField(panel).press('Meta+Enter')
      await expect(savedCount(panel)).toHaveText('1 note saved')
      await expect(page.getByRole('status')).toHaveText(SAVED)
      await expect(box).toBeChecked()
      await settled(panel)
      expect(await axe(`${colorScheme} panel`)).toEqual([])
      await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(panel).toBeHidden()
    }
  })

  test('[P2] AC-5 with a count shown, Tab and Shift+Tab cycle inside the panel through Add another', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    await note.fill('Counted.')
    await note.press('Meta+Enter')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(note).toBeFocused()

    const pageInput = pageField(panel)
    const box = addAnother(panel)
    const saveNote = panel.getByRole('button', { name: 'Save note', exact: true })
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    for (const [key, focused] of [
      ['Tab', pageInput],
      ['Tab', box],
      ['Tab', saveNote],
      ['Tab', cancel],
      ['Tab', note],
      ['Shift+Tab', cancel],
      ['Shift+Tab', saveNote],
      ['Shift+Tab', box],
      ['Shift+Tab', pageInput],
      ['Shift+Tab', note],
    ] as const) {
      await page.keyboard.press(key)
      await expect(focused).toBeFocused()
    }
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(box).toBeChecked()
  })

  test('[P2] AC-6 with Add another on, a save for a Book deleted meanwhile (409) keeps the panel open with its line, and the count stays', async ({
    page,
    seededServer,
  }) => {
    // Dune keeps the library non-empty, so Home keeps its (now empty) Main book card.
    const server = await seededServer(mainAt(212, { others: [DUNE] }))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    await note.fill('Saved before.')
    await note.press('Meta+Enter')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(page.getByRole('status')).toHaveText(SAVED)

    // Another tab deletes the Main book while the panel is open.
    const deleted = await page.request.post(`${server.url}${DELETE_BOOK}`, {
      multipart: { intent: JSON.stringify({ bookId: LEFT_HAND_ID }) },
    })
    expect(deleted.status()).toBe(200)
    const before = libraryBytes(server)
    await note.fill('Too late.')
    const answered = page.waitForResponse((response) => new URL(response.url()).pathname === ADD_CARD_NOTE)
    await note.press('Meta+Enter')
    expect((await answered).status()).toBe(409)

    await expect(page.getByRole('alert')).toHaveText(BOOK_GONE)
    await expect(panel.getByText(BOOK_GONE, { exact: true })).toBeVisible()
    await expect(panel).toBeVisible()
    expect(await isModal(panel)).toBe(true)
    await expect(note).toHaveValue('Too late.')
    await expect(pageField(panel)).toHaveValue('212')
    await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeAttached()
    await afterAnnounceDelay(page)
    await expect(savedCount(panel)).toHaveText('1 note saved')
    expect(libraryBytes(server)).toBe(before)

    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('[P2] AC-7 edit mode from the Card notes page, with the stored choice on, has no checkbox and no count, and a save closes it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    const edited = requestsTo(page, EDIT_CARD_NOTE)
    await page.goto(`${server.url}/`)

    // Turn the stored choice on in add mode, then leave without saving.
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await addAnother(panel).check()
    await expect.poll(() => storedChoice(page)).toBe('on')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()

    await page.goto(`${server.url}/card-notes`)
    const main = page.getByRole('main')
    await editOf(noteItem(main, 'The spice must flow.')).click()
    const edit = editPanel(page)
    await expect(noteField(edit)).toBeFocused()
    await expect(edit.getByRole('checkbox')).toHaveCount(0)
    await expect(edit).not.toContainText(ANY_COUNT)
    await expect(edit).not.toContainText('Add another')

    await noteField(edit).fill('The spice must flow, edited.')
    await edit.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(edit).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(main, 'The spice must flow, edited.'))).toBeFocused()
    expect(edited).toHaveLength(1)
    const spice = (storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).find(({ id }) => id === SPICE_ID)
    expect(spice).toMatchObject({ text: 'The spice must flow, edited.', pageStart: 96 })
    expect(await storedChoice(page)).toBe('on')
  })
})
