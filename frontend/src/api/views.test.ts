import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import {
  bookViewKey,
  fetchBookView,
  fetchView,
  toBookViewState,
  toViewState,
  viewKey,
  type BookDetailView,
  type CatalogView,
} from './views.ts'

const empty: CatalogView = { meter: { finished: 0, total: 0 }, books: [], tags: [] }

describe('viewKey', () => {
  it("keys every view under 'view'", () => {
    assert.deepEqual(viewKey('home'), ['view', 'home'])
    assert.deepEqual(viewKey('catalog'), ['view', 'catalog'])
  })
})

describe('toViewState', () => {
  const refetch = () => undefined

  it('is loading before the first data', () => {
    assert.deepEqual(toViewState({ data: undefined, status: 'pending', refetch }), {
      status: 'loading',
    })
  })

  it('is ready with data', () => {
    assert.deepEqual(toViewState({ data: empty, status: 'success', refetch }), {
      status: 'ready',
      data: empty,
    })
  })

  it('is failed with a retry when the first load fails', () => {
    let calls = 0
    const state = toViewState({ data: undefined, status: 'error', refetch: () => (calls += 1) })
    assert.equal(state.status, 'failed')
    if (state.status === 'failed') state.retry()
    assert.equal(calls, 1)
  })

  it('keeps the last data when a background refetch fails', () => {
    assert.deepEqual(toViewState({ data: empty, status: 'error', refetch }), {
      status: 'ready',
      data: empty,
    })
  })
})

describe('fetchView', () => {
  afterEach(() => mock.restoreAll())

  it('GETs the view route', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string]) =>
      Response.json(empty),
    )
    assert.deepEqual(await fetchView('catalog'), empty)
    assert.equal(fetch.mock.calls[0].arguments[0], '/api/views/catalog')
  })

  it('rejects on an error status', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }))
    await assert.rejects(fetchView('home'))
  })

  it('network down: no data -> failed; with data -> keeps it', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const observer = new QueryObserver(client, {
      queryKey: viewKey('catalog'),
      queryFn: () => fetchView('catalog'),
    })
    const unsubscribe = observer.subscribe(() => {})
    try {
      mock.method(globalThis, 'fetch', async () => {
        throw new TypeError('fetch failed')
      })
      await observer.refetch()
      assert.equal(toViewState(observer.getCurrentResult()).status, 'failed')

      mock.method(globalThis, 'fetch', async () => Response.json(empty))
      await observer.refetch()
      mock.method(globalThis, 'fetch', async () => {
        throw new TypeError('fetch failed')
      })
      await observer.refetch()
      assert.deepEqual(toViewState(observer.getCurrentResult()), { status: 'ready', data: empty })
    } finally {
      unsubscribe()
      client.clear()
    }
  })
})

const dune: BookDetailView = {
  id: 'b1',
  title: 'Dune',
  subtitle: null,
  authors: ['Frank Herbert'],
  pages: 412,
  edition: 1,
  language: 'English',
  publisher: 'Chilton Books',
  type: 'paperback',
  isbn: null,
  year: null,
  tags: [],
  spineColorUser: null,
  latestFinishDate: null,
  readings: [],
}

describe('the book view', () => {
  afterEach(() => mock.restoreAll())

  it("is keyed under 'view' by id", () => {
    assert.deepEqual(bookViewKey('b1'), ['view', 'book', 'b1'])
  })

  it('GETs the book route with the id as a query parameter', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string]) => Response.json(dune))
    assert.deepEqual(await fetchBookView('a b&c'), dune)
    assert.equal(fetch.mock.calls[0].arguments[0], '/api/views/book?id=a+b%26c')
  })

  it('is null on 404 and rejects on any other error status', async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json({ error: { kind: 'refusal', code: 'book_not_found', message: 'm' } }, { status: 404 }),
    )
    assert.equal(await fetchBookView('gone'), null)
    mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }))
    await assert.rejects(fetchBookView('b1'))
  })

  it('maps null to missing and otherwise behaves like any view', () => {
    const refetch = () => undefined
    assert.deepEqual(toBookViewState({ data: null, status: 'success', refetch }), { status: 'missing' })
    assert.deepEqual(toBookViewState({ data: dune, status: 'success', refetch }), { status: 'ready', data: dune })
    assert.deepEqual(toBookViewState({ data: undefined, status: 'pending', refetch }), { status: 'loading' })
    assert.equal(toBookViewState({ data: undefined, status: 'error', refetch }).status, 'failed')
  })
})
