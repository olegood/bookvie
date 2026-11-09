// Client-side shaping of the `book` view for Book detail and the Edit book
// panel: the metadata grid, the panel's prefill and the Readings lines. The server computes the
// domain values (including the latest finish date); these only format.

import {
  BOOK_FIELD_KEYS,
  type BookDetailView,
  type BookFields,
  type BookReading,
  type CurrentReading,
} from '../api/index.ts'

/** The fields of the `book` view the panel prefill reads. */
export type EditableBook = Pick<
  BookDetailView,
  | 'title'
  | 'subtitle'
  | 'authors'
  | 'pages'
  | 'edition'
  | 'language'
  | 'publisher'
  | 'type'
  | 'isbn'
  | 'year'
  | 'tags'
  | 'spineColorUser'
  | 'latestFinishDate'
>

const pages = new Intl.NumberFormat('en-GB')

export const TYPE_LABELS: Record<BookDetailView['type'], string> = {
  paperback: 'Paperback',
  hardcover: 'Hardcover',
  ebook: 'Ebook',
}

/** The fields of the `book` view the metadata grid reads. */
export type DescribedBook = Pick<
  BookDetailView,
  'pages' | 'edition' | 'language' | 'publisher' | 'type' | 'isbn' | 'year'
>

/**
 * The metadata grid's rows, in DESIGN.md order: Pages, Edition (only when it
 * isn't 1), Language, Publisher, Type (as its label), ISBN, Year; empty rows
 * left out.
 */
export function metadata(book: DescribedBook): [string, string][] {
  const rows: [string, string | null][] = [
    ['Pages', pages.format(book.pages)],
    ['Edition', book.edition === 1 ? null : String(book.edition)],
    ['Language', book.language],
    ['Publisher', book.publisher],
    ['Type', TYPE_LABELS[book.type]],
    ['ISBN', book.isbn],
    ['Year', book.year === null ? null : String(book.year)],
  ]
  return rows.filter((row): row is [string, string] => row[1] !== null && row[1] !== '')
}

/** The fields of the `book` view the cover reads. */
export type CoveredBook = Pick<BookDetailView, 'coverFile' | 'spineColorFromCover'>

/** A stored cover as the Edit book panel needs it: Remove cover and "From cover". */
export type PanelCover = { spineColorFromCover: string | null }

/** The Book's stored cover for the Edit book panel, or `null` when it has none. */
export function panelCover(book: CoveredBook): PanelCover | null {
  return book.coverFile === null ? null : { spineColorFromCover: book.spineColorFromCover }
}

/** Where the server serves a stored cover: `/media/<coverFile>`, each segment URL-encoded. */
export function coverSrc(coverFile: string): string {
  return `/media/${coverFile.split('/').map(encodeURIComponent).join('/')}`
}

/** A Reading as Book detail lists it. */
export type ListedReading = BookReading

/** The Edit book panel's fields, as the stored Book would be typed. */
export function toPanelFields(book: EditableBook): BookFields {
  const fields: BookFields = {
    title: book.title,
    subtitle: book.subtitle ?? '',
    pages: String(book.pages),
    authors: book.authors.join('; '),
    edition: String(book.edition),
    language: book.language,
    publisher: book.publisher,
    type: book.type,
    isbn: book.isbn ?? '',
    year: book.year === null ? '' : String(book.year),
    finishedOn: book.latestFinishDate ?? '',
    tags: book.tags.join(', '),
    spineColor: book.spineColorUser ?? '',
  }
  // Same keys, same order as the New book form.
  return Object.fromEntries(BOOK_FIELD_KEYS.map((key) => [key, fields[key]])) as BookFields
}

// en-GB short months, fixed so "Sep" never becomes ICU's "Sept".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A local `YYYY-MM-DD` date as "2 Sep 2026". */
export function shortDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return `${date} ${MONTHS[month - 1]} ${year}`
}

/** "Started 2 Sep 2026 · Finished 3 Oct 2026", "Finished 14 Aug 2019" or "Started 2 Sep 2026". */
export function readingLine(reading: ListedReading): string {
  const parts: string[] = []
  if (reading.startDate !== null) parts.push(`Started ${shortDate(reading.startDate)}`)
  if (reading.finishDate !== null) parts.push(`Finished ${shortDate(reading.finishDate)}`)
  return parts.join(' · ')
}

/** A rating's accessible name: "1 star", "4 stars". */
export function starsLabel(rating: number): string {
  return rating === 1 ? '1 star' : `${rating} stars`
}

