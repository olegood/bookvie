import { useCallback, useState, type CSSProperties } from 'react'
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
}

/**
 * The Stats finished list (DESIGN.md → Stats finished list; UX-DR105–UX-DR108):
 * an `h2` naming the range over an `ol` with one row per finish, each row one
 * link to its Book named in one piece by `finishRowName`. Nothing when there
 * are no finishes: the page shows its empty line instead. Never announces.
 */
export default function StatsFinishedList({ heading, finishes }: Props) {
  if (finishes.length === 0) return null
  return (
    <div className={styles.finished}>
      <h2 className={styles.heading}>{heading}</h2>
      <ol className={styles.list}>
        {finishes.map((finish) => (
          <li key={finish.readingId} className={styles.item}>
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
