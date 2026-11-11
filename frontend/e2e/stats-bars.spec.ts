// Story 6.4 See my reading month by month (ATDD). The bars under the
// two numbers: one per bucket, each with its value above and its period below,
// and the same data as a table for assistive tech (period, books, pages). What
// the server puts in each bucket (one per month up to 24 months, else per year,
// counting only finishes inside the range, all pages in the finish month) is
// proven in backend/tests/test_stats.py.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` and
// fixes the browser clock at 10:00 that day in Europe/Madrid (TC-2, AD-20).

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import { dateField, figure, FLOW_7, NOTHING_FINISHED, preset, statsRequest, statsRequestFor } from './stats.ts'

/** The Tome, 900 pages, read 20 October to 2 December 2025: Last year at fake today 2026-10-28. */
const THE_TOME = {
  books: [
    {
      title: 'The Tome',
      authors: ['A. Writer'],
      pages: 900,
      readings: [{ startDate: '2025-10-20', finishDate: '2025-12-02', finishedPages: 900, currentPage: 900 }],
    },
  ],
}

/** Two back-filled finishes more than 24 months apart: All time is bucketed by year. */
const YEARS_APART = {
  books: [
    {
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      readings: [{ finishDate: '2024-01-15', finishedPages: 412, currentPage: 412 }],
    },
    {
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [{ finishDate: '2026-01-02', finishedPages: 400, currentPage: 400 }],
    },
  ],
}

/** The chart's data as a table: the only table in `main`. */
function chartTable(page: Page): Locator {
  return page.getByRole('main').getByRole('table')
}

/** Every row of `table`, header first, as the trimmed text of each cell. */
async function tableRows(table: Locator): Promise<string[][]> {
  return table
    .getByRole('row')
    .evaluateAll((rows) => rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.trim() ?? '')))
}

/** The Books and Pages columns of `table`, header first: the period's own format is the build's. */
async function booksAndPages(table: Locator): Promise<string[][]> {
  return (await tableRows(table)).map((row) => row.slice(1))
}

/** One column of the decorative chart, as drawn: its value, period lines, sizes and colours. */
type ChartColumn = {
  value: string
  period: string[]
  track: number
  trackBorder: string
  trackBackground: string
  fill: number
  fillBackground: string | null
  fillTransition: string | null
  valueFontSize: string
  periodFontSize: string
}

/** The `aria-hidden` chart's columns, oldest first: value above, track, period below. */
async function chartColumns(page: Page): Promise<ChartColumn[]> {
  return page
    .getByRole('main')
    .locator('[aria-hidden="true"] > div')
    .evaluateAll((columns) =>
      columns.map((column) => {
        const [value, track, period] = Array.from(column.children)
        const fill = track.firstElementChild
        return {
          value: value.textContent ?? '',
          period: Array.from(period.children, (line) => line.textContent ?? ''),
          track: track.getBoundingClientRect().height,
          trackBorder: getComputedStyle(track).borderTopWidth,
          trackBackground: getComputedStyle(track).backgroundColor,
          fill: fill === null ? 0 : fill.getBoundingClientRect().height,
          fillBackground: fill === null ? null : getComputedStyle(fill).backgroundColor,
          fillTransition: fill === null ? null : getComputedStyle(fill).transitionDuration,
          valueFontSize: getComputedStyle(value).fontSize,
          periodFontSize: getComputedStyle(period).fontSize,
        }
      }),
    )
}

/** Text shown on screen in `main` (the table may be visually hidden). */
function shownText(page: Page, text: string): Locator {
  return page.getByRole('main').getByText(text, { exact: true }).filter({ visible: true })
}

