// The update notice's decision (Story 11.4): a tab whose bundle is older (or
// newer) than the server it talks to offers Reload. Pure, so `node --test`
// can run it without Vite's `define`; the caller passes the bundle's version.

/**
 * The server version the notice names: `server` when it is known and differs
 * from the bundle's version (newer or older), else `undefined` (no notice).
 * `server` is the last successfully loaded `app-info.version`, `undefined`
 * while it is pending or has never loaded.
 */
export function noticeVersion(bundle: string, server: string | undefined): string | undefined {
  return server !== undefined && server !== bundle ? server : undefined
}

/**
 * Whether the notice announces `shown` now: only when a notice shows and no
 * other message is waiting for its tick (`announcing`), so it never replaces
 * a message another part of the app has just announced.
 */
export function shouldAnnounce(shown: string | undefined, announcing: boolean): shown is string {
  return shown !== undefined && !announcing
}

/** The notice's sentence, also what the status region announces. */
export function noticeText(version: string): string {
  return `bookvie was updated to ${version}. Reload to use it.`
}
