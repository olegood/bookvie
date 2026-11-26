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

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { bookcase, bookRows, popover, search, spine, spines, viewToggle } from './bookcase.ts'
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
import { systemColor } from './dev-mode.ts'
import { COULDNT_SAVE, favouriteStar, routeCouldntSave, starShape } from './favourite.ts'
import { expect, test } from './fixtures.ts'
import { slice } from './home.ts'
import { SET_FAVOURITE, starBook } from './intents.ts'
import {
  ACCENT,
  ACCENT_DARK,
  bookId,
  designColor,
  designComponentValue,
  FAVOURITE,
  FAVOURITE_DARK,
  isFocused,
  pressOnceThen,
  rgbOf,
  sortSelect,
} from './library.ts'
import { sortToggle } from './sort-direction.ts'
import {
  AUSTERLITZ,
  BLEAK_HOUSE,
  BY_AUTHOR,
  DUBLINERS,
  EMMA,
  FAVOURITES_SHELF,
  FLIGHTS,
  spoken,
  STARRED,
} from './favourites-shelf.ts'
import { afterAnnounceDelay } from './stats.ts'
import { storeTiles, tile, tileLinks, tileNames, tiles } from './tiles.ts'

/** The same six Books with nothing starred. */
const UNSTARRED_SHELF = FAVOURITES_SHELF.map((book) => ({ ...book, favourite: false }))

const NO_MATCH = 'No books match these filters.'

/**
 * `read` once the chip's count has been set (`afterAnnounceDelay`), as a
 * person would hear it before the next press: a press sooner empties the
 * regions and cancels it, as every save does.
 */
