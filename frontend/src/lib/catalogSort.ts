// The remembered Catalog sort (Author · Title · Date added · Pages) and its
// direction. Both live in localStorage, read and written inside try/catch:
// storage that throws or holds junk means Author, in its natural direction.

export type CatalogSortKey = 'author' | 'title' | 'dateAdded' | 'pages'

/** The Sort select's options, in order. */
export const CATALOG_SORTS: readonly CatalogSortKey[] = ['author', 'title', 'dateAdded', 'pages']

export const CATALOG_SORT_LABELS: Record<CatalogSortKey, string> = {
  author: 'Author',
  title: 'Title',
  dateAdded: 'Date added',
  pages: 'Pages',
}

/** The Sort direction toggle's text per key: natural, then reversed (AR28). */
export const CATALOG_SORT_DIRECTION_LABELS: Record<CatalogSortKey, { natural: string; reversed: string }> = {
  author: { natural: 'A–Z', reversed: 'Z–A' },
  title: { natural: 'A–Z', reversed: 'Z–A' },
  dateAdded: { natural: 'Newest first', reversed: 'Oldest first' },
  pages: { natural: 'Fewest first', reversed: 'Most first' },
}

const STORAGE_KEY = 'bookvie.catalogSort'
const REVERSED_KEY = 'bookvie.catalogSortReversed'

export function isCatalogSort(value: unknown): value is CatalogSortKey {
  return typeof value === 'string' && (CATALOG_SORTS as readonly string[]).includes(value)
}

export function readCatalogSort(): CatalogSortKey {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isCatalogSort(stored) ? stored : 'author'
  } catch {
    return 'author'
  }
}

export function writeCatalogSort(key: CatalogSortKey): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, key)
  } catch {
    // Storage unavailable: the shelf still re-sorts for this visit.
  }
}

/**
 * Whether the remembered order is reversed: only `"true"`, and only when the
 * stored key is one of the four (a key read as Author by fallback is natural).
 */
export function readCatalogSortReversed(): boolean {
  try {
    const storage = window.localStorage
    return isCatalogSort(storage.getItem(STORAGE_KEY)) && storage.getItem(REVERSED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Remembers the direction: `"true"` when reversed, the key removed when natural. */
export function writeCatalogSortReversed(reversed: boolean): void {
  try {
    if (reversed) window.localStorage.setItem(REVERSED_KEY, 'true')
    else window.localStorage.removeItem(REVERSED_KEY)
  } catch {
    // Storage unavailable: the order still flips for this visit.
  }
}
