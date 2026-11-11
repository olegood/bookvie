// Story 6.1 Quick pace calculator (AC-6, PAC-UNIT-002, R-07, R-10): the
// duration formatter at its edges, with a fixed "today" as the fake clock.
//
// The rule (AD-6, EXPERIENCE.md → Pace calculator, decided with Oleg on
// 2026-11-11): days = max(1, ceil(pages left ÷ pages/day)), the same rounding
// and minimum as the server's days left; finish date = today + days, by local
// calendar day. Under 60 days: "About N days · D Month", the year added only
// when it isn't today's year, and "About 1 day" at 1. From 60 days: months =
// round(days ÷ 30.4375), "About N months · Month YYYY"; from 24 months, years =
// round(months ÷ 12), "About N years · Month YYYY".

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { pacePrefill, paceResult } from './pace.ts'

// Local wall-clock times, so the cases hold in any TZ (check:e2e pins Europe/Madrid).
const at = (year: number, month: number, day: number, hour = 10, minute = 0) =>
  new Date(year, month - 1, day, hour, minute)
const TODAY = at(2026, 10, 28) // the e2e fake today

describe('paceResult', () => {
  const hostZone = process.env.TZ
  afterEach(() => {
    if (hostZone === undefined) delete process.env.TZ
    else process.env.TZ = hostZone
  })

  it('[P1] AC-6 formats the duration and date at 59/60 days, 23/24 months, a pace above the pages left and a date in next year', () => {
    // 59 days stays in days; 60 becomes round(1.97) = 2 months.
    assert.equal(paceResult(59, '1', TODAY), 'About 59 days · 26 December')
    assert.equal(paceResult(60, '1', TODAY), 'About 2 months · December 2026')

    // 715 days is round(23.49) = 23 months; 716 is round(23.52) = 24, so years: round(24 ÷ 12) = 2.
    assert.equal(paceResult(715, '1', TODAY), 'About 23 months · October 2028')
    assert.equal(paceResult(716, '1', TODAY), 'About 2 years · October 2028')
    assert.equal(paceResult(1000, '1', TODAY), 'About 3 years · July 2029')

    // A pace above the pages left is still at least 1 day.
    assert.equal(paceResult(10, '30', TODAY), 'About 1 day · 29 October')

    // A day-and-month date in next year gains the year.
    assert.equal(paceResult(20, '1', at(2026, 12, 20)), 'About 20 days · 9 January 2027')

    // Decimal paces round the days up, as the server's days left.
    assert.equal(paceResult(412, '12.5', TODAY), 'About 33 days · 30 November')
    assert.equal(paceResult(400, '20', TODAY), 'About 20 days · 17 November')

    // Today + days by calendar day, not 24-hour steps: late on 20 March, across
    // the spring change on 28 March 2027, ten days later is 30 March.
    process.env.TZ = 'Europe/Madrid'
    assert.equal(paceResult(10, '1', new Date(2027, 2, 20, 23, 30)), 'About 10 days · 30 March')
  })

  it('[P2] AC-4 gives no result for zero, negative, non-numeric, empty or comma input, or nothing left', () => {
    for (const typed of ['0', '-5', 'abc', '', '   ', '12,5', '1e3', '0.0', '.', '+5', 'Infinity']) {
      assert.equal(paceResult(412, typed, TODAY), null, JSON.stringify(typed))
    }
    assert.equal(paceResult(0, '20', TODAY), null)
    assert.equal(paceResult(-3, '20', TODAY), null)
    // An absurdly small pace puts the finish date out of range: no result.
    assert.equal(paceResult(412, '0.0000000001', TODAY), null)
  })

  it('[P2] AC-3 trims whitespace and accepts a bare decimal point', () => {
    assert.equal(paceResult(412, ' 30 ', TODAY), paceResult(412, '30', TODAY))
    assert.equal(paceResult(412, ' 30 ', TODAY), 'About 14 days · 11 November')
    assert.equal(paceResult(10, '.5', TODAY), 'About 20 days · 17 November')
    assert.equal(paceResult(10, '5.', TODAY), 'About 2 days · 30 October')
  })
})

describe('pacePrefill', () => {
  it('[P2] AC-2 rounds Measured pace to one decimal and drops a trailing ".0"', () => {
    assert.equal(pacePrefill(null), '')
    assert.equal(pacePrefill(20), '20')
    assert.equal(pacePrefill(100 / 3), '33.3')
    assert.equal(pacePrefill(17.333), '17.3')
    assert.equal(pacePrefill(0.04), '0')
    assert.equal(pacePrefill(29 / 20), '1.5')
    assert.equal(paceResult(412, pacePrefill(0.04), TODAY), null)
  })
})
