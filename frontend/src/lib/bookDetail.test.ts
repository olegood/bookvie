import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BOOK_FIELD_KEYS } from '../api/index.ts'
import { metadata, readingLines, shortDate, toPanelFields, type EditableBook } from './bookDetail.ts'

const dune: EditableBook = {
  title: 'Dune',
  subtitle: null,
  authors: ['Frank Herbert', 'Brian Herbert'],
  pages: 412,
  edition: 1,
  language: 'English',
  publisher: 'Chilton Books',
  type: 'hardcover',
  isbn: null,
  year: null,
  tags: ['sci-fi', 'classics'],
  spineColorUser: null,
  latestFinishDate: null,
}

describe('toPanelFields', () => {
  it('types the stored Book into the form, empty for absent values', () => {
    assert.deepEqual(toPanelFields(dune), {
      title: 'Dune',
      subtitle: '',
      pages: '412',
      authors: 'Frank Herbert; Brian Herbert',
      edition: '1',
      language: 'English',
      publisher: 'Chilton Books',
      type: 'hardcover',
      isbn: '',
      year: '',
      finishedOn: '',
      tags: 'sci-fi, classics',
      spineColor: '',
    })
    assert.deepEqual(Object.keys(toPanelFields(dune)), [...BOOK_FIELD_KEYS])
  })

  it('carries the optional values and the latest finish date', () => {
    const fields = toPanelFields({
      ...dune,
      subtitle: 'A Novel',
      isbn: '9780441172719',
      year: 1965,
      spineColorUser: '#112233',
      latestFinishDate: '2024-02-10',
    })
    assert.equal(fields.subtitle, 'A Novel')
    assert.equal(fields.isbn, '9780441172719')
    assert.equal(fields.year, '1965')
    assert.equal(fields.spineColor, '#112233')
    assert.equal(fields.finishedOn, '2024-02-10')
  })
})

describe('shortDate', () => {
  it('is day, short month, year with no leading zero', () => {
    assert.equal(shortDate('2026-09-02'), '2 Sep 2026')
    assert.equal(shortDate('2019-08-14'), '14 Aug 2019')
    assert.equal(shortDate('2024-01-31'), '31 Jan 2024')
  })
})

describe('readingLines', () => {
  it('formats each kind of Reading', () => {
    assert.deepEqual(
      readingLines([
        { id: 'a', startDate: '2026-09-02', finishDate: '2026-10-03' },
      ]).map((line) => line.text),
      ['Started 2 Sep 2026 · Finished 3 Oct 2026'],
    )
    assert.deepEqual(readingLines([{ id: 'b', startDate: null, finishDate: '2019-08-14' }])[0].text, 'Finished 14 Aug 2019')
    assert.deepEqual(readingLines([{ id: 'c', startDate: '2026-09-02', finishDate: null }])[0].text, 'Started 2 Sep 2026')
  })

  it('lists newest first: the unfinished Reading, then by finish date, later stored first on a tie', () => {
    const lines = readingLines([
      { id: 'old', startDate: null, finishDate: '2019-08-14' },
      { id: 'now', startDate: '2026-09-02', finishDate: null },
      { id: 'tie1', startDate: null, finishDate: '2024-02-10' },
      { id: 'tie2', startDate: '2024-01-02', finishDate: '2024-02-10' },
    ])
    assert.deepEqual(
      lines.map((line) => line.id),
      ['now', 'tie2', 'tie1', 'old'],
    )
  })

  it('is empty with no Readings', () => {
    assert.deepEqual(readingLines([]), [])
  })
})

describe('metadata', () => {
  it('leaves out Edition 1 and empty ISBN and Year, and labels the Type', () => {
    assert.deepEqual(metadata(dune), [
      ['Pages', '412'],
      ['Language', 'English'],
      ['Publisher', 'Chilton Books'],
      ['Type', 'Hardcover'],
    ])
  })

  it('shows Edition 2, ISBN and Year in order, with Pages grouped', () => {
    assert.deepEqual(metadata({ ...dune, pages: 1412, edition: 2, type: 'ebook', isbn: '9780441172719', year: 1965 }), [
      ['Pages', '1,412'],
      ['Edition', '2'],
      ['Language', 'English'],
      ['Publisher', 'Chilton Books'],
      ['Type', 'Ebook'],
      ['ISBN', '9780441172719'],
      ['Year', '1965'],
    ])
  })
})
