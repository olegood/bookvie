import { CATALOG_SORT_DIRECTION_LABELS, type CatalogSortKey } from '../lib/catalogSort.ts'
import styles from './SortDirectionToggle.module.css'

type Props = {
  sortKey: CatalogSortKey
  reversed: boolean
  onReverse: () => void
}

/**
 * The Sort direction toggle (DESIGN.md → Sort direction toggle, UX-DR63,
 * UX-DR64): a plain button joined to the Sort select's right edge. Its name
 * is the order in effect ("A–Z", "Oldest first"); the arrow before it (↑
 * natural, ↓ reversed) is hidden from assistive tech. No `aria-pressed`: the
 * new name is the only feedback. Its minimum width is the wider of the key's
 * two labels, drawn by a hidden `::after` twin, so a press never moves the
 * controls to its right.
 */
export default function SortDirectionToggle({ sortKey, reversed, onReverse }: Props) {
  const labels = CATALOG_SORT_DIRECTION_LABELS[sortKey]
  const [label, other] = reversed ? [labels.reversed, labels.natural] : [labels.natural, labels.reversed]
  return (
    <button type="button" className={styles.toggle} onClick={onReverse}>
      <span aria-hidden="true" className={styles.arrow}>
        {reversed ? '↓' : '↑'}
      </span>
      <span className={styles.label} data-other={other}>
        <span>{label}</span>
      </span>
    </button>
  )
}
