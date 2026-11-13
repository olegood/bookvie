// The remembered Catalog view (Bookcase · List · Tiles). The choice lives in
// localStorage, read and written inside try/catch: storage that throws or
// holds junk means Bookcase.

export type CatalogViewChoice = 'bookcase' | 'list' | 'tiles'

export const CATALOG_VIEWS: readonly CatalogViewChoice[] = ['bookcase', 'list', 'tiles']

const STORAGE_KEY = 'bookvie.catalogView'

function isCatalogView(value: unknown): value is CatalogViewChoice {
  return value === 'bookcase' || value === 'list' || value === 'tiles'
}

export function readCatalogView(): CatalogViewChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isCatalogView(stored) ? stored : 'bookcase'
  } catch {
    return 'bookcase'
  }
}

export function writeCatalogView(choice: CatalogViewChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Storage unavailable: the view still switches for this session.
  }
}
