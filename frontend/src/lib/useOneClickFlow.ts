// A one-click intent button's flow, with no dialog: Set as Up next, from Book
// detail or a spine popover (EXPERIENCE.md → Book detail actions, Spine
// popover), and Mark as Side read / Remove from side on Book detail (Story
// 4.7). A press sends the owner's intent at once. On `ok` the owner moves
// focus and announces once the refetched views have rendered (`onDone`).
//
// A failure (couldn't save, or a stale tab's refusal) keeps focus on the
// button and shows the `alert` line in the slot the owner renders directly
// below it. When a refusal's refetch has removed the button, focus goes to
// the owner's `fallback` and the line stays in the slot where the button was.

import { useEffect, useRef, useState, type RefCallback, type RefObject } from 'react'
import type { IntentResult } from '../api/index.ts'
import { announce } from './announce.ts'
import { useAlertSlot, useIntentRequest } from './useIntentRequest.ts'

export type OneClickBook = { id: string; title: string }

type Options = {
  /** The button: a failure keeps focus there. */
  opener: RefObject<HTMLElement | null>
  /** Where focus goes when a refusal's refetch has taken the button away. */
  fallback: () => HTMLElement | null
  /** The intent landed and the views have refetched: the owner focuses, then announces. */
  onDone: (title: string) => void
  /** Sends the intent for the Book; resolves after the views have refetched. */
  send: (bookId: string) => Promise<IntentResult>
}

export type OneClickFlow = {
  /** The button's press: ignored while a request is out. */
  request: (book: OneClickBook) => void
  /** A request is out. */
  busy: boolean
  /** The last request failed: the slot holds the `alert` line. */
  failed: boolean
  /** The slot for the live regions, rendered directly below the button; it adopts them after a failure. */
  regionSlot: RefCallback<HTMLDivElement>
}

export function useOneClickFlow({ opener, fallback, onDone, send: sendIntent }: Options): OneClickFlow {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const { isInFlight, run } = useIntentRequest()
  // Set once this failure has moved focus to the fallback: never again until the next press.
  const fellBack = useRef(false)

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
  const regionSlot = useAlertSlot(failed)

  const send = async (book: OneClickBook): Promise<void> => {
    const result = await run(
      () => {
        fellBack.current = false
        setFailed(false)
        setBusy(true)
      },
      () => sendIntent(book.id),
    )
    if (result === null) return // unmounted: run already announced a failure
    setBusy(false)
    if (result.kind === 'ok') {
      onDone(book.title)
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

  const request = (book: OneClickBook) => {
    if (isInFlight()) return
    void send(book)
  }

  return { request, busy, failed, regionSlot }
}
