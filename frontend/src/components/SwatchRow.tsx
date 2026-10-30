import styles from './SwatchRow.module.css'

/** DESIGN.md → Spine colors, in rotation order: name, hex, token. */
const SWATCHES = [
  ['Sage', '#749076', 'var(--color-spine-sage)'],
  ['Slate', '#5B7590', 'var(--color-spine-slate)'],
  ['Clay', '#9B6753', 'var(--color-spine-clay)'],
  ['Ochre', '#B48A45', 'var(--color-spine-ochre)'],
  ['Plum', '#7A6283', 'var(--color-spine-plum)'],
  ['Teal', '#4B7C7B', 'var(--color-spine-teal)'],
  ['Moss', '#6C7650', 'var(--color-spine-moss)'],
  ['Stone', '#6F7375', 'var(--color-spine-stone)'],
] as const

type Props = {
  /** The Spine color field's value; the swatch with that hex shows as pressed. */
  value: string
  onPick: (hex: string) => void
}

/** The eight curated swatches beside Spine color; each fills it with its hex. */
export default function SwatchRow({ value, onPick }: Props) {
  const current = value.trim().toLowerCase()
  return (
    <div className={styles.row}>
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
