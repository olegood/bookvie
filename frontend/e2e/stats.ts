// Shared by the Stats specs: stats.spec.ts (Story 6.3, the range picker and the
// two numbers), stats-bars.spec.ts (Story 6.4, the bars and their table) and
// stats-finished.spec.ts (Story 17.1, the finished list and the Stats address).
import type { Locator, Page, Request } from '@playwright/test'
import { ANNOUNCE_DELAY_MS } from '../src/lib/announce.ts'
import { COVER_PNG } from './intents.ts'
import { bookId } from './library.ts'

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

// --- Story 17.1 See the Books finished in a range (stats-finished.spec.ts) --------

/** The spine color Dune's typeset cover is drawn in (`spineColorUser`). */
export const DUNE_SPINE = '#4A6FA5'
/** The spine color Piranesi's typeset cover is drawn in when its cover fails to load. */
export const PIRANESI_SPINE = '#8C5A3C'
export const DDIA_COVER = 'covers/ddia.png'
export const PIRANESI_COVER = 'covers/piranesi.png'

const done = (startDate: string | null, finishDate: string, finishedPages: number | null, rating: number | null) => ({
  startDate,
  finishDate,
  finishedPages,
  currentPage: finishedPages ?? 1,
  rating,
})

/**
 * The finished list's library at fake today 2026-10-28, Book ids `bookId(1)` to
 * `bookId(9)`. This year holds 9 finishes and 2,489 pages:
 * - Extreme Notes (Kent Beck and 2 others), 12 Oct 2026, 1 page, 1 star.
 * - Beloved, finished twice on 20 Sep 2026, 324 pages, 3 stars then 5 stars.
 * - Piranesi, 8 Aug 2026, 245 pages, 2 stars; its cover file isn't an image.
 * - Dune, back-filled, 1 Jun 2026, 412 pages, unrated, no cover (spine `DUNE_SPINE`).
 * - Emma, 5 May 2026, `finishedPages` null (0 pages), unrated.
 * - Kindred, 20 Apr and 10 Feb 2026, 286 pages each, unrated.
 * - Designing Data-Intensive Applications, 14 Mar 2026, 611 pages, 4 stars, a cover.
 * Plus Solaris, 5 Dec 2025, 204 pages (Last year), and Hyperion, a side read in
 * progress, never finished. This month is Extreme Notes alone (1 book, 1 page);
 * Custom 1 February – 15 April 2026 is Kindred (10 Feb) and DDIA (2 books, 897 pages).
 */
export const FINISHED = {
  books: [
    {
      id: bookId(1),
      title: 'Designing Data-Intensive Applications',
      authors: ['Martin Kleppmann'],
      pages: 616,
      coverFile: DDIA_COVER,
      readings: [done('2026-02-20', '2026-03-14', 611, 4)],
    },
    {
      id: bookId(2),
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      spineColorUser: DUNE_SPINE,
      readings: [done(null, '2026-06-01', 412, null)],
    },
    {
      id: bookId(3),
      title: 'Kindred',
      authors: ['Octavia E. Butler'],
      pages: 286,
      readings: [done('2026-02-01', '2026-02-10', 286, null), done('2026-04-01', '2026-04-20', 286, null)],
    },
    {
      id: bookId(4),
      title: 'Beloved',
      authors: ['Toni Morrison'],
      pages: 324,
      readings: [done(null, '2026-09-20', 324, 3), done(null, '2026-09-20', 324, 5)],
    },
    {
      id: bookId(5),
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [done('2026-04-25', '2026-05-05', null, null)],
    },
    {
      id: bookId(6),
      title: 'Extreme Notes',
      authors: ['Kent Beck', 'Ward Cunningham', 'Ron Jeffries'],
      pages: 1,
      readings: [done('2026-10-11', '2026-10-12', 1, 1)],
    },
    {
      id: bookId(7),
      title: 'Solaris',
      authors: ['Stanisław Lem'],
      pages: 204,
      readings: [done('2025-11-20', '2025-12-05', 204, null)],
    },
    {
      id: bookId(8),
      title: 'Hyperion',
      authors: ['Dan Simmons'],
      pages: 482,
      readings: [{ startDate: '2026-10-01', currentPage: 210 }],
    },
    {
      id: bookId(9),
      title: 'Piranesi',
      authors: ['Susanna Clarke'],
      pages: 245,
      coverFile: PIRANESI_COVER,
      spineColorFromCover: PIRANESI_SPINE,
      readings: [done('2026-08-01', '2026-08-08', 245, 2)],
    },
  ],
  sideReadBookIds: [bookId(8)],
}

