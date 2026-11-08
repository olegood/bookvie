// Story 4.2 See every paused book in Waiting for you (ATDD). Home's side
// column lists every paused Reading except the Up next Book's, oldest pause
// first, with no cap. This spec reads what the browser shows and what the
// server stored: the pane's rows (AC-2), the pane hidden once nothing is
// waiting (AC-3), many rows (AC-5), Resume from a row (AC-6), and the Up next
// Book kept out of the pane and its count (AC-7). The order and its ties
// (AC-1) and a library written under Epic 3 (AC-4) are proven at API level in
// backend/tests/test_waiting_for_you.py.
//
// Dates: AC-6 starts `bookvie --fake-today 2026-10-28` and sets the browser
// clock to the same day in Europe/Madrid (TC-2, AD-20), so the Main book's
// stored `pausedAt` is the fake today. Every seeded `pausedAt` is earlier.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  FAKE_TODAY,
  LEFT_HAND,
  LEFT_HAND_ID,
  fontFamily,
  mainBookCard,
  serverAtFakeToday,
  sizeOf,
  startDialog,
  stopAndRemove,
  storedBook,
  storedLibrary,
  upNextPane,
} from './home.ts'
import { START_READING, requestsTo } from './intents.ts'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const LEFT_HAND_READING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'
const DUNE_READING_ID = '0f9e8d7c-6b5a-4493-8271-605f4e3d2c1b'
const RESUME_LEFT_HAND = 'Resume The Left Hand of Darkness'
const LEFT_HAND_PURPOSE = 'To see how Le Guin builds a world'

/** The Left Hand of Darkness paused at p.120 of 330 (36%) since 22 October, with a Purpose. */
const LEFT_HAND_WAITING = {
  ...LEFT_HAND,
  readings: [
    {
      id: LEFT_HAND_READING_ID,
      startDate: '2026-10-02',
      currentPage: 120,
      purpose: LEFT_HAND_PURPOSE,
      lastProgressUpdate: '2026-10-21T21:00:00+02:00',
      pausedAt: '2026-10-22',
    },
  ],
}
/** The same Reading paused earlier, on 5 October (older than every other pause here). */
const LEFT_HAND_PAUSED_EARLY = {
  ...LEFT_HAND_WAITING,
  readings: [{ ...LEFT_HAND_WAITING.readings[0], pausedAt: '2026-10-05' }],
}
/** Fahrenheit 451 paused at p.40 of 187 (21%) since 10 October. */
const FAHRENHEIT_WAITING = {
  ...FAHRENHEIT,
  readings: [{ startDate: '2026-09-28', currentPage: 40, pausedAt: '2026-10-10' }],
}
/** Dune as the Main book at p.100 of 412 (24%). */
const DUNE_MAIN = { ...DUNE, readings: [{ id: DUNE_READING_ID, startDate: '2026-10-05', currentPage: 100 }] }

/** Home's Waiting for you pane in the side column: a `region` named by its heading "Waiting for you (N)". */
function waitingPane(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: /^Waiting for you \(\d+\)$/ })
}

/** The pane's heading with its count, exactly. */
function waitingHeading(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('heading', { name: `Waiting for you (${count})`, exact: true })
}

/** The row titles in the pane, in order: each row's one link. */
function rowTitles(pane: Locator): Promise<string[]> {
  return pane.getByRole('link').allTextContents()
}

