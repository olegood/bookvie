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

export function addBookForm(fields: BookFields): FormData {
  const form = new FormData()
  form.set('intent', JSON.stringify(fields))
  return form
}

/** Sends `add-book`; resolves after the views have refetched. */
export function addBook(client: QueryClient, fields: BookFields): Promise<IntentResult> {
  return sendIntent(client, 'add-book', addBookForm(fields))
}

/** `addBook` bound to the app's QueryClient. */
export function useAddBook(): (fields: BookFields) => Promise<IntentResult> {
  const client = useQueryClient()
  return (fields) => addBook(client, fields)
}
