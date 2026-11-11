// Story 6.3 See what I finished in any period (AC-3, AC-7, R-07): the range
// presets resolved from the browser's local today, Custom's ordering, and the
// status line's copy. Local wall-clock times, so the cases hold in any TZ
// (check:e2e pins Europe/Madrid).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatCount, isIsoDate, orderedRange, presetRange, statsLine } from './stats.ts'

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
