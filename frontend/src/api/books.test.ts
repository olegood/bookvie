import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import {
  addBook,
  addBookForm,
  BOOK_FIELD_KEYS,
  deleteBook,
  deleteBookForm,
  editBook,
  editBookForm,
  editPurpose,
  purposeForm,
  setSpineColor,
  startReading,
  setSpineColorForm,
  type BookFields,
} from './books.ts'

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

describe('editBook', () => {
  afterEach(() => mock.restoreAll())

  it('posts bookId first, then the raw strings, to edit-book', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true }),
    )
    const client = new QueryClient()
    const result = await editBook(client, 'b1', { ...fields, title: ' Dune ' })

    assert.deepEqual(result, { kind: 'ok', ids: {}, reachedLastPage: false })
    const [url, init] = fetch.mock.calls[0].arguments
    assert.equal(url, '/api/intents/edit-book')
    const intent = JSON.parse((init!.body as FormData).get('intent') as string) as Record<string, string>
    assert.deepEqual(Object.keys(intent), ['bookId', ...BOOK_FIELD_KEYS])
    assert.equal(intent.bookId, 'b1')
    assert.equal(intent.title, ' Dune ')
    client.clear()
  })

  it('adds confirmDuplicate: true last, only when asked', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true }),
    )
    const client = new QueryClient()
    const intentOf = (call: number) =>
      JSON.parse((fetch.mock.calls[call].arguments[1]!.body as FormData).get('intent') as string) as Record<
        string,
        unknown
      >

    await editBook(client, 'b1', fields)
    await editBook(client, 'b1', fields, { confirmDuplicate: true })

    assert.equal('confirmDuplicate' in intentOf(0), false)
    assert.deepEqual(Object.keys(intentOf(1)), ['bookId', ...BOOK_FIELD_KEYS, 'confirmDuplicate'])
    assert.equal(intentOf(1).confirmDuplicate, true)
    client.clear()
  })
})

describe('cover', () => {
  const cover = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'dune.png', { type: 'image/png' })
  const keys = (form: FormData) => [...(form as unknown as Iterable<[string, unknown]>)].map(([key]) => key)
  const intent = (form: FormData) => JSON.parse(form.get('intent') as string) as Record<string, unknown>

  it('sends the chosen file as the cover part, after the intent part, as is', async () => {
    const form = addBookForm(fields, { cover })
    assert.deepEqual(keys(form), ['intent', 'cover'])
    const sent = form.get('cover') as File
    assert.equal(sent.name, 'dune.png')
    assert.deepEqual(new Uint8Array(await sent.arrayBuffer()), new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
    assert.equal('cover' in intent(form), false)
    assert.deepEqual(keys(addBookForm(fields)), ['intent'])
    assert.deepEqual(keys(editBookForm('b1', fields, { cover, confirmDuplicate: true })), ['intent', 'cover'])
    assert.deepEqual(keys(editBookForm('b1', fields)), ['intent'])
  })

  it('puts removeCover: true in the edit intent, before confirmDuplicate, only without a file', () => {
    assert.equal('removeCover' in intent(editBookForm('b1', fields)), false)
    const removing = editBookForm('b1', fields, { removeCover: true, confirmDuplicate: true })
    assert.deepEqual(Object.keys(intent(removing)), ['bookId', ...BOOK_FIELD_KEYS, 'removeCover', 'confirmDuplicate'])
    assert.equal(intent(removing).removeCover, true)
    assert.deepEqual(keys(removing), ['intent'])
    // A chosen file cancels the removal: never both.
    const both = editBookForm('b1', fields, { removeCover: true, cover })
    assert.equal('removeCover' in intent(both), false)
    assert.deepEqual(keys(both), ['intent', 'cover'])
  })
})

