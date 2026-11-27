// Story 6.3 See what I finished in any period (AC-3, AC-7, R-07): the range
// presets resolved from the browser's local today, Custom's ordering, and the
// status line's copy. Local wall-clock times, so the cases hold in any TZ
// (check:e2e pins Europe/Madrid).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  addressNeedsFallback,
  barLines,
  barShare,
  finishedHeading,
  finishMeta,
  finishRowName,
  formatCount,
  isIsoDate,
  orderedRange,
  parseStatsAddress,
  periodName,
  presetRange,
  selectionKey,
  selectionRange,
  statsLine,
  statsSearch,
  type StatsSelection,
} from './stats.ts'

const at = (year: number, month: number, day: number, hour = 10, minute = 0) =>
  new Date(year, month - 1, day, hour, minute)

describe('presetRange', () => {
  it('resolves every preset on an ordinary day', () => {
    const now = at(2026, 10, 28)
    assert.deepEqual(presetRange('thisMonth', now), { from: '2026-10-01', to: '2026-10-28' })
    assert.deepEqual(presetRange('thisYear', now), { from: '2026-01-01', to: '2026-10-28' })
    assert.deepEqual(presetRange('lastYear', now), { from: '2025-01-01', to: '2025-12-31' })
    assert.equal(presetRange('allTime', now), 'all')
  })

  it('uses the local date at 00:30 on New Year (still 31 December in UTC east of Greenwich)', () => {
    const now = at(2027, 1, 1, 0, 30)
    assert.deepEqual(presetRange('thisYear', now), { from: '2027-01-01', to: '2027-01-01' })
    assert.deepEqual(presetRange('thisMonth', now), { from: '2027-01-01', to: '2027-01-01' })
    assert.deepEqual(presetRange('lastYear', now), { from: '2026-01-01', to: '2026-12-31' })
  })

  it('on 1 January at noon, This year is that one day', () => {
    assert.deepEqual(presetRange('thisYear', at(2026, 1, 1, 12)), { from: '2026-01-01', to: '2026-01-01' })
  })

  it('on 31 December late in the evening, This year is the whole year', () => {
    const now = at(2026, 12, 31, 23, 59)
    assert.deepEqual(presetRange('thisYear', now), { from: '2026-01-01', to: '2026-12-31' })
    assert.deepEqual(presetRange('thisMonth', now), { from: '2026-12-01', to: '2026-12-31' })
  })

  it('on the 1st of a month, This month is that one day', () => {
    assert.deepEqual(presetRange('thisMonth', at(2026, 3, 1, 0, 5)), { from: '2026-03-01', to: '2026-03-01' })
  })
})

describe('orderedRange', () => {
  it('puts the earlier date first', () => {
    assert.deepEqual(orderedRange('2026-10-20', '2026-10-01'), { from: '2026-10-01', to: '2026-10-20' })
    assert.deepEqual(orderedRange('2026-10-01', '2026-10-20'), { from: '2026-10-01', to: '2026-10-20' })
    assert.deepEqual(orderedRange('2026-10-01', '2026-10-01'), { from: '2026-10-01', to: '2026-10-01' })
  })

  it('is null while either field is empty or invalid', () => {
    assert.equal(orderedRange('', '2026-10-01'), null)
    assert.equal(orderedRange('2026-10-01', ''), null)
    assert.equal(orderedRange('2026-02-30', '2026-10-01'), null)
    assert.equal(orderedRange('2026-13-01', '2026-10-01'), null)
    assert.equal(isIsoDate('2026-1-01'), false)
  })
})

describe('isIsoDate', () => {
  it('accepts 29 February in a leap year only', () => {
    assert.equal(isIsoDate('2028-02-29'), true)
    assert.equal(isIsoDate('2026-02-29'), false)
  })
})

describe('statsLine and formatCount', () => {
  it('uses the plural', () => {
    assert.equal(statsLine(2, 610), '2 books, 610 pages.')
    assert.equal(statsLine(0, 0), '0 books, 0 pages.')
  })

  it('uses the singular for 1', () => {
    assert.equal(statsLine(1, 271), '1 book, 271 pages.')
    assert.equal(statsLine(3, 1), '3 books, 1 page.')
  })

  it('groups with en-GB commas', () => {
    assert.equal(formatCount(1010), '1,010')
    assert.equal(formatCount(1234567), '1,234,567')
    assert.equal(statsLine(3, 1010), '3 books, 1,010 pages.')
  })
})

