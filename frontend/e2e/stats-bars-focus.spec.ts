// Epic 17 retro item 112 (E17-R1, E17-R2, E17-V1, E17-V2, E17-V3), split from
// stats-bars-select.spec.ts (Story 17.2) to keep each file under 1000 lines.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` with the
// browser clock at 10:00 that day in Madrid. `BARS` (stats.ts) holds the finishes.

import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import {
  address,
  afterAnnounceDelay,
  bar,
  BARS,
  chartBars,
  COULDNT_LOAD,
  FEB_APR,
  figure,
  finishedHeading,
  finishedLink,
  finishedLinks,
  historyLength,
  nav,
  STATS_API,
  showWholeRange,
  statsRequestFor,
} from './stats.ts'

// Epic 17 retro item 112 (E17-R1, E17-R2, E17-V1, E17-V2, E17-V3): focus that any Stats control held when a
// settled refetch removed it moves to the chart's Tab stop, else the h1; a failed fetch moves it to the h1 at
// once; a drop after a shown period empties the status region; the held view keeps a focused bar.

const H1 = (page: Page) => page.getByRole('main').getByRole('heading', { level: 1 })

/** The next stats response, as a promise. Register it before the action that refetches. */
function nextStatsResponse(page: Page) {
  return page.waitForResponse((response) => new URL(response.url()).pathname === STATS_API)
}

/** From now on, every stats response is the server's without Kindred's 10 February finish (February's only one). */
async function removeFebruaryFinish(page: Page): Promise<void> {
  await page.route('**/api/views/stats**', async (route) => {
    const response = await route.fetch()
    const view = await response.json()
    type Finish = { finishDate: string; finishedPages: number }
    // The removed finish's pages come off the totals and its bucket, so the stubbed view stays consistent.
    const removed: Finish[] = view.finishes.filter((f: Finish) => f.finishDate === '2026-02-10')
    const pages = removed.reduce((sum, f) => sum + f.finishedPages, 0)
    await route.fulfill({
      response,
      json: {
        ...view,
        books: view.books - removed.length,
        pages: view.pages - pages,
        buckets: view.buckets.map((b: { period: string; books: number; pages: number }) =>
          b.period === '2026-02' ? { ...b, books: b.books - removed.length, pages: b.pages - pages } : b,
        ),
        finishes: view.finishes.filter((f: Finish) => f.finishDate !== '2026-02-10'),
      },
    })
  })
}

/** From now on, every stats response is the server's with no finishes: every bucket and both totals are zero. */
async function removeEveryFinish(page: Page): Promise<void> {
  await page.route('**/api/views/stats**', async (route) => {
    const response = await route.fetch()
    const view = await response.json()
    await route.fulfill({
      response,
      json: {
        ...view,
        books: 0,
        pages: 0,
        buckets: view.buckets.map((b: { period: string }) => ({ ...b, books: 0, pages: 0 })),
        finishes: [],
      },
    })
  })
}

/** Another context removed a finish: Stats refetches when the window regains focus. */
async function refetchOnFocus(page: Page): Promise<void> {
  const refetch = nextStatsResponse(page)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await refetch
}

