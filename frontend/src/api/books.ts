// Book intents. `add-book` and `edit-book` are multipart: one `intent` part
// holding the book form's raw strings as JSON, keyed by the camelCase intent
// keys (the server trims and validates them), plus an optional `cover` file
// part with the chosen file as is (the server decodes and checks it).
// `edit-book` also names the Book, as `bookId`, first, and takes
// `removeCover: true` to clear the cover. `delete-book`'s intent part is only
// `{ bookId }`; `set-spine-color`'s is `{ bookId, spineColor }`, where
// `spineColor` is a swatch's `#RRGGBB` or `null` (From cover).

import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { IntentResult } from './envelope.ts'
import { sendIntent } from './intents.ts'

/** The intent keys, in form order (backend `book_fields.LABELS`). */
export const BOOK_FIELD_KEYS = [
  'title',
  'subtitle',
  'pages',
  'authors',
  'edition',
  'language',
  'publisher',
  'type',
  'isbn',
  'year',
  'finishedOn',
  'tags',
  'spineColor',
] as const

export type BookFieldKey = (typeof BOOK_FIELD_KEYS)[number]

/** The form's fields exactly as typed. */
export type BookFields = Record<BookFieldKey, string>

/**
 * `confirmDuplicate: true` saves the Book even though it matches another one
 * in the catalog (the Duplicate dialog's Add anyway / Save anyway). Omitted on
 * a first send.
 */
export type BookSaveOptions = { confirmDuplicate?: true }
/** `cover`: the file chosen in Cover, sent as the `cover` part. */
export type AddBookOptions = BookSaveOptions & { cover?: File }
/** `removeCover: true` clears the Book's cover (Remove cover); never sent with `cover`. */
export type EditBookOptions = AddBookOptions & { removeCover?: true }

function withCover(form: FormData, cover: File | undefined): FormData {
  if (cover) form.append('cover', cover, cover.name)
  return form
}

export function addBookForm(fields: BookFields, options: AddBookOptions = {}): FormData {
  const form = new FormData()
  const intent = options.confirmDuplicate ? { ...fields, confirmDuplicate: true } : fields
  form.set('intent', JSON.stringify(intent))
  return withCover(form, options.cover)
}

/** Sends `add-book`; resolves after the views have refetched. */
export function addBook(client: QueryClient, fields: BookFields, options?: AddBookOptions): Promise<IntentResult> {
  return sendIntent(client, 'add-book', addBookForm(fields, options))
}

/** `addBook` bound to the app's QueryClient. */
export function useAddBook(): (fields: BookFields, options?: AddBookOptions) => Promise<IntentResult> {
  const client = useQueryClient()
  return (fields, options) => addBook(client, fields, options)
}

export function editBookForm(bookId: string, fields: BookFields, options: EditBookOptions = {}): FormData {
  const form = new FormData()
  const intent: Record<string, unknown> = { bookId, ...fields }
  // A chosen file replaces the cover, so it wins over a pending removal.
  if (options.removeCover && !options.cover) intent.removeCover = true
  if (options.confirmDuplicate) intent.confirmDuplicate = true
  form.set('intent', JSON.stringify(intent))
  return withCover(form, options.cover)
}

/** Sends `edit-book`; resolves after the views have refetched. */
export function editBook(
  client: QueryClient,
  bookId: string,
  fields: BookFields,
  options?: EditBookOptions,
): Promise<IntentResult> {
  return sendIntent(client, 'edit-book', editBookForm(bookId, fields, options))
}

/** `editBook` bound to the app's QueryClient. */
export function useEditBook(): (bookId: string, fields: BookFields, options?: EditBookOptions) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, fields, options) => editBook(client, bookId, fields, options)
}

export function deleteBookForm(bookId: string): FormData {
  const form = new FormData()
  form.set('intent', JSON.stringify({ bookId }))
  return form
}

/** Sends `delete-book`; resolves after the views have refetched. */
export function deleteBook(client: QueryClient, bookId: string): Promise<IntentResult> {
  return sendIntent(client, 'delete-book', deleteBookForm(bookId))
}

/** `deleteBook` bound to the app's QueryClient. */
export function useDeleteBook(): (bookId: string) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId) => deleteBook(client, bookId)
}

export function setSpineColorForm(bookId: string, spineColor: string | null): FormData {
  const form = new FormData()
  form.set('intent', JSON.stringify({ bookId, spineColor }))
  return form
}

/** Sends `set-spine-color` (`null`: From cover); resolves after the views have refetched. */
export function setSpineColor(client: QueryClient, bookId: string, spineColor: string | null): Promise<IntentResult> {
  return sendIntent(client, 'set-spine-color', setSpineColorForm(bookId, spineColor))
}

/** `setSpineColor` bound to the app's QueryClient. */
export function useSetSpineColor(): (bookId: string, spineColor: string | null) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, spineColor) => setSpineColor(client, bookId, spineColor)
}