/** `FINISHED`'s cover files: DDIA's a real PNG, Piranesi's not an image. */
export const FINISHED_FILES = { [DDIA_COVER]: COVER_PNG, [PIRANESI_COVER]: 'not an image' }

/** This year's rows' names at fake today 2026-10-28, in the view's order (UX-DR106). */
export const THIS_YEAR_ROWS = [
  'Extreme Notes, Kent Beck and 2 others, finished 12 Oct 2026, 1 page, 1 star',
  'Beloved, Toni Morrison, finished 20 Sep 2026, 324 pages, 3 stars',
  'Beloved, Toni Morrison, finished 20 Sep 2026, 324 pages, 5 stars',
  'Piranesi, Susanna Clarke, finished 8 Aug 2026, 245 pages, 2 stars',
  'Dune, Frank Herbert, finished 1 Jun 2026, 412 pages',
  'Emma, Jane Austen, finished 5 May 2026, 0 pages',
  'Kindred, Octavia E. Butler, finished 20 Apr 2026, 286 pages',
  'Designing Data-Intensive Applications, Martin Kleppmann, finished 14 Mar 2026, 611 pages, 4 stars',
  'Kindred, Octavia E. Butler, finished 10 Feb 2026, 286 pages',
]

/** The finished list's heading: the one `h2` in `main` ("Finished this year"). */
export function finishedHeading(page: Page): Locator {
  return page.getByRole('main').getByRole('heading', { level: 2 })
}

/** The finished list: the `ol` under the chart, the only list in Stats' `main`. */
export function finishedList(page: Page): Locator {
  return page.getByRole('main').getByRole('list')
}

/** The finished list's row links, one per finish, in the page's order. */
export function finishedLinks(page: Page): Locator {
  return finishedList(page).getByRole('listitem').getByRole('link')
}

/** The row link whose name starts with `start` (a title, then ", "). */
export function finishedLink(page: Page, start: string): Locator {
  return finishedLinks(page).and(page.locator(`[aria-label^="${start}, "]`))
}

/** Each of `links`' `aria-label`s, in order: a one-shot read, after a web-first wait on the count. */
export function labelsOf(links: Locator): Promise<(string | null)[]> {
  return links.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')))
}

/** The session history's length, which a replace leaves alone and a push grows. */
export function historyLength(page: Page): Promise<number> {
  return page.evaluate(() => history.length)
}

/** The address as the page shows it: path and search, no origin. */
export function address(page: Page): string {
  const url = new URL(page.url())
  return `${url.pathname}${url.search}`
}

export type ThumbnailLook = {
  width: number
  height: number
  /** The box's top edge in the viewport, to line it up with the row's text. */
  y: number
  /** The 44 × 64 box's fill, edge and whether an `img` shows inside it. */
  background: string
  borderWidth: string
  borderStyle: string
  borderColor: string
  image: boolean
  /** The plate inside a typeset cover, relative to the box, or null. */
  plate: { left: number; right: number; top: number; height: number; background: string; text: string } | null
}

/**
 * A finished row's thumbnail, found by its geometry (the outermost element
 * inside `link` that is 44 × 64 to within half a pixel and is an image or has a fill,
 * else the outermost of that size), so no class name is pinned. For a typeset cover, its plate is the first
 * element inside it that is narrower than the box and has a fill of its own.
 */
export function thumbnailLook(link: Locator): Promise<ThumbnailLook> {
  return link.evaluate((element) => {
    const fits = (node: Element) => {
      const r = node.getBoundingClientRect()
      return Math.abs(r.width - 44) <= 0.5 && Math.abs(r.height - 64) <= 0.5
    }
    const boxes = Array.from(element.querySelectorAll('*')).filter(fits)
    const filled = (node: Element) =>
      node.tagName === 'IMG' || getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)'
    const box = boxes.find(filled) ?? boxes[0]
    if (!box) throw new Error('no 44 × 64 thumbnail in the row')
    const r = box.getBoundingClientRect()
    const style = getComputedStyle(box)
    const image = box.tagName === 'IMG' || Array.from(box.querySelectorAll('img')).some(fits)
    const plateNode = Array.from(box.querySelectorAll('*')).find((node) => {
      const n = node.getBoundingClientRect()
      const fill = getComputedStyle(node).backgroundColor
      return n.width < r.width - 2 && n.height > 0 && fill !== 'rgba(0, 0, 0, 0)'
    })
    const p = plateNode?.getBoundingClientRect()
    return {
      width: r.width,
      height: r.height,
      y: r.top,
      background: style.backgroundColor,
      borderWidth: style.borderTopWidth,
      borderStyle: style.borderTopStyle,
      borderColor: style.borderTopColor,
      image,
      plate:
        plateNode && p
          ? {
              left: p.left - r.left,
              right: r.right - p.right,
              top: p.top - r.top,
              height: p.height,
              background: getComputedStyle(plateNode).backgroundColor,
              text: (plateNode.textContent ?? '').trim(),
            }
          : null,
    }
  })
}

