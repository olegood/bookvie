// Story 4.2 See every paused book in Waiting for you (ATDD, then the green
// follow-ups at the end). Home's side
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

import AxeBuilder from '@axe-core/playwright'
import type { Locator } from '@playwright/test'
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
  rowLinks,
  upNextPane,
  waitingHeading,
  waitingPane,
} from './home.ts'
import { START_READING, requestsTo } from './intents.ts'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const LEFT_HAND_READING_ID = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d'
const DUNE_READING_ID = '0f9e8d7c-6b5a-4493-8271-605f4e3d2c1b'
const RESUME_LEFT_HAND = 'Resume The Left Hand of Darkness'
const LEFT_HAND_PURPOSE = 'To see how Le Guin builds a world'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

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

/** The bar's fill is `fraction` of its track, within 1px (as `expectFill` in home.spec.ts). */
async function expectFill(bar: Locator, fraction: number): Promise<void> {
  const track = await bar.boundingBox()
  const fill = await bar.locator('span').boundingBox()
  if (track === null || fill === null) throw new Error('not rendered')
  expect(Math.abs(fill.width - track.width * fraction)).toBeLessThanOrEqual(1)
}

test.describe('Story 4.2 See every paused book in Waiting for you (ATDD)', () => {
  test('[P1] AC-2 Home shows Waiting for you (N) with each row: serif title link, the 60×5 mini bar, p.120 of 330 and Resume named with the title, and never the paused-at date', async ({
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
    await expect(rowLinks(pane)).toHaveText(['Fahrenheit 451', 'The Left Hand of Darkness'])
    // The serif title links to Book detail.
    const title = pane.getByRole('link', { name: 'The Left Hand of Darkness', exact: true })
    await expect(title).toHaveAttribute('href', `/book/${LEFT_HAND_ID}`)
    expect(await fontFamily(title)).toMatch(/^ui-serif/)
    // The 60×5 mini bar, labeled by the title.
    const bar = pane.getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true })
    await expect(bar).toHaveAttribute('aria-valuetext', 'page 120 of 330, 36%')
    expect(await sizeOf(bar)).toEqual({ width: 60, height: 5 })
    await expect(bar).toHaveAttribute('aria-valuenow', '36')
    await expectFill(bar, 0.36)
    const fahrenheitBar = pane.getByRole('progressbar', { name: 'Fahrenheit 451', exact: true })
    await expect(fahrenheitBar).toHaveAttribute('aria-valuetext', 'page 40 of 187, 21%')
    await expect(fahrenheitBar).toHaveAttribute('aria-valuenow', '21')
    await expectFill(fahrenheitBar, 0.21)
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

  test('[P2] AC-3 once no paused Reading is left outside Up next, the Waiting for you pane is hidden', async ({
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

  test('[P2] AC-5 with many paused Readings every row is shown, the side column grows and the page scrolls', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune. Waiting: 20 Books, "Paused book 01" paused on 20 October down to "Paused book 20" on
    // 1 October, so oldest-pause-first runs against title order: a client re-sort by title would fail.
    const titles = Array.from({ length: 20 }, (_, n) => `Paused book ${String(n + 1).padStart(2, '0')}`)
    const paused = titles.map((title, n) => ({
      title,
      authors: ['Ann Author'],
      pages: 300,
      readings: [{ currentPage: 30, pausedAt: `2026-10-${String(20 - n).padStart(2, '0')}` }],
    }))
    const oldestPauseFirst = [...titles].reverse()
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, ...paused.reverse()] })
    await page.goto(`${server.url}/`)

    // The criterion: all 20, with no cap.
    await expect(waitingHeading(page, 20)).toBeVisible()

    const pane = waitingPane(page)
    await expect(pane.getByRole('progressbar')).toHaveCount(20)
    await expect(rowLinks(pane)).toHaveText(oldestPauseFirst)
    // No "show more": every link in the pane is a row title.
    await expect(pane.getByRole('link')).toHaveCount(20)
    // The side column grows past the Main book card, and the page scrolls to the last row.
    const paneBox = await pane.boundingBox()
    const cardBox = await mainBookCard(page).boundingBox()
    if (paneBox === null || cardBox === null) throw new Error('not rendered')
    expect(paneBox.y + paneBox.height).toBeGreaterThan(cardBox.y + cardBox.height)
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true)
    const last = pane.getByRole('button', { name: 'Resume Paused book 01', exact: true })
    await expect(last).not.toBeInViewport()
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
  })

  test('[P1] AC-6 Resume on a row opens Resume X? with its Purpose prefilled and the trade-off lines, and confirming makes it Main at its page', async ({
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

  test('[P1] AC-7 a paused Book that is also Up next appears only in Up next with Resume, and the count leaves it out', async ({
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
    await expect(rowLinks(pane)).toHaveText(['Fahrenheit 451'])
    await expect(pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })).toHaveCount(0)
    await expect(pane.getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true })).toHaveCount(0)
    // It is in Up next, with Resume.
    await expect(upNextPane(page).getByRole('button', { name: RESUME_LEFT_HAND, exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { name: 'Waiting for you (2)', exact: true })).toHaveCount(
      0,
    )
  })

  // --- Green-phase follow-ups ------------------------------------------------

  test("[P1] AC-6 Cancel on a row's Start dialog returns focus to that row's Resume, and nothing is sent", async ({
    page,
    seededServer,
  }) => {
    // Main: Dune. Waiting: Fahrenheit 451 (first row), The Left Hand of Darkness (second).
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING],
    })
    const starts = requestsTo(page, START_READING)
    await page.goto(`${server.url}/`)
    const pane = waitingPane(page)

    // The first row, so focus can't land on the last row rendered by accident.
    await expect(rowLinks(pane)).toHaveText(['Fahrenheit 451', 'The Left Hand of Darkness'])
    const resume = pane.getByRole('button', { name: 'Resume Fahrenheit 451', exact: true })
    await resume.click()
    const dialog = startDialog(page, 'Resume Fahrenheit 451?')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(resume).toBeFocused()

    // Esc from the second row's dialog lands on the second row's button.
    const second = pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })
    await second.click()
    await expect(startDialog(page, 'Resume The Left Hand of Darkness?')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(second).toBeFocused()
    expect(starts).toHaveLength(0)
    expect(storedLibrary(server).mainBookId).toBe(DUNE_ID)
  })

  test("[P1] AC-6 with a paused Up next, a row's dialog says it moves to Waiting for you, and after confirming it is a row", async ({
    page,
    seededServer,
  }) => {
    // Main: Dune at p.100. Up next: The Left Hand of Darkness, paused 5 October. Waiting: Fahrenheit 451.
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE_MAIN, LEFT_HAND_PAUSED_EARLY, FAHRENHEIT_WAITING],
    })
    await page.goto(`${server.url}/`)
    await expect(waitingHeading(page, 1)).toBeVisible()

    await waitingPane(page).getByRole('button', { name: 'Resume Fahrenheit 451', exact: true }).click()
    const dialog = startDialog(page, 'Resume Fahrenheit 451?')
    await expect(dialog).toHaveAccessibleDescription(
      'This pauses Dune at p.100 (24%). The Left Hand of Darkness moves to Waiting for you.',
    )
    await dialog.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(mainBookCard(page).getByRole('link', { name: 'Fahrenheit 451', exact: true })).toBeFocused()

    // The interrupted Dune is Up next, so not waiting; the displaced Up next is the one row.
    await expect(waitingHeading(page, 1)).toBeVisible()
    await expect(rowLinks(waitingPane(page))).toHaveText(['The Left Hand of Darkness'])
    await expect(upNextPane(page).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
    await expect(
      waitingPane(page).getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true }),
    ).toHaveAttribute('aria-valuetext', 'page 120 of 330, 36%')
    const library = storedLibrary(server)
    expect(library.mainBookId).toBe(FAHRENHEIT_ID)
    expect(library.upNextBookId).toBe(DUNE_ID)
  })

  test('[P2] AC-3 with nothing paused, or only a paused Up next, there is no Waiting for you pane, with or without a Main book', async ({
    page,
    seededServer,
  }) => {
    const seeds: [string, Record<string, unknown>][] = [
      ['nothing paused, a Main book', { mainBookId: DUNE_ID, books: [DUNE_MAIN, FAHRENHEIT] }],
      ['nothing paused, no Main book', { books: [DUNE, FAHRENHEIT] }],
      [
        'only a paused Up next, a Main book',
        { mainBookId: DUNE_ID, upNextBookId: LEFT_HAND_ID, books: [DUNE_MAIN, LEFT_HAND_WAITING] },
      ],
      ['only a paused Up next, no Main book', { upNextBookId: LEFT_HAND_ID, books: [DUNE, LEFT_HAND_WAITING] }],
    ]
    for (const [name, seed] of seeds) {
      const server = await seededServer(seed)
      await page.goto(`${server.url}/`)
      await expect(mainBookCard(page), name).toBeVisible()
      await expect(waitingPane(page), name).toHaveCount(0)
      await expect(page.getByRole('main').getByRole('heading', { name: /^Waiting for you/ }), name).toHaveCount(0)
    }
  })

  test('[P2] AC-2 the pane comes after Up next in the side column, reads (1) for one row, and shows beside the empty card with no Main book', async ({
    page,
    seededServer,
  }) => {
    // Main: Dune. Waiting: The Left Hand of Darkness alone.
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, LEFT_HAND_WAITING] })
    await page.goto(`${server.url}/`)
    await expect(waitingHeading(page, 1)).toBeVisible()
    // Up next first, then Waiting for you, in document order and on screen.
    const waitingElement = await waitingPane(page).elementHandle()
    const after = await upNextPane(page).evaluate(
      (upNext, waiting) =>
        waiting !== null && (upNext.compareDocumentPosition(waiting) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      waitingElement,
    )
    expect(after).toBe(true)
    const upNextBox = await upNextPane(page).boundingBox()
    const waitingBox = await waitingPane(page).boundingBox()
    if (upNextBox === null || waitingBox === null) throw new Error('not rendered')
    expect(waitingBox.y).toBeGreaterThanOrEqual(upNextBox.y + upNextBox.height)

    // No Main book: the Up next pane is hidden, and the pane sits beside the empty card.
    const noMain = await seededServer({ books: [DUNE, LEFT_HAND_WAITING] })
    await page.goto(`${noMain.url}/`)
    await expect(mainBookCard(page).getByText('No Main book.', { exact: true })).toBeVisible()
    await expect(upNextPane(page)).toHaveCount(0)
    await expect(waitingHeading(page, 1)).toBeVisible()
    const cardBox = await mainBookCard(page).boundingBox()
    const paneBox = await waitingPane(page).boundingBox()
    if (cardBox === null || paneBox === null) throw new Error('not rendered')
    expect(paneBox.x).toBeGreaterThanOrEqual(cardBox.x + cardBox.width)
  })

  test("[P1] AC-4 another context resumes a row: this one's pane and count follow once it regains focus, with no warning", async ({
    page,
    browser,
    seededServer,
  }) => {
    // Main: Dune. Waiting: Fahrenheit 451, The Left Hand of Darkness.
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING],
    })
    await page.goto(`${server.url}/`)
    await expect(waitingHeading(page, 2)).toBeVisible()
    const otherContext = await browser.newContext()
    try {
      const other = await otherContext.newPage()
      await other.goto(`${server.url}/`)
      await waitingPane(other).getByRole('button', { name: RESUME_LEFT_HAND, exact: true }).click()
      await startDialog(other, 'Resume The Left Hand of Darkness?')
        .getByRole('button', { name: 'Resume', exact: true })
        .click()
      await expect(
        mainBookCard(other).getByRole('link', { name: 'The Left Hand of Darkness', exact: true }),
      ).toBeFocused()

      // This context regains focus, and its views refetch.
      await page.bringToFront()
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      // Dune is Up next now; only Fahrenheit 451 is still waiting.
      await expect(waitingHeading(page, 1)).toBeVisible()
      await expect(rowLinks(waitingPane(page))).toHaveText(['Fahrenheit 451'])
      await expect(page.getByRole('alert')).toHaveText('')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    } finally {
      await otherContext.close()
    }
  })

  test('[P2] AC-2 axe finds nothing on Home with the Waiting for you pane, in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING, FAHRENHEIT_WAITING],
    })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/`)
      await expect(waitingHeading(page, 2)).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
    }
  })

  test("[P1] AC-6 a couldn't-save on Resume from a row keeps the dialog open with its alert line, and nothing changes", async ({
    page,
    seededServer,
  }) => {
    const couldntSave = "Couldn't save. Your data wasn't changed."
    const server = await seededServer({
      mainBookId: DUNE_ID,
      books: [DUNE_MAIN, LEFT_HAND_WAITING],
    })
    await page.route(`**${START_READING}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: couldntSave } }),
      }),
    )
    const before = JSON.stringify(storedLibrary(server))
    await page.goto(`${server.url}/`)
    const pane = waitingPane(page)

    await pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true }).click()
    const dialog = startDialog(page, 'Resume The Left Hand of Darkness?')
    const confirm = dialog.getByRole('button', { name: 'Resume', exact: true })
    await confirm.click()

    await expect(page.getByRole('alert')).toHaveText(couldntSave)
    await expect(dialog.getByText(couldntSave, { exact: true })).toBeVisible()
    await expect(confirm).toBeFocused()
    await expect(waitingHeading(page, 1)).toBeVisible()
    expect(JSON.stringify(storedLibrary(server))).toBe(before)
  })
})

