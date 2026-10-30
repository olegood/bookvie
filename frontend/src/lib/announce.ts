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
// The open modals holding the regions, topmost last.
let stack: RegionParent[] = []

/**
 * The one element both regions render into (the shell portals them here). It
 * is created once, outside React's tree, at the end of `doc.body`, so it can
 * be moved into an open modal dialog and back without React noticing.
 */
export function regionHost(doc: Pick<Document, 'createElement' | 'body'> = document): HTMLElement {
  if (!host) {
    // Kept only once it is in the document: a host that failed to attach
    // would hold regions no screen reader hears.
    const created = doc.createElement('div')
    doc.body.appendChild(created)
    host = created
    home = doc.body
  }
  return host
}

function settle(): void {
  const top = stack.at(-1) ?? home
  if (host && top) top.appendChild(host)
}

/**
 * Moves the regions into `container`, inside an open modal dialog, on top of
 * any modal that already holds them. `showModal()` makes everything outside
 * the topmost dialog inert, the regions included, so a screen reader would
 * not hear them there.
 */
export function adoptRegions(container: RegionParent): void {
  stack.push(container)
  settle()
}

/**
 * Gives the regions back to the modal below, or to the end of the document
 * body. With `container`, releases that modal's hold wherever it is in the
 * stack (modals may unmount in any order); without, pops the topmost.
 */
export function releaseRegions(container?: RegionParent): void {
  const index = container === undefined ? stack.length - 1 : stack.lastIndexOf(container)
  if (index >= 0) stack.splice(index, 1)
  settle()
}

/** Test seam: forgets the host and the stack so the next `regionHost` creates a new one. */
export function resetRegionHost(): void {
  host = null
  home = null
  stack = []
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
