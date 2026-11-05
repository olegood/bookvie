// Story 3.1 See my Main book on Home (ATDD). Home becomes the launch page at
// `/` and Catalog moves to `/catalog`. This spec reads what the browser shows:
// the nav, the date header, the empty states, the Main book card and its
// gauge, Book detail's Current reading block and the spine names. The one
// server-side promise, the floored percentage (AC-6, AD-6), is proven at API
// level in backend/tests/test_home_view.py.
//
// Dates: AC-2 and AC-3 start `bookvie --fake-today 2026-10-28` and set the
// browser clock to the same day in Europe/Madrid (TC-2, AD-20).

import AxeBuilder from '@axe-core/playwright'
import { rmSync } from 'node:fs'
import type { Locator, Page } from '@playwright/test'
import { expect, type Server, startSeededServer, test } from './fixtures.ts'
import { COVER_PNG } from './intents.ts'
import { newBookPanel, rgbOf } from './library.ts'
import { spine } from './bookcase.ts'

const FAKE_TODAY = '2026-10-28' // a Wednesday
const FAKE_NOW = new Date('2026-10-28T10:00:00+01:00') // CET: DST ended on 25 October
const DATE_HEADER = 'Wednesday, 28 October'
// Any "Weekday, D Month" line, for the tests that run on the real clock.
const DATE_HEADER_PATTERN = /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, \d{1,2} [A-Z][a-z]+$/
const EMPTY_SHELF = 'Your shelf is empty. Add your first book.'
const HOME_VIEW = '**/api/views/home'
const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"
// --color-ink-tertiary in the light theme (tokens.css): muted, never a warning.
const INK_TERTIARY = rgbOf('#666961')
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const LEFT_HAND_ID = '3b8f2c1a-5d4e-4f6a-9b7c-1e2d3c4b5a69'
const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'
const LEFT_HAND_COVER = 'covers/left-hand.png'
const LEFT_HAND = {
  id: LEFT_HAND_ID,
  title: 'The Left Hand of Darkness',
  authors: ['Ursula K. Le Guin'],
  pages: 330,
}
const DUNE = { id: DUNE_ID, title: 'Dune', authors: ['Frank Herbert'], pages: 412 }

/** A library whose Main book is The Left Hand of Darkness at `page`, plus `others`. */
function mainAt(page: number, { others = [] as object[], book = {}, reading = {} } = {}) {
  return {
    mainBookId: LEFT_HAND_ID,
    books: [{ ...LEFT_HAND, ...book, readings: [{ currentPage: page, ...reading }] }, ...others],
  }
}

function nav(page: Page): Locator {
  return page.getByRole('banner').getByRole('navigation')
}

/** The Main book card, with or without a Main book. */
function mainBookCard(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Main book', exact: true })
}

/** Starts a seeded server with `--fake-today` and fixes the browser clock to the same day. */
async function serverAtFakeToday(
  page: Page,
  name: string,
  partial: Record<string, unknown>,
  files: Record<string, string | Buffer> = {},
): Promise<Server> {
  await page.clock.setFixedTime(FAKE_NOW)
  return startSeededServer(test.info(), name, partial, files, { fakeToday: FAKE_TODAY })
}

/** The gauge's fill spans `fraction` of its track (the server's percent), within 1px. */
async function expectFill(gauge: Locator, fraction: number): Promise<void> {
  const track = (await gauge.boundingBox())!
  const fill = (await gauge.locator('span').boundingBox())!
  expect(Math.abs(fill.width - track.width * fraction)).toBeLessThanOrEqual(1)
}

async function stopAndRemove(server: Server): Promise<void> {
  expect(await server.stop()).toBe('')
  rmSync(server.dataDir, { recursive: true, force: true })
}

