import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { CATALOG_VIEWS, readCatalogView, writeCatalogView } from './catalogView.ts'

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

// Story 8.1 See my catalog as covers: Tiles is the third view.
describe('catalog view choice with Tiles', () => {
  it('[P1] AC-11 reads a stored Tiles choice and offers Bookcase, List and Tiles in that order', () => {
    withStorage({ getItem: () => 'tiles' })
    // The criterion: "tiles" is a choice now, not junk that falls back to Bookcase.
    assert.equal(readCatalogView(), 'tiles')
    assert.deepEqual(CATALOG_VIEWS, ['bookcase', 'list', 'tiles'])
    // Bookcase and List read as before, and junk still means Bookcase.
    withStorage({ getItem: () => 'list' })
    assert.equal(readCatalogView(), 'list')
    withStorage({ getItem: () => 'mosaic' })
    assert.equal(readCatalogView(), 'bookcase')
  })
})
