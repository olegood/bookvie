import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Link } from 'react-router'
import type { LibraryMeter, ShelfBook } from '../api/index.ts'
import SpinePopover from '../components/SpinePopover.tsx'
import StartDialog from '../components/StartDialog.tsx'
import { bookcaseName, finishLine, matchesTitle, noMatchCopy, sliceName, spineName } from '../lib/catalog.ts'
import { rowCapacity, sliceRows } from '../lib/slice.ts'
import { nearestVisible, spineHeight } from '../lib/spine.ts'
import styles from './Bookcase.module.css'

type Shared = {
  /** Already in display order (the bookcase order). */
  books: readonly ShelfBook[]
  meter: LibraryMeter
}

/** Catalog's full bookcase: every Book, hidden by Search titles. */
type CatalogProps = Shared & {
  slice?: undefined
  query: string
  /** The Book whose spine carries the highlight ring, if any. */
  highlightId: string | null
  /** What gets focus after an add, by Book id: here, the spine buttons. */
  focusTargets: RefObject<Map<string, HTMLElement>>
  /** Search titles, which takes focus when a focused spine is hidden and none remain. */
  searchRef: RefObject<HTMLInputElement | null>
}

/**
 * Home's finish moment (Story 3.7), from this tab's successful
 * `finish-reading` hand-off: the finished Book, its title, whether it was a
 * re-read, and the Main fill's percentage when the Finish dialog opened.
 */
export type FinishMoment = { id: string; title: string; reread: boolean; fromPercent: number }

/** Home's slice: up to 3 rows of the full bookcase, chosen by the server's priority (AD-6). */
type SliceProps = Shared & {
  slice: { priority: readonly string[] }
  /** This Home visit's finish moment: played once, its header line kept while it is passed. */
  finishing?: FinishMoment | null
}

/**
 * Where a finish moment stands: `from` (the Main-style fill at its old
 * percentage, one frame), `to` (filling to the whole spine), `done` (the solid
 * read spine); `ring` while the highlight ring is on.
 */
type MomentPhase = { moment: FinishMoment; fill: 'from' | 'to' | 'done'; ring: boolean }

/** How long the ring holds after the fill (or at once) before it fades. */
const RING_HOLD_MS = 600
/** Fallbacks when `scrollend` or `transitionend` never comes (a hidden tab, an interrupted scroll). */
const SCROLL_FALLBACK_MS = 800
const FILL_FALLBACK_MS = 1000

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function fullyInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
}

type Props = CatalogProps | SliceProps

type Measured = Record<string, { title: string; height: number }>

/**
 * The controls an outside click may land on and keep focus (a `label` focuses
 * its control, as Search titles' does). Containers with
 * `tabindex="-1"` (`main`, the page `h1`) are not controls: a click there
 * returns focus to the spine.
 */
const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, label, [tabindex]:not([tabindex^="-"]), [contenteditable="true"]'

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

/** A px length from a custom property on `element` (0 when unset). */
function cssLength(element: Element, property: string): number {
  return parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0
}

/**
 * The Bookcase view (DESIGN.md → Bookcase, Spine): every Book as a spine on
 * birch planks, read in its exact color, unread outlined, the Main book
 * outlined and filled to its percentage with the Main-book marker. One Tab
 * stop with roving tabindex.
 *
 * On Catalog, Search titles hides spines and the shelf closes up. With
 * `slice` (Home), the bookcase is packed into rows at the list's measured
 * width and up to 3 are shown (`sliceRows`), one `li` per row; it recomputes
 * on resize, never filters and never scrolls, and the keys follow the rows as
 * displayed.
 *
 * With `finishing` (Home, after this tab's finish), the slice plays the
 * finish moment once per moment: once the spine is in a row and Home has
 * moved focus, it is scrolled into view (`nearest`; `smooth`, or `auto` under
 * reduced motion), then fills from its old percentage to the whole spine with
 * the `.fill` height transition and becomes the solid read spine, while the
 * highlight ring is on. A re-read, or reduced motion, skips the fill: the
 * ring only (instant under reduced motion), on the already solid spine. The
 * header shows "Finished *X*." ("Finished *X* again." for a re-read) while
 * `finishing` is passed. A refetch or a repack never replays it.
 */
