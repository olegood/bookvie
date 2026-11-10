import { highlightParts } from '../lib/cardNotes.ts'
import styles from './MarkedText.module.css'

/**
 * A note's text with every match of `query` in `<mark>`, in the note's own
 * casing (DESIGN.md → Card notes list: `accent-soft` background, weight 600,
 * a 1px `accent` underline). A blank query renders the text as is.
 */
export default function MarkedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.mark ? (
          <mark key={index} className={styles.mark}>
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  )
}
