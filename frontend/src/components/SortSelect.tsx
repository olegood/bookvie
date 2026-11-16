import { useId } from 'react'
import { CATALOG_SORTS, CATALOG_SORT_LABELS, isCatalogSort, type CatalogSortKey } from '../lib/catalogSort.ts'
import SortDirectionToggle from './SortDirectionToggle.tsx'
import styles from './SortSelect.module.css'

type Props = {
  value: CatalogSortKey
  onChange: (value: CatalogSortKey) => void
  reversed: boolean
  onReverse: () => void
}

/**
 * The Catalog's Sort select (DESIGN.md → Sort select): a native `select`
 * styled as a Text field, its visible label "Sort" to the left. Exactly the
 * four keys, with no empty option. The Sort direction toggle is joined to its
 * right edge as one compound field; both sit in a group named by the label,
 * whose `htmlFor` still names the select.
 */
export default function SortSelect({ value, onChange, reversed, onReverse }: Props) {
  const id = useId()
  const labelId = `${id}-label`
  return (
    <div className={styles.sort} role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={id} className={styles.label}>
        Sort
      </label>
      <div className={styles.field}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(event) => {
            const next = event.target.value
            if (isCatalogSort(next)) onChange(next)
          }}
        >
          {CATALOG_SORTS.map((key) => (
            <option key={key} value={key}>
              {CATALOG_SORT_LABELS[key]}
            </option>
          ))}
        </select>
        <SortDirectionToggle sortKey={value} reversed={reversed} onReverse={onReverse} />
      </div>
    </div>
  )
}
