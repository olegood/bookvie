// Story 16.1 Star a Book (FR-31, AR71, AR72, UX-DR95–UX-DR102): the favourite
// star on Book detail, its couldn't-save line, the star on a Catalog tile and a
// List row (outline only on hover or focus), the spine's favourite mark, name
// and legend item, the star in the Spine popover and its focus order, the gold
// token and forced colors, and Home's slice and meter left as they were. What
// set-favourite does to the library (no-op, 409, 422, migration, edits keep the
// star, backup) is proven at API level in backend/tests/test_favourite.py.
//
// Each leaf stars its Books with `starBook` (set-favourite, its answer
// unread) after seeding them.

import type { Locator, Page } from '@playwright/test'
import { bookcase, bookRows, finished, search, shelfOf, spine, spines, viewToggle } from './bookcase.ts'
import { chip, chipGroup, spineNames } from './catalog-filter.ts'
import { systemColor } from './dev-mode.ts'
import { favouriteStar, spineMark, starDrawn, starShape } from './favourite.ts'
import { expect, test } from './fixtures.ts'
import { LEFT_HAND_ID, mainAt, slice, sliceRows, sliceSpines } from './home.ts'
import { intentOf, requestsTo, SET_FAVOURITE, starBook } from './intents.ts'
import {
  ACCENT,
  ACCENT_DARK,
  bookId,
  designColor,
  designComponentValue,
  DUNE_ID,
  FAVOURITE,
  FAVOURITE_DARK,
  firstLineRect,
  INK_SECONDARY,
  pressOnceThen,
  rowHeightWithout,
  SPINE_LABEL_STRIP,
} from './library.ts'
import { coverBox, storeTiles, tileLinks, tiles } from './tiles.ts'

const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."
const COULDNT_SAVE_BODY = JSON.stringify({
  error: { kind: 'couldnt_save', code: 'couldnt_save', message: COULDNT_SAVE },
})

/** Unread. The default Author sort (the author string, collated) puts it before Emma. */
const DUNE = { id: DUNE_ID, title: 'Dune', subtitle: 'Book One', authors: ['Frank Herbert'], pages: 412, year: 1965 }
/** Finished, so its tile has the ribbon and its spine is filled. */
const EMMA = { id: bookId(2), title: 'Emma', authors: ['Jane Austen'], pages: 400, readings: finished(400) }

/** DESIGN.md `components.favourite-star` sizes, in px, read where DESIGN.md writes them. */
function starSize(key: string): number {
  return Number.parseFloat(designComponentValue('favourite-star', key))
}

/** Every set-favourite request answers 503 couldn't-save. */
async function routeCouldntSave(page: Page): Promise<void> {
  await page.route(`**${SET_FAVOURITE}`, (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: COULDNT_SAVE_BODY }),
  )
}

/** The tile's list item whose link name starts with `prefix` ("Emma by Jane Austen, "), starred or not. */
function tileItemStarting(page: Page, prefix: string): Locator {
  return tiles(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: new RegExp(`^${prefix}`) }) })
}

/** The Spine popover: a non-modal `dialog` named by the Book's title. */
function popover(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: title, exact: true })
}

/** The bookcase legend: the parent of its "Main book, filled to its %" item. */
function legend(page: Page): Locator {
  return page.getByRole('main').getByText('Main book, filled to its %', { exact: true }).locator('xpath=..')
}

