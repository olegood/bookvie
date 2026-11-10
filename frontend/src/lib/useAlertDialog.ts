// The lifecycle every modal dialog shares (the Duplicate dialog, the Confirm
// dialog, the Start dialog): a native `<dialog>` opened with `showModal()`
// for as long as it is mounted, so the page or panel behind is inert; the
// shell's live regions adopted into the dialog's region slot while it is
// open, and emptied on open; the default focus; Tab and Shift+Tab cycling
// between its buttons and fields; Esc and any native close routed to
// `onDismiss`. An `alertdialog` by default; the Start dialog, which holds a
// field, is a plain `dialog`.

import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject, type SyntheticEvent } from 'react'
import { adoptRegions, clearAnnouncements, releaseRegions } from './announce.ts'

type Options = {
  /** Esc, or a native close that skipped `cancel`: the owner decides what closing means. */
  onDismiss: () => void
  /** The element that takes focus on open; by default the dialog's first button. */
  initialFocus?: RefObject<HTMLElement | null>
  /** `alertdialog` (the default) or, for a dialog that holds a form field, `dialog`. */
  role?: 'alertdialog' | 'dialog'
}

type AlertDialog = {
  dialog: RefObject<HTMLDialogElement | null>
  regionSlot: RefObject<HTMLDivElement | null>
  /** Spread onto the `<dialog>`. */
  dialogProps: {
    role: 'alertdialog' | 'dialog'
    onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => void
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
    onClose: (event: SyntheticEvent<HTMLDialogElement>) => void
  }
}

// Tab and Shift+Tab cycle between the dialog's buttons and fields.
function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>): void {
  if (event.key !== 'Tab') return
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea'))
  const first = controls[0]
  const last = controls.at(-1)
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

export function useAlertDialog({ onDismiss, initialFocus, role = 'alertdialog' }: Options): AlertDialog {
  const dialog = useRef<HTMLDialogElement>(null)
  const regionSlot = useRef<HTMLDivElement>(null)
  // Read at open only: the default focus never moves while the dialog is up.
  const focusTarget = useRef(initialFocus)

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!element.open) element.showModal()
    const slot = regionSlot.current
    if (slot) adoptRegions(slot)
    clearAnnouncements()
    const target = focusTarget.current?.current ?? element.querySelector<HTMLButtonElement>('button')
    target?.focus()
    return () => {
      if (slot) releaseRegions(slot)
      if (element.open) element.close()
    }
  }, [])

  return {
    dialog,
    regionSlot,
    dialogProps: {
      role,
      onKeyDown: keepFocusInside,
      onCancel: (event) => {
        // Esc goes to the owner; whatever is behind (a panel) stays open.
        event.preventDefault()
        event.stopPropagation()
        onDismiss()
      },
      // A native close that skips `cancel` still reaches the owner; a queued
      // close that lands after a StrictMode reopen is stale and ignored.
      onClose: (event) => {
        event.stopPropagation()
        if (!event.currentTarget.open) onDismiss()
      },
    },
  }
}
