import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  filterKey,
  filtersOn,
  filterValues,
  liveFilters,
  matchesFilters,
  NO_FILTERS,
  publisherValues,
  toggleValue,
  type CatalogFilters,
  type FilterableBook,
} from './catalogFilter.ts'

type Book = FilterableBook & { title: string }

function book(fields: Partial<Book> & { title: string }): Book {
  return {
    favourite: false,
    finished: false,
    type: 'paperback',
    language: 'English',
    tags: [],
    publisher: 'Penguin',
    ...fields,
  }
}

const SHELF: readonly Book[] = [
  book({ title: 'Bleak House', type: 'hardcover', tags: ['novel', 'classic'], publisher: 'Manning', favourite: true }),
  book({ title: 'Dubliners', tags: ['stories'], publisher: "O'Reilly Media" }),
  book({ title: 'Emma', type: 'ebook', tags: ['novel', 'Classic'], publisher: 'manning', favourite: true }),
  book({ title: 'Flights', type: 'hardcover', language: 'Polish', finished: true, publisher: 'Manning' }),
  book({ title: 'Candide', type: 'ebook', language: 'French', tags: ['classic'], finished: true }),
  book({ title: 'Austerlitz', language: 'German', tags: ['novel'], finished: true, favourite: true }),
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
    assert.deepEqual(shown({ status: [], types: [], languages: ['polish'], tags: [], publishers: [] }), ['Flights'])
  })

  it('matches Publisher ignoring case', () => {
    assert.deepEqual(shown({ publishers: [filterKey('Manning')] }), ['Bleak House', 'Emma', 'Flights'])
  })

  it('combines publishers with OR and with other groups with AND', () => {
    assert.deepEqual(shown({ publishers: ['manning', "o'reilly media"] }), [
      'Bleak House',
      'Dubliners',
      'Emma',
      'Flights',
    ])
    assert.deepEqual(shown({ publishers: ['manning'], status: ['unread'], tags: ['novel'] }), ['Bleak House', 'Emma'])
  })

  it('keeps only starred Books with Favourites on', () => {
    assert.deepEqual(shown({ favourites: true }), ['Bleak House', 'Emma', 'Austerlitz'])
  })

  it('combines Favourites with every other group with AND', () => {
    assert.deepEqual(shown({ favourites: true, status: ['unread'] }), ['Bleak House', 'Emma'])
    assert.deepEqual(shown({ favourites: true, status: ['read'] }), ['Austerlitz'])
    assert.deepEqual(shown({ favourites: true, types: ['ebook', 'hardcover'] }), ['Bleak House', 'Emma'])
    assert.deepEqual(shown({ favourites: true, languages: ['german'] }), ['Austerlitz'])
    assert.deepEqual(shown({ favourites: true, tags: ['classic'] }), ['Bleak House', 'Emma'])
    assert.deepEqual(shown({ favourites: true, publishers: ['penguin'] }), ['Austerlitz'])
    assert.deepEqual(shown({ favourites: true, languages: ['polish'] }), [])
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

  it('skips a blank value, which would give a checkbox with no name', () => {
    assert.deepEqual(filterValues(['', 'English', '  ']), [{ key: 'english', label: 'English' }])
  })

  it('does not mutate its input', () => {
    const values = ['b', 'a']
    filterValues(values)
    assert.deepEqual(values, ['b', 'a'])
  })
})

describe('publisherValues', () => {
  it('orders by Book count, most first, then with the collator, counting each Book', () => {
    const values = [
      'Apress',
      ...Array<string>(2).fill('Pragmatic'),
      ...Array<string>(3).fill("O'Reilly"),
      ...Array<string>(2).fill('Manning'),
    ]
    assert.deepEqual(publisherValues(values), [
      { key: "o'reilly", label: "O'Reilly", count: 3 },
      { key: 'manning', label: 'Manning', count: 2 },
      { key: 'pragmatic', label: 'Pragmatic', count: 2 },
      { key: 'apress', label: 'Apress', count: 1 },
    ])
  })

  it('breaks ties by number value', () => {
    assert.deepEqual(
      publisherValues(['Press 10', 'Press 2']).map((value) => value.label),
      ['Press 2', 'Press 10'],
    )
  })

  it('merges spellings that differ only in case, keeping the first and counting both', () => {
    assert.deepEqual(publisherValues(['Manning', 'manning']), [{ key: 'manning', label: 'Manning', count: 2 }])
  })

  it('sorts a merged case group against a tie, keeping the first spelling in library order', () => {
    assert.deepEqual(publisherValues(['manning', 'Apress', 'Manning', 'Apress', 'Zed']), [
      { key: 'apress', label: 'Apress', count: 2 },
      { key: 'manning', label: 'manning', count: 2 },
      { key: 'zed', label: 'Zed', count: 1 },
    ])
  })

  it('skips a blank value', () => {
    assert.deepEqual(publisherValues(['', 'Apress', '  ']), [{ key: 'apress', label: 'Apress', count: 1 }])
  })

  it('does not mutate its input', () => {
    const values = ['b', 'a', 'b']
    publisherValues(values)
    assert.deepEqual(values, ['b', 'a', 'b'])
  })
})

describe('filtersOn', () => {
  it('is false with nothing on and true with any chip or value', () => {
    assert.equal(filtersOn(NO_FILTERS), false)
    assert.equal(filtersOn({ ...NO_FILTERS, status: ['read'] }), true)
    assert.equal(filtersOn({ ...NO_FILTERS, tags: ['novel'] }), true)
    assert.equal(filtersOn({ ...NO_FILTERS, publishers: ['manning'] }), true)
    assert.equal(filtersOn({ ...NO_FILTERS, favourites: true }), true)
  })

  it('has Favourites off in NO_FILTERS', () => {
    assert.equal(NO_FILTERS.favourites, false)
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
  const publishers = publisherValues(['Manning', 'Apress'])

  it('drops checked values no Book has any more', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, languages: ['polish', 'french'], tags: ['gone'] }
    assert.deepEqual(liveFilters(filters, languages, tags, publishers), {
      ...NO_FILTERS,
      languages: ['french'],
      tags: [],
    })
    assert.equal(filtersOn(liveFilters({ ...NO_FILTERS, languages: ['polish'] }, languages, tags, publishers)), false)
  })

  it('drops a checked publisher no Book has any more', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, publishers: ['manning', "o'reilly media"] }
    assert.deepEqual(liveFilters(filters, languages, tags, publishers), { ...NO_FILTERS, publishers: ['manning'] })
    assert.equal(filtersOn(liveFilters({ ...NO_FILTERS, publishers: ['gone'] }, languages, tags, publishers)), false)
  })

  it('returns the same filters when every checked value is live', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, status: ['read'], languages: ['english'], publishers: ['apress'] }
    assert.equal(liveFilters(filters, languages, tags, publishers), filters)
  })

  it('never turns Favourites off, so it stays on with nothing starred', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, favourites: true }
    assert.equal(liveFilters(filters, [], [], []), filters)
    const dropped = liveFilters({ ...filters, tags: ['gone'] }, languages, tags, publishers)
    assert.deepEqual(dropped, { ...NO_FILTERS, favourites: true, tags: [] })
  })

  it('does not mutate its input', () => {
    const filters: CatalogFilters = { ...NO_FILTERS, languages: ['polish'], publishers: ['gone'] }
    liveFilters(filters, languages, tags, publishers)
    assert.deepEqual(filters.languages, ['polish'])
    assert.deepEqual(filters.publishers, ['gone'])
  })
})
