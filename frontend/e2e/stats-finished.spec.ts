// Story 17.1 See the Books finished in a range (ATDD). Under the Stats chart an
// `h2` names the range ("Finished this year") over an `ol` with one row per
// finished Reading, in the view's `finishes` order; each row is one link to its
// Book. The range lives in the address (`/stats?range=…`, Custom with `from` and
// `to`), every change replacing the history entry with `lib/page`'s same-page
// marker, so focus and scroll stay put, and Back from a Book returns to the same
// list (AR74–AR77, UX-DR105–UX-DR108, UX-DR112–UX-DR114). What the server sends
// in `finishes` (AC-1 to AC-4) is proven in backend/tests/test_stats_finishes.py.
//
// Dates: `serverAtFakeToday` starts `bookvie --fake-today 2026-10-28` with the
// browser clock at 10:00 that day in Madrid. `FINISHED` (stats.ts) holds the rows.
//
// Red phase: every leaf is `test.skip` until Story 17.1 is built.

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures.ts'
import { SPINE_EDGE } from './bookcase.ts'
import { serverAtFakeToday, stopAndRemove } from './home.ts'
import { bookId, INK, INK_SECONDARY, isFocused, pressOnceThen, rgbOf, SPINE_LABEL_STRIP } from './library.ts'
import { scrollToY } from './back-to-top.ts'
import {
  address,
  afterAnnounceDelay,
  AXE_TAGS,
  dateField,
  DUNE_SPINE,
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
  PIRANESI_SPINE,
  preset,
  STATS_API,
  THIS_YEAR_ROWS,
  thumbnailLook,
} from './stats.ts'

const DDIA = 'Designing Data-Intensive Applications'
const CUSTOM_FEB_APR = '/stats?range=custom&from=2026-02-01&to=2026-04-15'
const FEB_APR_ROWS = [THIS_YEAR_ROWS[7], THIS_YEAR_ROWS[8]]

