// Story 4.1 Keep the interrupted book as Up next (ATDD). Starting another
// Book makes the interrupted Main book Up next; the Start dialog states what
// happens to an earlier Up next; Home shows Up next in its side column, or in
// the empty Main book card when there is no Main book. This spec reads what
// the browser shows and what the server stored: the displacement line
// (AC-2), the Up next pane (AC-4), the empty card's suggestion (AC-5) and two
// browser contexts on the same data (AC-6). The stored pointers (AC-1, AC-3)
// and the standard intent ACs (AC-7) are proven at API level in
// backend/tests/test_up_next.py.
//
// Dates: AC-2 starts `bookvie --fake-today 2026-10-28` and sets the browser
// clock to the same day in Europe/Madrid (TC-2, AD-20), so the stored
// `pausedAt` is the fake today.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  FAKE_TODAY,
  LEFT_HAND,
  LEFT_HAND_ID,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
} from './home.ts'
import { START_READING, requestsTo } from './intents.ts'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const LEFT_HAND_READING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'
const DUNE_READING_ID = '0f9e8d7c-6b5a-4493-8271-605f4e3d2c1b'
const RESUME_LEFT_HAND = 'Resume The Left Hand of Darkness'

/** Dune paused at p.120 since 20 October, with a Purpose. */
const DUNE_PAUSED = {
  ...DUNE,
  readings: [
    {
      id: DUNE_READING_ID,
      startDate: '2026-10-01',
      currentPage: 120,
      purpose: 'Reread for the ecology of Arrakis',
      lastProgressUpdate: '2026-10-19T21:00:00+02:00',
      pausedAt: '2026-10-20',
    },
  ],
}
/** The Left Hand of Darkness paused at p.212 of 330 since 22 October. */
const LEFT_HAND_PAUSED = {
  ...LEFT_HAND,
  readings: [
    {
      id: LEFT_HAND_READING_ID,
      startDate: '2026-10-02',
      currentPage: 212,
      purpose: 'To see how Le Guin builds a world',
      lastProgressUpdate: '2026-10-21T21:00:00+02:00',
      pausedAt: '2026-10-22',
    },
  ],
}
/** The Left Hand of Darkness as the Main book at p.212 of 330 (64%). */
const LEFT_HAND_MAIN = {
  ...LEFT_HAND,
  readings: [{ id: LEFT_HAND_READING_ID, startDate: '2026-10-02', currentPage: 212 }],
}
/** Dune as the Main book at p.100 of 412. */
const DUNE_MAIN = { ...DUNE, readings: [{ id: DUNE_READING_ID, startDate: '2026-10-05', currentPage: 100 }] }

/** The Start dialog, by its heading: "Start *X*?" or "Resume *X*?". */
function startDialog(page: Page, heading: string): Locator {
  return page.getByRole('dialog', { name: heading, exact: true })
}

/** Home's Up next pane in the side column: a `region` named by its section label. */
function upNextPane(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Up next', exact: true })
}

function fontFamily(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).fontFamily)
}

