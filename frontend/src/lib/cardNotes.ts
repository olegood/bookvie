// Card notes (EXPERIENCE.md → Card note panel, Book detail's Card notes
// block): the client's copy and the page refs. Only the server parses Page.

import type { BookCardNote } from '../api/index.ts'

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

// Search card notes (Story 5.3; EXPERIENCE.md → Search field, Card notes
// list): a case-insensitive substring of the note text only, on the trimmed
// query. Regex characters match literally; a blank query filters nothing.

/** The query as matched: trimmed and lower-cased; `''` filters nothing. */
function needle(query: string): string {
  return query.trim().toLowerCase()
}

/** Whether a note's text contains the query, ignoring case. A blank query matches every note. */
export function noteMatches(text: string, query: string): boolean {
  const q = needle(query)
  return q === '' || text.toLowerCase().includes(q)
}

/**
 * The notes Book detail's block shows: the first three in page order, or,
 * while Search card notes holds text, every note that matches.
 */
export function blockNotes<T extends { text: string }>(notes: readonly T[], query: string): readonly T[] {
  if (query.trim() === '') return notes.slice(0, BLOCK_NOTES)
  return notes.filter((note) => noteMatches(note.text, query))
}

/** One run of a note's text, marked when it is a match. */
export type HighlightPart = { text: string; mark: boolean }

/**
 * The note's text split into runs, each match marked, in the note's own
 * casing. A blank query, or no match, gives the whole text unmarked.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = needle(query)
  if (q === '') return [{ text, mark: false }]
  const lower = text.toLowerCase()
  // Lower-casing can change a string's length (e.g. "İ"); fall back to no marks then.
  if (lower.length !== text.length) return [{ text, mark: false }]
  const parts: HighlightPart[] = []
  let from = 0
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, at + q.length)) {
    if (at > from) parts.push({ text: text.slice(from, at), mark: false })
    parts.push({ text: text.slice(at, at + q.length), mark: true })
    from = at + q.length
  }
  if (from < text.length || parts.length === 0) parts.push({ text: text.slice(from), mark: false })
  return parts
}

/** The search field's visible label. */
export const SEARCH_CARD_NOTES = 'Search card notes'

/** The count announced after typing pauses: "2 notes match.", "1 note matches.". */
export function notesMatchCopy(count: number): string {
  return count === 1 ? '1 note matches.' : `${count} notes match.`
}

/** The line shown in place of the notes when nothing matches. */
export function noNotesMatchCopy(query: string): string {
  return `No card notes contain “${query.trim()}”.`
}

/** The Main book card's link text: "See card notes · 7", or "See card notes" at 0. */
export function seeCardNotesLabel(count: number): string {
  return count === 0 ? 'See card notes' : `See card notes · ${count}`
}

/** The Main book card's link name: "See card notes, 7 notes", "…, 1 note", or "See card notes" at 0. */
export function seeCardNotesName(count: number): string {
  if (count === 0) return 'See card notes'
  return count === 1 ? 'See card notes, 1 note' : `See card notes, ${count} notes`
}

/** The scope chip's remove button: "Remove In Dune". */
export function scopeChipRemoveName(title: string): string {
  return `Remove In ${title}`
}

/** The scoped Card notes page's route: `/card-notes?book=<id>`. */
export function cardNotesPath(bookId?: string): string {
  return bookId === undefined ? '/card-notes' : `/card-notes?${new URLSearchParams({ book: bookId })}`
}

// The pile (Story 5.4; EXPERIENCE.md → Pile): one Book's notes, one at a
// time. Order and shuffle are the client's (AD-6).

/** A note as the pile reads it. */
type PileNote = Pick<BookCardNote, 'id' | 'text' | 'pageStart' | 'pageEnd'>

/** A page-ref chip's name: "Open p.42 in the pile", "Open pp.42–45 in the pile". */
export function openInPileName(start: number, end: number | null): string {
  return `Open ${pageRef(start, end)} in the pile`
}

/** The pile's place: "2 of 4". `n` counts from 1. */
export function pilePosition(n: number, m: number): string {
  return `${n} of ${m}`
}

/** The pile's live region after a move: "Note 2 of 4, pp.42–45: <text>", no period added. */
export function pileAnnouncement(n: number, m: number, note: PileNote): string {
  return `Note ${pilePosition(n, m)}, ${pageRef(note.pageStart, note.pageEnd)}: ${note.text}`
}

/** A Fisher–Yates shuffle of a copy; `random` returns [0, 1) like `Math.random`. The input is untouched. */
export function shuffled<T>(notes: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...notes]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }
  return copy
}

/** Where the pile opens: the note's index in `notes`, else 0 (no id, or an id not there). */
export function pileStart(notes: readonly { id: string }[], noteId?: string): number {
  if (noteId === undefined) return 0
  return Math.max(
    0,
    notes.findIndex((note) => note.id === noteId),
  )
}

/** Why Previous is `aria-disabled` at the first note. */
export const PILE_AT_FIRST = 'This is the first note.'

/** Why Next is `aria-disabled` at the last note. */
export const PILE_AT_LAST = 'This is the last note.'
