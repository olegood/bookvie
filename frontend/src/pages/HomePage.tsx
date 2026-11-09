import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useHomeView, type HomeView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import FinishDialog, { type FinishedState } from '../components/FinishDialog.tsx'
import MainBookCard from '../components/MainBookCard.tsx'
import PageHeading from '../components/PageHeading.tsx'
import SidePane from '../components/SidePane.tsx'
import StartDialog, { type StartedState } from '../components/StartDialog.tsx'
import UpNextPane from '../components/UpNextPane.tsx'
import WaitingPane from '../components/WaitingPane.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { finishStatus, sortBooks } from '../lib/catalog.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { pausedStatus } from '../lib/pause.ts'
import { lastExportLine, useNow } from '../lib/relativeDay.ts'
import { formatToday } from '../lib/today.ts'
import { usePauseFlow, type PauseBook } from '../lib/usePauseFlow.tsx'
import Bookcase, { type FinishMoment } from './Bookcase.tsx'
import { EmptyShelf, type NewBookState } from './CatalogPage.tsx'
import styles from './HomePage.module.css'

function wantsStarted(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<StartedState>).started === true
}

/** The Finish dialog's description when a start reached the last page (a Side read), else `null`. */
function reachedLastPageLine(state: unknown): string | null {
  if (!wantsStarted(state)) return null
  const { reachedLastPage, savedLine } = state as Partial<StartedState>
  return reachedLastPage === true ? (typeof savedLine === 'string' ? savedLine : '') : null
}

function wantsFinished(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<FinishedState>).finished === true
}

