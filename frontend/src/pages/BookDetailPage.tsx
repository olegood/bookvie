import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useBookView, useCatalogView, useDeleteBook, type BookDetailView } from '../api/index.ts'
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
import { usePageTitle } from '../lib/page.ts'
import { detailPrimary } from '../lib/startReading.ts'
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
        <svg key={star} className={styles.star} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-filled={star <= rating ? 'true' : undefined}>
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

  // Mark finished: the Main book only (a non-Main finish is Story 4.5's).
  const canFinish = book.role === 'main'

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
            {canFinish && (
              <Button ref={finishButton} onClick={onFinish}>
                Mark finished
              </Button>
            )}
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
 * Main book — then **Mark finished** for the Main book, then **Edit**, then
 * **Delete**); the Book on the right. An unknown id shows
 * the not-found page. The title is set by the child that renders, never
 * here: child effects run first, so a title set here would overwrite the
 * not-found page's.
 *
 * The Current reading block (the Main book or a paused Book) shows the
 * status, the gauge and the Purpose with **Edit Purpose**; the server
 * supplies every number. The primary opens the Start dialog and **Mark
 * finished** the Finish dialog; Cancel or Esc returns focus to the opener.
 * The Readings block lists each Reading newest first: "Started … · Finished
 * …", its stars when rated, and "Purpose fulfilled: …" when answered.
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
    // The opener is gone when a refetch says the Book isn't Main any more (or is gone): park focus on `main`.
    const target = finishButton.current ?? document.getElementById('main')
    target?.focus()
  }, [finishRefocus])

  const cancelFinish = useCallback(() => {
    setFinishingId(null)
    setFinishRefocus((count) => count + 1)
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

  const finishDialog = finishingId === bookId && <FinishDialog bookId={bookId} onCancel={cancelFinish} />
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
