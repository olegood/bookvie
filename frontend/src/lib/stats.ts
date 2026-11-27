// The Stats page's client side (AD-6): the range picker's presets, resolved
// from the browser's local today, Custom's ordering, the Stats address, and the
// copy. The server owns the numbers and the finishes' order; nothing here
// counts, sums or sorts.

import type { DateRange, StatsFinish, StatsRange } from '../api/index.ts'
import { shortDate, starsLabel } from './bookDetail.ts'
import { authorPart } from './catalog.ts'
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

/** The days in `month` (1–12) of `year`, by the Gregorian calendar the server's `date` uses. */
function daysIn(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

/**
 * Whether `value` is a complete `YYYY-MM-DD` date, as a valid date input
 * reports it, that the server's `IsoDate` accepts: year 0000 is refused, since
 * the server's dates start at year 1.
 */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month)
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

// --- The Stats address and the finished list (Story 17.1) -----------------------

export type PresetName = Exclude<RangePreset, 'custom'>

/** A range as the person chose it: a preset by name (so This year next January is the new year), or Custom's dates. */
export type StatsSelection = { preset: PresetName } | { preset: 'custom'; range: DateRange }

const PRESET_NAMES: readonly string[] = ['thisMonth', 'thisYear', 'lastYear', 'allTime']

/** The address keys the range owns; any other key (Story 17.2's `period`) is left alone. */
const RANGE_KEYS = ['range', 'from', 'to'] as const

/**
 * The selection the Stats address names: `range` a preset's name, or `custom`
 * with `from` and `to` two valid dates, put in order. Anything else, and a
 * plain `/stats`, is This year.
 */
export function parseStatsAddress(params: URLSearchParams): StatsSelection {
  const range = params.get('range')
  if (range !== null && PRESET_NAMES.includes(range)) return { preset: range as PresetName }
  if (range === 'custom') {
    const ordered = orderedRange(params.get('from') ?? '', params.get('to') ?? '')
    if (ordered !== null) return { preset: 'custom', range: ordered }
  }
  return { preset: DEFAULT_PRESET }
}

/** The whole Stats search for `selection`, without the `?`: `range=lastYear`, `range=custom&from=…&to=…`. */
export function statsSearch(selection: StatsSelection): string {
  if (selection.preset !== 'custom') return `range=${selection.preset}`
  return `range=custom&from=${selection.range.from}&to=${selection.range.to}`
}

/**
 * Whether the address must be replaced on arrival so it names what the page
 * shows: its `range`, `from` and `to` differ from `statsSearch` of what they
 * parse to. A plain `/stats` (none of the three) is left as it is.
 */
export function addressNeedsFallback(params: URLSearchParams): boolean {
  if (RANGE_KEYS.every((key) => !params.has(key))) return false
  const canonical = new URLSearchParams(statsSearch(parseStatsAddress(params)))
  return RANGE_KEYS.some((key) => params.getAll(key).join('\n') !== canonical.getAll(key).join('\n'))
}

/** The dates `selection` stands for on the local day of `now`. */
export function selectionRange(selection: StatsSelection, now: Date): StatsRange {
  return selection.preset === 'custom' ? selection.range : presetRange(selection.preset, now)
}

/** What the person chose, independent of today: the announcement follows a change of this. */
export function selectionKey(selection: StatsSelection): string {
  return selection.preset === 'custom' ? `custom:${selection.range.from}:${selection.range.to}` : selection.preset
}

const PRESET_HEADINGS: Record<PresetName, string> = {
  thisMonth: 'Finished this month',
  thisYear: 'Finished this year',
  lastYear: 'Finished last year',
  allTime: 'Finished, all time',
}

/** A local `YYYY-MM-DD` date's parts, the month 0-based. */
function dayParts(day: string): { year: number; month: number; date: number } {
  const [year, month, date] = day.split('-').map(Number)
  return { year, month: month - 1, date }
}

/**
 * The finished list's heading: "Finished this year" for a preset; for Custom
 * "Finished 1 February – 15 April 2026", "Finished 1 December 2025 – 15 January
 * 2026" across a year end, "Finished 3 – 17 March 2026" inside one month, and
 * "Finished 14 March 2026" for a single day.
 */
export function finishedHeading(selection: StatsSelection): string {
  if (selection.preset !== 'custom') return PRESET_HEADINGS[selection.preset]
  const { from, to } = selection.range
  const a = dayParts(from)
  const b = dayParts(to)
  const end = `${b.date} ${MONTH_NAMES[b.month]} ${b.year}`
  if (from === to) return `Finished ${end}`
  if (a.year === b.year && a.month === b.month) return `Finished ${a.date} – ${end}`
  if (a.year === b.year) return `Finished ${a.date} ${MONTH_NAMES[a.month]} – ${end}`
  return `Finished ${a.date} ${MONTH_NAMES[a.month]} ${a.year} – ${end}`
}

/** A finish's pages: "611 pages", "1 page", "1,204 pages". */
function pagesWords(pages: number): string {
  return `${formatCount(pages)} ${pages === 1 ? 'page' : 'pages'}`
}

/** The date and pages of a row's end-column line, "14 Mar 2026 · 611 pages"; the row shows "Finished" before it. */
export function finishMeta(finish: Pick<StatsFinish, 'finishDate' | 'finishedPages'>): string {
  return `${shortDate(finish.finishDate)} · ${pagesWords(finish.finishedPages)}`
}

/** A row's author line as the catalog writes it ("Kent Beck and 2 others"); `''` with no author. */
export function finishAuthor(finish: Pick<StatsFinish, 'firstAuthor' | 'authorCount'>): string {
  return authorPart(finish.firstAuthor, finish.authorCount)
}

/**
 * A row link's name, read in one piece: "Title, Author, finished 14 Mar 2026,
 * 611 pages, 4 stars". Unrated, it ends at the pages; with no author, the
 * author part is left out.
 */
export function finishRowName(
  finish: Pick<StatsFinish, 'title' | 'firstAuthor' | 'authorCount' | 'finishDate' | 'finishedPages' | 'rating'>,
): string {
  const author = finishAuthor(finish)
  const parts = [finish.title]
  if (author !== '') parts.push(author)
  parts.push(`finished ${shortDate(finish.finishDate)}`, pagesWords(finish.finishedPages))
  if (finish.rating !== null) parts.push(starsLabel(finish.rating))
  return parts.join(', ')
}
