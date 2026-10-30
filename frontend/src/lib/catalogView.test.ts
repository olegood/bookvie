import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { readCatalogView, writeCatalogView } from './catalogView.ts'

const scope = globalThis as { window?: unknown }

function withStorage(storage: Partial<Storage>): void {
  scope.window = { localStorage: storage }
}

afterEach(() => {
  delete scope.window
})

describe('catalog view choice', () => {
  it('reads a stored choice', () => {
    withStorage({ getItem: () => 'list' })
    assert.equal(readCatalogView(), 'list')
  })

  it('falls back to Bookcase when nothing or junk is stored', () => {
    withStorage({ getItem: () => null })
    assert.equal(readCatalogView(), 'bookcase')
    withStorage({ getItem: () => 'shelves' })
    assert.equal(readCatalogView(), 'bookcase')
  })

  it('falls back to Bookcase, and writes nothing, when storage throws', () => {
    const fail = () => {
      throw new Error('denied')
    }
    withStorage({ getItem: fail, setItem: fail })
    assert.equal(readCatalogView(), 'bookcase')
    assert.doesNotThrow(() => writeCatalogView('list'))
  })

  it('stores under bookvie.catalogView', () => {
    const written: [string, string][] = []
    withStorage({ setItem: (key: string, value: string) => void written.push([key, value]) })
    writeCatalogView('list')
    assert.deepEqual(written, [['bookvie.catalogView', 'list']])
  })
})
