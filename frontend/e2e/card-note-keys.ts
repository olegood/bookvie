// Shared by the Story 9.1 specs (card-note-keyboard-save.spec.ts and its
// automate leaves): the Card note panel's lines, Dune with four Card notes at
// fixed ids, the panel and Book detail locators, and `countSubmits` /
// `submitsSoFar`, which count the form's `submit` events from page load on.

import type { Locator, Page } from '@playwright/test'
import { DUNE, mainBookCard } from './home.ts'

export const SAVED = 'Card note saved.'
export const SAVING = 'Saving the card note.'
export const COULDNT_SAVE = "Couldn't save. Your data wasn't changed."

export const FEAR_ID = 'a1e0c0de-0000-4000-8000-000000000012'
export const BEGINNING_ID = 'a1e0c0de-0000-4000-8000-000000000042'
export const SPICE_ID = 'a1e0c0de-0000-4000-8000-000000000096'
export const MYSTERY_ID = 'a1e0c0de-0000-4000-8000-000000000300'

/** Dune with four Card notes, seeded out of page order, with fixed ids. */
export const DUNE_WITH_NOTES = {
  ...DUNE,
  cardNotes: [
    { id: MYSTERY_ID, text: 'The mystery of life isn’t a problem to solve.', pageStart: 300 },
    { id: FEAR_ID, text: 'Fear is the mind-killer.', pageStart: 12 },
    { id: SPICE_ID, text: 'The spice must flow.', pageStart: 96 },
    {
      id: BEGINNING_ID,
      text: 'A beginning is the time for taking the most delicate care.',
      pageStart: 42,
      pageEnd: 45,
    },
  ],
}

/** The Card note panel in add mode: a modal `dialog` named by its heading. */
export function cardNotePanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Card note', exact: true })
}

/** The Card note panel in edit mode. */
export function editPanel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Edit card note', exact: true })
}

/** The Main book card's **Add card note**. */
export function addCardNote(page: Page): Locator {
  return mainBookCard(page).getByRole('button', { name: 'Add card note', exact: true })
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
export function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

/** The block's note whose text is `text`. */
export function noteItem(block: Locator, text: string): Locator {
  return block.getByRole('listitem').filter({ has: block.page().getByText(text, { exact: true }) })
}

/** A note's Edit: named "Edit p.96", so it never matches the Book's own Edit. */
export function editOf(item: Locator): Locator {
  return item.getByRole('button', { name: /^Edit\b/ })
}

/**
 * Counts every `submit` event from page load on. `requestSubmit()` fires one,
 * as a press of Save note does; a key handler that calls the save directly, or
 * `form.submit()`, fires none. Added before `goto`.
 */
export async function countSubmits(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = window as unknown as { submits: number }
    counter.submits = 0
    document.addEventListener('submit', () => (counter.submits += 1), true)
  })
}

export async function submitsSoFar(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { submits: number }).submits)
}
