// Story 3.6 Finish my Main book (ATDD). The Finish dialog opens when
// `update-page` answers `reachedLastPage`, or from **Mark finished** on the
// Main book's Book detail; **Done** sends `finish-reading`. This spec reads
// what the browser shows and what the server stored: the dialog itself,
// Cancel and Esc after the last page, Done in flight, and the way home with
// the Readings block. What `finish-reading` stores (AC-2), the Finished on
// refusals (AC-3), AD-19 (AC-7), `reading_already_finished` (AC-8) and the
// standard intent ACs (AC-9) are proven at API level in
// backend/tests/test_finish_reading.py.
//
// Dates: every leaf starts `bookvie --fake-today 2026-10-28` and sets the
// browser clock to the same day in Europe/Madrid (TC-2, AD-20), so Finished on
// is prefilled with 2026-10-28 and the server agrees it is today.
//
// The seed is The Left Hand of Darkness (330 pages) as the Main book at p.300,
// started 1 October with a Purpose, plus Dune never read (0 of 2 finished).
//
// AC-4, AC-5 and AC-6 open the dialog before their criterion assertion (AC-4
// waits for it so Esc can't race its opening): the dialog is what 3.6 adds,
// so locating it is their red failure, as AC-1's first assertion is.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  FAKE_TODAY,
  LEFT_HAND_ID,
  mainAt,
  mainBookCard,
  reentryFacts,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
} from './home.ts'
import { DELETE_BOOK, FINISH_READING, intentOf, requestsTo } from './intents.ts'

const PURPOSE = 'To see how Le Guin builds a world'
const EARLIER = '2026-10-25T21:00:00+01:00'
const DIALOG = 'Finished The Left Hand of Darkness'
const RATINGS = ['No rating', '1 star', '2 stars', '3 stars', '4 stars', '5 stars']
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const ALREADY_FINISHED = 'This reading is already finished.'
const BOOK_GONE = "This book isn't in your catalog anymore."

/** The Main book at p.300 of 330 with a Purpose, last updated three days before the fake today. */
const MAIN_AT_300 = mainAt(300, {
  reading: { startDate: '2026-10-01', purpose: PURPOSE, lastProgressUpdate: EARLIER },
  others: [DUNE],
})

/**
 * The same, plus Emma finished in 20 days: Measured pace 20 pages a day, so
 * 30 pages left is "~2 days left" (Story 3.4), hidden once no pages are left.
 */
const PACED_MAIN_AT_300 = mainAt(300, {
  reading: { startDate: '2026-10-01', purpose: PURPOSE, lastProgressUpdate: EARLIER },
  others: [
    DUNE,
    {
      id: '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c',
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
    },
  ],
})

function pageField(page: Page): Locator {
  return mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
}

function updateButton(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'Update', exact: true })
}

function gauge(page: Page): Locator {
  return mainBookCard(page).getByRole('progressbar')
}

/** The Finish dialog, by its heading "Finished *X*". */
function finishDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: DIALOG, exact: true })
}

function finishedOn(dialog: Locator): Locator {
  return dialog.getByLabel('Finished on', { exact: true })
}

function dialogButton(dialog: Locator, name: string): Locator {
  return dialog.getByRole('button', { name, exact: true })
}

/** Whether the element is shown modal: a `<dialog>` opened with showModal(), or `aria-modal`. */
function isModal(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((element) => element.matches(':modal') || element.getAttribute('aria-modal') === 'true')
}

/** Types the last page into the Main book card and presses Update. */
async function reachLastPage(page: Page): Promise<void> {
  await pageField(page).fill('330')
  await updateButton(page).click()
}

