// Pause's copy (EXPERIENCE.md → Pause): the Confirm dialog's heading and
// displacement line, and the `status` line after a pause. Every number is
// the server's (AD-6); the paused-at date is never shown.

import type { HomeUpNext } from '../api/index.ts'

/** The Confirm dialog's heading: "Pause Dune at p.150 (58%)?". */
export function pauseHeading(title: string, page: number, percent: number): string {
  return `Pause ${title} at p.${page} (${percent}%)?`
}

/**
 * Where the displaced Up next *Z* goes (FR-7), the text after its title:
 * "moves to Waiting for you." when it has a paused Reading (a Side read too,
 * since it shows in both panes), else "stays on the side." for a Side read,
 * else "returns to the catalog.".
 */
export function displacementOutcome(upNext: Pick<HomeUpNext, 'paused' | 'sideRead'>): string {
  if (upNext.paused) return 'moves to Waiting for you.'
  return upNext.sideRead ? 'stays on the side.' : 'returns to the catalog.'
}

/** The whole displacement line: "Z moves to Waiting for you.". */
export function displacementLine(upNext: Pick<HomeUpNext, 'title' | 'paused' | 'sideRead'>): string {
  return `${upNext.title} ${displacementOutcome(upNext)}`
}

/** The `status` line once the pause has landed: "Paused Dune at p.150. It's Up next.". */
export function pausedStatus(title: string, page: number): string {
  return `Paused ${title} at p.${page}. It's Up next.`
}
