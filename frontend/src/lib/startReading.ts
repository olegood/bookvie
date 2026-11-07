// Which start action a Book offers (EXPERIENCE.md → Book states): from what
// the server says (`role`, `finished`, and whether a Reading is in progress),
// never from the Readings themselves. The one source for the label of every
// opener (Book detail, the spine popover, Home's Up next pane and the empty
// Main book card) and for the Start dialog's Start or Resume.

import type { BookDetailView, HomeUpNext, ShelfBook } from '../api/index.ts'

export type StartAction = 'Resume' | 'Start reading'

/**
 * A paused Book: `waiting`, or `upNext` with a Reading in progress (the
 * server's `currentReading`, `currentPage` or `paused`). A finished Up next
 * with no Reading in progress is not paused: it gets **Start reading**.
 */
function paused(role: ShelfBook['role'], inProgress: boolean): boolean {
  return role === 'waiting' || (role === 'upNext' && inProgress)
}

/**
 * Book detail's state-aware primary: none for the Main book, **Resume** for
 * a paused Book (a paused Up next included), else **Start reading** (a
 * finished Book's re-read included).
 */
export function detailPrimary(book: Pick<BookDetailView, 'role' | 'currentReading'>): StartAction | null {
  if (book.role === 'main') return null
  return paused(book.role, book.currentReading !== null) ? 'Resume' : 'Start reading'
}

/**
 * The spine popover's start action: **Resume** for a paused Book, "Start
 * reading" for one never started and never finished, and for an Up next
 * Book with no Reading in progress (finished or not); none for the Main book
 * or a finished Book without a role (re-read from Book detail).
 */
export function popoverStart(book: Pick<ShelfBook, 'role' | 'finished' | 'currentPage'>): StartAction | null {
  if (paused(book.role, book.currentPage !== null)) return 'Resume'
  if (book.role === 'upNext') return 'Start reading'
  if (book.role === null && !book.finished) return 'Start reading'
  return null
}

/** The Up next pane's and the empty Main book card's action for the home view's Up next. */
export function upNextStart(upNext: Pick<HomeUpNext, 'paused'>): StartAction {
  return paused('upNext', upNext.paused) ? 'Resume' : 'Start reading'
}
