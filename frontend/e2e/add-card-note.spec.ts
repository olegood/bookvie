// Story 5.1 Add a card note while reading. The Card note panel from the
// Main book card (its heading, fields, prefilled Page and opening focus),
// the outcome of Save note on Home (the `status` line, focus back on Add card
// note, still on Home), and Book detail's "Card notes (N)" block. How
// `add-card-note` parses the Page and what it refuses (CRD-API-001, TR8) is
// proven at API level in backend/tests/test_add_card_note.py.
//
// Activate a leaf by changing its `test.skip(` to `test(`.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND_ID, mainAt, mainBookCard, sizeOf, storedBook } from './home.ts'
import { intentOf, requestsTo } from './intents.ts'
import { rgbOf } from './library.ts'

const ADD_CARD_NOTE = '/api/intents/add-card-note'
const SAVED = 'Card note saved.'
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

test.describe('Story 5.1 Add a card note while reading (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test.skip('[P0] AC-1 Add card note on the Main book card opens the "Card note" index card, Page prefilled, focus in Note', async ({
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
    // The index card is 360px wide (DESIGN.md → Card note panel).
    expect((await sizeOf(panel)).width).toBe(360)

    // Cancel saves nothing and hands focus back to the opener.
    await note.fill('Not kept.')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(addCardNote(page)).toBeFocused()
    expect(storedBook(server, LEFT_HAND_ID).cardNotes).toEqual([])
  })

  test.skip('[P0] AC-4 Save note on Home stays on Home, returns focus to Add card note, then says "Card note saved."', async ({
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

  test.skip('[P1] AC-5 Book detail shows "Card notes (N)" with the first three notes in page order, or "No card notes yet."', async ({
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
})
