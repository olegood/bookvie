// Home's finish moment on the Bookcase slice (Story 3.7), played once per
// moment: once the finished spine is in a row and Home has moved focus, it is
// scrolled into view (`nearest`; `smooth`, or `auto` under reduced motion),
// then fills from its old percentage to the whole spine with the `.fill`
// height transition and becomes the solid read spine, while the highlight
// ring is on. A re-read, or reduced motion, skips the fill: the ring only
// (instant under reduced motion), on the already solid spine. A refetch or a
// repack never replays it. The fill must show `from` on the first render, so
// a new moment sets its phase during render.

import { useCallback, useEffect, useRef, useState, type RefObject, type TransitionEvent } from 'react'
import type { ShelfBook } from '../api/index.ts'

/**
 * Home's finish moment (Story 3.7), from this tab's successful
 * `finish-reading` hand-off: the finished Book, its title, whether it was a
 * re-read, and the Main fill's percentage when the Finish dialog opened.
 */
export type FinishMoment = { id: string; title: string; reread: boolean; fromPercent: number }

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

type Options = {
  /** This Home visit's finish moment, or `null`. */
  finishing: FinishMoment | null
  /** Whether the Book's spine is in one of the slice's rows. Called during render only; not an effect dependency. */
  inSlice: (id: string) => boolean
  /** The spine buttons, by Book id. */
  buttons: RefObject<Map<string, HTMLButtonElement>>
}

/** How the moment draws one spine. */
type SpineMoment = {
  /**
   * The fill's `--percent` while the moment draws the finished spine as a
   * filling Main spine (the old percentage, then the spine's whole height);
   * `null` once it is solid, or for any other spine.
   */
  fill: string | null
  /** The highlight ring is on. */
  ring: boolean
  /** The fill-end handler, while the fill runs. */
  onTransitionEnd: ((event: TransitionEvent<HTMLButtonElement>) => void) | undefined
}

type FinishMomentLook = {
  /** The moment's look for `book`, whose spine is `height` px tall. */
  spineMoment: (book: ShelfBook, height: number) => SpineMoment
}

export function useFinishMoment({ finishing, inSlice, buttons }: Options): FinishMomentLook {
  // The finish moment: a new one (a new object) starts its own phase; the same
  // one through refetches and repacks keeps it, so it never replays.
  const [phase, setPhase] = useState<MomentPhase | null>(null)
  if (finishing !== null && phase?.moment !== finishing) {
    const instant = finishing.reread || prefersReducedMotion()
    setPhase({ moment: finishing, fill: instant ? 'done' : 'from', ring: false })
  }
  // A moment Home has dropped (another history entry) never starts.
  const moment = finishing !== null && phase?.moment === finishing ? finishing : null
  const momentInSlice = moment !== null && inSlice(moment.id)
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
  }, [moment, momentInSlice, buttons])

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

  const fillEnd = useCallback((event: TransitionEvent<HTMLButtonElement>) => {
    if (event.propertyName !== 'height') return
    setPhase((current) => (current?.fill === 'to' ? { ...current, fill: 'done' } : current))
  }, [])

  const spineMoment = (book: ShelfBook, height: number): SpineMoment => {
    // Only the moment still passed: a dropped one draws the solid read spine and never starts.
    const own = moment !== null && moment.id === book.id ? phase : null
    // The finish moment draws the finished spine as a filling Main spine until it is solid.
    const momentFill = own !== null && own.fill !== 'done' && book.finished
    // From the old percentage of the body to the whole spine's height (the line goes past its top).
    const fill = momentFill ? (own.fill === 'from' ? `${own.moment.fromPercent}%` : `${height}px`) : null
    return {
      fill,
      ring: own?.ring === true,
      onTransitionEnd: momentFill && own.fill === 'to' ? fillEnd : undefined,
    }
  }

  return { spineMoment }
}
