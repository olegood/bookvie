import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router'
import type { ShelfBook } from '../api/index.ts'
import { placePopover, type Placement } from '../lib/spineColor.ts'
import ChangeColor from './ChangeColor.tsx'
import styles from './SpinePopover.module.css'

type Props = {
  book: ShelfBook
  /** The spine it points at. */
  anchor: () => HTMLElement | null
  /** The shelf: the popover goes above the spine only when it fits below the shelf's top. */
  shelf: () => HTMLElement | null
  /** Closes it; `refocus` returns focus to the spine. */
  onClose: (refocus: boolean) => void
}

function pagesLine(pages: number, year: number | null): string {
  const count = pages === 1 ? '1 page' : `${pages} pages`
  return year === null ? count : `${count} · ${year}`
}

/**
 * The Spine popover (DESIGN.md / EXPERIENCE.md → Spine popover): a non-modal
 * `dialog` named by the title, fixed beside its spine with a pointer. The
 * Book's details on the left; "Open book →" and Change color on the right;
 * × at the top right, last in tab order. Focus starts on "Open book →" (no
 * primary action until Stories 3.2 and 4.4). Esc, × and focus leaving it
 * close it; the Bookcase closes it on an outside click.
 */
export default function SpinePopover({ book, anchor, shelf, onClose }: Props) {
  const titleId = useId()
  const card = useRef<HTMLDivElement>(null)
  const link = useRef<HTMLAnchorElement>(null)
  const [place, setPlace] = useState<Placement | null>(null)

  // Placed before paint, again on scroll, resize and any change of its own size.
  useLayoutEffect(() => {
    const element = card.current
    if (!element) return
    const update = () => {
      const spine = anchor()
      if (!spine) return
      const root = document.documentElement
      const next = placePopover(
        spine.getBoundingClientRect(),
        { width: element.offsetWidth, height: element.offsetHeight },
        { width: root.clientWidth, height: root.clientHeight },
        shelf()?.getBoundingClientRect().top ?? 0,
      )
      setPlace((last) =>
        last &&
        last.left === next.left &&
        last.top === next.top &&
        last.side === next.side &&
        last.pointerX === next.pointerX
          ? last
          : next,
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('scroll', update, { capture: true, passive: true })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, { capture: true })
      window.removeEventListener('resize', update)
    }
  }, [anchor, shelf])

  // Focus moves in once it is placed (a hidden element can't take focus).
  const placed = place !== null
  useEffect(() => {
    if (placed) link.current?.focus()
  }, [placed])

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    onClose(true)
  }

  // Set while a press inside is under way: a browser that doesn't focus a
  // pressed button (Safari) blurs to nothing, which is not leaving.
  const pressing = useRef(false)

  // Tab past the last control, Shift+Tab from the first, or focus going anywhere else.
  const blur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    if (next !== null) {
      onClose(true)
      return
    }
    // Focus went nowhere (the end of the page, or a press inside): decide once it has settled.
    setTimeout(() => {
      const element = card.current
      if (!element || element.contains(document.activeElement)) return
      if (pressing.current) element.focus()
      else onClose(true)
    }, 0)
  }

  const style: CSSProperties & Record<'--pointer-x', string> = {
    left: place?.left ?? 0,
    top: place?.top ?? 0,
    visibility: place ? undefined : 'hidden',
    '--pointer-x': `${place?.pointerX ?? 0}px`,
  }
  return (
    <div
      ref={card}
      role="dialog"
      aria-labelledby={titleId}
      // A click on its text keeps focus inside, so it doesn't count as leaving.
      tabIndex={-1}
      className={styles.popover}
      data-side={place?.side ?? 'above'}
      style={style}
      onKeyDown={keyDown}
      onBlur={blur}
      onPointerDown={() => {
        pressing.current = true
      }}
      onPointerUp={() => {
        pressing.current = false
      }}
      onPointerCancel={() => {
        pressing.current = false
      }}
    >
      <span className={styles.pointer} aria-hidden="true" />
      <div className={styles.details}>
        <p id={titleId} className={styles.title}>
          {book.title}
        </p>
        {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
        <p className={styles.authors}>{book.authors.join('; ')}</p>
        <p className={styles.meta}>{pagesLine(book.pages, book.year)}</p>
        <p className={styles.status}>
          <span className={book.finished ? styles.glyphRead : styles.glyphUnread} aria-hidden="true" />
          {book.finished ? 'finished' : 'not read yet'}
        </p>
      </div>
      <div className={styles.actions}>
        <Link ref={link} to={`/book/${book.id}`} className={styles.open}>
          Open book →
        </Link>
        <ChangeColor book={book} level={3} />
      </div>
      <button type="button" className={styles.close} aria-label="Close" onClick={() => onClose(true)}>
        ×
      </button>
    </div>
  )
}
