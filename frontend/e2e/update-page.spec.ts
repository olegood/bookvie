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

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  LEFT_HAND_ID,
  SERVER_NOW,
  libraryBytes,
  mainAt,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
} from './home.ts'
import { UPDATE_PAGE, intentOf, requestsTo } from './intents.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const OUT_OF_RANGE = 'Page must be between 0 and 330.'
const SAVED_212 = 'Page 212 of 330, 64%.'
const GAUGE_150 = '45%, page 150 of 330'
const GAUGE_212 = '64%, page 212 of 330'
const EARLIER = '2026-10-25T21:00:00+01:00'

/** The Left Hand of Darkness as the Main book at p.150, last updated three days before the fake today. */
const MAIN_AT_150 = mainAt(150, {
  reading: { startDate: '2026-10-01', purpose: 'To see how Le Guin builds a world', lastProgressUpdate: EARLIER },
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
  test.skip('[P1] AC-1 the Main book card holds the page field: Page, the last saved page, "of 330" as its description, Update to the right, never auto-focused', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(MAIN_AT_150)
    await page.goto(server.url)
    const field = pageField(page)

    await expect(field).toBeVisible()

    // Focus isn't placed in the field (UX-DR36): the route's h1 has it.
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

  test.skip('[P0] AC-2 Enter saves the page: update-page stores it with lastProgressUpdate = now, and the gauge and status line follow the refetched view', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'update-page', MAIN_AT_150)
    try {
      const sent = requestsTo(page, UPDATE_PAGE)
      await page.goto(server.url)
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
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-3 an out-of-range or fractional page is not saved: the field keeps it with aria-invalid and "Page must be between 0 and 330." below it and in alert', async ({
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

  test.skip('[P0] AC-6 a fresh app open catches up in 2 interactions (fill the field, press Update) and under 30 seconds', async ({
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

  test.skip("[P1] AC-7 a couldn't-save keeps the typed page, leaves the gauge where it was, and shows Couldn't save below", async ({
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
