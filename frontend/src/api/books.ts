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
import type { components } from './generated/schema.d.ts'
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
export function useEditBook(): (
  bookId: string,
  fields: BookFields,
  options?: EditBookOptions,
) => Promise<IntentResult> {
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

// `start-reading` and `edit-purpose` share one intent part, `{ bookId, purpose }`:
// the Purpose as typed (the server trims it, and stores `null` when nothing is left).

export function purposeForm(bookId: string, purpose: string | null): FormData {
  const form = new FormData()
  form.set('intent', JSON.stringify({ bookId, purpose }))
  return form
}

/** Sends `start-reading` (start, resume or re-read as the Main book); resolves after the views have refetched. */
export function startReading(client: QueryClient, bookId: string, purpose: string | null): Promise<IntentResult> {
  return sendIntent(client, 'start-reading', purposeForm(bookId, purpose))
}

/** `startReading` bound to the app's QueryClient. */
export function useStartReading(): (bookId: string, purpose: string | null) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, purpose) => startReading(client, bookId, purpose)
}

/** Sends `edit-purpose` for the Book's current Reading; resolves after the views have refetched. */
export function editPurpose(client: QueryClient, bookId: string, purpose: string | null): Promise<IntentResult> {
  return sendIntent(client, 'edit-purpose', purposeForm(bookId, purpose))
}

/** `editPurpose` bound to the app's QueryClient. */
export function useEditPurpose(): (bookId: string, purpose: string | null) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, purpose) => editPurpose(client, bookId, purpose)
}

// `update-page`'s intent part is `{ bookId, page }`, the page a JSON integer.

export function updatePageForm(bookId: string, page: number): FormData {
  const form = new FormData()
  form.set('intent', JSON.stringify({ bookId, page }))
  return form
}

/**
 * Sends `update-page` (the Main book's absolute page); resolves after the
 * views have refetched. `reachedLastPage` is set at the Book's last page.
 */
export function updatePage(client: QueryClient, bookId: string, page: number): Promise<IntentResult> {
  return sendIntent(client, 'update-page', updatePageForm(bookId, page))
}

/** `updatePage` bound to the app's QueryClient. */
export function useUpdatePage(): (bookId: string, page: number) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, page) => updatePage(client, bookId, page)
}

// `finish-reading`'s intent part is `{ bookId, finishedOn, purposeFulfilled, rating }`:
// every key sent, the two answers `null` when skipped.

/** "Purpose fulfilled?" as sent: yes, partly or not yet (the contract's `BookReading` values). */
export type PurposeFulfilled = NonNullable<components['schemas']['BookReading']['purposeFulfilled']>

/** The Finish dialog's answers. */
export type FinishAnswers = {
  /** The Finished on field's `YYYY-MM-DD`, as typed. */
  finishedOn: string
  purposeFulfilled: PurposeFulfilled | null
  /** 1 to 5 stars, or `null` for No rating. */
  rating: number | null
}

export function finishReadingForm(bookId: string, answers: FinishAnswers): FormData {
  const form = new FormData()
  const { finishedOn, purposeFulfilled, rating } = answers
  form.set('intent', JSON.stringify({ bookId, finishedOn, purposeFulfilled, rating }))
  return form
}

/** Sends `finish-reading` (the Book's current Reading); resolves after the views have refetched. */
export function finishReading(client: QueryClient, bookId: string, answers: FinishAnswers): Promise<IntentResult> {
  return sendIntent(client, 'finish-reading', finishReadingForm(bookId, answers))
}

/** `finishReading` bound to the app's QueryClient. */
export function useFinishReading(): (bookId: string, answers: FinishAnswers) => Promise<IntentResult> {
  const client = useQueryClient()
  return (bookId, answers) => finishReading(client, bookId, answers)
}
