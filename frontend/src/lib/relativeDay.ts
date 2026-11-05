// Relative dates by local calendar day (EXPERIENCE.md → Dates): 23:59 to 00:01
// is "yesterday", a future time is "today", beyond 365 days "over a year ago".

import { useEffect, useState } from 'react'

const DAY_MS = 86_400_000

/** Days since the Unix epoch of the local calendar date of `date`. */
function localDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
}

export function relativeDay(then: Date, now: Date): string {
  const days = localDay(now) - localDay(then)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days > 365) return 'over a year ago'
  return `${days} days ago`
}

const NO_EXPORT_YET = 'No export yet'

/** "Last export: 12 days ago", or "No export yet" before the first export (Backup and Home). */
export function lastExportLine(lastExportAt: string | null, now: Date): string {
  if (lastExportAt === null) return NO_EXPORT_YET
  return `Last export: ${relativeDay(new Date(lastExportAt), now)}`
}

/** The current time, refreshed when the window regains focus or becomes visible. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return now
}
