// The request plumbing the one-click flows and the pause flow share. A press
// while a request is out is ignored even before the owner's `busy` renders
// (`isInFlight`). `run` marks the request in flight, empties the live
// regions and lets the owner set its own state, then sends. When the owner
// has unmounted by the time the result is in (the page moved on), a failure
// is still said in `alert` and `run` resolves `null`.
//
// After a failure the owner shows the `alert` line in a slot it renders
// directly below its button: `useAlertSlot` adopts the live regions into
// that slot while the failure holds.

import { useEffect, useLayoutEffect, useRef, useState, type RefCallback } from 'react'
import type { IntentResult } from '../api/index.ts'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from './announce.ts'

type IntentRequest = {
  /** A request is out. */
  isInFlight: () => boolean
  /**
   * Marks the request in flight, empties the live regions and calls `start`
   * (the owner's own state), then awaits `send`. Resolves its result, or
   * `null` when the owner has unmounted meanwhile: a failure is then already
   * said in `alert`.
   */
  run: (start: () => void, send: () => Promise<IntentResult>) => Promise<IntentResult | null>
}

export function useIntentRequest(): IntentRequest {
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = async (start: () => void, send: () => Promise<IntentResult>): Promise<IntentResult | null> => {
    inFlight.current = true
    clearAnnouncements()
    start()
    const result = await send()
    inFlight.current = false
    if (!mounted.current) {
      if (result.kind !== 'ok') announce('alert', result.message)
      return null
    }
    return result
  }

  return { isInFlight: () => inFlight.current, run }
}

/**
 * The slot for the live regions, rendered directly below the owner's button.
 * While `failed` holds the regions sit in the slot, so the alert line shows
 * there; they go back when it stops holding, or when the slot unmounts.
 */
export function useAlertSlot(failed: boolean): RefCallback<HTMLDivElement> {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!failed || !slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [failed, slot])

  return setSlot
}
