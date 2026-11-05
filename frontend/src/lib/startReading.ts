// Which start action a Book offers (EXPERIENCE.md → Book states): from the
// server's `role` and `finished`, never from the Readings themselves.

import type { BookDetailView, ShelfBook } from '../api/index.ts'

export type StartAction = 'Resume' | 'Start reading'

/**
 * A paused Book: `waiting`. An Up next Book may or may not have a paused
 * Reading, and the views don't say which until Epic 4 (Story 4.1), so it
 * gets **Start reading** here.
 */
function paused(role: ShelfBook['role']): boolean {
  return role === 'waiting'
}

/**
 * Book detail's state-aware primary: none for the Main book, **Resume** for
 * a paused Book, else **Start reading** (a finished Book's re-read included).
 */
export function detailPrimary(book: Pick<BookDetailView, 'role'>): StartAction | null {
  if (book.role === 'main') return null
  return paused(book.role) ? 'Resume' : 'Start reading'
}

/**
 * The spine popover's start action: **Resume** for a paused Book, "Start
 * reading" for one never started and never finished, none for the Main book
 * or a finished Book without a Reading in progress (re-read from Book detail).
 * Up next gets none: whether it is paused is Epic 4's to say.
 */
export function popoverStart(book: Pick<ShelfBook, 'role' | 'finished'>): StartAction | null {
  if (paused(book.role)) return 'Resume'
  if (book.role === null && !book.finished) return 'Start reading'
  return null
}
