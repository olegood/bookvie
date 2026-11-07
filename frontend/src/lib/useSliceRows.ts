// Home's slice packing for the Bookcase (EXPERIENCE.md → Bookcase → Home
// slice): the spines per row, measured from the list's content width before
// paint and again on every resize, and the rows `sliceRows` chooses at that
// capacity. Outside slice mode there are no rows, and the keys and the Tab
// stop follow the whole bookcase.

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import type { ShelfBook } from '../api/index.ts'
import { rowCapacity, sliceRows } from './slice.ts'

type Options = {
  /** Already in display order (the bookcase order). */
  books: readonly ShelfBook[]
  /** The server's row priority (AD-6); `undefined` outside slice mode. */
  priority: readonly string[] | undefined
  sliceMode: boolean
  /** The shelf list, whose content width sets the capacity. */
  shelfRef: RefObject<HTMLUListElement | null>
}

type SliceRows = {
  /** The slice's rows as displayed (empty outside slice mode, or before the first measure). */
  rows: string[][]
  /** The order the keys and the Tab stop follow: the bookcase, or the slice as displayed. */
  ids: string[]
  byId: Map<string, ShelfBook>
}

/** A px length from a custom property on `element` (0 when unset). */
function cssLength(element: Element, property: string): number {
  return parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0
}

export function useSliceRows({ books, priority, sliceMode, shelfRef }: Options): SliceRows {
  // Slice mode: spines per row, measured from the list before paint.
  const [capacity, setCapacity] = useState<number | null>(null)
  const allIds = useMemo(() => books.map((book) => book.id), [books])
  const mainId = useMemo(() => books.find((book) => book.role === 'main')?.id ?? null, [books])
  const rows = useMemo(
    () => (priority === undefined || capacity === null ? [] : sliceRows(allIds, capacity, priority, mainId)),
    [allIds, capacity, priority, mainId],
  )
  const ids = useMemo(() => (sliceMode ? rows.flat() : allIds), [sliceMode, rows, allIds])
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books])

  useLayoutEffect(() => {
    const list = shelfRef.current
    if (!sliceMode || list === null) return
    const measure = () => {
      const style = getComputedStyle(list)
      const width = list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setCapacity(rowCapacity(width, cssLength(list, '--space-spine-width'), cssLength(list, '--space-spine-gap')))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [sliceMode, shelfRef])

  return { rows, ids, byId }
}
