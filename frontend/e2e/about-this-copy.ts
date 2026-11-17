// Story 11.3 helpers: the About this copy card on Backup, the server's own
// app-info, and how a line of the card wraps. (A test answers app-info in place
// of the server with `answerAppInfo` from library.ts.)

import type { Locator, Page } from '@playwright/test'
import type { AppInfo } from './library.ts'

export const ABOUT = 'About this copy'

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
