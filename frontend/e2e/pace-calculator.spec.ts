// Story 6.1 See when this book will be finished (ATDD). Book detail's
// "How long until…?" block: the "pages/day" field, its Measured pace prefill,
// the `output` that follows every keystroke, silence on invalid input, and
// "Nothing left to read.". The book view's `pagesLeft` and `measuredPace`
// (AC-1) are proven in backend/tests/test_pace_calculator.py, and the
// duration formatter's edges (AC-6) in src/lib/pace.test.ts.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).
// The browser computes the finish date from its own today (AD-6).
//
// Arithmetic (AD-6): days = max(1, ceil(pages left ÷ pages/day)), finish date
// = today + days. Under 60 days: "About N days · D Month" (the year only when
// it isn't this year). From 60 days: months = round(days ÷ 30.4375) and
// "About N months · Month YYYY"; from 24 months, years = round(months ÷ 12).
//
// While the field's text is the prefill, pages/day is the unrounded Measured
// pace, so the line agrees with Home's "~N days left" (Epic 6 retro item 55).
// Any other text is the typed number.

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
  serverAtFakeToday,
  sizeOf,
  stopAndRemove,
} from './home.ts'

const HEADING = 'How long until…?'
const NOTHING_LEFT = 'Nothing left to read.'
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const EMMA_ID = '2a7e4b1c-8d3f-4e5a-9b6c-7d8e9f0a1b2c'
/** Emma, 400 pages read from 1 to 20 September (20 days inclusive): Measured pace 20 pages a day. */
const EMMA = {
  id: EMMA_ID,
  title: 'Emma',
  authors: ['Jane Austen'],
  pages: 400,
  readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
}

/** Dune (412 pages, never started) and Emma: pages left 412 at a Measured pace of 20. */
const PACED = { books: [DUNE, EMMA] }
/** Dune alone: no finished Reading, so no Measured pace and an empty field. */
const NO_PACE = { books: [DUNE] }
/** Fahrenheit 451, 100 pages read from 1 to 3 September (3 days inclusive): Measured pace 100/3. */
const FAHRENHEIT = {
  id: '8c4d2e6f-1a3b-4c5d-9e7f-2b3c4d5e6f70',
  title: 'Fahrenheit 451',
  authors: ['Ray Bradbury'],
  pages: 100,
  readings: [{ startDate: '2026-09-01', finishDate: '2026-09-03', finishedPages: 100, currentPage: 100 }],
}
/** Dune and Fahrenheit 451: pages left 412 at a Measured pace of 100/3. */
const FRACTIONAL_PACE = { books: [DUNE, FAHRENHEIT] }

/** Book detail's calculator: a `region` named by its heading. */
function calculator(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: HEADING, exact: true })
}

/** The "pages/day" field: a text field, so any typed text reaches it (AC-4). */
function paceField(page: Page): Locator {
  return calculator(page).getByRole('textbox', { name: 'pages/day', exact: true })
}

/** The result: an `output` element inside the block. */
function result(page: Page): Locator {
  return calculator(page).locator('output')
}

