// The lifecycle every `alertdialog` shares (the Duplicate dialog, the Confirm
// dialog): a native `<dialog>` opened with `showModal()` for as long as it is
// mounted, so the page or panel behind is inert; the shell's live regions
// adopted into the dialog's region slot while it is open, and emptied on
// open; the default focus; Tab and Shift+Tab cycling between its buttons;
// Esc and any native close routed to `onDismiss`.

import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject, type SyntheticEvent } from 'react'
import { adoptRegions, clearAnnouncements, releaseRegions } from './announce.ts'

type Options = {
  /** Esc, or a native close that skipped `cancel`: the owner decides what closing means. */
  onDismiss: () => void
  /** The element that takes focus on open; by default the dialog's first button. */
  initialFocus?: RefObject<HTMLElement | null>
}

type AlertDialog = {
  dialog: RefObject<HTMLDialogElement | null>
  regionSlot: RefObject<HTMLDivElement | null>
  /** Spread onto the `<dialog>`. */
  dialogProps: {
    role: 'alertdialog'
    onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => void
    onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
    onClose: (event: SyntheticEvent<HTMLDialogElement>) => void
  }
}

// Tab and Shift+Tab cycle between the dialog's buttons.
function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>): void {
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

export function useAlertDialog({ onDismiss, initialFocus }: Options): AlertDialog {
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
      role: 'alertdialog',
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
