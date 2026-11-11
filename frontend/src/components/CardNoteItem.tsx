import type { RefCallback } from 'react'
import type { BookCardNote } from '../api/index.ts'
import { editNoteName, openInPileName, pageRef } from '../lib/cardNotes.ts'
import Button from './Button.tsx'
import MarkedText from './MarkedText.tsx'
import styles from './CardNoteItem.module.css'

/**
 * One Card note as a list item, shared by the Card notes page and Book
 * detail's Card notes block (DESIGN.md → Card notes list): a `card-note`
 * with its text (matches of `query` in `<mark>`), then its page ref as a
 * `chip` button ("Open p.96 in the pile") that opens the pile at this note,
 * then its **Edit** (named "Edit p.96", so it never matches the Book's own
 * Edit). `clamped` cuts the text to 6 lines, as Book detail's block does
 * while its search is empty; the pile reads the rest.
 */
export default function CardNoteItem({
  note,
  query,
  editRef,
  onEdit,
  onOpenPile,
  clamped = false,
}: {
  note: BookCardNote
  query: string
  editRef: RefCallback<HTMLButtonElement>
  onEdit: () => void
  onOpenPile: () => void
  clamped?: boolean
}) {
  return (
    <li className={styles.note}>
      <p className={styles.text} data-clamped={clamped ? 'true' : undefined}>
        <MarkedText text={note.text} query={query} />
      </p>
      <button
        type="button"
        className={styles.pageRef}
        aria-label={openInPileName(note.pageStart, note.pageEnd)}
        onClick={onOpenPile}
      >
        {pageRef(note.pageStart, note.pageEnd)}
      </button>
      <Button
        ref={editRef}
        className={styles.edit}
        aria-label={editNoteName(note.pageStart, note.pageEnd)}
        onClick={onEdit}
      >
        Edit
      </Button>
    </li>
  )
}