test.describe('Story 3.6 Finish my Main book (ATDD)', () => {
  test('[P1] AC-1 the last page, or Mark finished on Book detail, opens the modal Finish dialog: Finished on prefilled with today and focused, Purpose fulfilled? under the quoted Purpose, Rating with No rating selected, Done and Cancel', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-dialog', MAIN_AT_300)
    try {
      await page.goto(server.url)
      await reachLastPage(page)
      const dialog = finishDialog(page)

      await expect(dialog).toBeVisible()

      expect(await isModal(dialog)).toBe(true)
      // "Finished *X*" with X in serif.
      const title = dialog.getByRole('heading').getByText('The Left Hand of Darkness', { exact: true })
      expect(await title.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/^ui-serif/)
      // Focus starts in Finished on, a date field prefilled with today.
      const date = finishedOn(dialog)
      await expect(date).toBeFocused()
      await expect(date).toHaveAttribute('type', 'date')
      await expect(date).toHaveValue(FAKE_TODAY)
      // The Reading has a Purpose: it is quoted, then asked about, nothing preselected.
      await expect(dialog).toContainText(PURPOSE)
      const fulfilled = dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })
      const answers = fulfilled.getByRole('radio')
      await expect(answers).toHaveCount(3)
      for (const [index, name] of [/^yes$/i, /^partly$/i, /^not yet$/i].entries()) {
        await expect(answers.nth(index)).toHaveAccessibleName(name)
        await expect(answers.nth(index)).not.toBeChecked()
      }
      // Rating: "No rating" first and selected, then 1 to 5 stars.
      const rating = dialog.getByRole('radiogroup', { name: 'Rating', exact: true })
      await expect(rating.getByRole('radio')).toHaveCount(RATINGS.length)
      for (const [index, name] of RATINGS.entries()) {
        await expect(rating.getByRole('radio').nth(index)).toHaveAccessibleName(name)
      }
      await expect(rating.getByRole('radio', { name: 'No rating', exact: true })).toBeChecked()
      await expect(dialogButton(dialog, 'Done')).toBeVisible()
      await expect(dialogButton(dialog, 'Cancel')).toBeVisible()

      // Mark finished on the Main book's Book detail opens the same dialog.
      await dialogButton(dialog, 'Cancel').click()
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true }).click()
      await expect(dialog).toBeVisible()
      await expect(finishedOn(dialog)).toBeFocused()
      await expect(finishedOn(dialog)).toHaveValue(FAKE_TODAY)
      await expect(dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })).toBeVisible()

      // A Book that isn't Main offers no Mark finished (Story 4.5).
      await dialogButton(dialog, 'Cancel').click()
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
      await expect(markFinished(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-4 Esc or Cancel after the last page changes nothing: the Reading stays active at p.330, focus returns to the page field, Update with the same page reopens the dialog, and the gauge shows 100% with days left hidden', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-cancel', PACED_MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(server.url)
      // Setup, which passes today: 30 pages left at 20 a day.
      await expect(reentryFacts(page)).toHaveText(['Last updated 3 days ago', '~2 days left', 'No export yet'])
      await reachLastPage(page)
      await expect(finishDialog(page)).toBeVisible()
      await page.keyboard.press('Escape')

      await expect(pageField(page)).toBeFocused()

      await expect(finishDialog(page)).toBeHidden()
      // The page is saved; the Reading isn't finished and the Book is still Main.
      expect(sent).toHaveLength(0)
      const [reading] = storedBook(server, LEFT_HAND_ID).readings
      expect(reading.currentPage).toBe(330)
      expect(reading.finishDate).toBeNull()
      expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
      // Home shows 100%, and "~N days left" is gone (no pages left, Story 3.4).
      await expect(gauge(page)).toHaveAttribute('aria-valuetext', '100%, page 330 of 330')
      await expect(reentryFacts(page)).toHaveText(['Last updated today', 'No export yet'])
      await expect(pageField(page)).toHaveValue('330')

      // Update again with the same page reopens it; Cancel closes it the same way.
      await updateButton(page).click()
      await expect(finishDialog(page)).toBeVisible()
      await dialogButton(finishDialog(page), 'Cancel').click()
      await expect(finishDialog(page)).toBeHidden()
      await expect(pageField(page)).toBeFocused()
      expect(sent).toHaveLength(0)
      expect(storedBook(server, LEFT_HAND_ID).readings[0].finishDate).toBeNull()
      expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 while finish-reading is in flight Done is aria-disabled and further presses send nothing', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-busy', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      let release!: () => void
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route(`**${FINISH_READING}`, async (route) => {
        await held
        await route.continue()
      })
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true }).click()
      const done = dialogButton(finishDialog(page), 'Done')
      await done.click()

      await expect(done).toHaveAttribute('aria-disabled', 'true')

      // Forced: Playwright won't click an aria-disabled button on its own.
      await done.click({ force: true })
      await done.press('Enter')
      expect(sent).toHaveLength(1)
      release()
      await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeVisible()
      expect(sent).toHaveLength(1)
      expect(storedBook(server, LEFT_HAND_ID).readings[0].finishDate).toBe(FAKE_TODAY)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-6 Done goes to Home with "No Main book." focused, and Book detail\'s Readings block lists the Reading with its start, finish, stars and Purpose fulfilled', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-done', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(server.url)
      await reachLastPage(page)
      const dialog = finishDialog(page)
      await dialog
        .getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })
        .getByRole('radio', { name: /^partly$/i })
        .check()
      await dialog
        .getByRole('radiogroup', { name: 'Rating', exact: true })
        .getByRole('radio', { name: '4 stars', exact: true })
        .check()
      await dialogButton(dialog, 'Done').click()

      await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeFocused()

      await expect(page).toHaveURL(`${server.url}/`)
      await expect(dialog).toBeHidden()
      // One intent with every answer; the server stored it.
      expect(sent).toHaveLength(1)
      expect(intentOf(sent[0])).toEqual({
        bookId: LEFT_HAND_ID,
        finishedOn: FAKE_TODAY,
        purposeFulfilled: 'partly',
        rating: 4,
      })
      expect(storedLibrary(server).mainBookId).toBeNull()
      const [reading] = storedBook(server, LEFT_HAND_ID).readings
      expect(reading).toMatchObject({
        finishDate: FAKE_TODAY,
        finishedPages: 330,
        purposeFulfilled: 'partly',
        rating: 4,
      })

      // Book detail's Readings block: start, finish, stars, Purpose fulfilled.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      const readings = page.getByRole('main').getByRole('region', { name: 'Readings', exact: true })
      const row = readings.getByRole('listitem')
      await expect(row).toHaveCount(1)
      await expect(row).toContainText('Started 1 Oct 2026 · Finished 28 Oct 2026')
      const stars = row.getByRole('img', { name: '4 stars', exact: true })
      await expect(stars).toBeVisible()
      // Filled up to the rating, outlines after: the shape changes, not only the color.
      const fills = await stars
        .locator('svg path')
        .evaluateAll((paths) => paths.map((path) => path.getAttribute('fill')))
      expect(fills).toEqual(['currentColor', 'currentColor', 'currentColor', 'currentColor', 'none'])
      await expect(row).toContainText('Purpose fulfilled: partly')
    } finally {
      await stopAndRemove(server)
    }
  })
})