/** The rendered size of an element, rounded to whole pixels. */
async function sizeOf(locator: Locator): Promise<{ width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

test.describe('Story 4.1 Keep the interrupted book as Up next (ATDD)', () => {
  test.skip('[P0] AC-2 with a Main book and another Up next, the Start dialog says Z moves to Waiting for you., and confirming makes Y Up next', async ({
    page,
  }) => {
    // Main: The Left Hand of Darkness at p.212; Up next: Dune, paused; Fahrenheit 451 never started.
    const server = await serverAtFakeToday(page, 'up-next-displaced', {
      mainBookId: LEFT_HAND_ID,
      upNextBookId: DUNE_ID,
      books: [LEFT_HAND_MAIN, DUNE_PAUSED, FAHRENHEIT],
    })
    try {
      const starts = requestsTo(page, START_READING)
      await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Start reading', exact: true }).click()
      const dialog = startDialog(page, 'Start Fahrenheit 451?')

      // The criterion: Dune has a paused Reading, so it moves to Waiting for you.
      await expect(dialog).toContainText('Dune moves to Waiting for you.')

      // Below the pause line, Z in serif; never "returns to the catalog".
      const text = (await dialog.textContent()) ?? ''
      const pauses = text.indexOf('This pauses The Left Hand of Darkness at p.212 (64%).')
      expect(pauses).toBeGreaterThanOrEqual(0)
      expect(text.indexOf('Dune moves to Waiting for you.')).toBeGreaterThan(pauses)
      await expect(dialog).not.toContainText('returns to the catalog')
      expect(await fontFamily(dialog.getByText('Dune', { exact: true }))).toMatch(/^ui-serif/)

      await dialog.getByRole('button', { name: 'Start reading', exact: true }).click()
      await expect(mainBookCard(page).getByRole('link', { name: 'Fahrenheit 451', exact: true })).toBeFocused()
      // One intent, so one commit.
      expect(starts).toHaveLength(1)
      const library = storedLibrary(server)
      expect(library.mainBookId).toBe(FAHRENHEIT_ID)
      expect(library.upNextBookId).toBe(LEFT_HAND_ID)
      // Y paused at its page; Z untouched, so it is in Waiting for you.
      expect(storedBook(server, LEFT_HAND_ID).readings).toEqual([
        expect.objectContaining({ id: LEFT_HAND_READING_ID, currentPage: 212, pausedAt: FAKE_TODAY, finishDate: null }),
      ])
      expect(storedBook(server, DUNE_ID).readings).toEqual([
        expect.objectContaining({ id: DUNE_READING_ID, currentPage: 120, pausedAt: '2026-10-20', finishDate: null }),
      ])
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-4 Home shows the Up next pane with a thumbnail, the title link, the author and Resume named with the title; with no Up next it reads Nothing up next.', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune at p.100; Up next: The Left Hand of Darkness, paused at p.212.
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND_PAUSED],
    })
    await page.goto(`${server.url}/`)
    const pane = upNextPane(page)

    // The criterion: the side column has an Up next pane.
    await expect(pane).toBeVisible()

    // Outside the Main book card.
    await expect(mainBookCard(page).getByRole('region', { name: 'Up next', exact: true })).toHaveCount(0)
    // A 44×64 no-cover placeholder (the Book has no cover).
    expect(await sizeOf(pane.getByRole('img', { name: 'No cover', exact: true }))).toEqual({ width: 44, height: 64 })
    // The serif title links to Book detail; the author is beside it.
    const title = pane.getByRole('link', { name: 'The Left Hand of Darkness', exact: true })
    await expect(title).toHaveAttribute('href', `/book/${LEFT_HAND_ID}`)
    expect(await fontFamily(title)).toMatch(/^ui-serif/)
    await expect(pane.getByText('Ursula K. Le Guin', { exact: true })).toBeVisible()
    // Paused, so Resume, its name carrying the title.
    const resume = pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })
    await expect(resume).toBeVisible()
    await expect(pane.getByRole('button', { name: /^Start reading/ })).toHaveCount(0)
    await resume.click()
    const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('This pauses Dune at p.100 (24%).')
    // X is the Up next Book: no displacement line.
    await expect(dialog).not.toContainText('moves to Waiting for you')
    await expect(dialog).not.toContainText('returns to the catalog')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)

    // A Main book and no Up next: "Nothing up next." with a link to the Catalog.
    const empty = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, LEFT_HAND] })
    await page.goto(`${empty.url}/`)
    const emptyPane = upNextPane(page)
    await expect(emptyPane.getByText('Nothing up next.', { exact: true })).toBeVisible()
    await expect(emptyPane.getByRole('link', { name: /Catalog/ })).toHaveAttribute('href', '/catalog')
    await expect(emptyPane.getByRole('button')).toHaveCount(0)
  })

  test.skip('[P1] AC-5 with no Main book and an Up next, the empty Main book card suggests it with Resume, and the Up next pane is hidden', async ({
    page,
    seededServer,
  }) => {
    // No Main book; Up next: The Left Hand of Darkness, paused at p.212; Dune never started.
    const server = await seededServer({ upNextBookId: LEFT_HAND_ID, books: [LEFT_HAND_PAUSED, DUNE] })
    await page.goto(`${server.url}/`)
    const card = mainBookCard(page)
    const resume = card.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })

    // The criterion: the empty card offers Resume for the Up next Book.
    await expect(resume).toBeVisible()

    await expect(card.getByRole('heading', { name: 'No Main book.', exact: true })).toBeVisible()
    // The Up next suggestion replaces the Catalog one.
    await expect(card.getByRole('link', { name: 'Choose a book in the Catalog', exact: true })).toHaveCount(0)
    expect(await sizeOf(card.getByRole('img', { name: 'No cover', exact: true }))).toEqual({ width: 44, height: 64 })
    const title = card.getByText('The Left Hand of Darkness', { exact: true })
    await expect(title).toBeVisible()
    expect(await fontFamily(title)).toMatch(/^ui-serif/)
    await expect(card.getByText('Ursula K. Le Guin', { exact: true })).toBeVisible()
    // The card already suggests it, so the pane is hidden.
    await expect(upNextPane(page)).toHaveCount(0)
    // It opens the Start dialog; with no Main book there is no trade-off line.
    await resume.click()
    const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText('This pauses')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(resume).toBeFocused()
  })

  test.skip('[P1] AC-6 a start in one browser context shows in the other after it regains focus: Up next moved, the last write wins, no warning', async ({
    page,
    browser,
    seededServer,
  }) => {
    // Main: The Left Hand of Darkness at p.212; Dune never started; no Up next.
    const server = await seededServer({ mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE] })
    const otherContext = await browser.newContext()
    try {
      const other = await otherContext.newPage()
      await other.goto(`${server.url}/`)
      await expect(
        mainBookCard(other).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }),
      ).toBeVisible()

      // This context starts Dune.
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Start reading', exact: true }).click()
      await startDialog(page, 'Start Dune?').getByRole('button', { name: 'Start reading', exact: true }).click()
      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeFocused()
      // The other regains focus, and its views refetch.
      await other.bringToFront()
      await other.evaluate(() => window.dispatchEvent(new Event('focus')))

      // The criterion: the other context shows the interrupted Book as Up next.
      await expect(
        upNextPane(other).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }),
      ).toBeVisible()

      await expect(mainBookCard(other).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
      // No warning: no alert text and no dialog.
      await expect(other.getByRole('alert')).toHaveText('')
      await expect(other.getByRole('dialog')).toHaveCount(0)

      // The other context resumes The Left Hand of Darkness: the last write wins.
      await upNextPane(other).getByRole('button', { name: RESUME_LEFT_HAND, exact: true }).click()
      const dialog = startDialog(other, 'Resume The Left Hand of Darkness?')
      await expect(dialog).toContainText('This pauses Dune at p.0 (0%).')
      await dialog.getByRole('button', { name: 'Resume', exact: true }).click()
      await expect(
        mainBookCard(other).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }),
      ).toBeFocused()
      const library = storedLibrary(server)
      expect(library.mainBookId).toBe(LEFT_HAND_ID)
      expect(library.upNextBookId).toBe(DUNE_ID)

      // And the first context follows once it regains focus, with no warning either.
      await page.bringToFront()
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(
        mainBookCard(page).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }),
      ).toBeVisible()
      await expect(upNextPane(page).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await otherContext.close()
    }
  })
})
