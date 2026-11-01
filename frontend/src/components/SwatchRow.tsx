import { SWATCH_COLORS } from '../lib/spineColor.ts'
import styles from './SwatchRow.module.css'

/** DESIGN.md → Spine colors, in rotation order: name, hex, token (names and hexes: `lib/spineColor.ts`). */
const SWATCHES = SWATCH_COLORS.map(([name, hex]) => [name, hex, `var(--color-spine-${name.toLowerCase()})`] as const)

type Props = {
  /** The Spine color field's value; the swatch with that hex shows as pressed. */
  value: string
  onPick: (hex: string) => void
  /**
   * The "From cover" chip, shown only when the Book has a stored cover:
   * `color` is the color the cover gave (`null` for a black-and-white cover,
   * drawn without a dot). Pressing it empties Spine color; it is pressed
   * while Spine color is empty.
   */
  fromCover?: { color: string | null }
}

/** "From cover" (when given), then the eight curated swatches beside Spine color. */
export default function SwatchRow({ value, onPick, fromCover }: Props) {
  const current = value.trim().toLowerCase()
  return (
    <div className={styles.row}>
      {fromCover && (
        <button
          type="button"
          className={styles.chip}
          aria-pressed={current === '' ? 'true' : 'false'}
          onClick={() => onPick('')}
        >
          {fromCover.color !== null && (
            <span className={styles.dot} style={{ backgroundColor: fromCover.color }} aria-hidden="true" />
          )}
          From cover
        </button>
      )}
      {SWATCHES.map(([name, hex, color]) => (
        <button
          key={name}
          type="button"
          className={styles.swatch}
          style={{ backgroundColor: color }}
          aria-label={name}
          aria-pressed={current === hex.toLowerCase() ? 'true' : 'false'}
          onClick={() => onPick(hex)}
        />
      ))}
    </div>
  )
}
