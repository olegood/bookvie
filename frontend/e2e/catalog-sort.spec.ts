// Story 7.1 Sort my catalog: the Sort select in the Catalog toolbar (FR-20,
// UX-DR19), the four sort keys and their tie-breaks in the bookcase, the List
// view and the bookcase keyboard order, the remembered sort shared with Home's
// slice, and Search titles still applying after a sort change.

import type { Locator, Page } from '@playwright/test'
import {
  ACCENT,
  bookcase,
  bookRows,
  finished,
  search,
  shelfOf,
  spine,
  spines,
  SWING_TIME,
  tabIntoBookcase,
  viewToggle,
} from './bookcase.ts'
import { expect, test } from './fixtures.ts'
import { expectedSlice, rowCapacity, slice, sliceRows } from './home.ts'

/** A stable v4-shaped id for the n-th seeded Book. */
function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/**
 * Every key orders these differently. The two Dune editions share title,
 * author, pages and `createdAt`, so only the Book id separates them: id 3
 * (not read yet) comes before id 4 (finished) under every key. They are
 * seeded id 4 first, so an order that keeps the stored order shows up.
 */
const SORT_SHELF = [
  {
    id: bookId(1),
    title: 'Kindred',
    authors: ['Octavia E. Butler'],
    pages: 286,
    createdAt: '2026-01-10T10:00:00+00:00',
  },
  { id: bookId(2), title: 'Emma', authors: ['Jane Austen'], pages: 474, createdAt: '2026-03-01T10:00:00+00:00' },
  {
    id: bookId(4),
    title: 'Dune',
    authors: ['Frank Herbert'],
    pages: 412,
    createdAt: '2026-02-01T09:00:00+00:00',
    readings: finished(412),
  },
  { id: bookId(3), title: 'Dune', authors: ['Frank Herbert'], pages: 412, createdAt: '2026-02-01T09:00:00+00:00' },
  { id: bookId(5), title: 'Beloved', authors: ['Toni Morrison'], pages: 324, createdAt: '2026-04-15T10:00:00+00:00' },
]

const KINDRED = 'Kindred by Octavia E. Butler, not read yet'
const EMMA = 'Emma by Jane Austen, not read yet'
const DUNE_UNREAD = 'Dune by Frank Herbert, not read yet' // id 3
const DUNE_FINISHED = 'Dune by Frank Herbert, finished' // id 4
const BELOVED = 'Beloved by Toni Morrison, not read yet'

// First author with Intl.Collator, then title, then createdAt, then id.
const BY_AUTHOR = [DUNE_UNREAD, DUNE_FINISHED, EMMA, KINDRED, BELOVED]
// A–Z.
const BY_TITLE = [BELOVED, DUNE_UNREAD, DUNE_FINISHED, EMMA, KINDRED]
// Newest createdAt first.
const BY_DATE_ADDED = [BELOVED, EMMA, DUNE_UNREAD, DUNE_FINISHED, KINDRED]
// Fewest pages first.
const BY_PAGES = [KINDRED, BELOVED, DUNE_UNREAD, DUNE_FINISHED, EMMA]

function sortSelect(page: Page): Locator {
  return page.getByRole('main').getByRole('combobox', { name: 'Sort', exact: true })
}

/** The spine names in `list` (the Catalog bookcase or Home's slice), in DOM order, visible ones only. */
function spineNames(list: Locator): Promise<(string | null)[]> {
  return list.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
}

function homeSlice(page: Page): Locator {
  return page.getByRole('main').getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
}

