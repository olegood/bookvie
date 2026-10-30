import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { COULDNT_SAVE_MESSAGE, parseIntentResponse, toIntentResult } from './envelope.ts'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('parseIntentResponse', () => {
  it('reads a success with ids', async () => {
    const result = await parseIntentResponse(json({ ok: true, ids: { bookId: 'b1' } }, 200))
    assert.deepEqual(result, { kind: 'ok', ids: { bookId: 'b1' }, reachedLastPage: false })
  })

  it('reads a bare success and reachedLastPage', async () => {
    assert.deepEqual(await parseIntentResponse(json({ ok: true }, 200)), {
      kind: 'ok',
      ids: {},
      reachedLastPage: false,
    })
    assert.deepEqual(await parseIntentResponse(json({ ok: true, reachedLastPage: true }, 200)), {
      kind: 'ok',
      ids: {},
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
      duplicates: [],
    })
  })

  it('reads a refusal without fields as an empty list', async () => {
    const body = { error: { kind: 'refusal', code: 'duplicate_book', message: 'Possible duplicate' } }
    const result = await parseIntentResponse(json(body, 409))
    assert.equal(result.kind, 'refusal')
    assert.deepEqual(result.kind === 'refusal' && result.fields, [])
    assert.deepEqual(result.kind === 'refusal' && result.duplicates, [])
  })

  it('reads a duplicate_book refusal with its matches, isbn null included', async () => {
    const duplicates = [
      { title: 'Dune', authors: ['Frank Herbert'], isbn: '9780441172719' },
      { title: 'The Dispossessed', authors: ['Ursula K. Le Guin', 'Brian Attebery'], isbn: null },
    ]
    const body = { error: { kind: 'refusal', code: 'duplicate_book', message: 'Possible duplicate.', duplicates } }
    assert.deepEqual(toIntentResult(409, body), {
      kind: 'refusal',
      status: 409,
      code: 'duplicate_book',
      message: 'Possible duplicate.',
      fields: [],
      duplicates,
    })
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
    ['a success without ok', json({ ids: { bookId: 'x' } }, 200)],
    ['an error body with a 200', json({ error: { kind: 'refusal', code: 'x', message: 'm' } }, 200)],
    ['ok with an error status', json({ ok: true }, 500)],
    ['an unknown kind', json({ error: { kind: 'other', code: 'x', message: 'm' } }, 409)],
    ['a malformed fields list', json({ error: { kind: 'refusal', code: 'x', message: 'm', fields: [1] } }, 422)],
    ['a JSON array', json([], 200)],
    ['a duplicates object', json({ error: { kind: 'refusal', code: 'x', message: 'm', duplicates: {} } }, 409)],
    [
      'a match without authors',
      json({ error: { kind: 'refusal', code: 'x', message: 'm', duplicates: [{ title: 'D', isbn: null }] } }, 409),
    ],
    [
      'a match with a numeric isbn',
      json({ error: { kind: 'refusal', code: 'x', message: 'm', duplicates: [{ title: 'D', authors: [], isbn: 1 }] } }, 409),
    ],
    [
      'a match with a non-string author',
      json({ error: { kind: 'refusal', code: 'x', message: 'm', duplicates: [{ title: 'D', authors: [1], isbn: null }] } }, 409),
    ],
  ]
  for (const [name, response] of notEnvelopes) {
    it(`treats ${name} as couldnt_save`, async () => {
      assert.deepEqual(await parseIntentResponse(response), {
        kind: 'couldnt_save',
        message: COULDNT_SAVE_MESSAGE,
      })
    })
  }

  const notIds: [string, unknown][] = [
    ['a non-string id', { bookId: 1 }],
    ['a list of ids', ['b1']],
    ['a string', 'b1'],
    ['null', null],
  ]
  for (const [name, ids] of notIds) {
    it(`toIntentResult reads ${name} as no ids`, () => {
      assert.deepEqual(toIntentResult(200, { ok: true, ids }), {
        kind: 'ok',
        ids: {},
        reachedLastPage: false,
      })
    })
  }
})
