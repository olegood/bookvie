import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useHomeView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import MainBookCard from '../components/MainBookCard.tsx'
import PageHeading from '../components/PageHeading.tsx'
import type { StartedState } from '../components/StartDialog.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { lastExportLine, useNow } from '../lib/relativeDay.ts'
import { formatToday } from '../lib/today.ts'
import { EmptyShelf, type NewBookState } from './CatalogPage.tsx'
import styles from './HomePage.module.css'

function wantsStarted(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<StartedState>).started === true
}

/**
 * Drops `started` from this history entry without a navigation, so Back,
 * Forward or a reload don't move focus again. React Router keeps its state
 * under `usr`.
 */
function clearStartedState(): void {
  const entry: unknown = window.history.state
  if (typeof entry !== 'object' || entry === null) return
  const { usr, ...rest } = entry as { usr?: unknown }
  if (!wantsStarted(usr)) return
  window.history.replaceState({ ...rest, usr: null }, '')
}

/**
 * Home, the launch page at `/` (EXPERIENCE.md → Home): a visually hidden
 * `h1` "Home", the date header (the browser's local date, recomputed on
 * focus and visibility), then either the empty shelf (no Books) or a grid of
 * the Main book card beside the 320px side column (empty until Epic 4), with
 * room for the bookcase slice below (Story 3.5). "Last export" sits at the
 * right end of the header line only while there is no Main book; with one it
 * sits in the card's re-entry line, which reads the same `now`.
 *
 * Arriving from a confirmed Start dialog (router state `{started: true}`),
 * focus goes to the Main book card's title link, winning over the `h1`.
 */
export default function HomePage() {
  usePageTitle('Home')
  const view = useHomeView()
  const now = useNow()
  const navigate = useNavigate()
  const failed = view.status === 'failed'
  const location = useLocation()
  const started = wantsStarted(location.state)
  const titleLink = useRef<HTMLAnchorElement>(null)
  const handledStart = useRef<string | null>(null)
  const hasMain = view.status === 'ready' && view.data.mainBook !== null

  // Runs after PageHeading's own focus effect (a child's), so it wins over the `h1`.
  useEffect(() => {
    if (!started || !hasMain || handledStart.current === location.key) return
    handledStart.current = location.key
    titleLink.current?.focus()
    clearStartedState()
  }, [started, hasMain, location.key])

  // The couldn't-load line is shown in `main` and set in the shell's alert.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  if (view.status === 'loading') return null

  if (view.status === 'failed') {
    const { retry } = view
    // Retrying unmounts this button; park focus on `main` first.
    const tryAgain = () => {
      document.getElementById('main')?.focus()
      retry()
    }
    return (
      <div className={styles.page}>
        <PageHeading className="visuallyHidden">Home</PageHeading>
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      </div>
    )
  }

  const { mainBook, lastExportAt, meter } = view.data
  const empty = meter.total === 0
  const newBook = () => {
    const state: NewBookState = { newBook: true }
    void navigate('/catalog', { state })
  }

  return (
    <div className={styles.page}>
      <PageHeading className="visuallyHidden">Home</PageHeading>
      <div className={styles.header}>
        <p className={styles.date}>{formatToday(now)}</p>
        {mainBook === null && <p className={styles.lastExport}>{lastExportLine(lastExportAt, now)}</p>}
      </div>
      {empty ? (
        <div className={styles.emptyShelf}>
          <EmptyShelf />
          <Button variant="primary" className={styles.newBook} onClick={newBook}>
            New book
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          <MainBookCard book={mainBook} lastExportAt={lastExportAt} now={now} titleRef={titleLink} />
          <div className={styles.side} />
        </div>
      )}
    </div>
  )
}
