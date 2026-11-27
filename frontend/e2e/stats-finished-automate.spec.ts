// Story 17.1 See the Books finished in a range: test automation after the story
// was done (spec-17-1-see-the-books-finished-in-a-range.md), beside the ATDD
// leaves in stats-finished.spec.ts. These are the ATDD checklist's green-phase
// follow-ups:
// - the row's stars, cover edge and link states, in light, dark and forced colors (AC-7);
// - All time with nothing finished (AC-8);
// - the bars held with the list while the next range loads (AC-9);
// - Forward after Back, and a reload of a Custom address (AC-12);
// - This year on 1 January (AC-14);
// - arriving by Back and by the nav saying nothing (AC-15).
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` with the
// browser clock at 10:00 that day in Madrid. The AC-14 leaf starts its own
// server at fake today 2027-01-01, at 00:30 Madrid (still 31 December in UTC).

import type { Locator, Page } from '@playwright/test'
import { SPINE_EDGE } from './bookcase.ts'
import { systemColor } from './dev-mode.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import { ACCENT, ACCENT_DARK, bookId, FAVOURITE, FAVOURITE_DARK, rgbOf } from './library.ts'
import { INPUT_BORDER, INPUT_BORDER_DARK } from './sort-direction.ts'
import {
  address,
  afterAnnounceDelay,
  dateField,
  figure,
  FINISHED,
  FINISHED_FILES,
  finishedHeading,
  finishedLink,
  finishedLinks,
  finishedList,
  historyLength,
  labelsOf,
  nav,
  NEW_YEAR,
  NEW_YEAR_NOW,
  NEW_YEAR_TODAY,
  NOTHING_FINISHED,
  preset,
  queryOf,
  statsRequest,
  STATS_API,
  THIS_YEAR_ROWS,
} from './stats.ts'

const DDIA = 'Designing Data-Intensive Applications'
const CUSTOM_FEB_APR = '/stats?range=custom&from=2026-02-01&to=2026-04-15'
const FEB_APR_ROWS = [THIS_YEAR_ROWS[7], THIS_YEAR_ROWS[8]]
/** DESIGN.md `line`, the cover's hairline in light. */
const LINE = rgbOf('#E4DFD5')

/** The page's `h1`, which a route change focuses. */
function h1(page: Page): Locator {
  return page.getByRole('main').getByRole('heading', { level: 1 })
}

/** The chart's table rows, header included: one data row per bucket. */
function chartRows(page: Page): Locator {
  return page.getByRole('main').getByRole('table').getByRole('row')
}

type StarsLook = { gap: string; sizes: string[]; colors: string[] }

/** A row's five stars: the gap between them, each star's size and its color. */
function starsLook(link: Locator): Promise<StarsLook> {
  return link.getByRole('img', { name: /stars?$/ }).evaluate((stars) => ({
    gap: getComputedStyle(stars).columnGap,
    sizes: Array.from(stars.children, (star) => {
      const r = star.getBoundingClientRect()
      return `${r.width}x${r.height}`
    }),
    colors: Array.from(stars.children, (star) => getComputedStyle(star).color),
  }))
}

/** Whether each of the row's title, author and meta texts is underlined. */
function underlines(link: Locator, texts: string[]): Promise<boolean[]> {
  return Promise.all(
    texts.map((text) =>
      link
        .getByText(text, { exact: true })
        .evaluate((node) => getComputedStyle(node).textDecorationLine.includes('underline')),
    ),
  )
}

/**
 * A row's typeset cover found by its solid edge (`thumbnailLook` picks the box by
 * its fill, and under forced colors a transparent fill reads as Canvas with alpha 0):
 * its fill, its edge and its plate's fill.
 */
function typesetLook(link: Locator): Promise<{ background: string; border: string; plate: string | null }> {
  return link.evaluate((element) => {
    const box = Array.from(element.querySelectorAll('*')).find((node) => {
      const r = node.getBoundingClientRect()
      return (
        Math.abs(r.width - 44) <= 0.5 &&
        Math.abs(r.height - 64) <= 0.5 &&
        getComputedStyle(node).borderTopStyle === 'solid'
      )
    })
    if (!box) throw new Error('no 44 × 64 box with a solid edge in the row')
    const plate = box.firstElementChild
    return {
      background: getComputedStyle(box).backgroundColor,
      border: getComputedStyle(box).borderTopColor,
      plate: plate ? getComputedStyle(plate).backgroundColor : null,
    }
  })
}

test.describe('Story 17.1 See the Books finished in a range (automate)', () => {
  test('[P2] AC-7 a row draws accent stars, a hairline cover and title-only link states, in light, dark and forced colors', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-finished-row-look', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()
      const ddia = finishedLink(page, DDIA)
      const texts = [DDIA, 'Martin Kleppmann', '14 Mar 2026 · 611 pages']

      // Four of five stars: 14px, 2px apart, filled accent, the fifth outlined input-border, never gold.
      const light = await starsLook(ddia)
      expect(light).toEqual({
        gap: '2px',
        sizes: Array(5).fill('14x14'),
        colors: [ACCENT, ACCENT, ACCENT, ACCENT, INPUT_BORDER],
      })
      expect(light.colors).not.toContain(FAVOURITE)

      // The cover: cover corners and a 1px line hairline.
      const cover = ddia.locator('img')
      await expect(cover).toHaveCSS('visibility', 'visible')
      await expect(cover).toHaveCSS('border-top-left-radius', '4px')
      await expect(cover).toHaveCSS('border-top-width', '1px')
      await expect(cover).toHaveCSS('border-top-color', LINE)

      // At rest nothing is underlined; hover underlines the title only.
      expect(await underlines(ddia, texts)).toEqual([false, false, false])
      await ddia.hover()
      await expect.poll(() => underlines(ddia, texts)).toEqual([true, false, false])
      await page.mouse.move(0, 0)
      await expect.poll(() => underlines(ddia, texts)).toEqual([false, false, false])

      // Keyboard focus: the ring goes around the whole row, and the title is underlined.
      await ddia.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(ddia).toBeFocused()
      await expect(ddia).toHaveCSS('outline-style', 'solid')
      await expect(ddia).toHaveCSS('outline-width', '2px')
      await expect(ddia).toHaveCSS('outline-color', ACCENT)
      expect(await underlines(ddia, texts)).toEqual([true, false, false])

      // Dark: the dark accent and input-border, still never gold; the ring follows.
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect
        .poll(async () => (await starsLook(ddia)).colors)
        .toEqual([ACCENT_DARK, ACCENT_DARK, ACCENT_DARK, ACCENT_DARK, INPUT_BORDER_DARK])
      expect((await starsLook(ddia)).colors).not.toContain(FAVOURITE_DARK)
      await expect(ddia).toHaveCSS('outline-color', ACCENT_DARK)

      // Forced colors: Dune's typeset cover is Canvas with a CanvasText edge, its plate Canvas.
      await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
      const [canvas, canvasText] = [await systemColor(page, 'Canvas'), await systemColor(page, 'CanvasText')]
      await expect
        .poll(() => typesetLook(finishedLink(page, 'Dune')))
        .toEqual({ background: canvas, border: canvasText, plate: canvas })
      expect(canvasText).not.toBe(SPINE_EDGE)
      await expect(cover).toHaveCSS('border-top-color', canvasText)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-8 All time with nothing finished shows no heading and no list, only "No books finished yet."', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-finished-nothing', NOTHING_FINISHED)
    try {
      await page.goto(`${server.url}/stats?range=allTime`)
      await expect(preset(page, 'All time')).toHaveAttribute('aria-pressed', 'true')

      // The criterion: the empty line, and neither the h2 nor the ol.
      await expect(page.getByRole('main').getByText('No books finished yet.', { exact: true })).toBeVisible()
      await expect(finishedHeading(page)).toHaveCount(0)
      await expect(finishedList(page)).toHaveCount(0)
      expect(address(page)).toBe('/stats?range=allTime')
    } finally {
      await stopAndRemove(server)
    }
  })

  test("[P2] AC-9 while the next range loads, the bars stay the shown view's too", async ({ page }) => {
    const server = await serverAtFakeToday(page, 'stats-finished-held-bars', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()
      // This year at 2026-10-28: January to October, one row each, under the header.
      await expect(chartRows(page)).toHaveCount(11)

      let release: () => void = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/views/stats**', async (route) => {
        if (new URL(route.request().url()).searchParams.get('from') === '2026-10-01') await held
        await route.continue()
      })
      const thisMonth = page.waitForRequest(
        (request) =>
          new URL(request.url()).pathname === STATS_API &&
          new URL(request.url()).searchParams.get('from') === '2026-10-01',
      )
      await preset(page, 'This month').click()
      await thisMonth

      // The criterion: with This month still loading, the bars, numbers and list are This year's.
      await expect(preset(page, 'This month')).toHaveAttribute('aria-pressed', 'true')
      await expect(chartRows(page)).toHaveCount(11)
      await expect(figure(page, '2,489')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(9)

      release()
      // October alone, with its one finish.
      await expect(chartRows(page)).toHaveCount(2)
      await expect(finishedLinks(page)).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-12 Forward after Back keeps the Book, the next Back the list; a reload opens the same list unfocused and silent', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-finished-forward', FINISHED, FINISHED_FILES)
    try {
      await page.goto(server.url)
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(figure(page, '2,489')).toBeVisible()
      await preset(page, 'Custom').click()
      await dateField(page, 'From').fill('2026-02-01')
      await dateField(page, 'To').fill('2026-04-15')
      await expect.poll(() => address(page)).toBe(CUSTOM_FEB_APR)
      const length = await historyLength(page)

      await finishedLink(page, DDIA).click()
      await expect(h1(page)).toHaveText(DDIA)
      await page.goBack()
      await expect.poll(async () => labelsOf(finishedLinks(page))).toEqual(FEB_APR_ROWS)

      // The criterion: Forward is the Book again, and Back after it the same list, focused at its h1.
      await page.goForward()
      await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
      await expect(h1(page)).toHaveText(DDIA)
      await page.goBack()
      await expect
        .poll(async () => [address(page), await labelsOf(finishedLinks(page))])
        .toEqual([CUSTOM_FEB_APR, FEB_APR_ROWS])
      await expect(h1(page)).toBeFocused()
      await expect(finishedHeading(page)).toHaveText('Finished 1 February – 15 April 2026')
      expect(await historyLength(page)).toBe(length + 1)

      // A reload of the Custom address: the same range and list, a direct load (h1 not focused), nothing said.
      await page.reload()
      await expect
        .poll(async () => [address(page), await labelsOf(finishedLinks(page))])
        .toEqual([CUSTOM_FEB_APR, FEB_APR_ROWS])
      await expect(preset(page, 'Custom')).toHaveAttribute('aria-pressed', 'true')
      await expect(dateField(page, 'From')).toHaveValue('2026-02-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-04-15')
      await expect(h1(page)).not.toBeFocused()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-14 range=thisYear at 00:30 on 1 January asks for 2027-01-01 alone and keeps its address', async ({
    page,
  }) => {
    await page.clock.setFixedTime(NEW_YEAR_NOW)
    const server = await startSeededServer(
      test.info(),
      'stats-finished-new-year',
      NEW_YEAR,
      {},
      { fakeToday: NEW_YEAR_TODAY },
    )
    try {
      const thisYear = statsRequest(page)
      await page.goto(`${server.url}/stats?range=thisYear`)

      // The criterion: the local date, not toISOString()'s 31 December, and no rewrite.
      expect(queryOf(await thisYear)).toEqual({ from: '2027-01-01', to: '2027-01-01' })
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      expect(await labelsOf(finishedLinks(page))).toEqual([
        'Neuromancer, William Gibson, finished 1 Jan 2027, 271 pages',
      ])
      expect(address(page)).toBe('/stats?range=thisYear')

      // Last year by its address: all of 2026, Dune alone.
      const lastYear = statsRequest(page)
      await page.goto(`${server.url}/stats?range=lastYear`)
      expect(queryOf(await lastYear)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
      await expect(finishedHeading(page)).toHaveText('Finished last year')
      await expect(finishedLinks(page)).toHaveCount(1)
      expect(await labelsOf(finishedLinks(page))).toEqual(['Dune, Frank Herbert, finished 31 Dec 2026, 412 pages'])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-15 arriving by Back from a Book or by the nav announces nothing, after my own press did', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'stats-finished-arrivals', FINISHED, FINISHED_FILES)
    try {
      await page.goto(server.url)
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(figure(page, '2,489')).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // My press speaks the range line.
      await preset(page, 'This month').click()
      await expect(page.getByRole('status')).toHaveText('1 book, 1 page.')

      // The criterion: Back from a Book shows This month and says nothing.
      await finishedLink(page, 'Extreme Notes').click()
      await expect(h1(page)).toHaveText('Extreme Notes')
      await page.goBack()
      await expect(finishedLinks(page)).toHaveCount(1)
      await expect(preset(page, 'This month')).toHaveAttribute('aria-pressed', 'true')
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // A press, then the nav link on the ranged address: This year, and nothing said.
      await preset(page, 'Last year').click()
      await expect(page.getByRole('status')).toHaveText('1 book, 204 pages.')
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect.poll(() => address(page)).toBe('/stats')
      await expect(preset(page, 'This year')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedLinks(page)).toHaveCount(9)
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // From another page by the nav: the same.
      await nav(page).getByRole('link', { name: 'Home', exact: true }).click()
      await expect(page).toHaveURL(`${server.url}/`)
      await expect(h1(page)).not.toHaveText('Stats')
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(h1(page)).toHaveText('Stats')
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })
})
