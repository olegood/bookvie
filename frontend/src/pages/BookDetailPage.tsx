import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  useBookView,
  useCatalogView,
  useDeleteBook,
  useHomeView,
  useMarkSideRead,
  useUnmarkSideRead,
  type BookDetailView,
} from '../api/index.ts'
import Button from '../components/Button.tsx'
import ChangeColor from '../components/ChangeColor.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import Cover from '../components/Cover.tsx'
import EditPurpose from '../components/EditPurpose.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import FinishDialog from '../components/FinishDialog.tsx'
import Gauge from '../components/Gauge.tsx'
import PageHeading from '../components/PageHeading.tsx'
import StartDialog from '../components/StartDialog.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import {
  currentReadingStatus,
  metadata,
  panelCover,
  readingLines,
  roleLine,
  starsLabel,
  toPanelFields,
  type DeletedState,
} from '../lib/bookDetail.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { detailOffersFinish, finishedStatus } from '../lib/markFinished.ts'
import { usePageTitle } from '../lib/page.ts'
import { pausedStatus } from '../lib/pause.ts'
import { detailOffersSetUpNext, REPLACES_UP_NEXT, SETTING_UP_NEXT, upNextStatus } from '../lib/setUpNext.ts'
import {
  detailOffersSideRead,
  MARKING_SIDE_READ,
  REMOVING_FROM_SIDE,
  SIDE_READS_FULL_HINT,
  sideReadLabel,
  sideReadStatus,
} from '../lib/sideRead.ts'
import { detailPrimary } from '../lib/startReading.ts'
import { PAUSING, usePauseFlow, type PauseBook } from '../lib/usePauseFlow.tsx'
import { useOneClickFlow, useSetUpNextFlow } from '../lib/useSetUpNextFlow.ts'
import NewBookPanel from './NewBookPanel.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './BookDetailPage.module.css'

const NO_TAGS: readonly string[] = []
const CONSEQUENCE = 'Its readings and card notes are deleted too.'
const DELETING = 'Deleting the book.'

/** Sends `delete-book`; resolves `ok` once the Book is gone and Catalog is on its way. */
type DeleteBook = (bookId: string, title: string) => Promise<{ ok: true } | { ok: false; message: string }>

