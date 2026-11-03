import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import {
  COULDNT_EXPORT_MESSAGE,
  dispositionFilename,
  exportAll,
  ExportError,
  exportFailureMessage,
  exportFilename,
  REFRESH_TRIES,
  refreshLastExport,
} from './export.ts'
import { viewKey } from './views.ts'

const SERVER_MESSAGE = "Couldn't export. Your data wasn't changed."

describe('exportFilename', () => {
  it('names the file for the local date, zero-padded', () => {
    assert.equal(exportFilename(new Date(2026, 0, 5, 23, 59)), 'bookvie-export-2026-01-05.zip')
  })
})

describe('dispositionFilename', () => {
  it("reads the server's filename", () => {
    assert.equal(
      dispositionFilename('attachment; filename="bookvie-export-2026-10-30.zip"'),
      'bookvie-export-2026-10-30.zip',
    )
  })

  it('is null without one', () => {
    assert.equal(dispositionFilename(null), null)
    assert.equal(dispositionFilename('attachment'), null)
  })
})

describe('exportFailureMessage', () => {
  it("is the envelope's message", async () => {
    const body = { error: { kind: 'couldnt_export', code: 'couldnt_export', message: SERVER_MESSAGE } }
    assert.equal(await exportFailureMessage(Response.json(body, { status: 503 })), SERVER_MESSAGE)
  })

  it('falls back to the client copy for anything else', async () => {
    assert.equal(await exportFailureMessage(new Response('Bad gateway', { status: 502 })), COULDNT_EXPORT_MESSAGE)
    assert.equal(await exportFailureMessage(Response.json({ error: {} }, { status: 500 })), COULDNT_EXPORT_MESSAGE)
  })
})

describe('exportAll', () => {
  afterEach(() => mock.restoreAll())

  it("throws the server's message on a non-OK answer", async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json({ error: { kind: 'couldnt_export', code: 'couldnt_export', message: 'From the server.' } }, {
        status: 503,
      }),
    )
    await assert.rejects(exportAll(), (error) => error instanceof ExportError && error.message === 'From the server.')
  })

  it('throws the client copy when the server is unreachable', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('fetch failed')
    })
    await assert.rejects(exportAll(), (error) => error instanceof ExportError && error.message === COULDNT_EXPORT_MESSAGE)
  })
})

describe('refreshLastExport', () => {
  afterEach(() => mock.restoreAll())

  const answers = (values: (string | null)[]) => {
    let call = 0
    return mock.method(globalThis, 'fetch', async () => Response.json({ lastExportAt: values[Math.min(call++, values.length - 1)] }))
  }

  it('refetches until the record changes and leaves it in the cache', async () => {
    const client = new QueryClient()
    const fetch = answers([null, null, '2026-10-30T12:00:00+01:00'])
    await refreshLastExport(client, null, async () => {})
    assert.equal(fetch.mock.callCount(), 3)
    assert.deepEqual(client.getQueryData(viewKey('backup')), { lastExportAt: '2026-10-30T12:00:00+01:00' })
  })

  it(`gives up after ${REFRESH_TRIES} tries`, async () => {
    const before = '2026-10-01T09:30:00+02:00'
    const fetch = answers([before])
    await refreshLastExport(new QueryClient(), before, async () => {})
    assert.equal(fetch.mock.callCount(), REFRESH_TRIES)
  })

  it('stops quietly when a refetch fails', async () => {
    const fetch = mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }))
    await refreshLastExport(new QueryClient({ defaultOptions: { queries: { retry: false } } }), null, async () => {})
    assert.equal(fetch.mock.callCount(), 1)
  })
})
