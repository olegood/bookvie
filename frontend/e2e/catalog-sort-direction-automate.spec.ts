// Story 10.1 Reverse the catalog order: test automation after the story was
// done, beside the ATDD leaves in catalog-sort-direction.spec.ts. The ATDD
// checklist's green-phase follow-ups 3 to 12: the reversal kept out of export
// and restore (AR27, AD-15), Home's one-row slice with Author reversed stored
// and with storage that throws, Search titles and the filter chips across a
// press, the List view press, the toggle's minimum width, padding and arrow
// gap, a new Book under Date added reversed, the bookcase Tab stop across a
// press, axe in both states and both themes, and the dark focus looks.

import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import {
  ACCENT,
  bookcase,
  bookRows,
  search,
  shelfOf,
  spine,
  spines,
  SWING_TIME,
  tabIntoBookcase,
  viewToggle,
} from './bookcase.ts'
import { zipEntries } from './card-note-add-another.ts'
import { expect, test } from './fixtures.ts'
import { slice } from './home.ts'
import { exportOf, restoreButton, restoreFrom } from './restore.ts'
import {
  ACCENT_DARK,
  AUTHOR_Z_A,
  BELOVED,
  BY_AUTHOR,
  DUNE_FINISHED,
  DUNE_UNREAD,
  EMMA,
  FOCUS_HALO_DARK,
  INPUT_BORDER_DARK,
  KINDRED,
  MOST_FIRST,
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
  TIE_SHELF,
  TIES_AUTHOR_Z_A,
  TIES_BY_AUTHOR,
  toggleInsets,
} from './sort-direction.ts'
import { AXE_TAGS } from './stats.ts'

const RESTORED = 'Restored.'

function mainNav(page: Page) {
  return page.getByRole('navigation', { name: 'Main', exact: true })
}

function statusChip(page: Page, name: 'Read' | 'Unread') {
  return page
    .getByRole('main')
    .getByRole('group', { name: 'Status', exact: true })
    .getByRole('button', { name, exact: true })
}

