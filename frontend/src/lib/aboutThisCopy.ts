// The two lines of Backup's "About this copy" card, built from the app-info view.

import type { AppInfoView } from '../api/views.ts'

/** Line 1: "bookvie 1.1.0"; on a dev server "bookvie 1.1.0 (a1b2c3d) · Development server". */
export function versionLine(info: AppInfoView): string {
  const line = `bookvie ${info.version}`
  if (info.mode !== 'dev') return line
  const commit = info.commit ? ` (${info.commit})` : ''
  return `${line}${commit} · Development server`
}

/** Line 2: the data folder exactly as the server sends it, never shortened. */
export function folderLine(info: AppInfoView): string {
  return `Data folder: ${info.dataDir}`
}
