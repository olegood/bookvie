// The Change color block's pure rules (EXPERIENCE.md → Spine popover, Book
// detail → Change color): the curated swatches by name, the color line, the
// pressed swatch and the announcement; plus where the Spine popover goes.
// The server resolves the color (user, else from cover, else curated); these
// only name and place it.

/** DESIGN.md → Spine colors, in rotation order: name and hex (uppercase). */
export const SWATCH_COLORS = [
  ['Sage', '#749076'],
  ['Slate', '#5B7590'],
  ['Clay', '#9B6753'],
  ['Ochre', '#B48A45'],
  ['Plum', '#7A6283'],
  ['Teal', '#4B7C7B'],
  ['Moss', '#6C7650'],
  ['Stone', '#6F7375'],
] as const

export type SwatchName = (typeof SWATCH_COLORS)[number][0]

/** The curated swatch with this hex, ignoring case; `null` for any other color. */
export function swatchName(hex: string): SwatchName | null {
  const wanted = hex.trim().toUpperCase()
  return SWATCH_COLORS.find(([, swatch]) => swatch === wanted)?.[0] ?? null
}

function rgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!match) return null
  return [Number.parseInt(match[1], 16), Number.parseInt(match[2], 16), Number.parseInt(match[3], 16)]
}

/** The curated swatch nearest to `hex` by RGB distance (the first on a tie; Sage for a non-hex). */
export function nearestSwatchName(hex: string): SwatchName {
  const color = rgb(hex)
  if (!color) return SWATCH_COLORS[0][0]
  let best: SwatchName = SWATCH_COLORS[0][0]
  let distance = Infinity
  for (const [name, swatch] of SWATCH_COLORS) {
    const [r, g, b] = rgb(swatch)!
    const gap = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2
    if (gap < distance) {
      best = name
      distance = gap
    }
  }
  return best
}

/** The fields of a Book its Change color block reads. */
export interface ColoredBook {
  /** The resolved color: user, else from cover, else curated. */
  spineColor: string
  spineColorUser: string | null
  spineColorFromCover: string | null
  hasCover: boolean
}

/**
 * Where the color comes from: "Color: set by you" (the user's pick),
 * "Color: Teal, from cover" (the nearest curated name) or "Color: Sage".
 */
export function colorLine(book: ColoredBook): string {
  if (book.spineColorUser !== null) return 'Color: set by you'
  if (book.spineColorFromCover !== null) return `Color: ${nearestSwatchName(book.spineColorFromCover)}, from cover`
  return `Color: ${swatchName(book.spineColor) ?? nearestSwatchName(book.spineColor)}`
}

/**
 * The `SwatchRow` value: `''` (From cover pressed) when there is no user
 * color and a cover exists, else the resolved color (the swatch with that hex
 * is pressed, ignoring case).
 */
export function pressedValue(book: ColoredBook): string {
  return book.spineColorUser === null && book.hasCover ? '' : book.spineColor
}

/** Whether picking `value` (a `SwatchRow` value: hex, or `''` for From cover) changes nothing. */
export function isPressed(book: ColoredBook, value: string): boolean {
  return pressedValue(book).toLowerCase() === value.trim().toLowerCase()
}

/** The status line after a saved pick, naming the color the spine now has. */
export function colorSetCopy(spineColor: string): string {
  return `Color set to ${swatchName(spineColor) ?? nearestSwatchName(spineColor)}.`
}

/** A box in viewport pixels, as `getBoundingClientRect()` gives it. */
export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Placement {
  left: number
  top: number
  /** Above the spine (pointer at the bottom) or below it (pointer at the top). */
  side: 'above' | 'below'
  /** The pointer's centre, from the popover's left edge. */
  pointerX: number
}

/** The gap between the popover and its spine. */
export const POPOVER_GAP = 8
/** How close the popover may come to each viewport edge. */
export const VIEWPORT_MARGIN = 16
/** The pointer's centre stays this far inside the popover's corners. */
const POINTER_INSET = 20

/**
 * The Spine popover's place (DESIGN.md → Spine popover): above the spine with
 * an 8px gap, or below it when there is no room above; centred on the spine
 * and shifted inward to stay 16px from each viewport edge. The pointer points
 * at the spine's centre.
 *
 * Room above ends at `ceiling` (the shelf's top edge) as well as 16px from
 * the viewport's top, so a spine on the top shelf row gets its popover below
 * and the popover never covers the page above the shelf.
 */
export function placePopover(
  spine: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  ceiling = 0,
): Placement {
  const centre = spine.left + spine.width / 2
  const maxLeft = viewport.width - VIEWPORT_MARGIN - size.width
  const left = Math.max(VIEWPORT_MARGIN, Math.min(centre - size.width / 2, maxLeft))
  const above = spine.top - POPOVER_GAP - size.height
  const below = spine.top + spine.height + POPOVER_GAP
  const roomAbove = above >= Math.max(VIEWPORT_MARGIN, ceiling)
  const roomBelow = below + size.height <= viewport.height - VIEWPORT_MARGIN
  // With room on neither side, the side with more space wins.
  const side = roomAbove || (!roomBelow && spine.top > viewport.height - spine.top - spine.height) ? 'above' : 'below'
  const pointerX = Math.max(POINTER_INSET, Math.min(centre - left, size.width - POINTER_INSET))
  // Kept 16px inside the top and bottom edges too (16 from the top when it can't fit).
  const maxTop = viewport.height - VIEWPORT_MARGIN - size.height
  const top = Math.max(VIEWPORT_MARGIN, Math.min(side === 'above' ? above : below, maxTop))
  return { left, top, side, pointerX }
}
