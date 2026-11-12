import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from 'react'
import {
  toggleValue,
  type BookType,
  type CatalogFilters,
  type FilterStatus,
  type FilterValue,
} from '../lib/catalogFilter.ts'
import styles from './FilterChips.module.css'

const STATUSES: readonly [FilterStatus, string][] = [
  ['read', 'Read'],
  ['unread', 'Unread'],
]

const TYPES: readonly [BookType, string][] = [
  ['paperback', 'Paperback'],
  ['hardcover', 'Hardcover'],
  ['ebook', 'Ebook'],
]

type ListField = 'languages' | 'tags'

type Props = {
  /** The live filters (stale checked values already dropped). */
  filters: CatalogFilters
  /** The Language and Tag values in the catalog view, in collator order. */
  languages: readonly FilterValue[]
  tags: readonly FilterValue[]
  onChange: (next: CatalogFilters) => void
  /** Clear filters: every chip and checked value off. */
  onClear: () => void
  /** Whether any filter is on (Clear filters shows only then). */
  on: boolean
  /** The Read chip, which takes focus after Clear filters. */
  readRef: Ref<HTMLButtonElement>
}

/**
 * Language ▾ or Tag ▾: a chip that opens a small `surface` list of native
 * checkboxes, one per value. The popup closes on Esc (focus back to the
 * chip), on a pointer press outside the chip and the popup, and when focus
 * moves to another element outside them (Tab away).
 */
function ValueList({
  label,
  values,
  checked,
  open,
  onOpenChange,
  onToggle,
}: {
  label: string
  values: readonly FilterValue[]
  checked: readonly string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (key: string) => void
}) {
  const popupId = useId()
  const chipRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const count = checked.length

  // A press outside closes it; a press on a label's text blurs with no
  // `relatedTarget`, so blur alone can't tell it from an outside click.
  useEffect(() => {
    if (!open) return
    const press = (event: PointerEvent) => {
      if (event.target instanceof Node && wrapRef.current?.contains(event.target)) return
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', press)
    return () => document.removeEventListener('pointerdown', press)
  }, [open, onOpenChange])

  const keyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    event.stopPropagation()
    onOpenChange(false)
    chipRef.current?.focus()
  }

  const blur = (event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget
    if (open && next instanceof Element && !event.currentTarget.contains(next)) onOpenChange(false)
  }

  return (
    <span ref={wrapRef} className={styles.wrap} onKeyDown={keyDown} onBlur={blur}>
      <button
        ref={chipRef}
        type="button"
        className={styles.chip}
        aria-pressed={count > 0}
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        // macOS Safari doesn't focus a clicked button; without focus inside the
        // wrap, Esc never reaches `keyDown`. Focusing in code works there.
        onClick={(event) => {
          event.currentTarget.focus()
          onOpenChange(!open)
        }}
      >
        {count > 0 ? (
          `${label}: ${count}`
        ) : (
          <>
            {label} <span aria-hidden="true">▾</span>
          </>
        )}
      </button>
      {open && (
        <div
          id={popupId}
          role="group"
          aria-label={label}
          className={styles.popup}
          // A press on a label's text or the popup's padding would focus `main`
          // (tabindex -1) and blur the popup closed before the click lands.
          onMouseDown={(event) => {
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault()
          }}
        >
          {values.map((value) => (
            <label key={value.key} className={styles.option}>
              <input
                type="checkbox"
                checked={checked.includes(value.key)}
                onChange={() => onToggle(value.key)}
                // As the chip: keep focus in the popup after a Safari click, so Esc closes it.
                onClick={(event) => event.currentTarget.focus()}
              />
              {value.label}
            </label>
          ))}
        </div>
      )}
    </span>
  )
}

/**
 * Catalog's toolbar row 2 (DESIGN.md → Filter chips): the Status and Type
 * chip groups, Language ▾ and Tag ▾, then "Clear filters" while any filter
 * is on. Every chip is a toggle button with `aria-pressed`.
 */
export default function FilterChips({ filters, languages, tags, onChange, onClear, on, readRef }: Props) {
  const statusId = useId()
  const typeId = useId()
  const [openList, setOpenList] = useState<ListField | null>(null)

  const list = (field: ListField, label: string, values: readonly FilterValue[]) => (
    <ValueList
      label={label}
      values={values}
      checked={filters[field]}
      open={openList === field}
      onOpenChange={(open) => setOpenList((current) => (open ? field : current === field ? null : current))}
      onToggle={(key) => onChange({ ...filters, [field]: toggleValue(filters[field], key) })}
    />
  )

  return (
    <div className={styles.row}>
      <div role="group" aria-labelledby={statusId} className={styles.group}>
        <span id={statusId} className={styles.groupName}>
          Status
        </span>
        {STATUSES.map(([value, label]) => (
          <button
            key={value}
            ref={value === 'read' ? readRef : undefined}
            type="button"
            className={styles.chip}
            aria-pressed={filters.status.includes(value)}
            onClick={() => onChange({ ...filters, status: toggleValue(filters.status, value) })}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="group" aria-labelledby={typeId} className={styles.group}>
        <span id={typeId} className={styles.groupName}>
          Type
        </span>
        {TYPES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={styles.chip}
            aria-pressed={filters.types.includes(value)}
            onClick={() => onChange({ ...filters, types: toggleValue(filters.types, value) })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.group}>
        {list('languages', 'Language', languages)}
        {list('tags', 'Tag', tags)}
      </div>
      {on && (
        <button type="button" className={`linkButton ${styles.clear}`} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  )
}
