import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  useFreshBookView,
  useHomeView,
  useStartReading,
  type BookDetailView,
  type HomeMainBook,
  type HomeUpNext,
} from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { pageRangeMessage, pageSavedCopy, parsePage } from '../lib/pageField.ts'
import { displacementOutcome } from '../lib/pause.ts'
import { detailPrimary } from '../lib/startReading.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import TextField from './TextField.tsx'
import styles from './StartDialog.module.css'

/**
 * Router state Home reads after a confirmed start: focus goes to the Main
 * book's title link. `reachedLastPage` (a Side read started at its last
 * page) also opens the Finish dialog for it, described by `savedLine`.
 */
export type StartedState = { started: true; reachedLastPage?: true; savedLine?: string }

const SAVING = 'Starting the book.'
const PAGE_FIELD = 'page'
/** The "Which page?" message when nothing is typed (the server's copy too). */
const PAGE_REQUIRED = 'Which page? is required.'

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
  /** The home view's Up next: the displacement line's *Z*, and whether it is paused or a Side read. */
  upNext: HomeUpNext | null
  onCancel: () => void
}

function OpenStartDialog({ book, opened, mainBook, upNext, onCancel }: OpenProps) {
  const headingId = useId()
  const tradeOffId = useId()
  const displacedId = useId()
  const navigate = useNavigate()
  const sendStart = useStartReading()
  // Fixed at open: a later refetch (another tab made it Main meanwhile)
  // never flips Start to Resume.
  // From the opener's one source (`lib/startReading.ts`); a Book already Main
  // when it opened (a stale opener) has a Reading in progress, so it resumes.
  const [resume] = useState(detailPrimary(opened) !== 'Start reading')
  const [purpose, setPurpose] = useState(opened.currentReading?.purpose ?? '')
  // A Side read asks "Which page?" (FR-8), fixed at open like Start vs Resume;
  // prefilled with the paused page, empty without one.
  const [asksPage] = useState(opened.sideRead)
  const [page, setPage] = useState(opened.currentReading !== null ? String(opened.currentReading.currentPage) : '')
  const [pageInvalid, setPageInvalid] = useState<string | null>(null)
  const pageField = useRef<HTMLInputElement>(null)
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
        ;(asksPage ? pageField : field).current?.focus()
      }
      return
    }
    // A couldn't-save line must not outlive the dialog.
    clearAnnouncements()
    onCancel()
  }
  const { dialog, regionSlot, dialogProps } = useAlertDialog({
    onDismiss: dismiss,
    initialFocus: asksPage ? pageField : field,
    role: 'dialog',
  })

  const showPageInvalid = (message: string) => {
    setPageInvalid(message)
    pageField.current?.focus()
    announce('alert', message)
  }

  const confirm = async () => {
    if (inFlight.current) return
    clearAnnouncements()
    setShowAlert(false)
    let sentPage: number | undefined
    if (asksPage) {
      // Checked here first; nothing is sent while the page is empty or out of range.
      const parsed = parsePage(page, book.pages)
      if (parsed === null) {
        // A number input holding text it can't parse reports '' (`badInput`): that's out of range, not empty.
        const empty = page.trim() === '' && !pageField.current?.validity.badInput
        showPageInvalid(empty ? PAGE_REQUIRED : pageRangeMessage(book.pages))
        return
      }
      sentPage = parsed
    }
    setPageInvalid(null)
    inFlight.current = true
    setBusy(true)
    // Sent as typed: the server trims it, and stores null when nothing is left.
    const result = await sendStart(book.id, purpose, sentPage)
    inFlight.current = false
    if (result.kind === 'ok') {
      const state: StartedState =
        result.reachedLastPage && sentPage !== undefined
          ? { started: true, reachedLastPage: true, savedLine: pageSavedCopy(sentPage, book.pages, 100) }
          : { started: true }
      void navigate('/', { state })
      return
    }
    setBusy(false)
    // A 422 on `page` (the page count changed meanwhile) shows on the field.
    const pageError = result.kind === 'refusal' ? result.fields.find((f) => f.field === PAGE_FIELD) : undefined
    if (pageError && asksPage) {
      showPageInvalid(pageError.message)
      return
    }
    // Couldn't save, or a refusal (already Main from another tab): the dialog
    // stays open with the Purpose kept; the refetched views are already in.
    setShowAlert(true)
    announce('alert', result.message)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void confirm()
  }

  const verb = resume ? 'Resume' : 'Start'
  const pauses = mainBook !== null && mainBook.id !== book.id ? mainBook : null
  // Only a pause displaces Up next, and never when *X* is itself Up next (FR-7).
  const displaced = pauses !== null && upNext !== null && upNext.id !== book.id ? upNext : null
  const describedBy = [pauses && tradeOffId, displaced && displacedId].filter(Boolean).join(' ')
  const reason = busy ? SAVING : undefined

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={describedBy || undefined}
    >
      <form onSubmit={submit} noValidate>
        <h2 id={headingId} className={styles.heading}>
          {verb} <span className={styles.bookTitle}>{book.title}</span>?
        </h2>
        {pauses && (
          <p id={tradeOffId} className={styles.tradeOff}>
            This pauses <span className={styles.bookTitle}>{pauses.title}</span>
            {` at p.${pauses.currentPage} (${pauses.percent}%).`}
          </p>
        )}
        {displaced && (
          <p id={displacedId} className={styles.tradeOff}>
            <span className={styles.bookTitle}>{displaced.title}</span>
            {` ${displacementOutcome(displaced)}`}
          </p>
        )}
        {asksPage && (
          <TextField
            ref={pageField}
            className={styles.pageField}
            label="Which page?"
            required
            type="number"
            inputMode="numeric"
            step={1}
            min={0}
            max={book.pages}
            value={page}
            autoComplete="off"
            error={pageInvalid ?? undefined}
            onChange={(event) => setPage(event.target.value)}
          />
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
 * (P%)." from the home view's numbers; and when that pause displaces an Up
 * next *Z* that isn't *X*, the line from `lib/pause.ts` that Pause's Confirm
 * dialog shows: "*Z* moves to Waiting for you." (*Z* has a paused Reading),
 * "*Z* stays on the side." (it has none and is a Side read) or "*Z* returns
 * to the catalog." (it has none and isn't), both lines named by
 * `aria-describedby`. For a Side read (the opened view's `sideRead`), a
 * required "Which page?" number field comes first, prefilled with the paused
 * page (empty without one) and focused on open; else "Purpose (optional)" is
 * focused on open. Then **Start reading** or **Resume**, and **Cancel**.
 * Enter in a field confirms.
 *
 * "Which page?" is checked before anything is sent: empty gives "Which
 * page? is required." and a value that isn't a whole number from 0 to the
 * page count "Page must be between 0 and N.", on the field with
 * `aria-invalid` and in `alert`, as a server 422 on `page` is shown. A start
 * at the last page (`reachedLastPage`) hands Home `reachedLastPage`, and
 * Home opens the Finish dialog for the new Main book.
 *
 * Confirming sends `start-reading` (the confirm button is `aria-disabled` in
 * flight) and goes to Home, which focuses the Main book's title link.
 * Couldn't save, or a refusal, keeps it open with the Purpose and shows the
 * `alert` line above the buttons. Cancel or Esc sends nothing.
 *
 * It reads the `book` and `home` views itself, so any opener (Book detail,
 * the spine popover, Home's Up next pane and empty Main book card) passes
 * only the Book's id; it shows once both are in.
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
  return (
    <OpenStartDialog
      book={book.data}
      opened={atOpen ?? book.data}
      mainBook={home.data.mainBook}
      upNext={home.data.upNext}
      onCancel={onCancel}
    />
  )
}
