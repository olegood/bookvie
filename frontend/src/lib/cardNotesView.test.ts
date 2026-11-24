import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { CARD_NOTES_VIEWS, readCardNotesView, writeCardNotesView } from './cardNotesView.ts'

const scope = globalThis as { window?: unknown }

function withStorage(storage: Partial<Storage>): void {
  scope.window = { localStorage: storage }
}

afterEach(() => {
  delete scope.window
})

describe('card notes view choice', () => {
  it('reads a stored "boxes" or "list"', () => {
    withStorage({ getItem: () => 'list' })
    assert.equal(readCardNotesView(), 'list')
    withStorage({ getItem: () => 'boxes' })
    assert.equal(readCardNotesView(), 'boxes')
  })

  it('offers Boxes then List', () => {
    assert.deepEqual(CARD_NOTES_VIEWS, ['boxes', 'list'])
  })

  it('falls back to Boxes when nothing, an empty value or junk is stored', () => {
    for (const stored of [null, '', 'grid', 'LIST', ' list', 'list ']) {
      withStorage({ getItem: () => stored })
      assert.equal(readCardNotesView(), 'boxes', JSON.stringify(stored))
    }
  })

  it('falls back to Boxes, and writes nothing, when storage throws', () => {
    const fail = () => {
      throw new Error('denied')
    }
    withStorage({ getItem: fail, setItem: fail })
    assert.equal(readCardNotesView(), 'boxes')
    assert.doesNotThrow(() => writeCardNotesView('list'))
  })

  it('stores under bookvie.cardNotesView', () => {
    const written: [string, string][] = []
    withStorage({ setItem: (key: string, value: string) => void written.push([key, value]) })
    writeCardNotesView('list')
    writeCardNotesView('boxes')
    assert.deepEqual(written, [
      ['bookvie.cardNotesView', 'list'],
      ['bookvie.cardNotesView', 'boxes'],
    ])
  })
})
