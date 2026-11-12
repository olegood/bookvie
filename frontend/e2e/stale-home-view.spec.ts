// The Start and Pause dialogs wait for a fresh home view (Epic 3 item 22's
// follow-up; deferred-work.md, Epic 3 item 22 review and Epic 4 item 38).
//
// - The Start dialog's first render names the Main book and Up next the
//   server has, never those of a home view the page cached before another
//   context changed them.
// - Pause decides between its Confirm dialog and an immediate pause from a
//   home view fetched on the press; a failed fetch sends nothing and shows
//   the couldn't-save line below Pause.
//
// Each leaf caches the home view in this page, changes the state from a
// second browser context through its UI, then acts here without a reload or
// a focus change (so nothing refetches the cache meanwhile). The Start leaves
// record the dialog's first rendered text with a MutationObserver installed
// before the press, and hold this page's home view responses back a little,
// so the `book` view the dialog also waits for always comes in first.

import type { Browser, Locator, Page } from '@playwright/test'
import { expect, test, type Server } from './fixtures.ts'
import { DUNE, DUNE_ID, LEFT_HAND, LEFT_HAND_ID, mainBookCard, startDialog, storedBook } from './home.ts'
import { PAUSE, requestsTo } from './intents.ts'

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const HOME_VIEW = '/api/views/home'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
/** At p.264 of 330 (80%), where the second context moves The Left Hand of Darkness. */
const MOVED_PAUSE_HEADING = 'Pause The Left Hand of Darkness at p.264 (80%)?'

/** The Left Hand of Darkness as the Main book at p.212 of 330 (64%). */
const LEFT_HAND_MAIN = { ...LEFT_HAND, readings: [{ startDate: '2026-10-02', currentPage: 212 }] }
/** Dune paused at p.120 of 412 (29%) since 20 October. */
const DUNE_PAUSED = { ...DUNE, readings: [{ startDate: '2026-10-01', currentPage: 120, pausedAt: '2026-10-20' }] }

/** Book detail's own buttons, in `main`. */
function detailButton(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

/** Opens `path` and waits until this page has fetched (so cached) the home view. */
async function openCachingHome(page: Page, url: string): Promise<void> {
  const homeLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === HOME_VIEW)
  await page.goto(url)
  await homeLoaded
}

/** Runs `act` in a second browser context, as another window would. */
async function elsewhere(browser: Browser, act: (other: Page) => Promise<void>): Promise<void> {
  const context = await browser.newContext()
  try {
    await act(await context.newPage())
  } finally {
    await context.close()
  }
}

