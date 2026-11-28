import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { StatsFinish } from '../api/index.ts'
import { coverSrc } from '../lib/bookDetail.ts'
import { finishAuthor, finishMeta, finishRowName } from '../lib/stats.ts'
import RatingStars from './RatingStars.tsx'
import styles from './StatsFinishedList.module.css'

type Props = {
  /** The list's `h2`, built by `lib/stats` for the range the shown view was fetched for. */
  heading: string
  /** The shown view's `finishes`, in the server's order: never sorted, counted or filtered here. */
  finishes: readonly StatsFinish[]
  /** While a bar is selected: **Show the whole range** beside the heading, which widens the list (Story 17.2). */
  onShowWholeRange?: () => void
  /**
   * Called whenever a control holding focus (Show the whole range, or a row's link) is removed: by a
   * refetch, when the list empties, or when the list unmounts because the person followed a row's link.
   * The page acts on it only while it is still on Stats (Epic 17 retro item 112).
   */
  onFocusLost?: () => void
}

/** A ref callback that reports focus inside the node as it leaves the document. */
type FocusRef = (node: HTMLElement | null) => (() => void) | undefined

/**
 * The Stats finished list (DESIGN.md → Stats finished list; UX-DR105–UX-DR108):
 * an `h2` naming the range over an `ol` with one row per finish, each row one
 * link to its Book named in one piece by `finishRowName`. Nothing when there
 * are no finishes: the page shows its empty line instead. While a bar is
 * selected, **Show the whole range** sits after the heading, a sibling of the
 * `h2` so the heading's name stays the period. Never announces.
 */
export default function StatsFinishedList({ heading, finishes, onShowWholeRange, onFocusLost }: Props) {
  const focusLost = useRef(onFocusLost)
  useLayoutEffect(() => {
    focusLost.current = onFocusLost
  })
  // One stable ref callback per control (Show the whole range, each reading's row), so a re-render doesn't
  // detach and re-attach them, as StatsBars does for its bars. A row's goes on its `li`: `Link` merges refs
  // into a new callback each render, which would detach and re-attach on every render.
  const [refFor] = useState(() => {
    const callbacks = new Map<string, FocusRef>()
    return (key: string): FocusRef => {
      let callback = callbacks.get(key)
      if (callback === undefined) {
        callback = (node) => {
          if (node === null) return
          return () => {
            // Runs before the node leaves the document, so it still holds focus here.
            if (node.contains(document.activeElement)) focusLost.current?.()
          }
        }
        callbacks.set(key, callback)
      }
      return callback
    }
  })

  if (finishes.length === 0) return null
  return (
    <div className={styles.finished}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>{heading}</h2>
        {onShowWholeRange !== undefined && (
          <button
            ref={refFor('wholeRange')}
            type="button"
            className={`linkButton ${styles.wholeRange}`}
            onClick={onShowWholeRange}
          >
            Show the whole range
          </button>
        )}
      </div>
      <ol className={styles.list}>
        {finishes.map((finish) => (
          <li key={finish.readingId} ref={refFor(`row:${finish.readingId}`)} className={styles.item}>
            <FinishRow finish={finish} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function FinishRow({ finish }: { finish: StatsFinish }) {
  const author = finishAuthor(finish)
  return (
    <Link to={`/book/${finish.bookId}`} className={styles.row} aria-label={finishRowName(finish)}>
      {/* Keyed by the cover, so a new cover starts loading again. */}
      <Thumbnail key={finish.coverFile ?? ''} coverFile={finish.coverFile} spineColor={finish.spineColor} />
      {/* The spaces keep the words apart in the row's text; the flex row doesn't render them. */}{' '}
      <span className={styles.text}>
        <span className={styles.title}>{finish.title}</span>
        {author !== '' && (
          <>
            {' '}
            <span className={styles.author}>{author}</span>
          </>
        )}
      </span>{' '}
      <span className={styles.end}>
        {/* "Finished" is shown, so the row's name holds its visible text (WCAG 2.5.3). The date and pages
            keep their own span, the element that carries exactly that text. */}
        <span className={styles.meta}>
          Finished <span>{finishMeta(finish)}</span>
        </span>
        {/* Unrated: the line stays, empty, so rows keep one height. */}
        <span className={styles.rating}>{finish.rating !== null && <RatingStars rating={finish.rating} />}</span>
      </span>
    </Link>
  )
}

type CoverState = 'loading' | 'loaded' | 'failed'

/**
 * The 44 × 64 thumbnail: the stored cover, contained at the bottom with a
 * hairline, or, without a cover or when it fails to load, the read typeset
 * cover with no text (a finished Book is always read). Decorative: the row's
 * name says what it is.
 */
function Thumbnail({ coverFile, spineColor }: { coverFile: string | null; spineColor: string }) {
  const [state, setState] = useState<CoverState>('loading')
  // A cached cover can finish before React listens for `load`.
  const imageRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setState('loaded')
  }, [])
  if (coverFile === null || state === 'failed') {
    const style: CSSProperties & Record<'--typeset-color', string> = { '--typeset-color': spineColor }
    return (
      <span className={styles.thumb} aria-hidden="true">
        <span className={styles.typeset} style={style}>
          <span className={styles.plate} />
        </span>
      </span>
    )
  }
  return (
    <span className={state === 'loaded' ? styles.thumb : `${styles.thumb} ${styles.loading}`} aria-hidden="true">
      <img
        ref={imageRef}
        className={state === 'loaded' ? `${styles.cover} ${styles.coverLoaded}` : styles.cover}
        src={coverSrc(coverFile)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
      />
    </span>
  )
}
