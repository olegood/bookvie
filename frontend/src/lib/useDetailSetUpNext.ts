// Set as Up next on Book detail (EXPERIENCE.md → Book detail actions): any
// Book that is neither Main nor already Up next, through the one-click flow
// (`useOneClickFlow`) sending `set-up-next`. While another Book is Up next
// the button carries the hint "Replaces the current Up next.". Once the
// refetched view shows the Book as Up next, focus goes to the owner's
// `fallback` (the primary, else the `h1`), then `status` says so.

import { useCallback, useEffect, useId, useRef, useState, type RefCallback, type RefObject } from 'react'
import { useHomeView, useSetUpNext, type BookDetailView } from '../api/index.ts'
import { announce } from './announce.ts'
import { detailOffersSetUpNext, upNextStatus } from './setUpNext.ts'
import { useOneClickFlow } from './useOneClickFlow.ts'

type Options = {
  /** The Book on the page. */
  book: BookDetailView
  /** The primary, else the `h1`: focus goes there on success, and on a refusal that removed the button. */
  fallback: () => HTMLElement | null
}

type DetailSetUpNext = {
  /** The Book offers Set as Up next. */
  offered: boolean
  /** The button: a failure keeps focus there. */
  button: RefObject<HTMLButtonElement | null>
  /** The button's press: notes the hint, then requests. */
  press: () => void
  /** A request is out. */
  busy: boolean
  /** The last request failed: the slot holds the `alert` line. */
  failed: boolean
  /** The slot for the live regions, rendered directly below the button. */
  regionSlot: RefCallback<HTMLDivElement>
  /** The hint shows under the button, as its description. */
  showHint: boolean
  /** The hint's id. */
  hintId: string
}

export function useDetailSetUpNext({ book, fallback: primaryOrHeading }: Options): DetailSetUpNext {
  // Set as Up next: any Book that is neither Main nor already Up next. Once
  // the refetched view shows it as Up next, focus goes to its primary (the
  // `h1` if none), then `status` says so.
  const offersSetUpNext = detailOffersSetUpNext(book.role)
  const setUpNextButton = useRef<HTMLButtonElement>(null)
  // The line to say, and the role the Book had when it was pressed.
  const setUpNextLine = useRef<{ line: string; from: BookDetailView['role'] } | null>(null)
  const [setUpNexts, setSetUpNexts] = useState(0)
  const role = book.role
  const onSet = useCallback(
    (title: string) => {
      setUpNextLine.current = { line: upNextStatus(title), from: role }
      setSetUpNexts((count) => count + 1)
    },
    [role],
  )
  const sendSetUpNext = useSetUpNext()
  const {
    request: requestSetUpNext,
    busy: settingUpNext,
    failed: setUpNextFailed,
    regionSlot: setUpNextSlot,
  } = useOneClickFlow({ opener: setUpNextButton, fallback: primaryOrHeading, onDone: onSet, send: sendSetUpNext })
  // The hint, kept as it was while the request is out: the refetch makes this Book the Up next before it resolves.
  const home = useHomeView()
  const hasUpNext = home.status === 'ready' && home.data.upNext !== null
  const [hintAtPress, setHintAtPress] = useState(false)
  const showSetUpNextHint = offersSetUpNext && (settingUpNext ? hintAtPress : hasUpNext)
  const setUpNextHintId = useId()

  // `sendIntent` resolves after the refetch, but the view may render it a
  // tick later: while the Book keeps the role it had, wait. Any other view
  // settles the line, said only if it shows the Book as Up next.
  useEffect(() => {
    const pending = setUpNextLine.current
    if (pending === null || book.role === pending.from) return
    setUpNextLine.current = null
    if (book.role !== 'upNext') return
    primaryOrHeading()?.focus()
    announce('status', pending.line)
    // The deps are the settle's triggers only; the focus target is read as it settles.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [setUpNexts, book.role])

  const press = () => {
    if (!settingUpNext) setHintAtPress(hasUpNext)
    requestSetUpNext({ id: book.id, title: book.title })
  }

  return {
    offered: offersSetUpNext,
    button: setUpNextButton,
    press,
    busy: settingUpNext,
    failed: setUpNextFailed,
    regionSlot: setUpNextSlot,
    showHint: showSetUpNextHint,
    hintId: setUpNextHintId,
  }
}
