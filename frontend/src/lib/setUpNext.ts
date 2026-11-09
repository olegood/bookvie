// Set as Up next's copy and where it is offered (EXPERIENCE.md → Book
// detail actions, Spine popover, Book states). Only the server decides what
// `set-up-next` stores; the client offers it from the Book's `role` and
// `finished`.

import type { BookDetailView, ShelfBook } from '../api/index.ts'

/** The hint under Set as Up next, on Book detail and in the popover, while any Book is Up next. */
export const REPLACES_UP_NEXT = 'Replaces the current Up next.'

/** The button's `aria-disabled` reason while `set-up-next` is out. */
export const SETTING_UP_NEXT = 'Setting the book as Up next.'

/** The `status` line once the Book is Up next: "Dune is Up next.". */
export function upNextStatus(title: string): string {
  return `${title} is Up next.`
}

/** Book detail offers Set as Up next for any Book that is neither Main nor already Up next. */
export function detailOffersSetUpNext(role: BookDetailView['role']): boolean {
  return role !== 'main' && role !== 'upNext'
}

/**
 * The spine popover offers it, as its primary action, only for a Book never
 * read and with no Reading ("Never read, no Reading" in Book states). A
 * finished Book sets it from Book detail; a paused Book's popover keeps
 * **Resume**.
 */
export function popoverOffersSetUpNext(book: Pick<ShelfBook, 'role' | 'finished'>): boolean {
  return book.role === null && !book.finished
}
