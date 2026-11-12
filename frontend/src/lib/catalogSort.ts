// The remembered Catalog sort (Author · Title · Date added · Pages). The
// choice lives in localStorage, read and written inside try/catch: storage
// that throws or holds junk means Author.

export type CatalogSortKey = 'author' | 'title' | 'dateAdded' | 'pages'

/** The Sort select's options, in order. */
export const CATALOG_SORTS: readonly CatalogSortKey[] = ['author', 'title', 'dateAdded', 'pages']

export const CATALOG_SORT_LABELS: Record<CatalogSortKey, string> = {
  author: 'Author',
  title: 'Title',
  dateAdded: 'Date added',
  pages: 'Pages',
}

const STORAGE_KEY = 'bookvie.catalogSort'

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
