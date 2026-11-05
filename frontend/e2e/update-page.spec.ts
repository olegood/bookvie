// Story 3.3 Catch up with one page update (ATDD). The Main book card's page
// field takes the absolute page; Update or Enter sends `update-page`. This
// spec reads what the browser shows and what the server stored: the field
// itself, a saved page and its status line, an invalid page, the catch-up in
// at most 2 interactions (PRG-E2E-001), and a couldn't-save. The last page
// (AC-4), `not_main_book` (AC-5) and the standard intent ACs (AC-8) are
// proven at API level in backend/tests/test_update_page.py.
//
// Dates: AC-2 starts `bookvie --fake-today 2026-10-28`, whose clock says "now"
// is local noon that day, and sets the browser clock to the same day in
// Europe/Madrid (TC-2, AD-20).
//
// The seed is The Left Hand of Darkness (330 pages) as the Main book at p.150:
// 45% before, and 212 is 64% after (the server's floor).

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  LEFT_HAND_ID,
  SERVER_NOW,
  libraryBytes,
  mainAt,
  mainBookCard,
  reentryFacts,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
} from './home.ts'
import { UPDATE_PAGE, intentOf, requestsTo } from './intents.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const OUT_OF_RANGE = 'Page must be between 0 and 330.'
const SAVED_212 = 'Page 212 of 330, 64%.'
const GAUGE_150 = '45%, page 150 of 330'
const GAUGE_212 = '64%, page 212 of 330'
const EARLIER = '2026-10-25T21:00:00+01:00'
const NOT_MAIN = "This book isn't your Main book anymore."
const BOOK_GONE = "This book isn't in your catalog anymore."
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** The Left Hand of Darkness as the Main book at p.150, last updated three days before the fake today. */
const MAIN_AT_150 = mainAt(150, {
  reading: { startDate: '2026-10-01', purpose: 'To see how Le Guin builds a world', lastProgressUpdate: EARLIER },
})

/**
 * The same, plus Emma finished in 20 days: Measured pace 20 pages a day, so
 * 180 pages left is ~9 days and 118 is ~6 (Story 3.4's re-entry line).
 */
const PACED_MAIN_AT_150 = mainAt(150, {
  reading: { startDate: '2026-10-01', lastProgressUpdate: EARLIER },
  others: [
    {
      id: '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c',
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
    },
  ],
})

/** The page field: a number input labelled "Page" in the Main book card. */
function pageField(page: Page): Locator {
  return mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
}

function updateButton(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'Update', exact: true })
}

function gauge(page: Page): Locator {
  return mainBookCard(page).getByRole('progressbar')
}

