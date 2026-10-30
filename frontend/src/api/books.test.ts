import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { addBook, BOOK_FIELD_KEYS, type BookFields } from './books.ts'

const fields = Object.fromEntries(BOOK_FIELD_KEYS.map((key) => [key, ''])) as BookFields

describe('addBook', () => {
  afterEach(() => mock.restoreAll())

  it('posts the raw strings as the intent part of a multipart form', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true, ids: { bookId: 'b1' } }),
    )
    const client = new QueryClient()
    const result = await addBook(client, { ...fields, title: ' Dune ', pages: '412', type: 'paperback' })

    assert.deepEqual(result, { kind: 'ok', ids: { bookId: 'b1' }, reachedLastPage: false })
    const [url, init] = fetch.mock.calls[0].arguments
    assert.equal(url, '/api/intents/add-book')
    const body = init!.body as FormData
    const intent = JSON.parse(body.get('intent') as string) as Record<string, string>
    assert.deepEqual(Object.keys(intent), [...BOOK_FIELD_KEYS])
    assert.equal(intent.title, ' Dune ')
    assert.equal(intent.pages, '412')
    assert.equal(intent.type, 'paperback')
    client.clear()
  })

  it('adds confirmDuplicate: true only when asked, after the form keys', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true, ids: { bookId: 'b1' } }),
    )
    const client = new QueryClient()
    const intentOf = (call: number) =>
      JSON.parse((fetch.mock.calls[call].arguments[1]!.body as FormData).get('intent') as string) as Record<
        string,
        unknown
      >

    await addBook(client, fields)
    await addBook(client, fields, {})
    await addBook(client, fields, { confirmDuplicate: true })

    assert.equal('confirmDuplicate' in intentOf(0), false)
    assert.equal('confirmDuplicate' in intentOf(1), false)
    assert.deepEqual(intentOf(2), { ...intentOf(0), confirmDuplicate: true })
    assert.deepEqual(Object.keys(intentOf(2)), [...BOOK_FIELD_KEYS, 'confirmDuplicate'])
    client.clear()
  })
})
