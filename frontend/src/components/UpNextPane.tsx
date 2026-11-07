import { useId, type Ref } from 'react'
import { Link } from 'react-router'
import type { HomeUpNext } from '../api/index.ts'
import { CHOOSE_A_BOOK } from '../lib/copy.ts'
import { upNextStart } from '../lib/startReading.ts'
import Button from './Button.tsx'
import Cover from './Cover.tsx'
import styles from './UpNextPane.module.css'

/**
 * Home's Up next pane (DESIGN.md / EXPERIENCE.md → Section pane): a `region`
 * "Up next", named by its section label (set in uppercase). Its one row: the
 * 44×64 cover thumbnail (or placeholder), the serif title as a `link` to Book
 * detail (2-line clamp), the author, and a compact secondary **Start
 * reading** or **Resume** (`lib/startReading.ts`) whose name adds the title
 * ("Resume The Left Hand of Darkness"). It calls `onStart`; Home hosts the
 * Start dialog, so a refetch that hides the pane leaves the dialog open, and
 * Cancel or Esc returns focus to `buttonRef`. Without an Up next: "Nothing up
 * next." and a link to the Catalog. Home shows the pane only while a Main
 * book exists (the empty Main book card suggests Up next otherwise).
 */
export default function UpNextPane({
  upNext,
  onStart,
  buttonRef,
}: {
  upNext: HomeUpNext | null
  onStart: (bookId: string) => void
  buttonRef?: Ref<HTMLButtonElement>
}) {
  const headingId = useId()
  return (
    <section className={styles.pane} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Up next
      </h2>
      {upNext === null ? (
        <>
          <p className={styles.empty}>Nothing up next.</p>
          <p className={styles.emptyLink}>
            <Link to="/catalog">{CHOOSE_A_BOOK}</Link>
          </p>
        </>
      ) : (
        <div className={styles.row}>
          <Cover coverFile={upNext.coverFile} title={upNext.title} size="thumb" />
          <div className={styles.body}>
            <Link to={`/book/${upNext.id}`} className={styles.title}>
              {upNext.title}
            </Link>
            <div className={styles.line}>
              <p className={styles.authors}>{upNext.authors.join('; ')}</p>
              <Button
                ref={buttonRef}
                className={styles.compact}
                aria-label={`${upNextStart(upNext)} ${upNext.title}`}
                onClick={() => onStart(upNext.id)}
              >
                {upNextStart(upNext)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
