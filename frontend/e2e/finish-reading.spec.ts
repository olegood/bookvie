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

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
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
import { FINISH_READING, intentOf, requestsTo } from './intents.ts'

const PURPOSE = 'To see how Le Guin builds a world'
const EARLIER = '2026-10-25T21:00:00+01:00'
const DIALOG = 'Finished The Left Hand of Darkness'
const RATINGS = ['No rating', '1 star', '2 stars', '3 stars', '4 stars', '5 stars']

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
  test.skip('[P1] AC-1 the last page, or Mark finished on Book detail, opens the modal Finish dialog: Finished on prefilled with today and focused, Purpose fulfilled? under the quoted Purpose, Rating with No rating selected, Done and Cancel', async ({
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
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-4 Esc or Cancel after the last page changes nothing: the Reading stays active at p.330, focus returns to the page field, Update with the same page reopens the dialog, and the gauge shows 100% with days left hidden', async ({
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

  test.skip('[P2] AC-5 while finish-reading is in flight Done is aria-disabled and further presses send nothing', async ({
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

      await done.click()
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

  test.skip('[P1] AC-6 Done goes to Home with "No Main book." focused, and Book detail\'s Readings block lists the Reading with its start, finish, stars and Purpose fulfilled', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-done', MAIN_AT_300)
    try {
      const sent = requestsTo(page, FINISH_READING)
      await page.goto(server.url)
      await reachLastPage(page)
      const dialog = finishDialog(page)
      await dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true }).getByRole('radio', { name: /^partly$/i }).check()
      await dialog.getByRole('radiogroup', { name: 'Rating', exact: true }).getByRole('radio', { name: '4 stars', exact: true }).check()
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
      expect(reading).toMatchObject({ finishDate: FAKE_TODAY, finishedPages: 330, purposeFulfilled: 'partly', rating: 4 })

      // Book detail's Readings block: start, finish, stars, Purpose fulfilled.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      const readings = page.getByRole('main').getByRole('region', { name: 'Readings', exact: true })
      const row = readings.getByRole('listitem')
      await expect(row).toHaveCount(1)
      await expect(row).toContainText('Started 1 Oct 2026 · Finished 28 Oct 2026')
      await expect(row.getByRole('img', { name: '4 stars', exact: true })).toBeVisible()
      await expect(row).toContainText('Purpose fulfilled: partly')
    } finally {
      await stopAndRemove(server)
    }
  })
})