// Story 6.4 See my reading month by month: the bars' labels and heights. The
// server sends the buckets; the client only names their periods and sizes the fills.

describe('periodName', () => {
  it('names a month with its year', () => {
    assert.equal(periodName('2026-01'), 'January 2026')
    assert.equal(periodName('2025-12'), 'December 2025')
  })

  it('names a year as the year', () => {
    assert.equal(periodName('2026'), '2026')
  })
})

describe('barLines', () => {
  it('reads a month as its short name', () => {
    assert.deepEqual(barLines('2025-12', false), ['Dec'])
    assert.deepEqual(barLines('2026-05', false), ['May'])
  })

  it('adds the year on the first bar and on each January', () => {
    assert.deepEqual(barLines('2025-12', true), ['Dec', '2025'])
    assert.deepEqual(barLines('2026-01', false), ['Jan', '2026'])
    assert.deepEqual(barLines('2026-01', true), ['Jan', '2026'])
  })

  it('reads a year as the year alone', () => {
    assert.deepEqual(barLines('2026', true), ['2026'])
    assert.deepEqual(barLines('2025', false), ['2025'])
  })
})

describe('barShare', () => {
  it('is pages over the largest pages', () => {
    assert.equal(barShare(610, 610), 1)
    assert.equal(barShare(400, 800), 0.5)
    assert.equal(barShare(0, 610), 0)
  })

  it('is 0 when the largest is 0 (an empty range)', () => {
    assert.equal(barShare(0, 0), 0)
  })
})

// Story 17.1 See the Books finished in a range (AC-6, AC-10, AC-14): the Stats
// address, the finished list's heading and the row's name.

const custom = (from: string, to: string): StatsSelection => ({ preset: 'custom', range: { from, to } })
const address = (search: string) => new URLSearchParams(search)

describe("isIsoDate and the server's dates", () => {
  it('refuses year 0000, which the server refuses, and a day the month lacks', () => {
    assert.equal(isIsoDate('0000-01-01'), false)
    assert.equal(isIsoDate('0001-01-01'), true)
    assert.equal(isIsoDate('2026-02-30'), false)
    assert.equal(isIsoDate('2026-13-01'), false)
    assert.equal(isIsoDate('2026-04-31'), false)
    assert.equal(isIsoDate('1900-02-29'), false)
    assert.equal(isIsoDate('2000-02-29'), true)
  })
})

describe('parseStatsAddress', () => {
  it('reads each preset by name', () => {
    for (const preset of ['thisMonth', 'thisYear', 'lastYear', 'allTime'] as const) {
      assert.deepEqual(parseStatsAddress(address(`range=${preset}`)), { preset })
    }
  })

  it('reads Custom with two valid dates, in order', () => {
    assert.deepEqual(
      parseStatsAddress(address('range=custom&from=2026-02-01&to=2026-04-15')),
      custom('2026-02-01', '2026-04-15'),
    )
    assert.deepEqual(
      parseStatsAddress(address('range=custom&from=2026-04-15&to=2026-02-01')),
      custom('2026-02-01', '2026-04-15'),
    )
  })

  it('falls back to This year for a plain /stats, an unknown range or a Custom without two valid dates', () => {
    for (const search of [
      '',
      'range=nextWeek',
      'range=custom',
      'range=custom&from=2026-02-01',
      'range=custom&from=0000-01-01&to=2026-04-15',
      'range=custom&from=2026-02-30&to=2026-04-15',
      'from=2026-02-01&to=2026-04-15',
    ]) {
      assert.deepEqual(parseStatsAddress(address(search)), { preset: 'thisYear' }, search)
    }
  })
})

describe('statsSearch', () => {
  it('writes the whole search, a preset by name or Custom with its dates', () => {
    assert.equal(statsSearch({ preset: 'lastYear' }), 'range=lastYear')
    assert.equal(statsSearch(custom('2026-02-01', '2026-04-15')), 'range=custom&from=2026-02-01&to=2026-04-15')
  })
})

describe('addressNeedsFallback', () => {
  it('leaves a plain /stats and a canonical address alone', () => {
    assert.equal(addressNeedsFallback(address('')), false)
    assert.equal(addressNeedsFallback(address('range=lastYear')), false)
    assert.equal(addressNeedsFallback(address('range=custom&from=2026-02-01&to=2026-04-15')), false)
    // Another key (Story 17.2's period) isn't the range's to judge.
    assert.equal(addressNeedsFallback(address('range=thisYear&period=2026-03')), false)
  })

  it('replaces a bad, reversed, half or doubled range', () => {
    for (const search of [
      'range=nextWeek',
      'range=custom&from=2026-04-15&to=2026-02-01',
      'range=custom&from=2026-02-01',
      'range=lastYear&from=2026-02-01',
      'range=lastYear&range=thisYear',
      'from=2026-02-01',
    ]) {
      assert.equal(addressNeedsFallback(address(search)), true, search)
    }
  })
})

