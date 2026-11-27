// Per-page frame helpers: the document title, whether the current page was
// reached by a client-side navigation (so its `h1` should take focus), and the
// same-page replace rule (AD-7): a page that keeps its state in the address
// (Stats) replaces it with a marker, and that replace is not a route change.

import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { useAppInfo, type AppInfoView } from '../api/views.ts'

let hasNavigated = false
// The page key: the location key of the last route change; `INITIAL_PAGE_KEY` until the first.
const INITIAL_PAGE_KEY = 'initial'
let pageKey = INITIAL_PAGE_KEY

/**
 * main.tsx calls this on every router location change that isn't a same-page
 * replace, with the new location's key: the page key moves to it, and every
 * later page's `h1` takes focus.
 */
export function markNavigated(locationKey: string): void {
  hasNavigated = true
  pageKey = locationKey
}

/** The `history.state` key that marks a same-page replace. */
const SAME_PAGE = 'bookvieSamePage'

/** The navigation state a same-page address replace carries: `navigate(to, { replace: true, state: samePageState() })`. */
export function samePageState(): { [SAME_PAGE]: true } {
  return { [SAME_PAGE]: true }
}

/**
 * Whether a location change is a same-page replace: a REPLACE carrying
 * `samePageState()`'s marker. A PUSH, a POP (Back, Forward, and the first load
 * and a reload, which bring the marker back from `history.state`) and a
 * REPLACE without the marker are route changes. The one place this is decided.
 */
export function isSamePageReplace(navigationType: string, state: unknown): boolean {
  return (
    navigationType === 'REPLACE' &&
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>)[SAME_PAGE] === true
  )
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

/**
 * The page key, which changes on every location change except a same-page
 * replace, and whether any client-side navigation has happened since load.
 * Subscribes to the location, so a route change re-renders the caller.
 */
export function useNavigatedHere(): { key: string; navigated: boolean } {
  useLocation()
  return { key: pageKey, navigated: hasNavigated }
}
