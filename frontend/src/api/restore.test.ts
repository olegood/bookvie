import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { restore, restoreForm } from './restore.ts'

const archive = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'bookvie-export-2026-10-30.zip', {
  type: 'application/zip',
})

describe('restore', () => {
  afterEach(() => mock.restoreAll())

  it('builds an intent part holding {} and the file as the archive part', async () => {
    const form = restoreForm(archive)

    assert.equal(form.get('intent'), '{}')
    const part = form.get('archive')
    assert.ok(part instanceof File)
    assert.equal(part.name, 'bookvie-export-2026-10-30.zip')
    assert.deepEqual(new Uint8Array(await part.arrayBuffer()), new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
  })

  it('posts one multipart restore intent and returns its outcome', async () => {
    const fetch = mock.method(globalThis, 'fetch', async (..._args: [string, RequestInit]) =>
      Response.json({ ok: true }),
    )

    const result = await restore(new QueryClient(), archive)

    assert.deepEqual(result, { kind: 'ok', ids: {}, reachedLastPage: false })
    assert.equal(fetch.mock.callCount(), 1)
    const [url, init = {}] = fetch.mock.calls[0].arguments
    assert.equal(url, '/api/intents/restore')
    assert.equal(init.method, 'POST')
    assert.match(String((init.headers as Record<string, string>)['Content-Type']), /^multipart\/form-data; boundary=/)
  })
})
