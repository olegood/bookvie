// The Card notes shelf's e2e seeds and helpers (Story 14.2): the remembered
// view's key, a library whose Books sit on every edge of the pile step, the
// toggle, boxes and count line by role and name, and two measuring helpers:
// `columnsOf` (how many boxes share the first row) and `boxLook` (a box's
// front, label, title, count and cards, found by their text and background,
// not by class names, with each part's layout box as it is before any
// rotation). Story 14.3 adds the open box's helpers: `openBoxColor` (a
// scope's spine color from the view) and the measuring helper `openBoxStrip`.

import type { Locator, Page } from '@playwright/test'
import { finished } from './bookcase.ts'
import { bookId, rgbOf } from './library.ts'

export { cardNotesPage } from './pile.ts'

/** The remembered Card notes view (EXPERIENCE.md → Card notes shelf → Remembered). */
export const VIEW_KEY = 'bookvie.cardNotesView'

/** `count` notes for a Book, in page order: "Emma note 01: a line worth keeping." … */
export function notesOf(title: string, count: number): { text: string; pageStart: number }[] {
  return Array.from({ length: count }, (_, n) => ({
    text: `${title} note ${String(n + 1).padStart(2, '0')}: a line worth keeping.`,
    pageStart: n + 1,
  }))
}

/** A title far too long for the label's two lines. */
export const FLIGHTS =
  'Flights of Memory Across Seven Continents and the Long Afternoons Between Them, Collected and Annotated'

/** Spine colors the seed sets by hand, so a box front can be checked against them. */
export const ANATHEM_COLOR = '#6B4E71'
export const DUBLINERS_COLOR = '#2F6B6B'

/**
 * Six Books with 21, 1, 5, 2, 6 and 20 notes (every edge of the pile step),
 * seeded out of title order, plus Austerlitz and Middlemarch without notes.
 * Anathem, Beloved, Candide and Flights are read; Dubliners (a color set by
 * the user) and Emma (its curated color) are unread.
 */
export const PILE_SHELF = {
  books: [
    {
      id: bookId(6),
      title: FLIGHTS,
      authors: ['Olga Tokarczuk'],
      pages: 400,
      readings: finished(),
      cardNotes: notesOf('Flights', 20),
    },
    {
      id: bookId(2),
      title: 'Beloved',
      authors: ['Toni Morrison'],
      pages: 324,
      readings: finished(),
      cardNotes: notesOf('Beloved', 1),
    },
    { id: bookId(7), title: 'Austerlitz', authors: ['W. G. Sebald'], pages: 298 },
    {
      id: bookId(4),
      title: 'Dubliners',
      authors: ['James Joyce'],
      pages: 152,
      spineColorUser: DUBLINERS_COLOR,
      cardNotes: notesOf('Dubliners', 2),
    },
    {
      id: bookId(1),
      title: 'Anathem',
      authors: ['Neal Stephenson'],
      pages: 937,
      spineColorUser: ANATHEM_COLOR,
      readings: finished(),
      cardNotes: notesOf('Anathem', 21),
    },
    { id: bookId(5), title: 'Emma', authors: ['Jane Austen'], pages: 474, cardNotes: notesOf('Emma', 6) },
    {
      id: bookId(3),
      title: 'Candide',
      authors: ['Voltaire'],
      pages: 144,
      readings: finished(),
      cardNotes: notesOf('Candide', 5),
    },
    { id: bookId(8), title: 'Middlemarch', authors: ['George Eliot'], pages: 880 },
  ],
}

/** PILE_SHELF's boxes in the groups' order: title, Book id, note count, cards shown. */
export const PILE_BOXES = [
  { title: 'Anathem', id: bookId(1), notes: 21, cards: 7 },
  { title: 'Beloved', id: bookId(2), notes: 1, cards: 1 },
  { title: 'Candide', id: bookId(3), notes: 5, cards: 3 },
  { title: 'Dubliners', id: bookId(4), notes: 2, cards: 3 },
  { title: 'Emma', id: bookId(5), notes: 6, cards: 5 },
  { title: FLIGHTS, id: bookId(6), notes: 20, cards: 5 },
]

/** PILE_SHELF's count line: 55 notes in 6 Books. */
export const PILE_COUNT_LINE = '55 card notes in 6 Books'

/** "12 card notes", "1 card note". */
export function noteCount(count: number): string {
  return count === 1 ? '1 card note' : `${count} card notes`
}

/** A box's accessible name: "*Title*, N card notes". */
export function boxName(title: string, count: number): string {
  return `${title}, ${noteCount(count)}`
}