test.describe('Story 3.3 Catch up with one page update (ATDD)', () => {
  test('[P1] AC-1 the Main book card holds the page field: Page, the last saved page, "of 330" as its description, Update to the right, never auto-focused', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    await page.goto(server.url)
    const field = pageField(page)

    await expect(field).toBeVisible()

    // Focus isn't placed in the field (UX-DR36). A first load focuses nothing
    // (PageHeading); after a client-side navigation the route's h1 has it.
    await expect(field).not.toBeFocused()
    const nav = page.getByRole('navigation')
    await nav.getByRole('link', { name: 'Catalog', exact: true }).click()
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Home', exact: true })).toBeFocused()
    await expect(field).not.toBeFocused()
    // Prefilled with the last saved page; a whole-number input.
    await expect(field).toHaveValue('150')
    await expect(field).toHaveAttribute('type', 'number')
    await expect(field).toHaveAttribute('step', '1')
    // "of 330" is linked by aria-describedby.
    await expect(field).toHaveAccessibleDescription('of 330')
    await expect(mainBookCard(page).getByText('of 330', { exact: true })).toBeVisible()
    await expect(field).not.toHaveAttribute('aria-invalid', 'true')
    // Update sits to the right of the field.
    const update = updateButton(page)
    await expect(update).toBeVisible()
    const fieldBox = (await field.boundingBox())!
    const updateBox = (await update.boundingBox())!
    expect(updateBox.x).toBeGreaterThanOrEqual(fieldBox.x + fieldBox.width)
  })

  test('[P0] AC-2 Enter saves the page: update-page stores it with lastProgressUpdate = now, and the gauge and status line follow the refetched view', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'update-page', PACED_MAIN_AT_150)
    try {
      const sent = requestsTo(page, UPDATE_PAGE)
      await page.goto(server.url)
      await expect(reentryFacts(page)).toHaveText(['Last updated 3 days ago', '~9 days left', 'No export yet'])
      await pageField(page).fill('212')
      await pageField(page).press('Enter')

      await expect(page.getByRole('status')).toHaveText(SAVED_212)

      await expect(gauge(page)).toHaveAttribute('aria-valuetext', GAUGE_212)
      await expect(mainBookCard(page).getByText('p.212 of 330', { exact: true })).toBeVisible()
      await expect(pageField(page)).toHaveValue('212')
      // One intent, with the page as a JSON integer.
      expect(sent).toHaveLength(1)
      expect(intentOf(sent[0])).toEqual({ bookId: LEFT_HAND_ID, page: 212 })
      const [reading] = storedBook(server, LEFT_HAND_ID).readings
      expect(reading.currentPage).toBe(212)
      expect(Date.parse(reading.lastProgressUpdate as string)).toBe(SERVER_NOW.getTime())
      expect(reading.finishDate).toBeNull()
      // Story 3.4: the re-entry line follows the refetched view (PRG-E2E-001).
      await expect(reentryFacts(page)).toHaveText(['Last updated today', '~6 days left', 'No export yet'])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 an out-of-range or fractional page is not saved: the field keeps it with aria-invalid and "Page must be between 0 and 330." below it and in alert', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const before = libraryBytes(server)
    await page.goto(server.url)
    const field = pageField(page)

    await expect(field).toBeVisible()

    for (const typed of ['331', '212.5']) {
      await field.fill(typed)
      await updateButton(page).click()
      await expect(page.getByRole('alert')).toHaveText(OUT_OF_RANGE)
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toHaveValue(typed)
      // The message is under the field and linked to it, beside "of 330".
      const message = mainBookCard(page).getByText(OUT_OF_RANGE, { exact: true })
      await expect(message).toBeVisible()
      await expect(field).toHaveAccessibleDescription(/Page must be between 0 and 330\./)
      const fieldBox = (await field.boundingBox())!
      const messageBox = (await message.boundingBox())!
      expect(messageBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1)
      // Nothing saved, nothing moved.
      await expect(gauge(page)).toHaveAttribute('aria-valuetext', GAUGE_150)
      expect(libraryBytes(server)).toBe(before)
    }
  })

  test('[P0] AC-6 a fresh app open catches up in 2 interactions (fill the field, press Update) and under 30 seconds', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const sent = requestsTo(page, UPDATE_PAGE)
    const started = Date.now()
    await page.goto(server.url)
    // Interaction 1: click the field and type. Interaction 2: press Update.
    await pageField(page).fill('212')
    await updateButton(page).click()

    await expect(page.getByRole('status')).toHaveText(SAVED_212)

    expect(Date.now() - started).toBeLessThan(30_000)
    await expect(gauge(page)).toHaveAttribute('aria-valuetext', GAUGE_212)
    expect(sent).toHaveLength(1)
    expect(storedBook(server, LEFT_HAND_ID).readings[0].currentPage).toBe(212)
  })

  test("[P1] AC-7 a couldn't-save keeps the typed page, leaves the gauge where it was, and shows Couldn't save below", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    await page.route(`**${UPDATE_PAGE}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    const before = libraryBytes(server)
    await page.goto(server.url)
    const field = pageField(page)

    await expect(field).toBeVisible()

    await field.fill('212')
    await updateButton(page).click()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(field).toHaveValue('212')
    await expect(gauge(page)).toHaveAttribute('aria-valuetext', GAUGE_150)
    await expect(page.getByRole('status')).toHaveText('')
    // One line below the field.
    const line = mainBookCard(page).getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toBeVisible()
    const fieldBox = (await field.boundingBox())!
    const lineBox = (await line.boundingBox())!
    expect(lineBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1)
    expect(libraryBytes(server)).toBe(before)
  })
})

/** Routes `path` to a 503 couldnt_save once `release` is called, or lets it through with `pass`. */
async function hold(page: Page, path: string, outcome: 'couldnt_save' | 'pass'): Promise<() => void> {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(`**${path}`, async (route) => {
    await held
    if (outcome === 'pass') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
    })
  })
  return release
}

/** Dune paused at p.120 since 20 October, beside the Main book. */
const DUNE_PAUSED = {
  ...DUNE,
  readings: [{ startDate: '2026-09-01', currentPage: 120, pausedAt: '2026-10-20' }],
}

test.describe('Story 3.3 Catch up with one page update (automate)', () => {
  test('[P0] AC-4 Update with the last page saves it: 100%, no dialog, and the Reading stays unfinished', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    await page.goto(server.url)
    await pageField(page).fill('330')
    await updateButton(page).click()

    await expect(page.getByRole('status')).toHaveText('Page 330 of 330, 100%.')
    await expect(gauge(page)).toHaveAttribute('aria-valuetext', '100%, page 330 of 330')
    // reachedLastPage is ignored until Story 3.6: no dialog, the card stays.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(pageField(page)).toHaveValue('330')
    const [reading] = storedBook(server, LEFT_HAND_ID).readings
    expect(reading.currentPage).toBe(330)
    expect(reading.finishDate).toBeNull()
    expect(reading.finishedPages).toBeNull()
    expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
  })

  test('[P1] AC-2 Update with a lower page saves it, and the same page twice announces twice', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const sent = requestsTo(page, UPDATE_PAGE)
    await page.goto(server.url)
    await pageField(page).fill('212')
    await updateButton(page).click()
    await expect(page.getByRole('status')).toHaveText(SAVED_212)

    await pageField(page).fill('200')
    await updateButton(page).click()
    await expect(page.getByRole('status')).toHaveText('Page 200 of 330, 60%.')
    await expect(gauge(page)).toHaveAttribute('aria-valuetext', '60%, page 200 of 330')
    expect(storedBook(server, LEFT_HAND_ID).readings[0].currentPage).toBe(200)

    // The same page again: sent, and announced again (the region empties first).
    await updateButton(page).click()
    await expect(page.getByRole('status')).toHaveText('')
    await expect(page.getByRole('status')).toHaveText('Page 200 of 330, 60%.')
    expect(sent).toHaveLength(3)
    expect(sent.map((request) => intentOf(request).page)).toEqual([212, 200, 200])
  })

  test('[P1] AC-3 a valid save after an invalid or empty page clears aria-invalid, the message and its description', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const sent = requestsTo(page, UPDATE_PAGE)
    await page.goto(server.url)
    const field = pageField(page)

    for (const typed of ['', '-1']) {
      await field.fill(typed)
      await field.press('Enter')
      await expect(page.getByRole('alert')).toHaveText(OUT_OF_RANGE)
      await expect(field).toHaveAttribute('aria-invalid', 'true')
      await expect(field).toHaveValue(typed)
    }
    expect(sent).toHaveLength(0)

    await field.fill('212')
    await updateButton(page).click()
    await expect(page.getByRole('status')).toHaveText(SAVED_212)
    await expect(field).not.toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription('of 330')
    await expect(mainBookCard(page).getByText(OUT_OF_RANGE, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveText('')
    expect(sent).toHaveLength(1)
  })

  test('[P1] AC-5 a stale tab gets not_main_book: nothing changes, and the card shows the current Main book', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(150, { others: [DUNE_PAUSED] }))
    await page.goto(server.url)
    await expect(pageField(page)).toHaveValue('150')

    // Tab B resumes Dune, which pauses The Left Hand of Darkness.
    const tabB = await page.context().newPage()
    await tabB.goto(`${server.url}/book/${DUNE_ID}`)
    await tabB.getByRole('main').getByRole('button', { name: 'Resume', exact: true }).click()
    await tabB.getByRole('dialog', { name: 'Resume Dune?', exact: true }).getByRole('button', { name: 'Resume' }).click()
    await expect(mainBookCard(tabB).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
    expect(storedLibrary(server).mainBookId).toBe(DUNE_ID)
    const before = libraryBytes(server)

    // Tab A still shows The Left Hand of Darkness as Main.
    await pageField(page).fill('212')
    await updateButton(page).click()

    await expect(page.getByRole('alert')).toHaveText(NOT_MAIN)
    expect(libraryBytes(server)).toBe(before)
    // The refreshed views show Dune as the Main book, at its page.
    await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
    await expect(pageField(page)).toHaveValue('120')
    await expect(pageField(page)).toHaveAccessibleDescription('of 412')
    await expect(mainBookCard(page).getByText(NOT_MAIN, { exact: true })).toBeVisible()
    await expect(pageField(page)).toBeFocused()
    await tabB.close()
  })

  test('[P1] AC-8 a stale tab whose Main book was deleted gets book_not_found in alert, and the card shows No Main book.', async ({
    page,
    seededServer,
  }) => {
    // Dune stays, so Home shows the card's "No Main book." rather than the empty shelf.
    const server = await seededServer(mainAt(150, { others: [DUNE] }))
    await page.goto(server.url)
    await expect(pageField(page)).toHaveValue('150')

    // Tab B deletes The Left Hand of Darkness.
    const tabB = await page.context().newPage()
    await tabB.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    await tabB.getByRole('main').getByRole('button', { name: 'Delete', exact: true }).click()
    await tabB.getByRole('alertdialog').getByRole('button', { name: 'Delete book', exact: true }).click()
    await expect(tabB.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeVisible()
    expect(storedLibrary(server).mainBookId).toBeNull()
    const before = libraryBytes(server)

    await pageField(page).fill('212')
    await updateButton(page).click()

    await expect(page.getByRole('alert')).toHaveText(BOOK_GONE)
    await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeVisible()
    await expect(pageField(page)).toHaveCount(0)
    expect(libraryBytes(server)).toBe(before)
    await tabB.close()
  })

  test('[P1] AC-3 a server 422 on page is shown like a client refusal: aria-invalid, the message as description and in alert', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const serverMessage = 'Page must be between 0 and 250.'
    await page.route(`**${UPDATE_PAGE}`, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            kind: 'refusal',
            code: 'invalid_fields',
            message: 'Not saved. 1 field needs attention: Page.',
            fields: [{ field: 'page', message: serverMessage }],
          },
        }),
      }),
    )
    const before = libraryBytes(server)
    await page.goto(server.url)
    const field = pageField(page)
    await field.fill('300')
    await updateButton(page).click()

    await expect(page.getByRole('alert')).toHaveText(serverMessage)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription(`of 330 ${serverMessage}`)
    await expect(field).toHaveValue('300')
    await expect(gauge(page)).toHaveAttribute('aria-valuetext', GAUGE_150)
    expect(libraryBytes(server)).toBe(before)
  })

  test('[P1] AC-7 Update is aria-disabled while the request is out, and a second press sends nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const sent = requestsTo(page, UPDATE_PAGE)
    const release = await hold(page, UPDATE_PAGE, 'pass')
    await page.goto(server.url)
    await pageField(page).fill('212')
    const out = page.waitForRequest((request) => new URL(request.url()).pathname === UPDATE_PAGE)

    await updateButton(page).click()
    await out
    await expect(updateButton(page)).toHaveAttribute('aria-disabled', 'true')
    // Forced: Playwright won't click an aria-disabled button, a person can.
    await updateButton(page).click({ force: true })
    await pageField(page).press('Enter')
    release()

    await expect(page.getByRole('status')).toHaveText(SAVED_212)
    await expect(updateButton(page)).not.toHaveAttribute('aria-disabled', 'true')
    expect(sent).toHaveLength(1)
    expect(storedBook(server, LEFT_HAND_ID).readings[0].currentPage).toBe(212)
  })

  test('[P1] axe finds no WCAG 2.2 AA violations on Home with an invalid page field or a couldn\'t-save line, in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    const release = await hold(page, UPDATE_PAGE, 'couldnt_save')
    release()
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(server.url)
      await pageField(page).fill('331')
      await updateButton(page).click()
      await expect(pageField(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(mainBookCard(page).getByText(OUT_OF_RANGE, { exact: true })).toBeVisible()
      let { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      expect(violations.map(({ id, nodes }) => `${colorScheme} invalid: ${id} (${nodes.length})`)).toEqual([])

      await pageField(page).fill('212')
      await updateButton(page).click()
      await expect(mainBookCard(page).getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
      ;({ violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
      expect(violations.map(({ id, nodes }) => `${colorScheme} couldn't save: ${id} (${nodes.length})`)).toEqual([])
    }
  })
})
