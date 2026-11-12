// Client-side shaping of the catalog view: the Catalog sort, the title
// search, its copy, the Date added format, and the Tags suggestions. The
// server computes every domain number; these only sort, search and format.

import type { CatalogSortKey } from './catalogSort.ts'

/** The fields of a catalog Book these helpers read. */
export interface ListedBook {
  title: string
  firstAuthor: string
}

/** The fields of a catalog Book the sort reads (all from the server). */
export interface SortableBook extends ListedBook {
  id: string
  pages: number
  createdAt: string
}

// Numbers by value: "Volume 2" before "Volume 10".
export const collator = new Intl.Collator(undefined, { numeric: true })

type Compare = (a: SortableBook, b: SortableBook) => number

const byTitle: Compare = (a, b) => collator.compare(a.title, b.title)
// Instants, not strings: offsets can differ.
const byCreatedAt: Compare = (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
// Plain code-unit comparison, so the order never depends on the locale.
const byId: Compare = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const PRIMARY: Record<CatalogSortKey, Compare> = {
  author: (a, b) => collator.compare(a.firstAuthor, b.firstAuthor),
  title: byTitle,
  dateAdded: (a, b) => byCreatedAt(b, a),
  pages: (a, b) => a.pages - b.pages,
}

/**
 * The Catalog order for `key` (FR-20); a new array. Author: first author
 * with `Intl.Collator` (numbers by value). Title: A–Z with the collator. Date added: newest
 * `createdAt` first. Pages: fewest first. Every key then breaks ties by
 * title, then `createdAt` (older first), then Book id, so the order is
 * always stable.
 */
export function sortBooks<B extends SortableBook>(books: readonly B[], key: CatalogSortKey): B[] {
  const primary = PRIMARY[key]
  return [...books].sort((a, b) => primary(a, b) || byTitle(a, b) || byCreatedAt(a, b) || byId(a, b))
}

/** Whether `title` contains the search text, ignoring case. Empty text matches all. */
export function matchesTitle(title: string, query: string): boolean {
  const text = query.trim().toLocaleLowerCase()
  return text === '' || title.toLocaleLowerCase().includes(text)
}

/** The fields of a catalog Book its spine name reads (all from the server). */
export interface NamedSpine extends ListedBook {
  authorCount: number
  finished: boolean
  role: 'main' | 'upNext' | 'waiting' | null
  currentPage: number | null
  percent: number | null
  waitingPage: number | null
  /** A Side read: ", on the side" after the status (no marker of its own). */
  sideRead: boolean
}

/** The fields of a catalog Book that tell twin spines apart (`spineNames`). */
export interface TwinSpine extends NamedSpine {
  id: string
  edition: number
  year: number | null
  pages: number
}

/** The status part of a spine's name, from EXPERIENCE.md's Book states table. */
function spineStatus(book: NamedSpine): string {
  const read = book.finished ? 'finished' : 'not read yet'
  if (book.role === 'main' && book.percent !== null) {
    return book.finished ? `finished, re-reading, ${book.percent}%` : `Main book, ${book.percent}%`
  }
  if (book.role === 'waiting' && book.waitingPage !== null) {
    const waiting = `waiting for you, page ${book.waitingPage}`
    return book.finished ? `finished, ${waiting}` : waiting
  }
  if (book.role === 'upNext') {
    // An Up next Book's unfinished Reading is always paused (it can't be Main).
    if (book.currentPage === null) return `${read}, Up next`
    const paused = `Up next, paused at page ${book.currentPage}`
    return book.finished ? `finished, ${paused}` : paused
  }
  return read
}

/** The kind of a spine's one marker dot (UX-DR24): Main, Up next or Waiting for you. */
export type SpineMarker = 'main' | 'upNext' | 'waiting'

/**
 * The spine's marker: the server's role, which already applies the priority
 * Main, then Up next (sky), then Waiting for you (sand). One dot at most;
 * `null` for a spine with none. A Side read gets no marker of its own.
 */
export function spineMarker(book: Pick<NamedSpine, 'role'>): SpineMarker | null {
  return book.role
}

/**
 * A spine's accessible name (UX-DR25): "Title by First author, <status>",
 * "… and 1 other, …" or "… and N others, …", always with the full title.
 * The status is "finished" or "not read yet", or for the Main book "Main
 * book, 64%" ("finished, re-reading, 12%" on a re-read), and for a paused
 * Book "waiting for you, page 120" ("finished, waiting for you, page 40").
 * An Up next Book is "not read yet, Up next" ("finished, Up next") with no
 * Reading in progress, and "Up next, paused at page 120" ("finished, Up
 * next, paused at page 40") with a paused one. A Side read adds ", on the
 * side" after the status ("waiting for you, page 120, on the side").
 * A `qualifier` ("edition 2", from `spineNames`) goes between the author
 * part and the status; without one the name is exactly as above.
 */
export function spineName(book: NamedSpine, qualifier = ''): string {
  const others = book.authorCount - 1
  const more = others === 1 ? ' and 1 other' : others > 1 ? ` and ${others} others` : ''
  const by = book.firstAuthor === '' ? '' : ` by ${book.firstAuthor}${more}`
  const told = qualifier === '' ? '' : `, ${qualifier}`
  const side = book.sideRead ? ', on the side' : ''
  return `${book.title}${by}${told}, ${spineStatus(book)}${side}`
}

const pageCount = new Intl.NumberFormat('en-GB')

/** The fields that tell twins apart, in order: edition, else year, else pages. */
const TIE_BREAKERS: { value: (book: TwinSpine) => number | null; words: (book: TwinSpine) => string }[] = [
  { value: (book) => book.edition, words: (book) => `edition ${book.edition}` },
  { value: (book) => book.year, words: (book) => (book.year === null ? 'no year' : String(book.year)) },
  { value: (book) => book.pages, words: (book) => `${pageCount.format(book.pages)} pages` },
]

/**
 * Every spine's accessible name, by Book id. Spines whose names would be
 * equal (twins: same title, author part and status) are told apart in
 * rounds, edition, then year, then pages: each group still equal whose
 * members don't all share that field gets it appended ("Dune by Frank
 * Herbert, edition 1, 1965, not read yet"). A spine with no twin keeps
 * `spineName`'s name; twins equal in all three keep the same name. Pass the
 * whole bookcase, so a name never depends on a search, a filter or a slice.
 */
export function spineNames(books: readonly TwinSpine[]): Map<string, string> {
  const qualifiers = new Map<string, string[]>(books.map((book) => [book.id, []]))
  const name = (book: TwinSpine) => spineName(book, qualifiers.get(book.id)!.join(', '))
  for (const field of TIE_BREAKERS) {
    const groups = new Map<string, TwinSpine[]>()
    for (const book of books) {
      const key = name(book)
      const group = groups.get(key)
      if (group) group.push(book)
      else groups.set(key, [book])
    }
    for (const group of groups.values()) {
      const values = new Set(group.map(field.value))
      if (values.size > 1) for (const book of group) qualifiers.get(book.id)!.push(field.words(book))
    }
  }
  return new Map(books.map((book) => [book.id, name(book)]))
}

/**
 * The bookcase header's line after a finish (UX-DR42): "Finished *X*.", or
 * "Finished *X* again." for a re-read. No praise, no exclamation mark.
 */
export function finishLine(title: string, reread: boolean): string {
  return reread ? `Finished ${title} again.` : `Finished ${title}.`
}

/** The `status` line after a finish: the header line, then the refetched meter ("25 of 73 finished."). */
export function finishStatus(title: string, reread: boolean, meter: { finished: number; total: number }): string {
  return `${finishLine(title, reread)} ${meter.finished} of ${meter.total} finished.`
}

/** The bookcase list's name; it counts every Book, even during a search. */
export function bookcaseName(total: number): string {
  return total === 1 ? 'Bookcase, 1 book' : `Bookcase, ${total} books`
}

/** Home's bookcase slice list's name, with the rows it shows. */
export function sliceName(rows: number): string {
  return rows === 1 ? 'Bookcase slice, 1 row' : `Bookcase slice, ${rows} rows`
}

/** The count announced after typing pauses. */
export function matchCountCopy(count: number): string {
  return count === 1 ? '1 book matches.' : `${count} books match.`
}

/** The line shown in place of the list when nothing matches. */
export function noMatchCopy(query: string): string {
  return `No titles match “${query.trim()}”.`
}

const dateAdded = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** A `createdAt` timestamp as a local date, like "30 Oct 2026". */
export function formatDateAdded(createdAt: string): string {
  return dateAdded.format(new Date(createdAt))
}

/** The comma-separated segment being typed: the text after the last comma. */
export function lastTagSegment(value: string): string {
  return value.slice(value.lastIndexOf(',') + 1).trim()
}

/** Existing tags that start with the segment being typed, ignoring case. */
export function tagSuggestions(tags: readonly string[], value: string): string[] {
  const segment = lastTagSegment(value).toLocaleLowerCase()
  if (segment === '') return []
  return tags.filter((tag) => tag.toLocaleLowerCase().startsWith(segment))
}

/** `value` with the segment being typed replaced by `tag`, then ", ". */
export function pickTag(value: string, tag: string): string {
  const comma = value.lastIndexOf(',')
  const before = comma === -1 ? '' : `${value.slice(0, comma + 1)} `
  return `${before}${tag}, `
}
