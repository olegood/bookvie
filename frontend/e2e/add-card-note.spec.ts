// Story 5.1 Add a card note while reading. The Card note panel from the
// Main book card (its heading, fields, prefilled Page and opening focus),
// the outcome of Save note on Home (the `status` line, focus back on Add card
// note, still on Home), and Book detail's "Card notes (N)" block. Also the
// panel from Book detail (empty and paused prefills), a 422 under its field,
// a couldn't-save inside the panel, Esc, and the Tab cycle. How
// `add-card-note` parses the Page and what it refuses (CRD-API-001, TR8) is
// proven at API level in backend/tests/test_add_card_note.py.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND_ID, libraryBytes, mainAt, mainBookCard, sizeOf, storedBook } from './home.ts'
import { ADD_CARD_NOTE, DELETE_BOOK, intentOf, requestsTo } from './intents.ts'
import { rgbOf, settled } from './library.ts'

const SAVED = 'Card note saved.'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const BOOK_GONE = "This book isn't in your catalog anymore."
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
// --color-ink-tertiary in the light theme (tokens.css).
const INK_TERTIARY = rgbOf('#666961')

/** The Card note panel: a modal `dialog` named by its heading. */
function cardNotePanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Card note', exact: true })
}

/** The Main book card's **Add card note**. */
function addCardNote(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'Add card note', exact: true })
}

/**
 * Records, each time the `status` region gets text, that text and the
 * accessible name of the focused element at that moment: focus must land
 * before the line is set.
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

async function bottomOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box.y + box.height
}

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return box.y
}

/** Dune with four Card notes, seeded out of page order. */
const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { text: 'The mystery of life isn’t a problem to solve.', pageStart: 300 },
    { text: 'Fear is the mind-killer.', pageStart: 12 },
    { text: 'The spice must flow.', pageStart: 96 },
    { text: 'A beginning is the time for taking the most delicate care.', pageStart: 42, pageEnd: 45 },
  ],
}
const NEUROMANCER_ID = '1b6e2c4a-3d5f-4e7a-9b8c-0d1e2f3a4b5c'
const NEUROMANCER = { id: NEUROMANCER_ID, title: 'Neuromancer', authors: ['William Gibson'], pages: 271 }

