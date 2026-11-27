// Story 17.2 Choose a month or year by its bar (ATDD). The Stats chart becomes a
// `group` named "Finished by month" ("Finished by year"), each bar with finishes a
// toggle button named from its bucket, and the chart one roving Tab stop. Pressing
// a bar narrows the finished list to that period under "Finished in March 2026",
// adds `period` to the address by a same-page replace, and announces the bar's
// books; pressing it again, or Show the whole range, widens the list. A range
// change releases the bar, and a `period` that isn't a bar with finishes in the
// shown view is dropped quietly (AR75, AR76, AR78, UX-DR108–UX-DR113).
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` with the
// browser clock at 10:00 that day in Madrid. `BARS` (stats.ts) holds the finishes.

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures.ts'
import { systemColor } from './dev-mode.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import {
  ACCENT,
  ACCENT_DARK,
  bookId,
  designColor,
  designComponentValue,
  INK,
  INK_DARK,
  INK_SECONDARY,
  INK_SECONDARY_DARK,
  pressOnceThen,
  rgbOf,
} from './library.ts'
import {
  address,
  afterAnnounceDelay,
  APRIL_ROWS,
  AXE_TAGS,
  bar,
  barChart,
  barLook,
  BARS,
  chartBars,
  dateField,
  FEB_APR,
  FEB_APR_BARS,
  figure,
  finishedHeading,
  finishedLink,
  finishedLinks,
  focusablesIn,
  historyLength,
  labelsOf,
  MARCH_ROWS,
  nav,
  preset,
  recordStatsRequests,
  STATS_API,
  showWholeRange,
  statsRequestFor,
} from './stats.ts'

const DDIA = 'Designing Data-Intensive Applications'
const FEB_APR_HEADING = 'Finished 1 February – 15 April 2026'
const FEB_APR_LINE = '6 books, 2,152 pages.'
const FEB_APR_MARCH = `${FEB_APR}&period=2026-03`

/** The highlight ring as Chromium computes it: 2px `page`, then 2px `accent` (DESIGN.md components.highlight-ring). */
function highlightRing(page: string, accent: string): string {
  return `${page} 0px 0px 0px 2px, ${accent} 0px 0px 0px 4px`
}

test.describe('Story 17.2 Choose a month or year by its bar (ATDD)', () => {
  test.skip('[P0] AC-1 the chart is a group of toggle bars named from their buckets, and empty bars are not buttons', async ({
    page,
  }) => {
    // RED: StatsBars draws an aria-hidden chart with no group and no buttons.
    const server = await serverAtFakeToday(page, 'stats-bars-buttons', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      // Shipped: Custom 1 February – 15 April 2026's numbers.
      await expect(figure(page, '2,152')).toBeVisible()

      // The criterion: the chart is a group named by its bucket, no longer hidden.
      await expect(barChart(page, 'month')).toBeVisible()

      // Each bar with finishes is a toggle button named from its bucket, unpressed.
      await expect(chartBars(page)).toHaveCount(3)
      for (const [index, name] of FEB_APR_BARS.entries()) {
        await expect(chartBars(page).nth(index)).toHaveAccessibleName(name)
        await expect(chartBars(page).nth(index)).toHaveAttribute('aria-pressed', 'false')
      }
      await expect(barChart(page, 'month')).not.toHaveAttribute('aria-hidden', 'true')
      // The hidden table still lists every period.
      await expect(page.getByRole('main').getByRole('table').getByRole('rowheader')).toHaveText([
        'February 2026',
        'March 2026',
        'April 2026',
      ])

      // This year: January, May, July, August and September have no finishes. They are drawn,
      // aren't buttons and can't be focused, and their value and period text is aria-hidden.
      await preset(page, 'This year').click()
      await expect(figure(page, '2,565')).toBeVisible()
      await expect(chartBars(page)).toHaveCount(5)
      for (const [index, name] of [
        ...FEB_APR_BARS,
        'June 2026, 1 book, 412 pages',
        'October 2026, 1 book, 1 page',
      ].entries()) {
        await expect(chartBars(page).nth(index)).toHaveAccessibleName(name)
      }
      // Nothing else in the chart can take focus.
      expect(await focusablesIn(barChart(page, 'month'))).toHaveLength(5)
      const exposed = await barChart(page, 'month').evaluate((chart) =>
        Array.from(chart.querySelectorAll('*'))
          .filter((node) => ['0', 'Jan', '2026', 'May', 'Jul', 'Aug', 'Sep'].includes((node.textContent ?? '').trim()))
          .filter((node) => node.closest('[aria-hidden="true"]') === null)
          .map((node) => (node.textContent ?? '').trim()),
      )
      expect(exposed).toEqual([])
      await expect(page.getByRole('main').getByRole('table').getByRole('rowheader')).toHaveCount(10)

      // Over 24 months the group is by year, and a year bar is named the same way.
      await preset(page, 'All time').click()
      await expect(barChart(page, 'year')).toBeVisible()
      await expect(chartBars(page)).toHaveCount(2)
      await expect(chartBars(page).nth(0)).toHaveAccessibleName('2024, 1 book, 304 pages')
      await expect(chartBars(page).nth(1)).toHaveAccessibleName('2026, 8 books, 2,565 pages')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-2 the chart is one Tab stop on the latest bar, and the arrows skip empty bars without wrapping', async ({
    page,
  }) => {
    // RED: the chart has no bar buttons, so Shift+Tab from the list lands elsewhere.
    const server = await serverAtFakeToday(page, 'stats-bars-keys', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(figure(page, '2,152')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(6)

      // Into the chart from the list after it.
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')

      // The criterion: focus lands on the latest bar with finishes.
      await expect(bar(page, 'April 2026')).toBeFocused()

      // One Tab stop: only the focused bar is in the Tab order.
      expect((await focusablesIn(barChart(page, 'month'))).filter((stop) => stop.tabIndex === 0)).toHaveLength(1)
      await expect(bar(page, 'April 2026')).toHaveAttribute('tabindex', '0')
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'March 2026')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'February 2026')).toBeFocused()
      // No wrap at either end.
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'February 2026')).toBeFocused()
      await page.keyboard.press('End')
      await expect(bar(page, 'April 2026')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(bar(page, 'April 2026')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(bar(page, 'February 2026')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(bar(page, 'March 2026')).toBeFocused()
      // Up and Down do nothing, and moving presses nothing.
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await expect(bar(page, 'March 2026')).toBeFocused()
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)

      // Tab out and back lands on the last focused bar.
      await page.keyboard.press('Tab')
      await expect(bar(page, 'March 2026')).not.toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'March 2026')).toBeFocused()

      // This year: the arrows skip the empty months, and Home skips January.
      await preset(page, 'This year').click()
      await expect(figure(page, '2,565')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(8)
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'October 2026')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'June 2026')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(bar(page, 'April 2026')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(bar(page, 'February 2026')).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-3 pressing March narrows the list to its finishes, announces its books and adds period to the address', async ({
    page,
  }) => {
    // RED: there is no March bar to press.
    const server = await serverAtFakeToday(page, 'stats-bars-press', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR}`)
      await expect(figure(page, '2,152')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(6)
      const length = await historyLength(page)
      const scrollY = await page.evaluate(() => window.scrollY)
      const march = bar(page, 'March 2026')

      // The criterion: a click on the March bar presses it.
      await expect.poll(pressOnceThen(march, () => march.getAttribute('aria-pressed'))).toBe('true')

      await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
      await expect(finishedLinks(page)).toHaveCount(3)
      expect(await labelsOf(finishedLinks(page))).toEqual(MARCH_ROWS)
      // The two big numbers still show the whole range.
      await expect(figure(page, '6')).toBeVisible()
      await expect(figure(page, '2,152')).toBeVisible()
      await expect(march).toBeFocused()
      await expect(page.getByRole('status')).toHaveText('Finished in March 2026: 3 books.')
      // A same-page replace: the entry is replaced, the h1 doesn't take focus, the page doesn't scroll.
      await expect.poll(async () => [address(page), await historyLength(page)]).toEqual([FEB_APR_MARCH, length])
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).not.toBeFocused()
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)

      // Enter presses April, Space releases it.
      const april = bar(page, 'April 2026')
      await april.focus()
      await page.keyboard.press('Enter')
      await expect(april).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedLinks(page)).toHaveCount(2)
      await page.keyboard.press('Space')
      await expect(april).toHaveAttribute('aria-pressed', 'false')
      await expect(finishedLinks(page)).toHaveCount(6)

      // The whole column is the target: a click on February's value label at its top, then
      // on its period label at its bottom.
      const february = bar(page, 'February 2026')
      expect((await barLook(february)).labels.map((label) => label.text)).toEqual(['286', 'Feb', '2026'])
      const box = await february.boundingBox()
      expect(box).not.toBeNull()
      await february.click({ position: { x: box!.width / 2, y: 2 } })
      await expect(february).toHaveAttribute('aria-pressed', 'true')
      await february.click({ position: { x: box!.width / 2, y: box!.height - 2 } })
      await expect(february).toHaveAttribute('aria-pressed', 'false')

      // A year bar: All time, then 2024.
      await preset(page, 'All time').click()
      await expect(figure(page, '2,869')).toBeVisible()
      await bar(page, '2024').click()
      await expect(finishedHeading(page)).toHaveText('Finished in 2024')
      await expect(page.getByRole('status')).toHaveText('Finished in 2024: 1 book.')
      await expect.poll(() => address(page)).toBe('/stats?range=allTime&period=2024')
      await expect(finishedLinks(page)).toHaveCount(1)
      expect(await labelsOf(finishedLinks(page))).toEqual(['Solaris, Stanisław Lem, finished 15 Jan 2024, 304 pages'])
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-4 pressing April moves the selection, and pressing it again widens the list', async ({ page }) => {
    // RED: the address's period is ignored and there are no bars to press.
    const server = await serverAtFakeToday(page, 'stats-bars-toggle', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()
      const april = bar(page, 'April 2026')
      const march = bar(page, 'March 2026')

      // The criterion: pressing April selects it and releases March.
      await expect
        .poll(
          pressOnceThen(april, async () => [
            await april.getAttribute('aria-pressed'),
            await march.getAttribute('aria-pressed'),
          ]),
        )
        .toEqual(['true', 'false'])

      await expect(finishedHeading(page)).toHaveText('Finished in April 2026')
      await expect(finishedLinks(page)).toHaveCount(2)
      expect(await labelsOf(finishedLinks(page))).toEqual(APRIL_ROWS)
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(1)
      await expect.poll(() => address(page)).toBe(`${FEB_APR}&period=2026-04`)

      // Pressing the selected bar again releases it and widens the list to the range.
      await april.click()
      await expect(april).toHaveAttribute('aria-pressed', 'false')
      await expect(finishedHeading(page)).toHaveText(FEB_APR_HEADING)
      await expect(finishedLinks(page)).toHaveCount(6)
      await expect(april).toBeFocused()
      await expect(page.getByRole('status')).toHaveText(FEB_APR_LINE)
      await expect.poll(() => address(page)).toBe(FEB_APR)
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-5 Show the whole range sits beside the heading while a bar is selected and widens the list', async ({
    page,
  }) => {
    // RED: there is no Show the whole range button.
    const server = await serverAtFakeToday(page, 'stats-bars-whole-range', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()

      // The criterion: with March selected, Show the whole range is shown.
      await expect(showWholeRange(page)).toBeVisible()

      // A sibling of the h2, so the heading's name stays the period; in meta.
      await expect(finishedHeading(page)).toHaveAccessibleName('Finished in March 2026')
      await expect(finishedHeading(page).getByRole('button')).toHaveCount(0)
      const metaSize = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--font-meta-size').trim(),
      )
      await expect(showWholeRange(page)).toHaveCSS('font-size', metaSize)

      await showWholeRange(page).click()
      await expect(finishedHeading(page)).toHaveText(FEB_APR_HEADING)
      await expect(finishedLinks(page)).toHaveCount(6)
      // Focus moves to the bar that was selected, now unpressed and the chart's Tab stop.
      const march = bar(page, 'March 2026')
      await expect(march).toBeFocused()
      await expect(march).toHaveAttribute('aria-pressed', 'false')
      expect((await focusablesIn(barChart(page, 'month'))).filter((stop) => stop.tabIndex === 0)).toHaveLength(1)
      await expect(march).toHaveAttribute('tabindex', '0')
      await expect(page.getByRole('status')).toHaveText(FEB_APR_LINE)
      await expect.poll(() => address(page)).toBe(FEB_APR)
      // Not there while no bar is selected.
      await expect(showWholeRange(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-6 the selected bar is ringed with ink labels, the others only dim their fill, with no motion', async ({
    page,
  }) => {
    // RED: no bar is selected, so March's track has no ring.
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'stats-bars-look', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()
      const march = bar(page, 'March 2026')
      const february = bar(page, 'February 2026')
      const dimmed = Number(designComponentValue('monthly-bar', 'dimmed-fill-opacity'))
      const metaWeight = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--font-meta-weight').trim(),
      )

      // The criterion: March's track has the highlight ring.
      await expect
        .poll(async () => (await barLook(march)).track.shadow)
        .toBe(highlightRing(rgbOf(designColor('page')), ACCENT))

      const selected = await barLook(march)
      expect(selected.labels.map((label) => label.text)).toEqual(['1,335', 'Mar'])
      expect(selected.labels.map(({ color, weight, opacity }) => ({ color, weight, opacity }))).toEqual([
        { color: INK, weight: '600', opacity: 1 },
        { color: INK, weight: '600', opacity: 1 },
      ])
      expect(selected.fill?.opacity).toBe(1)
      // Another bar with finishes keeps full-contrast labels; only its fill dims.
      const other = await barLook(february)
      expect(other.track.shadow).toBe('none')
      expect(other.labels.map(({ color, weight, opacity }) => ({ color, weight, opacity }))).toEqual([
        { color: INK_SECONDARY, weight: metaWeight, opacity: 1 },
        { color: INK_SECONDARY, weight: metaWeight, opacity: 1 },
        { color: INK_SECONDARY, weight: metaWeight, opacity: 1 },
      ])
      expect(other.fill?.opacity).toBeCloseTo(dimmed, 5)
      // No transition on the ring or the dimming; hover changes only the cursor.
      expect([selected.track.transition, selected.fill?.transition, other.fill?.transition]).toEqual(['0s', '0s', '0s'])
      expect(other.cursor).toBe('pointer')
      await february.hover()
      const hovered = await barLook(february)
      expect({ ...hovered, cursor: other.cursor }).toEqual(other)

      // Keyboard focus on the selected bar: the focus ring 6px out, outside the highlight ring.
      await showWholeRange(page).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(march).toBeFocused()
      const focused = await barLook(march)
      expect(focused.track).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineColor: ACCENT,
        outlineOffset: designComponentValue('monthly-bar', 'selected-focus-offset'),
      })
      expect(focused.track.shadow).toBe(selected.track.shadow)

      // Dark: the dark page and accent in the ring, dark ink on the labels.
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect
        .poll(async () => (await barLook(march)).track.shadow)
        .toBe(highlightRing(rgbOf(designColor('page-dark')), ACCENT_DARK))
      expect((await barLook(march)).labels.map((label) => label.color)).toEqual([INK_DARK, INK_DARK])
      expect((await barLook(february)).labels.map((label) => label.color)).toEqual([
        INK_SECONDARY_DARK,
        INK_SECONDARY_DARK,
        INK_SECONDARY_DARK,
      ])
      expect((await barLook(february)).fill?.opacity).toBeCloseTo(dimmed, 5)

      // Forced colors: no dimming, and the selected bar has a 2px Highlight outline at offset 0.
      await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
      await page.getByRole('main').getByRole('heading', { level: 1 }).focus()
      await expect(march).not.toBeFocused()
      const highlight = await systemColor(page, 'Highlight')
      await expect.poll(async () => (await barLook(february)).fill?.opacity).toBe(1)
      expect((await barLook(march)).track).toMatchObject({
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '0px',
        outlineColor: highlight,
      })

      // With no bar selected, every bar is drawn as before Epic 17.
      await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' })
      await showWholeRange(page).click()
      await expect(march).toHaveAttribute('aria-pressed', 'false')
      for (const name of ['February 2026', 'March 2026', 'April 2026']) {
        const look = await barLook(bar(page, name))
        expect(look.track.shadow, name).toBe('none')
        expect(look.fill?.opacity, name).toBe(1)
        expect(
          look.labels.every((label) => label.color === INK_SECONDARY && label.weight === metaWeight),
          name,
        ).toBe(true)
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-7 another range releases the bar and forgets the last focused bar, even into a year chart', async ({
    page,
  }) => {
    // RED: the chart has no bar buttons to release.
    const server = await serverAtFakeToday(page, 'stats-bars-range-change', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()
      // Setup, unasserted: focus into the chart (the selected March) and on to February.
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('ArrowLeft')

      await preset(page, 'This year').click()

      // The criterion: This year's five bars are all released.
      await expect(barChart(page, 'month').getByRole('button', { pressed: false })).toHaveCount(5)

      await expect(barChart(page, 'month').getByRole('button', { pressed: true })).toHaveCount(0)
      await expect.poll(() => address(page)).toBe('/stats?range=thisYear')
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      await expect(finishedLinks(page)).toHaveCount(8)
      await expect(page.getByRole('status')).toHaveText('8 books, 2,565 pages.')
      // The last focused bar (February, still in the chart) is forgotten: Tab lands on the latest.
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'October 2026')).toBeFocused()

      // From a month chart with June selected to All time's year chart.
      await bar(page, 'June 2026').click()
      await expect(bar(page, 'June 2026')).toHaveAttribute('aria-pressed', 'true')
      await preset(page, 'All time').click()
      await expect(barChart(page, 'year').getByRole('button', { pressed: false })).toHaveCount(2)
      await expect.poll(() => address(page)).toBe('/stats?range=allTime')
      await expect(finishedLinks(page)).toHaveCount(9)
      await expect(page.getByRole('status')).toHaveText('9 books, 2,869 pages.')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-8 Back from a Book returns to the same range, March selected and its three rows', async ({
    page,
  }) => {
    // RED: there is no March bar to select.
    const server = await serverAtFakeToday(page, 'stats-bars-back', BARS)
    try {
      await page.goto(server.url)
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(figure(page, '2,565')).toBeVisible()
      await preset(page, 'Custom').click()
      await dateField(page, 'From').fill('2026-02-01')
      await dateField(page, 'To').fill('2026-04-15')
      await expect(figure(page, '2,152')).toBeVisible()

      // The journey: March is selected (the press waits for the bar inside the poll).
      await expect.poll(pressOnceThen(bar(page, 'March 2026'), async () => address(page))).toBe(FEB_APR_MARCH)
      await finishedLink(page, DDIA).click()
      await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(DDIA)
      await page.goBack()

      // The criterion: the same range, March selected, the same three rows.
      await expect
        .poll(async () => [
          address(page),
          await bar(page, 'March 2026').getAttribute('aria-pressed'),
          await labelsOf(finishedLinks(page)),
        ])
        .toEqual([FEB_APR_MARCH, 'true', MARCH_ROWS])

      await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      // Tab into the chart lands on March, the selected bar.
      await showWholeRange(page).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(bar(page, 'March 2026')).toBeFocused()

      // Back once more leaves Stats for Home in one step.
      await page.goBack()
      await expect(page).toHaveURL(`${server.url}/`)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-9 a period that is not a bar with finishes is dropped quietly, and never sent to the server', async ({
    page,
  }) => {
    // RED: the address keeps the period, since only range, from and to are checked on arrival.
    const server = await serverAtFakeToday(page, 'stats-bars-bad-period', BARS)
    try {
      const sent = recordStatsRequests(page)
      // A month outside the range.
      await page.goto(`${server.url}${FEB_APR}&period=2026-06`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Stats')

      // The criterion: the period is dropped from the address.
      await expect.poll(() => address(page)).toBe(FEB_APR)

      await expect(chartBars(page).and(page.locator('[aria-pressed="false"]'))).toHaveCount(3)
      await expect(finishedHeading(page)).toHaveText(FEB_APR_HEADING)
      await expect(finishedLinks(page)).toHaveCount(6)
      await expect(showWholeRange(page)).toHaveCount(0)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).not.toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')

      // A month with no finishes, a year on a month chart, a month on a year chart, and text.
      for (const [arrive, shown] of [
        ['/stats?range=thisYear&period=2026-05', '/stats?range=thisYear'],
        [`${FEB_APR}&period=2026`, FEB_APR],
        ['/stats?range=allTime&period=2026-03', '/stats?range=allTime'],
        [`${FEB_APR}&period=spring`, FEB_APR],
      ]) {
        await page.goto(`${server.url}${arrive}`)
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Stats')
        await expect.poll(() => address(page), { message: arrive }).toBe(shown)
        await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)
        await expect(showWholeRange(page)).toHaveCount(0)
        await afterAnnounceDelay(page)
        await expect(page.getByRole('status')).toHaveText('')
      }

      // A valid period is kept, and the server still sees only from and to.
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(finishedLinks(page)).toHaveCount(3)
      expect(sent.length).toBeGreaterThan(0)
      expect(sent.every((query) => Object.keys(query).every((key) => key === 'from' || key === 'to'))).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-10 while the next range loads, the shown view has no bar buttons and its list is whole', async ({
    page,
  }) => {
    // RED: the chart is aria-hidden, not a group.
    const server = await serverAtFakeToday(page, 'stats-bars-placeholder', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()

      // This year's view is held until the leaf lets it through.
      let release: () => void = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/views/stats**', async (route) => {
        if (new URL(route.request().url()).searchParams.get('from') === '2026-01-01') await held
        await route.continue()
      })
      const thisYear = statsRequestFor(page, { from: '2026-01-01', to: '2026-10-28' })
      await preset(page, 'This year').click()
      await thisYear

      // The criterion: the chart still drawn from the shown view, with no bar a button.
      await expect(barChart(page, 'month')).toBeVisible()

      await expect(barChart(page, 'month').getByRole('button')).toHaveCount(0)
      // The shown view's list, whole: not narrowed, and not This year's yet.
      await expect(finishedHeading(page)).toHaveText(FEB_APR_HEADING)
      await expect(finishedLinks(page)).toHaveCount(6)
      await expect(figure(page, '2,152')).toBeVisible()

      release()
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      await expect(chartBars(page)).toHaveCount(5)
      await expect(finishedLinks(page)).toHaveCount(8)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-11 a refetch that empties the selected bar releases it and moves focus to the chart stop', async ({
    page,
  }) => {
    // RED: the address keeps the period whatever the view says.
    const server = await serverAtFakeToday(page, 'stats-bars-refetch', BARS)
    try {
      // February holds one finish, Kindred on 10 February.
      await page.goto(`${server.url}${FEB_APR}&period=2026-02`)
      await expect(figure(page, '2,152')).toBeVisible()
      // Setup, unasserted: focus on the February bar (from Show the whole range, back into the chart).
      await finishedLinks(page).first().focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')

      // Another context removed that finish: the refetch has no books in February.
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

      // The criterion: the bar is released and period leaves the address.
      await expect.poll(() => address(page)).toBe(FEB_APR)

      await expect(figure(page, '1,866')).toBeVisible()
      await expect(chartBars(page)).toHaveCount(2)
      await expect(chartBars(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0)
      await expect(finishedHeading(page)).toHaveText(FEB_APR_HEADING)
      await expect(finishedLinks(page)).toHaveCount(5)
      // Focus, which the released bar held, moves to the chart's Tab stop: the latest bar.
      await expect(bar(page, 'April 2026')).toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
      await expect(page.getByRole('alert')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P2] AC-12 This month past midnight keeps its bar selected: the moving dates are not a range change', async ({
    page,
  }) => {
    // RED: the address's period is ignored, so no October bar is selected.
    const server = await serverAtFakeToday(page, 'stats-bars-midnight', BARS)
    try {
      await page.goto(`${server.url}/stats?range=thisMonth&period=2026-10`)
      await expect(finishedLinks(page)).toHaveCount(1)

      // The tab stays open past midnight: Stats regains focus on 29 October.
      await page.clock.setFixedTime(new Date('2026-10-29T00:30:00+01:00'))
      const nextDay = statsRequestFor(page, { from: '2026-10-01', to: '2026-10-29' })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await (await nextDay).response()

      // The criterion: October is still selected.
      await expect(bar(page, 'October 2026')).toHaveAttribute('aria-pressed', 'true')

      await expect(finishedHeading(page)).toHaveText('Finished in October 2026')
      await expect.poll(() => address(page)).toBe('/stats?range=thisMonth&period=2026-10')
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P2] AC-13 axe finds nothing on Stats with a bar selected, in both themes', async ({ page }) => {
    // RED: the address's period is ignored, so no bar is selected.
    const server = await serverAtFakeToday(page, 'stats-bars-axe', BARS)
    try {
      await page.goto(`${server.url}${FEB_APR_MARCH}`)
      await expect(figure(page, '2,152')).toBeVisible()

      // The criterion: March is selected for axe to check.
      await expect(bar(page, 'March 2026')).toHaveAttribute('aria-pressed', 'true')

      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await expect(finishedHeading(page)).toHaveText('Finished in March 2026')
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `bar ${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      }
      // The list is March's three rows.
      await expect(finishedLinks(page)).toHaveCount(3)
      expect(await labelsOf(finishedLinks(page))).toEqual(MARCH_ROWS)
    } finally {
      await stopAndRemove(server)
    }
  })
})
