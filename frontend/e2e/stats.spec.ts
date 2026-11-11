// Story 6.3 See what I finished in any period (ATDD). The top nav gains Stats
// between Catalog and Card notes, leading to a page whose h1 is "Stats": a
// segmented range picker (This month · This year · Last year · All time ·
// Custom, This year by default) whose presets the browser resolves to
// `GET /api/views/stats?from=…&to=…` (AD-6), and two big numbers, books
// finished and pages finished, announced as "N books, M pages." in the shell's
// `status` region. What the server counts (finishDate, back-fills, re-reads,
// stored finishedPages: AC-4, AC-6) is proven in backend/tests/test_stats.py.
// The bucket contents and the chart belong to Story 6.4, in stats-bars.spec.ts.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).
// AC-7 starts its own server at fake today 2027-01-01, with the browser at
// 00:30 Madrid, which is still 31 December in UTC (R-07).

import AxeBuilder from '@axe-core/playwright'
import { expect, startSeededServer, test } from './fixtures.ts'
import { FAKE_TODAY, serverAtFakeToday, stopAndRemove } from './home.ts'
import { FINISH_READING } from './intents.ts'
import {
  afterAnnounceDelay,
  AXE_TAGS,
  caption,
  COULDNT_LOAD,
  dateField,
  figure,
  FLOW_7,
  nav,
  NEW_YEAR,
  NEW_YEAR_NOW,
  NEW_YEAR_TODAY,
  NOTHING_FINISHED,
  ONE_BOOK,
  preset,
  PRESETS,
  queryOf,
  rangePicker,
  recordStatsRequests,
  STATS_API,
  statsRequest,
  statsRequestFor,
} from './stats.ts'

