import { useCallback, useMemo, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import type { ShelfBook } from '../api/index.ts'
import Cover from '../components/Cover.tsx'
import { coverSrc } from '../lib/bookDetail.ts'
import { spineNames, tilesName } from '../lib/catalog.ts'
import styles from './CatalogTiles.module.css'

type Props = {
  /** Already in display order. */
  books: readonly ShelfBook[]
  /** The ids of the Books that pass Search titles and the filters; the rest are hidden. */
  shown: ReadonlySet<string>
  /** What shows in place of the grid when no Book is shown. */
  noMatch: ReactNode
  /** The Book whose cover box carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the tile links. */
  focusTargets: RefObject<Map<string, HTMLElement>>
}

type CoverState = 'loading' | 'loaded' | 'failed'

/**
 * The cover inside a tile's box: the stored cover, shown whole at the bottom
 * of the box once it loads (flat `surface-inset` with a hairline until then),
 * or the no-cover placeholder without a cover or when the file isn't an
 * image. Keyed by `coverFile`, so a new cover starts loading again.
 */
function TileCover({ coverFile, title }: { coverFile: string | null; title: string }) {
  const [state, setState] = useState<CoverState>('loading')
  // A cached cover can finish before React listens for `load`.
  const imageRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setState('loaded')
  }, [])
  if (coverFile === null || state === 'failed') {
    return (
      <div className={styles.box} aria-hidden="true">
        <Cover coverFile={null} title={title} size="fill" />
      </div>
    )
  }
  const loaded = state === 'loaded'
  return (
    <div className={loaded ? styles.box : `${styles.box} ${styles.loading}`} aria-hidden="true">
      <img
        ref={imageRef}
        className={loaded ? `${styles.cover} ${styles.coverLoaded}` : styles.cover}
        src={coverSrc(coverFile)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
      />
    </div>
  )
}

/**
 * The Tiles view (DESIGN.md → Catalog tile, Layout → Tiles): a grid of
 * covers in the Catalog's sort, each tile one link to its Book detail, named
 * like its spine. Tiles of Books that Search titles or the filter chips leave
 * out are `hidden`, and the grid closes up.
 */
export default function CatalogTiles({ books, shown, noMatch, highlightId, focusTargets }: Props) {
  // Named over every Book, shown or not, so a twin's name never changes with a search or a filter.
  const names = useMemo(() => spineNames(books), [books])
  const none = !books.some((book) => shown.has(book.id))
  return (
    <>
      {none && <p className={styles.noMatch}>{noMatch}</p>}
      <ul role="list" aria-label={tilesName(books.length)} className={styles.grid} hidden={none}>
        {books.map((book) => (
          <li key={book.id} hidden={!shown.has(book.id)}>
            <Link
              to={`/book/${encodeURIComponent(book.id)}`}
              aria-label={names.get(book.id)}
              className={book.id === highlightId ? `${styles.link} ${styles.highlight}` : styles.link}
              ref={(link) => {
                const targets = focusTargets.current
                if (link) targets.set(book.id, link)
                return () => {
                  if (targets.get(book.id) === link) targets.delete(book.id)
                }
              }}
            >
              <TileCover key={book.coverFile ?? ''} coverFile={book.coverFile} title={book.title} />
              <div className={styles.slot} />
              <div className={styles.caption}>
                <span className={styles.title}>{book.title}</span>
                <span className={styles.author}>{book.firstAuthor}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