// --- Story 17.2 Choose a month or year by its bar (stats-bars-select.spec.ts) -----

/**
 * The bars' library at fake today 2026-10-28, Book ids `bookId(1)` to `bookId(8)`.
 * Custom 1 February – 15 April 2026 (`FEB_APR`) is 6 books, 2,152 pages, in three
 * bars that all have finishes:
 * - February: Kindred, 10 Feb, 286 pages (its only finish).
 * - March: Emma 28 Mar (400), Designing Data-Intensive Applications 14 Mar (611, 4 stars),
 *   Beloved 3 Mar (324): 3 books, 1,335 pages.
 * - April: Piranesi 10 Apr (245) and Kindred again, 2 Apr (286): 2 books, 531 pages.
 * This year adds Dune (back-filled, 1 Jun, 412) and Extreme Notes (12 Oct, 1 page):
 * 8 books, 2,565 pages, with January, May, July, August and September empty.
 * All time adds Solaris (back-filled, 15 Jan 2024, 304 pages), so it spans more than
 * 24 months and is bucketed by year: 2024 (1 book, 304 pages), 2025 empty, 2026.
 */
export const BARS = {
  books: [
    {
      id: bookId(1),
      title: 'Designing Data-Intensive Applications',
      authors: ['Martin Kleppmann'],
      pages: 616,
      readings: [done('2026-02-20', '2026-03-14', 611, 4)],
    },
    {
      id: bookId(2),
      title: 'Beloved',
      authors: ['Toni Morrison'],
      pages: 324,
      readings: [done('2026-02-25', '2026-03-03', 324, null)],
    },
    {
      id: bookId(3),
      title: 'Emma',
      authors: ['Jane Austen'],
      pages: 400,
      readings: [done('2026-03-15', '2026-03-28', 400, null)],
    },
    {
      id: bookId(4),
      title: 'Kindred',
      authors: ['Octavia E. Butler'],
      pages: 286,
      readings: [done('2026-02-01', '2026-02-10', 286, null), done('2026-03-29', '2026-04-02', 286, null)],
    },
    {
      id: bookId(5),
      title: 'Piranesi',
      authors: ['Susanna Clarke'],
      pages: 245,
      readings: [done('2026-04-03', '2026-04-10', 245, null)],
    },
    {
      id: bookId(6),
      title: 'Dune',
      authors: ['Frank Herbert'],
      pages: 412,
      readings: [done(null, '2026-06-01', 412, null)],
    },
    {
      id: bookId(7),
      title: 'Extreme Notes',
      authors: ['Kent Beck', 'Ward Cunningham', 'Ron Jeffries'],
      pages: 1,
      readings: [done('2026-10-11', '2026-10-12', 1, null)],
    },
    {
      id: bookId(8),
      title: 'Solaris',
      authors: ['Stanisław Lem'],
      pages: 304,
      readings: [done(null, '2024-01-15', 304, null)],
    },
  ],
}

/** Custom 1 February – 15 April 2026, as the address names it. */
export const FEB_APR = '/stats?range=custom&from=2026-02-01&to=2026-04-15'

/** `FEB_APR`'s bars, oldest first, named from their buckets (UX-DR109). */
export const FEB_APR_BARS = [
  'February 2026, 1 book, 286 pages',
  'March 2026, 3 books, 1,335 pages',
  'April 2026, 2 books, 531 pages',
]

/** `FEB_APR`'s rows, in the view's order. */
export const FEB_APR_ROWS = [
  'Piranesi, Susanna Clarke, finished 10 Apr 2026, 245 pages',
  'Kindred, Octavia E. Butler, finished 2 Apr 2026, 286 pages',
  'Emma, Jane Austen, finished 28 Mar 2026, 400 pages',
  'Designing Data-Intensive Applications, Martin Kleppmann, finished 14 Mar 2026, 611 pages, 4 stars',
  'Beloved, Toni Morrison, finished 3 Mar 2026, 324 pages',
  'Kindred, Octavia E. Butler, finished 10 Feb 2026, 286 pages',
]

