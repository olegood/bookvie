import { lastExportLine, relativeDay } from '../lib/relativeDay.ts'
import styles from './ReentryLine.module.css'

function daysLeftLine(daysLeft: number): string {
  return daysLeft === 1 ? '~1 day left' : `~${daysLeft} days left`
}

/**
 * The re-entry line closing the Main book card (EXPERIENCE.md → Re-entry
 * line): up to three muted facts, one `span` each, separated by CSS dots.
 * "Last updated …" (local calendar days from `lastProgressUpdate`, omitted
 * when it is `null`), "~N days left" (the server's number, omitted when
 * `null`) and "Last export …". `now` is Home's `useNow()`, so focus and
 * visibility recompute the line with the date header. No warning tone, ever.
 */
export default function ReentryLine({
  lastProgressUpdate,
  daysLeft,
  lastExportAt,
  now,
}: {
  lastProgressUpdate: string | null
  daysLeft: number | null
  lastExportAt: string | null
  now: Date
}) {
  return (
    <p className={styles.line}>
      {lastProgressUpdate !== null && <span>{`Last updated ${relativeDay(new Date(lastProgressUpdate), now)}`}</span>}
      {daysLeft !== null && <span>{daysLeftLine(daysLeft)}</span>}
      <span>{lastExportLine(lastExportAt, now)}</span>
    </p>
  )
}
