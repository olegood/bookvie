import { Fragment, useId, type ReactNode } from 'react'
import type { DuplicateMatch } from '../api/index.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import styles from './DuplicateDialog.module.css'

// The description names this many matches, then "and N more".
const NAMED = 3

/** The two buttons' labels, by the panel's mode (EXPERIENCE.md → Duplicate dialog). */
const LABELS = {
  new: { dismiss: "Don't add", confirm: 'Add anyway' },
  edit: { dismiss: "Don't save", confirm: 'Save anyway' },
} as const

type Props = {
  /** New book (Don't add · Add anyway) or Edit book (Don't save · Save anyway). */
  mode?: keyof typeof LABELS
  /** The matching Books from the `duplicate_book` refusal, in catalog order. */
  duplicates: DuplicateMatch[]
  /** The server's message, shown only if no matches came with the refusal. */
  message: string
  /** Don't add / Don't save, and Esc: the owner unmounts the dialog. */
  onDismiss: () => void
  /** Add anyway / Save anyway: the owner unmounts the dialog and resends. */
  onConfirm: () => void
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
 * "Possible duplicate" stacked over the New or Edit book panel, a native
 * `<dialog>` opened with `showModal()` for as long as it is mounted, so the
 * panel behind is inert. **Don't add** (**Don't save** in edit mode) comes
 * first and takes focus; Esc acts as it. While open it holds the live
 * regions; on close they go back to the panel.
 */
export default function DuplicateDialog({ mode = 'new', duplicates, message, onDismiss, onConfirm }: Props) {
  const labels = LABELS[mode]
  const headingId = useId()
  const descriptionId = useId()
  // Don't add / Don't save is the first button: the default focus.
  const { dialog, regionSlot, dialogProps } = useAlertDialog({ onDismiss })

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <h2 id={headingId} className={styles.heading}>
        Possible duplicate
      </h2>
      <p id={descriptionId} className={styles.description}>
        {duplicates.length > 0 ? describe(duplicates) : message}
      </p>
      <div className={styles.actions}>
        <Button onClick={onDismiss}>{labels.dismiss}</Button>
        <Button variant="primary" onClick={onConfirm}>
          {labels.confirm}
        </Button>
      </div>
      <div ref={regionSlot} />
    </dialog>
  )
}