test.describe('Story 4.2 See every paused book in Waiting for you (ATDD)', () => {
  test.skip('[P1] AC-2 Home shows Waiting for you (N) with each row: serif title link, the 60×5 mini bar, p.120 of 330 and Resume named with the title, and never the paused-at date', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune at p.100. Waiting: Fahrenheit 451 (paused 10 October), The Left Hand of Darkness (22 October).
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING],
    })
    await page.goto(`${server.url}/`)

    // The criterion: a pane headed "Waiting for you (2)".
    await expect(waitingHeading(page, 2)).toBeVisible()

    const pane = waitingPane(page)
    // In the side column, not in the Main book card; oldest pause first.
    await expect(mainBookCard(page).getByRole('region', { name: /^Waiting for you/ })).toHaveCount(0)
    expect(await rowTitles(pane)).toEqual(['Fahrenheit 451', 'The Left Hand of Darkness'])
    // The serif title links to Book detail.
    const title = pane.getByRole('link', { name: 'The Left Hand of Darkness', exact: true })
    await expect(title).toHaveAttribute('href', `/book/${LEFT_HAND_ID}`)
    expect(await fontFamily(title)).toMatch(/^ui-serif/)
    // The 60×5 mini bar, labeled by the title.
    const bar = pane.getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true })
    await expect(bar).toHaveAttribute('aria-valuetext', 'page 120 of 330, 36%')
    expect(await sizeOf(bar)).toEqual({ width: 60, height: 5 })
    await expect(pane.getByRole('progressbar', { name: 'Fahrenheit 451', exact: true })).toHaveAttribute(
      'aria-valuetext',
      'page 40 of 187, 21%',
    )
    // "p.120 of 330" in tabular figures.
    const pages = pane.getByText('p.120 of 330', { exact: true })
    await expect(pages).toBeVisible()
    expect(await pages.evaluate((element) => getComputedStyle(element).fontVariantNumeric)).toContain('tabular-nums')
    await expect(pane.getByText('p.40 of 187', { exact: true })).toBeVisible()
    // Resume, named with the title; the visible label is Resume alone.
    const resume = pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })
    await expect(resume).toHaveText('Resume')
    await expect(pane.getByRole('button', { name: 'Resume Fahrenheit 451', exact: true })).toBeVisible()
    await expect(pane.getByRole('button')).toHaveCount(2)
    // The paused-at date orders the rows and is never shown (UX-DR38, NFR6).
    await expect(pane).not.toContainText(/paused|ago|Oct|2026|22/i)
    // Nothing up next, so the Up next pane reads "Nothing up next.".
    await expect(upNextPane(page).getByText('Nothing up next.', { exact: true })).toBeVisible()
  })

  test.skip('[P2] AC-3 once no paused Reading is left outside Up next, the Waiting for you pane is hidden', async ({
    page,
    seededServer,
  }) => {
    // No Main book; The Left Hand of Darkness is the only paused Reading, and it isn't Up next.
    const server = await seededServer({ books: [LEFT_HAND_WAITING, DUNE] })
    await page.goto(`${server.url}/`)
    // Hidden-ness can't fail on today's code (there is no pane yet), so the
    // leaf takes the transition: one row, then none after resuming it.

    // The criterion's starting state: the pane shows its one row.
    await expect(waitingHeading(page, 1)).toBeVisible()

    await waitingPane(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true }).click()
    const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
    // No Main book, so no trade-off line.
    await expect(dialog).not.toContainText('This pauses')
    await dialog.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(mainBookCard(page).getByRole('link', { name: 'The Left Hand of Darkness', exact: true })).toBeFocused()
    // Nothing paused outside Up next is left: the pane and its heading are gone.
    await expect(waitingPane(page)).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('heading', { name: /^Waiting for you/ })).toHaveCount(0)
    expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
  })

  test.skip('[P2] AC-5 with many paused Readings every row is shown, the side column grows and the page scrolls', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune. Waiting: 20 Books paused on 1 to 20 October, seeded newest first.
    const titles = Array.from({ length: 20 }, (_, n) => `Paused book ${String(n + 1).padStart(2, '0')}`)
    const paused = titles.map((title, n) => ({
      title,
      authors: ['Ann Author'],
      pages: 300,
      readings: [{ currentPage: 30, pausedAt: `2026-10-${String(n + 1).padStart(2, '0')}` }],
    }))
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, ...paused.reverse()] })
    await page.goto(`${server.url}/`)

    // The criterion: all 20, with no cap.
    await expect(waitingHeading(page, 20)).toBeVisible()

    const pane = waitingPane(page)
    await expect(pane.getByRole('progressbar')).toHaveCount(20)
    expect(await rowTitles(pane)).toEqual(titles)
    // No "show more": every link in the pane is a row title.
    await expect(pane.getByRole('link')).toHaveCount(20)
    // The side column grows past the Main book card, and the page scrolls to the last row.
    const paneBox = await pane.boundingBox()
    const cardBox = await mainBookCard(page).boundingBox()
    if (paneBox === null || cardBox === null) throw new Error('not rendered')
    expect(paneBox.y + paneBox.height).toBeGreaterThan(cardBox.y + cardBox.height)
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true)
    const last = pane.getByRole('button', { name: 'Resume Paused book 20', exact: true })
    await expect(last).not.toBeInViewport()
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
  })

  test.skip('[P1] AC-6 Resume on a row opens Resume X? with its Purpose prefilled and the trade-off lines, and confirming makes it Main at its page', async ({
    page,
  }) => {
    // Main: Dune at p.100; Up next: Fahrenheit 451, never started; Waiting: The Left Hand of Darkness at p.120.
    const server = await serverAtFakeToday(page, 'waiting-resume', {
      mainBookId: DUNE_ID,
      upNextBookId: FAHRENHEIT_ID,
      books: [DUNE_MAIN, FAHRENHEIT, LEFT_HAND_WAITING],
    })
    try {
      const starts = requestsTo(page, START_READING)
      await page.goto(`${server.url}/`)
      const resume = waitingPane(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true })

      // The criterion's opener: the row's Resume.
      await expect(resume).toBeVisible()

      await resume.click()
      const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })).toHaveValue(
        LEFT_HAND_PURPOSE,
      )
      // The trade-off lines that apply: the Main book pauses, the never-started Up next is displaced.
      await expect(dialog).toHaveAccessibleDescription(
        'This pauses Dune at p.100 (24%). Fahrenheit 451 returns to the catalog.',
      )
      await dialog.getByRole('button', { name: 'Resume', exact: true }).click()

      const card = mainBookCard(page)
      await expect(card.getByRole('link', { name: 'The Left Hand of Darkness', exact: true })).toBeFocused()
      // Main at its page: the card's gauge reads p.120 (Story 3.1's value text).
      await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '36%, page 120 of 330')
      expect(starts).toHaveLength(1)
      const library = storedLibrary(server)
      expect(library.mainBookId).toBe(LEFT_HAND_ID)
      expect(library.upNextBookId).toBe(DUNE_ID)
      // The same Reading resumes at its page (its `pausedAt` is never cleared, AD-19).
      expect(storedBook(server, LEFT_HAND_ID).readings).toEqual([
        expect.objectContaining({
          id: LEFT_HAND_READING_ID,
          currentPage: 120,
          pausedAt: '2026-10-22',
          finishDate: null,
        }),
      ])
      expect(storedBook(server, DUNE_ID).readings).toEqual([
        expect.objectContaining({ id: DUNE_READING_ID, currentPage: 100, pausedAt: FAKE_TODAY, finishDate: null }),
      ])
      expect(storedBook(server, FAHRENHEIT_ID).readings).toEqual([])
      // Dune is Up next now, so nothing is left waiting.
      await expect(waitingPane(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-7 a paused Book that is also Up next appears only in Up next with Resume, and the count leaves it out', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune. Up next: The Left Hand of Darkness, paused 5 October (the oldest pause). Waiting: Fahrenheit 451.
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND_PAUSED_EARLY, FAHRENHEIT_WAITING],
    })
    await page.goto(`${server.url}/`)

    // The criterion: the count leaves the Up next Book out.
    await expect(waitingHeading(page, 1)).toBeVisible()

    const pane = waitingPane(page)
    expect(await rowTitles(pane)).toEqual(['Fahrenheit 451'])
    await expect(pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })).toHaveCount(0)
    await expect(pane.getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true })).toHaveCount(0)
    // It is in Up next, with Resume.
    await expect(upNextPane(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { name: 'Waiting for you (2)', exact: true })).toHaveCount(
      0,
    )
  })
})
