// Spine geometry and the bookcase's roving Tab stop (DESIGN.md → Spine
// sizing, EXPERIENCE.md → Bookcase). Pure functions, so they can be unit-tested.

const MIN = 120
const MAX = 200
const STEP = 8
const PER_PX = 0.3

/**
 * The spine height for a label whose one-line length in `spine-label` is `w`
 * px: 120 + 0.3 × w, rounded up to the 8px step, capped at 200.
 */
export function spineHeight(w: number): number {
  return Math.min(MAX, Math.ceil((MIN + PER_PX * Math.max(0, w)) / STEP) * STEP)
}

/**
 * The visible id nearest to `ids[fromIndex]` in sort order, or null when none
 * is visible. On a tie the previous one wins, so the reading position holds.
 */
export function nearestVisible(
  ids: readonly string[],
  fromIndex: number,
  visible: (id: string) => boolean,
): string | null {
  const at = (index: number) => index >= 0 && index < ids.length && visible(ids[index])
  if (at(fromIndex)) return ids[fromIndex]
  const reach = Math.max(fromIndex, ids.length - 1 - fromIndex)
  for (let distance = 1; distance <= reach; distance++) {
    if (at(fromIndex - distance)) return ids[fromIndex - distance]
    if (at(fromIndex + distance)) return ids[fromIndex + distance]
  }
  return null
}
