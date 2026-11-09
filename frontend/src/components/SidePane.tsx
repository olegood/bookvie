import { useId } from 'react'
import { Link } from 'react-router'
import type { HomeSideRead } from '../api/index.ts'
import Button from './Button.tsx'
import styles from './WaitingPane.module.css'

/**
 * Home's On the side pane (DESIGN.md / EXPERIENCE.md → Section pane,
 * UX-DR38): a `region` named by its section label "On the side" (set in
 * uppercase), after the Waiting for you pane in the side column, shown with
 * or without a Main book. One row per entry of the home view's `sideReads`,
 * in the server's order (`sideReadBookIds`). Each row: the serif title as a
 * `link` to Book detail (2-line clamp), the author line, and a compact
 * secondary **Start reading** named with the title ("Start reading
 * Kindred"), even for a paused Side read (the dialog's heading still says
 * Resume). **Start reading** calls `onStart` with the Book and the pressed
 * button; Home hosts the Start dialog, which asks "Which page?", and returns
 * focus to that button on Cancel. A Side read that is also Up next or
 * Waiting for you shows in both panes. Renders nothing when the list is
 * empty.
 */
export default function SidePane({
  sideReads,
  onStart,
}: {
  sideReads: HomeSideRead[]
  onStart: (bookId: string, opener: HTMLElement) => void
}) {
  const headingId = useId()
  if (sideReads.length === 0) return null
  return (
    <section className={styles.pane} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        On the side
      </h2>
      <ul className={styles.rows}>
        {sideReads.map((entry) => (
          <li key={entry.id} className={styles.row}>
            <Link to={`/book/${entry.id}`} className={styles.title}>
              {entry.title}
            </Link>
            <div className={styles.line}>
              <p className={styles.authors}>{entry.authors.join('; ')}</p>
              <Button
                className={styles.compact}
                aria-label={`Start reading ${entry.title}`}
                onClick={(event) => onStart(entry.id, event.currentTarget)}
              >
                Start reading
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
