// Per-page frame helpers: the document title, and whether the current page
// was reached by a client-side navigation (so its `h1` should take focus).

import { useEffect } from 'react'
import { useLocation } from 'react-router'

let hasNavigated = false

/** main.tsx calls this on the first router location change after load. */
export function markNavigated(): void {
  hasNavigated = true
}

export function usePageTitle(name: string): void {
  useEffect(() => {
    document.title = `${name} — bookvie`
  }, [name])
}

/** The location key, and whether any client-side navigation has happened since load. */
export function useNavigatedHere(): { key: string; navigated: boolean } {
  const { key } = useLocation()
  return { key, navigated: hasNavigated }
}