test.describe('Story 7.1 Sort my catalog (ATDD)', () => {
  test('[P1] AC-1 the Catalog toolbar has a native select labeled "Sort" offering Author (default), Title, Date added and Pages', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    const sort = sortSelect(page)

    // Exactly these four, in this order: no empty first option.
    await expect(sort.locator('option')).toHaveText(['Author', 'Title', 'Date added', 'Pages'])
    await expect(sort.locator('option:checked')).toHaveText('Author')
    // A native select, with a visible label.
    expect(await sort.evaluate((element) => element.tagName)).toBe('SELECT')
    await expect(page.getByRole('main').getByText('Sort', { exact: true })).toBeVisible()
    // Toolbar order (DESIGN.md → Catalog): Search titles, Sort, the view toggle.
    await search(page).focus()
    await page.keyboard.press('Tab')
    await expect(sort).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true })).toBeFocused()
  })

  test('[P0] AC-2 each sort key reorders the bookcase spines and the List rows, ties break by title, createdAt, then id, and the keyboard follows', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    const sort = sortSelect(page)

    await sort.selectOption({ label: 'Pages' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_PAGES)

    await sort.selectOption({ label: 'Title' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_TITLE)
    await sort.selectOption({ label: 'Date added' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_DATE_ADDED)
    await sort.selectOption({ label: 'Author' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)

    // The List view rows follow the same sort.
    await sort.selectOption({ label: 'Pages' })
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Kindred/, /^Beloved/, /^Dune.*Not read yet/, /^Dune.*Finished/, /^Emma/])

    // The bookcase keyboard order follows the new order.
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await tabIntoBookcase(page)
    await expect(page.getByRole('button', { name: KINDRED, exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: BELOVED, exact: true })).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('button', { name: EMMA, exact: true })).toBeFocused()
  })

  test('[P1] AC-3 the chosen sort is remembered on the next visit and Home’s slice uses the same order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    await sortSelect(page).selectOption({ label: 'Title' })

    // Come back later: a fresh load of Catalog.
    await page.goto(`${server.url}/catalog`)
    await expect(sortSelect(page).locator('option:checked')).toHaveText('Title')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_TITLE)

    // Home: one row holds all five Books, and with no Main book it is in bookcase order.
    await page.goto(server.url)
    await expect(homeSlice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineNames(homeSlice(page))).toEqual(BY_TITLE)
  })

  test('[P1] AC-4 Search titles still applies after the sort changes', async ({ page, seededServer }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    // "d" matches Kindred, both Dunes and Beloved, not Emma.
    await search(page).fill('d')
    await expect(bookcase(page).getByRole('button')).toHaveCount(4)

    await sortSelect(page).selectOption({ label: 'Pages' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual([KINDRED, BELOVED, DUNE_UNREAD, DUNE_FINISHED])
    await expect(search(page)).toHaveValue('d')
    await expect(page.getByRole('button', { name: EMMA, exact: true })).toBeHidden()
  })

  test('[P1] AC-3 a junk stored sort opens Author', async ({ page, seededServer }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogSort', 'shelves'))
    await page.goto(`${server.url}/catalog`)

    await expect(sortSelect(page).locator('option:checked')).toHaveText('Author')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
  })

  test('[P1] AC-3 storage that throws opens Author and choosing a key still reorders', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addInitScript(() => {
      const fail = () => {
        throw new DOMException('denied', 'SecurityError')
      }
      Storage.prototype.getItem = fail
      Storage.prototype.setItem = fail
    })
    await page.goto(`${server.url}/catalog`)
    const sort = sortSelect(page)

    await expect(sort.locator('option:checked')).toHaveText('Author')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    await sort.selectOption({ label: 'Pages' })
    await expect(sort.locator('option:checked')).toHaveText('Pages')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_PAGES)
  })

  test('[P1] AC-3 Home’s slice follows a sort chosen moments ago, reached in the app without a reload', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    await sortSelect(page).selectOption({ label: 'Pages' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_PAGES)

    const nav = page.getByRole('navigation', { name: 'Main', exact: true })
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(`${server.url}/`)
    await expect(homeSlice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineNames(homeSlice(page))).toEqual(BY_PAGES)
  })
})

/** Throws on every Storage read and write, after storing `sort` while storage still worked. */
async function throwingStorageAfter(page: Page, sort: string): Promise<void> {
  await page.addInitScript((stored) => {
    window.localStorage.setItem('bookvie.catalogSort', stored)
    const fail = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    Storage.prototype.getItem = fail
    Storage.prototype.setItem = fail
  }, sort)
}

/** Stores `sort` as the remembered Catalog sort before the app loads. */
async function storedSort(page: Page, sort: string): Promise<void> {
  await page.addInitScript((stored) => window.localStorage.setItem('bookvie.catalogSort', stored), sort)
}

