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
import { readFileSync } from 'node:fs'
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

    // A pace that isn't exact in binary doesn't add a day: 21 ÷ 0.7 is exactly 30
    // (the float quotient is 30.000000000000004), and 42 ÷ 0.7 is 60, so months.
    assert.equal(paceResult(21, '0.7', TODAY), 'About 30 days · 27 November')
    assert.equal(paceResult(42, '0.7', TODAY), 'About 2 months · December 2026')

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

  // The same table backend/tests/test_pace_calculator.py reads: the line's days
  // must be the server's exact days left, float error or not.
  it('[P2] PAC-UNIT-002 rounds the days as the server does for the shared cases', () => {
    const { cases } = JSON.parse(readFileSync(new URL('./pace.cases.json', import.meta.url), 'utf8')) as {
      cases: { pagesLeft: number; pace: string; days: number }[]
    }
    assert.ok(cases.length > 0, 'the shared table has no cases')
    for (const { pagesLeft, pace, days } of cases) {
      const line = paceResult(pagesLeft, pace, TODAY)
      const prefix = `About ${days} ${days === 1 ? 'day' : 'days'} · `
      assert.ok(line?.startsWith(prefix), `${pagesLeft} @ ${pace}: ${line} should start with "${prefix}"`)
    }
  })

  // Epic 6 retro item 55 (E6-R1): while the field holds the prefill, the line uses
  // the unrounded Measured pace, so it agrees with Home's days left. The server's
  // days come from the shared table's prefillCases, which
  // backend/tests/test_pace_calculator.py checks against days_left; the pace
  // arrives as the float the view serializes, float(Fraction).
  it('[P1] E6-R1 with the untouched prefill the days are the server days left for the shared cases', () => {
    const { prefillCases } = JSON.parse(readFileSync(new URL('./pace.cases.json', import.meta.url), 'utf8')) as {
      prefillCases: { pagesLeft: number; measuredPace: string; days: number }[]
    }
    assert.ok(prefillCases.length > 0, 'the shared table has no prefill cases')
    for (const { pagesLeft, measuredPace, days } of prefillCases) {
      const [num, den] = measuredPace.split('/').map(Number)
      const pace = num / den
      const line = paceResult(pagesLeft, pacePrefill(pace), TODAY, pace)
      const prefix = `About ${days} ${days === 1 ? 'day' : 'days'} · `
      assert.ok(line?.startsWith(prefix), `${pagesLeft} @ ${measuredPace}: ${line} should start with "${prefix}"`)
    }
  })

  // The same rule against the exact-fraction formula, max(1, ceil(pagesLeft × den ÷ num)),
  // for every pages left under 60 days at a few fractional paces.
  it('[P1] E6-R1 with the untouched prefill the days follow the exact-fraction formula for every pages left', () => {
    const paces: [number, number][] = [
      [100, 3],
      [400, 7],
      [29, 20],
      [20, 3],
      [1, 3],
      [41, 2],
    ]
    for (const [num, den] of paces) {
      const measuredPace = num / den
      const prefill = pacePrefill(measuredPace)
      for (let pagesLeft = 1; pagesLeft <= 1000; pagesLeft++) {
        const days = Math.max(1, Math.ceil((pagesLeft * den) / num))
        if (days >= 60) break
        const prefix = `About ${days} ${days === 1 ? 'day' : 'days'} · `
        const line = paceResult(pagesLeft, prefill, TODAY, measuredPace)
        assert.ok(
          line?.startsWith(prefix),
          `${pagesLeft} @ ${num}/${den} ("${prefill}"): ${line} should start with "${prefix}"`,
        )
      }
    }

    // The retro's cases: 300 and 400 pages left at 100/3 are Home's 9 and 12 days, not the 10 and
    // 13 of "33.3"; 60 left at 26/25 is Home's 58 days, where "1" crosses into months.
    assert.equal(paceResult(400, '33.3', TODAY, 100 / 3), 'About 12 days · 9 November')
    assert.equal(paceResult(60, '1', TODAY, 26 / 25), 'About 58 days · 25 December')
    assert.equal(paceResult(60, '1', TODAY), 'About 2 months · December 2026')
    assert.equal(paceResult(300, '33.3', TODAY, 100 / 3), 'About 9 days · 6 November')
    // Typed by hand, any other text is the typed pace, and without a Measured pace too.
    assert.equal(paceResult(300, '33.30', TODAY, 100 / 3), 'About 10 days · 7 November')
    assert.equal(paceResult(300, '33.4', TODAY, 100 / 3), 'About 9 days · 6 November')
    assert.equal(paceResult(300, '33.3', TODAY), 'About 10 days · 7 November')
    assert.equal(paceResult(300, '33.3', TODAY, null), 'About 10 days · 7 November')
    // Accepted with the text rule: a pace typed just above the prefill can read a day later,
    // since "33.31" is its own number and the prefill stands for 33.33…
    assert.equal(paceResult(300, '33.31', TODAY, 100 / 3), 'About 10 days · 7 November')
    // After a refetch changes Measured pace, the old text is no longer its prefill
    // ("33.4" for 33.36), so the line uses the number the field shows.
    assert.equal(paceResult(300, '33.3', TODAY, 33.36), 'About 10 days · 7 November')
    // Surrounding whitespace still counts as the prefill.
    assert.equal(paceResult(300, ' 33.3 ', TODAY, 100 / 3), 'About 9 days · 6 November')
    // A prefill of "0" is no result, as before.
    assert.equal(paceResult(300, pacePrefill(0.04), TODAY, 0.04), null)
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