/** The Main book at p.300 with no Purpose. */
const MAIN_AT_300_NO_PURPOSE = mainAt(300, {
  reading: { startDate: '2026-10-01', purpose: null, lastProgressUpdate: EARLIER },
  others: [DUNE],
})

function markFinished(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true })
}

function ratingGroup(dialog: Locator): Locator {
  return dialog.getByRole('radiogroup', { name: 'Rating', exact: true })
}

function fulfilledGroup(dialog: Locator): Locator {
  return dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })
}

test.describe('Story 3.6 Finish my Main book (automate)', () => {
  test("[P1] AC-9 a couldn't-save keeps the Finish dialog open with every answer, the alert line above its buttons", async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-couldnt-save', MAIN_AT_300)
    try {
      await page.route(`**${FINISH_READING}`, (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
        }),
      )
      const before = storedLibrary(server)
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)
      await finishedOn(dialog).fill('2026-10-27')
      await fulfilledGroup(dialog)
        .getByRole('radio', { name: /^not yet$/i })
        .check()
      await ratingGroup(dialog).getByRole('radio', { name: '2 stars', exact: true }).check()
      const done = dialogButton(dialog, 'Done')

      await done.click()

      const line = dialog.getByText(COULDNT_SAVE, { exact: true })
      await expect(line).toBeVisible()
      await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
      await expect(dialog).toBeVisible()
      await expect(finishedOn(dialog)).toHaveValue('2026-10-27')
      await expect(fulfilledGroup(dialog).getByRole('radio', { name: /^not yet$/i })).toBeChecked()
      await expect(ratingGroup(dialog).getByRole('radio', { name: '2 stars', exact: true })).toBeChecked()
      await expect(done).not.toHaveAttribute('aria-disabled', 'true')
      const lineBox = (await line.boundingBox())!
      const doneBox = (await done.boundingBox())!
      expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(doneBox.y + 1)
      expect(storedLibrary(server)).toEqual(before)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 a Finished on date in the future shows its message under the field, and the dialog stays open', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-future', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)
      const date = finishedOn(dialog)
      await date.fill('2026-10-29')

      await dialogButton(dialog, 'Done').click()

      const message = dialog.getByText("Finished on can't be in the future.", { exact: true })
      await expect(message).toBeVisible()
      await expect(date).toHaveAttribute('aria-invalid', 'true')
      const messageId = await message.getAttribute('id')
      expect((await date.getAttribute('aria-describedby'))?.split(' ')).toContain(messageId)
      await expect(date).toBeFocused()
      await expect(dialog).toBeVisible()
      expect(sent).toHaveLength(1)
      expect(storedBook(server, LEFT_HAND_ID).readings[0].finishDate).toBeNull()
      expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)

      // The start date itself is accepted.
      await date.fill('2026-10-01')
      await dialogButton(dialog, 'Done').click()
      await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeFocused()
      expect(storedBook(server, LEFT_HAND_ID).readings[0].finishDate).toBe('2026-10-01')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-1 a Reading with no Purpose asks no Purpose question, and selected stars change shape', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-no-purpose', MAIN_AT_300_NO_PURPOSE)
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)

      await expect(dialog).toBeVisible()

      await expect(fulfilledGroup(dialog)).toHaveCount(0)
      await expect(dialog.getByText('Purpose fulfilled?')).toHaveCount(0)
      // 3 stars: the first three filled, the last two outlines (shape, not only color).
      const rating = ratingGroup(dialog)
      await rating.getByRole('radio', { name: '3 stars', exact: true }).check()
      const fills = await rating
        .locator('svg path')
        .evaluateAll((paths) => paths.map((path) => path.getAttribute('fill')))
      expect(fills).toEqual(['currentColor', 'currentColor', 'currentColor', 'none', 'none'])
      // Arrow keys move within the group.
      await rating.getByRole('radio', { name: '3 stars', exact: true }).press('ArrowRight')
      await expect(rating.getByRole('radio', { name: '4 stars', exact: true })).toBeChecked()

      await dialogButton(dialog, 'Done').click()
      await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeFocused()
      const [reading] = storedBook(server, LEFT_HAND_ID).readings
      expect(reading).toMatchObject({ finishDate: FAKE_TODAY, purposeFulfilled: null, rating: 4 })
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 choosing a star, then No rating again, finishes with no rating and the Readings row shows no stars', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-unrate', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)
      const rating = ratingGroup(dialog)
      await rating.getByRole('radio', { name: '3 stars', exact: true }).check()
      await rating.getByRole('radio', { name: 'No rating', exact: true }).check()

      // Back to no rating: every star an outline again.
      await expect(rating.getByRole('radio', { name: 'No rating', exact: true })).toBeChecked()
      const fills = await rating
        .locator('svg path')
        .evaluateAll((paths) => paths.map((path) => path.getAttribute('fill')))
      expect(fills).toEqual(['none', 'none', 'none', 'none', 'none'])

      await dialogButton(dialog, 'Done').click()
      await expect(mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })).toBeFocused()
      expect(sent).toHaveLength(1)
      expect(intentOf(sent[0])).toEqual({
        bookId: LEFT_HAND_ID,
        finishedOn: FAKE_TODAY,
        purposeFulfilled: null,
        rating: null,
      })
      const [reading] = storedBook(server, LEFT_HAND_ID).readings
      expect(reading).toMatchObject({ finishDate: FAKE_TODAY, purposeFulfilled: null, rating: null })

      // An unrated, unanswered Reading: dates only, no stars, no answer line.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      const row = page.getByRole('main').getByRole('region', { name: 'Readings', exact: true }).getByRole('listitem')
      await expect(row).toHaveText('Started 1 Oct 2026 · Finished 28 Oct 2026')
      await expect(row.getByRole('img')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-4 Esc from Mark finished on Book detail closes the dialog and returns focus to Mark finished', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-detail-esc', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      await expect(finishDialog(page)).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(markFinished(page)).toBeFocused()
      await expect(finishDialog(page)).toBeHidden()
      expect(sent).toHaveLength(0)
      expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 the open Finish dialog passes axe in both themes', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'finish-axe', MAIN_AT_300)
    try {
      const axe = async (where: string): Promise<string[]> => {
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
      }
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
        await markFinished(page).click()
        const dialog = finishDialog(page)
        await expect(finishedOn(dialog)).toBeFocused()
        await ratingGroup(dialog).getByRole('radio', { name: '4 stars', exact: true }).check()
        expect(await axe(`${colorScheme} dialog`)).toEqual([])
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
      }
    } finally {
      await stopAndRemove(server)
    }
  })
})

