import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { fetchView, toViewState, viewKey, type CatalogView } from './views.ts'

const empty: CatalogView = { meter: { finished: 0, total: 0 }, books: [] }

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
