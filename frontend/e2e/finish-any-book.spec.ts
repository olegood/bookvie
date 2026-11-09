// Story 4.5 Mark any book finished from its page. Book detail offers **Mark
// finished** for the Main book, a Book with a Reading in progress, or a Book
// never finished; a non-Main finish reuses the Finish dialog but keeps the
// user on Book detail: focus goes to the `h1`, then `status` reads "Finished
// *X*.". This spec reads what the browser shows and what the server stored.
// What `finish-reading` stores on the non-Main paths (the back-fill, the
// pointers cleared), its refusals and the standard intent ACs are proven at
// API level in backend/tests/test_finish_any_book.py.
//
// Dates: every leaf starts `bookvie --fake-today 2026-10-28` and sets the
// browser clock to the same day in Europe/Madrid (TC-2, AD-20), so Finished
// on is prefilled with 2026-10-28.
//
// The Main book is always The Left Hand of Darkness at p.300 of 330.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { spine } from './bookcase.ts'
import {
  FAKE_TODAY,
  LEFT_HAND_ID,
  libraryBytes,
  mainAt,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
  upNextPane,
  waitingPane,
} from './home.ts'
import { FINISH_READING, requestsTo } from './intents.ts'

const NEUROMANCER_ID = '4c1d2e3f-5a6b-4c7d-8e9f-a0b1c2d3e4f5'
const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const EMMA_ID = '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c'
const CYBERSPACE = 'To see where cyberspace began'
const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."

/** Neuromancer paused at p.50 of 271 since 20 October, started 1 October, with a Purpose. */
const NEUROMANCER_PAUSED = {
  id: NEUROMANCER_ID,
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  readings: [{ startDate: '2026-10-01', currentPage: 50, purpose: CYBERSPACE, pausedAt: '2026-10-20' }],
}
/** Fahrenheit 451 paused at p.40 of 187 since 10 October, no Purpose. */
const FAHRENHEIT_PAUSED = {
  id: FAHRENHEIT_ID,
  title: 'Fahrenheit 451',
  authors: ['Ray Bradbury'],
  pages: 187,
  readings: [{ startDate: '2026-09-28', currentPage: 40, pausedAt: '2026-10-10' }],
}
/** Emma, never read in bookvie. */
const EMMA = { id: EMMA_ID, title: 'Emma', authors: ['Jane Austen'], pages: 400 }
/** Emma finished in April, no Reading in progress. */
const EMMA_FINISHED = {
  ...EMMA,
  readings: [{ startDate: '2026-04-01', currentPage: 400, finishDate: '2026-04-20', finishedPages: 400 }],
}

const MAIN_AND_PAUSED_UP_NEXT = { ...mainAt(300, { others: [NEUROMANCER_PAUSED] }), upNextBookId: NEUROMANCER_ID }
const MAIN_AND_WAITING = mainAt(300, { others: [FAHRENHEIT_PAUSED] })
const MAIN_AND_NEVER_READ_UP_NEXT = { ...mainAt(300, { others: [EMMA] }), upNextBookId: EMMA_ID }

function markFinished(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true })
}

function heading(page: Page, title: string): Locator {
  return page.getByRole('main').getByRole('heading', { level: 1, name: title, exact: true })
}

function finishDialog(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: `Finished ${title}`, exact: true })
}

function finishedOn(dialog: Locator): Locator {
  return dialog.getByLabel('Finished on', { exact: true })
}

function fulfilledGroup(dialog: Locator): Locator {
  return dialog.getByRole('radiogroup', { name: 'Purpose fulfilled?', exact: true })
}

function readingRows(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Readings', exact: true }).getByRole('listitem')
}

