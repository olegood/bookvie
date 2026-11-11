// Story 6.3 See what I finished in any period (ATDD). The top nav gains Stats
// between Catalog and Card notes, leading to a page whose h1 is "Stats": a
// segmented range picker (This month · This year · Last year · All time ·
// Custom, This year by default) whose presets the browser resolves to
// `GET /api/views/stats?from=…&to=…` (AD-6), and two big numbers, books
// finished and pages finished, announced as "N books, M pages." in the shell's
// `status` region. What the server counts (finishDate, back-fills, re-reads,
// stored finishedPages: AC-4, AC-6) is proven in backend/tests/test_stats.py.
// How `bucket` is chosen and the chart belong to Story 6.4.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).
// AC-7 starts its own server at fake today 2027-01-01, with the browser at
// 00:30 Madrid, which is still 31 December in UTC (R-07).
//
// Activate a leaf by changing its `test.skip(` to `test(`.

import type { Locator, Page, Request } from '@playwright/test'
import { expect, startSeededServer, test } from './fixtures.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'

const STATS_API = '/api/views/stats'
const PRESETS = ['This month', 'This year', 'Last year', 'All time', 'Custom']

/**
 * Flow 7 at fake today 2026-10-28: three ordinary finished Readings.
 * - Beloved, 324 pages, finished 12 October 2026.
 * - Kindred, 286 pages, finished 20 October 2026.
 * - Emma, 400 pages, finished 20 September 2026.
 * So This month is 2 books and 610 pages, This year 3 and 1,010, Last year nothing.
 */
const FLOW_7 = {
  books: [
    {
      title: 'Beloved',
      authors: ['Toni Morrison'],
      pages: 324,
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-12', finishedPages: 324, currentPage: 324 }],
    },
    {
      title: 'Kindred',
      authors: ['Octavia E. Butler'],
      pages: 286,
      readings: [{ startDate: '2026-10-13', finishDate: '2026-10-20', finishedPages: 286, currentPage: 286 }],
    },
    {
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
    },
  ],
}

const NEW_YEAR_TODAY = '2027-01-01'
/** 00:30 on 1 January 2027 in Madrid (CET): 23:30 UTC on 31 December 2026. */
const NEW_YEAR_NOW = new Date('2027-01-01T00:30:00+01:00')

/**
 * Either side of the year boundary, at fake today 2027-01-01.
 * - Dune, 412 pages, finished 31 December 2026: Last year.
 * - Neuromancer, 271 pages, finished 1 January 2027: This year.
 */
const NEW_YEAR = {
  books: [
    {
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      readings: [{ startDate: '2026-12-01', finishDate: '2026-12-31', finishedPages: 412, currentPage: 412 }],
    },
    {
      title: 'Neuromancer',
      authors: ['William Gibson'],
      pages: 271,
      readings: [{ startDate: '2026-12-15', finishDate: '2027-01-01', finishedPages: 271, currentPage: 271 }],
    },
  ],
}

/** The banner's nav. */
function nav(page: Page): Locator {
  return page.getByRole('banner').getByRole('navigation')
}

/** The range picker: a segmented `group` named "Range" (the `ViewToggle` pattern). */
function rangePicker(page: Page): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Range', exact: true })
}

/** One preset of the range picker, an `aria-pressed` button. */
function preset(page: Page, name: string): Locator {
  return rangePicker(page).getByRole('button', { name, exact: true })
}

/** Custom's date field "From" or "To". */
function dateField(page: Page, name: 'From' | 'To'): Locator {
  return page.getByRole('main').getByLabel(name, { exact: true })
}

/**
 * A big number, by its exact text inside `main`. Exact matching only hits an
 * element whose whole text is the figure, so "2" doesn't match "2026" in a date
 * or the caption "books finished"; the status line, the other place the
 * numbers appear, lives outside `main` in the shell's live region.
 */
function figure(page: Page, text: string): Locator {
  return page.getByRole('main').getByText(text, { exact: true })
}

/** A caption under a big number. */
function caption(page: Page, text: 'books finished' | 'pages finished'): Locator {
  return page.getByRole('main').getByText(text, { exact: true })
}

/** The next request for the stats view. Register it before the action that triggers it. */
function statsRequest(page: Page): Promise<Request> {
  return page.waitForRequest((request) => new URL(request.url()).pathname === STATS_API)
}

/** A request's query as a plain object, to compare the whole query at once. */
function queryOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url()).searchParams)
}

