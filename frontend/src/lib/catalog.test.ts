import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bookcaseName,
  finishLine,
  finishStatus,
  formatDateAdded,
  lastTagSegment,
  matchCountCopy,
  matchesTitle,
  noMatchCopy,
  pickTag,
  sliceName,
  sortBooks,
  spineMarker,
  spineName,
  tagSuggestions,
  type NamedSpine,
  type SortableBook,
} from './catalog.ts'
import { CATALOG_SORTS } from './catalogSort.ts'

/** A sortable Book; every field not given is the same for all. */
function book(fields: Partial<SortableBook> & { title: string }): SortableBook {
  return { id: 'a', firstAuthor: 'X', pages: 100, createdAt: '2026-01-01T10:00:00+00:00', ...fields }
}

const titles = (books: readonly SortableBook[]) => books.map((entry) => entry.title)

describe('sortBooks', () => {
  it('orders by first author with the collator, then by title', () => {
    const books = [
      book({ id: '1', title: 'The Dispossessed', firstAuthor: 'Ursula K. Le Guin' }),
      book({ id: '2', title: 'Nana', firstAuthor: 'Émile Zola' }),
      book({ id: '3', title: 'Dune', firstAuthor: 'Frank Herbert' }),
      book({ id: '4', title: 'All About Love', firstAuthor: 'bell hooks' }),
      book({ id: '5', title: 'A Wizard of Earthsea', firstAuthor: 'Ursula K. Le Guin' }),
    ]
    assert.deepEqual(titles(sortBooks(books, 'author')), [
      'All About Love',
      'Nana',
      'Dune',
      'A Wizard of Earthsea',
      'The Dispossessed',
    ])
  })

  it('breaks author ties by title ignoring case, and does not mutate', () => {
    const books = [book({ id: '1', title: 'B' }), book({ id: '2', title: 'a' })]
    assert.deepEqual(titles(sortBooks(books, 'author')), ['a', 'B'])
    assert.equal(books[0].title, 'B')
  })

  // Each key orders these differently.
  const shelf = [
    book({
      id: '1',
      title: 'Kindred',
      firstAuthor: 'Octavia E. Butler',
      pages: 286,
      createdAt: '2026-01-10T10:00:00+00:00',
    }),
    book({ id: '2', title: 'Emma', firstAuthor: 'Jane Austen', pages: 474, createdAt: '2026-03-01T10:00:00+00:00' }),
    book({ id: '3', title: 'Dune', firstAuthor: 'Frank Herbert', pages: 412, createdAt: '2026-02-01T09:00:00+00:00' }),
    book({
      id: '5',
      title: 'Beloved',
      firstAuthor: 'Toni Morrison',
      pages: 324,
      createdAt: '2026-04-15T10:00:00+00:00',
    }),
  ]

  it('gives each key its own order', () => {
    assert.deepEqual(titles(sortBooks(shelf, 'author')), ['Dune', 'Emma', 'Kindred', 'Beloved'])
    assert.deepEqual(titles(sortBooks(shelf, 'title')), ['Beloved', 'Dune', 'Emma', 'Kindred'])
    assert.deepEqual(titles(sortBooks(shelf, 'dateAdded')), ['Beloved', 'Emma', 'Dune', 'Kindred'])
    assert.deepEqual(titles(sortBooks(shelf, 'pages')), ['Kindred', 'Beloved', 'Dune', 'Emma'])
  })

  it('sorts Title A–Z with the collator, whatever the first letter’s case or accent', () => {
    const books = [
      book({ id: '1', title: 'Zazie' }),
      book({ id: '2', title: 'émile' }),
      book({ id: '3', title: 'Ulysses' }),
      book({ id: '4', title: 'and then' }),
      book({ id: '5', title: 'Éclipse' }),
    ]
    assert.deepEqual(titles(sortBooks(books, 'title')), ['and then', 'Éclipse', 'émile', 'Ulysses', 'Zazie'])
  })

  it('sorts numbers in titles and authors by value, not as text', () => {
    const books = [
      book({ id: '1', title: 'Volume 10', firstAuthor: 'Author 10' }),
      book({ id: '2', title: 'Volume 2', firstAuthor: 'Author 2' }),
      book({ id: '3', title: 'Volume 1', firstAuthor: 'Author 1' }),
    ]
    assert.deepEqual(titles(sortBooks(books, 'title')), ['Volume 1', 'Volume 2', 'Volume 10'])
    assert.deepEqual(titles(sortBooks(books, 'author')), ['Volume 1', 'Volume 2', 'Volume 10'])
  })

  it('breaks a primary tie by title first', () => {
    const books = [
      book({ id: '1', title: 'Beta', pages: 200, createdAt: '2026-01-01T10:00:00+00:00' }),
      book({ id: '2', title: 'Alpha', pages: 200, createdAt: '2026-05-01T10:00:00+00:00' }),
    ]
    for (const key of ['author', 'pages'] as const) {
      assert.deepEqual(titles(sortBooks(books, key)), ['Alpha', 'Beta'])
    }
  })

  it('breaks a title tie by createdAt, older first, compared as instants', () => {
    // 09:30+02:00 is 07:30Z, before 08:00Z, though its string sorts later.
    const older = book({ id: '9', title: 'Dune', createdAt: '2026-02-01T09:30:00+02:00' })
    const newer = book({ id: '1', title: 'Dune', createdAt: '2026-02-01T08:00:00+00:00' })
    for (const key of ['author', 'title', 'pages'] as const) {
      assert.deepEqual(
        sortBooks([newer, older], key).map((entry) => entry.id),
        ['9', '1'],
      )
    }
    // Date added still puts the newer first, by its primary key.
    assert.deepEqual(
      sortBooks([older, newer], 'dateAdded').map((entry) => entry.id),
      ['1', '9'],
    )
  })

  it('breaks a tie on everything else by Book id, under every key', () => {
    const four = book({ id: '00000000-0000-4000-8000-000000000004', title: 'Dune' })
    const three = book({ id: '00000000-0000-4000-8000-000000000003', title: 'Dune' })
    for (const key of CATALOG_SORTS) {
      assert.deepEqual(
        sortBooks([four, three], key).map((entry) => entry.id),
        [three.id, four.id],
      )
    }
  })

  it('compares ids by code unit, not by locale', () => {
    const upper = book({ id: 'B', title: 'Dune' })
    const lower = book({ id: 'a', title: 'Dune' })
    assert.deepEqual(
      sortBooks([lower, upper], 'title').map((entry) => entry.id),
      ['B', 'a'],
    )
  })

  it('breaks Pages ties by title', () => {
    const books = [
      book({ id: '1', title: 'Kindred', pages: 300 }),
      book({ id: '2', title: 'Beloved', pages: 300 }),
      book({ id: '3', title: 'Emma', pages: 100 }),
    ]
    assert.deepEqual(titles(sortBooks(books, 'pages')), ['Emma', 'Beloved', 'Kindred'])
  })

  it('puts a Book with no author before named authors, then by title', () => {
    const books = [
      book({ id: '1', title: 'Dune', firstAuthor: 'Frank Herbert' }),
      book({ id: '2', title: 'Zohar', firstAuthor: '' }),
      book({ id: '3', title: 'Beowulf', firstAuthor: '' }),
    ]
    assert.deepEqual(titles(sortBooks(books, 'author')), ['Beowulf', 'Zohar', 'Dune'])
  })

  it('returns a new array and leaves its input alone, under every key', () => {
    const before = titles(shelf)
    for (const key of CATALOG_SORTS) {
      const sorted = sortBooks(shelf, key)
      assert.notEqual(sorted, shelf)
      assert.deepEqual(titles(shelf), before)
    }
  })
})

