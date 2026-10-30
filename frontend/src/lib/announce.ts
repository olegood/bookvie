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

/** Where the regions' host element lives: the document body, or an open modal. */
export interface RegionParent {
  appendChild(node: Node): unknown
}

let host: HTMLElement | null = null
let home: RegionParent | null = null

/**
 * The one element both regions render into (the shell portals them here). It
 * is created once, outside React's tree, at the end of `doc.body`, so it can
 * be moved into an open modal dialog and back without React noticing.
 */
export function regionHost(doc: Pick<Document, 'createElement' | 'body'> = document): HTMLElement {
  if (!host) {
    host = doc.createElement('div')
    home = doc.body
    home.appendChild(host)
  }
  return host
}

/**
 * Moves the regions into `container`, inside an open modal dialog. `showModal()`
 * makes everything outside the dialog inert, the regions included, so a
 * screen reader would not hear them there.
 */
export function adoptRegions(container: RegionParent): void {
  if (host) container.appendChild(host)
}

/** Moves the regions back to the end of the document body. */
export function releaseRegions(): void {
  if (host && home) home.appendChild(host)
}

/** Test seam: forgets the host so the next `regionHost` creates a new one. */
export function resetRegionHost(): void {
  host = null
  home = null
}

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
