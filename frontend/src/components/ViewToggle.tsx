import { CATALOG_VIEWS, type CatalogViewChoice } from '../lib/catalogView.ts'
import styles from './ViewToggle.module.css'

const LABELS: Record<CatalogViewChoice, string> = { bookcase: 'Bookcase', list: 'List' }

type Props = {
  value: CatalogViewChoice
  onChange: (value: CatalogViewChoice) => void
}

/** The Bookcase · List segmented control, with the theme toggle's look. */
export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Catalog view" className={styles.group}>
      {CATALOG_VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  )
}
