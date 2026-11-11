// Story 6.2 See when my whole unread library will be finished (ATDD). Catalog's
// "How long until…?" link below the library meter, collapsed by default, that
// expands Story 6.1's calculator inline with `aria-expanded`, counting down the
// whole library. The catalog view's `pagesLeft` and `measuredPace` (AC-1, AC-4)
// are proven in backend/tests/test_library_pages_left.py; the calculator's
// arithmetic and formatter edges in src/lib/pace.test.ts (Story 6.1).
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).
//
// Arithmetic (AD-6): days = max(1, ceil(pages left ÷ pages/day)), finish date
// = today + days; from 60 days months = round(days ÷ 30.4375).
//
// Activate a leaf by changing its `test.skip(` to `test(`.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE, mainAt, serverAtFakeToday, sizeOf, stopAndRemove } from './home.ts'

const LINK = 'How long until…?'

/**
 * Flow 5 (UJ-5): 8,100 pages left at a Measured pace of 17.
 * - The Left Hand of Darkness, the Main book at p.120 of 330: 210.
 * - Dune, never started: 412.
 * - Neuromancer, paused at p.80 of 271: 191.
 * - Seven more never started: 1276 + 1463 + 1225 + 1079 + 1023 + 880 + 341 = 7287.
 * - Fahrenheit 451, 170 pages from 1 to 10 September (10 days inclusive): pace 17, nothing left.
 */
const FLOW_5 = mainAt(120, {
  others: [
    DUNE,
    {
      title: 'Neuromancer',
      authors: ['William Gibson'],
      pages: 271,
      readings: [{ startDate: '2026-09-20', currentPage: 80, pausedAt: '2026-10-01' }],
    },
    { title: 'The Count of Monte Cristo', authors: ['Alexandre Dumas'], pages: 1276 },
    { title: 'Les Misérables', authors: ['Victor Hugo'], pages: 1463 },
    { title: 'War and Peace', authors: ['Leo Tolstoy'], pages: 1225 },
    { title: 'Infinite Jest', authors: ['David Foster Wallace'], pages: 1079 },
    { title: 'Don Quixote', authors: ['Miguel de Cervantes'], pages: 1023 },
    { title: 'Middlemarch', authors: ['George Eliot'], pages: 880 },
    { title: 'Beloved', authors: ['Toni Morrison'], pages: 341 },
    {
      title: 'Fahrenheit 451',
      authors: ['Ray Bradbury'],
      pages: 170,
      readings: [{ startDate: '2026-09-01', finishDate: '2026-09-10', finishedPages: 170, currentPage: 170 }],
    },
  ],
})

/** The collapsed calculator's toggle: a link-styled button carrying `aria-expanded`. */
function toggle(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: LINK, exact: true })
}

/** The "pages/day" field, once expanded. */
function paceField(page: Page): Locator {
  return page.getByRole('main').getByRole('textbox', { name: 'pages/day', exact: true })
}

/** The result: the calculator's `output` element. */
function result(page: Page): Locator {
  return page.getByRole('main').locator('output')
}

function meter(page: Page): Locator {
  return page.getByRole('main').getByRole('progressbar', { name: 'Books finished', exact: true })
}

test.describe('Story 6.2 See when my whole unread library will be finished (ATDD)', () => {
  test.skip('[P1] AC-2 Catalog has a collapsed "How long until…?" link below the library meter that expands the calculator inline', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'catalog-pace-link', FLOW_5)
    try {
      await page.goto(`${server.url}/catalog`)

      await expect(toggle(page)).toBeVisible()

      // Collapsed by default: no field and no result yet.
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(paceField(page)).toHaveCount(0)
      await expect(result(page)).toHaveCount(0)

      // Below the library meter: the meter comes first in the page.
      await expect(meter(page)).toHaveAttribute('aria-valuetext', '1 of 11 finished')
      const meterFirst = await meter(page).evaluate(
        (bar, link) => (bar.compareDocumentPosition(link as Node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        await toggle(page).elementHandle(),
      )
      expect(meterFirst).toBe(true)

      // Activating it expands Story 6.1's calculator inline, prefilled with Measured pace.
      await toggle(page).click()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
      await expect(paceField(page)).toBeVisible()
      expect((await sizeOf(paceField(page))).width).toBe(80)
      await expect(paceField(page)).toHaveValue('17')
      // Flow 5, step 2: 8100 ÷ 17 → 477 days, round(15.67) = 16 months, 17 February 2028.
      await expect(result(page)).toHaveText('About 16 months · February 2028')
      // The output is no live region: the shell's region is still the only `status`.
      await expect(page.getByRole('status')).toHaveCount(1)

      // Activating it again collapses it.
      await toggle(page).click()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(paceField(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-3 typing 30 with 8,100 pages left reads "About 9 months · July 2027"', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'catalog-pace-30', FLOW_5)
    try {
      await page.goto(`${server.url}/catalog`)
      await toggle(page).click()
      await paceField(page).fill('30')

      // Flow 5's climax: 8100 ÷ 30 = 270 days, round(8.87) = 9 months, 25 July 2027.
      await expect(result(page)).toHaveText('About 9 months · July 2027')

      // The same field rules as Story 6.1: the field is described by the result.
      await expect(paceField(page)).toHaveAccessibleDescription('About 9 months · July 2027')

      // The same invalid-input rules: 0 or an empty field shows nothing, with no error state.
      for (const typed of ['0', '']) {
        await paceField(page).fill(typed)
        await expect(result(page)).toHaveText('')
        await expect(paceField(page)).not.toHaveAttribute('aria-invalid', 'true')
      }
      await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)

      // The same prefill: a new visit starts collapsed, then shows Measured pace again.
      await page.reload()
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
      await toggle(page).click()
      await expect(paceField(page)).toHaveValue('17')
      await expect(result(page)).toHaveText('About 16 months · February 2028')
    } finally {
      await stopAndRemove(server)
    }
  })
})
