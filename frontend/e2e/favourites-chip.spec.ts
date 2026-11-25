// Story 16.2 Show only my favourites (FR-31, FR-20, AR70, UX-DR103, UX-DR104):
// the Favourites chip first in the Catalog's filter row, how it ANDs with the
// other chips and Search titles in the bookcase, the list and the tiles, its
// empty state that a refetch never turns off, "Clear filters" focusing it, it
// not being remembered or applied to Home and the meter, and what an unstar
// with the chip on does to focus and the status line (CatalogPage's job), or
// leaves alone when the save fails.
//
// Books are seeded starred (`favourite: true`, Story 16.1's field), so no leaf
// needs a setup intent. A leaf whose criterion follows a press on the chip
// makes that press inside its first `expect.poll` with `pressOnceThen`, so the
// missing chip fails the criterion's assertion, not a click.

import type { Locator, Page } from '@playwright/test'
import { bookcase, bookRows, finished, popover, search, spine, spines, viewToggle } from './bookcase.ts'
import {
  addSwingTime,
  anySpine,
  chip,
  chipGroup,
  clearFilters,
  favouritesChip,
  main,
  recordStatus,
  spineNames,
  storageKeys,
  SWING,
  tagChip,
} from './catalog-filter.ts'
import { COULDNT_SAVE, favouriteStar, routeCouldntSave, starShape } from './favourite.ts'
import { expect, test } from './fixtures.ts'
import { slice } from './home.ts'
import { starBook } from './intents.ts'
import {
  ACCENT,
  bookId,
  designColor,
  designComponentValue,
  FAVOURITE,
  isFocused,
  pressOnceThen,
  rgbOf,
} from './library.ts'
import { storeTiles, tile, tileLinks, tileNames, tiles } from './tiles.ts'

/**
 * Six Books, three starred: two unread (Bleak House, Emma) and one finished
 * (Austerlitz). Under the default Author sort they stand Bleak House,
 * Dubliners, Emma, Flights, Candide, Austerlitz, so the starred ones are not
 * neighbours. "novel" is on three starred Books and Flights; "l" is in Bleak
 * House, Flights and Austerlitz, not in Emma.
 */
const FAVOURITES_SHELF = [
  {
    id: bookId(1),
    title: 'Austerlitz',
    authors: ['W. G. Sebald'],
    tags: ['novel'],
    readings: finished(),
    favourite: true,
  },
  { id: bookId(2), title: 'Candide', authors: ['Voltaire'], tags: ['classic'], readings: finished() },
  { id: bookId(3), title: 'Flights', authors: ['Olga Tokarczuk'], tags: ['novel'], readings: finished() },
  { id: bookId(4), title: 'Bleak House', authors: ['Charles Dickens'], tags: ['novel', 'classic'], favourite: true },
  { id: bookId(5), title: 'Dubliners', authors: ['James Joyce'], tags: ['stories'] },
  { id: bookId(6), title: 'Emma', authors: ['Jane Austen'], tags: ['novel', 'classic'], favourite: true },
]

/** The same six Books with nothing starred. */
const UNSTARRED_SHELF = FAVOURITES_SHELF.map((book) => ({ ...book, favourite: false }))

// Spine and tile names (AR71: a starred Book's name ends with ", favourite").
const AUSTERLITZ = 'Austerlitz by W. G. Sebald, finished, favourite'
const CANDIDE = 'Candide by Voltaire, finished'
const FLIGHTS = 'Flights by Olga Tokarczuk, finished'
const BLEAK_HOUSE = 'Bleak House by Charles Dickens, not read yet, favourite'
const DUBLINERS = 'Dubliners by James Joyce, not read yet'
const EMMA = 'Emma by Jane Austen, not read yet, favourite'

const BY_AUTHOR = [BLEAK_HOUSE, DUBLINERS, EMMA, FLIGHTS, CANDIDE, AUSTERLITZ]
const STARRED = [BLEAK_HOUSE, EMMA, AUSTERLITZ]

