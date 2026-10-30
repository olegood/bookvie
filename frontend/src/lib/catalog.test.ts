import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  bookcaseName,
  formatDateAdded,
  lastTagSegment,
  matchCountCopy,
  matchesTitle,
  noMatchCopy,
  pickTag,
  sortBooks,
  spineName,
  tagSuggestions,
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
  const book = { title: 'Dune', firstAuthor: 'Frank Herbert', authorCount: 1, finished: true }

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
})

describe('bookcaseName', () => {
  it('counts one book in the singular', () => {
    assert.equal(bookcaseName(1), 'Bookcase, 1 book')
    assert.equal(bookcaseName(500), 'Bookcase, 500 books')
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