test.describe('Story 10.1 Reverse the catalog order (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P2] AC-6 the reversal never reaches the server or the export, and a restore from another library leaves it as it was, reversed and not', async ({
    page,
    seededServer,
  }) => {
    const source = await seededServer({ books: TIE_SHELF })
    const target = await seededServer({ books: SORT_SHELF })
    const sent: string[] = []
    page.on('request', (request) => {
      sent.push(
        [request.url(), JSON.stringify(request.headers()), (request.postDataBuffer() ?? '').toString()].join('\n'),
      )
    })
    await page.goto(`${target.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    await sortToggle(page).click()
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
    await expect.poll(() => stored(page, REVERSED_KEY)).toBe(REVERSED)

    // The export holds the Books but neither storage key.
    await page.goto(`${target.url}/backup`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export all data', exact: true }).click()
    const entries = zipEntries(readFileSync(await (await download).path()))
    const texts = [...entries].map(([name, data]) => `${name}\n${data.toString('utf8')}`)
    expect(texts.some((text) => text.includes('Kindred'))).toBe(true)
    expect(texts.filter((text) => /catalogSort/i.test(text))).toEqual([])
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.filter((request) => /catalogSort/i.test(request))).toEqual([])

    // A restore of another library keeps the reversal…
    const archive = await exportOf(page, source)
    await expect(restoreButton(page)).toBeEnabled()
    await restoreFrom(page, archive)
    await expect(page.getByRole('status')).toHaveText(RESTORED)
    await expect(page).toHaveURL(`${target.url}/`)
    expect(await stored(page, REVERSED_KEY)).toBe(REVERSED)
    expect(await stored(page, SORT_KEY)).toBe('author')
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TIES_AUTHOR_Z_A)

    // …and the natural direction.
    await sortToggle(page).click()
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect.poll(() => stored(page, REVERSED_KEY)).not.toBe(REVERSED)
    await page.goto(`${target.url}/backup`)
    await expect(restoreButton(page)).toBeEnabled()
    await restoreFrom(page, archive)
    await expect(page.getByRole('status')).toHaveText(RESTORED)
    expect(await stored(page, REVERSED_KEY)).not.toBe(REVERSED)
    expect(await stored(page, SORT_KEY)).toBe('author')
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(TIES_BY_AUTHOR)
    expect(sent.filter((request) => /catalogSort/i.test(request))).toEqual([])
  })

  test('[P1] AC-6 Home’s one-row slice follows Author reversed, on a fresh load and after a press made moments ago in the app', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await storeOnce(page, { [SORT_KEY]: 'author', [REVERSED_KEY]: REVERSED })
    await page.goto(server.url)

    // A fresh load of Home: no Main book, so one row in bookcase order, Z–A.
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineOrder(slice(page))).toEqual(AUTHOR_Z_A)

    // Through the nav, no reload: back to A–Z, then Z–A again.
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
    await sortToggle(page).click()
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await mainNav(page).getByRole('link', { name: 'Home', exact: true }).click()
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineOrder(slice(page))).toEqual(BY_AUTHOR)

    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    await sortToggle(page).click()
    await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
    await mainNav(page).getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(`${server.url}/`)
    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineOrder(slice(page))).toEqual(AUTHOR_Z_A)
  })

  test('[P1] AC-7 Home with storage that throws after Author reversed was stored shows the slice Author A–Z', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    const errors: Error[] = []
    page.on('pageerror', (error) => errors.push(error))
    await page.addInitScript(
      ([sortKey, reversedKey, reversed]) => {
        window.localStorage.setItem(sortKey, 'author')
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
    await page.goto(server.url)

    await expect(slice(page)).toHaveAccessibleName('Bookcase slice, 1 row')
    await expect.poll(() => spineOrder(slice(page))).toEqual(BY_AUTHOR)
    await expect(page.getByRole('alert')).toHaveText('')
    expect(errors.map(String)).toEqual([])
  })

  test('[P1] AC-3 Search titles and the filter chips keep working while reversed, and a press keeps the search text and the chips', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await storeOnce(page, { [SORT_KEY]: 'pages', [REVERSED_KEY]: REVERSED })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(MOST_FIRST)

    // "d" matches Kindred, both Dunes and Beloved, not Emma: most first, Emma hidden.
    await search(page).fill('d')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual([DUNE_UNREAD, DUNE_FINISHED, BELOVED, KINDRED])
    await expect(page.getByRole('button', { name: EMMA, exact: true })).toBeHidden()
    // And Unread: the finished Dune goes too.
    await statusChip(page, 'Unread').click()
    await expect(statusChip(page, 'Unread')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual([DUNE_UNREAD, BELOVED, KINDRED])

    // A press: fewest first, with the search text and the chip kept.
    await sortToggle(page).click()
    await expect(sortToggle(page)).toHaveAccessibleName('Fewest first')
    await expect.poll(() => spineOrder(bookcase(page))).toEqual([KINDRED, BELOVED, DUNE_UNREAD])
    await expect(search(page)).toHaveValue('d')
    await expect(statusChip(page, 'Unread')).toHaveAttribute('aria-pressed', 'true')
    await expect(statusChip(page, 'Read')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: EMMA, exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: DUNE_FINISHED, exact: true })).toBeHidden()

    // The chip off again: the search alone, still fewest first.
    await statusChip(page, 'Unread').click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual([KINDRED, BELOVED, DUNE_UNREAD, DUNE_FINISHED])
    await expect(search(page)).toHaveValue('d')
  })

  test('[P2] AC-3 in List view a press reorders the rows and keeps focus on the toggle', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Dune.*Not read yet/, /^Dune.*Finished/, /^Emma/, /^Kindred/, /^Beloved/])
    const toggle = sortToggle(page)

    await toggle.click()
    await expect(bookRows(page)).toHaveText([/^Beloved/, /^Kindred/, /^Emma/, /^Dune.*Not read yet/, /^Dune.*Finished/])
    await expect(toggle).toHaveAccessibleName('Z–A')
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(bookRows(page)).toHaveText([/^Dune.*Not read yet/, /^Dune.*Finished/, /^Emma/, /^Kindred/, /^Beloved/])
    await expect(toggle).toHaveAccessibleName('A–Z')
    await expect(toggle).toBeFocused()
  })

  test('[P2] AC-2 under Author, Title and Date added the toggle keeps its width on a press, with 12px padding and a 4px arrow gap', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const toggle = sortToggle(page)
    const keys = [
      { label: 'Author', natural: 'A–Z', reversed: 'Z–A' },
      { label: 'Title', natural: 'A–Z', reversed: 'Z–A' },
      { label: 'Date added', natural: 'Newest first', reversed: 'Oldest first' },
    ]

    for (const { label, natural, reversed } of keys) {
      await sortSelect(page).selectOption({ label })
      await expect(toggle).toHaveAccessibleName(natural)
      const before = await toggle.boundingBox()
      const one = await toggleInsets(toggle)
      await toggle.click()
      await expect(toggle).toHaveAccessibleName(reversed)
      const after = await toggle.boundingBox()
      const two = await toggleInsets(toggle)

      // The minimum width is the wider label's: a press doesn't change it.
      expect(after!.width, label).toBe(before!.width)
      // spacing.3 before the arrow in both states; the wider label sits
      // spacing.1 after the arrow and spacing.3 before the right border.
      expect(one.left, label).toBeCloseTo(12, 0)
      expect(two.left, label).toBeCloseTo(12, 0)
      expect(Math.min(one.gap, two.gap), label).toBeCloseTo(4, 0)
      expect(Math.min(one.right, two.right), label).toBeCloseTo(12, 0)
      await toggle.click()
      await expect(toggle).toHaveAccessibleName(natural)
    }
  })

  test('[P1] AC-8 under Date added reversed a Book just added is the last spine, focused, in view and ringed', async ({
    page,
    seededServer,
  }) => {
    // About nine rows; oldest first, the new Book sorts last, below the fold.
    const server = await seededServer({ books: shelfOf(300) })
    await storeOnce(page, { [SORT_KEY]: 'dateAdded', [REVERSED_KEY]: REVERSED })
    await page.goto(`${server.url}/catalog`)
    await expect(sortToggle(page)).toHaveAccessibleName('Oldest first')
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 300 books')
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
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 301 books')
    await expect(spines(page).last()).toHaveAccessibleName('Swing Time by Zadie Smith, not read yet')
    await expect(added).toBeInViewport()
    await expect(page.getByRole('status')).toHaveText('Added Swing Time.')
    await expect(sortToggle(page)).toHaveAccessibleName('Oldest first')
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

  test('[P2] AC-8 the bookcase Tab stop stays on the last-focused Book across a press, and the arrows go on in the reversed order', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const kindred = spine(page, KINDRED)

    // Author A–Z: Kindred is the fourth spine.
    await tabIntoBookcase(page)
    await expect(spine(page, DUNE_UNREAD)).toBeFocused()
    for (let n = 0; n < 3; n++) await page.keyboard.press('ArrowRight')
    await expect(kindred).toBeFocused()

    // Z–A puts Kindred second, between Beloved and Emma.
    await sortToggle(page).click()
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(AUTHOR_Z_A)
    await expect(sortToggle(page)).toBeFocused()

    await tabIntoBookcase(page)
    await expect(kindred).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(spine(page, EMMA)).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(spine(page, BELOVED)).toBeFocused()
  })

  test('[P1] AC-9 the Catalog passes axe with the toggle natural and reversed, in both themes', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    const axe = async (where: string): Promise<string[]> => {
      const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      return violations.map(({ id, nodes }) => `${where}: ${id} (${nodes.length})`)
    }

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, forcedColors: 'none' })
      await page.goto(`${server.url}/catalog`)
      await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
      await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
      expect(await axe(`${colorScheme} natural`)).toEqual([])

      await sortToggle(page).click()
      await expect(sortToggle(page)).toHaveAccessibleName('Z–A')
      await expect.poll(() => spineOrder(bookcase(page))).toEqual(AUTHOR_Z_A)
      expect(await axe(`${colorScheme} reversed`)).toEqual([])
      // Back to natural for the next theme.
      await sortToggle(page).click()
      await expect(sortToggle(page)).toHaveAccessibleName('A–Z')
    }
  })

  test('[P2] AC-9 in the dark theme the focused select’s border and halo and the toggle’s ring use the accent’s dark twin', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: SORT_SHELF })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(`${server.url}/catalog`)
    await expect.poll(() => spineOrder(bookcase(page))).toEqual(BY_AUTHOR)
    const select = sortSelect(page)
    const toggle = sortToggle(page)

    await select.focus()
    await expect.poll(() => raisedHalf(sortGroup(page))).toBe('select')
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(select).toHaveCSS(`border-${side}-color`, ACCENT_DARK)
    }
    await expect(select).toHaveCSS('box-shadow', FOCUS_HALO_DARK)

    // The toggle's turn: its ring in the dark accent, the select back to its border.
    await page.keyboard.press('Tab')
    await expect(toggle).toBeFocused()
    await expect.poll(() => raisedHalf(sortGroup(page))).toBe('toggle')
    await expect(toggle).toHaveCSS('outline-style', 'solid')
    await expect(toggle).toHaveCSS('outline-width', '2px')
    await expect(toggle).toHaveCSS('outline-color', ACCENT_DARK)
    await expect(toggle).toHaveCSS('outline-offset', '2px')
    await expect(select).toHaveCSS('border-right-color', INPUT_BORDER_DARK)
    await expect(select).toHaveCSS('box-shadow', 'none')
  })
})
