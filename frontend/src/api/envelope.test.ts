import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { COULDNT_SAVE_MESSAGE, parseIntentResponse, toIntentResult } from './envelope.ts'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('parseIntentResponse', () => {
  it('reads a success with ids', async () => {
    const result = await parseIntentResponse(json({ ok: true, ids: ['b1'] }, 200))
    assert.deepEqual(result, { kind: 'ok', ids: ['b1'], reachedLastPage: false })
  })

  it('reads a bare success and reachedLastPage', async () => {
    assert.deepEqual(await parseIntentResponse(json({ ok: true }, 200)), {
      kind: 'ok',
      ids: [],
      reachedLastPage: false,
    })
    assert.deepEqual(await parseIntentResponse(json({ ok: true, reachedLastPage: true }, 200)), {
      kind: 'ok',
      ids: [],
      reachedLastPage: true,
    })
  })

  it('reads an invalid_fields refusal with its fields', async () => {
    const fields = [
      { field: 'title', message: 'Field required' },
      { field: 'pages', message: 'Input should be a valid integer' },
    ]
    const body = {
      error: { kind: 'refusal', code: 'invalid_fields', message: 'Not saved.', fields },
    }
    assert.deepEqual(await parseIntentResponse(json(body, 422)), {
      kind: 'refusal',
      status: 422,
      code: 'invalid_fields',
      message: 'Not saved.',
      fields,
    })
  })

  it('reads a refusal without fields as an empty list', async () => {
    const body = { error: { kind: 'refusal', code: 'duplicate_book', message: 'Possible duplicate' } }
    const result = await parseIntentResponse(json(body, 409))
    assert.equal(result.kind, 'refusal')
    assert.deepEqual(result.kind === 'refusal' && result.fields, [])
  })

  it('keeps the server message for couldnt_save', async () => {
    const body = { error: { kind: 'couldnt_save', code: 'couldnt_save', message: 'Server copy' } }
    assert.deepEqual(await parseIntentResponse(json(body, 503)), {
      kind: 'couldnt_save',
      message: 'Server copy',
    })
  })

  const notEnvelopes: [string, Response][] = [
    ['an HTML error page', new Response('<html>502</html>', { status: 502 })],
    ['an empty body', new Response('', { status: 500 })],
    ['FastAPI detail', json({ detail: 'Not Found' }, 404)],
    ['a success without ok', json({ ids: ['x'] }, 200)],
    ['an error body with a 200', json({ error: { kind: 'refusal', code: 'x', message: 'm' } }, 200)],
    ['ok with an error status', json({ ok: true }, 500)],
    ['an unknown kind', json({ error: { kind: 'other', code: 'x', message: 'm' } }, 409)],
    ['a malformed fields list', json({ error: { kind: 'refusal', code: 'x', message: 'm', fields: [1] } }, 422)],
    ['a JSON array', json([], 200)],
  ]
  for (const [name, response] of notEnvelopes) {
    it(`treats ${name} as couldnt_save`, async () => {
      assert.deepEqual(await parseIntentResponse(response), {
        kind: 'couldnt_save',
        message: COULDNT_SAVE_MESSAGE,
      })
    })
  }

  it('toIntentResult ignores non-string ids', () => {
    assert.deepEqual(toIntentResult(200, { ok: true, ids: [1] }), {
      kind: 'ok',
      ids: [],
      reachedLastPage: false,
    })
  })
})
