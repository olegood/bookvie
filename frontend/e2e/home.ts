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
