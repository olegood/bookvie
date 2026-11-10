// The Card notes pile's e2e seeds and helpers, shared by card-notes-pile.spec.ts
// (story 5.4) and card-notes-pile-keys.spec.ts (spec-pile-arrow-key-navigation).

import type { Locator, Page } from '@playwright/test'
import { DUNE, LEFT_HAND } from './home.ts'

export const NEUROMANCER_ID = '2a7b9c1d-3e4f-4a5b-9c6d-7e8f9a0b1c2d'
export const FEAR = 'Fear is the mind-killer.'
export const BEGINNING = 'A beginning is the time for taking the most delicate care.'
export const SPICE = 'The spice must flow.'
export const MYSTERY = 'The mystery of life isn’t a problem to solve.'

/** Dune's notes in page order: p.12, pp.42–45, p.96, p.300. */
export const DUNE_IN_PAGE_ORDER = [FEAR, BEGINNING, SPICE, MYSTERY]

/** Dune with four notes, seeded out of page order. The block shows the first three. */
export const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { text: MYSTERY, pageStart: 300 },
    { text: FEAR, pageStart: 12 },
    { text: SPICE, pageStart: 96 },
    { text: BEGINNING, pageStart: 42, pageEnd: 45 },
  ],
}

export const LEFT_HAND_WITH_NOTES = {
  ...LEFT_HAND,
  cardNotes: [
    { text: 'On the Ice, the two of them were alone.', pageStart: 151 },
    { text: 'Light is the left hand of darkness.', pageStart: 42 },
  ],
}

/** A one-note pile: both Previous and Next are disabled. */
export const NEUROMANCER = {
  id: NEUROMANCER_ID,
  title: 'Neuromancer',
  authors: ['William Gibson'],
  pages: 271,
  cardNotes: [{ text: 'The sky above the port was the color of television.', pageStart: 3 }],
}

/** Seven notes in three Books; the Card notes page lists Dune, The Left Hand of Darkness, Neuromancer. */
export const LIBRARY = { books: [NEUROMANCER, DUNE_WITH_NOTES, LEFT_HAND_WITH_NOTES] }

export function cardNotesPage(server: { url: string }, bookId?: string): string {
  return bookId === undefined ? `${server.url}/card-notes` : `${server.url}/card-notes?book=${bookId}`
}

/** The pile: a modal named "Card notes pile, X". */
export function pile(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: `Card notes pile, ${title}`, exact: true })
}

/** "Go through as a pile": a `button`, since it opens a dialog. */
export function pileOpener(scope: Locator): Locator {
  return scope.getByRole('button', { name: 'Go through as a pile', exact: true })
}

/** "N of M" in the pile. */
export function position(dialog: Locator): Locator {
  return dialog.getByText(/^\d+ of \d+$/)
}

/** The pile's polite live region. */
export function announcement(dialog: Locator): Locator {
  return dialog.getByRole('status')
}

export function nextButton(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Next', exact: true })
}

export function previousButton(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Previous', exact: true })
}

/** The "Order" radio group: Page order · Shuffled. */
export function orderGroup(dialog: Locator): Locator {
  return dialog.getByRole('radiogroup', { name: 'Order', exact: true })
}

/** One Book's group on the Card notes page: the section headed by its serif title. */
export function group(page: Page, title: string): Locator {
  return page
    .getByRole('main')
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) })
}

/** Presses a pile button by keyboard: an `aria-disabled` button stays focusable and pressable. */
export async function press(button: Locator): Promise<void> {
  await button.focus()
  await button.press('Enter')
}

/** The text of the note just announced: "Note 2 of 4, pp.42–45: <text>". */
export async function announcedNote(dialog: Locator): Promise<string> {
  const text = (await announcement(dialog).textContent()) ?? ''
  return text.replace(/^Note \d+ of \d+, pp?\.[\d–]+: /, '')
}

/** Seeds `Math.random` with mulberry32, so Shuffled gives the same order on every run. */
export async function seededRandom(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })
}

/** Dune's notes by text, with their Edit names on the Card notes page. */
export const DUNE_EDIT_BY_TEXT: Record<string, string> = {
  [FEAR]: 'Edit p.12',
  [BEGINNING]: 'Edit pp.42–45',
  [SPICE]: 'Edit p.96',
  [MYSTERY]: 'Edit p.300',
}
