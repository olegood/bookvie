import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link } from 'react-router'
import type { LibraryMeter, ShelfBook } from '../api/index.ts'
import SpinePopover from '../components/SpinePopover.tsx'
import StartDialog from '../components/StartDialog.tsx'
import { bookcaseName, finishLine, sliceName, spineMarker, spineNames, type SpineMarker } from '../lib/catalog.ts'
import { nearestVisible, spineHeight } from '../lib/spine.ts'
import { useFinishMoment, type FinishMoment } from '../lib/useFinishMoment.ts'
import { useSliceRows } from '../lib/useSliceRows.ts'
import { useSpinePopover } from '../lib/useSpinePopover.ts'
import styles from './Bookcase.module.css'

export type { FinishMoment }

type Shared = {
  /** Already in display order (the bookcase order). */
  books: readonly ShelfBook[]
}

/** Catalog's full bookcase: every Book, hidden by Search titles and the filter chips. */
type CatalogProps = Shared & {
  slice?: undefined
  /** The ids of the Books that pass Search titles and the filters; the rest are hidden. */
  shown: ReadonlySet<string>
  /** What the shelf area shows when no Book is shown (the line, and a link for filters). */
  noMatch: ReactNode
  /** The Book whose spine carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the spine buttons. */
  focusTargets: RefObject<Map<string, HTMLElement>>
  /** Search titles, which takes focus when a focused spine is hidden and none remain. */
  searchRef: RefObject<HTMLInputElement | null>
}

/** Home's slice: up to 3 rows of the full bookcase, chosen by the server's priority (AD-6). */
type SliceProps = Shared & {
  slice: { priority: readonly string[] }
  /** The library meter, in the slice's header. Catalog shows it above the bookcase instead. */
  meter: LibraryMeter
  /** This Home visit's finish moment: played once, its header line kept while it is passed. */
  finishing?: FinishMoment | null
}

type Props = CatalogProps | SliceProps

type Measured = Record<string, { title: string; height: number }>

/** Each marker kind's dot color class. */
const MARKER_CLASS: Record<SpineMarker, string> = {
  main: styles.markerMain,
  upNext: styles.markerUpNext,
  waiting: styles.markerWaiting,
}

const MOVES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * The visible spine in the row above (`step` -1) or below (+1) whose
 * horizontal center is nearest to the current spine's; rows are the spines
 * sharing a bottom edge (they stand on one plank).
 */
function verticalNeighbour(buttons: readonly HTMLElement[], index: number, step: -1 | 1): number {
  const rects = buttons.map((button) => button.getBoundingClientRect())
  const bottoms = [...new Set(rects.map((rect) => Math.round(rect.bottom)))].sort((a, b) => a - b)
  const row = bottoms.indexOf(Math.round(rects[index].bottom))
  const target = bottoms[row + step]
  if (target === undefined) return index
  const center = rects[index].left + rects[index].width / 2
  let best = index
  let distance = Infinity
  rects.forEach((rect, candidate) => {
    if (Math.round(rect.bottom) !== target) return
    const gap = Math.abs(rect.left + rect.width / 2 - center)
    if (gap < distance) {
      best = candidate
      distance = gap
    }
  })
  return best
}

/** The library meter (DESIGN.md → Library meter): Home's slice header, and Catalog's row above the bookcase or list. */
export function MeterBar({ meter }: { meter: LibraryMeter }) {
  const text = `${meter.finished} of ${meter.total} finished`
  const share = meter.total === 0 ? 0 : (meter.finished / meter.total) * 100
  return (
    <div className={styles.meter}>
      <span
        role="progressbar"
        aria-label="Books finished"
        aria-valuemin={0}
        aria-valuemax={meter.total}
        aria-valuenow={meter.finished}
        aria-valuetext={text}
        className={styles.bar}
      >
        <span className={styles.barFill} style={{ width: `${share}%` }} />
      </span>
      {/* The progressbar already reads this as its value. */}
      <span aria-hidden="true">{text}</span>
    </div>
  )
}

/**
 * The Bookcase view (DESIGN.md → Bookcase, Spine): every Book as a spine on
 * birch planks, read in its exact color, unread outlined, the Main book
 * outlined and filled to its percentage. At most one marker dot per spine,
 * by priority (`spineMarker`): Main, then Up next (sky), then Waiting for you
 * (sand); the legend names all three. One Tab stop with roving tabindex.
 *
 * On Catalog, Search titles and the filter chips hide spines (`shown`) and
 * the shelf closes up. With
 * `slice` (Home), the bookcase is packed into rows at the list's measured
 * width and up to 3 are shown (`sliceRows`), one `li` per row; it recomputes
 * on resize, never filters and never scrolls, and the keys follow the rows as
 * displayed.
 *
 * With `finishing` (Home, after this tab's finish), the slice plays the
 * finish moment once (see `useFinishMoment`), and the header shows
 * "Finished *X*." ("Finished *X* again." for a re-read) while `finishing` is
 * passed.
 */
