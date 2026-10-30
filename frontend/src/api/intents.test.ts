import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { COULDNT_SAVE_MESSAGE } from './envelope.ts'
import { sendIntent } from './intents.ts'
import { viewKey } from './views.ts'

type FetchArgs = [string, RequestInit]

function respond(body: unknown, status: number) {
  return mock.method(globalThis, 'fetch', async (..._args: FetchArgs) =>
    new Response(JSON.stringify(body), { status }),
  )
}

describe('sendIntent', () => {
  let client: QueryClient
  let events: string[]
  let unsubscribe: () => void

  beforeEach(async () => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    events = []
    let version = 0
    // One active view (an observer, as a mounted page has) and one cached-only.
    const observer = new QueryObserver(client, {
      queryKey: viewKey('catalog'),
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        version += 1
        events.push(`catalog refetched ${version}`)
        return version
      },
    })
    unsubscribe = observer.subscribe(() => {})
    await client.refetchQueries({ queryKey: viewKey('catalog') })
    client.setQueryData(viewKey('home'), 'home data')
    client.setQueryData(['other'], 'other data')
    events.length = 0
  })

  afterEach(() => {
    unsubscribe()
    mock.restoreAll()
    client.clear()
  })

  async function send(body: unknown = { title: 'Dune' }) {
    const result = await sendIntent(client, 'add-book', body)
    events.push('resolved')
    return result
  }

  function assertAllViewsInvalidated() {
    assert.deepEqual(events, ['catalog refetched 2', 'resolved'])
    assert.equal(client.getQueryState(viewKey('home'))?.isInvalidated, true)
    assert.equal(client.getQueryState(['other'])?.isInvalidated, false)
  }

  it('posts JSON to the kebab verb route', async () => {
    const fetch = respond({ ok: true, ids: ['b1'] }, 200)
    await send({ title: 'Dune' })
    const [url, init] = fetch.mock.calls[0].arguments as FetchArgs
    assert.equal(url, '/api/intents/add-book')
    assert.equal(init.method, 'POST')
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
    assert.equal(init.body, '{"title":"Dune"}')
  })

  it('posts FormData as is, letting fetch set the multipart boundary', async () => {
    const fetch = respond({ ok: true }, 200)
    const form = new FormData()
    form.set('intent', '{}')
    await send(form)
    const [, init] = fetch.mock.calls[0].arguments as FetchArgs
    assert.equal(init.body, form)
    assert.equal(init.headers, undefined)
  })

  it('invalidates every view and resolves after the refetch on success', async () => {
    respond({ ok: true, ids: ['b1'] }, 200)
    const result = await send()
    assert.deepEqual(result, { kind: 'ok', ids: ['b1'], reachedLastPage: false })
    assertAllViewsInvalidated()
  })

  it('invalidates every view after a refusal too', async () => {
    respond({ error: { kind: 'refusal', code: 'invalid_fields', message: 'm', fields: [] } }, 422)
    const result = await send()
    assert.equal(result.kind, 'refusal')
    assertAllViewsInvalidated()
  })

  it('turns a network failure into couldnt_save and still refetches', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('fetch failed')
    })
    const result = await send()
    assert.deepEqual(result, { kind: 'couldnt_save', message: COULDNT_SAVE_MESSAGE })
    assertAllViewsInvalidated()
  })

  it('never patches cached data', async () => {
    respond({ ok: true, ids: ['b1'] }, 200)
    await send()
    assert.equal(client.getQueryData(viewKey('home')), 'home data')
  })
})
