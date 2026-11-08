import { useId } from 'react'
import { Link } from 'react-router'
import type { HomeWaiting } from '../api/index.ts'
import { gaugePageLine, miniBarValueText } from '../lib/gauge.ts'
import Button from './Button.tsx'
import styles from './WaitingPane.module.css'

/**
 * Home's Waiting for you pane (DESIGN.md / EXPERIENCE.md → Section pane): a
 * `region` named by its section label "Waiting for you (N)" (set in
 * uppercase), after the Up next pane in the side column. One row per entry of
 * the home view's `waiting`, in the server's order (oldest pause first, AD-6;
 * never re-sorted here), with no cap and no inner scroll: the side column
 * grows and the page scrolls. Each row: the serif title as a `link` to Book
 * detail (2-line clamp), then the 60×5 mini bar (labeled by the title,
 * `aria-valuetext` "page 120 of 330, 36%"), "p.120 of 330" in tabular
 * figures, and a compact secondary **Resume** named with the title ("Resume
 * The Left Hand of Darkness"). The paused-at date is never shown (NFR6).
 * **Resume** calls `onStart` with the Book and the pressed button; Home hosts
 * the Start dialog and returns focus to that button on Cancel. Renders
 * nothing when the list is empty.
 */
export default function WaitingPane({
  waiting,
  onStart,
}: {
  waiting: HomeWaiting[]
  onStart: (bookId: string, opener: HTMLElement) => void
}) {
  const headingId = useId()
  if (waiting.length === 0) return null
  return (
    <section className={styles.pane} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Waiting for you ({waiting.length})
      </h2>
      <ul className={styles.rows}>
        {waiting.map((entry) => (
          <WaitingRow key={entry.id} entry={entry} onStart={onStart} />
        ))}
      </ul>
    </section>
  )
}

function WaitingRow({
  entry,
  onStart,
}: {
  entry: HomeWaiting
  onStart: (bookId: string, opener: HTMLElement) => void
}) {
  const titleId = useId()
  return (
    <li className={styles.row}>
      <Link id={titleId} to={`/book/${entry.id}`} className={styles.title}>
        {entry.title}
      </Link>
      <div className={styles.line}>
        <div
          className={styles.bar}
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={entry.percent}
          aria-valuetext={miniBarValueText(entry.currentPage, entry.pages, entry.percent)}
        >
          <span className={styles.fill} style={{ width: `${entry.percent}%` }} />
        </div>
        <p className={styles.pages}>{gaugePageLine(entry.currentPage, entry.pages)}</p>
        <Button
          className={styles.compact}
          aria-label={`Resume ${entry.title}`}
          onClick={(event) => onStart(entry.id, event.currentTarget)}
        >
          Resume
        </Button>
      </div>
    </li>
  )
}
