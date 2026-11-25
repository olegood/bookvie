// Story 15.2 Filter the catalog by publisher (FR-20, AR66, UX-DR94): the
// Publisher ▾ chip after Tag, its checkbox list ordered by each publisher's
// Book count in the whole library with the count after the name, how it
// filters the bookcase, the List and the Tiles, publishers that differ only in
// case, a checked publisher no Book has any more, the chip being page state
// only, and the rows' accessible names and keyboard behavior.

import type { Page } from '@playwright/test'
import { bookcase, bookRows, finished, search, viewToggle } from './bookcase.ts'
import {
  addSwingTime,
  anySpine,
  checkboxNames,
  chip,
  chipGroup,
  clearFilters,
  countLook,
  languageChip,
  listNames,
  listPopup,
  main,
  publisherChip,
  spineNames,
  storageKeys,
  tagChip,
} from './catalog-filter.ts'
import { expect, test } from './fixtures.ts'
import { ADD_BOOK, editBook } from './intents.ts'
import { bookId, designColor, rgbOf } from './library.ts'
import { tileNames } from './tiles.ts'

/**
 * Seven Books in a library order that is neither the Author sort nor the
 * publishers' order: Manning 3 (one finished), O'Reilly Media 2 (one
 * finished), Addison-Wesley Professional 1 and Apress 1. Under the default
 * Author sort they stand Grokking, Learning Go, Kubernetes, Designing
 * Data-Intensive Applications, The Joy of Clojure, Clean Craftsmanship, Pro Git.
 */
const PUBLISHER_SHELF = [
  {
    id: bookId(1),
    title: 'Kubernetes in Action',
    authors: ['Marko Lukša'],
    publisher: 'Manning',
    tags: ['ops'],
    readings: finished(),
  },
  { id: bookId(2), title: 'Grokking Algorithms', authors: ['Aditya Bhargava'], publisher: 'Manning' },
  {
    id: bookId(3),
    title: 'Designing Data-Intensive Applications',
    authors: ['Martin Kleppmann'],
    publisher: "O'Reilly Media",
  },
  { id: bookId(4), title: 'Learning Go', authors: ['Jon Bodner'], publisher: "O'Reilly Media", readings: finished() },
  { id: bookId(5), title: 'Pro Git', authors: ['Scott Chacon'], publisher: 'Apress' },
  {
    id: bookId(6),
    title: 'Clean Craftsmanship',
    authors: ['Robert C. Martin'],
    publisher: 'Addison-Wesley Professional',
  },
  { id: bookId(7), title: 'The Joy of Clojure', authors: ['Michael Fogus'], publisher: 'Manning' },
]

const GROKKING = 'Grokking Algorithms by Aditya Bhargava, not read yet'
const LEARNING_GO = 'Learning Go by Jon Bodner, finished'
const KUBERNETES = 'Kubernetes in Action by Marko Lukša, finished'
const DDIA = 'Designing Data-Intensive Applications by Martin Kleppmann, not read yet'
const JOY = 'The Joy of Clojure by Michael Fogus, not read yet'
const CLEAN = 'Clean Craftsmanship by Robert C. Martin, not read yet'
const PRO_GIT = 'Pro Git by Scott Chacon, not read yet'

// The default sort: first author with Intl.Collator.
const BY_AUTHOR = [GROKKING, LEARNING_GO, KUBERNETES, DDIA, JOY, CLEAN, PRO_GIT]
const MANNING_BOOKS = [GROKKING, KUBERNETES, JOY]

/** `[publisher, Book count]` as the list shows PUBLISHER_SHELF: count first, ties A–Z. */
const PUBLISHER_ROWS: readonly [string, number][] = [
  ['Manning', 3],
  ["O'Reilly Media", 2],
  ['Addison-Wesley Professional', 1],
  ['Apress', 1],
]

/**
 * The library AC-2 quotes: publishers with 84, 49, 49 and 1 Books, plus twelve
 * more with one Book each, so the list has 16 rows and scrolls. Library order
 * puts Apress first and the one-Book publishers in reverse alphabetical order,
 * and Pragmatic Bookshelf before Manning, so neither library order nor A–Z
 * alone gives the expected list. Book n of a publisher is titled
 * "<publisher> book NN"; every even n is finished and every third has the tag
 * "ops".
 */
