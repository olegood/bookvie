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
import { announce } from '../lib/announce.ts'
import { popoverOffersSetUpNext, REPLACES_UP_NEXT, SETTING_UP_NEXT, upNextStatus } from '../lib/setUpNext.ts'
import { placePopover, type Placement } from '../lib/spineColor.ts'
import { popoverStart } from '../lib/startReading.ts'
import { useSetUpNextFlow } from '../lib/useSetUpNextFlow.ts'
import Button from './Button.tsx'
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
  /** "Start reading" or **Resume**: the Bookcase closes it and opens the Start dialog. */
  onStart: () => void
  /** Another Book is Up next: Set as Up next carries the hint "Replaces the current Up next.". */
  hasUpNext: boolean
}

function pagesLine(pages: number, year: number | null): string {
  const count = pages === 1 ? '1 page' : `${pages} pages`
  return year === null ? count : `${count} · ${year}`
}

/**
 * The Spine popover (DESIGN.md / EXPERIENCE.md → Spine popover): a non-modal
 * `dialog` named by the title, fixed beside its spine with a pointer. The
 * Book's details on the left; "Open book →" and Change color on the right;
 * × at the top right, last in tab order. Before "Open book →", the start
 * action: **Resume** (`button-primary`) or a link-styled "Start reading"
 * button. Focus starts on the first actionable control: Set as Up next, else
 * the start action, else "Open book →". Esc, × and focus leaving it close
 * it; the Bookcase closes it on an outside click.
 *
 * For a Book never read and with no Reading, **Set as Up next**
 * (`button-primary`) comes first, with the hint "Replaces the current Up
 * next." under it (its accessible description) while another Book is Up
 * next. It sends `set-up-next` at once; on success the popover closes with
 * focus back on its spine, then `status` reads "*X* is Up next.". A failure
 * shows its line directly below the button, keeps focus there and leaves the
 * popover open.
 */
export default function SpinePopover({ book, anchor, shelf, onClose, onStart, hasUpNext }: Props) {
  const titleId = useId()
  const card = useRef<HTMLDivElement>(null)
  const link = useRef<HTMLAnchorElement>(null)
  const start = useRef<HTMLButtonElement>(null)
  const action = popoverStart(book)
  const [place, setPlace] = useState<Placement | null>(null)
  const hintId = useId()
  const setUpNextButton = useRef<HTMLButtonElement>(null)
  const {
    request: requestSetUpNext,
    busy: settingUpNext,
    failed: setUpNextFailed,
    regionSlot,
  } = useSetUpNextFlow({
    opener: setUpNextButton,
    fallback: () => link.current,
    onSet: (title) => {
      onClose(true)
      announce('status', upNextStatus(title))
    },
  })
  // Both kept as they were while the request is out: the refetch makes the
  // Book Up next (and the old Up next not) before it resolves.
  const offersSetUpNext = popoverOffersSetUpNext(book) || settingUpNext
  const [hintAtPress, setHintAtPress] = useState(false)
  const showHint = offersSetUpNext && (settingUpNext ? hintAtPress : hasUpNext)

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
    if (placed) (setUpNextButton.current ?? start.current ?? link.current)?.focus()
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
        <div className={styles.setUpNext}>
          {offersSetUpNext && (
            <Button
              ref={setUpNextButton}
              variant="primary"
              className={styles.setUpNextButton}
              aria-describedby={showHint ? hintId : undefined}
              disabledReason={settingUpNext ? SETTING_UP_NEXT : undefined}
              onClick={() => {
                if (!settingUpNext) setHintAtPress(hasUpNext)
                requestSetUpNext({ id: book.id, title: book.title })
              }}
            >
              Set as Up next
            </Button>
          )}
          {showHint && (
            <p id={hintId} className={styles.hint}>
              {REPLACES_UP_NEXT}
            </p>
          )}
          {/* Below Set as Up next, or where it was once a stale tab's refusal has removed it. */}
          <div ref={regionSlot} className={styles.regions} data-show-alert={setUpNextFailed ? 'true' : undefined} />
        </div>
        {action === 'Resume' && (
          <Button ref={start} variant="primary" className={styles.resume} onClick={onStart}>
            Resume
          </Button>
        )}
        {action === 'Start reading' && (
          <button ref={start} type="button" className={`linkButton ${styles.start}`} onClick={onStart}>
            Start reading
          </button>
        )}
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
