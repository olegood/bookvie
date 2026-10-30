// Story 1.6 date helper, ATDD red phase (UX-DR10): relative dates count local
// calendar days, not 24-hour spans. Skipped until `relativeDay.ts` exists;
// the module is loaded inside the test so `tsc` and the runner pass without it.
// Switch to a static import once it lands.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

type RelativeDay = { relativeDay: (then: Date, now: Date) => string }
const MODULE: string = './relativeDay.ts'

// Local wall-clock times, so the cases hold in any TZ (check:e2e pins Europe/Madrid).
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute)

describe('relativeDay', () => {
  it.skip('[P1] AC-12 counts local calendar days: today, yesterday, N days ago, future, over a year', async () => {
    const { relativeDay } = (await import(MODULE)) as RelativeDay

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
