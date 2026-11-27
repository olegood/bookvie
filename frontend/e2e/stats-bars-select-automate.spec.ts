// Story 17.2 Choose a month or year by its bar: automation after the story is
// done. These leaves cover the ATDD checklist's green-phase follow-ups that the
// ATDD and build leaves in `stats-bars-select.spec.ts` don't: the roving stop's
// fallback to the selected bar, Up and Down not scrolling, Space and a click on
// the track, Show the whole range's place and look, the plain and dark focus
// rings, a Custom range that turns into a year chart, a period kept through a
// reload and Back/Forward, and a New Year on This year.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` with the
// browser clock at 10:00 that day in Madrid. `BARS` (stats.ts) holds the finishes.

import { expect, test } from './fixtures.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import { ACCENT, ACCENT_DARK, bookId, designComponentValue, firstLineRect } from './library.ts'
import {
  address,
  afterAnnounceDelay,
  APRIL_ROWS,
  bar,
  barChart,
  barLook,
  BARS,
  chartBars,
  dateField,
  FEB_APR,
  figure,
  finishedHeading,
  finishedLink,
  finishedLinks,
  labelsOf,
  MARCH_ROWS,
  NEW_YEAR_NOW,
  showWholeRange,
  STATS_API,
  statsRequestFor,
} from './stats.ts'

const DDIA = 'Designing Data-Intensive Applications'
const FEB_APR_MARCH = `${FEB_APR}&period=2026-03`

