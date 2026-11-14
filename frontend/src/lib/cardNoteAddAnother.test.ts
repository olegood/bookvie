import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { readAddAnother, writeAddAnother } from './cardNoteAddAnother.ts'

const scope = globalThis as { window?: unknown }

function withStorage(storage: Partial<Storage>): void {
  scope.window = { localStorage: storage }
}

afterEach(() => {
  delete scope.window
})

describe('Add another choice', () => {
  it('reads the stored on value as on', () => {
    withStorage({ getItem: () => 'on' })
    assert.equal(readAddAnother(), true)
  })

  it('reads nothing, off, junk or an empty value as off', () => {
    for (const stored of [null, 'off', 'sometimes', '{"on":tru', '', 'ON', 'true']) {
      withStorage({ getItem: () => stored })
      assert.equal(readAddAnother(), false, `stored ${JSON.stringify(stored)}`)
    }
  })

  it('reads off, and a write does not throw, when storage throws', () => {
    const fail = () => {
      throw new Error('denied')
    }
    withStorage({ getItem: fail, setItem: fail })
    assert.equal(readAddAnother(), false)
    assert.doesNotThrow(() => writeAddAnother(true))
    assert.doesNotThrow(() => writeAddAnother(false))
  })

  it('stores under bookvie.cardNoteAddAnother', () => {
    const written: [string, string][] = []
    withStorage({ setItem: (key: string, value: string) => void written.push([key, value]) })
    writeAddAnother(true)
    writeAddAnother(false)
    assert.deepEqual(written, [
      ['bookvie.cardNoteAddAnother', 'on'],
      ['bookvie.cardNoteAddAnother', 'off'],
    ])
  })

  it('reads back what it wrote', () => {
    const store = new Map<string, string>()
    withStorage({
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    })
    writeAddAnother(true)
    assert.equal(readAddAnother(), true)
    writeAddAnother(false)
    assert.equal(readAddAnother(), false)
  })
})
