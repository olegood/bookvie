import type { RefObject } from 'react'
import { Link } from 'react-router'
import type { ShelfBook } from '../api/index.ts'
import { formatDateAdded, matchesTitle, noMatchCopy } from '../lib/catalog.ts'
import styles from './CatalogList.module.css'

type Props = {
  /** Already in display order. */
  books: readonly ShelfBook[]
  query: string
  /** The Book whose row carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the title links. */
  focusTargets: RefObject<Map<string, HTMLElement>>
}

const pages = new Intl.NumberFormat('en-GB')

/**
 * The List view (DESIGN.md → List view): Title, Author, Pages, Status, Date
 * added, in that fixed order. Rows whose titles don't match Search titles are
 * `hidden`. Each title is a link to its Book detail.
 */
export default function CatalogList({ books, query, highlightId, focusTargets }: Props) {
  const matches = books.filter((book) => matchesTitle(book.title, query))
  return (
    <>
      {matches.length === 0 && <p className={styles.noMatch}>{noMatchCopy(query)}</p>}
      <table className={styles.table} hidden={matches.length === 0}>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Author</th>
            <th scope="col" className={styles.number}>
              Pages
            </th>
            <th scope="col">Status</th>
            <th scope="col">Date added</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr
              key={book.id}
              hidden={!matchesTitle(book.title, query)}
              className={book.id === highlightId ? styles.highlight : undefined}
            >
              <td className={styles.title}>
                <Link
                  to={`/book/${encodeURIComponent(book.id)}`}
                  className={styles.titleLink}
                  tabIndex={0}
                  ref={(link) => {
                    const targets = focusTargets.current
                    if (link) targets.set(book.id, link)
                    return () => {
                      if (targets.get(book.id) === link) targets.delete(book.id)
                    }
                  }}
                >
                  {book.title}
                </Link>
              </td>
              <td>{book.authors.join('; ')}</td>
              <td className={styles.number}>{pages.format(book.pages)}</td>
              <td>
                <span className={styles.status}>
                  <span
                    aria-hidden="true"
                    className={book.finished ? styles.glyphFinished : styles.glyphUnread}
                    style={book.finished ? { backgroundColor: book.spineColor } : undefined}
                  />
                  {book.finished ? 'Finished' : 'Not read yet'}
                </span>
              </td>
              <td>{formatDateAdded(book.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
