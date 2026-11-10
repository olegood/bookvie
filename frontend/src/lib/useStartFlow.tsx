// The primary on Book detail (EXPERIENCE.md → Book detail actions): **Start
// reading** or **Resume** opens the Start dialog. Cancel or Esc returns focus
// to it once the dialog has unmounted; when a refetch has made the Book Main
// meanwhile, the opener is gone and focus parks on `main`.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import StartDialog from '../components/StartDialog.tsx'

type Options = {
  /** The Book the dialog starts or resumes. */
  bookId: string
}

type StartFlow = {
  /** The primary button: Cancel and Esc return focus there. */
  button: RefObject<HTMLButtonElement | null>
  /** The primary's press: opens the Start dialog. */
  open: () => void
  /** The Start dialog while it is open, else nothing. */
  dialog: ReactNode
}

export function useStartFlow({ bookId }: Options): StartFlow {
  const [starting, setStarting] = useState(false)
  const startButton = useRef<HTMLButtonElement>(null)
  // Set when the Start dialog is cancelled, so focus returns to its opener once it has unmounted.
  const [startRefocus, setStartRefocus] = useState(0)

  useEffect(() => {
    if (startRefocus === 0) return
    // The opener is gone when a refetch made the Book Main meanwhile: park focus on `main`.
    const target = startButton.current ?? document.getElementById('main')
    target?.focus()
  }, [startRefocus])

  const cancelStart = useCallback(() => {
    setStarting(false)
    setStartRefocus((count) => count + 1)
  }, [])

  const dialog = starting && <StartDialog bookId={bookId} onCancel={cancelStart} />

  return { button: startButton, open: () => setStarting(true), dialog }
}
