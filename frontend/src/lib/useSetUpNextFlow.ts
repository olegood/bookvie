// Set as Up next, from Book detail or a spine popover (EXPERIENCE.md → Book
// detail actions, Spine popover). A press sends `set-up-next` at once, with
// no dialog: the displaced Up next keeps its Readings, so nothing needs
// stating first. On `ok` the owner moves focus and announces once the
// refetched views have rendered (`onSet`).
//
// The same one-click flow serves Mark as Side read / Remove from side
// (Story 4.7): `useOneClickFlow` takes the sender, and `useSetUpNextFlow`
// is it bound to `set-up-next`.
//
// A failure (couldn't save, or a stale tab's refusal) keeps focus on the
// button and shows the `alert` line in the slot the owner renders directly
// below it. When a refusal's refetch has removed the button, focus goes to
// the owner's `fallback` and the line stays in the slot where the button was.

import { useEffect, useLayoutEffect, useRef, useState, type RefCallback, type RefObject } from 'react'
import { useSetUpNext, type IntentResult } from '../api/index.ts'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from './announce.ts'

export type SetUpNextBook = { id: string; title: string }

type Options = {
  /** The button: a failure keeps focus there. */
  opener: RefObject<HTMLElement | null>
  /** Where focus goes when a refusal's refetch has taken the button away. */
  fallback: () => HTMLElement | null
  /** The intent landed and the views have refetched: the owner focuses, then announces. */
  onSet: (title: string) => void
}

type OneClickOptions = Options & {
  /** Sends the intent for the Book; resolves after the views have refetched. */
  send: (bookId: string) => Promise<IntentResult>
}

type SetUpNextFlow = {
  /** The button's press: ignored while a request is out. */
  request: (book: SetUpNextBook) => void
  /** A request is out. */
  busy: boolean
  /** The last request failed: the slot holds the `alert` line. */
  failed: boolean
  /** The slot for the live regions, rendered directly below the button; it adopts them after a failure. */
  regionSlot: RefCallback<HTMLDivElement>
}

export function useSetUpNextFlow(options: Options): SetUpNextFlow {
  const send = useSetUpNext()
  return useOneClickFlow({ ...options, send })
}

/** A one-click intent button's flow: in flight, failure focus and the `alert` slot. */
export function useOneClickFlow({ opener, fallback, onSet, send: sendIntent }: OneClickOptions): SetUpNextFlow {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const mounted = useRef(true)
  // Set once this failure has moved focus to the fallback: never again until the next press.
  const fellBack = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // The views may render a refusal's refetch only after the result is in:
  // once that has removed the button, and focus fell with it, go to the
  // fallback, once per failure.
  useEffect(() => {
    if (!failed || fellBack.current || opener.current?.isConnected) return
    const active = document.activeElement
    if (active !== null && active !== document.body) return
    fellBack.current = true
    fallback()?.focus()
  })

  // After a failure the live regions sit in the slot, so the alert line shows
  // there; they go back on the next press, or when the slot unmounts.
  useLayoutEffect(() => {
    if (!failed || !slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [failed, slot])

  const send = async (book: SetUpNextBook): Promise<void> => {
    inFlight.current = true
    fellBack.current = false
    clearAnnouncements()
    setFailed(false)
    setBusy(true)
    const result = await sendIntent(book.id)
    inFlight.current = false
    if (!mounted.current) {
      if (result.kind !== 'ok') announce('alert', result.message)
      return
    }
    setBusy(false)
    if (result.kind === 'ok') {
      onSet(book.title)
      return
    }
    // Couldn't save, or a refusal (a stale tab): nothing changed. The views
    // have refetched, so a refusal may already have removed the button.
    setFailed(true)
    const button = opener.current
    if (button?.isConnected) button.focus()
    else {
      fellBack.current = true
      fallback()?.focus()
    }
    announce('alert', result.message)
  }

  const request = (book: SetUpNextBook) => {
    if (inFlight.current) return
    void send(book)
  }

  return { request, busy, failed, regionSlot: setSlot }
}
