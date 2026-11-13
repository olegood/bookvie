import { useCallback, useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import type { ShelfBook } from '../api/index.ts'
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

/** The ribbon's outline without its top: where the edge line and the halo run. */
const RIBBON_SIDES = 'M0 0V24L8 18L16 24V0'

/**
 * The finished ribbon (DESIGN.md → Catalog tile → Finished ribbon): a 16×24
 * bookmark with a 6px V-notch in the Book's exact spine color, a `spine-edge`
 * line on its sides and notch, and a `spine-label-strip` halo outside that
 * line. Drawn as the halo stroke, the fill over its inner half, then the
 * edge. No text, and `aria-hidden`: the status is in the link's name.
 */
function Ribbon({ color }: { color: string }) {
  const style: CSSProperties & Record<'--ribbon-color', string> = { '--ribbon-color': color }
  return (
    <svg className={styles.ribbon} viewBox="0 0 16 24" aria-hidden="true" focusable="false" style={style}>
      <path className={styles.ribbonHalo} d={RIBBON_SIDES} />
      <polygon className={styles.ribbonFill} points="0,0 16,0 16,24 8,18 0,24" />
      <path className={styles.ribbonEdge} d={RIBBON_SIDES} />
    </svg>
  )
}

type TypesetCoverProps = {
  title: string
  /** The first author; an empty one leaves its line out. */
  author: string
  /** The catalog view's `finished`, as is: read or unread. */
  finished: boolean
  color: string
}

/**
 * The typeset cover (DESIGN.md → Catalog tile → Typeset cover), for a Book
 * without a cover or whose cover fails to load. Read: the Book's exact spine
 * color, a `spine-edge` hairline, and a `spine-label-strip` plate holding the
 * title and the first author, so no text sits straight on the color. Unread:
 * an unread spine seen from the front, the same text in `spine-unread-text`
 * with no plate. Inside the tile's `aria-hidden` box, so the link's name
 * doesn't change.
 */
function TypesetCover({ title, author, finished, color }: TypesetCoverProps) {
  const style: CSSProperties & Record<'--typeset-color', string> = { '--typeset-color': color }
  return (
    <div
      className={`${styles.typeset} ${finished ? styles.typesetRead : styles.typesetUnread}`}
      style={finished ? style : undefined}
    >
      <div className={finished ? `${styles.plate} ${styles.plateRead}` : styles.plate}>
        <span className={styles.typesetTitle}>{title}</span>
        {author !== '' && <span className={styles.typesetAuthor}>{author}</span>}
      </div>
    </div>
  )
}

type TileCoverProps = {
  coverFile: string | null
  title: string
  firstAuthor: string
  /** The catalog view's `finished`, as is: draws the ribbon and picks the typeset cover. */
  finished: boolean
  spineColor: string
}

/**
 * The cover inside a tile's box: the stored cover, shown whole at the bottom
 * of the box once it loads (flat `surface-inset` with a hairline until then),
 * or the typeset cover without a cover or when the file isn't an image.
 * Keyed by `coverFile`, so a new cover starts loading again.
 *
 * A finished Book's ribbon hangs from the visible cover's top: the frame that
 * hugs the loaded `img`, or the box over the typeset cover. No ribbon while
 * the cover is loading, since there's no visible cover yet.
 */
function TileCover({ coverFile, title, firstAuthor, finished, spineColor }: TileCoverProps) {
  const [state, setState] = useState<CoverState>('loading')
  // A cached cover can finish before React listens for `load`.
  const imageRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setState('loaded')
  }, [])
  if (coverFile === null || state === 'failed') {
    return (
      <div className={styles.box} aria-hidden="true">
        <TypesetCover title={title} author={firstAuthor} finished={finished} color={spineColor} />
        {finished && <Ribbon color={spineColor} />}
      </div>
    )
  }
  const loaded = state === 'loaded'
  return (
    <div className={loaded ? styles.box : `${styles.box} ${styles.loading}`} aria-hidden="true">
      {/* Exactly the img's rectangle, so the ribbon can hang from the visible cover. */}
      <span className={styles.frame}>
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
        {loaded && finished && <Ribbon color={spineColor} />}
      </span>
    </div>
  )
}

/**
 * The reading bar (DESIGN.md → Catalog tile → Reading bar): an `accent-soft`
 * track the box's width, filled with `accent` from the left to the catalog
 * view's `percent`, as is (never recomputed from the pages).
 */
function ReadingBar({ percent }: { percent: number }) {
  return (
    <div className={styles.bar}>
      <div className={styles.barFill} style={{ width: `${percent}%` }} />
    </div>
  )
}

/**
 * The Tiles view (DESIGN.md → Catalog tile, Layout → Tiles): a grid of
 * covers in the Catalog's sort, each tile one link to its Book detail, named
 * like its spine. Tiles of Books that Search titles or the filter chips leave
 * out are `hidden`, and the grid closes up. A finished Book carries a ribbon
 * and a Book with a `percent` a reading bar; both are `aria-hidden`, since
 * the link's name already says the status. A Book without a cover, or whose
 * cover fails to load, gets a typeset cover instead.
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
              <TileCover
                key={book.coverFile ?? ''}
                coverFile={book.coverFile}
                title={book.title}
                firstAuthor={book.firstAuthor}
                finished={book.finished}
                spineColor={book.spineColor}
              />
              <div className={styles.slot} aria-hidden="true">
                {book.percent !== null && <ReadingBar percent={book.percent} />}
              </div>
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