test.describe('Epic 17 retro item 112 Rescue focus from any removed Stats control', () => {
  test('[P1] a refetch that empties the selected bar moves focus from Show the whole range to the chart stop', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-whole-range', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}&period=2026-02`)
      await expect(bar(page, 'February 2026')).toHaveAttribute('aria-pressed', 'true')
      await showWholeRange(page).focus()
      await expect(showWholeRange(page)).toBeFocused()

      await removeFebruaryFinish(page)
      await refetchOnFocus(page)

      // The criterion: period leaves the address and focus moves to the chart's Tab stop, the latest bar.
      await expect.poll(() => address(page)).toBe(FEB_APR)
      await expect(showWholeRange(page)).toHaveCount(0)
      await expect(bar(page, 'April 2026')).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a refetch that empties the selected bar moves focus from its narrowed row to the chart stop', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-narrowed-row', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}&period=2026-02`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await finishedLinks(page).first().focus()
      await expect(finishedLinks(page).first()).toBeFocused()

      await removeFebruaryFinish(page)
      await refetchOnFocus(page)

      // The criterion: period leaves the address and focus moves to the chart's Tab stop, the latest bar.
      await expect.poll(() => address(page)).toBe(FEB_APR)
      await expect(finishedLinks(page)).toHaveCount(5)
      await expect(bar(page, 'April 2026')).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a refetch that empties the only bar moves focus from its row to the h1', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-last-row', BARS)
    try {
      // This month holds one finish, Extreme Notes on 12 October: October is the only bar with finishes.
      await page.goto(`${server.url}/stats?range=thisMonth&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await finishedLinks(page).first().focus()
      await expect(finishedLinks(page).first()).toBeFocused()

      await removeEveryFinish(page)
      await refetchOnFocus(page)

      // The criterion: period leaves the address and, with no bar left, the h1 takes focus.
      await expect.poll(() => address(page)).toBe('/stats?range=thisMonth')
      await expect(finishedLinks(page)).toHaveCount(0)
      await expect(H1(page)).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a refetch that removes a focused row of the whole range moves focus to the chart stop', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-whole-row', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(finishedLinks(page)).toHaveCount(6)
      const kindredFebruary = finishedLink(page, 'Kindred, Octavia E. Butler, finished 10 Feb 2026')
      await kindredFebruary.focus()
      await expect(kindredFebruary).toBeFocused()

      await removeFebruaryFinish(page)
      await refetchOnFocus(page)

      // The criterion: the row is gone and focus moves to the chart's Tab stop, the latest bar.
      await expect(finishedLinks(page)).toHaveCount(5)
      await expect(bar(page, 'April 2026')).toBeFocused()
      expect(address(page)).toBe(FEB_APR)
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] a drop after a pressed bar empties the status region', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-drop-status', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(figure(page, '2,152')).toBeVisible()
      await bar(page, 'February 2026').click()
      await expect(page.getByRole('status')).toHaveText('Finished in February 2026: 1 book.')

      await removeFebruaryFinish(page)
      await refetchOnFocus(page)

      // The criterion: the period's line goes with the period, and focus moves to the chart's Tab stop.
      await expect.poll(() => address(page)).toBe(FEB_APR)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(bar(page, 'April 2026')).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] This month past midnight keeps a focused bar pressed and focused through the held view', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-midnight', BARS)
    // Released on the happy path below, and in `finally`, so a failed assertion doesn't leave the route held.
    let release: () => void = () => {}
    try {
      await page.goto(`${server.url}/stats?range=thisMonth&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await bar(page, 'October 2026').focus()
      await expect(bar(page, 'October 2026')).toBeFocused()

      // The new day's view is held until the leaf lets it through.
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/views/stats**', async (route) => {
        if (new URL(route.request().url()).searchParams.get('to') === '2026-10-29') await held
        await route.continue()
      })
      await page.clock.setFixedTime(new Date('2026-10-29T00:30:00+01:00'))
      const nextDay = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-29' })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await nextDay

      // The criterion, while the new day's view is held: October is still a pressed bar, with focus.
      await expect(bar(page, 'October 2026')).toHaveAttribute('aria-pressed', 'true')
      await expect(bar(page, 'October 2026')).toBeFocused()
      expect(address(page)).toBe('/stats?range=thisMonth&period=2026-10')

      const landed = nextStatsResponse(page)
      release()
      await landed

      // And once it lands.
      await expect(bar(page, 'October 2026')).toHaveAttribute('aria-pressed', 'true')
      await expect(bar(page, 'October 2026')).toBeFocused()
      await expect(finishedHeading(page)).toHaveText('Finished in October 2026')
      await afterAnnounceDelay(page)
      expect(address(page)).toBe('/stats?range=thisMonth&period=2026-10')
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      release()
      await stopAndRemove(server)
    }
  })

  test('[P1] a failed new-day fetch moves focus from the bar to the h1 at once, and the recovery leaves it there', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-midnight-failed', BARS)
    try {
      await page.goto(`${server.url}/stats?range=thisMonth&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await bar(page, 'October 2026').focus()
      await expect(bar(page, 'October 2026')).toBeFocused()

      // Network-first: the failure and its wait are in place before the focus that fetches the new day.
      await page.route('**/api/views/stats**', (route) =>
        route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' }),
      )
      const failed = page.waitForResponse(
        (response) => new URL(response.url()).pathname === STATS_API && response.status() === 503,
      )
      await page.clock.setFixedTime(new Date('2026-10-29T00:30:00+01:00'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await failed).finished()

      // The criterion: the alert, and focus on the h1 at once.
      await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
      await expect(H1(page)).toBeFocused()

      // The server answers again: a later window focus loads the new day.
      await page.unroute('**/api/views/stats**')
      const recovered = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-29' })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await recovered).response()

      // The criterion: the recovery shows October again and doesn't move focus.
      await expect(bar(page, 'October 2026')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedHeading(page)).toHaveText('Finished in October 2026')
      await afterAnnounceDelay(page)
      await expect(H1(page)).toBeFocused()
      expect(address(page)).toBe('/stats?range=thisMonth&period=2026-10')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] the Stats nav link pressed from an address with period resets to a plain /stats in place', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-nav-period', BARS)
    try {
      await page.goto(`${server.url}/stats?range=thisYear&period=2026-03`)
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')
      const length = await historyLength(page)

      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()

      // The criterion: a plain /stats, no history growth, no pressed bar, the h1 focused, nothing spoken.
      await expect.poll(() => address(page)).toBe('/stats')
      expect(await historyLength(page)).toBe(length)
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      await expect(chartBars(page)).toHaveCount(5)
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)
      await expect(H1(page)).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })
})

