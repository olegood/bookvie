import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import type { LibraryMeter, ShelfBook } from '../api/index.ts'
import { bookcaseName, matchesTitle, noMatchCopy, spineName } from '../lib/catalog.ts'
import { nearestVisible, spineHeight } from '../lib/spine.ts'
import styles from './Bookcase.module.css'

type Props = {
  /** Already in display order. */
  books: readonly ShelfBook[]
  meter: LibraryMeter
  query: string
  /** The Book whose spine carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the spine buttons. */
  focusTargets: RefObject<Map<string, HTMLElement>>
  /** Search titles, which takes focus when a focused spine is hidden and none remain. */
  searchRef: RefObject<HTMLInputElement | null>
}

type Measured = Record<string, { title: string; height: number }>

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

function MeterBar({ meter }: { meter: LibraryMeter }) {
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
 * birch planks, read in its exact color, unread outlined. One Tab stop with
 * roving tabindex; Search titles hides spines and the shelf closes up.
 */
export default function Bookcase({ books, meter, query, highlightId, focusTargets, searchRef }: Props) {
  const headingId = useId()
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const labels = useRef(new Map<string, HTMLElement>())
  const [measured, setMeasured] = useState<Measured>({})
  const [stopId, setStopId] = useState<string | null>(null)

  const ids = useMemo(() => books.map((book) => book.id), [books])
  const visibleIds = useMemo(
    () => books.filter((book) => matchesTitle(book.title, query)).map((book) => book.id),
    [books, query],
  )
  const visible = useMemo(() => new Set(visibleIds), [visibleIds])

  // The Tab stop: the last focused spine, else the nearest visible one in
  // sort order (the previous on a tie), else the first.
  const fromIndex = stopId === null ? -1 : ids.indexOf(stopId)
  const stop = fromIndex === -1 ? (visibleIds[0] ?? null) : nearestVisible(ids, fromIndex, (id) => visible.has(id))

  // Keep a moved stop, so clearing the search leaves it where it went; with
  // no spine focused yet, the stop starts on the first spine.
  if (stop !== null && stop !== (stopId ?? ids[0])) setStopId(stop)

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

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          Bookcase
        </h2>
        <MeterBar meter={meter} />
      </div>
      {visibleIds.length === 0 && <p className={styles.noMatch}>{noMatchCopy(query)}</p>}
      <ul
        role="list"
        aria-label={bookcaseName(books.length)}
        className={styles.shelf}
        hidden={visibleIds.length === 0}
        onKeyDown={keyDown}
      >
        {books.map((book) => {
          const classes = [styles.spine, book.finished ? styles.read : styles.unread]
          if (book.id === highlightId) classes.push(styles.highlight)
          const style: CSSProperties & Record<'--spine-color', string | undefined> = {
            height: measured[book.id]?.height ?? spineHeight(0),
            '--spine-color': book.finished ? book.spineColor : undefined,
          }
          return (
            <li key={book.id} className={styles.slot} hidden={!visible.has(book.id)}>
              <button
                type="button"
                className={classes.join(' ')}
                style={style}
                tabIndex={book.id === stop ? 0 : -1}
                aria-label={spineName(book)}
                onFocus={() => setStopId(book.id)}
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
              </button>
            </li>
          )
        })}
      </ul>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={styles.swatchRead} />
          finished
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={styles.swatchUnread} />
          not read yet
        </span>
      </div>
    </section>
  )
}
