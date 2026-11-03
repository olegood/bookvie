import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useBookView, useCatalogView, useDeleteBook, type BookDetailView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import ChangeColor from '../components/ChangeColor.tsx'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import {
  coverSrc,
  metadata,
  panelCover,
  readingLines,
  roleLine,
  toPanelFields,
  type DeletedState,
} from '../lib/bookDetail.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
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

function BookDetail({ book, onDelete }: { book: BookDetailView; onDelete: DeleteBook }) {
  usePageTitle(book.title)
  const catalog = useCatalogView()
  const tags = catalog.status === 'ready' ? catalog.data.tags : NO_TAGS
  const [editing, setEditing] = useState(false)
  const readings = readingLines(book.readings)
  const readingsId = useId()
  const colorId = useId()
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
          {book.coverFile !== null ? (
            <img
              className={styles.cover}
              src={coverSrc(book.coverFile)}
              alt={`Cover of ${book.title}`}
              width={200}
              height={300}
            />
          ) : (
            // DESIGN.md → No-cover placeholder: not interactive; the title is beside it.
            <div className={styles.noCover} role="img" aria-label="No cover">
              <span className={styles.titleBar} />
              <span className={`${styles.titleBar} ${styles.titleBarShort}`} />
            </div>
          )}
          <div className={styles.actions}>
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
          <section className={styles.block} aria-labelledby={readingsId}>
            <h2 id={readingsId} className={styles.blockLabel}>
              Readings
            </h2>
            {readings.length === 0 ? (
              <p className={styles.none}>Not read yet.</p>
            ) : (
              <ul className={styles.readings}>
                {readings.map((reading) => (
                  <li key={reading.id}>{reading.text}</li>
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
 * (**Edit**, then **Delete**); the Book on the right. An unknown id shows
 * the not-found page. The title is set by the child that renders, never
 * here: child effects run first, so a title set here would overwrite the
 * not-found page's.
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

  const onDelete: DeleteBook = async (id, title) => {
    setDeleting(true)
    const result = await sendDelete(id)
    if (result.kind === 'ok') {
      const state: DeletedState = { deleted: { title } }
      void navigate('/', { replace: true, state })
      return { ok: true }
    }
    setDeleting(false)
    return { ok: false, message: result.message }
  }

  // While the delete is out, any non-ready view (missing, or a failed refetch) renders nothing.
  if (view.status === 'loading' || (deleting && view.status !== 'ready')) return null
  if (view.status === 'missing') return <NotFoundPage />
  if (view.status === 'failed') return <FailedBook retry={view.retry} />
  return <BookDetail key={view.data.id} book={view.data} onDelete={onDelete} />
}