test.describe('Story 6.3 See what I finished in any period (ATDD)', () => {
  test('[P1] AC-1 the top nav adds Stats between Catalog and Card notes, leading to a page whose h1 is "Stats"', async ({
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

  test('[P1] AC-2 the range picker offers five presets with This year pressed, and Custom swaps a To before From silently', async ({
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

  test('[P0] AC-3 the browser resolves each preset to GET /api/views/stats with from and to, and none for All time', async ({
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

  test('[P1] AC-5 the range shows books and pages finished as two big numbers, announced as "2 books, 610 pages."', async ({
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

  test('[P0] AC-7 at 00:30 on 1 January in Madrid, This year asks for 2027-01-01 alone and Last year for all of 2026', async ({
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

  test('[P2] AC-5 All time with nothing finished shows 0 and 0 and reads "No books finished yet."', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-nothing', NOTHING_FINISHED)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()

      const allTime = statsRequest(page)
      await preset(page, 'All time').click()
      const response = await (await allTime).response()
      expect(await response?.json()).toEqual({ books: 0, pages: 0, bucket: 'month', buckets: [] })

      await expect(page.getByRole('main').getByText('No books finished yet.', { exact: true })).toBeVisible()
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toHaveCount(0)
      await expect(figure(page, '0')).toHaveCount(2)
      await expect(page.getByRole('status')).toHaveText('0 books, 0 pages.')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 one book is announced in the singular', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-singular', ONE_BOOK)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '271')).toBeVisible()
      // No announcement on first load.
      await expect(page.getByRole('status')).toHaveText('')

      await preset(page, 'This month').click()
      await expect(page.getByRole('status')).toHaveText('1 book, 271 pages.')
      await expect(figure(page, '1')).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 Custom asks for the earlier date as from, before and after the swap', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-custom', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      // Custom starts at This year's range: the same request, already shown.
      await preset(page, 'Custom').click()
      await expect(dateField(page, 'From')).toHaveValue('2026-01-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-10-28')

      await dateField(page, 'From').fill('2026-10-15')
      const reversed = statsRequestFor(page, { from: '2026-09-15', to: '2026-10-15' })
      await dateField(page, 'To').fill('2026-09-15')
      // The earlier date goes as `from` even before the swap.
      expect(queryOf(await reversed)).toEqual({ from: '2026-09-15', to: '2026-10-15' })
      // Emma (20 September) and Beloved (12 October).
      await expect(page.getByRole('status')).toHaveText('2 books, 724 pages.')

      await dateField(page, 'To').press('Tab')
      await expect(dateField(page, 'From')).toHaveValue('2026-09-15')
      await expect(dateField(page, 'To')).toHaveValue('2026-10-15')

      const after = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-15' })
      await dateField(page, 'From').fill('2026-10-01')
      expect(queryOf(await after)).toEqual({ from: '2026-10-01', to: '2026-10-15' })
      // Beloved alone.
      await expect(page.getByRole('status')).toHaveText('1 book, 324 pages.')

      // An empty field: no request, and the last result stays.
      const sent = recordStatsRequests(page)
      await dateField(page, 'From').fill('')
      await expect(figure(page, '324')).toBeVisible()
      // Requests go out in order, so the next one being this sentinel's proves the
      // empty field sent nothing.
      const sentinel = statsRequestFor(page, { from: '2026-09-15', to: '2026-10-15' })
      await dateField(page, 'From').fill('2026-09-15')
      await sentinel
      expect(sent).toEqual([{ from: '2026-09-15', to: '2026-10-15' }])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 a direct load of /stats has the title and leaves the h1 unfocused', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-direct', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      const h1 = page.getByRole('main').getByRole('heading', { level: 1 })
      await expect(h1).toHaveText('Stats')
      await expect(page).toHaveTitle('Stats — bookvie')
      await expect(figure(page, '1,010')).toBeVisible()
      await expect(h1).not.toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] axe finds nothing on Stats with a result and with an empty range, in both themes', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-axe', FLOW_7)
    try {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await page.goto(`${server.url}/stats`)
        await expect(figure(page, '1,010')).toBeVisible()
        let { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `result ${colorScheme}: ${id} (${nodes.length})`)).toEqual([])

        await preset(page, 'Last year').click()
        await expect(
          page.getByRole('main').getByText('No books finished in this range.', { exact: true }),
        ).toBeVisible()
        ;({ violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
        expect(violations.map(({ id, nodes }) => `empty ${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P1] a failed first load shows Couldn't load with Try again, which refetches", async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-failed', FLOW_7)
    try {
      let down = true
      await page.route('**/api/views/stats**', async (route) => {
        if (!down) return route.continue()
        down = false
        await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' })
      })

      await page.goto(`${server.url}/stats`)
      await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
      await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await expect(figure(page, '1,010')).toBeVisible()
      await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P2] a range that fails to load after a shown one shows Couldn't load with Try again, which refetches", async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-failed-change', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      let down = true
      await page.route('**/api/views/stats**', async (route) => {
        if (!down) return route.continue()
        down = false
        await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' })
      })
      await preset(page, 'This month').click()
      await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
      await expect(page.getByRole('main').getByText(COULDNT_LOAD, { exact: true })).toBeVisible()
      // This year's numbers don't stay under This month.
      await expect(figure(page, '1,010')).toHaveCount(0)

      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await expect(figure(page, '610')).toBeVisible()
      await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a tab left open past midnight asks for the new day when it regains focus, and announces nothing', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-midnight', FLOW_7)
    try {
      await page.clock.setFixedTime(new Date(`${FAKE_TODAY}T23:59:00+01:00`))
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      const nextDay = statsRequestFor(page, { from: '2026-01-01', to: '2026-10-29' })
      await page.clock.setFixedTime(new Date('2026-10-29T00:01:00+01:00'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await nextDay

      await expect(preset(page, 'This year')).toHaveAttribute('aria-pressed', 'true')
      await expect(figure(page, '1,010')).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 Custom after All time starts empty and sends nothing', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-custom-empty', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()
      const allTime = statsRequest(page)
      await preset(page, 'All time').click()
      await allTime
      await expect(page.getByRole('status')).toHaveText('3 books, 1,010 pages.')

      const sent = recordStatsRequests(page)
      await preset(page, 'Custom').click()
      await expect(dateField(page, 'From')).toHaveValue('')
      await expect(dateField(page, 'To')).toHaveValue('')
      await expect(figure(page, '3')).toBeVisible()
      await expect(figure(page, '1,010')).toBeVisible()

      // Requests go out in order: the first one being the completed range's proves
      // that opening Custom, and a lone From, sent nothing.
      const sentinel = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-28' })
      await dateField(page, 'From').fill('2026-10-01')
      await dateField(page, 'To').fill('2026-10-28')
      await sentinel
      expect(sent).toEqual([{ from: '2026-10-01', to: '2026-10-28' }])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 a background refetch announces nothing', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-refetch', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      // The refetch answers with new numbers, so the page visibly takes it in.
      await page.route('**/api/views/stats**', async (route) => {
        const response = await route.fetch()
        await route.fulfill({ response, json: { ...(await response.json()), books: 4, pages: 1111 } })
      })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(figure(page, '1,111')).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 leaving a reversed Custom range by clicking elsewhere swaps the dates', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-custom-blur', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()
      await preset(page, 'Custom').click()
      await dateField(page, 'From').fill('2026-10-20')
      await dateField(page, 'To').fill('2026-10-01')

      await page.getByRole('main').getByRole('heading', { level: 1 }).click()
      await expect(dateField(page, 'From')).toHaveValue('2026-10-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-10-20')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a failed background refetch keeps the shown numbers and reports nothing', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-refetch-failed', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      // Network-first: the failure and its wait are in place before the focus that refetches.
      await page.route('**/api/views/stats**', (route) =>
        route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' }),
      )
      const failedRefetch = page.waitForResponse(
        (response) => new URL(response.url()).pathname === STATS_API && response.status() === 503,
      )
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      const response = await failedRefetch
      expect(queryOf(response.request())).toEqual({ from: '2026-01-01', to: '2026-10-28' })
      await response.finished()
      // The first delay lets the page take in the failure (an alert would be
      // scheduled within it); the second lets any such alert be set.
      await afterAnnounceDelay(page)
      await afterAnnounceDelay(page)

      await expect(figure(page, '3')).toBeVisible()
      await expect(figure(page, '1,010')).toBeVisible()
      await expect(page.getByRole('main').getByText(COULDNT_LOAD)).toHaveCount(0)
      await expect(page.getByRole('alert')).toHaveText('')
      await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 Custom starts at the range of the preset pressed before it: This month, then Last year', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-custom-start', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      await preset(page, 'This month').click()
      await expect(page.getByRole('status')).toHaveText('2 books, 610 pages.')
      await preset(page, 'Custom').click()
      await expect(dateField(page, 'From')).toHaveValue('2026-10-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-10-28')
      await expect(figure(page, '610')).toBeVisible()

      await preset(page, 'Last year').click()
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()
      await preset(page, 'Custom').click()
      await expect(dateField(page, 'From')).toHaveValue('2025-01-01')
      await expect(dateField(page, 'To')).toHaveValue('2025-12-31')
      await expect(figure(page, '0')).toHaveCount(2)
    } finally {
      await stopAndRemove(server)
    }
  })
  test('[P1] XUI-E2E-002 a Book finished in another context shows in the numbers once Stats regains focus, with no announcement', async ({
    page,
    browser,
  }) => {
    // Epic 6 trace (retro action 54): the stats view is a new view, so prove a real intent from
    // elsewhere reaches it on focus. `AC-5 a background refetch` fakes the response instead.
    const piranesiId = '6c1f0e2d-8a4b-4c3d-9e5f-7a6b5c4d3e21'
    const library = {
      books: [...FLOW_7.books, { id: piranesiId, title: 'Piranesi', authors: ['Susanna Clarke'], pages: 245 }],
    }
    const server = await serverAtFakeToday(page, 'stats-other-context', library)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Stats' })).toBeVisible()
      await expect(figure(page, '1,010')).toBeVisible()

      const otherContext = await browser.newContext()
      try {
        // Another context (the agent, or a second tab) finishes Piranesi today: a back-filled Reading.
        const finished = await otherContext.request.post(`${server.url}${FINISH_READING}`, {
          multipart: {
            intent: JSON.stringify({
              bookId: piranesiId,
              finishedOn: FAKE_TODAY,
              purposeFulfilled: null,
              rating: null,
            }),
          },
        })
        expect(finished.status()).toBe(200)
      } finally {
        await otherContext.close()
      }

      // This context regains focus and the view refetches: This year is now 4 books, 1,255 pages.
      await page.bringToFront()
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(figure(page, '4')).toBeVisible()
      await expect(figure(page, '1,255')).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })
})
