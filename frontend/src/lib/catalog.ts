// Client-side shaping of the catalog view: the List view order, the title
// search, its copy, the Date added format, and the Tags suggestions. The
// server computes every domain number; these only sort, search and format.

/** The fields of a catalog Book these helpers read. */
export interface ListedBook {
  title: string
  firstAuthor: string
}

const collator = new Intl.Collator(undefined)

/** By first author with `Intl.Collator`, then by title; a new array. */
export function sortBooks<B extends ListedBook>(books: readonly B[]): B[] {
  return [...books].sort(
    (a, b) => collator.compare(a.firstAuthor, b.firstAuthor) || collator.compare(a.title, b.title),
  )
}

/** Whether `title` contains the search text, ignoring case. Empty text matches all. */
export function matchesTitle(title: string, query: string): boolean {
  const text = query.trim().toLocaleLowerCase()
  return text === '' || title.toLocaleLowerCase().includes(text)
}

/** The fields of a catalog Book its spine name reads. */
export interface NamedSpine extends ListedBook {
  authorCount: number
  finished: boolean
}

/**
 * A spine's accessible name (UX-DR25): "Title by First author, finished",
 * "… and 1 other, …" or "… and N others, …", always with the full title.
 */
export function spineName(book: NamedSpine): string {
  const others = book.authorCount - 1
  const more = others === 1 ? ' and 1 other' : others > 1 ? ` and ${others} others` : ''
  const by = book.firstAuthor === '' ? '' : ` by ${book.firstAuthor}${more}`
  return `${book.title}${by}, ${book.finished ? 'finished' : 'not read yet'}`
}

/** The bookcase list's name; it counts every Book, even during a search. */
export function bookcaseName(total: number): string {
  return total === 1 ? 'Bookcase, 1 book' : `Bookcase, ${total} books`
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
