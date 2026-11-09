import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useFinishReading, useFreshBookView, type BookDetailView, type PurposeFulfilled } from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { PURPOSE_FULFILLED_LABELS, starsLabel } from '../lib/bookDetail.ts'
import { localIsoDate } from '../lib/today.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import TextField from './TextField.tsx'
import styles from './FinishDialog.module.css'

/**
 * Router state Home reads after a finish: focus goes to the "No Main book."
 * heading, and the finish moment plays once on the bookcase slice (Story
 * 3.7). Set only by this tab's successful `finish-reading`, never derived
 * from a view change (AD-7). `reread`: an earlier Reading was already
 * finished; `fromPercent`: where the Main fill stood when the dialog opened.
 */
export type FinishedState = { finished: true; bookId: string; title: string; reread: boolean; fromPercent: number }

const SAVING = 'Finishing the book.'
const FINISHED_ON = 'finishedOn'
const PURPOSE_FULFILLED = 'purposeFulfilled'
const RATING = 'rating'

const ANSWERS: readonly PurposeFulfilled[] = ['yes', 'partly', 'notYet']
const STARS = [1, 2, 3, 4, 5] as const

type FieldMessages = Partial<Record<typeof FINISHED_ON | typeof PURPOSE_FULFILLED | typeof RATING, string>>

type Props = {
  bookId: string
  /** Opened by a last-page save: its "Page M of M, 100%." line, kept as the dialog's description. */
  savedLine?: string
  /**
   * The Main fill's percentage as the opener shows it (Home's own view), for
   * the finish moment. The `book` view may be a cached one from an earlier
   * visit (only active views refetch after a save), so the opener's is used
   * when it has one.
   */
  fromPercent?: number
  /** Cancel, Esc, or the Book gone before it opened: the opener unmounts the dialog and takes focus back. */
  onCancel: () => void
  /**
   * Done for a Book that wasn't Main when the dialog opened (Story 4.5): the
   * opener stays where it is, unmounts the dialog, and moves focus and
   * announces. Without it, every finish goes Home.
   */
  onFinishedHere?: (title: string) => void
}

