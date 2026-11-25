import styles from './FavouriteStar.module.css'

/** One five-point star in a 24×24 box, the same path as a Reading's rating stars. */
const STAR = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z'

type IconProps = {
  className?: string
  /** A paper halo path under the star (a cover tile, where the background is a book's). */
  halo?: boolean
}

/**
 * The favourite star as an `aria-hidden` SVG: one star path, no glyph
 * character, so it draws the same in every font. The caller's CSS paints
 * it; `halo` adds a paper path under the star.
 */
export function StarIcon({ className, halo = false }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {halo && <path className={styles.halo} d={STAR} />}
      <path className={styles.shape} d={STAR} />
    </svg>
  )
}

export type FavouriteStarVariant = 'detail' | 'popover' | 'row' | 'tile'

type Props = {
  /** Starred: filled gold, `aria-pressed="true"`. */
  favourite: boolean
  /** "Favourite" on Book detail and in the popover, "Favourite *Title*" on a tile or List row. */
  label: string
  variant: FavouriteStarVariant
  /** Sends the value the star should show: `!favourite`. */
  onPress: () => void
  className?: string
}

/**
 * The favourite star (DESIGN.md → Favourite star, EXPERIENCE.md → Favourite
 * star): a plain icon `button` with `aria-pressed` and no visible text. It
 * is never disabled; the caller's flow sends the value and the refetched
 * view sets `favourite`. On a tile the star draws a paper halo under it.
 */
export default function FavouriteStar({ favourite, label, variant, onPress, className }: Props) {
  const classes = [styles.star, styles[variant], className].filter(Boolean).join(' ')
  return (
    <button type="button" className={classes} aria-label={label} aria-pressed={favourite} onClick={onPress}>
      <StarIcon className={styles.icon} halo={variant === 'tile'} />
    </button>
  )
}
