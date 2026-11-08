// Pause, from the Main book card's "⋯" menu or from Book detail
// (EXPERIENCE.md → Pause). A press sends `pause` at once when the home view
// has no Up next; with one, it opens the Confirm dialog, which states where
// the displaced Up next goes first (FR-7). Either way the owner moves focus
// and announces once the refetched views have rendered (`onPaused`).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useHomeView, usePause, type HomeUpNext } from '../api/index.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from './announce.ts'
import { displacementLine, pauseHeading } from './pause.ts'

export const PAUSING = 'Pausing the book.'

/** The Main book as the opener shows it: the server's page and percent (AD-6). */
export type PauseBook = { id: string; title: string; currentPage: number; percent: number }

type Options = {
  /** The Main book, or `null` when this opener has none to pause. */
  book: PauseBook | null
  /** The button the press came from: Cancel, Esc and a failure keep focus there. */
  opener: RefObject<HTMLElement | null>
  /** The pause of `paused` landed and the views have refetched: the owner focuses, then announces. */
  onPaused: (paused: PauseBook) => void
}

type PauseFlow = {
  /** The opener's press: ignored until the home view is in, and while a request is out. */
  request: () => void
  /** A request is out on the immediate path (no dialog). */
  busy: boolean
  /** The immediate path failed: the slot below the opener holds the `alert` line. */
  failed: boolean
  /** Rendered directly below the opener; it adopts the live regions after a failure. */
  regionSlot: RefObject<HTMLDivElement | null>
  /** The Confirm dialog while it is open, else `null`. */
  dialog: ReactNode
}

type Confirming = { book: PauseBook; upNext: HomeUpNext }

export function usePauseFlow({ book, opener, onPaused }: Options): PauseFlow {
  const home = useHomeView()
  const sendPause = usePause()
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [failed, setFailed] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const regionSlot = useRef<HTMLDivElement>(null)
  // Set when the dialog is cancelled, so focus returns to the opener once it has unmounted.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (refocus > 0) opener.current?.focus()
  }, [refocus, opener])

  // After an immediate-path failure the live regions sit in the slot below
  // the opener, so the alert line shows there; they go back on the next press
  // or when the slot goes (the Book stops being Main, so `book` is null).
  const holdsRegions = failed && book !== null
  useLayoutEffect(() => {
    const slot = regionSlot.current
    if (!holdsRegions || !slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [holdsRegions])

  const send = async (target: PauseBook, withDialog: boolean): Promise<void> => {
    inFlight.current = true
    clearAnnouncements()
    if (withDialog) {
      setShowAlert(false)
      setDialogBusy(true)
    } else {
      setBusy(true)
    }
    const result = await sendPause(target.id)
    inFlight.current = false
    if (!mounted.current) {
      if (result.kind !== 'ok') announce('alert', result.message)
      return
    }
    setBusy(false)
    setDialogBusy(false)
    if (result.kind === 'ok') {
      setConfirming(null)
      onPaused(target)
      return
    }
    // Couldn't save, or a refusal (a stale tab): nothing changed; say so in
    // the dialog above its buttons, or below the opener with focus kept there.
    if (withDialog) setShowAlert(true)
    else {
      setFailed(true)
      opener.current?.focus()
    }
    announce('alert', result.message)
  }

  const request = () => {
    if (inFlight.current || book === null || home.status !== 'ready') return
    setFailed(false)
    const upNext = home.data.upNext
    // The Main book is never Up next, so any Up next is displaced.
    if (upNext !== null && upNext.id !== book.id) {
      setShowAlert(false)
      setConfirming({ book, upNext })
      return
    }
    void send(book, false)
  }

  const cancel = () => {
    if (inFlight.current) return
    // A couldn't-save line must not outlive the dialog.
    clearAnnouncements()
    setConfirming(null)
    setRefocus((count) => count + 1)
  }

  const confirm = () => {
    if (inFlight.current || confirming === null) return
    void send(confirming.book, true)
  }

  const dialog =
    confirming === null ? null : (
      <ConfirmDialog
        heading={pauseHeading(confirming.book.title, confirming.book.currentPage, confirming.book.percent)}
        lines={[displacementLine(confirming.upNext)]}
        confirmLabel="Pause"
        busy={dialogBusy}
        busyReason={PAUSING}
        showAlert={showAlert}
        onConfirm={confirm}
        onCancel={cancel}
      />
    )

  return { request, busy, failed, regionSlot, dialog }
}