const COUNT_PUBLISHERS: readonly [string, number][] = [
  ['Apress', 1],
  ['Pragmatic Bookshelf', 49],
  ["O'Reilly Media", 84],
  ['Manning', 49],
  ...['Zed Books', 'Wiley', 'Springer', 'Routledge', 'Penguin', 'Packt Publishing', 'No Starch Press'].map(
    (name) => [name, 1] as [string, number],
  ),
  ...['Leanpub', 'Faber', 'Chilton Books', 'Bloomsbury', 'Addison-Wesley'].map((name) => [name, 1] as [string, number]),
]

const COUNT_SHELF = COUNT_PUBLISHERS.flatMap(([publisher, count]) =>
  Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      title: `${publisher} book ${String(n).padStart(2, '0')}`,
      authors: ['Author'],
      publisher,
      tags: n % 3 === 0 ? ['ops'] : [],
      ...(n % 2 === 0 ? { readings: finished() } : {}),
    }
  }),
).map((book, index) => ({ id: bookId(index + 1), ...book }))

/** COUNT_SHELF's list: by count, most first, then A–Z with the Catalog's collator. */
const COUNT_ROWS: readonly [string, number][] = [
  ["O'Reilly Media", 84],
  ['Manning', 49],
  ['Pragmatic Bookshelf', 49],
  ...[
    'Addison-Wesley',
    'Apress',
    'Bloomsbury',
    'Chilton Books',
    'Faber',
    'Leanpub',
    'No Starch Press',
    'Packt Publishing',
    'Penguin',
    'Routledge',
    'Springer',
    'Wiley',
    'Zed Books',
  ].map((name) => [name, 1] as [string, number]),
]

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A row's name starts with its publisher and count, one space apart (the noun is AC-8's). */
function rowStart(name: string, count: number): RegExp {
  return new RegExp(`^${escapeRegExp(name)} ${count}(?: |$)`)
}

/** Matchers for `listNames`, one per row in `rows`' order. */
function startsOf(rows: readonly [string, number][]) {
  return rows.map(([name, count]) => expect.stringMatching(rowStart(name, count)))
}

/** A row's whole accessible name: its visible text plus the noun (AC-8). */
function fullName([name, count]: readonly [string, number]): string {
  return `${name} ${count} ${count === 1 ? 'book' : 'books'}`
}

/** Opens Publisher ▾ (the list must show `rows`), checks `publisher`, and closes it. */
async function checkPublisher(page: Page, rows: readonly [string, number][], publisher: string): Promise<void> {
  await expect.poll(() => listNames(page, 'Publisher')).toEqual(startsOf(rows))
  await listPopup(page, 'Publisher')
    .getByRole('checkbox', { name: new RegExp(`^${escapeRegExp(publisher)} \\d`) })
    .check()
  await page.keyboard.press('Escape')
}

