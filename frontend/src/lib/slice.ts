// Home's bookcase slice (EXPERIENCE.md → Bookcase → Home slice, UX-DR31):
// the full bookcase packed into rows at the current width, up to 3 rows
// chosen in the server's priority order (AD-6). Pure functions, so they can
// be unit-tested; the e2e spec's `expectedSlice` is the same rule.

/** The most rows the slice shows. */
export const SLICE_ROWS = 3

/** Spines per row: `max(1, floor((W + gap) / (spine + gap)))` for content width `W`. */
export function rowCapacity(width: number, spine: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (spine + gap)))
}

/**
 * The slice's rows as displayed. `ids` (bookcase order) are packed into rows
 * of `k`; rows are chosen by `priority` (each row once, at most 3), then
 * filled from the first bookcase rows. The Main book's row comes first and
 * the rest follow in bookcase order; with no Main book, all are in bookcase
 * order. Ids in `priority` that aren't on the shelf are ignored.
 */
export function sliceRows(
  ids: readonly string[],
  k: number,
  priority: readonly string[],
  mainId: string | null,
): string[][] {
  const size = Math.max(1, Math.floor(k))
  const rows: string[][] = []
  for (let start = 0; start < ids.length; start += size) rows.push(ids.slice(start, start + size))
  const rowOf = new Map(ids.map((id, index) => [id, Math.floor(index / size)]))
  const chosen: number[] = []
  for (const id of priority) {
    if (chosen.length === SLICE_ROWS) break
    const row = rowOf.get(id)
    if (row !== undefined && !chosen.includes(row)) chosen.push(row)
  }
  for (let row = 0; row < rows.length && chosen.length < SLICE_ROWS; row++) {
    if (!chosen.includes(row)) chosen.push(row)
  }
  const mainRow = mainId === null ? undefined : rowOf.get(mainId)
  const rest = chosen.filter((row) => row !== mainRow).sort((a, b) => a - b)
  const order = mainRow === undefined ? rest : [mainRow, ...rest]
  return order.map((row) => rows[row])
}