/** March 2026's rows: the three finishes whose `finishDate` starts with `2026-03`. */
export const MARCH_ROWS = FEB_APR_ROWS.slice(2, 5)

/** April 2026's rows. */
export const APRIL_ROWS = FEB_APR_ROWS.slice(0, 2)

/** The chart: a `group` named "Finished by month" or "Finished by year" (UX-DR109). */
export function barChart(page: Page, bucket: 'month' | 'year'): Locator {
  return page.getByRole('main').getByRole('group', { name: `Finished by ${bucket}`, exact: true })
}

/** Every bar button in the chart, whichever its bucket, oldest first. */
export function chartBars(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('group', { name: /^Finished by (month|year)$/ })
    .getByRole('button')
}

/** The bar button for `period` as its name starts ("March 2026", "2024"). */
export function bar(page: Page, period: string): Locator {
  return page
    .getByRole('main')
    .getByRole('group', { name: /^Finished by (month|year)$/ })
    .getByRole('button', { name: new RegExp(`^${period}, `) })
}

/** **Show the whole range**: a link-styled button beside the list's heading (UX-DR111). */
export function showWholeRange(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Show the whole range', exact: true })
}

export type Focusable = { label: string; tabIndex: number }

/**
 * Every element inside `container` that can take focus (a link, an enabled
 * button, input or select, or anything with a `tabindex`), in document order,
 * as its `aria-label` (else its text, white space collapsed) and its `tabIndex`. A roving Tab
 * stop shows as exactly one entry with `tabIndex` 0. A one-shot read.
 */
export function focusablesIn(container: Locator): Promise<Focusable[]> {
  return container.evaluate((root) =>
    Array.from(root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'))
      .filter((node) => !(node as HTMLButtonElement).disabled)
      .map((node) => ({
        label: node.getAttribute('aria-label') ?? (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
        tabIndex: (node as HTMLElement).tabIndex,
      })),
  )
}

export type BarLook = {
  cursor: string
  /** The 160px track: its ring (box-shadow), its outline and its transition. */
  track: {
    shadow: string
    outlineStyle: string
    outlineWidth: string
    outlineOffset: string
    outlineColor: string
    transition: string
  }
  /** The fill inside the track, its opacity taken up to the bar; null with no fill. */
  fill: { opacity: number; transition: string } | null
  /** Each element in the bar holding text of its own (value, period lines), its opacity taken up to the bar. */
  labels: { text: string; color: string; weight: string; opacity: number }[]
}

/**
 * How a bar is drawn, found by geometry and text rather than class names: the
 * track is the first element inside `bar` that is 160px tall to within half a
 * pixel (DESIGN.md → Monthly bars), its fill the track's first child. Opacities
 * multiply every ancestor's up to and including `bar`, so dimming set on the
 * column shows on its labels too. A one-shot read.
 */
export function barLook(bar: Locator): Promise<BarLook> {
  return bar.evaluate((root) => {
    const opacity = (node: Element): number => {
      let value = 1
      for (let n: Element | null = node; n !== null; n = n === root ? null : n.parentElement) {
        value *= Number(getComputedStyle(n).opacity)
      }
      return value
    }
    const nodes = Array.from(root.querySelectorAll('*'))
    const track = nodes.find((node) => Math.abs(node.getBoundingClientRect().height - 160) <= 0.5)
    if (!track) throw new Error('no 160px track in the bar')
    const trackStyle = getComputedStyle(track)
    const fill = track.firstElementChild
    const ownText = (node: Element) =>
      Array.from(node.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
    return {
      cursor: getComputedStyle(root).cursor,
      track: {
        shadow: trackStyle.boxShadow,
        outlineStyle: trackStyle.outlineStyle,
        outlineWidth: trackStyle.outlineWidth,
        outlineOffset: trackStyle.outlineOffset,
        outlineColor: trackStyle.outlineColor,
        transition: trackStyle.transitionDuration,
      },
      fill: fill === null ? null : { opacity: opacity(fill), transition: getComputedStyle(fill).transitionDuration },
      labels: [root, ...nodes].filter(ownText).map((node) => ({
        text: (node.textContent ?? '').trim(),
        color: getComputedStyle(node).color,
        weight: getComputedStyle(node).fontWeight,
        opacity: opacity(node),
      })),
    }
  })
}
