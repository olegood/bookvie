// Add card note, from the Main book card or from Book detail (EXPERIENCE.md →
// Card note panel). The opener's press opens the panel with Page prefilled
// as the opener says. Cancel or Esc returns focus to the opener once the
// panel has unmounted; a save does the same, then `status` reads "Card note
// saved." (the refocus-then-announce order of Book detail's other flows).
// The user stays on the page either way.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefCallback, type RefObject } from 'react'
import type { BookCardNote } from '../api/index.ts'
import CardNotePanel, { type EditedNote } from '../components/CardNotePanel.tsx'
import { announce } from './announce.ts'
import { CARD_NOTE_SAVED, noteAfterDelete } from './cardNotes.ts'

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
// (Story 5.2) or on the Card notes page (Story 5.3; EXPERIENCE.md → Card
// note panel → Edit mode, Focus after close). The list re-renders, re-sorts
// and may be filtered by a search after an intent, so focus is resolved by
// note id once the refetched view has rendered, never by the element that
// opened it:
// - Cancel or Esc: that note's Edit, at once (nothing was sent).
// - A save: that note's Edit if it is still shown, else the note's group or
//   block heading (`fallback`), else the `h1`; then `status` reads "Card
//   note saved.".
// - A delete: the Edit of the note now shown where it was in the same group
//   or block (the next note), else that heading, else the `h1`. Nothing is
//   announced.

type EditOptions = {
  /**
   * The ids of the notes shown for a Book (its group, or the block), in the
   * order on screen: after the search filter and any first-three cut.
   */
  shownIds: (bookId: string) => readonly string[]
  /**
   * What the list on screen was rendered from, as the cache holds it: the
   * view's own array or object, never a copy. Focus waits for the refetch by
   * comparing it with `cached()`.
   */
  source: unknown
  /** The same thing as the cache holds it right now; `null` or `undefined` when it isn't cached. */
  cached: () => unknown
  /** Where focus falls back for a note of this Book: its group or block heading, if shown. */
  fallback: (bookId: string) => HTMLElement | null
}

type CardNoteEditFlow = {
  /** Each shown note's Edit registers here, keyed by note id. */
  editButton: (noteId: string) => RefCallback<HTMLButtonElement>
  /** A note's Edit press: opens the panel in edit mode for that note's Book. */
  open: (note: BookCardNote, bookId: string) => void
  /** A note's Edit, if it is rendered now (the pile returns focus there). */
  find: (noteId: string) => HTMLButtonElement | undefined
  /** The Card note panel in edit mode while it is open, else nothing. */
  panel: ReactNode
}

/**
 * Where focus goes once the panel has closed. After an intent, `stale` is the
 * source on screen when it resolved and `fresh` the refetched one in the
 * cache: focus waits while the stale one is still rendered.
 */
type Refetched = { stale: unknown; fresh: unknown }
type Pending = { noteId: string; bookId: string } & (
  | { kind: 'cancel' }
  | ({ kind: 'saved' } & Refetched)
  | ({ kind: 'deleted'; index: number } & Refetched)
)

type OpenedNote = { note: EditedNote; bookId: string; index: number }

export function useCardNoteEditFlow({ shownIds, source, cached, fallback }: EditOptions): CardNoteEditFlow {
  // The note being edited, its Book, and its place in that Book's shown order when it was opened.
  const [opened, setOpened] = useState<OpenedNote | null>(null)
  const pending = useRef<Pending | null>(null)
  // Bumped when the panel closes, so the effect below runs once it has unmounted.
  const [closes, setCloses] = useState(0)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  // This render's callbacks, for the effect (it reruns on `closes` and `source` only).
  const latest = useRef({ shownIds, fallback })
  useEffect(() => {
    latest.current = { shownIds, fallback }
  })

  useEffect(() => {
    const next = pending.current
    if (closes === 0 || next === null) return
    // Wait until the refetched source is the one on screen (a tick after the intent resolves).
    if (next.kind !== 'cancel' && next.fresh != null && source !== next.fresh && source === next.stale) return
    pending.current = null
    const shown = latest.current.shownIds(next.bookId)
    let target: string | null
    if (next.kind === 'deleted') {
      // A failed refetch keeps the stale list on screen, deleted note included: never pick it.
      target = noteAfterDelete(
        shown.filter((id) => id !== next.noteId),
        next.index,
      )
    } else target = shown.includes(next.noteId) ? next.noteId : null
    const button = target !== null ? buttons.current.get(target) : undefined
    const element =
      button ??
      latest.current.fallback(next.bookId) ??
      document.querySelector<HTMLElement>('main h1') ??
      document.getElementById('main')
    element?.focus()
    if (next.kind === 'saved') announce('status', CARD_NOTE_SAVED)
  }, [closes, source])

  const editButton = useCallback(
    (noteId: string): RefCallback<HTMLButtonElement> =>
      (element) => {
        // React detaches the old callback before attaching the new one on each render.
        if (element) buttons.current.set(noteId, element)
        else buttons.current.delete(noteId)
      },
    [],
  )

  const open = (note: BookCardNote, bookId: string) => {
    const index = Math.max(0, shownIds(bookId).indexOf(note.id))
    setOpened({
      note: { id: note.id, text: note.text, pageStart: note.pageStart, pageEnd: note.pageEnd },
      bookId,
      index,
    })
  }

  const close = (next: Pending) => {
    pending.current = next
    setOpened(null)
    setCloses((count) => count + 1)
  }

  // `source` is this render's: when an intent resolves, the one still on screen.
  const refetched = (): Refetched => ({ stale: source, fresh: cached() })

  const panel = opened && (
    <CardNotePanel
      key={opened.note.id}
      bookId={opened.bookId}
      note={opened.note}
      onCancel={() => close({ kind: 'cancel', noteId: opened.note.id, bookId: opened.bookId })}
      onSaved={() => close({ kind: 'saved', noteId: opened.note.id, bookId: opened.bookId, ...refetched() })}
      onDeleted={() => {
        // Its place in the order on screen now: a refetch may have re-sorted the list since it opened.
        const index = shownIds(opened.bookId).indexOf(opened.note.id)
        close({
          kind: 'deleted',
          noteId: opened.note.id,
          bookId: opened.bookId,
          index: index === -1 ? opened.index : index,
          ...refetched(),
        })
      }}
    />
  )

  const find = useCallback((noteId: string) => buttons.current.get(noteId), [])

  return { editButton, open, find, panel }
}