describe('deleteBook', () => {
  afterEach(() => mock.restoreAll())

  it('posts only the bookId as the intent part of a multipart form', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true }),
    )
    const client = new QueryClient()
    const result = await deleteBook(client, 'b1')

    assert.deepEqual(result, { kind: 'ok', ids: {}, reachedLastPage: false })
    const [url, init] = fetch.mock.calls[0].arguments
    assert.equal(url, '/api/intents/delete-book')
    assert.equal(init!.method, 'POST')
    const body = init!.body as FormData
    assert.deepEqual(
      [...(body as unknown as Iterable<[string, unknown]>)].map(([key]) => key),
      ['intent'],
    )
    assert.deepEqual(JSON.parse(body.get('intent') as string), { bookId: 'b1' })
    client.clear()
  })

  it("passes a refusal and couldn't save through", async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json(
        { error: { kind: 'couldnt_save', code: 'couldnt_save', message: "Couldn't save. Your data wasn't changed." } },
        { status: 503 },
      ),
    )
    const client = new QueryClient()
    assert.deepEqual(await deleteBook(client, 'b1'), {
      kind: 'couldnt_save',
      message: "Couldn't save. Your data wasn't changed.",
    })
    client.clear()
  })

  it('builds the same form on its own', () => {
    assert.equal(deleteBookForm('b2').get('intent'), '{"bookId":"b2"}')
  })
})

describe('setSpineColor', () => {
  afterEach(() => mock.restoreAll())

  it('posts the bookId and the swatch hex as the intent part of a multipart form', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true }),
    )
    const client = new QueryClient()
    const result = await setSpineColor(client, 'b1', '#4B7C7B')

    assert.deepEqual(result, { kind: 'ok', ids: {}, reachedLastPage: false })
    const [url, init] = fetch.mock.calls[0].arguments
    assert.equal(url, '/api/intents/set-spine-color')
    assert.equal(init!.method, 'POST')
    const body = init!.body as FormData
    assert.deepEqual(
      [...(body as unknown as Iterable<[string, unknown]>)].map(([key]) => key),
      ['intent'],
    )
    assert.deepEqual(JSON.parse(body.get('intent') as string), { bookId: 'b1', spineColor: '#4B7C7B' })
    client.clear()
  })

  it('sends From cover as an explicit null', () => {
    assert.equal(setSpineColorForm('b2', null).get('intent'), '{"bookId":"b2","spineColor":null}')
  })

  it("passes couldn't save through", async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json(
        { error: { kind: 'couldnt_save', code: 'couldnt_save', message: "Couldn't save. Your data wasn't changed." } },
        { status: 503 },
      ),
    )
    const client = new QueryClient()
    assert.deepEqual(await setSpineColor(client, 'b1', null), {
      kind: 'couldnt_save',
      message: "Couldn't save. Your data wasn't changed.",
    })
    client.clear()
  })
})

describe('startReading and editPurpose', () => {
  afterEach(() => mock.restoreAll())

  for (const [send, verb] of [
    [startReading, 'start-reading'],
    [editPurpose, 'edit-purpose'],
  ] as const) {
    it(`posts { bookId, purpose } as typed to ${verb}`, async () => {
      const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
        Response.json({ ok: true }),
      )
      const client = new QueryClient()
      const result = await send(client, 'b1', '  Why Arrakis ')

      assert.deepEqual(result, { kind: 'ok', ids: {}, reachedLastPage: false })
      const [url, init] = fetch.mock.calls[0].arguments
      assert.equal(url, `/api/intents/${verb}`)
      assert.equal(init!.method, 'POST')
      const body = init!.body as FormData
      assert.deepEqual(JSON.parse(body.get('intent') as string), { bookId: 'b1', purpose: '  Why Arrakis ' })
      client.clear()
    })
  }

  it('sends no Purpose as an explicit null', () => {
    assert.equal(purposeForm('b2', null).get('intent'), '{"bookId":"b2","purpose":null}')
  })

  it('passes already_main through as a refusal', async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json(
        { error: { kind: 'refusal', code: 'already_main', message: 'This book is already your Main book.' } },
        { status: 409 },
      ),
    )
    const client = new QueryClient()
    const result = await startReading(client, 'b1', null)
    assert.equal(result.kind, 'refusal')
    assert.equal(result.kind === 'refusal' && result.code, 'already_main')
    client.clear()
  })
})