test.describe('Story 3.1 See my Main book on Home (ATDD)', () => {
  test('[P0] AC-1 Home is the first nav item and / opens Home, the launch page', async ({ page, seededServer }) => {
    const server = await seededServer({ books: [DUNE] })
    await page.goto(`${server.url}/`)

    await expect(nav(page).getByRole('link')).toHaveText(['Home', 'Catalog', 'Backup'])

    const home = nav(page).getByRole('link', { name: 'Home', exact: true })
    const catalog = nav(page).getByRole('link', { name: 'Catalog', exact: true })
    await expect(home).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1, name: 'Home', exact: true })).toBeAttached()
    await expect(page).toHaveTitle('Home — bookvie')

    await catalog.click()
    await expect(page).toHaveURL(`${server.url}/catalog`)
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeFocused()
    await expect(catalog).toHaveAttribute('aria-current', 'page')
    await expect(home).not.toHaveAttribute('aria-current')

    await home.click()
    await expect(page).toHaveURL(`${server.url}/`)
    await expect(page.getByRole('heading', { level: 1, name: 'Home', exact: true })).toBeFocused()
  })

  test('[P0] AC-2 an empty library opens Home to the date header and the empty shelf, whose New book opens the panel in Catalog', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await serverAtFakeToday(page, 'home-empty', { books: [] })
    try {
      await page.goto(`${server.url}/`)
      const main = page.getByRole('main')

      await expect(main.getByText(DATE_HEADER, { exact: true })).toBeVisible()

      await expect(main).not.toContainText(/good (morning|afternoon|evening)|hello|welcome/i)
      await expect(main.getByText(EMPTY_SHELF, { exact: true })).toBeVisible()
      await expect(mainBookCard(page)).toHaveCount(0)
      await expect(main.getByRole('progressbar')).toHaveCount(0)

      await main.getByRole('button', { name: 'New book', exact: true }).click()
      await expect(page).toHaveURL(`${server.url}/catalog`)
      await expect(newBookPanel(page)).toBeVisible()
      await expect(newBookPanel(page).getByLabel('Title', { exact: true })).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-3 with no Main book, Last export (or No export yet) sits muted at the right end of the header line', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const books = { books: [LEFT_HAND, DUNE] }
    // 16 October in CEST is 12 local days before the fake today.
    const exported = await serverAtFakeToday(page, 'home-exported', books, {
      'local-state.json': JSON.stringify({ lastExportAt: '2026-10-16T09:30:00+02:00' }),
    })
    const never = await serverAtFakeToday(page, 'home-never-exported', books)
    try {
      for (const [server, copy] of [
        [exported, 'Last export: 12 days ago'],
        [never, 'No export yet'],
      ] as const) {
        await page.goto(`${server.url}/`)
        const main = page.getByRole('main')
        const line = main.getByText(copy, { exact: true })

        await expect(line).toBeVisible()

        await expect(line).toHaveCSS('color', INK_TERTIARY)
        await expect(page.getByRole('alert')).toHaveText('')
        const date = (await main.getByText(DATE_HEADER, { exact: true }).boundingBox())!
        const fact = (await line.boundingBox())!
        // The same line: vertical centers within a few px; the fact ends right of the date.
        expect(Math.abs(fact.y + fact.height / 2 - (date.y + date.height / 2))).toBeLessThan(8)
        expect(fact.x).toBeGreaterThan(date.x + date.width)
      }
    } finally {
      await stopAndRemove(exported)
      await stopAndRemove(never)
    }
  })

  test('[P1] AC-4 axe finds no WCAG 2.2 AA violations on Home, empty and with a Main book, in both themes', async ({
    page,
    seededServer,
  }) => {
    const empty = await seededServer({ books: [] })
    const reading = await seededServer(mainAt(212))
    for (const server of [empty, reading]) {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await page.goto(`${server.url}/`)

        await expect(page.getByRole('heading', { level: 1, name: 'Home', exact: true })).toBeAttached()

        await expect(page.getByRole('main')).not.toBeEmpty()
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `${server.url} ${colorScheme}: ${id} (${nodes.length})`)).toEqual([])
      }
    }
  })

  test('[P0] AC-5 the Main book card shows the cover, MAIN BOOK, the serif title linking to Book detail, the author and the edition', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    const server = await startSeededServer(
      test.info(),
      'home-main-card',
      mainAt(212, { book: { coverFile: LEFT_HAND_COVER, edition: 2 } }),
      { [LEFT_HAND_COVER]: COVER_PNG },
    )
    try {
      await page.goto(`${server.url}/`)
      const card = mainBookCard(page)
      const title = card.getByRole('link', { name: 'The Left Hand of Darkness', exact: true })

      await expect(title).toHaveAttribute('href', `/book/${LEFT_HAND_ID}`)

      // The date header first, the card below it (UX-DR32).
      const date = (await page.getByRole('main').getByText(DATE_HEADER_PATTERN).boundingBox())!
      const box = (await card.boundingBox())!
      expect(box.y).toBeGreaterThan(date.y + date.height - 1)

      const cover = card.getByRole('img', { name: 'Cover of The Left Hand of Darkness', exact: true })
      await expect(cover).toBeVisible()
      expect(await cover.boundingBox()).toMatchObject({ width: 200, height: 300 })
      await expect(card.getByText('Main book', { exact: true })).toHaveCSS('text-transform', 'uppercase')
      await expect(title).toHaveCSS('font-family', /^ui-serif/)
      await expect(title).toHaveCSS('-webkit-line-clamp', '3')
      await expect(card.getByText('Ursula K. Le Guin', { exact: true })).toBeVisible()
      await expect(card.getByText('Edition 2', { exact: true })).toBeVisible()

      await title.click()
      await expect(page).toHaveURL(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(page.getByRole('heading', { level: 1, name: 'The Left Hand of Darkness' })).toBeFocused()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-7 a Main book at page 0 shows a 0% gauge, p.0 of 330 and the ticks 0 · 165 · 330', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(0))
    await page.goto(`${server.url}/`)
    const card = mainBookCard(page)
    const gauge = card.getByRole('progressbar')

    await expect(gauge).toHaveAttribute('aria-valuetext', '0%, page 0 of 330')

    await expect(gauge).toHaveAttribute('aria-valuemin', '0')
    await expect(gauge).toHaveAttribute('aria-valuenow', '0')
    await expect(gauge).toHaveAttribute('aria-valuemax', '330')
    await expect(card.getByText('0%', { exact: true })).toBeVisible()
    await expect(card.getByText('p.0 of 330', { exact: true })).toBeVisible()
    for (const tick of ['0', '165', '330']) {
      await expect(card.getByText(tick, { exact: true })).toBeVisible()
    }
    // Edition 1 is not shown (FR-21, UX-DR33).
    await expect(card).not.toContainText(/edition/i)
  })

  test('[P1] AC-8 with Books but no Main book, the card frame says No Main book. and links to the Catalog', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [LEFT_HAND, DUNE] })
    await page.goto(`${server.url}/`)
    const card = mainBookCard(page)

    await expect(card.getByText('No Main book.', { exact: true })).toBeVisible()

    await expect(card.getByRole('progressbar')).toHaveCount(0)
    await expect(page.getByText(EMPTY_SHELF, { exact: true })).toHaveCount(0)
    const choose = card.getByRole('link', { name: 'Choose a book in the Catalog', exact: true })
    await expect(choose).toHaveAttribute('href', '/catalog')
    await choose.click()
    await expect(page).toHaveURL(`${server.url}/catalog`)
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeFocused()
  })

  test('[P1] AC-9 Book detail shows the Current reading block, and the spines name Main book, 64% and waiting for you, page 120', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(
      mainAt(212, {
        reading: { purpose: 'To see how Le Guin builds a world' },
        others: [
          {
            ...DUNE,
            readings: [{ currentPage: 120, pausedAt: '2026-10-20', purpose: 'Reread for the ecology of Arrakis' }],
          },
        ],
      }),
    )
    const currentReading = page.getByRole('main').getByRole('region', { name: 'Current reading', exact: true })

    await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)

    await expect(currentReading).toContainText('Main book')

    await expect(currentReading.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '64%, page 212 of 330')
    await expect(currentReading).toContainText('To see how Le Guin builds a world')

    await page.goto(`${server.url}/book/${DUNE_ID}`)
    await expect(currentReading).toContainText('Waiting for you, page 120')
    // 120 of 412 is 29.1…%: the server's floor.
    await expect(currentReading.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '29%, page 120 of 412')
    await expect(currentReading).toContainText('Reread for the ecology of Arrakis')

    await page.goto(`${server.url}/catalog`)
    await expect(spine(page, 'The Left Hand of Darkness by Ursula K. Le Guin, Main book, 64%')).toBeVisible()
    await expect(spine(page, 'Dune by Frank Herbert, waiting for you, page 120')).toBeVisible()
  })
})

