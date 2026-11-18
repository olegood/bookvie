// Back to top (_bmad-output/implementation-artifacts/spec-back-to-top-button.md).
// On Catalog and Card notes, once the page is scrolled more than one window
// height, a fixed button "↑ Back to top" shows in the bottom-right corner.
// Pressing it scrolls to the top (smooth, instant under reduced motion) and
// focuses the page's search field, keeping its text. It is hidden (no Tab
// stop, no accessible node) otherwise, and other pages never have it.
//
// The guard criteria (AC-5, AC-8) pass on today's code by themselves, so each
// leaf also has a control step where the button must show: that control is
// what makes it red now.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { bookcase, bookRows, search, shelfOf, spines, viewToggle } from './bookcase.ts'
import { expect, test } from './fixtures.ts'
import { ACCENT, bookId, DESIGN_MD, INK, SURFACE_INSET } from './library.ts'
import { INPUT_BORDER } from './sort-direction.ts'
import { tileLinks } from './tiles.ts'
import {
  backToTop,
  coveredBy,
  LAST_NOTE,
  LONG_NOTES,
  LONG_SHELF,
  MATCHES_ALL_BOOKS,
  MATCHES_ALL_NOTES,
  pressAndSample,
  scrollToY,
} from './back-to-top.ts'

const EXPERIENCE_MD = path.join(path.dirname(DESIGN_MD), 'EXPERIENCE.md')

function searchNotes(page: Page) {
  return page.getByRole('searchbox', { name: 'Search card notes', exact: true })
}

/** One window height, as the page sees it. */
function innerHeight(page: Page): Promise<number> {
  return page.evaluate(() => window.innerHeight)
}

async function showView(page: Page, view: 'Bookcase' | 'List' | 'Tiles'): Promise<void> {
  await viewToggle(page).getByRole('button', { name: view, exact: true }).click()
  if (view === 'Bookcase') await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
  if (view === 'List') await expect(bookRows(page)).toHaveCount(400)
  if (view === 'Tiles') await expect(tileLinks(page)).toHaveCount(400)
}