test.describe('Story 5.1 Add a card note while reading', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 Add card note on the Main book card opens the "Card note" index card, Page prefilled, focus in Note', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    // The criterion's opener, on the Main book card.
    await expect(addCardNote(page)).toBeVisible()
    await addCardNote(page).click()

    const panel = cardNotePanel(page)
    await expect(panel).toBeVisible()

    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    // Multi-line: a textarea, so Enter makes a new line instead of saving.
    expect(await note.evaluate((element) => element.tagName)).toBe('TEXTAREA')
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('212')
    await expect(panel.getByRole('button', { name: 'Save note', exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    // Delete is edit mode's (Story 5.2): an added note has nothing to delete yet.
    await expect(panel.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0)
    // The index card is 360px wide (DESIGN.md → Card note panel).
    expect((await sizeOf(panel)).width).toBe(360)

    // Cancel saves nothing and hands focus back to the opener.
    await note.fill('Not kept.')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toEqual([])
  })

  test('[P0] AC-4 Save note on Home stays on Home, returns focus to Add card note, then says "Card note saved."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)
    await watchStatus(page)

    // The criterion's opener, on the Main book card.
    await expect(addCardNote(page)).toBeVisible()
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Light is the left hand of darkness.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('212–213')

    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe('/')
    expect(await statusSeen(page)).toEqual([{ text: SAVED, focused: 'Add card note' }])
    // The client sends Page as typed; the server parses it.
    expect(sent).toHaveLength(1)
    expect(intentOf(sent[0])).toEqual({
      bookId: LEFT_HAND_ID,
      text: 'Light is the left hand of darkness.',
      page: '212–213',
    })
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart, pageEnd }) => ({ text, pageStart, pageEnd }))).toEqual([
      { text: 'Light is the left hand of darkness.', pageStart: 212, pageEnd: 213 },
    ])
  })

  test('[P1] AC-5 Book detail shows "Card notes (N)" with the first three notes in page order, or "No card notes yet."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES, NEUROMANCER] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)

    const block = page.getByRole('main').getByRole('region', { name: 'Card notes (4)', exact: true })
    await expect(block).toBeVisible()

    // The first three in page order: p.12, pp.42–45, p.96; p.300 isn't shown.
    const notes = block.getByRole('listitem')
    await expect(notes).toHaveCount(3)
    const expected = [
      ['Fear is the mind-killer.', 'p.12'],
      ['A beginning is the time for taking the most delicate care.', 'pp.42–45'],
      ['The spice must flow.', 'p.96'],
    ]
    for (const [index, [text, ref]] of expected.entries()) {
      const item = notes.nth(index)
      const body = item.getByText(text, { exact: true })
      const pageRef = item.getByText(ref, { exact: true })
      await expect(body).toBeVisible()
      await expect(pageRef).toBeVisible()
      // The page ref sits below the text, in meta / ink-tertiary.
      expect(await topOf(pageRef)).toBeGreaterThanOrEqual(await bottomOf(body))
      await expect(pageRef).toHaveCSS('color', INK_TERTIARY)
    }
    await expect(block.getByText('The mystery of life isn’t a problem to solve.')).toHaveCount(0)

    // A Book with no notes.
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    await expect(page.getByRole('main').getByText('No card notes yet.', { exact: true })).toBeVisible()
  })

  test('[P1] AC-1 from Book detail: Page is empty with no Reading, and a save returns focus to that Add card note', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [NEUROMANCER] })
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
    await watchStatus(page)

    const main = page.getByRole('main')
    const opener = main.getByRole('button', { name: 'Add card note', exact: true })
    // In the action stack, directly before Edit.
    const stack = await main.getByRole('button').allTextContents()
    expect(stack.indexOf('Edit') - stack.indexOf('Add card note')).toBe(1)
    await expect(main.getByRole('region', { name: 'Card notes', exact: true })).toContainText('No card notes yet.')

    await opener.click()
    const panel = cardNotePanel(page)
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toBeFocused()
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('The sky above the port.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('p.3')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(opener).toBeFocused()
    expect(await statusSeen(page)).toEqual([{ text: SAVED, focused: 'Add card note' }])
    // The block now has the note.
    const block = main.getByRole('region', { name: 'Card notes (1)', exact: true })
    await expect(block.getByRole('listitem')).toHaveCount(1)
    await expect(block.getByText('p.3', { exact: true })).toBeVisible()
  })

  test('[P1] AC-3 a refused Page shows under the field with aria-invalid, alert reads the summary, the panel keeps both values', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    const before = libraryBytes(server)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    await note.fill('Ice.')
    await pageField.fill('400')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()

    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAccessibleDescription('Page must be between 1 and 330.')
    await expect(pageField).toBeFocused()
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Ice.')
    await expect(pageField).toHaveValue('400')
    expect(libraryBytes(server)).toBe(before)

    // An empty Note: the message is on Note, which takes focus.
    await note.fill('  ')
    await pageField.fill('42')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(note).toHaveAccessibleDescription('Note is required.')
    await expect(note).toHaveAttribute('aria-invalid', 'true')
    await expect(note).toBeFocused()
    await expect(pageField).not.toHaveAttribute('aria-invalid', 'true')
    expect(libraryBytes(server)).toBe(before)

    // Both refused: both fields are invalid, the summary names both, and focus goes to Note first.
    await note.fill('  ')
    await pageField.fill('400')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Not saved. 2 fields need attention: Note, Page.')
    await expect(note).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAccessibleDescription('Page must be between 1 and 330.')
    await expect(note).toBeFocused()
    expect(libraryBytes(server)).toBe(before)
  })

  test("[P1] AC-6 a routed 503 shows Couldn't save inside the panel above the buttons, with both values kept", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${ADD_CARD_NOTE}`, async (route) => {
      await held
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      })
    })
    await page.goto(`${server.url}/`)
    const before = libraryBytes(server)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Kept.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('212–213')
    const sent = page.waitForRequest((request) => new URL(request.url()).pathname === ADD_CARD_NOTE)
    await save.click()
    await sent
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    // Esc and Cancel are ignored while the save is out: the panel and both values stay.
    await page.keyboard.press('Escape')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Kept.')
    release()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = panel.getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    await expect(line).toHaveCSS('position', 'static')
    expect(await bottomOf(line)).toBeLessThanOrEqual(await topOf(save))
    await expect(panel).toBeVisible()
    await expect(save).not.toHaveAttribute('aria-disabled', 'true')
    await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Kept.')
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('212–213')
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P2] Esc closes the panel like Cancel, sends nothing, and returns focus to Add card note', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(0))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    // A current Reading at p.0 prefills 1.
    await expect(panel.getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('1')
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Not kept.')
    await page.keyboard.press('Escape')

    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(sent).toHaveLength(0)
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toEqual([])
  })

  test('[P1] AC-1 from Book detail of a paused Book: Page is prefilled with its paused page', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ ...NEUROMANCER, readings: [{ currentPage: 88 }] }] })
    await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)

    await page.getByRole('main').getByRole('button', { name: 'Add card note', exact: true }).click()

    await expect(cardNotePanel(page).getByRole('textbox', { name: 'Page', exact: true })).toHaveValue('88')
  })

  test('[P2] Tab and Shift+Tab cycle inside the panel, the Note textarea included', async ({ page, seededServer }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    await expect(note).toBeFocused()
    for (const [key, focused] of [
      ['Shift+Tab', panel.getByRole('button', { name: 'Cancel', exact: true })],
      ['Tab', note],
    ] as const) {
      await page.keyboard.press(key)
      await expect(focused).toBeFocused()
    }
  })

  test('[P1] A note added on Home shows on that Book\'s detail in "Card notes (1)" with its page ref', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Light is the left hand of darkness.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()

    // On to the Book's detail from the Main book card's title.
    await mainBookCard(page).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/book/${LEFT_HAND_ID}$`))
    const block = page.getByRole('main').getByRole('region', { name: 'Card notes (1)', exact: true })
    await expect(block).toBeVisible()
    const note = block.getByRole('listitem')
    await expect(note).toHaveCount(1)
    await expect(note.getByText('Light is the left hand of darkness.', { exact: true })).toBeVisible()
    await expect(note.getByText('p.212', { exact: true })).toBeVisible()
  })

  test('[P1] Adding on Book detail updates "Card notes (N)", and a lower page moves into the first three', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_WITH_NOTES] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('region', { name: 'Card notes (4)', exact: true })).toBeVisible()

    await main.getByRole('button', { name: 'Add card note', exact: true }).click()
    const panel = cardNotePanel(page)
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('A world without spice.')
    await panel.getByRole('textbox', { name: 'Page', exact: true }).fill('5')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(SAVED)

    // The refetched view: five notes, and p.5 leads the three shown; p.96 drops out.
    const block = main.getByRole('region', { name: 'Card notes (5)', exact: true })
    await expect(block).toBeVisible()
    const notes = block.getByRole('listitem')
    await expect(notes).toHaveCount(3)
    for (const [index, [text, ref]] of [
      ['A world without spice.', 'p.5'],
      ['Fear is the mind-killer.', 'p.12'],
      ['A beginning is the time for taking the most delicate care.', 'pp.42–45'],
    ].entries()) {
      await expect(notes.nth(index).getByText(text, { exact: true })).toBeVisible()
      await expect(notes.nth(index).getByText(ref, { exact: true })).toBeVisible()
    }
    await expect(block.getByText('The spice must flow.')).toHaveCount(0)
    expect(storedBook(server, DUNE_ID).cardNotes).toHaveLength(5)
  })

  test('[P2] Fixing a refused field and saving again clears its aria-invalid, and the next save goes through', async ({
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
    await pageField.fill('400')
    await save.click()
    await expect(page.getByRole('alert')).toHaveText('Not saved. 2 fields need attention: Note, Page.')
    await expect(note).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')

    // Note fixed: only Page is still refused.
    await note.fill('Ice.')
    await save.click()
    await expect(page.getByRole('alert')).toHaveText('Not saved. 1 field needs attention: Page.')
    await expect(note).not.toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toHaveAttribute('aria-invalid', 'true')
    await expect(pageField).toBeFocused()
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toEqual([])

    // Page fixed: the save goes through.
    await pageField.fill('212')
    await save.click()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    const notes = storedBook(server, LEFT_HAND_ID).cardNotes as Record<string, unknown>[]
    expect(notes.map(({ text, pageStart }) => ({ text, pageStart }))).toEqual([{ text: 'Ice.', pageStart: 212 }])
  })

  test('[P2] A second Save note press while the save is out sends nothing', async ({ page, seededServer }) => {
    const server = await seededServer(mainAt(212))
    const sent = requestsTo(page, ADD_CARD_NOTE)
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${ADD_CARD_NOTE}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const save = panel.getByRole('button', { name: 'Save note', exact: true })
    await panel.getByRole('textbox', { name: 'Note', exact: true }).fill('Once.')
    const first = page.waitForRequest((request) => new URL(request.url()).pathname === ADD_CARD_NOTE)
    await save.click()
    await first
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    // Playwright waits on aria-disabled; force the press a user can still make.
    await save.click({ force: true })
    release()

    await expect(page.getByRole('status')).toHaveText(SAVED)
    await expect(panel).toBeHidden()
    expect(sent).toHaveLength(1)
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toHaveLength(1)
  })

  test('[P2] Stale tab: Save on Home after the Main book was deleted elsewhere shows the 409 inside the panel, values kept', async ({
    page,
    seededServer,
  }) => {
    // A second Book keeps the library non-empty, so Home keeps its Main book card (now empty).
    const server = await seededServer(mainAt(212, { others: [NEUROMANCER] }))
    await page.goto(`${server.url}/`)

    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    const note = panel.getByRole('textbox', { name: 'Note', exact: true })
    const pageField = panel.getByRole('textbox', { name: 'Page', exact: true })
    await note.fill('Kept.')
    await pageField.fill('212–213')

    // Another tab deletes the Main book while the panel is open.
    const deleted = await page.request.post(`${server.url}${DELETE_BOOK}`, {
      multipart: { intent: JSON.stringify({ bookId: LEFT_HAND_ID }) },
    })
    expect(deleted.status()).toBe(200)
    const before = libraryBytes(server)

    const answered = page.waitForResponse((response) => new URL(response.url()).pathname === ADD_CARD_NOTE)
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    expect((await answered).status()).toBe(409)

    // The refetched Home empties the card behind the panel; the panel keeps its line and both values.
    await expect(page.getByRole('alert')).toHaveText(BOOK_GONE)
    await expect(panel.getByText(BOOK_GONE, { exact: true })).toBeVisible()
    await expect(panel).toBeVisible()
    await expect(note).toHaveValue('Kept.')
    await expect(pageField).toHaveValue('212–213')
    await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeAttached()
    await expect(page.getByRole('status')).toHaveText('')
    expect(libraryBytes(server)).toBe(before)

    // Cancel: the opener is gone, so focus parks on main.
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('main')).toBeFocused()
  })

  test("[P2] The open Card note panel and Book detail's Card notes block pass axe in both themes", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE_WITH_NOTES] }))
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      await addCardNote(page).click()
      const panel = cardNotePanel(page)
      await expect(panel.getByRole('textbox', { name: 'Note', exact: true })).toBeFocused()
      await settled(panel)
      expect(await axe(`${colorScheme} panel`)).toEqual([])

      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await expect(page.getByRole('main').getByRole('region', { name: 'Card notes (4)', exact: true })).toBeVisible()
      expect(await axe(`${colorScheme} block`)).toEqual([])
    }
  })
})
