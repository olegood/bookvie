// The pace calculator's arithmetic and line (AD-6, EXPERIENCE.md → Pace
// calculator): the server supplies pages left and Measured pace, the client
// owns the days, the finish date and the copy. "Today" is the browser's (AD-20).

import { MONTHS } from './today.ts'

/** A plain decimal: "30", "12.5", "12.", ".5". No sign, exponent or comma. */
const DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/

/** Average days in a month over the Gregorian 400-year cycle. */
const DAYS_PER_MONTH = 30.4375

/**
 * The calculator's line for `typed` pages a day, or `null` for no result.
 *
 * days = max(1, ceil(pagesLeft ÷ pace)), the server's days-left rounding;
 * the finish date is today's local date plus days, by calendar day. Under 60
 * days: "About N days · D Month" (the year added when it isn't today's year).
 * Otherwise months = round(days ÷ 30.4375): "About N months · Month YYYY",
 * and from 24 months years = round(months ÷ 12): "About N years · Month YYYY".
 * `null` for anything that isn't a positive number, with nothing left, or when
 * the finish date is out of range.
 */
export function paceResult(pagesLeft: number, typed: string, today: Date): string | null {
  const text = typed.trim()
  if (!DECIMAL.test(text) || pagesLeft <= 0) return null
  const pace = Number(text)
  if (!Number.isFinite(pace) || pace <= 0) return null
  const days = Math.max(1, Math.ceil(pagesLeft / pace))
  const finish = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days)
  if (Number.isNaN(finish.getTime())) return null
  const month = MONTHS[finish.getMonth()]
  if (days < 60) {
    const year = finish.getFullYear() === today.getFullYear() ? '' : ` ${finish.getFullYear()}`
    return `About ${days} ${days === 1 ? 'day' : 'days'} · ${finish.getDate()} ${month}${year}`
  }
  const months = Math.round(days / DAYS_PER_MONTH)
  const when = `${month} ${finish.getFullYear()}`
  if (months < 24) return `About ${months} months · ${when}`
  return `About ${Math.round(months / 12)} years · ${when}`
}

/** The field's prefill: Measured pace to one decimal, without a trailing ".0"; "" with none. */
export function pacePrefill(measuredPace: number | null): string {
  if (measuredPace === null) return ''
  // Correct the float error first, so a half rounds up: 1.45 × 10 is 14.499….
  return String(Math.round(Number((measuredPace * 10).toPrecision(12))) / 10)
}
