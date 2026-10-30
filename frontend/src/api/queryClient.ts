// The app's QueryClient. The server is local, so a failure is shown at once
// (no retries). Views refetch when the window regains focus or the tab
// becomes visible again; TanStack listens only to `visibilitychange` by default.

import { focusManager, QueryClient } from '@tanstack/react-query'

type FocusTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
type SetFocused = (focused?: boolean) => void

/** A focusManager setup that re-checks focus on `visibilitychange` and `focus`. */
export function focusAndVisibility(target: FocusTarget) {
  return (setFocused: SetFocused) => {
    const listener = () => setFocused()
    target.addEventListener('visibilitychange', listener, false)
    target.addEventListener('focus', listener, false)
    return () => {
      target.removeEventListener('visibilitychange', listener, false)
      target.removeEventListener('focus', listener, false)
    }
  }
}

export function createQueryClient(): QueryClient {
  if (typeof window !== 'undefined') {
    focusManager.setEventListener(focusAndVisibility(window))
  }
  return new QueryClient({
    defaultOptions: {
      // 'always': the server is local, so navigator.onLine must not pause requests.
      queries: { retry: false, refetchOnWindowFocus: true, networkMode: 'always' },
      mutations: { retry: false, networkMode: 'always' },
    },
  })
}
