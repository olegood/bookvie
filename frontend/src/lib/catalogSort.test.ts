import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { CATALOG_SORTS, CATALOG_SORT_LABELS, readCatalogSort, writeCatalogSort } from './catalogSort.ts'

const scope = globalThis as { window?: unknown }

function withStorage(storage: Partial<Storage>): void {
  scope.window = { localStorage: storage }
}

afterEach(() => {
  delete scope.window
})

describe('catalog sort choice', () => {
  it('offers Author, Title, Date added and Pages, in that order', () => {
    assert.deepEqual(
      CATALOG_SORTS.map((key) => CATALOG_SORT_LABELS[key]),
      ['Author', 'Title', 'Date added', 'Pages'],
    )
  })

  it('reads a stored choice', () => {
    for (const key of CATALOG_SORTS) {
      withStorage({ getItem: () => key })
      assert.equal(readCatalogSort(), key)
    }
  })

  it('falls back to Author when nothing or junk is stored', () => {
    withStorage({ getItem: () => null })
    assert.equal(readCatalogSort(), 'author')
    withStorage({ getItem: () => 'shelves' })
    assert.equal(readCatalogSort(), 'author')
    withStorage({ getItem: () => 'toString' })
    assert.equal(readCatalogSort(), 'author')
  })

  it('falls back to Author, and writes nothing, when storage throws', () => {
    const fail = () => {
      throw new Error('denied')
    }
    withStorage({ getItem: fail, setItem: fail })
    assert.equal(readCatalogSort(), 'author')
    assert.doesNotThrow(() => writeCatalogSort('title'))
  })

  it('stores under bookvie.catalogSort', () => {
    const written: [string, string][] = []
    withStorage({ setItem: (key: string, value: string) => void written.push([key, value]) })
    writeCatalogSort('title')
    assert.deepEqual(written, [['bookvie.catalogSort', 'title']])
  })
})
