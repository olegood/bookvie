// Story 7.1 Sort my catalog: the Sort select in the Catalog toolbar (FR-20,
// UX-DR19), the four sort keys and their tie-breaks in the bookcase, the List
// view and the bookcase keyboard order, the remembered sort shared with Home's
// slice, and Search titles still applying after a sort change.

import type { Locator, Page } from '@playwright/test'
import { bookcase, bookRows, finished, search, tabIntoBookcase, viewToggle } from './bookcase.ts'
import { expect, test } from './fixtures.ts'

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
  test.skip('[P1] AC-1 the Catalog toolbar has a native select labeled "Sort" offering Author (default), Title, Date added and Pages', async ({
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

  test.skip('[P0] AC-2 each sort key reorders the bookcase spines and the List rows, ties break by title, createdAt, then id, and the keyboard follows', async ({
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

  test.skip('[P1] AC-3 the chosen sort is remembered on the next visit and Home’s slice uses the same order', async ({
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

  test.skip('[P1] AC-4 Search titles still applies after the sort changes', async ({ page, seededServer }) => {
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
})
