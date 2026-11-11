// Shared by the Stats specs: stats.spec.ts (Story 6.3, the range picker and the
// two numbers) and stats-bars.spec.ts (Story 6.4, the bars and their table).
import type { Locator, Page, Request } from '@playwright/test'
import { ANNOUNCE_DELAY_MS } from '../src/lib/announce.ts'

export const STATS_API = '/api/views/stats'
export const COULDNT_LOAD = "Couldn't load. Is bookvie still running?"
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
export const PRESETS = ['This month', 'This year', 'Last year', 'All time', 'Custom']

/**
 * Flow 7 at fake today 2026-10-28: three ordinary finished Readings.
 * - Beloved, 324 pages, finished 12 October 2026.
 * - Kindred, 286 pages, finished 20 October 2026.
 * - Emma, 400 pages, finished 20 September 2026.
 * So This month is 2 books and 610 pages, This year 3 and 1,010, Last year nothing.
 */
export const FLOW_7 = {
  books: [
    {
      title: 'Beloved',
      authors: ['Toni Morrison'],
      pages: 324,
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-12', finishedPages: 324, currentPage: 324 }],
    },
    {
      title: 'Kindred',
      authors: ['Octavia E. Butler'],
      pages: 286,
      readings: [{ startDate: '2026-10-13', finishDate: '2026-10-20', finishedPages: 286, currentPage: 286 }],
    },
    {
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [{ startDate: '2026-09-01', finishDate: '2026-09-20', finishedPages: 400, currentPage: 400 }],
    },
  ],
}

export const NEW_YEAR_TODAY = '2027-01-01'
/** 00:30 on 1 January 2027 in Madrid (CET): 23:30 UTC on 31 December 2026. */
export const NEW_YEAR_NOW = new Date('2027-01-01T00:30:00+01:00')

/**
 * Either side of the year boundary, at fake today 2027-01-01.
 * - Dune, 412 pages, finished 31 December 2026: Last year.
 * - Neuromancer, 271 pages, finished 1 January 2027: This year.
 */
export const NEW_YEAR = {
  books: [
    {
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      readings: [{ startDate: '2026-12-01', finishDate: '2026-12-31', finishedPages: 412, currentPage: 412 }],
    },
    {
      title: 'Neuromancer',
      authors: ['William Gibson'],
      pages: 271,
      readings: [{ startDate: '2026-12-15', finishDate: '2027-01-01', finishedPages: 271, currentPage: 271 }],
    },
  ],
}

/** One Book finished in October 2026, and an unfinished one: "1 book, 271 pages." for This month. */
export const ONE_BOOK = {
  books: [
    {
      title: 'Neuromancer',
      authors: ['William Gibson'],
      pages: 271,
      readings: [{ startDate: '2026-10-01', finishDate: '2026-10-05', finishedPages: 271, currentPage: 271 }],
    },
    {
      title: 'Hyperion',
      authors: ['Dan Simmons'],
      pages: 482,
      readings: [{ startDate: '2026-10-10', currentPage: 210 }],
    },
  ],
}

/** Nothing finished: one Reading in progress. */
export const NOTHING_FINISHED = {
  books: [
    {
      title: 'Hyperion',
      authors: ['Dan Simmons'],
      pages: 482,
      readings: [{ startDate: '2026-10-10', currentPage: 210 }],
    },
  ],
}

/** The banner's nav. */
export function nav(page: Page): Locator {
  return page.getByRole('banner').getByRole('navigation')
}

/** The range picker: a segmented `group` named "Range" (the `ViewToggle` pattern). */
export function rangePicker(page: Page): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Range', exact: true })
}

/** One preset of the range picker, an `aria-pressed` button. */
export function preset(page: Page, name: string): Locator {
  return rangePicker(page).getByRole('button', { name, exact: true })
}

/** Custom's date field "From" or "To". */
export function dateField(page: Page, name: 'From' | 'To'): Locator {
  return page.getByRole('main').getByLabel(name, { exact: true })
}

/**
 * A big number, by its exact text inside the "Totals" group. Exact matching only
 * hits an element whose whole text is the figure, so "2" doesn't match "2026" or
 * the caption "books finished"; the group keeps the bar values and the table's
 * cells, which repeat the numbers, out of reach.
 */
export function figure(page: Page, text: string): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Totals', exact: true }).getByText(text, { exact: true })
}

/** A caption under a big number. */
export function caption(page: Page, text: 'books finished' | 'pages finished'): Locator {
  return page.getByRole('main').getByText(text, { exact: true })
}

/** The next request for the stats view. Register it before the action that triggers it. */
export function statsRequest(page: Page): Promise<Request> {
  return page.waitForRequest((request) => new URL(request.url()).pathname === STATS_API)
}

/** The next request for the stats view with exactly `query`. Register it before the action. */
export function statsRequestFor(page: Page, query: Record<string, string>): Promise<Request> {
  return page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === STATS_API && JSON.stringify(queryOf(request)) === JSON.stringify(query),
  )
}

/** Every stats request's query from now on, in the order the page sends them. */
export function recordStatsRequests(page: Page): Record<string, string>[] {
  const sent: Record<string, string>[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === STATS_API) sent.push(queryOf(request))
  })
  return sent
}

/**
 * Resolves once an announcement scheduled before this call would have been set:
 * `announce` sets its text in a timer of ANNOUNCE_DELAY_MS, and timers of at
 * least that delay registered later fire after it.
 */
export async function afterAnnounceDelay(page: Page): Promise<void> {
  await page.evaluate((delay) => new Promise<void>((resolve) => setTimeout(resolve, delay)), ANNOUNCE_DELAY_MS)
}

/** A request's query as a plain object, to compare the whole query at once. */
export function queryOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url()).searchParams)
}
