// The remembered **Add another** choice of the Card note panel (add mode).
// It lives in localStorage, read and written inside try/catch: only the
// stored "on" means on; nothing, junk or storage that throws means off. It is
// a browser preference, never sent to the server.

const STORAGE_KEY = 'bookvie.cardNoteAddAnother'

export function readAddAnother(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export function writeAddAnother(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Storage unavailable: the box still toggles for this opening.
  }
}