/** "Purpose fulfilled?" answers as shown, in the dialog and in the Readings rows. */
export const PURPOSE_FULFILLED_LABELS: Record<NonNullable<ListedReading['purposeFulfilled']>, string> = {
  yes: 'yes',
  partly: 'partly',
  notYet: 'not yet',
}

/** "Purpose fulfilled: partly"; `null` when the question was skipped (or never asked). */
export function purposeFulfilledLine(answer: ListedReading['purposeFulfilled']): string | null {
  return answer === null ? null : `Purpose fulfilled: ${PURPOSE_FULFILLED_LABELS[answer]}`
}

/** A Readings row: its start/finish text, its rating (1–5, or `null`) and its answer line. */
export type ReadingRow = { id: string; text: string; rating: number | null; purposeFulfilled: string | null }

/**
 * Newest first: the unfinished Reading (there is at most one) on top, then
 * finished ones by finish date, the later in stored order first on a tie.
 */
export function readingLines(readings: readonly ListedReading[]): ReadingRow[] {
  const order = (reading: ListedReading) => reading.finishDate ?? '9999-99-99'
  return readings
    .map((reading, index) => ({ reading, index }))
    .sort((a, b) => order(b.reading).localeCompare(order(a.reading)) || b.index - a.index)
    .map(({ reading }) => ({
      id: reading.id,
      text: readingLine(reading),
      rating: reading.rating,
      purposeFulfilled: purposeFulfilledLine(reading.purposeFulfilled),
    }))
}

/** The fields of the `book` view the Confirm dialog's role line reads. */
export type RoledBook = Pick<BookDetailView, 'role' | 'waitingPage'> & {
  currentReading: Pick<NonNullable<BookDetailView['currentReading']>, 'currentPage'> | null
}

/**
 * The Delete book Confirm dialog's role line: "It is your Main book.", "It
 * is Up next." ("It is Up next, paused at p.120." with a paused Reading) or
 * "It is waiting for you at p.120."; `null` for a Book with no role. The
 * server decides the role (Up next wins over a paused Reading).
 */
export function roleLine(book: RoledBook): string | null {
  switch (book.role) {
    case 'main':
      return 'It is your Main book.'
    case 'upNext':
      // An Up next Book's unfinished Reading is always paused (it can't be Main).
      return book.currentReading === null
        ? 'It is Up next.'
        : `It is Up next, paused at p.${book.currentReading.currentPage}.`
    case 'waiting':
      return book.waitingPage === null ? null : `It is waiting for you at p.${book.waitingPage}.`
    default:
      return null
  }
}

/** What Book detail hands Catalog after a delete, in the router location state. */
export type DeletedState = { deleted: { title: string } }

/** The deleted Book's title from a location state, or `null` when it carries none. */
export function deletedTitle(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const deleted = (state as Partial<DeletedState>).deleted
  return typeof deleted?.title === 'string' ? deleted.title : null
}

// The location keys whose delete hand-off Catalog has handled, kept in
// sessionStorage so a remount (Back) or a reload of the same history entry
// doesn't focus and announce again. Not domain data. Without storage it
// degrades to once per mount.
const HANDLED_DELETES = 'bookvie.handledDeletes'
const HANDLED_KEEP = 20

function readHandled(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(HANDLED_DELETES) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}

/** Whether the delete hand-off on history entry `key` was already handled. */
export function deleteHandled(key: string): boolean {
  return readHandled().includes(key)
}

/** Records that the delete hand-off on history entry `key` has been handled. */
export function markDeleteHandled(key: string): void {
  try {
    const keys = [...readHandled().filter((other) => other !== key), key].slice(-HANDLED_KEEP)
    sessionStorage.setItem(HANDLED_DELETES, JSON.stringify(keys))
  } catch {
    // Storage unavailable: the per-mount ref still guards this mount.
  }
}

/**
 * The Current reading block's status line: "Main book · started 2 Sep 2026",
 * "Up next, paused at page 120 · started 2 Sep 2026" (EXPERIENCE.md → Book
 * states) or "Waiting for you, page 120 · started 2 Sep 2026"; no "· started"
 * part without a start date.
 */
export function currentReadingStatus(reading: Pick<CurrentReading, 'status' | 'currentPage' | 'startDate'>): string {
  const status =
    reading.status === 'main'
      ? 'Main book'
      : reading.status === 'upNext'
        ? `Up next, paused at page ${reading.currentPage}`
        : `Waiting for you, page ${reading.currentPage}`
  return reading.startDate === null ? status : `${status} · started ${shortDate(reading.startDate)}`
}
