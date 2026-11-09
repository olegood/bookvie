// Story 4.6 See each book's state on the shelf and its page. One test per row
// of EXPERIENCE.md's Book states table (the Side-read rows are Story 4.7's):
// the spine's exact name and its marker (or none) on Catalog, the spine
// popover's primary action (the control focus starts on), the Home pane the
// Book shows in, and Book detail's action stack in order. Plus the legend and
// the marker colors. What the views send for each row is proven at API level
// in backend/tests/test_book_states.py.
//
// The Book under test is The Left Hand of Darkness, 330 pages: p.212 is 64%,
// p.120 is 36%, p.40 is 12%. Every row but the Main ones has Dune as the Main
// book at p.100, so Home shows its Up next pane.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { spine, spines } from './bookcase.ts'
import { DUNE, DUNE_ID, LEFT_HAND, LEFT_HAND_ID, mainBookCard, upNextPane, waitingPane } from './home.ts'

const AUTHOR = 'The Left Hand of Darkness by Ursula K. Le Guin'
const FINISHED = { startDate: null, finishDate: '2026-03-20', finishedPages: 330, currentPage: 330 }
const DUNE_MAIN = { ...DUNE, readings: [{ startDate: '2026-10-01', currentPage: 100 }] }

type Marker = 'main' | 'upNext' | 'waiting' | null
type Pane = 'Main card' | 'Up next' | 'Waiting' | null

interface Row {
  name: string
  finished: boolean
  /** The unfinished Reading's page, or `null` for none. */
  page: number | null
  pointer: 'main' | 'upNext' | null
  status: string
  marker: Marker
  /** The control the popover's focus starts on: its primary, else "Open book →" for none. */
  primary: 'Set as Up next' | 'Start reading' | 'Resume' | null
  pane: Pane
  stack: string[]
}

