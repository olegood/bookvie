// Per-page frame helpers: the document title, and whether the current page
// was reached by a client-side navigation (so its `h1` should take focus).

import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useAppInfo, type AppInfoView } from '../api/views.ts'

let hasNavigated = false

/** main.tsx calls this on the first router location change after load. */
export function markNavigated(): void {
  hasNavigated = true
}

/** The document title of page `name`: "DEV · " in front only when the server says it runs `--dev`. */
export function pageTitle(name: string, mode: AppInfoView['mode'] | undefined): string {
  const title = `${name} — bookvie`
  return mode === 'dev' ? `DEV · ${title}` : title
}

export function usePageTitle(name: string): void {
  // Dev is decided by the server only (app-info), never by how the bundle was served.
  const mode = useAppInfo()?.mode
  useEffect(() => {
    document.title = pageTitle(name, mode)
  }, [name, mode])
}

/** The location key, and whether any client-side navigation has happened since load. */
export function useNavigatedHere(): { key: string; navigated: boolean } {
  const { key } = useLocation()
  return { key, navigated: hasNavigated }
}
