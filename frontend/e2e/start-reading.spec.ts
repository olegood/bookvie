// Story 3.2 Start reading a book (ATDD). Every start or resume goes through
// the Start dialog, which carries the optional Purpose. This spec reads what
// the browser shows and what the server stored: the dialog, Resume, the pause
// line, Cancel and Esc, the spine popover's start actions, and Edit Purpose.
// The re-read (AC-3), `already_main` (AC-4) and the standard intent ACs
// (AC-11) are proven at API level in backend/tests/test_start_reading.py.
//
// Dates: AC-2, AC-5 and AC-6 start `bookvie --fake-today 2026-10-28`, whose
// clock says "now" is local noon that day, and set the browser clock to the
// same day in Europe/Madrid (TC-2, AD-20). None of these leaves reads
// `upNextBookId`: Story 4.1 decides where the paused Book goes (FR-7).

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import {
  DUNE,
  DUNE_ID,
  FAKE_TODAY,
  LEFT_HAND,
  LEFT_HAND_ID,
  SERVER_NOW,
  libraryBytes,
  mainAt,
  mainBookCard,
  serverAtFakeToday,
  stopAndRemove,
  storedBook,
  storedLibrary,
} from './home.ts'
import { EDIT_PURPOSE, START_READING, requestsTo } from './intents.ts'
import { spine } from './bookcase.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."

const FAHRENHEIT_ID = '9d4e7a10-2b3c-4d5e-8f60-718293a4b5c6'
const FAHRENHEIT_READING_ID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f'
const FAHRENHEIT = { id: FAHRENHEIT_ID, title: 'Fahrenheit 451', authors: ['Ray Bradbury'], pages: 187 }
const DUNE_READING_ID = '0f9e8d7c-6b5a-4493-8271-605f4e3d2c1b'
const DUNE_PURPOSE = 'Reread for the ecology of Arrakis'
const LEFT_HAND_PURPOSE = 'To see how Le Guin builds a world'
const NEUROMANCER = {
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  readings: [{ startDate: '2026-02-01', currentPage: 271, finishDate: '2026-03-01', finishedPages: 271 }],
}
/** Dune paused at p.120 since 20 October, with a Purpose. */
const DUNE_PAUSED = {
  ...DUNE,
  readings: [
    {
      id: DUNE_READING_ID,
      startDate: '2026-10-01',
      currentPage: 120,
      purpose: DUNE_PURPOSE,
      lastProgressUpdate: '2026-10-19T21:00:00+02:00',
      pausedAt: '2026-10-20',
    },
  ],
}

/** The Start dialog, by its heading: "Start *X*?" or "Resume *X*?". */
function startDialog(page: Page, heading: string): Locator {
  return page.getByRole('dialog', { name: heading, exact: true })
}

