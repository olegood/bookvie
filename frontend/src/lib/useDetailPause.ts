// Pause on Book detail (EXPERIENCE.md → Pause): the Main book only, through
// the pause flow (`usePauseFlow`). Once the refetched view makes the Book a
// paused Up next, focus goes to its **Resume** (the owner's primary) and
// then `status` says where it went.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefCallback, type RefObject } from 'react'
import type { BookDetailView } from '../api/index.ts'
import { announce } from './announce.ts'
import { pausedStatus } from './pause.ts'
import type { StartAction } from './startReading.ts'
import { usePauseFlow, type PauseBook } from './usePauseFlow.tsx'

type Options = {
  /** The Book on the page. */
  book: BookDetailView
  /** The page's primary action, or `null` for the Main book. */
  primary: StartAction | null
  /** The primary button: **Resume** once the Book is paused, where focus and a refusal's line go. */
  resume: RefObject<HTMLButtonElement | null>
}

type DetailPause = {
  /** The Book offers Pause: it is the Main book. */
  offered: boolean
  /** The button: Cancel, Esc and a failure keep focus there. */
  button: RefObject<HTMLButtonElement | null>
  /** The button's press. */
  request: () => void
  /** A request is out on the immediate path (no dialog). */
  busy: boolean
  /** The immediate path failed: the slot holds the `alert` line. */
  failed: boolean
  /** The slot for the live regions, rendered below Pause, or below Resume once a refusal has made the Book Up next. */
  regionSlot: RefCallback<HTMLDivElement>
  /** The Confirm dialog while it is open, else `null`. */
  dialog: ReactNode
}

export function useDetailPause({ book, primary, resume: startButton }: Options): DetailPause {
  const current = book.currentReading
  // Pause: the Main book only.
  const canPause = book.role === 'main'

  // Once the refetched view makes it a paused Up next, focus goes to its
  // Resume and then `status` says where it went.
  const pauseButton = useRef<HTMLButtonElement>(null)
  const pausedLine = useRef<string | null>(null)
  const [pauses, setPauses] = useState(0)
  const onPaused = useCallback((paused: PauseBook) => {
    pausedLine.current = pausedStatus(paused.title, paused.currentPage)
    setPauses((count) => count + 1)
  }, [])
  const {
    request: requestPause,
    busy: pausing,
    failed: pauseFailed,
    regionSlot: pauseSlot,
    dialog: pauseDialog,
  } = usePauseFlow({
    book:
      canPause && current !== null
        ? { id: book.id, title: book.title, currentPage: current.currentPage, percent: current.percent }
        : null,
    opener: pauseButton,
    fallback: () => startButton.current,
    onPaused,
  })

  // While the view still shows the Book as Main, the refetch hasn't rendered;
  // any other view settles the line, said only if it made the Book resumable.
  useEffect(() => {
    const line = pausedLine.current
    if (line === null || book.role === 'main') return
    pausedLine.current = null
    if (primary !== 'Resume') return
    startButton.current?.focus()
    announce('status', line)
  }, [pauses, book.role, primary, startButton])

  return {
    offered: canPause,
    button: pauseButton,
    request: requestPause,
    busy: pausing,
    failed: pauseFailed,
    regionSlot: pauseSlot,
    dialog: pauseDialog,
  }
}
