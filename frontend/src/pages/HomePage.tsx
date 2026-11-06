import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useHomeView, type HomeView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import FinishDialog, { type FinishedState } from '../components/FinishDialog.tsx'
import MainBookCard from '../components/MainBookCard.tsx'
import PageHeading from '../components/PageHeading.tsx'
import type { StartedState } from '../components/StartDialog.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { sortBooks } from '../lib/catalog.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { lastExportLine, useNow } from '../lib/relativeDay.ts'
import { formatToday } from '../lib/today.ts'
import Bookcase from './Bookcase.tsx'
import { EmptyShelf, type NewBookState } from './CatalogPage.tsx'
import styles from './HomePage.module.css'

function wantsStarted(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<StartedState>).started === true
}

function wantsFinished(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<FinishedState>).finished === true
}

/**
 * Drops `started` or `finished` from this history entry without a
 * navigation, so Back, Forward or a reload don't move focus again. React
 * Router keeps its state under `usr`.
 */
function clearHandOffState(): void {
  const entry: unknown = window.history.state
  if (typeof entry !== 'object' || entry === null) return
  const { usr, ...rest } = entry as { usr?: unknown }
  if (!wantsStarted(usr) && !wantsFinished(usr)) return
  window.history.replaceState({ ...rest, usr: null }, '')
}

/** The bookcase slice below the grid, in Catalog's order (Author). */
function HomeSlice({ view }: { view: HomeView }) {
  const sorted = useMemo(() => sortBooks(view.books), [view.books])
  const slice = useMemo(() => ({ priority: view.slicePriority }), [view.slicePriority])
  return (
    <div className={styles.slice}>
      <Bookcase books={sorted} meter={view.meter} slice={slice} />
    </div>
  )
}

/**
 * Home, the launch page at `/` (EXPERIENCE.md → Home): a visually hidden
 * `h1` "Home", the date header (the browser's local date, recomputed on
 * focus and visibility), then either the empty shelf (no Books) or a grid of
 * the Main book card beside the 320px side column (empty until Epic 4) with
 * the bookcase slice below: the full bookcase in Catalog's order, up to 3
 * rows chosen by the view's `slicePriority`. "Last export" sits at the
 * right end of the header line only while there is no Main book; with one it
 * sits in the card's re-entry line, which reads the same `now`.
 *
 * Arriving from a confirmed Start dialog (router state `{started: true}`),
 * focus goes to the Main book card's title link, winning over the `h1`.
 * Arriving from a finish (`{finished: true}`), it goes to the "No Main
 * book." heading the same way.
 *
 * Home hosts the Finish dialog the page field opens on `reachedLastPage`,
 * so a refetch that empties the card (a finish or delete in another tab)
 * leaves the dialog, its answers and its alert line in place. Cancel or Esc
 * returns focus to the page field, or to the "No Main book." heading once
 * the card is empty.
 */
export default function HomePage() {
  usePageTitle('Home')
  const view = useHomeView()
  const now = useNow()
  const navigate = useNavigate()
  const failed = view.status === 'failed'
  const location = useLocation()
  const started = wantsStarted(location.state)
  const finished = wantsFinished(location.state)
  const titleLink = useRef<HTMLAnchorElement>(null)
  const emptyHeading = useRef<HTMLHeadingElement>(null)
  const handledStart = useRef<string | null>(null)
  const handledFinish = useRef<string | null>(null)
  const hasMain = view.status === 'ready' && view.data.mainBook !== null
  const noMain = view.status === 'ready' && view.data.mainBook === null && view.data.meter.total > 0
  const pageField = useRef<HTMLInputElement>(null)
  // The Book whose Finish dialog is open, and the history entry it opened on:
  // Done navigates to `/` again, a new entry, which closes it.
  const [finishing, setFinishing] = useState<{ bookId: string; key: string } | null>(null)
  // Leaving that entry drops it for good, so Back to it never reopens a finished Book's dialog.
  if (finishing !== null && finishing.key !== location.key) setFinishing(null)
  // Set when the Finish dialog is cancelled, so focus moves once it has unmounted.
  const [finishRefocus, setFinishRefocus] = useState(0)
  const mainId = view.status === 'ready' ? (view.data.mainBook?.id ?? null) : null
  const openFinish = useCallback(() => {
    if (mainId !== null) setFinishing({ bookId: mainId, key: location.key })
  }, [mainId, location.key])
  const cancelFinish = useCallback(() => {
    setFinishing(null)
    setFinishRefocus((count) => count + 1)
  }, [])

  useEffect(() => {
    if (finishRefocus === 0) return
    const target = pageField.current ?? emptyHeading.current ?? document.getElementById('main')
    target?.focus()
  }, [finishRefocus])

  // Runs after PageHeading's own focus effect (a child's), so it wins over the `h1`.
  useEffect(() => {
    if (!started || !hasMain || handledStart.current === location.key) return
    handledStart.current = location.key
    titleLink.current?.focus()
    clearHandOffState()
  }, [started, hasMain, location.key])

  // After a finish: the empty card's heading, as after a start the title link.
  useEffect(() => {
    if (!finished || !noMain || handledFinish.current === location.key) return
    handledFinish.current = location.key
    emptyHeading.current?.focus()
    clearHandOffState()
  }, [finished, noMain, location.key])

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
        <>
          <div className={styles.grid}>
            <MainBookCard
              book={mainBook}
              lastExportAt={lastExportAt}
              now={now}
              titleRef={titleLink}
              emptyHeadingRef={emptyHeading}
              onReachedLastPage={openFinish}
              pageFieldRef={pageField}
            />
            <div className={styles.side} />
          </div>
          <HomeSlice view={view.data} />
        </>
      )}
      {finishing !== null && finishing.key === location.key && (
        <FinishDialog bookId={finishing.bookId} onCancel={cancelFinish} />
      )}
    </div>
  )
}
