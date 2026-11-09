// Mark as Side read / Remove from side's copy and where it is offered
// (EXPERIENCE.md → Book detail actions, Book states). Only the server decides
// what `mark-side-read` and `unmark-side-read` store; the client offers them
// from the Book's `role`, `sideRead` and `sideReadsFull`.

import type { BookDetailView } from '../api/index.ts'

/** The visible hint under **Mark as Side read** at 3 Side reads, linked as its description. */
export const SIDE_READS_FULL_HINT = 'Up to 3 side reads.'

/** **Mark as Side read**'s `aria-disabled` reason while `mark-side-read` is out. */
export const MARKING_SIDE_READ = 'Marking the book as a Side read.'

/** **Remove from side**'s `aria-disabled` reason while `unmark-side-read` is out. */
export const REMOVING_FROM_SIDE = 'Removing the book from the side.'

/** The button's label: **Remove from side** for a Side read, else **Mark as Side read**. */
export function sideReadLabel(sideRead: boolean): string {
  return sideRead ? 'Remove from side' : 'Mark as Side read'
}

/** The `status` line once the toggle has landed: "Dune is on the side." / "Dune is off the side.". */
export function sideReadStatus(title: string, on: boolean): string {
  return `${title} is ${on ? 'on' : 'off'} the side.`
}

/** Book detail offers the toggle for every Book that isn't the Main book. */
export function detailOffersSideRead(role: BookDetailView['role']): boolean {
  return role !== 'main'
}
