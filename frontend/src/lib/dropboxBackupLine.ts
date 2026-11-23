// The Backup page's Dropbox backup line (EXPERIENCE.md → Dropbox backup line,
// Foundation → Dates). The server decides the state; this only formats it.

import type { DropboxBackupView } from '../api/views.ts'
import { localDay } from './relativeDay.ts'

type Cause = NonNullable<DropboxBackupView['cause']>

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** The words after "failed *when* · ", per cause (EXPERIENCE.md → Failed reasons). */
export const REASONS: Record<Cause, string> = {
  dropbox_signin: 'Dropbox sign-in expired. Nothing in Dropbox was deleted. Run bookvie-dropbox auth in Terminal.',
  upload_incomplete: "the last upload didn't finish. Nothing in Dropbox was deleted; run /bookvie-backup again.",
  dropbox_full: 'Dropbox is full. Nothing in Dropbox was deleted; free some space there.',
  backup_write: "bookvie couldn't write the backup file. See docs/dropbox-backup.md → Troubleshooting.",
  other: 'the last run stopped with an error. See docs/dropbox-backup.md → Troubleshooting.',
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * "today at 09:02", "yesterday at 09:02", "on 19 Nov", or "on 19 Nov 2025" in
 * another year. Local calendar days and 24-hour local time; a future time is "today".
 */
export function dropboxWhen(iso: string, now: Date): string {
  const then = new Date(iso)
  const days = localDay(now) - localDay(then)
  const time = `${pad(then.getHours())}:${pad(then.getMinutes())}`
  if (days <= 0) return `today at ${time}`
  if (days === 1) return `yesterday at ${time}`
  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`
  return then.getFullYear() === now.getFullYear() ? `on ${date}` : `on ${date} ${then.getFullYear()}`
}

/** "1 copy", "3 copies". */
export function copiesText(n: number): string {
  return n === 1 ? '1 copy' : `${n} copies`
}

/** The whole line, "Dropbox backup: …", for the view's state at `now`. */
export function dropboxBackupLine(view: DropboxBackupView, now: Date): string {
  const w = (iso: string) => dropboxWhen(iso, now)
  const { reportAt, lastUploadAt, copies, cause } = view
  switch (view.state) {
    case 'uploaded':
      if (lastUploadAt !== null && copies !== null) {
        return `Dropbox backup: last upload ${w(lastUploadAt)} · ${copiesText(copies)} in Dropbox`
      }
      break
    case 'skipped':
      if (reportAt !== null && lastUploadAt !== null && copies !== null) {
        return `Dropbox backup: checked ${w(reportAt)}, nothing new · last upload ${w(lastUploadAt)} · ${copiesText(copies)} in Dropbox`
      }
      break
    case 'failed':
      if (reportAt !== null && cause !== null) {
        const last = lastUploadAt !== null ? ` Last upload ${w(lastUploadAt)}.` : ''
        return `Dropbox backup: failed ${w(reportAt)} · ${REASONS[cause]}${last}`
      }
      break
    case 'dev':
      return 'Dropbox backup: never from a development server'
    case 'none':
      break
  }
  return 'Dropbox backup: none yet · run /bookvie-backup in Claude Code'
}
