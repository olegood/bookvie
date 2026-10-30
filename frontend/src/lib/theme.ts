// The Light / Dark / System theme. The choice lives in localStorage, read and
// written inside try/catch: storage that throws or holds junk means System.
// System removes `data-theme`, so tokens.css follows the OS live.

export type Theme = 'light' | 'dark' | 'system'

export const THEMES: readonly Theme[] = ['light', 'dark', 'system']

const STORAGE_KEY = 'bookvie.theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
