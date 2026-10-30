// Book intents. `add-book` is multipart: one `intent` part holding the New
// book form's raw strings as JSON, keyed by the camelCase intent keys (the
// server trims and validates them; Story 1.13 adds the cover file part).

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
 * `confirmDuplicate: true` adds the Book even though it matches one already in
 * the catalog (the Duplicate dialog's Add anyway). Omitted on a first send.
 */
export type AddBookOptions = { confirmDuplicate?: true }

export function addBookForm(fields: BookFields, options: AddBookOptions = {}): FormData {
  const form = new FormData()
  const intent = options.confirmDuplicate ? { ...fields, confirmDuplicate: true } : fields
  form.set('intent', JSON.stringify(intent))
  return form
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