test.describe('Story 15.2 Filter the catalog by publisher (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  // Red phase: there is no Publisher ▾ chip yet, so the row ends at Tag ▾.
  test.skip('[P1] AC-1 the filter row shows Status, Type, Language ▾, Tag ▾, then Publisher ▾, whose list is the same checkbox list as Language’s: body-sm/ink rows, at most 320px tall, scrolling beyond that', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: COUNT_SHELF })
    await page.goto(`${server.url}/catalog`)
    const row = chipGroup(page, 'Status').locator('xpath=..')

    await expect(row.getByRole('button')).toHaveText([
      'Read',
      'Unread',
      'Paperback',
      'Hardcover',
      'Ebook',
      /^Language\s*▾$/,
      /^Tag\s*▾$/,
      /^Publisher\s*▾$/,
    ])

    // Language's popup and rows, as shipped, are the reference.
    await languageChip(page).click()
    const languagePopup = listPopup(page, 'Language')
    await expect(languagePopup.getByRole('checkbox')).toHaveCount(1)
    const languageRow = (await countLook(page, 'Language', 'English', 'English')).row
    const languageBackground = await languagePopup.evaluate((popup) => getComputedStyle(popup).backgroundColor)
    await page.keyboard.press('Escape')

    await publisherChip(page).click()
    const popup = listPopup(page, 'Publisher')
    await expect(popup.getByRole('checkbox')).toHaveCount(COUNT_ROWS.length)
    await expect(popup).toHaveCSS('max-height', '320px')
    await expect(popup).toHaveCSS('background-color', languageBackground)
    const box = await popup.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      client: element.clientHeight,
      scroll: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(box.height).toBeLessThanOrEqual(320)
    expect(box.scroll).toBeGreaterThan(box.client)
    expect(['auto', 'scroll']).toContain(box.overflowY)

    // Rows in body-sm (14px, line height 1.5) and ink, exactly as Language's.
    const publisherRow = (await countLook(page, 'Publisher', rowStart('Manning', 49), '49')).row
    expect(publisherRow).toEqual(languageRow)
    expect(publisherRow).toMatchObject({ color: rgbOf(designColor('ink')), fontSize: '14px', lineHeight: '21px' })
  })

  // Red phase: there is no Publisher ▾ chip, so its list reads empty.
  test.skip('[P0] AC-2 Publisher ▾ lists publishers by Book count, most first, ties A–Z, each with its count after the name in body-sm/ink-tertiary, and Language and Tag rows show no count', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: COUNT_SHELF })
    await page.goto(`${server.url}/catalog`)

    await expect.poll(() => listNames(page, 'Publisher')).toEqual(startsOf(COUNT_ROWS))

    // The count sits after the name, one space apart, in its own body-sm/ink-tertiary text; the name is ink.
    for (const [name, count] of [
      ['Manning', '49'],
      ['Pragmatic Bookshelf', '49'],
      ['Apress', '1'],
    ] as const) {
      const look = await countLook(page, 'Publisher', rowStart(name, Number(count)), count)
      expect(look.rowText.startsWith(`${name} ${count}`)).toBe(true)
      expect(look.count).toMatchObject({
        color: rgbOf(designColor('ink-tertiary')),
        fontSize: '14px',
        lineHeight: '21px',
      })
      expect(look.count?.fontFamily).toBe(look.row.fontFamily)
      expect(look.row.color).toBe(rgbOf(designColor('ink')))
    }
    await page.keyboard.press('Escape')

    // Language and Tag rows still show no count.
    await languageChip(page).click()
    await expect.poll(() => checkboxNames(page)).toEqual(['English'])
    await page.keyboard.press('Escape')
    await tagChip(page).click()
    await expect.poll(() => checkboxNames(page)).toEqual(['ops'])
  })

  // Red phase: there is no Publisher ▾ chip, so its list reads empty.
  test.skip('[P0] AC-3 with Unread, a Tag and Search titles on, Publisher ▾ still counts the whole library in the same order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: COUNT_SHELF })
    await page.goto(`${server.url}/catalog`)
    // Unread (odd n), "ops" (n divisible by 3) and "book 1" (n from 10 to 19) leave book 15 of
    // the three publishers that have one: Pragmatic Bookshelf, O'Reilly Media and Manning.
    await chip(page, 'Status', 'Unread').click()
    await tagChip(page).click()
    await page.getByRole('checkbox', { name: 'ops', exact: true }).check()
    await page.keyboard.press('Escape')
    await search(page).fill('book 1')
    await expect(page.getByRole('status')).toHaveText('3 books match.')
    await expect(bookcase(page).getByRole('button')).toHaveCount(3)

    await expect.poll(() => listNames(page, 'Publisher')).toEqual(startsOf(COUNT_ROWS))
  })

  // Red phase: there is no Publisher ▾ chip to check Manning in.
  test.skip('[P0] AC-4 Manning checked shows only its Books in the bookcase, the List and the Tiles, ORs with O’Reilly Media and ANDs with Unread and Search titles', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: PUBLISHER_SHELF })
    await page.goto(`${server.url}/catalog`)
    const status = page.getByRole('status')
    // The Given: the list is there (count order, ties A–Z).
    await expect.poll(() => listNames(page, 'Publisher')).toEqual(startsOf(PUBLISHER_ROWS))
    const popup = listPopup(page, 'Publisher')

    await popup.getByRole('checkbox', { name: rowStart('Manning', 3) }).check()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(MANNING_BOOKS)
    await expect(status).toHaveText('3 books match.')
    await expect(publisherChip(page)).toHaveText(/^Publisher: 1/)
    // Hidden, not dimmed: the shelf closes up.
    await expect(anySpine(page, LEARNING_GO)).toBeHidden()
    await expect(anySpine(page, PRO_GIT)).toBeHidden()

    // Within Publisher: Manning OR O'Reilly Media.
    await popup.getByRole('checkbox', { name: rowStart("O'Reilly Media", 2) }).check()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([GROKKING, LEARNING_GO, KUBERNETES, DDIA, JOY])
    await expect(status).toHaveText('5 books match.')
    await expect(publisherChip(page)).toHaveText(/^Publisher: 2/)
    await popup.getByRole('checkbox', { name: rowStart("O'Reilly Media", 2) }).uncheck()
    await page.keyboard.press('Escape')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(MANNING_BOOKS)

    // AND Unread and Search titles: Manning + Unread is Grokking and Joy, Manning + "in" is
    // Grokking and Kubernetes; all three leave Grokking alone.
    await chip(page, 'Status', 'Unread').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([GROKKING, JOY])
    await search(page).fill('in')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([GROKKING])
    await expect(status).toHaveText('1 book matches.')

    // The List and the Tiles apply the same filters.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Grokking Algorithms/])
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect.poll(() => tileNames(page)).toEqual([expect.stringContaining('Grokking Algorithms')])
  })

  // Red phase: there is no Publisher ▾ chip, so its list reads empty.
  test.skip('[P1] AC-5 publishers that differ only in case are one row labelled with the first spelling in library order, counting and matching both', async ({
    page,
    seededServer,
  }) => {
    // "Manning" on the first Book in library order; "manning" on a later one whose author sorts first.
    const server = await seededServer({
      books: [
        { id: bookId(1), title: 'Kubernetes in Action', authors: ['Marko Lukša'], publisher: 'Manning' },
        { id: bookId(2), title: 'Grokking Algorithms', authors: ['Aditya Bhargava'], publisher: 'manning' },
        { id: bookId(3), title: 'Pro Git', authors: ['Scott Chacon'], publisher: 'Apress' },
      ],
    })
    await page.goto(`${server.url}/catalog`)
    const kubernetes = 'Kubernetes in Action by Marko Lukša, not read yet'

    await expect
      .poll(() => listNames(page, 'Publisher'))
      .toEqual(
        startsOf([
          ['Manning', 2],
          ['Apress', 1],
        ]),
      )

    await listPopup(page, 'Publisher')
      .getByRole('checkbox', { name: rowStart('Manning', 2) })
      .check()
    await expect(publisherChip(page)).toHaveText(/^Publisher: 1/)
    await expect.poll(() => spineNames(bookcase(page))).toEqual([GROKKING, kubernetes])
    await expect(page.getByRole('status')).toHaveText('2 books match.')
  })

  // Red phase: there is no Publisher ▾ chip to check Manning in.
  test.skip('[P1] AC-6 when the last Manning Book is edited to another publisher, the stale check is dropped and the Catalog is not left empty', async ({
    page,
    browser,
    seededServer,
  }) => {
    const server = await seededServer({ books: PUBLISHER_SHELF })
    await page.goto(`${server.url}/catalog`)
    await checkPublisher(page, PUBLISHER_ROWS, 'Manning')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(MANNING_BOOKS)
    await expect(publisherChip(page)).toHaveText(/^Publisher: 1/)

    // Another context (a second tab, or the agent) moves every Manning Book to No Starch Press, Grokking last.
    const otherContext = await browser.newContext()
    try {
      for (const id of [bookId(1), bookId(7), bookId(2)]) {
        await editBook(otherContext.request, server, id, { publisher: 'No Starch Press' })
      }
    } finally {
      await otherContext.close()
    }

    // This context regains focus and the catalog view refetches.
    await page.bringToFront()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(publisherChip(page)).toHaveText(/^Publisher\s*▾$/)
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    await expect(clearFilters(page)).toHaveCount(0)
    await expect(main(page).getByText('No books match these filters.')).toHaveCount(0)
    await expect
      .poll(() => listNames(page, 'Publisher'))
      .toEqual(
        startsOf([
          ['No Starch Press', 3],
          ["O'Reilly Media", 2],
          ['Addison-Wesley Professional', 1],
          ['Apress', 1],
        ]),
      )
  })

  // Red phase: there is no Publisher ▾ chip to turn on.
  test.skip('[P1] AC-7 Clear filters, a reload, leaving Catalog and an add each turn Publisher off; it is never stored or sent, and never applies to the meter or Home’s slice', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: PUBLISHER_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    const before = await storageKeys(page)
    const sent: string[] = []
    page.on('request', (request) => {
      if (request.method() !== 'GET') sent.push(new URL(request.url()).pathname)
    })
    const nav = page.getByRole('banner').getByRole('navigation')
    const meter = main(page).getByRole('progressbar', { name: 'Books finished', exact: true })
    const manningOn = async () => {
      await checkPublisher(page, PUBLISHER_ROWS, 'Manning')
      await expect.poll(() => spineNames(bookcase(page))).toEqual(MANNING_BOOKS)
    }
    const publisherOff = async () => {
      await expect(publisherChip(page)).toHaveText(/^Publisher\s*▾$/)
      await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    }

    // Clear filters.
    await manningOn()
    await expect(meter).toHaveAttribute('aria-valuetext', '2 of 7 finished')
    await clearFilters(page).click()
    await publisherOff()

    // A reload.
    await manningOn()
    await page.reload()
    await publisherOff()

    // Leaving Catalog: Home's slice shows every Book, and coming back the chip is off.
    await manningOn()
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    const slice = main(page).getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
    await expect.poll(() => spineNames(slice)).toEqual(BY_AUTHOR)
    await nav.getByRole('link', { name: 'Catalog', exact: true }).click()
    await publisherOff()

    // An add.
    await manningOn()
    await addSwingTime(page)
    await expect(publisherChip(page)).toHaveText(/^Publisher\s*▾$/)
    await expect(bookcase(page).getByRole('button')).toHaveCount(8)

    // Nothing stored, and nothing sent but the add.
    expect(await storageKeys(page)).toEqual(before)
    expect(sent).toEqual([ADD_BOOK])
  })

  // Red phase: there is no Publisher ▾ chip, so Tab from Tag ▾ leaves the row.
  test.skip('[P1] AC-8 each row is a checkbox named by its text plus the noun, and the chip opens, closes on Esc and returns focus as Language ▾ and Tag ▾ do', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: COUNT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await tagChip(page).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    const popup = listPopup(page, 'Publisher')

    await expect(popup.getByRole('checkbox', { name: 'Manning 49 books', exact: true })).toBeVisible()
    await expect(popup.getByRole('checkbox', { name: 'Apress 1 book', exact: true })).toBeVisible()
    await expect.poll(() => listNames(page, 'Publisher')).toEqual(COUNT_ROWS.map(fullName))
    await expect(publisherChip(page)).toBeFocused()
    await expect(publisherChip(page)).toHaveAttribute('aria-expanded', 'true')

    // Tab into the rows, Space checks one.
    await page.keyboard.press('Tab')
    const oreilly = popup.getByRole('checkbox', { name: "O'Reilly Media 84 books", exact: true })
    await expect(oreilly).toBeFocused()
    await page.keyboard.press('Space')
    await expect(oreilly).toBeChecked()
    await expect(publisherChip(page)).toHaveText(/^Publisher: 1/)
    await page.keyboard.press('Tab')
    await expect(popup.getByRole('checkbox', { name: 'Manning 49 books', exact: true })).toBeFocused()

    // Esc closes it and returns focus to the chip.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(publisherChip(page)).toBeFocused()
    await expect(publisherChip(page)).toHaveAttribute('aria-expanded', 'false')

    // Shift+Tab out of the open list closes it too.
    await page.keyboard.press('Enter')
    await expect(popup.getByRole('checkbox')).toHaveCount(COUNT_ROWS.length)
    await page.keyboard.press('Shift+Tab')
    await expect(tagChip(page)).toBeFocused()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })
})