test.describe('Back to top', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P0] AC-1 in Bookcase, List and Tiles the button shows once the Catalog is scrolled past one window height, fixed bottom-right, and hides again near the top', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    const windowHeight = await innerHeight(page)

    for (const view of ['Bookcase', 'List', 'Tiles'] as const) {
      await showView(page, view)
      await scrollToY(page, windowHeight * 1.5)
      await expect(backToTop(page)).toBeVisible()
      await expect(backToTop(page)).toHaveText(/^\s*↑\s*Back to top\s*$/)
      await expect(backToTop(page)).toHaveCSS('position', 'fixed')
      const box = await backToTop(page).boundingBox()
      const viewport = page.viewportSize()
      expect(box).not.toBeNull()
      expect(viewport).not.toBeNull()
      if (box && viewport) {
        expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.75)
        expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.75)
      }
      // It stays put while the page scrolls.
      await scrollToY(page, windowHeight * 2.5)
      expect(await backToTop(page).boundingBox()).toEqual(box)

      await scrollToY(page, windowHeight - 10)
      await expect(backToTop(page)).toHaveCount(0)
      await scrollToY(page, 0)
      await expect(backToTop(page)).toHaveCount(0)
    }
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P0] AC-2 on Catalog a click, Enter or Space scrolls to the top and focuses Search titles, keeping its text', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    await search(page).fill(MATCHES_ALL_BOOKS)
    await expect(spines(page)).toHaveCount(400)
    const windowHeight = await innerHeight(page)

    for (const press of ['click', 'Enter', 'Space'] as const) {
      expect(await scrollToY(page, 'bottom')).toBeGreaterThan(windowHeight)
      await expect(backToTop(page)).toBeVisible()
      if (press === 'click') await backToTop(page).click()
      else {
        await backToTop(page).focus()
        await page.keyboard.press(press)
      }
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await expect(search(page)).toBeFocused()
      await expect(search(page)).toHaveValue(MATCHES_ALL_BOOKS)
      await expect(backToTop(page)).toHaveCount(0)
    }
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P0] AC-3 on Card notes the button shows past one window height, hides near the top, and a press scrolls up and focuses Search card notes, keeping its text', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_NOTES)
    await page.goto(`${server.url}/card-notes`)
    await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
    await searchNotes(page).fill(MATCHES_ALL_NOTES)
    await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
    const windowHeight = await innerHeight(page)

    await scrollToY(page, windowHeight * 1.5)
    await expect(backToTop(page)).toBeVisible()
    await scrollToY(page, windowHeight - 10)
    await expect(backToTop(page)).toHaveCount(0)

    await scrollToY(page, 'bottom')
    await backToTop(page).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(searchNotes(page)).toBeFocused()
    await expect(searchNotes(page)).toHaveValue(MATCHES_ALL_NOTES)
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P1] AC-4 the scroll is smooth by default and instant under reduced motion, ending at the top with focus on the search field either way', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')

    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    const smooth = await pressAndSample(page)
    expect(smooth.before).toBeGreaterThan(0)
    // One frame in, a smooth scroll hasn't arrived yet (Chromium hasn't even moved).
    expect(smooth.afterOneFrame).toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(search(page)).toBeFocused()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    const instant = await pressAndSample(page)
    expect(instant.before).toBeGreaterThan(0)
    expect(instant.afterOneFrame).toBe(0)
    await expect(search(page)).toBeFocused()
  })

  // RED (ATDD): the control step needs the button; un-skip when building spec-back-to-top-button.
  test.skip('[P1] AC-5 a Catalog shorter than two windows never shows the button, even scrolled to the bottom; made long by a shorter window, it does', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: shelfOf(3) })
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 3 books')
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(height).toBeLessThan(2 * (await innerHeight(page)))

    // Control: a window short enough to scroll more than its own height shows it.
    await page.setViewportSize({ width: 1280, height: 200 })
    const reached = await scrollToY(page, 'bottom')
    expect(reached).toBeGreaterThan(200)
    await expect(backToTop(page)).toBeVisible()

    // Back to the full window, the page fits and the button is gone, without a scroll.
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(backToTop(page)).toHaveCount(0)
    await scrollToY(page, 'bottom')
    await expect(bookcase(page)).toBeVisible()
    await expect(backToTop(page)).toHaveCount(0)
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P1] AC-6 hidden it is no Tab stop and no accessible node; shown it is the last Tab stop in main with the accent focus ring', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()

    // Keyboard focus on the button: the focus ring shows.
    await backToTop(page).focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(backToTop(page)).toBeFocused()
    await expect(backToTop(page)).toHaveCSS('outline-style', 'solid')
    await expect(backToTop(page)).toHaveCSS('outline-color', ACCENT)
    // Nothing in main comes after it.
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.querySelector('main')?.contains(document.activeElement))).toBe(false)

    // Hidden at the top: no accessible node, nothing focusable carries its text.
    await scrollToY(page, 0)
    await expect(backToTop(page)).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('button, a, [tabindex]')).some(
          (element) => element.textContent?.includes('Back to top') && element.checkVisibility(),
        ),
      ),
    ).toBe(false)
  })

  // RED (ATDD): there is no Back to top button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P1] AC-7 at the very bottom the button covers no spine, row, tile, card note or control', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    for (const view of ['Bookcase', 'List', 'Tiles'] as const) {
      await showView(page, view)
      await scrollToY(page, 'bottom')
      await expect(backToTop(page)).toBeVisible()
      expect(await coveredBy(backToTop(page)), view).toEqual([])
    }

    const notes = await seededServer(LONG_NOTES)
    await page.goto(`${notes.url}/card-notes`)
    await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    expect(await coveredBy(backToTop(page)), 'Card notes').toEqual([])
  })

  // RED (ATDD): the control step needs the button; un-skip when building spec-back-to-top-button.
  test.skip('[P2] AC-8 Home, Stats, Backup and Book detail have no Back to top button, even scrolled past one window height of a short window', async ({
    page,
    seededServer,
  }) => {
    const books = shelfOf(400).map((book, n) => ({ ...book, id: bookId(n + 1), pages: 300 }))
    Object.assign(books[0], { readings: [{ startDate: '2026-10-01', currentPage: 30 }] })
    const server = await seededServer({ mainBookId: bookId(1), books })
    await page.setViewportSize({ width: 1280, height: 200 })

    // Control: the same library on Catalog shows it.
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()

    for (const route of ['/', '/stats', '/backup', `/book/${bookId(1)}`]) {
      await page.goto(`${server.url}${route}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Scrolled more than one window height, so the absence below isn't vacuous.
      expect(await scrollToY(page, 'bottom'), route).toBeGreaterThan(200)
      await expect(backToTop(page), route).toHaveCount(0)
    }
  })

  // RED (ATDD): DESIGN.md and EXPERIENCE.md don't describe the button yet; un-skip when building spec-back-to-top-button.
  test.skip('[P2] AC-9 DESIGN.md has a back-to-top component and EXPERIENCE.md a Back to top row, and the button wears the secondary-button colors', async ({
    page,
    seededServer,
  }) => {
    expect(readFileSync(DESIGN_MD, 'utf8')).toMatch(/^ {2}back-to-top:\s*$/m)
    expect(readFileSync(EXPERIENCE_MD, 'utf8')).toMatch(/^\| Back to top \|/m)

    const server = await seededServer(LONG_SHELF)
    await page.goto(`${server.url}/catalog`)
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    await expect(backToTop(page)).toHaveCSS('background-color', SURFACE_INSET)
    await expect(backToTop(page)).toHaveCSS('color', INK)
    await expect(backToTop(page)).toHaveCSS('border-top-color', INPUT_BORDER)
  })
})
