// Story 1.6 date helper (UX-DR10): relative dates count local calendar days,
// not 24-hour spans.

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { relativeDay } from './relativeDay.ts'

// Local wall-clock times, so the cases hold in any TZ (check:e2e pins Europe/Madrid).
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute)

describe('relativeDay', () => {
  it('[P1] AC-12 counts local calendar days: today, yesterday, N days ago, future, over a year', () => {
    assert.equal(relativeDay(at(2026, 10, 29, 23, 59), at(2026, 10, 30, 0, 1)), 'yesterday')

    assert.equal(relativeDay(at(2026, 10, 30, 0, 1), at(2026, 10, 30, 23, 59)), 'today')
    assert.equal(relativeDay(at(2026, 10, 28, 23, 0), at(2026, 10, 30, 1, 0)), '2 days ago')
    // Across the DST change on 25 October 2026: still two calendar days.
    assert.equal(relativeDay(at(2026, 10, 24, 23, 30), at(2026, 10, 26, 9, 0)), '2 days ago')
    assert.equal(relativeDay(at(2026, 11, 2), at(2026, 10, 30)), 'today')
    assert.equal(relativeDay(at(2025, 10, 30), at(2026, 10, 30)), '365 days ago')
    assert.equal(relativeDay(at(2025, 10, 29), at(2026, 10, 30)), 'over a year ago')
  })
})

// Node re-reads TZ on assignment, so each case builds its dates in that zone.
// Madrid and New York change clocks in March and October/November, Chatham
// (+12:45/+13:45) in April and September, Kolkata never.
describe('relativeDay across time zones', () => {
  const hostZone = process.env.TZ
  afterEach(() => {
    if (hostZone === undefined) delete process.env.TZ
    else process.env.TZ = hostZone
  })

  for (const zone of ['Europe/Madrid', 'America/New_York', 'Pacific/Chatham', 'Asia/Kolkata']) {
    it(`[P2] AC-12 counts calendar days over month, year, leap-day and DST boundaries in ${zone}`, () => {
      process.env.TZ = zone

      assert.equal(relativeDay(at(2026, 12, 31, 23, 59), at(2027, 1, 1, 0, 1)), 'yesterday')
      assert.equal(relativeDay(at(2026, 2, 28, 23, 0), at(2026, 3, 1, 0, 30)), 'yesterday')
      assert.equal(relativeDay(at(2028, 2, 28), at(2028, 3, 1)), '2 days ago')
      // 2027-03-02 to 2028-03-01 is 365 days; a day earlier spans 29 Feb 2028.
      assert.equal(relativeDay(at(2027, 3, 2), at(2028, 3, 1)), '365 days ago')
      assert.equal(relativeDay(at(2027, 3, 1), at(2028, 3, 1)), 'over a year ago')

      // Short and long days: each pair is two calendar days apart.
      for (const [then, now] of [
        [at(2026, 3, 7, 23, 30), at(2026, 3, 9, 0, 30)],
        [at(2026, 3, 28, 23, 30), at(2026, 3, 30, 0, 30)],
        [at(2026, 4, 4, 23, 30), at(2026, 4, 6, 0, 30)],
        [at(2026, 9, 26, 23, 30), at(2026, 9, 28, 0, 30)],
        [at(2026, 10, 31, 23, 30), at(2026, 11, 2, 0, 30)],
      ]) {
        assert.equal(relativeDay(then, now), '2 days ago', `${then.toString()} -> ${now.toString()}`)
      }
    })
  }
})