test.describe('Story 4.2 See every paused book in Waiting for you (automate)', () => {
  test('[P2] AC-2 a long title clamps to 2 lines in its row, and the row stays inside the pane', async ({
    page,
    seededServer,
  }) => {
    const longTitle =
      'The Long and Winding Account of a Very Patient Reader Who Kept Every Book She Ever Paused Within Reach'
    // Paused 5 October, so it is the first row and Fahrenheit 451 (10 October) the row below it.
    const long = { ...LEFT_HAND_PAUSED_EARLY, title: longTitle }
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, long, FAHRENHEIT_WAITING] })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${server.url}/`)
    const pane = waitingPane(page)
    const title = pane.getByRole('link', { name: longTitle, exact: true })
    await expect(title).toBeVisible()
    await expect(rowLinks(pane)).toHaveText([longTitle, 'Fahrenheit 451'])

    const lines = await title.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        lineHeight: parseFloat(style.lineHeight),
        height: element.getBoundingClientRect().height,
        clipped: element.scrollHeight > element.clientHeight,
      }
    })
    // Exactly 2 lines shown, and the rest is clipped.
    expect(Math.round(lines.height / lines.lineHeight)).toBe(2)
    expect(lines.clipped).toBe(true)
    // The row's bar, page line and Resume stay inside the pane, on one line.
    const paneBox = await pane.boundingBox()
    const barBox = await pane.getByRole('progressbar', { name: longTitle, exact: true }).boundingBox()
    const buttonBox = await pane.getByRole('button', { name: `Resume ${longTitle}`, exact: true }).boundingBox()
    if (paneBox === null || barBox === null || buttonBox === null) throw new Error('not rendered')
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(paneBox.x + paneBox.width)
    expect(Math.abs(buttonBox.y + buttonBox.height / 2 - (barBox.y + barBox.height / 2))).toBeLessThanOrEqual(1)
    // The next row's title starts below this row's button.
    const nextBox = await pane.getByRole('link', { name: 'Fahrenheit 451', exact: true }).boundingBox()
    if (nextBox === null) throw new Error('not rendered')
    expect(nextBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height)
  })

  test('[P2] AC-2 under forced colors the mini bar keeps a visible track and a fill distinct from it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: DUNE_ID, books: [DUNE_MAIN, LEFT_HAND_WAITING] })
    const bar = waitingPane(page).getByRole('progressbar', { name: 'The Left Hand of Darkness', exact: true })
    const colors = () =>
      bar.evaluate((element) => {
        const track = getComputedStyle(element)
        const fill = getComputedStyle(element.querySelector('span')!)
        return { track: track.backgroundColor, border: track.borderTopColor, fill: fill.backgroundColor }
      })

    // Normal colors: the accent fill on the accent-soft track.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' })
    await page.goto(`${server.url}/`)
    const normal = await colors()
    expect(normal.fill).not.toBe(normal.track)

    // Forced colors: a CanvasText outline and fill on a Canvas track, so the value still reads.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const forced = await colors()
    expect(forced.fill).not.toBe(forced.track)
    expect(forced.border).toBe(forced.fill)
    expect(forced.fill).not.toBe(normal.fill)
    await expectFill(bar, 0.36)
  })

  test("[P1] AC-7 with no Main book a paused Up next is only the empty card's suggestion, and a row's Cancel still returns to that row", async ({
    page,
    seededServer,
  }) => {
    // No Main book. Up next: The Left Hand of Darkness, paused 5 October (the oldest pause). Waiting: Fahrenheit 451.
    const server = await seededServer({
      upNextBookId: LEFT_HAND_ID,
      books: [DUNE, LEFT_HAND_PAUSED_EARLY, FAHRENHEIT_WAITING],
    })
    const starts = requestsTo(page, START_READING)
    await page.goto(`${server.url}/`)
    const card = mainBookCard(page)
    const suggestion = card.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })

    // The Up next Book is the card's suggestion, and the pane counts only the other paused Book.
    await expect(card.getByRole('heading', { name: 'No Main book.', exact: true })).toBeVisible()
    await expect(suggestion).toBeVisible()
    await expect(upNextPane(page)).toHaveCount(0)
    await expect(waitingHeading(page, 1)).toBeVisible()
    const pane = waitingPane(page)
    await expect(rowLinks(pane)).toHaveText(['Fahrenheit 451'])
    await expect(pane.getByRole('button', { name: RESUME_LEFT_HAND, exact: true })).toHaveCount(0)

    // The row's dialog has no trade-off line, and Cancel returns to the row, not to the card's suggestion.
    const resume = pane.getByRole('button', { name: 'Resume Fahrenheit 451', exact: true })
    await resume.click()
    const dialog = startDialog(page, 'Resume Fahrenheit 451?')
    await expect(dialog).not.toContainText('This pauses')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(resume).toBeFocused()
    expect(starts).toHaveLength(0)
    expect(storedLibrary(server).upNextBookId).toBe(LEFT_HAND_ID)
  })
})
