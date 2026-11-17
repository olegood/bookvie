// Story 11.3 helpers: the About this copy card on Backup, the app-info body a
// test can fulfil in place of the server's, and how a line of the card wraps.

import type { Locator, Page, Route } from '@playwright/test'

export const ABOUT = 'About this copy'

/** The `app-info` view as the server sends it (`views/app_info`). */
export type AppInfo = { version: string; mode: 'dev' | 'production'; dataDir: string; commit: string | null }

/** The About this copy card: a `section` labelled by its `h2`, inside `main`. */
export function aboutCard(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: ABOUT, exact: true })
}

/** The Export button, which ships: proof the Backup page has rendered. */
export function exportButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Export all data', exact: true })
}

/** The server's own `app-info`, read outside the page. */
export async function serverAppInfo(page: Page, url: string): Promise<AppInfo> {
  return (await (await page.request.get(`${url}/api/views/app-info`)).json()) as AppInfo
}

/** Answers every `app-info` request with `body` until the page unroutes it. Call before navigating. */
export async function fulfilAppInfo(page: Page, body: AppInfo): Promise<void> {
  await page.route('**/api/views/app-info', (route: Route) => route.fulfill({ json: body }))
}

/**
 * How the text of `line` lays out: the number of rendered lines (distinct
 * line boxes of its text) and how far its content overflows its own box
 * horizontally (`scrollWidth - clientWidth`, 0 when it fits).
 */
export function wrapOf(line: Locator): Promise<{ lines: number; overflow: number }> {
  return line.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const tops = new Set(
      Array.from(range.getClientRects())
        .filter((rect) => rect.width > 0)
        .map((rect) => Math.round(rect.top)),
    )
    return { lines: tops.size, overflow: element.scrollWidth - element.clientWidth }
  })
}