// Green-phase follow-ups (ATDD checklist): the gauge at other pages, the half
// tick, the no-cover placeholder on the card, and Last export's place.
test.describe('Story 3.1 See my Main book on Home (automate)', () => {
  test('[P1] AC-6 the gauge at 212 of 330 reads the server 64%, p.212 of 330 and the ticks 0 · 165 · 330', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    const card = mainBookCard(page)
    const gauge = card.getByRole('progressbar')

    await expect(gauge).toHaveAttribute('aria-valuetext', '64%, page 212 of 330')
    await expect(gauge).toHaveAttribute('aria-valuenow', '212')
    await expect(card.getByText('64%', { exact: true })).toBeVisible()
    await expect(card.getByText('p.212 of 330', { exact: true })).toBeVisible()
    for (const tick of ['0', '165', '330']) {
      await expect(card.getByText(tick, { exact: true })).toBeVisible()
    }
    // Edition 1 (the default) shows no edition text; AC-5 pins "Edition 2".
    await expect(card).not.toContainText('Edition')
    await expectFill(gauge, 0.64)
  })

  test('[P1] AC-6 329 of 330 reads 99% and 330 of 330 reads 100%: no client rounding', async ({
    page,
    seededServer,
  }) => {
    for (const [page_, copy, fill] of [
      [329, '99%, page 329 of 330', 0.99],
      [330, '100%, page 330 of 330', 1],
    ] as const) {
      const server = await seededServer(mainAt(page_))
      await page.goto(`${server.url}/`)
      const gauge = mainBookCard(page).getByRole('progressbar')
      await expect(gauge).toHaveAttribute('aria-valuetext', copy)
      await expectFill(gauge, fill)
    }
  })

  test('[P2] AC-6 the half tick is dropped under 4 pages and rounded otherwise', async ({ page, seededServer }) => {
    for (const [pages, ticks] of [
      [3, ['0', '3']],
      [4, ['0', '2', '4']],
      [331, ['0', '166', '331']],
    ] as const) {
      const server = await seededServer(mainAt(1, { book: { pages } }))
      await page.goto(`${server.url}/`)
      const gauge = mainBookCard(page).getByRole('progressbar')
      await expect(gauge).toHaveAttribute('aria-valuemax', String(pages))
      await expect(gauge.locator('xpath=following-sibling::*[1]').locator('span')).toHaveText([...ticks])
    }
  })

  test('[P2] AC-5 a Main book without a cover shows the no-cover placeholder, not focusable', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    const placeholder = mainBookCard(page).getByRole('img', { name: 'No cover', exact: true })

    await expect(placeholder).toBeVisible()
    expect(await placeholder.boundingBox()).toMatchObject({ width: 200, height: 300 })
    await expect(placeholder).not.toHaveAttribute('tabindex')
  })

  test('[P2] AC-3 with a Main book, Last export is not on the header line', async ({ page, seededServer }) => {
    const server = await seededServer(mainAt(212))
    await page.goto(`${server.url}/`)
    const date = page.getByRole('main').getByText(DATE_HEADER_PATTERN)
    await expect(date).toBeVisible()
    // The header line only: Story 3.4's re-entry line carries Last export elsewhere in main.
    await expect(date.locator('..')).not.toContainText(/Last export|No export yet/)
  })

  test('[P1] a failed first load of Home shows Couldn\'t load with Try again, which refetches', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(212))
    let down = true
    await page.route(HOME_VIEW, (route) => (down ? route.abort('connectionrefused') : route.continue()))

    await page.goto(`${server.url}/`)
    await expect(page.getByRole('alert')).toHaveText(COULDNT_LOAD)
    await expect(page.getByRole('main').getByText(COULDNT_LOAD)).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1, name: 'Home', exact: true })).toBeAttached()

    down = false
    // Keyboard path: the button unmounts while loading, so focus is parked on main.
    await page.getByRole('button', { name: 'Try again' }).focus()
    await page.keyboard.press('Enter')
    await expect(mainBookCard(page).getByRole('progressbar')).toBeVisible()
    await expect(page.getByText(COULDNT_LOAD)).toHaveCount(0)
    await expect(page.getByRole('main')).toBeFocused()
  })

  test('[P1] AC-2 the New book hand-off from Home opens the panel once: not after a reload, Back or Forward', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    await page.goto(`${server.url}/`)
    await page.getByRole('main').getByRole('button', { name: 'New book', exact: true }).click()
    await expect(page).toHaveURL(`${server.url}/catalog`)
    await expect(newBookPanel(page)).toBeVisible()

    await newBookPanel(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(newBookPanel(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeAttached()
    await expect(newBookPanel(page)).toHaveCount(0)

    await page.goBack()
    await expect(page).toHaveURL(`${server.url}/`)
    await page.goForward()
    await expect(page).toHaveURL(`${server.url}/catalog`)
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeAttached()
    await expect(newBookPanel(page)).toHaveCount(0)
  })

  test('[P1] the date header moves to the next day when the tab regains focus or visibility after midnight', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [] })
    await page.clock.setFixedTime(new Date('2026-10-28T23:59:00+01:00'))
    await page.goto(`${server.url}/`)
    const main = page.getByRole('main')
    await expect(main.getByText(DATE_HEADER, { exact: true })).toBeVisible()

    await page.clock.setFixedTime(new Date('2026-10-29T00:01:00+01:00'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(main.getByText('Thursday, 29 October', { exact: true })).toBeVisible()

    await page.clock.setFixedTime(new Date('2026-10-30T00:01:00+01:00'))
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(main.getByText('Friday, 30 October', { exact: true })).toBeVisible()
  })
})