describe('selectionRange and selectionKey', () => {
  it("resolves a preset on the local day and keeps Custom's dates", () => {
    assert.deepEqual(selectionRange({ preset: 'thisYear' }, at(2027, 1, 1)), { from: '2027-01-01', to: '2027-01-01' })
    assert.deepEqual(selectionRange(custom('2026-02-01', '2026-04-15'), at(2027, 1, 1)), {
      from: '2026-02-01',
      to: '2026-04-15',
    })
    assert.equal(selectionRange({ preset: 'allTime' }, at(2026, 10, 28)), 'all')
  })

  it('is the choice, not the day', () => {
    assert.equal(selectionKey({ preset: 'thisYear' }), 'thisYear')
    assert.equal(selectionKey(custom('2026-02-01', '2026-04-15')), 'custom:2026-02-01:2026-04-15')
  })
})

describe('finishedHeading', () => {
  it('names each preset', () => {
    assert.equal(finishedHeading({ preset: 'thisMonth' }), 'Finished this month')
    assert.equal(finishedHeading({ preset: 'thisYear' }), 'Finished this year')
    assert.equal(finishedHeading({ preset: 'lastYear' }), 'Finished last year')
    assert.equal(finishedHeading({ preset: 'allTime' }), 'Finished, all time')
  })

  it('names a Custom range in each form', () => {
    assert.equal(finishedHeading(custom('2026-02-01', '2026-04-15')), 'Finished 1 February – 15 April 2026')
    assert.equal(finishedHeading(custom('2025-12-01', '2026-01-15')), 'Finished 1 December 2025 – 15 January 2026')
    assert.equal(finishedHeading(custom('2026-03-03', '2026-03-17')), 'Finished 3 – 17 March 2026')
    assert.equal(finishedHeading(custom('2026-03-14', '2026-03-14')), 'Finished 14 March 2026')
  })
})

describe('finishRowName and finishMeta', () => {
  const ddia = {
    title: 'Designing Data-Intensive Applications',
    firstAuthor: 'Martin Kleppmann',
    authorCount: 1,
    finishDate: '2026-03-14',
    finishedPages: 611,
    rating: 4,
  }

  it('reads title, author, date, pages and stars in one piece', () => {
    assert.equal(
      finishRowName(ddia),
      'Designing Data-Intensive Applications, Martin Kleppmann, finished 14 Mar 2026, 611 pages, 4 stars',
    )
  })

  it('ends at the pages when unrated', () => {
    assert.equal(
      finishRowName({ ...ddia, rating: null }),
      'Designing Data-Intensive Applications, Martin Kleppmann, finished 14 Mar 2026, 611 pages',
    )
  })

  it('writes the author part as the catalog does, and leaves it out with no author', () => {
    assert.equal(
      finishRowName({ ...ddia, title: 'X', authorCount: 2 }),
      'X, Martin Kleppmann and 1 other, finished 14 Mar 2026, 611 pages, 4 stars',
    )
    assert.equal(
      finishRowName({ ...ddia, title: 'X', authorCount: 3 }),
      'X, Martin Kleppmann and 2 others, finished 14 Mar 2026, 611 pages, 4 stars',
    )
    assert.equal(
      finishRowName({ ...ddia, title: 'X', firstAuthor: '', authorCount: 0 }),
      'X, finished 14 Mar 2026, 611 pages, 4 stars',
    )
  })

  it('uses the singular for 1 page and 1 star, and groups pages', () => {
    assert.equal(
      finishRowName({ ...ddia, title: 'X', finishedPages: 1, rating: 1 }),
      'X, Martin Kleppmann, finished 14 Mar 2026, 1 page, 1 star',
    )
    assert.equal(finishMeta({ finishDate: '2026-03-14', finishedPages: 611 }), '14 Mar 2026 · 611 pages')
    assert.equal(finishMeta({ finishDate: '2026-10-12', finishedPages: 1 }), '12 Oct 2026 · 1 page')
    assert.equal(finishMeta({ finishDate: '2026-05-05', finishedPages: 1204 }), '5 May 2026 · 1,204 pages')
  })
})
