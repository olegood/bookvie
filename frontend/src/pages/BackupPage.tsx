import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  COULDNT_EXPORT_MESSAGE,
  ExportError,
  exportAll,
  refreshLastExport,
  restore,
  useBackupView,
} from '../api/index.ts'
import Button from '../components/Button.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { lastExportLine, useNow } from '../lib/relativeDay.ts'
import styles from './BackupPage.module.css'

// DESIGN.md → Busy button: only an export or restore slower than this shows "Exporting…" / "Restoring…".
export const BUSY_DELAY_MS = 300

const EXPORT_ALL = 'Export all data'
const EXPORTING = 'Exporting…'
const RESTORE = 'Restore from file…'
const RESTORING = 'Restoring…'
const RESTORE_EXPLANATION = 'Replaces everything here with the contents of an export file.'
const CONFIRM_HEADING = 'Replace all data with this file?'
const CONFIRM_LINES = ['Your current books, readings and card notes will be replaced.'] as const
const REPLACE_ALL = 'Replace all data'
const RESTORED = 'Restored.'

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
  const navigate = useNavigate()
  // Restore: the file picked, while the Confirm dialog asks about it.
  const [picked, setPicked] = useState<File | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreFailure, setRestoreFailure] = useState<string | null>(null)
  const restoring = useRef(false)
  const restoreRef = useRef<HTMLButtonElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  // Bumped to return focus to Restore from file… once the dialog has
  // unmounted, or once a failed restore's button is no longer disabled.
  const [refocusRestore, setRefocusRestore] = useState(0)

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

  useEffect(() => {
    if (refocusRestore > 0) restoreRef.current?.focus()
  }, [refocusRestore])

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

  const chooseFile = () => {
    if (restoring.current) return
    fileInput.current?.click()
  }

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    // Reset, so picking the same file again still fires `change`.
    event.target.value = ''
    if (file) setPicked(file)
  }

  const cancelRestore = () => {
    clearAnnouncements()
    setPicked(null)
    setRefocusRestore((count) => count + 1)
  }

  const runRestore = async () => {
    const file = picked
    if (restoring.current || file === null) return
    restoring.current = true
    setPicked(null)
    clearAnnouncements()
    setRestoreFailure(null)
    const timer = setTimeout(() => setRestoreBusy(true), BUSY_DELAY_MS)
    const result = await restore(queryClient, file)
    clearTimeout(timer)
    restoring.current = false
    setRestoreBusy(false)
    if (result.kind === 'ok') {
      // Home, the launch page: its h1 takes focus as it mounts; announce after that.
      await navigate('/')
      announce('status', RESTORED)
      return
    }
    setRestoreFailure(result.message)
    announce('alert', result.message)
    setRefocusRestore((count) => count + 1)
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
        <Button ref={restoreRef} busy={restoreBusy} onClick={chooseFile}>
          {restoreBusy ? RESTORING : RESTORE}
        </Button>
        <input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={onFilePicked} />
        <p className={styles.text}>{RESTORE_EXPLANATION}</p>
        {restoreFailure !== null && <FailureMessage>{restoreFailure}</FailureMessage>}
      </section>
      {picked !== null && (
        <ConfirmDialog
          heading={CONFIRM_HEADING}
          lines={CONFIRM_LINES}
          confirmLabel={REPLACE_ALL}
          onConfirm={() => void runRestore()}
          onCancel={cancelRestore}
        />
      )}
    </div>
  )
}
