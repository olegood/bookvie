import { useId } from 'react'
import { Link } from 'react-router'
import type { HomeMainBook } from '../api/index.ts'
import Cover from './Cover.tsx'
import Gauge from './Gauge.tsx'
import styles from './MainBookCard.module.css'

const NO_MAIN_BOOK = 'No Main book.'
const CHOOSE_A_BOOK = 'Choose a book in the Catalog'

/**
 * Home's Main book card (EXPERIENCE.md → Main book card): a `region` "Main
 * book", named by its eyebrow. The 200×300 cover or the no-cover placeholder,
 * the "MAIN BOOK" eyebrow, the serif title (3-line clamp) linking to Book
 * detail, the author, "Edition N" only when it isn't 1, then the gauge.
 * Without a Main book the same frame and name hold "No Main book." and a
 * link to the Catalog.
 */
export default function MainBookCard({ book }: { book: HomeMainBook | null }) {
  const eyebrowId = useId()
  if (book === null) {
    return (
      <section className={`${styles.card} ${styles.empty}`} aria-label="Main book">
        <h2 className={styles.emptyHeading}>{NO_MAIN_BOOK}</h2>
        <p className={styles.emptyBody}>
          <Link to="/catalog">{CHOOSE_A_BOOK}</Link>
        </p>
      </section>
    )
  }
  return (
    <section className={`${styles.card} ${styles.main}`} aria-labelledby={eyebrowId}>
      <Cover coverFile={book.coverFile} title={book.title} />
      <div className={styles.info}>
        <p id={eyebrowId} className={styles.eyebrow}>
          Main book
        </p>
        <h2 className={styles.titleHeading}>
          <Link to={`/book/${book.id}`} className={styles.title}>
            {book.title}
          </Link>
        </h2>
        <p className={styles.authors}>{book.authors.join('; ')}</p>
        {book.edition !== 1 && <p className={styles.edition}>Edition {book.edition}</p>}
        <Gauge title={book.title} page={book.currentPage} pages={book.pages} percent={book.percent} />
      </div>
    </section>
  )
}
