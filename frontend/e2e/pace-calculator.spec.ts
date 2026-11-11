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
// Activate a leaf by changing its `test.skip(` to `test(`.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, DUNE_ID, serverAtFakeToday, sizeOf, stopAndRemove } from './home.ts'

const HEADING = 'How long until…?'
const NOTHING_LEFT = 'Nothing left to read.'

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
  test.skip('[P1] AC-2 Book detail shows "How long until…?" with an 80px pages/day field prefilled with Measured pace and an output', async ({
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
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-3 the result follows every keystroke as a duration plus a date', async ({ page }) => {
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

      // A decimal pace: 412 ÷ 12.5 → ceil(32.96) = 33 days.
      await paceField(page).fill('12.5')
      await expect(result(page)).toHaveText('About 33 days · 30 November')

      // 412 days: round(13.54) = 14 months, 14 December 2027.
      await paceField(page).fill('1')
      await expect(result(page)).toHaveText('About 14 months · December 2027')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P2] AC-4 zero, negative, non-numeric or empty input shows no result, no message and no error styling', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'pace-invalid', NO_PACE)
    try {
      await page.goto(`${server.url}/book/${DUNE_ID}`)

      // The criterion's input: the field to type into.
      await expect(paceField(page)).toBeEditable()
      await paceField(page).fill('30')
      await expect(result(page)).toHaveText('About 14 days · 11 November')
      const validBorder = await paceField(page).evaluate((element) => getComputedStyle(element).borderColor)

      await paceField(page).fill('0')
      await expect(result(page)).toHaveText('')

      for (const typed of ['-5', 'abc', '']) {
        await paceField(page).fill(typed)
        await expect(result(page), typed).toHaveText('')
        await expect(paceField(page), typed).not.toHaveAttribute('aria-invalid', 'true')
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

  test.skip('[P2] AC-5 a Book with nothing left to read says "Nothing left to read."', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'pace-nothing-left', PACED)
    try {
      // Emma is finished with no unfinished Reading: pages left 0.
      await page.goto(`${server.url}/book/${EMMA_ID}`)

      await expect(calculator(page).getByText(NOTHING_LEFT, { exact: true })).toBeVisible()

      await expect(calculator(page).getByText(/^About /)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })
})
