import { coverSrc } from '../lib/bookDetail.ts'
import styles from './Cover.module.css'

const SIZES = {
  main: { width: 200, height: 300 },
  thumb: { width: 44, height: 64 },
} as const

/** `fill` draws only the placeholder, so it takes no cover file. */
type CoverProps =
  | { coverFile: string | null; title: string; size?: keyof typeof SIZES }
  | { coverFile: null; title: string; size: 'fill' }

/**
 * A Book's cover (DESIGN.md → Book detail, Main book card): an `img` "Cover
 * of *Title*", or the no-cover placeholder (`role="img"` "No cover"), which
 * is not interactive since the title is beside it. `main` is 200×300;
 * `thumb` is the 44×64 thumbnail of the Up next pane and the empty Main book
 * card's suggestion. `fill` is the placeholder only, at 100% × 100% of its
 * box: a Catalog tile's cover box, which draws its own cover.
 */
export default function Cover({ coverFile, title, size = 'main' }: CoverProps) {
  const thumb = size === 'thumb'
  if (coverFile !== null && size !== 'fill') {
    const { width, height } = SIZES[size]
    return (
      <img
        className={[styles.cover, thumb && styles.thumb].filter(Boolean).join(' ')}
        src={coverSrc(coverFile)}
        alt={`Cover of ${title}`}
        width={width}
        height={height}
      />
    )
  }
  return (
    <div
      className={[styles.noCover, thumb && styles.thumb, thumb && styles.noCoverThumb, size === 'fill' && styles.fill]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label="No cover"
    >
      <span className={styles.titleBar} />
      <span className={`${styles.titleBar} ${styles.titleBarShort}`} />
    </div>
  )
}
