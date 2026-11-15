// Story 10.1 Reverse the catalog order: the Sort direction toggle joined to
// the Sort select (FR-20, AR28, UX-DR63, UX-DR64). Each key's natural
// direction and its reverse in the bookcase, the List and the tiles, the
// fixed tie-breaks, the reset on a key change, the remembered reversal shared
// with Home's slice, storage that fails, the toggle's names, group and Tab
// order, and its focus, dark and forced-colors looks.

import { bookcase, bookRows, shelfOf, tabIntoBookcase, viewToggle } from './bookcase.ts'
import { boxOf, recordStatus, statusTexts } from './card-note-add-another.ts'
import { expect, test } from './fixtures.ts'
import { expectedSlice, rowCapacity, slice, sliceRows } from './home.ts'
import {
  ACCENT,
  AUTHOR_Z_A,
  BELOVED,
  BY_AUTHOR,
  BY_DATE_ADDED,
  BY_PAGES,
  BY_TITLE,
  bookId,
  DUNE_FINISHED,
  INK,
  INK_DARK,
  INK_SECONDARY,
  INK_SECONDARY_DARK,
  INPUT_BORDER,
  INPUT_BORDER_DARK,
  KINDRED,
  MOST_FIRST,
  OLDEST_FIRST,
  raisedHalf,
  REVERSED,
  REVERSED_KEY,
  SORT_KEY,
  SORT_SHELF,
  sortGroup,
  sortSelect,
  sortToggle,
  spineOrder,
  storeOnce,
  stored,
  SURFACE_INSET,
  SURFACE_INSET_DARK,
  systemColor,
  TIE_SHELF,
  TIES_AUTHOR_Z_A,
  TIES_BY_TITLE,
  TIES_TITLE_Z_A,
  TITLE_Z_A,
  toggleArrow,
} from './sort-direction.ts'
import { afterAnnounceDelay } from './stats.ts'
import { tileNames, tiles } from './tiles.ts'

