// Pause, from the Main book card's "⋯" menu or from Book detail
// (EXPERIENCE.md → Pause). A press first fetches the home view (a cached
// copy may predate another tab's change of the Main book or Up next) and
// decides from that: with an Up next, it opens the Confirm dialog, which
// states where the displaced Up next goes first (FR-7); without one, or when
// the Book isn't Main any more, it sends `pause` at once (a stale tab's
// `not_main_book` refusal then takes the refusal path below). Nothing shows while
// that fetch is out; when it fails, nothing is sent and the couldn't-save
// line shows below the opener. Either way the owner moves focus and
// announces once the refetched views have rendered (`onPaused`).
//
// A refusal from a stale tab (another tab already paused or finished the
// Book) refetches views in which the Book isn't Main, so the opener goes.
// Focus then moves to the owner's `fallback` (its Resume), and the `alert`
// line shows in the slot the owner renders below it.

import { useEffect, useRef, useState, type ReactNode, type RefCallback, type RefObject } from 'react'
import { COULDNT_SAVE_MESSAGE, useFetchFreshHomeView, usePause, type HomeUpNext } from '../api/index.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { announce, clearAnnouncements } from './announce.ts'
import { displacementLine, pauseHeading } from './pause.ts'
import { useAlertSlot, useIntentRequest } from './useIntentRequest.ts'

export const PAUSING = 'Pausing the book.'

/** The Main book as the opener shows it: the server's page and percent (AD-6). */
export type PauseBook = { id: string; title: string; currentPage: number; percent: number }

type Options = {
  /** The Main book, or `null` when this opener has none to pause. */
  book: PauseBook | null
  /** The button the press came from: Cancel, Esc and a failure keep focus there. */
  opener: RefObject<HTMLElement | null>
  /** Where focus goes when a refusal's refetch has taken the opener away (the page's Resume). */
  fallback: () => HTMLElement | null
  /** The pause of `paused` landed and the views have refetched: the owner focuses, then announces. */
  onPaused: (paused: PauseBook) => void
}

type PauseFlow = {
  /** The opener's press: ignored while its home view check or a request is out. */
  request: () => void
  /** A request is out on the immediate path (no dialog). */
  busy: boolean
  /** The immediate path failed: the slot holds the `alert` line. */
  failed: boolean
  /**
   * The slot for the live regions, rendered directly below the opener and,
   * once a refusal's refetch has removed the opener, below the fallback.
   * Attach it to one element at a time; it adopts the regions after a failure.
   */
  regionSlot: RefCallback<HTMLDivElement>
  /** The Confirm dialog while it is open, else `null`. */
  dialog: ReactNode
}

type Confirming = { book: PauseBook; upNext: HomeUpNext }

/**
 * An immediate-path failure for the Main book `bookId`. `refused`: the server
 * refused it (a stale tab), so the Book leaving Main is that refusal's
 * refetch and the line follows to the fallback (`moved`). A couldn't-save
 * line instead goes once the Book stops being Main for any other reason.
 */
type Failure = { bookId: string; refused: boolean; moved: boolean }

export function usePauseFlow({ book, opener, fallback, onPaused }: Options): PauseFlow {
  const fetchHome = useFetchFreshHomeView()
  const sendPause = usePause()
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const { isInFlight, run } = useIntentRequest()
  // The press's home view check is out: further presses are ignored, as in flight.
  const checking = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const fallbackRef = useRef(fallback)
  fallbackRef.current = fallback
  // Set when the dialog is cancelled, so focus returns to the opener once it has unmounted.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) opener.current?.focus()
  }, [refocus, opener])

  const bookId = book?.id ?? null
  const failed = failure !== null && (failure.moved || failure.bookId === bookId)

  // The Main book changed after a failure. A refusal's refetch took the Book
  // out of Main: focus moves to the fallback (unless the user has moved on)
  // and the line follows it. If another Book is Main now, the line stays
  // below its opener. A couldn't-save line goes, and so does a moved line
  // once there is a Main book again.
  useEffect(() => {
    if (failure === null) return
    if (failure.moved) {
      if (bookId !== null) setFailure(null)
      return
    }
    if (failure.bookId === bookId) return
    if (!failure.refused) setFailure(null)
    else if (bookId !== null) setFailure({ bookId, refused: false, moved: false })
    else {
      setFailure({ ...failure, moved: true })
      const active = document.activeElement
      if (active === null || active === document.body || !opener.current?.isConnected) fallbackRef.current()?.focus()
    }
  }, [bookId, failure, opener])

  // After an immediate-path failure the live regions sit in the slot, so the
  // alert line shows there; they go back on the next press, when the line
  // goes, or when the slot unmounts.
  const regionSlot = useAlertSlot(failed)

  const send = async (target: PauseBook, withDialog: boolean): Promise<void> => {
    const result = await run(
      () => {
        if (withDialog) {
          setShowAlert(false)
          setDialogBusy(true)
        } else {
          setBusy(true)
        }
      },
      () => sendPause(target.id),
    )
    if (result === null) return // unmounted: run already announced a failure
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
      setFailure({ bookId: target.id, refused: result.kind === 'refusal', moved: false })
      opener.current?.focus()
    }
    announce('alert', result.message)
  }

  const decide = async (pressed: PauseBook): Promise<void> => {
    checking.current = true
    const home = await fetchHome()
    checking.current = false
    if (!mounted.current) return
    if (home === null) {
      // Nothing was sent: say so below the opener with focus kept there.
      setFailure({ bookId: pressed.id, refused: false, moved: false })
      opener.current?.focus()
      announce('alert', COULDNT_SAVE_MESSAGE)
      return
    }
    const main = home.mainBook
    // No longer Main: send anyway, so the server's refusal takes the stale-tab path.
    if (main === null || main.id !== pressed.id) {
      void send(pressed, false)
      return
    }
    const target: PauseBook = { id: main.id, title: main.title, currentPage: main.currentPage, percent: main.percent }
    const upNext = home.upNext
    // The Main book is never Up next, so any Up next is displaced.
    if (upNext !== null && upNext.id !== target.id) {
      setShowAlert(false)
      setConfirming({ book: target, upNext })
      return
    }
    void send(target, false)
  }

  const request = () => {
    if (isInFlight() || checking.current || book === null) return
    setFailure(null)
    void decide(book)
  }

  const cancel = () => {
    if (isInFlight()) return
    // A couldn't-save line must not outlive the dialog.
    clearAnnouncements()
    setConfirming(null)
    setRefocus((count) => count + 1)
  }

  const confirm = () => {
    if (isInFlight() || confirming === null) return
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
