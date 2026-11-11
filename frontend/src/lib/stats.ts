// The Stats page's client side (AD-6): the range picker's presets, resolved
// from the browser's local today, Custom's ordering, and the copy. The server
// owns the numbers; nothing here counts or sums.

import type { DateRange, StatsRange } from '../api/index.ts'
import { localIsoDate } from './today.ts'

export type RangePreset = 'thisMonth' | 'thisYear' | 'lastYear' | 'allTime' | 'custom'

/** The range picker's buttons, in order. */
export const RANGE_PRESETS: readonly { value: RangePreset; label: string }[] = [
  { value: 'thisMonth', label: 'This month' },
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'allTime', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

export const DEFAULT_PRESET: Exclude<RangePreset, 'custom'> = 'thisYear'

/**
 * The range a preset stands for on the local day of `now` (never UTC):
 * This month is the 1st to today, This year 1 January to today, Last year the
 * whole previous year, and All time no dates.
 */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, now: Date): StatsRange {
  const year = now.getFullYear()
  const today = localIsoDate(now)
  switch (preset) {
    case 'thisMonth':
      return { from: localIsoDate(new Date(year, now.getMonth(), 1)), to: today }
    case 'thisYear':
      return { from: `${year}-01-01`, to: today }
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
    case 'allTime':
      return 'all'
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Whether `value` is a complete `YYYY-MM-DD` date, as a valid date input reports it. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day
}

/** Custom's two fields as a range, the earlier date first; `null` while either is empty or invalid. */
export function orderedRange(a: string, b: string): DateRange | null {
  if (!isIsoDate(a) || !isIsoDate(b)) return null
  // YYYY-MM-DD sorts as text.
  return a <= b ? { from: a, to: b } : { from: b, to: a }
}

const counts = new Intl.NumberFormat('en-GB')

/** A count with en-GB grouping: "1,010". */
export function formatCount(n: number): string {
  return counts.format(n)
}

/** The status line for a shown range: "2 books, 610 pages.", "1 book, 1 page.". */
export function statsLine(books: number, pages: number): string {
  const bookWord = books === 1 ? 'book' : 'books'
  const pageWord = pages === 1 ? 'page' : 'pages'
  return `${formatCount(books)} ${bookWord}, ${formatCount(pages)} ${pageWord}.`
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** A bucket's `YYYY-MM` or `YYYY` period split into its year and, for a month, its 0-based index. */
function splitPeriod(period: string): { year: string; month: number | null } {
  const [year, month] = period.split('-')
  return { year, month: month === undefined ? null : Number(month) - 1 }
}

/** A bucket's period as the table reads it: "January 2026" for a month, "2026" for a year. */
export function periodName(period: string): string {
  const { year, month } = splitPeriod(period)
  return month === null ? year : `${MONTH_NAMES[month]} ${year}`
}

/**
 * A bucket's period under its bar: "Jan" for a month, with the year on a second
 * line on the first bar and on each January; "2026" for a year.
 */
export function barLines(period: string, first: boolean): string[] {
  const { year, month } = splitPeriod(period)
  if (month === null) return [year]
  const short = MONTH_NAMES[month].slice(0, 3)
  return first || month === 0 ? [short, year] : [short]
}

/** A bar's fill as a share of its track, 0..1: `pages ÷ max`, or 0 when `max` is 0. */
export function barShare(pages: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, pages / max))
}

export const NO_BOOKS_IN_RANGE = 'No books finished in this range.'
export const NO_BOOKS_YET = 'No books finished yet.'
