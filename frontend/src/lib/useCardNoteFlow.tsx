// Add card note, from the Main book card or from Book detail (EXPERIENCE.md →
// Card note panel). The opener's press opens the panel with Page prefilled
// as the opener says. Cancel or Esc returns focus to the opener once the
// panel has unmounted; a save does the same, then `status` reads "Card note
// saved." (the refocus-then-announce order of Book detail's other flows).
// The user stays on the page either way.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefCallback, type RefObject } from 'react'
import { useCachedBookView, type BookCardNote } from '../api/index.ts'
import CardNotePanel, { type EditedNote } from '../components/CardNotePanel.tsx'
import { announce } from './announce.ts'
import { BLOCK_NOTES, CARD_NOTE_SAVED, noteAfterDelete } from './cardNotes.ts'

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

// Edit card note, from a note's **Edit** in Book detail's Card notes block
// (Story 5.2; EXPERIENCE.md → Card note panel → Edit mode, Focus after
// close). The block re-renders and re-sorts after an intent, so focus is
// resolved by note id once the refetched view has rendered, never by the
// element that opened it:
// - Cancel or Esc: that note's Edit, at once (nothing was sent).
// - A save: that note's Edit, else the block heading when the edit moved it
//   past the notes shown; then `status` reads "Card note saved.".
// - A delete: the Edit of the note now shown where it was (the next note),
//   else the block heading. Nothing is announced.

type EditOptions = {
  /** The Book whose block this is. */
  bookId: string
  /** The block's notes, in page order, as rendered. */
  notes: readonly BookCardNote[]
}

type CardNoteEditFlow = {
  /** Each shown note's Edit registers here, keyed by note id. */
  editButton: (noteId: string) => RefCallback<HTMLButtonElement>
  /** The block heading (`tabIndex={-1}`): focus falls back to it. */
  heading: RefObject<HTMLHeadingElement | null>
  /** A note's Edit press: opens the panel in edit mode. */
  open: (note: BookCardNote) => void
  /** The Card note panel in edit mode while it is open, else nothing. */
  panel: ReactNode
}

/**
 * Where focus goes once the panel has closed. After an intent, `stale` is the
 * list on screen when it resolved and `fresh` the refetched one in the cache:
 * focus waits while the stale list is still rendered.
 */
type Refetched = { stale: readonly BookCardNote[]; fresh: readonly BookCardNote[] | null }
type Pending =
  | { kind: 'cancel'; noteId: string }
  | ({ kind: 'saved'; noteId: string } & Refetched)
  | ({ kind: 'deleted'; index: number } & Refetched)

/** The ids of the notes the block shows, in its order. */
function shownIds(notes: readonly BookCardNote[]): string[] {
  return notes.slice(0, BLOCK_NOTES).map((note) => note.id)
}

export function useCardNoteEditFlow({ bookId, notes }: EditOptions): CardNoteEditFlow {
  // The note being edited, and its place in the block's shown order when it was opened.
  const [opened, setOpened] = useState<{ note: EditedNote; index: number } | null>(null)
  const pending = useRef<Pending | null>(null)
  // Bumped when the panel closes, so the effect below runs once it has unmounted.
  const [closes, setCloses] = useState(0)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const heading = useRef<HTMLHeadingElement>(null)
  const cachedBookView = useCachedBookView()

  useEffect(() => {
    const next = pending.current
    if (closes === 0 || next === null) return
    // Wait until the refetched notes are the ones on screen (a tick after the intent resolves).
    if (next.kind !== 'cancel' && next.fresh !== null && notes !== next.fresh && notes === next.stale) return
    pending.current = null
    const shown = shownIds(notes)
    let target: string | null
    if (next.kind === 'deleted') target = noteAfterDelete(shown, next.index)
    else target = shown.includes(next.noteId) ? next.noteId : null
    const button = target !== null ? buttons.current.get(target) : undefined
    ;(button ?? heading.current ?? document.getElementById('main'))?.focus()
    if (next.kind === 'saved') announce('status', CARD_NOTE_SAVED)
  }, [closes, notes])

  const editButton = useCallback(
    (noteId: string): RefCallback<HTMLButtonElement> =>
      (element) => {
        // React detaches the old callback before attaching the new one on each render.
        if (element) buttons.current.set(noteId, element)
        else buttons.current.delete(noteId)
      },
    [],
  )

  const open = (note: BookCardNote) => {
    const index = Math.max(0, shownIds(notes).indexOf(note.id))
    setOpened({ note: { id: note.id, text: note.text, pageStart: note.pageStart, pageEnd: note.pageEnd }, index })
  }

  const close = (next: Pending) => {
    pending.current = next
    setOpened(null)
    setCloses((count) => count + 1)
  }

  // `notes` is this render's list: when an intent resolves, the one still on screen.
  const refetched = (): Refetched => ({ stale: notes, fresh: cachedBookView(bookId)?.cardNotes ?? null })

  const panel = opened && (
    <CardNotePanel
      key={opened.note.id}
      bookId={bookId}
      note={opened.note}
      onCancel={() => close({ kind: 'cancel', noteId: opened.note.id })}
      onSaved={() => close({ kind: 'saved', noteId: opened.note.id, ...refetched() })}
      onDeleted={() => {
        // Its place in the order on screen now: a refetch may have re-sorted the block since it opened.
        const index = shownIds(notes).indexOf(opened.note.id)
        close({ kind: 'deleted', index: index === -1 ? opened.index : index, ...refetched() })
      }}
    />
  )

  return { editButton, heading, open, panel }
}
