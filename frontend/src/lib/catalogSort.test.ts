import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  CATALOG_SORT_DIRECTION_LABELS,
  CATALOG_SORTS,
  CATALOG_SORT_LABELS,
  readCatalogSort,
  readCatalogSortReversed,
  writeCatalogSort,
  writeCatalogSortReversed,
} from './catalogSort.ts'

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

/** Storage holding `values`, reading `null` for anything else. */
function holding(values: Record<string, string>): Partial<Storage> {
  return { getItem: (key: string) => values[key] ?? null }
}

describe('catalog sort direction', () => {
  it('gives each key its natural and reversed text', () => {
    assert.deepEqual(
      CATALOG_SORTS.map((key) => CATALOG_SORT_DIRECTION_LABELS[key]),
      [
        { natural: 'A–Z', reversed: 'Z–A' },
        { natural: 'A–Z', reversed: 'Z–A' },
        { natural: 'Newest first', reversed: 'Oldest first' },
        { natural: 'Fewest first', reversed: 'Most first' },
      ],
    )
  })

  it('reads "true" with a stored key as reversed, under every key', () => {
    for (const key of CATALOG_SORTS) {
      withStorage(holding({ 'bookvie.catalogSort': key, 'bookvie.catalogSortReversed': 'true' }))
      assert.equal(readCatalogSortReversed(), true)
    }
  })

  it('reads a missing, empty or junk value as natural', () => {
    withStorage(holding({ 'bookvie.catalogSort': 'title' }))
    assert.equal(readCatalogSortReversed(), false)
    for (const junk of ['', 'yes', '1', 'TRUE', '{"reversed":true}', 'false']) {
      withStorage(holding({ 'bookvie.catalogSort': 'title', 'bookvie.catalogSortReversed': junk }))
      assert.equal(readCatalogSortReversed(), false, junk)
    }
  })

  it('reads natural when the stored key is not one of the four', () => {
    withStorage(holding({ 'bookvie.catalogSort': 'shelves', 'bookvie.catalogSortReversed': 'true' }))
    assert.equal(readCatalogSortReversed(), false)
    withStorage(holding({ 'bookvie.catalogSortReversed': 'true' }))
    assert.equal(readCatalogSortReversed(), false)
  })

  it('reads natural, and writes nothing, when storage throws', () => {
    const fail = () => {
      throw new Error('denied')
    }
    withStorage({ getItem: fail, setItem: fail, removeItem: fail })
    assert.equal(readCatalogSortReversed(), false)
    assert.doesNotThrow(() => writeCatalogSortReversed(true))
    assert.doesNotThrow(() => writeCatalogSortReversed(false))
  })

  it('stores "true" when reversed and removes the key when natural', () => {
    const calls: string[][] = []
    withStorage({
      setItem: (key: string, value: string) => void calls.push(['set', key, value]),
      removeItem: (key: string) => void calls.push(['remove', key]),
    })
    writeCatalogSortReversed(true)
    writeCatalogSortReversed(false)
    assert.deepEqual(calls, [
      ['set', 'bookvie.catalogSortReversed', 'true'],
      ['remove', 'bookvie.catalogSortReversed'],
    ])
  })
})
