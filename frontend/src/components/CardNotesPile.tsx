import { type KeyboardEvent, useId, useRef, useState } from 'react'
import type { BookCardNote } from '../api/index.ts'
import {
  PILE_AT_FIRST,
  PILE_AT_LAST,
  pageRef,
  pileAnnouncement,
  pilePosition,
  pileStart,
  shuffled,
} from '../lib/cardNotes.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import styles from './CardNotesPile.module.css'

type Order = 'page' | 'shuffled'

const ORDERS: readonly { value: Order; label: string }[] = [
  { value: 'page', label: 'Page order' },
  { value: 'shuffled', label: 'Shuffled' },
]

/** The index a pile key goes to, or undefined for a key the pile doesn't handle. */
function keyTarget(key: string, index: number, total: number): number | undefined {
  switch (key) {
    case 'ArrowLeft':
      return index - 1
    case 'ArrowRight':
      return index + 1
    case 'Home':
      return 0
    case 'End':
      return total - 1
    default:
      return undefined
  }
}

type Props = {
  /** The Book's title, in the pile's name: "Card notes pile, *X*". */
  title: string
  /** Every note of the Book, in the server's page order, whatever search is active. Not empty. */
  notes: readonly BookCardNote[]
  /** The note to open at, in Page order; the first when absent. */
  startNoteId?: string
  /** Close or Esc, with the id of the note last shown. */
  onClose: (lastNoteId: string) => void
}

/**
 * The Card notes pile (DESIGN.md / EXPERIENCE.md → Pile; Story 5.4): a modal
 * `dialog` on `page` over the scrim, named by its `h2` "Card notes pile, *X*",
 * with **Close** at the top right. One note at a time as a `card-note` in
 * `pile-text` with a faint stacked edge; then Previous · "N of M" · Next, with
 * no wrap (an end stays focusable with `aria-disabled="true"`); then the
 * "Order" radio group, Page order (checked at open) · Shuffled. A change of
 * order restarts at "1 of M"; Shuffled shuffles once per change
 * (`Math.random`). Each move sets the pile's own polite `status` to "Note N of
 * M, *ref*: *text*" in the same render; the shell's regions stay where they
 * are. Read-only: no search, no fields, no Edit. Next takes focus on open.
 *
 * Keys (spec-pile-arrow-key-navigation): Left and Right do what Previous and
 * Next do (the same `move`, announcement and no-wrap ends); Home and End go to
 * the first and last note. They work wherever focus is in the pile except on
 * the Order radios, which keep their native arrow keys (Home and End do
 * nothing there, and are `preventDefault`-ed); a key held with Alt,
 * Ctrl, Meta or Shift is left to the browser. Focus stays put, a handled key
 * is `preventDefault`-ed even at an end, and Previous and Next carry
 * `aria-keyshortcuts`. No on-screen hint.
 */
export default function CardNotesPile({ title, notes, startNoteId, onClose }: Props) {
  const headingId = useId()
  const noteId = useId()
  const positionId = useId()
  const orderLabelId = useId()
  const radioName = useId()
  const [order, setOrder] = useState<Order>('page')
  const [sequence, setSequence] = useState<readonly BookCardNote[]>(notes)
  const [index, setIndex] = useState(() => pileStart(notes, startNoteId))
  const [spoken, setSpoken] = useState('')
  const nextButton = useRef<HTMLButtonElement>(null)

  const total = sequence.length
  const note = sequence[Math.min(index, total - 1)]
  const close = () => {
    if (note) onClose(note.id)
  }
  const { dialog, dialogProps } = useAlertDialog({
    onDismiss: close,
    initialFocus: nextButton,
    role: 'dialog',
    adoptRegions: false,
  })

  const move = (to: number) => {
    const target = sequence[to]
    if (!target) return
    setIndex(to)
    setSpoken(pileAnnouncement(to + 1, total, target))
  }

  const pickOrder = (next: Order) => {
    if (next === order) return
    setOrder(next)
    setSequence(next === 'shuffled' ? shuffled(notes) : notes)
    setIndex(0)
    setSpoken('')
  }

  const stepByKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    dialogProps.onKeyDown(event)
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    const to = keyTarget(event.key, index, total)
    if (to === undefined) return
    if (target instanceof HTMLInputElement && target.type === 'radio') {
      // The radios keep their native arrow keys. Home and End do nothing there, not even scroll the dialog.
      if (event.key === 'Home' || event.key === 'End') event.preventDefault()
      return
    }
    event.preventDefault()
    if (to !== index && sequence[to]) move(to)
  }

  const atFirst = index <= 0
  const atLast = index >= total - 1

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      onKeyDown={stepByKey}
      className={styles.pile}
      aria-labelledby={headingId}
      // The note shown and its place, read as the description on open (the status stays empty then).
      aria-describedby={`${noteId} ${positionId}`}
    >
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          Card notes pile, <em className={styles.title}>{title}</em>
        </h2>
        <Button onClick={close}>Close</Button>
      </div>
      {note && (
        <div id={noteId} className={styles.card}>
          <p className={styles.text}>{note.text}</p>
          <p className={styles.ref}>{pageRef(note.pageStart, note.pageEnd)}</p>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          className={styles.step}
          disabledReason={atFirst ? PILE_AT_FIRST : undefined}
          aria-keyshortcuts="ArrowLeft"
          onClick={() => move(index - 1)}
        >
          Previous
        </Button>
        <span id={positionId} className={styles.position}>
          {pilePosition(index + 1, total)}
        </span>
        <Button
          ref={nextButton}
          className={styles.step}
          disabledReason={atLast ? PILE_AT_LAST : undefined}
          aria-keyshortcuts="ArrowRight"
          onClick={() => move(index + 1)}
        >
          Next
        </Button>
      </div>
      <div className={styles.order}>
        <span id={orderLabelId} className={styles.orderLabel}>
          Order
        </span>
        <div role="radiogroup" aria-labelledby={orderLabelId} className={styles.segments}>
          {ORDERS.map((option) => (
            <label key={option.value} className={styles.segment}>
              <input
                type="radio"
                name={radioName}
                value={option.value}
                checked={order === option.value}
                onChange={() => pickOrder(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <div role="status" aria-live="polite" className="visuallyHidden">
        {spoken}
      </div>
    </dialog>
  )
}