test.describe('Story 16.1 Star a Book (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-7 Book detail: a "Favourite" toggle after the h1 stars and unstars once the save succeeds, never optimistically, and a second press before the refetch sends the same value', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, EMMA] })
    const sent = requestsTo(page, SET_FAVOURITE)
    // Each save is held until `release()`, so the leaf can look before it succeeds.
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(`**${SET_FAVOURITE}`, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const heading = page.getByRole('heading', { level: 1, name: 'Dune', exact: true })
    await expect(heading).toBeVisible()
    const star = favouriteStar(page.getByRole('main'))

    // The criterion.
    await expect(star).toHaveAttribute('aria-pressed', 'false')

    // A plain icon button: no text, an aria-hidden icon, an outline star.
    await expect(star).toHaveText('')
    await expect(star.locator('svg').first()).toHaveAttribute('aria-hidden', 'true')
    await expect(starShape(star)).toHaveCSS('fill', 'none')
    await expect(starShape(star)).toHaveCSS('stroke', INK_SECONDARY)
    // After the h1, not inside it, centred on its first line, right of its text.
    await expect(heading.getByRole('button')).toHaveCount(0)
    expect(
      await star.evaluate((button) => {
        const h1 = document.querySelector('main h1')!
        return Boolean(h1.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
      }),
    ).toBe(true)
    const line = await firstLineRect(heading)
    const box = (await star.boundingBox())!
    expect(Math.abs(box.y + box.height / 2 - (line.y + line.height / 2))).toBeLessThanOrEqual(line.height / 2)
    expect(box.x).toBeGreaterThanOrEqual(line.x + line.width)

    // Nothing changes before the save succeeds; the button stays enabled, and a
    // second press sends the same value again.
    await star.click()
    await expect.poll(() => sent.length).toBe(1)
    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await expect(starShape(star)).toHaveCSS('fill', 'none')
    await expect(star).toBeEnabled()
    await expect(page.getByRole('status')).toHaveText('')
    await star.click()
    await expect.poll(() => sent.length).toBe(2)
    expect(sent.map(intentOf)).toEqual([
      { bookId: DUNE_ID, favourite: true },
      { bookId: DUNE_ID, favourite: true },
    ])
    await expect(star).toHaveAttribute('aria-pressed', 'false')

    // Once saved and refetched: gold, pressed, announced, focus kept.
    release()
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    await expect(starShape(star)).toHaveCSS('fill', FAVOURITE)
    await expect(page.getByRole('status')).toHaveText('Dune is a favourite.')
    await expect(star).toBeFocused()

    // Pressing again unstars it.
    await star.click()
    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('status')).toHaveText('Dune is not a favourite.')
    await expect(starShape(star)).toHaveCSS('fill', 'none')
    expect(sent).toHaveLength(3)
    expect(intentOf(sent[2]!)).toEqual({ bookId: DUNE_ID, favourite: false })
  })

  test("[P1] AC-8 a star press that couldn't be saved leaves the star as it was and shows the line under the title row, once under the filter row on Tiles, and in an open popover", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE, EMMA] })
    await routeCouldntSave(page)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const main = page.getByRole('main')
    const heading = page.getByRole('heading', { level: 1, name: 'Dune', exact: true })
    await expect(heading).toBeVisible()
    const star = favouriteStar(main)
    const alert = page.getByRole('alert')

    // The criterion: the press is made inside the poll, so the missing star fails here.
    await expect.poll(pressOnceThen(star, async () => (await alert.textContent())?.trim())).toBe(COULDNT_SAVE)

    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await expect(star).toBeFocused()
    await expect(page.getByRole('status')).toHaveText('')
    // Under the title row: below the h1 and the star.
    const failure = main.getByText(COULDNT_SAVE, { exact: true })
    await expect(failure).toBeVisible()
    const failureBox = (await failure.boundingBox())!
    const headingBox = (await heading.boundingBox())!
    const starBox = (await star.boundingBox())!
    expect(failureBox.y).toBeGreaterThanOrEqual(
      Math.max(headingBox.y + headingBox.height, starBox.y + starBox.height) - 1,
    )

    // The next save attempt empties it.
    await page.unroute(`**${SET_FAVOURITE}`)
    await star.click()
    await expect(alert).toHaveText('')
    await expect(star).toHaveAttribute('aria-pressed', 'true')

    // Tiles: once, under the filter row and above the grid; focus stays on the star.
    await routeCouldntSave(page)
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(2)
    const emmaStar = favouriteStar(tileItemStarting(page, 'Emma by Jane Austen, '), 'Favourite Emma')
    await emmaStar.focus()
    await page.keyboard.press('Enter')
    await expect(alert).toHaveText(COULDNT_SAVE)
    await expect(main.getByText(COULDNT_SAVE, { exact: true })).toHaveCount(1)
    await expect(emmaStar).toBeFocused()
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'false')
    const rowBox = (await chipGroup(page, 'Status').locator('xpath=..').boundingBox())!
    const lineBox = (await main.getByText(COULDNT_SAVE, { exact: true }).boundingBox())!
    const gridBox = (await tiles(page).boundingBox())!
    expect(lineBox.y).toBeGreaterThanOrEqual(rowBox.y + rowBox.height - 1)
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(gridBox.y + 1)
    // A filter change empties it.
    await chip(page, 'Status', 'Unread').click()
    await expect(alert).toHaveText('')
    await chip(page, 'Status', 'Unread').click()

    // An open Spine popover shows it inside, and stays open.
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await expect(spines(page)).toHaveCount(2)
    await bookcase(page)
      .getByRole('button', { name: /^Dune by Frank Herbert, / })
      .click()
    const card = popover(page, 'Dune')
    const cardStar = favouriteStar(card)
    await expect(cardStar).toHaveAttribute('aria-pressed', 'true')
    await cardStar.click()
    await expect(card.getByText(COULDNT_SAVE, { exact: true })).toBeVisible()
    await expect(card).toBeVisible()
    await expect(cardStar).toHaveAttribute('aria-pressed', 'true')
    await expect(cardStar).toBeFocused()

    // Once the popover closes, the line moves once under the filter row, above the bookcase.
    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
    const closedLine = main.getByText(COULDNT_SAVE, { exact: true })
    await expect(closedLine).toHaveCount(1)
    await expect(closedLine).toBeVisible()
    const closedRowBox = (await chipGroup(page, 'Status').locator('xpath=..').boundingBox())!
    const closedLineBox = (await closedLine.boundingBox())!
    const shelfBox = (await bookcase(page).boundingBox())!
    expect(closedLineBox.y).toBeGreaterThanOrEqual(closedRowBox.y + closedRowBox.height - 1)
    expect(closedLineBox.y + closedLineBox.height).toBeLessThanOrEqual(shelfBox.y + 1)
    // Another spine's popover never takes the old line.
    await bookcase(page)
      .getByRole('button', { name: /^Emma by Jane Austen, / })
      .click()
    const emmaCard = popover(page, 'Emma')
    await expect(emmaCard).toBeVisible()
    await expect(emmaCard.getByText(COULDNT_SAVE, { exact: true })).toHaveCount(0)
    await expect(main.getByText(COULDNT_SAVE, { exact: true })).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(emmaCard).toBeHidden()
    // A filter change empties it.
    await chip(page, 'Status', 'Unread').click()
    await expect(alert).toHaveText('')
    await chip(page, 'Status', 'Unread').click()
  })

  test('[P0] AC-9 Tiles: a starred tile shows its gold star at the cover box’s top left, clear of the ribbon; an unstarred one draws its outline only on hover or focus; each star follows its link in Tab order', async ({
    page,
    seededServer,
  }) => {
    await storeTiles(page)
    const server = await seededServer({ books: [DUNE, EMMA] })
    await starBook(page.request, server, EMMA.id)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(2)
    const emmaItem = tileItemStarting(page, 'Emma by Jane Austen, ')
    const duneItem = tileItemStarting(page, 'Dune by Frank Herbert, ')
    const emmaStar = favouriteStar(emmaItem, 'Favourite Emma')
    const duneStar = favouriteStar(duneItem, 'Favourite Dune')

    // The criterion.
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'true')

    await expect(starShape(emmaStar)).toHaveCSS('fill', FAVOURITE)
    expect(await starDrawn(emmaStar)).toBe(true)
    // A sibling after the link in the list item, never inside it.
    const emmaLink = emmaItem.getByRole('link')
    await expect(emmaLink.getByRole('button')).toHaveCount(0)
    expect(
      await emmaStar.evaluate((button) => {
        const link = button.closest('li')!.querySelector('a')!
        return Boolean(link.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
      }),
    ).toBe(true)
    // tile-size star, tile-inset in from the 2:3 box's top and left; the ribbon is right of the whole button.
    const ribbon = emmaLink.locator('svg').first()
    await expect(ribbon).toBeVisible()
    const { box } = await coverBox(emmaLink)
    const starBox = (await emmaStar.locator('svg').first().boundingBox())!
    expect(Math.abs(starBox.x - box.x - starSize('tile-inset'))).toBeLessThanOrEqual(2)
    expect(Math.abs(starBox.y - box.y - starSize('tile-inset'))).toBeLessThanOrEqual(2)
    expect(Math.abs(starBox.width - starSize('tile-size'))).toBeLessThanOrEqual(2)
    const buttonBox = (await emmaStar.boundingBox())!
    const ribbonBox = (await ribbon.boundingBox())!
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(ribbonBox.x)

    // Unstarred: in the page, not drawn, until the pointer is over the tile or focus is inside it.
    await expect(duneStar).toHaveAttribute('aria-pressed', 'false')
    await page.mouse.move(0, 0)
    await expect.poll(() => starDrawn(duneStar)).toBe(false)
    await duneItem.getByRole('link').hover()
    await expect.poll(() => starDrawn(duneStar)).toBe(true)
    await expect(starShape(duneStar)).toHaveCSS('fill', 'none')
    await expect(starShape(duneStar)).toHaveCSS('stroke', INK_SECONDARY)
    await page.mouse.move(0, 0)
    await expect.poll(() => starDrawn(duneStar)).toBe(false)
    await duneItem.getByRole('link').focus()
    await expect.poll(() => starDrawn(duneStar)).toBe(true)
    await search(page).focus()
    await expect.poll(() => starDrawn(duneStar)).toBe(false)

    // Tab: Dune's link, its star, Emma's link, its star.
    await duneItem.getByRole('link').focus()
    await page.keyboard.press('Tab')
    await expect(duneStar).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(emmaLink).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(emmaStar).toBeFocused()

    // Enter stars, Space unstars, as on Book detail.
    await duneStar.focus()
    await page.keyboard.press('Enter')
    await expect(duneStar).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status')).toHaveText('Dune is a favourite.')
    await expect(duneStar).toBeFocused()
    await page.keyboard.press(' ')
    await expect(duneStar).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('status')).toHaveText('Dune is not a favourite.')
  })

  test('[P1] AC-10 List: the title cell holds the title link, then "Favourite Title", with the tiles’ starred and hover-or-focus rules, and the row is no taller than without it', async ({
    page,
    seededServer,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('bookvie.catalogView', 'list'))
    const server = await seededServer({ books: [DUNE, EMMA] })
    await starBook(page.request, server, EMMA.id)
    await page.goto(`${server.url}/catalog`)
    await expect(bookRows(page)).toHaveCount(2)
    const emmaRow = bookRows(page).filter({ has: page.getByRole('link', { name: 'Emma', exact: true }) })
    const duneRow = bookRows(page).filter({ has: page.getByRole('link', { name: 'Dune', exact: true }) })
    const emmaCell = emmaRow.getByRole('cell').first()
    const emmaStar = favouriteStar(emmaCell, 'Favourite Emma')
    const duneStar = favouriteStar(duneRow.getByRole('cell').first(), 'Favourite Dune')

    // The criterion.
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'true')

    // The cell holds the link, then the star.
    await expect
      .poll(() => emmaCell.locator('a, button').evaluateAll((all) => all.map((element) => element.tagName)))
      .toEqual(['A', 'BUTTON'])
    await expect(starShape(emmaStar)).toHaveCSS('fill', FAVOURITE)
    expect(await starDrawn(emmaStar)).toBe(true)
    // No taller than the row without the star, starred or not.
    for (const rowStar of [emmaStar, duneStar]) {
      const heights = await rowHeightWithout(rowStar)
      expect(heights.with).toBeLessThanOrEqual(heights.without + 0.5)
    }

    // Unstarred: drawn only on row hover or focus within.
    await expect(duneStar).toHaveAttribute('aria-pressed', 'false')
    await page.mouse.move(0, 0)
    await expect.poll(() => starDrawn(duneStar)).toBe(false)
    await duneRow.hover()
    await expect.poll(() => starDrawn(duneStar)).toBe(true)
    await expect(starShape(duneStar)).toHaveCSS('stroke', INK_SECONDARY)
    await page.mouse.move(0, 0)
    await expect.poll(() => starDrawn(duneStar)).toBe(false)
    await duneRow.getByRole('link', { name: 'Dune', exact: true }).focus()
    await expect.poll(() => starDrawn(duneStar)).toBe(true)
    await page.keyboard.press('Tab')
    await expect(duneStar).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(duneStar).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status')).toHaveText('Dune is a favourite.')
  })

  test('[P0] AC-11 a starred Book’s spine shows the paper square with the gold star at its foot and its name ends with ", favourite"; twins keep their names; the legend always shows "favourite"', async ({
    page,
    seededServer,
  }) => {
    const duneFirst = { id: bookId(4), title: 'Dune', authors: ['Frank Herbert'], pages: 412, edition: 1 }
    const duneSecond = { id: bookId(5), title: 'Dune', authors: ['Frank Herbert'], pages: 412, edition: 2 }
    const server = await seededServer(mainAt(165, { others: [duneFirst, duneSecond, EMMA] }))
    const MAIN = 'The Left Hand of Darkness by Ursula K. Le Guin, Main book, 50%'
    const DUNE_FIRST = 'Dune by Frank Herbert, edition 1, not read yet'
    const DUNE_SECOND = 'Dune by Frank Herbert, edition 2, not read yet'
    const EMMA_NAME = 'Emma by Jane Austen, finished'
    await starBook(page.request, server, duneFirst.id)
    await starBook(page.request, server, LEFT_HAND_ID)
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(4)

    // The criterion.
    await expect(spine(page, `${DUNE_FIRST}, favourite`)).toBeVisible()

    // Twins are told apart without ", favourite": the other Dune's name is unchanged.
    await expect
      .poll(async () => (await spineNames(bookcase(page))).sort())
      .toEqual([`${DUNE_FIRST}, favourite`, DUNE_SECOND, EMMA_NAME, `${MAIN}, favourite`].sort())
    // The mark: a spine-mark-size paper square, spine-mark-bottom above the foot, centred, with the gold star.
    for (const name of [`${DUNE_FIRST}, favourite`, `${MAIN}, favourite`]) {
      const mark = await spineMark(spine(page, name))
      expect(mark, name).not.toBeNull()
      expect(Math.abs(mark!.width - starSize('spine-mark-size'))).toBeLessThanOrEqual(1)
      expect(Math.abs(mark!.height - starSize('spine-mark-size'))).toBeLessThanOrEqual(1)
      expect(Math.abs(mark!.bottomGap - starSize('spine-mark-bottom'))).toBeLessThanOrEqual(1)
      expect(Math.abs(mark!.centreOffset)).toBeLessThanOrEqual(1)
      expect(Math.abs(mark!.starWidth - starSize('spine-mark-star'))).toBeLessThanOrEqual(1)
      expect(mark!.background).toBe(SPINE_LABEL_STRIP)
      expect(mark!.starFill).toBe(FAVOURITE)
    }
    // Over the Main book's fill, next to its marker dot, which stays.
    await expect(spine(page, `${MAIN}, favourite`).locator('[data-marker]')).toHaveCount(1)
    for (const name of [DUNE_SECOND, EMMA_NAME]) expect(await spineMark(spine(page, name)), name).toBeNull()
    // Not a control: the bookcase still has one button per spine.
    await expect(bookcase(page).getByRole('button')).toHaveCount(4)

    // The legend's sixth item, a mini paper square with the gold star.
    await expect(legend(page).locator(':scope > span')).toHaveText([
      'finished',
      'not read yet',
      'Main book, filled to its %',
      'up next',
      'waiting for you',
      'favourite',
    ])
    const item = legend(page).locator(':scope > span', { hasText: /^favourite$/ })
    await expect(item.locator('[aria-hidden="true"]').first()).toHaveCSS('background-color', SPINE_LABEL_STRIP)
    await expect(starShape(item)).toHaveCSS('fill', FAVOURITE)

    // The tile's name ends the same way.
    await viewToggle(page).getByRole('button', { name: 'Tiles', exact: true }).click()
    await expect(tileLinks(page)).toHaveCount(4)
    await expect(tiles(page).getByRole('link', { name: `${DUNE_FIRST}, favourite`, exact: true })).toBeVisible()
    await expect(tiles(page).getByRole('link', { name: DUNE_SECOND, exact: true })).toBeVisible()
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()

    // Home's slice carries the mark and the name too.
    await page.goto(server.url)
    const mainSpine = slice(page).getByRole('button', { name: `${MAIN}, favourite`, exact: true })
    await expect(mainSpine).toBeVisible()
    expect(await spineMark(mainSpine)).not.toBeNull()

    // With nothing starred, the legend still shows "favourite".
    await starBook(page.request, server, duneFirst.id, false)
    await starBook(page.request, server, LEFT_HAND_ID, false)
    await page.goto(`${server.url}/catalog`)
    await expect(spine(page, DUNE_FIRST)).toBeVisible()
    await expect(legend(page).locator(':scope > span', { hasText: /^favourite$/ })).toBeVisible()
  })

  test('[P0] AC-12 the Spine popover holds "Favourite" right after the title, first in its DOM; focus opens on the primary action or first link, Shift+Tab reaches the star, then closes; pressing it shows or hides the spine mark', async ({
    page,
    seededServer,
  }) => {
    const finishedDune = { ...DUNE, readings: finished(412) }
    const neuromancer = { id: bookId(3), title: 'Neuromancer', authors: ['William Gibson'], pages: 271, year: 1984 }
    const server = await seededServer({ books: [finishedDune, neuromancer] })
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(2)
    const dune = bookcase(page).getByRole('button', { name: /^Dune by Frank Herbert, finished/ })
    await dune.click()
    const card = popover(page, 'Dune')
    const openBook = card.getByRole('link', { name: 'Open book →', exact: true })
    await expect(openBook).toBeFocused()
    const star = favouriteStar(card)

    // The criterion.
    await expect(star).toHaveAttribute('aria-pressed', 'false')

    // First focusable in the popover's DOM, after the title and before the subtitle.
    await expect(card.locator('a[href], button, input, select, textarea').first()).toHaveAccessibleName('Favourite')
    expect(
      await star.evaluate((button) => {
        const dialog = button.closest('[role="dialog"]')!
        const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
        const subtitle = Array.from(dialog.querySelectorAll('p')).find((p) => p.textContent === 'Book One')
        return {
          afterTitle:
            title !== null && Boolean(title.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING),
          beforeSubtitle:
            subtitle !== undefined &&
            Boolean(button.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING),
        }
      }),
    ).toEqual({ afterTitle: true, beforeSubtitle: true })

    // Shift+Tab from the control focused on open reaches the star; again closes it.
    await page.keyboard.press('Shift+Tab')
    await expect(star).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(card).toBeHidden()
    await expect(dune).toBeFocused()

    // With a primary action, focus opens there, never on the star.
    await bookcase(page)
      .getByRole('button', { name: /^Neuromancer by William Gibson, / })
      .click()
    const unread = popover(page, 'Neuromancer')
    await expect(unread.getByRole('button', { name: 'Set as Up next', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(favouriteStar(unread)).toBeFocused()
    await page.keyboard.press('Escape')

    // Pressing the star stars the Book; the spine mark shows after the refetch, and hides again.
    await dune.click()
    await expect(openBook).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press(' ')
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status')).toHaveText('Dune is a favourite.')
    await expect(dune).toHaveAccessibleName('Dune by Frank Herbert, finished, favourite')
    await expect.poll(async () => (await spineMark(dune)) !== null).toBe(true)
    await expect(star).toBeFocused()
    await page.keyboard.press(' ')
    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await expect(dune).toHaveAccessibleName('Dune by Frank Herbert, finished')
    await expect.poll(() => spineMark(dune)).toBeNull()
  })

  test('[P1] AC-13 favourite and favourite-dark are DESIGN.md colors and tokens; gold fills only the star (rating stars stay sage); under forced colors every star is CanvasText with forced-color-adjust none', async ({
    page,
    seededServer,
  }) => {
    // The criterion.
    expect(designColor('favourite')).toBe('#9A7120')

    expect(designColor('favourite-dark')).toBe('#D2A54E')
    const rated = {
      ...DUNE,
      readings: [{ startDate: null, currentPage: 412, finishDate: '2026-03-20', finishedPages: 412, rating: 4 }],
    }
    const server = await seededServer({ books: [rated, EMMA] })
    await starBook(page.request, server, DUNE_ID)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const main = page.getByRole('main')
    await expect(page.getByRole('heading', { level: 1, name: 'Dune', exact: true })).toBeVisible()
    const token = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-favourite').trim())
    await expect.poll(token).toBe('#9A7120')
    const star = favouriteStar(main)
    const rating = main
      .getByRole('region', { name: 'Readings', exact: true })
      .getByRole('img', { name: '4 stars', exact: true })
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    await expect(starShape(star)).toHaveCSS('fill', FAVOURITE)
    await expect(rating.locator('svg path').first()).toHaveCSS('fill', ACCENT)

    // Dark: favourite-dark on Book detail; the rating stays accent.
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(token).toBe('#D2A54E')
    await expect(starShape(star)).toHaveCSS('fill', FAVOURITE_DARK)
    await expect(rating.locator('svg path').first()).toHaveCSS('fill', ACCENT_DARK)

    // Forced colors: CanvasText fill (starred) or stroke (unstarred), forced-color-adjust none.
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    const canvasText = await systemColor(page, 'CanvasText')
    const canvas = await systemColor(page, 'Canvas')
    await expect(star.locator('svg').first()).toHaveCSS('forced-color-adjust', 'none')
    await expect(starShape(star)).toHaveCSS('fill', canvasText)
    await page.goto(`${server.url}/book/${EMMA.id}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Emma', exact: true })).toBeVisible()
    const emmaStar = favouriteStar(main)
    await expect(emmaStar).toHaveAttribute('aria-pressed', 'false')
    await expect(emmaStar.locator('svg').first()).toHaveCSS('forced-color-adjust', 'none')
    await expect(starShape(emmaStar)).toHaveCSS('stroke', canvasText)
    await expect(starShape(emmaStar)).toHaveCSS('fill', 'none')
    // On a spine: a Canvas square with a CanvasText star.
    await page.goto(`${server.url}/catalog`)
    await expect(spines(page)).toHaveCount(2)
    const duneSpine = bookcase(page).getByRole('button', { name: /^Dune by Frank Herbert, / })
    await expect(duneSpine).toHaveAccessibleName(/, favourite$/)
    const mark = await spineMark(duneSpine)
    expect(mark).not.toBeNull()
    expect(mark!.background).toBe(canvas)
    expect(mark!.starFill).toBe(canvasText)

    // Tiles in dark: the cover star keeps #9A7120, the outline #5F635C (light ink-secondary).
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'none' })
    await storeTiles(page)
    await page.goto(`${server.url}/catalog`)
    await expect(tileLinks(page)).toHaveCount(2)
    await expect(starShape(favouriteStar(tiles(page), 'Favourite Dune'))).toHaveCSS('fill', FAVOURITE)
    const emmaTile = tileItemStarting(page, 'Emma by Jane Austen, ')
    await emmaTile.getByRole('link').hover()
    await expect(starShape(favouriteStar(emmaTile, 'Favourite Emma'))).toHaveCSS('stroke', INK_SECONDARY)
    // The spine mark in dark: the gold star on its paper square, as in light.
    await viewToggle(page).getByRole('button', { name: 'Bookcase', exact: true }).click()
    await expect(spines(page)).toHaveCount(2)
    const darkMark = await spineMark(bookcase(page).getByRole('button', { name: /^Dune by Frank Herbert, / }))
    expect(darkMark).not.toBeNull()
    expect(darkMark!.starFill).toBe(FAVOURITE)
    expect(darkMark!.background).toBe(SPINE_LABEL_STRIP)
  })

  test('[P2] AC-14 starring Books leaves Home’s slice rows and the "X of Y finished" meter as they were; only the spine mark and name are new', async ({
    page,
    seededServer,
  }) => {
    const shelf = shelfOf(150).map((book, index) => ({
      id: bookId(index + 1),
      ...book,
      ...(index < 5 ? { readings: finished() } : {}),
    }))
    const server = await seededServer(mainAt(165, { others: shelf }))
    await page.goto(server.url)
    await expect(sliceSpines(page).first()).toBeVisible()
    const meter = page.getByRole('main').getByRole('progressbar', { name: 'Books finished', exact: true })
    await expect(meter).toHaveAttribute('aria-valuetext', /^\d+ of \d+ finished$/)
    const meterOf = () =>
      meter.evaluate((bar) => ['aria-valuetext', 'aria-valuenow', 'aria-valuemax'].map((a) => bar.getAttribute(a)))
    // The unstarred run.
    const rowsBefore = await sliceRows(page)
    const namesBefore = await spineNames(slice(page))
    const meterBefore = await meterOf()
    const mainName = namesBefore.find((name) => name?.startsWith('The Left Hand of Darkness by '))!

    await starBook(page.request, server, LEFT_HAND_ID)
    await starBook(page.request, server, bookId(150))
    await page.reload()
    await expect(sliceSpines(page).first()).toBeVisible()

    // The criterion (the witness that the stars landed).
    await expect(slice(page).getByRole('button', { name: `${mainName}, favourite`, exact: true })).toBeVisible()

    expect(await sliceRows(page)).toEqual(rowsBefore)
    const starred = (name: string | null) =>
      name !== null && (name.startsWith('The Left Hand of Darkness by ') || name.startsWith('Book 150 by '))
    expect(await spineNames(slice(page))).toEqual(
      namesBefore.map((name) => (starred(name) ? `${name}, favourite` : name)),
    )
    await expect(meter).toHaveAttribute('aria-valuetext', meterBefore[0]!)
    expect(await meterOf()).toEqual(meterBefore)
    expect(
      await spineMark(slice(page).getByRole('button', { name: `${mainName}, favourite`, exact: true })),
    ).not.toBeNull()
  })
})
