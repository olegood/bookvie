// Story 11.4 helpers: the update notice's parts, the bundle's own version,
// an `app-info` route whose answer a test changes as it goes, the focus that
// refetches it, and two measurements of the notice: where its text sits and
// which backgrounds it paints.

import { readFileSync } from 'node:fs'
import type { Locator, Page, Route } from '@playwright/test'
import type { AppInfo } from './about-this-copy.ts'

/** The version the bundle bakes: frontend/package.json's (AR34). */
export const BUNDLE_VERSION: string = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version

const [MAJOR, MINOR] = BUNDLE_VERSION.split('.').map(Number)

/**
 * Server versions other than the bundle's, derived from it so a release that
 * bumps the version never turns "another version" into the bundle's own:
 * two newer minors and an older version than any release.
 */
export const NEWER_VERSION = `${MAJOR}.${MINOR + 1}.0`
export const NEWEST_VERSION = `${MAJOR}.${MINOR + 2}.0`
export const OLDER_VERSION = '0.0.0'

/** The notice's sentence for server version `version`. */
export function noticeText(version: string): string {
  return `bookvie was updated to ${version}. Reload to use it.`
}

/** The production `app-info` the worker server sends, with `version` in place of its own. */
export function productionInfo(version: string): AppInfo {
  return { version, mode: 'production', dataDir: '~/bookvie-data', commit: null }
}

/** The notice's sentence for `version`: an element in the `header` landmark whose whole text is the sentence. */
export function noticeSentence(page: Page, version: string): Locator {
  return page.getByRole('banner').getByText(noticeText(version), { exact: true })
}

/** Any notice sentence, whatever the version. */
export function anyNoticeSentence(page: Page): Locator {
  return page.getByRole('banner').getByText(/^bookvie was updated to /)
}

/** The notice's **Reload** button. */
export function reloadButton(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: 'Reload', exact: true })
}

/**
 * The notice band: the outermost element inside the `header` that holds both
 * a notice sentence and **Reload**. (`has` is matched inside each candidate,
 * so its locators start from the page, not from the banner.)
 */
export function noticeBand(page: Page): Locator {
  return page
    .getByRole('banner')
    .locator('*')
    .filter({ has: page.getByText(/^bookvie was updated to /) })
    .filter({ has: page.getByRole('button', { name: 'Reload', exact: true }) })
    .first()
}

export type Answer = AppInfo | 'pass' | 'fail'

/**
 * Answers every `app-info` request with what `answer()` returns at the time:
 * `'pass'` lets it reach the server, `'fail'` is a 500, a body is fulfilled.
 * Call before navigating.
 */
export async function answerAppInfo(page: Page, answer: () => Answer): Promise<void> {
  await page.route('**/api/views/app-info', (route: Route) => {
    const body = answer()
    if (body === 'pass') return route.continue()
    if (body === 'fail') return route.fulfill({ status: 500, body: '' })
    return route.fulfill({ json: body })
  })
}

/** The window regains focus: views refetch (`queryClient.ts`). */
export async function focusWindow(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
}

/**
 * The horizontal extent of the element's own text in CSS px: the left edge of
 * its first glyph and the right edge of its last, across every line box,
 * whatever the element's own width.
 */
export function textExtent(locator: Locator): Promise<{ left: number; right: number }> {
  return locator.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0)
    if (rects.length === 0) throw new Error('textExtent: no rendered text')
    return { left: Math.min(...rects.map((rect) => rect.left)), right: Math.max(...rects.map((rect) => rect.right)) }
  })
}

/**
 * The computed `background-color` of the element and of every element inside
 * it, as `tag.class background`, for each one that paints a background (not
 * `rgba(0, 0, 0, 0)`).
 */
export function backgroundsIn(locator: Locator): Promise<string[]> {
  return locator.evaluate((root) =>
    [root, ...Array.from(root.querySelectorAll('*'))]
      .map((element) => ({ element, color: getComputedStyle(element).backgroundColor }))
      .filter(({ color }) => color !== 'rgba(0, 0, 0, 0)')
      .map(({ element, color }) => `${element.localName}.${element.getAttribute('class') ?? ''} ${color}`),
  )
}
