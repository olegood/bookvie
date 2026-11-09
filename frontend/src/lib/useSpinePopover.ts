// The Bookcase's Spine popover and Start dialog (EXPERIENCE.md → Spine
// popover): at most one popover open, anchored to its spine; a click on the
// spine toggles it, an outside press closes it, and a search that hides the
// spine (or a delete) closes it during render. Closing returns focus to the
// spine unless the user put it somewhere else. The popover's start action
// closes it and opens the Start dialog; cancelling that returns focus to the
// spine once the dialog has unmounted, or to the shelf or `main` when the
// spine is gone. Confirming navigates to a new history entry, which closes it
// where the Bookcase stays mounted (Home's slice).

import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useLocation } from 'react-router'
import type { ShelfBook } from '../api/index.ts'

/**
 * The controls an outside click may land on and keep focus (a `label` focuses
 * its control, as Search titles' does). Containers with
 * `tabindex="-1"` (`main`, the page `h1`) are not controls: a click there
 * returns focus to the spine.
 */
export const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, label, [tabindex]:not([tabindex^="-"]), [contenteditable="true"]'

type Options = {
  books: readonly ShelfBook[]
  /** The Book ids whose spines are shown. */
  visible: ReadonlySet<string>
  /** The spine order; a change re-checks a deleted spine's focus. */
  ids: readonly string[]
  /** The slice's rows: a repack remounts the spines and renews `anchor`. */
  rows: readonly (readonly string[])[]
  /** The spine buttons, by Book id. */
  buttons: RefObject<Map<string, HTMLButtonElement>>
  shelfRef: RefObject<HTMLUListElement | null>
}

type SpinePopover = {
  /** The Book whose Spine popover is open: at most one. */
  openId: string | null
  openBook: ShelfBook | undefined
  /** Wraps the popover, so a press inside it isn't an outside press. */
  popoverRef: RefObject<HTMLDivElement | null>
  /** The open spine, for the popover to place itself against. */
  anchor: () => HTMLButtonElement | null
  shelf: () => HTMLUListElement | null
  closePopover: (refocus: boolean) => void
  openStart: () => void
  /** The Book whose Start dialog is open (from its popover's start action). */
  startingId: string | null
  cancelStart: () => void
  /** The spine's click: toggles its popover, unless the press just closed it. */
  clickSpine: (id: string, event: MouseEvent<HTMLButtonElement>) => void
}

export function useSpinePopover({ books, visible, ids, rows, buttons, shelfRef }: Options): SpinePopover {
  // The Book whose Spine popover is open: at most one.
  const [openId, setOpenId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // The Book whose Start dialog is open (from its popover's start action), and
  // the history entry it opened on: a confirmed start navigates to `/`, a new
  // entry, which closes it on Home, where the slice stays mounted.
  const location = useLocation()
  const [starting, setStarting] = useState<{ bookId: string; key: string } | null>(null)
  if (starting !== null && starting.key !== location.key) setStarting(null)
  const startingId = starting?.bookId ?? null
  // A press on the open spine closes its popover; the click that follows must not reopen it.
  const closedByPress = useRef<{ id: string; at: number } | null>(null)
  const shelf = useCallback(() => shelfRef.current, [shelfRef])

  // A search that hides the open spine (or a delete) closes its popover.
  const [vanished, setVanished] = useState(0)
  if (openId !== null && !visible.has(openId)) {
    setOpenId(null)
    setVanished((count) => count + 1)
  }
  const openBook = openId === null ? undefined : books.find((book) => book.id === openId)

  // A slice repack remounts the spines: `rows` renews `anchor`, so an open
  // popover places itself again against the new spine.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const anchor = useCallback(() => (openId === null ? null : (buttons.current.get(openId) ?? null)), [openId, rows])

  // Closing returns focus to the spine, unless the user put it somewhere else.
  const closePopover = useCallback(
    (refocus: boolean) => {
      const spine = anchor()
      setOpenId(null)
      if (refocus) spine?.focus()
    },
    [anchor],
  )

  // The popover closes (focus back on its spine), then the Start dialog opens.
  const openStart = useCallback(() => {
    if (openId === null) return
    closePopover(true)
    setStarting({ bookId: openId, key: location.key })
  }, [openId, closePopover, location.key])

  // Cancel or Esc: the popover has closed, so focus returns to the spine,
  // once the modal dialog (which makes the shelf inert) has unmounted.
  const [refocusId, setRefocusId] = useState<{ id: string } | null>(null)
  const cancelStart = useCallback(() => {
    if (startingId !== null) setRefocusId({ id: startingId })
    setStarting(null)
  }, [startingId])

  // The spine is gone (deleted or hidden by a refetch): the shelf if it takes focus, else `main`.
  const fallbackTarget = useCallback(() => {
    const shelfList = shelfRef.current
    return (
      (shelfList !== null && !shelfList.hidden && shelfList.hasAttribute('tabindex') ? shelfList : null) ??
      document.getElementById('main')
    )
  }, [shelfRef])

  useEffect(() => {
    if (refocusId === null) return
    ;(buttons.current.get(refocusId.id) ?? fallbackTarget())?.focus()
  }, [refocusId, fallbackTarget, buttons])

  // The open spine went (a delete in another tab): focus fell with the
  // popover. A search that hides it keeps focus in Search titles.
  useEffect(() => {
    if (vanished === 0) return
    if (document.activeElement === null || document.activeElement === document.body) fallbackTarget()?.focus()
  }, [vanished, fallbackTarget])

  // The Book was deleted elsewhere: its `book` view went missing first, so
  // focus went back to the spine, and the catalog refetch then removed it.
  useEffect(() => {
    if (refocusId === null || buttons.current.has(refocusId.id)) return
    if (document.activeElement === null || document.activeElement === document.body) fallbackTarget()?.focus()
  }, [ids, refocusId, fallbackTarget, buttons])

  // An outside click closes the popover. A click on the open spine is left to
  // its own toggle. Focus stays on a control the click landed on (Search
  // titles, another spine); otherwise it returns to the spine once the
  // click's own focus change has happened.
  useEffect(() => {
    if (openId === null) return
    const down = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (popoverRef.current?.contains(target)) return
      const spine = anchor()
      setOpenId(null)
      if (spine?.contains(target)) {
        // Pressing the open spine toggles it shut; it keeps the focus the press gives it.
        closedByPress.current = { id: openId, at: event.timeStamp }
        return
      }
      if (target.closest(FOCUSABLE)) return
      setTimeout(() => spine?.focus(), 0)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [openId, anchor])

  const clickSpine = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    const pressed = closedByPress.current
    closedByPress.current = null
    if (pressed?.id === id && event.timeStamp - pressed.at < 1000) return
    setOpenId((open) => (open === id ? null : id))
  }

  return {
    openId,
    openBook,
    popoverRef,
    anchor,
    shelf,
    closePopover,
    openStart,
    startingId,
    cancelStart,
    clickSpine,
  }
}
