// Shared by the Epic 3 specs (Home, the Start dialog, and later the page field
// and the finish): the seeded Books, a library with a Main book, the Main book
// card, and servers started with `--fake-today` (TC-2, AD-20).

import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { expect, type Server, startSeededServer, test } from './fixtures.ts'

export const FAKE_TODAY = '2026-10-28' // a Wednesday
export const FAKE_NOW = new Date('2026-10-28T10:00:00+01:00') // CET: DST ended on 25 October
/** What the server's fake clock calls "now": local noon on the fake today (`FakeClock`). */
export const SERVER_NOW = new Date('2026-10-28T12:00:00+01:00')

export const LEFT_HAND_ID = '3b8f2c1a-5d4e-4f6a-9b7c-1e2d3c4b5a69'
export const DUNE_ID = '6f1c1d2e-9a4b-4c3d-8e5f-0a1b2c3d4e5f'
export const LEFT_HAND = {
  id: LEFT_HAND_ID,
  title: 'The Left Hand of Darkness',
  authors: ['Ursula K. Le Guin'],
  pages: 330,
}
export const DUNE = { id: DUNE_ID, title: 'Dune', authors: ['Frank Herbert'], pages: 412 }

/** A library whose Main book is The Left Hand of Darkness at `page`, plus `others`. */
export function mainAt(page: number, { others = [] as object[], book = {}, reading = {} } = {}) {
  return {
    mainBookId: LEFT_HAND_ID,
    books: [{ ...LEFT_HAND, ...book, readings: [{ currentPage: page, ...reading }] }, ...others],
  }
}

/** The Main book card, with or without a Main book. */
export function mainBookCard(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Main book', exact: true })
}

/** The Start dialog, by its heading: "Start *X*?" or "Resume *X*?". */
export function startDialog(page: Page, heading: string): Locator {
  return page.getByRole('dialog', { name: heading, exact: true })
}

/** Home's Up next pane in the side column: a `region` named by its section label. */
export function upNextPane(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Up next', exact: true })
}

/** Home's Waiting for you pane in the side column: a `region` named by its heading "Waiting for you (N)". */
export function waitingPane(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: /^Waiting for you \(\d+\)$/ })
}

/** The pane's heading with its count, exactly. */
export function waitingHeading(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('heading', { name: `Waiting for you (${count})`, exact: true })
}

/**
 * The rows' title links in the pane, in order: each row's one link. Assert with
 * `await expect(rowLinks(pane)).toHaveText([...])`, which retries until Home has
 * rendered the rows (Epic 5 retro item 51: a one-shot read could run first and get []).
 */
export function rowLinks(pane: Locator): Locator {
  return pane.getByRole('link')
}

/** The computed `font-family`, to tell the serif book-title face (`ui-serif…`) apart. */
export function fontFamily(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).fontFamily)
}

/** The rendered size of an element, rounded to whole pixels. */
export async function sizeOf(locator: Locator): Promise<{ width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('not rendered')
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

/**
 * The re-entry line's facts, in order (Story 3.4): the children of the element
 * holding "Last updated …". The dots between them are drawn by CSS, not text.
 */
export function reentryFacts(page: Page): Locator {
  return mainBookCard(page)
    .getByText(/^Last updated /)
    .locator('xpath=..')
    .locator(':scope > *')
}

/**
 * The same facts, reached through the "Last export" fact, which is always in
 * the line: for a Reading without `lastProgressUpdate`.
 */
export function reentryFactsByExport(page: Page): Locator {
  return mainBookCard(page)
    .getByText(/^(Last export: .+|No export yet)$/)
    .locator('xpath=..')
    .locator(':scope > *')
}

/** Starts a seeded server with `--fake-today` and fixes the browser clock to the same day. */
export async function serverAtFakeToday(
  page: Page,
  name: string,
  partial: Record<string, unknown>,
  files: Record<string, string | Buffer> = {},
): Promise<Server> {
  await page.clock.setFixedTime(FAKE_NOW)
  return startSeededServer(test.info(), name, partial, files, { fakeToday: FAKE_TODAY })
}

export async function stopAndRemove(server: Server): Promise<void> {
  expect(await server.stop()).toBe('')
  rmSync(server.dataDir, { recursive: true, force: true })
}

type StoredReading = Record<string, unknown> & { id: string }
type StoredBook = Record<string, unknown> & { id: string; readings: StoredReading[] }
export type StoredLibrary = Record<string, unknown> & { mainBookId: string | null; books: StoredBook[] }

/** `library.json` as the server last committed it. */
export function storedLibrary(server: Server): StoredLibrary {
  return JSON.parse(readFileSync(path.join(server.dataDir, 'library.json'), 'utf8')) as StoredLibrary
}

/** One Book of `library.json`, by id. */
export function storedBook(server: Server, id: string): StoredBook {
  const book = storedLibrary(server).books.find((candidate) => candidate.id === id)
  if (book === undefined) throw new Error(`no Book ${id} in ${server.dataDir}/library.json`)
  return book
}

/** `library.json`'s bytes, to prove that nothing changed. */
export function libraryBytes(server: Server): string {
  return readFileSync(path.join(server.dataDir, 'library.json'), 'utf8')
}

/** Home's bookcase slice list, "Bookcase slice, N rows". */
export function slice(page: Page): Locator {
  return page.getByRole('main').getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
}

export function sliceSpines(page: Page): Locator {
  return slice(page).getByRole('button')
}

export function sliceSpine(page: Page, title: string): Locator {
  return slice(page).getByRole('button', { name: new RegExp(`^${title} by `) })
}

/** The slice's spine titles grouped into rows as displayed (same bottom edge = one plank). */
export async function sliceRows(page: Page): Promise<string[][]> {
  const spines = await sliceSpines(page).evaluateAll((elements) =>
    elements.map((element) => ({
      title: (element.getAttribute('aria-label') ?? '').split(' by ')[0],
      bottom: Math.round(element.getBoundingClientRect().bottom),
    })),
  )
  const rows: string[][] = []
  spines.forEach((spine, index) => {
    if (index === 0 || spine.bottom !== spines[index - 1].bottom) rows.push([])
    rows.at(-1)!.push(spine.title)
  })
  return rows
}

/** How many spines fit on one plank of the slice at the current width. */
export async function rowCapacity(page: Page): Promise<number> {
  return slice(page).evaluate((list) => {
    const style = getComputedStyle(list)
    const width = list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const [first, second] = Array.from(list.querySelectorAll('button')).map((b) => b.getBoundingClientRect())
    const gap = second.left - first.right
    return Math.floor((width + gap) / (first.width + gap))
  })
}

/**
 * The test's oracle for UX-DR31: pack `titles` (bookcase order) into rows of
 * `k`, choose up to 3 rows (Main's, Up next's, then the finishes' in the
 * server's priority order, else the first rows), display Main's row first and
 * the rest in bookcase order.
 */
export function expectedSlice(titles: string[], k: number, priority: string[], hasMain: boolean): string[][] {
  const rows = Array.from({ length: Math.ceil(titles.length / k) }, (_, r) => titles.slice(r * k, (r + 1) * k))
  const chosen: number[] = []
  for (const title of priority) {
    const row = Math.floor(titles.indexOf(title) / k)
    if (!chosen.includes(row) && chosen.length < 3) chosen.push(row)
  }
  for (let row = 0; row < rows.length && chosen.length < 3; row++) if (!chosen.includes(row)) chosen.push(row)
  const [first, ...rest] = chosen
  const order = hasMain ? [first, ...rest.sort((a, b) => a - b)] : [...chosen].sort((a, b) => a - b)
  return order.map((row) => rows[row])
}
