// Mark finished's offer and copy on Book detail (EXPERIENCE.md → Book detail
// actions, FR-14). Only the server decides what `finish-reading` stores; the
// client offers it from the Book's `role`, its Reading in progress and
// `finished`.

import type { BookDetailView } from '../api/index.ts'

/**
 * Book detail offers **Mark finished** for the Main book, a Book with a
 * Reading in progress (paused, Up next or not), and a Book never finished
 * (back-filled on Done). A finished Book with no Reading in progress doesn't
 * get it, even when it is Up next.
 */
export function detailOffersFinish(book: Pick<BookDetailView, 'role' | 'currentReading' | 'finished'>): boolean {
  return book.role === 'main' || book.currentReading !== null || !book.finished
}

/** The `status` line after a non-Main finish on Book detail: "Finished Dune.". */
export function finishedStatus(title: string): string {
  return `Finished ${title}.`
}
