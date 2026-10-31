import { useId, useRef, type ReactNode } from 'react'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import styles from './ConfirmDialog.module.css'

type Props = {
  /** States the consequence, e.g. "Delete Dune?". Also the dialog's accessible name. */
  heading: ReactNode
  /** The lines under the heading, in order; together the dialog's description. */
  lines: readonly ReactNode[]
  /** The confirm button, labelled with the action ("Delete book", "Pause", …). */
  confirmLabel: string
  /** A request is in flight: both buttons are `aria-disabled` and Esc is ignored. */
  busy?: boolean
  /** Why the buttons can't act while `busy`; read as their description. */
  busyReason?: string
  /** Shows the `alert` region as a line above the buttons (couldn't save). */
  showAlert?: boolean
  onConfirm: () => void
  /** Cancel and Esc: the owner unmounts the dialog and returns focus. */
  onCancel: () => void
}

/**
 * The Confirm dialog (DESIGN.md / EXPERIENCE.md → Confirm dialog): an
 * `alertdialog` whose heading states the consequence, then the confirm
 * button in `button-primary` and **Cancel** beside it. **Cancel** takes
 * focus; Esc acts as it. While open it holds the live regions, in a slot
 * above the buttons, so a couldn't-save line shows inside the dialog. Delete
 * book uses it now; Restore, Delete card note and Pause reuse it later.
 */
export default function ConfirmDialog({
  heading,
  lines,
  confirmLabel,
  busy = false,
  busyReason = 'Saving.',
  showAlert = false,
  onConfirm,
  onCancel,
}: Props) {
  const headingId = useId()
  const descriptionId = useId()
  const cancelButton = useRef<HTMLButtonElement>(null)
  const dismiss = () => {
    if (busy) {
      // Esc is ignored in flight; a native close that slipped past `cancel` is undone.
      const element = dialog.current
      if (element && !element.open) {
        element.showModal()
        // showModal() refocuses the first button; Cancel keeps the default focus.
        cancelButton.current?.focus()
      }
      return
    }
    onCancel()
  }
  const { dialog, regionSlot, dialogProps } = useAlertDialog({ onDismiss: dismiss, initialFocus: cancelButton })
  const reason = busy ? busyReason : undefined

  return (
    <dialog
      ref={dialog}
      {...dialogProps}
      className={styles.dialog}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <h2 id={headingId} className={styles.heading}>
        {heading}
      </h2>
      <div id={descriptionId} className={styles.description}>
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <div ref={regionSlot} className={styles.regions} data-show-alert={showAlert ? 'true' : undefined} />
      <div className={styles.actions}>
        <Button variant="primary" disabledReason={reason} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button ref={cancelButton} disabledReason={reason} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </dialog>
  )
}
