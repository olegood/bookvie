// Add card note, from the Main book card or from Book detail (EXPERIENCE.md →
// Card note panel). The opener's press opens the panel with Page prefilled
// as the opener says. Cancel or Esc returns focus to the opener once the
// panel has unmounted; a save does the same, then `status` reads "Card note
// saved." (the refocus-then-announce order of Book detail's other flows).
// The user stays on the page either way.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import CardNotePanel from '../components/CardNotePanel.tsx'
import { announce } from './announce.ts'
import { CARD_NOTE_SAVED } from './cardNotes.ts'

type Options = {
  /** The Book the note is for, or `null` when there is none (the opener isn't shown). */
  bookId: string | null
  /** The Page field's prefill (`notePrefill`), read when the panel opens. */
  initialPage: string
}

type CardNoteFlow = {
  /** **Add card note**: focus returns there when the panel closes. */
  button: RefObject<HTMLButtonElement | null>
  /** The opener's press: opens the panel. */
  open: () => void
  /** The Card note panel while it is open, else nothing. */
  panel: ReactNode
}

type Opened = { bookId: string; initialPage: string }

export function useCardNoteFlow({ bookId, initialPage }: Options): CardNoteFlow {
  const [opened, setOpened] = useState<Opened | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Bumped when the panel closes, so focus returns to the opener once it has unmounted.
  const [refocus, setRefocus] = useState(0)
  const saved = useRef(false)

  useEffect(() => {
    if (refocus === 0) return
    // The opener is gone when a refetch removed it meanwhile: park focus on `main`.
    const target = button.current ?? document.getElementById('main')
    target?.focus()
    if (saved.current) {
      saved.current = false
      announce('status', CARD_NOTE_SAVED)
    }
  }, [refocus])

  const close = useCallback((afterSave: boolean) => {
    saved.current = afterSave
    setOpened(null)
    setRefocus((count) => count + 1)
  }, [])

  const open = () => {
    if (bookId !== null) setOpened({ bookId, initialPage })
  }

  const panel = opened && (
    <CardNotePanel
      bookId={opened.bookId}
      initialPage={opened.initialPage}
      onCancel={() => close(false)}
      onSaved={() => close(true)}
    />
  )

  return { button, open, panel }
}