test.describe('Story 17.1 See the Books finished in a range (ATDD)', () => {
  test.skip('[P0] AC-5 This year lists every finish under the chart, one row link per finish in the view order', async ({
    page,
  }) => {
    // Red phase: Stats has no finished list yet.
    const server = await serverAtFakeToday(page, 'stats-finished-list', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      // Shipped: This year's numbers, 9 books and 2,489 pages.
      await expect(figure(page, '2,489')).toBeVisible()

      // The criterion: the h2 under the chart names the range.
      await expect(finishedHeading(page)).toHaveText('Finished this year')

      // One li per finish, as many as the books figure, each one link, in the view's order.
      await expect(finishedList(page).getByRole('listitem')).toHaveCount(9)
      await expect(figure(page, '9')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(9)
      expect(await labelsOf(finishedLinks(page))).toEqual(THIS_YEAR_ROWS)
      // The list is an ol, after the chart's hidden table in the page.
      expect(await finishedList(page).evaluate((list) => list.tagName)).toBe('OL')

      const ddia = finishedLink(page, DDIA)
      await expect(ddia).toHaveAttribute('href', `/book/${bookId(1)}`)
      await expect(ddia).toContainText(DDIA)
      await expect(ddia).toContainText('Martin Kleppmann')
      await expect(ddia).toContainText('14 Mar 2026 · 611 pages')
      await expect(ddia.getByRole('img', { name: '4 stars', exact: true })).toHaveCount(1)
      // The cover thumbnail is decorative.
      await expect(ddia.locator('img[alt=""]')).toHaveCount(1)

      const xp = finishedLink(page, 'Extreme Notes')
      await expect(xp).toContainText('Kent Beck and 2 others')
      await expect(xp).toContainText('12 Oct 2026 · 1 page')
      await expect(xp.getByRole('img', { name: '1 star', exact: true })).toHaveCount(1)
      // Beloved's two same-day finishes link to the same Book.
      await expect(finishedLink(page, 'Beloved')).toHaveCount(2)
      await expect(finishedLink(page, 'Beloved').first()).toHaveAttribute('href', `/book/${bookId(4)}`)

      // The page neither sorts nor counts: reversed finishes render reversed, and a
      // books figure that disagrees doesn't add or drop rows.
      await page.route('**/api/views/stats**', async (route) => {
        const response = await route.fetch()
        const body = await response.json()
        await route.fulfill({ response, json: { ...body, books: 4, finishes: [...body.finishes].reverse() } })
      })
      await page.reload()
      await expect(figure(page, '4')).toBeVisible()
      await expect(finishedLinks(page)).toHaveCount(9)
      expect(await labelsOf(finishedLinks(page))).toEqual([...THIS_YEAR_ROWS].reverse())
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-6 the heading names each preset and each Custom form', async ({ page }) => {
    // Red phase: Stats has no finished list heading yet.
    const server = await serverAtFakeToday(page, 'stats-finished-headings', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()
      await preset(page, 'This month').click()

      // The criterion: This month's heading, once its view shows.
      await expect(finishedHeading(page)).toHaveText('Finished this month')

      await preset(page, 'Last year').click()
      await expect(finishedHeading(page)).toHaveText('Finished last year')
      await preset(page, 'All time').click()
      await expect(finishedHeading(page)).toHaveText('Finished, all time')
      await expect(finishedLinks(page)).toHaveCount(10)

      // Each step fills the fields in an order that never leaves them reversed, since
      // leaving a field swaps a reversed pair (Story 6.3).
      await preset(page, 'Custom').click()
      const custom: [('From' | 'To')[], string[], string][] = [
        [['From', 'To'], ['2026-02-01', '2026-04-15'], 'Finished 1 February – 15 April 2026'],
        [['From', 'To'], ['2025-12-01', '2026-01-15'], 'Finished 1 December 2025 – 15 January 2026'],
        [['To', 'From'], ['2026-03-17', '2026-03-03'], 'Finished 3 – 17 March 2026'],
        [['From', 'To'], ['2026-03-14', '2026-03-14'], 'Finished 14 March 2026'],
      ]
      for (const [fields, values, heading] of custom) {
        await dateField(page, fields[0]).fill(values[0])
        await dateField(page, fields[1]).fill(values[1])
        await expect(finishedHeading(page)).toHaveText(heading)
      }
      // A single day: DDIA alone.
      await expect(finishedLinks(page)).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-7 an unrated row, an author-less row and a coverless row keep the row layout', async ({
    page,
  }) => {
    // Red phase: Stats has no finished rows yet.
    // Emma is sent with no author (a stored Book always has one, so the view is
    // edited in flight), to show how the row reads without the author part.
    await page.route('**/api/views/stats**', async (route) => {
      const response = await route.fetch()
      const body = await response.json()
      const finishes = (body.finishes ?? []).map((finish: Record<string, unknown>) =>
        finish.title === 'Emma' ? { ...finish, firstAuthor: '', authorCount: 0 } : finish,
      )
      await route.fulfill({ response, json: { ...body, finishes } })
    })
    const server = await serverAtFakeToday(page, 'stats-finished-rows', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()

      // The criterion: Dune has no cover, so its row shows the read typeset cover in
      // its exact spine color, with a plate 5px in, 19px down, 18px tall and no text.
      await expect
        .poll(async () => {
          const dune = finishedLink(page, 'Dune')
          return (await dune.count()) === 1 ? thumbnailLook(dune) : null
        })
        .toMatchObject({
          width: 44,
          height: 64,
          background: rgbOf(DUNE_SPINE),
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: SPINE_EDGE,
          image: false,
          plate: { left: 5, right: 5, top: 19, height: 18, background: SPINE_LABEL_STRIP, text: '' },
        })

      // Piranesi's cover file isn't an image: the same typeset cover, in its color.
      await expect
        .poll(async () => (await thumbnailLook(finishedLink(page, 'Piranesi'))).background)
        .toBe(rgbOf(PIRANESI_SPINE))
      // DDIA's cover shows as an image in the same 44 × 64 box.
      const ddiaThumb = await thumbnailLook(finishedLink(page, DDIA))
      expect([ddiaThumb.width, ddiaThumb.height, ddiaThumb.image]).toEqual([44, 64, true])

      // Unrated: no stars and no "No rating", but the same row height as a rated row.
      const dune = finishedLink(page, 'Dune')
      await expect(dune.getByRole('img')).toHaveCount(0)
      await expect(dune).not.toContainText('No rating')
      const [duneBox, ddiaBox] = [await dune.boundingBox(), await finishedLink(page, DDIA).boundingBox()]
      expect(Math.abs((duneBox?.height ?? 0) - (ddiaBox?.height ?? -9))).toBeLessThanOrEqual(1)

      // No author: the name leaves the author part out, and the title is centered
      // against the thumbnail.
      const emma = finishedLink(page, 'Emma')
      await expect(emma).toHaveAttribute('aria-label', 'Emma, finished 5 May 2026, 0 pages')
      const title = emma.getByText('Emma', { exact: true })
      const [titleBox, emmaThumb] = [await title.boundingBox(), await thumbnailLook(emma)]
      const centre = (box: { y: number; height: number }) => box.y + box.height / 2
      expect(Math.abs(centre(titleBox!) - centre(emmaThumb))).toBeLessThanOrEqual(1)

      // The row's type: the title book-title-sm 600 ink, the author body-sm
      // ink-secondary, each one line with an ellipsis; the meta with tabular figures.
      const ddiaTitle = finishedLink(page, DDIA).getByText(DDIA, { exact: true })
      await expect(ddiaTitle).toHaveCSS('font-weight', '600')
      await expect(ddiaTitle).toHaveCSS('color', INK)
      await expect(ddiaTitle).toHaveCSS('text-overflow', 'ellipsis')
      await expect(ddiaTitle).toHaveCSS('white-space', 'nowrap')
      const author = finishedLink(page, DDIA).getByText('Martin Kleppmann', { exact: true })
      await expect(author).toHaveCSS('color', INK_SECONDARY)
      await expect(author).toHaveCSS('text-overflow', 'ellipsis')
      const meta = finishedLink(page, DDIA).getByText('14 Mar 2026 · 611 pages', { exact: true })
      await expect(meta).toHaveCSS('font-variant-numeric', 'tabular-nums')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-8 a range with no finishes shows no heading and no list, only the empty line', async ({
    page,
  }) => {
    // Red phase: Stats has no finished list yet, so there is none to take away.
    const server = await serverAtFakeToday(page, 'stats-finished-empty', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()

      // The criterion: This year shows its list, and an empty Custom range takes it away.
      await expect(finishedHeading(page)).toHaveText('Finished this year')

      await preset(page, 'Custom').click()
      await dateField(page, 'From').fill('2024-01-01')
      await dateField(page, 'To').fill('2024-12-31')
      await expect(page.getByRole('main').getByText('No books finished in this range.', { exact: true })).toBeVisible()
      await expect(finishedHeading(page)).toHaveCount(0)
      await expect(finishedList(page)).toHaveCount(0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip("[P1] AC-9 while the next range loads, the heading and list stay the shown view's", async ({ page }) => {
    // Red phase: Stats has no finished list yet.
    const server = await serverAtFakeToday(page, 'stats-finished-placeholder', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()

      // This month's view is held until the leaf lets it through.
      let release: () => void = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/views/stats**', async (route) => {
        const from = new URL(route.request().url()).searchParams.get('from')
        if (from === '2026-10-01') await held
        await route.continue()
      })
      const thisMonth = page.waitForRequest(
        (request) =>
          new URL(request.url()).pathname === STATS_API &&
          new URL(request.url()).searchParams.get('from') === '2026-10-01',
      )
      await preset(page, 'This month').click()
      await thisMonth

      // The criterion: with This month pressed and its view still loading, the heading
      // and the rows are This year's, the one view shown.
      await expect(preset(page, 'This month')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      await expect(finishedLinks(page)).toHaveCount(9)
      await expect(figure(page, '2,489')).toBeVisible()

      release()
      await expect(finishedHeading(page)).toHaveText('Finished this month')
      await expect(finishedLinks(page)).toHaveCount(1)
      expect(await labelsOf(finishedLinks(page))).toEqual([THIS_YEAR_ROWS[0]])
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-10 a preset or a committed Custom range replaces the address, never adding history', async ({
    page,
  }) => {
    // Red phase: the range isn't in the address yet.
    const server = await serverAtFakeToday(page, 'stats-finished-address', FINISHED, FINISHED_FILES)
    try {
      await page.goto(server.url)
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(figure(page, '2,489')).toBeVisible()
      const length = await historyLength(page)
      const keys = await page.evaluate(() => Object.keys(localStorage).sort())

      await preset(page, 'Last year').click()

      // The criterion: the address names the preset, in place of the entry.
      await expect
        .poll(async () => [address(page), await historyLength(page)])
        .toEqual(['/stats?range=lastYear', length])

      await preset(page, 'Custom').click()
      // Custom starts at Last year's range, already complete.
      await expect.poll(() => address(page)).toBe('/stats?range=custom&from=2025-01-01&to=2025-12-31')
      await dateField(page, 'To').fill('2026-04-15')
      await dateField(page, 'From').fill('2026-02-01')
      await expect.poll(() => address(page)).toBe(CUSTOM_FEB_APR)
      await expect(finishedLinks(page)).toHaveCount(2)
      expect(await historyLength(page)).toBe(length)

      // A half-typed Custom writes nothing and keeps the last committed range.
      await dateField(page, 'From').fill('')
      await afterAnnounceDelay(page)
      expect(address(page)).toBe(CUSTOM_FEB_APR)
      await expect(finishedHeading(page)).toHaveText('Finished 1 February – 15 April 2026')
      await expect(finishedLinks(page)).toHaveCount(2)

      // Reversed: written in order once the fields swap.
      await dateField(page, 'From').fill('2026-04-15')
      await dateField(page, 'To').fill('2026-02-01')
      await dateField(page, 'To').press('Tab')
      await expect.poll(() => address(page)).toBe(CUSTOM_FEB_APR)

      // Custom after All time starts empty: pressing it writes nothing.
      await preset(page, 'All time').click()
      await expect.poll(() => address(page)).toBe('/stats?range=allTime')
      await preset(page, 'Custom').click()
      await expect(dateField(page, 'From')).toHaveValue('')
      await afterAnnounceDelay(page)
      expect(address(page)).toBe('/stats?range=allTime')
      expect(await historyLength(page)).toBe(length)

      // A plain /stats isn't rewritten, and nothing is stored.
      await page.goto(`${server.url}/stats`)
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      expect(address(page)).toBe('/stats')
      expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keys)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip("[P1] AC-11 a range change keeps focus on the control I used and doesn't scroll, and the next route change still focuses its h1", async ({
    page,
  }) => {
    // Red phase: the range isn't in the address yet, so there is no replace to make.
    await page.setViewportSize({ width: 1280, height: 500 })
    const server = await serverAtFakeToday(page, 'stats-finished-focus', FINISHED, FINISHED_FILES)
    try {
      // A direct load: the h1 isn't focused, and the first change follows it at once.
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()
      const y = await scrollToY(page, 40)
      const h1 = page.getByRole('main').getByRole('heading', { level: 1 })
      await preset(page, 'Last year').focus()
      await page.keyboard.press('Enter')

      // The criterion: the address is replaced, and focus and scroll stay where they were.
      await expect
        .poll(async () => ({
          address: address(page),
          onLastYear: await isFocused(preset(page, 'Last year')),
          onH1: await isFocused(h1),
          y: await page.evaluate(() => window.scrollY),
        }))
        .toEqual({ address: '/stats?range=lastYear', onLastYear: true, onH1: false, y })

      // Custom's fields: typing a committed range keeps focus in the field.
      await preset(page, 'Custom').focus()
      await page.keyboard.press('Enter')
      await dateField(page, 'To').fill('2026-04-15')
      await dateField(page, 'From').fill('2026-02-01')
      await expect.poll(() => address(page)).toBe(CUSTOM_FEB_APR)
      await expect(dateField(page, 'From')).toBeFocused()
      await expect(h1).not.toBeFocused()

      // The first route change after the replaces still focuses that page's h1.
      await finishedLink(page, DDIA).click()
      await expect(page).toHaveURL(`${server.url}/book/${bookId(1)}`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P0] AC-12 Back from a Book returns to the same Custom range and list, at the top with the h1 focused', async ({
    page,
  }) => {
    // Red phase: the range isn't in the address yet, and there are no rows to open.
    await page.setViewportSize({ width: 1280, height: 500 })
    const server = await serverAtFakeToday(page, 'stats-finished-back', FINISHED, FINISHED_FILES)
    try {
      await page.goto(server.url)
      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()
      await expect(figure(page, '2,489')).toBeVisible()
      await preset(page, 'Custom').click()
      await dateField(page, 'From').fill('2026-02-01')
      await dateField(page, 'To').fill('2026-04-15')
      await expect(figure(page, '897')).toBeVisible()
      await scrollToY(page, 'bottom')

      // The criterion's journey: DDIA's row opens its Book (the press waits for the
      // row inside the poll, so a missing row fails here).
      await expect
        .poll(pressOnceThen(finishedLink(page, DDIA), async () => new URL(page.url()).pathname))
        .toBe(`/book/${bookId(1)}`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(DDIA)
      await page.goBack()

      // The criterion: Back returns to the same range and the same rows.
      await expect
        .poll(async () => [address(page), await labelsOf(finishedLinks(page))])
        .toEqual([CUSTOM_FEB_APR, FEB_APR_ROWS])

      await expect(preset(page, 'Custom')).toHaveAttribute('aria-pressed', 'true')
      await expect(dateField(page, 'From')).toHaveValue('2026-02-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-04-15')
      await expect(finishedHeading(page)).toHaveText('Finished 1 February – 15 April 2026')
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // Back once more leaves Stats for Home in one step.
      await page.goBack()
      await expect(page).toHaveURL(`${server.url}/`)
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-13 the Stats nav link on a ranged address opens a plain /stats without adding history', async ({
    page,
  }) => {
    // Red phase: the nav link pushes a new entry, and the address isn't read.
    const server = await serverAtFakeToday(page, 'stats-finished-nav', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats?range=lastYear`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Stats')
      await expect(figure(page, '204').or(figure(page, '2,489'))).toBeVisible()
      const length = await historyLength(page)

      await nav(page).getByRole('link', { name: 'Stats', exact: true }).click()

      // The criterion: a plain /stats on This year, in place of the entry.
      await expect.poll(async () => [address(page), await historyLength(page)]).toEqual(['/stats', length])

      await expect(preset(page, 'This year')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedHeading(page)).toHaveText('Finished this year')
      // A route change: the h1 takes focus.
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-14 a hand-typed address falls back quietly and is replaced with what the page shows', async ({
    page,
  }) => {
    // Red phase: the address isn't read or replaced yet.
    const server = await serverAtFakeToday(page, 'stats-finished-bad-address', FINISHED, FINISHED_FILES)
    try {
      // A reversed Custom opens in order.
      await page.goto(`${server.url}/stats?range=custom&from=2026-04-15&to=2026-02-01`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Stats')

      // The criterion: the address is replaced in order, with that range shown.
      await expect.poll(() => address(page)).toBe(CUSTOM_FEB_APR)

      await expect(preset(page, 'Custom')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedHeading(page)).toHaveText('Finished 1 February – 15 April 2026')
      await expect(dateField(page, 'From')).toHaveValue('2026-02-01')
      await expect(dateField(page, 'To')).toHaveValue('2026-04-15')

      // An unknown range, a half Custom, a date the server would refuse and a day that
      // isn't one all open This year, with no message and no announcement.
      for (const search of [
        '?range=nextWeek',
        '?range=custom&from=2026-02-01',
        '?range=custom&from=0000-01-01&to=2026-04-15',
        '?range=custom&from=2026-02-30&to=2026-04-15',
      ]) {
        await page.goto(`${server.url}/stats${search}`)
        await expect(preset(page, 'This year')).toHaveAttribute('aria-pressed', 'true')
        await expect(finishedHeading(page)).toHaveText('Finished this year')
        // What the page shows: This year, written by name (see the checklist's spec questions).
        await expect.poll(() => address(page), { message: search }).toBe('/stats?range=thisYear')
        await afterAnnounceDelay(page)
        await expect(page.getByRole('status')).toHaveText('')
        await expect(page.getByRole('alert')).toHaveText('')
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P1] AC-15 only my own range change is announced; arriving with a range in the link announces nothing', async ({
    page,
  }) => {
    // Red phase: the address isn't read yet.
    const server = await serverAtFakeToday(page, 'stats-finished-announce', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats?range=lastYear`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Stats')

      // The criterion: the link's range is shown (Solaris alone), and arriving says nothing.
      await expect(preset(page, 'Last year')).toHaveAttribute('aria-pressed', 'true')
      await expect(figure(page, '204')).toBeVisible()
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')

      // My own press speaks the range line.
      await preset(page, 'This month').click()
      await expect(page.getByRole('status')).toHaveText('1 book, 1 page.')

      // A reload of the replaced address says nothing.
      await page.reload()
      await expect(preset(page, 'This month')).toHaveAttribute('aria-pressed', 'true')
      await expect(finishedLinks(page)).toHaveCount(1)
      await afterAnnounceDelay(page)
      await expect(page.getByRole('status')).toHaveText('')
    } finally {
      await stopAndRemove(server)
    }
  })

  test.skip('[P2] AC-16 Story 17.1 leaves period alone, and axe finds nothing with the list shown, in both themes', async ({
    page,
  }) => {
    // Red phase: Stats has no finished list yet.
    const server = await serverAtFakeToday(page, 'stats-finished-axe', FINISHED, FINISHED_FILES)
    try {
      await page.goto(`${server.url}/stats`)
      await expect(figure(page, '2,489')).toBeVisible()

      // The criterion: the list is shown for axe to check.
      await expect(finishedLinks(page)).toHaveCount(9)

      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await expect(finishedHeading(page)).toHaveText('Finished this year')
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `list ${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      }

      // No period is read or written: a press writes the range alone, and the list isn't narrowed.
      await page.goto(`${server.url}/stats?range=thisYear&period=2026-03`)
      await expect(finishedLinks(page)).toHaveCount(9)
      await preset(page, 'Last year').click()
      await expect.poll(() => address(page)).toBe('/stats?range=lastYear')
      await expect(finishedLinks(page)).toHaveCount(1)
    } finally {
      await stopAndRemove(server)
    }
  })
})