test.describe('Story 6.1 See when this book will be finished (ATDD)', () => {
  test('[P1] AC-2 Book detail shows "How long until…?" with an 80px pages/day field prefilled with Measured pace and an output', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-prefill', PACED)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      await expect(calculator(page)).toBeVisible()

      await expect(paceField(page)).toHaveValue('20')
      expect((await sizeOf(paceField(page))).width).toBe(80)
      // The prefill already gives a result: 412 ÷ 20 → 21 days.
      await expect(result(page)).toHaveText('About 21 days · 18 November')
      // The output has no role of its own: the field is described by it.
      await expect(paceField(page)).toHaveAccessibleDescription('About 21 days · 18 November')
      // With a result in the output, the shell's region is still the only `status`.
      await expect(page.getByRole('status')).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 the result follows every keystroke as a duration plus a date', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-keystrokes', NO_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      // The criterion's input: the field to type into.
      await expect(paceField(page)).toBeEditable()
      await paceField(page).focus()

      // "3": 412 ÷ 3 → 138 days (round(4.53) months), 28 Oct + 138 = 15 March 2027.
      await paceField(page).press('3')
      await expect(result(page)).toHaveText('About 5 months · March 2027')

      // "30": 412 ÷ 30 → 14 days, 11 November, this year so no year.
      await paceField(page).press('0')
      await expect(result(page)).toHaveText('About 14 days · 11 November')
      await expect(paceField(page)).toHaveAccessibleDescription('About 14 days · 11 November')

      // A decimal pace: 412 ÷ 12.5 → ceil(32.96) = 33 days.
      await paceField(page).fill('12.5')
      await expect(result(page)).toHaveText('About 33 days · 30 November')

      // 412 days: round(13.54) = 14 months, 14 December 2027.
      await paceField(page).fill('1')
      await expect(result(page)).toHaveText('About 14 months · December 2027')

      // 412 ÷ 0.5 = 824 days: round(27.07) = 27 months, round(2.25) = 2 years, 29 January 2029.
      await paceField(page).fill('0.5')
      await expect(result(page)).toHaveText('About 2 years · January 2029')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 zero, negative, non-numeric or empty input shows no result, no message and no error styling', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-invalid', NO_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      // The criterion's input: the field to type into.
      await expect(paceField(page)).toBeEditable()
      await paceField(page).fill('30')
      await expect(result(page)).toHaveText('About 14 days · 11 November')
      // Read borders without focus, so an error border can't hide behind the focus border.
      await paceField(page).blur()
      const validBorder = await paceField(page).evaluate((element) => getComputedStyle(element).borderColor)

      await paceField(page).fill('0')
      await expect(result(page)).toHaveText('')

      for (const typed of ['-5', 'abc', '']) {
        await paceField(page).fill(typed)
        await expect(result(page), typed).toHaveText('')
        await expect(paceField(page), typed).toHaveAccessibleDescription('')
        await expect(paceField(page), typed).not.toHaveAttribute('aria-invalid', 'true')
        await paceField(page).blur()
        expect(await paceField(page).evaluate((element) => getComputedStyle(element).borderColor), typed).toBe(
          validBorder,
        )
      }
      // No message anywhere: the block holds only its heading and the field's label.
      await expect(calculator(page).getByRole('alert')).toHaveCount(0)
      await expect(calculator(page)).toHaveText(/^How long until…\?\s*pages\/day\s*$/)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 a Book with nothing left to read says "Nothing left to read."', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-nothing-left', PACED)
    try {
      // Emma is finished with no unfinished Reading: pages left 0.
      await page.goto(`${server.url}/book/${EMMA_ID}`)

      await expect(calculator(page).getByText(NOTHING_LEFT, { exact: true })).toBeVisible()

      await expect(calculator(page).getByText(/^About /)).toHaveCount(0)
      await expect(calculator(page).getByRole('textbox')).toHaveCount(0)
      await expect(calculator(page).locator('output')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 without Measured pace the field and the output are empty', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-no-pace', NO_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      await expect(paceField(page)).toBeVisible()
      await expect(paceField(page)).toHaveValue('')
      await expect(result(page)).toHaveText('')
      // Exactly one live `status` region on the page: the shell's.
      await expect(page.getByRole('status')).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 a Main book at its last page says "Nothing left to read." with no field', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-last-page', mainAt(330))
    try {
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)

      await expect(calculator(page).getByText(NOTHING_LEFT, { exact: true })).toBeVisible()
      await expect(calculator(page).getByRole('textbox')).toHaveCount(0)
      await expect(calculator(page).locator('output')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})

test.describe('Story 6.1 See when this book will be finished (automate)', () => {
  test('[P1] finishing a never-started Book from its Book detail turns the result into "Nothing left to read." with no reload', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-finish-in-place', PACED)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await expect(result(page)).toHaveText('About 21 days · 18 November')

      await page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Finished Dune', exact: true })
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(dialog).toHaveCount(0)

      await expect(calculator(page).getByText(NOTHING_LEFT, { exact: true })).toBeVisible()
      await expect(calculator(page).getByRole('textbox')).toHaveCount(0)
      await expect(calculator(page).locator('output')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a fractional Measured pace prefills one decimal and the result uses the unrounded pace', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-fractional', FRACTIONAL_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      // 100 pages over 3 days: 33.33… shown as "33.3".
      await expect(paceField(page)).toHaveValue('33.3')
      // 412 ÷ 100/3 → ceil(12.36) = 13 days, 28 Oct + 13 = 10 November (E6-R1: the exact pace while untouched).
      await expect(result(page)).toHaveText('About 13 days · 10 November')
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P1] E6-R1 the untouched prefill agrees with Home's days left for the Main book, and an edit uses the typed pace", async ({
    page,
  }) => {
    // Epic 6 retro item 55. The Left Hand of Darkness is Main at p.30 of 330: 300 pages left at
    // Measured pace 100/3. Home divides exactly: 300 ÷ 100/3 = 9 days. "33.3" would give 10.
    const server = await serverAtFakeToday(page, 'pace-agrees-with-home', mainAt(30, { others: [FAHRENHEIT] }))
    try {
      await page.goto(`${server.url}/`)
      await expect(mainBookCard(page).getByText('~9 days left', { exact: true })).toBeVisible()

      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(paceField(page)).toHaveValue('33.3')
      // 28 Oct + 9 = 6 November, the same 9 days as Home.
      await expect(result(page)).toHaveText('About 9 days · 6 November')

      // Typed by hand, the field's own number counts: 300 ÷ 33.3 → ceil(9.01) = 10 days.
      await paceField(page).fill('33.30')
      await expect(result(page)).toHaveText('About 10 days · 7 November')
      // Back to the prefill's text, it is the exact pace again.
      await paceField(page).fill('33.3')
      await expect(result(page)).toHaveText('About 9 days · 6 November')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a tab left open past midnight moves the finish date a day when it regains focus', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-midnight', NO_PACE)
    try {
      await page.clock.setFixedTime(new Date(`${FAKE_TODAY}T23:59:00+01:00`))
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await paceField(page).fill('30')
      // 412 ÷ 30 → 14 days from 28 October.
      await expect(result(page)).toHaveText('About 14 days · 11 November')

      await page.clock.setFixedTime(new Date('2026-10-29T00:01:00+01:00'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))

      // Still 14 days, now counted from 29 October.
      await expect(result(page)).toHaveText('About 14 days · 12 November')
      await expect(paceField(page)).toHaveValue('30')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a Book view refetch keeps the typed pace and its result', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-refetch', NO_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)
      await paceField(page).fill('30')
      await expect(result(page)).toHaveText('About 14 days · 11 November')

      // Network-first: listen for the refetch before the focus that triggers it.
      const refetch = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/views/book' && response.ok(),
      )
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await refetch

      await expect(paceField(page)).toHaveValue('30')
      await expect(result(page)).toHaveText('About 14 days · 11 November')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] axe finds nothing on Book detail with a pace result and with nothing left to read, in both themes', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-axe', PACED)
    try {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })

        await page.goto(`${server.url}/book/${DUNE_ID}`)
        await expect(result(page)).toHaveText('About 21 days · 18 November')
        let { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `${colorScheme} Dune: ${id} (${nodes.length})`)).toEqual([])

        await page.goto(`${server.url}/book/${EMMA_ID}`)
        await expect(calculator(page).getByText(NOTHING_LEFT, { exact: true })).toBeVisible()
        ;({ violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
        expect(violations.map(({ id, nodes }) => `${colorScheme} Emma: ${id} (${nodes.length})`)).toEqual([])
      }
    } finally {
      await stopAndRemove(server)
    }
  })
})