test.describe('Story 10.1 Reverse the catalog order (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test.skip('[P0] AC-1 a browser that stored only the Date added sort opens newest first reading "↑ Newest first", and with nothing stored Author A–Z reads "↑ A–Z"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    // Before this story: the key only, no reversal key.
    await storeOnce(page, { [SORT_KEY]: 'dateAdded' })
    await page.goto(`${server.url}/catalog`)

    await expect(sortToggle(page)).toHaveAccessibleName('Newest first')
    await expect(sortToggle(page)).toHaveText(/^↑\s*Newest first$/)
    await expect(sortSelect(page).locator('option:checked')).toHaveText('Date added')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_DATE_ADDED)
    expect(await stored(page, SORT_KEY)).toBe('dateAdded')

    // Nothing stored.
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect(sortToggle(page)).toHaveText(/^↑\s*A–Z$/)
    await expect(sortSelect(page).locator('option:checked')).toHaveText('Author')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
  })

  test.skip('[P1] AC-2 the toggle is joined to the Sort select as one compound field in surface-inset with an ink-secondary arrow and body-sm ink text, and an empty Catalog shows neither', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const select = sortSelect(page)
    const toggle = sortToggle(page)

    await expect(toggle).toHaveCSS('background-color', SURFACE_INSET)
    // One field: the same top and height, the toggle starting where the select ends.
    const s = await boxOf(select)
    const t = await boxOf(toggle)
    expect(t.height).toBe(42)
    expect(t.height).toBe(s.height)
    expect(t.y).toBe(s.y)
    expect(Math.abs(t.x - (s.x + s.width))).toBeLessThanOrEqual(0.5)
    // The shared edge is drawn once: the select's right border, no left border on the toggle.
    await expect(toggle).toHaveCSS('border-left-width', '0px')
    await expect(select).toHaveCSS('border-right-width', '1.5px')
    for (const side of ['top', 'right', 'bottom']) {
      await expect(toggle).toHaveCSS(`border-${side}-width`, '1.5px')
      await expect(toggle).toHaveCSS(`border-${side}-style`, 'solid')
      await expect(toggle).toHaveCSS(`border-${side}-color`, INPUT_BORDER)
    }
    // The select's right corners square, the toggle's outer corners rounded.md.
    await expect(select).toHaveCSS('border-top-left-radius', '9px')
    await expect(select).toHaveCSS('border-top-right-radius', '0px')
    await expect(select).toHaveCSS('border-bottom-right-radius', '0px')
    await expect(toggle).toHaveCSS('border-top-left-radius', '0px')
    await expect(toggle).toHaveCSS('border-bottom-left-radius', '0px')
    await expect(toggle).toHaveCSS('border-top-right-radius', '9px')
    await expect(toggle).toHaveCSS('border-bottom-right-radius', '9px')
    // The arrow in ink-secondary, then the order's text in body-sm / ink.
    await expect(toggleArrow(page)).toHaveText('↑')
    await expect(toggleArrow(page)).toHaveCSS('color', INK_SECONDARY)
    await expect(toggle).toHaveCSS('color', INK)
    await expect(toggle).toHaveCSS('font-size', '14px')
    const arrowBox = await boxOf(toggleArrow(page))
    expect(arrowBox.x).toBeGreaterThan(t.x)

    // An empty Catalog: neither the select nor the toggle.
    const empty = await seededServer({ books: [] })
    await page.goto(`${empty.url}/catalog`)
    const main = page.getByRole('main')
    await expect(main.getByText('Your shelf is empty. Add your first book.', { exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: 'New book', exact: true })).toBeVisible()
    await expect(sortGroup(page)).toHaveCount(0)
    await expect(sortSelect(page)).toHaveCount(0)
    for (const name of ['A–Z', 'Z–A']) await expect(main.getByRole('button', { name, exact: true })).toHaveCount(0)
  })

  test.skip('[P0] AC-3 for each key the toggle reverses the bookcase, the list and the tiles, says the new order with ↓, restores on a second press, and the controls to its right stay put', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const toggle = sortToggle(page)
    const bookcaseButton = viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true })

    await expect(toggle).toHaveAccessibleName('A–Z')
    const right = await boxOf(bookcaseButton)
    // Author by click.
    await toggle.click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(AUTHOR_Z_A)
    await expect(toggle).toHaveAccessibleName('Z–A')
    await expect(toggle).toHaveText(/^↓\s*Z–A$/)
    expect(await boxOf(bookcaseButton)).toEqual(right)
    await toggle.click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    await expect(toggle).toHaveText(/^↑\s*A–Z$/)

    // Title by Enter.
    await sortSelect(page).selectOption({ label: 'Title' })
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_TITLE)
    await expect(toggle).toHaveText(/^↑\s*A–Z$/)
    const titleRight = await boxOf(bookcaseButton)
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TITLE_Z_A)
    await expect(toggle).toHaveText(/^↓\s*Z–A$/)
    expect(await boxOf(bookcaseButton)).toEqual(titleRight)
    await page.keyboard.press('Enter')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_TITLE)
    await expect(toggle).toHaveText(/^↑\s*A–Z$/)

    // Date added by Space.
    await sortSelect(page).selectOption({ label: 'Date added' })
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_DATE_ADDED)
    await expect(toggle).toHaveText(/^↑\s*Newest first$/)
    const dateRight = await boxOf(bookcaseButton)
    await toggle.focus()
    await page.keyboard.press('Space')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(OLDEST_FIRST)
    await expect(toggle).toHaveText(/^↓\s*Oldest first$/)
    expect(await boxOf(bookcaseButton)).toEqual(dateRight)
    await page.keyboard.press('Space')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_DATE_ADDED)
    await expect(toggle).toHaveText(/^↑\s*Newest first$/)

    // Pages by click: "Most first" is narrower than "Fewest first", so the toggle keeps the wider width.
    await sortSelect(page).selectOption({ label: 'Pages' })
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_PAGES)
    await expect(toggle).toHaveText(/^↑\s*Fewest first$/)
    const pagesRight = await boxOf(bookcaseButton)
    const pagesToggle = await boxOf(toggle)
    await toggle.click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(MOST_FIRST)
    await expect(toggle).toHaveText(/^↓\s*Most first$/)
    expect(await boxOf(bookcaseButton)).toEqual(pagesRight)
    expect((await boxOf(toggle)).width).toBe(pagesToggle.width)

    // The List rows and the tiles follow the reversed order.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Emma/, /^Dune.*Not read yet/, /^Dune.*Finished/, /^Beloved/, /^Kindred/])
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(tiles(page)).toBeVisible()
    await expect.poll(() => tileNames(page)).toEqual(MOST_FIRST)
    await toggle.click()
    await expect.poll(() => tileNames(page)).toEqual(BY_PAGES)
    await expect(toggle).toHaveText(/^↑\s*Fewest first$/)
  })

  test.skip('[P1] AC-4 reversed, Books with the same first author keep title A–Z and Books with the same title keep the one added earlier first', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: TIE_SHELF })
    await storeOnce(page, { [SORT_KEY]: 'author', [REVERSED_KEY]: REVERSED })
    await page.goto(`${server.url}/catalog`)

    // Jane Austen's two by title, Frank Herbert's twins by the one added earlier.
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TIES_AUTHOR_Z_A)
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')

    // Title: the twins keep the earlier one first in both directions.
    await sortSelect(page).selectOption({ label: 'Title' })
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TIES_BY_TITLE)
    await sortToggle(page).click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TIES_TITLE_Z_A)
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
  })

  test.skip('[P0] AC-5 choosing another key while reversed gives that key’s natural order, reads its natural label and stores not reversed', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    // Author reversed (Z–A), remembered.
    await storeOnce(page, { [SORT_KEY]: 'author', [REVERSED_KEY]: REVERSED })
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 5 books')
    await sortSelect(page).selectOption({ label: 'Pages' })

    await expect(sortToggle(page)).toHaveAccessibleName('Fewest first')
    await expect(sortToggle(page)).toHaveText(/^↑\s*Fewest first$/)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_PAGES)
    await expect.poll(() => stored(page, REVERSED_KEY)).not.toBe(REVERSED)
    expect(await stored(page, SORT_KEY)).toBe('pages')
    await page.reload()
    await expect(sortToggle(page)).toHaveAccessibleName('Fewest first')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_PAGES)

    // The same through the toggle: reverse Author, then choose Title.
    await sortSelect(page).selectOption({ label: 'Author' })
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await sortToggle(page).click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(AUTHOR_Z_A)
    await expect.poll(() => stored(page, REVERSED_KEY)).toBe(REVERSED)
    await sortSelect(page).selectOption({ label: 'Title' })
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_TITLE)
    await expect.poll(() => stored(page, REVERSED_KEY)).not.toBe(REVERSED)
  })

  test.skip('[P1] AC-6 the reversal survives a reload, Home packs its slice rows in the reversed order before choosing them, and the sort key keeps its format', async ({
    page,
    seededServer,
  }) => {
    // Story 7.1's several-row slice: "Book 001" … "Book 180", pages falling as
    // n rises, so Pages most first is Book 001 … Book 180. Main: Book 170; Up
    // next: Book 090; newest finish: Book 130; an older finish: Book 010.
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
    const mostFirst = books.map((book) => book.title)
    const fewestFirst = [...mostFirst].reverse()
    const titles = async () => (await spineOrder(bookcase(page))).map((name) => (name ?? '').split(' by ')[0])
    await storeOnce(page, { [SORT_KEY]: 'pages' })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(titles).toEqual(fewestFirst)
    await sortToggle(page).click()
    await page.reload()

    await expect.poll(titles).toEqual(mostFirst)
    await expect(sortToggle(page)).toHaveAccessibleName('Most first')
    expect(await stored(page, REVERSED_KEY)).toBe(REVERSED)
    expect(await stored(page, SORT_KEY)).toBe('pages')

    // Home, reached in the app: rows packed most first, then chosen by priority.
    const priority = ['Book 170', 'Book 090', 'Book 130', 'Book 010']
    const nav = page.getByRole('navigation', { name: 'Main', exact: true })
    await nav.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    const k = await rowCapacity(page)
    expect(k).toBeGreaterThanOrEqual(10)
    const expected = expectedSlice(mostFirst, k, priority, true)
    // The oracle can tell the two directions apart at this width.
    expect(expected).not.toEqual(expectedSlice(fewestFirst, k, priority, true))
    expect(expected[0]).toContain('Book 170')
    await expect.poll(() => sliceRows(page)).toEqual(expected)
    // And on a fresh load of Home.
    await page.goto(server.url)
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 3 rows')
    await expect.poll(() => sliceRows(page)).toEqual(expected)
  })

  test.skip('[P1] AC-7 junk in the reversal key or a stored key that isn’t one of the four opens the natural direction, and with storage that throws the toggle still reverses for this visit with no message', async ({
    page,
    context,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const reopenWith = async (values: Record<string, string>) => {
      await page.evaluate((entries) => {
        window.localStorage.clear()
        for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value)
      }, values)
      await page.reload()
    }

    // Junk in the reversal key: Title A–Z.
    await reopenWith({ [SORT_KEY]: 'title', [REVERSED_KEY]: 'yes' })
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_TITLE)
    for (const junk of ['', '{"reversed":true}', '1']) {
      await reopenWith({ [SORT_KEY]: 'title', [REVERSED_KEY]: junk })
      await expect(sortSelect(page).locator('option:checked')).toHaveText('Title')
      await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
      await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_TITLE)
    }
    // A key that isn't one of the four, with the reversal stored: Author A–Z, not reversed.
    await reopenWith({ [SORT_KEY]: 'shelves', [REVERSED_KEY]: REVERSED })
    await expect(sortSelect(page).locator('option:checked')).toHaveText('Author')
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)

    // Storage that throws, after Pages reversed was stored: Author A–Z, and a press still reverses.
    const failing = await context.newPage()
    await failing.setViewportSize({ width: 1280, height: 900 })
    const errors: Error[] = []
    failing.on('pageerror', (error) => errors.push(error))
    await failing.addInitScript(
      ([sortKey, reversedKey, reversed]) => {
        window.localStorage.setItem(sortKey, 'pages')
        window.localStorage.setItem(reversedKey, reversed)
        const fail = () => {
          throw new DOMException('denied', 'SecurityError')
        }
        Storage.prototype.getItem = fail
        Storage.prototype.setItem = fail
        Storage.prototype.removeItem = fail
      },
      [SORT_KEY, REVERSED_KEY, REVERSED],
    )
    await failing.goto(`${server.url}/catalog`)
    await expect(sortToggle(failing)).toHaveAccessibleName('A–Z')
    await expect.poll(() => spineOrder(bookcase(failing))).toEqual(BY_AUTHOR)
    await sortToggle(failing).click()
    await expect.poll(() => spineOrder(bookcase(failing))).toEqual(AUTHOR_Z_A)
    await expect(sortToggle(failing)).toHaveAccessibleName('Z–A')
    await afterAnnounceDelay(failing)
    await expect(failing.getByRole('alert')).toHaveText('')
    await expect(failing.getByRole('status')).toHaveText('')
    expect(errors.map(String)).toEqual([])
  })

  test.skip('[P1] AC-8 the toggle is a plain button named by its visible text in a "Sort" group, the next Tab stop after the select, keeps focus on a press with status silent, and the bookcase arrows follow the reversed order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const group = sortGroup(page)

    await expect(group.getByRole('button', { name: 'A–Z', exact: true })).toBeVisible()
    const toggle = sortToggle(page)
    // A plain button: no aria-pressed, its name its visible text, the arrow hidden.
    expect(await toggle.evaluate((element) => element.tagName)).toBe('BUTTON')
    await expect(toggle).toHaveAttribute('type', 'button')
    await expect(toggle).not.toHaveAttribute('aria-pressed')
    await expect(toggle).not.toHaveAttribute('aria-label')
    await expect(toggle).not.toHaveAttribute('aria-labelledby')
    await expect(toggleArrow(page)).toHaveText('↑')
    // The group holds the select too, and is named by the visible label.
    await expect(group.getByRole('combobox', { name: 'Sort', exact: true })).toBeVisible()
    await expect(group).toHaveAttribute('aria-labelledby')
    await expect(group).not.toHaveAttribute('aria-label')
    await expect(page.getByRole('main').getByText('Sort', { exact: true })).toBeVisible()

    // Tab order: the select, the toggle, then the view toggle.
    await sortSelect(page).focus()
    await page.keyboard.press('Tab')
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(toggle).toBeFocused()

    // A press keeps focus on the toggle, and the status region stays silent.
    await recordStatus(page)
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAccessibleName('Z–A')
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAccessibleName('A–Z')
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAccessibleName('Z–A')
    await expect(toggle).toBeFocused()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(AUTHOR_Z_A)
    await afterAnnounceDelay(page)
    expect(await statusTexts(page)).toEqual([])

    // The bookcase's arrow keys follow the reversed order.
    await tabIntoBookcase(page)
    await expect(bookcase(page).getByRole('button', { name: BELOVED, exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(bookcase(page).getByRole('button', { name: KINDRED, exact: true })).toBeFocused()
    await page.keyboard.press('End')
    await expect(bookcase(page).getByRole('button', { name: DUNE_FINISHED, exact: true })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(bookcase(page).getByRole('button', { name: BELOVED, exact: true })).toBeFocused()
  })

  test.skip('[P2] AC-9 the focused half is raised above the other, no hover change, the dark twins, and ButtonFace with ButtonText under forced colors with the shared edge still drawn', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const select = sortSelect(page)
    const toggle = sortToggle(page)

    await select.focus()
    await expect.poll(() => raisedHalf(sortGroup(page))).toBe('select')
    await expect(select).toHaveCSS('border-right-color', ACCENT)
    // The toggle's turn: the focus ring, painted over the select.
    await page.keyboard.press('Tab')
    await expect(toggle).toBeFocused()
    await expect.poll(() => raisedHalf(sortGroup(page))).toBe('toggle')
    await expect(toggle).toHaveCSS('outline-style', 'solid')
    await expect(toggle).toHaveCSS('outline-width', '2px')
    await expect(toggle).toHaveCSS('outline-color', ACCENT)
    await expect(toggle).toHaveCSS('outline-offset', '2px')

    // No hover change.
    await page.getByRole('main').getByRole('heading', { name: 'Catalog', exact: true }).click()
    await expect(toggle).not.toBeFocused()
    await toggle.hover()
    await expect(toggle).toHaveCSS('background-color', SURFACE_INSET)
    await expect(toggle).toHaveCSS('border-top-color', INPUT_BORDER)
    await expect(toggle).toHaveCSS('color', INK)

    // Dark: the tokens' twins.
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(toggle).toHaveCSS('background-color', SURFACE_INSET_DARK)
    await expect(toggle).toHaveCSS('border-top-color', INPUT_BORDER_DARK)
    await expect(toggle).toHaveCSS('color', INK_DARK)
    await expect(toggleArrow(page)).toHaveCSS('color', INK_SECONDARY_DARK)

    // Forced colors: ButtonFace, ButtonText for text, border and arrow; the select's right border still drawn.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const buttonFace = await systemColor(page, 'ButtonFace')
    const buttonText = await systemColor(page, 'ButtonText')
    await expect(toggle).toHaveCSS('background-color', buttonFace)
    await expect(toggle).toHaveCSS('color', buttonText)
    for (const side of ['top', 'right', 'bottom']) await expect(toggle).toHaveCSS(`border-${side}-color`, buttonText)
    await expect(toggleArrow(page)).toHaveCSS('color', buttonText)
    await expect(select).toHaveCSS('border-right-width', '1.5px')
    await expect(select).toHaveCSS('border-right-style', 'solid')
    await expect(select).not.toHaveCSS('border-right-color', 'rgba(0, 0, 0, 0)')
  })
})