export default function Bookcase(props: Props) {
  const { books } = props
  const sliceMode = props.slice !== undefined
  const shown = props.slice === undefined ? props.shown : null
  const highlightId = props.slice === undefined ? props.highlightId : null
  const priority = props.slice?.priority
  const finishing = props.slice === undefined ? null : (props.finishing ?? null)
  const ownTargets = useRef(new Map<string, HTMLElement>())
  const noSearch = useRef<HTMLInputElement | null>(null)
  const focusTargets = props.slice === undefined ? props.focusTargets : ownTargets
  const searchRef = props.slice === undefined ? props.searchRef : noSearch
  const headingId = useId()
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const labels = useRef(new Map<string, HTMLElement>())
  const [measured, setMeasured] = useState<Measured>({})
  const [stopId, setStopId] = useState<string | null>(null)
  const shelfRef = useRef<HTMLUListElement>(null)

  const { rows, ids, byId } = useSliceRows({ books, priority, sliceMode, shelfRef })
  const visibleIds = useMemo(
    () => (shown === null ? ids : books.filter((book) => shown.has(book.id)).map((book) => book.id)),
    [shown, ids, books],
  )
  const visible = useMemo(() => new Set(visibleIds), [visibleIds])
  // Named over every Book, shown or not, so a twin's name never changes with
  // a search, a filter or the slice's rows.
  const names = useMemo(() => spineNames(books), [books])

  const { spineMoment } = useFinishMoment({
    finishing,
    inSlice: (id) => rows.some((row) => row.includes(id)),
    buttons,
  })

  // The Tab stop: the last focused spine, else the nearest visible one in
  // sort order (the previous on a tie), else the first.
  const fromIndex = stopId === null ? -1 : ids.indexOf(stopId)
  const stop = fromIndex === -1 ? (visibleIds[0] ?? null) : nearestVisible(ids, fromIndex, (id) => visible.has(id))

  // Keep a moved stop, so clearing the search leaves it where it went; with
  // no spine focused yet, the stop starts on the first spine.
  if (stop !== null && stop !== (stopId ?? ids[0])) setStopId(stop)

  const { openId, openBook, popoverRef, anchor, shelf, closePopover, openStart, startingId, cancelStart, clickSpine } =
    useSpinePopover({ books, visible, ids, rows, buttons, shelfRef })

  // Real focus follows only when a spine that had it is now hidden; with no
  // spine left it goes to Search titles. Runs before the measuring below
  // forces a layout (which lets the browser drop focus from hidden elements).
  useLayoutEffect(() => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !focused.closest('li[hidden]')) return
    if (![...buttons.current.values()].includes(focused as HTMLButtonElement)) return
    const target = stop === null ? searchRef.current : buttons.current.get(stop)
    target?.focus()
  }, [stop, visible, searchRef])

  // Slice mode: repacking the rows on a resize remounts the spines, and a
  // focused one drops focus to the body. Whether a slice spine had focus is
  // tracked so the Tab-stop spine (else the first) can take it back.
  const sliceFocused = useRef(false)
  useLayoutEffect(() => {
    if (!sliceMode || !sliceFocused.current) return
    const focused = document.activeElement
    if (focused !== null && focused !== document.body) return
    ;(buttons.current.get(stop ?? '') ?? (ids[0] === undefined ? undefined : buttons.current.get(ids[0])))?.focus()
  }, [sliceMode, rows, stop, ids])

  // Heights from each label's one-line length: read every visible label
  // first, then set the state once. Hidden labels measure 0, so they wait
  // until a search shows them.
  useLayoutEffect(() => {
    const found: Measured = {}
    let any = false
    for (const book of books) {
      if (!visible.has(book.id) || measured[book.id]?.title === book.title) continue
      const label = labels.current.get(book.id)
      if (!label) continue
      found[book.id] = { title: book.title, height: spineHeight(label.scrollHeight) }
      any = true
    }
    // Measuring layout is the external system here: one extra render, before paint.
    // oxlint-disable-next-line react/set-state-in-effect
    if (any) setMeasured({ ...measured, ...found })
  }, [books, visible, measured])

  const keyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!MOVES.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
    const index = stop === null ? -1 : visibleIds.indexOf(stop)
    if (index === -1) return
    event.preventDefault()
    let next = index
    if (event.key === 'ArrowLeft') next = Math.max(0, index - 1)
    else if (event.key === 'ArrowRight') next = Math.min(visibleIds.length - 1, index + 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = visibleIds.length - 1
    else {
      const shown = visibleIds.map((id) => buttons.current.get(id)!)
      next = verticalNeighbour(shown, index, event.key === 'ArrowUp' ? -1 : 1)
    }
    buttons.current.get(visibleIds[next])?.focus()
  }

  const spineButton = (book: ShelfBook) => {
    const main = book.role === 'main'
    const marker = spineMarker(book)
    const height = measured[book.id]?.height ?? spineHeight(0)
    const moment = spineMoment(book, height)
    // The finish moment draws the finished spine as a filling Main spine until it is solid.
    const momentFill = moment.fill !== null
    const filling = (main && !book.finished) || momentFill
    const classes = [styles.spine, filling ? styles.main : book.finished ? styles.read : styles.unread]
    if (marker !== null) classes.push(styles.marked)
    if (momentFill) classes.push(styles.finishing)
    if (book.id === highlightId || moment.ring) classes.push(styles.highlight)
    if (book.id === openId) classes.push(styles.open)
    const percent = moment.fill ?? `${book.percent ?? 0}%`
    const style: CSSProperties & Record<'--spine-color' | '--percent', string | undefined> = {
      height,
      '--spine-color': book.finished || filling ? book.spineColor : undefined,
      '--percent': filling ? percent : undefined,
    }
    return (
      <button
        key={book.id}
        type="button"
        className={classes.join(' ')}
        style={style}
        tabIndex={book.id === stop ? 0 : -1}
        aria-label={names.get(book.id)}
        aria-haspopup="dialog"
        aria-expanded={book.id === openId ? 'true' : 'false'}
        onFocus={() => {
          sliceFocused.current = true
          setStopId(book.id)
        }}
        onBlur={(event) => {
          // Focus left for another element, or the user dropped it (the spine is
          // still in the page): not a remount, so it isn't taken back.
          const next = event.relatedTarget
          if (next instanceof Element ? !shelfRef.current?.contains(next) : event.currentTarget.isConnected) {
            sliceFocused.current = false
          }
        }}
        onTransitionEnd={moment.onTransitionEnd}
        onClick={(event) => clickSpine(book.id, event)}
        ref={(button) => {
          const targets = focusTargets.current
          const spines = buttons.current
          if (button) {
            targets.set(book.id, button)
            spines.set(book.id, button)
          }
          return () => {
            if (targets.get(book.id) === button) targets.delete(book.id)
            if (spines.get(book.id) === button) spines.delete(book.id)
          }
        }}
      >
        {marker !== null && (
          <span aria-hidden="true" data-marker={marker} className={`${styles.marker} ${MARKER_CLASS[marker]}`} />
        )}
        <span className={styles.strip}>
          <span
            className={styles.label}
            ref={(label) => {
              const all = labels.current
              if (label) all.set(book.id, label)
              return () => {
                if (all.get(book.id) === label) all.delete(book.id)
              }
            }}
          >
            {book.title}
          </span>
        </span>
        {filling && (
          <span aria-hidden="true" className={styles.body}>
            <span className={styles.fill} />
          </span>
        )}
      </button>
    )
  }

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          Bookcase
        </h2>
        {finishing !== null && <p className={styles.finishLine}>{finishLine(finishing.title, finishing.reread)}</p>}
        {props.slice !== undefined && <MeterBar meter={props.meter} />}
        {sliceMode && (
          <Link to="/catalog" className={styles.seeAll}>
            See all in Catalog
          </Link>
        )}
      </div>
      {props.slice === undefined && visibleIds.length === 0 && <p className={styles.noMatch}>{props.noMatch}</p>}
      {sliceMode ? (
        <ul
          ref={shelfRef}
          role="list"
          aria-label={sliceName(rows.length)}
          className={`${styles.shelf} ${styles.sliceShelf}`}
          onKeyDown={keyDown}
        >
          {rows.map((row) => (
            <li key={row[0]} className={styles.sliceRow}>
              {row.map((id) => spineButton(byId.get(id)!))}
            </li>
          ))}
        </ul>
      ) : (
        <ul
          ref={shelfRef}
          role="list"
          aria-label={bookcaseName(books.length)}
          className={styles.shelf}
          hidden={visibleIds.length === 0}
          onKeyDown={keyDown}
        >
          {books.map((book) => (
            <li key={book.id} className={styles.slot} hidden={!visible.has(book.id)}>
              {spineButton(book)}
            </li>
          ))}
        </ul>
      )}
      {openBook && (
        <div ref={popoverRef}>
          <SpinePopover
            key={openBook.id}
            book={openBook}
            anchor={anchor}
            shelf={shelf}
            onClose={closePopover}
            onStart={openStart}
            hasUpNext={books.some((book) => book.role === 'upNext')}
          />
        </div>
      )}
      {startingId !== null && <StartDialog bookId={startingId} onCancel={cancelStart} />}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={styles.swatchRead} />
          finished
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={styles.swatchUnread} />
          not read yet
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={styles.swatchMain} />
          Main book, filled to its %
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.swatchDot} ${styles.markerUpNext}`} />
          up next
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.swatchDot} ${styles.markerWaiting}`} />
          waiting for you
        </span>
      </div>
    </section>
  )
}
