import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  filterKey,
  filtersOn,
  filterValues,
  liveFilters,
  matchesFilters,
  NO_FILTERS,
  toggleValue,
  type CatalogFilters,
  type FilterableBook,
} from './catalogFilter.ts'

type Book = FilterableBook & { title: string }

function book(fields: Partial<Book> & { title: string }): Book {
  return { finished: false, type: 'paperback', language: 'English', tags: [], ...fields }
}

const SHELF: readonly Book[] = [
  book({ title: 'Bleak House', type: 'hardcover', tags: ['novel', 'classic'] }),
  book({ title: 'Dubliners', tags: ['stories'] }),
  book({ title: 'Emma', type: 'ebook', tags: ['novel', 'Classic'] }),
  book({ title: 'Flights', type: 'hardcover', language: 'Polish', finished: true }),
  book({ title: 'Candide', type: 'ebook', language: 'French', tags: ['classic'], finished: true }),
  book({ title: 'Austerlitz', language: 'German', tags: ['novel'], finished: true }),
]

function shown(filters: Partial<CatalogFilters>): string[] {
  const all = { ...NO_FILTERS, ...filters }
  return SHELF.filter((entry) => matchesFilters(entry, all)).map((entry) => entry.title)
}

describe('matchesFilters', () => {
  it('matches every Book with no filter on', () => {
    assert.deepEqual(
      shown({}),
      SHELF.map((entry) => entry.title),
    )
  })

  it('combines chips within a group with OR', () => {
    assert.deepEqual(shown({ types: ['paperback', 'ebook'] }), ['Dubliners', 'Emma', 'Candide', 'Austerlitz'])
  })

  it('combines groups with AND', () => {
    assert.deepEqual(shown({ types: ['paperback', 'ebook'], status: ['unread'] }), ['Dubliners', 'Emma'])
  })

  it('matches every Book with Read and Unread both on', () => {
    assert.equal(shown({ status: ['read', 'unread'] }).length, SHELF.length)
  })

  it('counts a re-read finished Book as Read, not Unread', () => {
    const rereading = book({ title: 'Nana', finished: true })
    assert.equal(matchesFilters(rereading, { ...NO_FILTERS, status: ['read'] }), true)
    assert.equal(matchesFilters(rereading, { ...NO_FILTERS, status: ['unread'] }), false)
  })

  it('matches Language and Tag ignoring case', () => {
    assert.deepEqual(shown({ languages: [filterKey('ENGLISH')] }), ['Bleak House', 'Dubliners', 'Emma'])
    assert.deepEqual(shown({ tags: ['classic'] }), ['Bleak House', 'Emma', 'Candide'])
  })

  it('never matches a Book with no tags against a Tag filter', () => {
    assert.equal(shown({ tags: ['novel', 'classic', 'stories'] }).includes('Flights'), false)
  })

  it('treats an empty group as no constraint', () => {
    assert.deepEqual(shown({ status: [], types: [], languages: ['polish'], tags: [] }), ['Flights'])
  })
})

describe('filterValues', () => {
  it('lists each value once ignoring case, keeping the first spelling, in collator order', () => {
    assert.deepEqual(filterValues(['novel', 'Classic', 'stories', 'classic', 'Novel']), [
      { key: 'classic', label: 'Classic' },
      { key: 'novel', label: 'novel' },
      { key: 'stories', label: 'stories' },
    ])
  })

  it('sorts numbers by value', () => {
    assert.deepEqual(
      filterValues(['Part 10', 'Part 2']).map((value) => value.label),
      ['Part 2', 'Part 10'],
    )
  })

  it('does not mutate its input', () => {
    const values = ['b', 'a']
    filterValues(values)
    assert.deepEqual(values, ['b', 'a'])
  })
})

describe('filtersOn', () => {
  it('is false with nothing on and true with any chip or value', () => {
    assert.equal(filtersOn(NO_FILTERS), false)
    assert.equal(filtersOn({ ...NO_FILTERS, status: ['read'] }), true)
    assert.equal(filtersOn({ ...NO_FILTERS, tags: ['novel'] }), true)
  })
})

describe('toggleValue', () => {
  it('adds a missing value and removes a present one, without mutating', () => {
    const list = ['a']
    assert.deepEqual(toggleValue(list, 'b'), ['a', 'b'])
    assert.deepEqual(toggleValue(list, 'a'), [])
    assert.deepEqual(list, ['a'])
  })
})

describe('liveFilters', () => {
  const languages = filterValues(['English', 'French'])
  const tags = filterValues(['novel'])

  it('drops checked values no Book has any more', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, languages: ['polish', 'french'], tags: ['gone'] }
    assert.deepEqual(liveFilters(filters, languages, tags), { ...NO_FILTERS, languages: ['french'], tags: [] })
    assert.equal(filtersOn(liveFilters({ ...NO_FILTERS, languages: ['polish'] }, languages, tags)), false)
  })

  it('returns the same filters when every checked value is live', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, status: ['read'], languages: ['english'] }
    assert.equal(liveFilters(filters, languages, tags), filters)
  })

  it('does not mutate its input', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, languages: ['polish'] }
    liveFilters(filters, languages, tags)
    assert.deepEqual(filters.languages, ['polish'])
  })
})
