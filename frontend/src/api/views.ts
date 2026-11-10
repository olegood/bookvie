// View queries: GET /api/views/<noun>, keyed ['view', <noun>]. A page sees
// one of three states. A failed first load is `failed` with a retry; a failed
// background refetch keeps the last data and reports nothing.

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from './generated/schema.d.ts'

type Schemas = components['schemas']
export type HomeView = Schemas['HomeView']
export type HomeMainBook = Schemas['HomeMainBook']
export type HomeUpNext = Schemas['HomeUpNext']
export type HomeWaiting = Schemas['HomeWaiting']
export type HomeSideRead = Schemas['HomeSideRead']
export type CurrentReading = Schemas['CurrentReading']
export type CatalogView = Schemas['CatalogView']
export type ShelfBook = Schemas['ShelfBook']
export type LibraryMeter = Schemas['LibraryMeter']
export type BookDetailView = Schemas['BookDetailView']
export type BookReading = Schemas['BookReading']
export type BookCardNote = Schemas['BookCardNote']
export type BackupView = Schemas['BackupView']
export type CardNotesView = Schemas['CardNotesView']
export type CardNotesGroup = Schemas['CardNotesGroup']
export type CardNotesScope = Schemas['CardNotesScope']

export interface Views {
  home: HomeView
  catalog: CatalogView
  backup: BackupView
}
export type ViewName = keyof Views

export const VIEW_ROOT = 'view'
export const VIEWS_BASE = '/api/views'

export function viewKey<N extends ViewName>(name: N): readonly ['view', N] {
  return [VIEW_ROOT, name] as const
}

export class ViewLoadError extends Error {}

export async function fetchView<N extends ViewName>(name: N): Promise<Views[N]> {
  const response = await fetch(`${VIEWS_BASE}/${name}`)
  if (!response.ok) throw new ViewLoadError(`GET ${VIEWS_BASE}/${name}: ${response.status}`)
  return (await response.json()) as Views[N]
}

export type ViewState<T> =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; data: T }

export interface ViewQuery<T> {
  data: T | undefined
  status: 'pending' | 'error' | 'success'
  refetch: () => unknown
}

export function toViewState<T>(query: ViewQuery<T>): ViewState<T> {
  if (query.data !== undefined) return { status: 'ready', data: query.data }
  if (query.status === 'error') {
    return {
      status: 'failed',
      retry: () => {
        void query.refetch()
      },
    }
  }
  return { status: 'loading' }
}

function useView<N extends ViewName>(name: N): ViewState<Views[N]> {
  const query = useQuery({ queryKey: viewKey(name), queryFn: () => fetchView(name) })
  return toViewState<Views[N]>(query)
}

export function useHomeView(): ViewState<HomeView> {
  return useView('home')
}

export function useCatalogView(): ViewState<CatalogView> {
  return useView('catalog')
}

export function useBackupView(): ViewState<BackupView> {
  return useView('backup')
}

/** The `book` view's key: under 'view', so every intent refetches it. */
export function bookViewKey(id: string): readonly ['view', 'book', string] {
  return [VIEW_ROOT, 'book', id] as const
}

/** GET /api/views/book?id=…; `null` when there is no such Book (404). */
export async function fetchBookView(id: string): Promise<BookDetailView | null> {
  const url = `${VIEWS_BASE}/book?${new URLSearchParams({ id })}`
  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) throw new ViewLoadError(`GET ${url}: ${response.status}`)
  return (await response.json()) as BookDetailView
}

/** A view state, plus `missing` when the Book doesn't exist. */
export type BookViewState = ViewState<BookDetailView> | { status: 'missing' }

export function toBookViewState(query: ViewQuery<BookDetailView | null>): BookViewState {
  if (query.data === null) return { status: 'missing' }
  return toViewState<BookDetailView>({ ...query, data: query.data })
}

export function useBookView(id: string): BookViewState {
  const query = useQuery({ queryKey: bookViewKey(id), queryFn: () => fetchBookView(id) })
  return toBookViewState(query)
}

/**
 * The `card-notes` view's key: under 'view', so every intent refetches it.
 * Unscoped is `['view', 'card-notes']`, scoped adds the Book id.
 */
export function cardNotesViewKey(bookId?: string): readonly string[] {
  return bookId === undefined ? [VIEW_ROOT, 'card-notes'] : [VIEW_ROOT, 'card-notes', bookId]
}

/** GET /api/views/card-notes[?book=…]; `null` when the scoped Book doesn't exist (404). */
export async function fetchCardNotesView(bookId?: string): Promise<CardNotesView | null> {
  const query = bookId === undefined ? '' : `?${new URLSearchParams({ book: bookId })}`
  const url = `${VIEWS_BASE}/card-notes${query}`
  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) throw new ViewLoadError(`GET ${url}: ${response.status}`)
  return (await response.json()) as CardNotesView
}

/** A view state, plus `missing` when the scoped Book doesn't exist. */
export type CardNotesViewState = ViewState<CardNotesView> | { status: 'missing' }

export function useCardNotesView(bookId?: string): CardNotesViewState {
  const query = useQuery({ queryKey: cardNotesViewKey(bookId), queryFn: () => fetchCardNotesView(bookId) })
  if (query.data === null) return { status: 'missing' }
  return toViewState<CardNotesView>({ ...query, data: query.data })
}

/**
 * Reads the `card-notes` view as the cache holds it right now (see
 * `useCachedBookView`). `undefined` when it isn't cached, `null` when the
 * scoped Book is gone.
 */
export function useCachedCardNotesView(): (bookId?: string) => CardNotesView | null | undefined {
  const client = useQueryClient()
  return (bookId) => client.getQueryData<CardNotesView | null>(cardNotesViewKey(bookId))
}

/**
 * The `book` view of `id` when it is given, else nothing is fetched:
 * `undefined` until loaded (or on a failed load), `null` when the Book is gone.
 */
export function useOptionalBookView(id: string | undefined): BookDetailView | null | undefined {
  const query = useQuery({
    queryKey: bookViewKey(id ?? ''),
    queryFn: () => fetchBookView(id ?? ''),
    enabled: id !== undefined,
  })
  return id === undefined ? undefined : query.data
}

/**
 * Reads the `book` view as the cache holds it right now: once an intent has
 * resolved this is the refetched copy, which a component may render a tick
 * later. `undefined` when it isn't cached, `null` when the Book is gone.
 */
export function useCachedBookView(): (id: string) => BookDetailView | null | undefined {
  const client = useQueryClient()
  return (id) => client.getQueryData<BookDetailView | null>(bookViewKey(id))
}

/**
 * The `book` view as fetched after the caller mounted: `loading` until then,
 * even when an older copy is cached (inactive views don't refetch after an
 * intent, so that copy may predate another tab's or a restore's change). For
 * a dialog that fixes its answers when it opens.
 */
export function useFreshBookView(id: string): BookViewState {
  // 'always': refetch on mount even if a later default makes cached data count as fresh.
  const query = useQuery({ queryKey: bookViewKey(id), queryFn: () => fetchBookView(id), refetchOnMount: 'always' })
  if (!query.isFetchedAfterMount) return { status: 'loading' }
  // A failed fetch keeps the cached copy as `data`; that copy is what this hook avoids.
  if (query.status === 'error') return toBookViewState({ ...query, data: undefined })
  return toBookViewState(query)
}