function afterCount<T>(page: Page, read: () => Promise<T>): () => Promise<T> {
  return async () => {
    await afterAnnounceDelay(page)
    return read()
  }
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

  test('[P1] AC-1 the filter row starts with a lone "Favourites" toggle with a leading gold aria-hidden star, before Status, in no group and with no popup, shown even when nothing is starred', async ({
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

    // Dark: the chip's star is filled favourite-dark.
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload()
    await expect(favouritesChip(page)).toBeVisible()
    await expect(starShape(favouritesChip(page))).toHaveCSS('fill', FAVOURITE_DARK)

    // Forced colors: forced-color-adjust none and a CanvasText fill (as 16.1's AC-13).
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.reload()
    await expect(favouritesChip(page)).toBeVisible()
    const canvasText = await systemColor(page, 'CanvasText')
    await expect(favouritesChip(page).locator('svg').first()).toHaveCSS('forced-color-adjust', 'none')
    await expect(starShape(favouritesChip(page))).toHaveCSS('fill', canvasText)
  })

  test('[P0] AC-2 Favourites on shows only the starred Books in the bookcase, the list and the tiles, announces "3 books match.", ANDs with Unread and with a Tag and Search titles, and turns off again', async ({
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
    // On, the star stays filled gold (on or off, DESIGN.md → Filter chips).
    await expect(starShape(favourites)).toHaveCSS('fill', FAVOURITE)
    await expect(starShape(favourites)).toHaveCSS('stroke', FAVOURITE)

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

  test('[P1] AC-3 Favourites on with nothing starred shows "No books match these filters." with "Clear filters", and a refetch never turns it off', async ({
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

  test('[P1] AC-4 "Clear filters" turns every chip off, Favourites included, and focuses the Favourites chip', async ({
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

  test('[P1] AC-5 Favourites is off after leaving Catalog and coming back, a reload or an add, is never stored, and never changes Home’s slice or the meter', async ({
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

  test('[P0] AC-6 unstarring a tile or a row with Favourites on hides it and CatalogPage moves focus to the next shown Book, else the previous, else Search titles, with one "*Title* is not a favourite. N books match." line', async ({
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
          afterCount(
            page,
            pressOnceThen(emmaStar, async () => ({
              focused: await isFocused(tile(page, AUSTERLITZ)),
              said: await spoken(announced),
            })),
          ),
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

  test('[P0] AC-7 unstarring from the Spine popover with Favourites on closes the popover with its spine and focuses the next shown spine, with the same one message', async ({
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
          afterCount(
            page,
            pressOnceThen(
              spine(page, EMMA),
              pressOnceThen(favouriteStar(card), async () => ({
                open: await card.count(),
                focused: await isFocused(spine(page, AUSTERLITZ)),
                said: await spoken(announced),
              })),
            ),
          ),
        ),
      )
      .toEqual({ open: 0, focused: true, said: ['3 books match.', 'Emma is not a favourite. 2 books match.'] })

    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, AUSTERLITZ])
    await expect(anySpine(page, EMMA)).toHaveCount(0)
    await expect(anySpine(page, 'Emma by Jane Austen, not read yet')).toBeHidden()
  })

  test('[P1] AC-8 a failed unstar with Favourites on leaves the Book shown and starred, with the couldn’t-save line where Story 16.1 puts it', async ({
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
          afterCount(
            page,
            pressOnceThen(emmaStar, async () => (await alert.textContent())?.trim()),
          ),
        ),
      )
      .toBe(COULDNT_SAVE)

    // Still shown and starred, focus kept, no star line or new count.
    await expect(tileLinks(page)).toHaveCount(3)
    expect(await tileNames(page)).toEqual(STARRED)
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'true')
    await expect(emmaStar).toBeFocused()
    // Nothing said for the save yet: the press emptied the region and the combined line waits.
    await expect(page.getByRole('status')).toHaveText('')
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

  test('[P1] AC-9 with Favourites off the toolbar’s Tab order runs New book, Favourites, then Read, and the other chips filter as before, starred Books included', async ({
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

test.describe('Story 16.2 Show only my favourites (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P2] AC-1 the chip passes axe off and on in both themes, its check sits before the star in dark, and under forced colors the pressed chip keeps its Highlight border and a CanvasText check and star', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    const favourites = favouritesChip(page)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(`${server.url}/catalog`)
      await expect(spines(page)).toHaveCount(6)
      for (const pressed of ['false', 'true']) {
        if (pressed === 'true') await favourites.click()
        await expect(favourites).toHaveAttribute('aria-pressed', pressed)
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(violations.map(({ id, nodes }) => `${colorScheme} ${pressed}: ${id} (${nodes.length})`)).toEqual([])
      }
    }

    // Dark, on: the check comes first, in accent-dark, then the star in favourite-dark.
    await expect(favourites).toHaveCSS('border-top-color', ACCENT_DARK)
    expect(await favourites.evaluate((button) => getComputedStyle(button, '::before').content)).toContain('✓')
    const checkColor = await favourites.evaluate((button) => getComputedStyle(button, '::before').color)
    expect(checkColor).toBe(ACCENT_DARK)
    await expect(starShape(favourites)).toHaveCSS('fill', FAVOURITE_DARK)
    const textLeft = await favourites.evaluate((button) => {
      const range = document.createRange()
      range.selectNodeContents(button.lastChild!)
      return range.getBoundingClientRect().left
    })
    const starBox = (await favourites.locator('svg').first().boundingBox())!
    const chipBox = (await favourites.boundingBox())!
    // The ::before check takes the room between the chip's start and the star.
    expect(starBox.x - chipBox.x).toBeGreaterThan(
      Number.parseFloat(await favourites.evaluate((b) => getComputedStyle(b).paddingLeft)) + 1,
    )
    expect(starBox.x + starBox.width).toBeLessThanOrEqual(textLeft)

    // Forced colors, on: the Highlight border at the indicator width, the check and the star in CanvasText.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.reload()
    await expect(spines(page)).toHaveCount(6)
    await favourites.click()
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
    const highlight = await systemColor(page, 'Highlight')
    const canvasText = await systemColor(page, 'CanvasText')
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(favourites).toHaveCSS(`border-${side}-width`, '2px')
      await expect(favourites).toHaveCSS(`border-${side}-color`, highlight)
    }
    expect(await favourites.evaluate((button) => getComputedStyle(button, '::before').color)).toBe(canvasText)
    await expect(starShape(favourites)).toHaveCSS('fill', canvasText)
  })

  test('[P2] AC-2 Favourites keeps the sort: Title A–Z and Z–A order the starred Books the same in the list and the tiles', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    await favouritesChip(page).click()
    await sortSelect(page).selectOption('title')
    await expect.poll(() => spineNames(bookcase(page))).toEqual([AUSTERLITZ, BLEAK_HOUSE, EMMA])

    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Austerlitz/, /^Bleak House/, /^Emma/])
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(tileLinks(page)).toHaveCount(3)
    expect(await tileNames(page)).toEqual([AUSTERLITZ, BLEAK_HOUSE, EMMA])

    // Reversed: Z–A in the tiles and the list, still only the starred Books.
    await sortToggle(page).click()
    await expect.poll(() => tileNames(page)).toEqual([EMMA, BLEAK_HOUSE, AUSTERLITZ])
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Emma/, /^Bleak House/, /^Austerlitz/])
    await expect(favouritesChip(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('[P2] AC-3 with nothing starred, Favourites on shows the empty state in the list and the tiles too', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: UNSTARRED_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    await favouritesChip(page).click()
    const noMatch = main(page).getByText(NO_MATCH, { exact: true })

    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(noMatch).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(clearFilters(page)).toHaveCount(2)

    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(noMatch).toBeVisible()
    await expect(tileLinks(page)).toHaveCount(0)
    await expect(clearFilters(page)).toHaveCount(2)
    await expect(favouritesChip(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('[P2] AC-6 Tiles: the last shown tile moves focus to the previous tile, the only one to Search titles; List: the first row moves it to the next row', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    await favouritesChip(page).click()
    await expect(tileLinks(page)).toHaveCount(3)

    // List first: Bleak House's row (first shown) moves focus to Emma's title link.
    await viewToggle(page).getByRole('button', { name: 'List', exact: true }).click()
    await expect(bookRows(page)).toHaveText([/^Bleak House/, /^Emma/, /^Austerlitz/])
    await favouriteStar(bookRows(page), 'Favourite Bleak House').click()
    await expect(bookRows(page)).toHaveText([/^Emma/, /^Austerlitz/])
    await expect(rowTitleLink(page, 'Emma')).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Bleak House is not a favourite. 2 books match.')

    // Tiles: Austerlitz (last shown) moves focus to Emma's tile, the one before it.
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(tileLinks(page)).toHaveCount(2)
    await favouriteStar(tiles(page), 'Favourite Austerlitz').click()
    await expect(tileLinks(page)).toHaveCount(1)
    await expect(tile(page, EMMA)).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Austerlitz is not a favourite. 1 book matches.')

    // The only shown tile: focus to Search titles, the empty state shows.
    await favouriteStar(tiles(page), 'Favourite Emma').click()
    await expect(main(page).getByText(NO_MATCH, { exact: true })).toBeVisible()
    await expect(search(page)).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Emma is not a favourite. 0 books match.')
    // The star flow's own line was never spoken for these three.
    for (const title of ['Bleak House', 'Austerlitz', 'Emma']) {
      expect(await spoken(announced)).not.toContain(`${title} is not a favourite.`)
    }
  })

  test('[P2] AC-7 with Favourites on, Esc and Tab out of a Spine popover still close it, and an unstar from the last spine’s popover focuses the previous spine, from the only one Search titles', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(6)
    const announced = await recordStatus(page)
    await favouritesChip(page).click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual(STARRED)

    // Esc and Tab from the last control close it, focus back on the spine.
    const emma = spine(page, EMMA)
    const emmaCard = popover(page, 'Emma')
    await emma.click()
    await expect(emmaCard).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(emmaCard).toBeHidden()
    await expect(emma).toBeFocused()
    await page.keyboard.press('Enter')
    const close = emmaCard.getByRole('button', { name: 'Close', exact: true })
    await close.focus()
    await page.keyboard.press('Tab')
    await expect(emmaCard).toBeHidden()
    await expect(emma).toBeFocused()

    // The last shown spine, Austerlitz: focus to Emma's spine, the previous one.
    await spine(page, AUSTERLITZ).click()
    const austerlitzCard = popover(page, 'Austerlitz')
    await favouriteStar(austerlitzCard).click()
    await expect(austerlitzCard).toHaveCount(0)
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE, EMMA])
    await expect(emma).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Austerlitz is not a favourite. 2 books match.')

    // Down to one, then the only shown spine: focus to Search titles.
    await emma.click()
    await favouriteStar(emmaCard).click()
    await expect.poll(() => spineNames(bookcase(page))).toEqual([BLEAK_HOUSE])
    await spine(page, BLEAK_HOUSE).click()
    const bleakCard = popover(page, 'Bleak House')
    await favouriteStar(bleakCard).click()
    await expect(bleakCard).toHaveCount(0)
    await expect(main(page).getByText(NO_MATCH, { exact: true })).toBeVisible()
    await expect(search(page)).toBeFocused()
    await expect.poll(() => spoken(announced)).toContain('Bleak House is not a favourite. 0 books match.')
  })

  test('[P2] AC-8 with bookvie stopped, an unstar with Favourites on keeps the tile shown, starred and focused, and the next filter change empties the couldn’t-save line while the chip stays on', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: FAVOURITES_SHELF })
    // bookvie stopped: the request never reaches a server.
    await page.route(`**${SET_FAVOURITE}`, (route) => route.abort('connectionrefused'))
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(6)
    const favourites = favouritesChip(page)
    await favourites.click()
    await expect(tileLinks(page)).toHaveCount(3)
    const emmaStar = favouriteStar(tiles(page), 'Favourite Emma')

    await emmaStar.click()
    await expect(page.getByRole('alert')).toHaveText(COULDNT_SAVE)
    await expect(main(page).getByText(COULDNT_SAVE, { exact: true })).toHaveCount(1)
    expect(await tileNames(page)).toEqual(STARRED)
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'true')
    await expect(emmaStar).toBeFocused()

    // The next filter change (Unread) empties it; Favourites stays on.
    await chip(page, 'Status', 'Unread').click()
    await expect(page.getByRole('alert')).toHaveText('')
    await expect(main(page).getByText(COULDNT_SAVE, { exact: true })).toHaveCount(0)
    await expect(favourites).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => tileNames(page)).toEqual([BLEAK_HOUSE, EMMA])
  })
})