/**
 * Records, each time the `status` region gets text, that text and the text
 * of the focused element at that moment: focus must land before the line is set.
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

test.describe('Story 4.5 Mark any book finished from its page', () => {
  test('[P0] a paused Up next with a Purpose: the dialog asks the Purpose question; Done stays on Book detail, focuses the h1, then status reads "Finished Neuromancer."; Home keeps the Main book with no Up next and nothing waiting', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-any-up-next', MAIN_AND_PAUSED_UP_NEXT)
    try {
      const sent = requestsTo(page, FINISH_READING)
      const url = `${server.url}/book/${NEUROMANCER_ID}`
      await page.goto(url)
      await expect(heading(page, 'Neuromancer')).toBeVisible()
      await watchStatus(page)

      await markFinished(page).click()
      const dialog = finishDialog(page, 'Neuromancer')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText(CYBERSPACE)
      await expect(fulfilledGroup(dialog)).toBeVisible()
      await fulfilledGroup(dialog).getByRole('radio', { name: /^yes$/i }).check()
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()

      await expect(dialog).toHaveCount(0)
      await expect(heading(page, 'Neuromancer')).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('Finished Neuromancer.')
      expect(await statusSeen(page)).toEqual([{ text: 'Finished Neuromancer.', focused: 'Neuromancer' }])
      await expect(page).toHaveURL(url)
      expect(sent).toHaveLength(1)
      // The Readings block lists the finish; the Book is no longer offered Mark finished.
      await expect(readingRows(page)).toHaveCount(1)
      await expect(readingRows(page).first()).toContainText('Started 1 Oct 2026 · Finished 28 Oct 2026')
      await expect(markFinished(page)).toHaveCount(0)

      const library = storedLibrary(server)
      expect(library.mainBookId).toBe(LEFT_HAND_ID)
      expect(library.upNextBookId).toBeNull()
      expect(storedBook(server, NEUROMANCER_ID).readings[0]).toMatchObject({
        finishDate: FAKE_TODAY,
        finishedPages: 271,
        purposeFulfilled: 'yes',
      })

      await page.goto(server.url)
      await expect(mainBookCard(page)).toContainText('The Left Hand of Darkness')
      await expect(upNextPane(page).getByText('Nothing up next.', { exact: true })).toBeVisible()
      await expect(waitingPane(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a Book Waiting for you, finished from Book detail, leaves Waiting for you and the Main book is unchanged', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-any-waiting', MAIN_AND_WAITING)
    try {
      await page.goto(server.url)
      await expect(waitingPane(page).getByRole('link', { name: 'Fahrenheit 451', exact: true })).toBeVisible()

      await page.goto(`${server.url}/book/${FAHRENHEIT_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page, 'Fahrenheit 451')
      await expect(dialog).toBeVisible()
      await expect(fulfilledGroup(dialog)).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(heading(page, 'Fahrenheit 451')).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('Finished Fahrenheit 451.')

      expect(storedLibrary(server).mainBookId).toBe(LEFT_HAND_ID)
      await page.goto(server.url)
      await expect(mainBookCard(page)).toContainText('The Left Hand of Darkness')
      await expect(waitingPane(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P0] a never-read Up next: no Purpose question; finished on 14 August 2019, its Readings block lists the finish, its spine is drawn as read and Home has no Up next', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-any-never-read', MAIN_AND_NEVER_READ_UP_NEXT)
    try {
      await page.goto(`${server.url}/book/${EMMA_ID}`)
      await expect(readingRows(page)).toHaveCount(0)
      await markFinished(page).click()
      const dialog = finishDialog(page, 'Emma')
      await expect(dialog).toBeVisible()
      await expect(fulfilledGroup(dialog)).toHaveCount(0)
      await expect(dialog.getByText('Purpose fulfilled?')).toHaveCount(0)
      await finishedOn(dialog).fill('2019-08-14')
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()

      await expect(heading(page, 'Emma')).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('Finished Emma.')
      await expect(readingRows(page)).toHaveText(['Finished 14 Aug 2019'])
      await expect(markFinished(page)).toHaveCount(0)
      const [reading] = storedBook(server, EMMA_ID).readings
      expect(reading).toMatchObject({ startDate: null, finishDate: '2019-08-14', finishedPages: 400, purpose: null })
      expect(storedLibrary(server).upNextBookId).toBeNull()

      await page.goto(`${server.url}/catalog`)
      await expect(spine(page, 'Emma by Jane Austen, finished')).toBeVisible()

      await page.goto(server.url)
      await expect(upNextPane(page).getByText('Nothing up next.', { exact: true })).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a finished Book with no Reading in progress offers no Mark finished, Up next or not', async ({ page }) => {
    for (const upNext of [true, false]) {
      const library = mainAt(300, { others: [EMMA_FINISHED] })
      const server = await serverAtFakeToday(
        page,
        `finish-any-finished-${upNext}`,
        upNext ? { ...library, upNextBookId: EMMA_ID } : library,
      )
      try {
        await page.goto(`${server.url}/book/${EMMA_ID}`)
        await expect(heading(page, 'Emma')).toBeVisible()
        await expect(page.getByRole('main').getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
        await expect(markFinished(page)).toHaveCount(0)
      } finally {
        await stopAndRemove(server)
      }
    }
  })

  test('[P1] a paused Book finished before its start shows the message under Finished on and the dialog stays open', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-any-before-start', MAIN_AND_PAUSED_UP_NEXT)
    try {
      await page.goto(`${server.url}/book/${NEUROMANCER_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page, 'Neuromancer')
      const date = finishedOn(dialog)
      await date.fill('2026-09-30')
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()

      await expect(
        dialog.getByText("Finished on can't be before 1 October 2026, when this reading started.", { exact: true }),
      ).toBeVisible()
      await expect(date).toHaveAttribute('aria-invalid', 'true')
      await expect(date).toBeFocused()
      await expect(dialog).toBeVisible()
      expect(storedBook(server, NEUROMANCER_ID).readings[0].finishDate).toBeNull()
      expect(storedLibrary(server).upNextBookId).toBe(NEUROMANCER_ID)
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P1] a couldn't-save on a non-Main finish shows the alert line in the dialog and changes nothing", async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-any-couldnt-save', MAIN_AND_NEVER_READ_UP_NEXT)
    try {
      await page.route(`**${FINISH_READING}`, (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
        }),
      )
      const before = libraryBytes(server)
      await page.goto(`${server.url}/book/${EMMA_ID}`)
      await markFinished(page).click()
      const dialog = finishDialog(page, 'Emma')
      await finishedOn(dialog).fill('2019-08-14')
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()

      await expect(dialog.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
      await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
      await expect(dialog).toBeVisible()
      await expect(finishedOn(dialog)).toHaveValue('2019-08-14')
      expect(libraryBytes(server)).toBe(before)
    } finally {
      await stopAndRemove(server)
    }
  })
})
