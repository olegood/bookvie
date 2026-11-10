// Card notes (EXPERIENCE.md → Card note panel, Book detail's Card notes
// block): the client's copy and the page refs. Only the server parses Page.

/** The `status` line once a note is saved. */
export const CARD_NOTE_SAVED = 'Card note saved.'

/** Why **Save note** is `aria-disabled` while the request is out. */
export const SAVING_CARD_NOTE = 'Saving the card note.'

/** Book detail's block with no notes. */
export const NO_CARD_NOTES = 'No card notes yet.'

/** How many notes Book detail's block shows. */
export const BLOCK_NOTES = 3

/** A note's page ref: "p.42" for one page, "pp.42–45" for a range. */
export function pageRef(start: number, end: number | null): string {
  return end === null ? `p.${start}` : `pp.${start}–${end}`
}

/** The Page field's prefill: the current Reading's page, at least 1; empty without one. */
export function notePrefill(currentPage: number | null): string {
  return currentPage === null ? '' : String(Math.max(1, currentPage))
}

/** Book detail's block heading: "Card notes (4)", or "Card notes" with none. */
export function cardNotesHeading(count: number): string {
  return count === 0 ? 'Card notes' : `Card notes (${count})`
}

/** The Edit card note panel's Page prefill: "96" or "42–45" (en dash, no prefix), read back unchanged by the server. */
export function pageField(start: number, end: number | null): string {
  return end === null ? String(start) : `${start}–${end}`
}

/** A note's Edit in the block: "Edit p.96", so it never matches Book detail's own **Edit**. */
export function editNoteName(start: number, end: number | null): string {
  return `Edit ${pageRef(start, end)}`
}

/** The Delete card note Confirm dialog's heading. */
export const DELETE_CARD_NOTE_HEADING = 'Delete this card note?'

/** The Delete card note Confirm dialog's confirm button. */
export const DELETE_CARD_NOTE = 'Delete card note'

/** Why the Confirm dialog's buttons are `aria-disabled` while the delete is out. */
export const DELETING_CARD_NOTE = 'Deleting the card note.'

/**
 * The note whose Edit takes focus after a delete: the one now shown where the
 * deleted note was (`index` in the block's shown order), the next note, else
 * `null` (the block heading).
 */
export function noteAfterDelete(shownIds: readonly string[], index: number): string | null {
  return shownIds[index] ?? null
}
