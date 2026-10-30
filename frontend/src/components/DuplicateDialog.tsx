import { Fragment, useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { DuplicateMatch } from '../api/index.ts'
import { adoptRegions, clearAnnouncements, releaseRegions } from '../lib/announce.ts'
import Button from './Button.tsx'
import styles from './DuplicateDialog.module.css'

// The description names this many matches, then "and N more".
const NAMED = 3

type Props = {
  /** The matching Books from the `duplicate_book` refusal, in catalog order. */
  duplicates: DuplicateMatch[]
  /** The server's message, shown only if no matches came with the refusal. */
  message: string
  /** Don't add, and Esc: the owner unmounts the dialog. */
  onDontAdd: () => void
  /** Add anyway: the owner unmounts the dialog and resends. */
  onAddAnyway: () => void
}

function separator(index: number, count: number): string {
  if (index === 0) return ''
  return index === count - 1 ? ' and ' : ', '
}

/** "Already in your catalog: *A* by X (ISBN …), *B* by Y and *C* by Z, and N more." */
function describe(duplicates: DuplicateMatch[]): ReactNode {
  const named = duplicates.slice(0, NAMED)
  const more = duplicates.length - named.length
  return (
    <>
      Already in your catalog:{' '}
      {named.map((match, index) => (
        <Fragment key={index}>
          {separator(index, named.length)}
          <span className={styles.title}>{match.title}</span>
          {` by ${match.authors.join('; ')}`}
          {match.isbn !== null && ` (ISBN ${match.isbn})`}
        </Fragment>
      ))}
      {more > 0 ? `, and ${more} more.` : '.'}
    </>
  )
}

/**
 * The Duplicate dialog (DESIGN.md → Duplicate dialog): an `alertdialog`
 * "Possible duplicate" stacked over the New book panel, a native `<dialog>`
 * opened with `showModal()` for as long as it is mounted, so the panel behind
 * is inert. **Don't add** comes first and takes focus; Esc acts as it. While
 * open it holds the live regions; on close they go back to the panel.
 */
export default function DuplicateDialog({ duplicates, message, onDontAdd, onAddAnyway }: Props) {
  const headingId = useId()
  const descriptionId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const regionSlot = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!element.open) element.showModal()
    const slot = regionSlot.current
    if (slot) adoptRegions(slot)
    clearAnnouncements()
    // Don't add is the first button: the default focus.
    element.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      if (slot) releaseRegions(slot)
      if (element.open) element.close()
    }
  }, [])

  // Tab and Shift+Tab cycle between the two buttons.
  const keepFocusInside = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
    const first = buttons[0]
    const last = buttons.at(-1)
    if (!first || !last) return
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      onKeyDown={keepFocusInside}
      onCancel={(event) => {
        // Esc acts as Don't add; the panel behind stays open.
        event.preventDefault()
        event.stopPropagation()
        onDontAdd()
      }}
      // A native close that skips `cancel` still reaches the owner; a queued
      // close that lands after a StrictMode reopen is stale and ignored.
      onClose={(event) => {
        event.stopPropagation()
        if (!event.currentTarget.open) onDontAdd()
      }}
    >
      <h2 id={headingId} className={styles.heading}>
        Possible duplicate
      </h2>
      <p id={descriptionId} className={styles.description}>
        {duplicates.length > 0 ? describe(duplicates) : message}
      </p>
      <div className={styles.actions}>
        <Button onClick={onDontAdd}>Don't add</Button>
        <Button variant="primary" onClick={onAddAnyway}>
          Add anyway
        </Button>
      </div>
      <div ref={regionSlot} />
    </dialog>
  )
}
