// Story 7.2 Filter my catalog: the filter chips on the Catalog toolbar's
// second row (FR-20, UX-DR20), the Language and Tag checkbox lists, how the
// filters combine and close up the shelf, "Clear filters", the no-match
// state, focus when the focused spine is filtered out, filters not being
// remembered or applied to Home and the meter, and an add clearing them.

import type { Locator, Page } from '@playwright/test'
import {
  ACCENT,
  bookcase,
  bookRows,
  finished,
  search,
  spine,
  SWING_TIME,
  tabIntoBookcase,
  viewToggle,
} from './bookcase.ts'
import { expect, test } from './fixtures.ts'

// DESIGN.md `accent-soft`, light theme (#E3EBE2).
const ACCENT_SOFT = 'rgb(227, 235, 226)'

/** A stable v4-shaped id for the n-th seeded Book. */
function bookId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

/**
 * Six Books, seeded in an order whose languages (German, French, Polish,
 * English) and tags (novel, classic, stories) are not alphabetical, so a
 * list in library order shows up. Under the default Author sort they stand
 * Bleak House, Dubliners, Emma, Flights, Candide, Austerlitz.
 */
const FILTER_SHELF = [
  {
    id: bookId(1),
    title: 'Austerlitz',
    authors: ['W. G. Sebald'],
    type: 'paperback',
    language: 'German',
    tags: ['novel'],
    readings: finished(),
  },
  {
    id: bookId(2),
    title: 'Candide',
    authors: ['Voltaire'],
    type: 'ebook',
    language: 'French',
    tags: ['classic'],
    readings: finished(),
  },
  {
    id: bookId(3),
    title: 'Flights',
    authors: ['Olga Tokarczuk'],
    type: 'hardcover',
    language: 'Polish',
    tags: [],
    readings: finished(),
  },
  {
    id: bookId(4),
    title: 'Bleak House',
    authors: ['Charles Dickens'],
    type: 'hardcover',
    language: 'English',
    tags: ['novel', 'classic'],
  },
  {
    id: bookId(5),
    title: 'Dubliners',
    authors: ['James Joyce'],
    type: 'paperback',
    language: 'English',
    tags: ['stories'],
  },
  {
    id: bookId(6),
    title: 'Emma',
    authors: ['Jane Austen'],
    type: 'ebook',
    language: 'English',
    tags: ['novel', 'classic'],
  },
]

const AUSTERLITZ = 'Austerlitz by W. G. Sebald, finished'
const CANDIDE = 'Candide by Voltaire, finished'
const FLIGHTS = 'Flights by Olga Tokarczuk, finished'
const BLEAK_HOUSE = 'Bleak House by Charles Dickens, not read yet'
const DUBLINERS = 'Dubliners by James Joyce, not read yet'
const EMMA = 'Emma by Jane Austen, not read yet'

// The default sort: first author with Intl.Collator.
const BY_AUTHOR = [BLEAK_HOUSE, DUBLINERS, EMMA, FLIGHTS, CANDIDE, AUSTERLITZ]

function main(page: Page): Locator {
  return page.getByRole('main')
}

function chipGroup(page: Page, name: 'Status' | 'Type'): Locator {
  return main(page).getByRole('group', { name, exact: true })
}

function chip(page: Page, group: 'Status' | 'Type', name: string): Locator {
  return chipGroup(page, group).getByRole('button', { name, exact: true })
}

/** The Language ▾ chip; its name becomes "Language: 2" with two values checked. */
function languageChip(page: Page): Locator {
  return main(page).getByRole('button', { name: /^Language\b/ })
}

function tagChip(page: Page): Locator {
  return main(page).getByRole('button', { name: /^Tag\b/ })
}

function clearFilters(page: Page): Locator {
  return main(page).getByRole('button', { name: 'Clear filters', exact: true })
}

/** The spine names in `list`, in DOM order, visible ones only. */
function spineNames(list: Locator): Promise<(string | null)[]> {
  return list.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
}