const NO_MATCH = 'No books match these filters.'

/** The status texts recorded so far, without the empty ones each announcement starts with. */
async function spoken(announced: () => Promise<string[]>): Promise<string[]> {
  return (await announced()).filter((text) => text !== '')
}

/** A List row's title link, found by the row's title. */
function rowTitleLink(page: Page, title: string): Locator {
  return bookRows(page)
    .filter({ has: page.getByRole('link', { name: title, exact: true }) })
    .getByRole('link', { name: title, exact: true })
}

test.describe('Story 16.2 Show only my favourites (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
  })

  // Red phase: there is no Favourites chip.
  test.skip('[P1] AC-1 the filter row starts with a lone "Favourites" toggle with a leading gold aria-hidden star, before Status, in no group and with no popup, shown even when nothing is starred', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    // The row is drawn: the shipped Status group is there.
    await expect(chipGroup(page, 'Status')).toBeVisible()
    const favourites = favouritesChip(page)

    // The criterion.
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')

    // A lone toggle: in no role="group", no popup.
    expect(await favourites.evaluate((button) => button.closest('[role="group"]') === null)).toBe(true)
    await expect(favourites).not.toHaveAttribute('aria-haspopup', /.*/)
    await expect(favourites).not.toHaveAttribute('aria-expanded', /.*/)
    await expect(favourites).toHaveText('Favourites')
    // First in the row: before the Status group in the DOM, to its left on the same line.
    const statusGroup = await chipGroup(page, 'Status').elementHandle()
    expect(
      await favourites.evaluate(
        (button, status) => Boolean(button.compareDocumentPosition(status!) & Node.DOCUMENT_POSITION_FOLLOWING),
        statusGroup,
      ),
    ).toBe(true)
    const chipBox = (await favourites.boundingBox())!
    const statusBox = (await chipGroup(page, 'Status').boundingBox())!
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(statusBox.x)
    expect(chipBox.y).toBeLessThan(statusBox.y + statusBox.height)
    expect(chipBox.y + chipBox.height).toBeGreaterThan(statusBox.y)
    // A leading star: the button's first element child is an aria-hidden SVG,
    // `row-size` wide, filled gold while the chip is off.
    expect(await favourites.evaluate((button) => button.firstElementChild?.tagName.toLowerCase())).toBe('svg')
    await expect(favourites.locator('svg').first()).toHaveAttribute('aria-hidden', 'true')
    await expect(starShape(favourites)).toHaveCSS('fill', FAVOURITE)
    const starBox = (await favourites.locator('svg').first().boundingBox())!
    expect(starBox.width).toBeCloseTo(Number.parseFloat(designComponentValue('favourite-star', 'row-size')), 0)

    // Shown and enabled when no Book is starred.
    const unstarred = await seededServer({ books: UNSTARRED_SHELF })
    await page.goto(`${unstarred.url}/catalog`)
    await expect(chipGroup(page, 'Status')).toBeVisible()
    await expect(favouritesChip(page)).toBeVisible()
    await expect(favouritesChip(page)).toBeEnabled()
    await expect(favouritesChip(page)).toHaveAttribute('aria-pressed', 'false')
  })

  // Red phase: there is no Favourites chip to press.
  test.skip('[P0] AC-2 Favourites on shows only the starred Books in the bookcase, the list and the tiles, announces "3 books match.", ANDs with Unread and with a Tag and Search titles, and turns off again', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const favourites = favouritesChip(page)
    const status = page.getByRole('status')

    // The criterion: pressed, it reads aria-pressed="true".
    await expect.poll(pressOnceThen(favourites, () => favourites.getAttribute('aria-pressed'))).toBe('true')

    // The selected chip style, and the check glyph before the star.
    await expect(favourites).toHaveCSS('background-color', rgbOf(designColor('accent-soft')))
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(favourites).toHaveCSS(`border-${side}-width`, '2px')
      await expect(favourites).toHaveCSS(`border-${side}-color`, ACCENT)
    }
    expect(
      await favourites.evaluate((button) => {
        // A ::before check comes before every child; a check in the DOM must precede the star's SVG.
        if (getComputedStyle(button, '::before').content.includes('✓')) return true
        const svg = button.querySelector('svg')
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if ((node.textContent ?? '').includes('✓')) {
            return svg !== null && Boolean(node.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING)
          }
        }
        return false
      }),
    ).toBe(true)
    await expect(favourites).toHaveText('Favourites')

    // Only the starred Books, the others hidden (the shelf closes up), and the count.
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await expect(status).toHaveText('3 books match.')
    await expect(anySpine(page, DUBLINERS)).toBeHidden()
    await expect(anySpine(page, FLIGHTS)).toBeHidden()
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Bleak House/, /^Emma/, /^Austerlitz/])
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(tileLinks(page)).toHaveCount(3)
    expect(await tileNames(page)).toEqual(STARRED)
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)

    // AND Unread: the starred unread Books (Unread alone would add Dubliners).
    await chip(page, 'Status', 'Unread').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, EMMA])
    await expect(status).toHaveText('2 books match.')
    await chip(page, 'Status', 'Unread').click()

    // AND a Tag and Search titles: "novel" and "l" alone would add Flights.
    await tagChip(page).click()
    await page.getByRole('checkbox', { name: 'novel', exact: true }).check()
    await page.keyboard.press('Escape')
    await search(page).fill('l')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, AUSTERLITZ])

    // Off again: every Book the Tag and the search keep, Flights back.
    await favourites.click()
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, FLIGHTS, AUSTERLITZ])
    await search(page).fill('')
    await clearFilters(page).click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
  })

  // Red phase: there is no Favourites chip to press.
  test.skip('[P1] AC-3 Favourites on with nothing starred shows "No books match these filters." with "Clear filters", and a refetch never turns it off', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: UNSTARRED_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const favourites = favouritesChip(page)
    const noMatch = main(page).getByText(NO_MATCH, { exact: true })

    // The criterion: pressed with nothing starred, the empty state shows.
    await expect.poll(pressOnceThen(favourites, () => noMatch.count())).toBe(1)

    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
    await expect(favourites).toBeEnabled()
    await expect(bookcase(page)).toBeHidden()
    // The row's link and the shelf area's link.
    await expect(clearFilters(page)).toHaveCount(2)
    await expect(page.getByRole('status')).toHaveText('0 books match.')

    // A refetch with nothing starred keeps it on.
    const refetched = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/views/catalog')
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await refetched
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
    await expect(noMatch).toBeVisible()

    // Starred elsewhere (another tab, the agent's view of it): the next refetch
    // applies the chip to the fresh data, so only that Book shows.
    await starBook(page.request, server, bookId(5))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect.poll(() => spineNames(bookcase(page))).toEqual([`${DUBLINERS}, favourite`])
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
    await expect(noMatch).toHaveCount(0)
  })

  // Red phase: there is no Favourites chip, so Clear filters focuses Read.
  test.skip('[P1] AC-4 "Clear filters" turns every chip off, Favourites included, and focuses the Favourites chip', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const favourites = favouritesChip(page)
    // Unread on first, so the row's Clear filters is already there.
    await chip(page, 'Status', 'Unread').click()
    await expect(clearFilters(page)).toHaveCount(1)

    // The criterion: Favourites on, then Clear filters; focus on the chip, which is off.
    await expect
      .poll(
        pressOnceThen(
          favourites,
          pressOnceThen(clearFilters(page), async () => ({
            focused: await isFocused(favourites),
            pressed: await favourites.getAttribute('aria-pressed'),
          })),
        ),
      )
      .toEqual({ focused: true, pressed: 'false' })

    await expect(chip(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)
    await expect(clearFilters(page)).toHaveCount(0)

    // Favourites alone: the same.
    await favourites.click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await clearFilters(page).click()
    await expect(favourites).toBeFocused()
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')

    // The shelf area's link in the empty state: Favourites and Ebook match nothing.
    await favourites.click()
    await chip(page, 'Type', 'Ebook').click()
    await expect(main(page).getByText(NO_MATCH, { exact: true })).toBeVisible()
    await clearFilters(page).last().click()
    await expect(favourites).toBeFocused()
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    await expect(chip(page, 'Type', 'Ebook')).toHaveAttribute('aria-pressed', 'false')
  })

  // Red phase: there is no Favourites chip to press.
  test.skip('[P1] AC-5 Favourites is off after leaving Catalog and coming back, a reload or an add, is never stored, and never changes Home’s slice or the meter', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const before = await storageKeys(page)
    const favourites = favouritesChip(page)
    const nav = page.getByRole('banner').getByRole('navigation')
    const home = nav.getByRole('link', { name: 'Home', exact: true })
    const catalog = nav.getByRole('link', { name: 'Catalog', exact: true })
    const meter = main(page).getByRole('progressbar', { name: 'Books finished', exact: true })

    // The criterion: on, then Home and back to Catalog, it reads off.
    await expect
      .poll(
        pressOnceThen(
          favourites,
          pressOnceThen(
            home,
            pressOnceThen(catalog, async () =>
              (await favourites.count()) === 1 ? favourites.getAttribute('aria-pressed') : null,
            ),
          ),
        ),
      )
      .toBe('false')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(BY_AUTHOR)

    // The meter counts the whole library while it is on, and nothing is stored.
    await favourites.click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await expect(meter).toHaveAttribute('aria-valuetext', '3 of 6 finished')
    expect(await storageKeys(page)).toEqual(before)

    // A reload turns it off.
    await page.reload()
    await expect(spines(page)).toHaveCount(6)
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    expect(await storageKeys(page)).toEqual(before)

    // Home's slice shows every Book while the chip was on in Catalog.
    await favourites.click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await home.click()
    await expect.poll(() => spineNames(slice(page))).toEqual(BY_AUTHOR)

    // An add turns it off (Swing Time isn't starred, so the chip would hide it).
    await catalog.click()
    await expect(spines(page)).toHaveCount(6)
    await favourites.click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await addSwingTime(page)
    await expect(spine(page, SWING)).toBeFocused()
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    await expect(spines(page)).toHaveCount(7)
  })

  // Red phase: there is no Favourites chip, so nothing hides the unstarred Book.
  test.skip('[P0] AC-6 unstarring a tile or a row with Favourites on hides it and CatalogPage moves focus to the next shown Book, else the previous, else Search titles, with one "*Title* is not a favourite. N books match." line', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    const favourites = favouritesChip(page)
    const emmaStar = favouriteStar(tiles(page), 'Favourite Emma')

    // The criterion: Favourites on, then Emma's tile star; focus on the next
    // shown Book's tile link, and the star line and the count as one message.
    await expect
      .poll(
        pressOnceThen(
          favourites,
          pressOnceThen(emmaStar, async () => ({
            focused: await isFocused(tile(page, AUSTERLITZ)),
            said: await spoken(announced),
          })),
        ),
      )
      .toEqual({ focused: true, said: ['3 books match.', 'Emma is not a favourite. 2 books match.'] })

    await expect(tileLinks(page)).toHaveCount(2)
    expect(await tileNames(page)).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')

    // List: the last row's star moves focus to the previous row's title link.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Bleak House/, /^Austerlitz/])
    await favouriteStar(bookRows(page), 'Favourite Austerlitz').click()
    await expect(bookRows(page)).toHaveText([/^Bleak House/])
    await expect(rowTitleLink(page, 'Bleak House')).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Austerlitz is not a favourite. 1 book matches.')
    expect(await spoken(announced)).not.toContain('Austerlitz is not a favourite.')

    // The last shown Book: focus goes to Search titles, and the empty state shows.
    await favouriteStar(bookRows(page), 'Favourite Bleak House').click()
    await expect(main(page).getByText(NO_MATCH, { exact: true })).toBeVisible()
    await expect(search(page)).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Bleak House is not a favourite. 0 books match.')
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
  })

  // Red phase: there is no Favourites chip, so the unstarred spine stays and the popover stays open.
  test.skip('[P0] AC-7 unstarring from the Spine popover with Favourites on closes the popover with its spine and focuses the next shown spine, with the same one message', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    const favourites = favouritesChip(page)
    const card = popover(page, 'Emma')

    // The criterion: Favourites on, Emma's spine opened, its popover's star
    // pressed; the popover is gone, the next shown spine has focus, one message.
    await expect
      .poll(
        pressOnceThen(
          favourites,
          pressOnceThen(
            spine(page, EMMA),
            pressOnceThen(favouriteStar(card), async () => ({
              open: await card.count(),
              focused: await isFocused(spine(page, AUSTERLITZ)),
              said: await spoken(announced),
            })),
          ),
        ),
      )
      .toEqual({ open: 0, focused: true, said: ['3 books match.', 'Emma is not a favourite. 2 books match.'] })

    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await expect(anySpine(page, EMMA)).toHaveCount(0)
    await expect(anySpine(page, 'Emma by Jane Austen, not read yet')).toBeHidden()
  })

  // Red phase: there is no Favourites chip to press.
  test.skip('[P1] AC-8 a failed unstar with Favourites on leaves the Book shown and starred, with the couldn’t-save line where Story 16.1 puts it', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await routeCouldntSave(page)
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    const favourites = favouritesChip(page)
    const emmaStar = favouriteStar(tiles(page), 'Favourite Emma')
    const alert = page.getByRole('alert')

    // The criterion: Favourites on, Emma's star pressed, the save fails.
    await expect
      .poll(
        pressOnceThen(
          favourites,
          pressOnceThen(emmaStar, async () => (await alert.textContent())?.trim()),
        ),
      )
      .toBe(COULDNT_SAVE)

    // Still shown and starred, focus kept, no star line or new count.
    await expect(tileLinks(page)).toHaveCount(3)
    expect(await tileNames(page)).toEqual(STARRED)
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'true')
    await expect(emmaStar).toBeFocused()
    expect(await spoken(announced)).toEqual(['3 books match.'])
    // Once, under the filter row and above the grid (Story 16.1's Tiles place).
    const line = main(page).getByText(COULDNT_SAVE, { exact: true })
    await expect(line).toHaveCount(1)
    const rowBox = (await chipGroup(page, 'Status').locator('xpath=..').boundingBox())!
    const lineBox = (await line.boundingBox())!
    const gridBox = (await tiles(page).boundingBox())!
    expect(lineBox.y).toBeGreaterThanOrEqual(rowBox.y + rowBox.height - 1)
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(gridBox.y + 1)

    // In an open Spine popover: the line inside it, which stays open over its spine.
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
    await spine(page, EMMA).click()
    const card = popover(page, 'Emma')
    await favouriteStar(card).click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    await expect(card).toBeVisible()
    await expect(favouriteStar(card)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)
  })

  // Red phase: Tab from New book lands on Read, since there is no Favourites chip.
  test.skip('[P1] AC-9 with Favourites off the toolbar’s Tab order runs New book, Favourites, then Read, and the other chips filter as before, starred Books included', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const favourites = favouritesChip(page)

    await page.getByRole('button', { name: 'New book', exact: true }).focus()
    await page.keyboard.press('Tab')

    // The criterion: the first chip in Tab order is Favourites.
    await expect(favourites).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(chip(page, 'Status', 'Read')).toBeFocused()
    // Off, it filters nothing: Unread keeps the starred unread Books and Dubliners.
    await expect(favourites).toHaveAttribute('aria-pressed', 'false')
    await chip(page, 'Status', 'Unread').click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, DUBLINERS, EMMA])
    await expect(page.getByRole('status')).toHaveText('3 books match.')
  })
})
