import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from '../lib/motion.ts'
import Button from './Button.tsx'
import styles from './BackToTop.module.css'

type Props = {
  /** The page's search field, focused after the press. */
  targetRef: RefObject<HTMLElement | null>
}

function pastOneWindow(): boolean {
  return window.scrollY > window.innerHeight
}

/** The press's focus target: the page's search field, else the `h1`; never a scroll. */
function focusTarget(targetRef: RefObject<HTMLElement | null>): void {
  const target = targetRef.current ?? document.querySelector<HTMLElement>('main h1')
  target?.focus({ preventScroll: true })
}

/**
 * Back to top (DESIGN.md → Back to top button, EXPERIENCE.md → Back to top),
 * mounted last in Catalog's and Card notes' `.page`. Once the page is
 * scrolled more than one window height, a fixed "↑ Back to top" button shows
 * in the bottom-right corner; otherwise it isn't rendered, so it is no Tab
 * stop and no accessible node. A press scrolls to the top (smooth, instant
 * under reduced motion) and focuses `targetRef` (else the `h1`) without
 * cutting the scroll short. Nothing is announced: the focus move is the
 * feedback. If it is about to hide while it has focus (Home, PageUp, the
 * wheel), focus first moves to the same target, so it never falls to `body`.
 * An empty spacer of the button's height always ends the page, so
 * at the very bottom the button covers nothing.
 */
export default function BackToTop({ targetRef }: Props) {
  const [shown, setShown] = useState(pastOneWindow)
  const button = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let frame: number | undefined
    const update = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        const next = pastOneWindow()
        if (!next && button.current !== null && document.activeElement === button.current) focusTarget(targetRef)
        setShown(next)
      })
    }
    setShown(pastOneWindow())
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [targetRef])

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
    // preventScroll: a plain focus() would jump to the field and end the smooth scroll.
    focusTarget(targetRef)
  }

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      {shown && (
        <Button ref={button} variant="secondary" className={styles.button} onClick={backToTop}>
          <span aria-hidden="true">↑</span> Back to top
        </Button>
      )}
    </>
  )
}
