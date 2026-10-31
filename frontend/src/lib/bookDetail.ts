// Client-side shaping of the `book` view for Book detail and the Edit book
// panel: the metadata grid, the panel's prefill and the Readings lines. The server computes the
// domain values (including the latest finish date); these only format.

import { BOOK_FIELD_KEYS, type BookDetailView, type BookFields, type BookReading } from '../api/index.ts'

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

/**
 * Newest first: the unfinished Reading (there is at most one) on top, then
 * finished ones by finish date, the later in stored order first on a tie.
 */
export function readingLines(readings: readonly ListedReading[]): { id: string; text: string }[] {
  const order = (reading: ListedReading) => reading.finishDate ?? '9999-99-99'
  return readings
    .map((reading, index) => ({ reading, index }))
    .sort((a, b) => order(b.reading).localeCompare(order(a.reading)) || b.index - a.index)
    .map(({ reading }) => ({ id: reading.id, text: readingLine(reading) }))
}