test.describe('Story 6.3 See what I finished in any period (ATDD)', () => {
  test.skip('[P1] AC-1 the top nav adds Stats between Catalog and Card notes, leading to a page whose h1 is "Stats"', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-nav', FLOW_7)
    try {
      await page.goto(server.url)

      // The criterion: the full Epic 6 order.
      await expect(nav(page).getByRole('link')).toHaveText(['Home', 'Catalog', 'Stats', 'Card notes', 'Backup'])

      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(page).toHaveURL(`${server.url}/stats`)
      const h1 = page.getByRole('main').getByRole('heading', { level: 1 })
      await expect(h1).toHaveText('Stats')
      await expect(h1).toBeFocused()
      await expect(page).toHaveTitle('Stats — bookvie')
      await expect(nav(page).getByRole('link', { name: 'Stats', exact: true })).toHaveAttribute('aria-current', 'page')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-2 the range picker offers five presets with This year pressed, and Custom swaps a To before From silently', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-range', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)

      // The criterion: the five presets in order, This year by default.
      await expect(rangePicker(page).getByRole('button')).toHaveText(PRESETS)
      await expect(preset(page, 'This year')).toHaveAttribute('aria-pressed', 'true')
      for (const name of ['This month', 'Last year', 'All time', 'Custom']) {
        await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'false')
      }

      // Custom reveals the two date fields.
      await expect(dateField(page, 'From')).toHaveCount(0)
      await preset(page, 'Custom').click()
      await expect(preset(page, 'Custom')).toHaveAttribute('aria-pressed', 'true')
      await expect(dateField(page, 'From')).toBeVisible()
      await expect(dateField(page, 'To')).toBeVisible()

      // To before From: the two swap once focus leaves, with no error (UX-DR52).
      await dateField(page, 'From').fill('2026-10-20')
      await dateField(page, 'To').fill('2026-10-01')
      await dateField(page, 'To').press('Tab')
      await expect(dateField(page, 'From')).toHaveValue('2026-10-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-10-20')
      await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
      await expect(page.getByRole('alert')).toHaveText('')
      await expect(dateField(page, 'From')).not.toHaveAttribute('aria-invalid', 'true')
      await expect(dateField(page, 'To')).not.toHaveAttribute('aria-invalid', 'true')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-3 the browser resolves each preset to GET /api/views/stats with from and to, and none for All time', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-request', FLOW_7)
    try {
      // Network-first: each wait is registered before the action that triggers it.
      const thisYear = statsRequest(page)
      await page.goto(`${server.url}/stats`)

      // The criterion: This year is 1 January to today (2026-10-28), both inclusive.
      expect(queryOf(await thisYear)).toEqual({ from: '2026-01-01', to: '2026-10-28' })

      // The response shape (AD-6). Its bucket contents belong to Story 6.4.
      const response = await (await thisYear).response()
      expect(response?.status()).toBe(200)
      const body = (await response?.json()) as Record<string, unknown>
      expect(Object.keys(body).sort()).toEqual(['books', 'bucket', 'buckets', 'pages'])
      expect(['month', 'year']).toContain(body.bucket)
      expect(Array.isArray(body.buckets)).toBe(true)

      const thisMonth = statsRequest(page)
      await preset(page, 'This month').click()
      expect(queryOf(await thisMonth)).toEqual({ from: '2026-10-01', to: '2026-10-28' })

      const lastYear = statsRequest(page)
      await preset(page, 'Last year').click()
      expect(queryOf(await lastYear)).toEqual({ from: '2025-01-01', to: '2025-12-31' })

      const allTime = statsRequest(page)
      await preset(page, 'All time').click()
      expect(queryOf(await allTime)).toEqual({})
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-5 the range shows books and pages finished as two big numbers, announced as "2 books, 610 pages."', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-numbers', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await preset(page, 'This month').click()

      // The criterion: Flow 7's announcement for October (Beloved and Kindred).
      await expect(page.getByRole('status')).toHaveText('2 books, 610 pages.')

      await expect(figure(page, '2')).toBeVisible()
      await expect(figure(page, '610')).toBeVisible()
      await expect(caption(page, 'books finished')).toBeVisible()
      await expect(caption(page, 'pages finished')).toBeVisible()

      // An empty range: 0 and 0, with its message.
      await preset(page, 'Last year').click()
      await expect(figure(page, '0')).toHaveCount(2)
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()

      // Back on This year, with en-GB grouping.
      await preset(page, 'This year').click()
      await expect(page.getByRole('status')).toHaveText('3 books, 1,010 pages.')
      await expect(figure(page, '3')).toBeVisible()
      await expect(figure(page, '1,010')).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-7 at 00:30 on 1 January in Madrid, This year asks for 2027-01-01 alone and Last year for all of 2026', async ({
    page,
  }) => {
    await page.clock.setFixedTime(NEW_YEAR_NOW)
    const server = await startSeededServer(test.info(), 'stats-new-year', NEW_YEAR, {}, { fakeToday: NEW_YEAR_TODAY })
    try {
      const thisYear = statsRequest(page)
      await page.goto(`${server.url}/stats`)

      // The criterion: the local date, not `toISOString()`'s 31 December.
      expect(queryOf(await thisYear)).toEqual({ from: '2027-01-01', to: '2027-01-01' })

      // Neuromancer alone, finished on 1 January.
      await expect(figure(page, '1')).toBeVisible()
      await expect(figure(page, '271')).toBeVisible()

      // Dune alone, finished on 31 December.
      const lastYear = statsRequest(page)
      await preset(page, 'Last year').click()
      expect(queryOf(await lastYear)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
      await expect(figure(page, '1')).toBeVisible()
      await expect(figure(page, '412')).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })
})