// Epic 17 retro item 112, test automation: the rescue's "else the h1" with no period to drop, and the failed
// path from a row of the finished list rather than a bar.
test.describe('Epic 17 retro item 112 Rescue focus from any removed Stats control (automate)', () => {
  test('[P2] a refetch that removes the only row of the whole range moves focus to the h1, with no drop', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-whole-last-row', BARS)
    try {
      // This month holds one finish, Extreme Notes on 12 October, and no period is selected.
      await page.goto(`${server.url}/stats?range=thisMonth`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await finishedLinks(page).first().focus()
      await expect(finishedLinks(page).first()).toBeFocused()

      await removeEveryFinish(page)
      await refetchOnFocus(page)

      // The criterion: with no row and no bar left, the h1 takes focus; the address and both regions stay as they were.
      await expect(finishedLinks(page)).toHaveCount(0)
      await expect(H1(page)).toBeFocused()
      expect(address(page)).toBe('/stats?range=thisMonth')
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a failed new-day fetch moves focus from a narrowed row to the h1 at once, and the recovery leaves it there', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-focus-row-failed', BARS)
    try {
      await page.goto(`${server.url}/stats?range=thisMonth&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await finishedLinks(page).first().focus()
      await expect(finishedLinks(page).first()).toBeFocused()

      // Network-first: the failure and its wait are in place before the focus that fetches the new day.
      await page.route('**/api/views/stats**', (route) =>
        route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' }),
      )
      const failed = page.waitForResponse(
        (response) => new URL(response.url()).pathname === STATS_API && response.status() === 503,
      )
      await page.clock.setFixedTime(new Date('2026-10-29T00:30:00+01:00'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await failed).finished()

      // The criterion: the row left with the failed view, and the h1 has focus before any recovery.
      await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
      await expect(finishedLinks(page)).toHaveCount(0)
      await expect(H1(page)).toBeFocused()

      await page.unroute('**/api/views/stats**')
      const recovered = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-29' })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await recovered).response()

      // The criterion: the row is back and focus stays on the h1.
      await expect(finishedLinks(page)).toHaveCount(1)
      await afterAnnounceDelay(page)
      await expect(H1(page)).toBeFocused()
      expect(address(page)).toBe('/stats?range=thisMonth&period=2026-10')
    } finally {
      await stopAndRemove(server)
    }
  })
})