const ROWS: Row[] = [
  {
    name: 'Never read, no Reading',
    finished: false,
    page: null,
    pointer: null,
    status: 'not read yet',
    marker: null,
    primary: 'Set as Up next',
    pane: null,
    stack: ['Start reading', 'Set as Up next', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Never read, Up next',
    finished: false,
    page: null,
    pointer: 'upNext',
    status: 'not read yet, Up next',
    marker: 'upNext',
    primary: 'Start reading',
    pane: 'Up next',
    stack: ['Start reading', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Never read, Main',
    finished: false,
    page: 212,
    pointer: 'main',
    status: 'Main book, 64%',
    marker: 'main',
    primary: null,
    pane: 'Main card',
    stack: ['Pause', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Never read, paused',
    finished: false,
    page: 120,
    pointer: null,
    status: 'waiting for you, page 120',
    marker: 'waiting',
    primary: 'Resume',
    pane: 'Waiting',
    stack: ['Resume', 'Set as Up next', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Never read, paused, Up next',
    finished: false,
    page: 120,
    pointer: 'upNext',
    status: 'Up next, paused at page 120',
    marker: 'upNext',
    primary: 'Resume',
    pane: 'Up next',
    stack: ['Resume', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Finished, no Reading',
    finished: true,
    page: null,
    pointer: null,
    status: 'finished',
    marker: null,
    primary: null,
    pane: null,
    stack: ['Start reading', 'Set as Up next', 'Edit', 'Delete'],
  },
  {
    name: 'Finished, Up next',
    finished: true,
    page: null,
    pointer: 'upNext',
    status: 'finished, Up next',
    marker: 'upNext',
    primary: 'Start reading',
    pane: 'Up next',
    stack: ['Start reading', 'Edit', 'Delete'],
  },
  {
    name: 'Finished, re-reading Main',
    finished: true,
    page: 40,
    pointer: 'main',
    status: 'finished, re-reading, 12%',
    marker: 'main',
    primary: null,
    pane: 'Main card',
    stack: ['Pause', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Finished, re-read paused',
    finished: true,
    page: 40,
    pointer: null,
    status: 'finished, waiting for you, page 40',
    marker: 'waiting',
    primary: 'Resume',
    pane: 'Waiting',
    stack: ['Resume', 'Set as Up next', 'Mark finished', 'Edit', 'Delete'],
  },
  {
    name: 'Finished, re-read paused, Up next',
    finished: true,
    page: 40,
    pointer: 'upNext',
    status: 'finished, Up next, paused at page 40',
    marker: 'upNext',
    primary: 'Resume',
    pane: 'Up next',
    stack: ['Resume', 'Mark finished', 'Edit', 'Delete'],
  },
]

/** The row's library: The Left Hand of Darkness in its state, plus Dune as Main unless it is. */
function libraryOf(row: Row) {
  const readings: object[] = row.finished ? [FINISHED] : []
  if (row.page !== null) {
    const paused = row.pointer === 'main' ? {} : { pausedAt: '2026-10-05' }
    readings.push({ startDate: '2026-09-20', currentPage: row.page, ...paused })
  }
  const book = { ...LEFT_HAND, readings }
  if (row.pointer === 'main') return { mainBookId: LEFT_HAND_ID, books: [book, DUNE] }
  return {
    mainBookId: DUNE_ID,
    upNextBookId: row.pointer === 'upNext' ? LEFT_HAND_ID : null,
    books: [book, DUNE_MAIN],
  }
}

/** Book detail's action stack: the buttons beside Delete, in order. */
function actionStack(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('button', { name: 'Delete', exact: true })
    .locator('xpath=..')
    .getByRole('button')
}

/** The Home panes that list The Left Hand of Darkness by its title link. */
async function panesOf(page: Page): Promise<Pane[]> {
  const panes: [Pane, Locator][] = [
    ['Main card', mainBookCard(page)],
    ['Up next', upNextPane(page)],
    ['Waiting', waitingPane(page)],
  ]
  const found: Pane[] = []
  for (const [pane, region] of panes) {
    if ((await region.getByRole('link', { name: LEFT_HAND.title, exact: true }).count()) > 0) found.push(pane)
  }
  return found
}

test.describe('Story 4.6 See each book’s state on the shelf and its page', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  for (const row of ROWS) {
    test(`[P0] Book states: ${row.name} reads "${row.status}" on its spine, with its marker, popover primary, Home pane and Book detail stack`, async ({
      page,
      seededServer,
    }) => {
      const server = await seededServer(libraryOf(row))

      // Catalog: the spine's exact name and its marker, or none.
      await page.goto(`${server.url}/catalog`)
      const target = spine(page, `${AUTHOR}, ${row.status}`)
      await expect(target).toBeVisible()
      const marker = target.locator('[data-marker]')
      if (row.marker === null) {
        await expect(marker).toHaveCount(0)
      } else {
        await expect(marker).toHaveCount(1)
        await expect(marker).toHaveAttribute('data-marker', row.marker)
        await expect(marker).toHaveAttribute('aria-hidden', 'true')
      }

      // The popover: focus starts on its primary action, else on "Open book →".
      await target.click()
      const card = page.getByRole('dialog', { name: LEFT_HAND.title, exact: true })
      if (row.primary === null) {
        await expect(card.getByRole('link', { name: 'Open book →', exact: true })).toBeFocused()
        for (const action of ['Set as Up next', 'Start reading', 'Resume']) {
          await expect(card.getByRole('button', { name: action, exact: true })).toHaveCount(0)
        }
      } else {
        await expect(card.getByRole('button', { name: row.primary, exact: true })).toBeFocused()
      }

      // Home: the one pane it shows in, if any.
      await page.goto(`${server.url}/`)
      await expect(mainBookCard(page)).toBeVisible()
      expect(await panesOf(page)).toEqual(row.pane === null ? [] : [row.pane])

      // Book detail: the action stack, in order.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(page.getByRole('heading', { level: 1, name: LEFT_HAND.title, exact: true })).toBeVisible()
      await expect(actionStack(page)).toHaveText(row.stack)
    })
  }

  test('[P1] AC-1 Main, Up next and waiting spines each carry one dot of their color; the others none; the legend names all five', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      mainBookId: DUNE_ID,
      upNextBookId: LEFT_HAND_ID,
      books: [
        DUNE_MAIN,
        LEFT_HAND,
        {
          title: 'Neuromancer',
          authors: ['William Gibson'],
          pages: 271,
          readings: [{ startDate: '2026-09-01', currentPage: 50, pausedAt: '2026-10-01' }],
        },
        { title: 'Emma', authors: ['Jane Austen'], pages: 400, readings: [FINISHED] },
        { title: 'Kindred', authors: ['Octavia E. Butler'], pages: 264 },
      ],
    })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(5)

    // DESIGN.md: Main is spine-unread-text, Up next sky, Waiting for you sand (light theme).
    const dots: [string, Marker, string][] = [
      ['Dune by Frank Herbert, Main book, 24%', 'main', 'rgb(119, 113, 106)'],
      [`${AUTHOR}, not read yet, Up next`, 'upNext', 'rgb(90, 125, 152)'],
      ['Neuromancer by William Gibson, waiting for you, page 50', 'waiting', 'rgb(140, 123, 92)'],
    ]
    for (const [name, kind, color] of dots) {
      const marker = spine(page, name).locator('[data-marker]')
      await expect(marker).toHaveCount(1)
      await expect(marker).toHaveAttribute('data-marker', kind!)
      await expect(marker).toHaveCSS('background-color', color)
      await expect(marker).toHaveCSS('width', '7px')
    }
    for (const name of ['Emma by Jane Austen, finished', 'Kindred by Octavia E. Butler, not read yet']) {
      await expect(spine(page, name).locator('[data-marker]')).toHaveCount(0)
    }
    await expect(page.locator('[data-marker]')).toHaveCount(3)

    const legend = page.getByRole('main').getByText('Main book, filled to its %', { exact: true }).locator('xpath=..')
    await expect(legend.locator(':scope > span')).toHaveText([
      'finished',
      'not read yet',
      'Main book, filled to its %',
      'up next',
      'waiting for you',
    ])
    // The two new items' swatches are the spine dots in their colors.
    for (const [text, color] of [
      ['up next', 'rgb(90, 125, 152)'],
      ['waiting for you', 'rgb(140, 123, 92)'],
    ]) {
      const swatch = legend.locator(':scope > span', { hasText: text }).locator('[aria-hidden="true"]')
      await expect(swatch).toHaveCSS('background-color', color)
      await expect(swatch).toHaveCSS('width', '7px')
    }
  })
})
