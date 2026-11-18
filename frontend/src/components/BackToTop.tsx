import { useEffect, useState, type RefObject } from 'react'
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

/**
 * Back to top (DESIGN.md → Back to top button, EXPERIENCE.md → Back to top),
 * mounted last in Catalog's and Card notes' `.page`. Once the page is
 * scrolled more than one window height, a fixed "↑ Back to top" button shows
 * in the bottom-right corner; otherwise it isn't rendered, so it is no Tab
 * stop and no accessible node. While it has focus it stays rendered even
 * back near the top (Home, PageUp, the wheel), so focus never jumps unasked
 * or falls to `body`; it goes once focus leaves it. A press scrolls to the
 * top (smooth, instant under reduced motion) and focuses `targetRef` (else
 * the `h1`) without cutting the scroll short. Nothing is announced: the
 * focus move is the feedback. An empty spacer of the button's height always
 * ends the page, so at the very bottom the button covers nothing.
 */
export default function BackToTop({ targetRef }: Props) {
  const [past, setPast] = useState(pastOneWindow)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    let frame: number | undefined
    const update = () => {
      if (frame !== undefined) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        setPast(pastOneWindow())
      })
    }
    setPast(pastOneWindow())
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [])

  const backToTop = () => {
    // 'auto' takes the page's scroll-behavior, which base.css makes instant under reduced motion.
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    // preventScroll: a plain focus() would jump to the field and end the smooth scroll.
    const target = targetRef.current ?? document.querySelector<HTMLElement>('main h1')
    target?.focus({ preventScroll: true })
  }

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      {(past || focused) && (
        <Button
          variant="secondary"
          className={styles.button}
          onClick={backToTop}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <span aria-hidden="true">↑</span> Back to top
        </Button>
      )}
    </>
  )
}