/** A star: filled (selected or lower) or an outline, so the shape changes, not only the color. */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={styles.star}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-filled={filled ? 'true' : undefined}
    >
      <path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OpenFinishDialog({
  book,
  savedLine,
  fromPercent,
  onCancel,
  onFinishedHere,
}: {
  book: BookDetailView
  savedLine?: string
  fromPercent?: number
  onCancel: () => void
  onFinishedHere?: (title: string) => void
}) {
  const headingId = useId()
  const savedId = useId()
  const fulfilledLabelId = useId()
  const fulfilledMessageId = useId()
  const ratingLabelId = useId()
  const ratingMessageId = useId()
  const radioName = useId()
  const navigate = useNavigate()
  const sendFinish = useFinishReading()
  // Fixed at open: a refetch (another tab finished it) never changes what is asked.
  const [purpose] = useState(book.currentReading?.purpose ?? null)
  const [finishedOn, setFinishedOn] = useState(() => localIsoDate(new Date()))
  const [fulfilled, setFulfilled] = useState<PurposeFulfilled | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [messages, setMessages] = useState<FieldMessages>({})
  const [busy, setBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const field = useRef<HTMLInputElement>(null)
  const fulfilledGroup = useRef<HTMLDivElement>(null)
  const ratingGroup = useRef<HTMLDivElement>(null)

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
  const { dialog, regionSlot, dialogProps } = useAlertDialog({
    onDismiss: dismiss,
    initialFocus: field,
    role: 'dialog',
  })

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    const result = await sendFinish(book.id, { finishedOn, purposeFulfilled: fulfilled, rating })
    inFlight.current = false
    if (result.kind === 'ok') {
      // Not Main when it opened: no finish moment, the opener stays (FR-14).
      if (book.role !== 'main' && onFinishedHere) {
        onFinishedHere(book.title)
        return
      }
      const state: FinishedState = {
        finished: true,
        bookId: book.id,
        title: book.title,
        reread: book.readings.some((reading) => reading.finishDate !== null),
        fromPercent: fromPercent ?? book.currentReading?.percent ?? 0,
      }
      void navigate('/', { state })
      return
    }
    setBusy(false)
    const fields = result.kind === 'refusal' ? result.fields : []
    const next: FieldMessages = {}
    for (const error of fields) {
      if (error.field === FINISHED_ON || error.field === PURPOSE_FULFILLED || error.field === RATING) {
        next[error.field] ??= error.message
      }
    }
    setMessages(next)
    announce('alert', result.message)
    if (Object.keys(next).length > 0) {
      // A field refusal: the message sits under its field, which takes focus.
      if (next.finishedOn) field.current?.focus()
      else if (next.purposeFulfilled) {
        const group = fulfilledGroup.current
        ;(group?.querySelector<HTMLInputElement>('input:checked') ?? group?.querySelector('input'))?.focus()
      } else ratingGroup.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
      return
    }
    // Couldn't save, or a 409 (finished or deleted in another tab): the line
    // above the buttons, every answer kept; the refetched views are already in.
    setShowAlert(true)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void confirm()
  }

  const reason = busy ? SAVING : undefined
  const fulfilledMessage = messages.purposeFulfilled
  const ratingMessage = messages.rating

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={savedLine ? savedId : undefined}
    >
      <form onSubmit={submit} noValidate>
        <h2 id={headingId} className={styles.heading}>
          Finished <span className={styles.bookTitle}>{book.title}</span>
        </h2>
        {savedLine && (
          <p id={savedId} className="visuallyHidden">
            {savedLine}
          </p>
        )}
        <TextField
          ref={field}
          className={styles.field}
          label="Finished on"
          type="date"
          value={finishedOn}
          error={messages.finishedOn}
          onChange={(event) => setFinishedOn(event.target.value)}
        />
        {purpose !== null && (
          <div className={styles.question}>
            <p className={styles.purpose}>{`“${purpose}”`}</p>
            <p id={fulfilledLabelId} className={styles.label}>
              Purpose fulfilled?
            </p>
            <div
              ref={fulfilledGroup}
              role="radiogroup"
              aria-labelledby={fulfilledLabelId}
              aria-describedby={fulfilledMessage ? fulfilledMessageId : undefined}
              aria-invalid={fulfilledMessage ? 'true' : undefined}
              className={styles.segmented}
            >
              {ANSWERS.map((answer) => (
                <label key={answer} className={styles.segment}>
                  <input
                    type="radio"
                    className={styles.radio}
                    name={`${radioName}-fulfilled`}
                    value={answer}
                    checked={fulfilled === answer}
                    onChange={() => setFulfilled(answer)}
                  />
                  {PURPOSE_FULFILLED_LABELS[answer]}
                </label>
              ))}
            </div>
            {fulfilledMessage && (
              <p id={fulfilledMessageId} className={styles.message}>
                {fulfilledMessage}
              </p>
            )}
          </div>
        )}
        <div className={styles.question}>
          <p id={ratingLabelId} className={styles.label}>
            Rating
          </p>
          <div
            ref={ratingGroup}
            role="radiogroup"
            aria-labelledby={ratingLabelId}
            aria-describedby={ratingMessage ? ratingMessageId : undefined}
            aria-invalid={ratingMessage ? 'true' : undefined}
            className={styles.rating}
          >
            <label className={styles.noRating}>
              <input
                type="radio"
                className={styles.radio}
                name={`${radioName}-rating`}
                value=""
                checked={rating === null}
                onChange={() => setRating(null)}
              />
              No rating
            </label>
            {STARS.map((stars) => (
              <label key={stars} className={styles.starOption}>
                <input
                  type="radio"
                  className={styles.radio}
                  name={`${radioName}-rating`}
                  value={stars}
                  checked={rating === stars}
                  onChange={() => setRating(stars)}
                />
                <Star filled={rating !== null && stars <= rating} />
                <span className="visuallyHidden">{starsLabel(stars)}</span>
              </label>
            ))}
          </div>
          {ratingMessage && (
            <p id={ratingMessageId} className={styles.message}>
              {ratingMessage}
            </p>
          )}
        </div>
        <div ref={regionSlot} className={styles.regions} data-show-alert={showAlert ? 'true' : undefined} />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabledReason={reason}>
            Done
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
 * The Finish dialog (DESIGN.md / EXPERIENCE.md → Finish dialog): a modal
 * `dialog` headed "Finished *X*", *X* in the book-title face, 440px.
 * **Finished on** (a date field prefilled with the local today, focused on
 * open); the Purpose quoted above "Purpose fulfilled?" (yes · partly · not
 * yet, none checked) only when the Reading has a Purpose; "Rating" ("No
 * rating", checked, then 1 to 5 stars, the selected and lower ones filled);
 * **Done** and **Cancel**.
 *
 * Done sends `finish-reading` (`aria-disabled` in flight; presses and Esc are
 * ignored) and, for the Main book, goes to Home, which plays the finish
 * moment and moves focus (Stories 3.6, 3.7, 4.1). For a Book that wasn't
 * Main when the dialog opened, an opener passing `onFinishedHere` keeps the
 * user where they are: Done calls it with the title instead, with no finish
 * moment and no `FinishedState` (Story 4.5). A
 * field refusal shows its message under the field; couldn't save or a 409
 * shows the `alert` line above the buttons, every answer kept. Cancel or Esc
 * sends nothing. Opened by a last-page save, its description is that save's
 * "Page M of M, 100%." line: opening empties the live regions, so this is
 * where a screen reader hears that the page itself was saved.
 *
 * It reads the `book` view itself, so an opener (the page field, Book detail)
 * passes only the Book's id; it shows once a view fetched after it opened is
 * in, and keeps that view when a later refetch says the Book is finished or gone.
 */
export default function FinishDialog({ bookId, savedLine, fromPercent, onCancel, onFinishedHere }: Props) {
  // Fetched after opening: a cached view of an earlier visit may predate a
  // restore or another tab's edit (the Purpose question and the re-read copy).
  const book = useFreshBookView(bookId)
  const [opened, setOpened] = useState<BookDetailView | null>(null)
  if (opened === null && book.status === 'ready') setOpened(book.data)
  const gone = opened === null && (book.status === 'missing' || book.status === 'failed')

  useEffect(() => {
    if (gone) onCancel()
  }, [gone, onCancel])

  if (opened === null) return null
  return (
    <OpenFinishDialog
      book={opened}
      savedLine={savedLine}
      fromPercent={fromPercent}
      onCancel={onCancel}
      onFinishedHere={onFinishedHere}
    />
  )
}
