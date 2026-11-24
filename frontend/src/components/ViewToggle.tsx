import styles from './ViewToggle.module.css'

type Props<T extends string> = {
  /** The group's accessible name: "Catalog view", "Card notes view". */
  label: string
  /** The options in order, each its value and its visible text. */
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/**
 * A segmented view control (Catalog's Bookcase · List · Tiles, Card notes'
 * Boxes · List), with the theme toggle's look: text only, `aria-pressed`.
 */
export default function ViewToggle<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => (
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
