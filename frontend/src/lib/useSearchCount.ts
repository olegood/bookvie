// The count a search announces once typing pauses (EXPERIENCE.md → Search
// field, Live regions): about 500 ms after the last keystroke, `status`
// reads the count once. A blank query announces nothing. Catalog keeps its
// own copy of this rule; Search card notes uses this one.

import { useCallback, useEffect, useRef } from 'react'
import { announce } from './announce.ts'

/** How long typing must pause before the count is announced. */
export const SEARCH_PAUSE_MS = 500

type SearchCount = {
  /** Call on every change of the field: restarts the pause, or cancels it for a blank query. */
  typed: (query: string) => void
  /** Drops a count still waiting (before a panel opens, so it can't empty the panel's regions). */
  cancel: () => void
}

/** `line(query)` is read when the pause ends, so it sees the notes on screen then. */
export function useSearchCount(line: (query: string) => string): SearchCount {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef(line)
  useEffect(() => {
    latest.current = line
  })

  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  useEffect(() => cancel, [cancel])

  const typed = useCallback(
    (query: string) => {
      cancel()
      if (query.trim() === '') return
      timer.current = setTimeout(() => {
        timer.current = undefined
        announce('status', latest.current(query))
      }, SEARCH_PAUSE_MS)
    },
    [cancel],
  )

  return { typed, cancel }
}