/** The accessible names of the checkboxes on the page, in DOM order. */
function checkboxNames(page: Page): Promise<string[]> {
  return page.getByRole('checkbox').evaluateAll((boxes) =>
    boxes.map((box) => {
      const input = box as HTMLInputElement
      const labelledBy = input.getAttribute('aria-labelledby')
      if (labelledBy) {
        return labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
      }
      return (input.getAttribute('aria-label') ?? input.labels?.[0]?.textContent ?? input.textContent ?? '').trim()
    }),
  )
}

/** A spine by its exact name, even while it is hidden. */
function anySpine(page: Page, name: string): Locator {
  return bookcase(page).locator(`button[aria-label="${name}"]`)
}

test.describe('Story 7.2 Filter my catalog (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P1] AC-1 the toolbar’s second row has Status and Type chip groups plus Language ▾ and Tag ▾, toggle buttons that show selection with a fill, a 2px accent border and a check', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await expect(chipGroup(page, 'Status').getByRole('button')).toHaveText(['Read', 'Unread'])
    await expect(chipGroup(page, 'Type').getByRole('button')).toHaveText(['Paperback', 'Hardcover', 'Ebook'])
    for (const name of ['Read', 'Unread'])
      await expect(chip(page, 'Status', name)).toHaveAttribute('aria-pressed', 'false')
    for (const name of ['Paperback', 'Hardcover', 'Ebook']) {
      await expect(chip(page, 'Type', name)).toHaveAttribute('aria-pressed', 'false')
    }
    await expect(languageChip(page)).toHaveText(/^Language\s*▾$/)
    await expect(tagChip(page)).toHaveText(/^Tag\s*▾$/)
    // The second row: below Search titles' row.
    const searchBox = (await search(page).boundingBox())!
    const statusBox = (await chipGroup(page, 'Status').boundingBox())!
    expect(statusBox.y).toBeGreaterThanOrEqual(searchBox.y + searchBox.height)

    // Selected: aria-pressed, the accent-soft fill, a 2px accent border and a
    // check glyph that stays out of the name.
    const read = chip(page, 'Status', 'Read')
    await read.click()
    await expect(read).toHaveAttribute('aria-pressed', 'true')
    await expect(read).toHaveCSS('background-color', ACCENT_SOFT)
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(read).toHaveCSS(`border-${side}-width`, '2px')
      await expect(read).toHaveCSS(`border-${side}-color`, ACCENT)
    }
    const hasCheck = await read.evaluate(
      (element) =>
        (element.textContent ?? '').includes('✓') ||
        getComputedStyle(element, '::before').content.includes('✓') ||
        element.querySelector('svg') !== null,
    )
    expect(hasCheck).toBe(true)
    await expect(chip(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'false')
  })

  test('[P1] AC-2 Language ▾ and Tag ▾ list the library’s values as checkboxes in alphabetical order, and the chip counts the checked ones', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await languageChip(page).click()
    await expect.poll(() => checkboxNames(page)).toEqual(['English', 'French', 'German', 'Polish'])
    await page.getByRole('checkbox', { name: 'French', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Polish', exact: true }).check()
    await expect(languageChip(page)).toHaveText(/^Language: 2/)

    await tagChip(page).click()
    await expect.poll(() => checkboxNames(page)).toEqual(['classic', 'novel', 'stories'])
  })

  test('[P0] AC-3 chips OR within a group and AND across groups and Search titles, hide non-matching Books in both views, and announce "N books match."', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)
    const status = page.getByRole('status')

    // Within Type: Paperback OR Ebook.
    await chip(page, 'Type', 'Paperback').click()
    await chip(page, 'Type', 'Ebook').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([DUBLINERS, EMMA, CANDIDE, AUSTERLITZ])
    await expect(status).toHaveText('4 books match.')

    // Across groups: AND Unread.
    await chip(page, 'Status', 'Unread').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([DUBLINERS, EMMA])
    await expect(status).toHaveText('2 books match.')
    // Hidden, not dimmed: the shelf closes up.
    await expect(anySpine(page, CANDIDE)).toBeHidden()
    await expect(anySpine(page, BLEAK_HOUSE)).toBeHidden()

    // AND Search titles: "d" alone would match Candide and Dubliners.
    await search(page).fill('d')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([DUBLINERS])
    await expect(status).toHaveText('1 book matches.')

    // The List view applies the same filters.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Dubliners/])
  })

  test('[P1] AC-4 "Clear filters" at the end of the row turns every filter off', async ({ page, seededServer }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await chip(page, 'Status', 'Read').click()
    await chip(page, 'Type', 'Ebook').click()
    await languageChip(page).click()
    await page.getByRole('checkbox', { name: 'French', exact: true }).check()
    // Clear filters isn't a search clear: "e" stays.
    await search(page).fill('e')
    await clearFilters(page).click()

    // Focus goes to Read (the clicked link is gone); the count is the search's alone.
    await expect(chip(page, 'Status', 'Read')).toBeFocused()
    await expect(search(page)).toHaveValue('e')
    await expect(page.getByRole('status')).toHaveText('5 books match.')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, DUBLINERS, EMMA, CANDIDE, AUSTERLITZ])
    await search(page).fill('')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    await expect(chip(page, 'Status', 'Read')).toHaveAttribute('aria-pressed', 'false')
    await expect(chip(page, 'Type', 'Ebook')).toHaveAttribute('aria-pressed', 'false')
    await expect(languageChip(page)).not.toHaveText(/:/)
    // Shown only while a filter is on.
    await expect(clearFilters(page)).toHaveCount(0)

    // At the row's end: the next Tab stop after Tag ▾.
    await chip(page, 'Status', 'Unread').click()
    await tagChip(page).focus()
    await page.keyboard.press('Tab')
    await expect(clearFilters(page)).toBeFocused()
  })

  test('[P1] AC-5 filters that match nothing show "No books match these filters." with a "Clear filters" link', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    // No Polish ebook.
    await chip(page, 'Type', 'Ebook').click()
    await languageChip(page).click()
    await page.getByRole('checkbox', { name: 'Polish', exact: true }).check()

    await expect(main(page).getByText('No books match these filters.', { exact: true })).toBeVisible()
    await expect(bookcase(page).getByRole('button')).toHaveCount(0)
    // The row's link and the shelf area's link; the shelf area's comes later.
    await expect(clearFilters(page)).toHaveCount(2)
    await clearFilters(page).last().click()
    // The clicked link goes away, so focus moves to Read.
    await expect(chip(page, 'Status', 'Read')).toBeFocused()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    await expect(main(page).getByText('No books match these filters.', { exact: true })).toHaveCount(0)
  })

  test('[P1] AC-6 when the focused spine is filtered out, the bookcase’s Tab stop moves to its nearest remaining neighbor in sort order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)
    // Focus Flights, the 4th spine.
    await tabIntoBookcase(page)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // "novel" keeps Bleak House, Emma and Austerlitz: Emma is one step back,
    // Austerlitz two steps on, Bleak House the first spine.
    await tagChip(page).click()
    await page.getByRole('checkbox', { name: 'novel', exact: true }).check()
    await tabIntoBookcase(page)

    await expect(spine(page, EMMA)).toBeFocused()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, EMMA, AUSTERLITZ])
  })

  test('[P1] AC-7 filters are off after leaving Catalog and coming back, and never apply to the meter or Home’s slice', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)
    const nav = page.getByRole('banner').getByRole('navigation')
    const meter = main(page).getByRole('progressbar', { name: 'Books finished', exact: true })

    await chip(page, 'Status', 'Unread').click()
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    await nav.getByRole('link', { name: 'Catalog', exact: true }).click()

    await expect(chip(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)

    // The meter counts the whole library while a filter is on.
    await chip(page, 'Status', 'Unread').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, DUBLINERS, EMMA])
    await expect(meter).toHaveAttribute('aria-valuetext', '3 of 6 finished')

    // Home's slice shows every Book: one row, no Main book, in sort order.
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    const slice = main(page).getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
    await expect.poll(() => spineNames(slice)).toEqual(BY_AUTHOR)
  })

  test('[P1] AC-8 adding a Book the filters would hide clears them, so the new spine is focused and announced', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)
    // Read hides every unread Book, Swing Time included.
    await chip(page, 'Status', 'Read').click()

    await page.getByRole('button', { name: 'New book', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'New book', exact: true })
    for (const [label, value] of Object.entries(SWING_TIME)) {
      await panel.getByLabel(label, { exact: true }).fill(value)
    }
    await panel.getByRole('combobox', { name: 'Type', exact: true }).selectOption('Paperback')
    await panel.getByRole('button', { name: 'Add book', exact: true }).click()

    await expect(chip(page, 'Status', 'Read')).toHaveAttribute('aria-pressed', 'false')
    const added = spine(page, 'Swing Time by Zadie Smith, not read yet')
    await expect(added).toBeFocused()
    await expect(panel).toBeHidden()
    await expect(bookcase(page).getByRole('button')).toHaveCount(7)
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
  })

  test('[P1] AC-5 a search that alone matches nothing keeps "No titles match “…”." while a filter is on', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await chip(page, 'Status', 'Read').click()
    await search(page).fill('zzz')

    await expect(main(page).getByText('No titles match “zzz”.', { exact: true })).toBeVisible()
    await expect(main(page).getByText('No books match these filters.', { exact: true })).toHaveCount(0)
    // Only the row's Clear filters.
    await expect(clearFilters(page)).toHaveCount(1)
  })

  test('[P1] AC-2 Esc closes the Language list and returns focus to its chip', async ({ page, seededServer }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await languageChip(page).focus()
    await page.keyboard.press('Enter')
    await expect(languageChip(page)).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('checkbox', { name: 'English', exact: true })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(languageChip(page)).toHaveText(/^Language: 1/)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(languageChip(page)).toBeFocused()
    await expect(languageChip(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('[P1] AC-2 Esc closes the Language list after clicks that move no focus, as in macOS Safari', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    // A dispatched click moves no focus, as a mouse click on a button or checkbox in Safari.
    await languageChip(page).dispatchEvent('click')
    await expect(languageChip(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(languageChip(page)).toBeFocused()
    const english = page.getByRole('checkbox', { name: 'English', exact: true })
    await english.dispatchEvent('click')
    await expect(english).toBeChecked()
    await expect(english).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(languageChip(page)).toBeFocused()
    await expect(languageChip(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('[P1] AC-2 Tab out of the open Language list closes it', async ({ page, seededServer }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await languageChip(page).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('checkbox')).toHaveCount(4)
    // The four checkboxes, then Tag ▾.
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
    await expect(tagChip(page)).toBeFocused()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(languageChip(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('[P1] AC-5 in List view, filters that match nothing show "No books match these filters." with a "Clear filters" link', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()

    await chip(page, 'Type', 'Ebook').click()
    await languageChip(page).click()
    await page.getByRole('checkbox', { name: 'Polish', exact: true }).check()

    await expect(main(page).getByText('No books match these filters.', { exact: true })).toBeVisible()
    await expect(clearFilters(page)).toHaveCount(2)
    await clearFilters(page).last().click()
    await expect(chip(page, 'Status', 'Read')).toBeFocused()
    await expect(bookRows(page)).toHaveCount(6)
    await expect(main(page).getByText('No books match these filters.', { exact: true })).toHaveCount(0)
  })

  test('[P1] AC-2 a mouse click on a value’s label text checks it and keeps the list open; a click outside closes it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FILTER_SHELF })
    await page.goto(`${server.url}/catalog`)

    await languageChip(page).click()
    const french = page.getByRole('checkbox', { name: 'French', exact: true })
    // The label's text, not the box: near the label's right end.
    const label = (await french.locator('xpath=ancestor::label').boundingBox())!
    await page.mouse.click(label.x + label.width - 6, label.y + label.height / 2)

    await expect(languageChip(page)).toHaveText(/^Language: 1/)
    await expect(french).toBeChecked()
    await expect(page.getByRole('checkbox')).toHaveCount(4)

    await main(page).getByRole('heading', { name: 'Catalog', level: 1 }).click()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
  })
})
