import { useId, useLayoutEffect, useRef, type FormEvent, type ReactNode, type RefObject } from 'react'
import { adoptRegions, releaseRegions } from '../lib/announce.ts'
import styles from './SidePanel.module.css'

type Props = {
  /** The heading, which is also the dialog's accessible name. */
  title: string
  /** Cancel, Close (×) and Esc all call this; the owner unmounts the panel. */
  onClose: () => void
  onSubmit: () => void
  /** The field that takes focus on open. */
  initialFocus: RefObject<HTMLElement | null>
  /** The footer's buttons. */
  footer: ReactNode
  /**
   * Shows the `alert` region as a line in ink above the footer buttons, for an
   * outcome that has no field to point at (couldn't save, or a refusal whose
   * fields the form doesn't know).
   */
  showAlert?: boolean
  children: ReactNode
}

/**
 * A modal side panel (DESIGN.md → Side panel): a native `<dialog>` opened with
 * `showModal()`, anchored to the right, with a sticky footer. It is open for
 * as long as it is mounted. While open it holds the shell's live regions, so
 * they are not inert; on close they go back to the body and focus returns to
 * the element that opened it.
 */
export default function SidePanel({ title, onClose, onSubmit, initialFocus, footer, showAlert, children }: Props) {
  const headingId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const body = useRef<HTMLFormElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const regionSlot = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!element.open) element.showModal()
    if (regionSlot.current) adoptRegions(regionSlot.current)
    initialFocus.current?.focus()
    return () => {
      releaseRegions()
      if (element.open) element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [initialFocus])

  // scroll-padding-bottom follows the footer, so a focused field is never under it.
  useLayoutEffect(() => {
    const form = body.current
    const foot = footerRef.current
    if (!form || !foot) return
    const update = () => {
      form.style.scrollPaddingBottom = `${foot.offsetHeight}px`
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(foot)
    return () => observer.disconnect()
  }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <dialog
      ref={dialog}
      className={styles.panel}
      aria-labelledby={headingId}
      onCancel={(event) => {
        // Esc: the owner closes (unmounts) the panel.
        event.preventDefault()
        onClose()
      }}
      // A native close that skips `cancel` (the close-watcher rule) must
      // still reach the owner; after the owner's own close it is unmounted.
      // A queued close that lands after a reopen (StrictMode re-runs the
      // effect: close, then showModal) is stale and ignored.
      onClose={(event) => {
        if (!event.currentTarget.open) onClose()
      }}
    >
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <form ref={body} className={styles.body} noValidate onSubmit={submit}>
        <div className={styles.fields}>{children}</div>
        <div ref={footerRef} className={styles.footer}>
          <div ref={regionSlot} className={styles.regions} data-show-alert={showAlert ? 'true' : undefined} />
          <div className={styles.actions}>{footer}</div>
        </div>
      </form>
    </dialog>
  )
}
