// Story 9.2 Add several card notes in a row. In add mode the Card note panel
// has an **Add another** checkbox under Page (a native checkbox tinted with
// `accent`), remembered per browser in localStorage under
// `bookvie.cardNoteAddAnother`. With it on, a successful save, from Save note
// or Cmd+Enter, keeps the panel open as the modal: Note empties, Page keeps
// what was typed, focus returns to Note, `status` announces "Card note saved."
// again, and a plain-text count ("1 note saved", "2 notes saved") shows on the
// checkbox's line. Cancel and Esc close it with the saved notes kept. Failures
// keep the panel open and the count unchanged. With it off, or in edit mode
// (which has no checkbox), a save closes the panel as before.
//
// The stored value isn't pinned: the leaves turn Add another on by clicking
// it, and read the key only to see that it was written and changed.

import {
  addCardNote,
  cardNotePanel,
  cardNotesBlock,
  COULDNT_SAVE,
  DUNE_WITH_NOTES,
  editOf,
  editPanel,
  noteItem,
  SAVED,
  SPICE_ID,
} from './card-note-keys.ts'
import {
  ACCENT,
  ACCENT_DARK,
  addAnother,
  ANY_COUNT,
  boxOf,
  INK,
  INK_DARK,
  INK_TERTIARY,
  inLiveRegion,
  isModal,
  noteField,
  pageField,
  recordStatus,
  savedCount,
  seeCardNotes,
  STORAGE_KEY,
  statusTexts,
  storedChoice,
} from './card-note-add-another.ts'
import { expect, test } from './fixtures.ts'
import { DUNE_ID, LEFT_HAND_ID, libraryBytes, mainAt, storedBook } from './home.ts'
import { ADD_CARD_NOTE, EDIT_CARD_NOTE, intentOf, requestsTo } from './intents.ts'
import { afterAnnounceDelay } from './stats.ts'