/** Forty Books with one note each: eight rows of boxes, several windows tall at 1280×720. */
export const MANY_BOXES = {
  books: Array.from({ length: 40 }, (_, n) => {
    const title = `Book ${String(n + 1).padStart(2, '0')}`
    return { id: bookId(n + 1), title, authors: ['Author'], pages: 200, cardNotes: notesOf(title, 1) }
  }),
}

/** The Card notes view toggle: a `group` named "Card notes view", inside main. */
export function cardNotesViewToggle(page: Page): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Card notes view', exact: true })
}

export function viewButton(page: Page, name: 'Boxes' | 'List'): Locator {
  return cardNotesViewToggle(page).getByRole('button', { name, exact: true })
}

/** Every Card note box: a link in main to an open box. */
export function boxLinks(page: Page): Locator {
  return page.getByRole('main').locator('a[href^="/card-notes?book="]')
}

/** One box, by its accessible name. */
export function box(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('link', { name, exact: true })
}

/** The Search card notes field, inside main. */
export function searchField(page: Page): Locator {
  return page.getByRole('main').getByRole('searchbox', { name: 'Search card notes', exact: true })
}

/** The List view's group titles, in order. */
export function groupHeadings(page: Page): Locator {
  return page.getByRole('main').getByRole('heading', { level: 2 })
}

/** How many boxes stand in the first row: those whose top is the first box's top (to 1px). */
export function columnsOf(page: Page): Promise<number> {
  return boxLinks(page).evaluateAll((links) => {
    if (links.length === 0) return 0
    const tops = links.map((link) => link.getBoundingClientRect().top)
    return tops.filter((top) => Math.abs(top - tops[0]) < 1).length
  })
}

/** A part's layout box relative to the box's top-left, before any transform (the center stays put under a rotation). */
export type PartRect = { left: number; top: number; width: number; height: number }

export type CardLook = PartRect & {
  /** The rotation in degrees, to one decimal (from `rotate` or `transform`). */
  angle: number
  background: string
  border: string
  radius: string
}

export type BoxLook = {
  width: number
  height: number
  front: (PartRect & { background: string; radius: string; boxShadow: string; borderWidth: string }) | null
  label: (PartRect & { background: string; radius: string; padding: string }) | null
  title: { fontFamily: string; fontSize: string; color: string; lines: number; truncated: boolean } | null
  count: { fontSize: string; color: string } | null
  /** Back to front: sorted by top, the back card highest. */
  cards: CardLook[]
}

/**
 * A box's parts, found inside the link without class names: the title is the
 * deepest element whose text is `title`, the count the deepest whose text is
 * `count`, the label their nearest common ancestor, the front the label's
 * nearest ancestor with a background, and the cards every other element with
 * a background that neither holds nor sits inside the front.
 */
