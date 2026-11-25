// The favourite star's flow (EXPERIENCE.md → Favourite star, Story 16.1):
// Book detail, the Spine popover, a Catalog tile and a List row. A press
// sends `set-favourite` with the value the star should show, never a toggle,
// and nothing changes on screen until the save has succeeded and the views
// have refetched (no optimistic star, AD-7). The button is never disabled: a
// second press while a save is out sends the same value again, a no-op.
//
// On `ok`, `status` says "*Title* is a favourite." or "*Title* is not a
// favourite.". On a failure the star stays as it was, focus stays where it
// was, and the `alert` line shows in a slot: the inline slot under the title
// row (Book detail, an open popover) when one was rendered as it failed, else
// the row slot under the Catalog's filter row. An inline failure moves to the
// row for good once its slot goes (the popover closed); a slot rendered later
// never takes it. The line goes at the next save attempt and on `clear()` (a
// filter change).

import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from 'react'
import { useSetFavourite } from '../api/index.ts'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from './announce.ts'
import { useIntentRequest } from './useIntentRequest.ts'

/** The `status` line once the star is saved: "Dune is a favourite." or "Dune is not a favourite.". */
export function favouriteStatus(title: string, favourite: boolean): string {
  return favourite ? `${title} is a favourite.` : `${title} is not a favourite.`
}

export type FavouriteBook = { id: string; title: string }

type Failure = 'inline' | 'row' | null

export type FavouriteFlow = {
  /** Sends `favourite` for the Book; never ignored, even while a save is out. */
  press: (book: FavouriteBook, favourite: boolean) => void
  /** The last save failed and the inline slot holds the `alert` line. */
  inlineFailed: boolean
  /** The last save failed and the row slot holds the `alert` line (no inline slot is rendered). */
  rowFailed: boolean
  /** The slot under the title row (Book detail, the open Spine popover). */
  inlineSlot: RefCallback<HTMLDivElement>
  /** The slot under the Catalog's filter row (Tiles, List, a popover that has closed). */
  rowSlot: RefCallback<HTMLDivElement>
  /** Empties the failure line (a filter change). */
  clear: () => void
}

export function useFavourite(): FavouriteFlow {
  const sendFavourite = useSetFavourite()
  const { run } = useIntentRequest()
  // Where the last failure's line belongs: the inline slot rendered when it
  // failed, else the row slot. Never a slot rendered later.
  const [failure, setFailure] = useState<Failure>(null)
  const [inline, setInline] = useState<HTMLDivElement | null>(null)
  const [row, setRow] = useState<HTMLDivElement | null>(null)
  // The inline slot now, read when a result lands (state would be the press's render).
  const inlineNow = useRef<HTMLDivElement | null>(null)
  const inlineSlot = useCallback((slot: HTMLDivElement | null) => {
    inlineNow.current = slot
    setInline(slot)
  }, [])

  // Once the inline slot goes (the popover closed), the failure is the row's for good.
  if (failure === 'inline' && inline === null) setFailure('row')

  // While a failure holds, the live regions sit in its slot.
  useLayoutEffect(() => {
    const slot = failure === 'inline' ? inline : failure === 'row' ? row : null
    if (!slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [failure, inline, row])

  const send = async (book: FavouriteBook, favourite: boolean): Promise<void> => {
    const result = await run(
      () => setFailure(null),
      () => sendFavourite(book.id, favourite),
    )
    if (result === null) return // unmounted: run already announced a failure
    if (result.kind === 'ok') {
      announce('status', favouriteStatus(book.title, favourite))
      return
    }
    setFailure(inlineNow.current === null ? 'row' : 'inline')
    announce('alert', result.message)
  }

  const press = (book: FavouriteBook, favourite: boolean) => {
    void send(book, favourite)
  }

  const clear = () => {
    if (failure === null) return
    setFailure(null)
    clearAnnouncements()
  }

  return {
    press,
    inlineFailed: failure === 'inline' && inline !== null,
    rowFailed: failure === 'row' && row !== null,
    inlineSlot,
    rowSlot: setRow,
    clear,
  }
}
