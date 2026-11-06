import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useFreshBookView, useHomeView, useStartReading, type BookDetailView, type HomeMainBook } from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import TextField from './TextField.tsx'
import styles from './StartDialog.module.css'

/** Router state Home reads after a confirmed start: focus goes to the Main book's title link. */
export type StartedState = { started: true }

const SAVING = 'Starting the book.'

type Props = {
  bookId: string
  /** Cancel, Esc, or the Book gone: the opener unmounts the dialog and takes focus back. */
  onCancel: () => void
}

type OpenProps = {
  book: BookDetailView
  /** The first `book` view fetched after opening: it decides Start or Resume and the prefill. */
  opened: BookDetailView
  /** The home view's Main book: the trade-off line's title, page and percent (AD-6). */
  mainBook: HomeMainBook | null
  onCancel: () => void
}

function OpenStartDialog({ book, opened, mainBook, onCancel }: OpenProps) {
  const headingId = useId()
  const tradeOffId = useId()
  const navigate = useNavigate()
  const sendStart = useStartReading()
  // Fixed at open: a later refetch (another tab made it Main meanwhile)
  // never flips Start to Resume.
  const [resume] = useState(opened.currentReading !== null)
  const [purpose, setPurpose] = useState(opened.currentReading?.purpose ?? '')
  const [busy, setBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const field = useRef<HTMLInputElement>(null)

  const dismiss = () => {
    if (inFlight.current) {
      // Esc is ignored in flight; a native close that slipped past `cancel` is undone.
      const element = dialog.current
      if (element && !element.open) {
        element.showModal()
        field.current?.focus()
      }
      return
    }
    // A couldn't-save line must not outlive the dialog.
    clearAnnouncements()
    onCancel()
  }
  const { dialog, regionSlot, dialogProps } = useAlertDialog({ onDismiss: dismiss, initialFocus: field, role: 'dialog' })

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    // Sent as typed: the server trims it, and stores null when nothing is left.
    const result = await sendStart(book.id, purpose)
    inFlight.current = false
    if (result.kind === 'ok') {
      const state: StartedState = { started: true }
      void navigate('/', { state })
      return
    }
    // Couldn't save, or a refusal (already Main from another tab): the dialog
    // stays open with the Purpose kept; the refetched views are already in.
    setBusy(false)
    setShowAlert(true)
    announce('alert', result.message)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void confirm()
  }

  const verb = resume ? 'Resume' : 'Start'
  const pauses = mainBook !== null && mainBook.id !== book.id ? mainBook : null
  const reason = busy ? SAVING : undefined

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={pauses ? tradeOffId : undefined}
    >
      <form onSubmit={submit}>
        <h2 id={headingId} className={styles.heading}>
          {verb} <span className={styles.bookTitle}>{book.title}</span>?
        </h2>
        {pauses && (
          <p id={tradeOffId} className={styles.tradeOff}>
            This pauses <span className={styles.bookTitle}>{pauses.title}</span>
            {` at p.${pauses.currentPage} (${pauses.percent}%).`}
          </p>
        )}
        <TextField
          ref={field}
          className={styles.field}
          label="Purpose (optional)"
          value={purpose}
          autoComplete="off"
          onChange={(event) => setPurpose(event.target.value)}
        />
        <div ref={regionSlot} className={styles.regions} data-show-alert={showAlert ? 'true' : undefined} />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabledReason={reason}>
            {resume ? 'Resume' : 'Start reading'}
          </Button>
          <Button disabledReason={reason} onClick={dismiss}>
            Cancel
          </Button>
        </div>
      </form>
    </dialog>
  )
}

/**
 * The Start dialog (DESIGN.md / EXPERIENCE.md → Start dialog): a modal
 * `dialog` headed "Start *X*?" (no current Reading, a re-read included) or
 * "Resume *X*?" (a paused one, its Purpose prefilled), *X* in the
 * book-title face. With another Main book *Y*, "This pauses *Y* at p.N
 * (P%)." from the home view's numbers. Then "Purpose (optional)", focused on
 * open; **Start reading** or **Resume**, and **Cancel**. Enter in the field
 * confirms.
 *
 * Confirming sends `start-reading` (the confirm button is `aria-disabled` in
 * flight) and goes to Home, which focuses the Main book's title link.
 * Couldn't save, or a refusal, keeps it open with the Purpose and shows the
 * `alert` line above the buttons. Cancel or Esc sends nothing.
 *
 * It reads the `book` and `home` views itself, so any opener (Book detail,
 * the spine popover) passes only the Book's id; it shows once both are in.
 */
export default function StartDialog({ bookId, onCancel }: Props) {
  // Fetched after opening, never a cached view of an earlier visit: another
  // tab or a restore may have paused or started it since (Start vs Resume,
  // the Purpose prefill).
  const book = useFreshBookView(bookId)
  const home = useHomeView()
  // Fixed from the first fresh view: a later refetch never flips Start to Resume.
  const [atOpen, setAtOpen] = useState<BookDetailView | null>(null)
  if (atOpen === null && book.status === 'ready') setAtOpen(book.data)
  const gone = book.status === 'missing' || book.status === 'failed' || home.status === 'failed'

  useEffect(() => {
    if (gone) onCancel()
  }, [gone, onCancel])

  if (book.status !== 'ready' || home.status !== 'ready') return null
  return <OpenStartDialog book={book.data} opened={atOpen ?? book.data} mainBook={home.data.mainBook} onCancel={onCancel} />
}
