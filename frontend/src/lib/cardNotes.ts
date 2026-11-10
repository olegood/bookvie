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
