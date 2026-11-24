// The carried Card notes search (AD-7, AR65; Story 14.5): the text typed on
// the shelf goes into the box it opens, and Back from the box (or removing
// its "In X" chip) brings the box's latest text out again. The text lives
// only in React state of the Card notes route component, never in the URL,
// in router state or in storage. Router state carries only navigation facts:
// a marker, and on a box link's push `openedFrom`, the shelf entry's key.
//
// The decision is made during render, when `location.key` changes (the
// render-phase hand-off pattern of `HomePage`): the text is kept only on a
// PUSH carrying the marker, or on a POP that lands on the `openedFrom` of the
// entry just left. Every other change (a REPLACE such as the nav link on the
// page itself, another link, Forward, any other POP) starts empty, and the
// marker is ignored on mount (a reload, an arrival from another route).

import { useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'

const MARKER = 'carriesSearch'

/** Router state for a push from the Card notes page. */
export type CarryState = { [MARKER]: true; openedFrom?: string }

/**
 * Router state for a push that carries the search: a box link's, with the
 * shelf entry's `location.key` as `openedFrom`, or the chip's, without.
 */
export function carryState(openedFrom?: string): CarryState {
  return openedFrom === undefined ? { [MARKER]: true } : { [MARKER]: true, openedFrom }
}

function isRecord(state: unknown): state is Record<string, unknown> {
  return typeof state === 'object' && state !== null
}

function carries(state: unknown): boolean {
  return isRecord(state) && state[MARKER] === true
}

function openedFrom(state: unknown): string | null {
  return carries(state) && isRecord(state) && typeof state.openedFrom === 'string' ? state.openedFrom : null
}

type Held = { key: string; state: unknown; text: string }

/**
 * The search text of the current history entry and its setter. `noGroups` is
 * true while the entry's view is settled with no groups: ready and not
 * fetching (never while it loads, nor while a stale cached copy refetches,
 * since that copy may predate the Book's notes). The text is cleared then,
 * not just hidden.
 */
export function useCarriedSearch({ noGroups }: { noGroups: boolean }): readonly [string, (text: string) => void] {
  const location = useLocation()
  const type = useNavigationType()
  const [held, setHeld] = useState<Held>(() => ({ key: location.key, state: location.state, text: '' }))
  let now = held
  if (held.key !== location.key) {
    // `held` is the entry just left (the handled location), so a coalesced move counts from it.
    const kept =
      (type === 'PUSH' && carries(location.state)) || (type === 'POP' && openedFrom(held.state) === location.key)
    now = { key: location.key, state: location.state, text: kept ? held.text : '' }
  }
  if (noGroups && now.text !== '') now = { ...now, text: '' }
  if (now !== held) setHeld(now)
  const setText = (text: string) => setHeld((current) => ({ ...current, text }))
  return [now.text, setText] as const
}
