import { useId, type Ref } from 'react'
import { Link } from 'react-router'
import type { HomeMainBook } from '../api/index.ts'
import Cover from './Cover.tsx'
import Gauge from './Gauge.tsx'
import PageField from './PageField.tsx'
import ReentryLine from './ReentryLine.tsx'
import styles from './MainBookCard.module.css'

const NO_MAIN_BOOK = 'No Main book.'
const CHOOSE_A_BOOK = 'Choose a book in the Catalog'

/**
 * Home's Main book card (EXPERIENCE.md → Main book card): a `region` "Main
 * book", named by its eyebrow. The 200×300 cover or the no-cover placeholder,
 * the "MAIN BOOK" eyebrow, the serif title (3-line clamp) linking to Book
 * detail, the author, "Edition N" only when it isn't 1, then the gauge, the
 * page field and, last, the re-entry line ("Last updated …" · "~N days left"
 * · "Last export …"), fed by Home's `lastExportAt` and `now` so it recomputes
 * with the date header on focus and visibility.
 * Without a Main book the same frame and name hold "No Main book." and a
 * link to the Catalog. `titleRef` is the title link, which Home focuses after
 * a confirmed start.
 */
export default function MainBookCard({
  book,
  lastExportAt,
  now,
  titleRef,
}: {
  book: HomeMainBook | null
  lastExportAt: string | null
  now: Date
  titleRef?: Ref<HTMLAnchorElement>
}) {
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
          <Link ref={titleRef} to={`/book/${book.id}`} className={styles.title}>
            {book.title}
          </Link>
        </h2>
        <p className={styles.authors}>{book.authors.join('; ')}</p>
        {book.edition !== 1 && <p className={styles.edition}>Edition {book.edition}</p>}
        <Gauge title={book.title} page={book.currentPage} pages={book.pages} percent={book.percent} />
        <PageField bookId={book.id} currentPage={book.currentPage} pages={book.pages} percent={book.percent} />
        <ReentryLine
          lastProgressUpdate={book.lastProgressUpdate}
          daysLeft={book.daysLeft}
          lastExportAt={lastExportAt}
          now={now}
        />
      </div>
    </section>
  )
}
