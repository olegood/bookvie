// The Back to top button's e2e seeds and helpers (spec-back-to-top-button):
// the button's locator, a long shelf and a long Card notes library, and the
// scroll helpers `scrollToY` (an instant scroll that lets the page's scroll
// listener run), `pressAndSample` (presses the button inside the page and
// reads `scrollY` one frame later) and `coveredBy` (what in `main` the
// button's box overlaps).

import type { Locator, Page } from '@playwright/test'
import { shelfOf } from './bookcase.ts'

export function backToTop(page: Page): Locator {
  return page.getByRole('button', { name: 'Back to top', exact: true })
}

/** 400 Books, "Book 001" … "Book 400": every view is several windows long at 1280×720. */
export const LONG_SHELF = { books: shelfOf(400) }

/** A search that every Book of LONG_SHELF matches, so typing it keeps the page long. */
export const MATCHES_ALL_BOOKS = 'Book'

/** Three Books with 50 notes each: the Card notes page is several windows long. */
export const LONG_NOTES = {
  books: ['Dune', 'Emma', 'Solaris'].map((title) => ({
    title,
    authors: ['Author'],
    pages: 400,
    cardNotes: Array.from({ length: 50 }, (_, n) => ({
      text: `${title} note ${String(n + 1).padStart(2, '0')}: a line worth keeping.`,
      pageStart: n + 1,
    })),
  })),
}

/** The last note of LONG_NOTES in the page's order (groups by title, notes by page). */
export const LAST_NOTE = 'Solaris note 50: a line worth keeping.'

/** A search that every note of LONG_NOTES matches. */
export const MATCHES_ALL_NOTES = 'note'

/**
 * Scrolls the window to `y` at once (no smooth scroll), waits two frames so a
 * scroll listener throttled to one frame has run, and returns the `scrollY`
 * reached (clamped by the page's height).
 */
export function scrollToY(page: Page, y: number | 'bottom'): Promise<number> {
  return page.evaluate(async (target) => {
    const top = target === 'bottom' ? document.documentElement.scrollHeight : target
    window.scrollTo({ top, behavior: 'instant' })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    return window.scrollY
  }, y)
}

/**
 * Clicks the Back to top button from inside the page and returns `scrollY`
 * just before the click and one animation frame after it. A smooth scroll is
 * still under way after one frame; an instant one is already at 0.
 */
export function pressAndSample(page: Page): Promise<{ before: number; afterOneFrame: number }> {
  return page.evaluate(async () => {
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Back to top'))
    if (!button) throw new Error('no Back to top button')
    const before = window.scrollY
    button.click()
    await new Promise((done) => requestAnimationFrame(done))
    return { before, afterOneFrame: window.scrollY }
  })
}

/**
 * Every Book spine, row, tile, card note or control in `main` whose box
 * overlaps `button`'s, described as "tag: text". The button itself and its
 * ancestors are left out.
 */
export function coveredBy(button: Locator): Promise<string[]> {
  return button.evaluate((self) => {
    const box = self.getBoundingClientRect()
    const main = document.querySelector('main')
    if (!main) throw new Error('no main')
    const candidates = main.querySelectorAll('a, button, input, select, textarea, summary, li, tr, [tabindex]')
    const hits: string[] = []
    for (const element of Array.from(candidates)) {
      if (element === self || element.contains(self)) continue
      const r = element.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const overlaps = r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top
      if (overlaps) hits.push(`${element.tagName.toLowerCase()}: ${(element.textContent ?? '').trim().slice(0, 40)}`)
    }
    return hits
  })
}