test.describe('Story 9.2 Add several card notes in a row (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P1] AC-1 add mode shows the native Add another checkbox under Page, tinted accent, its label clickable, the focus ring on the box; edit mode has no checkbox and no count', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const box = addAnother(panel)

    await expect(box).toBeVisible()
    // Off by default, the browser's own checkbox, 16px, tinted with accent, no custom drawing.
    await expect(box).not.toBeChecked()
    expect(await box.evaluate((element) => element instanceof HTMLInputElement && element.type === 'checkbox')).toBe(
      true,
    )
    await expect(box).toHaveCSS('width', '16px')
    await expect(box).toHaveCSS('height', '16px')
    await expect(box).toHaveCSS('accent-color', ACCENT)
    await expect(box).toHaveCSS('appearance', 'auto')
    await expect(box).toHaveCSS('color-scheme', 'light')
    // Its label: body-sm in ink.
    const label = panel.getByText('Add another', { exact: true })
    await expect(label).toHaveCSS('font-size', '14px')
    await expect(label).toHaveCSS('color', INK)
    // Under Page, above the buttons.
    const boxBox = await boxOf(box)
    const pageBox = await boxOf(pageField(panel))
    const saveBox = await boxOf(panel.getByRole('button', { name: 'Save note', exact: true }))
    expect(boxBox.y).toBeGreaterThanOrEqual(pageBox.y + pageBox.height)
    expect(boxBox.y + boxBox.height).toBeLessThanOrEqual(saveBox.y)
    // No count before a save.
    await expect(panel).not.toContainText(ANY_COUNT)
    // The whole label is clickable.
    await label.click()
    await expect(box).toBeChecked()
    await label.click()
    await expect(box).not.toBeChecked()
    // Tab from Page reaches the box, and the focus ring is on it.
    await pageField(panel).focus()
    await page.keyboard.press('Tab')
    await expect(box).toBeFocused()
    await expect(box).toHaveCSS('outline', `${ACCENT} solid 2px`)
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()

    // Edit mode, from a note's Edit on Book detail: no checkbox and no count.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const edit = editPanel(page)
    await expect(noteField(edit)).toBeFocused()
    await expect(edit.getByRole('checkbox')).toHaveCount(0)
    await expect(edit).not.toContainText(ANY_COUNT)
    await expect(edit).not.toContainText('Add another')
  })

  test('[P1] AC-2 the Add another choice is stored at once, survives the next opening and a reload, and junk in storage reads as off', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const box = addAnother(panel)

    // Empty storage reads as off.
    await expect(box).not.toBeChecked()
    expect(await storedChoice(page)).toBeNull()

    // Checked: stored at once, before any save or close.
    await box.check()
    await expect.poll(() => storedChoice(page)).not.toBeNull()
    const on = await storedChoice(page)
    // The next opening shows it on.
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await addCardNote(page).click()
    await expect(box).toBeChecked()
    // So does an opening after a reload.
    await page.reload()
    await addCardNote(page).click()
    await expect(box).toBeChecked()

    // Unchecked: stored at once, and a reload shows it off.
    await box.uncheck()
    await expect.poll(() => storedChoice(page)).not.toBe(on)
    await page.reload()
    await addCardNote(page).click()
    await expect(box).not.toBeChecked()

    // Anything other than the stored "on" value reads as off.
    for (const junk of ['sometimes', '{"on":tru', '']) {
      await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [STORAGE_KEY, junk])
      await page.reload()
      await addCardNote(page).click()
      await expect(noteField(panel)).toBeFocused()
      await expect(box).not.toBeChecked()
    }
  })

  test('[P0] AC-3 with Add another on, a save from Save note or Cmd+Enter keeps the modal panel open, empties Note, keeps Page, refocuses Note and announces again', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)
    await expect(seeCardNotes(page, 0)).toBeVisible()
    await recordStatus(page)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    await addAnother(panel).check()
    await note.fill('Light is the left hand of darkness.')
    await pageField(panel).fill('212–213')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    // The first save, from Save note: Note empties and the panel stays the open modal.
    await expect(note).toHaveValue('')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeVisible()
    expect(await isModal(panel)).toBe(true)
    await expect(note).toBeFocused()
    await expect(pageField(panel)).toHaveValue('212–213')
    await expect(addAnother(panel)).toBeChecked()
    // The count behind the panel updates as after any save.
    await expect(seeCardNotes(page, 1)).toBeAttached()
    expect(added).toHaveLength(1)
    expect(intentOf(added[0])).toEqual({
      bookId: LEFT_HAND_ID,
      text: 'Light is the left hand of darkness.',
      page: '212–213',
    })

    // The second save, from Cmd+Enter: the same, and "Card note saved." is announced again.
    await note.fill('Darkness is the right hand of light.')
    await note.press('Meta+Enter')
    await expect(note).toHaveValue('')
    await expect.poll(() => statusTexts(page)).toEqual([SAVED, '', SAVED])
    await expect(panel).toBeVisible()
    expect(await isModal(panel)).toBe(true)
    await expect(note).toBeFocused()
    await expect(pageField(panel)).toHaveValue('212–213')
    await expect(seeCardNotes(page, 2)).toBeAttached()
    expect(added).toHaveLength(2)
    expect(intentOf(added[1])).toMatchObject({ text: 'Darkness is the right hand of light.', page: '212–213' })
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart, pageEnd }) => ({ text, pageStart, pageEnd }))).toEqual([
      { text: 'Light is the left hand of darkness.', pageStart: 212, pageEnd: 213 },
      { text: 'Darkness is the right hand of light.', pageStart: 212, pageEnd: 213 },
    ])

    // A held Cmd+Enter saves one note: the repeats that come after the save
    // returns (Note empty again) send nothing and show no error.
    await note.fill('One press, one note.')
    await note.focus()
    await page.keyboard.down('Meta')
    await page.keyboard.down('Enter')
    await expect(note).toHaveValue('')
    await page.keyboard.down('Enter')
    await page.keyboard.down('Enter')
    await page.keyboard.up('Enter')
    await page.keyboard.up('Meta')
    await afterAnnounceDelay(page)
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toHaveText('')
    // Esc closes at once only when no save is out.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    expect(added).toHaveLength(3)
  })

  test('[P1] AC-4 with Add another on, a plain-text count on the checkbox line reads "1 note saved", then "2 notes saved", and starts empty at each opening', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    const box = addAnother(panel)
    await box.check()
    await note.fill('The first.')
    await note.press('Meta+Enter')

    await expect(savedCount(panel)).toHaveText('1 note saved')
    await note.fill('The second.')
    await note.press('Control+Enter')
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    // meta in ink-tertiary, on the checkbox's line, right-aligned with Note's right edge.
    const count = savedCount(panel)
    await expect(count).toHaveCSS('font-size', '13px')
    await expect(count).toHaveCSS('color', INK_TERTIARY)
    const countBox = await boxOf(count)
    const boxBox = await boxOf(box)
    const noteBox = await boxOf(note)
    expect(countBox.y).toBeLessThan(boxBox.y + boxBox.height)
    expect(countBox.y + countBox.height).toBeGreaterThan(boxBox.y)
    expect(Math.abs(countBox.x + countBox.width - (noteBox.x + noteBox.width))).toBeLessThanOrEqual(1)
    // Plain text: neither the count nor an ancestor is a live region.
    expect(await inLiveRegion(count)).toBe(false)

    // Empty at the next opening, then counting from 1 again.
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await addCardNote(page).click()
    await expect(note).toBeFocused()
    await expect(box).toBeChecked()
    await expect(panel).not.toContainText(ANY_COUNT)
    await note.fill('The third.')
    await note.press('Meta+Enter')
    await expect(savedCount(panel)).toHaveText('1 note saved')
  })

  test('[P1] AC-5 with three saved and a fourth half typed, Esc or Cancel closes the panel, keeps the three, drops the fourth, refocuses the opener and announces nothing more', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)
    await expect(seeCardNotes(page, 0)).toBeVisible()
    await recordStatus(page)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    const cancel = panel.getByRole('button', { name: 'Cancel', exact: true })
    await addAnother(panel).check()
    for (const text of ['One.', 'Two.', 'Three.']) {
      await note.fill(text)
      await note.press('Meta+Enter')
      await expect(note).toHaveValue('')
      // The label stays Cancel after every save.
      await expect(cancel).toHaveText('Cancel')
      // Wait out the announce delay: a save or close inside it replaces the pending message.
      await expect(page.getByRole('status')).toHaveText(SAVED)
    }
    await expect.poll(() => statusTexts(page)).toEqual([SAVED, '', SAVED, '', SAVED])
    await note.fill('Four, half typ')

    await page.keyboard.press('Escape')

    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    await expect(seeCardNotes(page, 3)).toBeVisible()
    const texts = () =>
      (storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]).map(({ text }) => text)
    expect(texts()).toEqual(['One.', 'Two.', 'Three.'])
    expect(added).toHaveLength(3)
    // Nothing more is announced: no new text after the three saves.
    await afterAnnounceDelay(page)
    expect((await statusTexts(page)).filter((text) => text !== '')).toEqual([SAVED, SAVED, SAVED])

    // Cancel does the same.
    await addCardNote(page).click()
    await note.fill('Four.')
    await note.press('Meta+Enter')
    await expect(note).toHaveValue('')
    await expect(cancel).toHaveText('Cancel')
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await note.fill('Five, half typ')
    await cancel.click()
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    await expect(seeCardNotes(page, 4)).toBeVisible()
    expect(texts()).toEqual(['One.', 'Two.', 'Three.', 'Four.'])
    expect(added).toHaveLength(4)
    await afterAnnounceDelay(page)
    expect((await statusTexts(page)).filter((text) => text !== '')).toEqual([SAVED, SAVED, SAVED, SAVED])
  })

  test("[P1] AC-6 with Add another on, a refused or couldn't-save save keeps the panel open with both values and the message, and the count doesn't change", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const added = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    const pageInput = pageField(panel)
    await addAnother(panel).check()
    await note.fill('Kept once.')
    await note.press('Meta+Enter')
    await expect(note).toHaveValue('')

    // Refused (422): a Page past the Book's 330 pages.
    await note.fill('Kept twice.')
    await pageInput.fill('400')
    const before = libraryBytes(server)
    await note.press('Meta+Enter')

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept twice.')
    await expect(pageInput).toHaveValue('400')
    await expect(pageInput).toHaveAttribute('aria-invalid', 'true')
    await expect(pageInput).toHaveAccessibleDescription('Page must be between 1 and 330.')
    await expect(pageInput).toBeFocused()
    expect(libraryBytes(server)).toBe(before)

    // Couldn't save (503): the line above the buttons, both values kept, the count unchanged.
    await pageInput.fill('212')
    await page.route(`**${ADD_CARD_NOTE}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    await note.press('Meta+Enter')
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept twice.')
    await expect(pageInput).toHaveValue('212')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    expect(libraryBytes(server)).toBe(before)

    // The retry saves: the line and the field error clear, and the count moves on.
    await page.unroute(`**${ADD_CARD_NOTE}`)
    await note.press('Meta+Enter')
    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('2 notes saved')
    await expect(line).toBeHidden()
    await expect(pageInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(pageInput).toHaveValue('212')
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart }) => ({ text, pageStart }))).toEqual([
      { text: 'Kept once.', pageStart: 212 },
      { text: 'Kept twice.', pageStart: 212 },
    ])
    // The first save, the refusal, the couldn't-save and the retry.
    expect(added).toHaveLength(4)
  })

  test('[P1] AC-3 with Add another on, a save right after a refusal clears the field error it left', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = noteField(panel)
    const pageInput = pageField(panel)
    await addAnother(panel).check()
    await note.fill('Refused, then kept.')
    await pageInput.fill('400')
    await note.press('Meta+Enter')
    await expect(pageInput).toHaveAttribute('aria-invalid', 'true')

    // The fix and the save, with nothing in between: the save's own branch clears the error.
    await pageInput.fill('212')
    await note.press('Meta+Enter')

    await expect(note).toHaveValue('')
    await expect(savedCount(panel)).toHaveText('1 note saved')
    await expect(pageInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(pageInput).toHaveAccessibleDescription('')
    await expect(pageInput).toHaveValue('212')
  })

  test('[P1] AC-7 an edit save closes the panel even while the stored choice is on, and with Add another off an add save closes it as before', async ({
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
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()

    // Edit mode on Book detail, with the choice on.
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await editOf(noteItem(cardNotesBlock(page, 4), 'The spice must flow.')).click()
    const edit = editPanel(page)
    await noteField(edit).fill('He who controls the spice.')
    await edit.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(edit).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(editOf(noteItem(cardNotesBlock(page, 4), 'He who controls the spice.'))).toBeFocused()
    expect(edited).toHaveLength(1)
    const spice = (storedBook(server, DUNE_ID).cardNotes as Record<string, unknown>[]).find(({ id }) => id === SPICE_ID)
    expect(spice).toMatchObject({ text: 'He who controls the spice.', pageStart: 96 })

    // Add mode with Add another turned off again: a save closes the panel as before.
    await page.goto(`${server.url}/`)
    await addCardNote(page).click()
    await expect(addAnother(panel)).toBeChecked()
    await addAnother(panel).uncheck()
    await noteField(panel).fill('Light is the left hand of darkness.')
    await noteField(panel).press('Meta+Enter')
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(addCardNote(page)).toBeFocused()
    await expect(seeCardNotes(page, 1)).toBeVisible()
  })

  test('[P2] AC-8 the checkbox takes the accent dark twin and the dark unchecked box in the dark theme, and the system colors under forced colors, with no custom drawing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const box = addAnother(panel)

    await expect(box).toHaveCSS('accent-color', ACCENT_DARK)
    await expect(box).toHaveCSS('color-scheme', 'dark')
    await expect(box).toHaveCSS('appearance', 'auto')
    await expect(panel.getByText('Add another', { exact: true })).toHaveCSS('color', INK_DARK)

    // Forced colors: the system draws the box; nothing opts it out or paints over it.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await expect(box).toHaveCSS('forced-color-adjust', 'auto')
    await expect(box).toHaveCSS('appearance', 'auto')
    await expect(box).toHaveCSS('background-image', 'none')
    await expect(box).toHaveCSS('box-shadow', 'none')
  })
})