/** Book detail's state-aware primary action (or any button), by exact name. */
function detailButton(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

function currentReading(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Current reading', exact: true })
}

/** Whether the element is shown modal: a `<dialog>` opened with showModal(), or `aria-modal`. */
function isModal(dialog: Locator): Promise<boolean> {
  return dialog.evaluate((element) => element.matches(':modal') || element.getAttribute('aria-modal') === 'true')
}

test.describe('Story 3.2 Start reading a book (ATDD)', () => {
  test.skip('[P0] AC-1 Start reading on Book detail opens the modal Start dialog with the Purpose field focused, even with no Main book', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const start = detailButton(page, 'Start reading')

    await expect(start).toBeVisible()

    // The page's single primary: no Resume beside it.
    await expect(page.getByRole('main').getByRole('button', { name: /^(Start reading|Resume)$/ })).toHaveCount(1)
    await start.click()
    const dialog = startDialog(page, 'Start Dune?')
    await expect(dialog).toBeVisible()
    expect(await isModal(dialog)).toBe(true)
    // "Start *X*?" with X in serif.
    const title = dialog.getByRole('heading').getByText('Dune', { exact: true })
    expect(await title.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/^ui-serif/)
    // An optional one-line field, focused, empty: there is no Main book, and the dialog still shows.
    const purpose = dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })
    await expect(purpose).toBeFocused()
    await expect(purpose).toHaveValue('')
    await expect(purpose).not.toHaveAttribute('required')
    expect(await purpose.evaluate((element) => element.tagName)).toBe('INPUT')
    await expect(dialog.getByRole('button', { name: 'Start reading', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await expect(dialog).not.toContainText('This pauses')
  })

  test.skip('[P0] AC-2 confirming Start reading makes the Book Main with a new Reading and goes to Home, focus on its title link', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'start-new', { books: [DUNE, LEFT_HAND] })
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await detailButton(page, 'Start reading').click()
      const dialog = startDialog(page, 'Start Dune?')
      await dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true }).fill('  To finally see what Arrakis is about  ')
      await dialog.getByRole('button', { name: 'Start reading', exact: true }).click()

      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeFocused()

      await expect(page).toHaveURL(`${server.url}/`)
      const library = storedLibrary(server)
      expect(library.mainBookId).toBe(DUNE_ID)
      const { readings } = storedBook(server, DUNE_ID)
      expect(readings).toHaveLength(1)
      const [reading] = readings
      expect(reading).toMatchObject({
        startDate: FAKE_TODAY,
        currentPage: 0,
        purpose: 'To finally see what Arrakis is about',
        pausedAt: null,
        finishDate: null,
        finishedPages: null,
        purposeFulfilled: null,
        rating: null,
      })
      expect(Date.parse(reading.lastProgressUpdate as string)).toBe(SERVER_NOW.getTime())
      // The other Book is untouched.
      expect(storedBook(server, LEFT_HAND_ID).readings).toHaveLength(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-5 Resume on a paused Book opens Resume X? with its Purpose, and confirming resumes the same Reading at its page as Main', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'resume', { books: [DUNE_PAUSED] })
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      const resume = detailButton(page, 'Resume')

      await expect(resume).toBeVisible()

      await expect(detailButton(page, 'Start reading')).toHaveCount(0)
      await resume.click()
      const dialog = startDialog(page, 'Resume Dune?')
      const purpose = dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })
      await expect(purpose).toHaveValue(DUNE_PURPOSE)
      await expect(purpose).toBeFocused()
      await dialog.getByRole('button', { name: 'Resume', exact: true }).click()

      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeFocused()
      // 120 of 412 is 29.1…%: the same Reading, at its page.
      await expect(mainBookCard(page).getByRole('progressbar')).toHaveAttribute('aria-valuetext', '29%, page 120 of 412')
      expect(storedLibrary(server).mainBookId).toBe(DUNE_ID)
      const { readings } = storedBook(server, DUNE_ID)
      expect(readings).toHaveLength(1)
      const [reading] = readings
      expect(reading).toMatchObject({
        id: DUNE_READING_ID,
        startDate: '2026-10-01',
        currentPage: 120,
        purpose: DUNE_PURPOSE,
        // Overwritten on every pause, never cleared (AD-19).
        pausedAt: '2026-10-20',
        finishDate: null,
      })
      expect(Date.parse(reading.lastProgressUpdate as string)).toBe(SERVER_NOW.getTime())
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-6 with a Main book, the dialog says This pauses Y at p.120 (64%). and one start-reading pauses Y and starts X', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'start-pauses-main', {
      mainBookId: FAHRENHEIT_ID,
      books: [
        { ...FAHRENHEIT, readings: [{ id: FAHRENHEIT_READING_ID, currentPage: 120, purpose: 'Before the film club' }] },
        DUNE,
      ],
    })
    try {
      const starts = requestsTo(page, START_READING)
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await detailButton(page, 'Start reading').click()
      const dialog = startDialog(page, 'Start Dune?')

      // 120 of 187 is 64.17…%: the server's floor.
      await expect(dialog).toContainText('This pauses Fahrenheit 451 at p.120 (64%).')

      await dialog.getByRole('button', { name: 'Start reading', exact: true }).click()
      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeFocused()
      // One intent, so one commit.
      expect(starts).toHaveLength(1)
      expect(storedLibrary(server).mainBookId).toBe(DUNE_ID)
      const { readings: paused } = storedBook(server, FAHRENHEIT_ID)
      expect(paused).toHaveLength(1)
      expect(paused[0]).toMatchObject({
        id: FAHRENHEIT_READING_ID,
        currentPage: 120,
        purpose: 'Before the film club',
        pausedAt: FAKE_TODAY,
        finishDate: null,
      })
      const { readings: started } = storedBook(server, DUNE_ID)
      expect(started).toHaveLength(1)
      expect(started[0]).toMatchObject({ startDate: FAKE_TODAY, currentPage: 0, purpose: null })
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-7 Cancel or Esc closes the Start dialog, changes nothing and returns focus to the opener', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { others: [DUNE] }))
    const starts = requestsTo(page, START_READING)
    const before = libraryBytes(server)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const opener = detailButton(page, 'Start reading')
    const dialog = startDialog(page, 'Start Dune?')
    const purpose = dialog.getByRole('textbox', { name: 'Purpose (optional)', exact: true })

    await expect(opener).toBeVisible()

    await opener.click()
    await purpose.fill('Never mind')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()

    await opener.click()
    await expect(purpose).toBeFocused()
    await purpose.fill('Not today either')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()

    expect(starts).toHaveLength(0)
    expect(libraryBytes(server)).toBe(before)
    await page.goto(`${server.url}/`)
    await expect(mainBookCard(page).getByRole('link', { name: LEFT_HAND.title, exact: true })).toBeVisible()
  })

  test.skip('[P1] AC-8 the spine popover offers Start reading (or Resume for a paused Book), which opens the Start dialog; a finished Book gets none', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        DUNE,
        { ...LEFT_HAND, readings: [{ currentPage: 120, pausedAt: '2026-10-20' }] },
        NEUROMANCER,
      ],
    })
    await page.goto(`${server.url}/catalog`)
    const popover = (title: string) => page.getByRole('dialog', { name: title, exact: true })

    await spine(page, 'Dune by Frank Herbert, not read yet').click()
    const startLink = popover('Dune').getByRole('button', { name: 'Start reading', exact: true })

    await expect(startLink).toBeVisible()

    await startLink.click()
    await expect(popover('Dune')).toHaveCount(0)
    const start = startDialog(page, 'Start Dune?')
    await expect(start).toBeVisible()
    await expect(start.getByRole('textbox', { name: 'Purpose (optional)', exact: true })).toBeFocused()
    await start.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(start).toHaveCount(0)

    await spine(page, 'The Left Hand of Darkness by Ursula K. Le Guin, waiting for you, page 120').click()
    const resume = popover(LEFT_HAND.title).getByRole('button', { name: 'Resume', exact: true })
    // The primary: focus starts on it (EXPERIENCE.md → Spine popover).
    await expect(resume).toBeFocused()
    await resume.click()
    await expect(popover(LEFT_HAND.title)).toHaveCount(0)
    const resumeDialog = startDialog(page, `Resume ${LEFT_HAND.title}?`)
    await expect(resumeDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(resumeDialog).toHaveCount(0)

    // A finished Book with no Reading in progress is re-read from Book detail only.
    await spine(page, 'Neuromancer by William Gibson, finished').click()
    await expect(popover('Neuromancer')).toBeVisible()
    await expect(popover('Neuromancer').getByText(/^(Start reading|Resume)$/)).toHaveCount(0)
  })

  test.skip('[P1] AC-9 Edit Purpose turns the Purpose line into a field where Enter saves and Esc cancels', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212, { reading: { purpose: LEFT_HAND_PURPOSE } }))
    const edits = requestsTo(page, EDIT_PURPOSE)
    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
    const block = currentReading(page)
    const editPurpose = block.getByRole('button', { name: 'Edit Purpose', exact: true })
    const field = block.getByRole('textbox', { name: 'Purpose', exact: true })

    await expect(editPurpose).toBeVisible()

    await editPurpose.click()
    await expect(field).toHaveValue(LEFT_HAND_PURPOSE)
    expect(await field.evaluate((element) => element.tagName)).toBe('INPUT')
    await expect(block.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
    await expect(block.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()
    await field.fill('  To see how Le Guin builds a world without war  ')
    await field.press('Enter')
    await expect(field).toHaveCount(0)
    await expect(block).toContainText('To see how Le Guin builds a world without war')
    expect(edits).toHaveLength(1)
    expect(storedBook(server, LEFT_HAND_ID).readings[0].purpose).toBe('To see how Le Guin builds a world without war')

    const saved = libraryBytes(server)
    await editPurpose.click()
    await field.fill('Something else entirely')
    await field.press('Escape')
    await expect(field).toHaveCount(0)
    await expect(block).toContainText('To see how Le Guin builds a world without war')
    await expect(block).not.toContainText('Something else entirely')
    expect(edits).toHaveLength(1)
    expect(libraryBytes(server)).toBe(saved)
  })

  test.skip("[P1] AC-10 a couldn't-save keeps the Edit Purpose field open with the typed Purpose and the alert line directly below it", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE_PAUSED] })
    await page.route(`**${EDIT_PURPOSE}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE } }),
      }),
    )
    const before = libraryBytes(server)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const block = currentReading(page)
    const editPurpose = block.getByRole('button', { name: 'Edit Purpose', exact: true })
    const field = block.getByRole('textbox', { name: 'Purpose', exact: true })

    await expect(editPurpose).toBeVisible()

    await editPurpose.click()
    await field.fill('For the ecology, and the politics')
    await block.getByRole('button', { name: 'Save', exact: true }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toHaveText(COULDNT_SAVE)
    await expect(field).toBeVisible()
    await expect(field).toHaveValue('For the ecology, and the politics')
    // One line directly below the field.
    const fieldBox = (await field.boundingBox())!
    const alertBox = (await alert.boundingBox())!
    expect(alertBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1)
    expect(alertBox.y - (fieldBox.y + fieldBox.height)).toBeLessThanOrEqual(32)
    expect(libraryBytes(server)).toBe(before)
  })
})