test.describe('Story 17.2 Choose a month or year by its bar (automate)', () => {
  test('[P2] AC-2 Tab back falls to the selected bar once the last focused bar has left the chart', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-stop-fallback', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedLinks(page)).toHaveCount(3)
      // Into the chart (the selected March), on to February, then out again.
      await showWholeRange(page).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'March 2026')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'February 2026')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(showWholeRange(page)).toBeFocused()

      // Another context removed Kindred's 10 February finish: February is no longer a bar.
      await page.route('**/api/views/stats**', async (route) => {
        const response = await route.fetch()
        const view = await response.json()
        await route.fulfill({
          response,
          json: {
            ...view,
            books: view.books - 1,
            pages: view.pages - 286,
            buckets: view.buckets.map((b: { period: string }) =>
              b.period === '2026-02' ? { ...b, books: 0, pages: 0 } : b,
            ),
            finishes: view.finishes.filter((f: { finishDate: string }) => f.finishDate !== '2026-02-10'),
          },
        })
      })
      const refetch = page.waitForResponse((response) => new URL(response.url()).pathname === STATS_API)
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await refetch
      await expect(figure(page, '1,866')).toBeVisible()
      await expect(chartBars(page)).toHaveCount(2)

      // The criterion: back into the chart lands on March, the selected bar, not April, the latest.
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'March 2026')).toBeFocused()

      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')
      await expect(bar(page, 'March 2026')).toHaveAttribute('tabindex', '0')
      expect(address(page)).toBe(FEB_APR_MARCH)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-2 Up and Down on a bar are held back, so the page does not scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 })
    const server = await serverAtFakeToday(page, 'stats-bars-no-scroll', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(finishedLinks(page)).toHaveCount(6)
      // Each Up or Down keydown that reaches the window, and whether something held its default back.
      await page.evaluate(() => {
        const seen: { key: string; prevented: boolean }[] = []
        ;(window as unknown as { arrowKeys: typeof seen }).arrowKeys = seen
        window.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            seen.push({ key: event.key, prevented: event.defaultPrevented })
          }
        })
      })
      const arrowKeys = () => page.evaluate(() => (window as unknown as { arrowKeys: unknown[] }).arrowKeys)

      // The page can scroll both ways from here, and the chart is in view.
      await page.evaluate(() => window.scrollTo(0, 120))
      const metrics = await page.evaluate(() => ({
        y: window.scrollY,
        room: document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
      }))
      expect(metrics.y).toBeGreaterThan(0)
      expect(metrics.room).toBeGreaterThan(0)
      await bar(page, 'April 2026').focus()
      await expect(bar(page, 'April 2026')).toBeFocused()
      const y = await page.evaluate(() => window.scrollY)

      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowUp')

      // The criterion: both keys were held back on the chart, so neither could scroll.
      expect(await arrowKeys()).toEqual([
        { key: 'ArrowDown', prevented: true },
        { key: 'ArrowUp', prevented: true },
      ])

      expect(await page.evaluate(() => window.scrollY)).toBe(y)
      await expect(bar(page, 'April 2026')).toBeFocused()
      // The control: Down from the h1 isn't held back, and the page scrolls.
      await page
        .getByRole('main')
        .getByRole('heading', { level: 1 })
        .evaluate((h1) => (h1 as HTMLElement).focus({ preventScroll: true }))
      await page.keyboard.press('ArrowDown')
      expect((await arrowKeys()).at(-1)).toEqual({ key: 'ArrowDown', prevented: false })
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 Space presses a bar from rest, and a click on its track presses it', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-space-track', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(finishedLinks(page)).toHaveCount(6)
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'March 2026')).toBeFocused()

      await page.keyboard.press('Space')

      // The criterion: Space from rest presses March.
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')

      await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
      await expect(finishedLinks(page)).toHaveCount(3)
      expect(await labelsOf(finishedLinks(page))).toEqual(MARCH_ROWS)
      await expect(page.getByRole('status')).toHaveText('Finished in March 2026: 3 books.')

      // A click in the middle of April's 160px track presses April.
      const april = bar(page, 'April 2026')
      const track = await april.evaluate((root) => {
        const node = Array.from(root.querySelectorAll('*')).find(
          (n) => Math.abs(n.getBoundingClientRect().height - 160) <= 0.5,
        )
        if (!node) throw new Error('no 160px track in the bar')
        const { x, y, width, height } = node.getBoundingClientRect()
        return { x: x + width / 2, y: y + height / 2 }
      })
      await page.mouse.click(track.x, track.y)
      await expect(april).toHaveAttribute('aria-pressed', 'true')
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'false')
      await expect(finishedLinks(page)).toHaveCount(2)
      expect(await labelsOf(finishedLinks(page))).toEqual(APRIL_ROWS)
      await expect.poll(() => address(page)).toBe(`${FEB_APR}&period=2026-04`)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 Show the whole range sits {spacing.4} after the heading text, on its baseline, as a link', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'stats-bars-whole-range-look', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
      await expect(showWholeRange(page)).toBeVisible()
      const space4 = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-4')),
      )
      const text = await firstLineRect(finishedHeading(page))
      const button = await showWholeRange(page).boundingBox()
      expect(button).not.toBeNull()

      // The criterion: the button starts {spacing.4} after the heading's last glyph.
      expect(button!.x - (text.x + text.width)).toBeCloseTo(space4, 0)

      // On the heading's baseline: a zero-height inline-block at the end of each sits on it.
      const baselines = await page.evaluate(() => {
        const main = document.querySelector('main')!
        const h2 = main.querySelector('h2')!
        const wholeRange = Array.from(main.querySelectorAll('button')).find(
          (b) => b.textContent === 'Show the whole range',
        )!
        return [h2, wholeRange].map((element) => {
          const probe = document.createElement('span')
          probe.style.cssText = 'display:inline-block;width:0;height:0'
          element.append(probe)
          const top = probe.getBoundingClientRect().top
          probe.remove()
          return top
        })
      })
      expect(Math.abs(baselines[0] - baselines[1])).toBeLessThanOrEqual(0.5)
      // Styled as a link (components.link): accent, underlined 1px with a 3px offset, no button chrome.
      const [, thickness, offset] = designComponentValue('link', 'decoration').match(/^underline (\S+), offset (\S+)$/)!
      await expect(showWholeRange(page)).toHaveCSS('color', ACCENT)
      await expect(showWholeRange(page)).toHaveCSS('text-decoration-line', 'underline')
      await expect(showWholeRange(page)).toHaveCSS('text-decoration-thickness', thickness)
      await expect(showWholeRange(page)).toHaveCSS('text-underline-offset', offset)
      await expect(showWholeRange(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(showWholeRange(page)).toHaveCSS('border-top-width', '0px')
      await expect(showWholeRange(page)).toHaveCSS('padding-left', '0px')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-6 an unselected bar takes the plain focus ring, and the selected one 6px out in dark', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'stats-bars-focus-rings', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedLinks(page)).toHaveCount(3)
      await showWholeRange(page).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'March 2026')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'February 2026')).toBeFocused()

      // The criterion: February, unselected, has components.focus-ring around its track.
      expect((await barLook(bar(page, 'February 2026'))).track).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineColor: ACCENT,
        outlineOffset: designComponentValue('focus-ring', 'offset'),
        shadow: 'none',
      })

      // Dark, back on March: the dark accent, 6px out, outside the highlight ring.
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.keyboard.press('ArrowRight')
      await expect(bar(page, 'March 2026')).toBeFocused()
      await expect.poll(async () => (await barLook(bar(page, 'March 2026'))).track.outlineColor).toBe(ACCENT_DARK)
      const march = (await barLook(bar(page, 'March 2026'))).track
      expect(march).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: designComponentValue('monthly-bar', 'selected-focus-offset'),
      })
      expect(march.shadow).not.toBe('none')
      // February, no longer focused, has no outline.
      expect((await barLook(bar(page, 'February 2026'))).track.outlineStyle).toBe('none')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-7 a Custom range wider than 24 months turns the chart into years and releases the bar', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-custom-years', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedLinks(page)).toHaveCount(3)
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')

      // From 1 January 2024: 28 months, so the chart is by year.
      await dateField(page, 'From').fill('2024-01-01')

      // The criterion: period leaves the address with the new range.
      await expect.poll(() => address(page)).toBe('/stats?range=custom&from=2024-01-01&to=2026-04-15')

      await expect(barChart(page, 'year')).toBeVisible()
      await expect(barChart(page, 'month')).toHaveCount(0)
      await expect(chartBars(page)).toHaveCount(2)
      await expect(chartBars(page).nth(0)).toHaveAccessibleName('2024, 1 book, 304 pages')
      await expect(chartBars(page).nth(1)).toHaveAccessibleName('2026, 6 books, 2,152 pages')
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)
      await expect(showWholeRange(page)).toHaveCount(0)
      await expect(finishedHeading(page)).toHaveText('Finished 1 January 2024 – 15 April 2026')
      await expect(finishedLinks(page)).toHaveCount(7)
      await expect(page.getByRole('status')).toHaveText('7 books, 2,456 pages.')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-9 a valid period survives a reload and Back/Forward, with the h1 rules of an arrival', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-period-history', BARS)
    try {
      const h1 = page.getByRole('main').getByRole('heading', { level: 1 })
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedLinks(page)).toHaveCount(3)

      await page.reload()

      // The criterion: after a reload March is still selected with its three rows.
      await expect
        .poll(async () => [
          address(page),
          await bar(page, 'March 2026').getAttribute('aria-pressed'),
          await labelsOf(finishedLinks(page)),
        ])
        .toEqual([FEB_APR_MARCH, 'true', MARCH_ROWS])

      // A reload is an arrival: the h1 isn't focused and nothing is said.
      await expect(h1).not.toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // To DDIA's Book, Back, Forward, then Back again.
      await finishedLink(page, DDIA).click()
      await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
      await page.goBack()
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')
      await page.goForward()
      await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
      await expect(h1).toHaveText(DDIA)
      await page.goBack()
      await expect
        .poll(async () => [
          address(page),
          await bar(page, 'March 2026').getAttribute('aria-pressed'),
          await labelsOf(finishedLinks(page)),
        ])
        .toEqual([FEB_APR_MARCH, 'true', MARCH_ROWS])
      await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
      await expect(h1).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P3] AC-12 This year past New Year drops a 2026 period quietly: the year moved, not the range', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-bars-new-year', BARS)
    try {
      await page.goto(`${server.url}/stats?range=thisYear&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)
      await expect(bar(page, 'October 2026')).toHaveAttribute('aria-pressed', 'true')

      // The tab stays open past New Year: Stats regains focus at 00:30 on 1 January 2027.
      await page.clock.setFixedTime(NEW_YEAR_NOW)
      const newYear = statsRequestFor(page, { from: '2027-01-01', to: '2027-01-01' })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await newYear).response()

      // The criterion: October 2026 isn't a bar of 2027, so period leaves the address; the range stays.
      await expect.poll(() => address(page)).toBe('/stats?range=thisYear')

      await expect(chartBars(page)).toHaveCount(0)
      await expect(finishedHeading(page)).toHaveCount(0)
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })
})