test.describe('Story 6.4 See my reading month by month (ATDD)', () => {
  test('[P1] AC-2 each bar shows its pages, and the same buckets are a table of period, books and pages', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      const table = chartTable(page)

      // The criterion: the buckets exposed to assistive tech as a table.
      await expect(table.getByRole('columnheader')).toHaveText(['Period', 'Books', 'Pages'])

      // This year at 2026-10-28: January to October, one row each, empty months included.
      const empty = Array.from({ length: 8 }, () => ['0', '0'])
      await expect.poll(() => booksAndPages(table)).toEqual([['Books', 'Pages'], ...empty, ['1', '400'], ['2', '610']])
      const periods = (await tableRows(table)).slice(1).map((row) => row[0])
      expect(new Set(periods).size).toBe(10)
      expect(periods.every((period) => period !== '')).toBe(true)

      // Each bar's value above it, on screen: September's 400 and October's 610.
      await expect(shownText(page, '400').first()).toBeVisible()
      await expect(shownText(page, '610').first()).toBeVisible()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 a new range updates the numbers and bars at once, with no animation under reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const server = await serverAtFakeToday(page, 'stats-bars-update', FLOW_7)
    try {
      // Setup, unasserted: This year has loaded.
      const thisYear = statsRequest(page)
      await page.goto(`${server.url}/stats`)
      await (await thisYear).response()

      const thisMonth = statsRequest(page)
      await preset(page, 'This month').click()
      await (await thisMonth).response()
      const table = chartTable(page)

      // The criterion: the bars follow the range, down to October alone.
      await expect
        .poll(() => booksAndPages(table))
        .toEqual([
          ['Books', 'Pages'],
          ['2', '610'],
        ])
      await expect(page.getByRole('status')).toHaveText('2 books, 610 pages.')

      // Instant: nothing is animating once the new bars are in (reduced motion).
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 Last year puts all 900 pages of a Book finished on 2 December in December', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-tome', THE_TOME)
    try {
      await page.goto(`${server.url}/stats`)
      const lastYear = statsRequest(page)
      await preset(page, 'Last year').click()
      await (await lastYear).response()
      const table = chartTable(page)

      await expect.poll(async () => (await tableRows(table)).length).toBe(13)
      const rows = await tableRows(table)
      expect(rows.find((row) => row[0] === 'December 2025')).toEqual(['December 2025', '1', '900'])
      expect(rows.find((row) => row[0] === 'November 2025')).toEqual(['November 2025', '0', '0'])
      // 900 as the pages figure, and again as a bar value in the chart, outside Totals.
      await expect(figure(page, '900')).toBeVisible()
      await expect(
        page.getByRole('main').locator('[aria-hidden="true"]').getByText('900', { exact: true }),
      ).toBeVisible()
      const columns = await chartColumns(page)
      const november = columns[10]
      const december = columns[11]
      expect(december.value).toBe('900')
      expect(december.fill).toBeCloseTo(december.track, 0)
      expect(november.value).toBe('0')
      expect(november.fill).toBe(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 each bar is as tall as its pages against the largest, and an empty month has no fill', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-heights', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      // The chart is decorative: its columns, by their value label, in order.
      const heights = await chartColumns(page)
      expect(heights.map((column) => column.value)).toEqual(['0', '0', '0', '0', '0', '0', '0', '0', '400', '610'])
      const [january] = heights
      const september = heights[8]
      const october = heights[9]
      expect(january.fill).toBe(0)
      expect(october.fill).toBeCloseTo(october.track, 0)
      expect(september.fill / october.fill).toBeCloseTo(400 / 610, 1)
      // The period below each bar: the first bar adds its year on a second line.
      expect(january.period).toEqual(['Jan', '2026'])
      expect(september.period).toEqual(['Sep'])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] All time with nothing finished has no bars and no table', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-nothing', NOTHING_FINISHED)
    try {
      await page.goto(`${server.url}/stats`)
      // This year with nothing finished: ten empty months, drawn as zero-height bars reading "0".
      await expect.poll(async () => (await tableRows(chartTable(page))).length).toBe(11)
      expect((await booksAndPages(chartTable(page))).slice(1)).toEqual(Array.from({ length: 10 }, () => ['0', '0']))
      const empty = await chartColumns(page)
      expect(empty.map((column) => column.value)).toEqual(Array.from({ length: 10 }, () => '0'))
      expect(empty.map((column) => column.fill)).toEqual(Array.from({ length: 10 }, () => 0))
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()

      await preset(page, 'All time').click()
      await expect(page.getByRole('main').getByText('No books finished yet.', { exact: true })).toBeVisible()
      await expect(chartTable(page)).toHaveCount(0)
      await expect(page.getByRole('main').locator('[aria-hidden="true"]')).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 editing Custom updates the table and bars, and the fills never transition', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-custom', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()
      await preset(page, 'Custom').click()

      const september = statsRequestFor(page, { from: '2026-09-01', to: '2026-10-28' })
      await dateField(page, 'From').fill('2026-09-01')
      await (await september).response()
      const table = chartTable(page)
      await expect
        .poll(() => tableRows(table))
        .toEqual([
          ['Period', 'Books', 'Pages'],
          ['September 2026', '1', '400'],
          ['October 2026', '2', '610'],
        ])
      await expect(table.locator('caption')).toHaveText('Books and pages finished by month')

      // The bars follow: two columns now, and no fill has a transition (motion is not reduced here).
      const columns = await chartColumns(page)
      expect(columns.map((column) => column.value)).toEqual(['400', '610'])
      expect(columns.map((column) => column.fillTransition)).toEqual(['0s', '0s'])
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 All time over 24 months shows one bar and one row per year', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-years', YEARS_APART)
    try {
      await page.goto(`${server.url}/stats`)
      const allTime = statsRequest(page)
      await preset(page, 'All time').click()
      await (await allTime).response()
      const table = chartTable(page)

      await expect(table.locator('caption')).toHaveText('Books and pages finished by year')
      await expect
        .poll(() => tableRows(table))
        .toEqual([
          ['Period', 'Books', 'Pages'],
          ['2024', '1', '412'],
          ['2025', '0', '0'],
          ['2026', '1', '400'],
        ])
      expect((await chartColumns(page)).map((column) => column.period)).toEqual([['2024'], ['2025'], ['2026']])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 under forced colours the track has a border and the fill a system colour', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const server = await serverAtFakeToday(page, 'stats-bars-forced', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      const october = (await chartColumns(page))[9]
      expect(october.value).toBe('610')
      expect(october.fillBackground).not.toBeNull()
      expect(october.fillBackground).not.toBe('rgba(0, 0, 0, 0)')
      // Without the Highlight rule the fill is forced to Canvas, the same as its track, and vanishes.
      expect(october.fillBackground).not.toBe(october.trackBackground)
      expect(october.trackBorder).not.toBe('0px')
    } finally {
      await stopAndRemove(server)
    }
  })
  test('[P2] AC-2 the bars are an accent fill on an accent-soft track, with meta labels, in light and in dark', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'stats-bars-theme', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()

      // The theme's own tokens, resolved by the browser: a probe's color set to each token.
      const themeTokens = () =>
        page.evaluate(() => {
          const resolve = (value: string): string => {
            const probe = document.createElement('span')
            probe.style.color = value
            document.body.append(probe)
            const color = getComputedStyle(probe).color
            probe.remove()
            return color
          }
          const root = getComputedStyle(document.documentElement)
          return {
            dark: matchMedia('(prefers-color-scheme: dark)').matches,
            accent: resolve(root.getPropertyValue('--color-accent').trim()),
            accentSoft: resolve(root.getPropertyValue('--color-accent-soft').trim()),
            metaSize: root.getPropertyValue('--font-meta-size').trim(),
          }
        })

      const light = await themeTokens()
      expect(light.dark).toBe(false)
      const lightOctober = (await chartColumns(page))[9]
      expect(lightOctober.value).toBe('610')
      expect(lightOctober.fillBackground).toBe(light.accent)
      expect(lightOctober.trackBackground).toBe(light.accentSoft)
      expect(lightOctober.valueFontSize).toBe(light.metaSize)
      expect(lightOctober.periodFontSize).toBe(light.metaSize)

      await page.emulateMedia({ colorScheme: 'dark' })
      const dark = await themeTokens()
      // The dark theme is in force, and its accent is not the light one.
      expect(dark.dark).toBe(true)
      expect(dark.accent).not.toBe(light.accent)
      const darkOctober = (await chartColumns(page))[9]
      expect(darkOctober.fillBackground).toBe(dark.accent)
      expect(darkOctober.trackBackground).toBe(dark.accentSoft)
      expect(darkOctober.valueFontSize).toBe(dark.metaSize)
      expect(darkOctober.periodFontSize).toBe(dark.metaSize)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 the first bar carries its year even when it is not January', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-first-year', FLOW_7)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '1,010')).toBeVisible()
      await preset(page, 'Custom').click()

      const september = statsRequestFor(page, { from: '2026-09-01', to: '2026-10-28' })
      await dateField(page, 'From').fill('2026-09-01')
      await (await september).response()
      await expect.poll(async () => (await chartColumns(page)).map((column) => column.value)).toEqual(['400', '610'])

      // September opens the range, so it, not January, carries 2026; October does not.
      expect((await chartColumns(page)).map((column) => column.period)).toEqual([['Sep', '2026'], ['Oct']])
    } finally {
      await stopAndRemove(server)
    }
  })
})
