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
} from './catalog.ts'

describe('sortBooks', () => {
  it('orders by first author with the collator, then by title', () => {
    const books = [
      { title: 'The Dispossessed', firstAuthor: 'Ursula K. Le Guin' },
      { title: 'Nana', firstAuthor: 'Émile Zola' },
      { title: 'Dune', firstAuthor: 'Frank Herbert' },
      { title: 'All About Love', firstAuthor: 'bell hooks' },
      { title: 'A Wizard of Earthsea', firstAuthor: 'Ursula K. Le Guin' },
    ]
    assert.deepEqual(
      sortBooks(books).map((book) => book.title),
      ['All About Love', 'Nana', 'Dune', 'A Wizard of Earthsea', 'The Dispossessed'],
    )
  })

  it('breaks author ties by title ignoring case, and does not mutate', () => {
    const books = [
      { title: 'B', firstAuthor: 'X' },
      { title: 'a', firstAuthor: 'X' },
    ]
    assert.deepEqual(
      sortBooks(books).map((book) => book.title),
      ['a', 'B'],
    )
    assert.equal(books[0].title, 'B')
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