/** Another tab finishes The Left Hand of Darkness behind this one's back. */
async function finishElsewhere(page: Page, url: string): Promise<void> {
  const response = await page.request.post(`${url}${FINISH_READING}`, {
    multipart: {
      intent: JSON.stringify({ bookId: LEFT_HAND_ID, finishedOn: FAKE_TODAY, purposeFulfilled: null, rating: null }),
    },
  })
  expect(response.status()).toBe(200)
}

test.describe('Story 3.6 Finish my Main book (review follow-ups)', () => {
  test('[P1] AC-8 a Reading finished in another tab: Done shows "This reading is already finished." in the dialog with the answers kept, from Book detail and from Home', async ({
    page,
  }) => {
    // From Book detail: Cancel then parks focus on `main` (Mark finished is gone).
    let server = await serverAtFakeToday(page, 'finish-stale-detail', MAIN_AT_300)
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)
      await ratingGroup(dialog).getByRole('radio', { name: '3 stars', exact: true }).check()
      await finishElsewhere(page, server.url)

      await dialogButton(dialog, 'Done').click()

      await expect(dialog.getByText(ALREADY_FINISHED, { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      await expect(ratingGroup(dialog).getByRole('radio', { name: '3 stars', exact: true })).toBeChecked()
      await expect(finishedOn(dialog)).toHaveValue(FAKE_TODAY)
      await expect(markFinished(page)).toHaveCount(0)
      await dialogButton(dialog, 'Cancel').click()
      await expect(dialog).toBeHidden()
      await expect(page.locator('#main')).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }

    // From Home: the card empties behind the dialog; Cancel focuses "No Main book.".
    server = await serverAtFakeToday(page, 'finish-stale-home', MAIN_AT_300)
    try {
      await page.goto(server.url)
      await reachLastPage(page)
      const dialog = finishDialog(page)
      await fulfilledGroup(dialog)
        .getByRole('radio', { name: /^partly$/i })
        .check()
      await ratingGroup(dialog).getByRole('radio', { name: '4 stars', exact: true }).check()
      await finishElsewhere(page, server.url)

      await dialogButton(dialog, 'Done').click()

      await expect(dialog.getByText(ALREADY_FINISHED, { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      await expect(fulfilledGroup(dialog).getByRole('radio', { name: /^partly$/i })).toBeChecked()
      await expect(ratingGroup(dialog).getByRole('radio', { name: '4 stars', exact: true })).toBeChecked()
      const empty = mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })
      await expect(empty).toBeAttached()
      await dialogButton(dialog, 'Cancel').click()
      await expect(dialog).toBeHidden()
      await expect(empty).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-8 a Book deleted in another tab: Done from Book detail shows "This book isn\'t in your catalog anymore." in the dialog with the answers kept', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-gone-detail', MAIN_AT_300)
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page)
      await fulfilledGroup(dialog)
        .getByRole('radio', { name: /^partly$/i })
        .check()
      await ratingGroup(dialog).getByRole('radio', { name: '2 stars', exact: true }).check()
      const deleted = await page.request.post(`${server.url}${DELETE_BOOK}`, {
        multipart: { intent: JSON.stringify({ bookId: LEFT_HAND_ID }) },
      })
      expect(deleted.status()).toBe(200)

      await dialogButton(dialog, 'Done').click()

      // The refetched view says not found behind the dialog; the dialog keeps its line and answers.
      await expect(dialog.getByText(BOOK_GONE, { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      await expect(fulfilledGroup(dialog).getByRole('radio', { name: /^partly$/i })).toBeChecked()
      await expect(ratingGroup(dialog).getByRole('radio', { name: '2 stars', exact: true })).toBeChecked()
      await expect(finishedOn(dialog)).toHaveValue(FAKE_TODAY)
      await expect(page.getByRole('heading', { level: 1, name: 'Page not found', exact: true })).toBeAttached()
      await dialogButton(dialog, 'Cancel').click()
      await expect(dialog).toBeHidden()
      await expect(page.locator('#main')).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-6 the finished hand-off focuses "No Main book." once: not after a reload, Back or Forward', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-hand-off', MAIN_AT_300)
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await markFinished(page).click()
      await dialogButton(finishDialog(page), 'Done').click()
      const empty = mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })
      const home = page.getByRole('heading', { level: 1, name: 'Home', exact: true })
      await expect(empty).toBeFocused()

      await page.reload()
      await expect(home).toBeAttached()
      await expect(empty).toBeVisible()
      await expect(empty).not.toBeFocused()

      await page.goBack()
      await expect(page).toHaveURL(`${server.url}/book/${LEFT_HAND_ID}`)
      await page.goForward()
      await expect(page).toHaveURL(`${server.url}/`)
      await expect(home).toBeFocused()
      await expect(empty).not.toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-6 Back after a finish from Home does not reopen the Finish dialog', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'finish-back', MAIN_AT_300)
    try {
      await page.goto(server.url)
      await reachLastPage(page)
      await dialogButton(finishDialog(page), 'Done').click()
      const empty = mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })
      await expect(empty).toBeFocused()

      // Back to the Home entry the dialog opened on: the Book is finished, no dialog.
      await page.goBack()
      await expect(page).toHaveURL(`${server.url}/`)
      await expect(empty).toBeVisible()
      await expect(finishDialog(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})
