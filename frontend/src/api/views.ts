// View queries: GET /api/views/<noun>, keyed ['view', <noun>]. A page sees
// one of three states. A failed first load is `failed` with a retry; a failed
// background refetch keeps the last data and reports nothing.

import { useQuery } from '@tanstack/react-query'
import type { components } from './generated/schema.d.ts'

type Schemas = components['schemas']
export type HomeView = Schemas['HomeView']
export type CatalogView = Schemas['CatalogView']
export type ShelfBook = Schemas['ShelfBook']
export type LibraryMeter = Schemas['LibraryMeter']
export type BookDetailView = Schemas['BookDetailView']
export type BookReading = Schemas['BookReading']

export interface Views {
  home: HomeView
  catalog: CatalogView
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
