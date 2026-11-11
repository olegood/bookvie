import { useId, type RefCallback, type RefObject } from 'react'
import { Link } from 'react-router'
import type { BookCardNote } from '../api/index.ts'
import CardNoteItem from '../components/CardNoteItem.tsx'
import {
  cardNotesHeading,
  cardNotesPath,
  NO_CARD_NOTES,
  noNotesMatchCopy,
  SEARCH_CARD_NOTES,
} from '../lib/cardNotes.ts'
import SearchTitles from './SearchTitles.tsx'
// The block uses Book detail's module for its block styles (`.block`, `.blockLabel`, `.none`)
// and its grid, search and links rules (`.cardNotes`, `.noteSearch`, `.seeAll`).
import styles from './BookDetailPage.module.css'

/**
 * Book detail's "Card notes (N)" block (EXPERIENCE.md → Book detail): a
 * `region` named by its heading (N is the Book's total). With notes, a
 * Search card notes field under the heading, then the first three notes in
 * page order as cards (every matching note, matches in `<mark>`, while the
 * field holds text; "No card notes contain “…”." when none match), each its
 * text (clamped to 6 lines while the search is empty, so a match is never
 * hidden), then its page ref below as a `chip` button ("Open p.96 in the
 * pile"), then its **Edit** (named "Edit p.96", so it never matches the
 * Book's own Edit); then "Go through as a pile" and the link "See all card
 * notes" to the scoped Card notes page. With none, "No card notes yet." and
 * no field or link. The heading takes focus (`tabIndex={-1}`) when a note's
 * Edit is gone after a save or delete.
 */
export default function CardNotesBlock({
  bookId,
  notes,
  shown,
  query,
  onSearch,
  heading,
  editButton,
  onEdit,
  pileOpener,
  onOpenPile,
}: {
  bookId: string
  notes: readonly BookCardNote[]
  shown: readonly BookCardNote[]
  query: string
  onSearch: (value: string) => void
  heading: RefObject<HTMLHeadingElement | null>
  editButton: (noteId: string) => RefCallback<HTMLButtonElement>
  onEdit: (note: BookCardNote) => void
  pileOpener: RefObject<HTMLButtonElement | null>
  /** Opens the pile at that note, else at the first. */
  onOpenPile: (noteId?: string) => void
}) {
  const headingId = useId()
  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h2 ref={heading} id={headingId} className={styles.blockLabel} tabIndex={-1}>
        {cardNotesHeading(notes.length)}
      </h2>
      {notes.length === 0 ? (
        <p className={styles.none}>{NO_CARD_NOTES}</p>
      ) : (
        <>
          <div className={styles.noteSearch}>
            <SearchTitles label={SEARCH_CARD_NOTES} value={query} onChange={onSearch} />
          </div>
          {shown.length === 0 ? (
            <p className={styles.none}>{noNotesMatchCopy(query)}</p>
          ) : (
            <ul className={styles.cardNotes} role="list">
              {shown.map((note) => (
                <CardNoteItem
                  key={note.id}
                  note={note}
                  query={query}
                  editRef={editButton(note.id)}
                  onEdit={() => onEdit(note)}
                  onOpenPile={() => onOpenPile(note.id)}
                  clamped={query.trim() === ''}
                />
              ))}
            </ul>
          )}
          <div className={styles.seeAll}>
            <button ref={pileOpener} type="button" className="linkButton" onClick={() => onOpenPile()}>
              Go through as a pile
            </button>
            <Link to={cardNotesPath(bookId)}>See all card notes</Link>
          </div>
        </>
      )}
    </section>
  )
}
