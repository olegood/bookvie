// Shared by the Story 16.2 Favourites chip specs (favourites-chip.spec.ts and
// favourites-chip-stuck-unstar.spec.ts): the six-Book shelf with three
// starred, their spine and tile names, and the status recorder's non-empty
// lines. Moved out of favourites-chip.spec.ts for Epic 16 retro item 107.

import { finished } from './bookcase.ts'
import { bookId } from './library.ts'

/**
 * Six Books, three starred: two unread (Bleak House, Emma) and one finished
 * (Austerlitz). Under the default Author sort they stand Bleak House,
 * Dubliners, Emma, Flights, Candide, Austerlitz, so the starred ones are not
 * neighbours. "novel" is on three starred Books and Flights; "l" is in Bleak
 * House, Flights and Austerlitz, not in Emma.
 */
export const FAVOURITES_SHELF = [
  {
    id: bookId(1),
    title: 'Austerlitz',
    authors: ['W. G. Sebald'],
    tags: ['novel'],
    readings: finished(),
    favourite: true,
  },
  { id: bookId(2), title: 'Candide', authors: ['Voltaire'], tags: ['classic'], readings: finished() },
  { id: bookId(3), title: 'Flights', authors: ['Olga Tokarczuk'], tags: ['novel'], readings: finished() },
  { id: bookId(4), title: 'Bleak House', authors: ['Charles Dickens'], tags: ['novel', 'classic'], favourite: true },
  { id: bookId(5), title: 'Dubliners', authors: ['James Joyce'], tags: ['stories'] },
  { id: bookId(6), title: 'Emma', authors: ['Jane Austen'], tags: ['novel', 'classic'], favourite: true },
]

// Spine and tile names (AR71: a starred Book's name ends with ", favourite").
export const AUSTERLITZ = 'Austerlitz by W. G. Sebald, finished, favourite'
export const CANDIDE = 'Candide by Voltaire, finished'
export const FLIGHTS = 'Flights by Olga Tokarczuk, finished'
export const BLEAK_HOUSE = 'Bleak House by Charles Dickens, not read yet, favourite'
export const DUBLINERS = 'Dubliners by James Joyce, not read yet'
export const EMMA = 'Emma by Jane Austen, not read yet, favourite'

export const BY_AUTHOR = [BLEAK_HOUSE, DUBLINERS, EMMA, FLIGHTS, CANDIDE, AUSTERLITZ]
export const STARRED = [BLEAK_HOUSE, EMMA, AUSTERLITZ]

/** The status texts recorded so far, without the empty ones each announcement starts with. */
export async function spoken(announced: () => Promise<string[]>): Promise<string[]> {
  return (await announced()).filter((text) => text !== '')
}
