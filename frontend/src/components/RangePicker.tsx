import { RANGE_PRESETS, type RangePreset } from '../lib/stats.ts'
import styles from './ViewToggle.module.css'

type Props = {
  value: RangePreset
  onChange: (value: RangePreset) => void
}

/** The Stats range picker: This month · This year · Last year · All time · Custom, with ViewToggle's look. */
export default function RangePicker({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Range" className={styles.group}>
      {RANGE_PRESETS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