/** The finish moment the hand-off carries, when every field is there and well formed. */
function finishMoment(state: unknown): FinishMoment | null {
  if (!wantsFinished(state)) return null
  const { bookId, title, reread, fromPercent } = state as Partial<FinishedState>
  if (typeof bookId !== 'string' || typeof title !== 'string' || typeof reread !== 'boolean') return null
  if (typeof fromPercent !== 'number' || !Number.isFinite(fromPercent)) return null
  return { id: bookId, title, reread, fromPercent: Math.min(100, Math.max(0, fromPercent)) }
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
function HomeSlice({ view, finishing }: { view: HomeView; finishing: FinishMoment | null }) {
  const sorted = useMemo(() => sortBooks(view.books), [view.books])
  const slice = useMemo(() => ({ priority: view.slicePriority }), [view.slicePriority])
  return (
    <div className={styles.slice}>
      <Bookcase books={sorted} meter={view.meter} slice={slice} finishing={finishing} />
    </div>
  )
}

/**
 * Home, the launch page at `/` (EXPERIENCE.md → Home): a visually hidden
 * `h1` "Home", the date header (the browser's local date, recomputed on
 * focus and visibility), then either the empty shelf (no Books) or a grid of
 * the Main book card beside the 320px side column with the bookcase slice
 * below. The side column holds the Up next pane, shown only while there is a
 * Main book (without one the empty card suggests the Up next Book), then the
 * Waiting for you pane, shown whenever the view's `waiting` isn't empty, with
 * every row in the server's order and no cap (the column grows and the page
 * scrolls), then the On the side pane, shown whenever the view's `sideReads`
 * isn't empty, with or without a Main book. Home hosts the Start dialog that
 * the Up next pane's button, the empty card's suggestion, each Waiting row's
 * **Resume** and each On the side row's **Start reading** open; Cancel or
 * Esc returns focus to the button that opened it while it is still on the
 * page, else to the Up next pane's or the suggestion's button, the "No Main
 * book." heading or `main`. The bookcase slice below is the full bookcase
 * in Catalog's order, up to 3 rows chosen by the view's `slicePriority`.
 * "Last export" sits at the right end of the header line only while there is
 * no Main book; with one it sits in the card's re-entry line, which reads the
 * same `now`.
 *
 * Arriving from a confirmed Start dialog (router state `{started: true}`),
 * focus goes to the Main book card's title link, winning over the `h1`;
 * with `reachedLastPage` (a Side read started at its last page) Home then
 * opens the Finish dialog for the new Main book, as a last-page save does.
 * Arriving from a finish (`{finished: true}`), it goes to the empty card's
 * Up next suggestion button (**Start reading** or **Resume**) when there is
 * an Up next, else to the "No Main book." heading, the same way; and when
 * the refetched view shows that Book finished, the finish moment of this
 * visit (Story 3.7): the slice plays it once, the bookcase header keeps
 * "Finished *X*." until Home unmounts, and `status` reads "Finished *X*. N
 * of M finished." once focus has moved. The hand-off is cleared from the
 * history entry, so a reload, Back, Forward, a revisit or another tab never
 * sees it.
 *
 * Home hosts the Finish dialog the page field opens on `reachedLastPage`,
 * so a refetch that empties the card (a finish or delete in another tab)
 * leaves the dialog, its answers and its alert line in place. Cancel or Esc
 * returns focus to the page field, or, once the card is empty, to its
 * suggestion button, else the "No Main book." heading.
 *
 * Home hosts the pause flow (`lib/usePauseFlow.tsx`) for the Main book card's
 * "⋯" menu: **Pause** sends `pause` at once with no Up next, else opens the
 * Confirm dialog naming where the Up next goes. Cancel or Esc returns focus
 * to "⋯"; a failure without the dialog shows its line below "⋯" and keeps
 * focus there. A stale tab's refusal empties the card: focus goes to its
 * **Resume** (else "No Main book."), with the line below the suggestion. Once the refetched view has no Main book, focus goes to the
 * empty card's **Resume** (the paused Book is Up next) and then `status`
 * reads "Paused *X* at p.N. It's Up next."
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
  const suggestButton = useRef<HTMLButtonElement>(null)
  const upNextButton = useRef<HTMLButtonElement>(null)
  const moreButton = useRef<HTMLButtonElement>(null)
  // The element whose press opened the Start dialog: Cancel returns focus to
  // it while it is still connected (a refetch can remove a Waiting row).
  const opener = useRef<HTMLElement | null>(null)
  // The Book whose Start dialog a Home button opened (the Up next pane, the
  // empty card's suggestion, a Waiting row), and the history entry it opened
  // on: a confirmed start navigates to `/` again, a new entry, which closes it.
  const [starting, setStarting] = useState<{ bookId: string; key: string } | null>(null)
  if (starting !== null && starting.key !== location.key) setStarting(null)
  // Set when that dialog is cancelled, so focus returns to its opener once it has unmounted.
  const [startRefocus, setStartRefocus] = useState(0)
  const handledStart = useRef<string | null>(null)
  const handledFinish = useRef<string | null>(null)
  // This visit's finish moment: taken from the hand-off of one history entry,
  // kept through refetches, dropped with the Home mount or another entry.
  const [moment, setMoment] = useState<{ key: string; finishing: FinishMoment } | null>(null)
  const hasMain = view.status === 'ready' && view.data.mainBook !== null
  const noMain = view.status === 'ready' && view.data.mainBook === null && view.data.meter.total > 0
  const pageField = useRef<HTMLInputElement>(null)
  // The Book whose Finish dialog is open, and the history entry it opened on:
  // Done navigates to `/` again, a new entry, which closes it.
  const [finishing, setFinishing] = useState<{ bookId: string; key: string; savedLine: string } | null>(null)
  // Leaving that entry drops it for good, so Back to it never reopens a finished Book's dialog.
  if (finishing !== null && finishing.key !== location.key) setFinishing(null)
  // Set when the Finish dialog is cancelled, so focus moves once it has unmounted.
  const [finishRefocus, setFinishRefocus] = useState(0)
  const mainId = view.status === 'ready' ? (view.data.mainBook?.id ?? null) : null
  // A start at the last page (a Side read) opens the Finish dialog for the new
  // Main book, as a last-page save does, once per history entry.
  const lastPageLine = reachedLastPageLine(location.state)
  const [lastPageOpened, setLastPageOpened] = useState<string | null>(null)
  if (lastPageLine !== null && mainId !== null && lastPageOpened !== location.key) {
    setLastPageOpened(location.key)
    setFinishing({ bookId: mainId, key: location.key, savedLine: lastPageLine })
  }
  // The fill as the card shows it, read by Done (the render it was pressed in):
  // the refetched home view, not a `book` view cached from an earlier visit.
  const mainPercent = view.status === 'ready' ? (view.data.mainBook?.percent ?? null) : null
  // A finish that landed while another Book is Main (a stale Book detail, or
  // another tab started one): nothing plays on this entry, and the hand-off is
  // dropped so a later reload with no Main book can't replay it (AD-7). Only
  // decided from a view where another Book is Main and the handed one is finished or gone.
  const [dropped, setDropped] = useState<string | null>(null)
  if (finished && dropped !== location.key && moment?.key !== location.key && view.status === 'ready') {
    const handed = finishMoment(location.state)
    const other = view.data.mainBook
    const landedElsewhere =
      handed !== null &&
      other !== null &&
      other.id !== handed.id &&
      // Finished in this view, or deleted since: either way this view postdates the finish.
      !view.data.books.some((book) => book.id === handed.id && !book.finished)
    if (landedElsewhere) setDropped(location.key)
  }
  const keepsHandOff = finished && dropped !== location.key
  // Taken during render, so the slice's first render of the finished spine is the moment's.
  const handOff = keepsHandOff && noMain ? finishMoment(location.state) : null
  const shownFinished =
    handOff !== null &&
    view.status === 'ready' &&
    view.data.books.some((book) => book.id === handOff.id && book.finished)
  if (handOff !== null && shownFinished && moment?.key !== location.key)
    setMoment({ key: location.key, finishing: handOff })
  // Another history entry (a start, a later finish) is another visit: the line goes.
  else if (moment !== null && moment.key !== location.key) setMoment(null)
  const homeMeter = view.status === 'ready' ? view.data.meter : null
  const homeMain = view.status === 'ready' ? view.data.mainBook : null
  const pauseBook: PauseBook | null =
    homeMain === null
      ? null
      : { id: homeMain.id, title: homeMain.title, currentPage: homeMain.currentPage, percent: homeMain.percent }
  // The `status` line of a pause that landed, waiting for the empty card to render.
  const pausedLine = useRef<{ bookId: string; line: string } | null>(null)
  const [pauses, setPauses] = useState(0)
  const onPaused = useCallback((paused: PauseBook) => {
    pausedLine.current = { bookId: paused.id, line: pausedStatus(paused.title, paused.currentPage) }
    setPauses((count) => count + 1)
  }, [])
  const pauseFlow = usePauseFlow({
    book: pauseBook,
    opener: moreButton,
    fallback: () => suggestButton.current ?? emptyHeading.current,
    onPaused,
  })

  // After a pause: focus first (the empty card's Resume), then the line. While
  // the view still shows the paused Book as Main, the refetch hasn't rendered;
  // any other view settles the line, which is said only when there is no Main
  // book (another tab may have started one), so it never fires on a later change.
  useEffect(() => {
    const pending = pausedLine.current
    if (pending === null || view.status !== 'ready' || view.data.mainBook?.id === pending.bookId) return
    pausedLine.current = null
    if (!noMain) return
    ;(suggestButton.current ?? emptyHeading.current)?.focus()
    announce('status', pending.line)
  }, [pauses, view, noMain])
  const openFinish = useCallback(
    (savedLine: string) => {
      if (mainId !== null) setFinishing({ bookId: mainId, key: location.key, savedLine })
    },
    [mainId, location.key],
  )
  const cancelFinish = useCallback(() => {
    setFinishing(null)
    setFinishRefocus((count) => count + 1)
  }, [])

  useEffect(() => {
    if (finishRefocus === 0) return
    const target = pageField.current ?? suggestButton.current ?? emptyHeading.current ?? document.getElementById('main')
    target?.focus()
  }, [finishRefocus])

  const openStart = useCallback(
    (bookId: string, from: HTMLElement | null) => {
      opener.current = from
      setStarting({ bookId, key: location.key })
    },
    [location.key],
  )
  const openStartFromPane = useCallback((bookId: string) => openStart(bookId, upNextButton.current), [openStart])
  const openStartFromSuggestion = useCallback((bookId: string) => openStart(bookId, suggestButton.current), [openStart])
  const cancelStart = useCallback(() => {
    setStarting(null)
    setStartRefocus((count) => count + 1)
  }, [])

  useEffect(() => {
    if (startRefocus === 0) return
    // The opener is gone when a refetch changed Home meanwhile.
    const from = opener.current?.isConnected ? opener.current : null
    const target =
      from ?? upNextButton.current ?? suggestButton.current ?? emptyHeading.current ?? document.getElementById('main')
    target?.focus()
  }, [startRefocus])

  // Runs after PageHeading's own focus effect (a child's), so it wins over the `h1`.
  useEffect(() => {
    if (!started || !hasMain || handledStart.current === location.key) return
    handledStart.current = location.key
    titleLink.current?.focus()
    clearHandOffState()
  }, [started, hasMain, location.key])

  useEffect(() => {
    if (dropped === location.key) clearHandOffState()
  }, [dropped, location.key])

  // After a finish: the empty card's Up next suggestion, else its heading, as
  // after a start the title link.
  useEffect(() => {
    if (!keepsHandOff || !noMain || handledFinish.current === location.key) return
    handledFinish.current = location.key
    ;(suggestButton.current ?? emptyHeading.current)?.focus()
    clearHandOffState()
    // Once focus has settled, with the refetched view's meter.
    if (moment?.key === location.key && homeMeter !== null) {
      const { title, reread } = moment.finishing
      announce('status', finishStatus(title, reread, homeMeter))
    }
  }, [keepsHandOff, noMain, location.key, moment, homeMeter])

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

  const { mainBook, upNext, waiting, sideReads, lastExportAt, meter } = view.data
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
              upNext={upNext}
              onStartUpNext={openStartFromSuggestion}
              suggestRef={suggestButton}
              onReachedLastPage={openFinish}
              pageFieldRef={pageField}
              onPause={pauseFlow.request}
              moreRef={moreButton}
              pauseSlot={pauseFlow.regionSlot}
              pauseFailed={pauseFlow.failed}
            />
            <div className={styles.side}>
              {mainBook !== null && <UpNextPane upNext={upNext} onStart={openStartFromPane} buttonRef={upNextButton} />}
              <WaitingPane waiting={waiting} onStart={openStart} />
              <SidePane sideReads={sideReads} onStart={openStart} />
            </div>
          </div>
          <HomeSlice view={view.data} finishing={moment?.finishing ?? null} />
        </>
      )}
      {starting !== null && starting.key === location.key && (
        <StartDialog bookId={starting.bookId} onCancel={cancelStart} />
      )}
      {pauseFlow.dialog}
      {finishing !== null && finishing.key === location.key && (
        <FinishDialog
          bookId={finishing.bookId}
          savedLine={finishing.savedLine}
          fromPercent={mainPercent ?? undefined}
          onCancel={cancelFinish}
        />
      )}
    </div>
  )
}