export function boxLook(link: Locator, title: string, count: string): Promise<BoxLook> {
  return link.evaluate(
    (root, [title, count]) => {
      const base = root.getBoundingClientRect()
      const painted = (el: Element) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
      const rect = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        const width = el.offsetWidth
        const height = el.offsetHeight
        return {
          left: Math.round(((r.left + r.right) / 2 - width / 2 - base.left) * 100) / 100,
          top: Math.round(((r.top + r.bottom) / 2 - height / 2 - base.top) * 100) / 100,
          width,
          height,
        }
      }
      const deepest = (text: string) =>
        Array.from(root.querySelectorAll<HTMLElement>('*'))
          .filter((el) => (el.textContent ?? '').trim() === text)
          .find((el) => !Array.from(el.children).some((child) => (child.textContent ?? '').trim() === text)) ?? null
      const angleOf = (el: Element) => {
        const style = getComputedStyle(el)
        if (style.rotate !== 'none') return Math.round(Number.parseFloat(style.rotate) * 10) / 10
        if (style.transform === 'none') return 0
        const [a, b] = style.transform
          .replace(/^matrix\(|\)$/g, '')
          .split(',')
          .map(Number)
        return Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 10) / 10
      }
      const titleEl = deepest(title)
      const countEl = deepest(count)
      let label: HTMLElement | null = null
      if (titleEl && countEl) {
        label = titleEl.parentElement
        while (label && !label.contains(countEl)) label = label.parentElement
        if (label === root || (label && !root.contains(label))) label = null
      }
      let front: HTMLElement | null = label?.parentElement ?? null
      while (front && front !== root && !painted(front)) front = front.parentElement
      if (front === root) front = null
      const cards = Array.from(root.querySelectorAll<HTMLElement>('*'))
        .filter((el) => painted(el) && el !== label && (!front || (!front.contains(el) && !el.contains(front))))
        .map((el) => {
          const style = getComputedStyle(el)
          return {
            ...rect(el),
            angle: angleOf(el),
            background: style.backgroundColor,
            border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
            radius: style.borderTopLeftRadius,
          }
        })
        .sort((a, b) => a.top - b.top)
      const titleStyle = titleEl ? getComputedStyle(titleEl) : null
      return {
        width: base.width,
        height: base.height,
        front: front
          ? {
              ...rect(front),
              background: getComputedStyle(front).backgroundColor,
              // Clockwise from top left, as `border-radius: 6px 6px 12px 12px` lists them.
              radius: [
                getComputedStyle(front).borderTopLeftRadius,
                getComputedStyle(front).borderTopRightRadius,
                getComputedStyle(front).borderBottomRightRadius,
                getComputedStyle(front).borderBottomLeftRadius,
              ].join(' '),
              boxShadow: getComputedStyle(front).boxShadow,
              borderWidth: getComputedStyle(front).borderTopWidth,
            }
          : null,
        label: label
          ? {
              ...rect(label),
              background: getComputedStyle(label).backgroundColor,
              radius: getComputedStyle(label).borderTopLeftRadius,
              padding: getComputedStyle(label).padding,
            }
          : null,
        title:
          titleEl && titleStyle
            ? {
                fontFamily: titleStyle.fontFamily,
                fontSize: titleStyle.fontSize,
                color: titleStyle.color,
                lines: Math.round(titleEl.clientHeight / Number.parseFloat(titleStyle.lineHeight)),
                truncated: titleEl.scrollHeight > titleEl.clientHeight + 1,
              }
            : null,
        count: countEl
          ? { fontSize: getComputedStyle(countEl).fontSize, color: getComputedStyle(countEl).color }
          : null,
        cards,
      }
    },
    [title, count] as const,
  )
}

/** The `card-notes` view's `scope.spineColor` for one Book (Story 14.1), as `rgb(…)`; a Book with no notes has one too. */
export async function openBoxColor(page: Page, url: string, id: string): Promise<string> {
  const response = await page.request.get(`${url}/api/views/card-notes?book=${id}`)
  const body = (await response.json()) as { scope: { spineColor: string } }
  return rgbOf(body.scope.spineColor)
}

/** True for the `card-notes` view's request, scoped or not, whatever its query (for `page.route`). */
export function isCardNotesView(url: URL): boolean {
  return url.pathname === '/api/views/card-notes'
}

export type StripLook = {
  /** The strip's rect in the window, and the app shell header's bottom edge and the window's width beside it. */
  top: number
  left: number
  width: number
  height: number
  headerBottom: number
  windowWidth: number
  background: string
  /** The four border widths, top right bottom left. */
  borders: string
  boxShadow: string
  text: string
  /** Inside an `aria-hidden="true"` subtree (itself included). */
  hidden: boolean
  forcedColorAdjust: string
}

/**
 * The open box strip (Story 14.3), found without class names: the first
 * element outside the app shell's header and any dialog whose background
 * color has a nonzero alpha and whose rect is under 40px tall and at least half the
 * window wide. `null` when there's none. A strip drawn only by a background
 * image or a pseudo-element isn't found.
 */
export function openBoxStrip(page: Page): Promise<StripLook | null> {
  return page.evaluate(() => {
    const header = document.querySelector('nav[aria-label="Main"]')?.closest('header') ?? null
    const headerBottom = header ? header.getBoundingClientRect().bottom : Number.NaN
    const windowWidth = document.documentElement.clientWidth
    const strip = Array.from(document.body.querySelectorAll<HTMLElement>('*')).find((el) => {
      if (header?.contains(el) || el.closest('dialog, [role="dialog"], [role="alertdialog"]')) return false
      // Transparent is any zero alpha: forced colors writes it `rgba(255, 255, 255, 0)`.
      if (/^rgba\(.*,\s*0\)$/.test(getComputedStyle(el).backgroundColor)) return false
      const rect = el.getBoundingClientRect()
      return rect.height > 0 && rect.height < 40 && rect.width >= windowWidth / 2
    })
    if (!strip) return null
    const rect = strip.getBoundingClientRect()
    const style = getComputedStyle(strip)
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      headerBottom,
      windowWidth,
      background: style.backgroundColor,
      borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].join(' '),
      boxShadow: style.boxShadow,
      text: (strip.textContent ?? '').trim(),
      hidden: strip.closest('[aria-hidden="true"]') !== null,
      forcedColorAdjust: style.forcedColorAdjust,
    }
  })
}