test.describe('Story 7.1 Sort my catalog (automate)', () => {
  test('[P1] AC-3 Home packs a several-row slice in the remembered Pages order, the Main book’s row first', async ({
    page,
    seededServer,
  }) => {
    // "Book 001" … "Book 180", one author, pages falling as n rises: Pages
    // order is the reverse of Author order. Main: Book 170; Up next: Book 090;
    // newest finish: Book 130; an older finish: Book 010.
    const books = shelfOf(180).map((book, n) => ({ ...book, id: bookId(n + 1), pages: 1000 - (n + 1) }))
    const at = (n: number) => books[n - 1]
    Object.assign(at(170), { readings: [{ startDate: '2026-10-01', currentPage: 30 }] })
    Object.assign(at(130), {
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-20', finishedPages: 870, currentPage: 870 }],
    })
    Object.assign(at(10), {
      readings: [{ startDate: null, finishDate: '2026-03-20', finishedPages: 990, currentPage: 990 }],
    })
    const server = await seededServer({ mainBookId: bookId(170), upNextBookId: bookId(90), books })
    const byAuthor = books.map((book) => book.title)
    const byPages = [...byAuthor].reverse()
    const priority = ['Book 170', 'Book 090', 'Book 130', 'Book 010']
    await page.setViewportSize({ width: 1280, height: 900 })
    await storedSort(page, 'pages')
    await page.goto(server.url)

    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    const k = await rowCapacity(page)
    expect(k).toBeGreaterThanOrEqual(10)
    const expected = expectedSlice(byPages, k, priority, true)
    // The oracle can tell the two sorts apart at this width.
    expect(expected).not.toEqual(expectedSlice(byAuthor, k, priority, true))
    expect(expected[0]).toContain('Book 170')
    await expect.poll(() => sliceRows(page)).toEqual(expected)
  })

  test('[P2] AC-3 Home with storage that throws shows the slice in Author order', async ({ page, seededServer }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    // Pages was stored before storage started throwing: Home can't read it.
    await throwingStorageAfter(page, 'pages')
    await page.goto(server.url)

    await expect(homeSlice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineNames(homeSlice(page))).toEqual(BY_AUTHOR)
  })

  test('[P2] AC-2 the bookcase Tab stop stays on the last-focused Book across a sort change', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    const beloved = page.getByRole('button', { name: BELOVED, exact: true })

    // Author order: Beloved is the last spine.
    await tabIntoBookcase(page)
    await expect(page.getByRole('button', { name: DUNE_UNREAD, exact: true })).toBeFocused()
    await page.keyboard.press('End')
    await expect(beloved).toBeFocused()

    // Pages puts Kindred first and Beloved second.
    await sortSelect(page).selectOption({ label: 'Pages' })
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_PAGES)

    await tabIntoBookcase(page)
    await expect(beloved).toBeFocused()
    // The arrows go on from there in the new order.
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: DUNE_UNREAD, exact: true })).toBeFocused()
  })

  test('[P2] AC-4 in List view a sort change keeps Search titles’ text and filter and announces nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${server.url}/catalog`)
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    const status = page.getByRole('status')

    // "d" matches Kindred, both Dunes and Beloved, not Emma.
    await search(page).fill('d')
    await expect(bookRows(page)).toHaveText([/^Dune.*Not read yet/, /^Dune.*Finished/, /^Kindred/, /^Beloved/])
    await expect(status).toHaveText('4 books match.')
    await status.evaluate((region) => {
      const seen: string[] = []
      ;(window as Window & { statusTexts?: string[] }).statusTexts = seen
      new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })

    await sortSelect(page).selectOption({ label: 'Pages' })
    await expect(bookRows(page)).toHaveText([/^Kindred/, /^Beloved/, /^Dune.*Not read yet/, /^Dune.*Finished/])
    await expect(search(page)).toHaveValue('d')

    // A fence: the next search's count is announced well after any announcement
    // the sort change could have started, so only that count may appear.
    await search(page).fill('du')
    await expect(bookRows(page)).toHaveText([/^Dune.*Not read yet/, /^Dune.*Finished/])
    await expect(status).toHaveText('2 books match.')
    expect(
      (await page.evaluate(() => (window as Window & { statusTexts?: string[] }).statusTexts))?.filter(
        (text) => text !== '',
      ),
    ).toEqual(['2 books match.'])
  })

  test('[P2] AC-2 under Date added a Book just added is the first spine, focused, in view and ringed', async ({
    page,
    seededServer,
  }) => {
    // About nine rows; under Author the new Book (Zadie Smith) would sort last, below the fold.
    const server = await seededServer({ books: shelfOf(300) })
    await storedSort(page, 'dateAdded')
    await page.goto(`${server.url}/catalog`)
    await expect(sortSelect(page).locator('option:checked')).toHaveText('Date added')
    await page.getByRole('button', { name: 'New book', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'New book', exact: true })
    for (const [label, value] of Object.entries(SWING_TIME)) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()
    const added = spine(page, 'Swing Time by Zadie Smith, not read yet')

    await expect(added).toBeFocused()
    await expect(panel).toBeHidden()
    await expect(spines(page).first()).toHaveAccessibleName('Swing Time by Zadie Smith, not read yet')
    await expect(added).toBeInViewport()
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
    const ringed = () =>
      added.evaluate(
        (element, accent) =>
          [element, element.parentElement!, ...Array.from(element.querySelectorAll('*'))].some((node) =>
            getComputedStyle(node).boxShadow.includes(accent),
          ),
        ACCENT,
      )
    await expect.poll(ringed).toBe(true)
  })
})
