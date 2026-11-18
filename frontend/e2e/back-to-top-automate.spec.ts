// Back to top: test automation after the spec was done
// (spec-back-to-top-button.md), beside the ATDD leaves in back-to-top.spec.ts.
// The button works the same with a filter chip on and on the scoped Card notes
// view, wears the dark tokens in dark and keeps its border under forced
// colors, sits under the spine popover where they overlap, can't be reached
// behind the open New book panel, and Catalog and Card notes pass axe with it
// shown, in light and dark.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { bookcase, search, spine } from './bookcase.ts'
import { systemColor } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { ACCENT_DARK, bookId, INK_DARK, newBookPanel, SURFACE_INSET_DARK } from './library.ts'
import { INPUT_BORDER_DARK } from './sort-direction.ts'
import { AXE_TAGS } from './stats.ts'
import { backToTop, LAST_NOTE, LONG_NOTES, LONG_SHELF, scrollToY } from './back-to-top.ts'

function searchNotes(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search card notes', exact: true })
}

function filterChip(page: Page, group: 'Status' | 'Type', name: string): Locator {
  return page
    .getByRole('main')
    .getByRole('group', { name: group, exact: true })
    .getByRole('button', { name, exact: true })
}

/** The element painted at the centre of `locator`'s box: 'self', 'inside:<selector>' or the tag hit. */
function paintedAtCentre(locator: Locator): Promise<string> {
  return locator.evaluate((self) => {
    const box = self.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    if (hit === null) return 'nothing'
    if (hit === self || self.contains(hit)) return 'self'
    return hit.closest('[role="dialog"], dialog') === null ? hit.tagName.toLowerCase() : 'dialog'
  })
}

async function openCatalog(page: Page, url: string): Promise<void> {
  await page.goto(`${url}/catalog`)
  await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
}

test.describe('Back to top (automate)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  })

  test('[P2] AC-1 with a filter chip on, the button follows the filtered page: shown past one window, gone when the filter leaves a short page', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await openCatalog(page, server.url)

    // Unread keeps all 400 Books: still long, so the button shows and a press works.
    await filterChip(page, 'Status', 'Unread').click()
    await expect(filterChip(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'true')
    await expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    await backToTop(page).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(search(page)).toBeFocused()
    await expect(filterChip(page, 'Status', 'Unread')).toHaveAttribute('aria-pressed', 'true')

    // Ebook matches none of them (seeded Books are Paperback): the page is short, so no button even at the bottom.
    await filterChip(page, 'Type', 'Ebook').click()
    await expect(page.getByText('No books match these filters.', { exact: true })).toBeVisible()
    const bottom = await scrollToY(page, 'bottom')
    expect(bottom).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight))
    await expect(backToTop(page)).toHaveCount(0)
  })

  test('[P2] AC-3 the scoped Card notes view (?book=) shows the button past one window and a press focuses Search card notes', async ({
    page,
    seededServer,
  }) => {
    const books = LONG_NOTES.books.map((book, n) => ({ ...book, id: bookId(n + 1) }))
    const server = await seededServer({ books })
    // Solaris (the third Book) alone: 50 notes.
    await page.goto(`${server.url}/card-notes?book=${bookId(3)}`)
    await expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached()
    await expect(page.getByText('Dune note 01: a line worth keeping.', { exact: true })).toHaveCount(0)

    const windowHeight = await page.evaluate(() => window.innerHeight)
    expect(await scrollToY(page, 'bottom')).toBeGreaterThan(windowHeight)
    await expect(backToTop(page)).toBeVisible()
    await backToTop(page).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(searchNotes(page)).toBeFocused()
    await expect(backToTop(page)).toHaveCount(0)
  })

  test('[P2] AC-6 in dark the button wears the dark tokens and the dark focus ring; under forced colors its border is still drawn', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await page.emulateMedia({ colorScheme: 'dark' })
    await openCatalog(page, server.url)
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()
    await expect(backToTop(page)).toHaveCSS('background-color', SURFACE_INSET_DARK)
    await expect(backToTop(page)).toHaveCSS('color', INK_DARK)
    await expect(backToTop(page)).toHaveCSS('border-top-color', INPUT_BORDER_DARK)
    // Keyboard focus: Tab past the end of main, then Shift+Tab back onto it.
    await backToTop(page).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(backToTop(page)).toBeFocused()
    await expect(backToTop(page)).toHaveCSS('outline-color', ACCENT_DARK)

    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await expect(backToTop(page)).toBeVisible()
    for (const side of ['top', 'right', 'bottom', 'left']) {
      await expect(backToTop(page), side).toHaveCSS(`border-${side}-style`, 'solid')
      await expect(backToTop(page), side).toHaveCSS(`border-${side}-width`, '1px')
    }
    // Drawn: not the color of what it sits on or of its own face.
    for (const system of ['Canvas', 'ButtonFace']) {
      await expect(backToTop(page), system).not.toHaveCSS('border-top-color', await systemColor(page, system))
    }
  })

  test('[P2] the spine popover paints above the button where they overlap', async ({ page, seededServer }) => {
    const server = await seededServer(LONG_SHELF)
    await openCatalog(page, server.url)
    await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()

    const last = spine(page, 'Book 400 by Author, not read yet')
    await last.evaluate((element: HTMLElement) => element.click())
    const popover = page.getByRole('dialog', { name: 'Book 400', exact: true })
    await expect(popover).toBeVisible()
    await expect(backToTop(page)).toBeVisible()

    // Put the open popover (position: fixed) over the button; its stacking is untouched.
    const box = await backToTop(page).boundingBox()
    if (box === null) throw new Error('no box for the button')
    await popover.evaluate((element: HTMLElement, at) => {
      element.style.left = `${at.x}px`
      element.style.top = `${at.y}px`
      element.style.right = 'auto'
      element.style.bottom = 'auto'
    }, box)
    expect(await paintedAtCentre(backToTop(page))).toBe('dialog')
  })

  test('[P2] behind the open New book panel the button is covered and can take no focus', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LONG_SHELF)
    await openCatalog(page, server.url)
    const bottom = await scrollToY(page, 'bottom')
    await expect(backToTop(page)).toBeVisible()

    // Click New book without scrolling to it, so the page stays at its bottom.
    await page
      .getByRole('button', { name: 'New book', exact: true })
      .evaluate((element: HTMLElement) => element.click())
    await expect(newBookPanel(page)).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(bottom)

    const button = page.locator('main button', { hasText: 'Back to top' })
    await expect(button).toHaveCount(1)
    expect(await paintedAtCentre(button)).not.toBe('self')
    expect(
      await button.evaluate((element: HTMLElement) => {
        element.focus()
        return document.activeElement === element
      }),
    ).toBe(false)
  })

  test('[P2] AC-6 Catalog and Card notes pass axe with the button shown, in light and dark', async ({
    page,
    seededServer,
  }) => {
    const shelf = await seededServer(LONG_SHELF)
    const notes = await seededServer(LONG_NOTES)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      for (const [name, url, ready] of [
        ['Catalog', `${shelf.url}/catalog`, () => expect(bookcase(page)).toHaveAccessibleName('Bookcase, 400 books')],
        [
          'Card notes',
          `${notes.url}/card-notes`,
          () => expect(page.getByText(LAST_NOTE, { exact: true })).toBeAttached(),
        ],
      ] as const) {
        await page.goto(url)
        await ready()
        await scrollToY(page, 'bottom')
        await expect(backToTop(page), name).toBeVisible()
        const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        expect(violations.map(({ id, nodes }) => `${colorScheme} ${name}: ${id} (${nodes.length})`)).toEqual([])
      }
    }
  })
})
