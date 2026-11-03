import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { COULDNT_EXPORT_MESSAGE, ExportError, exportAll, refreshLastExport, useBackupView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { relativeDay, useNow } from '../lib/relativeDay.ts'
import styles from './BackupPage.module.css'

// DESIGN.md → Busy button: only an export slower than this shows "Exporting…".
export const BUSY_DELAY_MS = 300

const EXPORT_ALL = 'Export all data'
const EXPORTING = 'Exporting…'
const RESTORE = 'Restore from file…'
const RESTORE_EXPLANATION = 'Replaces everything here with the contents of an export file.'
// Until Story 2.2 builds restore, the button is shown but can't act.
const RESTORE_NOT_YET = 'Restore arrives in the next update.'
const NO_EXPORT_YET = 'No export yet'

function lastExportLine(lastExportAt: string | null, now: Date): string {
  if (lastExportAt === null) return NO_EXPORT_YET
  return `Last export: ${relativeDay(new Date(lastExportAt), now)}`
}

export default function BackupPage() {
  usePageTitle('Backup')
  const view = useBackupView()
  const now = useNow()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const running = useRef(false)
  const exportRef = useRef<HTMLButtonElement | null>(null)
  // Whether the Export button had focus when it went busy (natively disabled
  // buttons lose it); it gets focus back once the export ends.
  const refocus = useRef(false)
  const failed = view.status === 'failed'

  // The couldn't-load line is shown in `main` and set in the shell's alert.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  useEffect(() => {
    if (busy || !refocus.current) return
    refocus.current = false
    exportRef.current?.focus()
  }, [busy])

  if (view.status === 'loading') return null

  if (view.status === 'failed') {
    const { retry } = view
    const tryAgain = () => {
      document.getElementById('main')?.focus()
      retry()
    }
    return (
      <div className={styles.page}>
        <PageHeading className={styles.title}>Backup</PageHeading>
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      </div>
    )
  }

  const before = view.data.lastExportAt

  const runExport = async () => {
    if (running.current) return
    running.current = true
    clearAnnouncements()
    setFailure(null)
    const timer = setTimeout(() => {
      refocus.current = document.activeElement === exportRef.current
      setBusy(true)
    }, BUSY_DELAY_MS)
    let exported = false
    try {
      await exportAll()
      exported = true
    } catch (error) {
      const message = error instanceof ExportError ? error.message : COULDNT_EXPORT_MESSAGE
      setFailure(message)
      announce('alert', message)
    } finally {
      clearTimeout(timer)
      running.current = false
      setBusy(false)
    }
    if (exported) await refreshLastExport(queryClient, before)
  }

  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Backup</PageHeading>
      <section className={styles.card} aria-label="Export">
        <Button ref={exportRef} variant="primary" busy={busy} onClick={() => void runExport()}>
          {busy ? EXPORTING : EXPORT_ALL}
        </Button>
        <p className={styles.lastExport}>{lastExportLine(before, now)}</p>
        {failure !== null && <FailureMessage>{failure}</FailureMessage>}
      </section>
      <section className={styles.card} aria-label="Restore">
        <Button disabledReason={RESTORE_NOT_YET}>{RESTORE}</Button>
        <p className={styles.text}>{RESTORE_EXPLANATION}</p>
      </section>
    </div>
  )
}
