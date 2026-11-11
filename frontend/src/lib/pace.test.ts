// Story 6.1 Quick pace calculator, ATDD red phase (AC-6, PAC-UNIT-002, R-07,
// R-10): the duration formatter at its edges, with a fixed "today" as the fake
// clock. Skipped until `pace.ts` exists; the module is loaded inside the test so
// `tsc` and the runner pass without it. Switch to a static import once it lands.
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

type Pace = {
  /** The calculator's line for `typed` in the field, or `null` for no result (AC-4). */
  paceResult: (pagesLeft: number, typed: string, today: Date) => string | null
}
const MODULE: string = './pace.ts'

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

  it.skip('[P1] AC-6 formats the duration and date at 59/60 days, 23/24 months, a pace above the pages left and a date in next year', async () => {
    const { paceResult } = (await import(MODULE)) as Pace

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
})
