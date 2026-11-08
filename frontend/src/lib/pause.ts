// Pause's copy (EXPERIENCE.md → Pause): the Confirm dialog's heading and
// displacement line, and the `status` line after a pause. Every number is
// the server's (AD-6); the paused-at date is never shown.

import type { HomeUpNext } from '../api/index.ts'

/** The Confirm dialog's heading: "Pause Dune at p.150 (58%)?". */
export function pauseHeading(title: string, page: number, percent: number): string {
  return `Pause ${title} at p.${page} (${percent}%)?`
}

/**
 * Where the displaced Up next *Z* goes (FR-7): "Z moves to Waiting for you."
 * when it has a paused Reading, else "Z returns to the catalog.".
 */
export function displacementLine(upNext: Pick<HomeUpNext, 'title' | 'paused'>): string {
  return upNext.paused ? `${upNext.title} moves to Waiting for you.` : `${upNext.title} returns to the catalog.`
}

/** The `status` line once the pause has landed: "Paused Dune at p.150. It's Up next.". */
export function pausedStatus(title: string, page: number): string {
  return `Paused ${title} at p.${page}. It's Up next.`
}