describe('matchesTitle', () => {
  it('matches a substring ignoring case', () => {
    assert.equal(matchesTitle('Children of Dune', 'DUNE'), true)
    assert.equal(matchesTitle('Neuromancer', 'dune'), false)
  })

  it('matches everything for empty or blank text, and trims', () => {
    assert.equal(matchesTitle('Dune', ''), true)
    assert.equal(matchesTitle('Dune', '   '), true)
    assert.equal(matchesTitle('Dune', ' dune '), true)
  })
})

describe('copy', () => {
  it('counts one book in the singular', () => {
    assert.equal(matchCountCopy(1), '1 book matches.')
    assert.equal(matchCountCopy(0), '0 books match.')
    assert.equal(matchCountCopy(3), '3 books match.')
  })

  it('quotes the search text when nothing matches', () => {
    assert.equal(noMatchCopy('zzz '), 'No titles match “zzz”.')
  })
})

describe('spineName', () => {
  const book: NamedSpine = {
    title: 'Dune',
    firstAuthor: 'Frank Herbert',
    authorCount: 1,
    finished: true,
    role: null,
    currentPage: null,
    percent: null,
    waitingPage: null,
    sideRead: false,
  }

  it('names the title, first author and status', () => {
    assert.equal(spineName(book), 'Dune by Frank Herbert, finished')
    assert.equal(spineName({ ...book, finished: false }), 'Dune by Frank Herbert, not read yet')
  })

  it('counts co-authors as "1 other" or "N others"', () => {
    assert.equal(
      spineName({ ...book, title: 'Good Omens', firstAuthor: 'Terry Pratchett', authorCount: 2 }),
      'Good Omens by Terry Pratchett and 1 other, finished',
    )
    assert.equal(
      spineName({ ...book, title: 'The Science of Discworld', firstAuthor: 'Terry Pratchett', authorCount: 3 }),
      'The Science of Discworld by Terry Pratchett and 2 others, finished',
    )
  })

  it('leaves out "by" when there is no author', () => {
    assert.equal(spineName({ ...book, firstAuthor: '', authorCount: 0, finished: false }), 'Dune, not read yet')
  })

  it('names the Main book with its percentage, or as a re-read once finished', () => {
    const main = { ...book, finished: false, role: 'main', percent: 64 } as const
    assert.equal(spineName(main), 'Dune by Frank Herbert, Main book, 64%')
    assert.equal(
      spineName({ ...main, finished: true, percent: 12 }),
      'Dune by Frank Herbert, finished, re-reading, 12%',
    )
  })

  it('names a paused Book waiting for you at its page, finished or not', () => {
    const waiting = { ...book, finished: false, role: 'waiting', percent: 29, waitingPage: 120 } as const
    assert.equal(spineName(waiting), 'Dune by Frank Herbert, waiting for you, page 120')
    assert.equal(
      spineName({ ...waiting, finished: true, waitingPage: 40 }),
      'Dune by Frank Herbert, finished, waiting for you, page 40',
    )
  })

  it('names an Up next Book with no Reading in progress after its read status', () => {
    const upNext = { ...book, finished: false, role: 'upNext' } as const
    assert.equal(spineName(upNext), 'Dune by Frank Herbert, not read yet, Up next')
    assert.equal(spineName({ ...upNext, finished: true }), 'Dune by Frank Herbert, finished, Up next')
  })

  it('adds ", on the side" after the status for a Side read', () => {
    assert.equal(
      spineName({ ...book, finished: false, sideRead: true }),
      'Dune by Frank Herbert, not read yet, on the side',
    )
    const waiting = { ...book, finished: false, role: 'waiting', waitingPage: 120, sideRead: true } as const
    assert.equal(spineName(waiting), 'Dune by Frank Herbert, waiting for you, page 120, on the side')
    const upNext = { ...book, finished: false, role: 'upNext', currentPage: 40, sideRead: true } as const
    assert.equal(spineName(upNext), 'Dune by Frank Herbert, Up next, paused at page 40, on the side')
    assert.equal(spineMarker(upNext), 'upNext')
  })

  it('names a paused Up next Book at its page, finished or not', () => {
    const paused = { ...book, finished: false, role: 'upNext', currentPage: 120, percent: 36 } as const
    assert.equal(spineName(paused), 'Dune by Frank Herbert, Up next, paused at page 120')
    assert.equal(
      spineName({ ...paused, finished: true, currentPage: 40 }),
      'Dune by Frank Herbert, finished, Up next, paused at page 40',
    )
  })
})

