import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { cardNoteBoxName, cardNoteCount, cardNotesPath, pileCards } from '../lib/cardNotes.ts'
import styles from './CardNoteBox.module.css'

/** DESIGN.md → Card note box → Cards: each card's turn in degrees, from the back; a smaller pile takes the first k. */
const CARD_ANGLES = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8, -1.8] as const

/** Card i of k: how many card steps above the front card it stands, and its turn. */
function cardStyle(offset: number, angle: number): CSSProperties & Record<'--card-offset', number> {
  return { '--card-offset': offset, rotate: `${angle}deg` }
}

type Props = {
  bookId: string
  title: string
  /** The Book's resolved spine color, exactly as the view gives it. */
  spineColor: string
  /** How many card notes the Book has. */
  count: number
}

/**
 * One Book's card notes drawn as an open box (DESIGN.md → Card note box;
 * Story 14.2): a link to the Book's open box (`/card-notes?book=<id>`) named
 * "*Title*, N card notes", holding a pile of 1, 3, 5 or 7 paper cards
 * (`pileCards`), then the front in the Book's exact spine color with the
 * label: the title (2 lines, then an ellipsis) and the count.
 */
export default function CardNoteBox({ bookId, title, spineColor, count }: Props) {
  const cards = pileCards(count)
  const front: CSSProperties & Record<'--box-color', string> = { '--box-color': spineColor }
  return (
    <Link to={cardNotesPath(bookId)} className={styles.box} aria-label={cardNoteBoxName(title, count)}>
      {CARD_ANGLES.slice(0, cards).map((angle, i) => (
        <span key={i} className={styles.card} style={cardStyle(cards - 1 - i, angle)} />
      ))}
      <span className={styles.front} style={front}>
        <span className={styles.label}>
          <span className={styles.title}>{title}</span>
          <span className={styles.count}>{cardNoteCount(count)}</span>
        </span>
      </span>
    </Link>
  )
}
