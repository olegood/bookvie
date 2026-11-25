import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router'
import type { ShelfBook } from '../api/index.ts'
import FavouriteStar from '../components/FavouriteStar.tsx'
import { formatDateAdded } from '../lib/catalog.ts'
import type { FavouriteFlow } from '../lib/useFavourite.ts'
import styles from './CatalogList.module.css'

type Props = {
  /** Already in display order. */
  books: readonly ShelfBook[]
  /** The ids of the Books that pass Search titles and the filters; the rest are hidden. */
  shown: ReadonlySet<string>
  /** What shows in place of the table when no Book is shown. */
  noMatch: ReactNode
  /** The Book whose row carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the title links. */
  focusTargets: RefObject<Map<string, HTMLElement>>
  /** The favourite star's flow, the Catalog's (shared with Tiles and the Bookcase). */
  favourite: FavouriteFlow
}

const pages = new Intl.NumberFormat('en-GB')

/**
 * The List view (DESIGN.md → List view): Title, Author, Pages, Status, Date
 * added, in that fixed order. Rows of Books that Search titles or the filter
 * chips leave out are `hidden`. Each title is a link to its Book detail,
 * followed by its favourite star ("Favourite *Title*"): starred, it always
 * shows; unstarred, only on row hover or focus within. The row is no taller.
 */
export default function CatalogList({ books, shown, noMatch, highlightId, focusTargets, favourite }: Props) {
  const none = !books.some((book) => shown.has(book.id))
  return (
    <>
      {none && <p className={styles.noMatch}>{noMatch}</p>}
      <table className={styles.table} hidden={none}>
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
              hidden={!shown.has(book.id)}
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
                <FavouriteStar
                  favourite={book.favourite}
                  label={`Favourite ${book.title}`}
                  variant="row"
                  className={styles.star}
                  onPress={() => favourite.press({ id: book.id, title: book.title }, !book.favourite)}
                />
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
