// Catalog's filter chips (FR-20, UX-DR20): Status, Type, Language and Tag.
// Pure rules over the catalog view's Books: chips in a group combine with OR,
// groups with each other (and with Search titles) with AND, and an empty group
// is no constraint. Filters live in CatalogPage state only, never in storage.

import type { ShelfBook } from '../api/index.ts'
import { collator } from './catalog.ts'

export type FilterStatus = 'read' | 'unread'
/** The generated view type's union, so a backend change reaches it. */
export type BookType = ShelfBook['type']

/** The chips that are on. `languages` and `tags` hold case keys (`filterKey`). */
export interface CatalogFilters {
  status: readonly FilterStatus[]
  types: readonly BookType[]
  languages: readonly string[]
  tags: readonly string[]
}

export const NO_FILTERS: CatalogFilters = { status: [], types: [], languages: [], tags: [] }

/** A Language or Tag value as the chip's list shows it. */
export interface FilterValue {
  /** The match key: the value ignoring case. */
  key: string
  /** The first spelling in library order. */
  label: string
}

/** The fields of a catalog Book the filters read (all from the server). */
export interface FilterableBook {
  finished: boolean
  type: BookType
  language: string
  tags: readonly string[]
}

/** A Language or Tag value's match key: the value ignoring case. */
export function filterKey(value: string): string {
  return value.toLocaleLowerCase()
}

/**
 * Each value once, ignoring case, keeping the first spelling in `values`'
 * order (library order), sorted with the Catalog's `Intl.Collator`.
 */
export function filterValues(values: Iterable<string>): FilterValue[] {
  const byKey = new Map<string, FilterValue>()
  for (const label of values) {
    const key = filterKey(label)
    if (!byKey.has(key)) byKey.set(key, { key, label })
  }
  return [...byKey.values()].sort((a, b) => collator.compare(a.label, b.label))
}

/**
 * Whether `book` passes every group: Read is `finished` (a re-read finished
 * Book is Read), Unread is not; Type matches `type`; Language and Tag match
 * ignoring case, and a Book with no tags never matches a Tag filter.
 */
export function matchesFilters(book: FilterableBook, filters: CatalogFilters): boolean {
  const { status, types, languages, tags } = filters
  if (status.length > 0 && !status.includes(book.finished ? 'read' : 'unread')) return false
  if (types.length > 0 && !types.includes(book.type)) return false
  if (languages.length > 0 && !languages.includes(filterKey(book.language))) return false
  if (tags.length > 0 && !book.tags.some((tag) => tags.includes(filterKey(tag)))) return false
  return true
}

/** Whether any chip or checked value is on. */
export function filtersOn(filters: CatalogFilters): boolean {
  const { status, types, languages, tags } = filters
  return status.length + types.length + languages.length + tags.length > 0
}

/** `list` with `value` added, or removed if it was there; a new array. */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * `filters` without the checked Language and Tag keys that no Book has any
 * more (after a refetch), so matching and the chip count ignore them.
 */
export function liveFilters(
  filters: CatalogFilters,
  languages: readonly FilterValue[],
  tags: readonly FilterValue[],
): CatalogFilters {
  const keep = (checked: readonly string[], values: readonly FilterValue[]) => {
    const live = checked.filter((key) => values.some((value) => value.key === key))
    return live.length === checked.length ? checked : live
  }
  const liveLanguages = keep(filters.languages, languages)
  const liveTags = keep(filters.tags, tags)
  if (liveLanguages === filters.languages && liveTags === filters.tags) return filters
  return { ...filters, languages: liveLanguages, tags: liveTags }
}
