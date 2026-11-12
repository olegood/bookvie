import { useId } from 'react'
import { CATALOG_SORTS, CATALOG_SORT_LABELS, isCatalogSort, type CatalogSortKey } from '../lib/catalogSort.ts'
import styles from './SortSelect.module.css'

type Props = {
  value: CatalogSortKey
  onChange: (value: CatalogSortKey) => void
}

/**
 * The Catalog's Sort select (DESIGN.md → Sort select): a native `select`
 * styled as a Text field, its visible label "Sort" to the left. Exactly the
 * four keys, with no empty option.
 */
export default function SortSelect({ value, onChange }: Props) {
  const id = useId()
  return (
    <div className={styles.sort}>
      <label htmlFor={id} className={styles.label}>
        Sort
      </label>
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
    </div>
  )
}