function FailedBook({ retry }: { retry: () => void }) {
  usePageTitle('Book')
  useEffect(() => {
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [])
  // Retrying shows the loading state, which unmounts this button; park
  // focus on `main` first so it doesn't fall to `body`.
  const tryAgain = () => {
    document.getElementById('main')?.focus()
    retry()
  }
  return (
    <div className={styles.page}>
      <PageHeading className={styles.pageTitle}>Book</PageHeading>
      <div className={styles.failure}>
        <FailureMessage>{COULDNT_LOAD}</FailureMessage>
        <Button onClick={tryAgain}>Try again</Button>
      </div>
    </div>
  )
}

/** A Reading's rating as five stars, filled up to it: one image named "4 stars". */
function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={starsLabel(rating)} className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={styles.star}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          data-filled={star <= rating ? 'true' : undefined}
        >
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
            fill={star <= rating ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

type BookDetailProps = {
  book: BookDetailView
  onDelete: DeleteBook
  /** Opens the Finish dialog, which the page hosts so a refetch to not-found keeps it. */
  onFinish: () => void
  finishButton: RefObject<HTMLButtonElement | null>
}

function BookDetail({ book, onDelete, onFinish, finishButton }: BookDetailProps) {
  usePageTitle(book.title)
  const catalog = useCatalogView()
  const tags = catalog.status === 'ready' ? catalog.data.tags : NO_TAGS
  const [editing, setEditing] = useState(false)
  const readings = readingLines(book.readings)
  const readingsId = useId()
  const colorId = useId()
  const currentId = useId()
  const current = book.currentReading
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const deleteButton = useRef<HTMLButtonElement>(null)
  // Set when the dialog closes, so focus returns to Delete once it has unmounted.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) deleteButton.current?.focus()
  }, [refocus])

  const primary = detailPrimary(book)
  const [starting, setStarting] = useState(false)
  const startButton = useRef<HTMLButtonElement>(null)
  // Set when the Start dialog is cancelled, so focus returns to its opener once it has unmounted.
  const [startRefocus, setStartRefocus] = useState(0)

  useEffect(() => {
    if (startRefocus === 0) return
    // The opener is gone when a refetch made the Book Main meanwhile: park focus on `main`.
    const target = startButton.current ?? document.getElementById('main')
    target?.focus()
  }, [startRefocus])

  const cancelStart = useCallback(() => {
    setStarting(false)
    setStartRefocus((count) => count + 1)
  }, [])

  // Set as Up next: any Book that is neither Main nor already Up next. Once
  // the refetched view shows it as Up next, focus goes to its primary (the
  // `h1` if none), then `status` says so.
  const offersSetUpNext = detailOffersSetUpNext(book.role)
  const setUpNextButton = useRef<HTMLButtonElement>(null)
  // The line to say, and the role the Book had when it was pressed.
  const setUpNextLine = useRef<{ line: string; from: BookDetailView['role'] } | null>(null)
  const [setUpNexts, setSetUpNexts] = useState(0)
  const role = book.role
  const onSet = useCallback(
    (title: string) => {
      setUpNextLine.current = { line: upNextStatus(title), from: role }
      setSetUpNexts((count) => count + 1)
    },
    [role],
  )
  const primaryOrHeading = () => startButton.current ?? document.querySelector<HTMLElement>('main h1')
  const {
    request: requestSetUpNext,
    busy: settingUpNext,
    failed: setUpNextFailed,
    regionSlot: setUpNextSlot,
  } = useSetUpNextFlow({ opener: setUpNextButton, fallback: primaryOrHeading, onSet })
  // The hint, kept as it was while the request is out: the refetch makes this Book the Up next before it resolves.
  const home = useHomeView()
  const hasUpNext = home.status === 'ready' && home.data.upNext !== null
  const [hintAtPress, setHintAtPress] = useState(false)
  const showSetUpNextHint = offersSetUpNext && (settingUpNext ? hintAtPress : hasUpNext)
  const setUpNextHintId = useId()

  // `sendIntent` resolves after the refetch, but the view may render it a
  // tick later: while the Book keeps the role it had, wait. Any other view
  // settles the line, said only if it shows the Book as Up next.
  useEffect(() => {
    const pending = setUpNextLine.current
    if (pending === null || book.role === pending.from) return
    setUpNextLine.current = null
    if (book.role !== 'upNext') return
    primaryOrHeading()?.focus()
    announce('status', pending.line)
  }, [setUpNexts, book.role])

  // Mark as Side read / Remove from side: any Book but the Main book (Story
  // 4.7), at once through the same one-click flow. Once the refetched view
  // shows the flip, focus goes to the primary (the `h1` if none), then
  // `status` says where the Book is.
  const offersSideRead = detailOffersSideRead(book.role)
  const sideReadButton = useRef<HTMLButtonElement>(null)
  const markSideRead = useMarkSideRead()
  const unmarkSideRead = useUnmarkSideRead()
  const sideRead = book.sideRead
  // The Book's `sideRead` when pressed: the view is waited on until it flips.
  const sideReadFrom = useRef<boolean | null>(null)
  const sideReadTitle = useRef('')
  const [sideReadToggles, setSideReadToggles] = useState(0)
  const onSideReadSet = useCallback(
    (title: string) => {
      sideReadFrom.current = sideRead
      sideReadTitle.current = title
      setSideReadToggles((count) => count + 1)
    },
    [sideRead],
  )
  const {
    request: requestSideRead,
    busy: togglingSideRead,
    failed: sideReadFailed,
    regionSlot: sideReadSlot,
  } = useOneClickFlow({
    opener: sideReadButton,
    fallback: primaryOrHeading,
    onSet: onSideReadSet,
    send: sideRead ? unmarkSideRead : markSideRead,
  })
  let sideReadReason: string | undefined
  if (togglingSideRead) sideReadReason = sideRead ? REMOVING_FROM_SIDE : MARKING_SIDE_READ
  else if (book.sideReadsFull) sideReadReason = SIDE_READS_FULL_HINT

  useEffect(() => {
    const from = sideReadFrom.current
    if (from === null || book.sideRead === from) return
    sideReadFrom.current = null
    primaryOrHeading()?.focus()
    announce('status', sideReadStatus(sideReadTitle.current, book.sideRead))
  }, [sideReadToggles, book.sideRead])

  // Mark finished: the Main book, a Reading in progress, or a Book never finished (Story 4.5).
  const canFinish = detailOffersFinish(book)
  // Pause: the Main book only.
  const canPause = book.role === 'main'

  // Pause: the Main book only. Once the refetched view makes it a paused Up
  // next, focus goes to its Resume and then `status` says where it went.
  const pauseButton = useRef<HTMLButtonElement>(null)
  const pausedLine = useRef<string | null>(null)
  const [pauses, setPauses] = useState(0)
  const onPaused = useCallback((paused: PauseBook) => {
    pausedLine.current = pausedStatus(paused.title, paused.currentPage)
    setPauses((count) => count + 1)
  }, [])
  const {
    request: requestPause,
    busy: pausing,
    failed: pauseFailed,
    regionSlot: pauseSlot,
    dialog: pauseDialog,
  } = usePauseFlow({
    book:
      canPause && current !== null
        ? { id: book.id, title: book.title, currentPage: current.currentPage, percent: current.percent }
        : null,
    opener: pauseButton,
    fallback: () => startButton.current,
    onPaused,
  })

  // While the view still shows the Book as Main, the refetch hasn't rendered;
  // any other view settles the line, said only if it made the Book resumable.
  useEffect(() => {
    const line = pausedLine.current
    if (line === null || book.role === 'main') return
    pausedLine.current = null
    if (primary !== 'Resume') return
    startButton.current?.focus()
    announce('status', line)
  }, [pauses, book.role, primary])

  const openConfirm = () => {
    setShowAlert(false)
    setConfirming(true)
  }

  const cancelConfirm = () => {
    if (inFlight.current) return
    // A couldn't-save line (or one still pending) must not outlive the dialog.
    clearAnnouncements()
    setConfirming(false)
    setRefocus((count) => count + 1)
  }

  const confirmDelete = async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    const result = await onDelete(book.id, book.title)
    // On success the page has already moved to Catalog.
    if (result.ok) return
    inFlight.current = false
    setBusy(false)
    setShowAlert(true)
    announce('alert', result.message)
  }

  const onSaved = (_id: string, title: string) => {
    // SidePanel returns focus to Edit as it unmounts.
    setEditing(false)
    announce('status', `Saved ${title}.`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.side}>
          <Cover coverFile={book.coverFile} title={book.title} />
          <div className={styles.actions}>
            {primary !== null && (
              <Button ref={startButton} variant="primary" onClick={() => setStarting(true)}>
                {primary}
              </Button>
            )}
            {offersSetUpNext && (
              <Button
                ref={setUpNextButton}
                aria-describedby={showSetUpNextHint ? setUpNextHintId : undefined}
                disabledReason={settingUpNext ? SETTING_UP_NEXT : undefined}
                onClick={() => {
                  if (!settingUpNext) setHintAtPress(hasUpNext)
                  requestSetUpNext({ id: book.id, title: book.title })
                }}
              >
                Set as Up next
              </Button>
            )}
            {showSetUpNextHint && (
              <p id={setUpNextHintId} className={styles.hint}>
                {REPLACES_UP_NEXT}
              </p>
            )}
            {/* Below Set as Up next, or where it was once a stale tab's refusal has removed it. */}
            <div
              ref={setUpNextSlot}
              className={styles.regions}
              data-show-alert={setUpNextFailed ? 'true' : undefined}
            />
            {canPause && (
              <Button ref={pauseButton} disabledReason={pausing ? PAUSING : undefined} onClick={requestPause}>
                Pause
              </Button>
            )}
            {/* Below Pause, or below Resume once a stale tab's refusal has made the Book Up next. */}
            <div ref={pauseSlot} className={styles.regions} data-show-alert={pauseFailed ? 'true' : undefined} />
            {canFinish && (
              <Button ref={finishButton} onClick={onFinish}>
                Mark finished
              </Button>
            )}
            {offersSideRead && (
              <Button
                ref={sideReadButton}
                disabledReason={sideReadReason}
                reasonClassName={!togglingSideRead && book.sideReadsFull ? styles.hint : undefined}
                onClick={() => requestSideRead({ id: book.id, title: book.title })}
              >
                {sideReadLabel(book.sideRead)}
              </Button>
            )}
            {/* Below Mark as Side read / Remove from side, or where it was once a refetch has removed it. */}
            <div ref={sideReadSlot} className={styles.regions} data-show-alert={sideReadFailed ? 'true' : undefined} />
            <Button onClick={() => setEditing(true)}>Edit</Button>
            <Button ref={deleteButton} onClick={openConfirm}>
              Delete
            </Button>
          </div>
        </div>
        <div className={styles.info}>
          <PageHeading className={styles.title}>{book.title}</PageHeading>
          {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
          <p className={styles.authors}>{book.authors.join('; ')}</p>
          <dl className={styles.metadata}>
            {metadata(book).map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {book.tags.length > 0 && (
            <ul className={styles.tags} aria-label="Tags">
              {book.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {current !== null && (
            <section className={styles.block} aria-labelledby={currentId}>
              <h2 id={currentId} className={styles.blockLabel}>
                Current reading
              </h2>
              <p className={styles.status}>{currentReadingStatus(current)}</p>
              <Gauge title={book.title} page={current.currentPage} pages={book.pages} percent={current.percent} />
              <EditPurpose key={book.id} bookId={book.id} purpose={current.purpose} />
            </section>
          )}
          <section className={styles.block} aria-labelledby={readingsId}>
            <h2 id={readingsId} className={styles.blockLabel}>
              Readings
            </h2>
            {readings.length === 0 ? (
              <p className={styles.none}>Not read yet.</p>
            ) : (
              <ul className={styles.readings}>
                {readings.map((reading) => (
                  <li key={reading.id} className={styles.reading}>
                    <span>{reading.text}</span>
                    {reading.rating !== null && <Stars rating={reading.rating} />}
                    {reading.purposeFulfilled !== null && <span>{reading.purposeFulfilled}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={styles.block} aria-labelledby={colorId}>
            <ChangeColor book={book} level={2} headingId={colorId} />
          </section>
        </div>
      </div>
      {editing && (
        <NewBookPanel
          tags={tags}
          book={{ id: book.id, fields: toPanelFields(book), cover: panelCover(book) }}
          onClose={() => setEditing(false)}
          onSaved={onSaved}
        />
      )}
      {starting && <StartDialog bookId={book.id} onCancel={cancelStart} />}
      {pauseDialog}
      {confirming && (
        <ConfirmDialog
          heading={`Delete ${book.title}?`}
          lines={[CONSEQUENCE, roleLine(book)].filter((line) => line !== null)}
          confirmLabel="Delete book"
          busy={busy}
          busyReason={DELETING}
          showAlert={showAlert}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelConfirm}
        />
      )}
    </div>
  )
}

/**
 * Book detail (EXPERIENCE.md → Book detail) at `/book/:bookId`: one surface
 * card; on the left the cover (an `img` "Cover of *Title*") or the no-cover
 * placeholder (`role="img"` "No cover"), 200×300, then the action stack
 * (the state-aware primary — **Start reading** or **Resume**, none for the
 * Main book — then **Set as Up next** unless the Book is Main or Up next,
 * then **Pause** for the Main book, then **Mark finished** for the Main
 * book, a Book with a Reading in progress or a Book never finished
 * (`lib/markFinished.ts`), then **Mark as Side read** or **Remove from
 * side** unless the Book is Main, then **Edit**, then **Delete**); the Book on the
 * right. An unknown id shows
 * the not-found page. The title is set by the child that renders, never
 * here: child effects run first, so a title set here would overwrite the
 * not-found page's.
 *
 * The Current reading block (the Main book or a paused Book) shows the
 * status, the gauge and the Purpose with **Edit Purpose**; the server
 * supplies every number. The primary opens the Start dialog and **Mark
 * finished** the Finish dialog; Cancel or Esc returns focus to the opener.
 * Done for the Main book goes Home (Story 3.6). Done for any other Book
 * (Story 4.5) keeps the page at `/book/:id`: once the dialog has unmounted,
 * focus goes to the `h1`, then `status` reads "Finished *X*."; the refetched
 * view already lists the finished Reading.
 * The Readings block lists each Reading newest first: "Started … · Finished
 * …", its stars when rated, and "Purpose fulfilled: …" when answered.
 *
 * **Pause** (`lib/usePauseFlow.tsx`) sends `pause` at once with no Up next,
 * else opens the Confirm dialog naming where the Up next goes; Cancel or Esc
 * returns focus to **Pause**. A failure without the dialog shows its line
 * directly below **Pause**, focus kept there; when it is a stale tab's
 * refusal and the refetch makes the Book Up next, focus and the line move to
 * its **Resume**. Once the refetched view shows
 * the Book as a paused Up next, focus goes to its **Resume** and then
 * `status` reads "Paused *X* at p.N. It's Up next."
 *
 * **Set as Up next** (`lib/useSetUpNextFlow.ts`) sends `set-up-next` at once,
 * with no dialog, `aria-disabled` while it is out, with the hint "Replaces
 * the current Up next." under it while another Book is Up next. Once the refetched view
 * shows the Book as Up next, focus goes to the primary (the `h1` if none),
 * then `status` reads "*X* is Up next.". A failure shows its line directly
 * below the button, focus kept there; when a stale tab's refusal has removed
 * the button, focus goes to the primary (else the `h1`) and the line stays
 * where the button was.
 *
 * **Mark as Side read** / **Remove from side** (Story 4.7) work the same
 * way through `useOneClickFlow`, sending `mark-side-read` or
 * `unmark-side-read`: once the refetched view shows the flip, focus goes to
 * the primary (the `h1` if none), then `status` reads "*X* is on the side."
 * or "*X* is off the side.". At 3 Side reads (`sideReadsFull`) **Mark as
 * Side read** stays focusable with `aria-disabled="true"` and the visible
 * hint "Up to 3 side reads." as its description; a press does nothing.
 *
 * Delete: once `delete-book` is sent, the refetched view may already say the
 * Book is gone before the request resolves. Until the outcome is known the
 * page renders nothing rather than the not-found page; on success it
 * replaces this history entry with Catalog, handing over the title. On a
 * refusal (the Book was already gone) the not-found page shows as usual.
 */
export default function BookDetailPage() {
  const { bookId = '' } = useParams()
  const view = useBookView(bookId)
  const sendDelete = useDeleteBook()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  // The Book the Finish dialog is open for. Hosted here, not in BookDetail:
  // a 409 `book_not_found` refetches the view to `missing`, and the dialog
  // must keep its alert line and answers over the not-found page.
  const [finishingId, setFinishingId] = useState<string | null>(null)
  const finishButton = useRef<HTMLButtonElement>(null)
  // Set when the Finish dialog is cancelled, so focus returns to Mark finished once it has unmounted.
  const [finishRefocus, setFinishRefocus] = useState(0)

  useEffect(() => {
    if (finishRefocus === 0) return
    // The opener is gone when a refetch says the Book is finished (no Reading in progress) or gone: park focus on `main`.
    const target = finishButton.current ?? document.getElementById('main')
    target?.focus()
  }, [finishRefocus])

  // The Book was deleted in another tab while this page showed it: focus fell
  // with the page. After a client-side navigation the `h1` has already taken it.
  const status = view.status
  const shownBook = useRef(false)
  useEffect(() => {
    if (status === 'ready') shownBook.current = true
    if (status !== 'missing' || !shownBook.current) return
    if (document.activeElement === null || document.activeElement === document.body) {
      document.querySelector<HTMLElement>('main h1')?.focus()
    }
  }, [status])

  const cancelFinish = useCallback(() => {
    setFinishingId(null)
    setFinishRefocus((count) => count + 1)
  }, [])

  // A non-Main finish stays here: once the dialog has unmounted, focus goes
  // to the `h1`, then `status` says what was finished.
  const finishedLine = useRef<string | null>(null)
  const [finishedHere, setFinishedHere] = useState(0)

  useEffect(() => {
    const line = finishedLine.current
    if (finishedHere === 0 || line === null) return
    finishedLine.current = null
    document.querySelector<HTMLElement>('main h1')?.focus()
    announce('status', line)
  }, [finishedHere])

  const onFinishedHere = useCallback((title: string) => {
    finishedLine.current = finishedStatus(title)
    setFinishingId(null)
    setFinishedHere((count) => count + 1)
  }, [])

  const onDelete: DeleteBook = async (id, title) => {
    setDeleting(true)
    const result = await sendDelete(id)
    if (result.kind === 'ok') {
      const state: DeletedState = { deleted: { title } }
      void navigate('/catalog', { replace: true, state })
      return { ok: true }
    }
    setDeleting(false)
    return { ok: false, message: result.message }
  }

  const finishDialog = finishingId === bookId && (
    <FinishDialog bookId={bookId} onCancel={cancelFinish} onFinishedHere={onFinishedHere} />
  )
  let content
  // While the delete is out, any non-ready view (missing, or a failed refetch) renders nothing.
  if (view.status === 'loading' || (deleting && view.status !== 'ready')) content = null
  else if (view.status === 'missing') content = <NotFoundPage />
  else if (view.status === 'failed') content = <FailedBook retry={view.retry} />
  else
    content = (
      <BookDetail
        key={view.data.id}
        book={view.data}
        onDelete={onDelete}
        onFinish={() => setFinishingId(bookId)}
        finishButton={finishButton}
      />
    )
  return (
    <>
      {content}
      {finishDialog}
    </>
  )
}