/** Holds this page's home view responses back, so the Start dialog's `book` view always lands first. */
async function delayHomeView(page: Page): Promise<void> {
  await page.route(`**${HOME_VIEW}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.continue()
  })
}

/** Records the text the Start dialog has when it first renders. */
async function recordFirstStartDialog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const record = window as unknown as { firstStartDialog?: string }
    record.firstStartDialog = undefined
    const observer = new MutationObserver(() => {
      for (const dialog of Array.from(document.querySelectorAll('dialog'))) {
        const heading = dialog.querySelector('h2')?.textContent ?? ''
        if (/^(Start|Resume) .*\?$/.test(heading)) {
          record.firstStartDialog = dialog.textContent ?? ''
          observer.disconnect()
          return
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

async function firstStartDialog(page: Page): Promise<string> {
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { firstStartDialog?: string }).firstStartDialog))
    .toBeDefined()
  return page.evaluate(() => (window as unknown as { firstStartDialog: string }).firstStartDialog)
}

test.describe('The Start and Pause dialogs wait for a fresh home view', () => {
  test('[P1] Start: a Main book changed elsewhere is the one the dialog first names', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server: Server = await seededServer({
      mainBookId: LEFT_HAND_ID,
      books: [LEFT_HAND_MAIN, DUNE_PAUSED, FAHRENHEIT],
    })
    // Book detail caches a home view with The Left Hand of Darkness as Main.
    await openCachingHome(page, `${server.url}/book/${FAHRENHEIT_ID}`)
    const start = detailButton(page, 'Start reading')
    await expect(start).toBeVisible()

    // Another window resumes Dune: it becomes Main, and The Left Hand of
    // Darkness is paused and becomes Up next.
    await elsewhere(browser, async (other) => {
      await other.goto(`${server.url}/book/${DUNE_ID}`)
      await detailButton(other, 'Resume').click()
      await startDialog(other, 'Resume Dune?').getByRole('button', { name: 'Resume', exact: true }).click()
      await expect(other).toHaveURL(`${server.url}/`)
    })

    await delayHomeView(page)
    await recordFirstStartDialog(page)
    await start.click()

    const first = await firstStartDialog(page)
    expect(first).toContain('This pauses Dune at p.120 (29%).')
    expect(first).toContain('The Left Hand of Darkness moves to Waiting for you.')
    expect(first).not.toContain('This pauses The Left Hand of Darkness')
    await expect(startDialog(page, 'Start Fahrenheit 451?')).toBeVisible()
  })

  test("[P1] Start: an Up next set elsewhere is in the dialog's first displacement line", async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE, FAHRENHEIT] })
    // Home caches a home view with no Up next, then the Catalog (no reload).
    await openCachingHome(page, `${server.url}/`)
    await page.getByRole('navigation').getByRole('link', { name: 'Catalog', exact: true }).click()
    const dune = page.getByRole('button', { name: /^Dune by Frank Herbert/ })
    await expect(dune).toBeVisible()

    // Another window sets Fahrenheit 451 as Up next.
    await elsewhere(browser, async (other) => {
      await other.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
      await detailButton(other, 'Set as Up next').click()
      await expect(other.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')
    })

    await delayHomeView(page)
    await dune.click()
    await recordFirstStartDialog(page)
    await page
      .getByRole('dialog', { name: 'Dune', exact: true })
      .getByRole('button', { name: 'Start reading', exact: true })
      .click()

    const first = await firstStartDialog(page)
    expect(first).toContain('This pauses The Left Hand of Darkness at p.212 (64%).')
    expect(first).toContain('Fahrenheit 451 returns to the catalog.')
    await expect(startDialog(page, 'Start Dune?')).toBeVisible()
  })

  test('[P1] Start: a failed fresh home view cancels the dialog silently, and a later press opens it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE, FAHRENHEIT] })
    await openCachingHome(page, `${server.url}/book/${FAHRENHEIT_ID}`)
    const start = detailButton(page, 'Start reading')
    await expect(start).toBeVisible()
    // Only now: the page itself loaded normally.
    await page.route(`**${HOME_VIEW}`, (route) => route.fulfill({ status: 500, body: '' }))
    const failed = page.waitForResponse((response) => new URL(response.url()).pathname === HOME_VIEW)

    await start.click()
    await failed
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(start).toBeFocused()

    await page.unroute(`**${HOME_VIEW}`)
    await start.click()
    await expect(startDialog(page, 'Start Fahrenheit 451?')).toBeVisible()
  })

  test('[P1] Pause: an Up next set elsewhere gets the Confirm dialog with the fresh page, and nothing is sent until Pause', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE, FAHRENHEIT] })
    const pauses = requestsTo(page, PAUSE)
    // Book detail caches a home view with no Up next.
    await openCachingHome(page, `${server.url}/book/${LEFT_HAND_ID}`)
    const pause = detailButton(page, 'Pause')
    await expect(pause).toBeVisible()

    await elsewhere(browser, async (other) => {
      await other.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
      await detailButton(other, 'Set as Up next').click()
      await expect(other.getByRole('status')).toHaveText('Fahrenheit 451 is Up next.')
      // It also moves The Left Hand of Darkness on from p.212, which this page still caches.
      await other.goto(`${server.url}/`)
      const field = mainBookCard(other).getByRole('spinbutton', { name: 'Page', exact: true })
      await field.fill('264')
      await field.press('Enter')
      await expect.poll(() => storedBook(server, LEFT_HAND_ID).readings[0]?.currentPage).toBe(264)
    })

    await pause.click()
    const dialog = page.getByRole('alertdialog', { name: MOVED_PAUSE_HEADING, exact: true })
    await expect(dialog).toHaveAccessibleDescription('Fahrenheit 451 returns to the catalog.')
    expect(pauses).toHaveLength(0)

    await dialog.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(detailButton(page, 'Resume')).toBeFocused()
    expect(pauses).toHaveLength(1)
  })

  test('[P1] Pause: an Up next removed elsewhere pauses at once, with no dialog', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: LEFT_HAND_ID,
      upNextBookId: FAHRENHEIT_ID,
      books: [LEFT_HAND_MAIN, DUNE, FAHRENHEIT],
    })
    const pauses = requestsTo(page, PAUSE)
    // Book detail caches a home view with Fahrenheit 451 as Up next.
    await openCachingHome(page, `${server.url}/book/${LEFT_HAND_ID}`)
    const pause = detailButton(page, 'Pause')
    await expect(pause).toBeVisible()

    // Another window deletes Fahrenheit 451.
    await elsewhere(browser, async (other) => {
      await other.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
      await detailButton(other, 'Delete').click()
      await other.getByRole('alertdialog').getByRole('button', { name: 'Delete book', exact: true }).click()
      await expect(other).not.toHaveURL(`${server.url}/book/${FAHRENHEIT_ID}`)
    })

    await pause.click()
    await expect(detailButton(page, 'Resume')).toBeFocused()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(pauses).toHaveLength(1)
  })

  test("[P1] Pause: a failed home view check sends nothing and shows the couldn't-save line below Pause", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ mainBookId: LEFT_HAND_ID, books: [LEFT_HAND_MAIN, DUNE, FAHRENHEIT] })
    const pauses = requestsTo(page, PAUSE)
    await openCachingHome(page, `${server.url}/book/${LEFT_HAND_ID}`)
    const pause = detailButton(page, 'Pause')
    await expect(pause).toBeVisible()
    // Only now: the page itself loaded normally.
    await page.route(`**${HOME_VIEW}`, (route) => route.fulfill({ status: 500, body: '' }))

    await pause.click()

    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    const line = page.getByRole('main').getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    const pauseBox = await pause.boundingBox()
    const lineBox = await line.boundingBox()
    expect(lineBox!.y).toBeGreaterThanOrEqual(pauseBox!.y + pauseBox!.height)
    await expect(pause).toBeFocused()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect(pauses).toHaveLength(0)
  })
})
