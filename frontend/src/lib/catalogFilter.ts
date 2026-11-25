// Catalog's filter chips (FR-20, UX-DR20, UX-DR94): Status, Type, Language,
// Tag and Publisher. Pure rules over the catalog view's Books: chips in a group
// combine with OR, groups with each other (and with Search titles) with AND,
// and an empty group is no constraint. Filters live in CatalogPage state only,
// never in storage.

import type { ShelfBook } from '../api/index.ts'
import { collator } from './catalog.ts'

export type FilterStatus = 'read' | 'unread'
/** The generated view type's union, so a backend change reaches it. */
export type BookType = ShelfBook['type']

/** The chips that are on. `languages`, `tags` and `publishers` hold case keys (`filterKey`). */
export interface CatalogFilters {
  status: readonly FilterStatus[]
  types: readonly BookType[]
  languages: readonly string[]
  tags: readonly string[]
  publishers: readonly string[]
}

export const NO_FILTERS: CatalogFilters = { status: [], types: [], languages: [], tags: [], publishers: [] }

/** A Language, Tag or Publisher value as the chip's list shows it. */
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
  publisher: string
}

/** A Publisher value with its Book count in the whole library. */
export type PublisherValue = FilterValue & { count: number }

/** A Language, Tag or Publisher value's match key: the value ignoring case. */
export function filterKey(value: string): string {
  return value.toLocaleLowerCase()
}

/**
 * Each value once, ignoring case, keeping the first spelling in `values`'
 * order (library order), sorted with the Catalog's `Intl.Collator`. A blank
 * value is skipped, since its checkbox would have no name. The server refuses
 * one (AD-18), so this is only a guard.
 */
export function filterValues(values: Iterable<string>): FilterValue[] {
  const byKey = new Map<string, FilterValue>()
  for (const label of values) {
    const key = filterKey(label)
    if (key.trim() !== '' && !byKey.has(key)) byKey.set(key, { key, label })
  }
  return [...byKey.values()].sort((a, b) => collator.compare(a.label, b.label))
}

/**
 * Each publisher once, keyed and labelled as `filterValues` does, with its
 * Book count across every spelling (one entry in `values` per Book). Sorted by
 * count, most first, then with the Catalog's `Intl.Collator`. Pass every Book
 * in the catalog view, never the filtered set, so the counts and the order
 * don't move with the other filters. A blank value is skipped, as
 * `filterValues` does: its checkbox would have no name, and the server refuses
 * one (AD-18).
 */
export function publisherValues(values: Iterable<string>): PublisherValue[] {
  const byKey = new Map<string, PublisherValue>()
  for (const label of values) {
    const key = filterKey(label)
    if (key.trim() === '') continue
    const value = byKey.get(key)
    if (value) value.count += 1
    else byKey.set(key, { key, label, count: 1 })
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || collator.compare(a.label, b.label))
}

/**
 * Whether `book` passes every group: Read is `finished` (a re-read finished
 * Book is Read), Unread is not; Type matches `type`; Language, Tag and
 * Publisher match ignoring case, and a Book with no tags never matches a Tag
 * filter.
 */
export function matchesFilters(book: FilterableBook, filters: CatalogFilters): boolean {
  const { status, types, languages, tags, publishers } = filters
  if (status.length > 0 && !status.includes(book.finished ? 'read' : 'unread')) return false
  if (types.length > 0 && !types.includes(book.type)) return false
  if (languages.length > 0 && !languages.includes(filterKey(book.language))) return false
  if (tags.length > 0 && !book.tags.some((tag) => tags.includes(filterKey(tag)))) return false
  if (publishers.length > 0 && !publishers.includes(filterKey(book.publisher))) return false
  return true
}

/** Whether any chip or checked value is on. */
export function filtersOn(filters: CatalogFilters): boolean {
  const { status, types, languages, tags, publishers } = filters
  return status.length + types.length + languages.length + tags.length + publishers.length > 0
}

/** `list` with `value` added, or removed if it was there; a new array. */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/**
 * `filters` without the checked Language, Tag and Publisher keys that no Book
 * has any more (after a refetch), so matching and the chip count ignore them.
 * The same object when every checked key is live.
 */
export function liveFilters(
  filters: CatalogFilters,
  languages: readonly FilterValue[],
  tags: readonly FilterValue[],
  publishers: readonly FilterValue[],
): CatalogFilters {
  const keep = (checked: readonly string[], values: readonly FilterValue[]) => {
    const live = checked.filter((key) => values.some((value) => value.key === key))
    return live.length === checked.length ? checked : live
  }
  const liveLanguages = keep(filters.languages, languages)
  const liveTags = keep(filters.tags, tags)
  const livePublishers = keep(filters.publishers, publishers)
  if (liveLanguages === filters.languages && liveTags === filters.tags && livePublishers === filters.publishers) {
    return filters
  }
  return { ...filters, languages: liveLanguages, tags: liveTags, publishers: livePublishers }
}