describe('spineMarker', () => {
  it('gives each role its own marker and none without a role', () => {
    assert.equal(spineMarker({ role: 'main' }), 'main')
    assert.equal(spineMarker({ role: 'upNext' }), 'upNext')
    assert.equal(spineMarker({ role: 'waiting' }), 'waiting')
    assert.equal(spineMarker({ role: null }), null)
  })
})

describe('bookcaseName', () => {
  it('counts one book in the singular', () => {
    assert.equal(bookcaseName(1), 'Bookcase, 1 book')
    assert.equal(bookcaseName(500), 'Bookcase, 500 books')
  })
})

describe('sliceName', () => {
  it('counts the rows shown, one in the singular', () => {
    assert.equal(sliceName(1), 'Bookcase slice, 1 row')
    assert.equal(sliceName(2), 'Bookcase slice, 2 rows')
    assert.equal(sliceName(3), 'Bookcase slice, 3 rows')
  })
})

describe('formatDateAdded', () => {
  it('shows a local date with a short month', () => {
    const at = new Date(2026, 9, 30, 12, 0, 0).toISOString()
    assert.equal(formatDateAdded(at), '30 Oct 2026')
  })
})

describe('tags', () => {
  const tags = ['science', 'classics', 'sci-fi', 'cyberpunk']

  it('suggests tags that start with the last segment, ignoring case', () => {
    assert.deepEqual(tagSuggestions(tags, 'sc'), ['science', 'sci-fi'])
    assert.deepEqual(tagSuggestions(tags, 'SC'), ['science', 'sci-fi'])
    assert.deepEqual(tagSuggestions(tags, 'sci-fi, cl'), ['classics'])
  })

  it('suggests nothing for an empty segment', () => {
    assert.deepEqual(tagSuggestions(tags, ''), [])
    assert.deepEqual(tagSuggestions(tags, 'science, '), [])
    assert.equal(lastTagSegment('a, b ,  c '), 'c')
  })

  it('replaces the segment being typed and appends ", "', () => {
    assert.equal(pickTag('sc', 'science'), 'science, ')
    assert.equal(pickTag('sci-fi, cl', 'classics'), 'sci-fi, classics, ')
    assert.equal(pickTag('sci-fi,cl', 'classics'), 'sci-fi, classics, ')
  })
})

describe('finishLine', () => {
  it('reads "Finished X." for a first finish', () => {
    assert.equal(finishLine('The Left Hand of Darkness', false), 'Finished The Left Hand of Darkness.')
  })

  it('reads "Finished X again." for a re-read', () => {
    assert.equal(finishLine('Dune', true), 'Finished Dune again.')
  })
})

describe('finishStatus', () => {
  it('adds the meter after the line', () => {
    assert.equal(
      finishStatus('The Left Hand of Darkness', false, { finished: 25, total: 73 }),
      'Finished The Left Hand of Darkness. 25 of 73 finished.',
    )
  })

  it('keeps "again" for a re-read, with the unchanged meter', () => {
    assert.equal(finishStatus('Dune', true, { finished: 1, total: 2 }), 'Finished Dune again. 1 of 2 finished.')
  })

  it('never uses an exclamation mark', () => {
    assert.doesNotMatch(finishStatus('Dune', false, { finished: 1, total: 1 }), /!/)
  })
})
