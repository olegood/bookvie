// Mark as Side read / Remove from side on Book detail (Story 4.7): any Book
// but the Main book, through the one-click flow (`useOneClickFlow`) sending
// `mark-side-read` or `unmark-side-read`. At 3 Side reads (`sideReadsFull`)
// Mark as Side read stays focusable with the hint "Up to 3 side reads." as
// its reason. Once the refetched view shows the flip, focus goes to the
// owner's `fallback` (the primary, else the `h1`), then `status` says where
// the Book is.

import { useCallback, useEffect, useRef, useState, type RefCallback, type RefObject } from 'react'
import { useMarkSideRead, useUnmarkSideRead, type BookDetailView } from '../api/index.ts'
import { announce } from './announce.ts'
import {
  detailOffersSideRead,
  MARKING_SIDE_READ,
  REMOVING_FROM_SIDE,
  SIDE_READS_FULL_HINT,
  sideReadStatus,
} from './sideRead.ts'
import { useOneClickFlow } from './useOneClickFlow.ts'

type Options = {
  /** The Book on the page. */
  book: BookDetailView
  /** The primary, else the `h1`: focus goes there on success, and on a refusal that removed the button. */
  fallback: () => HTMLElement | null
}

type DetailSideRead = {
  /** The Book offers Mark as Side read or Remove from side. */
  offered: boolean
  /** The button: a failure keeps focus there. */
  button: RefObject<HTMLButtonElement | null>
  /** The button's press: ignored while a request is out. */
  press: () => void
  /** A request is out. */
  busy: boolean
  /** The last request failed: the slot holds the `alert` line. */
  failed: boolean
  /** The slot for the live regions, rendered directly below the button. */
  regionSlot: RefCallback<HTMLDivElement>
  /** Why a press does nothing (a request is out, or 3 Side reads), else `undefined`. */
  reason: string | undefined
}

export function useDetailSideRead({ book, fallback: primaryOrHeading }: Options): DetailSideRead {
  // Mark as Side read / Remove from side: any Book but the Main book (Story
  // 4.7), at once through the same one-click flow. Once the refetched view
  // shows the flip, focus goes to the primary (the `h1` if none), then
  // `status` says where the Book is.
  const offersSideRead = detailOffersSideRead(book.role)
  const sideReadButton = useRef<HTMLButtonElement>(null)
  const markSideRead = useMarkSideRead()
  const unmarkSideRead = useUnmarkSideRead()
  const sideRead = book.sideRead
  // The Book's `sideRead` when pressed: the view is waited on until it flips.
  const sideReadFrom = useRef<boolean | null>(null)
  const sideReadTitle = useRef('')
  const [sideReadToggles, setSideReadToggles] = useState(0)
  const onSideReadSet = useCallback(
    (title: string) => {
      sideReadFrom.current = sideRead
      sideReadTitle.current = title
      setSideReadToggles((count) => count + 1)
    },
    [sideRead],
  )
  const {
    request: requestSideRead,
    busy: togglingSideRead,
    failed: sideReadFailed,
    regionSlot: sideReadSlot,
  } = useOneClickFlow({
    opener: sideReadButton,
    fallback: primaryOrHeading,
    onDone: onSideReadSet,
    send: sideRead ? unmarkSideRead : markSideRead,
  })
  let sideReadReason: string | undefined
  if (togglingSideRead) sideReadReason = sideRead ? REMOVING_FROM_SIDE : MARKING_SIDE_READ
  else if (book.sideReadsFull) sideReadReason = SIDE_READS_FULL_HINT

  useEffect(() => {
    const from = sideReadFrom.current
    if (from === null || book.sideRead === from) return
    sideReadFrom.current = null
    primaryOrHeading()?.focus()
    announce('status', sideReadStatus(sideReadTitle.current, book.sideRead))
    // The deps are the settle's triggers only; the focus target is read as it settles.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [sideReadToggles, book.sideRead])

  return {
    offered: offersSideRead,
    button: sideReadButton,
    press: () => requestSideRead({ id: book.id, title: book.title }),
    busy: togglingSideRead,
    failed: sideReadFailed,
    regionSlot: sideReadSlot,
    reason: sideReadReason,
  }
}