export default function Bookcase(props: Props) {
  const { books, meter } = props
  const sliceMode = props.slice !== undefined
  const query = props.slice === undefined ? props.query : ''
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
  // The Book whose Spine popover is open: at most one.
  const [openId, setOpenId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // The Book whose Start dialog is open (from its popover's start action).
  const [startingId, setStartingId] = useState<string | null>(null)
  // A press on the open spine closes its popover; the click that follows must not reopen it.
  const closedByPress = useRef<{ id: string; at: number } | null>(null)
  const shelfRef = useRef<HTMLUListElement>(null)
  const shelf = useCallback(() => shelfRef.current, [])

  // Slice mode: spines per row, measured from the list before paint.
  const [capacity, setCapacity] = useState<number | null>(null)
  const allIds = useMemo(() => books.map((book) => book.id), [books])
  const mainId = useMemo(() => books.find((book) => book.role === 'main')?.id ?? null, [books])
  const rows = useMemo(
    () => (priority === undefined || capacity === null ? [] : sliceRows(allIds, capacity, priority, mainId)),
    [allIds, capacity, priority, mainId],
  )
  // The order the keys and the Tab stop follow: the bookcase, or the slice as displayed.
  const ids = useMemo(() => (sliceMode ? rows.flat() : allIds), [sliceMode, rows, allIds])
  const byId = useMemo(() => new Map(books.map((book) => [book.id, book])), [books])
  const visibleIds = useMemo(
    () => (sliceMode ? ids : books.filter((book) => matchesTitle(book.title, query)).map((book) => book.id)),
    [sliceMode, ids, books, query],
  )

  useLayoutEffect(() => {
    const list = shelfRef.current
    if (!sliceMode || list === null) return
    const measure = () => {
      const style = getComputedStyle(list)
      const width = list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setCapacity(rowCapacity(width, cssLength(list, '--space-spine-width'), cssLength(list, '--space-spine-gap')))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [sliceMode])
  const visible = useMemo(() => new Set(visibleIds), [visibleIds])

  // The finish moment: a new one (a new object) starts its own phase; the same
  // one through refetches and repacks keeps it, so it never replays.
  const [phase, setPhase] = useState<MomentPhase | null>(null)
  if (finishing !== null && phase?.moment !== finishing) {
    const instant = finishing.reread || prefersReducedMotion()
    setPhase({ moment: finishing, fill: instant ? 'done' : 'from', ring: false })
  }
  // A moment Home has dropped (another history entry) never starts.
  const moment = finishing !== null && phase?.moment === finishing ? finishing : null
  const momentInSlice = moment !== null && rows.some((row) => row.includes(moment.id))
  const momentStarted = useRef<FinishMoment | null>(null)

  // Scroll, then fill and ring. Runs a frame after the spine is in a row, so
  // Home's focus on "No Main book." has happened and the old fill is computed.
  useEffect(() => {
    if (moment === null || !momentInSlice || momentStarted.current === moment) return
    momentStarted.current = moment
    const reduced = prefersReducedMotion()
    let frame = 0
    let fallback: ReturnType<typeof setTimeout> | undefined
    let begun = false
    const begin = () => {
      if (begun) return
      begun = true
      window.removeEventListener('scrollend', begin)
      clearTimeout(fallback)
      setPhase((current) =>
        current?.moment === moment
          ? { ...current, fill: current.fill === 'from' ? 'to' : current.fill, ring: true }
          : current,
      )
    }
    frame = requestAnimationFrame(() => {
      const spine = buttons.current.get(moment.id)
      if (spine === undefined) return begin()
      const inView = fullyInViewport(spine)
      spine.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
      if (inView || reduced) {
        frame = requestAnimationFrame(begin)
        return
      }
      window.addEventListener('scrollend', begin)
      fallback = setTimeout(begin, SCROLL_FALLBACK_MS)
    })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
      window.removeEventListener('scrollend', begin)
      // Cut short before it began (a remount): the next run may start it again.
      if (!begun && momentStarted.current === moment) momentStarted.current = null
    }
  }, [moment, momentInSlice])

  // The fill ends on its `transitionend`, or here if that never comes.
  const fillRunning = phase?.fill === 'to'
  useEffect(() => {
    if (!fillRunning) return
    const timer = setTimeout(
      () => setPhase((current) => (current?.fill === 'to' ? { ...current, fill: 'done' } : current)),
      FILL_FALLBACK_MS,
    )
    return () => clearTimeout(timer)
  }, [fillRunning])

  // Once the spine is solid, the ring holds, then fades (the `box-shadow` transition).
  const ringHolding = phase?.fill === 'done' && phase.ring
  useEffect(() => {
    if (!ringHolding) return
    const timer = setTimeout(
      () => setPhase((current) => (current === null ? current : { ...current, ring: false })),
      RING_HOLD_MS,
    )
    return () => clearTimeout(timer)
  }, [ringHolding])

  // The Tab stop: the last focused spine, else the nearest visible one in
  // sort order (the previous on a tie), else the first.
  const fromIndex = stopId === null ? -1 : ids.indexOf(stopId)
  const stop = fromIndex === -1 ? (visibleIds[0] ?? null) : nearestVisible(ids, fromIndex, (id) => visible.has(id))

  // Keep a moved stop, so clearing the search leaves it where it went; with
  // no spine focused yet, the stop starts on the first spine.
  if (stop !== null && stop !== (stopId ?? ids[0])) setStopId(stop)

  // A search that hides the open spine (or a delete) closes its popover.
  if (openId !== null && !visible.has(openId)) setOpenId(null)
  const openBook = openId === null ? undefined : books.find((book) => book.id === openId)

  // A slice repack remounts the spines: `rows` renews `anchor`, so an open
  // popover places itself again against the new spine.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const anchor = useCallback(() => (openId === null ? null : (buttons.current.get(openId) ?? null)), [openId, rows])

  // Closing returns focus to the spine, unless the user put it somewhere else.
  const closePopover = useCallback(
    (refocus: boolean) => {
      const spine = anchor()
      setOpenId(null)
      if (refocus) spine?.focus()
    },
    [anchor],
  )

  // The popover closes (focus back on its spine), then the Start dialog opens.
  const openStart = useCallback(() => {
    if (openId === null) return
    closePopover(true)
    setStartingId(openId)
  }, [openId, closePopover])

  // Cancel or Esc: the popover has closed, so focus returns to the spine,
  // once the modal dialog (which makes the shelf inert) has unmounted.
  const [refocusId, setRefocusId] = useState<{ id: string } | null>(null)
  const cancelStart = useCallback(() => {
    if (startingId !== null) setRefocusId({ id: startingId })
    setStartingId(null)
  }, [startingId])

  // The spine is gone (deleted or hidden by a refetch): the shelf if it takes focus, else `main`.
  const fallbackTarget = useCallback(() => {
    const shelfList = shelfRef.current
    return (
      (shelfList !== null && !shelfList.hidden && shelfList.hasAttribute('tabindex') ? shelfList : null) ??
      document.getElementById('main')
    )
  }, [])

  useEffect(() => {
    if (refocusId === null) return
    ;(buttons.current.get(refocusId.id) ?? fallbackTarget())?.focus()
  }, [refocusId, fallbackTarget])

  // The Book was deleted elsewhere: its `book` view went missing first, so
  // focus went back to the spine, and the catalog refetch then removed it.
  useEffect(() => {
    if (refocusId === null || buttons.current.has(refocusId.id)) return
    if (document.activeElement === null || document.activeElement === document.body) fallbackTarget()?.focus()
  }, [ids, refocusId, fallbackTarget])

  // An outside click closes the popover. A click on the open spine is left to
  // its own toggle. Focus stays on a control the click landed on (Search
  // titles, another spine); otherwise it returns to the spine once the
  // click's own focus change has happened.
  useEffect(() => {
    if (openId === null) return
    const down = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (popoverRef.current?.contains(target)) return
      const spine = anchor()
      setOpenId(null)
      if (spine?.contains(target)) {
        // Pressing the open spine toggles it shut; it keeps the focus the press gives it.
        closedByPress.current = { id: openId, at: event.timeStamp }
        return
      }
      if (target.closest(FOCUSABLE)) return
      setTimeout(() => spine?.focus(), 0)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [openId, anchor])

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
    // Only the moment still passed: a dropped one draws the solid read spine and never starts.
    const own = finishing !== null && phase?.moment === finishing && finishing.id === book.id ? phase : null
    // The finish moment draws the finished spine as a filling Main spine until it is solid.
    const momentFill = own !== null && own.fill !== 'done' && book.finished
    const filling = (main && !book.finished) || momentFill
    const height = measured[book.id]?.height ?? spineHeight(0)
    const classes = [styles.spine, filling ? styles.main : book.finished ? styles.read : styles.unread]
    if (main) classes.push(styles.marked)
    if (momentFill) classes.push(styles.finishing)
    if (book.id === highlightId || own?.ring === true) classes.push(styles.highlight)
    if (book.id === openId) classes.push(styles.open)
    // From the old percentage of the body to the whole spine's height (the line goes past its top).
    const percent = momentFill
      ? own.fill === 'from'
        ? `${own.moment.fromPercent}%`
        : `${height}px`
      : `${book.percent ?? 0}%`
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
        aria-label={spineName(book)}
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
        onTransitionEnd={
          momentFill && own.fill === 'to'
            ? (event) => {
                if (event.propertyName !== 'height') return
                setPhase((current) => (current?.fill === 'to' ? { ...current, fill: 'done' } : current))
              }
            : undefined
        }
        onClick={(event) => {
          const pressed = closedByPress.current
          closedByPress.current = null
          if (pressed?.id === book.id && event.timeStamp - pressed.at < 1000) return
          setOpenId((open) => (open === book.id ? null : book.id))
        }}
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
        {main && <span aria-hidden="true" className={styles.marker} />}
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
        <MeterBar meter={meter} />
        {sliceMode && (
          <Link to="/catalog" className={styles.seeAll}>
            See all in Catalog
          </Link>
        )}
      </div>
      {!sliceMode && visibleIds.length === 0 && <p className={styles.noMatch}>{noMatchCopy(query)}</p>}
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
      </div>
    </section>
  )
}
