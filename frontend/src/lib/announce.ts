// The shell's two live regions: one polite `status`, one `alert`. Both are
// emptied first and new text is set after a short tick, so an identical
// message is announced again and old text is never mistaken for a new one.

export type RegionKind = 'status' | 'alert'

/** The part of an element the helper writes to. */
export interface Region {
  textContent: string | null
}

export const ANNOUNCE_DELAY_MS = 100

const regions: Record<RegionKind, Region | null> = { status: null, alert: null }
let pending: ReturnType<typeof setTimeout> | undefined

/** Called by the shell with each region element, and with `null` on unmount. */
export function registerRegion(kind: RegionKind, region: Region | null): void {
  regions[kind] = region
}

/** Empties both regions and cancels a message that hasn't been set yet. */
export function clearAnnouncements(): void {
  if (pending !== undefined) clearTimeout(pending)
  pending = undefined
  for (const region of Object.values(regions)) {
    if (region) region.textContent = ''
  }
}

/** Empties both regions, then sets `text` in `kind` after ANNOUNCE_DELAY_MS. */
export function announce(kind: RegionKind, text: string): void {
  clearAnnouncements()
  pending = setTimeout(() => {
    pending = undefined
    const region = regions[kind]
    if (region) region.textContent = text
  }, ANNOUNCE_DELAY_MS)
}
