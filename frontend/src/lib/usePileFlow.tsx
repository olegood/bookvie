// The Card notes pile, from "Go through as a pile" or a note's page-ref chip
// (Story 5.4; EXPERIENCE.md → Pile, Focus after close). Opening mounts a new
// pile, in Page order. Close or Esc unmounts it; then focus goes to the last
// viewed note's **Edit** if it is shown, else that Book's "Go through as a
// pile", else the `h1`, and the target is scrolled into view (instantly
// under reduced motion).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { BookCardNote } from '../api/index.ts'
import CardNotesPile from '../components/CardNotesPile.tsx'

type Options = {
  /** A shown note's Edit, if it is rendered now (after the search filter and any first-three cut). */
  editButton: (noteId: string) => HTMLElement | undefined
  /** That Book's "Go through as a pile", if it is shown. */
  fallback: (bookId: string) => HTMLElement | null
}

/** The Book whose pile opens: every note, in the server's page order. */
export type PileBook = { bookId: string; title: string; notes: readonly BookCardNote[] }

type PileFlow = {
  /** Opens the pile in Page order, at `startNoteId` when given, else at the first note. */
  open: (book: PileBook, startNoteId?: string) => void
  /** The pile while it is open, else nothing. */
  pile: ReactNode
}

type Opened = PileBook & { startNoteId?: string; key: number }
type Closed = { bookId: string; noteId: string }

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function usePileFlow({ editButton, fallback }: Options): PileFlow {
  const [opened, setOpened] = useState<Opened | null>(null)
  const opens = useRef(0)
  const closed = useRef<Closed | null>(null)
  // Bumped when the pile closes, so focus moves once it has unmounted.
  const [refocus, setRefocus] = useState(0)
  // This render's lookups, for the effect (it reruns on `refocus` only).
  const latest = useRef({ editButton, fallback })
  useEffect(() => {
    latest.current = { editButton, fallback }
  })

  useEffect(() => {
    const last = closed.current
    if (refocus === 0 || last === null) return
    closed.current = null
    const target =
      latest.current.editButton(last.noteId) ??
      latest.current.fallback(last.bookId) ??
      document.querySelector<HTMLElement>('main h1') ??
      document.getElementById('main')
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() })
  }, [refocus])

  const open = useCallback((book: PileBook, startNoteId?: string) => {
    if (book.notes.length === 0) return
    opens.current += 1
    setOpened({ ...book, startNoteId, key: opens.current })
  }, [])

  const close = useCallback((bookId: string, noteId: string) => {
    closed.current = { bookId, noteId }
    setOpened(null)
    setRefocus((count) => count + 1)
  }, [])

  const pile = opened && (
    <CardNotesPile
      key={opened.key}
      title={opened.title}
      notes={opened.notes}
      startNoteId={opened.startNoteId}
      onClose={(noteId) => close(opened.bookId, noteId)}
    />
  )

  return { open, pile }
}
