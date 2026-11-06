import { coverSrc } from '../lib/bookDetail.ts'
import styles from './Cover.module.css'

/**
 * A Book's 200×300 cover (DESIGN.md → Book detail, Main book card): an `img`
 * "Cover of *Title*", or the no-cover placeholder (`role="img"` "No cover"),
 * which is not interactive since the title is beside it.
 */
export default function Cover({ coverFile, title }: { coverFile: string | null; title: string }) {
  if (coverFile !== null) {
    return <img className={styles.cover} src={coverSrc(coverFile)} alt={`Cover of ${title}`} width={200} height={300} />
  }
  return (
    <div className={styles.noCover} role="img" aria-label="No cover">
      <span className={styles.titleBar} />
      <span className={`${styles.titleBar} ${styles.titleBarShort}`} />
    </div>
  )
}
